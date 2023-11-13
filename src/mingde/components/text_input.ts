import { FocusableComponent, WindowLike, WindowMessage } from '../wm.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';
import { CONFIG, SCALE, FONT_NAME, FONT_SIZES } from '../constants.js';
import { isKeyboardEvent } from '../guards.js';
import { ValidationState } from '../utils.js';

//cursor here does not mean the mouse cursor

const margin: number = 2 * SCALE;

export class TextInput<MessageType> implements FocusableComponent<MessageType> {
  readonly type: string = "text-input";
  clickable: boolean = true;

  id: string;
  readonly parent: WindowLike<MessageType | WindowMessage>;
  placeholder: string;
  value: string;
  max_width: number;
  font_size: keyof typeof FONT_SIZES;
  focused: boolean;
  private cursor_pos: number;
  valid: ValidationState;
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
    this.valid = ValidationState.Neither;
    this.coords = [coords[0] * SCALE, coords[1] * SCALE];
    this.size = [this.max_width, (FONT_SIZES[font_size] / SCALE + 4) * SCALE];
  }
  render_view(theme: Themes, context: CanvasRenderingContext2D = this.parent.context) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    //draw box
    context.lineWidth = 2 * SCALE;
    if (this.focused) {
      context.strokeStyle = theme_info.highlight;
    } else {
      context.strokeStyle = theme_info.border_right_bottom;
    }
    context.strokeRect(this.coords[0], this.coords[1], this.size[0], this.size[1]);
    if (this.valid === ValidationState.Valid && CONFIG.SHADOWS) {
      context.shadowColor = "green";
      context.shadowBlur = 10 * SCALE;
    } else if (this.valid === ValidationState.Invalid && CONFIG.SHADOWS) {
      context.shadowColor = "red";
      context.shadowBlur = 10 * SCALE;
    }
    context.fillStyle = theme_info.background;
    context.fillRect(this.coords[0], this.coords[1], this.size[0], this.size[1]);
    context.shadowBlur = 0;
    //write text in box, considering cursor pos (write cursor pos?)
    context.font = `${FONT_SIZES[this.font_size]}px ${FONT_NAME}`;
    context.textBaseline = "bottom";
    if (this.value === "") {
      let fill_text: string;
      //make sure placeholder doesn't overflow
      let measured_width: number = context.measureText(this.placeholder).width;
      if (measured_width > this.max_width) {
        //ellipsis
        let e_text: string = this.placeholder.slice(0, -3);
        for (let i = 0; i < this.placeholder.length - 3; i++) {
          let new_measured_width: number = context.measureText(e_text.trimEnd()+"...").width;
          if (new_measured_width < this.max_width) {
            break;
          }
          e_text = e_text.slice(0, -1);
        }
        fill_text = e_text.trimEnd()+"...";
      } else {
        fill_text = this.placeholder;
      }
      context.fillStyle = theme_info.text_primary;
      context.fillText(fill_text, this.coords[0] + margin, this.coords[1] + this.size[1] - margin);
    } else {
      let write_text: string;
      let write_cursor_pos: number;
      let width_to_cursored: number = context.measureText(this.value.slice(0, this.cursor_pos)).width;
      if (width_to_cursored < this.size[0]) {
        //yay, the entire text to the cursored portion fits. now figure out how much more we can get away with
        write_cursor_pos = this.cursor_pos;
        write_text = this.value.slice(0, this.cursor_pos);
        const write_length: number = write_text.length; //need to save write length since we mutate it
        for (let i = 0; i < this.value.length - write_length; i++) {
          let width_to_end: number = context.measureText(this.value.slice(0, this.cursor_pos + i + 1)).width;
          if (width_to_end > this.size[0]) break;
          write_text = this.value.slice(0, this.cursor_pos + i + 1);
        }
      } else {
        //doesn't fit. put the cursored portion at the end and calculate how much of the start to cut off
        write_text = this.value.slice(this.cursor_pos, this.cursor_pos + 1);
        for (let i = 0; i < this.cursor_pos; i++) {
          let width_to_end: number = context.measureText(this.value.slice(this.cursor_pos - i - 1, this.cursor_pos + 1)).width;
          if (width_to_end > this.size[0]) break;
          write_text = this.value.slice(this.cursor_pos - i - 1, this.cursor_pos + 1);
        }
        //since cursor is at the end
        write_cursor_pos = write_text.length - 1;
      }
      //draw cursor
      if (this.focused) {
        const rest_width: number = context.measureText(write_text.slice(0, write_cursor_pos)).width;
        //use the char cursor/selector is over to get cursor width. if no char (this.cursor_pos is this.value.length), use the letter a
        const cursor_width: number = context.measureText(this.value[this.cursor_pos] || "a").width;
        context.fillStyle = theme_info.highlight;
        context.fillRect(this.coords[0] + rest_width + margin, this.coords[1], cursor_width, this.size[1]);
      }
      //write the text
      context.fillStyle = theme_info.text_primary;
      context.fillText(write_text, this.coords[0] + margin, this.coords[1] + this.size[1] - margin);
      //todo: draw the cursor text a different colour so it is legible
      if (this.value[this.cursor_pos]) {
        //
      }
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
      this.cursor_pos = this.value.length;
      return true;
    } else {
      return false;
    }
  }
  handle_message(message: MessageType | WindowMessage, data: any): boolean {
    //move cursor pos, write text
    if (message === WindowMessage.MouseDown) {
      return this.focus();
    } else if (message === WindowMessage.KeyDown && isKeyboardEvent(data)) {
      if (!this.focused) return false;
      if (data.key === "Backspace") {
        if (this.cursor_pos === 0) return false;
        //delete
        let new_text: string[] = this.value.split("");
        new_text.splice(this.cursor_pos - 1, 1);
        this.value = new_text.join("");
        this.cursor_pos--;
      } else if (data.key === "ArrowLeft") {
        this.cursor_pos = this.cursor_pos > 0 ? this.cursor_pos - 1 : 0;
      } else if (data.key === "ArrowRight") {
        //zero based index, but cursor pos can be this.value.length not this.value.length - 1
        this.cursor_pos = this.cursor_pos < this.value.length ? this.cursor_pos + 1 : this.value.length;
      } else if (data.key.length === 1) {
        //add to position
        let new_text: string[] = this.value.split("");
        new_text.splice(this.cursor_pos, 0, data.key);
        this.value = new_text.join("");
        this.cursor_pos++;
      }
      return true;
    }
    return false;
  }
}
