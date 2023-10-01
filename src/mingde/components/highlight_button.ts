import { Component, WindowMessage, WindowLike } from '../wm.js';
import { isMouseEvent } from '../guards.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';
import { CONFIG, SCALE, FONT_NAME, FONT_SIZES } from '../constants.js';

//highlight button for the start menu, when hovering over, it highlights

export class HighlightButton<MessageType> implements Component<MessageType> {
  readonly type: string = "highlight-button";
  clickable: boolean = true;

  id: string;
  readonly parent: WindowLike<MessageType | WindowMessage>;
  text: string;
  coords: [number, number];
  size: [number, number];
  padding_y: number;
  highlighted: boolean;
  click_func: () => void; //doesn't feel very elm-like? not sure..

  constructor(parent: WindowLike<MessageType | WindowMessage>, text: string, coords: [number, number], size: [number, number], padding_y: number, click_func: () => void) {
    this.parent = parent;
    this.text = text;
    this.coords = [coords[0] * SCALE, coords[1] * SCALE];
    this.size = [size[0] * SCALE, size[1] * SCALE];
    this.padding_y = padding_y;
    this.highlighted = false;
    this.click_func = click_func;
  }
  render_view(theme: Themes) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    if (this.highlighted) {
      this.parent.context.fillStyle = theme_info.highlight;
      this.parent.context.fillRect(this.coords[0], this.coords[1], this.size[0], this.size[1]);
      this.parent.context.fillStyle = theme_info.text_highlight;
    } else {
      this.parent.context.fillStyle = theme_info.text_primary;
    }
    const height = this.padding_y * 2 + FONT_SIZES.BUTTON;
    this.parent.context.font = `${FONT_SIZES.BUTTON}px ${FONT_NAME}`;
    this.parent.context.fillText(this.text, this.coords[0] + this.padding_y, this.coords[1] + height - this.padding_y);
  }
  handle_message(message: MessageType | WindowMessage, data: any): boolean {
    //mousedown, mousemove, mouse move outside?
    if (message === WindowMessage.MouseDown) {
      this.click_func();
      return true;
    } else if (message === WindowMessage.MouseMove && isMouseEvent(data)) {
      if (!CONFIG.HIGHLIGHT_BUTTONS) return false;
      if (data.clientX > this.coords[0] && data.clientY > this.coords[1] && data.clientX < this.coords[0] + this.size[0] && data.clientY < this.coords[1] + this.size[1]) {
        if (!this.highlighted) {
          this.highlighted = true;
          return true;
        }
      } else if (this.highlighted) {
        this.highlighted = false;
        return true;
      }
    }
    //do not deselect is mouse leaves, mouse moves outside, etc (architectural decision)
    return false;
  }
}

