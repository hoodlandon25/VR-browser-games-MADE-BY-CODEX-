import { SONG_LIBRARY_PATH } from "../config.js";

export async function loadSongLibrary() {
  const response = await fetch(SONG_LIBRARY_PATH, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Library manifest missing: ${response.status}`);
  }
  const manifest = await response.json();
  if (!Array.isArray(manifest.songs)) {
    throw new Error("Invalid library manifest");
  }
  return manifest.songs;
}
