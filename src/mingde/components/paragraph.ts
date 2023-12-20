import { Component, WindowLike, WindowMessage } from '../wm.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';
import { SCALE, FONT_NAME, FONT_NAME_MONO, FONT_SIZES } from '../constants.js';
import { calculate_lines } from '../utils.js';

export const DEFAULT_LINE_HEIGHT_EXTRA: number = 2;

interface ColorInfo {
  variant: "foreground" | "background",
  color: string,
};

const COLOR_CODES: Record<string, ColorInfo> = {
  //black
  "30": {
    variant: "foreground",
    color: "rgb(0, 0, 0)",
  },
  "40": {
    variant: "background",
    color: "rgb(0, 0, 0)",
  },
  //red
  "31": {
    variant: "foreground",
    color: "rgb(170, 0, 0)",
  },
  "41": {
    variant: "background",
    color: "rgb(0, 0, 0)",
  },
  //green
  "32": {
    variant: "foreground",
    color: "rgb(0, 170, 0)",
  },
  "42": {
    variant: "background",
    color: "rgb(0, 170, 0)",
  },
  //yellow
  "33": {
    variant: "foreground",
    color: "rgb(170, 85, 0)",
  },
  "43": {
    variant: "background",
    color: "rgb(170, 85, 0)",
  },
  //blue
  "34": {
    variant: "foreground",
    color: "rgb(0, 0, 170)",
  },
  "44": {
    variant: "background",
    color: "rgb(0, 0, 170)",
  },
  //magenta
  "35": {
    variant: "foreground",
    color: "rgb(170, 0, 170)",
  },
  "45": {
    variant: "background",
    color: "rgb(170, 0, 170)",
  },
  //cyan
  "36": {
    variant: "foreground",
    color: "rgb(0, 170, 170)",
  },
  "46": {
    variant: "background",
    color: "rgb(0, 170, 170)",
  },
  //white
  "37": {
    variant: "foreground",
    color: "rgb(170, 170, 170)",
  },
  "47": {
    variant: "background",
    color: "rgb(170, 170, 170)",
  },
  //"0" resets
};

export class Paragraph<MessageType> implements Component<MessageType> {
  readonly type: string = "paragraph";
  clickable: boolean = false;

  id: string;
  readonly parent: WindowLike<MessageType | WindowMessage>;
  text: string;
  coords: [number, number];
  size: [number, number];
  color: keyof ThemeInfo;
  font_size: keyof typeof FONT_SIZES;
  line_width: number;
  monospace: boolean;
  colored: boolean;
  line_height?: number;

  lines: string[];

  private cached_theme?: Themes;
  
  constructor(parent: WindowLike<MessageType | WindowMessage>, text: string, coords: [number, number], color: keyof ThemeInfo, font_size: keyof typeof FONT_SIZES, line_width: number, line_height?: number, monospace: boolean = false, colored: boolean = false) {
    this.parent = parent;
    this.text = text;
    this.coords = [coords[0] * SCALE, coords[1] * SCALE];
    this.color = color;
    this.font_size = font_size;
    this.line_width = line_width * SCALE;
    this.line_height = line_height;
    this.monospace = monospace;
    this.colored = colored;
    //do not set lines in the function since otherwise strict compiler will be annoying
    this.lines = calculate_lines(this.text, FONT_SIZES[this.font_size], this.monospace ? FONT_NAME_MONO : FONT_NAME, this.line_width, this.parent.context, this.colored);
  }
  get lines_length(): number {
    return this.lines.length;
  }
  calculate_lines() {
    return calculate_lines(this.text, FONT_SIZES[this.font_size], this.monospace ? FONT_NAME_MONO : FONT_NAME, this.line_width, this.parent.context, this.colored);
  }
  render_view(theme: Themes, context: CanvasRenderingContext2D = this.parent.context) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    context.font = `${FONT_SIZES[this.font_size]}px ${ this.monospace ? FONT_NAME_MONO : FONT_NAME }`;
    context.fillStyle = theme_info[this.color];
    context.textBaseline = "bottom";
    //if needed, calculate lines
    if (this.cached_theme !== theme) {
      this.lines = calculate_lines(this.text, FONT_SIZES[this.font_size], this.monospace ? FONT_NAME_MONO : FONT_NAME, this.line_width, context, this.colored);
      this.cached_theme = theme;
    }
    let line_height: number = typeof this.line_height === "number" ? this.line_height : FONT_SIZES[this.font_size] + DEFAULT_LINE_HEIGHT_EXTRA;
    this.size = [this.line_width, line_height * this.lines.length];
    for (let i = 0; i < this.lines.length; i++) {
      if (this.colored) {
        //kinda like ansi colour codes, but only support text colour, background colour, and returning to original colour
        //\033[a;b;m
        const line_words: string[] = this.lines[i].split(" ");
        let current_offset: number = 0;
        let current_write: string = "";
        let current_bg: string | undefined;
        for (let j = 0; j < line_words.length; j++) {
          if (line_words[j].startsWith("\\033[") && line_words[j].endsWith(";m")) {
            const current_write_width: number = context.measureText(current_write).width;
            const color_parts: string[] = line_words[j].slice(5, -2).split(";");
            //write the text
            if (current_bg) {
              const prev_fill: string = context.fillStyle;
              context.fillStyle = current_bg;
              context.fillRect(this.coords[0] + current_offset, this.coords[1] + (i - 1) * line_height, current_write_width, line_height);
              //reset fill style back to text colour
              context.fillStyle = prev_fill;
            }
            context.fillText(current_write, this.coords[0] + current_offset, this.coords[1] + i * line_height);
            current_offset += current_write_width;
            current_write = "";
            //change colours
            for (let k = 0; k < color_parts.length; k++) {
              if (color_parts[k] === "0") {
                //reset to normal
                context.fillStyle = theme_info[this.color];
                current_bg = undefined;
              } else {
                const code_info = COLOR_CODES[color_parts[k]];
                if (code_info) {
                  if (code_info.variant === "foreground") {
                    context.fillStyle = code_info.color;
                  } else if (code_info.variant === "background") {
                    current_bg = code_info.color;
                  }
                }
              }
            }
          } else {
            current_write += line_words[j];
            const current_write_width: number = context.measureText(current_write).width;
            //do not add space to end if last word, or all the words on the line are just colour changes
            //works well enough
            if (j !== line_words.length - 1 && !line_words.slice(j + 1).every((w) => w.startsWith("\\033[") && w.endsWith(";m"))) {
              current_write += " ";
            }
            if (j === line_words.length - 1) {
              if (current_bg) {
                const prev_fill: string = context.fillStyle;
                context.fillStyle = current_bg;
                context.fillRect(this.coords[0] + current_offset, this.coords[1] + (i - 1) * line_height, current_write_width, line_height);
                //reset fill style back to text colour
                context.fillStyle = prev_fill;
              }
              context.fillText(current_write, this.coords[0] + current_offset, this.coords[1] + i * line_height);
              current_offset += current_write_width;
            }
          }
        }
      } else {
        context.fillText(this.lines[i], this.coords[0], this.coords[1] + i * line_height);
      }
    }
  }
  handle_message(_message: MessageType | WindowMessage, _data: any) {
    //
  }
}

