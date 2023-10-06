//requests are messages but propogate up from windowlike to wm
export enum WindowRequest {
  CloseWindow = "CloseWindow", //or windowlike
  OpenWindow = "OpenWindow", //or windowlike
  FocusWindow = "FocusWindow",
  ChangeCursor = "ChangeCursor",
  ChangeCoords = "ChangeCoords",
}

//should be extended if requests need additional values, eg, OpenWindow request needs to know what window to open
export interface WindowRequestValue {
  id?: string; //window id, optional but actually guaranteed to exist because layer puts it on
  layer_name?: string; //same as above except layer the window is in
  trusted?: boolean;
}

export interface OpenWindowValue extends WindowRequestValue {
  name: string; //name of windowlike type, see registry.ts
  open_layer_name: string; //layer to open the windowlike in
  unique: boolean; //if true, do not open window if already exists
  coords_offset?: [number, number]; //optionally, specify the new windowlike's coords, relative to the windowlike that opened it
  sub_size_x?: boolean,
  sub_size_y?: boolean,
  args?: any[],
}

export interface FocusWindowValue extends WindowRequestValue {
  new_focus: string, //id of window to focus on
}

//probably shouldn't be in this file?
export enum CursorType {
  Default = "default",
  Move = "move",
  ColResize = "col-resize",
  RowResize = "row-resize",
}

export interface ChangeCursorValue extends WindowRequestValue {
  new_cursor: CursorType;
}

export interface ChangeCoordsValue extends WindowRequestValue {
  delta_coords: [number, number];
  stick_bottom?: boolean;
  stick_right?: boolean;
}

export interface WindowRequestValues {
  [WindowRequest.CloseWindow]: WindowRequestValue,
  [WindowRequest.OpenWindow]: OpenWindowValue,
  [WindowRequest.FocusWindow]: FocusWindowValue,
  [WindowRequest.ChangeCursor]: ChangeCursorValue,
  [WindowRequest.ChangeCoords]: ChangeCoordsValue,
}

