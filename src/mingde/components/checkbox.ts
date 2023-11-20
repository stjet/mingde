import { FocusableComponent, WindowLike, WindowMessage } from '../wm.js';
import { CONFIG, SCALE } from '../constants.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';
import { isKeyboardEvent } from '../guards.js';

//checkbox

export class Checkbox<MessageType> implements FocusableComponent<MessageType> {
  readonly type: string = "checkbox";
  clickable: boolean = true;

  id: string;
  readonly parent: WindowLike<MessageType | WindowMessage>;
  coords: [number, number];
  size: [number, number];
  private get_checked_func: () => boolean;
  private unchecked_func: () => void;
  private checked_func: () => void;

  focused: boolean;

  //square is height and width
  constructor(parent: WindowLike<MessageType | WindowMessage>, coords: [number, number], square: number, get_checked_func: () => boolean, unchecked_func: () => void, checked_func: () => void) {
    this.parent = parent;
    this.coords = [coords[0] * SCALE, coords[1] * SCALE];
    this.size = [square * SCALE, square * SCALE];
    this.get_checked_func = get_checked_func;
    this.unchecked_func = unchecked_func;
    this.checked_func = checked_func;
    this.focused = false;
  }
  render_view(theme: Themes, context: CanvasRenderingContext2D = this.parent.context) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    const line_width: number = 2 * SCALE;
    context.lineWidth = line_width;
    if (this.focused && CONFIG.SHADOWS) {
      context.shadowColor = "blue";
      context.shadowBlur = 10 * SCALE;
    }
    context.fillStyle = theme_info.background;
    context.fillRect(this.coords[0], this.coords[1], this.size[0], this.size[1]);
    //invisible fill
    context.shadowBlur = 0;
    if (this.get_checked_func()) {
      //show checked box
      context.fillStyle = theme_info.highlight;
      context.fillRect(this.coords[0], this.coords[1], this.size[0], this.size[1]);
      //checkmark
      let check: Path2D = new Path2D();
      check.moveTo(this.coords[0] + line_width, this.coords[1] + Math.floor(this.size[1] / 2));
      check.lineTo(this.coords[0] + Math.floor(this.size[0] / 2), this.coords[1] + this.size[1] - line_width);
      check.lineTo(this.coords[0] + this.size[0], this.coords[1] + line_width);
      context.strokeStyle = theme_info.text_highlight;
      context.stroke(check);
      //border
      context.strokeStyle = theme_info.text_primary;
      context.strokeRect(this.coords[0], this.coords[1], this.size[0], this.size[1]);
    } else {
      //show unchecked box (just border)
      context.strokeStyle = theme_info.text_primary;
      context.strokeRect(this.coords[0], this.coords[1], this.size[0], this.size[1]);
    }
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
  handle_message(message: MessageType | WindowMessage, data: any): boolean {
    if (message === WindowMessage.MouseDown) {
      if (this.get_checked_func()) {
        this.unchecked_func();
      } else {
        this.checked_func();
      }
      return true;
    } else if (message === WindowMessage.KeyDown && isKeyboardEvent(data)) {
      if (data.key === "Enter" && this.focused) {
        if (this.get_checked_func()) {
          this.unchecked_func();
        } else {
          this.checked_func();
        }
        return true;
      }
    }
    //
    return false;
  }
}

