import { Window, WindowMessage, Component, FocusableComponent, Layer } from '../wm.js';
import { WindowRequest } from '../requests.js';
import { isMouseEvent, isKeyboardEvent, isFocusableComponent } from '../guards.js';
import { FONT_SIZES, SCALE, WINDOW_TOP_HEIGHT } from '../constants.js';
import type { Permission } from '../registry.js';
import type { Themes } from '../themes.js';

import { Paragraph } from '../components/paragraph.js';
import { Button } from '../components/button.js';

//like alert box
const allow_box_size: [number, number] = [280, 120];
const button_width: number = 75;
const margin: number = 20;

enum AllowBoxMessage {
  //
}

export class AllowBox extends Window<AllowBoxMessage> {
  private id_perm: string;
  private permission: keyof Permission;
  private allow_func: () => void;
  private focus_index?: number;

  constructor(id_perm: string, permission: keyof Permission, allow_func: () => void) {
    super(allow_box_size, `Asking to ${permission}`, "allow-box", false);
    this.id_perm = id_perm;
    this.permission = permission;
    this.allow_func = allow_func;
    this.layers = [new Layer(this, "alert-body")];
    this.layers[0].add_member(new Paragraph(this, `Window with id ${this.id_perm} wants to ask for permission ${this.permission}`, [margin, WINDOW_TOP_HEIGHT / SCALE + FONT_SIZES.NORMAL / SCALE + 4], "text_primary", "NORMAL", allow_box_size[0] - margin * 2));
    const button_height: number = 22;
    this.layers[0].add_member(new Button(this, "Deny", [allow_box_size[0] / 2 - button_width - 10, allow_box_size[1] - button_height - 10], button_width, (button_height - FONT_SIZES.BUTTON / SCALE)/ 2, () => {
      this.send_request(WindowRequest.CloseWindow, {});
    }));
    this.layers[0].add_member(new Button(this, "Allow", [allow_box_size[0] / 2 + 10, allow_box_size[1] - button_height - 10], button_width, (button_height - FONT_SIZES.BUTTON / SCALE)/ 2, () => {
      this.send_request(WindowRequest.CloseWindow, {});
      //allow func has to be called after CloseWindow so the focused_id changes back to the old window
      this.allow_func();
    }));
  }
  get components(): Component<AllowBoxMessage | WindowMessage>[] {
    return this.layers.filter((layer) => !layer.hide).map((layer) => layer.members).flat();
  }
  render_view(theme: Themes) {
    let components = this.components;
    for (let j = 0; j < components.length; j++) {
      components[j].render_view(theme);
    }
  }
  handle_message(message: AllowBoxMessage | WindowMessage, data: any): boolean {
    if (message === WindowMessage.MouseDown && isMouseEvent(data)) {
      let relevant_components = this.components.filter((c) => {
        return data.clientX > c.coords[0] && data.clientY > c.coords[1] && data.clientX < c.coords[0] + c.size[0] && data.clientY < c.coords[1] + c.size[1] && c.clickable;
      });
      relevant_components.forEach((c) => c.handle_message(message, data));
      if (relevant_components.length > 0) {
        this.do_rerender = true;
      }
    } else if (message === WindowMessage.KeyDown && isKeyboardEvent(data)) {
      if (data.key === "Enter" && !data.altKey) {
        //send the keypress to focused components as they might do something with the keypress
        return this.components.filter((c): c is FocusableComponent<AllowBoxMessage | WindowMessage> => isFocusableComponent<AllowBoxMessage | WindowMessage>(c)).filter((c) => c.focused).some((c) => c.handle_message(message, data));
      }
    } else if (message === WindowMessage.GenericShortcut) {
      if (data === "cycle-focus-left" || data === "cycle-focus-right") {
        const focusable_components: FocusableComponent<AllowBoxMessage | WindowMessage>[] = this.components.filter((c): c is FocusableComponent<AllowBoxMessage | WindowMessage> => isFocusableComponent<AllowBoxMessage | WindowMessage>(c));
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
        const focusable_components: FocusableComponent<AllowBoxMessage | WindowMessage>[] = this.components.filter((c): c is FocusableComponent<AllowBoxMessage | WindowMessage> => isFocusableComponent<AllowBoxMessage | WindowMessage>(c));
        focusable_components[this.focus_index].unfocus();
        this.focus_index = undefined;
        this.do_rerender = true;
      }
    }
    return this.do_rerender;
  }
}

