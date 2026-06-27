import { FBXLoader, GLTFLoader } from "three-stdlib";

// In-renderer animation parsing — the heart of live preview. We parse a dropped
// FBX or GLB directly in the browser/webview (no CLI round-trip) and hand back
// its AnimationClips. They play on the existing character because every Mixamo
// rig shares the `mixamorig:` bone names the skeleton already uses.

const gltfLoader = new GLTFLoader();

/**
 * Parse an ArrayBuffer into AnimationClips.
 * @param {ArrayBuffer} buffer
 * @param {string} filename  used only to pick the loader by extension
 * @returns {Promise<{ animations: import("three").AnimationClip[], format: string }>}
 */
export async function parseAnimationBuffer(buffer, filename = "") {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "fbx") {
    // FBXLoader is synchronous and returns a Group with `.animations`.
    const group = new FBXLoader().parse(buffer, "");
    return { animations: group.animations || [], format: "fbx" };
  }

  if (ext === "glb" || ext === "gltf") {
    const gltf = await gltfLoader.parseAsync(buffer, "");
    return { animations: gltf.animations || [], format: "gltf" };
  }

  throw new Error(`Unsupported file type ".${ext}". Drop a .fbx, .glb or .gltf.`);
}

/** Read a File (drag-drop / file input) and parse its clips. */
export async function parseAnimationFile(file) {
  const buffer = await file.arrayBuffer();
  return parseAnimationBuffer(buffer, file.name);
}

/** Fetch a GLB/GLTF url (e.g. a library pose) and parse its clips. */
export async function fetchAnimationClips(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url} (HTTP ${res.status})`);
  const buffer = await res.arrayBuffer();
  return parseAnimationBuffer(buffer, url);
}
