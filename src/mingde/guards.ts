import { WindowLikeType } from "./wm.js";
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

export function isThemes(maybe_theme: any): maybe_theme is Themes[keyof Themes] {
  return Object.values(Themes).includes(maybe_theme);
}

//typescript doesn't autodetect that render_view_window exists on Window? idk why, hope this doesn't cause any problems
export function isWindow(maybe_window: any): maybe_window is Window & { render_view_window: (theme: Themes) => void } {
  if (maybe_window.type === WindowLikeType.Window) return true;
  return false;
}
