import { FocusableComponent, WindowLike, WindowMessage } from '../wm.js';
import { Themes } from '../themes.js';
import { SCALE, FONT_SIZES } from '../constants.js';

//tab buttons

export interface TabInfo {
  name: string;
  //show or unshow the stuff associated with the tab
  show: () => void;
  unshow: () => void;
}

export class Tabs<MessageType> implements FocusableComponent<MessageType> {
  readonly type: string = "tabs";
  clickable: boolean = true;

  id: string;
  readonly parent: WindowLike<MessageType | WindowMessage>;

  coords: [number, number];
  size: [number, number];
  tab_width: number;
  spacing: number; //spacing in between tabs
  padding_y: number;
  tab_infos: TabInfo[];

  selected_index: number;

  focused: boolean;

  constructor(parent: WindowLike<MessageType | WindowMessage>, coords: [number, number], tab_width: number, spacing: number, padding_y: number, tab_infos: TabInfo[], selected_index: number = 0) {
    this.id = `${parent.id}-${this.type}-random-${Math.floor(Math.random() * 10000)}`; //dumb, but placeholder, kinda
    this.parent = parent;
    //
    this.coords = [coords[0] * SCALE, coords[1] * SCALE];
    this.tab_width = tab_width * SCALE;
    this.spacing = spacing * SCALE;
    this.padding_y = padding_y * SCALE;
    this.tab_infos = tab_infos;
    this.size = [this.tab_width * this.tab_infos.length + this.spacing * (this.tab_infos.length - 1), FONT_SIZES.BUTTON + this.padding_y * 2];
    this.selected_index = selected_index;
    //
  }
  render_view(_theme: Themes, _context: CanvasRenderingContext2D = this.parent.context) {
    //
  }
  focus(): boolean {
    if (!this.focused) {
      this.focused = true;
      return true;
    } else {
      return false;
    }
  }
  unfocus(): boolean {
    if (this.focused) {
      this.focused = false;
      return true;
    } else {
      return false;
    }
  }
  handle_message(_message: MessageType | WindowMessage, _data: any): boolean {
    //
    return false;
  }
}

