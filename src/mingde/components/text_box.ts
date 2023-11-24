import { FocusableComponent, WindowLike, WindowMessage } from '../wm.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';
import { SCALE, FONT_SIZES, FONT_NAME } from '../constants.js';
import { isKeyboardEvent } from '../guards.js';
import { calculate_lines } from '../utils.js';

export const DEFAULT_LINE_HEIGHT_EXTRA: number = 2;

//text input but with lines

const margin: number = 3;

export class TextBox<MessageType> implements FocusableComponent<MessageType> {
  readonly type: string = "text-box";
  clickable: boolean = true;

  id: string;
  readonly parent: WindowLike<MessageType | WindowMessage>;
  value: string;
  lines: string[];
  max_width: number;
  font_size: keyof typeof FONT_SIZES;
  line_height?: number;
  private cursor_pos: number;
  private line_pos: number;
  coords: [number, number];
  size: [number, number];

  private cached_theme?: Themes;
  focused: boolean;

  constructor(parent: WindowLike<MessageType | WindowMessage>, coords: [number, number], font_size: keyof typeof FONT_SIZES, max_width: number, initial_value?: string, line_height?: number) {
    this.parent = parent;
    this.value = initial_value ? initial_value : "";
    this.font_size = font_size;
    this.max_width = max_width * SCALE;
    this.cursor_pos = this.value.length;
    this.line_pos = this.value.split(" \n ").length - 1;
    this.coords = [coords[0] * SCALE, coords[1] * SCALE];
    this.size = [this.max_width, (FONT_SIZES[font_size] / SCALE + 4) * SCALE];
    this.line_height = line_height;
    this.focused = false;
    this.lines = calculate_lines(this.value, FONT_SIZES[this.font_size], FONT_NAME, this.max_width - 2 * margin * SCALE, this.parent.context);
  }
  render_view(theme: Themes, context: CanvasRenderingContext2D = this.parent.context) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    context.font = `${FONT_SIZES[this.font_size]}px ${FONT_NAME}`;
    context.fillStyle = theme_info.text_primary;
    context.textBaseline = "bottom";
    //if needed, calculate lines
    if (this.cached_theme !== theme) {
      this.lines = calculate_lines(this.value, FONT_SIZES[this.font_size], FONT_NAME, this.max_width - 2 * margin * SCALE, context);
      this.cached_theme = theme;
    }
    let line_height: number = typeof this.line_height === "number" ? this.line_height : FONT_SIZES[this.font_size] + DEFAULT_LINE_HEIGHT_EXTRA;
    this.size = [this.max_width, line_height * this.lines.length + 2 * margin * SCALE];
    for (let i = 0; i < this.lines.length; i++) {
      context.fillText(this.lines[i], this.coords[0] + margin * SCALE, this.coords[1] + (i + 1) * line_height + margin * SCALE);
    }
    //outline
    context.lineWidth = 2 * SCALE;
    if (this.focused) {
      context.strokeStyle = theme_info.highlight;
    } else {
      context.strokeStyle = theme_info.border_right_bottom;
    }
    context.strokeRect(this.coords[0], this.coords[1], this.size[0], this.size[1]);
    //draw cursor
    if (this.focused) {
      const value_lines: string[] = this.value.split(" \n ");
      const rest_width: number = context.measureText(value_lines[this.line_pos].slice(0, this.cursor_pos)).width;
      const rest_height: number = this.line_pos * line_height; //line_height is already multiplied by SCALE
      //use the char cursor/selector is over to get cursor width. if no char (this.cursor_pos is this.value.length), use the letter a
      const cursor_width: number = context.measureText(value_lines[this.line_pos][this.cursor_pos] || "a").width;
      context.fillStyle = theme_info.highlight;
      context.fillRect(this.coords[0] + rest_width + margin * SCALE, this.coords[1] + rest_height + margin * SCALE, cursor_width, line_height);
      //draw the cursor text a different colour so it is legible
      if (this.value[this.cursor_pos]) {
        context.fillStyle = theme_info.text_highlight;
        context.fillText(this.value[this.cursor_pos], this.coords[0] + rest_width + margin * SCALE, this.coords[1] + rest_height + line_height + margin * SCALE);
      }
    }
    //
  }
  calculate_lines() {
    return calculate_lines(this.value, FONT_SIZES[this.font_size], FONT_NAME, this.max_width - 2 * margin * SCALE, this.parent.context);
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
      this.line_pos = this.value.split(" \n ").length - 1;
      return true;
    } else {
      return false;
    }
  }
  handle_message(message: MessageType | WindowMessage, data: any): boolean {
    if (message === WindowMessage.MouseDown) {
      return this.focus();
    } else if (message === WindowMessage.KeyDown && isKeyboardEvent(data)) {
      if (!this.focused || data.altKey) return false;
      if (data.key === "Backspace") {
        //btw, backspace should do nothing if first line
        if (this.cursor_pos === 0 && this.line_pos !== 0) {
          let value_lines: string[] = this.value.split(" \n ");
          let old_line: string = value_lines[this.line_pos - 1];
          value_lines[this.line_pos - 1] += value_lines[this.line_pos];
          value_lines.splice(this.line_pos, 1);
          this.value = value_lines.join(" \n ");
          this.line_pos--;
          this.cursor_pos = old_line.length;
        } else if (this.cursor_pos !== 0) {
          //delete
          let value_lines: string[] = this.value.split(" \n ");
          let new_text: string[] = value_lines[this.line_pos].split("");
          new_text.splice(this.cursor_pos - 1, 1);
          value_lines[this.line_pos] = new_text.join("");
          this.value = value_lines.join(" \n ");
          this.cursor_pos--;
        }
      } else if (data.key === "ArrowLeft") {
        this.cursor_pos = this.cursor_pos > 0 ? this.cursor_pos - 1 : 0;
      } else if (data.key === "ArrowRight") {
        //zero based index, but cursor pos can be this.value.length not this.value.length - 1
        this.cursor_pos = this.cursor_pos < this.value.length ? this.cursor_pos + 1 : this.value.length;
      } else if (data.key === "ArrowUp") {
        this.line_pos = this.line_pos > 0 ? this.line_pos - 1 : 0;
        let back_length: number = this.value.split(" \n ")[this.line_pos].length;
        this.cursor_pos = back_length < this.cursor_pos ? back_length : this.cursor_pos;
      } else if (data.key === "ArrowDown") {
        this.line_pos = this.line_pos < this.value.split(" \n ").length - 1 ? this.line_pos + 1 : this.value.split(" \n ").length - 1;
        let next_length: number = this.value.split(" \n ")[this.line_pos].length;
        this.cursor_pos = next_length < this.cursor_pos ? next_length : this.cursor_pos;
      } else if (data.key === "Enter") {
        let value_lines: string[] = this.value.split(" \n ");
        if (this.cursor_pos === value_lines[this.line_pos].length) {
          value_lines.splice(this.line_pos + 1, 0, "");
          this.value = value_lines.join(" \n ");
        } else {
          value_lines.splice(this.line_pos + 1, 0, value_lines[this.line_pos].slice(this.cursor_pos));
          value_lines[this.line_pos] = value_lines[this.line_pos].slice(0, this.cursor_pos);
        }
        this.value = value_lines.join(" \n ");
        this.line_pos++;
        this.cursor_pos = 0;
      } else if (data.key.length === 1) {
        //add to position
        let value_lines: string[] = this.value.split(" \n ");
        let new_text: string[] = value_lines[this.line_pos].split("");
        new_text.splice(this.cursor_pos, 0, data.key);
        value_lines[this.line_pos] = new_text.join("");
        this.value = value_lines.join(" \n ");
        this.cursor_pos++;
      }
      this.lines = this.calculate_lines();
      return true;
    }
    //
    return false;
  }
}

