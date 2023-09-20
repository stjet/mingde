export enum DesktopBackgroundTypes {
  Solid = "Solid", //solid colour
}

export interface DesktopBackgroundValues {
  [DesktopBackgroundTypes.Solid]: string,
}

export type DesktopBackgroundInfo<T extends DesktopBackgroundTypes> = [T, DesktopBackgroundValues[T]];

export enum Themes {
  Standard = "Standard",
}

export interface ThemeInfo {
  top: string,
  text_primary: string,
  text_top: string,
  background: string,
  background_indent: string,
  border_left_top: string,
  border_right_bottom: string,
}

export const THEME_INFOS: { [theme_type: string]: ThemeInfo } = {
  [Themes.Standard]: {
    top: "#000080",
    text_primary: "black",
    text_top: "white",
    background: "#c0c0c0",
    background_indent: "#e0e0e0",
    border_left_top: "white",
    border_right_bottom: "black",
  },
};
