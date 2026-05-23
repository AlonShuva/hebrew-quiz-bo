# Multiplayer System Design

**Module:** `src/components/Multiplayer.jsx`  
**Backend:** Firebase Firestore (real-time listeners)

---

## 1. Overview

The multiplayer system allows two authenticated players to compete head-to-head in a live math quiz. Room state is stored in Firestore and synchronized in real-time via `onSnapshot` listeners.

---

## 2. Architecture

```
Player A (Host)              Firestore /rooms/{roomId}         Player B (Guest)
     │                                  │                              │
     │──── createRoom() ──────────────► │                              │
     │                                  │ ◄──── joinRoom(code) ────────│
     │ ◄─── onSnapshot (guest joined) ──│                              │
     │                                  │                              │
     │──── startGame() ───────────────► │                              │
     │ ◄─── onSnapshot (question) ──────│──── onSnapshot (question) ──►│
     │                                  │                              │
     │──── submitAnswer() ────────────► │                              │
     │                                  │◄──── submitAnswer() ─────────│
     │ ◄─── onSnapshot (round result) ──│──── onSnapshot (result) ────►│
     │                                  │                              │
     │         [repeat per round]       │                              │
     │                                  │                              │
     │ ◄─── onSnapshot (game over) ─────│──── onSnapshot (game over) ─►│
```

---

## 3. Firestore Room Document

**Collection:** `rooms`  
**Document ID:** auto-generated or short room code

```json
{
  "hostId": "uid_abc",
  "hostName": "ישראל ישראלי",
  "guestId": "uid_xyz",
  "guestName": "שרה כהן",
  "status": "waiting | playing | finished",
  "currentQuestion": {
    "text": "מהו תחום הפונקציה f(x) = 1/x?",
    "options": ["x ≠ 0", "x > 0", "x ≥ 0", "כל הממשיים"],
    "answer": "x ≠ 0"
  },
  "round": 3,
  "totalRounds": 5,
  "scores": {
    "host": 2,
    "guest": 1
  },
  "answers": {
    "host": null,
    "guest": null
  },
  "createdAt": "Timestamp"
}
```

---

## 4. Game Flow

### 4.1 Room Creation (Host)
1. Host clicks "יצירת חדר"
2. App writes a new document to `/rooms` with `status: "waiting"`
3. Host sees a **room code** to share
4. `onSnapshot` listener waits for `guestId` to be populated

### 4.2 Joining a Room (Guest)
1. Guest enters room code
2. App queries `/rooms` for matching document
3. On match, writes `guestId` + `guestName` to document
4. Host listener fires → both players transition to playing state

### 4.3 Round Flow
1. Host writes the next question to `currentQuestion`
2. Both players see the question simultaneously (via `onSnapshot`)
3. Each player selects an answer → written to `answers.host` / `answers.guest`
4. When both answers are present, scores are evaluated and updated
5. Next round begins; repeat until `round === totalRounds`

### 4.4 Game End
- Document `status` is set to `"finished"`
- Both players see the final score screen
- Winner's points are written to `/leaderboard/{uid}`

---

## 5. State Machine

```
[idle]
  │ createRoom / joinRoom
  ▼
[waiting for opponent]
  │ opponent joined
  ▼
[round in progress]
  │ both answers submitted
  ▼
[round result]
  │ next round
  ▼
[round in progress] ──► (loop)
  │ all rounds done
  ▼
[game over]
  │ rematch / exit
  ▼
[idle]
```

---

## 6. Edge Cases & Handling

| Scenario | Handling |
|---|---|
| Opponent disconnects | `status` remains `playing`; add timeout detection |
| Both answer simultaneously | Last write wins; evaluate both answers on server side |
| Player submits twice | UI disables answer buttons after first submission |
| Room not found | Show error: "קוד חדר לא קיים" |
| Room already full | Check `guestId` before joining; show error if set |

---

## 7. Security Rules (Firestore)

```
match /rooms/{roomId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update: if request.auth.uid == resource.data.hostId
             || request.auth.uid == resource.data.guestId;
  allow delete: if request.auth.uid == resource.data.hostId;
}
```

---

## 8. Future Improvements

- [ ] Spectator mode (read-only room listener)
- [ ] Reconnect on disconnect with room state recovery
- [ ] Matchmaking queue (random opponent)
- [ ] Tournament brackets
- [ ] Voice/emoji reactions during rounds
