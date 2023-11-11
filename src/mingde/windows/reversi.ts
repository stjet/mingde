import { Window, WindowMessage, Layer, Component } from '../wm.js';
import { WINDOW_TOP_HEIGHT, SCALE, FONT_SIZES, FONT_NAME } from '../constants.js';
import { isMouseEvent, isCoords, hasText } from '../guards.js';
import { Background } from '../components/background.js';
import { TextLine } from '../components/text_line.js';
import { Button } from '../components/button.js';
import type { Themes } from '../themes.js';
//

enum ReversiMessage {
  Move, //a game move
  NewGame,
}

enum Occupant {
  White,
  Black,
  Empty,
}

interface PotentialMove {
  coords: [number, number];
  will_flip_over: [number, number][];
}

//othello boards are 8x8
const othello_size: number = 300;
const margin: number = 7 * SCALE;
const tile_size: number = (othello_size * SCALE - 2 * margin) / 8;

export class Reversi extends Window<ReversiMessage> {
  private board: Occupant[][];
  private white_turn: boolean;
  private possible_moves: PotentialMove[];

  constructor() {
    super([othello_size, othello_size + WINDOW_TOP_HEIGHT / SCALE], "Reversi", "reversi");
    this.resizable = false;
    this.board = Reversi.gen_start_board();
    this.white_turn = true;
    this.possible_moves = Reversi.calculate_moves(this.board, this.white_turn);
    this.layers = [new Layer(this, "game_end", false, true)];
    this.layers[0].add_member(new Background(this, "rgba(0, 0, 0, 0.5)", [0, WINDOW_TOP_HEIGHT / SCALE], [this.size[0] / SCALE, this.size[1] / SCALE]));
    this.layers[0].add_member(new Background(this, undefined, [60, WINDOW_TOP_HEIGHT / SCALE + 60], [this.size[0] / SCALE - 120, this.size[1] / SCALE - WINDOW_TOP_HEIGHT / SCALE - 120]));
    this.layers[0].add_member(new TextLine(this, "Placeholder, someone won or it was a tie", [0, WINDOW_TOP_HEIGHT / SCALE + 120], "text_primary", "HEADING"));
    this.layers[0].add_member(new TextLine(this, "Placeholder about tile count", [0, WINDOW_TOP_HEIGHT / SCALE + 150], "text_primary", "NORMAL"));
    this.layers[0].add_member(new Button(this, "Play again", [this.size[0] / SCALE / 2 - 50, this.size[1] / SCALE - 125], 100, 4, () => {
      this.handle_message(ReversiMessage.NewGame, true);
    }));
  }
  get components(): Component<ReversiMessage | WindowMessage>[] {
    return this.layers.filter((layer) => !layer.hide).map((layer) => layer.members).flat();
  }
  static gen_start_board(): Occupant[][] {
    let board: Occupant[][] = [];
    for (let row_num = 0; row_num < 8; row_num++) {
      board.push([]);
      for (let col_num = 0; col_num < 8; col_num++) {
        if ((row_num === 3 && col_num === 3) || (row_num === 4 && col_num === 4)) {
          board[row_num].push(Occupant.White);
        } else if ((row_num === 3 && col_num === 4) ||(row_num === 4 && col_num === 3)) {
          board[row_num].push(Occupant.Black);
        } else {
          board[row_num].push(Occupant.Empty);
        }
      }
    }
    return board;
  }
  static calculate_moves(board: Occupant[][], white_turn: boolean): PotentialMove[] {
    let moves: PotentialMove[] = [];
    const add_to_moves = (coords: [number, number], will_flip_over: [number, number][]) => {
      if (!moves.find((c) => c.coords[0] === coords[0] && c.coords[1] === coords[1])) {
        moves.push({
          coords,
          will_flip_over,
        });
      }
    };
    for (let row_num = 0; row_num < 8; row_num++) {
      for (let col_num = 0; col_num < 8; col_num++) {
        //check in all directions of current turn's colour tiles, keep going until find empty (valid move) or of same colour (not valid move)
        if ((board[row_num][col_num] === Occupant.White && white_turn) || (board[row_num][col_num] === Occupant.Black && !white_turn)) {
          if (row_num !== 0) {
            //upper left
            if (col_num !== 0) {
              let will_flip_over_ul: [number, number][] = [];
              for (let i = 1; i <= Math.min(row_num, col_num); i++) {
                let tile: Occupant = board[row_num - i][col_num - i];
                if (tile === Occupant.Empty) {
                  if (i === 1) break;
                  //add to moves
                  add_to_moves([col_num - i, row_num - i], will_flip_over_ul);
                  break;
                } else if ((tile === Occupant.White && white_turn) || (tile === Occupant.Black && !white_turn)) {
                  //found tile of same colour, this direction does not have a valid move
                  break;
                } else {
                  will_flip_over_ul.push([col_num - i, row_num - i]);
                }
              }
            }
            //up
            let will_flip_over_u: [number, number][] = [];
            for (let i = 1; i <= row_num; i++) {
              let tile: Occupant = board[row_num - i][col_num];
              if (tile === Occupant.Empty) {
                if (i === 1) break;
                //add to moves
                add_to_moves([col_num, row_num - i], will_flip_over_u);
                break;
              } else if ((tile === Occupant.White && white_turn) || (tile === Occupant.Black && !white_turn)) {
                //found tile of same colour, this direction does not have a valid move
                break;
              } else {
                will_flip_over_u.push([col_num, row_num - i]);
              }
            }
            //upper right
            if (col_num !== 8 - 1) {
              let will_flip_over_ur: [number, number][] = [];
              for (let i = 1; i <= Math.min(row_num, 8 - 1 - col_num); i++) {
                let tile: Occupant = board[row_num - i][col_num + i];
                if (tile === Occupant.Empty) {
                  if (i === 1) break;
                  //add to moves
                  add_to_moves([col_num + i, row_num - i], will_flip_over_ur);
                  break;
                } else if ((tile === Occupant.White && white_turn) || (tile === Occupant.Black && !white_turn)) {
                  //found tile of same colour, this direction does not have a valid move
                  break;
                } else {
                  will_flip_over_ur.push([col_num + i, row_num - i]);
                }
              }
            }
          }
          //to the left
          if (col_num !== 0) {
            let will_flip_over_l: [number, number][] = [];
            for (let i = 1; i <= col_num; i++) {
              let tile: Occupant = board[row_num][col_num - i];
              if (tile === Occupant.Empty) {
                if (i === 1) break;
                //add to moves
                add_to_moves([col_num - i, row_num], will_flip_over_l);
                break;
              } else if ((tile === Occupant.White && white_turn) || (tile === Occupant.Black && !white_turn)) {
                //found tile of same colour, this direction does not have a valid move
                break;
              } else {
                will_flip_over_l.push([col_num - i, row_num]);
              }
            }
          }
          //to the right
          if (col_num !== 8 - 1) {
            let will_flip_over_r: [number, number][] = [];
            for (let i = 1; i <=  8 - 1 - col_num; i++) {
              let tile: Occupant = board[row_num][col_num + i];
              if (tile === Occupant.Empty) {
                if (i === 1) break;
                //add to moves
                add_to_moves([col_num + i, row_num], will_flip_over_r);
                break;
              } else if ((tile === Occupant.White && white_turn) || (tile === Occupant.Black && !white_turn)) {
                //found tile of same colour, this direction does not have a valid move
                break;
              } else {
                will_flip_over_r.push([col_num + i, row_num]);
              }
            }
          }
          if (row_num !== 8 - 1) {
            //lower left
            if (col_num !== 0) {
              let will_flip_over_ll: [number, number][] = [];
              for (let i = 1; i <= Math.min(8 - 1 - row_num, col_num); i++) {
                let tile: Occupant = board[row_num + i][col_num - i];
                if (tile === Occupant.Empty) {
                  if (i === 1) break;
                  //add to moves
                  add_to_moves([col_num - i, row_num + i], will_flip_over_ll);
                  break;
                } else if ((tile === Occupant.White && white_turn) || (tile === Occupant.Black && !white_turn)) {
                  //found tile of same colour, this direction does not have a valid move
                  break;
                } else {
                  will_flip_over_ll.push([col_num - i, row_num + i]);
                }
              }
            }
            //down
            let will_flip_over_l: [number, number][] = [];
            for (let i = 1; i <= 8 - 1 - row_num; i++) {
              let tile: Occupant = board[row_num + i][col_num];
              if (tile === Occupant.Empty) {
                if (i === 1) break;
                //add to moves
                add_to_moves([col_num, row_num + i], will_flip_over_l);
                break;
              } else if ((tile === Occupant.White && white_turn) || (tile === Occupant.Black && !white_turn)) {
                //found tile of same colour, this direction does not have a valid move
                break;
              } else {
                will_flip_over_l.push([col_num, row_num + i]);
              }
            }
            //lower right
            if (col_num !== 8 - 1) {
              let will_flip_over_lr: [number, number][] = [];
              for (let i = 1; i <= Math.min(8 - 1 - row_num, 8 - 1 - col_num); i++) {
                let tile: Occupant = board[row_num + i][col_num + i];
                if (tile === Occupant.Empty) {
                  if (i === 1) break;
                  //add to moves
                  add_to_moves([col_num + i, row_num + i], will_flip_over_lr);
                  break;
                } else if ((tile === Occupant.White && white_turn) || (tile === Occupant.Black && !white_turn)) {
                  //found tile of same colour, this direction does not have a valid move
                  break;
                } else {
                  will_flip_over_lr.push([col_num + i, row_num + i]);
                }
              }
            }
          }
        }
      }
    }
    return moves;
  }
  static do_move(board: Occupant[][], white_turn: boolean, move: [number, number], will_flip_over: [number, number][]): Occupant[][] {
    //change color of move coords, will flip over coords
    let new_color: Occupant = white_turn ? Occupant.White : Occupant.Black;
    board[move[1]][move[0]] = new_color;
    for (let i = 0; i < will_flip_over.length; i++) {
      board[will_flip_over[i][1]][will_flip_over[i][0]] = new_color;
    }
    return board;
  }
  render_view(theme: Themes) {
    //draw othello board background
    this.context.fillStyle = "#485d3f";
    this.context.fillRect(0, WINDOW_TOP_HEIGHT, this.size[0], this.size[1] - WINDOW_TOP_HEIGHT);
    //draw the lines
    this.context.strokeStyle = "black";
    this.context.lineWidth = 2 * SCALE;
    for (let i = 0; i < 8 + 1; i++) {
      //horizontal lines
      let hor_line: Path2D = new Path2D();
      hor_line.moveTo(margin, WINDOW_TOP_HEIGHT + margin + tile_size * i);
      hor_line.lineTo(this.size[0] - margin, WINDOW_TOP_HEIGHT + margin + tile_size * i);
      this.context.stroke(hor_line);
    }
    for (let j = 0; j < 8 + 1; j++) {
      //vertical lines
      let ver_line: Path2D = new Path2D();
      ver_line.moveTo(margin + tile_size * j, WINDOW_TOP_HEIGHT + margin);
      ver_line.lineTo(margin + tile_size * j, this.size[1] - margin);
      this.context.stroke(ver_line);
    }
    //draw the 4 dots
    this.context.fillStyle = "black";
    const radius: number = 4 * SCALE;
    let dot_left_top: Path2D = new Path2D();
    dot_left_top.ellipse(margin + tile_size * 2, WINDOW_TOP_HEIGHT + margin + tile_size * 2, radius, radius, 0, 0, 2 * Math.PI);
    this.context.fill(dot_left_top);
    let dot_right_top: Path2D = new Path2D();
    dot_right_top.ellipse(this.size[0] - margin - tile_size * 2, WINDOW_TOP_HEIGHT + margin + tile_size * 2, radius, radius, 0, 0, 2 * Math.PI);
    this.context.fill(dot_right_top);
    let dot_left_bottom: Path2D = new Path2D();
    dot_left_bottom.ellipse(margin + tile_size * 2, this.size[1] - margin - tile_size * 2, radius, radius, 0, 0, 2 * Math.PI);
    this.context.fill(dot_left_bottom);
    let dot_right_bottom: Path2D = new Path2D();
    dot_right_bottom.ellipse(this.size[0] - margin - tile_size * 2, this.size[1] - margin - tile_size * 2, radius, radius, 0, 0, 2 * Math.PI);
    this.context.fill(dot_right_bottom);
    //draw the pieces on the board
    for (let row_num = 0; row_num < 8; row_num++) {
      for (let col_num = 0; col_num < 8; col_num++) {
        if (this.board[row_num][col_num] !== Occupant.Empty) {
          if (this.board[row_num][col_num] === Occupant.White) {
            this.context.fillStyle = "white";
          } else if (this.board[row_num][col_num] === Occupant.Black) {
            this.context.fillStyle = "black";
          }
          let piece: Path2D = new Path2D();
          piece.ellipse(margin + tile_size * (col_num + 0.5), WINDOW_TOP_HEIGHT + margin + tile_size * (row_num + 0.5), tile_size / 2 - 4 * SCALE, tile_size / 2 - 4 * SCALE, 0, 0, 2 * Math.PI);
          this.context.fill(piece);
        }
      }
    }
    //show moves
    let possible_moves: [number, number][] = this.possible_moves.map((m) => m.coords);
    this.context.strokeStyle = "yellow";
    for (let i = 0; i < possible_moves.length; i++) {
      //highlight possible moves
      let highlight: Path2D = new Path2D();
      highlight.rect(margin + tile_size * possible_moves[i][0], WINDOW_TOP_HEIGHT + margin + tile_size * possible_moves[i][1], tile_size, tile_size);
      this.context.stroke(highlight);
    }
    let components = this.components;
    for (let j = 0; j < components.length; j++) {
      components[j].render_view(theme);
    }
  }
  handle_message(message: ReversiMessage | WindowMessage, data: any): boolean {
    if (message === ReversiMessage.Move && isCoords(data)) {
      //assume it is a valid move
      this.board = Reversi.do_move(this.board, this.white_turn, data, this.possible_moves.find((m) => m.coords[0] === data[0] && m.coords[1] === data[1]).will_flip_over);
      //change turn
      this.white_turn = this.white_turn ? false : true;
      //recalculate possible moves
      this.possible_moves = Reversi.calculate_moves(this.board, this.white_turn);
      if (this.possible_moves.length === 0) {
        this.white_turn = this.white_turn ? false : true;
        this.possible_moves = Reversi.calculate_moves(this.board, this.white_turn);
        if (this.possible_moves.length === 0) {
          //game over, if neither can move (which is the case when eg, board fills up)
          //count the number of black tiles, count number of white tiles
          let flat_board: Occupant[] = this.board.flat();
          let white_count: number = 0;
          let black_count: number = 0;
          for (let i = 0; i < flat_board.length; i++) {
            if (flat_board[i] === Occupant.White) {
              white_count++;
            } else if (flat_board[i] === Occupant.Black) {
              black_count++;
            }
          }
          this.layers[0].hide = false;
          if (hasText(this.layers[0].members[2]) && hasText(this.layers[0].members[3])) {
            //win text
            let win_text: string;
            if (white_count > black_count) {
              //white wins
              win_text = "White Wins"
            } else if (white_count < black_count) {
              //black wins
              win_text = "Black Wins";
            } else {
              //tie
              win_text = "Tie";
            }
            this.layers[0].members[2].text = win_text;
            this.context.font = `bold ${FONT_SIZES.HEADING}px ${FONT_NAME}`;
            let won_width: number = this.context.measureText(win_text).width;
            this.layers[0].members[2].coords[0] = this.size[0] / 2 - won_width / 2;
            //black vs. white count
            const count_text: string = `White ${white_count}, Black ${black_count}`;
            this.layers[0].members[3].text = count_text;
            this.context.font = `bold ${FONT_SIZES.NORMAL}px ${FONT_NAME}`;
            let count_width: number = this.context.measureText(count_text).width;
            this.layers[0].members[3].coords[0] = this.size[0] / 2 - count_width / 2;
          } else {
            throw Error("In Reversi, some components were expected to have the text attribue but are missing it!");
          }
          this.do_rerender = true;
          return;
        }
      }
      this.do_rerender = true;
    } else if (message === ReversiMessage.NewGame) {
      this.board = Reversi.gen_start_board();
      this.white_turn = true;
      this.possible_moves = Reversi.calculate_moves(this.board, this.white_turn);
      this.layers[0].hide = true;
      this.do_rerender = true;
    } else if (message === WindowMessage.MouseDown && isMouseEvent(data)) {
      //if win/tie screen is on, obviously don't allow clicks on the board
      if (!this.layers[0].hide) {
        let relevant_components = this.components.filter((c) => {
          return data.clientX > c.coords[0] && data.clientY > c.coords[1] && data.clientX < c.coords[0] + c.size[0] && data.clientY < c.coords[1] + c.size[1] && c.clickable;
        });
        relevant_components.forEach((c) => c.handle_message(message, data));
        if (relevant_components.length > 0) {
          this.do_rerender = true;
        }
      } else {
        //ignore if outside of board
        if (data.clientX < margin || data.clientX > this.size[0] - margin || data.clientY < WINDOW_TOP_HEIGHT + margin || data.clientY > this.size[1] - margin) return;
        //if valid move, emit ReversiMessage.Move
        let tile_x: number = Math.floor((data.clientX - margin) / tile_size);
        let tile_y: number = Math.floor((data.clientY - WINDOW_TOP_HEIGHT - margin) / tile_size);
        if (this.possible_moves.find((m) => m.coords[0] === tile_x && m.coords[1] === tile_y)) {
          this.handle_message(ReversiMessage.Move, [tile_x, tile_y]);
        }
      }
    }
    //
    return this.do_rerender;
  }
}

