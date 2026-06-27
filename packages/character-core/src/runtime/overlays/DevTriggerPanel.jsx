import { useState } from "react";
import { useCharacterStore } from "../../actions/characterStore";

// Sample events covering every hero action — lets you demo the whole thing with
// zero backend. Each is *published to the bus*, the exact same pipeline the
// gateway/MCP feed, so what you see here is what a real notification produces.
const SAMPLES = [
  { emoji: "🎉", label: "Task done", event: { source: "manual", kind: "task_completed", title: "Task completed", body: "Shipped the onboarding flow" } },
  { emoji: "🟢", label: "Deploy OK", event: { source: "github", kind: "deploy_succeeded", title: "Deploy to prod succeeded", actor: "ci-bot" } },
  { emoji: "💢", label: "Boss (angry)", event: { source: "email", kind: "email_received", sentiment: "negative", actor: "boss", title: "You missed the report", body: "This was due yesterday — where is it?" } },
  { emoji: "😉", label: "Boss (praise)", event: { source: "email", kind: "email_received", sentiment: "positive", actor: "boss", title: "Great work!", body: "Really appreciate the effort on this." } },
  { emoji: "🤦", label: "CI failed", event: { source: "github", kind: "ci_failed", title: "CI failed on main", actor: "ci-bot" } },
  { emoji: "⚡", label: "Mention", event: { source: "slack", kind: "mention", sentiment: "urgent", actor: "alex", title: "@you can you review this?" } },
];

export const DevTriggerPanel = ({ bus }) => {
  const reset = useCharacterStore((s) => s.reset);
  const [open, setOpen] = useState(true);

  // Publish to the bus when wired; fall back to the store directly (e.g. tests).
  const fire = (event) =>
    bus ? bus.publish(event) : useCharacterStore.getState().trigger(event);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ ...pillStyle, marginBottom: open ? 8 : 0, display: "block", margin: "0 auto 8px" }}
      >
        {open ? "▾ Demo triggers" : "▸ Demo triggers"}
      </button>
      {open && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "center",
            maxWidth: 560,
            padding: 10,
            borderRadius: 14,
            background: "rgba(18,16,40,0.78)",
            backdropFilter: "blur(8px)",
          }}
        >
          {SAMPLES.map((s) => (
            <button key={s.label} onClick={() => fire(s.event)} style={btnStyle}>
              <span style={{ fontSize: 16 }}>{s.emoji}</span> {s.label}
            </button>
          ))}
          <button onClick={reset} style={{ ...btnStyle, opacity: 0.7 }}>
            ⟲ Reset
          </button>
        </div>
      )}
    </div>
  );
};

const btnStyle = {
  appearance: "none",
  border: "1px solid #ffffff22",
  background: "#ffffff10",
  color: "#f3f1ff",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 13,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const pillStyle = {
  appearance: "none",
  border: "1px solid #ffffff22",
  background: "rgba(18,16,40,0.78)",
  color: "#f3f1ff",
  borderRadius: 999,
  padding: "6px 14px",
  fontSize: 12,
  cursor: "pointer",
};
