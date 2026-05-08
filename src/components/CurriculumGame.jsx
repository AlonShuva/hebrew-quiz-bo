import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "../firebase/config";
import { doc, getDoc, setDoc, increment, collection, query, where, getDocs } from "firebase/firestore";
import { recordQuestionStat } from "../firebase/questionStats";
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
  const [totalPoints, setTotalPoints] = useState(0);
  const [hintUsed, setHintUsed] = useState([]);
  const [hintModal, setHintModal] = useState(false);
  const [successTotal, setSuccessTotal] = useState(0);
  const levelPointsRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const hadFailedRef = useRef(false);

  const loadQuestions = useCallback(async () => {
    setPhase("loading");

    const [qSnap, lvlSnap, progressSnap] = await Promise.all([
      getDocs(query(collection(db, "curriculumQuestions"), where("levelId", "==", levelId))),
      getDocs(query(collection(db, "curriculumLevels"), where("id", "==", levelId))),
      getDoc(doc(db, "userProgress", user.uid)),
    ]);

    // Points — use Firestore value only if it's a positive number
    const lvlData = lvlSnap.docs[0]?.data();
    const pts = (lvlData?.points > 0) ? lvlData.points : Math.round((50 + levelId * 10) / 5) * 5;
    levelPointsRef.current = pts;
    setLevelPoints(pts);

    // Write level to curriculumLevels if not already there
    if (!lvlSnap.docs[0]) {
      const staticLevel = curriculum.find(l => l.id === Number(levelId));
      await setDoc(doc(db, "curriculumLevels", String(levelId)), {
        id: Number(levelId),
        title: staticLevel?.title || `רמה ${levelId}`,
        points: pts,
        firstOpenedAt: new Date().toISOString(),
      });
    }

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
    setTotalPoints(prev.totalPoints || 0);

    if (currentLives === 0) { setPhase("noLives"); return; }

    const data = qSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.questionIndex - b.questionIndex);
    if (data.length === 0) { setPhase("noQuestions"); return; }
    setQuestions(data);
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setHintUsed([]);
    setHintModal(false);
    hadFailedRef.current = false;
    setPhase("playing");
  }, [levelId, user.uid]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const updateStreak = async () => {
    const todayVal = today();
    const dRef = doc(db, "userDailyProgress", user.uid);
    const dSnap = await getDoc(dRef);
    const dd = dSnap.exists() ? dSnap.data() : {};
    if (dd.date === todayVal) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const newStreak = dd.date === yesterday ? (dd.streak || 0) + 1 : 1;
    await setDoc(dRef, { date: todayVal, streak: newStreak, solved: true }, { merge: true });
  };

  const deductLife = async () => {
    const newLives = Math.max(0, livesRef.current - 1);
    livesRef.current = newLives;
    setLives(newLives);
    await setDoc(doc(db, "userProgress", user.uid), { lives: newLives, livesDate: today() }, { merge: true });
    return newLives;
  };

  const hintCost = questions.length > 0
    ? Math.max(5, Math.round((levelPoints / questions.length) * 1.5 / 5) * 5)
    : 0;

  const confirmHint = async () => {
    const newTotal = Math.max(0, totalPoints - hintCost);
    await setDoc(doc(db, "userProgress", user.uid), { totalPoints: newTotal }, { merge: true });
    setTotalPoints(newTotal);
    setHintUsed(prev => { const next = [...prev]; next[current] = true; return next; });
    setHintModal(false);
  };

  const handleAnswer = async (index) => {
    if (selected !== null) return;
    setSelected(index);
    const isCorrect = index === questions[current].correctIndex;
    recordQuestionStat(questions[current].id, levelId, isCorrect, index);
    if (!isCorrect) {
      await deductLife();
    } else {
      setScore(s => s + 1);
    }
  };

  const handleNext = async () => {
    const isCorrect = selected === questions[current].correctIndex;

    if (!isCorrect) {
      hadFailedRef.current = true;
      if (livesRef.current === 0) {
        setPhase("noLives");
      } else {
        setPhase("fail");
      }
      return;
    }

    if (current + 1 >= questions.length) {
      try {
        const ref = doc(db, "userProgress", user.uid);
        const snap = await getDoc(ref);
        const prev = snap.exists() ? snap.data() : {};
        const prevCompleted = (prev.completedLevels || []).map(Number);
        const alreadyCompleted = prevCompleted.includes(Number(levelId));
        const toAdd = alreadyCompleted ? 0 : levelPointsRef.current;
        const newTotal = (prev.totalPoints || 0) + toAdd;
        const completed = [...new Set([...prevCompleted, Number(levelId)])];
        const nextLevel = Number(levelId) + 1;
        await updateStreak();
        const achievementUpdates = {};
        if (!hadFailedRef.current)       achievementUpdates.perfectLevels    = increment(1);
        if (!hintUsed.some(Boolean))     achievementUpdates.noHintLevels     = increment(1);
        if (hadFailedRef.current && !alreadyCompleted) achievementUpdates.retriedAndPassed = increment(1);
        if (alreadyCompleted)            achievementUpdates.replayedLevels   = increment(1);

        await setDoc(ref, {
          completedLevels: completed,
          currentLevel: nextLevel <= totalLevels ? nextLevel : Number(levelId),
          phaseB: nextLevel > totalLevels,
          totalPoints: newTotal,
          displayName: user.displayName || user.email?.split('@')[0] || "שחקן",
          photoURL: user.photoURL || "",
          email: user.email || "",
          ...achievementUpdates,
        }, { merge: true });
        setSuccessTotal(newTotal);
        setTotalPoints(newTotal);
        setLevelPoints(toAdd); // show actual points earned (0 if already completed)
        setPhase("success");
      } catch (e) {
        console.error("handleNext save error:", e);
        alert("שגיאה בשמירת הנקודות: " + e.message);
      }
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
    }
  };

  const retry = () => {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setHintUsed([]);
    setHintModal(false);
    setPhase("playing");
  };

  // ── LOADING ──
  if (phase === "loading") return (
    <div style={centerStyle}>
      <MathFloatsBg />
      <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>⏳</div>
        <p style={{ color: "var(--text-secondary)" }}>טוען שאלות...</p>
      </div>
    </div>
  );

  // Wrapper for non-playing phases
  const wrap = (content) => (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #e8f5e9 0%, #f9fbe7 40%, #e8f5e9 100%)", display: "flex", flexDirection: "column", fontFamily: "'Heebo', Arial, sans-serif", position: "relative" }}>
      <MathFloatsBg />
      <div style={{ position: "relative", zIndex: 1, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <LivesBar lives={lives} />
        <button onClick={onBack} className="btn-back">← חזור</button>
      </div>
      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 20px 40px" }}>
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
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "4px", background: "var(--success-bg)", border: "1px solid var(--success)", borderRadius: "10px", padding: "10px 20px", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "1.1rem" }}>⭐</span>
          <span style={{ fontWeight: "800", fontSize: "1rem", color: "var(--success)" }}>+{levelPoints} נקודות</span>
        </div>
        <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>סה"כ: {successTotal} נקודות</span>
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
    <div style={{
      height: "100vh", height: "100dvh",
      background: "linear-gradient(180deg, #e8f5e9 0%, #f9fbe7 40%, #e8f5e9 100%)",
      display: "flex", flexDirection: "column",
      fontFamily: "'Heebo', Arial, sans-serif", position: "relative",
      overflow: "hidden", boxSizing: "border-box",
    }}>
      <MathFloatsBg />

      {/* Header — same as CurriculumMap */}
      <div style={{
        flexShrink: 0,
        background: "rgba(232,245,233,0.92)", backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1.5px solid #a5d6a7",
        padding: "10px 16px",
        paddingTop: "calc(10px + env(safe-area-inset-top))",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 2px 12px rgba(67,160,71,0.12)",
        position: "relative", zIndex: 10,
      }}>
        <button onClick={onBack} style={mapBtn}>← חזור</button>
        <LivesBar lives={lives} />
      </div>

      {/* Hint popup */}
      {hintModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="card popIn" style={{ padding: "28px 24px", maxWidth: "340px", width: "100%", textAlign: "center" }}>
            {totalPoints >= hintCost ? (
              <>
                <div style={{ fontSize: "2rem", marginBottom: "10px" }}>💡</div>
                <h3 style={{ margin: "0 0 6px", fontSize: "1.1rem", color: "var(--text)" }}>השתמש/י ברמז?</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "4px" }}>
                  עלות: <strong style={{ color: "#E65100" }}>{hintCost} נקודות</strong>
                </p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "20px" }}>
                  נקודות נוכחיות: {totalPoints}
                </p>
                <button onClick={confirmHint} className="btn-primary" style={{ width: "100%", marginBottom: "8px", background: "#F9A825", borderColor: "#F9A825" }}>
                  💡 השתמש ברמז
                </button>
                <button onClick={() => setHintModal(false)} style={{ width: "100%", padding: "10px", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.9rem" }}>
                  חזור לשאלה
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: "2rem", marginBottom: "10px" }}>😔</div>
                <h3 style={{ margin: "0 0 6px", fontSize: "1.1rem", color: "var(--error)" }}>אין מספיק נקודות</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "4px" }}>
                  הרמז עולה <strong>{hintCost} נקודות</strong>
                </p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "20px" }}>
                  יש לך {totalPoints} נקודות בלבד
                </p>
                <button onClick={() => setHintModal(false)} className="btn-primary" style={{ width: "100%" }}>
                  חזור לשאלה
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 16px", paddingBottom: "calc(10px + env(safe-area-inset-bottom))", boxSizing: "border-box", overflow: "hidden" }}>
      <div style={{ width: "100%", maxWidth: "520px", display: "flex", flexDirection: "column", flex: 1, position: "relative", zIndex: 1 }}>

        {/* Level badge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
          <div style={{ background: "var(--primary-bg)", color: "var(--primary)", borderRadius: "99px", padding: "4px 14px", fontSize: "0.82rem", fontWeight: "700" }}>
            רמה {levelId}
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: "3px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.76rem", color: "var(--text-secondary)" }}>שאלה {current + 1} מתוך {questions.length}</span>
          <span style={{ fontSize: "0.76rem", color: "var(--text-secondary)" }}>חייב לענות נכון על כולן</span>
        </div>
        <div className="progress-bar" style={{ marginBottom: "8px" }}>
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Dots */}
        <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "10px" }}>
          {questions.map((_, i) => (
            <div key={i} style={{
              width: "8px", height: "8px", borderRadius: "50%", transition: "background 0.2s",
              background: i < current ? "var(--success)" : i === current ? "var(--primary)" : "var(--border)"
            }} />
          ))}
        </div>

        {/* Question card */}
        <div className="card" style={{ padding: "16px 20px", marginBottom: "10px" }}>
          <div style={{ display: "inline-block", background: "var(--primary-bg)", color: "var(--primary)", borderRadius: "8px", padding: "3px 10px", fontSize: "0.72rem", fontWeight: "700", marginBottom: "8px" }}>
            שאלה {current + 1}
          </div>
          <h2 style={{ fontSize: "1.05rem", lineHeight: "1.6", color: "var(--text)", fontWeight: "600", margin: 0 }}>
            <MathText text={q.text} />
          </h2>
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "8px" }}>
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
                padding: "10px 14px", fontSize: "0.95rem", background: bg, border, borderRadius: "var(--radius-sm)",
                cursor: selected !== null ? "default" : "pointer", textAlign: "right",
                display: "flex", alignItems: "center", gap: "10px", transition: "all 0.2s", color,
                fontFamily: "inherit", fontWeight: isSelected || (selected !== null && isCorrect) ? "600" : "400",
                boxShadow: selected === null ? "var(--shadow)" : "none",
              }}
                onMouseEnter={e => { if (selected !== null) return; e.currentTarget.style.borderColor = "var(--primary-light)"; e.currentTarget.style.background = "var(--primary-bg)"; }}
                onMouseLeave={e => { if (selected !== null) return; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--card)"; }}
              >
                <div style={{
                  width: "26px", height: "26px", borderRadius: "7px", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.82rem", fontWeight: "700",
                  background: selected !== null ? (isCorrect ? "var(--success)" : isSelected ? "var(--error)" : "var(--border)") : "var(--primary-bg)",
                  color: selected !== null ? "white" : "var(--primary)"
                }}>
                  {icon || ['א','ב','ג','ד'][i]}
                </div>
                <MathText text={opt} />
              </button>
            );
          })}
        </div>

        {/* Hint */}
        {q.hint && (
          <div style={{ marginBottom: "8px" }}>
            {hintUsed[current] ? (
              <div className="fadeIn" style={{ background: "#FFFDE7", border: "1.5px solid #F9A825", borderRadius: "10px", padding: "10px 14px" }}>
                <span style={{ fontSize: "0.75rem", color: "#E65100", fontWeight: 700 }}>💡 רמז</span>
                <p style={{ margin: "4px 0 0", color: "#4E342E", lineHeight: 1.5, fontSize: "0.88rem" }}>
                  <MathText text={q.hint} />
                </p>
              </div>
            ) : selected === null ? (
              <button onClick={() => setHintModal(true)} style={{
                width: "100%", padding: "9px 14px", background: "#FFFDE7", border: "1.5px solid #F9A825",
                borderRadius: "10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700,
                color: "#E65100", textAlign: "center", fontFamily: "inherit",
              }}>
                💡 רמז
              </button>
            ) : null}
          </div>
        )}

        {/* Feedback */}
        {selected !== null && (
          <div className="card fadeIn" style={{ padding: "14px 20px", textAlign: "center" }}>
            <p style={{ fontWeight: "700", fontSize: "1rem", color: selected === q.correctIndex ? "var(--success)" : "var(--error)", marginBottom: "12px" }}>
              {selected === q.correctIndex ? "✓ נכון! המשך" : `✗ לא נכון — נשאר ${lives} ❤️`}
            </p>
            <button onClick={handleNext} className="btn-primary" style={{ minWidth: "160px" }}>
              {selected !== q.correctIndex ? "ראה תשובה ←" : current + 1 >= questions.length ? "סיים רמה 🎉" : "שאלה הבאה ←"}
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

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

const centerStyle = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "20px", background: "linear-gradient(180deg, #e8f5e9 0%, #f9fbe7 40%, #e8f5e9 100%)", position: "relative" };

const MATH_EXPRS = [
  "f(x)=√x", "x≠0", "x≥0", "1/x", "log(x)", "x²+1",
  "√(x+1)", "x>0", "x∈ℝ", "f(x)=|x|", "ln(x)", "x≤5",
  "∛x", "x²-4", "1/(x-1)", "√(1-x)", "x≠±2", "log₂(x)",
  "f(x)=x³", "x+y=1", "√x·ln(x)", "1/√x", "x∈(0,∞)",
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

const floatStyle = `
  @keyframes floatEq {
    0%   { transform: translateY(0px) rotate(var(--r)); opacity: calc(var(--o) * 0.3); }
    40%  { transform: translateY(-20px) rotate(var(--r)); opacity: var(--o); }
    100% { transform: translateY(0px) rotate(var(--r)); opacity: calc(var(--o) * 0.3); }
  }
`;

function MathFloatsBg() {
  return (
    <>
      <style>{floatStyle}</style>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        {mathFloats.map((m, i) => (
          <div key={i} style={{
            position: "absolute", left: m.x, top: m.y,
            fontSize: m.size, fontWeight: 700, color: "#43a047",
            opacity: m.o, userSelect: "none",
            fontFamily: "'Heebo', Arial, sans-serif",
            animation: `floatEq ${m.d}s ease-in-out infinite`,
            animationDelay: `${m.delay}s`,
            "--r": `${m.rot}deg`,
            "--o": m.o,
          }}>{m.text}</div>
        ))}
      </div>
    </>
  );
}
