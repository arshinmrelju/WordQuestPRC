# <div align="center"><img src="assets/favicon.svg" width="42" alt="Word Quest">&nbsp;&nbsp;WordQuest PRC</div>

<div align="center">

**Pazhassiraja College, Pulpally · Department of English Carnival**

<img src="assets/Pazhassiraja_College_Pulpally_Logo.png" height="100" alt="Pazhassiraja College Pulpally">
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
<img src="assets/favicon.svg" height="100" alt="Word Quest Logo">
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
<img src="assets/graphiccity-logo.svg" height="120" alt="GraphicCity">

<br>

A **live, competitive word-search tournament engine**.
Players register with their department & roll number, then race through progressive-difficulty
word-search rounds while spectators and admins watch live on a central leaderboard.

[![Firebase](https://img.shields.io/badge/Firebase-Hosting%20%26%20Firestore-FFCA28?logo=firebase&logoColor=black&style=flat-square)](#)
[![Vanilla JS](https://img.shields.io/badge/Stack-Vanilla%20JS%20%2B%20HTML%2FCSS-E34F26?logo=html5&logoColor=white&style=flat-square)](#)
[![No build step](https://img.shields.io/badge/Build-Zero--config%20%E2%9C%94-brightgreen?style=flat-square)](#)

</div>

## ✨ Features

### 🎮 Player Experience (game.html)
- **Progressive Difficulty Levelling** — 5 minute timer per round, words + grid grow per level
  - Level 1 (Novice): 8 words · 12×12 grid · 3 directions
  - Level 2 (Apprentice): 9 words · 12×12 grid · 5 directions (+reverse H/V)
  - Level 3+ (Scholar → Grandmaster): up to 24 words · 20×20 grid · all 8 directions
  - Level score multiplier scales 1.0× → 2.4×
- **Persistent Player Profiles** — register once with roll number / department / year,
  level progress carries across devices via Firestore.
- **Cumulative Score Banking** — score at risk during a round is banked when you advance
  or win, so a wrong answer or timeout only drops the current round's points.

### 🏆 Live Leaderboard (index.html)
- Real-time top-100 leaderboard powered by Firestore `onSnapshot`
- Live "players currently in-game" counter with 25s freshness heartbeat
- Per-player last-played level badge

### 🛡️ Admin Control Panel (admin.html — PIN-locked)
- Player roster (searchable) with full registration management (delete / bulk clear)
- Custom word-bank editor — override the default literary / English-lit word list
  with your own department / subject-specific terms
- Live present-mode — cast full-screen leaderboard or "currently playing" live grid
  onto a projector, locked with the admin PIN so spectators can't close it
- **Live spectating** — click any active player to watch their grid update in real time
  (found words, score, remaining seconds)
- Admin → player direct messaging and live broadcast pings to all active players
- Play-history log — every round is recorded (win / timeout / ended / left-aborted)
  with words found, time played, and cumulative score at round-end
- One-click PDF export of leaderboard + player stats for certificates / records
- **Game State toggle** — master switch to open or close registration & game play
  (e.g. start/end of an event)
- Stale-live-player cleanup — auto-flips players who closed the tab to inactive
  and correctly reconciles their projected vs banked scores

## 🧱 Architecture

- **Frontend** — vanilla JS (modules + globals), no build step, zero npm dependencies.
  Firebase SDK loaded via CDN ESM modules.
- **Backend** — Firebase Firestore + Firebase Hosting. All data is live-synced; no
  custom API server required.
- **Security** — credentials live outside source control. See *Local Setup* below.

## 🔐 Local Setup (IMPORTANT — no hardcoded secrets!)

All secrets (Firebase API key, admin PIN) are read from a local, **gitignored**
`firebase-config.js` file. There is a tracked template to copy from.

1. Copy the template:
   ```bash
   cp firebase-config.example.js firebase-config.js
   ```
2. Open `firebase-config.js` and replace every placeholder:
   - `firebase.apiKey`, `authDomain`, `projectId`, etc. — from your Firebase
     project settings → "General" → "My Apps" → "Config" radio button.
   - `adminAccessCode` — any 6-digit PIN for the admin panel.
3. Serve locally (Firestore Hosting requires HTTP, not `file://`):
   ```bash
   # Option A — Firebase Hosting emulator (preferred)
   firebase serve

   # Option B — any static server, e.g.
   npx serve .
   ```
4. Open `index.html`, `game.html`, or `admin.html`.

## 📂 Firestore Collections Used

| Collection             | Purpose                                                       |
|------------------------|---------------------------------------------------------------|
| `players`              | Registered players, active-game state, live spectator grid   |
| `leaderboard`          | Current-round + cumulative best score per player              |
| `cumulativeScores`     | Authoritative banked lifetime total per player                |
| `playSessions`         | Audit log of every completed/abandoned round                  |
| `player_messages`      | Per-player admin → user message inbox                         |
| `system_config`        | `game_control` (active toggle), `word_bank` (custom word list)|

## 🛠️ Development Notes

- `firebase-service.js` exposes `window.WordQuestFirebase` with every exported
  function — handy for admin scripts or debugging in DevTools.
- `dictionary.js` — the default ~4000 English-dictionary word list (used when no
  custom word bank is saved in `system_config/word_bank`).
- `game-engine.js` — grid generation, DFS word placement, click/drag word selection.

## 🚀 Deployment (Firebase Hosting)

```bash
firebase deploy
```

Hosting config in [firebase.json](firebase.json) serves the repo root as public
and auto-ignores `firebase.json`, dotfiles, and `node_modules/`.

> **Note:** Firebase Hosting auto-injects `/__/firebase/init.json` with the
> correct project config, but this repo uses the explicit `firebase-config.js`
> pattern so the same source runs locally without an emulator. If you'd like
> Hosting to auto-provision the config, swap `firebase-service.js` to fetch
> `/__/firebase/init.json` when `location.hostname` is not `localhost`.

---

<div align="center">

<img src="assets/Pazhassiraja_College_Pulpally_Logo.png" height="44" alt="Pazhassiraja College Pulpally">

**Pazhassiraja College, Pulpally** · Department of English

<br>

Powered by &nbsp;<img src="assets/graphiccity-logo.svg" height="22" alt="GraphicCity"> **GraphicCity**

</div>

