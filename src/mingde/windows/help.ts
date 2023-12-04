import { VerticalScrollableWithFocus } from '../vertical_scrollable.js';

enum HelpMessage {
  //
}

//different tabs: basics, permissions, shortcuts, settings, malvim, game rules, yu scripting, image files

export class Help extends VerticalScrollableWithFocus<HelpMessage> {
  //
  constructor(size: [number, number]) {
    super(size, "Help", size[1], "help");
    //
  }
  //
}

