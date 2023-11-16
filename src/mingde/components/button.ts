import { FocusableComponent, WindowLike, WindowMessage } from '../wm.js';
import { Themes, ThemeInfo, THEME_INFOS, DARK_THEMES } from '../themes.js';
import { CONFIG, SCALE, FONT_NAME, FONT_SIZES } from '../constants.js';
import { isKeyboardEvent } from '../guards.js';

export enum Alignment {
  Centre,
  Left,
  Right,
}

//focusable so keyboard only can still use buttons
export class Button<MessageType> implements FocusableComponent<MessageType> {
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
  small: boolean;
  text_color?: string;
  dark_text_color?: string;

  focused: boolean;

  constructor(parent: WindowLike<MessageType | WindowMessage>, text: string, coords: [number, number], width: number, padding_y: number, click_func: () => void, bold: boolean = false, inverted: boolean = false, alignment: Alignment = Alignment.Centre, small: boolean = false, text_color?: string, dark_text_color?: string) {
    //I am not a fan of parameter properties
    this.id = `${parent.id}-${this.type}-random-${Math.floor(Math.random() * 10000)}`; //dumb, but placeholder, kinda
    this.parent = parent;
    this.text = text;
    this.coords = [coords[0] * SCALE, coords[1] * SCALE];
    this.width = width * SCALE;
    this.padding_y = padding_y * SCALE;
    this.size = [this.width, padding_y * 2 + (this.small ? FONT_SIZES.BUTTON_SMALL : FONT_SIZES.BUTTON)];
    this.click_func = click_func;
    this.bold = bold;
    this.inverted = inverted;
    this.alignment = alignment;
    this.small = small;
    this.text_color = text_color;
    this.dark_text_color = dark_text_color;
    this.focused = false;
  }
  render_view(theme: Themes, context: CanvasRenderingContext2D = this.parent.context) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    context.font = `${this.bold ? "bold " : ""}${ this.small ? FONT_SIZES.BUTTON_SMALL : FONT_SIZES.BUTTON }px ${FONT_NAME}`;
    const measured = context.measureText(this.text);
    const height = this.padding_y * 2 + (this.small ? FONT_SIZES.BUTTON_SMALL : FONT_SIZES.BUTTON);
    //draw button background
    context.fillStyle = theme_info.background;
    if (this.focused && CONFIG.SHADOWS) {
      context.shadowColor = "blue";
      context.shadowBlur = 10 * SCALE;
    }
    context.fillRect(this.coords[0], this.coords[1], this.width, height);
    context.shadowBlur = 0;
    //draw button text, coords are text's lower left corner
    //default to text_primary, unless different colour specified (if a dark theme, will also do something. just read the code)
    context.fillStyle = DARK_THEMES.includes(theme) ? (this.dark_text_color ? this.dark_text_color || theme_info.text_primary : this.text_color || theme_info.text_primary) : this.text_color || theme_info.text_primary;
    let e_text: string = this.text;
    if (measured.width > this.width) {
      e_text = e_text.slice(0, -3);
      for (let i = 0; i < this.text.length - 3; i++) {
        let new_measured_width: number = context.measureText(e_text.trimEnd()+"....").width; //extra dot for extra space
        if (new_measured_width < this.width) {
          break;
        }
        e_text = e_text.slice(0, -1);
      }
      e_text = e_text.trimEnd()+"...";
    }
    context.textBaseline = "bottom";
    if (this.alignment === Alignment.Centre) {
      context.fillText(e_text, this.coords[0] + (this.width - measured.width) / 2, this.coords[1] + height - this.padding_y);
    } else if (this.alignment === Alignment.Left) {
      context.fillText(e_text, this.coords[0] + this.padding_y, this.coords[1] + height - this.padding_y);
    } else if (this.alignment === Alignment.Right) {
      context.fillText(e_text, this.coords[0] + this.width - measured.width - this.padding_y, this.coords[1] + height - this.padding_y);
    }
    //draw button border
    context.lineWidth = 2 * SCALE;
    let border_right_bottom = new Path2D();
    border_right_bottom.moveTo(this.coords[0], this.coords[1] + height); 
    border_right_bottom.lineTo(this.coords[0] + this.width, this.coords[1] + height);
    border_right_bottom.lineTo(this.coords[0] + this.width, this.coords[1]);
    if (this.inverted) {
      context.strokeStyle = THEME_INFOS[theme].border_left_top;
    } else {
      context.strokeStyle = THEME_INFOS[theme].border_right_bottom;
    }
    context.stroke(border_right_bottom);
    let border_left_top = new Path2D();
    border_left_top.moveTo(this.coords[0], this.coords[1] + height);
    border_left_top.lineTo(this.coords[0], this.coords[1]);
    border_left_top.lineTo(this.coords[0] + this.width, this.coords[1]);
    if (this.inverted) {
      context.strokeStyle = THEME_INFOS[theme].border_right_bottom;
    } else {
      context.strokeStyle = THEME_INFOS[theme].border_left_top;
    }
    context.stroke(border_left_top);
    //this.size = [this.width, height];
  }
  focus(): boolean {
    if (!this.focused) {
      this.focused = true;
      return true;
    } else {
      return false;
    }
  }
  unfocus(): boolean {
    if (this.focused) {
      this.focused = false;
      return true;
    } else {
      return false;
    }
  }
  //focus is not changed through message to button, but rather by the window calling focus() or unfocus()
  handle_message(message: MessageType | WindowMessage, data: any): boolean {
    //change colours on click and hover or whatever also
    if (message === WindowMessage.MouseDown) {
      this.click_func(); //perhaps return this instead of always true
      return true;
    } else if (message === WindowMessage.KeyDown && isKeyboardEvent(data)) {
      if (data.key === "Enter" && this.focused) {
        this.click_func();
        return true;
      }
    }
    //
    return false;
  }
}

