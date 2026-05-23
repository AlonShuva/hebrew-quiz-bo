import { useState, useEffect } from "react";
import { auth, db } from "../firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";

const MAX_LIVES = 5;
const todayStr = () => new Date().toISOString().split("T")[0];

const MENU_ITEMS = [
  { key: "curriculumMap", icon: "⚔️", label: "התחל/י ללמוד",  desc: "30 רמות מאפס עד בגרות + אתגר יומי", highlight: true },
  { key: "multi",         icon: "⚔️", label: "דו-קרב",        desc: "התחרה עם חברים בזמן אמת" },
  { key: "leaderboard",  icon: "🏆", label: "לוח תוצאות",   desc: "ראה מי בראש הטבלה" },
  { key: "achievements",  icon: "🏅", label: "הישגים",        desc: "עקוב אחר ההתקדמות שלך" },
  { key: "admin",         icon: "⚙️", label: "ניהול שאלות",  desc: "הוסף ועדכן שאלות" },
  { key: "about",         icon: "👥", label: "אודות הפרויקט", desc: "הצוות שמאחורי המשחק" },
];

export default function MainMenu({ user, onNavigate }) {
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    (async () => {
      const [pSnap, dSnap] = await Promise.all([
        getDoc(doc(db, "userProgress", user.uid)),
        getDoc(doc(db, "userDailyProgress", user.uid)),
      ]);
      if (pSnap.exists()) {
        const p = pSnap.data();
        if (p.livesDate !== todayStr()) {
          setLives(MAX_LIVES);
          setDoc(doc(db, "userProgress", user.uid), { lives: MAX_LIVES, livesDate: todayStr() }, { merge: true });
        } else {
          setLives(p.lives ?? MAX_LIVES);
        }
      }
      if (dSnap.exists()) {
        setStreak(dSnap.data().streak || 0);
      }
    })();
  }, [user.uid]);

  return (
    <div style={{
      minHeight: "100vh",
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "40px 20px 60px",
      paddingTop: "calc(40px + env(safe-area-inset-top))",
      paddingBottom: "calc(60px + env(safe-area-inset-bottom))",
      fontFamily: "'Heebo', Arial, sans-serif",
    }}>

      {/* Header row: title right, avatar left */}
      <div style={{
        width: "100%", maxWidth: 420,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 32,
      }}>
        <div>
          <h1 style={{
            fontSize: "1.75rem", fontWeight: 900,
            color: "white",
            textShadow: "0 2px 12px rgba(0,0,0,0.45)",
            marginBottom: 2, letterSpacing: "-0.5px",
          }}>
            למידת מתמטיקה
          </h1>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.75)", marginBottom: 8 }}>
            תחום הגדרה — מאפס עד בגרות
          </p>

          {/* Streak + Lives */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Streak */}
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              background: streak > 0 ? "rgba(255,152,0,0.22)" : "rgba(255,255,255,0.1)",
              border: streak > 0 ? "1.5px solid rgba(255,152,0,0.5)" : "1.5px solid rgba(255,255,255,0.2)",
              borderRadius: 99, padding: "4px 12px",
            }}>
              <span style={{ fontSize: "1.15rem", filter: streak === 0 ? "grayscale(1) opacity(0.5)" : "none" }}>🔥</span>
              <span style={{ fontWeight: 800, fontSize: "0.95rem", color: streak > 0 ? "#FFB300" : "rgba(255,255,255,0.5)" }}>
                {streak}
              </span>
            </div>

            {/* Lives */}
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {Array.from({ length: MAX_LIVES }, (_, i) => (
                <span key={i} style={{
                  fontSize: "1rem",
                  filter: i < lives ? "none" : "grayscale(1) opacity(0.3)",
                }}>❤️</span>
              ))}
            </div>
          </div>
        </div>

        {/* Avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {user.photoURL ? (
            <img
              src={user.photoURL} alt=""
              style={{ width: 50, height: 50, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.75)", boxShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
              onError={e => e.target.style.display = "none"}
            />
          ) : (
            <div style={{
              width: 50, height: 50, borderRadius: "50%",
              background: "linear-gradient(135deg,#43a047,#2e7d32)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 800, fontSize: "1.2rem",
              border: "2.5px solid rgba(255,255,255,0.75)",
            }}>
              {user.displayName?.charAt(0) || "?"}
            </div>
          )}
          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
            {user.displayName?.split(" ")[0]}
          </span>
        </div>
      </div>

      {/* Menu buttons */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 10,
        width: "100%", maxWidth: 420,
      }}>
        {MENU_ITEMS.map((btn) => (
          <button
            key={btn.key}
            onClick={() => btn.key === "about" ? setShowAbout(true) : onNavigate(btn.key)}
            style={{
              padding: "14px 18px",
              background: "rgba(255,255,255,0.88)",
              border: btn.highlight ? "2px solid #43a047" : "1.5px solid rgba(255,255,255,0.55)",
              borderRight: btn.highlight ? "4px solid #43a047" : undefined,
              borderRadius: 14,
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 14,
              textAlign: "right",
              transition: "all 0.18s",
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
              fontFamily: "inherit",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(255,255,255,0.97)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(67,160,71,0.2)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(255,255,255,0.88)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.08)";
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: btn.highlight ? "rgba(67,160,71,0.12)" : "rgba(67,160,71,0.07)",
              border: `1.5px solid ${btn.highlight ? "rgba(67,160,71,0.4)" : "rgba(67,160,71,0.18)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.4rem",
            }}>
              {btn.icon}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                fontWeight: 800, fontSize: "0.97rem", marginBottom: 2,
                color: btn.highlight ? "#2e7d32" : "#1a4228",
              }}>
                {btn.label}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#4a7c59" }}>{btn.desc}</div>
            </div>

            <span style={{ color: "#43a047", fontSize: "1.2rem", opacity: 0.6 }}>‹</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => auth.signOut()}
        style={{
          marginTop: 28,
          color: "rgba(255,255,255,0.9)",
          background: "rgba(255,255,255,0.12)",
          border: "1.5px solid rgba(255,255,255,0.35)",
          borderRadius: 99,
          cursor: "pointer",
          fontSize: "0.9rem",
          fontWeight: 700,
          fontFamily: "inherit",
          padding: "10px 28px",
          minHeight: 44,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          transition: "all 0.18s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.22)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"; }}
      >
        התנתק ←
      </button>

      {/* About modal */}
      {showAbout && (
        <div
          onClick={() => setShowAbout(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "rgba(255,255,255,0.97)",
              borderRadius: 20,
              padding: "32px 28px",
              maxWidth: 420,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              fontFamily: "'Heebo', Arial, sans-serif",
              direction: "rtl",
              textAlign: "right",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: "linear-gradient(135deg,#43a047,#2e7d32)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.6rem",
                boxShadow: "0 4px 14px rgba(67,160,71,0.35)",
              }}>👥</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: "1.15rem", color: "#1a4228" }}>אודות הפרויקט</div>
                <div style={{ fontSize: "0.78rem", color: "#4a7c59", fontWeight: 600 }}>מכללת סמי שמעון</div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 2, background: "linear-gradient(90deg,#43a047,#a5d6a7)", borderRadius: 2, marginBottom: 20 }} />

            {/* Content */}
            <p style={{ fontSize: "0.97rem", lineHeight: 1.75, color: "#1a4228", marginBottom: 18 }}>
              משחק זה נוצר כחלק מפרויקט גמר במכללת סמי שמעון על ידי{" "}
              <strong style={{ color: "#2e7d32" }}>אלון שובה</strong> ו-<strong style={{ color: "#2e7d32" }}>יוסי לוין</strong>,
              כחלק מלימודיהם לתואר בהנדסה תעשייה וניהול.
            </p>
            <p style={{ fontSize: "0.97rem", lineHeight: 1.75, color: "#1a4228", marginBottom: 18 }}>
              הפרויקט פותח בליווי המרצה <strong style={{ color: "#2e7d32" }}>דויד כודיש</strong> ומטרתו לעזור לתלמידים ולסטודנטים מכל הארץ לשפר את הבנתם בנושא{" "}
              <strong style={{ color: "#2e7d32" }}>תחום ההגדרה של פונקציות</strong> — בצורה כיפית, אינטראקטיבית ונגישה.
            </p>

            {/* Team */}
            <div style={{
              background: "rgba(67,160,71,0.08)",
              border: "1.5px solid rgba(67,160,71,0.25)",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 22,
            }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4a7c59", marginBottom: 10 }}>הצוות</div>
              {[
                { name: "אלון שובה", role: "מפתח ומעצב" },
                { name: "יוסי לוין", role: "מפתח ומעצב" },
                { name: "דויד כודיש", role: "מרצה מנחה" },
              ].map(p => (
                <div key={p.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#1a4228" }}>{p.name}</span>
                  <span style={{ fontSize: "0.78rem", color: "#4a7c59", background: "rgba(67,160,71,0.12)", borderRadius: 99, padding: "2px 10px" }}>{p.role}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowAbout(false)}
              style={{
                width: "100%", padding: "13px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg,#43a047,#2e7d32)",
                color: "white", fontWeight: 800, fontSize: "1rem",
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 4px 0 #1b5e20, 0 4px 14px rgba(67,160,71,0.3)",
              }}
            >
              סגור
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
