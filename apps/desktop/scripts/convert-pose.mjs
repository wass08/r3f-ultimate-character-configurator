import { NodeIO } from "@gltf-transform/core";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Shared FBX/GLB → pose-library conversion. Used by both the `add-pose` CLI and
// the in-app "Save to library" IPC handler. Converts an FBX to GLB (via the
// fbx2gltf binary), renames its first animation clip, drops the result into the
// pose library, and upserts the manifest the runtime reads.

const __dirname = dirname(fileURLToPath(import.meta.url));
export const POSES_DIR = resolve(__dirname, "..", "public", "models", "poses");
const MANIFEST = join(POSES_DIR, "poses.json");

const sanitize = (s) => String(s).replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");

/**
 * @param {string} srcPath  absolute path to a .fbx / .glb / .gltf
 * @param {string} [clipName]  name to give the clip (defaults to the filename)
 * @returns {Promise<{name:string,file:string,url:string}>}
 */
export async function convertPose(srcPath, clipName) {
  if (!existsSync(srcPath)) throw new Error(`File not found: ${srcPath}`);
  mkdirSync(POSES_DIR, { recursive: true });

  const name = sanitize(clipName || basename(srcPath));
  const ext = srcPath.split(".").pop().toLowerCase();
  const outPath = join(POSES_DIR, `${name}.glb`);

  // 1) Get a GLB to work with.
  let glbToRead = srcPath;
  if (ext === "fbx") {
    const FBX2glTF = (await import("fbx2gltf")).default;
    // dest ending in .glb produces a binary glTF
    await FBX2glTF(srcPath, outPath);
    glbToRead = outPath;
  } else if (ext !== "glb" && ext !== "gltf") {
    throw new Error(`Unsupported file type ".${ext}". Use .fbx, .glb or .gltf.`);
  }

  // 2) Rename the first animation clip so the runtime can key on it, then write
  //    the canonical GLB into the library.
  const io = new NodeIO();
  const doc = await io.read(glbToRead);
  const anims = doc.getRoot().listAnimations();
  if (!anims.length) throw new Error("No animation clip found in the file.");
  anims[0].setName(name);
  await io.write(outPath, doc);

  // 3) Upsert the manifest.
  const list = upsertManifest(name, `${name}.glb`);
  return { name, file: `${name}.glb`, url: `/models/poses/${name}.glb`, count: list.length };
}

function upsertManifest(name, file) {
  let list = [];
  if (existsSync(MANIFEST)) {
    try {
      list = JSON.parse(readFileSync(MANIFEST, "utf8"));
    } catch {
      list = [];
    }
  }
  list = list.filter((p) => p.name !== name);
  list.push({ name, file });
  writeFileSync(MANIFEST, JSON.stringify(list, null, 2));
  return list;
}
