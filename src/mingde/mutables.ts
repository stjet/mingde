//like constants.ts but not constants

export type GenericShortcut = "up" | "down";
export type Shortcut = "close-window" | "fullscreen-toggle-window" | "start-menu" | `switch-${number}` | "cycle-left" | "cycle-right" | GenericShortcut;

//all are alt+
export let SHORTCUTS: Record<Shortcut, string[]> = {
  "close-window": ["w", "q"],
  "fullscreen-toggle-window": ["f"],
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
  "cycle-left": ["ArrowLeft"],
  "cycle-right": ["ArrowRight"],
  //generic (not linked to a specific global action if that makes sense) actions for windows to hear and stuff
  "up": ["ArrowUp"],
  "down": ["ArrowDown"],
};

export interface WindowManagerSettings {
  shortcuts: boolean; //keyboard shortcuts enabled/disabled
  //
}

export const SETTINGS_KEYS: [string, string][] = [["shortcuts", "boolean"]];

