import { StartMenu, ApplicationCategories } from './start_menu.js';
import { AlertBox } from './windows/alert_box.js';
import { AllowBox } from './windows/allow_box.js';
import { Settings } from './windows/settings.js';
import { Minesweeper } from './windows/minesweeper.js';
import { Reversi } from './windows/reversi.js';
import { Shortcuts } from './windows/shortcuts.js';
import { Terminal } from './windows/terminal.js';
import { Bag } from './windows/bag.js';

export interface Permission {
  change_theme?: boolean;
  change_settings?: boolean;
  open_windows?: boolean;
  read_all_file_system?: boolean;
  read_usr_file_system?: boolean;
  read_prg_file_system?: boolean;
}

export type FILE_SYSTEM_PERMISSIONS = "read_all_file_system" | "read_usr_file_system" | "read_prg_file_system";

export type Permissions = Record<string, Permission>;

export interface Register {
  class: any;
  args: any[];
  display_name: string;
  category: ApplicationCategories | "none";
  name: string;
};

export type Registry = Record<string, Register>;

export const registry: Registry = {
  "start-menu": {
    class: StartMenu,
    args: [],
    display_name: "Start Menu",
    category: "none",
    name: "start-menu",
  },
  "alert-box": {
    class: AlertBox,
    args: [],
    display_name: "Alert Box",
    category: "none",
    name: "alert-box",
  },
  "allow-box": {
    class: AllowBox,
    args: [],
    display_name: "Allow Box",
    category: "none",
    name: "allow-box",
  },
  "terminal": {
    class: Terminal,
    args: [[300, 200]],
    display_name: "Terminal",
    category: ApplicationCategories.Utils,
    name: "terminal",
  },
  "settings": {
    class: Settings,
    args: [[300, 200]],
    display_name: "Settings",
    category: ApplicationCategories.System,
    name: "settings",
  },
  "shortcuts": {
    class: Shortcuts,
    args: [[300, 200]],
    display_name: "Shortcuts",
    category: ApplicationCategories.System,
    name: "shortcuts",
  },
  "minesweeper": {
    class: Minesweeper,
    args: [],
    display_name: "Minesweeper",
    category: ApplicationCategories.Games,
    name: "minesweeper",
  },
  "reversi": {
    class: Reversi,
    args: [],
    display_name: "Reversi",
    category: ApplicationCategories.Games,
    name: "reversi",
  },
  "bag": {
    class: Bag,
    args: [],
    display_name: "Bag",
    category: ApplicationCategories.Games,
    name: "bag",
  },
};

