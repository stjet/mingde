//file system stuff

export type Path = `/${string}`;

export type FileObject = string;

//type DirectoryObject = Record<string, DirectoryObject | FileObject>; is illegal apparently
export interface DirectoryObject {
  [name: string]: FileObject | DirectoryObject,
}

export class FileSystemObject {
  file_system: DirectoryObject;

  constructor(file_system: DirectoryObject) {
    this.file_system = file_system;
  }
  static is_legal_path(path: Path): boolean {
    //file, directory names cannot include ..
    if (path.includes("..")) return false;
    return true;
  }
  //does not actually check if path exists
  static navigate_path(current_path: Path, path_mod: string): Path {
    path_mod = path_mod.trim();
    let mod_parts: string[] = path_mod.split("/");
    let path: Path;  //start from root
    if (mod_parts[0] === ".") {
      path = current_path;
      mod_parts.shift();
    } else if (mod_parts[0] === "..") {
      //note to self: make sure file/directory names can never start with ..
      let up: number = 0; //number of times to go up one directory
      for (let i = 0; i < mod_parts.length; i++) {
        if (mod_parts[i] === "..") {
          up++;
        } else {
          break;
        }
      }
      for (let j = 0; j < up; j++) {
        mod_parts.shift();
      }
      //special case if current path is already / (root)
      if (current_path === "/") {
        path = "/";
        mod_parts = [];
      } else {
        let possible_path: string[] = current_path.split("/").slice(0, -up);
        if (possible_path.length === 0) {
          //went up more times than possible, outside of root, so just give them root
          path = "/";
          mod_parts = [];
        } else {
          possible_path.shift(); //get rid of the empty "" string that is the first element
          path = `/${possible_path.join("/")}`;
        }
      }
    } else if (mod_parts[0] === "") {
      //starts with slash
      path = "/";
      mod_parts.shift();
    } else {
      path = current_path;
    }
    for (let k = 0; k < mod_parts.length; k++) {
      //do not add / if the path is just a /
      path += path === "/" ? mod_parts[k] : "/" + mod_parts[k];
    }
    return path;
  }
  get_path_contents(path: Path): DirectoryObject | FileObject | undefined {
    if (path === "/") {
      return this.file_system;
    } else {
      const parts: string[] = path.split("/").slice(1);
      let current_location: DirectoryObject | FileObject = this.file_system;
      for (let i = 0; i < parts.length; i++) {
        current_location = current_location[parts[i]];
        if (typeof current_location === "undefined") {
          return;
        }
      }
      return current_location;
    }
  }
  remove_path(path: Path) {
    if (path === "/") {
      //no!
      return false;
    } else {
      const parts: string[] = path.split("/").slice(1);
      //current_location is a pointer to this.file_system
      let current_location: DirectoryObject | FileObject = this.file_system;
      for (let i = 0; i < parts.length - 1; i++) {
        current_location = current_location[parts[i]];
        if (typeof current_location === "undefined" || typeof current_location === "string") {
          return false;
        }
      }
      const final_part: string = parts[parts.length - 1];
      delete current_location[final_part];
      return true;
    }
  }
  //returns success/failure
  write_path(path: Path, new_content: FileObject | DirectoryObject): boolean {
    if (!FileSystemObject.is_legal_path(path)) {
      return false;
    } if (path === "/") {
      //no!
      return false;
    } else {
      const parts: string[] = path.split("/").slice(1);
      //current_location is a pointer to this.file_system
      let current_location: DirectoryObject | FileObject = this.file_system;
      for (let i = 0; i < parts.length - 1; i++) {
        current_location = current_location[parts[i]];
        if (typeof current_location === "undefined") {
          return;
        }
      }
      const final_part: string = parts[parts.length - 1];
      //directory cannot be written into a file and vice versa, exception if the path doesn't exist yet (so files/directories can still be made)
      if (typeof current_location[final_part] !== typeof new_content && typeof current_location[final_part] !== "undefined") return false;
      current_location[final_part] = new_content;
      return true;
    }
  }
};

