import { Window, WindowMessage, Layer, Component } from '../wm.js';
import { SCALE, WINDOW_TOP_HEIGHT, FONT_NAME, FONT_SIZES } from '../constants.js';
import { Themes, ThemeInfo, THEME_INFOS } from '../themes.js';
import { isMouseEvent } from '../guards.js';
import { list_list_includes } from '../utils.js';
import { Background } from '../components/background.js';
import { TextLine } from '../components/text_line.js';
import { Button } from '../components/button.js';

enum MinesweeperMessage {
  NewGame, //hide modals, gen new tiles and stuff
}

interface TileInfo {
  is_mine: boolean;
  revealed: boolean;
  touching?: number; //mines touching it
};

//must be square
const minesweeper_size: number = 300;
const minesweeper_dimension: number = 12;
const margin: number = 5 * SCALE;
const button_margin: number = 3 * SCALE;
const tile_size: number = (minesweeper_size * SCALE - 2 * margin) / minesweeper_dimension;
const mines_count: number = 22;

export class Minesweeper extends Window<MinesweeperMessage> {
  private tiles: TileInfo[][];
  private first_click: boolean;
  private playing: boolean;

  constructor() {
    super([minesweeper_size, minesweeper_size + WINDOW_TOP_HEIGHT / SCALE], "Minesweeper", "minesweeper");
    this.resizable = false;
    this.first_click = true;
    this.playing = true;
    this.layers = [new Layer(this, "win", false, true), new Layer(this, "lose", false, true)];
    //add win and lose components
    this.context.font = `bold ${FONT_SIZES.HEADING}px ${FONT_NAME}`;
    let won_width: number = this.context.measureText("You Won").width / SCALE;
    this.layers[0].add_members(
      {
        member: new Background(this, "rgba(0, 0, 0, 0.5)", [0, WINDOW_TOP_HEIGHT / SCALE], [this.size[0] / SCALE, this.size[1] / SCALE]),
      },
      {
        member: new Background(this, undefined, [60, WINDOW_TOP_HEIGHT / SCALE + 60], [this.size[0] / SCALE - 120, this.size[1] / SCALE - WINDOW_TOP_HEIGHT / SCALE - 120]),
      },
      {
        member: new TextLine(this, "You Won", [this.size[0] / SCALE / 2 - won_width / 2, WINDOW_TOP_HEIGHT / SCALE + 120], "text_primary", "HEADING"),
      },
      {
        member: new Button(this, "Play again", [this.size[0] / SCALE / 2 - 50, this.size[1] / SCALE - 125], 100, 4, () => {
          this.handle_message(MinesweeperMessage.NewGame, true);
        }),
      },
    );
    let lost_width: number = this.context.measureText("You Lost").width / SCALE;
    this.layers[1].add_members(
      {
        member: new Background(this, "rgba(0, 0, 0, 0.5)", [0, WINDOW_TOP_HEIGHT / SCALE], [this.size[0] / SCALE, this.size[1] / SCALE]),
      },
      {
        member: new Background(this, undefined, [60, WINDOW_TOP_HEIGHT / SCALE + 60], [this.size[0] / SCALE - 120, this.size[1] / SCALE - WINDOW_TOP_HEIGHT / SCALE - 120]),
      },
      {
        member: new TextLine(this, "You Lost", [this.size[0] / SCALE / 2 - lost_width / 2, WINDOW_TOP_HEIGHT / SCALE + 120], "text_primary", "HEADING"),
      },
      {
        member: new Button(this, "Play again", [this.size[0] / SCALE / 2 - 50, this.size[1] / SCALE - 125], 100, 4, () => {
          this.handle_message(MinesweeperMessage.NewGame, true);
        }),
      },
    );
    this.tiles = Minesweeper.generate_tiles();
  }
  static generate_tiles(): TileInfo[][] {
    //decide where mines will go
    let mine_coords: [number, number][] = [];
    if (mines_count > minesweeper_dimension ** 2) {
      //`throw` stops execution right?
      throw Error("Cannot have more mines than tiles!");
    }
    for (let i = 0; i < mines_count; i++) {
      //careful!
      while (true) {
        let coord: [number, number] = [Math.floor(Math.random() * minesweeper_dimension), Math.floor(Math.random() * minesweeper_dimension)];
        if (!mine_coords.find((c) => c[0] === coord[0] && c[1] === coord[1])) {
          mine_coords.push(coord);
          break;
        }
      }
    }
    //generate tile info
    let tiles: TileInfo[][] = [];
    for (let row_num = 0; row_num < minesweeper_dimension; row_num++) {
      tiles.push([]);
      for (let col_num = 0; col_num < minesweeper_dimension; col_num++) {
        let is_mine: boolean = mine_coords.find((c) => c[0] === col_num && c[1] === row_num) ? true : false;
        if (is_mine) {
          tiles[row_num].push({
            is_mine,
            revealed: false,
          });
        } else {
          let touching: number = mine_coords.filter((c) => {
            //not a one liner for more readability
            if (c[1] === row_num - 1) {
              //the three on top
              if (c[0] === col_num - 1 || c[0] === col_num || c[0] === col_num + 1) {
                return true;
              }
            } else if (c[1] === row_num) {
              //the two to the left and right
              if (c[0] === col_num - 1 || c[0] === col_num + 1) {
                return true;
              }
            } else if (c[1] === row_num + 1) {
              //the three on bottom
              if (c[0] === col_num - 1 || c[0] === col_num || c[0] === col_num + 1) {
                return true;
              }
            }
            return false;
          }).length;
          tiles[row_num].push({
            is_mine,
            revealed: false,
            touching,
          });
        }
      }
    }
    return tiles;
  }
  get components(): Component<MinesweeperMessage | WindowMessage>[] {
    return this.layers.filter((layer) => !layer.hide).map((layer) => layer.members).flat();
  }
  render_view(theme: Themes) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    let text_widths: number[] = [];
    for (let t = 1; t <= 8; t++) {
      this.context.font = `bold ${FONT_SIZES.BUTTON}px ${FONT_NAME}`;
      text_widths.push(this.context.measureText(String(t)).width);
    }
    let left_top_border: Path2D = new Path2D();
    left_top_border.moveTo(0, WINDOW_TOP_HEIGHT);
    left_top_border.lineTo(0, this.size[1]);
    left_top_border.lineTo(margin, this.size[1] - margin);
    left_top_border.lineTo(margin, WINDOW_TOP_HEIGHT + margin);
    left_top_border.lineTo(this.size[0] - margin, WINDOW_TOP_HEIGHT + margin);
    left_top_border.lineTo(this.size[0], WINDOW_TOP_HEIGHT);
    left_top_border.lineTo(0, WINDOW_TOP_HEIGHT);
    this.context.fillStyle = "#808080";
    this.context.fill(left_top_border);
    let right_bottom_border: Path2D = new Path2D();
    right_bottom_border.moveTo(this.size[0], this.size[1]);
    right_bottom_border.lineTo(this.size[0], WINDOW_TOP_HEIGHT);
    right_bottom_border.lineTo(this.size[0] - margin, WINDOW_TOP_HEIGHT + margin);
    right_bottom_border.lineTo(this.size[0] - margin, this.size[1] - margin);
    right_bottom_border.lineTo(margin, this.size[1] - margin);
    right_bottom_border.lineTo(0, this.size[1]);
    right_bottom_border.lineTo(this.size[0], this.size[1]);
    this.context.fillStyle = "white";
    this.context.fill(right_bottom_border);
    //draw grid background
    this.context.fillStyle = theme_info.background;
    this.context.fillRect(margin, margin + WINDOW_TOP_HEIGHT, this.size[0] - 2 * margin, this.size[1] - WINDOW_TOP_HEIGHT - 2 * margin);
    //draw grid lines
    this.context.strokeStyle = "#808080";
    this.context.lineWidth = 2 * SCALE;
    //draw grid row lines
    for (let i = 1; i < minesweeper_dimension; i++) {
      let row_line: Path2D = new Path2D();
      row_line.moveTo(margin, WINDOW_TOP_HEIGHT + margin + tile_size * i);
      row_line.lineTo(this.size[0] - margin, WINDOW_TOP_HEIGHT + margin + tile_size * i);
      this.context.stroke(row_line);
    }
    //draw grid column lines
    for (let j = 1; j < minesweeper_dimension; j++) {
      let col_line: Path2D = new Path2D();
      col_line.moveTo(margin + tile_size * j, WINDOW_TOP_HEIGHT + margin);
      col_line.lineTo(margin + tile_size * j, this.size[1] - margin);
      this.context.stroke(col_line);
    }
    //draw mine stuff
    for (let row_num = 0; row_num < minesweeper_dimension; row_num++) {
      for (let col_num = 0; col_num < minesweeper_dimension; col_num++) {
        let tile: TileInfo = this.tiles[row_num][col_num];
        if (tile.revealed) {
          if (tile.is_mine) {
            //red X
            let x1: Path2D = new Path2D();
            x1.moveTo(col_num * tile_size + margin, WINDOW_TOP_HEIGHT + row_num * tile_size + margin);
            x1.lineTo((col_num + 1) * tile_size + margin, WINDOW_TOP_HEIGHT + (row_num + 1) * tile_size + margin);
            let x2: Path2D = new Path2D();
            x2.moveTo(col_num * tile_size + margin, WINDOW_TOP_HEIGHT + (row_num + 1) * tile_size + margin);
            x2.lineTo((col_num + 1) * tile_size + margin, WINDOW_TOP_HEIGHT + row_num * tile_size + margin);
            this.context.strokeStyle = "red";
            this.context.stroke(x1);
            this.context.stroke(x2);
          } else if (tile.touching > 0) {
            //write number
            let fill_color;
            switch (tile.touching) {
              case 1:
                fill_color = "blue";
                break;
              case 2:
                fill_color = "green";
                break;
              case 3:
                fill_color = "red";
                break;
              case 4:
                fill_color = "purple";
                break;
              case 5:
                fill_color = "maroon";
                break;
              case 6:
                fill_color = "aquamarine";
                break;
              case 7:
                fill_color = "black";
                break;
              default:
                //case 8, basically
                fill_color = "gray";
            }
            this.context.fillStyle = fill_color;
            this.context.font = `bold ${FONT_SIZES.BUTTON}px ${FONT_NAME}`;
            this.context.fillText(String(tile.touching), col_num * tile_size + tile_size / 2 + margin - text_widths[tile.touching] / 2, WINDOW_TOP_HEIGHT + row_num * tile_size + tile_size / 2 + FONT_SIZES.BUTTON / 2 + margin);
          }
        } else {
          const top_x: number = col_num * tile_size + margin;
          const top_y: number = WINDOW_TOP_HEIGHT + row_num * tile_size + margin;
          //draw "button" background
          this.context.fillStyle = theme_info.background;
          this.context.fillRect(top_x, top_y, tile_size, tile_size);
          //draw the "button" borders
          let left_top: Path2D = new Path2D();
          left_top.moveTo(top_x, top_y);
          left_top.lineTo(top_x, top_y + tile_size);
          left_top.lineTo(top_x + button_margin, top_y + tile_size - button_margin);
          left_top.lineTo(top_x + button_margin, top_y + button_margin);
          left_top.lineTo(top_x + tile_size - button_margin, top_y + button_margin);
          left_top.lineTo(top_x + tile_size, top_y);
          left_top.lineTo(top_x, top_y);
          this.context.fillStyle = "white";
          this.context.fill(left_top);
          let right_bottom: Path2D = new Path2D();
          right_bottom.moveTo(top_x + tile_size, top_y + tile_size);
          right_bottom.lineTo(top_x, top_y + tile_size);
          right_bottom.lineTo(top_x + button_margin, top_y + tile_size - button_margin);
          right_bottom.lineTo(top_x + tile_size - button_margin, top_y + tile_size - button_margin);
          right_bottom.lineTo(top_x + tile_size - button_margin, top_y + button_margin);
          right_bottom.lineTo(top_x + tile_size, top_y);
          right_bottom.lineTo(top_x + tile_size, top_y + tile_size);
          this.context.fillStyle = "#808080";
          this.context.fill(right_bottom);
        }
      }
    }
    let components = this.components;
    for (let j = 0; j < components.length; j++) {
      components[j].render_view(theme);
    }
  }
  handle_message(message: MinesweeperMessage | WindowMessage, data: any): boolean {
    if (message === WindowMessage.MouseDown && isMouseEvent(data)) {
      //ignore any clicks that are not on the minesweeper board
      if (data.clientX < margin || data.clientX > this.size[0] - margin || data.clientY < WINDOW_TOP_HEIGHT + margin || data.clientY > this.size[1] - margin) return;
      if (this.playing) {
        //figure out what tile coords is being clicked
        let tile_coords = [Math.floor((data.clientX - margin) / tile_size), Math.floor((data.clientY - margin - WINDOW_TOP_HEIGHT) / tile_size)];
        let tile: TileInfo = this.tiles[tile_coords[1]][tile_coords[0]];
        //already clicked, do nothing
        if (tile.revealed) return false;
        if (this.first_click) {
          this.first_click = false;
          if (tile.touching !== 0) {
            while (true) {
              this.tiles = Minesweeper.generate_tiles();
              tile = this.tiles[tile_coords[1]][tile_coords[0]];
              if (tile.touching === 0) break;
            }
          }
        }
        this.do_rerender = true;
        this.tiles[tile_coords[1]][tile_coords[0]].revealed = true;
        if (tile.is_mine) {
          this.playing = false;
          //show "you lose" modal
          this.layers[1].hide = false;
        } else if (tile.touching === 0) {
          //discover tiles to reveal
          let reveal_queue: [number, number][] = [[tile_coords[0], tile_coords[1]]];
          let to_reveal: [number, number][] = [];
          while (reveal_queue.length > 0) {
            let first: [number, number] = reveal_queue[0];
            let first_tile: TileInfo = this.tiles[first[1]][first[0]];
            if (first_tile.touching === 0) {
              //add everything around it to reveal queue
              if (first[1] !== 0) {
                //the three above
                const up_left: [number, number] = [first[0] - 1, first[1] - 1];
                if (first[0] !== 0 && !list_list_includes(to_reveal, up_left) && !list_list_includes(reveal_queue, up_left)) {
                  reveal_queue.push(up_left);
                }
                const up: [number, number] = [first[0], first[1] - 1];
                if (!list_list_includes(to_reveal, up) && !list_list_includes(reveal_queue, up)) {
                  reveal_queue.push(up);
                }
                const up_right: [number, number] = [first[0] + 1, first[1] - 1];
                if (first[0] !== minesweeper_dimension - 1 && !list_list_includes(to_reveal, up_right) && !list_list_includes(reveal_queue, up_right)) {
                  reveal_queue.push(up_right);
                }
              }
              //the two to the left and right
              const left: [number, number] = [first[0] - 1, first[1]];
              if (first[0] !== 0 && !list_list_includes(to_reveal, left) && !list_list_includes(reveal_queue, left)) {
                reveal_queue.push(left);
              }
              const right: [number, number] = [first[0] + 1, first[1]];
              if (first[0] !== minesweeper_dimension - 1 && !list_list_includes(to_reveal, right) && !list_list_includes(reveal_queue, right)) {
                reveal_queue.push(right);
              }
              //the three below
              if (first[1] !== minesweeper_dimension - 1) {
                //the three above
                const down_left: [number, number] = [first[0] - 1, first[1] + 1];
                if (first[0] !== 0 && !list_list_includes(to_reveal, down_left) && !list_list_includes(reveal_queue, down_left)) {
                  reveal_queue.push(down_left);
                }
                const down: [number, number] = [first[0], first[1] + 1];
                if (!list_list_includes(to_reveal, down) && !list_list_includes(reveal_queue, down)) {
                  reveal_queue.push(down);
                }
                const down_right: [number, number] = [first[0] + 1, first[1] + 1];
                if (first[0] !== minesweeper_dimension - 1 && !list_list_includes(to_reveal, down_right) && !list_list_includes(reveal_queue, down_right)) {
                  reveal_queue.push(down_right);
                }
              }
            }
            //remove first item in reveal queue, add to to reveal
            to_reveal.push(reveal_queue.shift());
          }
          //now reveal the tiles
          for (let i = 0; i < to_reveal.length; i++) {
            this.tiles[to_reveal[i][1]][to_reveal[i][0]].revealed = true;
          }
        }
        //if tile is not mine, and tile is touching more than 1 mine, we just reveal that single mine
        //check to see if all non-mine squares are revealed, if so, they won
        let won: boolean = this.tiles.flat().every((t) => t.revealed || t.is_mine);
        if (won) {
          this.playing = false;
          this.layers[0].hide = false;
        }
      } else {
        //this means win or lose modals are open, relay it to them
        let relevant_components = this.components.filter((c) => {
          return data.clientX > c.coords[0] && data.clientY > c.coords[1] && data.clientX < c.coords[0] + c.size[0] && data.clientY < c.coords[1] + c.size[1] && c.clickable;
        });
        relevant_components.forEach((c) => c.handle_message(message, data));
        if (relevant_components.length > 0) {
          this.do_rerender = true;
        }
      }
    } else if (message === MinesweeperMessage.NewGame) {
      this.tiles = Minesweeper.generate_tiles();
      this.layers.forEach((l) => {
        l.hide = true;
      });
      this.first_click = true;
      this.playing = true;
    }
    //
    return this.do_rerender;
  }
}

