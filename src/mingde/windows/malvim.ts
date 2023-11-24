import { Window, WindowMessage } from '../wm.js';
import { WindowRequest } from '../requests.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';
import { FONT_SIZES, SCALE, WINDOW_TOP_HEIGHT, FONT_NAME_MONO } from '../constants.js';
import { FileSystemObject, Path } from '../fs.js';
import { calculate_lines } from '../utils.js';
import { isKeyboardEvent } from '../guards.js';

//import { Paragraph, DEFAULT_LINE_HEIGHT_EXTRA } from '../components/paragraph.js';

//vim but worse

interface FileInfo {
  name: string;
  path: Path;
  current: boolean;
  changed: boolean;
  line_pos: number;
  cursor_pos: number;
  content: string;
}

enum MalvimMessage {
  //
}

enum MalvimMode {
  NORMAL = "NORMAL",
  INSERT = "INSERT",
  VISUAL = "VISUAL",
  COMMAND = "COMMAND",
  //
}

enum MalvimState {
  None,
  Replace = "r",
  MaybeDelete = "d",
}

export class Malvim extends Window<MalvimMessage> {
  private mode: MalvimMode;
  private command: string;
  private command_cursor_pos: number;
  private files: FileInfo[];
  private file_index?: number;
  private bottom_message: string;
  private state: MalvimState = MalvimState.None;
  //

  constructor(size: [number, number]) {
    super(size, "Malvim", "malvim");
    this.mode = MalvimMode.NORMAL;
    this.command = "";
    this.command_cursor_pos = 0;
    this.files = [];
    this.bottom_message = "";
    //
  }
  render_view(theme: Themes) {
    const THEME_INFO: ThemeInfo = THEME_INFOS[theme];
    this.context.textBaseline = "bottom";
    this.context.font = `${FONT_SIZES.NORMAL}px ${FONT_NAME_MONO}`;
    this.context.fillStyle = THEME_INFO.alt_background;
    this.context.fillRect(0, 0, this.size[0], this.size[1]);
    const band_height: number = FONT_SIZES.NORMAL + 2 * SCALE; //aka the line of one line of text
    //top file tabs
    this.context.fillStyle = THEME_INFO.text_top;
    this.context.fillRect(0, WINDOW_TOP_HEIGHT, this.size[0], band_height);
    let file_tab_widths: number = 0;
    for (let i = 0; i < this.files.length; i++) {
      let file_info: FileInfo = this.files[i];
      let file_text: string = `${ file_info.changed ? "+ " : "" }${file_info.name}`;
      const tab_width: number = this.context.measureText(file_text).width + 4 * SCALE;
      if (file_info.current) {
        this.context.fillStyle = THEME_INFO.alt_background;
      } else {
        this.context.fillStyle = THEME_INFO.background;
      }
      this.context.fillRect(file_tab_widths, WINDOW_TOP_HEIGHT, tab_width, band_height);
      if (file_info.current) {
        this.context.fillStyle = THEME_INFO.alt_text;
      } else {
        this.context.fillStyle = THEME_INFO.text_primary;
      }
      this.context.fillText(file_text, file_tab_widths + 2 * SCALE, WINDOW_TOP_HEIGHT + band_height - 2 * SCALE);
      file_tab_widths += tab_width;
      //
    }
    //info band
    this.context.fillStyle = THEME_INFO.top;
    this.context.fillRect(0, this.size[1] - band_height * 2, this.size[0], band_height);
    this.context.fillStyle = THEME_INFO.text_top;
    this.context.fillText(this.mode, SCALE, this.size[1] - band_height - SCALE);
    const mode_width: number = this.context.measureText(this.mode).width;
    const file_info_text = this.files.length > 0 ? `${this.files[this.file_index]?.name}${ this.files[this.file_index]?.changed ? " [+]" : "" }` : "No file open";
    const file_width: number = this.context.measureText(file_info_text).width;
    if (this.size[0] > file_width + mode_width) {
      this.context.fillText(file_info_text, this.size[0] - file_width - SCALE, this.size[1] - band_height - SCALE);
    }
    //command
    if (this.mode === MalvimMode.COMMAND) {
      this.context.fillText(":" + this.command, SCALE, this.size[1] - SCALE);
      //cursor
      const rest_width: number = this.context.measureText(":" + this.command.slice(0, this.command_cursor_pos)).width;
      //use the char cursor/selector is over to get cursor width. if no char (this.cursor_pos is this.value.length), use the letter a
      const cursor_width: number = this.context.measureText(this.command[this.command_cursor_pos] || "a").width;
      this.context.fillStyle = THEME_INFO.highlight;
      this.context.fillRect(rest_width + SCALE, this.size[1] - band_height, cursor_width, band_height);
      //draw the cursor text a different colour so it is legible
      if (this.command[this.command_cursor_pos]) {
        this.context.fillStyle = THEME_INFO.text_highlight;
        this.context.fillText(this.command[this.command_cursor_pos], rest_width + SCALE, this.size[1] - SCALE);
      }
    } else if (this.mode === MalvimMode.NORMAL && this.bottom_message !== "") {
      this.context.fillText(this.bottom_message, SCALE, this.size[1] - SCALE);
    }
    if (this.state !== MalvimState.None) {
      const state_width: number = this.context.measureText(String(this.state)).width;
      this.context.fillText(String(this.state), this.size[0] - state_width, this.size[1] - SCALE);
    }
    //write file contents
    if (this.files.length > 0) {
      let current_info: FileInfo = this.files[this.file_index];
      let file_lines: string[] = current_info.content.split(" \n ");
      let lines_height: number = WINDOW_TOP_HEIGHT + band_height * 2;
      const line_no_width: number = this.context.measureText("999").width;
      for (let line_no = 0; line_no < file_lines.length; line_no++) {
        this.context.fillStyle = THEME_INFO.alt_text_light;
        let current_line: string = file_lines[line_no];
        let lines: string[] = calculate_lines(current_line, FONT_SIZES.NORMAL, FONT_NAME_MONO, this.size[0] - line_no_width - 2 * SCALE, this.context);
        this.context.fillText(String(line_no + 1), SCALE, lines_height);
        this.context.fillStyle = THEME_INFO.alt_text;
        let cursor_written: boolean = false;
        let current_sub_pos: number = 0;
        for (let sub_line_no = 0; sub_line_no < lines.length; sub_line_no++) {
          const current_sub_line: string = lines[sub_line_no];
          this.context.fillText(current_sub_line, line_no_width + 2 * SCALE, lines_height);
          current_sub_pos += current_sub_line.length;
          if (this.mode !== MalvimMode.COMMAND && line_no === current_info.line_pos && (current_sub_pos > current_info.cursor_pos || (current_info.cursor_pos === current_line.length && current_sub_pos === current_info.cursor_pos)) && !cursor_written) {
            cursor_written = true;
            const line_start: number = current_sub_pos - current_sub_line.length;
            const rest_width: number = line_no_width + 2 * SCALE + this.context.measureText(current_line.slice(line_start, current_info.cursor_pos)).width;
            //use the char cursor/selector is over to get cursor width. if no char (this.cursor_pos is this.value.length), use the letter a
            const current_char: string | undefined = current_line[current_info.cursor_pos];
            const cursor_width: number = this.context.measureText(current_char || "a").width;
            this.context.fillStyle = THEME_INFO.highlight;
            this.context.fillRect(rest_width + SCALE, lines_height - band_height, cursor_width, band_height);
            //draw the cursor text a different colour so it is legible
            if (current_char) {
              this.context.fillStyle = THEME_INFO.text_highlight;
              this.context.fillText(current_char, rest_width, lines_height);
            }
            //reset fill
            this.context.fillStyle = THEME_INFO.alt_text;
          }
          lines_height += FONT_SIZES.NORMAL + 2 * SCALE;
        }
      }
      //
    }
  }
  handle_message(message: MalvimMessage | WindowMessage, data: any): boolean {
    if (message === WindowMessage.KeyDown && isKeyboardEvent(data)) {
      this.do_rerender = true;
      if (data.key === "Escape") {
        this.mode = MalvimMode.NORMAL;
        this.state = MalvimState.None;
        //
      } else if (data.key === ":" && this.mode === MalvimMode.NORMAL) {
        this.mode = MalvimMode.COMMAND;
        this.state = MalvimState.None;
        //command reset
        this.command = "";
        this.command_cursor_pos = 0;
        //
      } else if (data.key === "i" && this.mode === MalvimMode.NORMAL) {
        this.mode = MalvimMode.INSERT;
        this.state = MalvimState.None;
        //
      } else if (data.key === "v" && this.mode === MalvimMode.NORMAL) {
        this.mode = MalvimMode.VISUAL;
        this.state = MalvimState.None;
        //
      } else if (this.mode === MalvimMode.INSERT && this.files.length > 0) {
        //heavily drawn from what I wrote earlier in components/text_box.ts
        //arrow key stuff unfortunately copied from normal mode's hjkl further down (this section is not very DRY)
        const current_info: FileInfo = this.files[this.file_index];
        const current_content: string = current_info.content;
        if (data.key.length === 1) {
          let current_lines: string[] = current_content.split(" \n ")
          let line_split: string[] = current_lines[current_info.line_pos].split("");
          line_split.splice(current_info.cursor_pos, 0, data.key);
          current_lines[current_info.line_pos] = line_split.join("");
          this.files[this.file_index].content = current_lines.join(" \n ");
          this.files[this.file_index].cursor_pos += 1;
        } else if (data.key === "Backspace") {
          if (current_info.cursor_pos === 0 && current_info.line_pos !== 0) {
            let current_lines: string[] = current_content.split(" \n ");
            let old_line: string = current_lines[current_info.line_pos - 1];
            current_lines[current_info.line_pos - 1] += current_lines[current_info.line_pos];
            current_lines.splice(current_info.line_pos, 1);
            this.files[this.file_index].content = current_lines.join(" \n ");
            this.files[this.file_index].line_pos -= 1;
            this.files[this.file_index].cursor_pos = old_line.length;
          } else if (current_info.cursor_pos !== 0) {
            //delete
            let current_lines: string[] = current_content.split(" \n ");
            let new_text: string[] = current_lines[current_info.line_pos].split("");
            new_text.splice(current_info.cursor_pos - 1, 1);
            current_lines[current_info.line_pos] = new_text.join("");
            this.files[this.file_index].content = current_lines.join(" \n ");
            this.files[this.file_index].cursor_pos -= 1;
          }
        } else if (data.key === "Enter") {
          let current_lines: string[] = current_content.split(" \n ");
          if (current_info.cursor_pos === current_lines[current_info.line_pos].length) {
            current_lines.splice(current_info.line_pos + 1, 0, "");
            this.files[this.file_index].content = current_lines.join(" \n ");
          } else {
            current_lines.splice(current_info.line_pos + 1, 0, current_lines[current_info.line_pos].slice(current_info.cursor_pos));
            current_lines[current_info.line_pos] = current_lines[current_info.line_pos].slice(0, current_info.cursor_pos);
          }
          this.files[this.file_index].content = current_lines.join(" \n ");
          this.files[this.file_index].line_pos += 1;
          this.files[this.file_index].cursor_pos = 0;
        } else if (data.key === "ArrowLeft") {
          //left
          this.files[this.file_index].cursor_pos = current_info.cursor_pos - 1 > 0 ? current_info.cursor_pos - 1 : 0;
        } else if (data.key === "ArrowDown" || data.key === "ArrowUp") {
          if (data.key === "ArrowDown") {
            //down
            this.files[this.file_index].line_pos = current_info.line_pos + 1 < current_content.split(" \n ").length - 1 ? current_info.line_pos + 1 : current_content.split(" \n ").length - 1;
          } else if (data.key === "ArrowUp") {
            //up
            this.files[this.file_index].line_pos = current_info.line_pos - 1 > 0 ? current_info.line_pos - 1 : 0;
          }
          let new_line: string = current_content.split(" \n ")[this.files[this.file_index].line_pos];
          if (current_info.cursor_pos > new_line.length) {
            //make sure cursor pos is still valid after moving lines
            this.files[this.file_index].cursor_pos = new_line.length;
          }
        } else if (data.key === "ArrowRight") {
          //right
          this.files[this.file_index].cursor_pos = current_info.cursor_pos + 1 < current_content.split(" \n ")[current_info.line_pos].length ? current_info.cursor_pos + 1 : current_content.split(" \n ")[current_info.line_pos].length;
        }
      } else if (this.mode === MalvimMode.NORMAL && this.files.length > 0) {
        const current_info: FileInfo = this.files[this.file_index];
        const current_content: string = current_info.content;
        if ((this.state === MalvimState.Replace && data.key.length === 1) || (data.key === "x" && this.state === MalvimState.None)) {
          let current_lines: string[] = current_content.split(" \n ");
          let line_chars: string[] = current_lines[current_info.line_pos].split("");
          if (this.state === MalvimState.Replace) {
            line_chars.splice(current_info.cursor_pos, 1, data.key);
            this.state = MalvimState.None;
          } else if (data.key === "x") {
            line_chars.splice(current_info.cursor_pos, 1);
          }
          current_lines[current_info.line_pos] = line_chars.join("");
          this.files[this.file_index].content = current_lines.join(" \n ");
          this.files[this.file_index].changed = true;
        } else if (this.state === MalvimState.MaybeDelete) {
          let current_lines: string[] = current_content.split(" \n ");
          if (data.key === "d") {
            //delete line
            current_lines.splice(current_info.line_pos, 1);
          } else if (current_info.cursor_pos !== current_lines[current_info.line_pos].length) {
            if (data.key === "w") {
              //delete word
              let line_words: string[] = current_lines[current_info.line_pos].split(" ");
              let new_chars: string[] = current_lines[current_info.line_pos].split("");
              //find which word the cursor is in
              let word_count: number = 0;
              let index_in_word: number = 0;
              for (let i = 0; i < new_chars.length; i++) {
                if (i === current_info.cursor_pos) {
                  break;
                } else if (new_chars[i] === " ") {
                  index_in_word = 0;
                  word_count++;
                } else {
                  index_in_word++;
                }
              }
              if (index_in_word === 0) {
                line_words.splice(word_count, 1);
              } else {
                //don't delete the entire word
                line_words.splice(word_count, 1, line_words[word_count].slice(0, index_in_word));
              }
              current_lines[current_info.line_pos] = line_words.join(" ");
            } else if (data.key === "%") {
              //delete until next matching char
              let new_chars: string[] = current_lines[current_info.line_pos].split("");
              //get end index
              let end_index: number = new_chars.length - 1;
              for (let i = 0; i < new_chars.length; i++) {
                if (i <= current_info.cursor_pos) {
                  continue;
                } else if (new_chars[i] === new_chars[current_info.cursor_pos]) {
                  end_index = i;
                  break;
                }
              }
              new_chars.splice(current_info.cursor_pos, end_index - current_info.cursor_pos)
              current_lines[current_info.line_pos] = new_chars.join("");
            } else if (data.key === "$") {
              //delete until end of line (cursor character included)
              current_lines[current_info.line_pos] = current_lines[current_info.line_pos].slice(0, current_info.cursor_pos);
            }
          }
          this.files[this.file_index].content = current_lines.join(" \n ");
          this.files[this.file_index].changed = true;
          //otherwise keys like $ and % would be impossible to type
          if (data.key !== "Shift") {
            this.state = MalvimState.None;
          }
        } else if (data.key === "h") {
          //left
          this.files[this.file_index].cursor_pos = current_info.cursor_pos - 1 > 0 ? current_info.cursor_pos - 1 : 0;
        } else if (data.key === "j" || data.key === "k") {
          if (data.key === "j") {
            //down
            this.files[this.file_index].line_pos = current_info.line_pos + 1 < current_content.split(" \n ").length - 1 ? current_info.line_pos + 1 : current_content.split(" \n ").length - 1;
          } else if (data.key === "k") {
            //up
            this.files[this.file_index].line_pos = current_info.line_pos - 1 > 0 ? current_info.line_pos - 1 : 0;
          }
          let new_line: string = current_content.split(" \n ")[this.files[this.file_index].line_pos];
          if (current_info.cursor_pos > new_line.length) {
            //make sure cursor pos is still valid after moving lines
            this.files[this.file_index].cursor_pos = new_line.length;
          }
        } else if (data.key === "l") {
          //right
          this.files[this.file_index].cursor_pos = current_info.cursor_pos + 1 < current_content.split(" \n ")[current_info.line_pos].length ? current_info.cursor_pos + 1 : current_content.split(" \n ")[current_info.line_pos].length;
        } else if (data.key === "r") {
          this.state = MalvimState.Replace;
        } else if (data.key === "d") {
          this.state = MalvimState.MaybeDelete;
        }
        //
      } else if (this.mode === MalvimMode.COMMAND) {
        this.do_rerender = true;
        this.bottom_message = "";
        if (data.key.length === 1) {
          let c_split: string[] = this.command.split("");
          c_split.splice(this.command_cursor_pos, 0, data.key);
          this.command = c_split.join("");
          this.command_cursor_pos += 1;
        } else if (data.key === "ArrowLeft") {
          this.command_cursor_pos = this.command_cursor_pos - 1 < 0 ? 0 : this.command_cursor_pos - 1;
        } else if (data.key === "ArrowRight") {
          this.command_cursor_pos = this.command_cursor_pos + 1 > this.command.length ? this.command.length : this.command_cursor_pos + 1;
        } else if (data.key === "Backspace" && this.command_cursor_pos !== 0) {
          let c_split: string[] = this.command.split("");
          c_split.splice(this.command_cursor_pos - 1, 1);
          this.command = c_split.join("");
          this.command_cursor_pos = this.command_cursor_pos - 1 < 0 ? 0 : this.command_cursor_pos - 1;
        } else if (data.key === "Enter") {
          let parts: string[] = this.command.split(" ");
          let first: string = parts.shift();
          if (first.startsWith("e") && "edit".includes(first)) {
            if (parts.length !== 1) {
              this.bottom_message = "Incorrect amount of arguments";
            } else {
              let base_path: Path;
              if (this.files.length > 0) {
                //parent path
                base_path = `/${this.files[this.file_index].path.split("/").slice(0, -1).join("/").slice(1)}`;
              } else {
                base_path = "/";
              }
              let open_path: Path = FileSystemObject.navigate_path(base_path, parts[0]);
              const open_response = this.send_request(WindowRequest.ReadFileSystem, {
                permission_type: "read_all_file_system",
                path: open_path,
              });
              //need to reset rerender to true after request sent
              this.do_rerender = true;
              if (typeof open_response === "undefined") {
                //create new file?
                this.bottom_message = "File does not exist, or missing permission";
              } else if (typeof open_response === "object") {
                this.bottom_message = "Can only open files, not directories";
              } else {
                const open_file_info: FileInfo = {
                  name: open_path.split("/").slice(-1)[0],
                  path: open_path,
                  current: true,
                  changed: false,
                  line_pos: 0,
                  cursor_pos: 0,
                  content: open_response,
                };
                if (this.files.length === 0) {
                  this.files.push(open_file_info);
                  this.file_index = 0;
                } else {
                  this.files[this.file_index] = open_file_info;
                }
                //
              }
            }
          } else if (first === "q") {
            //
          } else if (this.files.length === 0) {
            this.bottom_message = "Only :edit, :q, allowed when no file open";
          } else if (first.startsWith("w") && "write".includes(first)) {
            if (this.files[this.file_index].changed) {
              //write changes
              const current_info: FileInfo = this.files[this.file_index];
              const write_response = this.send_request(WindowRequest.WriteFileSystem, {
                permission_type: "write_all_file_system",
                path: current_info.path,
                content: current_info.content,
              });
              //need to reset rerender to true after request sent
              this.do_rerender = true;
              if (typeof write_response === "undefined") {
                this.bottom_message = "Write failed, missing permission";
              } else {
                this.files[this.file_index].changed = false;
                this.bottom_message = `"${current_info.name}" ${current_info.content.split(" \n ").length}L, ${current_info.content.length}C written`;
              }
            }
          } else if (first.startsWith("%s")) {
            //
          } else if (first === "tabnew" || first === "tabe" || first === "t") {
            //
          } else if (first === "tabnext" || first === "tn") {
            //
          } else if ((first.startsWith("tabprev") && "tabprevious".includes(first)) || first === "tp") {
            //
          } else {
            this.bottom_message = `Not a command: ${this.command}`;
          }
          //
          this.mode = MalvimMode.NORMAL;
        } else {
          this.do_rerender = false;
        }
        //
      } else if (this.mode === MalvimMode.VISUAL && this.files.length > 0) {
        //
      } else {
        this.do_rerender = false;
      }
      //
    }
    //
    return this.do_rerender;
  }
}

