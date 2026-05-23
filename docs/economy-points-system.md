# Economy & Points System

**Module:** `src/components/CurriculumGame.jsx`, `src/components/Multiplayer.jsx`  
**Persistence:** Firestore `/userProgress/{uid}` + `/leaderboard/{uid}`

---

## 1. Overview

The points system is the core reward loop of the game. Points are earned by answering questions correctly and are multiplied by active streaks. All points persist across sessions via Firestore and contribute to the global leaderboard ranking.

---

## 2. Point Sources

| Action | Base Points | Notes |
|---|---|---|
| Correct answer (curriculum) | +10 | Before streak multiplier |
| Correct answer (daily challenge) | +15 | Bonus for daily engagement |
| Correct answer (multiplayer) | +20 | Competitive bonus |
| Winning a multiplayer match | +50 | Flat bonus on match win |
| Completing a level | +25 | One-time per level |
| First-time level completion | +50 | Bonus for new unlock |

---

## 3. Streak Multiplier

A streak is the count of consecutive correct answers without a wrong answer.

| Streak Count | Multiplier | Display |
|---|---|---|
| 1–2 | ×1.0 | — |
| 3–4 | ×1.5 | 🔥 |
| 5–7 | ×2.0 | 🔥🔥 |
| 8–10 | ×2.5 | 🔥🔥🔥 |
| 11+ | ×3.0 | 🔥🔥🔥 MAX |

**Formula:**
```
points_earned = base_points × streak_multiplier
```

**Streak reset:** Any wrong answer resets streak to 0.

---

## 4. Lives System

- Each game session starts with **3 lives** (❤️❤️❤️)
- A wrong answer costs **1 life**
- Reaching 0 lives **ends the session** (no level completion)
- Lives do **not** persist between sessions — full reset on next play

> Future: Lives regeneration over time (energy system)

---

## 5. Point Persistence

Points are stored in two locations for different purposes:

### 5.1 Private Progress (`/userProgress/{uid}`)
```json
{
  "totalPoints": 1250,
  "currentLevel": 4,
  "levelProgress": {
    "1": { "completed": true, "bestScore": 80 },
    "2": { "completed": true, "bestScore": 95 },
    "3": { "completed": false }
  },
  "streakRecord": 12,
  "lastPlayed": "Timestamp"
}
```

### 5.2 Public Leaderboard (`/leaderboard/{uid}`)
```json
{
  "displayName": "ישראל ישראלי",
  "photoURL": "https://...",
  "totalPoints": 1250,
  "currentLevel": 4
}
```

Only `displayName`, `photoURL`, `totalPoints`, and `currentLevel` are public.  
Email, uid, and detailed progress remain private.

---

## 6. Level Completion Flow

```
Player answers last question correctly
  │
  ▼
Calculate session score
  │
  ▼
Read current totalPoints from /userProgress
  │
  ▼
newTotal = currentTotal + sessionPoints
  │
  ▼
Write to /userProgress (merge: true)  ──►  Update currentLevel, totalPoints
  │
  ▼
Write to /leaderboard (merge: true)   ──►  Update displayName, photoURL, totalPoints, currentLevel
  │
  ▼
Show level complete screen
```

---

## 7. Daily Challenge Bonus

- Tracked via `lastDailyChallenge` date field in `/userProgress`
- If today's date ≠ stored date → challenge available
- On completion: award bonus points, update date, unlock daily badge

---

## 8. Anti-Gaming Considerations

- Points are written **server-side after validation** (future improvement)
- Currently written from client; Firestore rules ensure only the owner can write their own progress
- Leaderboard can only be updated by the authenticated user's own document

---

## 9. Future Economy Features

- [ ] Coins as separate currency from XP points
- [ ] Shop: buy hints, extra lives, cosmetics with coins
- [ ] Weekly/seasonal leaderboard resets
- [ ] Bonus multiplier events (double points weekend)
- [ ] Referral bonus for inviting friends
