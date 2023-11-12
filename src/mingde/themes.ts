
//hex solid colour, or image
export type HexColor = `#${string}`;
export type DesktopBackgroundValue = HexColor | HTMLImageElement;

export enum Themes {
  Standard = "Standard",
  Night = "Night",
  Forest = "Forest",
  Attention = "Attention",
  Industrial = "Industrial",
  Traffic = "Traffic",
  Binary = "Binary",
  Royal = "Royal",
  Reef = "Reef",
}

export const THEMES_LIST: Themes[] = [Themes.Standard, Themes.Night, Themes.Forest, Themes.Attention, Themes.Industrial, Themes.Traffic, Themes.Binary, Themes.Royal, Themes.Reef];

export interface ThemeInfo {
  top: string;
  text_primary: string;
  text_top: string;
  highlight: string;
  text_highlight: string;
  background: string;
  alt_background: string; //used for terminal
  alt_text: string; //used for terminal
  border_left_top: string;
  border_right_bottom: string;
}

export const THEME_INFOS: { [theme_type: string]: ThemeInfo } = {
  [Themes.Standard]: {
    top: "#000080",
    text_primary: "black",
    text_top: "white",
    highlight: "blue",
    text_highlight: "white",
    background: "#c0c0c0",
    alt_background: "black",
    alt_text: "white",
    border_left_top: "white",
    border_right_bottom: "black",
  },
  [Themes.Night]: {
    top: "black",
    text_primary: "white",
    text_top: "white",
    highlight: "blue",
    text_highlight: "white",
    background: "#222222",
    alt_background: "black",
    alt_text: "white",
    border_left_top: "white",
    border_right_bottom: "black",
  },
  [Themes.Forest]: {
    top: "green",
    text_primary: "black",
    text_top: "white",
    highlight: "limegreen",
    text_highlight: "white",
    background: "#c0c0c0",
    alt_background: "black",
    alt_text: "white",
    border_left_top: "white",
    border_right_bottom: "black",
  },
  [Themes.Attention]: {
    top: "red",
    text_primary: "black",
    text_top: "white",
    highlight: "red",
    text_highlight: "white",
    background: "#c0c0c0",
    alt_background: "black",
    alt_text: "white",
    border_left_top: "white",
    border_right_bottom: "black",
  },
  [Themes.Industrial]: {
    top: "#282828",
    text_primary: "black",
    text_top: "white",
    highlight: "gray",
    text_highlight: "white",
    background: "#a0a0a0",
    alt_background: "black",
    alt_text: "white",
    border_left_top: "white",
    border_right_bottom: "black",
  },
  [Themes.Traffic]: {
    top: "#ff8c00",
    text_primary: "black",
    text_top: "#2a3439",
    highlight: "yellow",
    text_highlight: "#554348",
    background: "#ffffd8",
    alt_background: "black",
    alt_text: "white",
    border_left_top: "#b2b3b5",
    border_right_bottom: "black",
  },
  [Themes.Binary]: {
    top: "white",
    text_primary: "white",
    text_top: "black",
    highlight: "white",
    text_highlight: "black",
    background: "black",
    alt_background: "black",
    alt_text: "white",
    border_left_top: "white",
    border_right_bottom: "white",
  },
  [Themes.Royal]: {
    top: "purple",
    text_primary: "black",
    text_top: "white",
    highlight: "purple",
    text_highlight: "white",
    background: "#c0c0c0",
    alt_background: "black",
    alt_text: "white",
    border_left_top: "white",
    border_right_bottom: "black",
  },
  [Themes.Reef]: {
    top: "#7fffd4",
    text_primary: "black",
    text_top: "black",
    highlight: "#808000",
    text_highlight: "black",
    background: "#c0c0c0",
    alt_background: "black",
    alt_text: "white",
    border_left_top: "white",
    border_right_bottom: "black",
  },
  //
};
