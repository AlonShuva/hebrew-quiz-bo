import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, getDocs, deleteDoc, updateDoc, doc, where, writeBatch, query, setDoc, addDoc } from "firebase/firestore";
import { curriculum } from "../../lib/curriculum.js";
import MathText from "./MathText";
import StatsDashboard from "./StatsDashboard";

const EMPTY_FORM = { text: "", options: ["","","",""], correctIndex: 0, hint: "" };

export default function AdminPanel({ onBack }) {
  const [section, setSection] = useState(null); // null = home | "curriculum" | "trash"
  const [currTab, setCurrTab] = useState(null);
  const [currQuestions, setCurrQuestions] = useState({});
  const [currLoading, setCurrLoading] = useState(false);
  const [seedingLevel, setSeedingLevel] = useState(null);
  const [customLevels, setCustomLevels] = useState([]);

  // Question modal: mode = null | "edit" | "add"
  const [modalMode, setModalMode] = useState(null);
  const [editingCurrQ, setEditingCurrQ] = useState(null);
  const [currQForm, setCurrQForm] = useState(EMPTY_FORM);

  // Inline hint editing
  const [editingHintId, setEditingHintId] = useState(null);
  const [editingHintValue, setEditingHintValue] = useState("");

  // Level name editing
  const [levelNames, setLevelNames] = useState({});
  const [editingLevelId, setEditingLevelId] = useState(null);
  const [editingLevelName, setEditingLevelName] = useState("");

  // Level points
  const [levelPoints, setLevelPoints] = useState({});
  const [editingPoints, setEditingPoints] = useState(false);
  const [editingPointsValue, setEditingPointsValue] = useState(0);

  const getDefaultPoints = (id) => Math.round((50 + id * 10) / 5) * 5;
  const getLevelPoints = (id) => levelPoints[id] ?? getDefaultPoints(id);

  // AI generation modal
  const [aiModal, setAiModal] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Level delete confirm
  const [confirmDeleteLevel, setConfirmDeleteLevel] = useState(null); // level id | null

  // Multi-select delete (questions)
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(null); // null | { ids: Set, single: bool }

  // Multi-select delete (levels)
  const [deletedLevelIds, setDeletedLevelIds] = useState(new Set());
  const [levelSelectMode, setLevelSelectMode] = useState(false);
  const [selectedLevelIds, setSelectedLevelIds] = useState(new Set());
  const [confirmDeleteLevels, setConfirmDeleteLevels] = useState(false);

  // Trash
  const [trashedQuestions, setTrashedQuestions] = useState({});
  const [trashLoading, setTrashLoading] = useState(false);

  const allLevels = [...curriculum, ...customLevels]
    .filter(l => !deletedLevelIds.has(l.id))
    .sort((a, b) => a.id - b.id);

  useEffect(() => {
    fetchAllCurriculumCounts();
    fetchLevelNames();
  }, []);

  const fetchLevelNames = async () => {
    const snap = await getDocs(collection(db, "curriculumLevels"));
    const names = {};
    const custom = [];
    const pts = {};
    snap.docs.forEach(d => {
      const data = d.data();
      names[data.id] = data.title;
      if (data.points != null) pts[data.id] = data.points;
      if (data.isCustom) custom.push({ id: data.id, title: data.title });
    });
    setLevelNames(names);
    setLevelPoints(pts);
    setCustomLevels(custom);
  };

  const savePoints = async (levelId, pts) => {
    await setDoc(doc(db, "curriculumLevels", String(levelId)), { id: levelId, points: pts }, { merge: true });
    setLevelPoints(prev => ({ ...prev, [levelId]: pts }));
    setEditingPoints(false);
  };

  const getLevelTitle = (id) => levelNames[id] || curriculum.find(l => l.id === id)?.title || `רמה ${id}`;

  const saveLevelName = async (id) => {
    if (!editingLevelName.trim()) return;
    const existing = await getDocs(query(collection(db, "curriculumLevels"), where("id", "==", id)));
    const isCustom = existing.docs.some(d => d.data().isCustom);
    await setDoc(doc(db, "curriculumLevels", String(id)), { id, title: editingLevelName.trim(), ...(isCustom ? { isCustom: true } : {}) });
    setLevelNames(prev => ({ ...prev, [id]: editingLevelName.trim() }));
    setEditingLevelId(null);
  };

  const addLevel = async () => {
    const maxId = Math.max(...allLevels.map(l => l.id), 0);
    const newId = maxId + 1;
    const title = `רמה ${newId}`;
    await setDoc(doc(db, "curriculumLevels", String(newId)), { id: newId, title, isCustom: true });
    setLevelNames(prev => ({ ...prev, [newId]: title }));
    setCustomLevels(prev => [...prev, { id: newId, title }]);
  };

  const fetchCurriculumLevel = async (levelId) => {
    const q = query(collection(db, "curriculumQuestions"), where("levelId", "==", levelId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
      const aDate = a.createdAt || '';
      const bDate = b.createdAt || '';
      return bDate.localeCompare(aDate);
    });
  };

  const fetchAllCurriculumCounts = async () => {
    setCurrLoading(true);
    const snap = await getDocs(collection(db, "curriculumQuestions"));
    const grouped = {};
    snap.docs.forEach(d => {
      const { levelId } = d.data();
      if (!grouped[levelId]) grouped[levelId] = [];
      grouped[levelId].push({ id: d.id, ...d.data() });
    });
    setCurrQuestions(grouped);
    setCurrLoading(false);
  };

  const openCurrLevel = async (levelId) => {
    setCurrTab(levelId);
    // Persist level to curriculumLevels if it hasn't been saved yet
    if (!levelNames[levelId]) {
      const staticLevel = curriculum.find(l => l.id === levelId);
      const title = staticLevel?.title || `רמה ${levelId}`;
      await setDoc(doc(db, "curriculumLevels", String(levelId)), {
        id: levelId,
        title,
        points: getDefaultPoints(levelId),
        firstOpenedAt: new Date().toISOString(),
      });
      setLevelNames(prev => ({ ...prev, [levelId]: title }));
      setLevelPoints(prev => ({ ...prev, [levelId]: getDefaultPoints(levelId) }));
    }
    if (!currQuestions[levelId]) {
      const qs = await fetchCurriculumLevel(levelId);
      setCurrQuestions(prev => ({ ...prev, [levelId]: qs }));
    }
  };

  const seedLevel = async (levelId) => {
    setSeedingLevel(levelId);
    try {
      const res = await fetch("/api/generate-level-questions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ levelId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const existing = await fetchCurriculumLevel(levelId);
      const batch = writeBatch(db);
      existing.forEach(q => batch.delete(doc(db, "curriculumQuestions", q.id)));
      data.questions.forEach((q, i) => {
        const ref = doc(collection(db, "curriculumQuestions"));
        const correct = q.options[q.correctIndex];
        const shuffled = [...q.options].sort(() => Math.random() - 0.5);
        batch.set(ref, { ...q, options: shuffled, correctIndex: shuffled.indexOf(correct), levelId, questionIndex: i, createdAt: new Date().toISOString() });
      });
      await batch.commit();

      const fresh = await fetchCurriculumLevel(levelId);
      setCurrQuestions(prev => ({ ...prev, [levelId]: fresh }));
    } catch (e) { alert("שגיאה: " + e.message); }
    setSeedingLevel(null);
  };

  const generateWithAI = async () => {
    setAiGenerating(true);
    try {
      const res = await fetch("/api/generate-level-questions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ levelId: currTab, description: aiDescription, count: aiCount })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const existing = await fetchCurriculumLevel(currTab);
      const batch = writeBatch(db);
      existing.forEach((q, i) => {
        batch.update(doc(db, "curriculumQuestions", q.id), { questionIndex: data.questions.length + i });
      });
      data.questions.forEach((q, i) => {
        const ref = doc(collection(db, "curriculumQuestions"));
        const correct = q.options[q.correctIndex];
        const shuffled = [...q.options].sort(() => Math.random() - 0.5);
        batch.set(ref, { ...q, options: shuffled, correctIndex: shuffled.indexOf(correct), levelId: currTab, questionIndex: i, createdAt: new Date().toISOString() });
      });
      await batch.commit();

      const fresh = await fetchCurriculumLevel(currTab);
      setCurrQuestions(prev => ({ ...prev, [currTab]: fresh }));
      setAiModal(false);
      setAiDescription("");
      setAiCount(5);
    } catch (e) { alert("שגיאה: " + e.message); }
    setAiGenerating(false);
  };

  const openEditModal = (q) => {
    setEditingCurrQ(q);
    setCurrQForm({ text: q.text, options: [...q.options], correctIndex: q.correctIndex, hint: q.hint || "" });
    setModalMode("edit");
  };

  const openAddModal = () => {
    setEditingCurrQ(null);
    setCurrQForm(EMPTY_FORM);
    setModalMode("add");
  };

  const closeModal = () => { setModalMode(null); setEditingCurrQ(null); setCurrQForm(EMPTY_FORM); };

  const saveModal = async () => {
    if (!currQForm.text.trim() || currQForm.options.some(o => !o.trim())) {
      alert("מלא את כל השדות"); return;
    }
    try {
      if (modalMode === "edit") {
        await updateDoc(doc(db, "curriculumQuestions", editingCurrQ.id), {
          text: currQForm.text, options: currQForm.options, correctIndex: currQForm.correctIndex, hint: currQForm.hint || ""
        });
      } else {
        const existing = currQuestions[currTab] || [];
        await addDoc(collection(db, "curriculumQuestions"), {
          text: currQForm.text, options: currQForm.options, correctIndex: currQForm.correctIndex,
          hint: currQForm.hint || "",
          levelId: currTab, questionIndex: existing.length, createdAt: new Date().toISOString()
        });
      }
      const fresh = await fetchCurriculumLevel(currTab);
      setCurrQuestions(prev => ({ ...prev, [currTab]: fresh }));
      closeModal();
    } catch (e) {
      alert("שגיאה בשמירת השאלה: " + e.message);
      console.error("saveModal error:", e);
    }
  };

  const deleteCurrQ = (q) => {
    setConfirmDelete({ single: true, q });
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setConfirmDelete({ ids: new Set(selectedIds), single: false });
  };

  const fetchTrashedQuestions = async () => {
    setTrashLoading(true);
    const snap = await getDocs(collection(db, "trashedQuestions"));
    const grouped = {};
    snap.docs.forEach(d => {
      const data = { id: d.id, ...d.data() };
      if (!grouped[data.levelId]) grouped[data.levelId] = [];
      grouped[data.levelId].push(data);
    });
    setTrashedQuestions(grouped);
    setTrashLoading(false);
  };

  const moveToTrash = async (questions) => {
    const batch = writeBatch(db);
    questions.forEach(q => {
      batch.set(doc(db, "trashedQuestions", q.id), { ...q, deletedAt: new Date().toISOString() });
      batch.delete(doc(db, "curriculumQuestions", q.id));
    });
    await batch.commit();
  };

  const confirmDeleteAction = async () => {
    const { ids, single, q } = confirmDelete;
    setConfirmDelete(null);
    if (single) {
      await moveToTrash([q]);
      const fresh = await fetchCurriculumLevel(q.levelId);
      setCurrQuestions(prev => ({ ...prev, [q.levelId]: fresh }));
    } else {
      const allQs = currQuestions[currTab] || [];
      const toTrash = allQs.filter(q => ids.has(q.id));
      await moveToTrash(toTrash);
      const fresh = await fetchCurriculumLevel(currTab);
      setCurrQuestions(prev => ({ ...prev, [currTab]: fresh }));
      setSelectedIds(new Set());
      setSelectMode(false);
    }
    setTrashedQuestions({});
  };

  const restoreQuestion = async (q) => {
    await setDoc(doc(db, "curriculumQuestions", q.id), {
      text: q.text, options: q.options, correctIndex: q.correctIndex,
      levelId: q.levelId, questionIndex: q.questionIndex, createdAt: q.createdAt
    });
    await deleteDoc(doc(db, "trashedQuestions", q.id));
    const fresh = await fetchCurriculumLevel(q.levelId);
    setCurrQuestions(prev => ({ ...prev, [q.levelId]: fresh }));
    await fetchTrashedQuestions();
  };

  const permanentlyDelete = async (q) => {
    await deleteDoc(doc(db, "trashedQuestions", q.id));
    await fetchTrashedQuestions();
  };

  const deleteLevel = async (levelId) => {
    const batch = writeBatch(db);
    const qSnap = await getDocs(query(collection(db, "curriculumQuestions"), where("levelId", "==", levelId)));
    qSnap.docs.forEach(d => batch.delete(doc(db, "curriculumQuestions", d.id)));
    const isCustom = customLevels.some(l => l.id === levelId);
    if (isCustom) {
      batch.delete(doc(db, "curriculumLevels", String(levelId)));
    } else {
      batch.set(doc(db, "curriculumLevels", String(levelId)), { id: levelId, deleted: true }, { merge: true });
    }
    await batch.commit();
    setCustomLevels(prev => prev.filter(l => l.id !== levelId));
    setDeletedLevelIds(prev => new Set([...prev, levelId]));
    setLevelNames(prev => { const n = { ...prev }; delete n[levelId]; return n; });
    setCurrQuestions(prev => { const q = { ...prev }; delete q[levelId]; return q; });
    setConfirmDeleteLevel(null);
  };

  const deleteSelectedLevels = async () => {
    const ids = [...selectedLevelIds];
    const batch = writeBatch(db);
    for (const levelId of ids) {
      const qSnap = await getDocs(query(collection(db, "curriculumQuestions"), where("levelId", "==", levelId)));
      qSnap.docs.forEach(d => batch.delete(doc(db, "curriculumQuestions", d.id)));
      const isCustom = customLevels.some(l => l.id === levelId);
      if (isCustom) {
        batch.delete(doc(db, "curriculumLevels", String(levelId)));
      } else {
        batch.set(doc(db, "curriculumLevels", String(levelId)), { id: levelId, deleted: true }, { merge: true });
      }
    }
    await batch.commit();
    setCustomLevels(prev => prev.filter(l => !selectedLevelIds.has(l.id)));
    setDeletedLevelIds(prev => new Set([...prev, ...ids]));
    setLevelNames(prev => { const n = { ...prev }; ids.forEach(id => delete n[id]); return n; });
    setCurrQuestions(prev => { const q = { ...prev }; ids.forEach(id => delete q[id]); return q; });
    setSelectedLevelIds(new Set());
    setLevelSelectMode(false);
    setConfirmDeleteLevels(false);
  };

  const saveHint = async (q, newHint) => {
    await updateDoc(doc(db, "curriculumQuestions", q.id), { hint: newHint.trim() });
    setCurrQuestions(prev => ({
      ...prev,
      [q.levelId]: prev[q.levelId].map(item => item.id === q.id ? { ...item, hint: newHint.trim() } : item)
    }));
    setEditingHintId(null);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); };

  return (
    <div style={{ padding: "20px", maxWidth: "700px", margin: "0 auto", fontFamily: "Arial", minHeight: "100vh", background: "#f7f8fc", color: "#111" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <button onClick={
          currTab !== null ? () => { setCurrTab(null); exitSelectMode(); }
          : section !== null ? () => setSection(null)
          : onBack
        } style={backBtn}>← חזור</button>

        {currTab !== null ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {editingLevelId === currTab ? (
              <>
                <span style={{ fontWeight: "bold", fontSize: "1.2rem" }}>רמה {currTab}:</span>
                <input
                  value={editingLevelName}
                  onChange={e => setEditingLevelName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveLevelName(currTab); if (e.key === "Escape") setEditingLevelId(null); }}
                  autoFocus
                  style={{ ...inputStyle, margin: 0, padding: "5px 8px", fontSize: "1rem", width: "160px" }}
                />
                <button onClick={() => saveLevelName(currTab)} style={smallBtn("#34A853")}>✓</button>
                <button onClick={() => setEditingLevelId(null)} style={smallBtn("#999")}>✕</button>
              </>
            ) : (
              <>
                <h2 style={{ margin: 0 }}>רמה {currTab}: <MathText text={getLevelTitle(currTab)} /></h2>
                <button
                  onClick={() => { setEditingLevelId(currTab); setEditingLevelName(getLevelTitle(currTab)); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "1rem", padding: "2px 4px" }}
                  title="ערוך שם רמה"
                >✏️</button>
              </>
            )}
          </div>
        ) : (
          <h2 style={{ margin: 0 }}>
            {section === "curriculum" ? "📚 תוכנית לימוד" : section === "trash" ? "🗑️ שאלות שנמחקו" : section === "stats" ? "📊 סטטיסטיקה" : "⚙️ ניהול מערכת"}
          </h2>
        )}

        <div style={{ width: 80 }} />
      </div>

      {/* Question modal (edit or add) */}
      {modalMode && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 16px" }}>
              {modalMode === "add" ? `➕ שאלה חדשה — רמה ${currTab}` : `✏️ עריכת שאלה — רמה ${currTab}`}
            </h3>

            <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold" }}>שאלה</label>
            <textarea
              value={currQForm.text}
              onChange={e => setCurrQForm(f => ({ ...f, text: e.target.value }))}
              placeholder="מצא את תחום ההגדרה של $f(x) = ...$"
              rows={3}
              style={{ ...inputStyle, marginBottom: "16px", resize: "vertical" }}
            />

            <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>תשובות (סמן את הנכונה)</label>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <input
                  type="radio"
                  checked={currQForm.correctIndex === i}
                  onChange={() => setCurrQForm(f => ({ ...f, correctIndex: i }))}
                  style={{ flexShrink: 0, width: 18, height: 18, cursor: "pointer" }}
                />
                <input
                  value={currQForm.options[i]}
                  onChange={e => setCurrQForm(f => ({ ...f, options: f.options.map((o,j) => j===i ? e.target.value : o) }))}
                  placeholder={`תשובה ${String.fromCharCode(65+i)}${i === currQForm.correctIndex ? " ✓ נכונה" : ""}`}
                  style={{ ...inputStyle, border: i === currQForm.correctIndex ? "2px solid #34A853" : "1px solid #ddd" }}
                />
              </div>
            ))}

            <label style={{ display: "block", marginTop: "4px", marginBottom: "6px", fontWeight: "bold" }}>💡 רמז לתלמיד (חובה)</label>
            <textarea
              value={currQForm.hint}
              onChange={e => setCurrQForm(f => ({ ...f, hint: e.target.value }))}
              placeholder="רמז קצר ונכון מתמטית שמכוון לדרך הפתרון..."
              rows={2}
              style={{ ...inputStyle, marginBottom: "16px", resize: "vertical", borderColor: currQForm.hint.trim() ? "#34A853" : "#FFA000" }}
            />

            {currQForm.text && (
              <div style={{ background: "#f8f8f8", borderRadius: "8px", padding: "10px", marginBottom: "16px", fontSize: "0.9rem" }}>
                <span style={{ color: "#888", fontSize: "0.75rem" }}>תצוגה מקדימה: </span>
                <MathText text={currQForm.text} />
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={saveModal} style={{ flex: 1, padding: "11px", background: "#34A853", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
                {modalMode === "add" ? "➕ הוסף שאלה" : "💾 שמור"}
              </button>
              <button onClick={closeModal} style={{ flex: 1, padding: "11px", background: "#f0f0f0", border: "none", borderRadius: "8px", cursor: "pointer" }}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* AI generation modal */}
      {aiModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "440px" }}>
            <h3 style={{ margin: "0 0 20px", textAlign: "right" }}>🤖 ייצר שאלות עם AI</h3>

            <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", textAlign: "right" }}>סוג שאלות</label>
            <textarea
              value={aiDescription}
              onChange={e => setAiDescription(e.target.value)}
              placeholder="תאר את סוג השאלות שברצונך לייצר..."
              rows={3}
              style={{ ...inputStyle, marginBottom: "16px", resize: "vertical", direction: "rtl" }}
            />

            <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", textAlign: "right" }}>כמות שאלות</label>
            <input
              type="number"
              value={aiCount}
              onChange={e => setAiCount(Math.max(1, Math.min(20, Number(e.target.value))))}
              min={1}
              max={20}
              style={{ ...inputStyle, marginBottom: "20px", width: "120px" }}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={generateWithAI} disabled={aiGenerating}
                style={{ flex: 1, padding: "11px", background: aiGenerating ? "#ccc" : "#9C27B0", color: "white", border: "none", borderRadius: "8px", cursor: aiGenerating ? "default" : "pointer", fontWeight: "bold" }}>
                {aiGenerating ? "⏳ מייצר..." : "🤖 ייצר שאלות"}
              </button>
              <button
                onClick={() => { setAiModal(false); setAiDescription(""); setAiCount(5); }}
                disabled={aiGenerating}
                style={{ flex: 1, padding: "11px", background: "#f0f0f0", border: "none", borderRadius: "8px", cursor: aiGenerating ? "default" : "pointer" }}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "28px 24px", width: "100%", maxWidth: "360px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: "2.2rem", marginBottom: "12px" }}>🗑️</div>
            <h3 style={{ margin: "0 0 10px", fontSize: "1.1rem" }}>
              {confirmDelete.single ? "למחוק שאלה זו?" : `למחוק ${confirmDelete.ids.size} שאלות?`}
            </h3>
            <p style={{ margin: "0 0 22px", color: "#888", fontSize: "0.9rem" }}>פעולה זו אינה ניתנת לביטול</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={confirmDeleteAction}
                style={{ flex: 1, padding: "11px", background: "#EA4335", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
                מחק
              </button>
              <button onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: "11px", background: "#f0f0f0", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete multiple levels modal */}
      {confirmDeleteLevels && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "28px 24px", width: "100%", maxWidth: "360px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: "2.2rem", marginBottom: "12px" }}>🗑️</div>
            <h3 style={{ margin: "0 0 10px", fontSize: "1.1rem", color: "#111" }}>למחוק {selectedLevelIds.size} רמות?</h3>
            <p style={{ margin: "0 0 22px", color: "#888", fontSize: "0.9rem" }}>כל השאלות של הרמות הנבחרות יימחקו לצמיתות</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={deleteSelectedLevels}
                style={{ flex: 1, padding: "11px", background: "#EA4335", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
                מחק
              </button>
              <button onClick={() => setConfirmDeleteLevels(false)}
                style={{ flex: 1, padding: "11px", background: "#f0f0f0", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete level modal */}
      {confirmDeleteLevel !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "28px 24px", width: "100%", maxWidth: "360px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: "2.2rem", marginBottom: "12px" }}>🗑️</div>
            <h3 style={{ margin: "0 0 10px", fontSize: "1.1rem", color: "#111" }}>למחוק את רמה {confirmDeleteLevel}?</h3>
            <p style={{ margin: "0 0 22px", color: "#888", fontSize: "0.9rem" }}>כל השאלות של הרמה יימחקו לצמיתות</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => deleteLevel(confirmDeleteLevel)}
                style={{ flex: 1, padding: "11px", background: "#EA4335", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
                מחק
              </button>
              <button onClick={() => setConfirmDeleteLevel(null)}
                style={{ flex: 1, padding: "11px", background: "#f0f0f0", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Home screen */}
      {section === null && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginTop: "16px" }}>
          <button onClick={() => setSection("curriculum")}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", width: "140px", height: "140px", background: "white", border: "2px solid #e0e0e0", borderRadius: "20px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", transition: "box-shadow 0.15s, border-color 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(66,133,244,0.18)"; e.currentTarget.style.borderColor = "#4285F4"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"; e.currentTarget.style.borderColor = "#e0e0e0"; }}>
            <svg width="64" height="56" viewBox="0 0 64 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="10" width="64" height="46" rx="6" fill="#FFC107"/>
              <rect x="0" y="10" width="64" height="46" rx="6" fill="url(#folderBody)"/>
              <path d="M0 16C0 12.686 2.686 10 6 10H28L34 4H58C61.314 4 64 6.686 64 10V16H0Z" fill="#FFD54F"/>
              <defs>
                <linearGradient id="folderBody" x1="32" y1="10" x2="32" y2="56" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFD54F"/>
                  <stop offset="1" stopColor="#FFA000"/>
                </linearGradient>
              </defs>
            </svg>
            <span style={{ fontWeight: "700", fontSize: "0.95rem", color: "#333" }}>תוכנית לימוד</span>
          </button>

          <button onClick={() => { setSection("trash"); fetchTrashedQuestions(); }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", width: "140px", height: "140px", background: "white", border: "2px solid #e0e0e0", borderRadius: "20px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", transition: "box-shadow 0.15s, border-color 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(234,67,53,0.18)"; e.currentTarget.style.borderColor = "#EA4335"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"; e.currentTarget.style.borderColor = "#e0e0e0"; }}>
            <svg width="56" height="60" viewBox="0 0 56 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="14" width="48" height="42" rx="5" fill="#FFCDD2"/>
              <rect x="4" y="14" width="48" height="42" rx="5" fill="url(#trashBody)"/>
              <rect x="0" y="10" width="56" height="8" rx="4" fill="#EF9A9A"/>
              <rect x="20" y="2" width="16" height="8" rx="3" fill="#EF9A9A"/>
              <line x1="18" y1="26" x2="18" y2="48" stroke="#E57373" strokeWidth="3" strokeLinecap="round"/>
              <line x1="28" y1="26" x2="28" y2="48" stroke="#E57373" strokeWidth="3" strokeLinecap="round"/>
              <line x1="38" y1="26" x2="38" y2="48" stroke="#E57373" strokeWidth="3" strokeLinecap="round"/>
              <defs>
                <linearGradient id="trashBody" x1="28" y1="14" x2="28" y2="56" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFCDD2"/>
                  <stop offset="1" stopColor="#EF9A9A"/>
                </linearGradient>
              </defs>
            </svg>
            <span style={{ fontWeight: "700", fontSize: "0.95rem", color: "#333" }}>שאלות שנמחקו</span>
          </button>

          <button onClick={() => setSection("stats")}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", width: "140px", height: "140px", background: "white", border: "2px solid #e0e0e0", borderRadius: "20px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", transition: "box-shadow 0.15s, border-color 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(67,160,71,0.18)"; e.currentTarget.style.borderColor = "#43a047"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"; e.currentTarget.style.borderColor = "#e0e0e0"; }}>
            <svg width="60" height="56" viewBox="0 0 60 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="36" width="14" height="18" rx="3" fill="url(#bar1g)"/>
              <rect x="23" y="20" width="14" height="34" rx="3" fill="url(#bar2g)"/>
              <rect x="42" y="6" width="14" height="48" rx="3" fill="url(#bar3g)"/>
              <rect x="0" y="53" width="60" height="3" rx="1.5" fill="#e0e0e0"/>
              <defs>
                <linearGradient id="bar1g" x1="11" y1="36" x2="11" y2="54" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#EF9A9A"/><stop offset="1" stopColor="#E53935"/>
                </linearGradient>
                <linearGradient id="bar2g" x1="30" y1="20" x2="30" y2="54" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFE082"/><stop offset="1" stopColor="#FFA000"/>
                </linearGradient>
                <linearGradient id="bar3g" x1="49" y1="6" x2="49" y2="54" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#A5D6A7"/><stop offset="1" stopColor="#388E3C"/>
                </linearGradient>
              </defs>
            </svg>
            <span style={{ fontWeight: "700", fontSize: "0.95rem", color: "#333" }}>סטטיסטיקה</span>
          </button>
        </div>
      )}

      {/* Curriculum section: level detail or level list */}
      {section === "curriculum" && currTab !== null ? (
        <div>
          {/* Points card */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", padding: "12px 16px", background: "#fff", border: "1.5px solid #e0e0e0", borderRadius: "12px" }}>
            <span style={{ fontWeight: 700, color: "#333", fontSize: "0.9rem" }}>⭐ נקודות לסיום רמה:</span>
            {editingPoints ? (
              <>
                <input
                  type="number"
                  value={editingPointsValue}
                  onChange={e => setEditingPointsValue(Number(e.target.value))}
                  min={1}
                  style={{ ...inputStyle, width: "90px", margin: 0, padding: "5px 8px", fontSize: "0.95rem" }}
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") savePoints(currTab, editingPointsValue); if (e.key === "Escape") setEditingPoints(false); }}
                />
                <button onClick={() => savePoints(currTab, editingPointsValue)} style={smallBtn("#34A853")}>✓</button>
                <button onClick={() => setEditingPoints(false)} style={smallBtn("#999")}>✕</button>
              </>
            ) : (
              <>
                <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#4285F4" }}>{getLevelPoints(currTab)}</span>
                <button
                  onClick={() => { setEditingPointsValue(getLevelPoints(currTab)); setEditingPoints(true); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "0.9rem" }}
                >✏️</button>
              </>
            )}
          </div>

          {selectMode ? (
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
              <button onClick={deleteSelected} disabled={selectedIds.size === 0}
                style={{ flex: 1, padding: "11px", background: selectedIds.size === 0 ? "#ccc" : "#EA4335", color: "white", border: "none", borderRadius: "10px", cursor: selectedIds.size === 0 ? "default" : "pointer", fontWeight: "bold" }}>
                🗑️ מחק {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
              </button>
              <button onClick={() => {
                const all = currQuestions[currTab] || [];
                setSelectedIds(selectedIds.size === all.length ? new Set() : new Set(all.map(q => q.id)));
              }}
                style={{ padding: "11px 16px", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
                {selectedIds.size === (currQuestions[currTab] || []).length ? "בטל הכל" : "בחר הכל"}
              </button>
              <button onClick={exitSelectMode}
                style={{ padding: "11px 16px", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "10px", cursor: "pointer" }}>
                ביטול
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
              <button onClick={() => setAiModal(true)} disabled={aiGenerating}
                style={{ flex: 1, padding: "11px", background: "#9C27B0", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
                🤖 ייצר שאלות עם AI
              </button>
              <button onClick={openAddModal}
                style={{ flex: 1, padding: "11px", background: "#34A853", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
                ➕ הוסף שאלה ידנית
              </button>
              <button onClick={() => setSelectMode(true)}
                style={{ padding: "11px 14px", background: "#FF5722", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
                ☑️ בחר
              </button>
            </div>
          )}

          {(currQuestions[currTab] || []).length === 0 ? (
            <p style={{ textAlign: "center", color: "#999", marginTop: "24px" }}>אין שאלות לרמה זו עדיין</p>
          ) : (currQuestions[currTab] || []).map((q, i) => (
            <div key={q.id}
              onClick={selectMode ? () => toggleSelect(q.id) : undefined}
              style={{ border: `2px solid ${selectMode && selectedIds.has(q.id) ? "#EA4335" : "#e0e0e0"}`, borderRadius: "12px", padding: "16px", marginBottom: "12px", background: selectMode && selectedIds.has(q.id) ? "#fff5f5" : "white", cursor: selectMode ? "pointer" : "default", transition: "border-color 0.15s, background 0.15s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {selectMode && (
                    <input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => toggleSelect(q.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#EA4335" }} />
                  )}
                  <span style={{ fontWeight: "700", color: "#4285F4" }}>שאלה {i+1}</span>
                </div>
                {!selectMode && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => openEditModal(q)} style={smallBtn("#4285F4")}>✏️ ערוך</button>
                    <button onClick={() => deleteCurrQ(q)} style={smallBtn("#EA4335")}>🗑️ מחק</button>
                  </div>
                )}
              </div>
              <p style={{ margin: "0 0 10px", fontWeight: "500" }}><MathText text={q.text} /></p>
              {q.options.map((opt, j) => (
                <p key={j} style={{ margin: "3px 0", fontSize: "0.88rem", color: j === q.correctIndex ? "#34A853" : "#555" }}>
                  {j === q.correctIndex ? "✅" : "○"} <MathText text={opt} />
                </p>
              ))}
              {editingHintId === q.id ? (
                <div style={{ marginTop: "8px" }}>
                  <textarea
                    value={editingHintValue}
                    onChange={e => setEditingHintValue(e.target.value)}
                    rows={2}
                    autoFocus
                    style={{ ...inputStyle, fontSize: "0.85rem", marginBottom: "6px", resize: "vertical" }}
                  />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => saveHint(q, editingHintValue)} style={smallBtn("#34A853")}>✓ שמור</button>
                    <button onClick={() => setEditingHintId(null)} style={smallBtn("#999")}>✕ ביטול</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", marginTop: "8px" }}>
                  <div style={{ flex: 1, fontSize: "0.82rem", color: q.hint ? "#E65100" : "#bbb", background: q.hint ? "#FFF9C4" : "#f5f5f5", borderRadius: "6px", padding: "5px 8px" }}>
                    💡 {q.hint ? <MathText text={q.hint} /> : "אין רמז"}
                  </div>
                  {!selectMode && (
                    <button
                      onClick={() => { setEditingHintId(q.id); setEditingHintValue(q.hint || ""); }}
                      style={{ ...smallBtn("#F9A825"), flexShrink: 0 }}
                    >✏️</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : section === "curriculum" ? (
        /* Level list */
        <div>
          {levelSelectMode ? (
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
              <button onClick={() => selectedLevelIds.size > 0 && setConfirmDeleteLevels(true)}
                disabled={selectedLevelIds.size === 0}
                style={{ flex: 1, padding: "11px", background: selectedLevelIds.size === 0 ? "#ccc" : "#EA4335", color: "white", border: "none", borderRadius: "10px", cursor: selectedLevelIds.size === 0 ? "default" : "pointer", fontWeight: "bold" }}>
                🗑️ מחק {selectedLevelIds.size > 0 ? `(${selectedLevelIds.size})` : ""}
              </button>
              <button onClick={() => {
                setSelectedLevelIds(selectedLevelIds.size === allLevels.length ? new Set() : new Set(allLevels.map(l => l.id)));
              }}
                style={{ padding: "11px 16px", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
                {selectedLevelIds.size === allLevels.length ? "בטל הכל" : "בחר הכל"}
              </button>
              <button onClick={() => { setLevelSelectMode(false); setSelectedLevelIds(new Set()); }}
                style={{ padding: "11px 16px", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "10px", cursor: "pointer" }}>
                ביטול
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <p style={{ margin: 0, color: "#666", fontSize: "0.9rem" }}>
                {currLoading ? "טוען..." : `${Object.values(currQuestions).flat().length} שאלות בסה"כ`}
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setLevelSelectMode(true)}
                  style={{ padding: "10px 14px", background: "#FF5722", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}>
                  ☑️ בחר
                </button>
                <button onClick={addLevel}
                  style={{ padding: "10px 16px", background: "#4285F4", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}>
                  ➕ הוסף רמה
                </button>
              </div>
            </div>
          )}

          {allLevels.map(level => {
            const count = (currQuestions[level.id] || []).length;
            const isEditingName = editingLevelId === level.id;
            const isLevelSelected = selectedLevelIds.has(level.id);
            return (
              <div key={level.id}
                onClick={() => {
                  if (levelSelectMode) {
                    setSelectedLevelIds(prev => { const n = new Set(prev); n.has(level.id) ? n.delete(level.id) : n.add(level.id); return n; });
                  } else if (!isEditingName) {
                    openCurrLevel(level.id);
                  }
                }}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", marginBottom: "8px", border: `1px solid ${levelSelectMode && isLevelSelected ? "#EA4335" : "#e0e0e0"}`, borderRadius: "12px", background: levelSelectMode && isLevelSelected ? "#fff5f5" : count > 0 ? "#f0faf0" : "#fff", cursor: isEditingName ? "default" : "pointer", transition: "border-color 0.15s, background 0.15s" }}>

                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  {levelSelectMode && (
                    <input type="checkbox" checked={isLevelSelected}
                      onChange={() => setSelectedLevelIds(prev => { const n = new Set(prev); n.has(level.id) ? n.delete(level.id) : n.add(level.id); return n; })}
                      onClick={e => e.stopPropagation()}
                      style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#EA4335", flexShrink: 0 }} />
                  )}
                  <span style={{ fontWeight: "700", color: "#333", flexShrink: 0 }}>רמה {level.id}:</span>
                  {isEditingName ? (
                    <>
                      <input
                        value={editingLevelName}
                        onChange={e => setEditingLevelName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveLevelName(level.id); if (e.key === "Escape") setEditingLevelId(null); }}
                        autoFocus
                        style={{ ...inputStyle, margin: 0, padding: "5px 8px", fontSize: "0.9rem", flex: 1 }}
                        onClick={e => e.stopPropagation()}
                      />
                      <button onClick={e => { e.stopPropagation(); saveLevelName(level.id); }} style={smallBtn("#34A853")}>✓</button>
                      <button onClick={e => { e.stopPropagation(); setEditingLevelId(null); }} style={smallBtn("#999")}>✕</button>
                    </>
                  ) : (
                    <>
                      <span style={{ color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <MathText text={getLevelTitle(level.id)} />
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); setEditingLevelId(level.id); setEditingLevelName(getLevelTitle(level.id)); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "0.85rem", flexShrink: 0, padding: "2px 4px" }}
                        title="ערוך שם רמה"
                      >✏️</button>
                    </>
                  )}
                </div>

                {!isEditingName && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, marginRight: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ background: count > 0 ? "#34A853" : "#ccc", color: "white", borderRadius: "99px", padding: "3px 10px", fontSize: "0.78rem", fontWeight: "700" }}>
                        {count > 0 ? `${count} שאלות` : "ריק"}
                      </span>
                      {seedingLevel === level.id && <span style={{ fontSize: "0.8rem", color: "#9C27B0" }}>⏳</span>}
                      {!levelSelectMode && <span style={{ color: "#aaa" }}>›</span>}
                    </div>
                    {!levelSelectMode && (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteLevel(level.id); }}
                        style={{ padding: "4px 8px", background: "#EA4335", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: "700" }}
                      >🗑️</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Stats section */}
      {section === "stats" && <StatsDashboard />}

      {/* Trash section */}
      {section === "trash" && (
        <div>
          {trashLoading ? (
            <p style={{ textAlign: "center", color: "#999" }}>טוען...</p>
          ) : Object.keys(trashedQuestions).length === 0 ? (
            <p style={{ textAlign: "center", color: "#999", marginTop: "40px", fontSize: "1rem" }}>הסל ריק</p>
          ) : (
            Object.keys(trashedQuestions).sort((a, b) => Number(a) - Number(b)).map(levelId => (
              <div key={levelId} style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 10px", color: "#555", fontSize: "0.95rem", fontWeight: "700", borderBottom: "1px solid #e0e0e0", paddingBottom: "6px" }}>
                  רמה {levelId}: <MathText text={getLevelTitle(Number(levelId))} />
                </h3>
                {trashedQuestions[levelId].map(q => (
                  <div key={q.id} style={{ border: "1px solid #f5c6cb", borderRadius: "12px", padding: "14px 16px", marginBottom: "10px", background: "#fff9f9" }}>
                    <p style={{ margin: "0 0 8px", fontWeight: "500" }}><MathText text={q.text} /></p>
                    {q.options.map((opt, j) => (
                      <p key={j} style={{ margin: "2px 0", fontSize: "0.85rem", color: j === q.correctIndex ? "#34A853" : "#888" }}>
                        {j === q.correctIndex ? "✅" : "○"} <MathText text={opt} />
                      </p>
                    ))}
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      <button onClick={() => restoreQuestion(q)} style={smallBtn("#4285F4")}>↩️ שחזר</button>
                      <button onClick={() => permanentlyDelete(q)} style={smallBtn("#EA4335")}>🗑️ מחק לצמיתות</button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle = { padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "1rem", width: "100%", boxSizing: "border-box" };
const backBtn = { padding: "10px 20px", borderRadius: "8px", border: "1px solid #ddd", background: "white", cursor: "pointer" };
const smallBtn = (color) => ({ padding: "6px 10px", borderRadius: "6px", border: "none", background: color, color: "white", cursor: "pointer", fontSize: "0.82rem" });
