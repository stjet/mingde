import { Layer, WindowManager } from './mingde/wm.js';
import { DesktopBackground } from './mingde/desktop_background.js';
import { Taskbar } from './mingde/taskbar.js';
import { registry } from './mingde/registry.js';
import { TASKBAR_HEIGHT, SCALE, DEFAULT_WM_SETTINGS } from './mingde/constants.js';

declare global {
  interface Window { __TAURI__: any; }
}

//is this needed? idk. meant to make wm not a global var or something, not sure if it actually matters
(() => {
  let wm = new WindowManager(registry, {}, DEFAULT_WM_SETTINGS, true);

  wm.set_layers([new Layer(wm, "desktop"), new Layer(wm, "windows", true), new Layer(wm, "taskbar")]);

  wm.layers[2].add_member(new Taskbar(registry), [0, document.body.clientHeight - TASKBAR_HEIGHT / SCALE]);

  wm.layers[0].add_member(new DesktopBackground(), [0, 0]);

  if (registry.terminal) {
    wm.layers[1].add_member(new registry.terminal.class(...registry.terminal.args), [300, 150]);
  }
  
  wm.render_stop = false;

  wm.render();
})();

