import { Component, WindowLike, WindowMessage } from '../wm.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';
import { SCALE, FONT_NAME, FONT_SIZES } from '../constants.js';

export enum Alignment {
  Centre,
  Left,
  Right,
}

export class Button<MessageType> implements Component<MessageType> {
  readonly type: string = "button";
  clickable: boolean = true;

  id: string;  
  readonly parent: WindowLike<MessageType | WindowMessage>;
  text: string;
  coords: [number, number];
  size: [number, number];
  width: number; //width of button, text will be centered inside
  padding_y: number;
  click_func: () => void; //doesn't feel very elm-like? not sure..
  bold: boolean;
  inverted: boolean;
  alignment: Alignment;

  constructor(parent: WindowLike<MessageType | WindowMessage>, text: string, coords: [number, number], width: number, padding_y: number, click_func: () => void, bold: boolean = false, inverted: boolean = false, alignment: Alignment = Alignment.Centre) {
    //I am not a fan of parameter properties
    this.id = `${parent.id}-${this.type}-random-${Math.floor(Math.random() * 10000)}`; //dumb, but placeholder, kinda
    this.parent = parent;
    this.text = text;
    this.coords = [coords[0] * SCALE, coords[1] * SCALE];
    this.width = width * SCALE;
    this.padding_y = padding_y * SCALE;
    this.size = [this.width, padding_y * 2 + FONT_SIZES.BUTTON];
    this.click_func = click_func;
    this.bold = bold;
    this.inverted = inverted;
    this.alignment = alignment;
  }
  render_view(theme: Themes) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    this.parent.context.font = `${this.bold ? "bold " : ""}${FONT_SIZES.BUTTON}px ${FONT_NAME}`;
    const measured = this.parent.context.measureText(this.text);
    const height = this.padding_y * 2 + FONT_SIZES.BUTTON;
    //draw button background
    this.parent.context.fillStyle = theme_info.background;
    this.parent.context.fillRect(this.coords[0], this.coords[1], this.width, height);
    //draw button text, coords are text's lower left corner
    this.parent.context.fillStyle = theme_info.text_primary;
    if (this.alignment === Alignment.Centre) {
      this.parent.context.fillText(this.text, this.coords[0] + (this.width - measured.width) / 2, height - this.padding_y);
    } else if (this.alignment === Alignment.Left) {
      this.parent.context.fillText(this.text, this.coords[0] + this.padding_y, height - this.padding_y);
    } else if (this.alignment === Alignment.Right) {
      this.parent.context.fillText(this.text, this.coords[0] + this.width - measured.width - this.padding_y, height - this.padding_y);
    }
    //draw button border
    let border_right_bottom = new Path2D();
    border_right_bottom.moveTo(this.coords[0], this.coords[1] + height); 
    border_right_bottom.lineTo(this.coords[0] + this.width, this.coords[1] + height);
    border_right_bottom.lineTo(this.coords[0] + this.width, this.coords[1]);
    if (this.inverted) {
      this.parent.context.strokeStyle = THEME_INFOS[theme].border_left_top;
    } else {
      this.parent.context.strokeStyle = THEME_INFOS[theme].border_right_bottom;
    }
    this.parent.context.stroke(border_right_bottom);
    let window_left_top = new Path2D();
    window_left_top.moveTo(this.coords[0], this.coords[1] + height);
    window_left_top.lineTo(this.coords[0], this.coords[1]);
    window_left_top.lineTo(this.coords[0] + this.width, this.coords[1]);
    if (this.inverted) {
      this.parent.context.strokeStyle = THEME_INFOS[theme].border_right_bottom;
    } else {
      this.parent.context.strokeStyle = THEME_INFOS[theme].border_left_top;
    }
    this.parent.context.stroke(window_left_top);
    //this.size = [this.width, height];
  }
  handle_message(message: MessageType | WindowMessage, data: any) {
    //change colours on click and hover or whatever also
    if (message === WindowMessage.MouseDown) {
      this.click_func();
    }
    //
  }
}

