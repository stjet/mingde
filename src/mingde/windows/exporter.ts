import { WindowWithFocus, WindowMessage, Layer } from '../wm.js';
import { WindowRequest } from '../requests.js';
import { Themes } from '../themes.js';
import { WINDOW_TOP_HEIGHT, SCALE, FONT_SIZES } from '../constants.js';
import { isTextInput, isFocusableComponent, isKeyboardEvent } from '../guards.js';
import { ValidationState } from '../utils.js';

import { Button } from '../components/button.js';
import { TextInput } from '../components/text_input.js';
import { TextLine } from '../components/text_line.js';

const margin: number = 10;

enum ExporterMessage {
  //
}

export class Exporter extends WindowWithFocus<ExporterMessage> {
  //
  constructor(size: [number, number]) {
    super(size, "Exporter", "exporter");
    this.layers = [new Layer(this, "body")];
    const top_y: number = margin + WINDOW_TOP_HEIGHT / SCALE;
    this.layers[0].add_members(
      {
        member: new TextLine(this, "Download a specific file/directory:", [margin, top_y + FONT_SIZES.NORMAL / SCALE], "text_primary", "NORMAL", undefined, true, false),
      },
      {
        member: new TextInput(this, "/path/to/location", [margin, top_y + FONT_SIZES.NORMAL / SCALE + 5], "NORMAL", 150),
      },
      {
        member: new Button(this, "Export File/Directory", [margin * 2 + 150, top_y + FONT_SIZES.NORMAL / SCALE + 5], 125, 3, () =>{
          //get file path
          let text_input = this.layers[0].members[1];
          if (isTextInput(text_input)) {
            const input_value: string = text_input.value;
            if (!input_value.startsWith("/")) {
              text_input.valid = ValidationState.Invalid;
              return;
            }
            //read file path
            const response = this.send_request(WindowRequest.ReadFileSystem, {
              permission_type: "read_all_file_system",
              path: `/${input_value.slice(1)}`,
            });
            if (typeof response === "undefined") {
              //
            } else {
              const response_str: string = typeof response === "string" ? response : JSON.stringify(response);
              //download file or director
              if (window.__TAURI__) {
                const save_path = window.__TAURI__.dialog.save(); //probably put in some arguments
                window.__TAURI__.fs.writeTextFile(save_path, response_str);
              } else {
                const blob: Blob = new Blob([response_str], { type: "text/plain" });
                const download: HTMLAnchorElement = document.createElement("A") as HTMLAnchorElement;
                download.href = URL.createObjectURL(blob);
                download.download = input_value.split("/")[input_value.split("/").length - 1];
                document.body.appendChild(download);
                download.click();
                download.remove();
              }
            }
          }
        }, undefined, undefined, undefined, true),
      },
      {
        member: new TextLine(this, "Download the entire file system:", [margin, top_y + FONT_SIZES.NORMAL * 3 / SCALE + 15], "text_primary", "NORMAL", undefined, true, false),
      },
      {
        member: new Button(this, "Export All", [margin, top_y + FONT_SIZES.NORMAL * 3 / SCALE + 20], 75, 3, () => {
          const response = this.send_request(WindowRequest.ReadFileSystem, {
            permission_type: "read_all_file_system",
            path: "/",
          });
          if (typeof response === "undefined") {
            //
          } else {
            //download everything
            //
            if (window.__TAURI__) {
              const save_path = window.__TAURI__.dialog.save(); //probably put in some arguments
              window.__TAURI__.fs.writeTextFile(save_path, JSON.stringify(response));
            } else {
              const blob: Blob = new Blob([JSON.stringify(response)], { type: "text/plain" });
              const download: HTMLAnchorElement = document.createElement("A") as HTMLAnchorElement;
              download.href = URL.createObjectURL(blob);
              download.download = "all.json";
              document.body.appendChild(download);
              download.click();
              download.remove();
            }
          }
        }, undefined, undefined, undefined, true),
      }
    );
    //
  }
  render_view(theme: Themes) {
    let components = this.components;
    for (let j = 0; j < components.length; j++) {
      components[j].render_view(theme);
    }
  }
  handle_message(message: ExporterMessage | WindowMessage, data: any): boolean {
    if (message === WindowMessage.KeyDown && isKeyboardEvent(data)) {
      if ((data.key.length === 1 || data.key === "Backspace" || data.key === "ArrowLeft" || data.key === "ArrowRight") && !data.altKey) {
        let focused_text_input = this.layers[0].members[1];
        if (isFocusableComponent(focused_text_input)) {
          if (focused_text_input.focused) {
            focused_text_input.handle_message(message, data);
            this.do_rerender = true;
          }
        }
      } else {
        this.do_rerender = super.handle_message(message, data);
      }
    } else {
      this.do_rerender = super.handle_message(message, data);
    }
    return this.do_rerender;
  }
}

