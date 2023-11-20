import { CursorType } from './requests.js';
import { SHORTCUTS } from './mutables.js';

export const hex_chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];

export enum ValidationState {
  Valid,
  Invalid,
  Neither,
}

function gen_random(bytes_num: number) {
  let uint8 = new Uint8Array(bytes_num);
  (crypto || window.crypto).getRandomValues(uint8);
  return uint8;
}

function uint8_to_hex(uint8: Uint8Array) {
  let hex = "";
  for (let i = 0; i < uint8.length; i++) {
    hex += hex_chars[Math.floor(uint8[i] / 16)];
    hex += hex_chars[uint8[i] % 16];
  }
  return hex;
}

export function gen_secret() {
  return uint8_to_hex(gen_random(16));
}

export interface DesktopTime {
  hours: number;
  minutes: number;
}

export function get_time(utc: boolean = false) {
  if (utc) {
    return {
      hours: new Date().getUTCHours(),
      minutes: new Date().getUTCMinutes(),
    };
  } else {
    return {
      hours: new Date().getHours(),
      minutes: new Date().getMinutes(),
    };
  }
}

//ideas for information to include: possibly include data on whether window is focused?
//create the "buttons" property of mouse events that we set
export function create_me_buttons(cursor_type: CursorType): number {
  return Number(String(Object.values(CursorType).indexOf(cursor_type))+"000");
}

//interpret the "buttons" property of mouse events that we set
export function interpret_me_buttons(buttons: number): [CursorType] {
  //pad to 4 digits
  let b_string: string = "0".repeat(4-String(buttons).length)+String(buttons);
  //first digit is cursortype
  let cursor_type: CursorType;
  if (Number(b_string[0]) < Object.keys(CursorType).length) {
    cursor_type = CursorType[Object.keys(CursorType)[Number(b_string[0])]];
  } else {
    cursor_type = CursorType.Default;
  }
  //
  return [cursor_type];
}

export function random_int(lower: number, upper: number): number {
  return lower + Math.floor(Math.random() * (upper - lower));
}

export function key_is_switch_focus_shortcut(key: string): boolean {
  return SHORTCUTS["switch-0"].includes(key) || SHORTCUTS["switch-1"].includes(key) || SHORTCUTS["switch-2"].includes(key) || SHORTCUTS["switch-3"].includes(key) || SHORTCUTS["switch-4"].includes(key) || SHORTCUTS["switch-5"].includes(key) || SHORTCUTS["switch-6"].includes(key) || SHORTCUTS["switch-7"].includes(key) || SHORTCUTS["switch-8"].includes(key) || SHORTCUTS["switch-9"].includes(key);
}

export function get_switch_key_index(key: string): number {
  for (let i = 0; i < 10; i++) {
    if (SHORTCUTS[`switch-${i}`].includes(key)) {
      return i;
    }
  }
  return 0; //should never get here
}

export function list_list_includes(list_list: any[][], list: any[]): boolean {
  return list_list.find((l) => {
    for (let i = 0; i < l.length; i++) {
      if (l[i] !== list[i]) {
        return false;
      }
    }
    return true;
  }) ? true : false;
}

export function calculate_lines(text: string, font_size: number, font_name: string, line_width: number, context: CanvasRenderingContext2D): string[] {
  let lines: string[] = [];
  let line: string = "";
  context.font = `${font_size}px ${font_name}`;
  let words: string[] = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    let measured_width: number = context.measureText(line + words[i]).width;
    if (words[i] === "\n") {
      lines.push(line);
      line = "";
    } else if (measured_width > line_width) {
      let overflow_measured_width: number = context.measureText(words[i]).width;
      if (overflow_measured_width > line_width) {
        //if word gets too long, break it up and wrap over several lines
        let word_line: string = line; //starting from the current line (don't start long word on new line)
        for (let j = 0; j < words[i].length; j++) {
          let word_measured_width: number = context.measureText(word_line + words[i][j]).width;
          if (word_measured_width > line_width && word_line.length === 0) {
            //if single character larger than line width, fit it on the line anyways (otherwise it will never display)
            lines.push(words[i][j]);
          } if (word_measured_width > line_width) {
            lines.push(word_line);
            word_line = words[i][j];
          } else {
            word_line += words[i][j];
          }
        }
        if (word_line.length > 0) {
          line = word_line + " ";
        } else {
          line = "";
        }
      } else {
        lines.push(line);
        line = words[i] + " ";
      }
    } else {
      line += words[i] + " ";
    }
  }
  if (line) lines.push(line);
  return lines;
}

