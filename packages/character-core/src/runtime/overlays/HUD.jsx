import { useCharacterStore } from "../../actions/characterStore";

const DOT = { offline: "#ff5a5a", connecting: "#ffcf4a", online: "#3cff9a" };

// Minimal always-on overlay: connection status + level/XP progress. Presentational
// and shell-agnostic — the host may pass `interactive` handlers (e.g. the desktop
// pet's hover→click-through toggles) so the pill can double as a drag handle; in
// a browser tab it's an empty object and the pill is inert.
export const HUD = ({ interactive = {} }) => {
  const level = useCharacterStore((s) => s.level);
  const connection = useCharacterStore((s) => s.connection);
  const progress = useCharacterStore((s) => s.xpProgress());

  return (
    <div
      {...interactive}
      style={{
        position: "fixed",
        top: 14,
        left: 14,
        WebkitAppRegion: "drag", // CSS-only; lets the desktop pet be dragged, ignored in browsers
        cursor: "grab",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(18,16,40,0.7)",
        backdropFilter: "blur(6px)",
        color: "#f3f1ff",
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
        zIndex: 40,
        userSelect: "none",
      }}
      title={`Gateway: ${connection}`}
    >
      <span style={{ width: 8, height: 8, borderRadius: 8, background: DOT[connection] || "#888" }} />
      <span style={{ fontWeight: 700 }}>Lv {level}</span>
      <span style={{ position: "relative", width: 70, height: 6, borderRadius: 6, background: "#ffffff22" }}>
        <span
          style={{
            position: "absolute",
            inset: 0,
            width: `${Math.round(progress * 100)}%`,
            borderRadius: 6,
            background: "linear-gradient(90deg,#8b8bff,#ff7ec8)",
            transition: "width .4s ease",
          }}
        />
      </span>
    </div>
  );
};
