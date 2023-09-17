export enum Themes {
  Standard = "Standard",
}

export interface ThemeInfo {
  top: string,
  text_primary: string,
  text_top: string,
  background: string,
  background_indent: string,
}

export const ThemeInfos: { [theme_type: string]: ThemeInfo } = {
  [Themes.Standard]: {
    top: "#000080",
    text_primary: "black",
    text_top: "white",
    background: "#c0c0c0",
    background_indent: "#e0e0e0",
  },
};
