import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { doc, setDoc, onSnapshot, updateDoc, collection, getDocs, query, getDoc } from "firebase/firestore";
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
      <div style={{ padding: "30px", maxWidth: "600px", margin: "0 auto", fontFamily: "Arial" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
          <span style={{ fontWeight: "bold" }}>שאלה {current + 1}/{questions.length}</span>
        </div>

        {game && (
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
            {Object.entries(game.players).map(([uid, p]) => (
              <div key={uid} style={{
                flex: 1, padding: "10px", background: uid === user.uid ? "#E3F2FD" : "#F5F5F5",
                borderRadius: "10px", textAlign: "center"
              }}>
                <p style={{ fontWeight: "bold", fontSize: "0.9rem" }}>{p.displayName}</p>
                <p style={{ fontSize: "1.2rem", color: "#4285F4" }}>{p.score}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: "#f8f8f8", borderRadius: "12px", padding: "24px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.3rem", lineHeight: "1.6" }}><MathText text={q.text} /></h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {q.options.map((opt, i) => {
            let bg = "#ffffff";
            let border = "2px solid #e0e0e0";
            if (selected !== null) {
              if (i === q.correctIndex) { bg = "#e6f4ea"; border = "2px solid #34A853"; }
              else if (i === selected) { bg = "#fce8e6"; border = "2px solid #EA4335"; }
            }
            return (
              <button key={i} onClick={() => handleAnswer(i)} style={{
                padding: "14px 18px", fontSize: "1rem", background: bg,
                border, borderRadius: "10px", cursor: "pointer", textAlign: "right"
              }}>
                <MathText text={opt} />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (screen === "finished" && game) {
    const sorted = Object.entries(game.players).sort((a, b) => b[1].score - a[1].score);
    const winner = sorted[0];
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

const centerStyle = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Arial", padding: "20px" };
const backBtn = { padding: "10px 20px", borderRadius: "8px", border: "1px solid #ddd", background: "white", cursor: "pointer" };
const bigBtn = (color) => ({ padding: "14px 32px", fontSize: "1rem", backgroundColor: color, color: "white", border: "none", borderRadius: "8px", cursor: "pointer", width: "100%", maxWidth: "300px" });
const inputStyle = { padding: "12px", fontSize: "1.2rem", borderRadius: "8px", border: "1px solid #ddd", width: "100%", maxWidth: "300px", textAlign: "center", marginBottom: "12px" };