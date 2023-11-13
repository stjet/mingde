import { WindowChangeEvent, WindowLike, WindowLikeType, WindowManager, FocusableComponent } from './wm.js';
import { DesktopBackgroundValue, Themes, THEMES_LIST, HexColor } from './themes.js';
import { OpenWindowValue, ChangeCursorValue, ChangeCoordsValue, ChangeDesktopBackgroundValue, FocusWindowValue, ChangeThemeValue, ChangeSettingsValue, ReadFileSystemValue, WriteFileSystemValue, RemoveFileSystemValue, CursorType } from './requests.js';
import { DesktopTime } from './utils.js';
import { SETTINGS_KEYS } from './mutables.js';
import { ValidationState, hex_chars } from './utils.js';
import type { TextInput } from './components/text_input.js';
import type { Icon } from './components/icon.js';

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

export function isFocusableComponent<MessageType>(maybe_focusable): maybe_focusable is FocusableComponent<MessageType> {
  if (typeof maybe_focusable?.focused === "boolean" && typeof maybe_focusable?.focus === "function" && typeof maybe_focusable?.unfocus === "function") return true;
  return false;
}

export function isTextInput<MessageType>(maybe_text_input: any): maybe_text_input is TextInput<MessageType> {
  if (maybe_text_input?.type === "text-input" && typeof maybe_text_input?.value === "string" && maybe_text_input?.valid in ValidationState) return true;
  return false;
}

export function isIcon<MessageType>(maybe_icon: any): maybe_icon is Icon<MessageType> {
  if (maybe_icon?.type === "icon") return true;
  return false;
}

export function hasText(maybe_has_text: any): maybe_has_text is { text: string } {
  if (typeof maybe_has_text?.text === "string") return true;
  return false;
}

/*
//unused
export function hasLines(maybe_has_lines: any): maybe_has_lines is { lines: string[] } {
  if (Array.isArray(maybe_has_lines?.lines) && maybe_has_lines?.lines?.every((line) => typeof line === "string")) return true;
  return false;
}

export function isParagraph(maybe_paragraph: any): maybe_paragraph is { calculate_lines: () => string[], lines: string[] } {
  if (typeof maybe_paragraph?.calculate_lines === "function" && hasLines(maybe_paragraph)) return true;
  return false;
}
*/

export function isImage(maybe_image: any): maybe_image is HTMLImageElement {
  return maybe_image instanceof HTMLImageElement;
}

export function isHexColor(maybe_color: any): maybe_color is HexColor {
  return typeof maybe_color === "string" && maybe_color.startsWith("#") && maybe_color.length === 7 && maybe_color.slice(1).split("").every((c) => hex_chars.includes(c.toUpperCase()));
}

export function isDesktopBackgroundValue(maybe_desktop_bg: any): maybe_desktop_bg is DesktopBackgroundValue {
  if (maybe_desktop_bg) {
    //so its not the strongest type guard... but good enough, hopefully?
    if (isImage(maybe_desktop_bg) || isHexColor(maybe_desktop_bg)) {
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
  const settings = maybe_change_settings.changed_settings;
  for (let i = 0; i < Object.keys(settings).length; i++) {
    let found_index: number = SETTINGS_KEYS.findIndex((k) => k[0] === Object.keys(settings)[i]);
    if (found_index === -1) return false; //non-settings key not found
    //check type
    if (typeof Object.values(settings)[i] !== SETTINGS_KEYS[found_index][1]) return false;
  }
  return true;
}

export function isChangeDesktopBackgroundValue(maybe_change_desktop: any): maybe_change_desktop is ChangeDesktopBackgroundValue {
  if (isDesktopBackgroundValue(maybe_change_desktop?.new_info)) return true;
  return false;
}

export function isReadFileSystemValue(maybe_read_file_system: any): maybe_read_file_system is ReadFileSystemValue {
  if (!maybe_read_file_system?.permission_type.startsWith("read_") || !maybe_read_file_system?.permission_type.endsWith("_file_system") || typeof maybe_read_file_system?.path !== "string") return false;
  if (!maybe_read_file_system?.path.startsWith('/')) return false;
  return true;
}

export function isWriteFileSystemValue(maybe_write_file_system: any): maybe_write_file_system is WriteFileSystemValue {
  if (!maybe_write_file_system?.permission_type.startsWith("write_") || !maybe_write_file_system?.permission_type.endsWith("_file_system") || typeof maybe_write_file_system?.path !== "string" || (typeof maybe_write_file_system?.content !== "string" && typeof maybe_write_file_system?.content !== "object")) return false;
  if (!maybe_write_file_system?.path.startsWith('/')) return false;
  return true;
}

export function isRemoveFileSystemValue(maybe_remove_file_system: any): maybe_remove_file_system is RemoveFileSystemValue {
  if (!maybe_remove_file_system?.permission_type.startsWith("write_") || !maybe_remove_file_system?.permission_type.endsWith("_file_system") || typeof maybe_remove_file_system?.path !== "string") return false;
  if (!maybe_remove_file_system?.path.startsWith('/')) return false;
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

