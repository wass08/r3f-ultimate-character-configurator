import { useRef, useState } from "react";
import { fetchAnimationClips, parseAnimationFile } from "../loadClips";
import { usePreviewStore } from "../previewStore";

// Pose Studio — live preview of imported animations.
//
// Drop (or pick) an .fbx / .glb and it parses in-renderer and plays on your
// character instantly, no conversion needed. The library list shows poses already
// converted into the GLB pose library (via `npm run add-pose`); click one to
// preview it. If the host provides `onSavePose`, a dropped FBX/GLB can be sent to
// the CLI converter to persist it.
//
// Props:
//   library         [{ name, url }]  converted poses from the manifest
//   onSavePose      optional (file, name) => Promise  persist a pose (IPC)
//   onLoadCharacter optional (file) => void  swap to an exported character GLB
export const PoseStudio = ({ library = [], onSavePose, onLoadCharacter }) => {
  const inputRef = useRef(null);
  const charInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lastFile, setLastFile] = useState(null);
  const status = usePreviewStore((s) => s.status);
  const error = usePreviewStore((s) => s.error);
  const clipName = usePreviewStore((s) => s.clipName);
  const setStatus = usePreviewStore((s) => s.setStatus);
  const preview = usePreviewStore((s) => s.preview);
  const clear = usePreviewStore((s) => s.clear);

  async function loadFile(file) {
    if (!file) return;
    setLastFile(file);
    setStatus("parsing");
    try {
      const { animations } = await parseAnimationFile(file);
      if (!animations.length) throw new Error("No animation clips found in this file.");
      const clip = animations[0];
      preview(clip, clip.name || file.name.replace(/\.[^.]+$/, ""), "file");
    } catch (e) {
      setStatus("error", e.message);
    }
  }

  async function loadLibrary(item) {
    setLastFile(null);
    setStatus("parsing");
    try {
      const { animations } = await fetchAnimationClips(item.url);
      if (!animations.length) throw new Error("No clips in " + item.name);
      preview(animations[0], item.name, "library");
    } catch (e) {
      setStatus("error", e.message);
    }
  }

  async function save() {
    if (!onSavePose || !lastFile) return;
    setStatus("saving");
    try {
      await onSavePose(lastFile, clipName || lastFile.name);
      setStatus("ready");
    } catch (e) {
      setStatus("error", e.message);
    }
  }

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    loadFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div style={wrap}>
      <button onClick={() => setOpen((o) => !o)} style={pill}>
        {open ? "▾ Pose Studio" : "▸ Pose Studio"}
      </button>

      {open && (
        <div style={panel}>
          {onLoadCharacter && (
            <div style={{ ...row, marginTop: 0, marginBottom: 10, justifyContent: "space-between" }}>
              <span style={{ opacity: 0.7 }}>Character</span>
              <button onClick={() => charInputRef.current?.click()} style={miniBtn}>
                Load .glb…
              </button>
              <input
                ref={charInputRef}
                type="file"
                accept=".glb,.gltf"
                style={{ display: "none" }}
                onChange={(e) => e.target.files?.[0] && onLoadCharacter(e.target.files[0])}
              />
            </div>
          )}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{ ...drop, borderColor: dragOver ? "#8b8bff" : "#ffffff33", background: dragOver ? "#8b8bff22" : "transparent" }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".fbx,.glb,.gltf"
              style={{ display: "none" }}
              onChange={(e) => loadFile(e.target.files?.[0])}
            />
            {status === "parsing" || status === "saving" ? (
              <Spinner label={status === "saving" ? "Converting…" : "Loading…"} />
            ) : (
              <span style={{ opacity: 0.8 }}>Drop or click — .fbx / .glb to preview</span>
            )}
          </div>

          {status === "ready" && clipName && (
            <div style={row}>
              <span style={{ color: "#3cff9a" }}>▶ {clipName}</span>
              <button onClick={clear} style={miniBtn}>Stop</button>
              {onSavePose && lastFile && (
                <button onClick={save} style={miniBtn}>Save to library</button>
              )}
            </div>
          )}

          {status === "error" && (
            <div style={{ ...row, color: "#ff6a6a" }}>⚠ {error}</div>
          )}

          {library.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, opacity: 0.5, margin: "2px 0 6px" }}>LIBRARY</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {library.map((item) => (
                  <button key={item.url} onClick={() => loadLibrary(item)} style={chip}>
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Spinner = ({ label }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    <span style={spinner} />
    {label}
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </span>
);

const wrap = { position: "fixed", top: 14, right: 14, zIndex: 50, fontFamily: "system-ui, sans-serif", textAlign: "right" };
const pill = { appearance: "none", border: "1px solid #ffffff22", background: "rgba(18,16,40,0.82)", color: "#f3f1ff", borderRadius: 999, padding: "6px 14px", fontSize: 12, cursor: "pointer" };
const panel = { marginTop: 8, width: 280, padding: 12, borderRadius: 14, background: "rgba(18,16,40,0.86)", backdropFilter: "blur(8px)", color: "#f3f1ff", textAlign: "left", boxShadow: "0 12px 30px rgba(0,0,0,0.45)" };
const drop = { border: "1px dashed", borderRadius: 10, padding: "18px 10px", textAlign: "center", fontSize: 12, cursor: "pointer", transition: "all .15s" };
const row = { display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginTop: 8 };
const miniBtn = { appearance: "none", border: "1px solid #ffffff22", background: "#ffffff10", color: "#f3f1ff", borderRadius: 8, padding: "4px 8px", fontSize: 11, cursor: "pointer" };
const chip = { appearance: "none", border: "1px solid #ffffff22", background: "#ffffff10", color: "#f3f1ff", borderRadius: 8, padding: "5px 9px", fontSize: 12, cursor: "pointer" };
const spinner = { width: 12, height: 12, borderRadius: "50%", border: "2px solid #ffffff33", borderTopColor: "#8b8bff", display: "inline-block", animation: "spin .7s linear infinite" };
