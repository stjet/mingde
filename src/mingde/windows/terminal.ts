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
  echo: {
    usage: "echo [...unlimited arguments]",
    short: "Print something to the terminal",
    long: "Print something to the terminal",
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
  private path: Path;

  constructor(size: [number, number]) {
    super(size, "Terminal", size[1], "terminal");
    this.path = "/usr";
    this.text = `Mingde Terminal \n \n ${this.path}\$ `;
    this.user_text = "";
    this.paragraph = new Paragraph(this, this.text, [margin, WINDOW_TOP_HEIGHT / SCALE + margin + FONT_SIZES.NORMAL / SCALE], "alt_text", "NORMAL", this.size[0] / SCALE - SCROLLBAR_WIDTH / SCALE, undefined, true);
    this.paragraph.text = this.text + this.user_text + "█";
    this.paragraph.lines = this.paragraph.calculate_lines();
  }
  //return undefined if the command shouldn't show (like `clear`)
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
      return `Command \`${command}\` not found. Do \`help\` to see all commands.`;
    }
    if (command === "help") {
      if (parts.length === 0) {
        return "All Commands: "+Object.keys(command_info).map((key) => ` \n - ${key}: ${command_info[key].short}`)+" \n \n Do `help <command name>` to learn more about a specific command.";
      } else {
        let specific_info: CommandInfo | undefined = command_info[parts[0]];
        if (!specific_info) {
          return `Could not find help info for command \`${command}\`, does it exist? Do \`help\` to see all commands.`;
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
      this.path = FileSystemObject.navigate_path(this.path, parts[0]);
      console.log(this.path);
      return "";
    } else if (command === "echo") {
      return parts.join(" ").replace("\\n", "\n");
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
      if (data.key.length === 1) {
        this.user_text += data.key;
      } else if (data.key === "Enter") {
        //process the command
        const result: string = this.handle_input(this.user_text);
        if (typeof result === "undefined") {
          //probably the `clear` command,
          //or another command that messes with the terminal text
          this.do_rerender = true;
          return this.do_rerender;
        }
        //add terminal text
        this.text += `${this.user_text} \n ${result} \n ${this.path}\$ `; 
        this.user_text = "";
      } else if (data.key === "Backspace") {
        this.user_text = this.user_text.slice(0, -1);
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

