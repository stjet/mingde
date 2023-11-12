import { Window, WindowMessage } from '../wm.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';
import { SCALE, WINDOW_TOP_HEIGHT } from '../constants.js';

//import { Button } from '../components/button.js';

enum CalculatorOperation {
  Add,
  Sub,
  Mul,
  Div,
  None,
}

enum CalculatorMessage {
  //
}

const calculator_size: number = 240;
const margin: number = 15;

export class Calculator extends Window<CalculatorMessage> {
  current_total: number;
  current_operation: CalculatorOperation;
  current_value: string;

  constructor() {
    super([calculator_size, calculator_size + WINDOW_TOP_HEIGHT / SCALE], "Calculator", "calculator");
    this.resizable = false;
    this.current_total = 0;
    this.current_operation = CalculatorOperation.None;
    this.current_value = "";
    //
  }
  render_view(theme: Themes) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    //calc display
    this.context.fillStyle = theme_info.border_left_top;
    this.context.fillRect(margin * SCALE, WINDOW_TOP_HEIGHT + margin * SCALE, this.size[0] - margin * SCALE * 2, 24 * SCALE);
    //calc display bottom right input double layer
    this.context.lineWidth = 1 * SCALE;
    this.context.strokeStyle = theme_info.background;
    let display_bottom_right_first = new Path2D();
    display_bottom_right_first.moveTo(margin * SCALE, WINDOW_TOP_HEIGHT + (margin + 24 - 1) * SCALE);
    display_bottom_right_first.lineTo(this.size[0] - (margin + 1) * SCALE, WINDOW_TOP_HEIGHT + (margin + 24 - 1) * SCALE);
    display_bottom_right_first.lineTo(this.size[0] - (margin + 1) * SCALE, WINDOW_TOP_HEIGHT + margin * SCALE);
    this.context.stroke(display_bottom_right_first);
    this.context.strokeStyle = theme_info.border_left_top;
    let display_bottom_right_second = new Path2D();
    display_bottom_right_second.moveTo(margin * SCALE, WINDOW_TOP_HEIGHT + (margin + 24) * SCALE);
    display_bottom_right_second.lineTo(this.size[0] - margin * SCALE, WINDOW_TOP_HEIGHT + (margin + 24) * SCALE);
    display_bottom_right_second.lineTo(this.size[0] - margin * SCALE, WINDOW_TOP_HEIGHT + margin * SCALE);
    this.context.stroke(display_bottom_right_second);
    //
    //calc display top right input
    this.context.lineWidth = 2 * SCALE;
    this.context.strokeStyle = theme_info.border_right_bottom;
    let display_top_left = new Path2D();
    display_top_left.moveTo(margin * SCALE, WINDOW_TOP_HEIGHT + (margin + 24) * SCALE);
    display_top_left.lineTo(margin * SCALE, WINDOW_TOP_HEIGHT + margin * SCALE);
    display_top_left.lineTo(this.size[0] - margin * SCALE, WINDOW_TOP_HEIGHT + margin * SCALE);
    this.context.stroke(display_top_left);
    //
  }
  handle_message(_message: CalculatorMessage | WindowMessage, _data: any): boolean {
    //
    return this.do_rerender;
  }
}

