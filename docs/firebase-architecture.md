# Firebase Architecture

**Project:** hebrew-quiz-bot  
**Services used:** Authentication, Firestore, Hosting

---

## 1. Services Overview

| Service | Purpose |
|---|---|
| **Firebase Authentication** | Google Sign-In, session management |
| **Cloud Firestore** | Real-time database for progress, rooms, leaderboard |
| **Firebase Hosting** | Static web hosting for production build |

---

## 2. Authentication

### Provider
- **Google OAuth 2.0** via Firebase Authentication
- Popup-based sign-in (`signInWithPopup`)
- Persistent session (`browserLocalPersistence` — default)

### Auth State Management
```js
// src/App.jsx
onAuthStateChanged(auth, (firebaseUser) => {
  if (firebaseUser) {
    setUser(firebaseUser);
    setScreen("menu");
  } else {
    setUser(null);
    setScreen("login");
  }
});
```

### User Object (from Firebase)
| Field | Source | Used For |
|---|---|---|
| `uid` | Firebase Auth | Document ID in Firestore |
| `displayName` | Google profile | Leaderboard display |
| `email` | Google profile | Admin check |
| `photoURL` | Google profile | Avatar in UI |

### Admin Detection
```js
const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;
```
Admin email is stored in `.env`, never hardcoded.

---

## 3. Firestore Structure

```
firestore/
├── users/
│   └── {uid}/                   # User profile
├── userProgress/
│   └── {uid}/                   # Private: levels, points, streaks
├── leaderboard/
│   └── {uid}/                   # Public: name, photo, points
├── rooms/
│   └── {roomId}/                # Multiplayer room state
└── questionStats/
    └── {questionId}/            # Per-question answer analytics
```

> See [Firestore Collections](./firestore-collections.md) for full schema.

---

## 4. Real-Time Listeners

The app uses Firestore `onSnapshot` listeners for live data:

| Listener | Location | Purpose |
|---|---|---|
| `onAuthStateChanged` | `App.jsx` | Auth state |
| `onSnapshot(/leaderboard)` | `Leaderboard.jsx` | Live rankings |
| `onSnapshot(/rooms/{id})` | `Multiplayer.jsx` | Room state sync |

All listeners are **unsubscribed on component unmount** via the returned cleanup function:
```js
useEffect(() => {
  const unsub = onSnapshot(q, handler);
  return () => unsub();
}, []);
```

---

## 5. Write Patterns

### 5.1 Merge Writes (safe updates)
```js
await setDoc(doc(db, "leaderboard", user.uid), {
  displayName: user.displayName,
  totalPoints: newTotal,
}, { merge: true });
```
`merge: true` prevents overwriting fields not included in the update.

### 5.2 Atomic Increment (future improvement)
```js
// Prevents race conditions in concurrent writes
import { increment } from "firebase/firestore";
await updateDoc(ref, { totalPoints: increment(50) });
```

---

## 6. Security Rules

**File:** `firestore.rules`

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own profile
    match /userProgress/{uid} {
      allow read, write: if request.auth.uid == uid;
    }

    // Leaderboard is public read, owner write
    match /leaderboard/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }

    // Rooms: any authenticated user can create/read; only participants can update
    match /rooms/{roomId} {
      allow read, create: if request.auth != null;
      allow update: if request.auth.uid == resource.data.hostId
                   || request.auth.uid == resource.data.guestId;
    }

    // Question stats: public read, admin write only
    match /questionStats/{qid} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.email == "admin@example.com";
    }
  }
}
```

---

## 7. Hosting

**Config:** `firebase.json`

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

- Build output: `dist/` (Vite)
- SPA rewrite: all routes serve `index.html`
- Deploy command: `firebase deploy`

---

## 8. Environment Variables

Stored in `.env` (git-ignored):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_ADMIN_EMAIL=
```

Accessed in code via `import.meta.env.VITE_*`.

---

## 9. Deployment Pipeline

```
Local dev  ──► npm run build ──► dist/
                                   │
                              firebase deploy
                                   │
                         Firebase Hosting CDN
                         (global edge network)
```

Also deployed on **Vercel** (parallel hosting, config in `vercel.json`).
