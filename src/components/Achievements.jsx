import { useState } from "react";

const CATEGORIES = [
  { key: "all",     label: "הכל" },
  { key: "correct", label: "תשובות נכונות" },
  { key: "games",   label: "משחקים" },
  { key: "score",   label: "נקודות" },
];

function AchievementIcon({ id, unlocked }) {
  const icons = {
    beginner: (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
        <defs>
          <linearGradient id="g_beginner" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f5d76e"/>
            <stop offset="100%" stopColor="#cd7f32"/>
          </linearGradient>
        </defs>
        <circle cx="19" cy="24" r="11" fill="url(#g_beginner)" stroke="#a0601a" strokeWidth="1.5"/>
        <circle cx="19" cy="24" r="8" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1"/>
        <path d="M14 15 L19 7 L24 15" fill="#e8b84a" stroke="#c8922a" strokeWidth="1.2" strokeLinejoin="round"/>
        <text x="19" y="28" textAnchor="middle" fontSize="9" fontWeight="900" fill="white" fontFamily="Heebo,sans-serif">1</text>
      </svg>
    ),
    learner: (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
        <defs>
          <linearGradient id="g_learner" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e2e8f0"/>
            <stop offset="100%" stopColor="#94a3b8"/>
          </linearGradient>
        </defs>
        <circle cx="19" cy="24" r="11" fill="url(#g_learner)" stroke="#64748b" strokeWidth="1.5"/>
        <circle cx="19" cy="24" r="8" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1"/>
        <path d="M14 15 L19 7 L24 15" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.2" strokeLinejoin="round"/>
        <text x="19" y="28" textAnchor="middle" fontSize="9" fontWeight="900" fill="white" fontFamily="Heebo,sans-serif">2</text>
      </svg>
    ),
    expert: (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
        <defs>
          <linearGradient id="g_expert" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff176"/>
            <stop offset="100%" stopColor="#f9a825"/>
          </linearGradient>
        </defs>
        <circle cx="19" cy="24" r="11" fill="url(#g_expert)" stroke="#f57f17" strokeWidth="1.5"/>
        <circle cx="19" cy="24" r="8" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.2"/>
        <path d="M14 15 L19 7 L24 15" fill="#ffee58" stroke="#f9a825" strokeWidth="1.2" strokeLinejoin="round"/>
        <path d="M19 16 l1.5 3 3.2.3-2.3 2.1.6 3.1L19 23l-3 1.5.6-3.1L14.3 19.3l3.2-.3z" fill="white" opacity=".7"/>
      </svg>
    ),
    champion: (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
        <defs>
          <linearGradient id="g_champion" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff9c4"/>
            <stop offset="100%" stopColor="#f9a825"/>
          </linearGradient>
        </defs>
        <rect x="15" y="28" width="8" height="3" rx="1" fill="#f9a825"/>
        <rect x="12" y="31" width="14" height="2.5" rx="1.25" fill="#f57f17"/>
        <path d="M11 10 h16 v10 a8 8 0 0 1-16 0 Z" fill="url(#g_champion)" stroke="#f57f17" strokeWidth="1.2"/>
        <path d="M11 13 Q7 13 7 17 Q7 21 11 21" fill="none" stroke="#f9a825" strokeWidth="2" strokeLinecap="round"/>
        <path d="M27 13 Q31 13 31 17 Q31 21 27 21" fill="none" stroke="#f9a825" strokeWidth="2" strokeLinecap="round"/>
        <path d="M16 16 l1.8 3.5 3.8.4-2.8 2.5.8 3.8L16 24.5l-3.6 1.7.8-3.8L10.4 20 14.2 19.5z" fill="rgba(255,255,255,.6)"/>
      </svg>
    ),
    legend: (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
        <defs>
          <linearGradient id="g_legend2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffd700"/>
            <stop offset="100%" stopColor="#ff9800"/>
          </linearGradient>
          <linearGradient id="g_legend" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e1bee7"/>
            <stop offset="100%" stopColor="#ab47bc"/>
          </linearGradient>
        </defs>
        <path d="M6 26 L6 16 L12 21 L19 9 L26 21 L32 16 L32 26 Z" fill="url(#g_legend2)" stroke="#e65100" strokeWidth="1.2" strokeLinejoin="round"/>
        <circle cx="6" cy="16" r="2.5" fill="#fff176" stroke="#f9a825" strokeWidth="1"/>
        <circle cx="19" cy="9" r="3" fill="#fff176" stroke="#f9a825" strokeWidth="1"/>
        <circle cx="32" cy="16" r="2.5" fill="#fff176" stroke="#f9a825" strokeWidth="1"/>
        <rect x="6" y="26" width="26" height="4" rx="2" fill="url(#g_legend)" stroke="#7b1fa2" strokeWidth="1"/>
        <circle cx="19" cy="20" r="2.5" fill="url(#g_legend)"/>
        <circle cx="12" cy="22" r="1.8" fill="#ce93d8"/>
        <circle cx="26" cy="22" r="1.8" fill="#ce93d8"/>
      </svg>
    ),
    player: (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
        <defs>
          <linearGradient id="g_player" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#b3e5fc"/>
            <stop offset="100%" stopColor="#0288d1"/>
          </linearGradient>
        </defs>
        <rect x="6" y="13" width="26" height="14" rx="7" fill="url(#g_player)" stroke="#0277bd" strokeWidth="1.5"/>
        <rect x="10" y="18" width="7" height="2.5" rx="1.25" fill="rgba(255,255,255,.7)"/>
        <rect x="12.75" y="15.5" width="2.5" height="7" rx="1.25" fill="rgba(255,255,255,.7)"/>
        <circle cx="25" cy="17.5" r="2" fill="#f48fb1" stroke="rgba(255,255,255,.5)" strokeWidth=".8"/>
        <circle cx="29" cy="20" r="2" fill="#a5d6a7" stroke="rgba(255,255,255,.5)" strokeWidth=".8"/>
        <circle cx="25" cy="22.5" r="2" fill="#90caf9" stroke="rgba(255,255,255,.5)" strokeWidth=".8"/>
        <circle cx="21" cy="20" r="2" fill="#ffe082" stroke="rgba(255,255,255,.5)" strokeWidth=".8"/>
      </svg>
    ),
    veteran: (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
        <defs>
          <linearGradient id="g_veteran" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffccbc"/>
            <stop offset="100%" stopColor="#e64a19"/>
          </linearGradient>
        </defs>
        <path d="M19 5 L22 16 L19 18 L16 16 Z" fill="url(#g_veteran)" stroke="#bf360c" strokeWidth="1"/>
        <rect x="14" y="16" width="10" height="3" rx="1.5" fill="#78909c" stroke="#546e7a" strokeWidth="1"/>
        <rect x="17.5" y="19" width="3" height="14" rx="1.5" fill="#8d6e63" stroke="#6d4c41" strokeWidth="1"/>
        <path d="M6 10 h10 v8 a5 5 0 0 1-10 0 Z" fill="#42a5f5" stroke="#1565c0" strokeWidth="1.2"/>
        <path d="M9 12 h4 M11 12 v5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    scorer: (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
        <defs>
          <linearGradient id="g_scorer" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff9c4"/>
            <stop offset="100%" stopColor="#ffd600"/>
          </linearGradient>
        </defs>
        <path d="M19 5 l3.5 7.5 8 .8-5.8 5.5 1.6 7.9L19 23l-7.3 3.7 1.6-7.9L7.5 13.3l8-.8Z" fill="url(#g_scorer)" stroke="#f9a825" strokeWidth="1.2" strokeLinejoin="round"/>
      </svg>
    ),
    pro: (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
        <defs>
          <linearGradient id="g_pro" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#bf360c"/>
            <stop offset="40%" stopColor="#ff7043"/>
            <stop offset="70%" stopColor="#ffcc02"/>
            <stop offset="100%" stopColor="#fff9c4"/>
          </linearGradient>
        </defs>
        <path d="M19 33 C10 33 7 26 9 21 C11 16 14 18 14 15 C14 12 16 8 19 5 C19 5 18 12 22 14 C24 10 22 8 22 8 C26 11 30 16 29 22 C28 28 24 33 19 33Z" fill="url(#g_pro)" stroke="rgba(255,100,0,.4)" strokeWidth=".8"/>
        <path d="M19 28 C15 28 14 24 15 21 C16 19 17 20 17 18 C18 16 19 14 19 14 C19 14 18.5 18 21 19 C22 17 21 16 21 16 C23 18 24 21 23 24 C22 27 21 28 19 28Z" fill="rgba(255,255,255,.55)"/>
      </svg>
    ),
    master: (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
        <defs>
          <linearGradient id="g_master" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#b2ebf2"/>
            <stop offset="100%" stopColor="#00838f"/>
          </linearGradient>
          <linearGradient id="g_master2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e1f5fe"/>
            <stop offset="100%" stopColor="#26c6da"/>
          </linearGradient>
        </defs>
        <path d="M19 5 L31 16 L19 33 L7 16 Z" fill="url(#g_master)" stroke="#006064" strokeWidth="1.2"/>
        <path d="M7 16 L14 10 L19 5 L24 10 L31 16" fill="url(#g_master2)" stroke="#00838f" strokeWidth="1"/>
        <path d="M14 10 L19 16 L24 10" fill="rgba(255,255,255,.3)" stroke="rgba(255,255,255,.4)" strokeWidth=".8"/>
      </svg>
    ),
  };

  return (
    <div style={{
      width: 50, height: 50, borderRadius: 14,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: unlocked ? "rgba(76,175,80,.1)" : "rgba(0,0,0,.05)",
      border: unlocked ? "2px solid rgba(76,175,80,.35)" : "1.5px solid rgba(0,0,0,.1)",
      filter: unlocked ? "none" : "grayscale(0.8)",
      flexShrink: 0,
    }}>
      {icons[id] || <span style={{ fontSize: "1.5rem" }}>🏅</span>}
    </div>
  );
}

export default function Achievements({ user, userStats, onBack }) {
  const [activeCategory, setActiveCategory] = useState("all");

  const allAchievements = [
    { id: "beginner",  name: "מתחיל",  description: "ענה נכון על 5 שאלות",    required: 5,    type: "correct" },
    { id: "learner",   name: "לומד",   description: "ענה נכון על 10 שאלות",   required: 10,   type: "correct" },
    { id: "expert",    name: "מומחה",  description: "ענה נכון על 20 שאלות",   required: 20,   type: "correct" },
    { id: "champion",  name: "אלוף",   description: "ענה נכון על 50 שאלות",   required: 50,   type: "correct" },
    { id: "legend",    name: "אגדה",   description: "ענה נכון על 100 שאלות",  required: 100,  type: "correct" },
    { id: "player",    name: "שחקן",   description: "שחק 5 משחקים",           required: 5,    type: "games" },
    { id: "veteran",   name: "ותיק",   description: "שחק 20 משחקים",          required: 20,   type: "games" },
    { id: "scorer",    name: "מנקד",   description: "הגע ל-100 נקודות",        required: 100,  type: "score" },
    { id: "pro",       name: "פרו",    description: "הגע ל-500 נקודות",        required: 500,  type: "score" },
    { id: "master",    name: "מאסטר",  description: "הגע ל-1000 נקודות",      required: 1000, type: "score" },
  ];

  const getValue = (type) => {
    if (!userStats) return 0;
    if (type === "correct") return userStats.correctAnswers || 0;
    if (type === "games")   return userStats.gamesPlayed || 0;
    if (type === "score")   return userStats.totalScore || 0;
    return 0;
  };

  const isUnlocked  = (a) => getValue(a.type) >= a.required;
  const getProgress = (a) => Math.min((getValue(a.type) / a.required) * 100, 100);

  const unlockedCount = allAchievements.filter(a => isUnlocked(a)).length;

  const visible = activeCategory === "all"
    ? allAchievements
    : allAchievements.filter(a => a.type === activeCategory);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "30px 16px 50px",
      fontFamily: "'Heebo', Arial, sans-serif",
    }}>

      {/* Header */}
      <div style={{
        width: "100%", maxWidth: 560,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20,
      }}>
        <button onClick={onBack} className="btn-back">← חזור</button>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
          🏅 הישגים
        </h2>
        <div style={{ width: 80 }} />
      </div>

      {/* Summary card */}
      <div style={{
        width: "100%", maxWidth: 560,
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: 20,
        border: "1.5px solid rgba(255,255,255,0.6)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        padding: "18px 22px",
        marginBottom: 16,
        display: "flex", alignItems: "center", gap: 18,
      }}>
        <div style={{
          width: 58, height: 58, borderRadius: 16, flexShrink: 0,
          background: "rgba(67,160,71,0.12)",
          border: "2px solid rgba(67,160,71,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" style={{ color: "#2e7d32" }}>
            <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" fill="currentColor"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontWeight: 800, fontSize: "1rem", color: "#1a4228" }}>
              {unlockedCount} / {allAchievements.length} הישגים הושגו
            </span>
            <span style={{ fontSize: "0.8rem", color: "#4a7c59", fontWeight: 600 }}>
              {Math.round((unlockedCount / allAchievements.length) * 100)}%
            </span>
          </div>
          <div style={{ width: "100%", height: 10, background: "rgba(67,160,71,0.15)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: "linear-gradient(90deg,#43a047,#66bb6a)",
              width: `${(unlockedCount / allAchievements.length) * 100}%`,
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>
      </div>

      {/* Category filter tabs */}
      <div style={{
        width: "100%", maxWidth: 560,
        display: "flex", gap: 8,
        marginBottom: 18,
        overflowX: "auto",
        paddingBottom: 2,
      }}>
        {CATEGORIES.map(cat => {
          const active = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                padding: "7px 16px",
                borderRadius: 99,
                border: active ? "2px solid #43a047" : "1.5px solid rgba(255,255,255,0.5)",
                background: active ? "rgba(67,160,71,0.18)" : "rgba(255,255,255,0.7)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                color: active ? "#2e7d32" : "#4a7c59",
                fontWeight: active ? 800 : 600,
                fontSize: "0.82rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
                transition: "all 0.15s",
                boxShadow: active ? "0 2px 8px rgba(67,160,71,0.2)" : "none",
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* 2-column grid */}
      <div style={{
        width: "100%", maxWidth: 560,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
      }}>
        {visible.map((achievement, i) => {
          const unlocked = isUnlocked(achievement);
          const progress = getProgress(achievement);
          const current = getValue(achievement.type);

          return (
            <div
              key={achievement.id}
              className="fadeIn"
              style={{
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                borderRadius: 20,
                border: unlocked
                  ? "2px solid rgba(76,175,80,0.4)"
                  : "1.5px solid rgba(255,255,255,0.5)",
                boxShadow: unlocked
                  ? "0 4px 16px rgba(67,160,71,0.12)"
                  : "0 2px 10px rgba(0,0,0,0.07)",
                padding: "18px 14px 14px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                opacity: unlocked ? 1 : 0.5,
                filter: unlocked ? "none" : "saturate(0.4)",
                animationDelay: `${i * 0.04}s`,
                animationFillMode: "both",
                textAlign: "center",
                position: "relative",
              }}
            >
              <AchievementIcon id={achievement.id} unlocked={unlocked} />

              <div style={{ width: "100%" }}>
                <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#1a4228", marginBottom: 2 }}>
                  {achievement.name}
                </div>
                <div style={{ fontSize: "0.74rem", color: "#4a7c59", marginBottom: 8, lineHeight: 1.4 }}>
                  {achievement.description}
                </div>

                {/* Mini progress bar */}
                <div style={{ width: "100%", height: 6, background: "rgba(67,160,71,0.15)", borderRadius: 99, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{
                    height: "100%", borderRadius: 99,
                    background: unlocked ? "linear-gradient(90deg,#43a047,#66bb6a)" : "rgba(67,160,71,0.4)",
                    width: `${progress}%`,
                    transition: "width 0.4s ease",
                  }} />
                </div>
                <div style={{ fontSize: "0.7rem", color: "#4a7c59", fontWeight: 600 }}>
                  {current} / {achievement.required}
                </div>
              </div>

              {unlocked && (
                <div style={{
                  position: "absolute",
                  top: 10, left: 10,
                  background: "#43a047",
                  color: "white",
                  borderRadius: 99,
                  padding: "2px 8px",
                  fontSize: "0.65rem",
                  fontWeight: 800,
                }}>
                  ✓
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
