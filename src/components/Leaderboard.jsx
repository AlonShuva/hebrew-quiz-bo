import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

const MEDAL = ["🥇", "🥈", "🥉"];
const RANK_COLORS = [
  { bg: "rgba(250,204,21,0.08)", border: "#78716c", text: "#ca8a04" },
  { bg: "rgba(148,163,184,0.08)", border: "#475569", text: "#94a3b8" },
  { bg: "rgba(180,83,9,0.08)",   border: "#78350f", text: "#b45309" },
];

export default function Leaderboard({ onBack }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "userProgress"),
      orderBy("totalPoints", "desc"),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.displayName));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
        width: "100%", maxWidth: "520px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "28px",
      }}>
        <button onClick={onBack} className="btn-back">← חזור</button>
        <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "var(--text)" }}>🏆 לוח תוצאות</h2>
        <div style={{ width: "80px" }} />
      </div>

      <div style={{ width: "100%", maxWidth: "520px" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>טוען...</p>
        ) : players.length === 0 ? (
          <div className="card" style={{ padding: "40px", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🏁</div>
            <p style={{ color: "var(--text-secondary)" }}>אין שחקנים עדיין — היה/י הראשון/ה!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {players.map((player, i) => {
              const rank = RANK_COLORS[i] ?? null;
              return (
                <div
                  key={player.id}
                  className="fadeIn"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 18px",
                    background: rank ? rank.bg : "var(--card)",
                    border: `1.5px solid ${rank ? rank.border : "var(--border)"}`,
                    borderRadius: "var(--radius)",
                    boxShadow: "var(--shadow)",
                    animationDelay: `${i * 0.05}s`,
                    animationFillMode: "both",
                  }}
                >
                  {/* Rank */}
                  <div style={{
                    width: "36px", height: "36px", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: i < 3 ? "1.5rem" : "0.95rem",
                    fontWeight: "700",
                    color: rank ? rank.text : "var(--text-secondary)",
                  }}>
                    {i < 3 ? MEDAL[i] : `${i + 1}`}
                  </div>

                  {/* Avatar + name */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                    {player.photoURL && (
                      <img src={player.photoURL} alt=""
                        style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid var(--border)", flexShrink: 0 }}
                        onError={e => e.target.style.display = "none"}
                      />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {player.displayName}
                      </p>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", margin: 0 }}>
                        רמה {player.currentLevel || 1}
                      </p>
                    </div>
                  </div>

                  {/* Points */}
                  <div style={{
                    background: "var(--primary-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "6px 14px",
                    textAlign: "center",
                    flexShrink: 0,
                  }}>
                    <div style={{ fontWeight: "800", fontSize: "1.05rem", color: rank ? rank.text : "var(--primary)" }}>
                      {(player.totalPoints || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>נקודות</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
