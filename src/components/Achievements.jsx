import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";

const CATEGORIES = [
  { key: "all",      label: "הכל" },
  { key: "accuracy", label: "🎯 דיוק" },
  { key: "streak",   label: "📅 עקביות" },
  { key: "progress", label: "🗺️ התקדמות" },
  { key: "multi",    label: "⚔️ דו-קרב" },
  { key: "persist",  label: "💪 נחישות" },
];

const ACHIEVEMENTS = [
  { id: "clean",         name: "נקי לחלוטין",  desc: "סיים רמה ללא אף טעות",     icon: "✨", category: "accuracy" },
  { id: "no_hint",       name: "בלי עזרה",     desc: "סיים רמה בלי להשתמש ברמז", icon: "🎯", category: "accuracy" },
  { id: "perfectionist", name: "פרפקציוניסט",  desc: "סיים 5 רמות ללא טעויות",   icon: "💎", category: "accuracy" },
  { id: "consistent",    name: "מתמיד",         desc: "שחק 3 ימים רצופים",         icon: "📅", category: "streak" },
  { id: "loyal",         name: "נאמן",          desc: "שחק 5 ימים רצופים",         icon: "🔥", category: "streak" },
  { id: "routine",       name: "שגרה",          desc: "שחק 7 ימים רצופים",         icon: "⚡", category: "streak" },
  { id: "dedicated",     name: "מסור",          desc: "שחק 14 ימים רצופים",        icon: "💫", category: "streak" },
  { id: "devoted",       name: "חסיד",          desc: "שחק 30 ימים רצופים",        icon: "👑", category: "streak" },
  { id: "explorer",      name: "חוקר",          desc: "השלם 5 רמות שונות",         icon: "🗺️", category: "progress" },
  { id: "climber",       name: "מטפס",          desc: "השלם 15 רמות",              icon: "🧗", category: "progress" },
  { id: "conqueror",     name: "כובש",          desc: "השלם את כל הרמות",          icon: "🏆", category: "progress" },
  { id: "fighter",       name: "לוחם",          desc: "שחק דו-קרב ראשון",          icon: "⚔️", category: "multi" },
  { id: "winner",        name: "מנצח",          desc: "נצח בדו-קרב",               icon: "🥇", category: "multi" },
  { id: "arena_lord",    name: "שליט הזירה",    desc: "נצח 5 דו-קרבות",            icon: "👑", category: "multi" },
  { id: "resilient",     name: "עמיד",          desc: "נכשלת ברמה ועברת אותה",     icon: "💪", category: "persist" },
  { id: "replayer",      name: "מחזר",          desc: "חזרת לרמה שכבר השלמת",      icon: "🔄", category: "persist" },
];

function isUnlocked(id, progress, daily) {
  switch (id) {
    case "clean":         return (progress.perfectLevels   || 0) >= 1;
    case "no_hint":       return (progress.noHintLevels    || 0) >= 1;
    case "perfectionist": return (progress.perfectLevels   || 0) >= 5;
    case "consistent":    return (daily.streak || 0) >= 3;
    case "loyal":         return (daily.streak || 0) >= 5;
    case "routine":       return (daily.streak || 0) >= 7;
    case "dedicated":     return (daily.streak || 0) >= 14;
    case "devoted":       return (daily.streak || 0) >= 30;
    case "explorer":      return (progress.completedLevels || []).length >= 5;
    case "climber":       return (progress.completedLevels || []).length >= 15;
    case "conqueror":     return (progress.completedLevels || []).length >= 99;
    case "fighter":       return (progress.multiplayerGames|| 0) >= 1;
    case "winner":        return (progress.multiplayerWins || 0) >= 1;
    case "arena_lord":    return (progress.multiplayerWins || 0) >= 5;
    case "resilient":     return (progress.retriedAndPassed|| 0) >= 1;
    case "replayer":      return (progress.replayedLevels  || 0) >= 1;
    default:              return false;
  }
}

function getProgress(id, progress, daily) {
  switch (id) {
    case "clean":         return { cur: progress.perfectLevels    || 0, req: 1 };
    case "no_hint":       return { cur: progress.noHintLevels     || 0, req: 1 };
    case "perfectionist": return { cur: progress.perfectLevels    || 0, req: 5 };
    case "consistent":    return { cur: daily.streak || 0, req: 3 };
    case "loyal":         return { cur: daily.streak || 0, req: 5 };
    case "routine":       return { cur: daily.streak || 0, req: 7 };
    case "dedicated":     return { cur: daily.streak || 0, req: 14 };
    case "devoted":       return { cur: daily.streak || 0, req: 30 };
    case "explorer":      return { cur: (progress.completedLevels || []).length, req: 5 };
    case "climber":       return { cur: (progress.completedLevels || []).length, req: 15 };
    case "conqueror":     return { cur: (progress.completedLevels || []).length, req: 99 };
    case "fighter":       return { cur: progress.multiplayerGames || 0, req: 1 };
    case "winner":        return { cur: progress.multiplayerWins  || 0, req: 1 };
    case "arena_lord":    return { cur: progress.multiplayerWins  || 0, req: 5 };
    case "resilient":     return { cur: progress.retriedAndPassed || 0, req: 1 };
    case "replayer":      return { cur: progress.replayedLevels   || 0, req: 1 };
    default:              return { cur: 0, req: 1 };
  }
}

export default function Achievements({ user, onBack }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [progress, setProgress] = useState({});
  const [daily, setDaily] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [pSnap, dSnap] = await Promise.all([
        getDoc(doc(db, "userProgress", user.uid)),
        getDoc(doc(db, "userDailyProgress", user.uid)),
      ]);
      setProgress(pSnap.exists() ? pSnap.data() : {});
      setDaily(dSnap.exists() ? dSnap.data() : {});
      setLoading(false);
    })();
  }, [user.uid]);

  const visible = activeCategory === "all"
    ? ACHIEVEMENTS
    : ACHIEVEMENTS.filter(a => a.category === activeCategory);

  const unlockedCount = ACHIEVEMENTS.filter(a => isUnlocked(a.id, progress, daily)).length;

  return (
    <div style={{
      minHeight: "100vh",
      minHeight: "100dvh",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "30px 16px 50px",
      paddingTop: "calc(30px + env(safe-area-inset-top))",
      paddingBottom: "calc(50px + env(safe-area-inset-bottom))",
      fontFamily: "'Heebo', Arial, sans-serif",
    }}>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 560, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <button onClick={onBack} className="btn-back">← חזור</button>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>🏅 הישגים</h2>
        <div style={{ width: 80 }} />
      </div>

      {/* Summary */}
      <div style={{
        width: "100%", maxWidth: 560,
        background: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        borderRadius: 20, border: "1.5px solid rgba(255,255,255,0.6)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        padding: "18px 22px", marginBottom: 16,
        display: "flex", alignItems: "center", gap: 18,
      }}>
        <div style={{
          width: 58, height: 58, borderRadius: 16, flexShrink: 0,
          background: "rgba(67,160,71,0.12)", border: "2px solid rgba(67,160,71,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem",
        }}>🏅</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontWeight: 800, fontSize: "1rem", color: "#1a4228" }}>
              {loading ? "טוען..." : `${unlockedCount} / ${ACHIEVEMENTS.length} הישגים הושגו`}
            </span>
            {!loading && (
              <span style={{ fontSize: "0.8rem", color: "#4a7c59", fontWeight: 600 }}>
                {Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}%
              </span>
            )}
          </div>
          <div style={{ width: "100%", height: 10, background: "rgba(67,160,71,0.15)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: "linear-gradient(90deg,#43a047,#66bb6a)",
              width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%`,
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ width: "100%", maxWidth: 560, display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18, justifyContent: "center" }}>
        {CATEGORIES.map(cat => {
          const active = activeCategory === cat.key;
          return (
            <button key={cat.key} onClick={() => setActiveCategory(cat.key)} style={{
              padding: "6px 12px", borderRadius: 99, whiteSpace: "nowrap", fontFamily: "inherit",
              border: active ? "2px solid #43a047" : "1.5px solid rgba(255,255,255,0.5)",
              background: active ? "rgba(67,160,71,0.18)" : "rgba(255,255,255,0.7)",
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              color: active ? "#2e7d32" : "#4a7c59",
              fontWeight: active ? 800 : 600, fontSize: "0.82rem", cursor: "pointer",
              boxShadow: active ? "0 2px 8px rgba(67,160,71,0.2)" : "none",
            }}>{cat.label}</button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <p style={{ color: "white", opacity: 0.7 }}>טוען...</p>
      ) : (
        <div style={{ width: "100%", maxWidth: 560, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {visible.map((a, i) => {
            const unlocked = isUnlocked(a.id, progress, daily);
            const { cur, req } = getProgress(a.id, progress, daily);
            const pct = Math.min((cur / req) * 100, 100);
            return (
              <div key={a.id} className="fadeIn" style={{
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                borderRadius: 20,
                border: unlocked ? "2px solid rgba(76,175,80,0.4)" : "1.5px solid rgba(255,255,255,0.5)",
                boxShadow: unlocked ? "0 4px 16px rgba(67,160,71,0.12)" : "0 2px 10px rgba(0,0,0,0.07)",
                padding: "18px 14px 14px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                opacity: unlocked ? 1 : 0.55,
                filter: unlocked ? "none" : "saturate(0.3)",
                animationDelay: `${i * 0.04}s`, animationFillMode: "both",
                textAlign: "center", position: "relative",
              }}>
                {/* Icon */}
                <div style={{
                  width: 50, height: 50, borderRadius: 14, fontSize: "1.7rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: unlocked ? "rgba(76,175,80,0.1)" : "rgba(0,0,0,0.05)",
                  border: unlocked ? "2px solid rgba(76,175,80,0.35)" : "1.5px solid rgba(0,0,0,0.1)",
                }}>
                  {a.icon}
                </div>

                <div style={{ width: "100%" }}>
                  <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#1a4228", marginBottom: 2 }}>{a.name}</div>
                  <div style={{ fontSize: "0.74rem", color: "#4a7c59", marginBottom: 8, lineHeight: 1.4 }}>{a.desc}</div>
                  <div style={{ width: "100%", height: 6, background: "rgba(67,160,71,0.15)", borderRadius: 99, overflow: "hidden", marginBottom: 4 }}>
                    <div style={{
                      height: "100%", borderRadius: 99,
                      background: unlocked ? "linear-gradient(90deg,#43a047,#66bb6a)" : "rgba(67,160,71,0.4)",
                      width: `${pct}%`, transition: "width 0.4s ease",
                    }} />
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#4a7c59", fontWeight: 600 }}>{cur} / {req}</div>
                </div>

                {unlocked && (
                  <div style={{
                    position: "absolute", top: 10, left: 10,
                    background: "#43a047", color: "white",
                    borderRadius: 99, padding: "2px 8px",
                    fontSize: "0.65rem", fontWeight: 800,
                  }}>✓</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
