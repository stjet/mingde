import { Component, WindowLikeType, WindowLike, WindowOptions, WindowMessage, Layer, StartMenuMessageStandard } from './wm.js';
import { isMouseEvent, isKeyboardEvent } from './guards.js';
import { Themes, THEME_INFOS } from './themes.js';
import { WindowRequest, WindowRequestValues } from './requests.js';
import { CONFIG, START_MENU_VWIDTH, START_MENU_SIZE, SCALE, FONT_SIZES, VERSION } from './constants.js';
import type { Registry } from './registry.js';

import { HighlightButton } from './components/highlight_button.js';
import { Icon } from './components/icon.js';

const padding: number = 5;

let mingde_logo: HTMLImageElement = new Image();
mingde_logo.src = "/mingde_logo.png";

export enum ApplicationCategories {
  Utils = "utils",
  Games = "games",
  Media = "media",
  Editing = "editing",
  System = "system",
  Misc = "misc",
}

export enum StartMenuMessage {
  BackCategories,
  ToCategory,
}

export class StartMenu implements WindowLike<StartMenuMessage | StartMenuMessageStandard> {
  readonly type: string = "window-like";
  readonly sub_type: WindowLikeType = WindowLikeType.StartMenu;

  readonly id: string;
  readonly render_view_window: (theme: Themes, options?: any) => void;
  readonly handle_message_window: (message: StartMenuMessage | StartMenuMessageStandard | WindowMessage, data: any) => boolean;
  readonly set_secret: (secret: string) => void;

  private registry: Registry;

  private secret: string;

  size: [number, number];

  do_rerender: boolean;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  layers: Layer<Component<StartMenuMessage | StartMenuMessageStandard | WindowMessage>>[];

  send_request: <T extends WindowRequest>(request: T, data: WindowRequestValues[T], secret?: string) => void;

  constructor(registry: Registry) {
    this.size = START_MENU_SIZE;
    this.registry = registry;
    //set to true for first render
    this.do_rerender = true;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.size[0];
    this.canvas.height = this.size[1];
    this.context = this.canvas.getContext("2d");
    this.layers = [
      new Layer(this, "vertical"),
      new Layer(this, "categories"),
    ];
    const height: number = this.size[1] / SCALE / (Object.values(ApplicationCategories).length + 3);
    const padding_y: number = (height - FONT_SIZES.BUTTON / SCALE) / 2;
    //add about
    this.layers[1].add_member(new HighlightButton(this, "About", [(padding + START_MENU_VWIDTH) / SCALE, 0], [(this.size[0] - START_MENU_VWIDTH) / SCALE, height], padding_y, () => {
      //open alert box that says version number
      this.send_request(WindowRequest.OpenWindow, {
        name: "alert-box",
        open_layer_name: "windows",
        unique: false,
        sub_size_y: true,
        //args: ["About Mingde", `Version: ${VERSION} a ushfjadsklfajdsfksdaf;9382473247324372847832784732743284732434327847324!a as \n asf`],
        args: ["About Mingde", `Version: ${VERSION} \n Mingde is a "desktop environment" running in HTML canvas. Written in typescript, with no external dependencies.`],
      }, this.secret);
    }));
    //add hidden layers for the categories
    for (let i = 0; i < Object.values(ApplicationCategories).length; i++) {
      this.layers.push(new Layer(this, Object.values(ApplicationCategories)[i], false, true));
      //add back button
      this.layers[2 + i].add_member(new HighlightButton(this, "Back", [(padding + START_MENU_VWIDTH) / SCALE, 0], [(this.size[0] - START_MENU_VWIDTH) / SCALE, height], padding_y, () => {
        this.handle_message_window(StartMenuMessage.BackCategories, Object.values(ApplicationCategories)[i]);
      }));
      //add registered windows in the category
      let in_category = Object.values(this.registry).filter((registered) => registered.category === Object.values(ApplicationCategories)[i]);
      for (let j = 0; j < in_category.length; j++) {
        //todo: what happens if there are too many registered windows to fit?
        this.layers[2 + i].add_member(new HighlightButton(this, in_category[j].display_name, [(padding + START_MENU_VWIDTH) / SCALE, height * (j + 1)], [(this.size[0] - START_MENU_VWIDTH) / SCALE, height], padding_y, () => {
          //todo: send request to open that window
          this.send_request(WindowRequest.OpenWindow, {
            name: in_category[j].name,
            open_layer_name: "windows",
            unique: false,
          }, this.secret);
        }, true));
      }
      //add the highlight buttons too, why not
      this.layers[1].add_member(new HighlightButton(this, Object.keys(ApplicationCategories)[i], [(padding + START_MENU_VWIDTH) / SCALE, height * (i + 1)], [(this.size[0] - START_MENU_VWIDTH) / SCALE, height], padding_y, () => {
        this.handle_message_window(StartMenuMessage.ToCategory, Object.values(ApplicationCategories)[i]);
      }, true));
    }
    //add help and exit
    this.layers[1].add_member(new HighlightButton(this, "Help", [(padding + START_MENU_VWIDTH) / SCALE, height * (Object.values(ApplicationCategories).length + 1)], [(this.size[0] - START_MENU_VWIDTH) / SCALE, height], padding_y, () => {
      this.send_request(WindowRequest.OpenWindow, {
        name: "help",
        open_layer_name: "windows",
        unique: false,
      }, this.secret);
    }));
    this.layers[1].add_member(new HighlightButton(this, "Exit", [(padding + START_MENU_VWIDTH) / SCALE, height * (Object.values(ApplicationCategories).length + 2)], [(this.size[0] - START_MENU_VWIDTH) / SCALE, height], padding_y, () => {
      //placeholder
      //exit should close the page or something?
      if (window.__TAURI__) {
        window.__TAURI__.window.appWindow.close();
      }
    }));
    //draw mingde icon n vertical bar thing (add to first layer)
    this.layers[0].add_member(new Icon(this, [padding / SCALE, padding / SCALE], [START_MENU_VWIDTH / SCALE, START_MENU_VWIDTH / SCALE], mingde_logo));
    this.set_secret = (secret: string) => {
      if (this.secret) return;
      this.secret = secret;
    };
    //this is a placeholder, yada yada yada
    this.send_request = <T extends WindowRequest>(_request: T, _data: WindowRequestValues[T], _secret?: string) => void 0;
    this.handle_message_window = (message: StartMenuMessage | StartMenuMessageStandard | WindowMessage, data: any) => {
      //probably can be moved to regular message handler?
      if (message === StartMenuMessageStandard.MouseDownOutside || message === StartMenuMessageStandard.StartMenuClose) {
        this.send_request(WindowRequest.CloseWindow, {}); //close window request does not care about trusted and secret
        return false;
      } else if (message === WindowMessage.Resize) {
        //too much work to change coords of the start menu on resize, just close it
        this.send_request(WindowRequest.CloseWindow, {}); //close window request does not care about trusted and secret
        return false;
      }
      this.handle_message(message, data);
      return this.do_rerender;
    };
    //this.render_view isn't supposed to be overriden by anyone, so we can just do most of the stuff there
    this.render_view_window = (theme: Themes, _options?: WindowOptions) => {
      if (!this.do_rerender) return;
      this.clear();
      this.render_view(theme);
      this.do_rerender = false;
    };
  }
  get components(): Component<StartMenuMessage | StartMenuMessageStandard | WindowMessage>[] {
    return this.layers.filter((layer) => !layer.hide).map((layer) => layer.members).flat();
  }
  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  render_view(theme: Themes) {
    let theme_info = THEME_INFOS[theme];
    //draw background
    this.context.fillStyle = theme_info.background;
    this.context.fillRect(0, 0, this.size[0], this.size[1]);
    this.context.lineWidth = 2 * SCALE;
    this.context.strokeStyle = theme_info.border_left_top;
    //draw border
    let top: Path2D = new Path2D();
    top.moveTo(0, 0);
    top.lineTo(this.size[0], 0);
    this.context.stroke(top);
    this.context.strokeStyle = theme_info.border_right_bottom;
    let right: Path2D = new Path2D();
    right.moveTo(this.size[0], 0);
    right.lineTo(this.size[0], this.size[1]);
    this.context.stroke(right);
    //draw yellow vertical strip
    if (CONFIG.GRADIENTS) {
      let gradient = this.context.createLinearGradient(0, 0, 0, this.size[1] - padding);
      gradient.addColorStop(0, CONFIG.MINGDE_YELLOW);
      gradient.addColorStop(1, CONFIG.MINGDE_YELLOW_2);
      this.context.fillStyle = gradient;
    } else {
      this.context.fillStyle = CONFIG.MINGDE_YELLOW;
    }
    this.context.fillRect(padding, padding, START_MENU_VWIDTH, this.size[1] - 2 * padding);
    //draw the layers
    let components = this.components;
    for (let j = 0; j < components.length; j++) {
      components[j].render_view(theme);
    }
  }
  handle_message(message: StartMenuMessage | StartMenuMessageStandard | WindowMessage, data: any): boolean {
    if (message === WindowMessage.MouseDown) {
      if (isMouseEvent(data)) {
        let relevant_components = this.components.filter((c) => {
          return data.clientX > c.coords[0] && data.clientY > c.coords[1] && data.clientX < c.coords[0] + c.size[0] && data.clientY < c.coords[1] + c.size[1] && c.clickable;
        });
        relevant_components.forEach((c) => c.handle_message(message, data));
        if (relevant_components.length > 0) {
          this.do_rerender = true;
        }
      }
    } else if (message === WindowMessage.KeyDown && isKeyboardEvent(data)) {
      //find all highlight buttons
      let highlight_buttons: HighlightButton<StartMenuMessage | StartMenuMessageStandard | WindowMessage>[] = this.components.filter((c): c is HighlightButton<StartMenuMessage | StartMenuMessageStandard | WindowMessage> => c.type === "highlight-button");
      const highlight_shortcut_keys: string[] = highlight_buttons.filter((b) => b.first_key_underline).map((b) => b.text[0].toLowerCase());
      if (data.key === "ArrowDown" || data.key === "ArrowUp" || data.key === "Enter" || highlight_shortcut_keys.includes(data.key.toLowerCase())) {
        let first_highlighted = highlight_buttons.find((c) => c.highlighted);
        //unhighlight all buttons
        highlight_buttons.forEach((c) => {
          c.highlighted = false;
        });
        if (data.key === "ArrowDown") {
          if (!first_highlighted) {
            //highlight the first one
            highlight_buttons[0].highlighted = true;
          } else {
            //highlight the next one (if reached end, highlight first one)
            let index: number = highlight_buttons.findIndex((c) => c.id === first_highlighted.id);
            index++;
            if (index >= highlight_buttons.length) {
              index = 0;
            }
            highlight_buttons[index].highlighted = true;
          }
        } else if (data.key === "ArrowUp") {
          if (!first_highlighted) {
            //highlight the first one
            highlight_buttons[0].highlighted = true;
          } else {
            //highlight the prev one (if reached start, highlight last one)
            let index: number = highlight_buttons.findIndex((c) => c.id === first_highlighted.id);
            index--;
            if (index < 0) {
              index = highlight_buttons.length - 1;
            }
            highlight_buttons[index].highlighted = true;
          }
        } else if (data.key === "Enter" && first_highlighted) {
          //todo: kinda hacky, make it something else
          first_highlighted.handle_message(WindowMessage.MouseDown, new MouseEvent("mousedown"));
        } else {
          //category shortcut key, so jump to the next category
          const current_index: number = highlight_buttons.findIndex((c) => c.id === first_highlighted?.id);
          let index: number = current_index === -1 ? 0 : current_index; //if nothing highlighted, default to first one
          const is_shortcut_category = (c) => c.first_key_underline && c.text[0].toLowerCase() === data.key.toLowerCase();
          //find the next one, so even if there are multiple things still work
          let new_index: number = highlight_buttons.slice(index + 1).findIndex(is_shortcut_category);
          if (new_index === -1) {
            //search from beginning
            new_index = highlight_buttons.findIndex(is_shortcut_category);
          } else {
            new_index += index + 1;
          }
          highlight_buttons[new_index].highlighted = true;
          if (new_index === current_index) {
            return this.do_rerender; //do not rerender
          }
        }
        this.do_rerender = true;
      }
    } else if (message === WindowMessage.MouseMove) {
      //do not deselect is mouse leaves, mouse moves outside, etc (architectural decision)
      this.do_rerender = this.components.filter((c) => c.clickable).some((c) => c.handle_message(message, data));
    } else if (message === WindowMessage.ChangeTheme) {
      this.do_rerender = true;
    } else if (message === StartMenuMessage.ToCategory && typeof data === "string") {
      this.layers[1].hide = true;
      this.layers.find((layer) => layer.layer_name === data).hide = false;
    } else if (message === StartMenuMessage.BackCategories && typeof data === "string") {
      this.layers[1].hide = false;
      this.layers.find((layer) => layer.layer_name === data).hide = true;
    }
    //
    return this.do_rerender;
  }
}

