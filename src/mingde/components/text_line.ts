import { Component, WindowLike, WindowMessage } from '../wm.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';
import { SCALE, FONT_NAME, FONT_SIZES } from '../constants.js';

export class TextLine<MessageType> implements Component<MessageType> {
  readonly type: string = "text-line";
  clickable: boolean = false;

  id: string;
  parent: WindowLike<MessageType>;
  text: string;
  coords: [number, number];
  size: [number, number];
  color: keyof ThemeInfo;
  font_size: keyof typeof FONT_SIZES;
  max_width: number | undefined;

  constructor(parent: WindowLike<MessageType>, text: string, coords: [number, number], color: keyof ThemeInfo, font_size: keyof typeof FONT_SIZES, max_width: number | undefined) {
    this.parent = parent;
    this.text = text;
    this.coords = [coords[0] * SCALE, coords[1] * SCALE];
    this.color = color;
    this.font_size = font_size;
    this.max_width = max_width;
    //placeholder until width, height calculated
    this.size = [0, 0];
  }
  render_view(theme: Themes) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    this.parent.context.font = `bold ${FONT_SIZES[this.font_size]}px ${FONT_NAME}`;
    this.parent.context.fillStyle = theme_info[this.color];
    this.parent.context.fillText(this.text, this.coords[0], this.coords[1], this.max_width);
  }
  handle_message(_message: MessageType, _data: any) {
    //text line doesn't really care about messages I think?
    //(maybe like change color on hover or something, or highlight)
  }
}

