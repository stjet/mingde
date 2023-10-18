import { WindowChangeEvent, WindowLike, WindowLikeType, WindowManager } from './wm.js';
import { DesktopBackgroundTypes, DesktopBackgroundInfo, Themes, THEMES_LIST } from './themes.js';
import { OpenWindowValue, ChangeCursorValue, ChangeCoordsValue, FocusWindowValue, ChangeThemeValue, ChangeSettingsValue, CursorType } from './requests.js';
import { DesktopTime } from './utils.js';
import { SETTINGS_KEYS } from './mutables.js';

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

export function isWindowChangeEvent(event: any): event is WindowChangeEvent {
  return typeof event?.detail?.id === "string" && typeof event?.detail?.title === "string";
}

/*
export function isUIEvent(event: any): event is UIEvent {
  return event instanceof UIEvent;
}
*/

export function isCoords(maybe_coords: any): maybe_coords is [number, number] {
  if (typeof maybe_coords?.[0] === "number" && typeof maybe_coords?.[1] === "number" && maybe_coords?.length === 2) return true;
  return false;
}

export function hasText(maybe_has_text: any): maybe_has_text is { text: string } {
  if (typeof maybe_has_text?.text === "string") return true;
  return false;
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

export function isDesktopTime(maybe_desktop_time: any): maybe_desktop_time is DesktopTime {
  if (maybe_desktop_time?.hours >= 0 && maybe_desktop_time?.hours < 24 && maybe_desktop_time?.minutes >= 0 && maybe_desktop_time?.minutes < 60) return true;
  return false;
}

export function isThemes(maybe_theme: any): maybe_theme is Themes[keyof Themes] {
  return Object.values(Themes).includes(maybe_theme);
}

export function isChangeCursorValue(maybe_change_cursor: any): maybe_change_cursor is ChangeCursorValue {
  if (Object.values(CursorType).includes(maybe_change_cursor?.new_cursor)) return true;
  return false;
}

export function isFocusWindowValue(maybe_focus_window: any): maybe_focus_window is FocusWindowValue {
  if (typeof maybe_focus_window?.new_focus === "string") return true;
  return false;
}

export function isChangeCoordsValue(maybe_change_coords: any): maybe_change_coords is ChangeCoordsValue {
  if (Number(maybe_change_coords?.delta_coords?.[0]) !== undefined && Number(maybe_change_coords?.delta_coords?.[1]) !== undefined && maybe_change_coords?.delta_coords.length === 2) return true;
  return false;
}

export function isOpenWindowValue(maybe_open_window: any): maybe_open_window is OpenWindowValue {
  if (maybe_open_window?.coords_offset) {
    if (!Array.isArray(maybe_open_window.coords_offset) && maybe_open_window.coords_offset.length === 2 && typeof maybe_open_window.coords_offset[0] === "number" && typeof maybe_open_window.coords_offset[1] === "number") return false;
  }
  if (typeof maybe_open_window?.name === "string" && typeof maybe_open_window?.open_layer_name === "string" && typeof maybe_open_window?.unique === "boolean") return true;
  return false;
}

export function isChangeThemeValue(maybe_change_theme: any): maybe_change_theme is ChangeThemeValue {
  if (THEMES_LIST.includes(maybe_change_theme?.new_theme)) return true;
  return false;
}

export function isChangeSettingsValue(maybe_change_settings: any): maybe_change_settings is ChangeSettingsValue {
  if (!maybe_change_settings?.changed_settings) return false;
  let settings = maybe_change_settings.changed_settings;
  for (let i = 0; i < Object.keys(settings).length; i++) {
    let found_index: number = SETTINGS_KEYS.findIndex((k) => k[0] === Object.keys(settings)[i]);
    if (found_index === -1) return false; //non-settings key not found
    //check type
    if (typeof Object.values(settings)[i] !== SETTINGS_KEYS[found_index][1]) return false;
  }
  return true;
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
  return false;
}

export function isWindowManager(maybe_wm: any): maybe_wm is WindowManager {
  if (maybe_wm?.type === "window-manager") return true;
  return false;
}

