export const VERSION: string = "wip";
export const SCALE: number = 2; //increase resolution of canvas
export const WINDOW_TOP_HEIGHT: number = 25 * SCALE;
export const TASKBAR_HEIGHT: number = 38 * SCALE;
export const START_MENU_SIZE: [number, number] = [175 * SCALE, 250 * SCALE];
export const START_MENU_VWIDTH: number = (42 - 5) * SCALE; //width of the vertical strip
export const FONT_NAME: string = "Times New Roman";
export const WINDOW_MIN_DIMENSIONS: [number, number] = [100 * SCALE, 100 * SCALE];
export const FONT_SIZES: Record<string, number> = {
  HEADING: 20 * SCALE,
  TOP: 16 * SCALE,
  BUTTON: 16 * SCALE,
  NORMAL: 13 * SCALE,
};

export type Shortcut = "close-window" | "start-menu" | `switch-${number}`;

//all are alt+
export let SHORTCUTS: Record<Shortcut, string[]> = {
  "close-window": ["w", "q"],
  "start-menu": ["Control"],
  "switch-0": ["1"],
  "switch-1": ["2"],
  "switch-2": ["3"],
  "switch-3": ["4"],
  "switch-4": ["5"],
  "switch-5": ["6"],
  "switch-6": ["7"],
  "switch-7": ["8"],
  "switch-8": ["9"],
  "switch-9": ["0"],
};

export const CONFIG = {
  DEBUG: {
    REQUESTS: true, //todo: fine grain by request type
  },
  LOGS: {
    RERENDERS: true,
  },
  HIGHLIGHT_BUTTONS: true, //enable highlight button's highlights (can cause a lot of rerenders)
  GRADIENTS: true,
  DEFAULT_BACKGROUND: "#008080",
  MINGDE_YELLOW: "#FFC90E",
  MINGDE_YELLOW_2: "#E1DB4D",
  OVERRIDE_BROWSER_SHORTCUTS: true,
};
