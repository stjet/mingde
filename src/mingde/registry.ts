import { StartMenu, ApplicationCategories } from './start_menu.js';
import { AlertBox } from './windows/alert_box.js';
import { AllowBox } from './windows/allow_box.js';
import { Settings } from './windows/settings.js';
import { Minesweeper } from './windows/minesweeper.js';
import { Reversi } from './windows/reversi.js';
import { Bag } from './windows/bag.js';
import { Shortcuts } from './windows/shortcuts.js';
import { Terminal } from './windows/terminal.js';
import { Calculator } from './windows/calculator.js';
import { ImageViewer } from './windows/image_viewer.js';
import { Notepad } from './windows/notepad.js';
import { Malvim } from './windows/malvim.js';
import { Exporter } from './windows/exporter.js';
import { Help } from './windows/help.js';

export interface Permission {
  change_theme?: boolean;
  change_settings?: boolean;
  open_windows?: boolean;
  change_desktop_background?: boolean;
  read_all_file_system?: boolean;
  read_usr_file_system?: boolean;
  read_prg_file_system?: boolean;
  write_all_file_system?: boolean;
  write_usr_file_system?: boolean;
  write_prg_file_system?: boolean;
  snapshot_system?: boolean;
}

export type READ_FILE_SYSTEM_PERMISSIONS = `read_${string}_file_system`;

export type WRITE_FILE_SYSTEM_PERMISSIONS = `write_${string}_file_system`;

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
  "calculator": {
    class: Calculator,
    args: [],
    display_name: "Calculator",
    category: ApplicationCategories.Utils,
    name: "calculator",
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
  "image_viewer": {
    class: ImageViewer,
    args: [[300, 200]],
    display_name: "Image Viewer",
    category: ApplicationCategories.Media,
    name: "image_viewer",
  },
  "notepad": {
    class: Notepad,
    args: [[375, 300]],
    display_name: "Notepad",
    category: ApplicationCategories.Editing,
    name: "notepad",
  },
  "malvim": {
    class: Malvim,
    args: [[375, 300]],
    display_name: "Malvim",
    category: ApplicationCategories.Editing,
    name: "malvim",
  },
  "exporter": {
    class: Exporter,
    args: [[300, 200]],
    display_name: "Exporter",
    category: ApplicationCategories.Misc,
    name: "exporter",
  },
  "help": {
    class: Help,
    args: [[300, 200]],
    display_name: "Help",
    category: "none",
    name: "help",
  },
};

