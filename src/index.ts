import { Layer, Window, WindowManager } from './mingde/wm.js';
import { DesktopBackground } from './mingde/desktop_background.js';

let wm = new WindowManager("canvas-container");

wm.set_layers([new Layer(wm, "desktop"), new Layer(wm, "windows", true), new Layer(wm, "taskbar")]);

wm.layers[0].add_member(new DesktopBackground(), [0, 0]);

wm.layers[1].add_member(new Window([300, 200], "Title"), [50, 50]);

wm.layers[1].add_member(new Window([300, 200], "Test 123"), [350, 250]);

wm.render();
