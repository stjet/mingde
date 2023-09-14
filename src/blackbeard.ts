// TODO: order in rendering needs to be easily changed, layers, maybe?

export type CanvasEventHandler = (event: Event) => void;

export interface Component {
  update(): void;
  type: string;
}

export class Canvas {
  size: number[];
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  components: Component[];
  events: { [event_name: string]: Component[]; };
  event_functions: { [event_name: string]: CanvasEventHandler; };
  frame: number;

  constructor(size: number[], id: string, parent: HTMLElement | undefined = undefined, contextOptions: any = undefined) {
    this.size = size;
    this.canvas = document.createElement("CANVAS") as HTMLCanvasElement;
    this.canvas.id = id;
    this.canvas.width = size[0];
    this.canvas.height = size[1];
    this.canvas.tabIndex = 1;
    if (!parent) {
      document.body.appendChild(this.canvas);
    } else {
      parent.appendChild(this.canvas);
    }
    this.context = this.canvas.getContext('2d', contextOptions)! as CanvasRenderingContext2D;
    this.components = [];
    this.events = {};
    //this.event_functions is not meant to be read. internal use only
    this.event_functions = {};
    this.frame = 0;
  }
  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  update() {
    this.frame += 1;
    this.clear();
    //copy array beforehand so removals during the loop don't cause problems
    let components_copy: Component[] = this.components.slice();
    for (let i=0; i < components_copy.length; i++) {
      components_copy[i].update();
    }
  }
  reset() {
    this.components = [];
    document.body.style.cursor = "default";
    //dont forget to remove all event listeners
    for (let i=0; i < Object.keys(this.event_functions).length; i++) {
      let event = Object.keys(this.event_functions)[i];
      let event_function = this.event_functions[event];
      this.canvas.removeEventListener(event, event_function);
    }
    this.event_functions = {};
    this.events = {};
  }
  addEvent(event: string, objects: Component[], overwrite: boolean = false) {
    //prevent overwriting
    let self = this;
    function canvasEventHandler(e: Event) {
      self.clearDeadEvents();
      let event_items = self.events[event];
      if (!event_items) {
        return;
      }
      for (let i=0; i < event_items.length; i++) {
        let component = event_items[i];
        component[event](e);
      }
      //disable right click menu?
      if (e.type === "contextmenu" || e.type === "scroll") {
        return false;
      }
    }
    if (this.events[event] && !overwrite) {
      this.events[event].push(...objects);
    } else if (!this.events[event]) {
      this.events[event] = objects;
      //to make sure multiple event listeners arent added, only add the listener the first time addEvent() is called for event, after a reset/start. simplified; we only need one event listener per event, prevent there being multiple
      //add components to the event separately
      this.canvas.addEventListener(event, canvasEventHandler);
      this.event_functions[event] = canvasEventHandler;
    } else {
      this.events[event] = objects;
    }
  }
  //when components no longer exist, get rid of the events for them too
  clearDeadEvents() {
    for (let i=0; i < Object.keys(this.events).length; i++) {
      let event_name = Object.keys(this.events)[i];
      for (let j=0; j < this.events[event_name].length; j++) {
        let obj = this.events[event_name][j];
        //if component no longer exists
        if (!this.components.includes(obj)) {
          this.events[event_name].splice(j, 1);
        }
      }
    }
  }
}
