import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

// ─── Map layout config ────────────────────────────────────────────
const MAP_W   = 370;   // container width (px)
const AMP     = 115;   // horizontal sine-wave amplitude
const ROW_H   = 145;   // vertical gap between levels (px)
const DEST_H  = 80;    // vertical space reserved for destination node
const BOT_PAD = 80;    // padding below first level
const NODE    = 72;    // node diameter (px)
const FREQ    = 0.85;  // sine wave frequency (higher = tighter curves)

// ─── Visual themes — deep blue ───────────────────────────────────
const THEMES = [
  { ring: "#0a1f3d", gem: "#1d4ed8", icon: "🛡️" },
  { ring: "#0a1f3d", gem: "#1d4ed8", icon: "⚔️" },
  { ring: "#0a1f3d", gem: "#1d4ed8", icon: "💎" },
  { ring: "#0a1f3d", gem: "#1d4ed8", icon: "🔮" },
  { ring: "#0a1f3d", gem: "#1d4ed8", icon: "🌟" },
  { ring: "#0a1f3d", gem: "#1d4ed8", icon: "🔥" },
  { ring: "#0a1f3d", gem: "#1d4ed8", icon: "👑" },
];

// ─── Generate x/y for level at sorted index i (0 = level 1 = bottom) ─
// row 0 is at the top (near destination), row n-1 is at the bottom (level 1)
function genPos(i, n) {
  const row = n - 1 - i;                         // flip: level 1 at bottom
  return {
    x: MAP_W / 2 + AMP * Math.sin(row * FREQ),
    y: DEST_H + row * ROW_H,
  };
}

// ─── Build smooth Catmull-Rom path through all points ────────────
function smoothPath(pts) {
  if (pts.length < 2) return "";
  const T = 5; // tension (higher = smoother)
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = (p1.x + (p2.x - p0.x) / T).toFixed(1);
    const cp1y = (p1.y + (p2.y - p0.y) / T).toFixed(1);
    const cp2x = (p2.x - (p3.x - p1.x) / T).toFixed(1);
    const cp2y = (p2.y - (p3.y - p1.y) / T).toFixed(1);
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// ─── Single segment path (same formula, for lit-segment overlay) ──
function oneSegPath(pts, i) {
  const p0 = pts[Math.max(0, i - 1)];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[Math.min(pts.length - 1, i + 2)];
  const T = 5;
  return [
    `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
    `C ${(p1.x + (p2.x - p0.x) / T).toFixed(1)} ${(p1.y + (p2.y - p0.y) / T).toFixed(1)},`,
    `  ${(p2.x - (p3.x - p1.x) / T).toFixed(1)} ${(p2.y - (p3.y - p1.y) / T).toFixed(1)},`,
    `  ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
  ].join(" ");
}

// ─────────────────────────────────────────────────────────────────
export default function LevelSelect({ onSelectLevel, onBack, user }) {
  const [levels,   setLevels]   = useState([]);
  const [unlocked, setUnlocked] = useState([]);
  const [streak,   setStreak]   = useState(0);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const load = async () => {
      const [levSnap, userSnap] = await Promise.all([
        getDocs(collection(db, "levels")),
        getDoc(doc(db, "users", user.uid)),
      ]);
      const sorted = levSnap.docs.map(d => d.data()).sort((a, b) => a.id - b.id);
      setLevels(sorted);
      const ud = userSnap.exists() ? userSnap.data() : {};
      setUnlocked(ud.unlockedLevels ?? (sorted.length ? [sorted[0].id] : []));
      setStreak(ud.streak ?? 0);
      setLoading(false);
    };
    load();
  }, [user.uid]);

  // Index of the last unlocked level in the sorted array
  const lastUnlocked = levels.reduce((acc, l, i) => unlocked.includes(l.id) ? i : acc, -1);

  // Auto-scroll to centre the current level on mount
  useEffect(() => {
    if (loading || lastUnlocked < 0) return;
    const { y } = genPos(lastUnlocked, levels.length);
    const scrollTo = y - window.innerHeight / 2 + NODE / 2;
    setTimeout(() => window.scrollTo({ top: Math.max(0, scrollTo), behavior: "smooth" }), 350);
  }, [loading]); // eslint-disable-line

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "rgba(255,255,255,0.88)", borderRadius: 16, padding: "20px 32px",
        backdropFilter: "blur(14px)", fontWeight: 700, color: "#1A1D3A", fontSize: "1rem" }}>
        טוען מפה... 🗺️
      </div>
    </div>
  );

  const n         = levels.length;
  const totalH    = DEST_H + (n > 0 ? n : 1) * ROW_H + BOT_PAD;
  const progress  = n ? Math.round((unlocked.length / n) * 100) : 0;

  // All path points: level-1 (bottom) → … → level-n (top) → destination
  const positions = levels.map((_, i) => genPos(i, n));
  const destPt    = { x: MAP_W / 2, y: 30 };
  const allPts    = [...positions, destPt];          // [level1_pos … levelN_pos, dest]
  // Note: positions[0] = level1 (bottom, highest y), positions[n-1] = levelN (top, low y)

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 80,
      fontFamily: "'Segoe UI', Arial, sans-serif" }}>

      {/* ── Daily Streak — fixed top-left ── */}
      <div style={{
        position: "fixed", top: 14, left: 14, zIndex: 100,
        background: "linear-gradient(135deg,rgba(26,35,126,0.93),rgba(40,53,147,0.93))",
        backdropFilter: "blur(10px)",
        borderRadius: 14, padding: "8px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        border: "1.5px solid rgba(255,255,255,0.25)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      }}>
        <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.85)", fontWeight: 700, letterSpacing: "0.5px" }}>
          Daily Streak
        </span>
        <div style={{ display: "flex", gap: 3 }}>
          {[0, 1, 2].map(s => (
            <span key={s} style={{ fontSize: "0.88rem",
              color: s < Math.min(streak, 3) ? "#FFD700" : "rgba(255,255,255,0.18)" }}>★</span>
          ))}
        </div>
        <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>
          {streak} ימים
        </span>
      </div>

      {/* ── Back — fixed top-right ── */}
      <button
        onClick={() => { window.scrollTo({ top: 0 }); onBack(); }}
        style={{
          position: "fixed", top: 14, right: 14, zIndex: 100,
          background: "rgba(255,255,255,0.88)", borderRadius: 12,
          backdropFilter: "blur(10px)",
          border: "1.5px solid rgba(255,255,255,0.6)", padding: "8px 18px",
          fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          fontSize: "0.85rem", color: "#1A1D3A",
          boxShadow: "0 3px 12px rgba(0,0,0,0.22)",
        }}>← חזור</button>

      {n === 0 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: "80vh" }}>
          <div style={{ background: "rgba(255,255,255,0.88)", borderRadius: 16, padding: "28px 36px",
            backdropFilter: "blur(14px)", textAlign: "center" }}>
            <p style={{ fontWeight: 700, color: "#1A1D3A", fontSize: "1rem" }}>אין רמות עדיין</p>
            <p style={{ fontSize: "0.85rem", color: "#6B7280", marginTop: 6 }}>הוסף רמות דרך פאנל הניהול</p>
          </div>
        </div>
      ) : (
        <div style={{ position: "relative", width: MAP_W, height: totalH, margin: "0 auto" }}>

          {/* ── SVG path ── */}
          <svg
            width={MAP_W} height={totalH}
            style={{ position: "absolute", top: 0, left: 0, zIndex: 1, overflow: "visible" }}
          >
            <defs>
              <filter id="litGlow">
                <feGaussianBlur stdDeviation="5" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* 1. Drop shadow */}
            <path d={smoothPath(allPts)} stroke="rgba(0,0,0,0.28)" strokeWidth={30}
              fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            {/* 2. Stone base */}
            <path d={smoothPath(allPts)} stroke="#9E8E6A" strokeWidth={22}
              fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            {/* 3. Stone highlight */}
            <path d={smoothPath(allPts)} stroke="#BFB08A" strokeWidth={17}
              fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            {/* 4. Lit (gold) segments — one per unlocked level */}
            {levels.map((level, i) => {
              if (!unlocked.includes(level.id)) return null;
              return (
                <path key={i}
                  d={oneSegPath(allPts, i)}
                  stroke="#F9C74F" strokeWidth={17} fill="none"
                  strokeLinecap="round" filter="url(#litGlow)" opacity={0.92}
                />
              );
            })}
            {/* 5. Stone crack / joint dashes */}
            <path d={smoothPath(allPts)} stroke="rgba(0,0,0,0.16)" strokeWidth={3}
              fill="none" strokeLinecap="round" strokeDasharray="14 26"/>
            <path d={smoothPath(allPts)} stroke="rgba(255,255,255,0.28)" strokeWidth={2}
              fill="none" strokeLinecap="round" strokeDasharray="14 26" strokeDashoffset="9"/>
          </svg>

          {/* ── Destination node ── */}
          <div style={{
            position: "absolute",
            left: destPt.x, top: destPt.y,
            transform: "translate(-50%, -50%)",
            zIndex: 5,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
          }}>
            <div style={{
              width: 78, height: 78, borderRadius: 18,
              background: "linear-gradient(135deg,#FFE066,#FFB020,#E65100)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2.4rem",
              boxShadow: "0 0 36px rgba(255,200,0,0.7), 0 8px 22px rgba(0,0,0,0.35)",
              border: "3px solid rgba(255,255,255,0.92)",
              animation: "float 3s ease-in-out infinite",
            }}>🏰</div>
            <div style={{
              background: "rgba(255,255,255,0.9)", borderRadius: 10,
              padding: "3px 12px", backdropFilter: "blur(8px)",
              fontSize: "0.72rem", fontWeight: 800, color: "#1A1D3A",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}>🎓 יעד סופי</div>
          </div>

          {/* ── Level nodes ── */}
          {levels.map((level, i) => {
            const { x, y }   = positions[i];
            const isUnlocked = unlocked.includes(level.id);
            const isCompleted = i < lastUnlocked && isUnlocked;
            const isCurrent   = i === lastUnlocked;
            const theme = THEMES[i % THEMES.length];

            return (
              <div key={level.id} style={{
                position: "absolute",
                left: x, top: y,
                transform: "translate(-50%, -50%)",
                zIndex: 6,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              }}>

                {/* Sparkles on active level */}
                {isCurrent && (
                  <>
                    <div className="sparkle-anim" style={{ position: "absolute", top: -14, left: -8,  fontSize: "0.9rem",  animationDelay: "0s",   pointerEvents: "none" }}>✨</div>
                    <div className="sparkle-anim" style={{ position: "absolute", top: -8,  right: -12, fontSize: "0.75rem", animationDelay: "0.45s", pointerEvents: "none" }}>💫</div>
                    <div className="sparkle-anim" style={{ position: "absolute", bottom: 14, left: 4,  fontSize: "0.65rem", animationDelay: "0.85s", pointerEvents: "none" }}>⭐</div>
                  </>
                )}

                {/* Ground shadow */}
                <div style={{
                  position: "absolute", bottom: 18,
                  width: NODE - 10, height: 12, borderRadius: "50%",
                  background: "rgba(0,0,0,0.3)", filter: "blur(5px)",
                  pointerEvents: "none",
                }}/>

                {/* Medallion button */}
                <button
                  onClick={() => isUnlocked && onSelectLevel(level.id)}
                  disabled={!isUnlocked}
                  className={isCurrent ? "lvl-bounce" : isCompleted ? "lvl-pulse" : ""}
                  style={{
                    width: NODE, height: NODE, borderRadius: "50%",
                    padding: 0, border: "none", background: "none",
                    cursor: isUnlocked ? "pointer" : "not-allowed",
                    fontFamily: "inherit", position: "relative",
                    transition: "transform 0.15s",
                  }}
                  onMouseEnter={e => { if (isUnlocked) e.currentTarget.style.transform = "scale(1.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  {/* Outer metallic ring */}
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    background: isUnlocked
                      ? `radial-gradient(circle at 38% 28%, ${theme.ring}dd, ${theme.ring})`
                      : "radial-gradient(circle at 38% 28%, #666, #2a2a2a)",
                    boxShadow: isUnlocked
                      ? `0 0 0 4px ${theme.ring}66, 0 0 0 7px rgba(255,255,255,0.35), 0 8px 22px rgba(0,0,0,0.4), inset 0 -6px 12px rgba(0,0,0,0.35), inset 0 6px 10px rgba(255,255,255,0.18)`
                      : "0 0 0 4px rgba(80,80,80,0.4), 0 0 0 7px rgba(255,255,255,0.1), 0 6px 14px rgba(0,0,0,0.35)",
                  }}/>
                  {/* Inner gem */}
                  <div style={{
                    position: "absolute", inset: 10, borderRadius: "50%",
                    background: isUnlocked
                      ? `radial-gradient(circle at 35% 28%, ${theme.gem}ee, ${theme.gem}88, ${theme.ring}66)`
                      : "radial-gradient(circle at 35% 28%, #555, #222)",
                    boxShadow: isUnlocked
                      ? `0 0 18px ${theme.gem}99, inset 0 -5px 10px rgba(0,0,0,0.3), inset 0 5px 10px rgba(255,255,255,0.28)`
                      : "none",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 1,
                  }}>
                    {/* Specular highlight */}
                    <div style={{
                      position: "absolute", top: 6, left: 9,
                      width: 16, height: 6, borderRadius: "50%",
                      background: "rgba(255,255,255,0.55)", transform: "rotate(-28deg)",
                      pointerEvents: "none",
                    }}/>
                    {isUnlocked ? (
                      <>
                        <span style={{ fontSize: "1.15rem", lineHeight: 1 }}>{theme.icon}</span>
                        <span style={{ fontSize: "0.6rem", fontWeight: 900, color: "white",
                          textShadow: "0 1px 4px rgba(0,0,0,0.6)", lineHeight: 1 }}>{i + 1}</span>
                      </>
                    ) : (
                      <span style={{ fontSize: "1.2rem" }}>🔒</span>
                    )}
                  </div>
                  {/* Completed check badge */}
                  {isCompleted && (
                    <div style={{
                      position: "absolute", bottom: -3, right: -3,
                      width: 22, height: 22, borderRadius: "50%",
                      background: "#27AE60", border: "2px solid white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.65rem", color: "white", fontWeight: 900,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                    }}>✓</div>
                  )}
                </button>

                {/* Level name label */}
                <div style={{
                  background: "rgba(255,255,255,0.88)", borderRadius: 8,
                  padding: "2px 8px", backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255,255,255,0.7)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  maxWidth: 115, textAlign: "center",
                }}>
                  <div style={{ fontSize: "0.57rem", fontWeight: 700, lineHeight: 1.3,
                    color: isUnlocked ? "#1A1D3A" : "#aaa" }}>
                    {level.name}
                  </div>
                </div>

                {/* Stars */}
                <div style={{ display: "flex", gap: 2, marginTop: -1 }}>
                  {[0, 1, 2].map(s => (
                    <span key={s} style={{
                      fontSize: "0.72rem",
                      color: isCompleted ? "#FFD700" : isCurrent && s === 0 ? "#FFD700" : "rgba(0,0,0,0.18)",
                      filter: isCompleted ? "drop-shadow(0 1px 2px rgba(255,180,0,0.5))" : "none",
                    }}>★</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Fixed bottom progress bar ── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(255,255,255,0.9)", backdropFilter: "blur(14px)",
        borderTop: "1px solid rgba(255,255,255,0.5)",
        padding: "10px 20px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: "1.35rem" }}>🧳</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            fontSize: "0.7rem", fontWeight: 700, color: "#374151", marginBottom: 4 }}>
            <span>Journey Progress</span>
            <span>{unlocked.length} / {n} • {progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}/>
          </div>
        </div>
        <span style={{ fontSize: "1.35rem" }}>💎</span>
      </div>
    </div>
  );
}
