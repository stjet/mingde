//requests are messages but propogate up from windowlike to wm
export enum WindowRequest {
  CloseWindow = "CloseWindow",
}

//should be extended if requests need additional values, eg, OpenWindow request needs to know what window to open
export interface WindowRequestValue {
  id?: string, //window id, optional but actually guaranteed to exist because layer puts it on
  layer_name?: string, //same as above except layer the window is in
};

export interface WindowRequestValues {
  [WindowRequest.CloseWindow]: WindowRequestValue,
}

