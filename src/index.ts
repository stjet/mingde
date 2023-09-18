import { Layer, Window, WindowManager } from './mingde/wm.js';

let wm = new WindowManager([new Layer("desktop"), new Layer("windows"), new Layer("taskbar")], "canvas-container");

wm.layers[1].add_member(new Window([300, 200], [50, 50]));

wm.render();
