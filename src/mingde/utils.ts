import { CursorType } from './requests.js';
import { SHORTCUTS } from './mutables.js';

export const hex_chars: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];

export const b64_chars: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '/'];

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

export function uint8_to_hex(uint8: Uint8Array): string {
  let hex: string = "";
  for (let i = 0; i < uint8.length; i++) {
    hex += hex_chars[Math.floor(uint8[i] / 16)];
    hex += hex_chars[uint8[i] % 16];
  }
  return hex;
}

//typically,
//split into groups of 3 bytes (24 bits), pad if not a multiple of 3 bytes
//split into 4 groups of 6 bits, convert to char
//that's not quite what happens here
/*
export function uint8_to_b64(uint8: Uint8Array) {
  //to binary string
  const binary_string_all = [...uint8].map((b) => {
    let binary_string: string = "00000000";
    for (let i = 1; i <= 8; i++) {
      let temp_b: number = b - 2 ** (8 - i);
      if (temp_b >= 0) {
        binary_string = binary_string.substr(0, i - 1) + "1" + binary_string.substr(i);
        b = temp_b;
      }
    }
    return binary_string;
  }).join("");
  let sixes: string[] = [];
  for (let i = 0; i < binary_string_all.length / 6; i++) {
    let six: string = binary_string_all.slice(i * 6, (i+ 1) * 6);
    if (six.length !== 6) {
      six += "0".repeat(6 - six.length);
    }
    sixes.push(six);
  }
  let b64: string = sixes.map((s) => {
    //binary to number
    let n: number = 0;
    for (let i = 0; i < 6; i++) {
      n += s[i] === "1" ? (2 ** (5 - i)) : 0;
    }
    return b64_chars[n];
  }).join("");
  //output padding
  if (b64.length % 4 !== 0) {
    b64 += "=".repeat(4 - b64.length % 4);
  }
  return b64;
}
*/

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

export function calculate_lines(text: string, font_size: number, font_name: string, line_width: number, context: CanvasRenderingContext2D, colored: boolean = false): string[] {
  let lines: string[] = [];
  let line: string = "";
  let visible_line: string = ""; //same as line when colored is false
  context.font = `${font_size}px ${font_name}`;
  let words: string[] = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    let measured_width: number = context.measureText(visible_line + words[i]).width;
    if (words[i] === "\n") {
      lines.push(line);
      line = "";
      visible_line = "";
    } else if (colored && words[i].startsWith("\\033[") && words[i].endsWith(";m")) {
      line += words[i] + " ";
    } else if (measured_width > line_width) {
      let overflow_measured_width: number = context.measureText(words[i]).width;
      if (overflow_measured_width > line_width) {
        //if word gets too long, break it up and wrap over several lines
        //const old_visible_length: number = visible_line.length;
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
          visible_line = word_line;
        } else {
          line = "";
          visible_line = "";
        }
      } else {
        lines.push(line);
        line = words[i] + " ";
        visible_line = words[i] + " ";
      }
    } else {
      line += words[i] + " ";
      visible_line += words[i] + " ";
    }
  }
  if (line) lines.push(line);
  //get rid of trailing space added that wasn't there
  return lines.map((l) => l.slice(0, -1));
}

export function image_to_data_url(image: HTMLImageElement) {
  const canvas: HTMLCanvasElement = document.createElement("CANVAS") as HTMLCanvasElement;
  const context = canvas.getContext("2d");
  context.drawImage(image, image.width, image.height);
  return canvas.toDataURL();
}

