//like constants.ts but not constants

export type Shortcut = "close-window" | "fullscreen-window" | "start-menu" | `switch-${number}` | "cycle-left" | "cycle-right";

//all are alt+
export let SHORTCUTS: Record<Shortcut, string[]> = {
  "close-window": ["w", "q"],
  "fullscreen-window": ["f"],
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
};

export interface WindowManagerSettings {
  shortcuts: boolean; //keyboard shortcuts enabled/disabled
  //
}

