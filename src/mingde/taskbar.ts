import { Component, WindowLike, WindowMessage, WindowOptions, WindowLikeType, WindowMetadata, Layer } from './wm.js';
import { Themes, THEME_INFOS } from './themes.js';
import { WindowRequest, WindowRequestValues } from './requests.js';
import { isCoords, isDesktopTime, isWindowChangeEvent, isMouseEvent } from './guards.js';
import { SCALE, TASKBAR_HEIGHT, FONT_SIZES } from './constants.js';
import { Alignment, Button } from './components/button.js';

const padding: number = 4;

export enum TaskbarMessage {
  WindowFocusChange = "WindowFocusChange", //data is string id
  ReceiveTimeUpdate = "ReceiveTimeUpdate",
}

export class Taskbar implements WindowLike<TaskbarMessage> {
  readonly type: string = "window-like";
  readonly sub_type: WindowLikeType = WindowLikeType.Taskbar; 

  readonly id: string;
  readonly render_view_window: (theme: Themes, options?: any) => void;
  readonly handle_message_window: (message: TaskbarMessage | WindowMessage, data: any) => boolean;
  readonly set_secret: (secret: string) => void;

  private secret: string;
  private open_windows: WindowMetadata[];
  private focused_id: string | undefined;

  size: [number, number];

  do_rerender: boolean;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  layers: Layer<Component<TaskbarMessage | WindowMessage>>[];

  send_request: <T extends WindowRequest>(request: T, data: WindowRequestValues[T], secret?: string) => void;

  constructor() {
    this.size = [document.body.clientWidth * SCALE, TASKBAR_HEIGHT];
    //set to true for first render
    this.do_rerender = true;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.size[0];
    this.canvas.height = this.size[1];
    this.context = this.canvas.getContext("2d");
    this.layers = [
      new Layer(this, "permanent"),
      new Layer(this, "window_metadata"),
    ];
    const padding_y: number = (TASKBAR_HEIGHT / SCALE - FONT_SIZES.BUTTON / SCALE - 8) / 2;
    //add start button
    this.layers[0].add_member(new Button(this, "Start", [padding, padding], 42, padding_y, () => {}, true));
    //add time button
    this.layers[0].add_member(new Button(this, "00:00?", [this.size[0] / SCALE - 75 + padding, padding], 75 - padding, padding_y, () => {
      //todo: click on this updates the time
    }, undefined, true));
    this.open_windows = [];
    let self = this;
    this.set_secret = (secret: string) => {
      if (self.secret) return;
      self.secret = secret;
    };
    //this is a placeholder, yada yada yada
    this.send_request = <T extends WindowRequest>(_request: T, _data: WindowRequestValues[T], _secret?: string) => void 0;
    this.handle_message_window = (message: TaskbarMessage | WindowMessage, data: any) => {
      //nothing special to do, so just pass it on
      this.handle_message(message, data);
      return this.do_rerender;
    };
    //this.render_view isn't supposed to be overriden by anyone, so we can just do most of the stuff there
    this.render_view_window = (theme: Themes, options?: WindowOptions) => {
      if (!this.do_rerender) return;
      if (isDesktopTime(options?.time)) {
        //send message
        this.handle_message(TaskbarMessage.ReceiveTimeUpdate, options.time);
      }
      this.clear();
      this.render_view(theme);
      this.do_rerender = false;
    };
  }
  get components(): Component<TaskbarMessage | WindowMessage>[] {
    return this.layers.filter((layer) => !layer.hide).map((layer) => layer.members).flat();
  }
  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  render_view(theme: Themes) {
    let theme_info = THEME_INFOS[theme];
    this.context.fillStyle = theme_info.background;
    this.context.fillRect(0, 0, this.size[0], this.size[1]);
    let top_border: Path2D = new Path2D();
    top_border.moveTo(0, 0);
    top_border.lineTo(this.size[0], 0);
    this.context.lineWidth = 2 * SCALE;
    this.context.strokeStyle = theme_info.border_left_top;
    this.context.stroke(top_border);
    //reset window metadata and stuff
    //todo: this is not very elm of us
    this.layers[1].reset();
    let metadata_width: number;
    if (this.open_windows.length < 5) {
      metadata_width = 225;
    } else if (this.open_windows.length < 7) {
      metadata_width = 175;
    } else {
      metadata_width = 125;
    }
    const padding_y: number = (TASKBAR_HEIGHT / SCALE - FONT_SIZES.BUTTON / SCALE - 8) / 2;
    for (let i = 0; i < this.open_windows.length; i++) {
      let open_window: WindowMetadata = this.open_windows[i];
      //add window thingy
      let inverted: boolean = false;
      //since focused_id can be desktop, taskbar, and other non windows, sometimes all the tabs might be uninverted - this is intended
      if (open_window.id === this.focused_id) {
        inverted = true;
      }
      let metadata_x: number = 42 + (padding + metadata_width) * i + padding * 2;
      if ((metadata_x + metadata_width) * SCALE > this.size[0] - 100 * SCALE) {
        this.layers[1].add_member(new Button(this, `+${this.open_windows.length - i}`, [metadata_x, padding], 25, padding_y, () => {
          //placeholder, todo: should do something in the future
        }, true));
        break;
      }
      this.layers[1].add_member(new Button(this, open_window.title, [metadata_x, padding], metadata_width, padding_y, inverted ? () => {} : () => {
        //open window
        this.send_request(WindowRequest.FocusWindow, {
          new_focus: open_window.id,
        }, this.secret);
      }, true, inverted, Alignment.Left));
    }
    //draw layers
    let components = this.components;
    for (let j = 0; j < components.length; j++) {
      components[j].render_view(theme);
    }
  }
  handle_message(message: TaskbarMessage | WindowMessage, data: any): boolean {
    if (message === WindowMessage.Resize && isCoords(data)) {
      this.size[0] = data[0];
      this.canvas.width = this.size[0];
      this.send_request(WindowRequest.ChangeCoords, {
        delta_coords: [0, 0], //dummy
        stick_bottom: true,
      }, this.secret);
      this.do_rerender = true;
    } else if (message === WindowMessage.MouseDown) {
      if (isMouseEvent(data)) {
        let relevant_components = this.components.filter((c) => {
          return data.clientX > c.coords[0] && data.clientY > c.coords[1] && data.clientX < c.coords[0] + c.size[0] && data.clientY < c.coords[1] + c.size[1] && c.clickable;
        });
        relevant_components.forEach((c) => c.handle_message(message, data));
        if (relevant_components.length > 0) {
          this.do_rerender = true;
        }
      }
    } else if (message === WindowMessage.WindowAdd && isWindowChangeEvent(data)) {
      this.open_windows.push(data.detail);
      this.do_rerender = true;
    } else if (message === WindowMessage.WindowRemove && isWindowChangeEvent(data)) {
      this.open_windows = this.open_windows.filter((open_window) => open_window.id !== data.detail.id);
      this.do_rerender = true;
    } else if (message === TaskbarMessage.WindowFocusChange && typeof data === "string") {
      this.focused_id = data;
      this.do_rerender = true;
    } else if (message === TaskbarMessage.ReceiveTimeUpdate && isDesktopTime(data)) {
      (this.layers[0].members[1] as Button<TaskbarMessage | WindowMessage>).text = `${String(data.hours).length === 1 ? "0" + data.hours : data.hours}:${String(data.minutes).length === 1 ? "0" + data.minutes : data.minutes}~`;
    }
    return this.do_rerender;
  }
}

