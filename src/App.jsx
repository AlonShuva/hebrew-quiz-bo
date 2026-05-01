import { useState, useEffect } from "react";
import { auth, db } from "./firebase/config";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { doc, getDoc, getDocs, setDoc, collection } from "firebase/firestore";

const DEFAULT_LEVELS = [
  { id: 1, name: "פונקציות רציונליות" },
  { id: 2, name: "תחום הגדרה עם שורשים" },
  { id: 3, name: "תחום הגדרה עם לוגריתמים" },
  { id: 4, name: "תחום הגדרה – תרגול מתקדם" },
];

async function seedLevelsIfEmpty() {
  const snap = await getDocs(collection(db, "levels"));
  if (snap.empty) {
    await Promise.all(DEFAULT_LEVELS.map(l => setDoc(doc(db, "levels", String(l.id)), l)));
  }
}
import Login from "./components/Login";
import MainMenu from "./components/MainMenu";
import SinglePlayer from "./components/SinglePlayer";
import AdminPanel from "./components/AdminPanel";
import Leaderboard from "./components/Leaderboard";
import Multiplayer from "./components/Multiplayer";
import Achievements from "./components/Achievements";
import AdminGuard from "./components/AdminGuard";
import LevelSelect from "./components/LevelSelect";
import CurriculumMap from "./components/CurriculumMap";
import CurriculumGame from "./components/CurriculumGame";
import DailyChallenge from "./components/DailyChallenge";

export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState("menu");
  const [userStats, setUserStats] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [curriculumLevel, setCurriculumLevel] = useState(1);
  const [totalLevels,     setTotalLevels]     = useState(30);

  useEffect(() => {
    seedLevelsIfEmpty();
    getRedirectResult(auth).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists()) setUserStats(snap.data());
      }
    });
    return () => unsubscribe();
  }, []);

  if (!user) return <Login />;

  if (screen === "curriculumMap") return (
    <CurriculumMap
      user={user}
      onSelectLevel={(lvl) => { setCurriculumLevel(lvl); setScreen("curriculumGame"); }}
      onDailyChallenge={() => setScreen("daily")}
      onBack={() => setScreen("menu")}
      onTotalLevels={setTotalLevels}
    />
  );

  if (screen === "curriculumGame") return (
    <CurriculumGame
      user={user}
      levelId={curriculumLevel}
      totalLevels={totalLevels}
      onBack={() => setScreen("curriculumMap")}
      onComplete={(next) => {
        if (next === "phaseB") setScreen("daily");
        else { setCurriculumLevel(next); setScreen("curriculumMap"); }
      }}
    />
  );

  if (screen === "daily") return (
    <DailyChallenge user={user} onBack={() => setScreen("curriculumMap")} />
  );


  if (screen === "admin") return (
    <AdminGuard user={user} onBack={() => setScreen("menu")}>
      <AdminPanel onBack={() => setScreen("menu")} />
    </AdminGuard>
  );

  if (screen === "leaderboard") return (
    <Leaderboard onBack={() => setScreen("menu")} />
  );

  if (screen === "multi") return (
    <Multiplayer user={user} onBack={() => setScreen("menu")} />
  );

  if (screen === "achievements") return (
    <Achievements user={user} userStats={userStats} onBack={() => setScreen("menu")} />
  );

  return <MainMenu user={user} onNavigate={(s) => {
    if (s === "single") setScreen("levelSelect");
    else setScreen(s);
  }} />;
}