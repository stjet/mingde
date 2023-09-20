import { Component, Layer, WindowLike, WindowLikeType, WindowMessage, WindowOptions } from './wm.js';
import { WindowRequest, WindowRequestValue } from './requests.js';
import { DesktopBackgroundTypes, DesktopBackgroundInfo, Themes, THEME_INFOS } from './themes.js';
import { SCALE } from './constants.js';
import { isDesktopBackgroundInfo } from './guards.js';

export enum DesktopBackgroundMessage {
  //
}

//members would be like desktop icons and stuff I guess?
export class DesktopBackground implements WindowLike<DesktopBackgroundMessage | WindowMessage> {
  readonly type: string = "window-like";
  readonly sub_type: WindowLikeType = WindowLikeType.DesktopBackground;

  readonly id: string;
  readonly render_view_window: (theme: Themes, options?: any) => void;
  readonly handle_message_window: (message: DesktopBackgroundMessage | WindowMessage, data: any) => boolean;

  size: [number, number];
  coords: [number, number];

  do_rerender: boolean;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  layers: Layer<Component<any>>[];

  send_request: (request: WindowRequest, data: WindowRequestValue) => void;

  constructor() {
    this.size = [document.body.clientWidth * SCALE, document.body.clientHeight * SCALE];
    this.coords = [0, 0];
    //set to true for first render
    this.do_rerender = true;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.size[0];
    this.canvas.height = this.size[1];
    this.context = this.canvas.getContext("2d");
    this.layers = [];
    //this is a placeholder, yada yada yada
    this.send_request = (_request: WindowRequest, _data: WindowRequestValue) => void 0;
    this.handle_message_window = (message: DesktopBackgroundMessage | WindowMessage, data: any) => {
      //nothing special to do, so just pass it on
      this.handle_message(message, data);
      return this.do_rerender;
    };
    //this.render_view isn't supposed to be overriden by anyone, so we can just do most of the stuff there
    this.render_view_window = (theme: Themes, options?: WindowOptions) => {
      if (!this.do_rerender) return;
      if (isDesktopBackgroundInfo(options?.desktop_background_info)) {
        //draw the background
        const bg_info = options.desktop_background_info;
        if (bg_info[0] === DesktopBackgroundTypes.Solid) {
          this.context.fillStyle = bg_info[1];
          this.context.fillRect(this.coords[0], this.coords[1], this.size[0], this.size[1]);
        }
        //handle other types when they exist
      }
      this.render_view(theme);
      this.do_rerender = false;
    };
  }
  render_view(theme: Themes) {
    //
    //
  }
  handle_message(message: DesktopBackgroundMessage | WindowMessage, data: any): boolean {
    //
    return this.do_rerender;
  }
}

