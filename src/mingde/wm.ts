import { DesktopBackgroundInfo, DesktopBackgroundTypes, Themes, THEME_INFOS } from './themes.js';
import { isCoords, isChangeCursorValue, isChangeCoordsValue, isMouseEvent, isThemes, isWindow, isWindowLike, isWindowManager } from './guards.js';
import { CONFIG, WINDOW_TOP_HEIGHT, SCALE, FONT_SIZES } from './constants.js';
import { WindowRequest, WindowRequestValue, WindowRequestValues, CursorType } from './requests.js';
import { gen_secret } from './utils.js';

import { Button } from './components/button.js';
import { TextLine } from './components/text_line.js';

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
  clickable: boolean;
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
  MouseMoveOutside = "MouseMoveOutside", //give mouse movements outside the windowlikes without coords data
  MouseUpOutside = "MouseUpOutside",
}

export interface WindowMessageValues {
  [WindowMessage.KeyDown]: KeyboardEvent,
  [WindowMessage.MouseMove]: MouseEvent,
  [WindowMessage.MouseDown]: MouseEvent,
  [WindowMessage.MouseUp]: MouseEvent,
  [WindowMessage.ContextMenu]: MouseEvent,
  [WindowMessage.Wheel]: WheelEvent,
  [WindowMessage.Resize]: [number, number],
  [WindowMessage.ChangeTheme]: Themes,
  [WindowMessage.MouseMoveOutside]: MouseEvent,
  [WindowMessage.MouseUpOutside]: boolean,
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
  readonly set_secret: (secret: string) => void;
  do_rerender: boolean; //if false, even if windowmanager renders everyone, do not redraw canvas (performance improvement, not currently enforced)
  layers: Layer<Component<any>>[];
  handle_message(message: MessageType, data: any): void;
  send_request: <T extends WindowRequest>(request: T, data: WindowRequestValues[T], secret: string) => void;
}

export class Window implements WindowLike<any | WindowMessage> {
  readonly type: string = "window-like";
  readonly sub_type: WindowLikeType = WindowLikeType.Window;

  id: string;
  readonly render_view_window: (theme: Themes) => void;
  readonly handle_message_window: (message: any | WindowMessage, data: any) => boolean;
  readonly set_secret: (secret: string) => void;
  readonly top_components: Component<any | WindowMessage>[];

  private secret: string;
  private move_mode: boolean;
  private move_hover: boolean;
  private move_coords: [number, number];

  size: [number, number];
  coords: [number, number];
  title: string;

  do_rerender: boolean;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  layers: Layer<Component<any>>[];

  send_request: <T extends WindowRequest>(request: T, data: WindowRequestValues[T], secret: string) => void;

  constructor(size: [number, number], title: string) {
    this.size = [size[0] * SCALE, size[1] * SCALE];
    this.title = title;
    this.move_mode = false;
    this.move_hover = false;
    //set to true for first render
    this.do_rerender = true;
    this.canvas = document.createElement("CANVAS") as HTMLCanvasElement;
    this.canvas.width = this.size[0];
    this.canvas.height = this.size[1];
    this.context = this.canvas.getContext("2d");
    this.layers = [];
    //this is a placeholder, layer should insert one in or something idk, slightly weird, I know
    this.send_request = <T extends WindowRequest>(_request: T, _data: WindowRequestValues[T], _secret: string) => void 0;
    //again, probably not needed
    let self = this;
    //layer can set secret, it can only be set once
    this.set_secret = (secret: string) => {
      if (self.secret) return;
      self.secret = secret;
    };
    //Window top bar components, currently window title and close button
    this.top_components = [
      new Button<any | WindowMessage>(this, "x", [this.size[0] / SCALE - 4 - 17, WINDOW_TOP_HEIGHT / SCALE - 4 - 17], 17, 2.5, () => {
        self.send_request(WindowRequest.CloseWindow, {}, this.secret);
      }),
      new TextLine<any | WindowMessage>(this, this.title, [4, WINDOW_TOP_HEIGHT / SCALE - (WINDOW_TOP_HEIGHT - FONT_SIZES["TOP"]) / SCALE / 2], "text_top", "TOP", this.size[0] - 17 * SCALE),
    ];
    //intercept requests, so top bar close button, dragging, etc, can't be overriden
    this.handle_message_window = (message: WindowMessage, data: any) => {
      let propogate_down = true;
      if (message === WindowMessage.MouseDown) {
        if (isMouseEvent(data)) {
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
          }
        }
      } else if (message === WindowMessage.MouseMove) {
        if (isMouseEvent(data)) {
          if (data.clientY < WINDOW_TOP_HEIGHT) {
            propogate_down = false;
            let clickable_found = this.top_components.filter((c) => {
              return data.clientX > c.coords[0] && data.offsetY > c.coords[1] && data.clientX < c.coords[0] + c.size[0] && data.clientY < c.coords[1] + c.size[1];
            }).some((c) => c.clickable);
            if (!clickable_found) {
              //no need to send more requests if already correct cursor
              if (!this.move_hover) {
                this.move_hover = true;
                this.send_request(WindowRequest.ChangeCursor, {
                  new_cursor: CursorType.Move,
                }, this.secret);
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
          }
          if (this.move_mode) {
            this.send_request(WindowRequest.ChangeCoords, {
              delta_coords: [data.screenX - this.move_coords[0], data.screenY - this.move_coords[1]],
            }, this.secret);
            this.move_coords = [data.screenX, data.screenY];
          }
        }
      } else if (message === WindowMessage.MouseUp) {
        if (this.move_mode) {
          this.move_mode = false;
          if (data.clientY >= WINDOW_TOP_HEIGHT) {
            this.send_request(WindowRequest.ChangeCursor, {
              new_cursor: CursorType.Default,
            }, this.secret);
          }
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
        }
      } else if (message === WindowMessage.MouseUpOutside) {
        if (this.move_mode) {
          this.move_mode = false;
          this.send_request(WindowRequest.ChangeCursor, {
            new_cursor: CursorType.Default,
          }, this.secret);
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
  handle_message(_message: WindowMessage, _data: any): boolean {
    //also meant to be overriden, I think
    return this.do_rerender;
  }
}

export type Member = Component<any> | WindowLike<any>;

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
  add_member(member: MemberType, coords: [number, number]) {
    //yeah, both isWindow and instanceof are needed
    if (this.windows_only && !(isWindow(member) && member instanceof Window)) {
      return;
    }
    this.member_num++;
    member.id = `${this.layer_name}-${this.member_num}-${member.type}`;
    if (isWindowLike(member)) {
      let self = this; //probably not needed? makes it more clear at least
      this._secrets[member.id] = gen_secret();
      this._coords[member.id] = [coords[0] * SCALE, coords[1] * SCALE];
      member.set_secret(this._secrets[member.id]);
      member.send_request = (request: WindowRequest, data: WindowRequestValue, secret: string) => {
        data.id = member.id;
        data.layer_name = self.layer_name;
        if (secret === self._secrets[member.id]) {
          data.trusted = true;
        } else {
          data.trusted = false;
        }
        if (isWindowManager(self.parent)) {
          self.parent.handle_request(request, data);
        }
      };
    }
    this._members.push(member);
  }
  remove_member(id: string) {
    delete this._secrets[id];
    delete this._coords[id];
    this._members = this._members.filter((member) => member.id !== id);
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
    window.addEventListener("resize", (_event: UIEvent) => {
      this.handle_message(WindowMessage.Resize, [document.body.clientWidth * SCALE, document.body.clientHeight * SCALE]);
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
      let w = windows[i][0];
      let wco = windows[i][1];
      w.render_view_window(theme, this.options);
      this.context.drawImage(w.canvas, wco[0], wco[1], w.size[0], w.size[1]);
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
      let target: [WindowLike<any>, [number, number]] | undefined = this.windows.reverse().find(([member, coords]) => {
        return mod.clientX > coords[0] && mod.clientY > coords[1] && mod.clientX < (coords[0] + member.size[0]) && mod.clientY < (coords[1] + member.size[1]);
      });
      let target_window: WindowLike<any> | undefined = target?.[0];
      let target_coords: [number, number] | undefined = target?.[1];
      if (this.canvas.style.cursor !== CursorType.Default && message === WindowMessage.MouseMove) {
        const mod_screen_only = new MouseEvent("mousemove", {
          screenX: mod.clientX,
          screenY: mod.clientY,
        });
        this.windows.filter(([member, _coords]) => member.id !== target_window?.id).forEach(([member, _coords]) => {
          //this is just for mousemove outside, we can guarantee they will only change mouse cursor state, and not require a rerender
          member.handle_message_window(WindowMessage.MouseMoveOutside, mod_screen_only);
        });
      } else if (this.canvas.style.cursor !== CursorType.Default && message === WindowMessage.MouseUp) {
        window_rerendered = this.windows.filter(([member, _coords]) => member.id !== target_window?.id).map(([member, _coords]) => {
          //this is for mousedown outside, rerender may be needed 
          return member.handle_message_window(WindowMessage.MouseUpOutside, true);
        }).some((bool: boolean) => bool);
      }
      if (!target_window) return;
      if (message === WindowMessage.MouseDown && this.focused_id !== target_window.id) {
        //bring that window to the front
        this.focused_id = target_window.id;
        this.layers.find((layer) => layer.members.find((member) => member.id === target_window.id)).move_member_top(target_window.id);
        window_rerendered = true;
      }
      //correct coords again, so the coords are relative to windowlike top left
      const mod_again = new MouseEvent(data.type, {
        screenX: mod.clientX,
        screenY: mod.clientY,
        clientX: mod.clientX - target_coords[0],
        clientY: mod.clientY - target_coords[1],
      });
      //if window doesn't rerender, no need to rerender window manager, ofc
      //if window rerendered is already true, don't change it to false
      let window_rerendered_actual = target_window.handle_message_window(message, mod_again); //has to be done this way since || is lazy 
      window_rerendered = window_rerendered || window_rerendered_actual; 
    } else if (message === WindowMessage.KeyDown) {
      //send to focused window
      if (this.focused_id) {
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
    } else if (message === WindowMessage.ChangeTheme && isThemes(data)) {
      if (this.theme === data) return;
      this.theme = data;
      this.windows.forEach(([member, _coords]) => member.handle_message_window(message, data));
    } else if (message === WindowMessage.Resize && isCoords(data)) {
      //resize canvas
      this.size = data;
      this.canvas.width = this.size[0];
      this.canvas.height = this.size[1];
      this.windows.forEach(([member, _coords]) => member.handle_message_window(message, data));
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
    if (CONFIG.DEBUG) {
      console.log(request, data);
    }
    if (request === WindowRequest.CloseWindow) {
      //only lets window close itself, so we don't really care if trusted
      this.layers.find((layer) => layer.layer_name === data.layer_name).remove_member(data.id);
    } else if (request === WindowRequest.ChangeCursor && data.trusted && isChangeCursorValue(data)) {
      if (this.canvas.style.cursor === data.new_cursor) return;
      this.canvas.style.cursor = data.new_cursor;
      //should not need to rerender
      return;
    } else if (request === WindowRequest.ChangeCoords && data.trusted && isChangeCoordsValue(data)) {
      let window_parent = this.layers.find((layer) => layer.layer_name === data.layer_name);
      let current_coords: [number, number] = window_parent.coords[data.id];
      //if coords unchanged, no need to change anything ofc
      if (data.delta_coords[0] === 0 && data.delta_coords[1] === 0) return;
      window_parent.change_member_coords(data.id, [current_coords[0] + data.delta_coords[0], current_coords[1] + data.delta_coords[1]]);
    } else {
      return;
    }
    this.render();
  }
}
