import { DesktopBackgroundInfo, DesktopBackgroundTypes, Themes, THEME_INFOS } from './themes.js';
import { isCoords, isOpenWindowValue, isChangeCursorValue, isChangeCoordsValue, isFocusWindowValue, isChangeThemeValue, isMouseEvent, isKeyboardEvent, isWindowChangeEvent, isWindow, isWindowLike, isWindowManager } from './guards.js';
import { WINDOW_MIN_DIMENSIONS, CONFIG, WINDOW_TOP_HEIGHT, TASKBAR_HEIGHT, SCALE, FONT_SIZES, SHORTCUTS } from './constants.js';
import { WindowRequest, WindowRequestValue, WindowRequestValues, CursorType } from './requests.js';
import { gen_secret, get_time, create_me_buttons, interpret_me_buttons, random_int, key_is_switch_focus_shortcut, get_switch_key_index, DesktopTime } from './utils.js';
import type { Registry } from './registry.js';

import { Button } from './components/button.js';
import { TextLine } from './components/text_line.js';

export enum WindowMessage {
  KeyDown = "Keydown",
  MouseMove = "MouseMove",
  MouseDown = "MouseDown",
  MouseUp = "MouseUp",
  MouseLeave = "MouseLeave",
  Wheel = "Wheel",
  ContextMenu = "ContextMenu",
  Resize = "Resize",
  ChangeTheme = "ChangeTheme",
  MouseMoveOutside = "MouseMoveOutside", //give mouse movements outside the windowlikes without coords data
  MouseUpOutside = "MouseUpOutside",
  WindowAdd = "WindowAdd",
  WindowRemove = "WindowRemove",
}

export enum TaskbarMessageStandard {
  WindowFocusChange = "WindowFocusChange", //data is string id
  StartMenuOpen = "StartMenuOpen", //data is boolean, doesn't matter
  StartMenuClosed = "StartMenuClosed", //data is boolean, doesn't matter
  SwitchFocus = "SwitchFocus", //data is index (number) of window to switch to
}

export enum StartMenuMessageStandard {
  MouseDownOutside = "MouseDownOutside", //data is just boolean, doesn't matter
  StartMenuClose = "StartMenuClose",
}

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
  readonly parent: WindowLike<MessageType | WindowMessage>; //readonly?
  clickable: boolean;
}

export type Member = Component<any> | WindowLike<any>;

export interface Canvas<MessageType, MemberType extends Member> extends Elm<MessageType> {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  size: [number, number];
  layers: Layer<MemberType>[];
}

export interface WindowMetadata {
  id: string;
  title: string;
}

export interface WindowChangeEvent extends Event {
  detail: WindowMetadata;
}

export interface WindowMessageValues {
  [WindowMessage.KeyDown]: KeyboardEvent,
  [WindowMessage.MouseMove]: MouseEvent,
  [WindowMessage.MouseDown]: MouseEvent,
  [WindowMessage.MouseUp]: MouseEvent,
  [WindowMessage.MouseLeave]: boolean,
  [WindowMessage.ContextMenu]: MouseEvent,
  [WindowMessage.Wheel]: WheelEvent,
  [WindowMessage.Resize]: [number, number],
  [WindowMessage.ChangeTheme]: Themes,
  [WindowMessage.MouseMoveOutside]: MouseEvent,
  [WindowMessage.MouseUpOutside]: boolean,
  [WindowMessage.WindowAdd]: WindowChangeEvent,
  [WindowMessage.WindowRemove]: WindowChangeEvent,
}

export enum WindowLikeType {
  Window,
  DesktopBackground,
  Taskbar,
  StartMenu,
}

export interface WindowOptions {
  desktop_background_info: DesktopBackgroundInfo<DesktopBackgroundTypes>;
  time: DesktopTime,
}

export interface WindowLike<MessageType> extends Canvas<WindowMessage, Component<any>> {
  readonly sub_type: WindowLikeType;
  readonly render_view_window: (theme: Themes, options?: WindowOptions) => void;
  readonly handle_message_window: (message: MessageType | WindowMessage, data: any) => boolean;
  readonly set_secret: (secret: string) => void;
  do_rerender: boolean; //if false, even if windowmanager renders everyone, do not redraw canvas (performance improvement, not currently enforced)
  layers: Layer<Component<any>>[];
  handle_message(message: MessageType | WindowMessage, data: any): void;
  send_request: <T extends WindowRequest>(request: T, data: WindowRequestValues[T], secret?: string) => void;
  clear(): void; //is this needed?
}

export class Window<MessageType> implements WindowLike<MessageType> {
  readonly type: string = "window-like";
  readonly sub_type: WindowLikeType = WindowLikeType.Window;
  readonly window_type: string;

  id: string;
  readonly render_view_window: (theme: Themes) => void;
  readonly handle_message_window: (message: MessageType | WindowMessage, data: any) => boolean;
  readonly set_secret: (secret: string) => void;

  private top_components: Component<MessageType | WindowMessage>[];
  private secret: string;
  private move_mode: boolean;
  private move_hover: boolean;
  private move_coords: [number, number];
  private wresize_mode: boolean; //width resize
  private wresize_hover: boolean;
  private wresize_info: [number, number]; //initial x mouse coord, initial width
  private hresize_mode: boolean; //height resize
  private hresize_hover: boolean;
  private hresize_info: [number, number]; //initial y mouse coord, initial height

  size: [number, number];
  title: string;

  resizable: boolean;
  do_rerender: boolean;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  layers: Layer<Component<MessageType | WindowMessage>>[];

  send_request: <T extends WindowRequest>(request: T, data: WindowRequestValues[T], secret?: string) => void;

  constructor(size: [number, number], title: string, window_type: string = "") {
    this.size = [size[0] * SCALE, size[1] * SCALE];
    this.title = title;
    this.window_type = window_type;
    this.move_mode = false;
    this.move_hover = false;
    this.wresize_mode = false;
    this.wresize_hover = false;
    this.hresize_mode = false;
    this.hresize_hover = false;
    this.resizable = true;
    //set to true for first render
    this.do_rerender = true;
    this.canvas = document.createElement("CANVAS") as HTMLCanvasElement;
    this.canvas.width = this.size[0];
    this.canvas.height = this.size[1];
    this.context = this.canvas.getContext("2d");
    this.layers = [];
    //this is a placeholder, layer should insert one in or something idk, slightly weird, I know
    this.send_request = <T extends WindowRequest>(_request: T, _data: WindowRequestValues[T], _secret?: string) => void 0;
    //layer can set secret, it can only be set once
    this.set_secret = (secret: string) => {
      if (this.secret) return;
      this.secret = secret;
    };
    const create_top_components = (): Component<MessageType | WindowMessage>[] => {
      return [
        new Button<MessageType | WindowMessage>(this, "x", [this.size[0] / SCALE - 4 - 17, WINDOW_TOP_HEIGHT / SCALE - 4 - 17], 17, 1, () => {
          this.send_request(WindowRequest.CloseWindow, {}); //, this.secret);
        }),
        new TextLine<MessageType | WindowMessage>(this, this.title, [4, WINDOW_TOP_HEIGHT / SCALE - (WINDOW_TOP_HEIGHT - FONT_SIZES.TOP) / SCALE / 2], "text_top", "TOP", this.size[0] / SCALE - 17 - 6, true),
      ];
    }
    //Window top bar components, currently window title and close button
    this.top_components = create_top_components();
    //intercept requests, so top bar close button, dragging, etc, can't be overriden
    //bug: where move mode still happens when dragging window near bottom and releasing on taskbar?
    this.handle_message_window = (message: MessageType | WindowMessage, data: any) => {
      const win_margin: number = 9 * SCALE;
      let propogate_down = true;
      if (message === WindowMessage.MouseDown && isMouseEvent(data)) {
        if (data.clientY < WINDOW_TOP_HEIGHT) {
          propogate_down = false;
          let relevant_components = this.top_components.filter((c) => {
            return data.clientX > c.coords[0] && data.clientY > c.coords[1] && data.clientX < c.coords[0] + c.size[0] && data.clientY < c.coords[1] + c.size[1] && c.clickable;
          });
          relevant_components.forEach((c) => c.handle_message(message, data));
          if (relevant_components.length === 0) {
            //dragging mode
            this.move_mode = true;
            this.move_coords = [data.screenX, data.screenY];
          }
        } else if (data.clientY > this.size[1] - win_margin && this.resizable) {
          this.hresize_mode = true;
          this.hresize_info = [data.screenY, this.size[1]];
        } else if (data.clientX > this.size[0] - win_margin && this.resizable) {
          this.wresize_mode = true;
          this.wresize_info = [data.screenX, this.size[0]];
        }
      } else if (message === WindowMessage.MouseMove && isMouseEvent(data)) {
        const is_default_cursor: boolean = interpret_me_buttons(data.buttons)[0] === CursorType.Default;
        if (data.clientY < WINDOW_TOP_HEIGHT) {
          propogate_down = false;
          let clickable_found = this.top_components.filter((c) => {
            return data.clientX > c.coords[0] && data.offsetY > c.coords[1] && data.clientX < c.coords[0] + c.size[0] && data.clientY < c.coords[1] + c.size[1];
          }).some((c) => c.clickable);
          if (!clickable_found) {
            //no need to send more requests if already correct cursor
            if (!this.move_hover && is_default_cursor) {
              this.move_hover = true;
              this.send_request(WindowRequest.ChangeCursor, {
                new_cursor: CursorType.Move,
              }, this.secret);
              this.wresize_hover = false;
              this.hresize_hover = false;
            }
          } else {
            //again don't send more requests than needed
            if (this.move_hover) {
              //don't show move cursor if hovering over button on window top
              this.move_hover = false;
              this.send_request(WindowRequest.ChangeCursor, {
                new_cursor: CursorType.Default,
              }, this.secret);
            }
          }
        } else {
          //stop cursor if move out of window top and not in move mode
          if (this.move_hover && !this.move_mode) {
            this.move_hover = false;
            this.send_request(WindowRequest.ChangeCursor, {
              new_cursor: CursorType.Default,
            }, this.secret);
          }
          //if on right or bottom margins of the window
          if (data.clientY > this.size[1] - win_margin) {
            if (!this.hresize_hover && is_default_cursor && this.resizable) {
              this.hresize_hover = true;
              this.send_request(WindowRequest.ChangeCursor, {
                new_cursor: CursorType.RowResize,
              }, this.secret);
            }
          } else if (data.clientX > this.size[0] - win_margin) {
            if (!this.wresize_hover && is_default_cursor && this.resizable) {
              this.wresize_hover = true;
              this.send_request(WindowRequest.ChangeCursor, {
                new_cursor: CursorType.ColResize,
              }, this.secret);
            }
          } else if ((this.wresize_hover || this.hresize_hover) && (!this.wresize_mode && !this.hresize_mode)) {
            this.wresize_hover = false;
            this.hresize_hover = false;
            this.send_request(WindowRequest.ChangeCursor, {
              new_cursor: CursorType.Default,
            }, this.secret);
          }
        }
        if (this.move_mode) {
          this.send_request(WindowRequest.ChangeCoords, {
            delta_coords: [data.screenX - this.move_coords[0], data.screenY - this.move_coords[1]],
          }, this.secret);
          this.move_coords = [data.screenX, data.screenY];
        } else if (this.wresize_mode) {
          this.size[0] = this.wresize_info[1] + (data.screenX - this.wresize_info[0]);
          if (this.size[0] < WINDOW_MIN_DIMENSIONS[0]) {
            this.size[0] = WINDOW_MIN_DIMENSIONS[0];
          }
          this.canvas.width = this.size[0];
          this.top_components = create_top_components();
          this.do_rerender = true;
        } else if (this.hresize_mode) {
          this.size[1] = this.hresize_info[1] + (data.screenY - this.hresize_info[0]);
          if (this.size[1] < WINDOW_MIN_DIMENSIONS[1]) {
            this.size[1] = WINDOW_MIN_DIMENSIONS[1];
          }
          this.canvas.height = this.size[1];
          this.do_rerender = true;
        }
      } else if (message === WindowMessage.MouseUp) {
        if (this.move_mode) {
          this.move_mode = false;
          if (data.clientY >= WINDOW_TOP_HEIGHT) {
            this.send_request(WindowRequest.ChangeCursor, {
              new_cursor: CursorType.Default,
            }, this.secret);
          }
        } else if (this.wresize_mode || this.hresize_mode) {
          this.wresize_mode = false;
          this.hresize_mode = false;
          this.send_request(WindowRequest.ChangeCursor, {
            new_cursor: CursorType.Default,
          }, this.secret);
        }
      } else if (message === WindowMessage.MouseLeave) {
        propogate_down = false;
        if (this.move_mode) {
          this.move_mode = false;
          this.send_request(WindowRequest.ChangeCursor, {
            new_cursor: CursorType.Default,
          }, this.secret);
        } else if (this.wresize_mode || this.hresize_mode) {
          this.wresize_mode = false;
          this.hresize_mode = false;
          this.send_request(WindowRequest.ChangeCursor, {
            new_cursor: CursorType.Default,
          }, this.secret);
        }
      } else if (message === WindowMessage.MouseMoveOutside) {
        propogate_down = false;
        //stop cursor if move out of window top and not in move mode
        if (this.move_hover && !this.move_mode) {
          this.send_request(WindowRequest.ChangeCursor, {
            new_cursor: CursorType.Default,
          }, this.secret);
          this.move_hover = false;
        } else if (this.move_mode) {
          this.send_request(WindowRequest.ChangeCoords, {
            delta_coords: [data.screenX - this.move_coords[0], data.screenY - this.move_coords[1]],
          }, this.secret);
          this.move_coords = [data.screenX, data.screenY];
        } else if (this.wresize_mode) {
          this.size[0] = this.wresize_info[1] + (data.screenX - this.wresize_info[0]);
          if (this.size[0] < WINDOW_MIN_DIMENSIONS[0]) {
            this.size[0] = WINDOW_MIN_DIMENSIONS[0];
          }
          this.canvas.width = this.size[0];
          this.top_components = create_top_components();
          this.do_rerender = true;
        } else if (this.hresize_mode) {
          this.size[1] = this.hresize_info[1] + (data.screenY - this.hresize_info[0]);
          if (this.size[1] < WINDOW_MIN_DIMENSIONS[1]) {
            this.size[1] = WINDOW_MIN_DIMENSIONS[1];
          }
          this.canvas.height = this.size[1];
          this.do_rerender = true;
        } else if (this.wresize_hover || this.hresize_hover) {
          this.wresize_hover = false;
          this.hresize_hover = false;
          this.send_request(WindowRequest.ChangeCursor, {
            new_cursor: CursorType.Default,
          }, this.secret);
        }
      } else if (message === WindowMessage.MouseUpOutside) {
        if (this.move_mode) {
          this.move_mode = false;
          this.send_request(WindowRequest.ChangeCursor, {
            new_cursor: CursorType.Default,
          }, this.secret);
        } else if (this.wresize_mode || this.hresize_mode) {
          this.wresize_mode = false;
          this.hresize_mode = false;
          this.send_request(WindowRequest.ChangeCursor, {
            new_cursor: CursorType.Default,
          }, this.secret);
        }
      } else if (message === WindowMessage.KeyDown && isKeyboardEvent(data)) {
        if (data.altKey) {
          //keyboard shortcuts
          if (SHORTCUTS["close-window"].includes(data.key)) {
            //close window
            this.send_request(WindowRequest.CloseWindow, {}); //, this.secret);
          }
        } else {
          propogate_down = true;
        }
      } else if (message === WindowMessage.ChangeTheme) {
        this.do_rerender = true;
      }
      if (propogate_down) {
        this.handle_message(message, data);
      }
      return this.do_rerender;
    }
    //this will draw the window, top bar, etc, and also call the arbitary render function
    this.render_view_window = (theme: Themes) => {
      if (!this.do_rerender) return;
      this.clear();
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
  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  render_view(_theme: Themes) {
    //deliberately left empty, should be overridden by any extending classes
  }
  handle_message(_message: MessageType | WindowMessage, _data: any): boolean {
    //also meant to be overriden
    return this.do_rerender;
  }
}

export class Layer<MemberType extends Member> {
  layer_name: string;
  hide: boolean;

  private windows_only: boolean;
  private parent: WindowLike<any> | WindowManager;
  private member_num: number; //counts removed members too
  private _members: MemberType[];
  private _secrets: Record<string, string>;
  private _coords: Record<string, [number, number]>;

  constructor(parent: WindowLike<any> | WindowManager, layer_name: string, windows_only: boolean = false, hide: boolean = false) {
    this.parent = parent;
    this.layer_name = layer_name;
    this.windows_only = windows_only;
    this.hide = hide;
    this.member_num = 0;
    this._members = [];
    this._secrets = {};
    this._coords = {};
  }
  get members() {
    return this._members;
  }
  get coords() {
    return this._coords;
  }
  reset() {
    this._members = [];
    this._secrets = {};
    this._coords = {};
  }
  get_member_by_id(id: string) {
    return this._members.find((member) => member.id === id);
  }
  add_member(member: MemberType, coords?: [number, number]) {
    //yeah, both isWindow and instanceof are needed
    if (this.windows_only && !(isWindow(member) && member instanceof Window)) {
      return;
    }
    if (isWindowManager(this.parent) && isWindowLike(member) && !coords) {
      console.error("`WindowLike` must provide coords to layer");
      return;
    }
    this.member_num++;
    member.id = `${this.layer_name}-${this.member_num}-${member.type}`;
    if (isWindow(member) && member instanceof Window && isWindowManager(this.parent)) {
      this.parent.canvas.dispatchEvent(new CustomEvent("mingdewindowadd", {
        detail: {
          id: member.id,
          title: member.title,
        },
      }));
    }
    if (isWindowLike(member) && coords) { //the `&& coords` is implied and guaranteed if isWindowLike, but whatever
      let self_layer = this; //is this needed? makes it more clear at least
      this._secrets[member.id] = gen_secret();
      this._coords[member.id] = [coords[0] * SCALE, coords[1] * SCALE];
      member.set_secret(this._secrets[member.id]);
      member.send_request = (request: WindowRequest, data: WindowRequestValue, secret?: string) => {
        data.id = member.id;
        data.layer_name = self_layer.layer_name;
        if (secret === self_layer._secrets[member.id]) {
          data.trusted = true;
        } else {
          data.trusted = false;
        }
        if (isWindowManager(self_layer.parent)) {
          self_layer.parent.handle_request(request, data);
        }
      };
    }
    this._members.push(member);
  }
  remove_member(id: string) {
    delete this._secrets[id];
    delete this._coords[id];
    let member = this._members.find((member) => member.id === id);
    this._members = this._members.filter((member) => member.id !== id);
    if (isWindow(member) && member instanceof Window && isWindowManager(this.parent)) {
      this.parent.canvas.dispatchEvent(new CustomEvent("mingdewindowremove", {
        detail: {
          id: member.id,
          title: member.title,
        },
      }));
    }
    return member; //return removed member
  }
  // Move a member to the end of the array, so it gets displayed on "top" of the layer
  move_member_top(id: string) {
    this._members.sort((a, b) => {
      if (a.id === id) {
        //a after b
        return 1;
      } else if (b.id === id) {
        //b after a
        return -1;
      } else {
        return 0;
      }
    });
  }
  change_member_coords(id: string, coords: [number, number]) {
    this._coords[id] = coords;
  }
}

export type WindowTuple = [WindowLike<any | WindowMessage>, [number, number]];

export class WindowManager implements Canvas<WindowMessage, WindowLike<any>> {
  readonly type = "window-manager";
  id = "_window-manager"; //special id, shouldn't really have a use

  private total_renders: number; //count of the total amount of renders done

  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  size: [number, number];
  layers: Layer<WindowLike<any | WindowMessage>>[]; //should be private
  focused_id: string | undefined;
  theme: Themes;
  options: WindowOptions;
  render_stop: boolean;
  registry: Registry;

  constructor(parent_id: string = "", registry: Registry, render_stop: boolean = false, theme: Themes = Themes.Standard) {
    this.total_renders = 0;
    this.size = [document.body.clientWidth * SCALE, document.body.clientHeight * SCALE];
    this.layers = [];
    this.theme = theme;
    this.options = {
      //default desktop background
      desktop_background_info: [DesktopBackgroundTypes.Solid, "#008080"],
      time: get_time(),
    };
    this.registry = registry;
    this.canvas = document.createElement("CANVAS") as HTMLCanvasElement;
    this.canvas.width = this.size[0];
    this.canvas.height = this.size[1];
    this.canvas.tabIndex = 1;
    if (parent_id) {
      document.getElementById(parent_id)!.appendChild(this.canvas);
    }
    this.context = this.canvas.getContext("2d", {
      alpha: false,
    });
    this.context.imageSmoothingEnabled = false;
    this.render_stop = render_stop;
    //set up event listeners that dispatch messages
    this.canvas.addEventListener("keydown", (event: KeyboardEvent) => {
      this.handle_message(WindowMessage.KeyDown, event);
      if (CONFIG.OVERRIDE_BROWSER_SHORTCUTS) {
        //only override if it is actually a shortcut key
        if (Object.values(SHORTCUTS).flat().includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
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
    this.canvas.addEventListener("mouseleave", (_event: MouseEvent) => {
      this.handle_message(WindowMessage.MouseLeave, true);
    });
    this.canvas.addEventListener("wheel", (event: WheelEvent) => {
      this.handle_message(WindowMessage.Wheel, event);
    });
    this.canvas.addEventListener("contextmenu", (event: MouseEvent) => {
      this.handle_message(WindowMessage.ContextMenu, event);
    });
    window.addEventListener("resize", (_event: UIEvent) => {
      this.handle_message(WindowMessage.Resize, [document.body.clientWidth * SCALE, document.body.clientHeight * SCALE]);
    });
    this.canvas.addEventListener("mingdewindowadd", (event: WindowChangeEvent) => {
      this.handle_message(WindowMessage.WindowAdd, event);
    });
    this.canvas.addEventListener("mingdewindowremove", (event: WindowChangeEvent) => {
      this.handle_message(WindowMessage.WindowRemove, event);
    });
    //
    //first render
    this.render();
  }
  get windows(): WindowTuple[] {
    return this.layers.filter((layer) => !layer.hide).map((layer) => layer.members.map((member) => [member, layer.coords[member.id]] as WindowTuple)).flat();
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
    if (this.render_stop) return;
    this.total_renders++;
    if (CONFIG.LOGS.RERENDERS) {
      console.log("Rerendering window manager", this.total_renders);
    }
    this.render_view(this.theme);
  }
  render_view(theme: Themes) {
    this.clear();
    //update time
    this.options.time = get_time();
    //copied in case windows get deleted
    const windows = this.windows; //.slice()
    for (let i = 0; i < windows.length; i++) {
      let w = windows[i][0];
      let wco = windows[i][1];
      w.render_view_window(theme, this.options);
      this.context.drawImage(w.canvas, wco[0], wco[1], w.size[0], w.size[1]);
    }
  }
  handle_message<T extends WindowMessage>(message: T, data: WindowMessageValues[T]) {
    let window_rerendered: boolean; //this var is a mess
    if ((message === WindowMessage.MouseMove || message === WindowMessage.MouseDown || message === WindowMessage.MouseUp || message === WindowMessage.ContextMenu) && isMouseEvent(data)) {
      //correct coords, create new event
      //(we can use clientX here instead of offsetX because canvas is guaranteed to be entire page)
      const mod = new MouseEvent(data.type, {
        clientX: data.clientX * SCALE,
        clientY: data.clientY * SCALE,
        buttons: create_me_buttons((this.canvas.style.cursor || "default") as CursorType),
      });
      let target: [WindowLike<any>, [number, number]] | undefined = this.windows.reverse().find(([member, coords]) => {
        return mod.clientX > coords[0] && mod.clientY > coords[1] && mod.clientX < (coords[0] + member.size[0]) && mod.clientY < (coords[1] + member.size[1]);
      });
      let target_window: WindowLike<any> | undefined = target?.[0];
      let target_coords: [number, number] | undefined = target?.[1];
      if (this.canvas.style.cursor !== CursorType.Default && message === WindowMessage.MouseMove) {
        //yes, mouse move outside needs the coords for window resizing and moving
        const mod_screen_only = new MouseEvent("mousemove", {
          screenX: mod.clientX,
          screenY: mod.clientY,
          buttons: mod.buttons,
        });
        window_rerendered = this.windows.filter(([member, _coords]) => member.id !== target_window?.id).some(([member, _coords]) => {
          //may require a rerender, because of window size changes
          //MouseMoveOutside is not given to the normal/arbitrary message handler,
          //so we can reasonably say that it will only be used for window size changes
          return member.handle_message_window(WindowMessage.MouseMoveOutside, mod_screen_only);
        });
      } else if (this.canvas.style.cursor !== CursorType.Default && message === WindowMessage.MouseUp) {
        window_rerendered = this.windows.filter(([member, _coords]) => member.id !== target_window?.id).map(([member, _coords]) => {
          //this is for mousedown outside, rerender may be needed 
          return member.handle_message_window(WindowMessage.MouseUpOutside, true);
        }).some((bool: boolean) => bool);
      }
      //`target_coords` is implied to exist if `target_window` is implied to exist, but we need to tell the compiler that
      if (!target_window || !target_coords) return;
      let focus_changed: boolean = false;
      if (message === WindowMessage.MouseDown && this.focused_id !== target_window.id) {
        focus_changed = true;
        //change focused, notify taskbar
        this.focused_id = target_window.id;
        this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.Taskbar).forEach(([member, _coords]) => {
          member.handle_message_window(TaskbarMessageStandard.WindowFocusChange, this.focused_id);
        });
        //bring that window to the front
        this.layers.find((layer) => layer.members.find((member) => member.id === target_window.id)).move_member_top(target_window.id);
        window_rerendered = true;
      }
      //correct coords again, so the coords are relative to windowlike top left
      const mod_again = new MouseEvent(data.type, {
        screenX: mod.clientX,
        screenY: mod.clientY,
        clientX: mod.clientX - target_coords[0],
        clientY: mod.clientY - target_coords[1],
        buttons: mod.buttons,
        //button: this.focused_id === target_window.id ? 1 : 0, //send button as 1 if mouseevent window is focused, 0 otherwise
      });
      //snapshot whether a start menu existed before (we will assume that max of one start menu, ever)
      let start_exist_before: boolean = this.windows.some(([member, _coords]) => member.sub_type === WindowLikeType.StartMenu);
      //if window doesn't rerender, no need to rerender window manager, ofc
      //if window rerendered is already true, don't change it to false
      let window_rerendered_actual = target_window.handle_message_window(message, mod_again); //has to be done this way since || is lazy
      //check if exist after
      let start_exist_after: boolean = this.windows.some(([member, _coords]) => member.sub_type === WindowLikeType.StartMenu);
      let start_is_new: boolean = !start_exist_before && start_exist_after;
      //we want to send MouseDownOutside to start menus after the click event is sent
      if (focus_changed && !start_is_new) {
        //send MouseDownOutside to any start menus
        this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.StartMenu).forEach(([member, _coords]) => {
          member.handle_message_window(StartMenuMessageStandard.MouseDownOutside, true);
        });
      }
      window_rerendered = window_rerendered || window_rerendered_actual;
    } else if (message === WindowMessage.KeyDown && isKeyboardEvent(data)) {
      //check if it is start menu shortcut, if so, send to taskbar to open (or start menu to close)
      if (data.altKey && SHORTCUTS["start-menu"].includes(data.key)) {
        window_rerendered = this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.Taskbar).some(([member, _coords]) => {
          return member.handle_message_window(TaskbarMessageStandard.StartMenuOpen, true);
        });
        if (!window_rerendered) {
          //probably means start menu is already open, close it
          this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.StartMenu).forEach(([member, _coords]) => {
            member.handle_message_window(StartMenuMessageStandard.StartMenuClose, true);
          });
          this.focused_id = undefined;
        }
      } else if (data.altKey && key_is_switch_focus_shortcut(data.key)) {
        //send to taskbars
        window_rerendered = this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.Taskbar).some(([member, _coords]) => {
          member.handle_message_window(TaskbarMessageStandard.SwitchFocus, get_switch_key_index(data.key));
        });
      } else if (this.focused_id) {
        //send to focused window
        window_rerendered = this.windows.reverse().find(([member, _coords]) => {
          return member.id === this.focused_id;
        })![0].handle_message_window(message, data);
      } else {
        return;
      }
    } else if (message === WindowMessage.Wheel) {
      //send to focused window
      if (this.focused_id) {
        window_rerendered = this.windows.reverse().find(([member, _coords]) => {
          return member.id === this.focused_id;
        })![0].handle_message_window(message, data);
      } else {
        return;
      }
    } else if (message === WindowMessage.MouseLeave) {
      this.windows.forEach(([member, _coords]) => {
        member.handle_message_window(WindowMessage.MouseLeave, true);
      });
      window_rerendered = false;
    } else if (message === WindowMessage.Resize && isCoords(data)) {
      //resize canvas
      this.size = data;
      this.canvas.width = this.size[0];
      this.canvas.height = this.size[1];
      this.windows.forEach(([member, _coords]) => member.handle_message_window(message, data));
      window_rerendered = true;
    } else if (message === WindowMessage.WindowAdd && isWindowChangeEvent(data)) {
      this.focused_id = data.detail.id;
      this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.Taskbar).forEach(([member, _coords]) => {
        member.handle_message_window(WindowMessage.WindowAdd, data);
        member.handle_message_window(TaskbarMessageStandard.WindowFocusChange, this.focused_id);
      });
      window_rerendered = true;
    } else if (message === WindowMessage.WindowRemove && isWindowChangeEvent(data)) {
      //if focused window closes
      if (this.focused_id === data.detail.id) {
        let remaining = this.windows.filter(([member, _coords]) => isWindow(member)).reverse();
        if (remaining.length > 0) {
          this.focused_id = remaining[0][0].id;
        } else {
          this.focused_id = undefined;
        }
      }
      this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.Taskbar).forEach(([member, _coords]) => {
        member.handle_message_window(WindowMessage.WindowRemove, data);
        member.handle_message_window(TaskbarMessageStandard.WindowFocusChange, this.focused_id);
      });
      window_rerendered = true;
    }
    //so `window_rerendered = undefined` doesn't trigger this
    if (window_rerendered === false) return;
    //WindowMessage.Resize just skips straight here
    //`return` before this if don't want to rerender
    this.render();
  }
  handle_request<T extends WindowRequest>(request: T, data: WindowRequestValues[T]) {
    if (!data.layer_name || !data.id) return;
    if (CONFIG.DEBUG.REQUESTS) {
      console.debug(request, data, request === WindowRequest.ChangeTheme);
    }
    if (request === WindowRequest.CloseWindow) {
      //only lets window close itself, so we don't really care if trusted
      let removed_member = this.layers.find((layer) => layer.layer_name === data.layer_name).remove_member(data.id);
      //should always be not undefined, but just in case... `?.` 
      if (removed_member?.sub_type === WindowLikeType.StartMenu) {
        //send start menu close message to taskbar
        this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.Taskbar).forEach(([member, _coords]) => {
          member.handle_message_window(TaskbarMessageStandard.StartMenuClosed, true);
        });
      }
    } else if (request === WindowRequest.ChangeCursor && data.trusted && isChangeCursorValue(data)) {
      if (this.canvas.style.cursor === data.new_cursor) return;
      this.canvas.style.cursor = data.new_cursor;
      //should not need to rerender
      return;
    } else if (request === WindowRequest.ChangeCoords && data.trusted && isChangeCoordsValue(data)) {
      let window_parent = this.layers.find((layer) => layer.layer_name === data.layer_name);
      if (!window_parent) return console.error("Error (this is bad, should not happen)! `window_parent` is undefined in ChangeCoords request!"); //should never happen
      let current_coords: [number, number] = window_parent.coords[data.id];
      let request_window = window_parent.get_member_by_id(data.id);
      if (!request_window) return console.error("Error (this is bad, should not happen)! `request_window` is undefined in ChangeCoords request!"); //should never happen
      if (data.stick_bottom) {
        data.delta_coords[1] = document.body.clientHeight * SCALE - request_window.size[1] - current_coords[1];
      }
      if (data.stick_right) {
        data.delta_coords[0] = document.body.clientWidth * SCALE - request_window.size[0] - current_coords[0];
      }
      //if coords unchanged, no need to change anything ofc
      if (data.delta_coords[0] === 0 && data.delta_coords[1] === 0) return;
      //windows cannot be dragged off the screen
      const new_coords: [number, number] = [current_coords[0] + data.delta_coords[0], current_coords[1] + data.delta_coords[1]];
      if (isWindow(request_window) && (new_coords[0] < -request_window.size[0] + 25 * SCALE || new_coords[0] > this.size[0] - 25 * SCALE || new_coords[1] < 0 || new_coords[1] > this.size[1] - TASKBAR_HEIGHT - WINDOW_TOP_HEIGHT)) return;
      window_parent.change_member_coords(data.id, new_coords);
    } else if (request === WindowRequest.FocusWindow && data.trusted && isFocusWindowValue(data)) {
      this.focused_id = data.new_focus;
      this.layers.find((layer) => layer.members.find((member) => member.id === data.new_focus)).move_member_top(data.new_focus);
      this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.Taskbar).forEach(([member, _coords]) => {
        member.handle_message_window(TaskbarMessageStandard.WindowFocusChange, this.focused_id);
      });
    } else if (request === WindowRequest.OpenWindow && data.trusted && isOpenWindowValue(data)) {
      //todo: permission system
      let r_info = this.registry[data.name];
      if (r_info) {
        if (data.open_layer_name === "") {
          data.open_layer_name = data.layer_name; //same layer as request sender then, if blank
        }
        let found_layer = this.layers.find((layer) => layer.layer_name === data.open_layer_name);
        if (found_layer) {
          if (data.unique) {
            let found_same_instance = found_layer.members.find((member) => member instanceof r_info[0]);
            if (found_same_instance) return;
          }
          let member;
          try {
            if (r_info[1].length === 0 && data.args) {
              member = new (r_info[0])(...data.args);
            } else {
              member = new (r_info[0])(...r_info[1]);
            }
          } catch (e) {
            console.error(e);
            return;
          }
          let start_coords: [number, number] = [(this.size[0] - member.size[0]) / SCALE / 2 - random_int(-40, 40), (this.size[1] - member.size[1]) / SCALE / 2 - random_int(-40, 40)]; //the center-ish
          if (data.coords_offset) {
            let found_opener: [number, number] = found_layer.coords[data.id];
            start_coords = [found_opener[0] / SCALE + data.coords_offset[0], found_opener[1] / SCALE + data.coords_offset[1]];
            if (data.sub_size_x) {
              start_coords[1] -= member.size[0] / SCALE;
            }
            if (data.sub_size_y) {
              start_coords[1] -= member.size[1] / SCALE;
            }
          }
          found_layer.add_member(member, start_coords);
          if (!isWindow(member)) {
            //if the new member is a window, then the focus will change in some other part of the code
            //(add_member will send a message)
            //but if not a member, we need to change the focus here
            this.focused_id = member.id; //add_member also adds the id
          } else {
            //so start menu closes once window is opened (if start menu is open)
            this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.StartMenu).forEach(([member, _coords]) => {
              member.handle_message_window(StartMenuMessageStandard.MouseDownOutside, true);
            });
          }
        }
      } else {
        return;
      }
    } else if (request === WindowRequest.ChangeTheme && isChangeThemeValue(data) && data.id === this.focused_id) {
      if (this.theme === data.new_theme) return;
      //permission system?
      //
      this.theme = data.new_theme;
      this.windows.forEach(([member, _coords]) => member.handle_message_window(WindowMessage.ChangeTheme, data.new_theme));
    } else {
      return;
    }
    this.render();
  }
}
