//requests are messages but propogate up from windowlike to wm
export enum WindowRequest {
  CloseWindow = "CloseWindow",
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
  [WindowRequest.FocusWindow]: FocusWindowValue,
  [WindowRequest.ChangeCursor]: ChangeCursorValue,
  [WindowRequest.ChangeCoords]: ChangeCoordsValue,
}

