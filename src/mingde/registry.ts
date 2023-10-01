import { StartMenu } from './start_menu.js';

export type Registry = Record<string, [any, any[]]>;

export const registry: Registry = {
  "start-menu": [StartMenu, []],
};

