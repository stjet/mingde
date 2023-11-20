import { Component, WindowLike, WindowMessage } from '../wm.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';
import { SCALE, FONT_NAME, FONT_NAME_MONO, FONT_SIZES } from '../constants.js';
import { calculate_lines } from '../utils.js';

export const DEFAULT_LINE_HEIGHT_EXTRA: number = 2;

export class Paragraph<MessageType> implements Component<MessageType> {
  readonly type: string = "paragraph";
  clickable: boolean = false;

  id: string;
  readonly parent: WindowLike<MessageType | WindowMessage>;
  text: string;
  coords: [number, number];
  size: [number, number];
  color: keyof ThemeInfo;
  font_size: keyof typeof FONT_SIZES;
  line_width: number;
  monospace: boolean;
  line_height?: number;

  lines: string[];

  private cached_theme?: Themes;
  
  constructor(parent: WindowLike<MessageType | WindowMessage>, text: string, coords: [number, number], color: keyof ThemeInfo, font_size: keyof typeof FONT_SIZES, line_width: number, line_height?: number, monospace: boolean = false) {
    this.parent = parent;
    this.text = text;
    this.coords = [coords[0] * SCALE, coords[1] * SCALE];
    this.color = color;
    this.font_size = font_size;
    this.line_width = line_width * SCALE;
    this.line_height = line_height;
    this.monospace = monospace;
    //do not set lines in the function since otherwise strict compiler will be annoying
    this.lines = calculate_lines(this.text, FONT_SIZES[this.font_size], this.monospace ? FONT_NAME_MONO : FONT_NAME, this.line_width, this.parent.context);
  }
  get lines_length(): number {
    return this.lines.length;
  }
  calculate_lines() {
    return calculate_lines(this.text, FONT_SIZES[this.font_size], this.monospace ? FONT_NAME_MONO : FONT_NAME, this.line_width, this.parent.context);
  }
  render_view(theme: Themes, context: CanvasRenderingContext2D = this.parent.context) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    context.font = `${FONT_SIZES[this.font_size]}px ${ this.monospace ? FONT_NAME_MONO : FONT_NAME }`;
    context.fillStyle = theme_info[this.color];
    context.textBaseline = "bottom";
    //if needed, calculate lines
    if (this.cached_theme !== theme) {
      this.lines = calculate_lines(this.text, FONT_SIZES[this.font_size], this.monospace ? FONT_NAME_MONO : FONT_NAME, this.line_width, context);
      this.cached_theme = theme;
    }
    let line_height: number = typeof this.line_height === "number" ? this.line_height : FONT_SIZES[this.font_size] + DEFAULT_LINE_HEIGHT_EXTRA;
    this.size = [this.line_width, line_height * this.lines.length];
    for (let i = 0; i < this.lines.length; i++) {
      context.fillText(this.lines[i], this.coords[0], this.coords[1] + i * line_height);
    }
  }
  handle_message(_message: MessageType | WindowMessage, _data: any) {
    //
  }
}

