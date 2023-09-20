import { DesktopBackgroundInfo, DesktopBackgroundTypes, Themes, THEME_INFOS } from './themes.js';
import { isMouseEvent, isThemes, isWindow, isWindowLike, isWindowManager } from './guards.js';
import { CONFIG, WINDOW_TOP_HEIGHT, SCALE } from './constants.js';
import { WindowRequest, WindowRequestValue, WindowRequestValues } from './requests.js';

import { Button } from './components/button.js';

//Inspired by Elm Architecture
export interface Elm<MessageType> {
  id: string;
  readonly type: string;
  render_view(theme: Themes): void; //draws to the canvas
  handle_message(message: MessageType, data: any): void | boolean;
}

export interface Component<MessageType> extends Elm<MessageType> {
  id: string; //readonly?
  coords: [number, number];
  size: [number, number];
  parent: WindowLike<MessageType>; //readonly?
}

export interface Canvas<MessageType, MemberType extends Member> extends Elm<MessageType> {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  size: [number, number];
  layers: Layer<MemberType>[];
}

export enum WindowMessage {
  KeyDown = "KeyDown",
  MouseMove = "MouseMove",
  MouseDown = "MouseDown",
  MouseUp = "MouseUp",
  Wheel = "Wheel",
  ContextMenu = "ContextMenu",
  Resize = "Resize",
  ChangeTheme = "ChangeTheme",
}

export interface WindowMessageValues {
  [WindowMessage.KeyDown]: KeyboardEvent,
  [WindowMessage.MouseMove]: MouseEvent,
  [WindowMessage.MouseDown]: MouseEvent,
  [WindowMessage.MouseUp]: MouseEvent,
  [WindowMessage.ContextMenu]: MouseEvent,
  [WindowMessage.Wheel]: WheelEvent,
  [WindowMessage.Resize]: UIEvent,
  [WindowMessage.ChangeTheme]: Themes,
}

export enum WindowLikeType {
  Window,
  DesktopBackground,
}

export interface WindowOptions {
  desktop_background_info: DesktopBackgroundInfo<DesktopBackgroundTypes>;
}

export interface WindowLike<MessageType> extends Canvas<MessageType | WindowMessage, Component<any>> {
  readonly sub_type: WindowLikeType;
  readonly render_view_window: (theme: Themes, options?: WindowOptions) => void;
  readonly handle_message_window: (message: MessageType, data: any) => boolean;
  do_rerender: boolean; //if false, even if windowmanager renders everyone, do not redraw canvas (performance improvement, not currently enforced)
  coords: [number, number]; //top left coords of window
  layers: Layer<Component<any>>[];
  handle_message(message: MessageType, data: any): void;
  send_request: (request: WindowRequest, data: WindowRequestValue) => void;
}

export class Window implements WindowLike<any | WindowMessage> {
  readonly type: string = "window-like";
  readonly sub_type: WindowLikeType = WindowLikeType.Window;

  id: string;
  readonly render_view_window: (theme: Themes) => void;
  readonly handle_message_window: (message: any | WindowMessage, data: any) => boolean;
  readonly top_components: Component<any | WindowMessage>[];

  size: [number, number];
  coords: [number, number];

  do_rerender: boolean;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  layers: Layer<Component<any>>[];

  send_request: (request: WindowRequest, data: WindowRequestValue) => void;

  constructor(size: [number, number], coords: [number, number]) {
    this.size = [size[0] * SCALE, size[1] * SCALE];
    this.coords = [coords[0] * SCALE, coords[1] * SCALE];
    //set to true for first render
    this.do_rerender = true;
    this.canvas = document.createElement("CANVAS") as HTMLCanvasElement;
    this.canvas.width = this.size[0];
    this.canvas.height = this.size[1];
    this.context = this.canvas.getContext("2d");
    this.layers = [];
    //this is a placeholder, layer should insert one in or something idk, slightly weird, I know
    this.send_request = (_request: WindowRequest, _data: WindowRequestValue) => void 0;
    //again, probably not needed
    let self = this;
    //Window top bar components, currently window title and close button
    this.top_components = [
      new Button<any | WindowMessage>(this, "x", [this.size[0] / SCALE - 4 - 17, WINDOW_TOP_HEIGHT / SCALE - 4 - 17], 17, 2.5, () => {
        self.send_request(WindowRequest.CloseWindow, {});
      }),
    ];
    //intercept requests, so top bar close button, dragging, etc, can't be overriden
    this.handle_message_window = (message: WindowMessage, data: any) => {
      let propogate_down = true;
      if (message === WindowMessage.MouseDown) {
        if (isMouseEvent(data)) {
          if (data.clientY < WINDOW_TOP_HEIGHT) {
            propogate_down = false;
            this.top_components.filter((c) => {
              return data.clientX > c.coords[0] && data.clientY > c.coords[1] && data.clientX < c.coords[0] + c.size[0] && data.clientY < c.coords[1] + c.size[1];
            }).forEach((c) => c.handle_message(message, data));
          }
        }
      }
      if (propogate_down) {
        this.handle_message(message, data);
      }
      return this.do_rerender;
    }
    //this will draw the window, top bar, etc, and also call the arbitary render function
    this.render_view_window = (theme: Themes) => {
      if (!this.do_rerender) return;
      //draw window background
      this.context.fillStyle = THEME_INFOS[theme].background;
      this.context.fillRect(0, 0, this.size[0], this.size[1]);
      //arbitary stuff here
      this.render_view(theme);
      //draw top bar and stuff
      this.context.fillStyle = THEME_INFOS[theme].top;
      this.context.fillRect(0, 0, this.size[0], WINDOW_TOP_HEIGHT);
      this.context.strokeStyle = THEME_INFOS[theme].background;
      this.context.lineWidth = 2 * SCALE;
      this.context.strokeRect(0, 0, this.size[0], WINDOW_TOP_HEIGHT);
      //draw top bar components
      this.top_components.forEach((top_component) => top_component.render_view(theme));
      //draw window border
      let border_right_bottom = new Path2D();
      border_right_bottom.moveTo(0, this.size[1]);
      border_right_bottom.lineTo(this.size[0], this.size[1]);
      border_right_bottom.lineTo(this.size[0], 0);
      this.context.strokeStyle = THEME_INFOS[theme].border_right_bottom;
      this.context.stroke(border_right_bottom);
      let window_left_top = new Path2D();
      window_left_top.moveTo(0, this.size[1]);
      window_left_top.lineTo(0, 0);
      window_left_top.lineTo(this.size[0], 0);
      this.context.strokeStyle = THEME_INFOS[theme].border_left_top;
      this.context.stroke(window_left_top);
      this.do_rerender = false;
    }
  }
  render_view(_theme: Themes) {
    //deliberately left empty, should be overridden by any extending classes
  }
  handle_message(message: WindowMessage, data: any): boolean {
    //
    return this.do_rerender;
  }
}

export type Member = Component<any> | WindowLike<any>;

export class Layer<MemberType extends Member> {
  layer_name: string;
  hide: boolean;
  private parent: WindowLike<any> | WindowManager;
  private member_num: number; //counts removed members too
  private _members: MemberType[];

  constructor(parent: WindowLike<any> | WindowManager, layer_name: string, hide: boolean = false) {
    this.parent = parent;
    this.layer_name = layer_name;
    this.hide = hide;
    this.member_num = 0;
    this._members = [];
  }
  get members() {
    return this._members;
  }
  add_member(member: MemberType) {
    this.member_num++;
    member.id = `${this.layer_name}-${this.member_num}-${member.type}`;
    if (isWindowLike(member)) {
      let self = this; //probably not needed? makes it more clear at least
      member.send_request = (request: WindowRequest, data: WindowRequestValue) => {
        data.id = member.id;
        data.layer_name = self.layer_name;
        if (isWindowManager(self.parent)) {
          self.parent.handle_request(request, data);
        }
      };
    }
    this._members.push(member);
  }
  remove_member(id: string) {
    this._members = this._members.filter((member) => member.id !== id);
  }
  // Move a member to the end of the array, so it gets displayed on "top" of the layer
  move_member_top(member: MemberType) {
    this.remove_member(member.id);
    this.add_member(member);
  }
}

export class WindowManager implements Canvas<WindowMessage, WindowLike<any>> {
  readonly type = "window-manager";
  id = "_window-manager"; //special id, shouldn't really have a use

  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  size: [number, number];
  layers: Layer<WindowLike<any | WindowMessage>>[]; //should be private
  focused_id: string | undefined;
  theme: Themes;
  options: WindowOptions;

  constructor(parent_id: string = "") {
    this.size = [document.body.clientWidth * SCALE, document.body.clientHeight * SCALE];
    this.layers = [];
    this.theme = Themes.Standard;
    this.options = {
      //default desktop background
      desktop_background_info: [DesktopBackgroundTypes.Solid, "#008080"],
    };
    this.canvas = document.createElement("CANVAS") as HTMLCanvasElement;
    this.canvas.width = this.size[0];
    this.canvas.height = this.size[1];
    this.canvas.tabIndex = 1;
    if (parent_id) {
      document.getElementById(parent_id)!.appendChild(this.canvas);
    }
    this.context = this.canvas.getContext("2d");
    this.context.imageSmoothingEnabled = false;
    //set up event listeners that dispatch messages
    this.canvas.addEventListener("keydown", (event: KeyboardEvent) => {
      this.handle_message(WindowMessage.KeyDown, event);
    });
    this.canvas.addEventListener("mousemove", (event: MouseEvent) => {
      this.handle_message(WindowMessage.MouseMove, event);
    });
    this.canvas.addEventListener("mousedown", (event: MouseEvent) => {
      this.handle_message(WindowMessage.MouseDown, event);
    });
    this.canvas.addEventListener("mouseup", (event: MouseEvent) => {
      this.handle_message(WindowMessage.MouseUp, event);
    });
    this.canvas.addEventListener("wheel", (event: WheelEvent) => {
      this.handle_message(WindowMessage.Wheel, event);
    });
    this.canvas.addEventListener("contextmenu", (event: MouseEvent) => {
      this.handle_message(WindowMessage.ContextMenu, event);
    });
    window.addEventListener("resize", (event: UIEvent) => {
      this.handle_message(WindowMessage.Resize, event);
    });
    //
    //first render
    this.render();
  }
  get windows() {
    return this.layers.filter((layer) => !layer.hide).map((layer) => layer.members).flat();
  }
  set_layers(layers: Layer<WindowLike<any | WindowMessage>>[]) {
    this.layers = layers;
  }
  get_window_by_id(id: String): WindowLike<any | WindowMessage> | undefined {
    return this.layers.map((layer) => layer.members).flat().find((w) => w.id === id);
  }
  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  render() {
    if (CONFIG.DEBUG) {
      console.debug("Rerendering window manager");
    }
    this.render_view(this.theme);
  }
  render_view(theme: Themes) {
    this.clear();
    //copied in case windows get deleted
    const windows = this.windows; //.slice()
    for (let i = 0; i < windows.length; i++) {
      let w = windows[i];
      w.render_view_window(theme, this.options);
      this.context.drawImage(w.canvas, w.coords[0], w.coords[1], w.size[0], w.size[1]);
    }
  }
  handle_message<T extends WindowMessage>(message: T, data: WindowMessageValues[T]) {
    let window_rerendered: boolean;
    if ((message === WindowMessage.MouseMove || message === WindowMessage.MouseDown || message === WindowMessage.MouseUp || message === WindowMessage.ContextMenu) && isMouseEvent(data)) {
      //correct coords, create new event
      //(we can use clientX here instead of offsetX because canvas is guaranteed to be entire page)
      const mod = new MouseEvent(data.type, {
        clientX: data.clientX * SCALE,
        clientY: data.clientY * SCALE,
      });
      let target_window: WindowLike<any> | undefined = this.windows.reverse().find((member) => {
        return mod.clientX > member.coords[0] && mod.clientY > member.coords[1] && mod.clientX < (member.coords[0] + member.size[0]) && mod.clientY < (member.coords[1] + member.size[1]);
      });
      if (!target_window) return;
      //correct coords again, so the coords are relative to windowlike top left
      const mod_again = new MouseEvent(data.type, {
        clientX: mod.clientX - target_window.coords[0],
        clientY: mod.clientY - target_window.coords[1],
      });
      //if window doesn't rerender, no need to rerender window manager, ofc
      window_rerendered = target_window.handle_message_window(message, mod_again);
    } else if (message === WindowMessage.KeyDown) {
      //send to focused window
      if (this.focused_id) {
        window_rerendered = this.windows.reverse().find((member) => {
          return member.id === this.focused_id;
        })!.handle_message_window(message, data);
      } else {
        return;
      }
    } else if (message === WindowMessage.Wheel) {
      //send to focused window
      if (this.focused_id) {
        window_rerendered = this.windows.reverse().find((member) => {
          return member.id === this.focused_id;
        })!.handle_message_window(message, data);
      } else {
        return;
      }
    } else if (message === WindowMessage.ChangeTheme && isThemes(data)) {
      if (this.theme === data) return;
      this.theme = data;
      this.windows.forEach((member) => member.handle_message_window(message, data));
    }
    //so `window_rerendered = undefined` doesn't trigger this
    if (window_rerendered === false) return;
    //WindowMessage.Resize just skips straight here
    //`return` before this if don't want to rerender
    this.render();
  }
  handle_request(request: WindowRequest, data: WindowRequestValue) {
    if (request === WindowRequest.CloseWindow && data.layer_name && data.id) {
      this.layers.find((layer) => layer.layer_name === data.layer_name).remove_member(data.id);
    }
    //
    this.render();
  }
}
