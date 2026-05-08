import { useState, useEffect, useRef } from "react";
import { db } from "../firebase/config";
import { doc, setDoc, onSnapshot, updateDoc, collection, getDocs, query, getDoc, increment } from "firebase/firestore";
import { recordQuestionStat } from "../firebase/questionStats";
import MathText from "./MathText";

export default function Multiplayer({ user, onBack }) {
  const [screen, setScreen] = useState("lobby"); // lobby, waiting, playing, finished
  const [gameId, setGameId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [game, setGame] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const savedResultRef = useRef(false);

  const createGame = async () => {
    try {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      const q = query(collection(db, "curriculumQuestions"));
      const snap = await getDocs(q);
      const allQuestions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const picked = allQuestions.sort(() => Math.random() - 0.5).slice(0, 5);

      await setDoc(doc(db, "games", code), {
        status: "waiting",
        questions: picked,
        currentQuestion: 0,
        createdAt: new Date().toISOString(),
        players: {
          [user.uid]: { displayName: user.displayName || user.email?.split('@')[0] || "שחקן", score: 0 }
        }
      });

      setGameId(code);
      setQuestions(picked);
      setScreen("waiting");

      const unsubscribe = onSnapshot(doc(db, "games", code), (snap) => {
        const data = snap.data();
        setGame(data);
        if (data.status === "active") {
          setScreen("playing");
        }
      });
    } catch (e) {
      alert("שגיאה ביצירת משחק: " + e.message);
    }
  };

  const joinGame = async () => {
    try {
      const gameRef = doc(db, "games", joinCode);
      const gameSnap = await getDoc(gameRef);
      if (!gameSnap.exists()) {
        alert("קוד משחק לא קיים");
        return;
      }
      await updateDoc(gameRef, {
        [`players.${user.uid}`]: { displayName: user.displayName || user.email?.split('@')[0] || "שחקן", score: 0 },
        status: "active"
      });

      setGameId(joinCode);
      setScreen("playing");

      const unsubscribe = onSnapshot(gameRef, (snap) => {
        const data = snap.data();
        setGame(data);
        setQuestions(data.questions);
        setCurrent(data.currentQuestion || 0);
        if (data.status === "finished") setScreen("finished");
      });
    } catch (e) {
      alert("שגיאה בהצטרפות למשחק: " + e.message);
    }
  };

  const handleAnswer = async (index) => {
    if (selected !== null) return;
    setSelected(index);

    const q = questions[current];
    const isCorrect = index === q.correctIndex;
    recordQuestionStat(q.id, q.levelId, isCorrect, index);
    const points = isCorrect ? (q.level || 1) * 10 : 0;

    const gameRef = doc(db, "games", gameId);
    const newScore = (game.players[user.uid].score || 0) + points;
    await updateDoc(gameRef, {
      [`players.${user.uid}.score`]: newScore
    });

    setTimeout(async () => {
      if (current + 1 >= questions.length) {
        await updateDoc(gameRef, {
          status: "finished",
          finishedAt: new Date().toISOString(),
        });

        try {
          const progressRef = doc(db, "userProgress", user.uid);
          const progressSnap = await getDoc(progressRef);
          const prev = progressSnap.exists() ? progressSnap.data() : {};
          await setDoc(progressRef, {
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || "שחקן",
            email: user.email || "",
            totalPoints: (prev.totalPoints || 0) + newScore,
            gamesPlayed: (prev.gamesPlayed || 0) + 1,
            lastSeen: new Date().toISOString(),
          }, { merge: true });
        } catch (e) {
          console.error("Failed to save game result to userProgress:", e);
        }

        setScreen("finished");
      } else {
        await updateDoc(gameRef, { currentQuestion: current + 1 });
        setCurrent(prev => prev + 1);
        setSelected(null);
      }
    }, 1500);
  };

  if (screen === "lobby") return (
    <div style={centerStyle}>
      <button onClick={onBack} style={{ ...backBtn, alignSelf: "flex-start", marginBottom: "20px" }}>← חזור</button>
      <h2 style={{ marginBottom: "30px" }}>⚔️ דו-קרב</h2>
      <button onClick={createGame} style={bigBtn("#4285F4")}>🎮 צור משחק חדש</button>
      <p style={{ margin: "20px 0", color: "#666" }}>או</p>
      <input
        type="text"
        placeholder="הכנס/י קוד משחק"
        value={joinCode}
        onChange={e => setJoinCode(e.target.value)}
        style={inputStyle}
        maxLength={4}
      />
      <button onClick={joinGame} style={bigBtn("#34A853")}>🚀 הצטרף/י למשחק</button>
    </div>
  );

  if (screen === "waiting") return (
    <div style={centerStyle}>
      <h2>ממתין לשחקן שני...</h2>
      <div style={{ fontSize: "3rem", fontWeight: "bold", color: "#4285F4", margin: "20px 0" }}>
        {gameId}
      </div>
      <p style={{ color: "#666" }}>שתף את הקוד הזה עם חברך</p>
    </div>
  );

  if (screen === "playing" && questions.length > 0) {
    const q = questions[current];
    return (
      <div style={{
        minHeight: "100vh", minHeight: "100dvh",
        background: "linear-gradient(180deg, #e8f5e9 0%, #f9fbe7 40%, #e8f5e9 100%)",
        fontFamily: "'Heebo', Arial, sans-serif",
        display: "flex", flexDirection: "column",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxSizing: "border-box",
      }}>
        {/* Header */}
        <div style={{
          background: "rgba(232,245,233,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1.5px solid #a5d6a7", padding: "10px 16px",
          paddingTop: "calc(10px + env(safe-area-inset-top))",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: "0 2px 12px rgba(67,160,71,0.12)",
        }}>
          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#2e7d32" }}>שאלה {current + 1}/{questions.length}</span>
          <button onClick={onBack} style={backBtn}>← חזור</button>
        </div>

        <div style={{ flex: 1, padding: "14px 16px", maxWidth: 560, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
          {game && (
            <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
              {Object.entries(game.players).map(([uid, p]) => (
                <div key={uid} style={{
                  flex: 1, padding: "10px 12px",
                  background: uid === user.uid ? "rgba(67,160,71,0.12)" : "rgba(255,255,255,0.7)",
                  border: uid === user.uid ? "1.5px solid rgba(67,160,71,0.4)" : "1.5px solid rgba(0,0,0,0.08)",
                  borderRadius: 12, textAlign: "center",
                  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                }}>
                  <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1a4228", margin: 0 }}>{p.displayName}</p>
                  <p style={{ fontSize: "1.1rem", color: "#43a047", fontWeight: 800, margin: "2px 0 0" }}>{p.score}</p>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: 16, padding: "18px 20px", marginBottom: "14px", border: "1.5px solid rgba(255,255,255,0.6)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
            <h2 style={{ fontSize: "1.1rem", lineHeight: "1.65", color: "#1a4228", margin: 0, fontWeight: 600 }}><MathText text={q.text} /></h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
            {q.options.map((opt, i) => {
              let bg = "rgba(255,255,255,0.85)";
              let border = "1.5px solid rgba(67,160,71,0.25)";
              let color = "#1a4228";
              if (selected !== null) {
                if (i === q.correctIndex) { bg = "rgba(67,160,71,0.14)"; border = "1.5px solid #43a047"; color = "#2e7d32"; }
                else if (i === selected)  { bg = "rgba(229,57,53,0.1)";  border = "1.5px solid #e53935"; color = "#c62828"; }
              }
              return (
                <button key={i} onClick={() => handleAnswer(i)} style={{
                  padding: "12px 16px", minHeight: 48, fontSize: "1rem", background: bg,
                  border, borderRadius: 12, cursor: selected !== null ? "default" : "pointer",
                  textAlign: "right", color, fontFamily: "inherit", fontWeight: 500,
                  touchAction: "manipulation", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                  boxShadow: selected === null ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                }}>
                  <MathText text={opt} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "finished" && game) {
    const sorted = Object.entries(game.players).sort((a, b) => b[1].score - a[1].score);
    const winner = sorted[0];

    if (!savedResultRef.current) {
      savedResultRef.current = true;
      const isWinner = sorted.length > 1 && winner[0] === user.uid && winner[1].score > sorted[1][1].score;
      const progressRef = doc(db, "userProgress", user.uid);
      updateDoc(progressRef, {
        multiplayerGames: increment(1),
        ...(isWinner ? { multiplayerWins: increment(1) } : {}),
      }).catch(() => {});
    }
    return (
      <div style={centerStyle}>
        <h1>🏆 המשחק נגמר!</h1>
        <p style={{ fontSize: "1.5rem", margin: "20px 0" }}>
          {winner[1].score === game.players[user.uid]?.score 
  ? "תיקו! 🤝" 
  : winner[0] === user.uid 
    ? "ניצחת! 🎉" 
    : `${winner[1].displayName} ניצח! 🏆`}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "300px" }}>
          {sorted.map(([uid, p], i) => (
            <div key={uid} style={{
              display: "flex", justifyContent: "space-between", padding: "14px",
              background: i === 0 ? "#FFF8E1" : "#F5F5F5", borderRadius: "10px"
            }}>
              <span>{i === 0 ? "🥇" : "🥈"} {p.displayName}</span>
              <span style={{ fontWeight: "bold" }}>{p.score}</span>
            </div>
          ))}
        </div>
        <button onClick={onBack} style={{ ...backBtn, marginTop: "30px" }}>חזור לתפריט</button>
      </div>
    );
  }

  return <div style={centerStyle}><p>טוען...</p></div>;
}

const centerStyle = {
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  minHeight: "100vh", minHeight: "100dvh",
  fontFamily: "'Heebo', Arial, sans-serif",
  padding: "20px",
  paddingTop: "calc(20px + env(safe-area-inset-top))",
  paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
  background: "linear-gradient(180deg, #e8f5e9 0%, #f9fbe7 40%, #e8f5e9 100%)",
  boxSizing: "border-box",
};
const backBtn = {
  padding: "10px 20px", minHeight: 44, borderRadius: 10,
  border: "none", background: "linear-gradient(160deg,#43a047,#2e7d32)",
  color: "white", cursor: "pointer", fontWeight: 800, fontSize: "0.9rem",
  touchAction: "manipulation", fontFamily: "inherit",
  boxShadow: "0 2px 8px rgba(46,125,50,0.25)",
};
const bigBtn = (color) => ({
  padding: "14px 24px", minHeight: 48, fontSize: "1rem",
  backgroundColor: color, color: "white", border: "none",
  borderRadius: 12, cursor: "pointer", width: "100%", maxWidth: "300px",
  touchAction: "manipulation", fontFamily: "inherit", fontWeight: 700,
  boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
});
const inputStyle = {
  padding: "13px", fontSize: "16px", borderRadius: 10,
  border: "1.5px solid rgba(67,160,71,0.35)", width: "100%", maxWidth: "300px",
  textAlign: "center", marginBottom: "12px", fontFamily: "inherit",
  background: "rgba(255,255,255,0.9)", color: "#1a4228", outline: "none",
  boxSizing: "border-box",
};