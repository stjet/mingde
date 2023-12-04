import { WindowMessage, Layer, FocusableComponent } from '../wm.js';
import { VerticalScrollableWithFocus } from '../vertical_scrollable.js';
import { Themes } from '../themes.js';
import { WindowRequest } from '../requests.js';
import { ValidationState } from '../utils.js';
import { isFocusableComponent, isKeyboardEvent, isMouseEvent, isTextInput, isTextBox } from '../guards.js';
import { WINDOW_TOP_HEIGHT, SCALE, FONT_SIZES, SCROLLBAR_WIDTH } from '../constants.js';
import { Path } from '../fs.js';

import { TextInput } from '../components/text_input.js';
import { Button } from '../components/button.js';
import { TextBox, DEFAULT_LINE_HEIGHT_EXTRA } from '../components/text_box.js';

enum NotepadMessage {
  //
}

const margin: number = 7;

//open existing file or create new
//will need to ask for permission
//then just a textbox (new component?)

export class Notepad extends VerticalScrollableWithFocus<NotepadMessage> {
  private current_path: Path;

  constructor(size: [number, number], path?: Path) {
    super(size, "Notepad", size[1], "notepad");
    this.layers = [new Layer(this, "open_top"), new Layer(this, "edit_top", false, true), new Layer(this, "text", false, true)];
    //open/create a new file
    this.layers[0].add_members(
      {
        member: new TextInput(this, "/path/to/file", [margin, WINDOW_TOP_HEIGHT / SCALE + margin], "NORMAL", 150, path),
      },
      {
        member: new Button(this, "Edit", [165, WINDOW_TOP_HEIGHT / SCALE + margin], 50, 3, () => {
          //read contents of text input's path if exists, if not, make sure parent exists then create the file
          if (!isTextInput<NotepadMessage | WindowMessage>(this.layers[0].members[0])) return;
          let text_input: TextInput<NotepadMessage | WindowMessage> = this.layers[0].members[0];
          const input_value: string = text_input.value;
          if (!input_value.startsWith("/")) {
            text_input.valid = ValidationState.Invalid;
            return;
          }
          const parent_path: Path = `/${input_value.split("/").slice(0, -1).join("/").slice(1)}`;
          const parent_response = this.send_request(WindowRequest.ReadFileSystem, {
            permission_type: "read_all_file_system",
            path: parent_path,
          });
          if (typeof parent_response === "undefined") {
            //parent does not exist
            text_input.valid = ValidationState.Invalid;
            return;
          }
          const response = this.send_request(WindowRequest.ReadFileSystem, {
            permission_type: "read_all_file_system",
            path: `/${input_value.slice(1)}`, //this is dumb but whatever, type validation
          });
          if (typeof response === "object" || typeof response === "undefined") {
            //cannot be directory
            text_input.valid = ValidationState.Invalid;
            return;
          }
          //the text box
          if (isTextBox(this.layers[2].members[0])) {
            text_input.valid = ValidationState.Valid;
            this.layers[2].members[0].value = response;
          }
          this.current_path = `/${input_value.slice(1)}`;
          this.layers[0].hide = true;
          this.layers[1].hide = false;
          this.layers[2].hide = false;
          this.focus_index = undefined;
        }, undefined, undefined, undefined, true),
      },
      {
        member: new Button(this, "Create and Edit", [160 + 60, WINDOW_TOP_HEIGHT / SCALE + margin], 100, 3, () => {
          //read contents of text input's path if exists, if not, make sure parent exists then create the file
          if (!isTextInput<NotepadMessage | WindowMessage>(this.layers[0].members[0])) return;
          let text_input: TextInput<NotepadMessage | WindowMessage> = this.layers[0].members[0];
          const input_value: string = text_input.value;
          if (!input_value.startsWith("/")) {
            text_input.valid = ValidationState.Invalid;
            return;
          }
          const parent_path: Path = `/${input_value.split("/").slice(0, -1).join("/").slice(1)}`;
          const parent_response = this.send_request(WindowRequest.ReadFileSystem, {
            permission_type: "read_all_file_system",
            path: parent_path,
          });
          if (typeof parent_response === "undefined") {
            //parent does not exist
            text_input.valid = ValidationState.Invalid;
            return;
          }
          const response = this.send_request(WindowRequest.ReadFileSystem, {
            permission_type: "read_all_file_system",
            path: `/${input_value.slice(1)}`, //this is dumb but whatever, type validation
          });
          if (typeof response === "object" || response === "string") {
            //cannot be directory
            text_input.valid = ValidationState.Invalid;
            return;
          }
          const create_response = this.send_request(WindowRequest.WriteFileSystem, {
            permission_type: "write_all_file_system",
            path: `/${input_value.slice(1)}`,
            content: "", 
          });
          if (!create_response) {
            text_input.valid = ValidationState.Invalid;
            return;
          }
          //the text box
          if (isTextBox(this.layers[2].members[0])) {
            text_input.valid = ValidationState.Valid;
            this.layers[2].members[0].value = "";
          }
          this.current_path = `/${input_value.slice(1)}`;
          this.layers[0].hide = true;
          this.layers[1].hide = false;
          this.layers[2].hide = false;
          this.focus_index = undefined;
        }, undefined, undefined, undefined, true),
      },
      //
    );
    //once opened, can see edit actions, eg save
    this.layers[1].add_members(
      {
        member: new Button(this, "Save", [margin, WINDOW_TOP_HEIGHT / SCALE + margin], 50, 3, () => {
          let text_box = this.layers[2].members[0];
          if (isTextBox(text_box)) {
            this.send_request(WindowRequest.WriteFileSystem, {
              permission_type: "write_all_file_system",
              path: this.current_path,
              content: text_box.value,
            });
          }
        }, undefined, undefined, undefined, true),
      },
    );
    this.layers[2].add_member(new TextBox(this, [margin, WINDOW_TOP_HEIGHT / SCALE + margin + 25], "NORMAL", this.size[0] / SCALE - margin * 2 - SCROLLBAR_WIDTH));
    //
  }
  render_view(theme: Themes) {
    let components = this.components;
    for (let j = 0; j < components.length; j++) {
      components[j].render_view(theme, this.entire_context);
    }
    super.render_view(theme);
  }
  handle_message(message: NotepadMessage | WindowMessage, data: any): boolean {
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
      let focused_text_inputs: TextInput<NotepadMessage | WindowMessage>[] = this.components.filter((c): c is FocusableComponent<NotepadMessage | WindowMessage> => isFocusableComponent(c)).filter((c): c is TextInput<NotepadMessage | WindowMessage> => c.type === "text-input" && c.focused && !relevant_components.includes(c));
      if (focused_text_inputs.length > 0) {
        this.do_rerender = true;
        focused_text_inputs.forEach((c) => c.unfocus());
      }
    } else if (message === WindowMessage.KeyDown && isKeyboardEvent(data)) {
      if ((data.key.length === 1 || data.key === "Backspace" || data.key.startsWith("Arrow")) && !data.altKey) {
        let focused_input_or_box = this.components.filter((c): c is FocusableComponent<NotepadMessage | WindowMessage> => isFocusableComponent(c)).find((c) => (c.type === "text-input" || c.type === "text-box") && c.focused);
        if (focused_input_or_box) {
          focused_input_or_box.handle_message(message, data);
          this.do_rerender = true;
        } else {
          //not quite the best thing to do but whatever
          this.do_rerender = super.handle_message(message, data);
        }
      } else {
        this.do_rerender = super.handle_message(message, data);
      }
      let text_box = this.layers[2].members[0];
      if (isTextBox(text_box)) {
        const min_entire_height: number = WINDOW_TOP_HEIGHT + margin * SCALE * 3 + 25 * SCALE + text_box.line_pos * text_box.line_height;
        this.entire_height = min_entire_height > this.size[1] ? min_entire_height : this.size[1];
        this.entire_canvas.height = this.entire_height;
        this.scroll_y = this.entire_height - this.size[1];
      }
    } else if (message === WindowMessage.WindowResize) {
      let text_box = this.layers[2].members[0];
      if (!isTextBox<NotepadMessage>(text_box)) return;
      text_box.max_width = this.size[0] - SCROLLBAR_WIDTH - margin * SCALE;
      text_box.lines = text_box.calculate_lines();
      //I thought there was some bug here but couldn't reproduce
      const min_entire_height: number = WINDOW_TOP_HEIGHT + margin * SCALE * 2 + text_box.lines.length * (FONT_SIZES.NORMAL + DEFAULT_LINE_HEIGHT_EXTRA);
      if (min_entire_height > this.scroll_y + this.size[1]) {
        //if the height of all the content is smaller than the current scroll position + window height,
        //make sure the canvas height is still enough to fit all the content
        this.entire_height = min_entire_height;
        this.entire_canvas.height = this.entire_height;
      } else {
        //if the height of all the content is smaller than the current scroll position + window height,
        //expand the canvas height (so bottom will have black colour even if there is no content there)
        this.entire_height = this.scroll_y + this.size[1];
        this.entire_canvas.height = this.entire_height;
      }
      return super.handle_message(message, data); //will return `true`
    } else {
      this.do_rerender = super.handle_message(message, data);
    }
    //
    return this.do_rerender;
  }
}

