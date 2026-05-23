# User Flow

**Navigation model:** State-based (no URL routing)  
**Auth:** Firebase Authentication (Google Sign-In)

---

## 1. Top-Level Flow

```
App Load
  │
  ├─► Not authenticated ──► Login Screen
  │                              │
  │                              │ Google Sign-In
  │                              ▼
  └─► Authenticated ────► Main Menu
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
   Curriculum Map        Multiplayer           Leaderboard
         │
         ▼
   Select Level
         │
         ▼
   Curriculum Game
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  Win       Lose
 (Level   (Game
Complete)  Over)
```

---

## 2. Screen Inventory

| Screen State | Component | Entry From | Exit To |
|---|---|---|---|
| `login` | `Login.jsx` | App load (unauthenticated) | `menu` |
| `menu` | `MainMenu.jsx` | After login / back from any screen | — |
| `curriculumMap` | `CurriculumMap.jsx` | Main menu | `menu`, `curriculumGame` |
| `curriculumGame` | `CurriculumGame.jsx` | CurriculumMap level tap | `curriculumMap` |
| `daily` | `DailyChallenge.jsx` | Main menu | `menu` |
| `multi` | `Multiplayer.jsx` | Main menu | `menu` |
| `leaderboard` | `Leaderboard.jsx` | Main menu | `menu` |
| `achievements` | `Achievements.jsx` | Main menu | `menu` |
| `admin` | `AdminPanel.jsx` | Main menu (admin only) | `menu` |

---

## 3. Authentication Flow

```
User opens app
  │
  ▼
Firebase checks auth state (onAuthStateChanged)
  │
  ├─► No session ──► Show Login screen
  │                       │
  │                       │ Click "כניסה עם גוגל"
  │                       ▼
  │                  Google OAuth popup
  │                       │
  │                  Success ──► Write user to Firestore /users
  │                              Navigate to Main Menu
  │
  └─► Session found ──► Skip login, go directly to Main Menu
```

**On logout:**
- Firebase `signOut()` called
- `user` state set to `null`
- App returns to Login screen

---

## 4. Curriculum Flow (Detailed)

```
Main Menu
  │ tap "מפת השלבים"
  ▼
Curriculum Map
  │
  │  Shows all levels as nodes on a vertical path
  │  Locked levels: grey, tap disabled
  │  Unlocked levels: colored, tap enabled
  │  Current level: "אתה כאן" label
  │
  │ tap unlocked level
  ▼
Curriculum Game (level N)
  │
  │  Header: back button + lives bar
  │  Question card with 4 answer options
  │  Progress bar showing Q/total
  │
  ├─► Correct answer ──► Points + streak increment
  │                           │
  │                     More questions? ──► Next question
  │                           │
  │                     Last question ──► Level Complete screen
  │                                              │
  │                                       Update Firestore
  │                                       Unlock next level
  │                                       Return to Map
  │
  └─► Wrong answer ──► Lose 1 life, show correct answer
                           │
                     Lives > 0 ──► Next question
                           │
                     Lives = 0 ──► Game Over screen
                                         │
                                   Return to Map
```

---

## 5. Multiplayer Flow (Detailed)

```
Main Menu
  │ tap "משחק רב-שחקנים"
  ▼
Multiplayer Lobby
  │
  ├─► "צור חדר" (Host)
  │       │
  │       ▼
  │   Room created, code shown
  │   Waiting for opponent...
  │       │
  │   Opponent joins ──► Game starts
  │
  └─► "הצטרף לחדר" (Guest)
          │
          ▼
      Enter room code
          │
      Room found ──► Write guestId ──► Game starts
          │
      Room not found ──► Error message

Game (both players)
  │
  │  Question shown to both simultaneously
  │  Answer buttons enabled
  │
  ├─► Both answer ──► Show round result ──► Next round
  │
  └─► All rounds done ──► Final score
                               │
                         Winner gets bonus points
                         Write to /leaderboard
                         Show winner/loser screen
```

---

## 6. New User First-Run Experience

1. Google Sign-In
2. Welcome to Main Menu (all options visible)
3. Curriculum Map shows **Level 1 unlocked**, all others locked
4. No achievements yet — achievements screen shows empty state
5. Leaderboard shows all players (new user appears after first level completion)

---

## 7. Navigation Rules

- Every sub-screen has a **back button** (top-right, RTL)
- Back always returns to the **immediate parent** screen
- No browser back button dependency (state-based routing)
- Game in progress: back button exits to map (progress for that session is lost)
