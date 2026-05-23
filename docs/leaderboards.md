# Leaderboard System

**Module:** `src/components/Leaderboard.jsx`  
**Data source:** Firestore `/leaderboard` collection  
**Access:** Any authenticated user

---

## 1. Overview

The leaderboard ranks all players by total points earned. It updates in real-time using Firestore's `onSnapshot` listener. Player data is public and limited to display name, avatar, points, and current level — no private info is exposed.

---

## 2. Data Model

**Collection:** `/leaderboard/{uid}`

```json
{
  "displayName": "ישראל ישראלי",
  "photoURL": "https://lh3.googleusercontent.com/...",
  "totalPoints": 1850,
  "currentLevel": 6,
  "updatedAt": "Timestamp"
}
```

> Private fields (email, uid, detailed progress) are stored separately in `/userProgress` and never written to `/leaderboard`.

---

## 3. Query Logic

```js
// Leaderboard.jsx
const q = query(collection(db, "leaderboard"), limit(100));

onSnapshot(q, (snap) => {
  const all = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.displayName)                          // exclude incomplete records
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
    .slice(0, 20);                                       // top 20 only
  setPlayers(all);
});
```

- Fetches up to 100 documents from Firestore
- Filters out any documents missing `displayName`
- Sorts client-side by `totalPoints` descending
- Displays top 20

---

## 4. Write Triggers

The leaderboard document is updated in two places:

### After Curriculum Level Completion
```js
// CurriculumGame.jsx
await setDoc(doc(db, "leaderboard", user.uid), {
  displayName: user.displayName || user.email?.split('@')[0] || "שחקן",
  photoURL: user.photoURL || "",
  totalPoints: newTotal,
  currentLevel: nextLevel,
}, { merge: true });
```

### After Multiplayer Match
```js
// Multiplayer.jsx
await setDoc(doc(db, "leaderboard", user.uid), {
  displayName: user.displayName,
  photoURL: user.photoURL || "",
  totalPoints: newTotal,
}, { merge: true });
```

`merge: true` ensures existing fields not in the update are preserved.

---

## 5. UI Layout

```
┌──────────────────────────────────────────┐
│  טבלת המובילים              [חזור]        │
├──────────────────────────────────────────┤
│                                          │
│  🥇  [avatar]  ישראל ישראלי    1,850 נק'  │
│  🥈  [avatar]  שרה כהן         1,620 נק'  │
│  🥉  [avatar]  דוד לוי         1,410 נק'  │
│   4  [avatar]  מיכל אברהם      980 נק'   │
│   5  [avatar]  יוסף גולן       870 נק'   │
│   ...                                    │
│  [current user row highlighted]          │
│                                          │
└──────────────────────────────────────────┘
```

### Special Rows
- **Top 3:** Medal emojis (🥇🥈🥉) instead of rank number
- **Current user:** Highlighted background regardless of rank
- **No data:** Empty state message "אין נתונים עדיין"

---

## 6. Current User Highlight

The current user's row is identified by matching `id` (document ID = uid) against `user.uid`:

```jsx
const isMe = player.id === user?.uid;

<div style={{
  background: isMe ? "rgba(67,160,71,0.15)" : "transparent",
  fontWeight: isMe ? 800 : 400,
  border: isMe ? "1.5px solid #43a047" : "none",
}}>
```

---

## 7. Security Model

| Operation | Rule |
|---|---|
| Read `/leaderboard` | Any authenticated user |
| Write `/leaderboard/{uid}` | Only the user matching `uid` |
| Delete | Not allowed (not implemented) |

This means:
- Players cannot inflate others' scores
- Players cannot delete their own leaderboard entry through the UI
- All data is visible to any logged-in user

---

## 8. Performance Notes

- `limit(100)` caps the Firestore read to 100 documents maximum
- Client-side sort is acceptable at this scale (< 100 docs)
- For 10,000+ users: move to `orderBy("totalPoints", "desc")` + server-side index

---

## 9. Future Improvements

- [ ] Weekly and monthly leaderboard resets
- [ ] Filter by friend group / school class
- [ ] Rank delta indicator (↑3 / ↓2 since last visit)
- [ ] Paginate beyond top 20
- [ ] Server-side `orderBy` with Firestore composite index for scale
- [ ] Anonymization option (player can hide from leaderboard)
