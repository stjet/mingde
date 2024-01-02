import type { WindowManagerSettings } from './mutables.js';

export const VERSION: string = "wip";
export const SCALE: number = 2; //increase resolution of canvas
export const WINDOW_TOP_HEIGHT: number = 25 * SCALE;
export const TASKBAR_HEIGHT: number = 38 * SCALE;
export const START_MENU_SIZE: [number, number] = [175 * SCALE, 250 * SCALE];
export const START_MENU_VWIDTH: number = (42 - 5) * SCALE; //width of the vertical strip
export const SCROLLBAR_WIDTH: number = 15 * SCALE;
export const SCROLLBAR_BUTTON_HEIGHT: number = 15 * SCALE;
export const SCROLL_DISTANCE: number = 5 * SCALE;
export const RESIZE_STEP: number = 5 * SCALE
export const FONT_NAME: string = "Times New Roman";
export const FONT_NAME_MONO: string = "Hack, Consolas, monaco, monospace";
export const WINDOW_MIN_DIMENSIONS: [number, number] = [100 * SCALE, 100 * SCALE];
export const WINDOW_DEFAULT_DIMENSIONS: [number, number] = [300 * SCALE, 200 * SCALE]; //mostly applies when toggling fullscreen
export const FONT_SIZES: Record<string, number> = {
  HEADING: 20 * SCALE,
  TOP: 16 * SCALE,
  BUTTON: 16 * SCALE,
  BUTTON_SMALL: 13 * SCALE,
  NORMAL: 13 * SCALE,
};

export const DEFAULT_WM_SETTINGS: WindowManagerSettings = {
  shortcuts: true,
};

export const CONFIG = {
  DEBUG: {
    REQUESTS: true, //todo: fine grain by request type
    GAMES: false, //games debug, currently only used by bag
  },
  LOGS: {
    RERENDERS: true,
  },
  YU: {
    VAR_SET_QUIET: true,
  },
  HIGHLIGHT_BUTTONS: true, //enable highlight button's highlights (can cause a lot of rerenders)
  SHADOWS: true,
  GRADIENTS: true,
  DEFAULT_BACKGROUND: "#008080",
  MINGDE_YELLOW: "#FFC90E",
  MINGDE_YELLOW_2: "#E1DB4D",
  OVERRIDE_BROWSER_SHORTCUTS: true,
};
