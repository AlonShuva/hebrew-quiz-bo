import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, query, onSnapshot } from "firebase/firestore";

const PODIUM_COLORS = [
  { bg: "rgba(251,191,36,0.15)", border: "#f59e0b", crown: "👑", label: "מקום 1" },
  { bg: "rgba(148,163,184,0.12)", border: "#94a3b8", crown: "🥈", label: "מקום 2" },
  { bg: "rgba(180,83,9,0.12)",   border: "#b45309", crown: "🥉", label: "מקום 3" },
];

function PlayerAvatar({ name, photoURL, size = 44 }) {
  const initials = name
    ? name.split(" ").map(w => w[0]).slice(0, 2).join("")
    : "?";
  const palette = ["#43a047","#1976d2","#e53935","#fb8c00","#8e24aa","#00897b"];
  const color = palette[(name?.charCodeAt(0) || 0) % palette.length];

  if (photoURL) {
    return (
      <img
        src={photoURL} alt={name}
        style={{ width: size, height: size, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.7)", objectFit: "cover" }}
        onError={e => { e.target.style.display = "none"; }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "white", fontWeight: 800,
      fontSize: size * 0.36,
      border: "2px solid rgba(255,255,255,0.7)",
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function Leaderboard({ onBack }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "leaderboard"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.displayName)
        .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
      setPlayers(all);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  // Podium order: 2nd (right in RTL) | 1st (center) | 3rd (left in RTL)
  const podiumOrder = [top3[1], top3[0], top3[2]];
  const podiumRankIndex = [1, 0, 2];

  return (
    <div style={{
      minHeight: "100vh",
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "30px 20px",
      paddingBottom: "calc(40px + env(safe-area-inset-bottom))",
      fontFamily: "'Heebo', Arial, sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: "520px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "28px",
      }}>
        <button onClick={onBack} className="btn-back">← חזור</button>
        <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>🏆 לוח תוצאות</h2>
        <div style={{ width: "80px" }} />
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.8)" }}>טוען...</p>
      ) : players.length === 0 ? (
        <div className="card" style={{ padding: "40px", textAlign: "center", maxWidth: 340 }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🏁</div>
          <p style={{ color: "var(--text-secondary)" }}>אין שחקנים עדיין — היה/י הראשון/ה!</p>
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: "520px", display: "flex", flexDirection: "column", gap: "10px" }}>

          {/* Podium — top 3 */}
          {top3.length > 0 && (
            <div style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: "10px",
              marginBottom: "8px",
              direction: "ltr",
            }}>
              {podiumOrder.map((player, col) => {
                if (!player) return <div key={col} style={{ flex: 1 }} />;
                const ri = podiumRankIndex[col];
                const pc = PODIUM_COLORS[ri];
                const isFirst = ri === 0;
                return (
                  <div key={player.id} style={{
                    flex: 1, maxWidth: 160,
                    display: "flex", flexDirection: "column", alignItems: "center",
                    background: `rgba(255,255,255,${isFirst ? "0.88" : "0.78"})`,
                    border: `2px solid ${pc.border}`,
                    borderRadius: 16,
                    padding: isFirst ? "20px 12px 16px" : "14px 12px 12px",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    boxShadow: isFirst ? "0 8px 24px rgba(251,191,36,0.25)" : "0 4px 12px rgba(0,0,0,0.08)",
                    position: "relative",
                  }}>
                    <div style={{ fontSize: isFirst ? "1.6rem" : "1.3rem", marginBottom: 6 }}>{pc.crown}</div>
                    <PlayerAvatar name={player.displayName} photoURL={player.photoURL} size={isFirst ? 52 : 40} />
                    <p style={{
                      fontWeight: 800, fontSize: isFirst ? "0.9rem" : "0.82rem",
                      color: "#1a4228", marginTop: 8, marginBottom: 2,
                      textAlign: "center", maxWidth: "100%",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {(player.displayName || player.email?.split('@')[0] || "שחקן").split(" ")[0]}
                    </p>
                    <p style={{
                      fontWeight: 900, fontSize: isFirst ? "1.05rem" : "0.92rem",
                      color: pc.border === "#f59e0b" ? "#b45309" : pc.border,
                    }}>
                      {(player.totalPoints || 0).toLocaleString()}
                    </p>
                    <p style={{ fontSize: "0.68rem", color: "#4a7c59" }}>נקודות</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ranks 4+ */}
          {rest.map((player, i) => (
            <div
              key={player.id}
              className="fadeIn card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "12px 16px",
                animationDelay: `${i * 0.05}s`,
                animationFillMode: "both",
              }}
            >
              <div style={{
                width: "32px", height: "32px", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.9rem", fontWeight: "800",
                color: "var(--text-secondary)",
              }}>
                {i + 4}
              </div>

              <PlayerAvatar name={player.displayName} photoURL={player.photoURL} size={34} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: "700", fontSize: "0.92rem", color: "var(--text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {player.displayName || player.email?.split('@')[0] || "שחקן"}
                </p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", margin: 0 }}>
                  רמה {player.currentLevel || 1}
                </p>
              </div>

              <div style={{
                background: "var(--primary-bg)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "5px 12px",
                textAlign: "center",
                flexShrink: 0,
              }}>
                <div style={{ fontWeight: "800", fontSize: "0.97rem", color: "var(--primary)" }}>
                  {(player.totalPoints || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>נקודות</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
