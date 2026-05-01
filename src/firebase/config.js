import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBM6GNwXdsehT_PEIlAuM-OGlgAERir5m0",
  authDomain: "hebrew-quiz-bot.firebaseapp.com",
  projectId: "hebrew-quiz-bot",
  storageBucket: "hebrew-quiz-bot.firebasestorage.app",
  messagingSenderId: "1008178516669",
  appId: "1:1008178516669:web:a3bdb9cd342e7aa8d65dd4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const SUPER_ADMIN_EMAIL = "alon.shuva1@gmail.com"; // שנה לאימייל שלך