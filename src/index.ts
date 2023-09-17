import { Layer, WindowManager } from './mingde/wm.js';

let wm = new WindowManager([document.body.clientWidth, document.body.clientHeight], [new Layer("desktop"), new Layer("windows"), new Layer("taskbar")], "canvas-container");
