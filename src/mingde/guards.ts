import { WindowLike, WindowLikeType, WindowManager } from './wm.js';
import { DesktopBackgroundTypes, DesktopBackgroundInfo, Themes } from './themes.js';
import { ChangeCursorValue, CursorType } from './requests.js';

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

export function isDesktopBackgroundInfo(maybe_desktop_bg_info: any): maybe_desktop_bg_info is DesktopBackgroundInfo<DesktopBackgroundTypes> {
  if (maybe_desktop_bg_info) {
    //so its not the strongest type guard... but good enough, hopefully?
    if (Object.values(DesktopBackgroundTypes).includes(maybe_desktop_bg_info?.[0]) && maybe_desktop_bg_info?.[1] !== undefined) {
      return true;
    }
  }
  return false;
}

export function isThemes(maybe_theme: any): maybe_theme is Themes[keyof Themes] {
  return Object.values(Themes).includes(maybe_theme);
}

export function isChangeCursorValue(maybe_change_cursor: any): maybe_change_cursor is ChangeCursorValue {
  if (Object.values(CursorType).includes(maybe_change_cursor?.new_cursor)) return true;
  return false;
}

//typescript doesn't autodetect that render_view_window exists on Window? idk why, hope this doesn't cause any problems
export function isWindow(maybe_window: any): maybe_window is Window {
  //instanceof Window doesn't work here, idk why
  if (maybe_window?.type === "window-like" && maybe_window?.sub_type === WindowLikeType.Window) return true;
  return false;
}

//probably should not be WindowLike<any>
export function isWindowLike(maybe_window_like: any): maybe_window_like is WindowLike<any> {
  if (maybe_window_like?.type === "window-like") return true;
  return false
}

export function isWindowManager(maybe_wm: any): maybe_wm is WindowManager {
  if (maybe_wm?.type === "window-manager") return true;
  return false;
}

