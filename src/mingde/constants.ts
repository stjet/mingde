export const VERSION: string = "wip";
export const SCALE: number = 2; //increase resolution of canvas
export const WINDOW_TOP_HEIGHT: number = 25 * SCALE;
export const TASKBAR_HEIGHT: number = 38 * SCALE;
export const START_MENU_SIZE: [number, number] = [175 * SCALE, 250 * SCALE];
export const START_MENU_VWIDTH: number = (42 - 5) * SCALE; //width of the vertical strip
export const FONT_NAME: string = "Times New Roman";
export const WINDOW_MIN_DIMENSIONS: [number, number] = [100 * SCALE, 100 * SCALE];
export let FONT_SIZES: Record<string, number> = {
  TOP: 16 * SCALE,
  BUTTON: 16 * SCALE,
  NORMAL: 13 * SCALE,
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
};
