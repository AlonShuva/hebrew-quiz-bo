import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, query, where, getDocs, doc, setDoc, increment, getDoc, arrayUnion } from "firebase/firestore";
import MathText from "./MathText";

export default function SinglePlayer({ user, onBack, level = 1 }) {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      const q = query(collection(db, "questions"), where("level", "==", level));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setQuestions(data);
      setLoading(false);
    };
    fetchQuestions();
  }, [level]);

  const saveScore = async (finalScore) => {
    const levelsSnap = await getDocs(collection(db, "levels"));
    const allLevels = levelsSnap.docs.map(d => d.data()).sort((a, b) => a.id - b.id);
    const currentIdx = allLevels.findIndex(l => l.id === level);
    const nextLevel = currentIdx >= 0 && currentIdx < allLevels.length - 1
      ? allLevels[currentIdx + 1]
      : null;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    const updateData = {
      totalScore: increment(finalScore),
      gamesPlayed: increment(1),
      displayName: user.displayName,
    };
    if (nextLevel) {
      updateData.unlockedLevels = arrayUnion(nextLevel.id);
    }

    if (snap.exists()) {
      await setDoc(userRef, updateData, { merge: true });
    } else {
      const initialUnlocked = allLevels.length > 0 ? [allLevels[0].id] : [];
      if (nextLevel && !initialUnlocked.includes(nextLevel.id)) {
        initialUnlocked.push(nextLevel.id);
      }
      await setDoc(userRef, {
        totalScore: finalScore,
        gamesPlayed: 1,
        displayName: user.displayName,
        email: user.email,
        unlockedLevels: initialUnlocked
      });
    }
  };

  const handleAnswer = (index) => {
    if (selected !== null) return;
    setSelected(index);
    if (index === questions[current].correctIndex) {
      setScore(prev => prev + level * 10);
    }
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setFinished(true);
      saveScore(score);
    } else {
      setCurrent(prev => prev + 1);
      setSelected(null);
    }
  };

  if (loading) return (
    <div style={centerStyle}>
      <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>⏳</div>
      <p style={{ color: "var(--text-secondary)" }}>טוען שאלות...</p>
    </div>
  );

  if (questions.length === 0) return (
    <div style={centerStyle}>
      <div className="card" style={{ padding: "36px", textAlign: "center", maxWidth: "340px" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📭</div>
        <h2 style={{ marginBottom: "8px", color: "var(--text)" }}>אין שאלות ברמה {level}</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px", fontSize: "0.9rem" }}>
          יש להוסיף שאלות דרך פאנל הניהול
        </p>
        <button onClick={onBack} className="btn-primary" style={{ width: "100%" }}>חזור</button>
      </div>
    </div>
  );

  if (finished) {
    const correctCount = Math.round(score / (level * 10));
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <div style={centerStyle}>
        <div className="card popIn" style={{ padding: "40px 36px", textAlign: "center", maxWidth: "360px", width: "100%" }}>
          <div style={{ fontSize: "3rem", marginBottom: "12px" }}>
            {pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "📚"}
          </div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "800", marginBottom: "6px", color: "var(--text)" }}>
            {pct >= 80 ? "כל הכבוד!" : pct >= 50 ? "עבודה טובה!" : "המשך להתאמן!"}
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "28px" }}>סיימת את הרמה</p>

          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "20px",
            marginBottom: "28px"
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: "800", color: "var(--primary)" }}>{score}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>נקודות</div>
            </div>
            <div style={{ width: "1px", background: "var(--border)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: "800", color: "var(--success)" }}>{correctCount}/{questions.length}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>תשובות נכונות</div>
            </div>
            <div style={{ width: "1px", background: "var(--border)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: "800", color: "#F39C12" }}>{pct}%</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>דיוק</div>
            </div>
          </div>

          <button onClick={onBack} className="btn-primary" style={{ width: "100%" }}>
            חזור לתפריט
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const progress = ((current) / questions.length) * 100;

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "24px 20px",
      fontFamily: "'Segoe UI', Arial, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>
        {/* Top bar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px"
        }}>
          <button onClick={onBack} className="btn-back">← חזור</button>
          <div style={{
            background: "var(--primary-bg)",
            color: "var(--primary)",
            borderRadius: "99px",
            padding: "6px 14px",
            fontSize: "0.88rem",
            fontWeight: "700"
          }}>
            ⭐ {score} נקודות
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            שאלה {current + 1} מתוך {questions.length}
          </span>
          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            רמה {level}
          </span>
        </div>
        <div className="progress-bar" style={{ marginBottom: "24px" }}>
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Question card */}
        <div className="card" style={{ padding: "28px", marginBottom: "16px" }}>
          <div style={{
            display: "inline-block",
            background: "var(--primary-bg)",
            color: "var(--primary)",
            borderRadius: "8px",
            padding: "4px 12px",
            fontSize: "0.78rem",
            fontWeight: "700",
            marginBottom: "14px"
          }}>
            שאלה {current + 1}
          </div>
          <h2 style={{
            fontSize: "1.2rem",
            lineHeight: "1.7",
            color: "var(--text)",
            fontWeight: "600"
          }}>
            <MathText text={q.text} />
          </h2>
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctIndex;
            const isSelected = i === selected;
            let bg = "var(--card)";
            let border = "1.5px solid var(--border)";
            let color = "var(--text)";
            let icon = null;

            if (selected !== null) {
              if (isCorrect) {
                bg = "var(--success-bg)";
                border = "1.5px solid var(--success)";
                color = "var(--success)";
                icon = "✓";
              } else if (isSelected) {
                bg = "var(--error-bg)";
                border = "1.5px solid var(--error)";
                color = "var(--error)";
                icon = "✗";
              }
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                style={{
                  padding: "14px 18px",
                  fontSize: "1rem",
                  background: bg,
                  border,
                  borderRadius: "var(--radius-sm)",
                  cursor: selected !== null ? "default" : "pointer",
                  textAlign: "right",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  transition: "all 0.2s",
                  color,
                  fontFamily: "inherit",
                  fontWeight: isSelected || (selected !== null && isCorrect) ? "600" : "400",
                  boxShadow: selected === null ? "var(--shadow)" : "none",
                }}
                onMouseEnter={e => {
                  if (selected !== null) return;
                  e.currentTarget.style.borderColor = "var(--primary-light)";
                  e.currentTarget.style.background = "var(--primary-bg)";
                }}
                onMouseLeave={e => {
                  if (selected !== null) return;
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--card)";
                }}
              >
                <div style={{
                  width: "28px", height: "28px",
                  borderRadius: "8px",
                  background: selected !== null
                    ? (isCorrect ? "var(--success)" : isSelected ? "var(--error)" : "var(--border)")
                    : "var(--primary-bg)",
                  color: selected !== null ? "white" : "var(--primary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  flexShrink: 0
                }}>
                  {icon || String.fromCharCode(65 + i)}
                </div>
                <MathText text={opt} />
              </button>
            );
          })}
        </div>

        {/* Feedback + Next */}
        {selected !== null && (
          <div className="card fadeIn" style={{ padding: "20px", textAlign: "center" }}>
            <p style={{
              fontWeight: "700",
              fontSize: "1.1rem",
              color: selected === q.correctIndex ? "var(--success)" : "var(--error)",
              marginBottom: q.explanation ? "10px" : "16px"
            }}>
              {selected === q.correctIndex ? "✓ תשובה נכונה!" : "✗ לא נכון"}
            </p>
            {q.explanation && (
              <p style={{
                color: "var(--text-secondary)",
                fontSize: "0.9rem",
                lineHeight: "1.6",
                marginBottom: "16px"
              }}>
                💡 <MathText text={q.explanation} />
              </p>
            )}
            <button onClick={handleNext} className="btn-primary" style={{ minWidth: "160px" }}>
              {current + 1 >= questions.length ? "סיים משחק" : "שאלה הבאה ←"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const centerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  padding: "20px",
  fontFamily: "'Segoe UI', Arial, sans-serif",
  background: "var(--bg)"
};
