import { Component, Window, WindowMessage, Layer } from '../wm.js';
import type { Themes } from '../themes.js';
import { SCALE, WINDOW_TOP_HEIGHT, FONT_SIZES } from '../constants.js';
import { WindowRequest } from '../requests.js';
import { isMouseEvent } from '../guards.js';

import { Paragraph } from '../components/paragraph.js';
import { Button } from '../components/button.js';

const alert_box_size: [number, number] = [280, 120];
const button_width: number = 75;
const margin: number = 20;

enum AlertBoxMessage {
  //
}

export class AlertBox extends Window<AlertBoxMessage> {
  constructor(title: string, message: string) {
    super(alert_box_size, title, "alert-box", false);
    this.layers = [new Layer(this, "alert-body")];
    this.layers[0].add_member(new Paragraph(this, message, [margin, WINDOW_TOP_HEIGHT / SCALE + FONT_SIZES.NORMAL / SCALE], "text_primary", "NORMAL", alert_box_size[0] - margin * 2));
    const button_height: number = 22;
    this.layers[0].add_member(new Button(this, "Ok", [alert_box_size[0] / 2 - button_width / 2, alert_box_size[1] - button_height - 10], button_width, (button_height - FONT_SIZES.BUTTON / SCALE)/ 2, () => {
      this.send_request(WindowRequest.CloseWindow, {});
    }));
  }
  get components(): Component<AlertBoxMessage | WindowMessage>[] {
    return this.layers.filter((layer) => !layer.hide).map((layer) => layer.members).flat();
  }
  render_view(theme: Themes) {
    let components = this.components;
    for (let j = 0; j < components.length; j++) {
      components[j].render_view(theme);
    }
  }
  handle_message(message: AlertBoxMessage | WindowMessage, data: any): boolean {
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

