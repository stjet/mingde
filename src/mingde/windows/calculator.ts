import { Component, Window, WindowMessage } from '../wm.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';
import { SCALE, WINDOW_TOP_HEIGHT, FONT_NAME } from '../constants.js';

import { Button } from '../components/button.js';

enum CalculatorOperation {
  Add,
  Sub,
  Mul,
  Div,
  None,
}

enum CalculatorMessage {
  //
}

const margin: number = 15;
const b_height: number = 26;
const b_width: number = 32;
const b_width_large: number = 42;
const b_margin_1: number = 8;
const b_margin_2: number = 5;
const calculator_size: number = margin * 3 + b_width * 6 + 4 * b_margin_2;
//font size 13px, total 26px

export class Calculator extends Window<CalculatorMessage> {
  current_total: number;
  current_operation: CalculatorOperation;
  current_value: string;
  components: Component<CalculatorMessage | WindowMessage>[];

  constructor() {
    super([calculator_size, calculator_size], "Calculator", "calculator");
    this.resizable = false;
    this.current_total = 0;
    this.current_operation = CalculatorOperation.None;
    this.current_value = "0";
    this.components = [];
    //inverted button
    this.components.push(new Button(this, "", [margin, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1], b_width, 13 / 2, () => {
      //
    }, undefined, true, undefined, true));
    //C, CE, Back
    this.components.push(new Button(this, "C", [this.size[0] / SCALE - margin - b_width_large, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1], b_width_large, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "rgb(128, 0, 0)"));
    this.components.push(new Button(this, "CE", [this.size[0] / SCALE - margin - b_width_large * 2 - b_margin_2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1], b_width_large, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "rgb(128, 0, 0)"));
    this.components.push(new Button(this, "Back", [this.size[0] / SCALE - margin - b_width_large * 3 - b_margin_2 * 2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1], b_width_large, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "rgb(128, 0, 0)"));
    //MC, MR, MS, M+
    this.components.push(new Button(this, "MC", [margin, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 2 + b_height], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "red"));
    this.components.push(new Button(this, "MR", [margin, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 3 + b_height * 2], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "red"));
    this.components.push(new Button(this, "MS", [margin, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 4 + b_height * 3], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "red"));
    this.components.push(new Button(this, "M+", [margin, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 5 + b_height * 4], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "red"));
    //7, 8, 9, /, sqrt
    this.components.push(new Button(this, "7", [margin * 2 + b_width, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 2 + b_height], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "8", [margin * 2 + b_width * 2 + b_margin_2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 2 + b_height], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "9", [margin * 2 + b_width * 3 + b_margin_2 * 2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 2 + b_height], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "/", [margin * 2 + b_width * 4 + b_margin_2 * 3, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 2 + b_height], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "red"));
    this.components.push(new Button(this, "sqrt", [margin * 2 + b_width * 5 + b_margin_2 * 4, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 2 + b_height], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "darkblue"));
    //4, 5, 6, *, %
    this.components.push(new Button(this, "4", [margin * 2 + b_width, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 3 + b_height * 2], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "5", [margin * 2 + b_width * 2 + b_margin_2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 3 + b_height * 2], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "6", [margin * 2 + b_width * 3 + b_margin_2 * 2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 3 + b_height * 2], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "*", [margin * 2 + b_width * 4 + b_margin_2 * 3, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 3 + b_height * 2], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "red"));
    this.components.push(new Button(this, "%", [margin * 2 + b_width * 5 + b_margin_2 * 4, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 3 + b_height * 2], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "darkblue"));
    //1, 2, 3, -, 1/x
    this.components.push(new Button(this, "1", [margin * 2 + b_width, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 4 + b_height * 3], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "2", [margin * 2 + b_width * 2 + b_margin_2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 4 + b_height * 3], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "3", [margin * 2 + b_width * 3 + b_margin_2 * 2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 4 + b_height * 3], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "-", [margin * 2 + b_width * 4 + b_margin_2 * 3, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 4 + b_height * 3], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "red"));
    this.components.push(new Button(this, "1/x", [margin * 2 + b_width * 5 + b_margin_2 * 4, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 4 + b_height * 3], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "darkblue"));
    //0, +/-, ., +, =
    this.components.push(new Button(this, "0", [margin * 2 + b_width, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 5 + b_height * 4], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "+/-", [margin * 2 + b_width * 2 + b_margin_2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 5 + b_height * 4], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, ".", [margin * 2 + b_width * 3 + b_margin_2 * 2, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 5 + b_height * 4], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "blue", "dodgerblue"));
    this.components.push(new Button(this, "+", [margin * 2 + b_width * 4 + b_margin_2 * 3, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 5 + b_height * 4], b_width, 13 / 2, () => {
      //
    }, true, undefined, undefined, true, "red"));
    this.components.push(new Button(this, "=", [margin * 2 + b_width * 5 + b_margin_2 * 4, WINDOW_TOP_HEIGHT / SCALE + margin + 24 + b_margin_1 * 5 + b_height * 4], b_width, 13 / 2, () => {
      //
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
  handle_message(_message: CalculatorMessage | WindowMessage, _data: any): boolean {
    //
    return this.do_rerender;
  }
}

