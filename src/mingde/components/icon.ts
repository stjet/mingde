import { Component, WindowLike, WindowMessage } from '../wm.js';
import type { Themes } from '../themes.js';
import { SCALE } from '../constants.js';

export class Icon<MessageType> implements Component<MessageType> {
  readonly type: string = "icon";
  clickable: boolean = false;

  id: string;
  readonly parent: WindowLike<MessageType | WindowMessage>;
  image?: HTMLImageElement;
  coords: [number, number];
  size: [number, number];

  constructor(parent: WindowLike<MessageType | WindowMessage>, coords: [number, number], size: [number, number], image?: HTMLImageElement) {
    this.parent = parent;
    this.coords = [coords[0] * SCALE, coords[1] * SCALE];
    this.size = [size[0] * SCALE, size[1] * SCALE];
    this.image = image;
  }
  render_view(_theme: Themes, context: CanvasRenderingContext2D = this.parent.context) {
    if (this.image) {
      console.log("a")
      context.drawImage(this.image, this.coords[0], this.coords[1], this.size[0], this.size[1]);
    }
  }
  handle_message(_message: MessageType | WindowMessage, _data: any) {
    //
  }
}

