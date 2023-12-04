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
  Find = "f",
  BackFind = "F",
  MaybeDelete = "d",
  Maybeg = "g",
  MaybeLineNumber = "_shouldntdisplay_",
  MaybeLineNumberg = "_shouldntdisplayg_",
}

export class Malvim extends Window<MalvimMessage> {
  private mode: MalvimMode;
  private command: string;
  private command_cursor_pos: number;
  private previous_command?: string;
  private files: FileInfo[];
  private file_index?: number;
  private bottom_message: string;
  private vertical_offset: number; //vertical offset to current line in file
  private state: MalvimState = MalvimState.None;
  private maybe_line_num?: number; //eg: the 40 in 40gg
  //

  constructor(size: [number, number]) {
    super(size, "Malvim", "malvim");
    this.mode = MalvimMode.NORMAL;
    this.command = "";
    this.command_cursor_pos = 0;
    this.files = [];
    this.bottom_message = "";
    this.vertical_offset = 0;
    //
  }
  render_view(theme: Themes) {
    const THEME_INFO: ThemeInfo = THEME_INFOS[theme];
    this.context.textBaseline = "bottom";
    this.context.font = `${FONT_SIZES.NORMAL}px ${FONT_NAME_MONO}`;
    this.context.fillStyle = THEME_INFO.alt_background;
    this.context.fillRect(0, 0, this.size[0], this.size[1]);
    const band_height: number = FONT_SIZES.NORMAL + 2 * SCALE; //aka the line of one line of text
    //write file contents
    if (this.files.length > 0) {
      let current_info: FileInfo = this.files[this.file_index];
      let file_lines: string[] = current_info.content.split(" \n ");
      const line_no_width: number = this.context.measureText("9".repeat(String(file_lines.length).length)).width + 6 * SCALE;
      //calculate vertical offset so current line can be seen
      const visible_height: number = this.size[1] - WINDOW_TOP_HEIGHT - band_height * 3; //the height of the portion of the window where the file can be displayed in
      let height_to_start: number = (calculate_lines(current_info.content.split(" \n ").slice(0, current_info.line_pos).join(" \n "), FONT_SIZES.NORMAL, FONT_NAME_MONO, this.size[0] - line_no_width, this.context).length + 1) * band_height;
      //if the current line cannot be seen, make sure it can
      if (this.vertical_offset < height_to_start - visible_height || height_to_start - visible_height < this.vertical_offset) {
        this.vertical_offset = height_to_start - visible_height;
        if (this.vertical_offset < 0) {
          this.vertical_offset = 0;
        }
      }
      //actual writing of the lines
      //we draw this before the file tabs, so the file tabs draws over whatever text leaks out
      let lines_height: number = WINDOW_TOP_HEIGHT + band_height * 2 - this.vertical_offset;
      for (let line_no = 0; line_no < file_lines.length; line_no++) {
        let current_line: string = file_lines[line_no];
        let lines: string[] = calculate_lines(current_line, FONT_SIZES.NORMAL, FONT_NAME_MONO, this.size[0] - line_no_width, this.context);
        //do not write the text if it isn't in the area
        if (lines_height > this.size[1] - band_height * 2) break;
        if (lines_height > band_height * 2) {
          this.context.fillStyle = THEME_INFO.alt_text_light;
          this.context.fillText(String(line_no + 1), SCALE, lines_height);
        }
        this.context.fillStyle = THEME_INFO.alt_text;
        let cursor_written: boolean = false;
        let current_sub_pos: number = 0;
        for (let sub_line_no = 0; sub_line_no < lines.length; sub_line_no++) {
          //do not write the text if it isn't in the area
          if (lines_height > this.size[1] - band_height * 2) break;
          const current_sub_line: string = lines[sub_line_no];
          if (lines_height > band_height * 2) {
            this.context.fillText(current_sub_line, line_no_width, lines_height);
            current_sub_pos += current_sub_line.length;
          }
          if (this.mode !== MalvimMode.COMMAND && line_no === current_info.line_pos && (current_sub_pos > current_info.cursor_pos || (current_info.cursor_pos === current_line.length && current_sub_pos === current_info.cursor_pos)) && !cursor_written) {
            cursor_written = true;
            const line_start: number = current_sub_pos - current_sub_line.length;
            const rest_width: number = line_no_width + this.context.measureText(current_line.slice(line_start, current_info.cursor_pos)).width;
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
          lines_height += band_height;
        }
      }
      //
    }
    //top file tabs
    this.context.fillStyle = THEME_INFO.text_top;
    this.context.fillRect(0, WINDOW_TOP_HEIGHT, this.size[0], band_height);
    let file_tab_widths: number = 0;
    for (let i = 0; i < this.files.length; i++) {
      let file_info: FileInfo = this.files[i];
      let file_text: string = `${ file_info.changed ? "+ " : "" }${file_info.name}`;
      const tab_width: number = this.context.measureText(file_text).width + 4 * SCALE;
      if (i === this.file_index) {
        this.context.fillStyle = THEME_INFO.alt_background;
      } else {
        this.context.fillStyle = THEME_INFO.alt_text_light; //sue me
      }
      this.context.fillRect(file_tab_widths, WINDOW_TOP_HEIGHT, tab_width, band_height);
      this.context.fillStyle = THEME_INFO.alt_text;
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
      let state_text: string = String(this.state);
      if (this.state === MalvimState.MaybeLineNumber) {
        state_text = String(this.maybe_line_num);
      } else if (this.state === MalvimState.MaybeLineNumberg) {
        state_text = String(this.maybe_line_num) + "g";
      }
      const state_width: number = this.context.measureText(state_text).width;
      this.context.fillText(state_text, this.size[0] - state_width, this.size[1] - SCALE);
    }
  }
  open_file(open_path: Path, open_response: string, tab=false) {
    const open_file_info: FileInfo = {
      name: open_path.split("/").slice(-1)[0],
      path: open_path,
      changed: false,
      line_pos: 0,
      cursor_pos: 0,
      content: open_response,
    };
    if (!tab) {
      if (this.files.length === 0) {
        this.files.push(open_file_info);
        this.file_index = 0;
      } else {
        this.files[this.file_index] = open_file_info;
      }
    } else {
      this.files.push(open_file_info);
      this.file_index = this.files.length - 1;
    }
    this.vertical_offset = 0;
  }
  handle_message(message: MalvimMessage | WindowMessage, data: any): boolean {
    if (message === WindowMessage.KeyDown && isKeyboardEvent(data)) {
      this.do_rerender = true;
      if (data.key === "Escape") {
        this.mode = MalvimMode.NORMAL;
        this.state = MalvimState.None;
        //
      } else if (data.key === ":" && this.mode === MalvimMode.NORMAL && this.state === MalvimState.None) {
        this.mode = MalvimMode.COMMAND;
        this.state = MalvimState.None;
        //command reset
        this.command = "";
        this.command_cursor_pos = 0;
        //
      } else if (data.key === "i" && this.mode === MalvimMode.NORMAL && this.state === MalvimState.None) {
        this.mode = MalvimMode.INSERT;
        this.state = MalvimState.None;
        //
      } else if (data.key === "v" && this.mode === MalvimMode.NORMAL && this.state === MalvimState.None) {
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
          this.files[this.file_index].changed = true;
        } else if (data.key === "Backspace") {
          if (current_info.cursor_pos === 0 && current_info.line_pos !== 0) {
            let current_lines: string[] = current_content.split(" \n ");
            let old_line: string = current_lines[current_info.line_pos - 1];
            current_lines[current_info.line_pos - 1] += current_lines[current_info.line_pos];
            current_lines.splice(current_info.line_pos, 1);
            this.files[this.file_index].content = current_lines.join(" \n ");
            this.files[this.file_index].line_pos -= 1;
            this.files[this.file_index].cursor_pos = old_line.length;
            this.files[this.file_index].changed = true;
          } else if (current_info.cursor_pos !== 0) {
            //delete
            let current_lines: string[] = current_content.split(" \n ");
            let new_text: string[] = current_lines[current_info.line_pos].split("");
            new_text.splice(current_info.cursor_pos - 1, 1);
            current_lines[current_info.line_pos] = new_text.join("");
            this.files[this.file_index].content = current_lines.join(" \n ");
            this.files[this.file_index].cursor_pos -= 1;
            this.files[this.file_index].changed = true;
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
          this.files[this.file_index].changed = true;
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
          //this means marked as changed even if the cursor is at the last char + 1, but whatever
          this.files[this.file_index].changed = true;
        } else if (this.state === MalvimState.Find || this.state === MalvimState.BackFind) {
          if (data.key.length === 1) {
            //delete until next matching char
            const current_lines: string[] = current_content.split(" \n ");
            const line_chars: string[] = current_lines[current_info.line_pos].split("");
            //get end index
            let end_index: number = current_info.cursor_pos;
            for (let i = 0; i < line_chars.length; i++) {
              if (i <= current_info.cursor_pos && this.state === MalvimState.Find) {
                continue;
              } else if (i >= current_info.cursor_pos && this.state === MalvimState.BackFind) {
                break;
              } else if (line_chars[i] === data.key) {
                end_index = i;
                //if regular find, end loop. but if searching backwards,
                //we want to keep going to find the closest match
                //eg: "testing", where cursor is on the "g", and keys are "Ft",
                //it should be the second "t" that is new cursor location, not first
                if (this.state === MalvimState.Find) {
                  break;
                }
              }
            }
            this.files[this.file_index].cursor_pos = end_index;
            if (data.key !== "Shift") {
              this.state = MalvimState.None;
            }
          }
        } else if (this.state === MalvimState.Maybeg) {
          if (data.key === "g") {
            this.files[this.file_index].cursor_pos = 0;
            this.files[this.file_index].line_pos = 0;
          }
          //
          this.state = MalvimState.None;
        } else if (this.state === MalvimState.MaybeDelete) {
          let current_lines: string[] = current_content.split(" \n ");
          if (data.key === "d") {
            //delete line
            current_lines.splice(current_info.line_pos, 1);
            if (current_lines.length === 0) {
              current_lines = [""];
            }
            if (current_info.line_pos >= current_lines.length) {
              this.files[this.file_index].line_pos = current_lines.length - 1;
            }
            const new_line: string = current_lines[current_info.line_pos];
            if (current_info.cursor_pos > new_line.length) {
              //make sure cursor pos is still valid after moving lines
              this.files[this.file_index].cursor_pos = new_line.length;
            }
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
        } else if (this.state === MalvimState.MaybeLineNumber && data.key === "g") {
          this.state = MalvimState.MaybeLineNumberg;
        } else if (this.state === MalvimState.MaybeLineNumberg && data.key === "g") {
          //jump to that line number (if doesn't exist, jump to end)
          this.files[this.file_index].cursor_pos = 0;
          this.files[this.file_index].line_pos = this.maybe_line_num - 1 > current_content.split(" \n ").length - 1 ? current_content.split(" \n ").length - 1 : this.maybe_line_num - 1;
          this.maybe_line_num = undefined;
          this.state = MalvimState.None;
        } else if (this.state === MalvimState.MaybeLineNumber && isNaN(Number(data.key)) || data.key === "." || data.key === "-") {
          this.maybe_line_num = undefined;
          this.state = MalvimState.None;
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
        } else if (data.key === "G") {
          //all the way down
          this.files[this.file_index].cursor_pos = 0;
          this.files[this.file_index].line_pos = current_content.split(" \n ").length - 1;
        } else if (data.key === "$") {
          //end of the line
          this.files[this.file_index].cursor_pos = current_content.split(" \n ")[current_info.line_pos].length;
        } else if (data.key === "0" && typeof this.maybe_line_num === "undefined") {
          //start of the line
          this.files[this.file_index].cursor_pos = 0;
        } else if (!isNaN(Number(data.key)) && data.key !== "." && data.key !== "-") {
          this.maybe_line_num = this.maybe_line_num ? Number(String(this.maybe_line_num) + data.key) : Number(data.key);
          this.state = MalvimState.MaybeLineNumber;
        } else if (data.key === "r") {
          this.state = MalvimState.Replace;
        } else if (data.key === "d") {
          this.state = MalvimState.MaybeDelete;
        } else if (data.key === "f") {
          this.state = MalvimState.Find;
        } else if (data.key === "F") {
          this.state = MalvimState.BackFind;
        } else if (data.key === "g") {
          //g
          //gg, gh, gj, gk, gl
          this.state = MalvimState.Maybeg;
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
        } else if (data.key === "ArrowDown") {
          this.command = "";
          this.command_cursor_pos = 0;
        } else if (data.key === "ArrowUp") {
          if (typeof this.previous_command !== "undefined") {
            this.command = this.previous_command;
            this.command_cursor_pos = this.previous_command.length;
          }
        } else if (data.key === "Backspace" && this.command_cursor_pos !== 0) {
          let c_split: string[] = this.command.split("");
          c_split.splice(this.command_cursor_pos - 1, 1);
          this.command = c_split.join("");
          this.command_cursor_pos = this.command_cursor_pos - 1 < 0 ? 0 : this.command_cursor_pos - 1;
        } else if (data.key === "Enter") {
          let parts: string[] = this.command.split(" ");
          let first: string = parts.shift();
          if ((first.startsWith("e") && "edit".includes(first)) || (((first.startsWith("tabe") && "tabedit".includes(first)) || first === "t") && this.files.length > 0)) {
            if (parts.length > 2) {
              this.bottom_message = "Incorrect amount of arguments";
            } else if (parts.length === 2 && parts[1] !== "--new") {
              this.bottom_message = "If two arguments, second must be \"--new\"";
            } else {
              //if not edit, then is tab
              const is_tab: boolean = !(first.startsWith("e") && "edit".includes(first));
              let base_path: Path;
              if (this.files.length > 0) {
                //parent path
                base_path = `/${this.files[this.file_index].path.split("/").slice(0, -1).join("/").slice(1)}`;
              } else {
                base_path = "/";
              }
              const parent_path: Path = `/${base_path.split("/").slice(0, -1).join("/").slice(1)}`;
              const parent_response = this.send_request(WindowRequest.ReadFileSystem, {
                permission_type: "read_all_file_system",
                path: parent_path,
              });
              this.do_rerender = true;
              if (typeof parent_response === "undefined") {
                //if parent doesn't exist, neither does the file under it
                this.bottom_message = "File does not exist, or missing permission";
              } else {
                let open_path: Path = FileSystemObject.navigate_path(base_path, parts[0]);
                const open_response = this.send_request(WindowRequest.ReadFileSystem, {
                  permission_type: "read_all_file_system",
                  path: open_path,
                });
                //need to reset rerender to true after request sent
                this.do_rerender = true;
                if (typeof open_response === "undefined") {
                  if (parts[1] === "--new") {
                    //create new file
                    const create_response = this.send_request(WindowRequest.WriteFileSystem, {
                      permission_type: "write_all_file_system",
                      path: open_path,
                      content: "",
                    });
                    this.do_rerender = true;
                    if (typeof create_response === "undefined") {
                      this.bottom_message = "Missing permission to write to filesystem";
                    } else {
                      //add to current opened files
                      this.open_file(open_path, "", is_tab);
                      //
                    }
                  } else {
                    //because we checked parent exists, it is not a permission issue
                    this.bottom_message = "File does not exist";
                  }
                } else if (typeof open_response === "object") {
                  this.bottom_message = "Can only open files, not directories";
                } else {
                  //add to current opened files
                  this.open_file(open_path, open_response, is_tab);
                  //
                }
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
            } else {
              this.bottom_message = "No changes to write";
            }
          } else if (first.startsWith("%s")) {
            //
          } else if ((first.startsWith("tabn") && "tabnext".includes(first)) || first === "tn") {
            this.file_index++;
            if (this.file_index > this.files.length - 1) {
              this.file_index = 0;
            }
          } else if ((first.startsWith("tabp") && "tabprevious".includes(first)) || first === "tp") {
            this.file_index--;
            if (this.file_index < 0) {
              this.file_index = this.files.length - 1;
            }
          } else {
            this.bottom_message = `Not a command: ${this.command}`;
          }
          //
          this.previous_command = this.command;
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
    } else if (message === WindowMessage.GenericShortcut) {
      //generic shortcut left and right to cycle tabs
      if (data === "left" && this.files.length > 1) {
        this.file_index--;
        if (this.file_index < 0) {
          this.file_index = this.files.length - 1;
        }
        this.do_rerender = true;
      } else if (data === "right" && this.files.length > 1) {
        this.file_index++;
        if (this.file_index > this.files.length - 1) {
          this.file_index = 0;
        }
      }
      this.do_rerender = true;
    }
    //
    return this.do_rerender;
  }
}

