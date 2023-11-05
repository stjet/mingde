import { WindowMessage } from '../wm.js';
import { WindowRequest } from '../requests.js';
import { VerticalScrollable, VerticalScrollableMessage } from '../vertical_scrollable.js';
import { Paragraph, DEFAULT_LINE_HEIGHT_EXTRA } from '../components/paragraph.js';
import { WINDOW_TOP_HEIGHT, FONT_SIZES, SCALE, SCROLLBAR_WIDTH } from '../constants.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';
import { isKeyboardEvent } from '../guards.js';
import { FileSystemObject, Path } from '../fs.js';

//text input will need to be implemented

const margin: number = 5;

enum TerminalMessage {
  //
}

interface CommandInfo {
  usage: string, //args info
  short: string,
  long: string,
  max: number, //max args, -1 for unlimited
  min?: number,
}

//tail, head, (grep) etc
//list window ids, permissions?
const command_info: Record<string, CommandInfo> = {
  help: {
    usage: "help [optional: command name]",
    short: "List all commands",
    long: "List all commands or find specific help information for a command",
    max: 1,
  },
  clear: {
    usage: "clear [optional: number of lines]",
    short: "Clear the terminal",
    long: "Clear the entire terminal, or a few lines of it",
    max: 1,
  },
  pwd: {
    usage: "pwd",
    short: "Print working directory",
    long: "Print working directory",
    max: 0,
  },
  cd: {
    usage: "cd [directory path]",
    short: "Change directory",
    long: "Change directory. `.` and `..` are allowed",
    max: 1,
    min: 1,
  },
  ls: {
    usage: "ls [optional: directory path]",
    short: "View top-level contents of a directory",
    long: "View top-level contents of a directory",
    max: 1,
    min: 0,
  },
  cat: {
    usage: "cat [file path]",
    short: "View the contents of a file",
    long: "View the contents of a file",
    max: 1,
    min: 1,
  },
  mkdir: {
    usage: "mkdir [directory path]",
    short: "Creates an empty directory at the path",
    long: "Creates an empty directory at the path",
    max: 1,
    min: 1,
  },
  touch: {
    usage: "touch [file path]",
    short: "Creates an empty file at the path",
    long: "Creates an empty file at the path",
    max: 1,
    min: 1,
  },
  rm: {
    usage: "rm [path] [optional: --nonempty]",
    short: "Remove file/directory at location",
    long: "Remove file/directory at location. Flag '--nonempty' to delete non-empty directories",
    max: 2,
    min: 1,
  },
  //variables
  var_list: {
    usage: "var_list [optional: --nameonly or name of variable]",
    short: "List the names and values of all variables",
    long: "List the names and values of all variables. Flag '--nameonly' to list names only, and not the values. Or, enter in variable name to see value of that variable. All variable names start and end with $, but cannot contain $ elsewhere",
    max: 1,
    min: 0,
  },
  var_set: {
    usage: "var_set [variable name] [...command arguments]",
    short: "Set a variable",
    long: "Set a variable to the output of a command. Variable names must start and end with $, but cannot contain $ elsewhere",
    max: -1,
    min: 2,
  },
  var_clear: {
    usage: "var_clear [variable name]",
    short: "Clear variable by name",
    long: "Clear variable by name. Variable names must start and end with $, but cannot contain $ elsewhere",
    max: 1,
    min: 1,
  },
  //file io
  append: {
    usage: "append [file path] [...unlimited arguments]",
    short: "Append content to file",
    long: "Append content to file, vars allowed",
    max: -1,
    min: 2,
  },
  overwrite: {
    usage: "overwrite [file path] [...unlimited arguments]",
    short: "Overwrite file with content",
    long: "Overwrite file with content, vars allowed",
    max: -1,
    min: 2,
  },
  //echo
  echo: {
    usage: "echo [...unlimited arguments]",
    short: "Print something to the terminal",
    long: "Print something to the terminal, vars allowed",
    max: -1,
    min: 1,
  },
  //opening window and stuff
  terminal: {
    usage: "terminal",
    short: "Open the terminal window",
    long: "Open the terminal window",
    max: 0,
    min: 0,
  },
  settings: { //we probably want separate commands to change theme, wallpaper, settings
    usage: "settings",
    short: "Open the settings window",
    long: "Open the settings window",
    max: 0,
    min: 0,
  },
  shortcuts: {
    usage: "shortcuts",
    short: "Open the shortcuts window",
    long: "Open the shortcuts window",
    max: 0,
    min: 0,
  },
  minesweeper: {
    usage: "minesweeper",
    short: "Open the minesweeper window",
    long: "Open the minesweeper window",
    max: 0,
    min: 0,
  },
  reversi: {
    usage: "reversi",
    short: "Open the reversi window",
    long: "Open the reversi window",
    max: 0,
    min: 0,
  },
  bag: {
    usage: "bag",
    short: "Open the bag window",
    long: "Open the bag window",
    max: 0,
    min: 0,
  },
};

export class Terminal extends VerticalScrollable<TerminalMessage> {
  private paragraph: Paragraph<TerminalMessage | VerticalScrollableMessage>;
  private text: string;
  private user_text: string; //current user prompt, not yet entered
  private previous_user_text: string;
  private path: Path;
  private vars: Record<string, string>;

  constructor(size: [number, number]) {
    super(size, "Terminal", size[1], "terminal");
    this.path = "/usr";
    this.text = `Mingde Terminal \n \n ${this.path}\$ `;
    this.user_text = "";
    this.previous_user_text = "";
    this.vars = {};
    this.paragraph = new Paragraph(this, this.text, [margin, WINDOW_TOP_HEIGHT / SCALE + margin + FONT_SIZES.NORMAL / SCALE], "alt_text", "NORMAL", this.size[0] / SCALE - SCROLLBAR_WIDTH / SCALE, undefined, true);
    this.paragraph.text = this.text + this.user_text + "█";
    this.paragraph.lines = this.paragraph.calculate_lines();
  }
  static is_valid_var_name(var_name: string): boolean {
    if (!var_name.startsWith("$") || !var_name.endsWith("$")) return false;
    if (var_name.includes(" ")) return false;
    if (var_name.slice(1, -1).includes("$")) return false;
    return true;
  }
  static add_vars_to_text(text: string, vars: Record<string, string>): string {
    //vars start and end with $
    let new_text: string = "";
    //character based state machine, what could go wrong.
    let in_var: boolean = false;
    let var_name: string = "";
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "$" && !in_var && i !== text.length - 1) {
        in_var = true;
        var_name = "$";
      } else if (text[i] === "$" && in_var && text[i - 1] !== "\\") {
        var_name += "$";
        new_text += typeof vars[var_name] === "string" ? vars[var_name] : var_name;
        in_var = false;
      } else if ((text[i] === " " || i === text.length - 1) && in_var) {
        new_text += var_name + text[i];
        in_var = false;
      } else if (in_var) {
        var_name += text[i];
      } else {
        new_text += text[i];
      }
    }
    //so escaping $ is possible
    return new_text.replaceAll("\\$", "$");
  }
  //return undefined if the command shouldn't show (like clear)
  handle_input(input: string): string | undefined {
    let parts: string[] = input.split(" ");
    let command: string = parts.shift();
    if (command_info[command]) {
      if (parts.length > command_info[command].max && command_info[command].max !== -1) {
        return `Expected max of ${command_info[command].max} arguments but got ${parts.length}`;
      } else if (command_info[command].min) {
        if (parts.length < command_info[command].min) {
          return `Expected min of ${command_info[command].min} arguments but got ${parts.length}`;
        }
      }
    } else {
      return `Command "${command}" not found. Do "help" to see all commands.`;
    }
    if (command === "help") {
      if (parts.length === 0) {
        return "All Commands: "+Object.keys(command_info).map((key) => ` \n - ${key}: ${command_info[key].short}`)+" \n \n Do `help <command name>` to learn more about a specific command.";
      } else {
        let specific_info: CommandInfo | undefined = command_info[parts[0]];
        if (!specific_info) {
          return `Could not find help info for command "${parts[0]}", does it exist? Do "help" to see all commands.`;
        }
        return `${specific_info.usage} \n ${specific_info.long}`;
      }
    } else if (command === "clear") {
      if (parts.length === 0) {
        //clear entire terminal
        this.text = `${this.path}\$ `;
        //move back up, get rid of scrollbars if any
        super.handle_message(VerticalScrollableMessage.ScrollTo, 0);
        this.entire_height = this.size[1];
      } else {
        //clear the last n lines
        //todo fix bug: does not change scrollbar stuff
        const clear_lines: number = Number(parts[0]);
        if (Number.isNaN(parts[0])) {
          return "First argument must be a number.";
        }
        //the -1 is because otherwise the current line counts as one
        this.text = this.text.split(" \n ").slice(0, -clear_lines - 1).join(" \n ");
        this.text += `${ this.text === "" ? "" : " \n " }${this.path}\$ `;
      }
      this.user_text = "";
      this.paragraph.text = this.text + "█";
      this.paragraph.lines = this.paragraph.calculate_lines();
      return;
    } else if (command === "pwd") {
      return this.path;
    } else if (command === "cd") {
      const new_path: Path = FileSystemObject.navigate_path(this.path, parts[0]);
      const response = this.send_request(WindowRequest.ReadFileSystem, {
        permission_type: "read_all_file_system",
        path: new_path,
      });
      if (typeof response === "undefined") {
        //path not found, or no permission
        return `Path "${new_path}" does not exist, or command needs to be rerun after read_all_file_system permission granted.`;
      }
      //make sure path exists
      this.path = new_path;
      return "";
    } else if (command === "ls") {
      let ls_path: Path;
      if (typeof parts[0] === "undefined") {
        //ls current directory
        ls_path = this.path;
      } else {
        //ls the given directory
        ls_path = FileSystemObject.navigate_path(this.path, parts[0]);
      }
      const response = this.send_request(WindowRequest.ReadFileSystem, {
        permission_type: "read_all_file_system",
        path: ls_path,
      });
      if (typeof response === "undefined") {
        //path not found, or no permission
        return `Path "${ls_path}" does not exist, or command needs to be rerun after read_all_file_system permission granted.`;
      }
      if (Object.keys(response).length === 0) {
        return "Empty";
      }
      let dir_contents: string[] = [];
      for (let i = 0; i < Object.keys(response).length; i++) {
        let key: string = Object.keys(response)[i];
        if (typeof response[key] === "string") {
          dir_contents.push(`${key} (f)`);
        } else if (typeof response[key] === "object") {
          dir_contents.push(`${key} (d)`);
        }
      }
      return dir_contents.join(", ");;
    } else if (command === "cat") {
      const cat_path: Path = FileSystemObject.navigate_path(this.path, parts[0]);
      const response = this.send_request(WindowRequest.ReadFileSystem, {
        permission_type: "read_all_file_system",
        path: cat_path,
      });
      if (typeof response === "undefined") {
        //path not found, or no permission
        return `Path "${cat_path}" does not exist, or command needs to be rerun after read_all_file_system permission granted.`;
      } else if (typeof response === "object") {
        return `Path ${cat_path} is a directory, not a file.`;
      }
      return response;
    } else if (command === "mkdir") {
      const mkdir_path: Path = FileSystemObject.navigate_path(this.path, parts[0]);
      //path of the parent of mkdir_path
      const parent_path: Path = `/${mkdir_path.split("/").slice(0, -1).join("/").slice(1)}`;
      const parent_response = this.send_request(WindowRequest.ReadFileSystem, {
        permission_type: "read_all_file_system",
        path: parent_path,
      });
      if (typeof parent_response === "undefined") {
        //path not found, or no permission
        return `Parent path "${parent_path}" does not exist, or command needs to be rerun after read_all_file_system permission granted.`;
      } else if (typeof parent_response === "string") {
        return `Parent path ${parent_path} is a file, not a directory.`;
      }
      const exists_response = this.send_request(WindowRequest.ReadFileSystem, {
        permission_type: "read_all_file_system",
        path: mkdir_path,
      });
      //we know read_all_file_system permission has been granted
      if (typeof exists_response !== "undefined") {
        //path not found, or no permission
        return `Path "${mkdir_path}" already exists, so a new directory with the same path cannot be created.`;
      }
      const create_response = this.send_request(WindowRequest.WriteFileSystem, {
        permission_type: "write_all_file_system",
        path: mkdir_path,
        content: {},
      });
      if (!create_response) {
        //will not be root error since root already exists based on previous checks
        return `Cannot create directory with path "${mkdir_path}", command needs to be rerun after write_all_file_system permission granted.`;
      }
      return "";
    } else if (command === "touch") {
      const touch_path: Path = FileSystemObject.navigate_path(this.path, parts[0]);
      //path of the parent of mkdir_path
      const parent_path: Path = `/${touch_path.split("/").slice(0, -1).join("/").slice(1)}`;
      const parent_response = this.send_request(WindowRequest.ReadFileSystem, {
        permission_type: "read_all_file_system",
        path: parent_path,
      });
      if (typeof parent_response === "undefined") {
        //path not found, or no permission
        return `Parent path "${parent_path}" does not exist, or command needs to be rerun after read_all_file_system permission granted.`;
      } else if (typeof parent_response === "string") {
        return `Parent path ${parent_path} is a file, not a directory.`;
      }
      const exists_response = this.send_request(WindowRequest.ReadFileSystem, {
        permission_type: "read_all_file_system",
        path: touch_path,
      });
      //we know read_all_file_system permission has been granted
      if (typeof exists_response !== "undefined") {
        //path not found, or no permission
        return `Path "${touch_path}" already exists, so a new directory with the same path cannot be created.`;
      }
      const create_response = this.send_request(WindowRequest.WriteFileSystem, {
        permission_type: "write_all_file_system",
        path: touch_path,
        content: "",
      });
      if (!create_response) {
        //will not be root error since root already exists based on previous checks
        return `Cannot create file with path "${touch_path}", command needs to be rerun after write_all_file_system permission granted.`;
      }
      return "";
    } else if (command === "rm") {
      const rm_path: Path = FileSystemObject.navigate_path(this.path, parts[0]);
      const exists_response = this.send_request(WindowRequest.ReadFileSystem, {
        permission_type: "read_all_file_system",
        path: rm_path,
      });
      if (typeof exists_response === "undefined") {
        //path not found, or no permission
        return `Path "${rm_path}" does not exist, or command needs to be rerun after read_all_file_system permission granted.`;
      } else if (typeof exists_response === "object" && Object.keys(exists_response).length > 0 && parts[1] !== "--nonempty") {
        return `Path "${rm_path}" is a non-empty directory. Run again with the "--nonempty" flag.`;
      }
      const remove_response = this.send_request(WindowRequest.RemoveFileSystem, {
        permission_type: "write_all_file_system",
        path: rm_path,
      });
      if (!remove_response) {
        return `Cannot remove path "${rm_path}", because command needs to be rerun after write_all_file_system permission granted, or remove path cannot be root.`;
      }
      return "";
    } else if (command === "var_list") {
      if (parts[0] === "--nameonly") {
        return Object.keys(this.vars).length === 0 ? "Empty" : Object.keys(this.vars).join(", ");
      } else if (typeof parts[0] === "string") {
        const var_name: string = parts[0]
        if (!Terminal.is_valid_var_name(var_name)) return "Variable name must start and end with $, and cannot have $ elsewhere.";
        if (typeof this.vars[var_name] === "undefined") {
          return "That variable does not exist";
        }
        return this.vars[var_name];
      } else {
        //dont forget var is a reserved keyword :)
        return Object.keys(this.vars).length === 0 ? "Empty" : Object.keys(this.vars).map((v: string) => `${v}: ${this.vars[v]}`).join(" \n ");
      }
    } else if (command === "var_set") {
      const var_name: string = parts.shift();
      if (!Terminal.is_valid_var_name(var_name)) return "Variable name must start and end with $, and cannot have $ elsewhere.";
      const input: string = parts.join(" ");
      if (parts[0] === "clear") {
        return "The \"clear\" command cannot be used in the \"var_set\" command as it does not return anything.";
      }
      this.vars[var_name] = this.handle_input(input);
      return this.vars[var_name];
    } else if (command === "var_clear") {
      //check if var exists
      const var_name: string = parts[0];
      if (!Terminal.is_valid_var_name(var_name)) return "Variable name must start and end with $, and cannot have $ elsewhere.";
      if (typeof this.vars[var_name] === "string") {
        delete this.vars[var_name];
        return "Cleared variable.";
      } else {
        return "Could not clear variable because it does not exist.";
      }
    } else if (command === "append") {
      const write_path: Path = FileSystemObject.navigate_path(this.path, parts.shift());
      const exists_response = this.send_request(WindowRequest.ReadFileSystem, {
        permission_type: "read_all_file_system",
        path: write_path,
      });
      if (typeof exists_response === "undefined") {
        //path not found, or no permission
        return `Path "${write_path}" does not exist, or command needs to be rerun after read_all_file_system permission granted.`;
      } else if (typeof exists_response === "object") {
        return `Path "${write_path}" is a directory. Cannot write text to a directory.`;
      }
      const content: string = exists_response + Terminal.add_vars_to_text(parts.join(" "), this.vars);
      const create_response = this.send_request(WindowRequest.WriteFileSystem, {
        permission_type: "write_all_file_system",
        path: write_path,
        content,
      });
      if (!create_response) {
        //will not be root error since root already exists based on previous checks
        return `Cannot append to file with path "${write_path}", command needs to be rerun after write_all_file_system permission granted.`;
      }
      return content;
    } else if (command === "overwrite") {
      const write_path: Path = FileSystemObject.navigate_path(this.path, parts.shift());
      const exists_response = this.send_request(WindowRequest.ReadFileSystem, {
        permission_type: "read_all_file_system",
        path: write_path,
      });
      if (typeof exists_response === "undefined") {
        //path not found, or no permission
        return `Path "${write_path}" does not exist, or command needs to be rerun after read_all_file_system permission granted.`;
      } else if (typeof exists_response === "object") {
        return `Path "${write_path}" is a directory. Cannot write text to a directory.`;
      }
      const content: string = Terminal.add_vars_to_text(parts.join(" "), this.vars);
      const create_response = this.send_request(WindowRequest.WriteFileSystem, {
        permission_type: "write_all_file_system",
        path: write_path,
        content,
      });
      if (!create_response) {
        //will not be root error since root already exists based on previous checks
        return `Cannot overwrite file with path "${write_path}", command needs to be rerun after write_all_file_system permission granted.`;
      }
      return content;
    } else if (command === "echo") {
      return Terminal.add_vars_to_text(parts.join(" ").replace("\\n", "\n"), this.vars);
    } else if (command === "terminal" || command === "settings" || command === "shortcuts" || command === "minesweeper" || command === "reversi" || command === "bag") {
      //if this.secret not given to OpenWindow request, wm will ask user for permission
      this.send_request(WindowRequest.OpenWindow, {
        name: command,
        open_layer_name: "windows",
        unique: false,
        //sub_size_y: true,
      });
      return `Trying to open ${command}...`;
    } else {
      return "Well, this shouldn't happen... That command should exist but doesn't.";
    }
    return "Well, this shouldn't happen... The command was not handled.";
  }
  render_view(theme: Themes) {
    const THEME_INFO: ThemeInfo = THEME_INFOS[theme];
    this.entire_context.fillStyle = THEME_INFO.alt_background;
    this.entire_context.fillRect(0, 0, this.size[0], this.entire_height);
    this.paragraph.render_view(theme, this.entire_context);
    super.render_view(theme);
  }
  handle_message(message: TerminalMessage | WindowMessage, data: any): boolean {
    if (message === WindowMessage.KeyDown && isKeyboardEvent(data)) {
      if (data.ctrlKey) return false;
      if (data.key.length === 1) {
        this.user_text += data.key;
      } else if (data.key === "Enter") {
        //process the command
        const result: string = this.handle_input(this.user_text);
        if (typeof result === "undefined") {
          //probably the clear command,
          //or another command that messes with the terminal text
          this.do_rerender = true;
          return this.do_rerender;
        }
        //add terminal text
        this.text += `${this.user_text} \n ${result} \n ${this.path}\$ `;
        this.previous_user_text = this.user_text;
        this.user_text = "";
      } else if (data.key === "Backspace") {
        this.user_text = this.user_text.slice(0, -1);
      } else if (data.key === "ArrowUp") {
        this.user_text = this.previous_user_text;
      } else if (data.key === "ArrowDown") {
        //clear user text
        this.user_text = "";
      }
      //set paragraph lines and calculate lines
      this.paragraph.text = this.text + this.user_text + "█";
      this.paragraph.lines = this.paragraph.calculate_lines();
      //recalculate total height of all terminal content
      const min_entire_height: number = WINDOW_TOP_HEIGHT + margin * SCALE * 2 + this.paragraph.lines.length * (FONT_SIZES.NORMAL + DEFAULT_LINE_HEIGHT_EXTRA);
      //entire height of canvas is min height of all content, or height of window, whichever is bigger
      this.entire_height = this.size[1] < min_entire_height ? min_entire_height : this.size[1];
      this.entire_canvas.height = this.entire_height;
      //move to bottom
      super.handle_message(VerticalScrollableMessage.ScrollTo, this.entire_height - this.size[1]);
      this.do_rerender = true;
    } else if (message === WindowMessage.WindowResize) {
      //make sure paragraph is rerendered!
      this.paragraph.line_width = this.size[0] - SCROLLBAR_WIDTH;
      this.paragraph.lines = this.paragraph.calculate_lines();
      //I thought there was some bug here but couldn't reproduce
      const min_entire_height: number = WINDOW_TOP_HEIGHT + margin * SCALE * 2 + this.paragraph.lines.length * (FONT_SIZES.NORMAL + DEFAULT_LINE_HEIGHT_EXTRA);
      if (min_entire_height > this.scroll_y + this.size[1]) {
        //if the height of all the content is smaller than the current scroll position + window height,
        //make sure the canvas height is still enough to fit all the content
        this.entire_height = min_entire_height;
        this.entire_canvas.height = this.entire_height;
      } else {
        //if the height of all the content is smaller than the current scroll position + window height,
        //expand the canvas height (so bottom will have black colour even if there is no content there)
        this.entire_height = this.scroll_y + this.size[1];
        this.entire_canvas.height = this.entire_height;
      }
      return super.handle_message(message, data); //will return `true`
    } else {
      return super.handle_message(message, data);
    }
    return this.do_rerender;
  }
}

