# Achievement System

**Module:** `src/components/Achievements.jsx`  
**Persistence:** `userProgress.achievements` in Firestore

---

## 1. Overview

Achievements are badges awarded to players for reaching milestones. They provide long-term motivation beyond the level progression system. Achievements are grouped into categories and displayed in a filterable gallery.

---

## 2. Achievement Structure

Each achievement has the following properties:

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `title` | string | Display name (Hebrew) |
| `description` | string | What the player did to earn it |
| `icon` | string | Emoji or image |
| `category` | string | Grouping category |
| `condition` | object | Trigger condition (see below) |
| `points` | number | Bonus points awarded on unlock |
| `rarity` | string | `common` \| `rare` \| `epic` \| `legendary` |

---

## 3. Categories

| Category ID | Hebrew Label | Description |
|---|---|---|
| `progress` | התקדמות | Level completion milestones |
| `accuracy` | דיוק | Correct answer streaks and rates |
| `speed` | מהירות | Fast answer times |
| `social` | חברתי | Multiplayer and leaderboard |
| `daily` | יומי | Daily challenge completions |
| `special` | מיוחד | Hidden / secret achievements |

---

## 4. Achievement Catalog

### Progress
| ID | Title | Condition |
|---|---|---|
| `first_level` | הצעד הראשון | Complete level 1 |
| `level_5` | מחצית הדרך | Complete level 5 |
| `level_10` | מומחה | Complete level 10 |
| `all_levels` | אלוף התחום | Complete all levels |
| `comeback` | החזרה הגדולה | Complete a level on second attempt after failing |

### Accuracy
| ID | Title | Condition |
|---|---|---|
| `streak_3` | שלישייה מנצחת | 3 correct answers in a row |
| `streak_7` | שבע על הדרך | 7 correct answers in a row |
| `streak_15` | בלתי מנוצח | 15 correct answers in a row |
| `perfect_level` | מושלם | Complete a level with no wrong answers |
| `perfect_5` | חמישה מושלמים | 5 perfect level completions |

### Speed
| ID | Title | Condition |
|---|---|---|
| `speed_answer` | ברק | Answer correctly in under 3 seconds |
| `speed_level` | סופר-מהיר | Complete a full level in under 2 minutes |

### Social
| ID | Title | Condition |
|---|---|---|
| `first_multi` | מתחרה | Play first multiplayer match |
| `win_multi` | מנצח | Win a multiplayer match |
| `win_5_multi` | אלוף | Win 5 multiplayer matches |
| `top_10` | עשרת הטובים | Reach top 10 on leaderboard |
| `top_3` | שלישיית העלית | Reach top 3 on leaderboard |

### Daily
| ID | Title | Condition |
|---|---|---|
| `first_daily` | משמעת | Complete first daily challenge |
| `daily_7` | שבוע שלם | Complete 7 daily challenges |
| `daily_30` | חודש של למידה | Complete 30 daily challenges |

### Special
| ID | Title | Condition |
|---|---|---|
| `night_owl` | ינשוף לילה | Play after midnight |
| `early_bird` | ציפור השחר | Play before 6 AM |
| `point_1000` | אלף ראשון | Reach 1,000 total points |
| `point_5000` | מצטיין | Reach 5,000 total points |

---

## 5. Unlock Flow

```
Game action occurs (e.g., level completed)
  │
  ▼
checkAchievements(userProgress, action)
  │
  ├─► For each achievement in catalog
  │       └─► Evaluate condition against current state
  │
  ├─► New achievement(s) found?
  │       │
  │       ▼
  │   Write to Firestore userProgress.achievements[]
  │       │
  │       ▼
  │   Show toast notification with badge icon
  │       │
  │       ▼
  │   Award bonus points
  │
  └─► No new achievements → continue
```

---

## 6. UI Layout

```
┌───────────────────────────────────────┐
│  הישגים                  [חזור]        │
├───────────────────────────────────────┤
│ [הכל] [התקדמות] [דיוק] [חברתי] [יומי] │ ← Filter tabs
├───────────────────────────────────────┤
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐      │
│  │ 🏆 │  │ 🔥 │  │ ⚡ │  │ 🌙 │      │
│  │הצעד│  │שלישי│  │ברק │  │ינשוף│    │
│  │הראשון│ │מנצחת│  │    │  │לילה│    │
│  └────┘  └────┘  └────┘  └────┘      │
│  ✅ earned  🔒 locked                 │
├───────────────────────────────────────┤
│  הושגו: 7 / 24                        │ ← Progress summary
└───────────────────────────────────────┘
```

- **Earned badges:** Full color, checkmark overlay
- **Locked badges:** Greyed out, lock icon
- **Rarity indicator:** Colored border (grey / blue / purple / gold)

---

## 7. Rarity Visual Design

| Rarity | Border Color | Glow |
|---|---|---|
| common | `#9e9e9e` | None |
| rare | `#2196f3` | Subtle blue |
| epic | `#9c27b0` | Purple pulse |
| legendary | `#ff9800` | Gold sparkle animation |

---

## 8. Future Improvements

- [ ] Achievement unlock animation (full-screen flash + fanfare)
- [ ] Share achievement to social media
- [ ] Achievement progress bar (e.g., "3/7 multiplayer wins")
- [ ] Seasonal / limited-time achievements
- [ ] Achievement points contributing to a separate "prestige" rank
