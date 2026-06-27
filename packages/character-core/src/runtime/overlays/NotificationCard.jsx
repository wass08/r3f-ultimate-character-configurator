import { useEffect, useState } from "react";
import { useCharacterStore } from "../../actions/characterStore";

const SOURCE_ICON = {
  github: "🐙",
  slack: "💬",
  email: "✉️",
  manual: "🎛️",
  mcp: "🔌",
  system: "🖥️",
};

// The notification "card" the character reacts toward — a toast in the top-right
// that mirrors the live event. Auto-hides shortly after the reaction ends.
export const NotificationCard = () => {
  const current = useCharacterStore((s) => s.current);
  const playing = useCharacterStore((s) => s.playing);
  const [shown, setShown] = useState(null);

  useEffect(() => {
    if (playing && current.event) {
      setShown({ ...current.event, accent: current.accent, emoji: current.emoji, label: current.label });
    } else if (!playing) {
      const t = setTimeout(() => setShown(null), 500);
      return () => clearTimeout(t);
    }
  }, [playing, current]);

  if (!shown) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 18,
        right: 18,
        width: 264,
        padding: "12px 14px",
        borderRadius: 14,
        background: "rgba(18, 16, 40, 0.82)",
        backdropFilter: "blur(8px)",
        border: `1px solid ${shown.accent}55`,
        boxShadow: `0 10px 30px rgba(0,0,0,0.45), 0 0 0 1px ${shown.accent}22`,
        color: "#f3f1ff",
        fontFamily: "system-ui, sans-serif",
        zIndex: 40,
        animation: "cardIn 240ms cubic-bezier(.2,.9,.2,1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{SOURCE_ICON[shown.source] || "🔔"}</span>
        <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: shown.accent }}>
          {shown.source}
        </span>
        {shown.actor && (
          <span style={{ fontSize: 11, opacity: 0.6, marginLeft: "auto" }}>{shown.actor}</span>
        )}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{shown.title}</div>
      {shown.body && (
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, lineHeight: 1.35 }}>{shown.body}</div>
      )}
      <div style={{ fontSize: 11, marginTop: 8, color: shown.accent }}>
        {shown.emoji} {shown.label}
      </div>
      <style>{`@keyframes cardIn{from{opacity:0;transform:translateY(-8px) scale(.96)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
};
