import type { WindowManagerSettings } from './mutables.js';
import type { DirectoryObject } from './fs.js';
import type { Themes } from './themes.js';
import { uint8_to_hex } from './utils.js';

export interface SystemSnapshot {
  theme: Themes;
  file_system: DirectoryObject;
  settings: WindowManagerSettings;
  background: string; //hex colour or image url
}

//we need to tell user the hash when snapshotted, and after, cause local storage can be tampered with
//since async I guess this needs to pop up in a message window or something?
export async function snapshot_hash(system_snapshot: SystemSnapshot): Promise<string> {
  return uint8_to_hex(new Uint8Array(await crypto.subtle.digest("SHA-256", (new TextEncoder()).encode(JSON.stringify(system_snapshot)))));
}

export function storage_write(system_snapshot: SystemSnapshot) {
  window.localStorage.setItem("system_snapshot", JSON.stringify(system_snapshot));
}

//todo: do not assume it is SystemSnapshot?
export function storage_get(): SystemSnapshot | null {
  const snapshot: string | null = window.localStorage.getItem("system_snapshot");
  return snapshot !== null ? JSON.parse(window.localStorage.getItem("system_snapshot")) : null;
}

