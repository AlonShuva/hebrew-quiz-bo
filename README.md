# 📐 תחום הפונקציה — משחק למידה בעברית

A Hebrew math learning web app for Israeli high school students, focused on **domain of functions** (תחום הפונקציה). Built with React, Vite, and Firebase.

---

## Features

- **Curriculum Map** — visual level progression map with locked/unlocked stages
- **Single Player Mode** — answer math questions, earn points, lose lives
- **Multiplayer Mode** — real-time head-to-head math battles
- **Daily Challenge** — a new set of questions every day
- **Leaderboard** — global ranking by total points
- **Achievements** — badges unlocked by completing milestones
- **Admin Panel** — question statistics and BI dashboard (admin only)
- **Google Sign-In** — Firebase Authentication
- Full **RTL** (right-to-left) Hebrew UI
- Mobile-first, responsive design (iPhone & Android)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite |
| Styling | Inline styles + global CSS (RTL, glass morphism) |
| Math rendering | KaTeX |
| Backend / DB | Firebase Firestore |
| Auth | Firebase Authentication (Google) |
| Hosting | Firebase Hosting + Vercel |
| Charts | Recharts |

---

## Project Structure

```
src/
├── App.jsx                  # Root — auth state + screen routing
├── index.css                # Global styles, CSS variables, animations
├── components/
│   ├── Login.jsx            # Google sign-in screen
│   ├── MainMenu.jsx         # Home screen with navigation
│   ├── CurriculumMap.jsx    # Level progression map
│   ├── CurriculumGame.jsx   # Single-player question game
│   ├── Multiplayer.jsx      # Real-time multiplayer game
│   ├── DailyChallenge.jsx   # Daily challenge screen
│   ├── Leaderboard.jsx      # Global leaderboard
│   ├── Achievements.jsx     # Badges & milestones
│   ├── AdminPanel.jsx       # Admin-only stats dashboard
│   ├── StatsDashboard.jsx   # BI charts
│   ├── MathText.jsx         # KaTeX math renderer
│   └── AdminGuard.jsx       # Route guard for admin screens
└── firebase/
    ├── config.js            # Firebase init & exports
    └── questionStats.js     # Question analytics helpers
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project with Firestore + Authentication enabled

### Install

```bash
npm install
```

### Environment

Create a `.env` file at the project root:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Run locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Deploy to Firebase

```bash
firebase deploy
```

---

## Firestore Collections

| Collection | Access | Description |
|---|---|---|
| `userProgress` | Owner only | Per-user level progress and points |
| `leaderboard` | Public read | Display name, photo, total points |
| `questionStats` | Admin read | Per-question answer statistics |
| `rooms` | Authenticated | Multiplayer game rooms |

---

## Documentation

### Design & Architecture
- [Game Design Document](https://github.com/AlonShuva/hebrew-quiz-bo/blob/main/docs/game-design-document.md) — Game modes, core loop, visual style, accessibility
- [Firebase Architecture](https://github.com/AlonShuva/hebrew-quiz-bo/blob/main/docs/firebase-architecture.md) — Auth, Firestore, hosting, security rules
- [Firestore Collections](https://github.com/AlonShuva/hebrew-quiz-bo/blob/main/docs/firestore-collections.md) — Full schema for all collections
- [User Flow](https://github.com/AlonShuva/hebrew-quiz-bo/blob/main/docs/user-flow.md) — Screen inventory, navigation, auth flow, detailed game flows

### Systems
- [Economy & Points System](https://github.com/AlonShuva/hebrew-quiz-bo/blob/main/docs/economy-points-system.md) — Points, streaks, lives, persistence
- [Multiplayer System](https://github.com/AlonShuva/hebrew-quiz-bo/blob/main/docs/multiplayer-system.md) — Room architecture, real-time sync, state machine
- [Achievement System](https://github.com/AlonShuva/hebrew-quiz-bo/blob/main/docs/achievement-system.md) — Badge catalog, unlock flow, categories
- [Leaderboard System](https://github.com/AlonShuva/hebrew-quiz-bo/blob/main/docs/leaderboards.md) — Data model, query logic, security
- [Adaptive Difficulty System](https://github.com/AlonShuva/hebrew-quiz-bo/blob/main/docs/adaptive-difficulty.md) — Question stats, planned adaptation roadmap
- [Admin Panel](https://github.com/AlonShuva/hebrew-quiz-bo/blob/main/docs/admin-panel.md) — Access control, question stats, BI dashboard

### Requirements
- [user-stories.md](https://github.com/AlonShuva/hebrew-quiz-bo/blob/main/user-stories.md) — 100 Hebrew user stories across 12 categories

### Diagrams
- [sequence-diagram-uc1.html](sequence-diagram-uc1.html) — UC-01 sequence diagram
- [class-diagram.html](class-diagram.html) — Class diagram
- [state-machine.html](state-machine.html) — State machine diagram

---

## License

MIT
