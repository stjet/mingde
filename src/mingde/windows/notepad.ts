import { VerticalScrollable } from '../vertical_scrollable.js';
import { WindowMessage } from '../wm.js';
import { Themes } from '../themes.js';

enum NotepadMessage {
  //
}

//open existing file or create new
//will need to ask for permission
//then just a textbox (new component?)

export class Notepad extends VerticalScrollable<NotepadMessage> {
  //

  constructor(size: [number, number]) {
    super(size, "Notepad", size[1], "notepad");
    //
  }
  render_view(_theme: Themes) {
    //
  }
  handle_message(message: NotepadMessage | WindowMessage, data: any): boolean {
    return super.handle_message(message, data);
  }
}

