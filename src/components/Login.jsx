import { useState } from "react";
import { auth, googleProvider } from "../firebase/config";
import { signInWithPopup, signInWithRedirect } from "firebase/auth";

export default function Login() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (err) {
      setError(err.code + ": " + err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      minHeight: "100dvh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "30px 20px",
      paddingTop: "calc(30px + env(safe-area-inset-top))",
      paddingBottom: "calc(30px + env(safe-area-inset-bottom))",
    }}>
      <div className="card" style={{
        padding: "40px 24px",
        width: "100%", maxWidth: 400,
        textAlign: "center",
      }}>
        <h1 style={{
          fontSize: "2rem", fontWeight: 900,
          color: "#2e7d32",
          marginBottom: 8, letterSpacing: "-0.5px",
        }}>
          למידת מתמטיקה
        </h1>

        <p style={{ color: "#4a7c59", marginBottom: 36, fontSize: "0.9rem", lineHeight: 1.6 }}>
          תרגל/י מציאת תחום הגדרה של פונקציות בצורה אינטראקטיבית
        </p>

        {/* Feature icons */}
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 36 }}>
          {[["√","שורשים"],["∕","שברים"],["㏒","לוגריתם"]].map(([sym, label]) => (
            <div key={sym} style={{ textAlign: "center" }}>
              <div style={{
                width: 48, height: 48,
                background: "rgba(67,160,71,0.1)",
                border: "1.5px solid rgba(67,160,71,0.3)",
                borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.4rem", color: "#2e7d32", fontWeight: 700,
                margin: "0 auto 6px",
              }}>{sym}</div>
              <span style={{ fontSize: "0.75rem", color: "#4a7c59" }}>{label}</span>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: "#fce8e6", border: "1px solid #EA4335", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: "0.78rem", color: "#c62828", textAlign: "right", wordBreak: "break-word" }}>
            ❌ {error}
          </div>
        )}

        <button onClick={handleLogin} disabled={loading} className="btn-primary" style={{ width: "100%", padding: "14px", opacity: loading ? 0.7 : 1 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          התחבר/י עם Google
        </button>

        <p style={{ marginTop: 20, fontSize: "0.78rem", color: "#4a7c59" }}>
          כניסה מאובטחת · שמירת התקדמות אוטומטית
        </p>
      </div>
    </div>
  );
}
