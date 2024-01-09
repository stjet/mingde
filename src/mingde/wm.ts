import { DesktopBackgroundValue, Themes, THEME_INFOS } from './themes.js';
import { isCoords, isOpenWindowValue, isChangeCursorValue, isChangeCoordsValue, isFocusWindowValue, isChangeThemeValue, isChangeSettingsValue, isChangeDesktopBackgroundValue, isMouseEvent, isKeyboardEvent, isWindowChangeEvent, isReadFileSystemValue, isWriteFileSystemValue, isRemoveFileSystemValue, isWindow, isWindowLike, isWindowManager, isFocusableComponent, isHexColor } from './guards.js';
import { WINDOW_MIN_DIMENSIONS, WINDOW_DEFAULT_DIMENSIONS, CONFIG, WINDOW_TOP_HEIGHT, TASKBAR_HEIGHT, SCALE, FONT_SIZES, RESIZE_STEP } from './constants.js';
import { SHORTCUTS, WindowManagerSettings, GenericShortcut } from './mutables.js';
import { WindowRequest, WindowRequestValue, WindowRequestValues, CursorType } from './requests.js';
import { gen_secret, get_time, create_me_buttons, interpret_me_buttons, random_int, key_is_switch_focus_shortcut, get_switch_key_index, image_to_data_url, DesktopTime } from './utils.js';
import { storage_write, storage_get, snapshot_hash, SystemSnapshot } from './storage.js';
import type { Registry, Permissions, Permission } from './registry.js';
import { FileSystemObject } from './fs.js';

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
  WindowResize = "WindowResize",
  SettingsChange = "SettingsChange", //change of window manager settings, only sent to select windows. Don't confuse WindowRequest.ChangeSettings with this
  GenericShortcut = "GenericShortcut", //generic shortcut like up or down sent to windows
}

export enum TaskbarMessageStandard {
  WindowFocusChange = "WindowFocusChange", //data is string id
  StartMenuOpen = "StartMenuOpen", //data is boolean, doesn't matter
  StartMenuClosed = "StartMenuClosed", //data is boolean, doesn't matter
  SwitchFocus = "SwitchFocus", //data is index (number) of window to switch to
  FocusCycleLeft = "FocusCycleLeft", //data is boolean, doesn't matter
  FocusCycleRight = "FocusCycleRight", //data is boolean, doesn't matter
}

export enum StartMenuMessageStandard {
  MouseDownOutside = "MouseDownOutside", //data is just boolean, doesn't matter
  StartMenuClose = "StartMenuClose",
}

export enum DesktopBackgroundMessageStandard {
  ChangeBackground = "ChangeBackground",
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
  render_view(theme: Themes, context?: CanvasRenderingContext2D): void; //draws to the canvas
  clickable: boolean;
}

//button, text input, checkbox, any user input should implement this
//eventually, use this so input can be done without mouse
//eg, focused text input allows input, focused button or checkbox allows click with Enter
export interface FocusableComponent<MessageType> extends Component<MessageType> {
  focused: boolean;
  focus(): boolean;
  unfocus(): boolean;
}

export type Member = Component<any> | WindowLike<any>;

export interface MemberArg<MemberType extends Member> {
  member: MemberType,
  coords?: [number, number];
}

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
  [WindowMessage.KeyDown]: KeyboardEvent;
  [WindowMessage.MouseMove]: MouseEvent;
  [WindowMessage.MouseDown]: MouseEvent;
  [WindowMessage.MouseUp]: MouseEvent;
  [WindowMessage.MouseLeave]: boolean;
  [WindowMessage.ContextMenu]: MouseEvent;
  [WindowMessage.Wheel]: WheelEvent;
  [WindowMessage.Resize]: [number, number];
  [WindowMessage.ChangeTheme]: Themes;
  [WindowMessage.MouseMoveOutside]: MouseEvent;
  [WindowMessage.MouseUpOutside]: boolean;
  [WindowMessage.WindowAdd]: WindowChangeEvent;
  [WindowMessage.WindowRemove]: WindowChangeEvent;
  [WindowMessage.WindowResize]: [number, number];
  [WindowMessage.SettingsChange]: boolean; //can ignore
  [WindowMessage.GenericShortcut]: GenericShortcut;
}

export enum WindowLikeType {
  Window,
  DesktopBackground,
  Taskbar,
  StartMenu,
}

export interface WindowOptions {
  desktop_background: DesktopBackgroundValue;
  time: DesktopTime;
  settings: WindowManagerSettings;
}

export interface WindowLike<MessageType> extends Canvas<WindowMessage, Component<any>> {
  readonly sub_type: WindowLikeType;
  readonly render_view_window: (theme: Themes, options?: WindowOptions) => void;
  readonly handle_message_window: (message: MessageType | WindowMessage, data: any) => boolean;
  readonly set_secret: (secret: string) => void;
  do_rerender: boolean; //if false, even if windowmanager renders everyone, do not redraw canvas (performance improvement, not currently enforced)
  layers: Layer<Component<any>>[];
  handle_message(message: MessageType | WindowMessage, data: any): void;
  send_request: <T extends WindowRequest>(request: T, data: WindowRequestValues[T], secret?: string) => any;
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
  private create_top_components: () => Component<MessageType | WindowMessage>[];
  cached_settings: WindowManagerSettings;

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

  send_request: <T extends WindowRequest>(request: T, data: WindowRequestValues[T], secret?: string) => any;

  constructor(size: [number, number], title: string, window_type: string = "", resizable: boolean = true) {
    this.size = [size[0] * SCALE, size[1] * SCALE];
    this.title = title;
    this.window_type = window_type;
    this.move_mode = false;
    this.move_hover = false;
    this.wresize_mode = false;
    this.wresize_hover = false;
    this.hresize_mode = false;
    this.hresize_hover = false;
    this.resizable = resizable;
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
    this.create_top_components = (): Component<MessageType | WindowMessage>[] => {
      return [
        new Button<MessageType | WindowMessage>(this, "x", [this.size[0] / SCALE - 4 - 17, WINDOW_TOP_HEIGHT / SCALE - 4 - 17], 17, 1, () => {
          this.send_request(WindowRequest.CloseWindow, {}); //, this.secret);
        }),
        new TextLine<MessageType | WindowMessage>(this, this.title, [4, WINDOW_TOP_HEIGHT / SCALE - (WINDOW_TOP_HEIGHT - FONT_SIZES.TOP) / SCALE / 2], "text_top", "TOP", this.size[0] / SCALE - 17 - 6, true),
      ];
    }
    //Window top bar components, currently window title and close button
    this.top_components = this.create_top_components();
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
          this.top_components = this.create_top_components();
          //tell extending class that resize happened
          this.handle_message(WindowMessage.WindowResize, this.size);
          this.do_rerender = true;
        } else if (this.hresize_mode) {
          this.size[1] = this.hresize_info[1] + (data.screenY - this.hresize_info[0]);
          if (this.size[1] < WINDOW_MIN_DIMENSIONS[1]) {
            this.size[1] = WINDOW_MIN_DIMENSIONS[1];
          }
          this.canvas.height = this.size[1];
          //tell extending class that resize happened
          this.handle_message(WindowMessage.WindowResize, this.size);
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
          //since horizontal width modified, need to recreate top components
          //(unnecessary if only vertical height change)
          this.top_components = this.create_top_components();
          //tell extending class that resize happened
          this.handle_message(WindowMessage.WindowResize, this.size);
          this.do_rerender = true;
        } else if (this.hresize_mode) {
          this.size[1] = this.hresize_info[1] + (data.screenY - this.hresize_info[0]);
          if (this.size[1] < WINDOW_MIN_DIMENSIONS[1]) {
            this.size[1] = WINDOW_MIN_DIMENSIONS[1];
          }
          this.canvas.height = this.size[1];
          //tell extending class that resize happened
          this.handle_message(WindowMessage.WindowResize, this.size);
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
          if (this.cached_settings?.shortcuts) {
            //keyboard shortcuts
            //todo: the generic shortcuts can be condensed probably
            if (SHORTCUTS["close-window"].includes(data.key)) {
              //close window
              this.send_request(WindowRequest.CloseWindow, {}); //, this.secret);
            } else if (SHORTCUTS["fullscreen-toggle-window"].includes(data.key) && this.resizable) {
              this.send_request(WindowRequest.FullscreenToggleWindow, {}, this.secret);
              this.do_rerender = true;
            } else if (SHORTCUTS["up"].includes(data.key)) {
              this.handle_message(WindowMessage.GenericShortcut, "up");
            } else if (SHORTCUTS["down"].includes(data.key)) {
              this.handle_message(WindowMessage.GenericShortcut, "down");
            } else if (SHORTCUTS["left"].includes(data.key)) {
              this.handle_message(WindowMessage.GenericShortcut, "left");
            } else if (SHORTCUTS["right"].includes(data.key)) {
              this.handle_message(WindowMessage.GenericShortcut, "right");
            } else if (SHORTCUTS["cycle-focus-left"].includes(data.key)) {
              this.handle_message(WindowMessage.GenericShortcut, "cycle-focus-left");
            } else if (SHORTCUTS["cycle-focus-right"].includes(data.key)) {
              this.handle_message(WindowMessage.GenericShortcut, "cycle-focus-right");
            } else if (SHORTCUTS["cycle-focus-cancel"].includes(data.key)) {
              this.handle_message(WindowMessage.GenericShortcut, "cycle-focus-cancel");
            } else if (SHORTCUTS["move-window-left"].includes(data.key)) {
              this.send_request(WindowRequest.ChangeCoords, {
                delta_coords: [-15, 0],
              }, this.secret);
            } else if (SHORTCUTS["move-window-right"].includes(data.key)) {
              this.send_request(WindowRequest.ChangeCoords, {
                delta_coords: [15, 0],
              }, this.secret);
            } else if (SHORTCUTS["move-window-up"].includes(data.key)) {
              this.send_request(WindowRequest.ChangeCoords, {
                delta_coords: [0, -15],
              }, this.secret);
            } else if (SHORTCUTS["move-window-down"].includes(data.key)) {
              this.send_request(WindowRequest.ChangeCoords, {
                delta_coords: [0, 15],
              }, this.secret);
            } else if (SHORTCUTS["window-left-half"].includes(data.key) || SHORTCUTS["window-right-half"].includes(data.key)) {
              if (this.resizable) {
                //change size
                this.size[0] = document.body.clientWidth * SCALE / 2;
                this.do_rerender = true;
                if (this.size[0] < WINDOW_MIN_DIMENSIONS[0]) {
                  this.size[0] = WINDOW_MIN_DIMENSIONS[0];
                  this.do_rerender = false;
                }
                this.canvas.width = this.size[0];
                this.size[1] = document.body.clientHeight * SCALE - TASKBAR_HEIGHT;
                this.do_rerender = true;
                if (this.size[1] < WINDOW_MIN_DIMENSIONS[1]) {
                  this.size[1] = WINDOW_MIN_DIMENSIONS[1];
                  this.do_rerender = false;
                }
                this.canvas.height = this.size[1];
                //tell extending class that resize happened
                this.handle_message(WindowMessage.WindowResize, this.size);
                //top components need to be recreated since width changed
                this.top_components = this.create_top_components();
              }
              //change coords
              this.send_request(WindowRequest.ChangeCoords, {
                delta_coords: [0, 0], //dummy
                stick_left: SHORTCUTS["window-left-half"].includes(data.key),
                stick_right: SHORTCUTS["window-right-half"].includes(data.key),
                stick_top: true,
              }, this.secret);
            } else if (SHORTCUTS["window-top-half"].includes(data.key) || SHORTCUTS["window-bottom-half"].includes(data.key)) {
              if (this.resizable) {
                //change size
                this.size[0] = document.body.clientWidth * SCALE;
                this.do_rerender = true;
                if (this.size[0] < WINDOW_MIN_DIMENSIONS[0]) {
                  this.size[0] = WINDOW_MIN_DIMENSIONS[0];
                  this.do_rerender = false;
                }
                this.canvas.width = this.size[0];
                this.size[1] = (document.body.clientHeight * SCALE - TASKBAR_HEIGHT) / 2;
                this.do_rerender = true;
                if (this.size[1] < WINDOW_MIN_DIMENSIONS[1]) {
                  this.size[1] = WINDOW_MIN_DIMENSIONS[1];
                  this.do_rerender = false;
                }
                this.canvas.height = this.size[1];
                //tell extending class that resize happened
                this.handle_message(WindowMessage.WindowResize, this.size);
                //top components need to be recreated since width changed
                this.top_components = this.create_top_components();
              }
              //change coords
              this.send_request(WindowRequest.ChangeCoords, {
                delta_coords: [0, 0], //dummy
                stick_left: true,
                stick_top: SHORTCUTS["window-top-half"].includes(data.key),
                stick_bottom_taskbar_offset: SHORTCUTS["window-bottom-half"].includes(data.key),
              }, this.secret);
            } else if (SHORTCUTS["window-left-top-quad"].includes(data.key) || SHORTCUTS["window-left-bottom-quad"].includes(data.key) || SHORTCUTS["window-right-top-quad"].includes(data.key)|| SHORTCUTS["window-right-bottom-quad"].includes(data.key)) {
              if (this.resizable) {
                //change size
                this.size[0] = (document.body.clientWidth * SCALE) / 2;
                this.do_rerender = true;
                if (this.size[0] < WINDOW_MIN_DIMENSIONS[0]) {
                  this.size[0] = WINDOW_MIN_DIMENSIONS[0];
                  this.do_rerender = false;
                }
                this.canvas.width = this.size[0];
                this.size[1] = (document.body.clientHeight * SCALE - TASKBAR_HEIGHT) / 2;
                this.do_rerender = true;
                if (this.size[1] < WINDOW_MIN_DIMENSIONS[1]) {
                  this.size[1] = WINDOW_MIN_DIMENSIONS[1];
                  this.do_rerender = false;
                }
                this.canvas.height = this.size[1];
                //tell extending class that resize happened
                this.handle_message(WindowMessage.WindowResize, this.size);
                //top components need to be recreated since width changed
                this.top_components = this.create_top_components();
              }
              //change coords
              this.send_request(WindowRequest.ChangeCoords, {
                delta_coords: [0, 0], //dummy
                stick_left: SHORTCUTS["window-left-top-quad"].includes(data.key) || SHORTCUTS["window-left-bottom-quad"].includes(data.key),
                stick_right: SHORTCUTS["window-right-top-quad"].includes(data.key) || SHORTCUTS["window-right-bottom-quad"].includes(data.key),
                stick_top: SHORTCUTS["window-left-top-quad"].includes(data.key) || SHORTCUTS["window-right-top-quad"].includes(data.key),
                stick_bottom_taskbar_offset: SHORTCUTS["window-left-bottom-quad"].includes(data.key) || SHORTCUTS["window-right-bottom-quad"].includes(data.key),
              }, this.secret);
            } else if (this.resizable) {
              if (SHORTCUTS["window-shrink-x"].includes(data.key)) {
                this.size[0] -= RESIZE_STEP;
                this.do_rerender = true;
                if (this.size[0] < WINDOW_MIN_DIMENSIONS[0]) {
                  this.size[0] = WINDOW_MIN_DIMENSIONS[0];
                  this.do_rerender = false;
                }
                this.canvas.width = this.size[0];
                //tell extending class that resize happened
                this.handle_message(WindowMessage.WindowResize, this.size);
                //top components need to be recreated since width changed
                this.top_components = this.create_top_components();
              } else if (SHORTCUTS["window-grow-x"].includes(data.key)) {
                this.size[0] += RESIZE_STEP;
                this.do_rerender = true;
                //WM handles making sure dimensions don't go outside screen,
                //cuz windows dont have access to their coords
                this.canvas.width = this.size[0];
                //tell extending class that resize happened
                this.handle_message(WindowMessage.WindowResize, this.size);
                this.top_components = this.create_top_components();
              } else if (SHORTCUTS["window-shrink-y"].includes(data.key)) {
                this.size[1] -= RESIZE_STEP;
                this.do_rerender = true;
                if (this.size[1] < WINDOW_MIN_DIMENSIONS[1]) {
                  this.size[1] = WINDOW_MIN_DIMENSIONS[1];
                  this.do_rerender = false;
                }
                this.canvas.height = this.size[1];
                //tell extending class that resize happened
                this.handle_message(WindowMessage.WindowResize, this.size);
              } else if (SHORTCUTS["window-grow-y"].includes(data.key)) {
                this.size[1] += RESIZE_STEP;
                this.do_rerender = true;
                //WM handles making sure dimensions don't go outside screen,
                //cuz windows dont have access to their coords
                this.canvas.height = this.size[1];
                //tell extending class that resize happened
                this.handle_message(WindowMessage.WindowResize, this.size);
              }
            }
            propogate_down = false;
          }
        }
        //propogate it down
      } else if (message === WindowMessage.ChangeTheme) {
        this.do_rerender = true;
      } else if (message === WindowMessage.WindowResize && isCoords(data) && this.resizable) {
        //this message is basically only sent from WindowManager,
        //since internally (inside `Window`) only the x or y coords are changed (from the dragging to resize),
        //and sending messages is not really necessary
        //obviously only resize if the window is resizable
        this.size = data;
        this.canvas.width = this.size[0];
        this.canvas.height = this.size[1];
        this.top_components = this.create_top_components();
        this.do_rerender = true;
      } else if (message === WindowMessage.SettingsChange) {
        //only sent to windows with permission to change settings
        this.do_rerender = true;
      }
      if (propogate_down) {
        this.handle_message(message, data);
      }
      return this.do_rerender;
    }
    //this will draw the window, top bar, etc, and also call the arbitary render function
    this.render_view_window = (theme: Themes, options?: WindowOptions) => {
      if (!this.do_rerender) return;
      if (options?.settings) {
        this.cached_settings = options.settings;
      }
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

export class WindowWithFocus<MessageType> extends Window<MessageType> {
  focus_index?: number;

  //can be overwritten
  get components(): Component<MessageType | WindowMessage>[] {
    return this.layers.filter((layer) => !layer.hide).map((layer) => layer.members).flat();
  }
  //meant to be called by classes extending it
  handle_message(message: MessageType | WindowMessage, data: any): boolean {
    if (message === WindowMessage.KeyDown && isKeyboardEvent(data)) {
      if (data.key === "Enter" && !data.altKey) {
        //send the keypress to focused components as they might do something with the keypress
        return this.components.filter((c): c is FocusableComponent<MessageType | WindowMessage> => isFocusableComponent<MessageType | WindowMessage>(c)).filter((c) => c.focused).map((c) => c.handle_message(message, data)).some((r) => r);
      }
    } else if (message === WindowMessage.GenericShortcut) {
      if (data === "cycle-focus-left" || data === "cycle-focus-right") {
        const focusable_components: FocusableComponent<MessageType | WindowMessage>[] = this.components.filter((c): c is FocusableComponent<MessageType | WindowMessage> => isFocusableComponent<MessageType | WindowMessage>(c));
        if (typeof this.focus_index === "undefined") {
          this.focus_index = 0;
        } else {
          focusable_components[this.focus_index].unfocus();
          if (data === "cycle-focus-left") {
            this.focus_index--;
            if (this.focus_index < 0) {
              this.focus_index = focusable_components.length - 1;
            }
          } else if (data === "cycle-focus-right") {
            this.focus_index++;
            if (this.focus_index >= focusable_components.length) {
              this.focus_index = 0;
            }
          }
        }
        focusable_components[this.focus_index].focus();
        this.do_rerender = true;
      } else if (data === "cycle-focus-cancel" && typeof this.focus_index === "number") {
        const focusable_components: FocusableComponent<MessageType | WindowMessage>[] = this.components.filter((c): c is FocusableComponent<MessageType | WindowMessage> => isFocusableComponent<MessageType | WindowMessage>(c));
        focusable_components[this.focus_index].unfocus();
        this.focus_index = undefined;
        this.do_rerender = true;
      }
    }
    return this.do_rerender;
  }
}

export class Layer<MemberType extends Member> {
  layer_name: string;
  hide: boolean;
  windows_only: boolean;

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
          return self_layer.parent.handle_request(request, data);
        }
      };
    }
    this._members.push(member);
  }
  add_members(...member_args: MemberArg<MemberType>[]) {
    for (const member_arg of member_args) {
      this.add_member(member_arg.member, member_arg.coords);
    }
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
  private file_system: FileSystemObject;
  private permissions: Permissions;
  private settings: WindowManagerSettings;

  constructor(registry: Registry, permissions: Permissions, settings: WindowManagerSettings, render_stop: boolean = false, theme: Themes = Themes.Standard) {
    this.total_renders = 0;
    this.size = [document.body.clientWidth * SCALE, document.body.clientHeight * SCALE];
    this.layers = [];
    this.theme = theme;
    this.options = {
      //default desktop background
      desktop_background: "#008080",
      time: get_time(),
      settings,
    };
    this.file_system = new FileSystemObject({
      "usr": {
        //user's directory
        "desktop": {
          //
        },
        "documents": {
          "test.txt": "Testing 1, 2, 3. Is this thing on?",
          "longer_test.txt": "Longer multiline test \n Newlines are wonderful, aren't they? \n They can break up really really really long chunks of text into multiple lines. \n Sincerely, \n the sender \n PS: \n lorem ipsum \m dolorum \n etc etc \n filler text",
        },
        "downloads": {
          //
        },
        "media": {
          "test": {
            "_tauri_extern.image": "externfs:view.png",
          },
          "backgrounds": {
            "bloby.image": "/backgrounds/bloby.png",
            "blury.image": "/backgrounds/blury.png",
            "castley.image": "/backgrounds/castley.png",
            "cityy.image": "/backgrounds/cityy.png",
            "mingy.image": "/backgrounds/mingy.png",
            "outskirty.image": "/backgrounds/outskirty.png",
            "piecey.image": "/backgrounds/piecey.png",
          },
        },
        "scripts": {
          "factorial.yu": "var_set $1$ echo 1 \n var_set $n$ echo $_args_$ \n var_set $total$ echo $n$ \n GOTO end IF $n$ IS $1$ \n LABEL loop \n var_set $n_minus_one$ calc sub $n$ 1 \n var_set $total$ calc mul $total$ $n_minus_one$ \n var_set $n$ echo $n_minus_one$ \n GOTO loop IF $n_minus_one$ NOT $1$ \n LABEL end \n echo $_args_$! = $total$",
          "cowsay.yu": ";set all the initial line values \n var_set $line_1$ echo   ________________________________________ \n var_set $line_2$ echo  / \n var_set $extra_lines$ echo  \n var_set $line_3$ echo  \\ \n var_set $line_4$ echo   ---------------------------------------- \n var_set $line_5$ echo         \\   ^__^ \n var_set $line_6$ echo          \\  (oo)\\_______ \n var_set $line_7$ echo             (__)\\       )\\/\\ \n var_set $line_8$ echo                 ||----w | \n var_set $line_9$ echo                 ||     || \n ;calculate amount of lines needed \n var_set $40$ echo 40 \n var_set $2$ echo 2 \n var_set $0$ echo 0 \n var_set $length$ var_length $_args_$ \n var_set $total_lines$ calc div $length$ $40$ \n var_set $line_2_words$ var_slice $_args_$ 0 40 \n ;need to also add the additional spaces and \\ \n var_set $l2w_length$ var_length $line_2_words$ \n var_set $l2_remaining_length$ calc sub 40 $l2w_length$ \n GOTO l2_loop_skip IF $l2_remaining_length$ IS $0$ \n LABEL line_2_loop \n var_append $line_2_words$ echo  \n var_set $l2_remaining_length$ calc sub $l2_remaining_length$ 1 \n var_append $line_2_words$ echo   \n GOTO line_2_loop IF $l2_remaining_length$ GT $0$ \n LABEL l2_loop_skip \n var_append $line_2_words$ echo \\ \n var_append $line_2$ echo $line_2_words$ \n ;set line '3' words depending on whether more than 2 lines or not \n GOTO less_than_2 IF $total_lines$ LTE $2$ \n var_set $last$ calc mod $length$ 40 \n GOTO skip_0 IF $last$ NOT $0$ \n var_set $last$ echo 40 \n LABEL skip_0 \n ;turn it negative \n var_set $last$ calc mul $last$ -1 \n var_set $line_3_words$ var_slice $_args_$ $last$ \n GOTO l3_start \n LABEL less_than_2 \n var_set $line_3_words$ var_slice $_args_$ 40 80 \n LABEL l3_start \n ;see previous comment \n var_set $l3w_length$ var_length $line_3_words$ \n var_set $l3_remaining_length$ calc sub 40 $l3w_length$ \n GOTO l3_loop_skip IF $l3_remaining_length$ IS $0$ \n LABEL line_3_loop \n var_append $line_3_words$ echo  \n var_set $l3_remaining_length$ calc sub $l3_remaining_length$ 1 \n var_append $line_3_words$ echo   \n GOTO line_3_loop IF $l3_remaining_length$ GT $0$ \n LABEL l3_loop_skip \n var_append $line_3_words$ echo / \n var_append $line_3$ echo $line_3_words$ \n GOTO print IF $total_lines$ LTE $2$ \n LABEL more_than_2 \n ;first line is already handled for us \n ;sub 2 minus 1, net is sub 1 \n var_set $additional_count$ calc sub $total_lines$ 1 \n var_set $i$ echo 1 \n LABEL additional_loop \n var_set $start$ calc mul $i$ 40 \n var_set $end$ calc add $start$ 40 \n var_set $add_line$ var_slice $_args_$ $start$ $end$ \n var_append $extra_lines$ echo  |$add_line$| \\n  \n var_set $i$ calc add $i$ 1 \n GOTO additional_loop IF $i$ LT $additional_count$ \n LABEL print \n ;now print out the cow \n echo $line_1$ \\n $line_2$ \\n $extra_lines$$line_3$ \\n $line_4$ \\n $line_5$ \\n $line_6$ \\n $line_7$ \\n $line_8$ \\n $line_9$",
          "grep.yu": "GOTO main \n ; functions, they need $@_return$ \n LABEL word_index \n ;expects args $@words$ and $@index$, sets answer to var $%word$ \n var_set $#w_start$ echo 0 \n var_set $#space$ echo   \n var_set $#w_end$ echo 0 \n var_set $#char_length$ var_length $@words$ \n var_set $#current_i$ echo 0 \n LABEL #find_word \n var_set $#wep1$ calc add $#w_end$ 1 \n var_set $#c_w$ var_slice $@words$ $#w_end$ $#wep1$ \n GOTO #skip_wi IF $#c_w$ NOT $#space$ \n LABEL #c_i \n var_set $#current_i$ calc add $#current_i$ 1 \n GOTO #skip_wi2 \n LABEL #skip_wi \n GOTO #c_i IF $#char_length$ IS $#w_end$ \n LABEL #skip_wi2 \n var_set $#w_end$ echo $#wep1$ \n GOTO #find_word IF $#current_i$ LTE $@index$ \n var_slice $@words$ $#w_start$ $#w_end$ \n var_set $%word$ var_slice $@words$ $#w_start$ $#w_end$ \n GOTO $@_return$ \n LABEL main \n var_set $@words$ echo $_args_$ \n var_set $@index$ echo 0 \n var_set $@_return$ echo return_path \n GOTO word_index \n LABEL return_path \n var_set $contents$ cat $%word$ --var \n var_set $word_length$ var_length $%word$ \n var_set $search$ var_slice $_args_$ $word_length$ \n var_set $total_length$ var_length $contents$ \n var_set $start_index$ echo 0 \n var_set $search_length$ var_length $search$ \n var_set $end_index$ echo $search_length$ \n var_set $grepped$ echo  \n LABEL grep_loop \n var_set $w$ var_slice $contents$ $start_index$ $end_index$ \n GOTO add_grep IF $w$ IS $search$ \n GOTO add_skip \n LABEL add_grep \n var_append $grepped$ echo Found at indexes $start_index$ to $end_index$ \\n  \n var_set $start_index$ calc sub $end_index$ 1 \n var_set $end_index$ calc add $start_index$ $search_length$ \n LABEL add_skip \n var_set $start_index$ calc add $start_index$ 1 \n var_set $end_index$ calc add $end_index$ 1 \n GOTO grep_loop IF $end_index$ LT $total_length$ \n var_set $blank$ echo   \n GOTO none_found IF $grepped$ IS $blank$ \n echo $grepped$ \n GOTO end \n LABEL none_found \n echo No matches found \n LABEL end",
          "coloured.yu": "echo \\033[36;m Hey look \\033[44;m coloured text \\033[38;43;m is supported \n echo \\033[0;m try typing in ansi colour codes with separated by spaces (slight variant where the ; is still required after the last number)",
          //concat_files.yu
        },
      },
      "prg": {
        //programs can store stuff here
        //
      },
    });
    this.registry = registry;
    this.permissions = permissions;
    this.settings = settings;
    this.canvas = document.createElement("CANVAS") as HTMLCanvasElement;
    this.canvas.width = this.size[0];
    this.canvas.height = this.size[1];
    this.canvas.tabIndex = 1;
    document.body.appendChild(this.canvas);
    this.canvas.focus();
    this.context = this.canvas.getContext("2d", {
      alpha: false,
    });
    this.context.imageSmoothingEnabled = false;
    this.render_stop = render_stop;
    //set up event listeners that dispatch messages
    this.canvas.addEventListener("keydown", (event: KeyboardEvent) => {
      this.handle_message(WindowMessage.KeyDown, event);
      if (CONFIG.OVERRIDE_BROWSER_SHORTCUTS && this.settings.shortcuts) {
        //only override if it is actually a shortcut key
        if (Object.values(SHORTCUTS).flat().includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
        } else if (event.key === "/") {
          //prevent firefox's search box from popping up when typing paths
          event.preventDefault();
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
    document.addEventListener("touchmove", (event: TouchEvent) => {
      const touch_translated: MouseEvent = new MouseEvent("mousemove", {
        clientX: event.touches[0].clientX,
        clientY: event.touches[0].clientY,
      });
      this.canvas.dispatchEvent(touch_translated);
    });
    document.addEventListener("touchstart", (event: TouchEvent) => {
      const touch_translated: MouseEvent = new MouseEvent("mousedown", {
        clientX: event.touches[0].clientX,
        clientY: event.touches[0].clientY,
      });
      this.canvas.dispatchEvent(touch_translated);
    });
    this.canvas.addEventListener("touchend", (_event: TouchEvent) => {
      const touch_translated: MouseEvent = new MouseEvent("mouseup", {
        //clientX: event.touches[0].clientX,
        //clientY: event.touches[0].clientY,
      });
      this.canvas.dispatchEvent(touch_translated);
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
    //try to load previous snapshot, if available
    const snapshot = storage_get();
    if (snapshot !== null) {
      snapshot_hash(snapshot).then((hash) => {
        //ask for permission to load snapshot
        let r_info = this.registry["allow-box"];
        if (r_info) {
          let allow_box = new (r_info.class)(`Load old snapshot?`, `System snapshot with hash ${hash} found, load?`, () => {
            this.file_system.file_system = snapshot.file_system;
            this.settings = snapshot.settings;
            this.theme = snapshot.theme;
            if (isHexColor(snapshot.background)) {
              this.options.desktop_background = snapshot.background;
              this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.DesktopBackground).forEach(([member, _coords]) => {
                member.handle_message_window(DesktopBackgroundMessageStandard.ChangeBackground, true);
              });
            } else {
              this.options.desktop_background = new Image();
              this.options.desktop_background.src = snapshot.background;
              this.options.desktop_background.onload = () => {
                this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.DesktopBackground).forEach(([member, _coords]) => {
                  member.handle_message_window(DesktopBackgroundMessageStandard.ChangeBackground, true);
                });
              };
            }
            //trigger rerender
            this.windows.forEach(([member, _coords]) => member.handle_message_window(WindowMessage.ChangeTheme, this.theme));
            this.render();
          });
          let start_coords: [number, number] = [(this.size[0] - allow_box.size[0]) / SCALE / 2 - random_int(-40, 40), (this.size[1] - allow_box.size[1]) / SCALE / 2 - random_int(-40, 40)]; //the center-ish
          if (start_coords[1] < 0) {
            start_coords[1] = 0;
          }
          let found_layer = this.layers.find((l) => l.windows_only);
          if (found_layer) {
            found_layer.add_member(allow_box, start_coords);
            this.render();
          } else {
            throw Error("Could not find windows layer when adding allow box");
          }
        } else {
          throw Error("Could not find allow box in registry");
        }
      });
    }
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
    //update settings
    this.options.settings = this.settings;
    //copied in case windows get deleted
    const windows = this.windows; //.slice()
    for (let i = 0; i < windows.length; i++) {
      let w = windows[i][0];
      let wco: [number, number] = windows[i][1];
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
        window_rerendered = this.windows.filter(([member, _coords]) => member.id !== target_window?.id).map(([member, _coords]) => {
          //may require a rerender, because of window size changes
          //MouseMoveOutside is not given to the normal/arbitrary message handler,
          //so we can reasonably say that it will only be used for window size changes
          return member.handle_message_window(WindowMessage.MouseMoveOutside, mod_screen_only);
        }).some((r) => r);
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
      //if shortcuts is false, most keyboard shortcuts should be disabled
      if (this.settings.shortcuts && data.altKey) {
        //check if it is start menu shortcut, if so, send to taskbar to open (or start menu to close)
        if (SHORTCUTS["start-menu"].includes(data.key)) {
          window_rerendered = this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.Taskbar).map(([member, _coords]) => {
            return member.handle_message_window(TaskbarMessageStandard.StartMenuOpen, true);
          }).some((r) => r);
          if (!window_rerendered) {
            //probably means start menu is already open, close it
            this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.StartMenu).forEach(([member, _coords]) => {
              member.handle_message_window(StartMenuMessageStandard.StartMenuClose, true);
            });
            this.focused_id = undefined;
          }
        } else if (key_is_switch_focus_shortcut(data.key)) {
          //send to taskbars
          window_rerendered = this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.Taskbar).map(([member, _coords]) => {
            member.handle_message_window(TaskbarMessageStandard.SwitchFocus, get_switch_key_index(data.key));
          }).some((r) => r);
        } else if (SHORTCUTS["cycle-left"].includes(data.key)) {
          window_rerendered = this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.Taskbar).map(([member, _coords]) => {
            member.handle_message_window(TaskbarMessageStandard.FocusCycleLeft, true);
          }).some((r) => r);
        } else if (SHORTCUTS["cycle-right"].includes(data.key)) {
          window_rerendered = this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.Taskbar).map(([member, _coords]) => {
            member.handle_message_window(TaskbarMessageStandard.FocusCycleRight, true);
          }).some((r) => r);
        } else if (SHORTCUTS["open-terminal"].includes(data.key)) {
          //open the terminal
          //kinda hacky but w/e, will change later (todo)
          this.handle_request(WindowRequest.OpenWindow, {
            id: this.id,
            layer_name: "windows",
            trusted: true,
            name: "terminal",
            open_layer_name: "windows",
            unique: false,
          });
        } else if (this.focused_id) {
          const focused_window_info = this.windows.reverse().find(([member, _coords]) => {
            return member.id === this.focused_id;
          });
          if (!focused_window_info) return console.error("Window with focused id not found while sending keyboard shortcut mousedown event", this.focused_id);
          const focused_window = focused_window_info![0];
          const focused_window_coords = focused_window_info![1];
          //based on coords, make sure window height and width do not keep expanding offscreen
          if (isWindow(focused_window)) {
            if (SHORTCUTS["window-grow-x"].includes(data.key) && focused_window_coords[0] + focused_window.size[0] > document.body.clientWidth * SCALE) {
              return;
            } else if (SHORTCUTS["window-grow-y"].includes(data.key) && focused_window_coords[1] + focused_window.size[1] > document.body.clientHeight * SCALE - TASKBAR_HEIGHT) {
              return;
            }
          }
          //send to focused window
          window_rerendered = focused_window.handle_message_window(message, data);
        } else {
          return;
        }
      } else if (this.focused_id) {
        //
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
  ask_permission<T extends WindowRequest>(permission: keyof Permission, request: T, data: WindowRequestValues[T], resend: boolean = true) {
    if (!data.id) throw Error("Request sent without id property set. This should never happen.");
    let r_info = this.registry["allow-box"];
    if (r_info) {
      let allow_box = new (r_info.class)(`Asking to ${permission}`, `Window with id ${data.id} wants to ask for permission ${permission}`, () => {
        //change permission (todo: this should be message to be more elm like)
        if (this.permissions[data.id]) {
          this.permissions[data.id][permission] = true;
        } else {
          this.permissions[data.id] = {};
          this.permissions[data.id][permission] = true;
        }
        //resend request
        if (resend) {
          this.handle_request(request, data);
        }
      });
      let start_coords: [number, number] = [(this.size[0] - allow_box.size[0]) / SCALE / 2 - random_int(-40, 40), (this.size[1] - allow_box.size[1]) / SCALE / 2 - random_int(-40, 40)]; //the center-ish
      if (start_coords[1] < 0) {
        start_coords[1] = 0;
      }
      let found_layer = this.layers.find((l) => l.windows_only);
      if (found_layer) {
        found_layer.add_member(allow_box, start_coords);
      } else {
        throw Error("Could not find windows layer when adding allow box");
      }
    } else {
      throw Error("Could not find allow box in registry");
    }
  }
  handle_request<T extends WindowRequest>(request: T, data: WindowRequestValues[T]) {
    if (!data.layer_name || !data.id) return;
    if (CONFIG.DEBUG.REQUESTS) {
      console.debug(request, data);
    }
    if (request === WindowRequest.CloseWindow) {
      //only lets window close itself, so we don't really care if trusted
      let found_layer = this.layers.find((layer) => layer.layer_name === data.layer_name);
      if (!found_layer) throw Error("Layer not found when trying to close window");
      let removed_member = found_layer.remove_member(data.id);
      //should always be not undefined, but just in case... `?.` 
      if (removed_member?.sub_type === WindowLikeType.StartMenu) {
        //send start menu close message to taskbar
        this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.Taskbar).forEach(([member, _coords]) => {
          member.handle_message_window(TaskbarMessageStandard.StartMenuClosed, true);
        });
      }
      //remove any permission info
      if (this.permissions[data.id]) {
        delete this.permissions[data.id];
      }
      //change cursor back to normal
      this.canvas.style.cursor = "default";
    } else if (request === WindowRequest.ChangeCursor && data.trusted && isChangeCursorValue(data)) {
      if (this.canvas.style.cursor === data.new_cursor) return;
      this.canvas.style.cursor = data.new_cursor;
      //should not need to rerender
      return;
    } else if (request === WindowRequest.ChangeCoords && data.trusted && isChangeCoordsValue(data)) {
      let found_layer = this.layers.find((layer) => layer.layer_name === data.layer_name);
      if (!found_layer) return console.error("Layer not found when trying to change coord of window"); //should never happen
      let current_coords: [number, number] = found_layer.coords[data.id];
      let request_window = found_layer.get_member_by_id(data.id);
      if (!request_window) return console.error("Window not found when trying to change coord of window"); //should never happen
      if (data.stick_bottom) {
        data.delta_coords[1] = document.body.clientHeight * SCALE - request_window.size[1] - current_coords[1];
      } else if (data.stick_top) {
        //todo: test
        data.delta_coords[1] = -current_coords[1];
      } else if (data.stick_bottom_taskbar_offset) {
        data.delta_coords[1] = document.body.clientHeight * SCALE - request_window.size[1] - current_coords[1] - TASKBAR_HEIGHT;
      }
      if (data.stick_right) {
        data.delta_coords[0] = document.body.clientWidth * SCALE - request_window.size[0] - current_coords[0];
      } else if (data.stick_left) {
        //todo: test
        data.delta_coords[0] = -current_coords[0];
      }
      //if coords unchanged, no need to change anything ofc
      if (data.delta_coords[0] === 0 && data.delta_coords[1] === 0) return;
      //windows cannot be dragged off the screen
      const new_coords: [number, number] = [current_coords[0] + data.delta_coords[0], current_coords[1] + data.delta_coords[1]];
      if (isWindow(request_window) && (new_coords[0] < -request_window.size[0] + 25 * SCALE || new_coords[0] > this.size[0] - 25 * SCALE || new_coords[1] < 0 || new_coords[1] > this.size[1] - TASKBAR_HEIGHT - WINDOW_TOP_HEIGHT)) return;
      found_layer.change_member_coords(data.id, new_coords);
    } else if (request === WindowRequest.FocusWindow && data.trusted && isFocusWindowValue(data)) {
      this.focused_id = data.new_focus;
      let found_layer = this.layers.find((layer) => layer.members.find((member) => member.id === data.new_focus));
      if (!found_layer) throw Error("Layer not found when trying to focus window");
      found_layer.move_member_top(data.new_focus);
      this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.Taskbar).forEach(([member, _coords]) => {
        member.handle_message_window(TaskbarMessageStandard.WindowFocusChange, this.focused_id);
      });
    } else if (request === WindowRequest.OpenWindow && (data.trusted || this.permissions[data.id]?.open_windows) && isOpenWindowValue(data)) {
      let r_info = this.registry[data.name];
      if (r_info) {
        if (data.open_layer_name === "") {
          data.open_layer_name = data.layer_name; //same layer as request sender then, if blank
        }
        let found_layer = this.layers.find((layer) => layer.layer_name === data.open_layer_name);
        if (found_layer) {
          if (data.unique) {
            let found_same_instance = found_layer.members.find((member) => member instanceof r_info.class);
            if (found_same_instance) return;
          }
          let member;
          try {
            if (data.args) {
              member = new (r_info.class)(...data.args);
            } else {
              member = new (r_info.class)(...r_info.args);
            }
          } catch (e) {
            console.error(e);
            return;
          }
          let start_coords: [number, number] = [(this.size[0] - member.size[0]) / SCALE / 2 - random_int(-40, 40), (this.size[1] - member.size[1]) / SCALE / 2 - random_int(-40, 40)]; //the center-ish
          if (start_coords[1] < 0) {
            start_coords[1] = 0;
          }
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
    } else if (request === WindowRequest.OpenWindow && !this.permissions[data.id]?.open_windows && isOpenWindowValue(data)) {
      //open allow box that asks user for permission
      //currently unused perm
      this.ask_permission("open_windows", request, data);
      return;
    } else if (request === WindowRequest.ChangeTheme && isChangeThemeValue(data) && data.id === this.focused_id) {
      if (this.theme === data.new_theme) return;
      //permission system
      if (this.permissions[data.id]?.change_theme) {
        this.theme = data.new_theme;
        this.windows.forEach(([member, _coords]) => member.handle_message_window(WindowMessage.ChangeTheme, data.new_theme));
      } else {
        //open allow box that asks user for permission
        this.ask_permission("change_theme", request, data);
        return;
      }
    } else if (request === WindowRequest.FullscreenToggleWindow) {
      let found_layer = this.layers.find((layer) => layer.layer_name === data.layer_name);
      if (!found_layer) return console.error("Layer not found when trying to change coord of window"); //should never happen
      found_layer.change_member_coords(data.id, [0, 0]);
      let request_window = found_layer.get_member_by_id(data.id);
      if (!request_window || !isWindow(request_window)) return console.error("Window not found when trying to change coord of window"); //should never happen
      if (request_window.size[0] === this.size[0] && request_window.size[1]) {
        request_window.handle_message_window(WindowMessage.WindowResize, WINDOW_DEFAULT_DIMENSIONS);
      } else {
        request_window.handle_message_window(WindowMessage.WindowResize, [this.size[0], this.size[1] - TASKBAR_HEIGHT]);
      }
    } else if (request === WindowRequest.ChangeSettings && isChangeSettingsValue(data) && data.id === this.focused_id) {
      if (this.permissions[data.id]?.change_settings) {
        //change them settings
        for (let i = 0; i < Object.keys(data.changed_settings).length; i++) {
          let settings_key = Object.keys(data.changed_settings)[i];
          this.settings[settings_key] = data.changed_settings[settings_key];
        }
        Object.keys(this.permissions).filter((p_id) => this.permissions[p_id].change_settings).forEach((p_id) => {
          let window_w_perm = this.get_window_by_id(p_id);
          if (window_w_perm) {
            window_w_perm.handle_message_window(WindowMessage.SettingsChange, true);
          }
        });
      } else {
        //open allow box that asks user for permission
        this.ask_permission("change_settings", request, data);
        return;
      }
    } else if (request === WindowRequest.ChangeDesktopBackground && isChangeDesktopBackgroundValue(data)) {
      if (this.permissions[data.id]?.change_desktop_background) {
        this.options.desktop_background = data.new_info;
        this.windows.filter(([member, _coords]) => member.sub_type === WindowLikeType.DesktopBackground).forEach(([member, _coords]) => {
          member.handle_message_window(DesktopBackgroundMessageStandard.ChangeBackground, true);
        });
      } else {
        //open allow box that asks user for permission
        this.ask_permission("change_desktop_background", request, data);
        return;
      }
    } else if (request === WindowRequest.ReadFileSystem && isReadFileSystemValue(data)) {
      //check if they have permission
      if (this.permissions[data.id]?.read_all_file_system || this.permissions[data.id]?.read_usr_file_system && data.path.startsWith("/usr") || this.permissions[data.id]?.read_prg_file_system && data.path.startsWith("/prg")) {
        //return the stuff
        return this.file_system.get_path_contents(data.path);
      } else {
        //alert box blah blah
        //do not resend request
        if (data.permission_type === "read_all_file_system" || (data.permission_type === "read_usr_file_system" && data.path.startsWith("/usr")) || (data.permission_type === "read_prg_file_system" && data.path.startsWith("/prg"))) {
          this.ask_permission("read_all_file_system", request, data, false);
        } else {
          //invalid permission requested for path
          return;
        }
      }
    } else if (request === WindowRequest.WriteFileSystem && isWriteFileSystemValue(data)) {
      if (data.path.includes(" ")) return; //no spaces in path!
      if (this.permissions[data.id]?.write_all_file_system || (this.permissions[data.id]?.write_usr_file_system && data.path.startsWith("/usr")) || (this.permissions[data.id]?.write_prg_file_system && data.path.startsWith("/prg"))) {
        return this.file_system.write_path(data.path, data.content);
      } else {
        //alert box blah blah
        //do not resend request
        if (data.permission_type === "write_all_file_system" || (data.permission_type === "write_usr_file_system" && data.path.startsWith("/usr")) || (data.permission_type === "write_prg_file_system" && data.path.startsWith("/prg"))) {
          this.ask_permission(data.permission_type, request, data, false);
        } else {
          //invalid permission requested for path
          return;
        }
      }
    } else if (request === WindowRequest.RemoveFileSystem && isRemoveFileSystemValue(data)) {
      if (this.permissions[data.id]?.write_all_file_system || (this.permissions[data.id]?.write_usr_file_system && data.path.startsWith("/usr")) || (this.permissions[data.id]?.write_prg_file_system && data.path.startsWith("/prg"))) {
        return this.file_system.remove_path(data.path);
      } else {
        //alert box blah blah
        //do not resend request
        if (data.permission_type === "write_all_file_system" || (data.permission_type === "write_usr_file_system" && data.path.startsWith("/usr")) || (data.permission_type === "write_prg_file_system" && data.path.startsWith("/prg"))) {
          this.ask_permission(data.permission_type, request, data, false);
        } else {
          //invalid permission requested for path
          return;
        }
      }
    } else if (request === WindowRequest.SnapshotSystem) {
      if (this.permissions[data.id]?.snapshot_system) {
        const desktop_background: DesktopBackgroundValue = this.options.desktop_background; 
        const snapshot: SystemSnapshot = {
          theme: this.theme,
          file_system: this.file_system.file_system,
          settings: this.settings,
          background: typeof desktop_background === "string" ? desktop_background : (desktop_background.src.startsWith("blob:") ? image_to_data_url(desktop_background) : desktop_background.src),
        };
        storage_write(snapshot);
        snapshot_hash(snapshot).then((hash) => {
          //kinda hacky but w/e, will change later (todo)
          this.handle_request(WindowRequest.OpenWindow, {
            id: this.id,
            layer_name: "windows",
            trusted: true,
            name: "alert-box",
            open_layer_name: "windows",
            unique: false,
            args: ["System Snapshotted", `Hash: ${hash}`],
          });
        });
        return;
      } else {
        //alert box blah blah
        this.ask_permission("snapshot_system", request, data);
      }
    } else {
      return;
    }
    this.render();
  }
}
