import { convertPose } from "./convert-pose.mjs";

// CLI: convert a Mixamo FBX (or a GLB) into the character's pose library.
//
//   npm run add-pose -- ~/Downloads/Wave.fbx Wave
//   npm run add-pose -- ./Jump.glb
//
// Result lands in apps/desktop/public/models/poses/<Name>.glb and is added to
// poses.json — it then shows up in Pose Studio's library for one-click preview.

const [src, name] = process.argv.slice(2);

if (!src) {
  console.error("usage: npm run add-pose -- <file.fbx|glb|gltf> [ClipName]");
  process.exit(1);
}

try {
  const r = await convertPose(src, name);
  console.log(`✓ Added pose "${r.name}" → public/models/poses/${r.file}`);
  console.log(`  Library now has ${r.count} pose(s).`);
  console.log(`  • Preview it in Pose Studio (it appears under LIBRARY).`);
  console.log(`  • To map it to an event, add it to POSES in`);
  console.log(`    packages/character-core/src/actions/actions.js and reference it from an action.`);
} catch (e) {
  console.error(`✗ ${e.message}`);
  if (/fbx2gltf/i.test(e.message) || e.code === "ERR_MODULE_NOT_FOUND") {
    console.error("  (FBX conversion needs the fbx2gltf binary — run `npm install` first.)");
  }
  process.exit(1);
}
