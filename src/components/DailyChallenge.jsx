import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import MathText from "./MathText";

const MAX_LIVES = 3;

function today() { return new Date().toISOString().split("T")[0]; }

export default function DailyChallenge({ user, onBack }) {
  const [phase, setPhase] = useState("loading"); // loading | playing | won | lost | already
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [lives, setLives] = useState(MAX_LIVES);
  const [error, setError] = useState("");
  const [streak, setStreak] = useState(0);

  useEffect(() => { init(); }, []);

  const init = async () => {
    setPhase("loading");
    const date = today();

    // Load user daily state
    const userRef = doc(db, "userDailyProgress", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};

    setStreak(userData.streak || 0);

    if (userData.date === date) {
      if (userData.solved) { setPhase("already"); return; }
      if (userData.lives <= 0) { setPhase("lost"); return; }
      setLives(userData.lives);
    } else {
      // New day — reset lives
      setLives(MAX_LIVES);
    }

    // Load or generate today's question
    const challengeRef = doc(db, "dailyChallenges", date);
    const challengeSnap = await getDoc(challengeRef);

    if (challengeSnap.exists()) {
      setQuestion(challengeSnap.data().question);
      setPhase("playing");
      return;
    }

    // Generate new question
    try {
      const res = await fetch("/api/generate-daily-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      let data;
      try { data = await res.json(); } catch { throw new Error("שגיאת חיבור"); }
      if (!res.ok || data.error) throw new Error(data.error || "שגיאת שרת");

      await setDoc(challengeRef, { question: data.question, date, generatedAt: new Date().toISOString() });
      setQuestion(data.question);
      setPhase("playing");
    } catch (e) {
      setError(e.message);
      setPhase("error");
    }
  };

  const handleAnswer = (index) => {
    if (selected !== null) return;
    setSelected(index);
  };

  const handleNext = async () => {
    const date = today();
    const userRef = doc(db, "userDailyProgress", user.uid);
    const userSnap = await getDoc(userRef);
    const prev = userSnap.exists() ? userSnap.data() : {};

    if (selected === question.correctIndex) {
      // Won
      const newStreak = (prev.date === getPreviousDay() ? (prev.streak || 0) + 1 : 1);
      await setDoc(userRef, { date, solved: true, lives, streak: newStreak }, { merge: true });
      setStreak(newStreak);
      setPhase("won");
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      await setDoc(userRef, { date, solved: false, lives: newLives, streak: prev.streak || 0 }, { merge: true });
      if (newLives <= 0) {
        setPhase("lost");
      } else {
        setSelected(null); // same question, new attempt
      }
    }
  };

  if (phase === "loading") return (
    <div style={centerStyle}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>⚡</div>
        <p style={{ color: "var(--text-secondary)" }}>טוען אתגר יומי...</p>
      </div>
    </div>
  );

  if (phase === "error") return (
    <div style={centerStyle}>
      <div className="card" style={{ padding: "32px", textAlign: "center", maxWidth: "340px" }}>
        <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⚠️</div>
        <p style={{ color: "var(--error)", marginBottom: "20px" }}>{error}</p>
        <button onClick={init} className="btn-primary" style={{ width: "100%", marginBottom: "10px" }}>נסה/י שוב</button>
        <button onClick={onBack} style={{ width: "100%", padding: "10px", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>חזור</button>
      </div>
    </div>
  );

  if (phase === "already") return (
    <div style={centerStyle}>
      <div className="card popIn" style={{ padding: "40px", textAlign: "center", maxWidth: "360px", width: "100%" }}>
        <div style={{ fontSize: "3rem", marginBottom: "12px" }}>✅</div>
        <h2 style={{ marginBottom: "8px", color: "var(--success)" }}>פתרת את האתגר של היום!</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "8px" }}>חזור מחר לאתגר חדש</p>
        {streak > 0 && (
          <div style={{ background: "var(--primary-bg)", borderRadius: "10px", padding: "12px", marginBottom: "20px" }}>
            <span style={{ fontSize: "1.5rem" }}>🔥</span>
            <span style={{ color: "var(--primary)", fontWeight: "700", marginRight: "8px" }}> {streak} ימים ברצף</span>
          </div>
        )}
        <button onClick={onBack} className="btn-primary" style={{ width: "100%" }}>חזור</button>
      </div>
    </div>
  );

  if (phase === "lost") return (
    <div style={centerStyle}>
      <div className="card popIn" style={{ padding: "40px", textAlign: "center", maxWidth: "360px", width: "100%" }}>
        <div style={{ fontSize: "3rem", marginBottom: "12px" }}>💔</div>
        <h2 style={{ marginBottom: "8px", color: "var(--error)" }}>נגמרו הניסיונות</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>חזור/י מחר לאתגר חדש — אל תוותר/י!</p>
        {question && (
          <div style={{ background: "var(--success-bg)", border: "1px solid var(--success)", borderRadius: "10px", padding: "14px", marginBottom: "20px", textAlign: "right" }}>
            <p style={{ margin: "0 0 6px", fontSize: "0.85rem", color: "var(--success)", fontWeight: "600" }}>התשובה הנכונה:</p>
            <MathText text={question.options[question.correctIndex]} />
          </div>
        )}
        <button onClick={onBack} className="btn-primary" style={{ width: "100%" }}>חזור</button>
      </div>
    </div>
  );

  if (phase === "won") return (
    <div style={centerStyle}>
      <div className="card popIn" style={{ padding: "40px", textAlign: "center", maxWidth: "360px", width: "100%" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "12px" }}>🌟</div>
        <h2 style={{ fontSize: "1.6rem", fontWeight: "800", marginBottom: "8px", color: "var(--text)" }}>מצוין!</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>פתרת את אתגר היום</p>
        {streak > 0 && (
          <div style={{ background: "var(--primary-bg)", borderRadius: "10px", padding: "12px", marginBottom: "20px" }}>
            <span style={{ fontSize: "1.5rem" }}>🔥</span>
            <span style={{ color: "var(--primary)", fontWeight: "700", marginRight: "8px" }}> {streak} ימים ברצף!</span>
          </div>
        )}
        <button onClick={onBack} className="btn-primary" style={{ width: "100%" }}>חזור</button>
      </div>
    </div>
  );

  // Playing
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px" }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <button onClick={onBack} className="btn-back">← חזור</button>
          <div style={{ fontWeight: "700", color: "var(--primary)", fontSize: "0.95rem" }}>⚡ אתגר יומי</div>
        </div>

        {/* Lives */}
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "20px" }}>
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <span key={i} style={{ fontSize: "1.8rem", filter: i < lives ? "none" : "grayscale(1) opacity(0.3)" }}>❤️</span>
          ))}
        </div>

        <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px" }}>
          {lives} ניסיונות נותרו — אותה שאלה עד שתפתור/י אותה
        </p>

        {/* Question */}
        <div className="card" style={{ padding: "28px", marginBottom: "16px", border: "2px solid var(--primary-light)" }}>
          <div style={{ display: "inline-block", background: "var(--primary-bg)", color: "var(--primary)", borderRadius: "8px", padding: "4px 12px", fontSize: "0.78rem", fontWeight: "700", marginBottom: "14px" }}>
            🌟 שאלת בגרות
          </div>
          <h2 style={{ fontSize: "1.15rem", lineHeight: "1.7", color: "var(--text)", fontWeight: "600" }}>
            <MathText text={question.text} />
          </h2>
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
          {question.options.map((opt, i) => {
            const isCorrect = i === question.correctIndex;
            const isSelected = i === selected;
            let bg = "var(--card)", border = "1.5px solid var(--border)", color = "var(--text)", icon = null;
            if (selected !== null) {
              if (isCorrect) { bg = "var(--success-bg)"; border = "1.5px solid var(--success)"; color = "var(--success)"; icon = "✓"; }
              else if (isSelected) { bg = "var(--error-bg)"; border = "1.5px solid var(--error)"; color = "var(--error)"; icon = "✗"; }
            }
            return (
              <button key={i} onClick={() => handleAnswer(i)} style={{
                padding: "14px 18px", fontSize: "1rem", background: bg, border, borderRadius: "var(--radius-sm)",
                cursor: selected !== null ? "default" : "pointer", textAlign: "right",
                display: "flex", alignItems: "center", gap: "12px", transition: "all 0.15s", color,
                fontFamily: "inherit", fontWeight: isSelected || (selected !== null && isCorrect) ? "600" : "400",
              }}
                onMouseEnter={e => { if (selected !== null) return; e.currentTarget.style.borderColor = "var(--primary-light)"; e.currentTarget.style.background = "var(--primary-bg)"; }}
                onMouseLeave={e => { if (selected !== null) return; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--card)"; }}
              >
                <div style={{ width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: "700", background: selected !== null ? (isCorrect ? "var(--success)" : isSelected ? "var(--error)" : "var(--border)") : "var(--primary-bg)", color: selected !== null ? "white" : "var(--primary)" }}>
                  {icon || String.fromCharCode(65 + i)}
                </div>
                <MathText text={opt} />
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <div className="card fadeIn" style={{ padding: "20px", textAlign: "center" }}>
            <p style={{ fontWeight: "700", fontSize: "1.1rem", color: selected === question.correctIndex ? "var(--success)" : "var(--error)", marginBottom: "16px" }}>
              {selected === question.correctIndex ? "✓ נכון! מצוין!" : `✗ לא נכון — נותרו ${lives - 1} ניסיונות`}
            </p>
            <button onClick={handleNext} className="btn-primary" style={{ minWidth: "160px" }}>
              {selected === question.correctIndex ? "סיים ✓" : lives - 1 > 0 ? "נסה/י שוב ←" : "סיום"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getPreviousDay() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

const centerStyle = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "20px", background: "var(--bg)" };
