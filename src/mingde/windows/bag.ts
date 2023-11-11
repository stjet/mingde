import { Window, WindowMessage, Layer } from '../wm.js';
import { SCALE, WINDOW_TOP_HEIGHT, FONT_SIZES, FONT_NAME, CONFIG } from '../constants.js';
import { THEME_INFOS, Themes, ThemeInfo } from '../themes.js';
import { list_list_includes } from '../utils.js';
import { isMouseEvent } from '../guards.js';
import { Background } from '../components/background.js';
import { TextLine } from '../components/text_line.js';
import { Button } from '../components/button.js';

//considering loop is continuous, this should be solvable most of the time

enum BagMessage {
  NewGame,
  //
}

enum MarkedModes {
  Unselected,
  InLoop,
  MaybeLoop,
  OutLoop,
}

interface CellInfo {
  coords: [number, number]; //x, y
  orthogonal?: number; //numer of cells inside the loop in the orthogonal (nwse) directions, plus itself
  in_loop: boolean;
  marked_mode: MarkedModes; //marked by player
};

interface OrthogonalInfo {
  orthogonal: number;
  accounted_for: [number, number][];
}

const margin: number = 5 * SCALE;
const bag_size: number = 220;
const bag_dimension: number = 8; //8x8 grid
const tile_size: number = (bag_size * SCALE - 2 * margin) / bag_dimension;

export class Bag extends Window<BagMessage> {
  private grid: CellInfo[][];
  private playing: boolean;
  //

  constructor() {
    super([bag_size, bag_size + WINDOW_TOP_HEIGHT / SCALE], "Bag", "bag");
    this.resizable = false;
    this.grid = Bag.generate_grid();
    this.playing = true;
    this.layers = [new Layer(this, "win", false, true)];
    this.layers[0].add_member(new Background(this, "rgba(0, 0, 0, 0.5)", [0, WINDOW_TOP_HEIGHT / SCALE], [this.size[0] / SCALE, this.size[1] / SCALE]));
    this.layers[0].add_member(new Background(this, undefined, [50, WINDOW_TOP_HEIGHT / SCALE + 50], [this.size[0] / SCALE - 100, this.size[1] / SCALE - WINDOW_TOP_HEIGHT / SCALE - 100]));
    this.context.font = `bold ${FONT_SIZES.HEADING}px ${FONT_NAME}`;
    let won_width: number = this.context.measureText("You Won").width / SCALE;
    this.layers[0].add_member(new TextLine(this, "You Won", [this.size[0] / SCALE / 2 - won_width / 2, this.size[1] / SCALE - 125], "text_primary", "HEADING"));
    this.layers[0].add_member(new Button(this, "Play again", [this.size[0] / SCALE / 2 - 50, this.size[1] / SCALE - 100], 100, 4, () => {
      this.handle_message(BagMessage.NewGame, true);
    }));
  }
  static has_one_continuous_loop(grid: CellInfo[][]): boolean {
    let random_cell: CellInfo = grid.flat().find((cell) => cell.in_loop);
    //find all that are in the same loop as the random cell
    let queue: [number, number][] = [random_cell.coords];
    let in_same_loop: [number, number][] = [];
    while (true) {
      if (queue.length === 0) break;
      let first: [number, number] = queue.shift();
      //left
      if (first[0] !== 0) {
        let coord: [number, number] = [first[0] - 1, first[1]];
        if (!list_list_includes(queue, coord) && !list_list_includes(in_same_loop, coord) && grid[coord[1]][coord[0]].in_loop) {
          queue.push(coord);
        }
      }
      //right
      if (first[0] !== bag_dimension - 1) {
        let coord: [number, number] = [first[0] + 1, first[1]];
        if (!list_list_includes(queue, coord) && !list_list_includes(in_same_loop, coord) && grid[coord[1]][coord[0]].in_loop) {
          queue.push(coord);
        }
      }
      //top
      if (first[1] !== 0) {
        let coord: [number, number] = [first[0], first[1] - 1];
        if (!list_list_includes(queue, coord) && !list_list_includes(in_same_loop, coord) && grid[coord[1]][coord[0]].in_loop) {
          queue.push(coord);
        }
      }
      //bottom
      if (first[1] !== bag_dimension - 1) {
        let coord: [number, number] = [first[0], first[1] + 1];
        if (!list_list_includes(queue, coord) && !list_list_includes(in_same_loop, coord) && grid[coord[1]][coord[0]].in_loop) {
          queue.push(coord);
        }
      }
      in_same_loop.push(first);
    }
    const in_loop_length: number = grid.flat().filter((cell) => cell.in_loop).length;
    if (in_same_loop.length === in_loop_length) {
      return true;
    } else {
      return false;
    }
  }
  static is_adjacent(coord1: [number, number], coord2: [number, number]): boolean {
    //coord1 is right of coord2
    if (coord1[0] - 1 === coord2[0] && coord1[1] === coord2[1]) return true;
    //coord 1 is left of coord2
    if (coord1[0] + 1 === coord2[0] && coord1[1] === coord2[1]) return true;
    //coord 1 below coord2
    if (coord1[1] - 1 === coord2[1] && coord1[0] === coord2[0]) return true;
    //coord 1 above coord2
    if (coord1[1] + 1 === coord2[1] && coord1[0] === coord2[0]) return true;
    //coord1 is top left of coord2
    if (coord1[0] + 1 === coord2[0] && coord1[1] + 1 === coord2[1]) return true;
    //coord1 is top right of coord2
    if (coord1[0] - 1 === coord2[0] && coord1[1] + 1 === coord2[1]) return true;
    //coord1 is bottom right of coord2
    if (coord1[0] + 1 === coord2[0] && coord1[1] - 1 === coord2[1]) return true;
    //coord1 is bottom left of coord2
    if (coord1[0] - 1 === coord2[0] && coord1[1] - 1 === coord2[1]) return true;
    return false;
  }
  //could be made simpler
  static non_continuous_edge(snake: [number, number][], coords: [number, number]): boolean {
    //not an edge
    if (coords[0] !== 0 && coords[0] !== bag_dimension - 1 && coords[1] !== 0 && coords[1] !== bag_dimension - 1) return false;
    let first_in_edge: boolean = false;
    let edges_count: number = 0; //guranteed to be either 1 or 2 by the end, 2 means that it is an edge
    //check if non-continuous (there are edge tiles with non-snake gaps in-between
    if (coords[0] === 0) {
      let edge_coords: number[] = snake.filter((c) => c[0] === 0).map((c) => c[1]);
      edge_coords.push(coords[1]);
      //sort() is ascending
      edge_coords.sort();
      for (let i = 1; i < edge_coords.length; i++) {
        if (edge_coords[i - 1] + 1 !== edge_coords[i]) return true;
      }
      if (edge_coords.length === 1) {
        first_in_edge = true;
      }
      edges_count++;
    }
    if (coords[0] === bag_dimension - 1) {
      let edge_coords: number[] = snake.filter((c) => c[0] === bag_dimension - 1).map((c) => c[1]);
      edge_coords.push(coords[1]);
      //sort() is ascending
      edge_coords.sort();
      for (let i = 1; i < edge_coords.length; i++) {
        if (edge_coords[i - 1] + 1 !== edge_coords[i]) return true;
      }
      if (edge_coords.length === 1) {
        first_in_edge = true;
      }
      edges_count++;
    }
    if (coords[1] === 0) {
      let edge_coords: number[] = snake.filter((c) => c[1] === 0).map((c) => c[0]);
      edge_coords.push(coords[0]);
      //sort() is ascending
      edge_coords.sort();
      for (let i = 1; i < edge_coords.length; i++) {
        if (edge_coords[i - 1] + 1 !== edge_coords[i]) return true;
      }
      if (edge_coords.length === 1) {
        first_in_edge = true;
      }
      edges_count++;
    }
    if (coords[1] === bag_dimension - 1) {
      let edge_coords: number[] = snake.filter((c) => c[1] === bag_dimension - 1).map((c) => c[0]);
      edge_coords.push(coords[0]);
      //sort() is ascending
      edge_coords.sort();
      for (let i = 1; i < edge_coords.length; i++) {
        if (edge_coords[i - 1] + 1 !== edge_coords[i]) return true;
      }
      if (edge_coords.length === 1) {
        first_in_edge = true;
      }
      edges_count++;
    }
    //also, if a snake is newly touching multiple edges,
    //(if the `coords` is added, it will be the first on that edge (and we know the snake started from another edge))
    //that means it likely cut off a chunk of the loop and made it into an island
    //UNLESS `coord` is an corner coord
    if (edges_count === 1 && first_in_edge) {
      return true;
    }
    return false;
  }
  static count_orthogonal(grid: CellInfo[][], coords: [number, number], accounted_for: [number, number][]): OrthogonalInfo {
    //count the total number of orthogonal cells in loop (including itself), add those cells to accounted for
    let orthogonal: number = 0;
    //self
    orthogonal++;
    if (!list_list_includes(accounted_for, coords)) {
      accounted_for.push(coords);
    }
    //left
    for (let ii = 0; ii < coords[0]; ii++) {
      let left_coords: [number, number] = [coords[0] - ii - 1, coords[1]];
      if (grid[left_coords[1]][left_coords[0]].in_loop) {
        orthogonal++;
        if (!list_list_includes(accounted_for, left_coords)) {
          accounted_for.push(left_coords);
        }
      } else {
        break;
      }
    }
    //right
    for (let ii = 0; ii < bag_dimension - coords[0] - 1; ii++) {
      let right_coords: [number, number] = [coords[0] + ii + 1, coords[1]];
      if (grid[right_coords[1]][right_coords[0]].in_loop) {
        orthogonal++;
        if (!list_list_includes(accounted_for, right_coords)) {
          accounted_for.push(right_coords);
        }
      } else {
        break;
      }
    }
    //up
    for (let ii = 0; ii < coords[1]; ii++) {
      let up_coords: [number, number] = [coords[0], coords[1] - ii - 1];
      if (grid[up_coords[1]][up_coords[0]].in_loop) {
        orthogonal++;
        if (!list_list_includes(accounted_for, up_coords)) {
          accounted_for.push(up_coords);
        }
      } else {
        break;
      }
    }
    //down
    for (let ii = 0; ii < bag_dimension - coords[1] - 1; ii++) {
      let down_coords: [number, number] = [coords[0], coords[1] + ii + 1];
      if (grid[down_coords[1]][down_coords[0]].in_loop) {
        orthogonal++;
        if (!list_list_includes(accounted_for, down_coords)) {
          accounted_for.push(down_coords);
        }
      } else {
        break;
      }
    }
    return {
      orthogonal,
      accounted_for,
    };
  }
  static generate_grid(): CellInfo[][] {
    //fill grid with all in loop
    let grid: CellInfo[][] = [];
    for (let row_num = 0; row_num < bag_dimension; row_num++) {
      grid.push([]);
      for (let col_num = 0; col_num < bag_dimension; col_num++) {
        grid[row_num].push({ coords: [col_num, row_num], in_loop: true, marked_mode: MarkedModes.Unselected });
      }
    }
    //generate a continuous loop by randomly choosing cells on the edge and snaking them,
    //making sure they do not touch other non in loop cells
    const base_rand_chance: number = 0.60;
    const min_rand_chance: number = 0.35;
    const snake_num: number = Math.floor(Math.random() * 5) + 5;
    let snakes: [number, number][][] = [];
    for (let i = 0; i < snake_num; i++) {
      let edge_coords: [number, number];
      while (true) {
        const rand: number = Math.random();
        if (rand < 0.25) {
          edge_coords = [Math.floor(Math.random() * bag_dimension), 0];
        } else if (rand < 0.5) {
          edge_coords = [0, Math.floor(Math.random() * bag_dimension)];
        } else if (rand < 0.75) {
          edge_coords = [Math.floor(Math.random() * bag_dimension), bag_dimension - 1];
        } else {
          edge_coords = [bag_dimension - 1, Math.floor(Math.random() * bag_dimension)];
        }
        //make sure edge coord selected doesn't create an island (make the loop non-continuous)
        //while making sure an already selected edge coord can stil be selected again
        const adjacent_to_existing: boolean = snakes.some((s) => s.some((c) => Bag.is_adjacent(c, edge_coords)));
        if ((list_list_includes(snakes.flat(), edge_coords) && adjacent_to_existing) || !adjacent_to_existing) {
          break;
        }
      }
      //now snake
      let queue: [number, number][] = [edge_coords];
      let decided: [number, number][] = []; //either was in queue, or decided that it should not be in queue
      let snake: [number, number][] = []; //was at one point in the queue, aka was part of snake
      let rand_chance: number = base_rand_chance + 0.05;
      while (true) {
        rand_chance -= 0.05;
        if (rand_chance < min_rand_chance) {
          rand_chance = min_rand_chance;
        }
        let first: [number, number] = queue.shift();
        grid[first[1]][first[0]].in_loop = false;
        decided.push(first);
        snake.push(first);
        //look at surrounding tiles, some chance to add them to queue, otherwise add to decided
        //make sure that anything added to queue is not adjacent to any of the coords in snake,
        //and not in the queue already
        const rand_left: boolean = Math.random() < rand_chance;
        if (rand_left && first[0] !== 0) {
          const left_coord: [number, number] = [first[0] - 1, first[1]];
          const in_queue: boolean = queue.some((c) => c[0] === left_coord[0] && c[1] === left_coord[1]);
          const in_decided: boolean = decided.some((c) => c[0] === left_coord[0] && c[1] === left_coord[1]);
          if (!in_queue && !in_decided) {
            const adjacent_to_existing: boolean = snakes.some((s) => s.some((c) => Bag.is_adjacent(c, left_coord)));
            const is_non_continuous_edge: boolean = Bag.non_continuous_edge(snake, left_coord);
            if (!adjacent_to_existing && !is_non_continuous_edge) {
              queue.push(left_coord);
            } else {
              decided.push(left_coord);
            }
          }
        }
        const rand_right: boolean = Math.random() < rand_chance;
        if (rand_right && first[0] !== bag_dimension - 1) {
          const right_coord: [number, number] = [first[0] + 1, first[1]];
          const in_queue: boolean = queue.some((c) => c[0] === right_coord[0] && c[1] === right_coord[1]);
          const in_decided: boolean = decided.some((c) => c[0] === right_coord[0] && c[1] === right_coord[1]);
          if (!in_queue && !in_decided) {
            const adjacent_to_existing: boolean = snakes.some((s) => s.some((c) => Bag.is_adjacent(c, right_coord)));
            const is_non_continuous_edge: boolean = Bag.non_continuous_edge(snake, right_coord);
            if (!adjacent_to_existing && !is_non_continuous_edge) {
              queue.push(right_coord);
            } else {
              decided.push(right_coord);
            }
          }
        }
        const rand_up: boolean = Math.random() < rand_chance;
        if (rand_up && first[1] !== 0) {
          const up_coord: [number, number] = [first[0], first[1] - 1];
          const in_queue: boolean = queue.some((c) => c[0] === up_coord[0] && c[1] === up_coord[1]);
          const in_decided: boolean = decided.some((c) => c[0] === up_coord[0] && c[1] === up_coord[1]);
          if (!in_queue && !in_decided) {
            const adjacent_to_existing: boolean = snakes.some((s) => s.some((c) => Bag.is_adjacent(c, up_coord)));
            const is_non_continuous_edge: boolean = Bag.non_continuous_edge(snake, up_coord);
            if (!adjacent_to_existing && !is_non_continuous_edge) {
              queue.push(up_coord);
            } else {
              decided.push(up_coord);
            }
          }
        }
        const rand_down: boolean = Math.random() < rand_chance;
        if (rand_down && first[1] !== bag_dimension - 1) {
          const down_coord: [number, number] = [first[0], first[1] + 1];
          const in_queue: boolean = queue.some((c) => c[0] === down_coord[0] && c[1] === down_coord[1]);
          const in_decided: boolean = decided.some((c) => c[0] === down_coord[0] && c[1] === down_coord[1]);
          if (!in_queue && !in_decided) {
            const adjacent_to_existing: boolean = snakes.some((s) => s.some((c) => Bag.is_adjacent(c, down_coord)));
            const is_non_continuous_edge: boolean = Bag.non_continuous_edge(snake, down_coord);
            if (!adjacent_to_existing && !is_non_continuous_edge) {
              queue.push(down_coord);
            } else {
              decided.push(down_coord);
            }
          }
        }
        if (queue.length === 0) {
          break;
        }
      }
      //snakes
      snakes.push(snake);
    }
    //pick a bunch of random cells in the loop as numbered cells, count the orthogonal numbers
    const initial_numbered: number = Math.floor(Math.random() * 8) + 8; //what if more initial numbered than in loop?
    let accounted_for: [number, number][] = [];
    for (let i = 0; i < initial_numbered; i++) {
      //pick random cell inside loop, that is not already labelled
      let coords: [number, number];
      while (true) {
        let random_cell: [number, number] = [Math.floor(Math.random() * bag_dimension), Math.floor(Math.random() * bag_dimension)];
        //orthogonal will never be 0 so ! is ok here
        if (grid[random_cell[1]][random_cell[0]].in_loop && !grid[random_cell[1]][random_cell[0]].orthogonal) {
          coords = random_cell;
          break;
        }
      }
      //count the total number of orthogonal cells in loop (including itself), add those cells to accounted for
      let count_info: OrthogonalInfo = Bag.count_orthogonal(grid, coords, accounted_for);
      accounted_for = count_info.accounted_for;
      //store the total number
      grid[coords[1]][coords[0]].orthogonal = count_info.orthogonal;
    }
    //if cells are not included in the orthogonals, add it as a numbered cell, recalculate
    //repeat until all cells in the continuous loop are included in the numbered cell's orthogonal number things
    const in_loop_all: CellInfo[] = grid.flat().filter((cell) => cell.in_loop);
    const in_loop_length: number = in_loop_all.length;
    while (true) {
      if (accounted_for.length === in_loop_length) {
        break;
      }
      const in_loop_unaccounted: CellInfo[] = grid.flat().filter((cell) => cell.in_loop && !list_list_includes(accounted_for, cell.coords));
      const random_cell: CellInfo = in_loop_unaccounted[Math.floor(Math.random() * in_loop_unaccounted.length)];
      //count the total number of orthogonal cells in loop (including itself), add those cells to accounted for
      let count_info: OrthogonalInfo = Bag.count_orthogonal(grid, random_cell.coords, accounted_for);
      accounted_for = count_info.accounted_for;
      //store the total number
      grid[random_cell.coords[1]][random_cell.coords[0]].orthogonal = count_info.orthogonal;
    }
    //if grid still hasn't been generated correctly (I think I missed one annoying edge case), generate again
    while (true) {
      if (Bag.has_one_continuous_loop(grid)) break;
      grid = Bag.generate_grid();
    }
    return grid;
  }
  render_view(theme: Themes) {
    const theme_info: ThemeInfo = THEME_INFOS[theme];
    let text_widths: number[] = [];
    for (let t = 1; t <= bag_dimension * 2 - 1; t++) {
      this.context.font = `bold ${FONT_SIZES.BUTTON}px ${FONT_NAME}`;
      text_widths.push(this.context.measureText(String(t)).width);
    }
    //draw grid background
    this.context.fillStyle = theme_info.background;
    this.context.fillRect(margin, margin + WINDOW_TOP_HEIGHT, this.size[0] - 2 * margin, this.size[1] - WINDOW_TOP_HEIGHT - 2 * margin);
    //draw grid lines
    this.context.strokeStyle = "#808080";
    this.context.lineWidth = 2 * SCALE;
    //draw grid row lines
    for (let i = 1; i < bag_dimension; i++) {
      let row_line: Path2D = new Path2D();
      row_line.moveTo(margin, WINDOW_TOP_HEIGHT + margin + tile_size * i);
      row_line.lineTo(this.size[0] - margin, WINDOW_TOP_HEIGHT + margin + tile_size * i);
      this.context.stroke(row_line);
    }
    //draw grid column lines
    for (let j = 1; j < bag_dimension; j++) {
      let col_line: Path2D = new Path2D();
      col_line.moveTo(margin + tile_size * j, WINDOW_TOP_HEIGHT + margin);
      col_line.lineTo(margin + tile_size * j, this.size[1] - margin);
      this.context.stroke(col_line);
    }
    this.context.textBaseline = "bottom";
    for (let row_num = 0; row_num < bag_dimension; row_num++) {
      for (let col_num = 0; col_num < bag_dimension; col_num++) {
        const cell_info: CellInfo = this.grid[row_num][col_num];
        //for testing purposes
        if (cell_info.in_loop && CONFIG.DEBUG.GAMES) {
          this.context.fillStyle = "rgba(128, 128, 128, 0.5)";
          this.context.fillRect(margin + tile_size * col_num, WINDOW_TOP_HEIGHT + margin + tile_size * row_num, tile_size, tile_size);
        }
        if (cell_info.marked_mode === MarkedModes.InLoop) {
          this.context.fillStyle = "green";
          this.context.fillRect(margin + tile_size * col_num, WINDOW_TOP_HEIGHT + margin + tile_size * row_num, tile_size, tile_size);
        } else if (cell_info.marked_mode === MarkedModes.MaybeLoop) {
          this.context.fillStyle = "yellow";
          this.context.fillRect(margin + tile_size * col_num, WINDOW_TOP_HEIGHT + margin + tile_size * row_num, tile_size, tile_size);
        } else if (cell_info.marked_mode === MarkedModes.OutLoop) {
          this.context.fillStyle = "red";
          this.context.fillRect(margin + tile_size * col_num, WINDOW_TOP_HEIGHT + margin + tile_size * row_num, tile_size, tile_size);
        }
        //orthogonal will either be >0 or undefined so we can do this
        if (cell_info.orthogonal) {
          this.context.fillStyle = "blue";
          this.context.font = `bold ${FONT_SIZES.BUTTON}px ${FONT_NAME}`;
          this.context.fillText(String(cell_info.orthogonal), col_num * tile_size + tile_size / 2 + margin - text_widths[cell_info.orthogonal - 1] / 2, WINDOW_TOP_HEIGHT + row_num * tile_size + tile_size / 2 + FONT_SIZES.BUTTON / 2 + margin);
        }
      }
    }
    //tell player the total in loop
    const total_in_loop: number = this.grid.flat().filter((cell) => cell.in_loop).length;
    this.context.fillStyle = "black";
    this.context.font = `bold ${FONT_SIZES.BUTTON}px ${FONT_NAME}`;
    this.context.fillText("Total in loop: " + String(total_in_loop), margin, FONT_SIZES.BUTTON + WINDOW_TOP_HEIGHT);
    if (!this.playing) {
      for (let j = 0; j < this.layers[0].members.length; j++) {
        this.layers[0].members[j].render_view(theme);
      }
    }
  }
  handle_message(message: BagMessage | WindowMessage, data: any): boolean {
    if (message === WindowMessage.MouseDown && isMouseEvent(data)) {
      //ignore any clicks that are not on the grid
      if (data.clientX < margin || data.clientX > this.size[0] - margin || data.clientY < WINDOW_TOP_HEIGHT + margin || data.clientY > this.size[1] - margin) return;
      if (this.playing) {
        //figure out what tile coords is being clicked
        let cell_coords = [Math.floor((data.clientX - margin) / tile_size), Math.floor((data.clientY - margin - WINDOW_TOP_HEIGHT) / tile_size)];
        let cell: CellInfo = this.grid[cell_coords[1]][cell_coords[0]];
        if (cell.marked_mode === MarkedModes.Unselected) {
          this.grid[cell_coords[1]][cell_coords[0]].marked_mode = MarkedModes.InLoop;
        } else if (cell.marked_mode === MarkedModes.InLoop) {
          this.grid[cell_coords[1]][cell_coords[0]].marked_mode = MarkedModes.MaybeLoop;
        } else if (cell.marked_mode === MarkedModes.MaybeLoop) {
          this.grid[cell_coords[1]][cell_coords[0]].marked_mode = MarkedModes.OutLoop;
        } else {
          this.grid[cell_coords[1]][cell_coords[0]].marked_mode = MarkedModes.Unselected;
        }
        //check for win
        let won: boolean = true;
        for (let row_num = 0; row_num < bag_dimension; row_num++) {
          for (let col_num = 0; col_num < bag_dimension; col_num++) {
            if (this.grid[row_num][col_num].in_loop && this.grid[row_num][col_num].marked_mode !== MarkedModes.InLoop) {
              won = false;
            }
          }
        }
        if (won) {
          this.playing = false;
          this.layers[0].hide = false;
        }
        this.do_rerender = true;
      } else {
        let relevant_components = this.layers[0].members.filter((c) => {
          return data.clientX > c.coords[0] && data.clientY > c.coords[1] && data.clientX < c.coords[0] + c.size[0] && data.clientY < c.coords[1] + c.size[1] && c.clickable;
        });
        relevant_components.forEach((c) => c.handle_message(message, data));
        if (relevant_components.length > 0) {
          this.do_rerender = true;
        }
      }
    } else if (message === BagMessage.NewGame) {
      this.grid = Bag.generate_grid();
      this.layers.forEach((l) => {
        l.hide = true;
      });
      this.playing = true;
    }
    //
    return this.do_rerender;
  }
}

