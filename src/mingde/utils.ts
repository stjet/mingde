import { CursorType } from './requests.js';

function gen_random(bytes_num: number) {
  let uint8 = new Uint8Array(bytes_num);
  (crypto || window.crypto).getRandomValues(uint8);
  return uint8;
}

function uint8_to_hex(uint8: Uint8Array) {
  const hex_chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
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

