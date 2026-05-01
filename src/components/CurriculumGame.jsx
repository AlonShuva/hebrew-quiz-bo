import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "../firebase/config";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import MathText from "./MathText";
import { curriculum } from "../../lib/curriculum.js";

const MAX_LIVES = 5;
const today = () => new Date().toISOString().split("T")[0];

function LivesBar({ lives }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {Array.from({ length: MAX_LIVES }, (_, i) => (
        <span key={i} style={{
          fontSize: "1.15rem",
          filter: i < lives ? "none" : "grayscale(1) opacity(0.3)",
          transition: "filter 0.3s",
        }}>❤️</span>
      ))}
      <span style={{ fontSize: "0.63rem", color: "#64748b", fontWeight: 700, marginRight: 2 }}>יומי</span>
    </div>
  );
}

export default function CurriculumGame({ user, levelId, totalLevels = 30, onBack, onComplete }) {
  const [phase, setPhase] = useState("loading");
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [levelPoints, setLevelPoints] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const levelPointsRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);

  const loadQuestions = useCallback(async () => {
    setPhase("loading");

    const [qSnap, lvlSnap, progressSnap] = await Promise.all([
      getDocs(query(collection(db, "curriculumQuestions"), where("levelId", "==", levelId))),
      getDocs(query(collection(db, "curriculumLevels"), where("id", "==", levelId))),
      getDoc(doc(db, "userProgress", user.uid)),
    ]);

    // Points
    const lvlData = lvlSnap.docs[0]?.data();
    const pts = lvlData?.points ?? Math.round((50 + levelId * 10) / 5) * 5;
    levelPointsRef.current = pts;
    setLevelPoints(pts);

    // Lives — reset daily
    const prev = progressSnap.exists() ? progressSnap.data() : {};
    let currentLives;
    if (prev.livesDate === today()) {
      currentLives = prev.lives ?? MAX_LIVES;
    } else {
      currentLives = MAX_LIVES;
      await setDoc(doc(db, "userProgress", user.uid), { lives: MAX_LIVES, livesDate: today() }, { merge: true });
    }
    livesRef.current = currentLives;
    setLives(currentLives);

    if (currentLives === 0) { setPhase("noLives"); return; }

    const data = qSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.questionIndex - b.questionIndex);
    if (data.length === 0) { setPhase("noQuestions"); return; }
    setQuestions(data);
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setPhase("playing");
  }, [levelId, user.uid]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const deductLife = async () => {
    const newLives = Math.max(0, livesRef.current - 1);
    livesRef.current = newLives;
    setLives(newLives);
    await setDoc(doc(db, "userProgress", user.uid), { lives: newLives, livesDate: today() }, { merge: true });
    return newLives;
  };

  const handleAnswer = async (index) => {
    if (selected !== null) return;
    setSelected(index);
    if (index !== questions[current].correctIndex) {
      await deductLife();
    } else {
      setScore(s => s + 1);
    }
  };

  const handleNext = async () => {
    const isCorrect = selected === questions[current].correctIndex;

    if (!isCorrect) {
      if (livesRef.current === 0) {
        setPhase("noLives");
      } else {
        setPhase("fail");
      }
      return;
    }

    if (current + 1 >= questions.length) {
      const ref = doc(db, "userProgress", user.uid);
      const snap = await getDoc(ref);
      const prev = snap.exists() ? snap.data() : {};
      const alreadyCompleted = (prev.completedLevels || []).includes(levelId);
      const completed = [...new Set([...(prev.completedLevels || []), levelId])];
      const nextLevel = levelId + 1;
      await setDoc(ref, {
        ...prev,
        completedLevels: completed,
        currentLevel: nextLevel <= totalLevels ? nextLevel : levelId,
        phaseB: nextLevel > totalLevels,
        totalPoints: (prev.totalPoints || 0) + (alreadyCompleted ? 0 : levelPointsRef.current),
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
      }, { merge: true });
      setPhase("success");
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
    }
  };

  const retry = () => {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setPhase("playing");
  };

  // ── LOADING ──
  if (phase === "loading") return (
    <div style={centerStyle}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>⏳</div>
        <p style={{ color: "var(--text-secondary)" }}>טוען שאלות...</p>
      </div>
    </div>
  );

  // Wrapper for non-playing phases: lives bar top-left + centered card
  const wrap = (content) => (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <LivesBar lives={lives} />
        <button onClick={onBack} className="btn-back">← חזור</button>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 20px 40px" }}>
        {content}
      </div>
    </div>
  );

  // ── NO LIVES ──
  if (phase === "noLives") return wrap(
    <div className="card popIn" style={{ padding: "40px 36px", textAlign: "center", maxWidth: "360px", width: "100%" }}>
      <div style={{ fontSize: "3rem", marginBottom: "16px" }}>💔</div>
      <h2 style={{ marginBottom: "8px", color: "var(--error)", fontSize: "1.5rem", fontWeight: 800 }}>נגמרו הלבבות!</h2>
      <div style={{ display: "flex", justifyContent: "center", gap: "6px", margin: "16px 0" }}>
        {Array.from({ length: MAX_LIVES }, (_, i) => (
          <span key={i} style={{ fontSize: "1.6rem" }}>🖤</span>
        ))}
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "28px", lineHeight: 1.6 }}>
        השתמשת בכל {MAX_LIVES} הלבבות להיום.<br />חזור/י מחר כדי להמשיך!
      </p>
      <button onClick={onBack} className="btn-primary" style={{ width: "100%" }}>חזור למפה</button>
    </div>
  );

  // ── NO QUESTIONS ──
  if (phase === "noQuestions") return wrap(
    <div className="card" style={{ padding: "36px", textAlign: "center", maxWidth: "340px" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📭</div>
      <h2 style={{ marginBottom: "8px", color: "var(--text)" }}>אין שאלות לרמה {levelId}</h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: "20px", fontSize: "0.9rem" }}>
        יש לייצר שאלות דרך פאנל הניהול → תכנית לימודים
      </p>
      <button onClick={onBack} className="btn-primary" style={{ width: "100%" }}>חזור</button>
    </div>
  );

  // ── FAIL ──
  if (phase === "fail") {
    const q = questions[current];
    return wrap(
      <div className="card popIn" style={{ padding: "36px", textAlign: "center", maxWidth: "380px", width: "100%" }}>
        <div style={{ fontSize: "3rem", marginBottom: "8px" }}>❌</div>
        <h2 style={{ marginBottom: "6px", color: "var(--error)" }}>תשובה שגויה</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "16px" }}>
          נשארו לך {lives} לבבות להיום
        </p>
        <div style={{ background: "var(--error-bg)", border: "1px solid var(--error)", borderRadius: "10px", padding: "14px", marginBottom: "10px", textAlign: "right" }}>
          <p style={{ margin: "0 0 4px", fontSize: "0.8rem", color: "var(--error)", fontWeight: "600" }}>בחרת:</p>
          <MathText text={q.options[selected]} />
        </div>
        <div style={{ background: "var(--success-bg)", border: "1px solid var(--success)", borderRadius: "10px", padding: "14px", marginBottom: "24px", textAlign: "right" }}>
          <p style={{ margin: "0 0 4px", fontSize: "0.8rem", color: "var(--success)", fontWeight: "600" }}>תשובה נכונה:</p>
          <MathText text={q.options[q.correctIndex]} />
        </div>
        <button onClick={retry} className="btn-primary" style={{ width: "100%", marginBottom: "10px" }}>
          🔄 נסה/י שוב מהתחלה
        </button>
        <button onClick={onBack} style={{ width: "100%", padding: "10px", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.9rem" }}>
          חזור למפה
        </button>
      </div>
    );
  }

  // ── SUCCESS ──
  if (phase === "success") return wrap(
    <div className="card popIn" style={{ padding: "40px 36px", textAlign: "center", maxWidth: "360px", width: "100%" }}>
      <div style={{ fontSize: "3.5rem", marginBottom: "12px" }}>🎉</div>
      <h2 style={{ fontSize: "1.6rem", fontWeight: "800", marginBottom: "8px", color: "var(--text)" }}>כל הכבוד!</h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: "6px" }}>עברת את רמה {levelId} בהצלחה</p>
      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--success-bg)", border: "1px solid var(--success)", borderRadius: "10px", padding: "6px 16px", marginBottom: "12px" }}>
        <span style={{ fontSize: "1.1rem" }}>⭐</span>
        <span style={{ fontWeight: "800", fontSize: "1rem", color: "var(--success)" }}>+{levelPoints} נקודות</span>
      </div>
      <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "28px" }}>
        {levelId < totalLevels ? `רמה ${levelId + 1} נפתחה!` : `סיימת את כל ${totalLevels} הרמות! 🏆`}
      </p>
      {levelId < totalLevels ? (
        <button onClick={() => onComplete(levelId + 1)} className="btn-primary" style={{ width: "100%", marginBottom: "10px" }}>
          רמה {levelId + 1} →
        </button>
      ) : (
        <button onClick={() => onComplete("phaseB")} className="btn-primary" style={{ width: "100%", marginBottom: "10px" }}>
          🌟 התחל/י אתגר יומי
        </button>
      )}
      <button onClick={onBack} style={{ width: "100%", padding: "10px", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.9rem" }}>
        חזור למפה
      </button>
    </div>
  );

  // ── PLAYING ──
  const q = questions[current];
  const progress = (current / questions.length) * 100;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>

        {/* Top bar — lives + back on LEFT, level badge on RIGHT */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LivesBar lives={lives} />
            <button onClick={onBack} className="btn-back">← חזור</button>
          </div>
          <div style={{ background: "var(--primary-bg)", color: "var(--primary)", borderRadius: "99px", padding: "6px 14px", fontSize: "0.88rem", fontWeight: "700" }}>
            רמה {levelId}
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>שאלה {current + 1} מתוך {questions.length}</span>
          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>חייב לענות נכון על כולן</span>
        </div>
        <div className="progress-bar" style={{ marginBottom: "18px" }}>
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Dots */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "20px" }}>
          {questions.map((_, i) => (
            <div key={i} style={{
              width: "10px", height: "10px", borderRadius: "50%", transition: "background 0.2s",
              background: i < current ? "var(--success)" : i === current ? "var(--primary)" : "var(--border)"
            }} />
          ))}
        </div>

        {/* Question card */}
        <div className="card" style={{ padding: "28px", marginBottom: "16px" }}>
          <div style={{ display: "inline-block", background: "var(--primary-bg)", color: "var(--primary)", borderRadius: "8px", padding: "4px 12px", fontSize: "0.78rem", fontWeight: "700", marginBottom: "14px" }}>
            שאלה {current + 1}
          </div>
          <h2 style={{ fontSize: "1.2rem", lineHeight: "1.7", color: "var(--text)", fontWeight: "600" }}>
            <MathText text={q.text} />
          </h2>
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctIndex;
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
                display: "flex", alignItems: "center", gap: "12px", transition: "all 0.2s", color,
                fontFamily: "inherit", fontWeight: isSelected || (selected !== null && isCorrect) ? "600" : "400",
                boxShadow: selected === null ? "var(--shadow)" : "none",
              }}
                onMouseEnter={e => { if (selected !== null) return; e.currentTarget.style.borderColor = "var(--primary-light)"; e.currentTarget.style.background = "var(--primary-bg)"; }}
                onMouseLeave={e => { if (selected !== null) return; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--card)"; }}
              >
                <div style={{
                  width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.85rem", fontWeight: "700",
                  background: selected !== null ? (isCorrect ? "var(--success)" : isSelected ? "var(--error)" : "var(--border)") : "var(--primary-bg)",
                  color: selected !== null ? "white" : "var(--primary)"
                }}>
                  {icon || String.fromCharCode(65 + i)}
                </div>
                <MathText text={opt} />
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {selected !== null && (
          <div className="card fadeIn" style={{ padding: "20px", textAlign: "center" }}>
            <p style={{ fontWeight: "700", fontSize: "1.1rem", color: selected === q.correctIndex ? "var(--success)" : "var(--error)", marginBottom: "16px" }}>
              {selected === q.correctIndex ? "✓ נכון! המשך" : `✗ לא נכון — נשאר ${lives} ❤️`}
            </p>
            <button onClick={handleNext} className="btn-primary" style={{ minWidth: "160px" }}>
              {selected !== q.correctIndex ? "ראה תשובה ←" : current + 1 >= questions.length ? "סיים רמה 🎉" : "שאלה הבאה ←"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const centerStyle = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "20px", background: "var(--bg)" };
