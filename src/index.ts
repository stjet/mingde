import { Layer, Window, WindowManager } from './mingde/wm.js';
import { DesktopBackground } from './mingde/desktop_background.js';

let wm = new WindowManager("canvas-container");

wm.set_layers([new Layer(this, "desktop"), new Layer(this, "windows"), new Layer(this, "taskbar")]);

wm.layers[0].add_member(new DesktopBackground());

wm.layers[1].add_member(new Window([300, 200], [50, 50]));

wm.render();
