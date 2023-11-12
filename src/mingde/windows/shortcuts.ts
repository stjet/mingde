import { VerticalScrollable } from '../vertical_scrollable.js';
import { SHORTCUTS } from '../mutables.js';
import { FONT_SIZES, FONT_NAME, SCALE, WINDOW_TOP_HEIGHT } from '../constants.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';

const margin: number = 10;

enum ShortcutsMessage {
  //
}

export class Shortcuts extends VerticalScrollable<ShortcutsMessage> {
  constructor(size: [number, number]) {
    const entire_height: number = margin * 2 + (Object.keys(SHORTCUTS).length + 1) * (FONT_SIZES.NORMAL / SCALE + 3);
    super(size, "Shortcuts", entire_height, "shortcuts");
  }
  render_view(theme: Themes) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    this.entire_context.font = `${FONT_SIZES.NORMAL}px ${FONT_NAME}`;
    this.entire_context.fillStyle = theme_info.text_primary;
    this.entire_context.textBaseline = "bottom";
    for (let i = 0; i < Object.keys(SHORTCUTS).length; i++) {
      this.entire_context.fillText(`${Object.keys(SHORTCUTS)[i]}: ${Object.values(SHORTCUTS)[i].map((k) => "alt+" + k).join(", ")}`, margin, WINDOW_TOP_HEIGHT + margin + (FONT_SIZES.NORMAL + 3 * SCALE) * (i + 1));
    }
    super.render_view(theme);
  }
}

