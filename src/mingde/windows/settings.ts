import { Window, WindowMessage, Component, Layer } from '../wm.js';
import { Themes, THEMES_LIST } from '../themes.js';
import { isMouseEvent } from '../guards.js';
import { WindowRequest } from '../requests.js';
import { WINDOW_TOP_HEIGHT, FONT_SIZES, SCALE } from '../constants.js';

import { TextLine } from '../components/text_line.js';
import { Carousel } from '../components/carousel.js';
import { Checkbox } from '../components/checkbox.js';

/*
ideas for settings:
- changing desktop background
- changing themes (currently only one tho)
- change font sizes?
- toggle highlight buttons
- toggle gradients
- show (non-live)rerender count?
- todo: keyboard shortcut keybinds
*/

const margin: number = 10;

export enum SettingsMessage {
  //
}

export class Settings extends Window<SettingsMessage> {
  private cached_theme: Themes;
  
  constructor(size: [number, number]) {
    super(size, "Settings", "settings");
    this.layers = [new Layer(this, "body")];
    const top_y: number = margin + WINDOW_TOP_HEIGHT / SCALE;
    //theme change
    this.layers[0].add_member(new TextLine(this, "Themes:", [margin, top_y + FONT_SIZES.NORMAL / SCALE + 4], "text_primary", "NORMAL", 50, true, false));
    this.layers[0].add_member(new Carousel(this, [margin + 50, top_y], 4, 60, () => this.cached_theme, () => {
      let index: number = Object.values(Themes).indexOf(this.cached_theme) - 1;
      if (index < 0) {
        index = Object.values(Themes).length - 1;
      }
      this.send_request(WindowRequest.ChangeTheme, {
        new_theme: THEMES_LIST[index],
      });
    }, () => {
      let index: number = Object.values(Themes).indexOf(this.cached_theme) + 1;
      if (index >= Object.values(Themes).length) {
        index = 0;
      }
      this.send_request(WindowRequest.ChangeTheme, {
        new_theme: THEMES_LIST[index],
      });
    }));
    //checkbox to disable shortcuts
    this.layers[0].add_member(new TextLine(this, "Uncheck to disable *most* keyboard shortcuts:", [margin, top_y + (FONT_SIZES.NORMAL * 2) / SCALE + 12], "text_primary", "NORMAL", undefined, true, false));
    //placeholder for testing
    let a: boolean = true;
    this.layers[0].add_member(new Checkbox(this, [margin, top_y + (FONT_SIZES.NORMAL * 2) / SCALE + 20], 13, () => a, () => {
      a = false;
    }, () => {
      a = true;
    }));
    //
  }
  get components(): Component<SettingsMessage | WindowMessage>[] {
    return this.layers.filter((layer) => !layer.hide).map((layer) => layer.members).flat();
  }
  render_view(theme: Themes) {
    this.cached_theme = theme;
    let components = this.components;
    for (let j = 0; j < components.length; j++) {
      components[j].render_view(theme);
    }
  }
  handle_message(message: SettingsMessage | WindowMessage, data: any): boolean {
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
    }
    return this.do_rerender;
  }
}

