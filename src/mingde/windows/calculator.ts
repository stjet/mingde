import { Component, Window, WindowMessage } from '../wm.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';
import { SCALE, WINDOW_TOP_HEIGHT, FONT_NAME } from '../constants.js';
import { isMouseEvent } from '../guards.js';

import { Button } from '../components/button.js';

//% is modulo not percentage. percentage is dumb, just divide by 100

export enum CalculatorOperation {
  Add = "+",
  Sub = "-",
  Mul = "*",
  Div = "/",
  Mod = "%",
  None = "",
}

enum CalculatorMessage {
  Num, //0-9, .
  Op, //*, /, -, +
  SingleOp, //single operation like sqrt, 1/x
  Eq, //=
  Sign, //+/- (bool)
  Back, //(bool, is backspace)
  C, //(bool)
  CE, //(bool)
  M, //MC, MR, MS, M+
}

const margin: number = 15;
const b_height: number = 26;
const b_width: number = 32;
const b_width_large: number = 42;
const b_margin_1: number = 8;
const b_margin_2: number = 5;
const calculator_size: number = margin * 3 + b_width * 6 + 4 * b_margin_2;

const length_limit: number = 18; //technically can go up to 19 because of sign change, or higher because operations

//font size 13px, total 26px

export class Calculator extends Window<CalculatorMessage> {
  private current_total: number;
  private current_operation: CalculatorOperation;
  private current_value: string;
  private memory: number;
  components: Component<CalculatorMessage | WindowMessage>[];

  constructor() {
    super([calculator_size, calculator_size], "Calculator", "calculator");
    this.resizable = false;
    this.current_total = 0;
    this.current_operation = CalculatorOperation.None;
    this.current_value = "0";
    this.memory = 0;
    this.components = [];
    //inverted button
    this.components.push(new Button(this, "", [margin, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1], b_width, 13 / 2, () => {
      //
    }, undefined, true, undefined, true));
    //C, CE, Back
    this.components.push(new Button(this, "C", [this.size[0] / SCALE - margin - b_width_large, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1], b_width_large, 13 / 2, () => {
      this.handle_message(CalculatorMessage.C, true);
    }, true, undefined, undefined, true, "rgb(128, 0, 0)"));
    this.components.push(new Button(this, "CE", [this.size[0] / SCALE - margin - b_width_large * 2 - b_margin_2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1], b_width_large, 13 / 2, () => {
      this.handle_message(CalculatorMessage.CE, true);
    }, true, undefined, undefined, true, "rgb(128, 0, 0)"));
    this.components.push(new Button(this, "Back", [this.size[0] / SCALE - margin - b_width_large * 3 - b_margin_2 * 2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1], b_width_large, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Back, true);
    }, true, undefined, undefined, true, "rgb(128, 0, 0)"));
    //MC, MR, MS, M+
    this.components.push(new Button(this, "MC", [margin, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 2 + b_height], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.M, "MC");
    }, true, undefined, undefined, true, "red"));
    this.components.push(new Button(this, "MR", [margin, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 3 + b_height * 2], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.M, "MR");
    }, true, undefined, undefined, true, "red"));
    this.components.push(new Button(this, "MS", [margin, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 4 + b_height * 3], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.M, "MS");
    }, true, undefined, undefined, true, "red"));
    this.components.push(new Button(this, "M+", [margin, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 5 + b_height * 4], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.M, "M+");
    }, true, undefined, undefined, true, "red"));
    //7, 8, 9, /, sqrt
    this.components.push(new Button(this, "7", [margin * 2 + b_width, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 2 + b_height], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Num, "7");
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "8", [margin * 2 + b_width * 2 + b_margin_2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 2 + b_height], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Num, "8");
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "9", [margin * 2 + b_width * 3 + b_margin_2 * 2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 2 + b_height], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Num, "9");
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "/", [margin * 2 + b_width * 4 + b_margin_2 * 3, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 2 + b_height], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Op, "/");
    }, true, undefined, undefined, true, "red"));
    this.components.push(new Button(this, "sqrt", [margin * 2 + b_width * 5 + b_margin_2 * 4, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 2 + b_height], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.SingleOp, "sqrt");
    }, true, undefined, undefined, true, "darkblue"));
    //4, 5, 6, *, %
    this.components.push(new Button(this, "4", [margin * 2 + b_width, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 3 + b_height * 2], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Num, "4");
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "5", [margin * 2 + b_width * 2 + b_margin_2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 3 + b_height * 2], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Num, "5");
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "6", [margin * 2 + b_width * 3 + b_margin_2 * 2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 3 + b_height * 2], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Num, "6");
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "*", [margin * 2 + b_width * 4 + b_margin_2 * 3, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 3 + b_height * 2], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Op, "*");
    }, true, undefined, undefined, true, "red"));
    this.components.push(new Button(this, "%", [margin * 2 + b_width * 5 + b_margin_2 * 4, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 3 + b_height * 2], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Op, "%");
    }, true, undefined, undefined, true, "red"));
    //1, 2, 3, -, 1/x
    this.components.push(new Button(this, "1", [margin * 2 + b_width, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 4 + b_height * 3], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Num, "1");
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "2", [margin * 2 + b_width * 2 + b_margin_2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 4 + b_height * 3], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Num, "2");
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "3", [margin * 2 + b_width * 3 + b_margin_2 * 2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 4 + b_height * 3], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Num, "3");
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "-", [margin * 2 + b_width * 4 + b_margin_2 * 3, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 4 + b_height * 3], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Op, "-");
    }, true, undefined, undefined, true, "red"));
    this.components.push(new Button(this, "1/x", [margin * 2 + b_width * 5 + b_margin_2 * 4, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 4 + b_height * 3], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.SingleOp, "1/x");
    }, true, undefined, undefined, true, "darkblue"));
    //0, +/-, ., +, =
    this.components.push(new Button(this, "0", [margin * 2 + b_width, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 5 + b_height * 4], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Num, "0");
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "+/-", [margin * 2 + b_width * 2 + b_margin_2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 5 + b_height * 4], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Sign, true);
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, ".", [margin * 2 + b_width * 3 + b_margin_2 * 2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 5 + b_height * 4], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Num, ".");
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "+", [margin * 2 + b_width * 4 + b_margin_2 * 3, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 5 + b_height * 4], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Op, "+");
    }, true, undefined, undefined, true, "red"));
    this.components.push(new Button(this, "=", [margin * 2 + b_width * 5 + b_margin_2 * 4, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 5 + b_height * 4], b_width, 13 / 2, () => {
      this.handle_message(CalculatorMessage.Eq, true);
    }, true, undefined, undefined, true, "red"));
  }
  render_view(theme: Themes) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    //calc display
    this.context.fillStyle = theme_info.border_left_top;
    this.context.fillRect(margin * SCALE, WINDOW_TOP_HEIGHT + margin * SCALE, this.size[0] - margin * SCALE * 2, 24 * SCALE);
    //calc display bottom right input double layer
    this.context.lineWidth = 1 * SCALE;
    this.context.strokeStyle = theme_info.background;
    let display_bottom_right_first = new Path2D();
    display_bottom_right_first.moveTo(margin * SCALE, WINDOW_TOP_HEIGHT + (margin + 24 - 1) * SCALE);
    display_bottom_right_first.lineTo(this.size[0] - (margin + 1) * SCALE, WINDOW_TOP_HEIGHT + (margin + 24 - 1) * SCALE);
    display_bottom_right_first.lineTo(this.size[0] - (margin + 1) * SCALE, WINDOW_TOP_HEIGHT + margin * SCALE);
    this.context.stroke(display_bottom_right_first);
    this.context.strokeStyle = theme_info.border_left_top;
    let display_bottom_right_second = new Path2D();
    display_bottom_right_second.moveTo(margin * SCALE, WINDOW_TOP_HEIGHT + (margin + 24) * SCALE);
    display_bottom_right_second.lineTo(this.size[0] - margin * SCALE, WINDOW_TOP_HEIGHT + (margin + 24) * SCALE);
    display_bottom_right_second.lineTo(this.size[0] - margin * SCALE, WINDOW_TOP_HEIGHT + margin * SCALE);
    this.context.stroke(display_bottom_right_second);
    //calc display top right input
    this.context.lineWidth = 2 * SCALE;
    this.context.strokeStyle = theme_info.border_right_bottom;
    let display_top_left = new Path2D();
    display_top_left.moveTo(margin * SCALE, WINDOW_TOP_HEIGHT + (margin + 24) * SCALE);
    display_top_left.lineTo(margin * SCALE, WINDOW_TOP_HEIGHT + margin * SCALE);
    display_top_left.lineTo(this.size[0] - margin * SCALE, WINDOW_TOP_HEIGHT + margin * SCALE);
    this.context.stroke(display_top_left);
    //calc display text
    this.context.textBaseline = "bottom";
    this.context.fillStyle = theme_info.text_primary;
    this.context.font = `${(24 - 8) * SCALE}px ${FONT_NAME}`;
    const display_text_width: number = this.context.measureText(this.current_value).width;
    this.context.fillText(this.current_value, this.size[0] - margin * SCALE - display_text_width - 3 * SCALE, WINDOW_TOP_HEIGHT + (margin + 24 - 4) * SCALE);
    let components = this.components;
    for (let j = 0; j < components.length; j++) {
      components[j].render_view(theme);
    }
  }
  handle_message(message: CalculatorMessage | WindowMessage, data: any): boolean {
    if (message === WindowMessage.MouseDown && isMouseEvent(data)) {
      let relevant_components = this.components.filter((c) => {
        return data.clientX > c.coords[0] && data.clientY > c.coords[1] && data.clientX < c.coords[0] + c.size[0] && data.clientY < c.coords[1] + c.size[1] && c.clickable;
      });
      relevant_components.forEach((c) => c.handle_message(message, data));
      if (relevant_components.length > 0) {
        this.do_rerender = true;
      }
    } else if (message === CalculatorMessage.C) {
      this.do_rerender = true;
      //clear it all
      this.current_total = 0;
      this.current_operation = CalculatorOperation.None;
      this.current_value = "0";
    } else if (message === CalculatorMessage.CE) {
      this.do_rerender = true;
      //clear entry
      if (isNaN(Number(this.current_value)) && this.current_operation !== CalculatorOperation.None) {
        //current value is an operator, so clear operation and so current total
        this.current_value = String(this.current_total);
        this.current_operation = CalculatorOperation.None;
      } else if (this.current_operation !== CalculatorOperation.None) {
        //currently a number, so clear and revert back to operation
        this.current_value = this.current_operation;
      } else {
        //no operation set (current value is a number), so revert back to current total
        this.current_value = String(this.current_total);
      }
    } else if (message === CalculatorMessage.Back) {
      if (!isNaN(Number(this.current_value))) {
        //is number, and length more than 1 if pos, or is number, and length more than 2 if neg
        if ((this.current_value.length > 1 && Number(this.current_value) >= 0) || (this.current_value.length > 2)) {
          this.do_rerender = true;
          this.current_value = this.current_value.slice(0, -1);
        }
      }
    } else if (message === CalculatorMessage.Num) {
      this.do_rerender = true;
      if (this.current_value.length === length_limit) {
        this.do_rerender = false;
      } else if ((this.current_value === "0" && !isNaN(Number(data))) || isNaN(Number(this.current_value))) {
        //if current value is 0, and data is a number, new current value is that number
        //or if current value is not a number (operator)
        this.current_value = data;
      } else if (data === ".") {
        //make sure there isn't already a .
        if (this.current_value.includes(".")) {
          this.do_rerender = false;
        } else {
          this.current_value += data;
        }
      } else {
        this.current_value += data;
      }
    } else if (message === CalculatorMessage.Sign) {
      if (!isNaN(Number(this.current_value)) && Number(this.current_value) !== 0) {
        this.do_rerender = true;
        //if current value is a number (not an operator)
        if (Number(this.current_value) > 0) {
          //flip to negative
          this.current_value = "-" + this.current_value;
        } else {
          //flip to positive
          this.current_value = this.current_value.slice(1);
        }
      }
    } else if (message === CalculatorMessage.SingleOp && typeof data === "string") {
      //data is string
      if (!isNaN(Number(this.current_value))) {
        this.do_rerender = true;
        if (data === "sqrt") {
          this.current_total = Math.sqrt(Number(this.current_value));
          this.current_value = String(this.current_total);
        } else if (data === "1/x") {
          this.current_total = 1 / Number(this.current_value);
          this.current_value = String(this.current_total);
        }
      }
    } else if (message === CalculatorMessage.Op && typeof data === "string") {
      if (this.current_operation === CalculatorOperation.None) {
        this.do_rerender = true;
        this.current_total = Number(this.current_value);
        if (data === "*") {
          this.current_operation = CalculatorOperation.Mul;
        } else if (data === "/") {
          this.current_operation = CalculatorOperation.Div;
        } else if (data === "-") {
          this.current_operation = CalculatorOperation.Sub;
        } else if (data === "+") {
          this.current_operation = CalculatorOperation.Add;
        } else if (data === "%") {
          this.current_operation = CalculatorOperation.Mod;
        }
        this.current_value = this.current_operation;
      }
    } else if (message === CalculatorMessage.Eq) {
      if (this.current_operation !== CalculatorOperation.None && !isNaN(Number(this.current_value))) {
        this.do_rerender = true;
        if (this.current_operation === CalculatorOperation.Mul) {
          this.current_total *= Number(this.current_value);
        } else if (this.current_operation === CalculatorOperation.Div) {
          this.current_total /= Number(this.current_value);
        } else if (this.current_operation === CalculatorOperation.Add) {
          this.current_total += Number(this.current_value);
        } else if (this.current_operation === CalculatorOperation.Sub) {
          this.current_total -= Number(this.current_value);
        } else if (this.current_operation === CalculatorOperation.Mod) {
          this.current_total %= Number(this.current_value);
        }
        this.current_value = String(this.current_total);
        this.current_operation = CalculatorOperation.None;
      } else if (!isNaN(Number(this.current_value))) {
        this.current_total = Number(this.current_value);
      }
    } else if (message === CalculatorMessage.M && typeof data === "string") {
      this.do_rerender = true;
      //all based on current total not current value
      if (data === "MC") {
        //memory clear
        this.memory = 0;
      } else if (data === "MR") {
        //memory recall
        //not sure if this'll cause bugs or not
        this.current_value = String(this.memory);
      } else if (data === "MS") {
        //memory store
        this.memory = this.current_total;
      } else if (data === "M+") {
        this.memory += this.current_total;
      }
    }
    //
    return this.do_rerender;
  }
}

