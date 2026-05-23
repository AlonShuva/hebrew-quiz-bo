# Game Design Document (GDD)
**Project:** תחום הפונקציה — Hebrew Math Learning Game  
**Version:** 1.0  
**Audience:** Developers, designers, stakeholders

---

## 1. Overview

| Field | Value |
|---|---|
| Genre | Educational / Math Quiz |
| Target Audience | Israeli high school students (grades 9–12) |
| Platform | Web (mobile-first, PWA-ready) |
| Language | Hebrew (RTL) |
| Core Subject | Domain of Functions (תחום הפונקציה) |

---

## 2. Design Goals

- Make math practice **engaging and habit-forming** through game mechanics
- Provide **immediate feedback** on correct and incorrect answers
- Support **self-paced learning** via a curriculum map
- Enable **social competition** via leaderboards and multiplayer
- Work seamlessly on **mobile and desktop** with no installation

---

## 3. Game Modes

### 3.1 Single Player — Curriculum Mode
- Player progresses through a **visual level map**
- Each level contains a fixed set of math questions
- Player has **3 lives** per session; losing all lives ends the round
- Correct answers award **points**; streaks multiply rewards
- Completing a level **unlocks the next one**

### 3.2 Single Player — Daily Challenge
- A fresh set of questions generated **each day**
- One attempt per day; rewards a bonus badge on completion
- Questions are slightly harder than standard curriculum levels

### 3.3 Multiplayer — Head-to-Head
- Two players join the **same room code**
- Both see the same question simultaneously
- First to answer correctly wins the round
- Match is best-of-N rounds; winner earns bonus points
- Real-time sync via Firestore listeners

---

## 4. Core Loop

```
Login → Main Menu
  └─→ Curriculum Map → Select Level → Answer Questions → Earn Points / Lose Lives
        └─→ Level Complete → Update Progress → Unlock Next Level → Back to Map
```

Secondary loops:
- **Daily**: Visit → Complete Challenge → Earn Badge → Return tomorrow
- **Social**: Play → Climb Leaderboard → View Rankings → Motivated to play more

---

## 5. Progression System

| Element | Description |
|---|---|
| Levels | Sequential, curriculum-aligned stages (locked until previous is complete) |
| Lives | 3 per session; lost on wrong answer |
| Points | Awarded per correct answer; multiplied by streak |
| Streaks | Consecutive correct answers; resets on wrong answer |
| Badges | Unlocked by milestones (see Achievement System) |

---

## 6. Feedback & Reinforcement

- **Correct answer:** Green highlight, points animation, streak counter increments
- **Wrong answer:** Red highlight, correct answer revealed, life lost
- **Level complete:** Celebration screen with points summary
- **New achievement:** Toast notification with badge icon
- **Streak milestone:** Visual pulse animation on streak counter

---

## 7. Visual Style

- **Theme:** Nature / Jungle — green palette, soft gradients
- **Typography:** Heebo (Google Fonts) — optimized for Hebrew
- **UI:** Glass morphism cards, subtle blur and transparency
- **Background:** Landscape photo with dark overlay
- **Animations:** Float, fadeIn, popIn, sparkle keyframe animations
- **Direction:** RTL throughout (CSS `direction: rtl`)

---

## 8. Accessibility & Mobile

- Minimum touch target: 44×44px on all interactive elements
- `touch-action: manipulation` prevents double-tap zoom
- `env(safe-area-inset-*)` for iPhone notch / Dynamic Island
- `100dvh` viewport units for iOS Safari compatibility
- Input `font-size: 16px` minimum to prevent iOS auto-zoom
- Fluid font sizing: `clamp(14px, calc(11px + 0.9375vw), 17px)`
