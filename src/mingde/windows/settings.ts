import { Window, WindowMessage, Component, FocusableComponent, Layer } from '../wm.js';
import { Themes, THEMES_LIST, DesktopBackgroundTypes } from '../themes.js';
import { isMouseEvent, isFocusableComponent, isTextInput } from '../guards.js';
import { WindowRequest } from '../requests.js';
import { WINDOW_TOP_HEIGHT, FONT_SIZES, SCALE } from '../constants.js';
import { ValidationState } from '../utils.js';

import { Button } from '../components/button.js';
import { TextLine } from '../components/text_line.js';
import { Carousel } from '../components/carousel.js';
import { Checkbox } from '../components/checkbox.js';
import { TextInput } from '../components/text_input.js';

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

enum SettingsMessage {
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
    this.layers[0].add_member(new TextLine(this, "Uncheck to disable keyboard shortcuts:", [margin, top_y + (FONT_SIZES.NORMAL * 2) / SCALE + 12], "text_primary", "NORMAL", undefined, true, false));
    //placeholder for testing
    this.layers[0].add_member(new Checkbox(this, [margin, top_y + (FONT_SIZES.NORMAL * 2) / SCALE + 15], 13, () => this.cached_settings?.shortcuts, () => {
      this.send_request(WindowRequest.ChangeSettings, {
        changed_settings: {
          shortcuts: false,
        },
      });
    }, () => {
      this.send_request(WindowRequest.ChangeSettings, {
        changed_settings: {
          shortcuts: true,
        },
      });
    }));
    this.layers[0].add_member(new TextLine(this, "Background image/colour:", [margin, top_y + (FONT_SIZES.NORMAL * 3) / SCALE + 34], "text_primary", "NORMAL", undefined, true, false));
    this.layers[0].add_member(new TextInput(this, "#hex or /bgs/img.png...", [margin, top_y + (FONT_SIZES.NORMAL * 3) / SCALE + 38], "NORMAL", 150));
    this.layers[0].add_member(new Button(this, "Change", [margin + 150 + 5, top_y + (FONT_SIZES.NORMAL * 3) / SCALE + 38], 75, 3, () => {
      if (!isTextInput<SettingsMessage | WindowMessage>(this.layers[0].members[5])) return;
      let text_input: TextInput<SettingsMessage | WindowMessage> = this.layers[0].members[5];
      if (text_input.value.startsWith("#") && text_input.value.length === 7 && text_input.value.slice(1).split("").every((char) => ["a", "b", "c", "d", "e", "f", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(char.toLowerCase()))) {
        text_input.valid = ValidationState.Valid;
        this.send_request(WindowRequest.ChangeDesktopBackground, {
          new_info: [DesktopBackgroundTypes.Solid, text_input.value.toLowerCase()],
        });
      } else if (text_input.value.startsWith("/bg/") && text_input.value.endsWith(".png")) {
        text_input.valid = ValidationState.Valid;
        //
      } else {
        text_input.valid = ValidationState.Invalid;
      }
    }, undefined, undefined, undefined, true));
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
    if (message === WindowMessage.MouseDown && isMouseEvent(data)) {
      let relevant_components = this.components.filter((c) => {
        return data.clientX > c.coords[0] && data.clientY > c.coords[1] && data.clientX < c.coords[0] + c.size[0] && data.clientY < c.coords[1] + c.size[1] && c.clickable;
      });
      relevant_components.forEach((c) => c.handle_message(message, data));
      if (relevant_components.length > 0) {
        this.do_rerender = true;
      }
      //unfocus focused text inputs if the click wasn't on them
      //we only check type to make sure it is a textinput,
      //but we only depend on the methods of FocusableComponent which we are sure of, so this is a-ok
      let focused_text_inputs: TextInput<SettingsMessage | WindowMessage>[] = this.components.filter((c): c is FocusableComponent<SettingsMessage | WindowMessage> => isFocusableComponent(c)).filter((c): c is TextInput<SettingsMessage | WindowMessage> => c.type === "text-input" && c.focused && !relevant_components.includes(c));
      if (focused_text_inputs.length > 0) {
        this.do_rerender = true;
        focused_text_inputs.forEach((c) => c.unfocus());
      }
    } else if (message === WindowMessage.KeyDown) {
      //find a focused text input and send to there
      let focused_text_input = this.components.filter((c): c is FocusableComponent<SettingsMessage | WindowMessage> => isFocusableComponent(c)).find((c) => c.type === "text-input" && c.focused);
      if (focused_text_input) {
        focused_text_input.handle_message(message, data);
        this.do_rerender = true;
      }
    }
    return this.do_rerender;
  }
}

