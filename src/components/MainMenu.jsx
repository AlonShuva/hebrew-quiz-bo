import { auth } from "../firebase/config";

const rpgPanel = {
  background: "rgba(10,14,40,0.88)",
  border: "2px solid #334155",
  borderRadius: 12,
  boxShadow: "0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
};

const MENU_ITEMS = [
  { key: "curriculumMap", icon: "⚔️", label: "התחל/י ללמוד",    desc: "30 רמות מאפס עד בגרות + אתגר יומי", accent: "#4ade80", highlight: true },
  { key: "multi",         icon: "👥", label: "תחרות",          desc: "התחרה עם חברים בזמן אמת",           accent: "#38bdf8" },
  { key: "leaderboard",  icon: "🏆", label: "לוח תוצאות",     desc: "ראה מי בראש הטבלה",                 accent: "#facc15" },
  { key: "achievements",  icon: "🏅", label: "הישגים",         desc: "עקוב אחר ההתקדמות שלך",             accent: "#c084fc" },
  { key: "admin",         icon: "⚙️", label: "ניהול שאלות",    desc: "הוסף ועדכן שאלות",                  accent: "#fb923c" },
];

export default function MainMenu({ user, onNavigate }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "40px 20px 60px",
      fontFamily: "'Segoe UI', Arial, sans-serif",
      position: "relative",
    }}>

      {/* Starfield */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        {stars.map((s, i) => (
          <div key={i} style={{
            position: "absolute", left: s.x, top: s.y,
            width: s.r, height: s.r, borderRadius: "50%",
            background: "white", opacity: s.o,
            animation: `twinkle ${s.d}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
          }} />
        ))}
      </div>
      <style>{`@keyframes twinkle { 0%,100%{opacity:var(--op,0.6)} 50%{opacity:0.1} }`}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 36, position: "relative", zIndex: 1 }}>
        <h1 style={{
          fontSize: "1.9rem", fontWeight: 800,
          color: "#93c5fd",
          textShadow: "0 0 24px rgba(147,197,253,0.3)",
          marginBottom: 6, letterSpacing: "-0.5px",
        }}>
          למידת מתמטיקה
        </h1>
        <p style={{ fontSize: "0.9rem", color: "#475569", marginBottom: 16 }}>
          תחום הגדרה — מאפס עד בגרות 5 יחידות
        </p>

        {/* User badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          ...rpgPanel, padding: "6px 16px",
          fontSize: "0.88rem", color: "#f1f5f9",
        }}>
          <img
            src={user.photoURL} alt=""
            style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid #475569" }}
            onError={e => e.target.style.display = "none"}
          />
          שלום, {user.displayName}!
        </div>
      </div>

      {/* Menu buttons */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 12,
        width: "100%", maxWidth: 380, position: "relative", zIndex: 1,
      }}>
        {MENU_ITEMS.map((btn, i) => (
          <button
            key={btn.key}
            onClick={() => onNavigate(btn.key)}
            style={{
              padding: "16px 20px",
              background: "linear-gradient(160deg, #1a2035, #111827)",
              border: "1.5px solid #2a3a52",
              borderRadius: 12,
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 16,
              textAlign: "right",
              transition: "all 0.2s",
              boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
              fontFamily: "inherit",
              animationDelay: `${i * 0.07}s`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "linear-gradient(160deg, #1e2a42, #151e2e)";
              e.currentTarget.style.borderColor = "#3d5275";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.5)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "linear-gradient(160deg, #1a2035, #111827)";
              e.currentTarget.style.borderColor = "#2a3a52";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.4)";
            }}
          >
            {/* Icon gem */}
            <div style={{
              width: 48, height: 48, borderRadius: 10, flexShrink: 0,
              background: "rgba(255,255,255,0.04)",
              border: "1.5px solid #2a3a52",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.5rem",
            }}>
              {btn.icon}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                fontWeight: 800, fontSize: "1rem", marginBottom: 2,
                color: "#e2e8f0",
                textShadow: "none",
              }}>
                {btn.label}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>{btn.desc}</div>
            </div>

            <span style={{ color: "#475569", fontSize: "1.2rem", opacity: 0.7 }}>‹</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => auth.signOut()}
        style={{
          marginTop: 28, color: "#6b7280", background: "none",
          border: "none", cursor: "pointer", fontSize: "0.85rem",
          fontFamily: "inherit", position: "relative", zIndex: 1,
        }}
      >
        התנתק ←
      </button>
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

const stars = Array.from({ length: 60 }, (_, i) => ({
  x: `${(i * 37.3 + 11) % 100}%`,
  y: `${(i * 53.7 + 7)  % 100}%`,
  r: i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
  o: 0.3 + (i % 7) * 0.1,
  d: 2 + (i % 4),
  delay: (i % 6) * 0.5,
}));
