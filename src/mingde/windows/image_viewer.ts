import { WindowMessage, Component, FocusableComponent } from '../wm.js';
import { VerticalScrollableWithFocus } from '../vertical_scrollable.js';
import { Themes } from '../themes.js';
import { WINDOW_TOP_HEIGHT, SCALE, SCROLLBAR_WIDTH } from '../constants.js';
import { WindowRequest } from '../requests.js';
import { isFocusableComponent, isKeyboardEvent, isMouseEvent, isTextInput, isIcon } from '../guards.js';
import { ValidationState } from '../utils.js';
import { Path } from '../fs.js';

import { TextInput } from '../components/text_input.js';
import { Button } from '../components/button.js';
import { Icon } from '../components/icon.js';

enum ImageViewerMessage {
  ImageLoaded,
  //
}

export class ImageViewer extends VerticalScrollableWithFocus<ImageViewerMessage> {
  private _components: Component<ImageViewerMessage | WindowMessage>[];
  image?: HTMLImageElement;

  //path to default to, user still needs to click the button though
  constructor(size: [number, number], path?: Path) {
    super(size, "Image Viewer", size[1], "image_viewer");
    this._components = [
      new TextInput(this, "/path/to/file.image", [5, WINDOW_TOP_HEIGHT / SCALE + 5], "NORMAL", 150, path),
      new Button(this, "View", [160, WINDOW_TOP_HEIGHT / SCALE + 5], 75, 3, () => {
        if (!isTextInput<ImageViewerMessage | WindowMessage>(this.components[0])) return;
        let text_input: TextInput<ImageViewerMessage | WindowMessage> = this.components[0];
        const input_value: string = text_input.value;
        if (!input_value.startsWith("/")) {
          text_input.valid = ValidationState.Invalid;
          return;
        }
        const response = this.send_request(WindowRequest.ReadFileSystem, {
          permission_type: "read_all_file_system",
          path: `/${input_value.slice(1)}`, //this is dumb but whatever, type validation
        });
        if (typeof response === "undefined" || (!response.startsWith("/") && !response.startsWith("externfs:"))) {
          text_input.valid = ValidationState.Invalid;
          return;
        }
        if (!isIcon<ImageViewerMessage | WindowMessage>(this.components[2])) return;
        let icon: Icon<ImageViewerMessage | WindowMessage> = this.components[2];
        icon.image = new Image();
        if (response.startsWith("externfs:") && window.__TAURI__) {
          //binary
          window.__TAURI__.fs.readBinaryFile(response.split(":").slice(1).join(":"), {
            dir: window.__TAURI__.fs.BaseDirectory.AppLocalData, //.local/share/dev.prussia.mingde
          }).then((png_bytes) => {
            icon.image.src = URL.createObjectURL(
              new Blob([png_bytes.buffer], { type: "image/png" }),
            );
          });
        } else {
          icon.image.src = response;
        }
        const image_width: number = this.size[0] - 10 * SCALE - SCROLLBAR_WIDTH / SCALE;
        icon.size = [image_width, (icon.image.height / icon.image.width) * image_width || 1];
        this.entire_height = WINDOW_TOP_HEIGHT + 30 * SCALE + icon.size[1] + 5;
        this.entire_canvas.height = this.entire_height;
        text_input.valid = ValidationState.Valid;
        icon.image.onload = () => {
          this.handle_message(ImageViewerMessage.ImageLoaded, true);
        };
      }, undefined, undefined, undefined, true),
      new Icon(this, [5, WINDOW_TOP_HEIGHT / SCALE + 30], [0, 0], undefined),
    ];
    //
  }
  get components(): Component<ImageViewerMessage | WindowMessage>[] {
    return this._components;
  }
  render_view(theme: Themes) {
    let components = this.components;
    for (let j = 0; j < components.length; j++) {
      components[j].render_view(theme, this.entire_context);
    }
    super.render_view(theme);
  }
  handle_message(message: ImageViewerMessage | WindowMessage, data: any): boolean {
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
      let focused_text_inputs: TextInput<ImageViewerMessage | WindowMessage>[] = this.components.filter((c): c is FocusableComponent<ImageViewerMessage | WindowMessage> => isFocusableComponent(c)).filter((c): c is TextInput<ImageViewerMessage | WindowMessage> => c.type === "text-input" && c.focused && !relevant_components.includes(c));
      if (focused_text_inputs.length > 0) {
        this.do_rerender = true;
        focused_text_inputs.forEach((c) => c.unfocus());
      }
    } else if (message === WindowMessage.KeyDown && isKeyboardEvent(data)) {
      if ((data.key.length === 1 || data.key === "Backspace" || data.key === "ArrowLeft" || data.key === "ArrowRight") && !data.altKey) {
        let focused_text_input = this.components[0];
        if (isFocusableComponent(focused_text_input)) {
          if (focused_text_input.focused) {
            focused_text_input.handle_message(message, data);
            this.do_rerender = true;
          }
        }
      } else {
        this.do_rerender = super.handle_message(message, data);
      }
    } else if (message === WindowMessage.WindowResize) {
      if (!isIcon<ImageViewerMessage | WindowMessage>(this.components[2])) return;
      let icon: Icon<ImageViewerMessage | WindowMessage> = this.components[2];
      if (icon.image) {
        const image_width: number = this.size[0] - 10 * SCALE - SCROLLBAR_WIDTH / SCALE
        icon.size = [image_width, (icon.image.height / icon.image.width) * image_width || 1];
        this.entire_height = WINDOW_TOP_HEIGHT + 30 * SCALE + icon.size[1] + 5;
        this.entire_canvas.height = this.entire_height;
      }
      this.do_rerender = super.handle_message(message, data); //will return `true`
    } else if (message === ImageViewerMessage.ImageLoaded) {
      let icon: Icon<ImageViewerMessage | WindowMessage> = this.components[2];
      if (icon.image) {
        const image_width: number = this.size[0] - 10 * SCALE - SCROLLBAR_WIDTH / SCALE;
        icon.size = [image_width, (icon.image.height / icon.image.width) * image_width]; // || 1];
        this.entire_height = WINDOW_TOP_HEIGHT + 30 * SCALE + icon.size[1] + 5;
        this.entire_canvas.height = this.entire_height;
      }
      this.do_rerender = true;
    } else {
      this.do_rerender = super.handle_message(message, data);
    }
    return this.do_rerender;
  }
}

