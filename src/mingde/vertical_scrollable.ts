import { Window, WindowMessage, Component, FocusableComponent } from './wm.js';
import { isWheelEvent, isMouseEvent, isFocusableComponent, isKeyboardEvent } from './guards.js';
import { Themes, ThemeInfo, THEME_INFOS } from './themes.js';
import { SCROLLBAR_WIDTH, WINDOW_TOP_HEIGHT, SCALE, SCROLLBAR_BUTTON_HEIGHT, FONT_SIZES, SCROLL_DISTANCE } from './constants.js';
import { Alignment, Button } from './components/button.js';

//currently not compatible with components since this.context should be this.entire_context. I have an idea to fix this

//actions that classes that extend this window might find useful
export enum VerticalScrollableMessage {
  ScrollTo, //data is number
  ScrollDown, //data is number
  ScrollUp, //data is number
  //
}

export class VerticalScrollable<MessageType> extends Window<VerticalScrollableMessage | MessageType> {
  entire_height: number;
  entire_canvas: HTMLCanvasElement;
  entire_context: CanvasRenderingContext2D;
  scroll_y: number;
  scroll_components: Component<VerticalScrollableMessage | MessageType | WindowMessage>[];

  constructor(size: [number, number], title: string, entire_height: number, window_type: string = "", resizable: boolean = true) {
    super(size, title, window_type, resizable);
    this.entire_height = entire_height * SCALE;
    this.entire_canvas = document.createElement("CANVAS") as HTMLCanvasElement;
    this.entire_canvas.width = this.size[0];
    this.entire_canvas.height = this.entire_height;
    this.entire_context = this.entire_canvas.getContext("2d");
    this.scroll_y = 0;
    this.scroll_components = [
      new Button(this, "▲", [this.size[0] / SCALE - SCROLLBAR_WIDTH / SCALE, WINDOW_TOP_HEIGHT / SCALE], SCROLLBAR_WIDTH / SCALE, (SCROLLBAR_BUTTON_HEIGHT - FONT_SIZES.BUTTON_SMALL) / SCALE / 2, () => {
        this.scroll_y = (this.scroll_y - SCROLL_DISTANCE) < 0 ? 0 : this.scroll_y - SCROLL_DISTANCE;
      }, true, false, Alignment.Centre, true),
      new Button(this, "\u{25BC}", [this.size[0] / SCALE - SCROLLBAR_WIDTH / SCALE, this.size[1] / SCALE - SCROLLBAR_BUTTON_HEIGHT / SCALE], SCROLLBAR_WIDTH / SCALE, (SCROLLBAR_BUTTON_HEIGHT - FONT_SIZES.BUTTON_SMALL) / SCALE / 2, () => {
        this.scroll_y = (this.scroll_y + SCROLL_DISTANCE) > this.entire_height - this.size[1] ? this.entire_height - this.size[1] : this.scroll_y + SCROLL_DISTANCE;
      }, true, false, Alignment.Centre, true),
    ];
    //
  }
  //meant to be called by super by classes extending it (after all drawing operations)
  render_view(theme: Themes) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    //recreate the scroll components (ew method below)
    this.scroll_components = [
      new Button(this, "▲", [this.size[0] / SCALE - SCROLLBAR_WIDTH / SCALE, WINDOW_TOP_HEIGHT / SCALE], SCROLLBAR_WIDTH / SCALE, (SCROLLBAR_BUTTON_HEIGHT - FONT_SIZES.BUTTON_SMALL) / SCALE / 2, () => {
        this.scroll_y = (this.scroll_y - SCROLL_DISTANCE) < 0 ? 0 : this.scroll_y - SCROLL_DISTANCE;
      }, true, false, Alignment.Centre, true),
      new Button(this, "\u25BC", [this.size[0] / SCALE - SCROLLBAR_WIDTH / SCALE, this.size[1] / SCALE - SCROLLBAR_BUTTON_HEIGHT / SCALE], SCROLLBAR_WIDTH / SCALE, (SCROLLBAR_BUTTON_HEIGHT - FONT_SIZES.BUTTON_SMALL) / SCALE / 2, () => {
        this.scroll_y = (this.scroll_y + SCROLL_DISTANCE) > this.entire_height - this.size[1] ? this.entire_height - this.size[1] : this.scroll_y + SCROLL_DISTANCE;
      }, true, false, Alignment.Centre, true),
    ];
    //draw the section of the canvas in view
    this.context.drawImage(this.entire_canvas, 0, this.scroll_y, this.size[0], this.size[1], 0, 0, this.size[0], this.size[1]);
    //draw scrollbar
    if (this.size[1] < this.entire_height) {
      //draw scrollbar background
      let scrollbar_path: Path2D = new Path2D();
      scrollbar_path.rect(this.size[0] - SCROLLBAR_WIDTH, WINDOW_TOP_HEIGHT, SCROLLBAR_WIDTH, this.size[1] - WINDOW_TOP_HEIGHT);
      this.context.strokeStyle = theme_info.border_right_bottom;
      this.context.stroke(scrollbar_path);
      this.context.fillStyle = theme_info.background;
      this.context.fill(scrollbar_path);
      //up and down buttons
      for (let i = 0; i < this.scroll_components.length; i++) {
        this.scroll_components[i].render_view(theme);
      }
      //draw the location on the page on the scrollbar
      const SCROLL_SECTION_HEIGHT: number = this.size[1] - WINDOW_TOP_HEIGHT - 2 * SCROLLBAR_BUTTON_HEIGHT; //height of the scroll section of scrollbar
      let top_y: number = this.scroll_y / this.entire_height * SCROLL_SECTION_HEIGHT + WINDOW_TOP_HEIGHT + SCROLLBAR_BUTTON_HEIGHT;
      let bottom_y: number = (this.scroll_y + this.size[1]) / this.entire_height * SCROLL_SECTION_HEIGHT + WINDOW_TOP_HEIGHT + SCROLLBAR_BUTTON_HEIGHT;
      let inside: Path2D = new Path2D();
      inside.rect(this.size[0] - SCROLLBAR_WIDTH, top_y, SCROLLBAR_WIDTH, bottom_y - top_y);
      this.context.stroke(inside);
      //
    }
    this.entire_context.clearRect(0, 0, this.entire_canvas.width, this.entire_canvas.height);
  }
  //meant to be called by super by classes extending it
  handle_message(message: VerticalScrollableMessage | MessageType | WindowMessage, data: any): boolean {
    if (message === WindowMessage.Wheel && isWheelEvent(data)) {
      this.scroll_y += data.deltaY;
      if (this.scroll_y < 0) {
        this.scroll_y = 0;
      } else if (this.scroll_y > this.entire_height - this.size[1]) {
        this.scroll_y = this.entire_height - this.size[1];
      }
      this.do_rerender = true;
    } else if (message === WindowMessage.MouseDown && isMouseEvent(data)) {
      if (data.clientX > this.size[0] - SCROLLBAR_WIDTH && data.clientY > WINDOW_TOP_HEIGHT) {
        let relevant_components = this.scroll_components.filter((c) => {
          return data.clientX > c.coords[0] && data.clientY > c.coords[1] && data.clientX < c.coords[0] + c.size[0] && data.clientY < c.coords[1] + c.size[1] && c.clickable;
        });
        relevant_components.forEach((c) => c.handle_message(message, data));
        if (relevant_components.length > 0) {
          this.do_rerender = true;
        }
        //dragging the inside bar thing?
        //
      }
    } else if (message === WindowMessage.GenericShortcut) {
      if (data === "up") {
        this.scroll_y = (this.scroll_y - SCROLL_DISTANCE) < 0 ? 0 : this.scroll_y - SCROLL_DISTANCE;
        this.do_rerender = true;
      } else if (data === "down") {
        this.scroll_y = (this.scroll_y + SCROLL_DISTANCE) > this.entire_height - this.size[1] ? this.entire_height - this.size[1] : this.scroll_y + SCROLL_DISTANCE;
        this.do_rerender = true;
      }
    } else if (message === WindowMessage.WindowResize) {
      //extending classes are expected to deal with height and stuff
      this.entire_canvas.width = this.size[0];
      this.do_rerender = true;
    } else if (message === VerticalScrollableMessage.ScrollTo && typeof data === "number") {
      this.scroll_y = data;
      if (this.scroll_y < 0) {
        this.scroll_y = 0;
      } else if (this.scroll_y > this.entire_height - this.size[1]) {
        this.scroll_y = this.entire_height - this.size[1];
      }
      this.do_rerender = true;
    } else if (message === VerticalScrollableMessage.ScrollUp && typeof data === "number") {
      this.scroll_y = (this.scroll_y - data) < 0 ? 0 : this.scroll_y - data;
      this.do_rerender = true;
    } else if (message === VerticalScrollableMessage.ScrollDown && typeof data === "number") {
      this.scroll_y = (this.scroll_y + data) > this.entire_height - this.size[1] ? this.entire_height - this.size[1] : this.scroll_y + data;
      this.do_rerender = true;
    }
    //
    return this.do_rerender;
  }
}

export class VerticalScrollableWithFocus<MessageType> extends VerticalScrollable<MessageType> {
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
      } else {
        //calls vertical scrollable
        this.do_rerender = super.handle_message(message, data);
      }
    } else {
      //calls vertical scrollable
      this.do_rerender = super.handle_message(message, data);
    }
    return this.do_rerender;
  }
}

