import { Layer, Window, WindowManager } from './mingde/wm.js';
import { DesktopBackground } from './mingde/desktop_background.js';
import { Taskbar } from './mingde/taskbar.js';
import { TASKBAR_HEIGHT, SCALE } from './mingde/constants.js';

let wm = new WindowManager("canvas-container", true);

wm.set_layers([new Layer(wm, "desktop"), new Layer(wm, "windows", true), new Layer(wm, "taskbar")]);

wm.layers[2].add_member(new Taskbar(), [0, document.body.clientHeight - TASKBAR_HEIGHT / SCALE]);

//wm.layers[3].add_member(new StartMenu(), [0, document.body.clientHeight - TASKBAR_HEIGHT / SCALE - START_MENU_SIZE[0] / SCALE]);

wm.layers[0].add_member(new DesktopBackground(), [0, 0]);

wm.layers[1].add_member(new Window([300, 200], "Title"), [50, 50]);

wm.layers[1].add_member(new Window([300, 200], "Test 123"), [975, 10]);

wm.layers[1].add_member(new Window([300, 200], "Test 123"), [350, 250]);

wm.layers[1].add_member(new Window([300, 200], "Test 123 asdf long word wow so long much long yeehaw"), [700, 90]);

wm.layers[1].add_member(new Window([300, 200], "Test 123"), [600, 25]);

wm.layers[1].add_member(new Window([300, 200], "Test 123"), [190, 400]);

wm.layers[1].add_member(new Window([300, 200], "Test 123"), [930, 350]);

wm.layers[1].add_member(new Window([300, 200], "Test 123"), [540, 350]);

wm.layers[1].add_member(new Window([300, 200], "Test 123"), [30, 210]);

wm.layers[1].add_member(new Window([300, 200], "Test 123"), [469, 100]);

wm.render_stop = false;

wm.render();
