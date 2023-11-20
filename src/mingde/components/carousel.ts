import { FocusableComponent, WindowLike, WindowMessage } from '../wm.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';
import { CONFIG, SCALE, FONT_SIZES, FONT_NAME } from '../constants.js';
import { isMouseEvent, isKeyboardEvent } from '../guards.js';

//left and right buttons on the left and right, then text of the current state in the middle

const left_right_width: number = 20 * SCALE;

//if focused, focus only the right (easier)
export class Carousel<MessageType> implements FocusableComponent<MessageType> {
  readonly type: string = "carousel";
  clickable: boolean = true;

  id: string;
  readonly parent: WindowLike<MessageType | WindowMessage>;
  private padding_y: number;
  private inner_width: number;
  coords: [number, number];
  size: [number, number];

  readonly get_value: () => string;
  readonly change_value_left: () => void;
  readonly change_value_right: () => void;

  focused: boolean;

  constructor(parent: WindowLike<MessageType | WindowMessage>, coords: [number, number], padding_y: number, inner_width: number, get_value: () => string, change_value_left: () => void, change_value_right: () => void) {
    this.parent = parent;
    this.coords = [coords[0] * SCALE, coords[1] * SCALE];
    this.padding_y = padding_y * SCALE;
    this.inner_width = inner_width * SCALE;
    this.size = [this.inner_width + left_right_width * 2, this.padding_y * 2 + FONT_SIZES.NORMAL]; //should be automatic?
    this.get_value = get_value;
    this.change_value_left = change_value_left;
    this.change_value_right = change_value_right;
    this.focused = false;
  }
  draw_button(text: string, coords: [number, number], theme_info: ThemeInfo, context: CanvasRenderingContext2D = this.parent.context, focused?: boolean) {
    if (focused && CONFIG.SHADOWS) {
      context.shadowColor = "blue";
      context.shadowBlur = 10 * SCALE;
    }
    const measured = context.measureText(text);
    context.fillStyle = theme_info.background;
    context.fillRect(coords[0], coords[1], left_right_width, this.size[1]);
    context.shadowBlur = 0;
    context.fillStyle = theme_info.text_primary;
    context.fillText(text, coords[0] + (left_right_width - measured.width) / 2, coords[1] + this.size[1] - this.padding_y);
    context.lineWidth = 2 * SCALE;
    let border_right_bottom = new Path2D();
    border_right_bottom.moveTo(coords[0], coords[1] + this.size[1]);
    border_right_bottom.lineTo(coords[0] + left_right_width, coords[1] + this.size[1]);
    border_right_bottom.lineTo(coords[0] + left_right_width, coords[1]);
    context.strokeStyle = theme_info.border_right_bottom;
    context.stroke(border_right_bottom);
    let border_left_top = new Path2D();
    border_left_top.moveTo(coords[0], coords[1] + this.size[1]);
    border_left_top.lineTo(coords[0], coords[1]);
    border_left_top.lineTo(coords[0] + left_right_width, coords[1]);
    context.strokeStyle = theme_info.border_left_top;
    context.stroke(border_left_top);
  }
  render_view(theme: Themes, context: CanvasRenderingContext2D = this.parent.context) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    context.font = `${FONT_SIZES.NORMAL}px ${FONT_NAME}`;
    context.textBaseline = "bottom";
    //draw center text (center text should be in the center)
    //todo: if text too long, truncate with ...
    const text_value: string = this.get_value();
    const measured = context.measureText(text_value);
    context.fillStyle = theme_info.text_primary;
    context.fillText(text_value, this.coords[0] + left_right_width + (this.inner_width - measured.width) / 2, this.coords[1] + this.size[1] - this.padding_y);
    //draw left button
    this.draw_button("<", this.coords, theme_info, context);
    //draw right button
    //right button is always in constant position regardless of text length, cause it is annoying when buttons move
    this.draw_button(">", [this.coords[0] + this.size[0] - left_right_width, this.coords[1]], theme_info, context, this.focused);
  }
  //this code is repeated quite a few times - maybe FocusableComponent should be a class? eh, probably not
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
  handle_message(message: MessageType | WindowMessage, data: any): boolean {
    if (message === WindowMessage.MouseDown && isMouseEvent(data)) {
      //check to see if is in left or right button (we know already that the click is in the component)
      if (data.clientX < this.coords[0] + left_right_width) {
        this.change_value_left();
        return true;
      } else if (data.clientX > this.coords[0] + this.size[0] - left_right_width) {
        this.change_value_right();
        return true;
      }
    } else if (message === WindowMessage.KeyDown && isKeyboardEvent(data)) {
      if (data.key === "Enter" && this.focused) {
        this.change_value_right();
        return true;
      }
    }
    //
    return false;
  }
}

