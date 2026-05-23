# Adaptive Difficulty System

**Status:** Partially implemented — infrastructure exists, full adaptation not yet active  
**Relevant files:** `src/firebase/questionStats.js`, `lib/curriculum.js`, `src/components/AdminPanel.jsx`

---

## 1. Overview

The adaptive difficulty system aims to personalize question selection and pacing based on individual player performance and global question statistics. The current implementation collects the data needed for adaptation; the selection algorithm is a planned enhancement.

---

## 2. Current State

### What's implemented
- Per-question statistics tracked in Firestore (`questionStats` collection)
- Admin dashboard shows question success rates and option distributions
- Questions are currently served in **fixed order** from `lib/curriculum.js`

### What's planned
- Dynamic question ordering based on player's weak areas
- Difficulty scaling within a level based on session performance
- Hint system triggered by repeated failures on the same question type

---

## 3. Question Difficulty Classification

Questions are classified by their measured success rate from `questionStats`:

| Difficulty Tier | Success Rate | Behavior |
|---|---|---|
| Easy | ≥ 80% | Served early in level, less weight in review |
| Medium | 50–79% | Standard frequency |
| Hard | 30–49% | Served with extra time, may show hint |
| Very Hard | < 30% | Flagged for admin review; may be revised |

Classification is computed dynamically — a question's tier changes as more data accumulates.

---

## 4. Data Collection Pipeline

```
Player answers question (correct or wrong)
         │
         ▼
src/firebase/questionStats.js → recordAnswer(questionId, isCorrect, selectedOption)
         │
         ▼
Firestore /questionStats/{questionId}
  ├── totalAttempts  += 1
  ├── correctCount   += (isCorrect ? 1 : 0)
  ├── wrongCount     += (!isCorrect ? 1 : 0)
  └── optionCounts.{selectedOption} += 1
```

Each question has a stable `questionId` derived from its content hash or a manually assigned key in `lib/curriculum.js`.

---

## 5. Planned: Per-Player Weak Area Detection

The system will track which **question types** a player struggles with:

### Question Type Taxonomy
| Type ID | Description | Example |
|---|---|---|
| `sqrt_domain` | Square root domain | f(x) = √(x - a) |
| `fraction_domain` | Denominator ≠ 0 | f(x) = 1/(x - a) |
| `log_domain` | Logarithm domain | f(x) = log(x + a) |
| `combined` | Multiple constraints | f(x) = √(x) / (x - 1) |
| `inequality` | Solving inequalities | x² - 4 ≥ 0 |

### Weak Area Score
```
weakScore(type) = 1 - (correct[type] / total[type])
```

A type with `weakScore > 0.5` is considered a **weak area** for that player.

---

## 6. Planned: Adaptive Question Selection

When a player starts a level, instead of serving questions in fixed order:

```
1. Fetch player's weakScore per type
2. Fetch global difficulty tier per question
3. Score each candidate question:
   score = (weakScore[question.type] × 0.6) + (globalDifficulty × 0.4)
4. Sort questions by score descending (hardest-for-player first)
5. Insert 1-2 easy questions at start for confidence boost
6. Serve in computed order
```

This ensures players spend more time on their actual weak spots rather than re-practicing what they already know.

---

## 7. Planned: In-Session Difficulty Scaling

Within a single game session, difficulty adapts based on recent performance:

```
Recent performance window: last 3 answers

All 3 correct  → increase difficulty (serve harder variant next)
2 of 3 wrong   → decrease difficulty (serve easier variant next)
                 + offer hint button
3 consecutive wrong on same type → pause and show explanation card
```

---

## 8. Planned: Hint System

Triggered when a player fails the same question type multiple times:

| Trigger | Hint Type |
|---|---|
| 2nd wrong answer on same question | "רמז: בדוק אם המכנה יכול להיות אפס" |
| 3rd wrong answer | Show worked example with similar question |
| Type weakness detected | Offer "תרגול ממוקד" mode for that type |

Hints are optional — player can dismiss or request them proactively.

---

## 9. Metrics to Track (Future)

| Metric | Purpose |
|---|---|
| Time-to-answer per question | Identify questions players find confusing |
| Hint usage rate | Measure where students are stuck |
| Session abandon rate per level | Identify difficulty spikes |
| Retry rate per level | Measure level balance |
| Points per minute | Overall engagement quality |

---

## 10. Implementation Roadmap

| Phase | Feature | Status |
|---|---|---|
| 1 | Collect question stats | ✅ Done |
| 2 | Admin difficulty dashboard | ✅ Done |
| 3 | Question type tagging in curriculum | 🔲 Planned |
| 4 | Per-player weak area tracking | 🔲 Planned |
| 5 | Adaptive question ordering | 🔲 Planned |
| 6 | In-session difficulty scaling | 🔲 Planned |
| 7 | Hint system | 🔲 Planned |
| 8 | Full ML-based recommendation | 🔲 Future |
