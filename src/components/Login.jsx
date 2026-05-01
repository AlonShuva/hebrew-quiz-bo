import { auth, googleProvider } from "../firebase/config";
import { signInWithPopup, signInWithRedirect } from "firebase/auth";

export default function Login() {
  const handleLogin = async () => {
    try {
      const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "30px 20px",
      position: "relative",
      fontFamily: "'Segoe UI', Arial, sans-serif",
    }}>

      {/* Starfield */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        {stars.map((s, i) => (
          <div key={i} style={{
            position: "absolute", left: s.x, top: s.y,
            width: s.r, height: s.r, borderRadius: "50%",
            background: "white", opacity: s.o,
            animation: `twinkle ${s.d}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
          }} />
        ))}
      </div>
      <style>{`@keyframes twinkle { 0%,100%{opacity:var(--op,0.6)} 50%{opacity:0.1} }`}</style>

      {/* Card */}
      <div style={{
        background: "rgba(10,14,40,0.92)",
        border: "1.5px solid #2a3a52",
        borderRadius: 16,
        boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
        padding: "48px 40px",
        width: "100%", maxWidth: 400,
        textAlign: "center",
        position: "relative", zIndex: 1,
        backdropFilter: "blur(12px)",
      }}>

        <h1 style={{
          fontSize: "2rem", fontWeight: 800,
          color: "#93c5fd",
          textShadow: "0 0 24px rgba(147,197,253,0.3)",
          marginBottom: 8, letterSpacing: "-0.5px",
        }}>
          למידת מתמטיקה
        </h1>

        <p style={{ color: "#475569", marginBottom: 36, fontSize: "0.9rem", lineHeight: 1.6 }}>
          תרגל/י מציאת תחום הגדרה של פונקציות בצורה אינטראקטיבית
        </p>

        {/* Feature icons */}
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 36 }}>
          {[["√","שורשים"],["∕","שברים"],["㏒","לוגריתם"]].map(([sym, label]) => (
            <div key={sym} style={{ textAlign: "center" }}>
              <div style={{
                width: 48, height: 48,
                background: "rgba(255,255,255,0.04)",
                border: "1.5px solid #2a3a52",
                borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.4rem", color: "#93c5fd", fontWeight: 700,
                margin: "0 auto 6px",
              }}>{sym}</div>
              <span style={{ fontSize: "0.75rem", color: "#475569" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Google login button */}
        <button
          onClick={handleLogin}
          style={{
            width: "100%", padding: "14px",
            background: "linear-gradient(160deg, #1a2035, #111827)",
            border: "1.5px solid #2a3a52",
            borderRadius: 10, cursor: "pointer",
            color: "#cbd5e1", fontSize: "1rem", fontWeight: 800,
            fontFamily: "inherit",
            boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            transition: "all 0.2s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "linear-gradient(160deg, #1e2a42, #151e2e)";
            e.currentTarget.style.borderColor = "#3d5275";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.5)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "linear-gradient(160deg, #1a2035, #111827)";
            e.currentTarget.style.borderColor = "#2a3a52";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.4)";
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          התחבר/י עם Google
        </button>

        <p style={{ marginTop: 20, fontSize: "0.78rem", color: "#334155" }}>
          כניסה מאובטחת · שמירת התקדמות אוטומטית
        </p>
      </div>
    </div>
  );
}

const stars = Array.from({ length: 60 }, (_, i) => ({
  x: `${(i * 37.3 + 11) % 100}%`,
  y: `${(i * 53.7 + 7)  % 100}%`,
  r: i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
  o: 0.3 + (i % 7) * 0.1,
  d: 2 + (i % 4),
  delay: (i % 6) * 0.5,
}));
