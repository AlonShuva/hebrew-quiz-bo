import { useState, useEffect, useRef } from "react";
import { db, SUPER_ADMIN_EMAIL } from "../firebase/config";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { curriculum } from "../../lib/curriculum.js";
import MathText from "./MathText";

// ── Tier colours (MapleStory-inspired: jewel tones) ──────────
const TIERS = [
  { main: "#3b82f6", dark: "#1d4ed8", glow: "rgba(59,130,246,0.6)"  },
  { main: "#3b82f6", dark: "#1d4ed8", glow: "rgba(59,130,246,0.6)"  },
  { main: "#3b82f6", dark: "#1d4ed8", glow: "rgba(59,130,246,0.6)"  },
  { main: "#3b82f6", dark: "#1d4ed8", glow: "rgba(59,130,246,0.6)"  },
  { main: "#3b82f6", dark: "#1d4ed8", glow: "rgba(59,130,246,0.6)"  },
  { main: "#3b82f6", dark: "#1d4ed8", glow: "rgba(59,130,246,0.6)"  },
];
function getTier(id) { return TIERS[Math.floor((id - 1) / 5) % TIERS.length]; }

// ── Layout (simple sine-wave winding path) ────────────────────
const SVG_W         = 340;
const NODE_R        = 28;
const LEVEL_SPACING = 96;
const PAD_BOTTOM    = 90;
const PAD_TOP       = 70;

function getSvgH(totalLevels) {
  return PAD_TOP + (totalLevels - 1) * LEVEL_SPACING + PAD_BOTTOM;
}

function getCenter(id, totalLevels) {
  const svgH = getSvgH(totalLevels);
  const idx  = id - 1;
  const y    = svgH - PAD_BOTTOM - idx * LEVEL_SPACING;
  const x    = SVG_W / 2 + Math.sin(idx * 0.88) * 58;
  return { x: Math.round(x), y: Math.round(y) };
}

// ── Glowing road path ─────────────────────────────────────────
function RoadPath({ completedLevels, totalLevels }) {
  const segs = [];
  for (let i = 1; i < totalLevels; i++) {
    const a    = getCenter(i, totalLevels);
    const b    = getCenter(i + 1, totalLevels);
    const done = completedLevels.includes(i);
    const mx   = (a.x + b.x) / 2;
    const my   = (a.y + b.y) / 2;
    const d    = `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
    segs.push(
      // outer glow
      <path key={`g-${i}`} d={d} stroke={done ? "rgba(250,204,21,0.25)" : "rgba(99,102,241,0.2)"}
        strokeWidth={28} fill="none" strokeLinecap="round" />,
      // base road
      <path key={`b-${i}`} d={d} stroke={done ? "#78350f" : "#1e1b4b"}
        strokeWidth={16} fill="none" strokeLinecap="round" />,
      // centre stripe
      <path key={`c-${i}`} d={d} stroke={done ? "#94a3b8" : "#4338ca"}
        strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.85} />,
      // sparkle dashes
      <path key={`d-${i}`} d={d}
        stroke={done ? "rgba(255,255,255,0.55)" : "rgba(167,139,250,0.4)"}
        strokeWidth={3} fill="none" strokeLinecap="round"
        strokeDasharray="10 14" />,
    );
  }
  return <>{segs}</>;
}

// ── Portal node ───────────────────────────────────────────────
function LevelNode({ level, status, onClick, totalLevels }) {
  const { x, y } = getCenter(level.id, totalLevels);
  const tier      = getTier(level.id);
  const isDone    = status === "completed";
  const isCurrent = status === "current";
  const isLocked  = status === "locked";

  const r         = isCurrent ? NODE_R + 8 : NODE_R;
  const portalColor = isDone    ? "#94a3b8"
                    : isLocked  ? "#374151"
                    : isCurrent ? tier.main
                    :             tier.main;
  const rimColor    = isDone    ? "#92400e"
                    : isLocked  ? "#1f2937"
                    : isCurrent ? tier.dark
                    :             tier.dark;
  const glowColor   = isDone    ? "rgba(250,204,21,0.7)"
                    : isLocked  ? "transparent"
                    : isCurrent ? tier.glow
                    :             tier.glow.replace("0.6","0.35");

  return (
    <g onClick={() => !isLocked && onClick(level.id)}
       style={{ cursor: isLocked ? "not-allowed" : "pointer" }}>

      {/* Outer glow halo */}
      {!isLocked && (
        <circle cx={x} cy={y} r={r + 14} fill={glowColor} opacity={isCurrent ? 1 : 0.5}>
          {isCurrent && (
            <animate attributeName="r"       values={`${r+10};${r+22};${r+10}`} dur="2s" repeatCount="indefinite" />
          )}
          {isCurrent && (
            <animate attributeName="opacity" values="0.8;0.2;0.8"               dur="2s" repeatCount="indefinite" />
          )}
        </circle>
      )}

      <g>
        {isCurrent && (
          <animateTransform attributeName="transform" type="translate"
            values="0,0;0,-6;0,0" dur="1.8s" repeatCount="indefinite" additive="sum" />
        )}

        {/* Drop shadow */}
        <circle cx={x} cy={y + 6} r={r + 3} fill="rgba(0,0,0,0.5)" />

        {/* Gold/dark outer ring */}
        <circle cx={x} cy={y} r={r + 3} fill={rimColor}
          stroke={isDone ? "#fbbf24" : isLocked ? "#374151" : tier.main}
          strokeWidth={2} opacity={isLocked ? 0.5 : 1} />

        {/* Portal body */}
        <defs>
          <radialGradient id={`pg-${level.id}`} cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor={isLocked ? "#4b5563" : "#ffffff"} stopOpacity={isLocked ? 0.3 : 0.25} />
            <stop offset="100%" stopColor={portalColor} />
          </radialGradient>
        </defs>
        <circle cx={x} cy={y} r={r + 1} fill={`url(#pg-${level.id})`} opacity={isLocked ? 0.45 : 1} />

        {/* Inner shine ring */}
        {!isLocked && (
          <circle cx={x} cy={y} r={r - 4} fill="none"
            stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
        )}

        {/* Icon */}
        <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize={isCurrent ? 17 : 14} fontWeight="900"
          fill={isLocked ? "#6b7280" : "white"}
          style={{ userSelect: "none", fontFamily: "'Segoe UI', Arial, sans-serif",
            textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
          {isDone ? "★" : isLocked ? "🔒" : level.id}
        </text>

        {/* Stars for completed */}
        {isDone && (
          <text x={x} y={y + r + 18} textAnchor="middle" fontSize={12} fill="#94a3b8"
            style={{ userSelect: "none", filter: "drop-shadow(0 0 4px #94a3b8)" }}>
            ★★★
          </text>
        )}

        {/* "אתה כאן" tag */}
        {isCurrent && (
          <>
            <rect x={x - 40} y={y - r - 36} width={80} height={24} rx={12}
              fill={tier.dark} stroke={tier.main} strokeWidth={1.5} />
            <text x={x} y={y - r - 22} textAnchor="middle" dominantBaseline="middle"
              fontSize={9} fontWeight="800" fill="white" style={{ userSelect: "none" }}>
              ◀ אתה כאן
            </text>
          </>
        )}

        {isLocked && (
          <text x={x} y={y + r + 15} textAnchor="middle" fontSize={9} fill="#6b7280"
            fontWeight="600" style={{ userSelect: "none" }}>{level.id}</text>
        )}
      </g>
    </g>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function CurriculumMap({ user, onSelectLevel, onDailyChallenge, onBack, onTotalLevels }) {
  const [completedLevels, setCompletedLevels] = useState([]);
  const [currentLevel,    setCurrentLevel]    = useState(1);
  const [phaseB,          setPhaseB]          = useState(false);
  const [dailySolved,     setDailySolved]     = useState(false);
  const [streak,          setStreak]          = useState(0);
  const [isAdmin,         setIsAdmin]         = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [customLevels,    setCustomLevels]    = useState([]);
  const currentMarkerRef = useRef(null);

  useEffect(() => {
    (async () => {
      if (user.email) {
        const isSuperAdmin = user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
        if (isSuperAdmin) { setIsAdmin(true); }
        else {
          const s = await getDoc(doc(db, "admins", user.email.toLowerCase()));
          setIsAdmin(s.exists());
        }
      }
      // Load custom levels from Firestore
      const lvlSnap = await getDocs(collection(db, "curriculumLevels"));
      const custom = lvlSnap.docs
        .map(d => d.data())
        .filter(d => d.isCustom)
        .map(d => ({ id: d.id, title: d.title }));
      setCustomLevels(custom);

      const snap = await getDoc(doc(db, "userProgress", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setCompletedLevels(d.completedLevels || []);
        setCurrentLevel(d.currentLevel || 1);
        setPhaseB(d.phaseB || false);
      }
      const today = new Date().toISOString().split("T")[0];
      const dSnap = await getDoc(doc(db, "userDailyProgress", user.uid));
      if (dSnap.exists()) {
        const dd = dSnap.data();
        setDailySolved(dd.date === today && dd.solved);
        setStreak(dd.streak || 0);
      }
      setLoading(false);
    })();
  }, [user.uid]);

  useEffect(() => {
    if (!loading && currentMarkerRef.current) {
      setTimeout(() => currentMarkerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    }
  }, [loading]);

  const getStatus = (id) => {
    if (completedLevels.includes(id)) return "completed";
    if (id === currentLevel)          return "current";
    if (id > currentLevel)            return isAdmin ? "available" : "locked";
    return "available";
  };

  const allLevels   = [...curriculum, ...customLevels].sort((a, b) => a.id - b.id);
  const totalLevels = allLevels.length;
  const svgH        = getSvgH(totalLevels);

  useEffect(() => { onTotalLevels?.(totalLevels); }, [totalLevels]);

  const currentData = allLevels.find(l => l.id === currentLevel);
  const tier  = getTier(currentLevel);
  const pct   = Math.round((completedLevels.length / totalLevels) * 100);
  const curPt = getCenter(currentLevel, totalLevels);

  const bgStyle = {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #0a0e27 0%, #0d1f0e 35%, #0a1628 65%, #1a0a2e 100%)",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    position: "relative",
  };

  if (loading) return (
    <div style={{ ...bgStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={rpgPanel}>טוען...</div>
    </div>
  );

  return (
    <div style={bgStyle}>

      {/* Starfield dots */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
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

      {/* Inject twinkle keyframes */}
      <style>{`
        @keyframes twinkle {
          0%,100% { opacity: var(--op, 0.6); }
          50%      { opacity: 0.1; }
        }
      `}</style>

      {/* Daily Streak */}
      {phaseB && (
        <div style={{ position: "fixed", top: 68, left: 12, zIndex: 40, ...rpgPanel, padding: "8px 12px" }}>
          <div style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 700, marginBottom: 2 }}>Daily Streak</div>
          <div style={{ display: "flex", gap: 2, justifyContent: "center", marginBottom: 2 }}>
            {[1,2,3].map(i => <span key={i} style={{ fontSize: 11 }}>{i <= streak ? "⭐" : "☆"}</span>)}
          </div>
          <div style={{ fontSize: "0.68rem", color: "white", fontWeight: 800, textAlign: "center" }}>{streak} ימים</div>
        </div>
      )}

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "rgba(5,8,20,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "2px solid #475569",
        padding: "10px 16px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 4px 20px rgba(71,85,105,0.35)",
      }}>
        <button onClick={onBack} style={rpgBtn}>← חזור</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px 40px", position: "relative", zIndex: 2 }}>

        {/* Daily challenge */}
        {phaseB && (
          <button onClick={onDailyChallenge} style={{
            width: "100%", maxWidth: 340, padding: "14px 18px", marginBottom: 20,
            ...rpgPanel,
            background: dailySolved
              ? "linear-gradient(135deg,#14532d,#166534)"
              : "linear-gradient(135deg,#7c2d12,#9a3412)",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#94a3b8" }}>
                {dailySolved ? "✅ אתגר היום הושלם" : "⚡ אתגר יומי"}
              </div>
              <div style={{ fontSize: "0.74rem", color: "#d1d5db" }}>
                {dailySolved ? "חזור/י מחר" : "שאלת בגרות חדשה כל יום"}
              </div>
            </div>
            <span style={{ fontSize: "2rem" }}>{dailySolved ? "🏆" : "🌟"}</span>
          </button>
        )}

        {/* Current level card */}
        {!phaseB && currentData && (
          <div style={{ width: "100%", maxWidth: 340, marginBottom: 20, ...rpgPanel }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginBottom: 2 }}>הרמה הנוכחית</div>
                <div style={{ fontWeight: 800, color: "#94a3b8", fontSize: "0.92rem" }}>
                  רמה {currentLevel}: <MathText text={currentData.title} />
                </div>
                <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: 3 }}>💡 <MathText text={currentData.hint} /></div>
              </div>
              <button onClick={() => onSelectLevel(currentLevel)} style={{
                ...rpgBtn,
                background: `linear-gradient(160deg,${tier.main},${tier.dark})`,
                boxShadow: `0 0 14px ${tier.glow}, 0 4px 0 ${tier.dark}`,
                flexShrink: 0, fontSize: "0.9rem",
              }}>שחק/י ▶</button>
            </div>
          </div>
        )}

        {/* MAP */}
        <div style={{ position: "relative" }}>
          <div ref={currentMarkerRef} style={{
            position: "absolute", top: curPt.y - 40,
            left: 0, width: 1, height: 1, pointerEvents: "none",
          }} />
          <svg width={SVG_W} height={svgH} style={{ display: "block", overflow: "visible" }}>
            <RoadPath completedLevels={completedLevels} totalLevels={totalLevels} />
            {allLevels.map(level => (
              <LevelNode key={level.id} level={level} status={getStatus(level.id)} onClick={onSelectLevel} totalLevels={totalLevels} />
            ))}
          </svg>
        </div>

      </div>

    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const rpgPanel = {
  background: "rgba(10,14,40,0.88)",
  border: "2px solid #475569",
  borderRadius: 12,
  padding: "13px 16px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
};

const rpgBtn = {
  background: "linear-gradient(160deg,#1e3a5f,#0f2847)",
  color: "#94a3b8",
  border: "2px solid #475569",
  borderRadius: 10,
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: "0.85rem",
  boxShadow: "0 0 10px rgba(200,160,40,0.3), 0 3px 0 #0f172a",
};

// Pre-generate random stars (stable across renders)
const stars = Array.from({ length: 80 }, (_, i) => ({
  x: `${(i * 37.3 + 11) % 100}%`,
  y: `${(i * 53.7 + 7)  % 100}%`,
  r: i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
  o: 0.3 + (i % 7) * 0.1,
  d: 2 + (i % 4),
  delay: (i % 6) * 0.5,
}));
