import { StartMenu, ApplicationCategories } from './start_menu.js';
import { AlertBox } from './windows/alert_box.js';
import { Settings } from './windows/settings.js';
import { Minesweeper } from './windows/minesweeper.js';

export type Registry = Record<string, [any, any[], string, ApplicationCategories | "none", string]>;

export const registry: Registry = {
  "start-menu": [StartMenu, [], "Start Menu", "none", "start-menu"],
  "alert-box": [AlertBox, [], "Alert Box", "none", "alert-box"],
  "settings": [Settings, [[300, 200]], "Settings", ApplicationCategories.System, "settings"],
  "minesweeper": [Minesweeper, [], "Minesweeper", ApplicationCategories.Games, "minesweeper"],
};

