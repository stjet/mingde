
//file system stuff

export type Path = `/${string}`;

type FileObject = string;

//type DirectoryObject = Record<string, DirectoryObject | FileObject>; is illegal apparently
interface DirectoryObject {
  [name: string]: FileObject | DirectoryObject,
}

export class FileSystemObject {
  file_system: DirectoryObject;

  constructor(file_system: DirectoryObject) {
    this.file_system = file_system;
  }
  //does not actually check if path exists
  static navigate_path(current_path: Path, path_mod: string): Path {
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
        console.log(current_path.split("/"), up)
        console.log(possible_path.length, 'a');
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
    console.log(mod_parts);
    for (let k = 0; k < mod_parts.length; k++) {
      //do not add / if the path is just a /
      path += path === "/" ? mod_parts[k] : "/" + mod_parts[k];
    }
    return path;
  }
  get_path_contents(_path: Path): DirectoryObject | FileObject | undefined {
    //
    return;
  }
};

