import { Component, WindowLike, WindowMessage } from '../wm.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';
import { SCALE, FONT_NAME, FONT_SIZES } from '../constants.js';

export class TextLine<MessageType> implements Component<MessageType> {
  readonly type: string = "text-line";
  clickable: boolean = false;

  id: string;
  readonly parent: WindowLike<MessageType | WindowMessage>;
  text: string;
  coords: [number, number];
  size: [number, number];
  color: keyof ThemeInfo;
  font_size: keyof typeof FONT_SIZES;
  max_width?: number;
  ellipsis: boolean;
  bold: boolean;

  constructor(parent: WindowLike<MessageType | WindowMessage>, text: string, coords: [number, number], color: keyof ThemeInfo, font_size: keyof typeof FONT_SIZES, max_width?: number, ellipsis: boolean = false, bold: boolean = true) {
    this.parent = parent;
    this.text = text;
    this.coords = [coords[0] * SCALE, coords[1] * SCALE];
    this.color = color;
    this.font_size = font_size;
    this.max_width = max_width ? max_width * SCALE : max_width;
    this.ellipsis = ellipsis; //if length more than max_width, ellipsis
    this.bold = bold;
    //placeholder until width, height calculated
    this.size = [0, 0];
  }
  render_view(theme: Themes) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    this.parent.context.font = `${this.bold ? "bold " : ""}${FONT_SIZES[this.font_size]}px ${FONT_NAME}`;
    this.parent.context.fillStyle = theme_info[this.color];
    if (this.max_width && this.ellipsis) {
      let measured_width: number = this.parent.context.measureText(this.text).width;
      if (measured_width > this.max_width) {
        let e_text: string = this.text.slice(0, -3);
        for (let i = 0; i < this.text.length - 3; i++) {
          let new_measured_width: number = this.parent.context.measureText(e_text.trimEnd()+"...").width;
          if (new_measured_width < this.max_width) {
            break;
          }
          e_text = e_text.slice(0, -1);
        }
        this.parent.context.fillText(e_text.trimEnd()+"...", this.coords[0], this.coords[1]);
        return;
      }
    }
    this.parent.context.fillText(this.text, this.coords[0], this.coords[1], this.max_width);
  }
  handle_message(_message: MessageType | WindowMessage, _data: any) {
    //text line doesn't really care about messages I think?
    //(maybe like change color on hover or something, or highlight)
  }
}

