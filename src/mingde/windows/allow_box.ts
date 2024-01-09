import { WindowWithFocus, WindowMessage, Layer } from '../wm.js';
import { WindowRequest } from '../requests.js';
import { isMouseEvent } from '../guards.js';
import { FONT_SIZES, SCALE, WINDOW_TOP_HEIGHT } from '../constants.js';
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

export class AllowBox extends WindowWithFocus<AllowBoxMessage> {
  private allow_func: () => void;

  constructor(title: string, message: string, allow_func: () => void) {
    super(allow_box_size, title, "allow-box", false);
    this.allow_func = allow_func;
    this.layers = [new Layer(this, "alert-body")];
    this.layers[0].add_member(new Paragraph(this, message, [margin, WINDOW_TOP_HEIGHT / SCALE + FONT_SIZES.NORMAL / SCALE + 4], "text_primary", "NORMAL", allow_box_size[0] - margin * 2));
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
    } else {
      this.do_rerender = super.handle_message(message, data);
    }
    return this.do_rerender;
  }
}

