import { Component, Layer, WindowLike, WindowLikeType, WindowMessage, WindowOptions, DesktopBackgroundMessageStandard } from './wm.js';
import { WindowRequest, WindowRequestValues } from './requests.js';
import { Themes } from './themes.js';
import { SCALE } from './constants.js';
import { isCoords, isDesktopBackgroundValue, isHexColor, isImage } from './guards.js';

export enum DesktopBackgroundMessage {
  //
}

//members would be like desktop icons and stuff I guess?
export class DesktopBackground implements WindowLike<DesktopBackgroundMessage | DesktopBackgroundMessageStandard> {
  readonly type: string = "window-like";
  readonly sub_type: WindowLikeType = WindowLikeType.DesktopBackground;

  readonly id: string;
  readonly render_view_window: (theme: Themes, options?: any) => void;
  readonly handle_message_window: (message: DesktopBackgroundMessage | DesktopBackgroundMessageStandard | WindowMessage, data: any) => boolean;
  readonly set_secret: (secret: string) => void;

  private secret: string;

  size: [number, number];

  do_rerender: boolean;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  layers: Layer<Component<any>>[];

  send_request: <T extends WindowRequest>(request: T, data: WindowRequestValues[T], secret?: string) => void;

  constructor() {
    this.size = [document.body.clientWidth * SCALE, document.body.clientHeight * SCALE];
    //set to true for first render
    this.do_rerender = true;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.size[0];
    this.canvas.height = this.size[1];
    this.context = this.canvas.getContext("2d");
    this.layers = [];
    let self = this;
    this.set_secret = (secret: string) => {
      if (self.secret) return;
      self.secret = secret;
    };
    //this is a placeholder, yada yada yada
    this.send_request = <T extends WindowRequest>(_request: T, _data: WindowRequestValues[T], _secret?: string) => void 0;
    this.handle_message_window = (message: DesktopBackgroundMessage | DesktopBackgroundMessageStandard | WindowMessage, data: any) => {
      //nothing special to do, so just pass it on
      if (message === DesktopBackgroundMessageStandard.ChangeBackground) {
        this.do_rerender = true;
      } else {
        this.handle_message(message, data);
      }
      return this.do_rerender;
    };
    //this.render_view isn't supposed to be overriden by anyone, so we can just do most of the stuff there
    this.render_view_window = (theme: Themes, options?: WindowOptions) => {
      if (!this.do_rerender) return;
      if (isDesktopBackgroundValue(options?.desktop_background) && options) {
        this.clear();
        //draw the background
        if (isHexColor(options.desktop_background)) {
          this.context.fillStyle = options.desktop_background;
          this.context.fillRect(0, 0, this.size[0], this.size[1]);
        } else if (isImage(options.desktop_background)) {
          this.context.drawImage(options.desktop_background, 0, 0, this.size[0], this.size[1]);
        }
      }
      this.render_view(theme);
      this.do_rerender = false;
    };
  }
  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  render_view(_theme: Themes) {
    //
  }
  handle_message(message: DesktopBackgroundMessage | WindowMessage, data: any): boolean {
    if (message === WindowMessage.Resize && isCoords(data)) {
      this.size = data;
      this.canvas.width = this.size[0];
      this.canvas.height = this.size[1];
      this.do_rerender = true;
    }
    return this.do_rerender;
  }
}

