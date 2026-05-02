import { useState, useEffect } from "react";
import { db, SUPER_ADMIN_EMAIL } from "../firebase/config";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";

export default function AdminGuard({ user, onBack, children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [showAdminManager, setShowAdminManager] = useState(false);

  const isSuperAdmin = user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    if (isSuperAdmin) {
      await setDoc(doc(db, "admins", user.email.toLowerCase()), {
        email: user.email,
        displayName: user.displayName || "",
        role: "superAdmin",
      }, { merge: true });
      setIsAdmin(true);
      setLoading(false);
      return;
    }
    const snap = await getDoc(doc(db, "admins", user.email.toLowerCase()));
    setIsAdmin(snap.exists());
    setLoading(false);
  };

  const fetchAdmins = async () => {
    const snap = await getDocs(collection(db, "admins"));
    setAdmins(snap.docs.map(d => d.id));
  };

  const addAdmin = async () => {
    if (!newAdminEmail) return;
    await setDoc(doc(db, "admins", newAdminEmail.toLowerCase()), {
      addedBy: user.email,
      addedAt: new Date()
    });
    setNewAdminEmail("");
    fetchAdmins();
  };

  const removeAdmin = async (email) => {
    if (!window.confirm(`להסיר את ${email}?`)) return;
    await deleteDoc(doc(db, "admins", email));
    fetchAdmins();
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <p>בודק הרשאות...</p>
    </div>
  );

  if (!isAdmin) return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100vh", fontFamily: "Arial"
    }}>
      <p style={{ fontSize: "3rem" }}>🔒</p>
      <h2>אין הרשאה</h2>
      <p style={{ color: "#666", marginBottom: "20px" }}>רק מנהלים מורשים יכולים לגשת לכאן</p>
      <button onClick={onBack} style={{
        padding: "10px 20px", borderRadius: "8px", border: "1px solid #ddd",
        background: "white", cursor: "pointer"
      }}>← חזור</button>
    </div>
  );

  return (
    <div>
      {isSuperAdmin && (
        <div style={{ background: "#E3F2FD", padding: "8px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", color: "#1565C0" }}>👑 Super Admin</span>
          <button onClick={() => { setShowAdminManager(!showAdminManager); fetchAdmins(); }} style={{
            fontSize: "0.8rem", padding: "4px 12px", borderRadius: "6px",
            border: "1px solid #1565C0", background: "white", cursor: "pointer", color: "#1565C0"
          }}>
            {showAdminManager ? "סגור" : "⚙️ נהל מנהלים"}
          </button>
        </div>
      )}

      {showAdminManager && (
        <div style={{ background: "#F8F9FA", padding: "16px 20px", borderBottom: "1px solid #e0e0e0" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "1rem" }}>מנהלים מורשים</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
            <div style={{ padding: "8px 12px", background: "#E8F5E9", borderRadius: "8px", display: "flex", justifyContent: "space-between" }}>
              <span>{SUPER_ADMIN_EMAIL}</span>
              <span style={{ color: "#34A853", fontSize: "0.8rem" }}>👑 Super Admin</span>
            </div>
            {admins.map(email => (
              <div key={email} style={{ padding: "8px 12px", background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{email}</span>
                <button onClick={() => removeAdmin(email)} style={{
                  padding: "4px 10px", borderRadius: "6px", border: "none",
                  background: "#EA4335", color: "white", cursor: "pointer", fontSize: "0.8rem"
                }}>הסר</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="email"
              value={newAdminEmail}
              onChange={e => setNewAdminEmail(e.target.value)}
              placeholder="אימייל של מנהל חדש"
              style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "0.9rem" }}
            />
            <button onClick={addAdmin} style={{
              padding: "8px 16px", borderRadius: "8px", border: "none",
              background: "#4285F4", color: "white", cursor: "pointer"
            }}>➕ הוסף</button>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}