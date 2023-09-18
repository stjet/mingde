import { Themes, THEME_INFOS } from './themes.js';
import { isMouseEvent, isThemes, isWindow } from './guards.js';
import { CONFIG, WINDOW_TOP_HEIGHT, SCALE } from './constants.js';

//Inspired by Elm Architecture
export interface Elm<MessageType> {
  render_view(theme: Themes): void; //draws to the canvas
  handle_message(message: MessageType, data: any): void | boolean;
}

export interface Component<MessageType> extends Elm<MessageType> {
  readonly id: string;
  readonly type: string;
  parent: WindowLike<MessageType>;
}

export interface Canvas<MessageType, MemberType extends Member> extends Elm<MessageType> {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  size: [number, number];
  layers: Layer<MemberType>[];
}

export enum WindowMessage {
  KeyDown,
  MouseMove,
  MouseDown,
  MouseUp,
  Wheel,
  ContextMenu,
  Resize,
  ChangeTheme,
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
}

export interface WindowLike<MessageType> extends Canvas<MessageType | WindowMessage, Component<any>> {
  readonly id: string;
  readonly type: WindowLikeType;
  coords: [number, number]; //top left coords of window
  layers: Layer<Component<any>>[];
  handle_message(message: MessageType, data: any): boolean;
}

export class Window implements WindowLike<any | WindowMessage> {
  readonly type = WindowLikeType.Window;

  readonly id: string;
  readonly render_view_window: (theme: Themes) => void;

  size: [number, number];
  coords: [number, number];

  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  layers: Layer<Component<any>>[];

  constructor(size: [number, number], coords: [number, number]) {
    this.size = [size[0] * SCALE, size[1] * SCALE];
    this.coords = [coords[0] * SCALE, coords[1] * SCALE];
    this.canvas = document.createElement("CANVAS") as HTMLCanvasElement;
    this.canvas.width = this.size[0];
    this.canvas.height = this.size[1];
    this.context = this.canvas.getContext("2d");
    this.layers = [];
    this.render_view_window = (theme: Themes) => {
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
    }
    //
  }
  render_view(_theme: Themes) {
    //deliberately left empty, should be overridden by any extending classes
  }
  handle_message(message: WindowMessage, data: any): boolean {
    //
    return false;
  }
}

export type Member = Component<any> | WindowLike<any>;

export class Layer<MemberType extends Member> {
  layer_name: string;
  hide: boolean;
  private member_num: number;
  private _members: MemberType[];

  constructor(layer_name: string, hide: boolean = false) {
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
    this._members.push(member);
  }
  remove_member(member: MemberType) {
    this._members = this._members.filter((comp) => comp !== member);
  }
  // Move a member to the end of the array, so it gets displayed on "top" of the layer
  move_member_top(member: MemberType) {
    this.remove_member(member);
    this.add_member(member);
  }
}

export class WindowManager implements Canvas<WindowMessage, WindowLike<any>> {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  size: [number, number];
  layers: Layer<WindowLike<any | WindowMessage>>[];
  focused_id: string | undefined;
  theme: Themes;

  constructor(layers: Layer<WindowLike<any | WindowMessage>>[], parent_id: string = "") {
    this.size = [document.body.clientWidth * SCALE, document.body.clientHeight * SCALE];
    this.layers = layers;
    this.theme = Themes.Standard;
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
      if (isWindow(w)) {
        w.render_view_window(theme);
      } else {
        w.render_view(theme);
      }
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
      //if window doesn't rerender, no need to rerender window manager, ofc
      window_rerendered = target_window.handle_message(message, mod);
    } else if (message === WindowMessage.KeyDown) {
      //send to focused window
      if (this.focused_id) {
        window_rerendered = this.windows.reverse().find((member) => {
          return member.id === this.focused_id;
        })!.handle_message(message, data);
      } else {
        return;
      }
    } else if (message === WindowMessage.Wheel) {
      //send to focused window
      if (this.focused_id) {
        window_rerendered = this.windows.reverse().find((member) => {
          return member.id === this.focused_id;
        })!.handle_message(message, data);
      } else {
        return;
      }
    } else if (message === WindowMessage.ChangeTheme && isThemes(data)) {
      if (this.theme === data) return;
      this.theme = data;
      this.windows.forEach((member) => member.handle_message(message, data));
    }
    //so `window_rerendered = undefined` doesn't trigger this
    if (window_rerendered === false) return;
    //WindowMessage.Resize just skips straight here
    //`return` before this if don't want to rerender
    this.render();
  }
}
