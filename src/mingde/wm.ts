import { Themes } from './themes.js';
import { isMouseEvent, isThemes } from './guards.js';

//Inspired by Elm Architecture
export interface Elm<MessageType> {
  render_view(): void; //draws to the canvas
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
  size: number[];
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

export interface WindowLike<MessageType> extends Canvas<MessageType | WindowMessage, Component<any>> {
  readonly id: string;
  coords: number[]; //top left coords of window
  components: Component<MessageType>[]; //parts of the window
  handle_message(message: MessageType, data: any): boolean;
}

export type Member = Component<any> | WindowLike<any>;

export class Layer<MemberType extends Member> {
  layer_name: string;
  private member_num: number;
  private _members: MemberType[];

  constructor(layer_name: string) {
    this.layer_name = layer_name;
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
  size: number[];
  layers: Layer<WindowLike<any>>[];
  focused_id: string | undefined;
  theme: Themes;

  constructor(size: number[], layers: Layer<WindowLike<any>>[], parent_id: string = "") {
    this.size = size;
    this.layers = layers;
    this.theme = Themes.Standard;
    this.canvas = document.createElement("CANVAS") as HTMLCanvasElement;
    this.canvas.width = size[0];
    this.canvas.height = size[1];
    this.canvas.tabIndex = 1;
    if (parent_id) {
      document.getElementById(parent_id)!.appendChild(this.canvas);
    }
    this.context = this.canvas.getContext("2d");
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
    this.render_view();
  }
  get windows() {
    return this.layers.map((layer) => layer.members).flat();
  }
  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  render_view() {
    this.clear();
    //copied in case windows get deleted
    const windows = this.windows; //.slice()
    for (let i = 0; i < windows.length; i++) {
      windows[i].render_view();
      this.context.drawImage(windows[i].canvas, windows[i].coords[0], windows[i].coords[1], windows[i].size[0], windows[i].size[1]);
    }
  }
  handle_message<T extends WindowMessage>(message: T, data: WindowMessageValues[T]) {
    if ((message === WindowMessage.MouseMove || message === WindowMessage.MouseDown || message === WindowMessage.MouseUp || message === WindowMessage.ContextMenu) && isMouseEvent(data)) {
      let target_window: WindowLike<any> | undefined = this.windows.reverse().find((member) => {
        return data.offsetX > member.coords[0] && data.offsetY > member.coords[1] && data.offsetX < member.coords[0] + member.size[0] && data.offsetY < member.coords[1] + member.size[1];
      });
      if (!target_window) return;
      target_window.handle_message(message, data);
    } else if (message === WindowMessage.KeyDown) {
      //send to focused window
      if (this.focused_id) {
        this.windows.reverse().find((member) => {
          return member.id === this.focused_id;
        })!.handle_message(message, data);
      } else {
        return;
      }
    } else if (message === WindowMessage.Wheel) {
      //send to focused window
      if (this.focused_id) {
        this.windows.reverse().find((member) => {
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
    //WindowMessage.Resize just skips straight here
    //`return` before this if don't want to rerender
    this.render_view();
  }
}
