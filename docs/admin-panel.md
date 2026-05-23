# Admin Panel

**Module:** `src/components/AdminPanel.jsx`, `src/components/StatsDashboard.jsx`  
**Guard:** `src/components/AdminGuard.jsx`  
**Access:** Admin email only (set via `VITE_ADMIN_EMAIL` env variable)

---

## 1. Overview

The Admin Panel provides insights into player behavior and question effectiveness. It is hidden from regular users and only accessible to the designated admin account.

---

## 2. Access Control

### Route Guard
```jsx
// src/components/AdminGuard.jsx
function AdminGuard({ user, children }) {
  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;
  if (!isAdmin) return <div>גישה נדחתה</div>;
  return children;
}
```

### Navigation Guard
The "Admin" button in Main Menu only renders when:
```js
user?.email === import.meta.env.VITE_ADMIN_EMAIL
```

Both guards are required — the button hides the route, the guard blocks direct navigation.

---

## 3. Features

### 3.1 Question Statistics Table
Displays all questions from the curriculum with performance metrics:

| Column | Description |
|---|---|
| שאלה | Question text |
| שלב | Level number |
| ניסיונות | Total times attempted |
| הצלחה % | Correct answer rate |
| שגיאה % | Wrong answer rate |
| פיזור תשובות | Per-option selection count |

Questions are color-coded by success rate:
- 🟢 ≥ 80% — Easy (students understand this well)
- 🟡 50–79% — Moderate
- 🔴 < 50% — Hard (consider revising or adding hints)

### 3.2 BI Dashboard (StatsDashboard)
Visual charts powered by **Recharts**:

| Chart | Type | Data Source |
|---|---|---|
| הצלחה לפי שלב | Bar chart | `questionStats` grouped by `levelId` |
| פיזור קושי | Pie chart | Bucketed by success rate |
| טרנד לאורך זמן | Line chart | `lastUpdated` timestamps |
| שאלות הכי קשות | Ranked list | Sorted by lowest success rate |

### 3.3 Player Activity (Future)
- Total registered users
- Daily active users (DAU)
- Average session length
- Level completion funnel

---

## 4. Data Flow

```
CurriculumGame (player answers question)
  │
  ▼
src/firebase/questionStats.js
  │
  ├─► recordCorrectAnswer(questionId)
  │       └─► increment correctCount, totalAttempts
  │
  └─► recordWrongAnswer(questionId, selectedOption)
          └─► increment wrongCount, totalAttempts, optionCounts[selectedOption]
```

**Helper functions in `questionStats.js`:**
```js
export async function recordAnswer(questionId, isCorrect, selectedOption) {
  const ref = doc(db, "questionStats", questionId);
  await setDoc(ref, {
    totalAttempts: increment(1),
    correctCount: isCorrect ? increment(1) : increment(0),
    wrongCount: !isCorrect ? increment(1) : increment(0),
    [`optionCounts.${selectedOption}`]: increment(1),
    lastUpdated: serverTimestamp(),
  }, { merge: true });
}
```

---

## 5. Admin Panel UI Layout

```
┌─────────────────────────────────────────┐
│  לוח ניהול          [חזור לתפריט]       │
├─────────────────────────────────────────┤
│  [סטטיסטיקות שאלות]  [דשבורד BI]        │ ← Tab bar
├─────────────────────────────────────────┤
│                                         │
│   Tab: Question Stats                   │
│   ┌──────────────────────────────────┐  │
│   │ שאלה │ שלב │ ניסיונות │ הצלחה % │  │
│   ├──────────────────────────────────┤  │
│   │  ... │  1  │    42    │   88%   │  │
│   │  ... │  1  │    38    │   47%   │  │
│   └──────────────────────────────────┘  │
│                                         │
│   Tab: BI Dashboard                     │
│   ┌──────────┐  ┌──────────┐           │
│   │ Bar Chart│  │ Pie Chart│           │
│   └──────────┘  └──────────┘           │
│                                         │
└─────────────────────────────────────────┘
```

---

## 6. Security Considerations

- Admin email check is **client-side only** — suitable for this project scale
- For production hardening: use Firebase Custom Claims to set `admin: true` on the Auth token, then verify server-side in Firestore rules
- Never expose question answers or user emails in admin queries to non-admin users

---

## 7. Future Admin Features

- [ ] Export stats to CSV
- [ ] Edit/add/delete curriculum questions from the UI
- [ ] Broadcast notification to all players
- [ ] Manual badge award to specific users
- [ ] User management (ban/unban)
- [ ] A/B test question variants
