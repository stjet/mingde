import { Themes } from "./themes.js";

//maybe these should all just be inlined instead of in this file?

export function isKeyboardEvent(event: any): event is KeyboardEvent {
  return event instanceof KeyboardEvent;
}

export function isMouseEvent(event: any): event is MouseEvent {
  return event instanceof MouseEvent;
}

export function isWheelEvent(event: any): event is WheelEvent {
  return event instanceof WheelEvent;
}

export function isUIEvent(event: any): event is UIEvent {
  return event instanceof UIEvent;
}

export function isThemes(theme: any): theme is Themes[keyof Themes] {
  return Object.values(Themes).includes(theme);
}
