export default function Achievements({ user, userStats, onBack }) {
  const allAchievements = [
    { id: "beginner", icon: "🥉", name: "מתחיל", description: "ענה נכון על 5 שאלות", required: 5, type: "correct" },
    { id: "learner", icon: "🥈", name: "לומד", description: "ענה נכון על 10 שאלות", required: 10, type: "correct" },
    { id: "expert", icon: "🥇", name: "מומחה", description: "ענה נכון על 20 שאלות", required: 20, type: "correct" },
    { id: "champion", icon: "🏆", name: "אלוף", description: "ענה נכון על 50 שאלות", required: 50, type: "correct" },
    { id: "legend", icon: "👑", name: "אגדה", description: "ענה נכון על 100 שאלות", required: 100, type: "correct" },
    { id: "player", icon: "🎮", name: "שחקן", description: "שחק 5 משחקים", required: 5, type: "games" },
    { id: "veteran", icon: "⚔️", name: "ותיק", description: "שחק 20 משחקים", required: 20, type: "games" },
    { id: "scorer", icon: "⭐", name: "מנקד", description: "הגע ל-100 נקודות", required: 100, type: "score" },
    { id: "pro", icon: "🔥", name: "פרו", description: "הגע ל-500 נקודות", required: 500, type: "score" },
    { id: "master", icon: "💎", name: "מאסטר", description: "הגע ל-1000 נקודות", required: 1000, type: "score" },
  ];

  const getValue = (type) => {
    if (!userStats) return 0;
    if (type === "correct") return userStats.correctAnswers || 0;
    if (type === "games") return userStats.gamesPlayed || 0;
    if (type === "score") return userStats.totalScore || 0;
    return 0;
  };

  const isUnlocked = (achievement) => getValue(achievement.type) >= achievement.required;
  const getProgress = (achievement) => Math.min((getValue(achievement.type) / achievement.required) * 100, 100);

  const unlockedCount = allAchievements.filter(a => isUnlocked(a)).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "30px 20px",
      fontFamily: "'Segoe UI', Arial, sans-serif",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "520px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "16px"
      }}>
        <button onClick={onBack} className="btn-back">← חזור</button>
        <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "var(--text)" }}>🏅 הישגים</h2>
        <div style={{ width: "80px" }} />
      </div>

      {/* Summary bar */}
      <div className="card" style={{
        width: "100%",
        maxWidth: "520px",
        padding: "16px 20px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        gap: "16px"
      }}>
        <div style={{
          width: "52px", height: "52px",
          background: "var(--primary-bg)",
          borderRadius: "14px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.6rem"
        }}>🏅</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: "700", color: "var(--text)", marginBottom: "6px" }}>
            {unlockedCount} / {allAchievements.length} הישגים הושגו
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${(unlockedCount / allAchievements.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        width: "100%",
        maxWidth: "520px"
      }}>
        {allAchievements.map((achievement, i) => {
          const unlocked = isUnlocked(achievement);
          const progress = getProgress(achievement);
          const current = getValue(achievement.type);

          return (
            <div
              key={achievement.id}
              className="fadeIn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "16px 18px",
                background: unlocked ? "var(--success-bg)" : "var(--card)",
                border: `1.5px solid ${unlocked ? "var(--success)" : "var(--border)"}`,
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow)",
                opacity: unlocked ? 1 : 0.75,
                animationDelay: `${i * 0.04}s`,
                animationFillMode: "both",
              }}
            >
              <div style={{
                width: "50px", height: "50px",
                background: unlocked ? "white" : "var(--bg)",
                borderRadius: "14px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.7rem",
                filter: unlocked ? "none" : "grayscale(80%)",
                flexShrink: 0,
                border: `1px solid ${unlocked ? "var(--success)" : "var(--border)"}`,
              }}>
                {achievement.icon}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                  <span style={{ fontWeight: "700", color: "var(--text)", fontSize: "0.95rem" }}>
                    {achievement.name}
                  </span>
                  {unlocked && (
                    <span style={{
                      background: "var(--success)",
                      color: "white",
                      borderRadius: "99px",
                      padding: "2px 10px",
                      fontSize: "0.72rem",
                      fontWeight: "700"
                    }}>
                      ✓ הושג
                    </span>
                  )}
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", margin: "0 0 8px" }}>
                  {achievement.description}
                </p>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${progress}%`,
                      background: unlocked
                        ? "linear-gradient(90deg, var(--success), #52D68A)"
                        : undefined
                    }}
                  />
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "4px" }}>
                  {current} / {achievement.required}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
