# Firestore Collections

**Database:** Cloud Firestore (Native mode)  
**Region:** Default (us-central1)

---

## Collection Index

| Collection | Access | Purpose |
|---|---|---|
| [`users`](#1-users) | Owner read/write | User profile data |
| [`userProgress`](#2-userprogress) | Owner only | Level progress and stats |
| [`leaderboard`](#3-leaderboard) | Public read, owner write | Global rankings |
| [`rooms`](#4-rooms) | Authenticated | Multiplayer room state |
| [`questionStats`](#5-questionstats) | Admin only | Question analytics |

---

## 1. `users`

Stores basic profile info written on first login.

**Path:** `/users/{uid}`

| Field | Type | Description |
|---|---|---|
| `uid` | string | Firebase Auth UID |
| `displayName` | string | Google display name |
| `email` | string | Google email |
| `photoURL` | string | Google avatar URL |
| `createdAt` | Timestamp | First login time |
| `lastLoginAt` | Timestamp | Most recent login |

**Security:** Owner read/write only.

---

## 2. `userProgress`

Private per-user game state. Never exposed to other users.

**Path:** `/userProgress/{uid}`

| Field | Type | Description |
|---|---|---|
| `totalPoints` | number | Cumulative points all-time |
| `currentLevel` | number | Highest unlocked level index |
| `streakRecord` | number | Best consecutive correct streak |
| `lastPlayed` | Timestamp | Last active session |
| `lastDailyChallenge` | string | Date string `"YYYY-MM-DD"` of last daily |
| `levelProgress` | map | Per-level completion data (see below) |

**`levelProgress` structure:**
```json
{
  "1": { "completed": true,  "bestScore": 90, "completedAt": "Timestamp" },
  "2": { "completed": true,  "bestScore": 80, "completedAt": "Timestamp" },
  "3": { "completed": false, "bestScore": 0  }
}
```

**Security:** Only the owning `uid` can read or write.

---

## 3. `leaderboard`

Public-facing ranking data. Contains only what is safe to display publicly.

**Path:** `/leaderboard/{uid}`

| Field | Type | Description |
|---|---|---|
| `displayName` | string | Player's display name |
| `photoURL` | string | Avatar URL (may be empty) |
| `totalPoints` | number | All-time point total |
| `currentLevel` | number | Current level reached |
| `updatedAt` | Timestamp | Last score update |

**Write trigger:** Updated after every level completion and multiplayer match win.  
**Security:** Any authenticated user can read; only owner can write their own doc.

**Query used in `Leaderboard.jsx`:**
```js
const q = query(collection(db, "leaderboard"), limit(100));
// Client-side sort by totalPoints desc, take top 20
```

---

## 4. `rooms`

Ephemeral documents for active multiplayer sessions. Should be cleaned up after game ends.

**Path:** `/rooms/{roomId}`

| Field | Type | Description |
|---|---|---|
| `hostId` | string | UID of room creator |
| `hostName` | string | Display name of host |
| `guestId` | string | UID of joining player (null until joined) |
| `guestName` | string | Display name of guest |
| `status` | string | `"waiting"` \| `"playing"` \| `"finished"` |
| `round` | number | Current round number (1-indexed) |
| `totalRounds` | number | Total rounds in the match |
| `currentQuestion` | map | Active question (see below) |
| `answers` | map | `{ host: string\|null, guest: string\|null }` |
| `scores` | map | `{ host: number, guest: number }` |
| `createdAt` | Timestamp | Room creation time |

**`currentQuestion` structure:**
```json
{
  "text": "מהו תחום הפונקציה f(x) = √(x-2)?",
  "options": ["x ≥ 2", "x > 2", "x ≤ 2", "x ≠ 2"],
  "answer": "x ≥ 2",
  "questionIndex": 3
}
```

**Security:** Any authenticated user can create/read; only host or guest can update.

---

## 5. `questionStats`

Analytics data for admin use. Tracks how players answer each question.

**Path:** `/questionStats/{questionId}`

| Field | Type | Description |
|---|---|---|
| `questionText` | string | The question text |
| `levelId` | number | Which curriculum level |
| `totalAttempts` | number | Total times this question was seen |
| `correctCount` | number | Times answered correctly |
| `wrongCount` | number | Times answered incorrectly |
| `optionCounts` | map | Count per answer option chosen |
| `lastUpdated` | Timestamp | Most recent stat update |

**Derived field (computed in UI):**
```js
successRate = (correctCount / totalAttempts) * 100
```

**Security:** Authenticated users can read; admin write only.

---

## 6. Document Size & Limits

| Limit | Firestore Max | Our Usage |
|---|---|---|
| Document size | 1 MB | Well under — all docs < 5 KB |
| Collection depth | 100 levels | Using 1 level (flat structure) |
| Write rate per doc | 1/sec | Multiplayer rooms may burst; acceptable |
| Queries without index | Allowed | All queries use simple `limit()` or single field |

---

## 7. Indexes

Currently no composite indexes required.  
All queries use:
- Single collection reads by document ID
- `limit()` queries on a single collection
- Client-side sorting after fetch

If `orderBy + limit` queries are added, Firestore will prompt for index creation automatically.
