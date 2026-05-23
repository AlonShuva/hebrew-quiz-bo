import { useState, useEffect, useRef, useMemo } from "react";
import { db, SUPER_ADMIN_EMAIL } from "../firebase/config";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { curriculum } from "../../lib/curriculum.js";
import MathText from "./MathText";

function getTier() { return { main: "#43a047", dark: "#2e7d32", glow: "rgba(67,160,71,0.5)" }; }

// ── Layout ────────────────────────────────────────────────────
const SVG_W         = 340;
const NODE_R        = 38;
const LEVEL_SPACING = 130;
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

// ── Edge point: from 'a' toward 'b', stopping 'dist' from 'a' ─
function edgePt(a, b, dist) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: Math.round(a.x + (dx / len) * dist), y: Math.round(a.y + (dy / len) * dist) };
}

// ── Clean road path ───────────────────────────────────────────
function RoadPath({ completedLevels, totalLevels }) {
  const segs = [];
  const GAP = NODE_R + 6;
  for (let i = 1; i < totalLevels; i++) {
    const a    = getCenter(i, totalLevels);
    const b    = getCenter(i + 1, totalLevels);
    const done = completedLevels.includes(i);
    const p1   = edgePt(a, b, GAP);
    const p2   = edgePt(b, a, GAP);
    const mx   = (p1.x + p2.x) / 2;
    const my   = (p1.y + p2.y) / 2;
    const d    = `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`;
    const road = done ? "#7cb342" : "#b0bec5";
    segs.push(
      <path key={`sh-${i}`} d={d} stroke="rgba(0,0,0,0.08)" strokeWidth={15} fill="none" strokeLinecap="round" />,
      <path key={`rd-${i}`} d={d} stroke={road}              strokeWidth={10} fill="none" strokeLinecap="round" />,
      <path key={`hi-${i}`} d={d} stroke="rgba(255,255,255,0.55)" strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray="6 10" />,
    );
  }
  return <>{segs}</>;
}

// ── Level node ────────────────────────────────────────────────
function LevelNode({ level, status, onClick, totalLevels }) {
  const { x, y } = getCenter(level.id, totalLevels);
  const isDone    = status === "completed";
  const isCurrent = status === "current";
  const isLocked  = status === "locked";
  const r         = NODE_R;
  const imgHalf   = r * 1.25; // slightly larger than clip to crop white border

  return (
    <g onClick={() => !isLocked && onClick(level.id)}
       style={{ cursor: isLocked ? "not-allowed" : "pointer" }}>

      {/* Subtle pulse ring — current level only */}
      {isCurrent && (
        <circle cx={x} cy={y} r={r + 10} fill="none" stroke="#66bb6a" strokeWidth={2} opacity={0.3}>
          <animate attributeName="r"       values={`${r+8};${r+20};${r+8}`} dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0;0.3"               dur="2.2s" repeatCount="indefinite" />
        </circle>
      )}

      <g>
        {isCurrent && (
          <animateTransform attributeName="transform" type="translate"
            values="0,0;0,-5;0,0" dur="2s" repeatCount="indefinite" additive="sum" />
        )}

        {/* Soft drop shadow */}
        <circle cx={x} cy={y + 5} r={r} fill="rgba(0,0,0,0.1)" />

        {isLocked ? (
          <>
            <circle cx={x} cy={y} r={r} fill="#e5e7eb" stroke="#d1d5db" strokeWidth={2} />
            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
              fontSize={15} style={{ userSelect: "none" }}>🔒</text>
            <text x={x} y={y + r + 14} textAnchor="middle" fontSize={9} fill="#9ca3af"
              fontWeight="600" style={{ userSelect: "none" }}>{level.id}</text>
          </>
        ) : (
          <>
            <defs>
              <clipPath id={`clip-${level.id}`}>
                <circle cx={x} cy={y} r={r} />
              </clipPath>
            </defs>
            <image
              href="/icon.png"
              x={x - imgHalf} y={y - imgHalf}
              width={imgHalf * 2} height={imgHalf * 2}
              clipPath={`url(#clip-${level.id})`}
              opacity={isDone ? 0.7 : 1}
            />
            <circle cx={x} cy={y} r={r} fill="none"
              stroke={isCurrent ? "#43a047" : isDone ? "#a5d6a7" : "#c8e6c9"}
              strokeWidth={isCurrent ? 2.5 : 1.5} />
          </>
        )}

        {isDone && (
          <>
            <circle cx={x + r * 0.68} cy={y + r * 0.68} r={10} fill="#43a047" />
            <text x={x + r * 0.68} y={y + r * 0.68 + 1} textAnchor="middle" dominantBaseline="middle"
              fontSize={11} fontWeight="900" fill="white" style={{ userSelect: "none" }}>✓</text>
          </>
        )}

        {isCurrent && (
          <>
            <rect x={x - 38} y={y - r - 33} width={76} height={22} rx={11} fill="#43a047" />
            <text x={x} y={y - r - 21} textAnchor="middle" dominantBaseline="middle"
              fontSize={9} fontWeight="800" fill="white" style={{ userSelect: "none" }}>
              ◀ אתה כאן
            </text>
          </>
        )}
      </g>
    </g>
  );
}

// ── Jungle decoration components ─────────────────────────────
function SvgTree({ x, y, scale = 1, rot = 0, flip = false }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -scale : scale},${scale}) rotate(${rot})`} opacity={0.92}>
      <rect x={-5} y={-28} width={11} height={30} rx={4} fill="#6d4c41" />
      <circle cx={-5} cy={-50} r={21} fill="#2e7d32" />
      <circle cx={7}  cy={-54} r={19} fill="#388e3c" />
      <circle cx={0}  cy={-62} r={17} fill="#43a047" />
      <circle cx={-3} cy={-70} r={11} fill="#66bb6a" />
    </g>
  );
}
function SvgBush({ x, y, scale = 1 }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`} opacity={0.9}>
      <circle cx={0}   cy={0}   r={18} fill="#33691e" />
      <circle cx={-14} cy={-5}  r={14} fill="#558b2f" />
      <circle cx={14}  cy={-6}  r={13} fill="#33691e" />
      <circle cx={0}   cy={-15} r={12} fill="#7cb342" />
      <circle cx={-5}  cy={-22} r={7}  fill="#9ccc65" />
    </g>
  );
}
const FLOWER_COLORS = ["#f06292","#ff7043","#ce93d8","#ef9a9a","#ffcc02"];
function SvgFlower({ x, y, scale = 1, color }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`} opacity={0.95}>
      <rect x={-2} y={0} width={4} height={15} rx={2} fill="#558b2f" />
      {[0,72,144,216,288].map(a => {
        const rad = a * Math.PI / 180;
        return <circle key={a} cx={Math.cos(rad)*7} cy={-15+Math.sin(rad)*7} r={5} fill={color} />;
      })}
      <circle cx={0} cy={-15} r={4} fill="#fff176" />
    </g>
  );
}
function genDecorations(mapH) {
  const items = [];
  const STEP  = 88;
  for (let i = 0; i * STEP < mapH + STEP; i++) {
    const y  = 50 + i * STEP;
    const r1 = ((i * 1234567)     % 1000) / 1000;
    const r2 = ((i * 7654321 + 1) % 1000) / 1000;
    const r3 = ((i * 2345678 + 2) % 1000) / 1000;
    const r4 = ((i * 8765432 + 3) % 1000) / 1000;
    // Left
    items.push({ type: Math.floor(r1 * 3), x: -10 + r2 * 28, y, scale: 0.65 + r3 * 0.45, rot: -10 + r4 * 20, flip: false, ci: Math.floor(r2 * 5) });
    // Right
    items.push({ type: Math.floor(r3 * 3), x: SVG_W + 10 - r1 * 22, y, scale: 0.6 + r2 * 0.5, rot: -10 + r3 * 20, flip: true, ci: Math.floor(r4 * 5) });
    // Extra filler bushes/flowers between rows
    if (i % 2 === 0) {
      const r5 = ((i * 3456789 + 4) % 1000) / 1000;
      const r6 = ((i * 9876543 + 5) % 1000) / 1000;
      items.push({ type: r5 > 0.5 ? 1 : 2, x: 22 + r5 * 22, y: y + STEP / 2, scale: 0.45 + r6 * 0.3, rot: 0, flip: false, ci: Math.floor(r5 * 5) });
      items.push({ type: r6 > 0.5 ? 1 : 2, x: SVG_W - 22 - r6 * 18, y: y + STEP / 2, scale: 0.45 + r5 * 0.3, rot: 0, flip: true,  ci: Math.floor(r6 * 5) });
    }
  }
  return items;
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
  const [deletedLevelIds, setDeletedLevelIds] = useState(new Set());
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
      // Load levels from Firestore — track deleted and custom
      const lvlSnap = await getDocs(collection(db, "curriculumLevels"));
      const deleted = new Set(
        lvlSnap.docs.filter(d => d.data().deleted).map(d => d.data().id)
      );
      setDeletedLevelIds(deleted);
      const custom = lvlSnap.docs
        .map(d => d.data())
        .filter(d => d.isCustom && !d.deleted)
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
      currentMarkerRef.current?.scrollIntoView({ behavior: "instant", block: "center" });
    }
  }, [loading]);

  const getStatus = (id) => {
    if (completedLevels.includes(id)) return "completed";
    if (id === currentLevel)          return "current";
    if (id > currentLevel)            return isAdmin ? "available" : "locked";
    return "available";
  };

  const allLevels   = [...curriculum, ...customLevels]
    .filter(l => !deletedLevelIds.has(l.id))
    .sort((a, b) => a.id - b.id);
  const totalLevels = allLevels.length;
  const svgH        = getSvgH(totalLevels);

  useEffect(() => { onTotalLevels?.(totalLevels); }, [totalLevels]);

  const decorations = useMemo(() => genDecorations(svgH), [svgH]);

  const currentData = allLevels.find(l => l.id === currentLevel);
  const tier  = getTier(currentLevel);
  const pct   = Math.round((completedLevels.length / totalLevels) * 100);
  const curPt = getCenter(currentLevel, totalLevels);

  const bgStyle = {
    width: "100%",
    minHeight: "100vh",
    minHeight: "100dvh",
    background: "linear-gradient(180deg, #e8f5e9 0%, #f9fbe7 40%, #e8f5e9 100%)",
    fontFamily: "'Heebo', Arial, sans-serif",
    position: "relative",
  };

  if (loading) return (
    <div style={{ ...bgStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={rpgPanel}>טוען...</div>
    </div>
  );

  return (
    <div style={bgStyle}>

      {/* Floating math equations */}
      <style>{`
        @keyframes floatEq {
          0%   { transform: translateY(0px) rotate(var(--r)); opacity: calc(var(--o) * 0.3); }
          40%  { transform: translateY(-20px) rotate(var(--r)); opacity: var(--o); }
          100% { transform: translateY(0px) rotate(var(--r)); opacity: calc(var(--o) * 0.3); }
        }
      `}</style>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        {mathFloats.map((m, i) => (
          <div key={i} style={{
            position: "absolute", left: m.x, top: m.y,
            fontSize: m.size, fontWeight: 700, color: "#43a047",
            opacity: m.o, userSelect: "none",
            fontFamily: "'Heebo', Arial, sans-serif",
            direction: "ltr",
            animation: `floatEq ${m.d}s ease-in-out infinite`,
            animationDelay: `${m.delay}s`,
            "--r": `${m.rot}deg`,
            "--o": m.o,
          }}>{m.text}</div>
        ))}
      </div>

      {/* Daily Streak */}
      {phaseB && (
        <div style={{ position: "fixed", top: 68, right: 12, zIndex: 40, ...rpgPanel, padding: "8px 12px" }}>
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
        background: "rgba(232,245,233,0.92)", backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1.5px solid #a5d6a7",
        padding: "10px 16px",
        paddingTop: "calc(10px + env(safe-area-inset-top))",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 2px 12px rgba(67,160,71,0.12)",
      }}>
        <button onClick={onBack} style={mapBtn}>← חזור</button>
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
        <div style={{ position: "relative", width: "100%", maxWidth: SVG_W }}>
          <div ref={currentMarkerRef} style={{
            position: "absolute", top: curPt.y - 40,
            left: 0, width: 1, height: 1, pointerEvents: "none",
          }} />
          <svg
            viewBox={`0 0 ${SVG_W} ${svgH}`}
            width="100%"
            height={svgH}
            style={{ display: "block", overflow: "visible", maxWidth: SVG_W }}
          >
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

const mapBtn = {
  background: "linear-gradient(160deg,#43a047,#2e7d32)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 16px",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: "0.85rem",
  boxShadow: "0 2px 8px rgba(46,125,50,0.25), 0 2px 0 #1b5e20",
};

// Pre-generate floating math labels (stable across renders)
const MATH_EXPRS = [
  "f(x)=√x", "x≠0", "x≥0", "1/x", "log(x)", "f(x)=x²+1",
  "√(x+1)", "x>0", "x∈ℝ", "f(x)=|x|", "ln(x)", "x∈(-∞,5]",
  "∛x", "√(x²-4)", "1/(x-1)", "√(1-x)", "x≠±2", "log₂(x)",
  "f(x)=x³", "D: x>-1", "√x·ln(x)", "1/√x", "x∈(0,∞)",
];
const mathFloats = Array.from({ length: 30 }, (_, i) => ({
  x: `${(i * 41.3 + 5) % 100}%`,
  y: `${(i * 57.1 + 9) % 100}%`,
  text: MATH_EXPRS[i % MATH_EXPRS.length],
  size: `${0.85 + (i % 4) * 0.18}rem`,
  o: 0.22 + (i % 5) * 0.08,
  d: 3 + (i % 4),
  delay: (i % 7) * 0.6,
  rot: (i % 3 === 0 ? -8 : i % 3 === 1 ? 6 : -3),
}));
