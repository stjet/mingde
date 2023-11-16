import { FocusableComponent, WindowLike, WindowMessage } from '../wm.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';
import { SCALE, FONT_SIZES } from '../constants.js';

//text input but with lines

export class TextBox<MessageType> implements FocusableComponent<MessageType> {
  readonly type: string = "text-box";
  clickable: boolean = true;

  id: string;
  readonly parent: WindowLike<MessageType | WindowMessage>;
  placeholder: string;
  value: string;
  max_width: number;
  font_size: keyof typeof FONT_SIZES;
  focused: boolean;
  private cursor_pos: number;
  private line_pos: number;
  coords: [number, number];
  size: [number, number];

  constructor(parent: WindowLike<MessageType | WindowMessage>, placeholder: string, coords: [number, number], font_size: keyof typeof FONT_SIZES, max_width: number, initial_value?: string) {
    this.parent = parent;
    this.placeholder = placeholder;
    this.value = initial_value ? initial_value : "";
    this.font_size = font_size;
    this.max_width = max_width * SCALE;
    this.focused = false;
    this.cursor_pos = this.value.length;
    this.line_pos = this.value.split(" \n ").length;
    this.coords = [coords[0] * SCALE, coords[1] * SCALE];
    this.size = [this.max_width, (FONT_SIZES[font_size] / SCALE + 4) * SCALE];
  }
  render_view(theme: Themes, _context: CanvasRenderingContext2D = this.parent.context) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    console.log(theme_info, this.cursor_pos, this.line_pos);
    //
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
      this.cursor_pos = this.value.length;
      this.line_pos = this.value.split(" \n ").length;
      return true;
    } else {
      return false;
    }
  }
  handle_message(_message: MessageType | WindowMessage, _data: any): boolean {
    //
    return false;
  }
}

