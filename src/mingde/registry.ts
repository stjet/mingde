import { StartMenu } from './start_menu.js';

import { AlertBox } from './windows/alert_box.js';

export type Registry = Record<string, [any, any[]]>;

export const registry: Registry = {
  "start-menu": [StartMenu, []],
  "alert-box": [AlertBox, []],
};

