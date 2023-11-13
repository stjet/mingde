import { Component, WindowMessage, WindowLike } from '../wm.js';
import { SCALE } from '../constants.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';

//background

export class Background<MessageType> implements Component<MessageType> {
  readonly type: string = "background";
  clickable: boolean = false;

  id: string;
  readonly parent: WindowLike<MessageType | WindowMessage>;
  text: string;
  coords: [number, number];
  size: [number, number];
  background_color?: string;

  constructor(parent: WindowLike<MessageType | WindowMessage>, background_color: string | undefined, coords: [number, number], size: [number, number]) {
    this.parent = parent;
    this.background_color = background_color; //change to colour?
    this.coords = [coords[0] * SCALE, coords[1] * SCALE];
    this.size = [size[0] * SCALE, size[1] * SCALE];
  }
  render_view(theme: Themes, context: CanvasRenderingContext2D = this.parent.context) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    context.fillStyle = this.background_color ? this.background_color : theme_info.background;
    context.fillRect(this.coords[0], this.coords[1], this.size[0], this.size[1]);
  }
  handle_message(_message: MessageType | WindowMessage, _data: any) {
    //deliberately left empty
  }
}

