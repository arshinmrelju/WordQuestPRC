/**
 * Word Quest — Word Search Engine (game.js)
 *
 * Features:
 *  - Generates a random 12×12 letter grid
 *  - Places 8 hidden words (horizontal, vertical, diagonal — all directions)
 *  - Click-and-drag selection on desktop & touch
 *  - Countdown timer (5 minutes default)
 *  - Score: +10 per word found, +remaining seconds when complete
 *  - Game-over overlay on time-up or all words found
 */

'use strict';

/* ─── WORD BANK ─────────────────────────────── */
/* 20 words; 8 are chosen randomly each game */
const WORD_BANK = [
    'ALLEGORY', 'ALLITERATION', 'ALLUSION', 'ANAPHORA', 'ANTAGONIST',
    'ASSONANCE', 'BALLAD', 'BIOGRAPHY', 'CATHARSIS', 'CHARACTER',
    'CLIMAX', 'COMEDY', 'CONFLICT', 'CONNOTATION', 'COUPLET',
    'DENOTATION', 'DIALOGUE', 'DICTION', 'DRAMA', 'ELEGY',
    'EPILOGUE', 'EUPHEMISM', 'EXPOSITION', 'FANTASY', 'FICTION',
    'FLASHBACK', 'FORESHADOWING', 'GENRE', 'HYPERBOLE', 'IMAGERY',
    'IRONY', 'METAPHOR', 'MONOLOGUE', 'MOTIF', 'NARRATOR',
    'NOVEL', 'ODE', 'OXYMORON', 'PARADOX', 'PERSONIFICATION',
    'PLOT', 'POETRY', 'PROLOGUE', 'PROTAGONIST', 'PUN',
    'SATIRE', 'SIMILE', 'SOLILOQUY', 'SONNET', 'STANZA',
    'SYMBOLISM', 'THEME', 'TONE', 'TRAGEDY', 'VERSE',
    'SHAKESPEARE', 'CHAUCER', 'DICKENS', 'AUSTEN', 'ORWELL',
    'TOLKIEN', 'SHELLEY', 'BYRON', 'KEATS', 'WORDSWORTH',
    'ELIOT', 'WOOLF', 'HEMINGWAY', 'POE', 'FROST',
    'MILTON', 'WILDE', 'JOYCE', 'KIPLING', 'PLATH',
    'HAMLET', 'MACBETH', 'OTHELLO', 'TEMPEST', 'ODYSSEY',
    'ILIAD', 'BEOWULF', 'ULYSSES', 'DRACULA', 'FRANKENSTEIN',
    'EMMA', 'PERSUASION', 'DORIANGRAY', 'ANIMALFARM', 'NINETEENEIGHTYFOUR',
    'PARADISELOST', 'CANTERBURY', 'KINGLEAR',
    'ADJECTIVE', 'ADVERB', 'CLAUSE', 'CONJUNCTION', 'GERUND',
    'HOMOPHONE', 'IDIOM', 'INTERJECTION', 'NOUN', 'PRONOUN',
    'PREFIX', 'SUFFIX', 'PREPOSITION', 'PREDICATE', 'SUBJECT',
    'TENSE', 'VERB', 'VOCABULARY', 'SYNTAX', 'SEMANTICS',
    'PHONETICS', 'MORPHOLOGY',
    'HAIKU', 'LIMERICK', 'BLANKVERSE', 'FREEVERSE', 'RHYTHM',
    'RHYME', 'METER', 'REFRAIN', 'CHORUS', 'LYRIC', 'EPIC',
    'STAGE', 'SCRIPT', 'SCENE', 'ACT', 'CURTAIN',
    'AUDIENCE', 'PLAYWRIGHT', 'CAST', 'COSTUME',
    'BILDUNGSROMAN', 'ONOMATOPOEIA', 'ANTHROPOMORPHISM', 'STREAMOFCONSCIOUSNESS',
    'DECONSTRUCTION', 'EXISTENTIALISM', 'POSTMODERNISM', 'ROMANTICISM',
    'TRANSCENDENTALISM', 'METAFICTION', 'JUXTAPOSITION', 'PATHETICFALLACY',
    'SYNECDOCHE',
    'ACRONYM', 'ACROSTIC', 'AFFIX', 'ANTITHESIS', 'ANTONYM',
    'APOSTROPHE', 'BATHOS', 'CINQUAIN', 'DIPHTHONG', 'DISSONANCE',
    'DRAMATIST', 'ELLIPSIS', 'EPIGRAM', 'EPITHET', 'EUPHONY',
    'HUBRIS', 'INFINITIVE', 'INVERSION', 'LITOTES', 'METONYMY',
    'MIDSUMMER', 'MODIFIER', 'MORPHEME', 'PARODY', 'PARTICIPLE',
    'PASTORAL', 'PHILOLOGY', 'RHETORIC', 'SESTINA', 'SYNONYM',
    'TERCET', 'TRANSITIVE', 'VILLANELLE', 'VOICE',
    'BRONTE', 'CERVANTES', 'DANTE', 'FITZGERALD', 'HARDY',
    'KAFKA', 'MELVILLE', 'STEINBECK', 'WHITMAN', 'YEATS',
    'FAUST', 'GATSBY', 'GOTHIC', 'HEROIC', 'MOBYDICK', 'PRIDE', 'ROMEO',
];

const GRID_SIZE  = 12;   // 12×12 grid
const WORD_COUNT = 8;    // words to hide
const GAME_SECS  = 300;  // 5 minutes
const PTS_WORD   = 10;   // points per word found

/* ─── DIRECTIONS (dx, dy) ───────────────────── */
const DIRS = [
    [1, 0],   // right
    [0, 1],   // down
    [1, 1],   // diagonal down-right
    [-1, 1],  // diagonal down-left
    [-1, 0],  // left
    [0, -1],  // up
    [1, -1],  // diagonal up-right
    [-1, -1], // diagonal up-left
];

/* ─── AUDIO: WEB-AUDIO SYNTHESIZER ───────────── */
/* Everything is synthesized live (zero asset files): a gentle ambient
   background loop plus short one-shot effects for actions & outcomes. */
class SoundFX {
    constructor() {
        this.ctx      = null;
        this.master   = null;
        this._unlocked = false;
    }

    /* Build context lazily (must happen after a user gesture on most browsers). */
    _ensure() {
        try {
            if (this.ctx) return true;
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return false;
            this.ctx    = new AC();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.9;
            this.master.connect(this.ctx.destination);
            return true;
        } catch (e) {
            return false;
        }
    }

    /* Call from a user gesture to permit audio (autoplay policy). Never throws. */
    unlock() {
        try {
            if (this._unlocked) { this._resume(); return; }
            if (!this._ensure()) return;
            this._unlocked = true;
            this._resume();
        } catch (e) {}
    }

    _resume() {
        try {
            if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        } catch (e) {}
    }

    get isMuted() {
        try {
            return localStorage.getItem('wordQuest_muted') === 'true';
        } catch (e) {
            return false;
        }
    }

    setMuted(m) {
        try { localStorage.setItem('wordQuest_muted', m ? 'true' : 'false'); } catch (e) {}
    }

    toggle() {
        const nowMuted = !this.isMuted;
        this.setMuted(nowMuted);
        return nowMuted;
    }

    /* ---- one-shot tone: freq → freq2 with an AD-style envelope ---- */
    _tone(freq, { f2, type = 'sine', dur = 0.15, vol = 0.5, at = 0 } = {}) {
        if (this.isMuted) return;
        if (!this._ensure()) return;
        this._resume();
        const t  = this.ctx.currentTime + at;
        const o  = this.ctx.createOscillator();
        const g  = this.ctx.createGain();
        o.type   = type;
        o.frequency.setValueAtTime(freq, t);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);

        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        o.connect(g).connect(this.master);
        o.start(t);
        o.stop(t + dur + 0.05);
    }

    /* ---- UI / selection clicks ---- */
    playClick() { try { this._tone(660, { f2: 990, type: 'triangle', dur: 0.09, vol: 0.35 }); } catch (e) {} }

    playSelect() { try { this._tone(520, { type: 'sine', dur: 0.05, vol: 0.22 }); } catch (e) {} }

    /* ---- game outcomes ---- */
    playCorrect() {
        try {
            [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
                this._tone(f, { type: 'triangle', dur: 0.14, vol: 0.5, at: i * 0.06 }));
        } catch (e) {}
    }

    playWrong() {
        try { this._tone(220, { f2: 110, type: 'sawtooth', dur: 0.22, vol: 0.28 }); } catch (e) {}
    }

    playGameOver() {
        try {
            [392, 329.63, 261.63, 196].forEach((f, i) =>
                this._tone(f, { type: 'triangle', dur: 0.32, vol: 0.45, at: i * 0.16 }));
        } catch (e) {}
    }

    /* Warm, celebratory "official ending" chime (admin close / event wrap-up). */
    playEnding() {
        try {
            const chord = [261.63, 329.63, 392.0, 523.25];
            chord.forEach((f, i) =>
                this._tone(f, { type: 'sine', dur: 1.0, vol: 0.24, at: i * 0.07 }));
            this._tone(659.25, { type: 'triangle', dur: 1.3, vol: 0.38, at: 0.28 });
            this._tone(783.99, { type: 'triangle', dur: 1.5, vol: 0.3,  at: 0.4 });
        } catch (e) {}
    }

    playWin() {
        try {
            this._tone(523.25, { type: 'triangle', dur: 0.18, vol: 0.5 });
            this._tone(659.25, { type: 'triangle', dur: 0.18, vol: 0.5, at: 0.12 });
            this._tone(783.99, { type: 'triangle', dur: 0.18, vol: 0.5, at: 0.24 });
            this._tone(1046.5, { type: 'triangle', dur: 0.6,  vol: 0.55, at: 0.36 });
        } catch (e) {}
    }

    playTick() {
        try { this._tone(880, { type: 'square', dur: 0.06, vol: 0.16 }); } catch (e) {}
    }

    /* ---- ambient background loop REMOVED — sound effects only. --- */
}

/* Global audio instance used by the game. */
const SFX = new SoundFX();

/* ─── MAIN CLASS ─────────────────────────────── */
class WordSearch {

    constructor() {
        this.level           = 1;
        this.levelTitle      = 'Novice';
        this.levelMultiplier = 1.0;
        this.gridSize        = GRID_SIZE;
        this.wordCount       = WORD_COUNT;
        this.gameSecs        = GAME_SECS;
        this.directions      = DIRS;
        this.useSmartGarbage = false;

        this.grid       = [];        // 2D array of letters
        this.words      = [];        // chosen words
        this.placed     = {};        // word → [{r,c},...] cell list
        this.foundWords = new Set(); // words found so far
        this.score      = 0;
        this.cumulativeScore = 0;
        this.usedWords  = [];   // words already shown to this player (never reused)

        /* selection state */
        this.selecting  = false;
        this.selStart   = null;      // {r, c}
        this.selCells   = [];        // [{r,c},...] currently highlighted

        /* timer */
        this._remaining = GAME_SECS;
        this._timer     = null;
        this._timerPaused = false;

        /* admin message popup */
        this._msgUnsubscribe = null;

        /* in-game leaderboard popup */
        this._leaderboardUnsub = null;

        /* word definitions state */
        this._defBannerTimer = null;
        this.foundDefinitions = {};

        /* live sync heartbeat */
        this._heartbeat = null;

        /* play-history session guard (records each round only once) */
        this._sessionRecorded = false;
    }

    /* ── PROGRESSIVE DIFFICULTY LEVELLING ───── */
    _loadPlayerLevel() {
        const key = this._getPlayerKey();
        try {
            const stored = localStorage.getItem('wordQuest_level_' + key);
            this.level = Math.max(1, parseInt(stored || '1', 10) || 1);
        } catch (e) {
            this.level = 1;
        }
    }

    /** Read the persisted level without overwriting this.level (for comparisons). */
    _readLocalLevel() {
        const key = this._getPlayerKey();
        try {
            const stored = localStorage.getItem('wordQuest_level_' + key);
            return Math.max(1, parseInt(stored || '1', 10) || 1);
        } catch (e) {
            return 1;
        }
    }

    _incrementPlayerLevel() {
        const key = this._getPlayerKey();
        this.level += 1;
        try {
            localStorage.setItem('wordQuest_level_' + key, String(this.level));
        } catch (e) {}
        this._syncLevelToFirestore();
    }

    _applyDifficulty() {
        const lvl = this.level;
        // Fixed 5-minute timer on every level — the clock never shrinks,
        // so each next level always feels winnable. Only words & grid grow.
        const timerSecs = 300;

        // +1 word per level (soft cap at 24 so the grid stays readable on phones)
        const count = Math.min(24, 8 + (lvl - 1));

        // Grid grows by 1 cell every 2 levels (soft cap at 20×20)
        const size = Math.min(20, 12 + Math.floor((lvl - 1) / 2));

        // Steady, generous score multiplier — higher levels are worth the grind
        const mult = 1.0 + (lvl - 1) * 0.1;

        // Directions: easy start, then everything is available from L3 on
        let dirs = [
            [1, 0],  // right
            [0, 1],  // down
            [1, 1]   // diagonal down-right
        ];
        if (lvl === 2) {
            dirs = [
                [1, 0], [0, 1], [1, 1],
                [-1, 0], [0, -1] // + reverse horizontal & vertical
            ];
        } else if (lvl >= 3) {
            dirs = [
                [1, 0], [0, 1], [1, 1], [-1, 1],
                [-1, 0], [0, -1], [1, -1], [-1, -1] // all 8 directions
            ];
        }

        let title = 'Novice';
        if (lvl === 2)          title = 'Apprentice';
        else if (lvl === 3)     title = 'Scholar';
        else if (lvl === 4)     title = 'Master';
        else if (lvl >= 5)      title = `Grandmaster Lvl ${lvl}`;

        this.gridSize        = size;
        this.wordCount       = count;
        this.gameSecs        = timerSecs;
        this._remaining      = timerSecs;
        this.directions      = dirs;
        this.useSmartGarbage = lvl >= 2;
        this.levelTitle      = title;
        this.levelMultiplier = mult;
    }

    /* ── BOOT ─────────────────────────────────── */
    async init() {
        // Reset per-game state
        this.grid       = [];
        this.placed     = {};
        this.foundWords = new Set();
        this.score      = 0;
        this.selecting  = false;
        this.selStart   = null;
        this.selCells   = [];
        this.foundDefinitions = {};
        this.hideDefinitionBanner();
        document.getElementById('end-definitions-summary')?.classList.add('hidden');

        // Rehydrate cumulative score / level from Firestore (source of truth across devices)
        await this._restoreProgressFromFirestore();

        this._sessionRecorded = false;

        this._loadUsedWords();
        this._loadPlayerLevel();
        this._applyDifficulty();
        this._loadCumulativeScore();
        this._displayPlayerBadge();
        this._pickWords();
        this._buildGrid();
        this._placeWords();
        this._fillGarbage();
        this._renderGrid();
        this._renderWordList();
        this._bindEvents();
        this._startTimer();
        this._updateHUD();
        this._renderHistory();
        this._registerActiveGame();
        this._listenForGameState(); // 🔴 Real-time admin end-game kick
        this._listenForAdminMessages(); // 📨 Real-time admin message popup

        // Load custom word bank from Firestore (for next game or restart)
        this._loadWordBankFromFirebase();
    }

    restart() {
        this._unregisterActiveGame();
        this._stopTimer();
        document.getElementById('overlay-end')?.classList.add('hidden');
        document.getElementById('reopen-overlay-btn')?.classList.add('hidden');

        // reset state (keep cumulative)
        this.grid       = [];
        this.placed     = {};
        this.foundWords = new Set();
        this.score      = 0;
        this.selecting  = false;
        this.selStart   = null;
        this.selCells   = [];
        this.foundDefinitions = {};
        this.hideDefinitionBanner();
        document.getElementById('end-definitions-summary')?.classList.add('hidden');

        this._sessionRecorded = false;

        this._loadUsedWords();
        this._loadPlayerLevel();
        this._applyDifficulty();

        this._pickWords();
        this._buildGrid();
        this._placeWords();
        this._fillGarbage();
        this._renderGrid();
        this._renderWordList();
        this._bindEvents();
        this._startTimer();
        this._updateHUD();
        this._renderHistory();
        this._registerActiveGame();
        this._listenForGameState();
        this._listenForAdminMessages();
    }

    /* ── FIREBASE ACTIVE GAME & LEVEL TRACKING ─── */
    _registerActiveGame() {
        if (window.WordQuestFirebase && window.WordQuestFirebase.registerActiveGame) {
            window.WordQuestFirebase.registerActiveGame({
                level: this.level,
                levelTitle: this.levelTitle,
                score: this.score,
                cumulativeScore: this.cumulativeScore
            });
        }
        this._syncLiveGrid();
        this._startLiveHeartbeat();
    }

    _syncLevelToFirestore(bankRound = true) {
        if (window.WordQuestFirebase && window.WordQuestFirebase.updatePlayerLevelInFirestore) {
            window.WordQuestFirebase.updatePlayerLevelInFirestore({
                level: this.level,
                levelTitle: this.levelTitle,
                score: bankRound ? this.score : 0,
                cumulativeScore: bankRound ? (this.cumulativeScore + this.score) : this.cumulativeScore
            });
        }
    }

    _syncLiveGrid() {
        if (window.WordQuestFirebase && window.WordQuestFirebase.syncLiveGridToFirestore) {
            window.WordQuestFirebase.syncLiveGridToFirestore({
                grid: this.grid,
                words: this.words,
                placed: this.placed,
                foundWords: Array.from(this.foundWords),
                gridSize: this.gridSize,
                remainingSeconds: this._remaining,
                score: this.score,
                level: this.level,
                levelTitle: this.levelTitle
            });
        }
    }

    _unregisterActiveGame() {
        this._stopLiveHeartbeat();
        if (window.WordQuestFirebase && window.WordQuestFirebase.unregisterActiveGame) {
            window.WordQuestFirebase.unregisterActiveGame();
        }
    }

    /* ── PLAY HISTORY SESSION RECORDING ───────────
       Every round (win / timeout / abandoned) uploads a lightweight session
       record that the admin panel aggregates to show each player's play
       history: games played, total time spent, best round and last played.
       Guarded so each round emits exactly one record (level ups, admin
       messages, pagehide + beforeunload double-fires are all safe). */
    _recordSession(result, levelOverride) {
        if (this._sessionRecorded) return;
        this._sessionRecorded = true;

        // Never record a session that never actually began (e.g. the player
        // left during boot or while the admin's game-ended screen was showing).
        if (!Array.isArray(this.grid) || this.grid.length === 0) return;

        // Time actually spent this round = countdown consumed (excludes
        // admin-message pause time since the timer halts while paused).
        const timePlayedSecs = Math.min(this.gameSecs, Math.max(0, this.gameSecs - this._remaining));

        const name       = localStorage.getItem('wordQuest_playerName')       || 'Player';
        const rollNumber = localStorage.getItem('wordQuest_rollNumber')       || '';
        const department = localStorage.getItem('wordQuest_department')        || '';
        const year       = localStorage.getItem('wordQuest_yearOfStudy')       || '';
        if (!rollNumber) return; // only players with a registered profile

        const session = {
            id: this._getPlayerKey(),
            name,
            rollNumber,
            department,
            year,
            level: typeof levelOverride === 'number' ? levelOverride : this.level,
            levelTitle: this.levelTitle,
            score: this.score,
            cumulativeScore: this.cumulativeScore,
            wordsFound: this.foundWords.size,
            totalWords: this.words.length,
            timePlayedSecs,
            result
        };

        if (window.WordQuestFirebase && window.WordQuestFirebase.recordPlaySession) {
            window.WordQuestFirebase.recordPlaySession(session).catch(() => {});
        }
        console.log('Play session recorded:', result, rollNumber, timePlayedSecs + 's');
    }

    // Keep live grid / active status fresh so admins see the player as LIVE even while idle
    _startLiveHeartbeat() {
        this._stopLiveHeartbeat();
        this._heartbeat = setInterval(() => {
            if (window.WordQuestFirebase && window.WordQuestFirebase.syncLiveGridToFirestore) {
                window.WordQuestFirebase.syncLiveGridToFirestore({
                    grid: this.grid,
                    words: this.words,
                    placed: this.placed,
                    foundWords: Array.from(this.foundWords),
                    gridSize: this.gridSize,
                    remainingSeconds: this._remaining,
                    score: this.score,
                    level: this.level,
                    levelTitle: this.levelTitle
                });
            }
        }, 15000);
    }

    _stopLiveHeartbeat() {
        if (this._heartbeat) {
            clearInterval(this._heartbeat);
            this._heartbeat = null;
        }
    }

    _listenForGameState() {
        if (window.WordQuestFirebase && window.WordQuestFirebase.subscribeToGameState) {
            window.WordQuestFirebase.subscribeToGameState((isActive) => {
                if (!isActive) {
                    this._stopTimer();
                    this._recordSession('ended');
                    this._unregisterActiveGame();
                    this._showGameEndedScreen();
                }
            });
        }
    }

    /* Live "Game Ended by Admin" screen shown to all active players in real time. */
    _showGameEndedScreen() {
        const overlay = document.getElementById('ended-overlay');
        if (!overlay) return;

        const roundEl = document.getElementById('ended-round-score');
        if (roundEl) roundEl.textContent = this.score;
        const cumEl = document.getElementById('ended-cumulative-score');
        if (cumEl) cumEl.textContent = this.cumulativeScore;

        // Close any competing overlays / popups so the screen is unmissable
        document.getElementById('overlay-end')?.classList.add('hidden');
        document.getElementById('reopen-overlay-btn')?.classList.add('hidden');
        document.getElementById('admin-msg-overlay')?.classList.add('hidden');

        SFX.playEnding();
        this._startEndedConfetti();
        overlay.classList.remove('hidden');
    }

    /* Soft canvas confetti that adds a "wrap-up celebration" feel. */
    _startEndedConfetti() {
        const canvas = document.getElementById('ended-confetti');
        if (!canvas) return;
        if (this._endedConfettiCleanup) this._endedConfettiCleanup();

        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let W = 0, H = 0;
        const resize = () => {
            W = window.innerWidth;
            H = window.innerHeight;
            canvas.width = W * dpr;
            canvas.height = H * dpr;
            canvas.style.width = W + 'px';
            canvas.style.height = H + 'px';
        };
        resize();
        window.addEventListener('resize', resize);

        const COLORS = ['#f7c948', '#d97706', '#f59e0b', '#ffffff', '#fbbf24', '#fb923c', '#fef3c7'];
        const pieces = [];
        const count = Math.min(150, Math.max(80, Math.round(W / 8)));

        const spawn = () => {
            pieces.push({
                x: Math.random() * W,
                y: -20 - Math.random() * 60,
                w: 6 + Math.random() * 7,
                h: 10 + Math.random() * 9,
                color: COLORS[(Math.random() * COLORS.length) | 0],
                vy: 2.4 + Math.random() * 2.6,
                vx: (Math.random() - 0.5) * 1.4,
                sway: Math.random() * Math.PI * 2,
                swaySpeed: 0.02 + Math.random() * 0.05,
                swayAmp: 0.6 + Math.random() * 1.4,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.22
            });
        };

        for (let i = 0; i < count; i++) spawn();

        const started = Date.now();
        const DURATION = 12000;
        let raf = null;

        const tick = () => {
            const elapsed = Date.now() - started;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(dpr, dpr);

            const alpha = elapsed > DURATION - 1500 ? Math.max(0, (DURATION - elapsed) / 1500) : 1;

            for (let i = pieces.length - 1; i >= 0; i--) {
                const p = pieces[i];
                p.sway += p.swaySpeed;
                p.x += p.vx + Math.sin(p.sway) * p.swayAmp * 0.5;
                p.y += p.vy;
                p.rot += p.rotSpeed;

                if (p.y > H + 40) { pieces.splice(i, 1); continue; }

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            }

            if (elapsed < DURATION && pieces.length < count * 0.8) spawn();

            ctx.restore();

            if (elapsed < DURATION) {
                raf = requestAnimationFrame(tick);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                this._endedConfettiCleanup = null;
            }
        };
        raf = requestAnimationFrame(tick);

        this._endedConfettiCleanup = () => {
            if (raf) cancelAnimationFrame(raf);
            raf = null;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            window.removeEventListener('resize', resize);
        };
    }

    goToMainMenu() {
        window.location.href = 'index.html';
    }

    /* ── IN-GAME LEADERBOARD POPUP ─────────────────
       Opens a non-redirecting leaderboard modal inside game.html using the
       same Firestore real-time data the admin panel + index page consume. */
    openLeaderboard() {
        const overlay = document.getElementById('leaderboard-overlay');
        if (!overlay) return;

        // Render immediately from cached data, then subscribe for live updates
        this._renderLeaderboardRows();

        if (this._leaderboardUnsub) { this._leaderboardUnsub(); this._leaderboardUnsub = null; }
        if (window.WordQuestFirebase && window.WordQuestFirebase.subscribeToLeaderboard) {
            this._leaderboardUnsub = window.WordQuestFirebase.subscribeToLeaderboard((list) => {
                if (Array.isArray(list)) this._renderLeaderboardRows(list);
            });
        }

        // Backdrop click closes (guard so the listener only binds once)
        if (!this._leaderboardBackdropBound) {
            this._leaderboardBackdropBound = true;
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.closeLeaderboard();
            });
        }

        overlay.classList.remove('hidden');
    }

    closeLeaderboard() {
        const overlay = document.getElementById('leaderboard-overlay');
        if (overlay) overlay.classList.add('hidden');
        if (this._leaderboardUnsub) {
            this._leaderboardUnsub();
            this._leaderboardUnsub = null;
        }
    }

    _renderLeaderboardRows(list) {
        const container = document.getElementById('game-lb-list');
        if (!container) return;

        let arr;
        try {
            arr = (list && Array.isArray(list))
                ? list
                : JSON.parse(localStorage.getItem('wordQuest_leaderboard') || '[]');
        } catch (e) {
            arr = [];
        }

        if (arr.length === 0) {
            container.innerHTML = '<div class="lb-empty">No scores yet! Be the first to play.</div>';
            return;
        }

        const myRoll = localStorage.getItem('wordQuest_rollNumber') || '';
        const total = (r) => Math.max(Number(r.cumulativeScore) || 0, Number(r.score) || 0);
        const seen = new Set();
        const deduped = [];
        arr.forEach((item) => {
            const key = item.id || item.rollNumber || null;
            if (key !== null && seen.has(key)) return;
            if (key !== null) seen.add(key);
            deduped.push(item);
        });
        deduped.sort((a, b) => total(b) - total(a));

        const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
            c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

        const top = deduped.slice(0, 10);
        container.innerHTML = top.map((item, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank);
            const dept = (item.department || '').replace('Department of ', '') || '—';
            const isMe = myRoll && String(item.rollNumber) === String(myRoll);
            return `
                <div class="lb-row ${isMe ? 'lb-row-me' : ''}">
                    <span class="lb-rank">${medal}</span>
                    <span class="lb-name">${esc(item.name || 'Anonymous')}</span>
                    <span class="lb-dept">${esc(dept)}</span>
                    <span class="lb-score">${total(item)}</span>
                </div>`;
        }).join('');

        if (container.scrollTop) container.scrollTop = 0;
    }

    /* ── ADMIN MESSAGE POPUP ─────────────────────
       Live admin → player messaging. A new message pauses the timer,
       the popup blocks play, and closing the popup resumes the timer. */
    _listenForAdminMessages() {
        if (this._msgUnsubscribe) {
            this._msgUnsubscribe();
            this._msgUnsubscribe = null;
        }
        const playerId = localStorage.getItem('wordQuest_playerFirestoreId');
        if (!playerId || !window.WordQuestFirebase || !window.WordQuestFirebase.subscribeToPlayerMessages) {
            return;
        }
        let lastMsgId = null;
        this._msgUnsubscribe = window.WordQuestFirebase.subscribeToPlayerMessages(playerId, (msg) => {
            if (!msg || !msg.text) return;
            const msgId = (msg.sentAt && (msg.sentAt.toMillis ? msg.sentAt.toMillis() : String(msg.sentAt))) + '|' + msg.text;
            if (msgId === lastMsgId) return;   // ignore re-snapshot of same message
            if (msg.read) return;
            lastMsgId = msgId;
            this._showAdminMessage(msg.text);
        });
    }

    _showAdminMessage(text) {
        const overlay = document.getElementById('admin-msg-overlay');
        const bodyEl = document.getElementById('admin-msg-body');
        if (bodyEl) bodyEl.textContent = text;
        if (overlay) overlay.classList.remove('hidden');

        // Pause the countdown so the message does not eat into the player's time
        if (this._timer || this._timerPaused) this._pauseTimer();
        if (window.SFX) { try { SFX.playCorrect(); } catch (e) {} }
    }

    closeAdminMessage() {
        const overlay = document.getElementById('admin-msg-overlay');
        if (overlay) overlay.classList.add('hidden');

        const playerId = localStorage.getItem('wordQuest_playerFirestoreId');
        if (window.WordQuestFirebase && window.WordQuestFirebase.acknowledgePlayerMessage && playerId) {
            window.WordQuestFirebase.acknowledgePlayerMessage(playerId);
        }

        // Resume the countdown exactly where it was paused
        this._resumeTimer();
    }

    /* ── WORD BANK FROM FIREBASE ───────────────── */
    _loadWordBankFromFirebase() {
        if (window.WordQuestFirebase && window.WordQuestFirebase.getWordBankFromFirestore) {
            window.WordQuestFirebase.getWordBankFromFirestore().then((remoteWords) => {
                if (Array.isArray(remoteWords) && remoteWords.length >= WORD_COUNT) {
                    try {
                        localStorage.setItem('wordQuest_customWords', JSON.stringify(remoteWords));
                    } catch (e) { /* noop */ }
                }
            }).catch(() => { /* fallback to localStorage already done */ });
        }
    }

    _getPlayerKey() {
        const roll = localStorage.getItem('wordQuest_rollNumber') || '';
        const dept = localStorage.getItem('wordQuest_department') || '';
        const year = localStorage.getItem('wordQuest_yearOfStudy') || '';
        if (roll && dept && year) {
            return `${roll}|${dept}|${year}`;
        }
        return roll || 'anonymous';
    }

    /* Words already shown to this player are persisted per player so they never
       repeat across levels. Keyed by player so each player has their own history. */
    _getUsedWordsKey() {
        return 'wordQuest_usedWords_' + this._getPlayerKey();
    }

    _loadUsedWords() {
        try {
            const raw = localStorage.getItem(this._getUsedWordsKey());
            const parsed = JSON.parse(raw || '[]');
            this.usedWords = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            this.usedWords = [];
        }
    }

    _saveUsedWords() {
        try {
            localStorage.setItem(this._getUsedWordsKey(), JSON.stringify(this.usedWords));
        } catch (e) { /* noop */ }
    }

    _markWordsUsed(words) {
        if (!Array.isArray(words)) return;
        let changed = false;
        for (const w of words) {
            if (w && !this.usedWords.includes(w)) {
                this.usedWords.push(w);
                changed = true;
            }
        }
        if (changed) this._saveUsedWords();
    }

    /* Pull the player's cumulative score / level from Firestore at boot so a player
       who registered on another device doesn't start at zero. Falls back to 0 quietly. */
    async _restoreProgressFromFirestore() {
        const roll = localStorage.getItem('wordQuest_rollNumber') || '';
        const dept = localStorage.getItem('wordQuest_department') || '';
        const year = localStorage.getItem('wordQuest_yearOfStudy') || '';
        const fb = window.WordQuestFirebase;
        if (!fb || !roll || !dept || !year) return;

        // Guard against a hung Firestore request so the game never stalls on load
        const timeout = new Promise((res) => setTimeout(() => res(null), 2500));

        try {
            // 1. Player doc — has currentLevel + cumulativeScore (may be stale/0)
            if (fb.getPlayerByRollNumber) {
                const lookup = fb.getPlayerByRollNumber(roll, dept, year).catch(() => null);
                const player = await Promise.race([lookup, timeout]);
                if (player) {
                    const lvl = Number(player.currentLevel) || 1;
                    // Take the highest known level — a stale Firestore value must
                    // never drag a player's locally-achieved progress backwards.
                    const localLvl = this._readLocalLevel();
                    if (lvl > 1 && lvl >= localLvl) {
                        this.level = lvl;
                        localStorage.setItem('wordQuest_level_' + this._getPlayerKey(), String(lvl));
                    }
                    this._applyCumulativeScore(Number(player.cumulativeScore) || 0, roll);
                }
            }

            // 2. cumulativeScores collection — authoritative running total (fallback if players doc was 0)
            if (this.cumulativeScore <= 0 && fb.getCumulativeScoreFromFirestore) {
                const lookup = fb.getCumulativeScoreFromFirestore(roll, dept, year).catch(() => 0);
                const cum = await Promise.race([lookup, timeout]);
                if (cum > 0) this._applyCumulativeScore(cum, roll);
            }
        } catch (e) { /* noop */ }
    }

    _applyCumulativeScore(cum, roll) {
        if (!(cum > 0)) return;
        this.cumulativeScore = cum;
        const key = this._getPlayerKey();
        try {
            localStorage.setItem('wordQuest_cumulative_' + key, String(cum));
            if (roll) localStorage.setItem('wordQuest_cumulative_' + roll, String(cum));
        } catch (e) { /* noop */ }
    }

    _loadCumulativeScore() {
        const key = this._getPlayerKey();
        const roll = localStorage.getItem('wordQuest_rollNumber') || '';
        try {
            const val = localStorage.getItem('wordQuest_cumulative_' + key) || (roll ? localStorage.getItem('wordQuest_cumulative_' + roll) : null);
            this.cumulativeScore = parseInt(val || '0', 10) || 0;
        } catch (e) {
            this.cumulativeScore = 0;
        }
        const historyEl = document.getElementById('cumulative-score');
        if (historyEl) historyEl.textContent = this.cumulativeScore;
    }

    _saveCumulativeScore() {
        const key = this._getPlayerKey();
        const roll = localStorage.getItem('wordQuest_rollNumber') || '';
        try {
            localStorage.setItem('wordQuest_cumulative_' + key, String(this.cumulativeScore));
            if (roll) localStorage.setItem('wordQuest_cumulative_' + roll, String(this.cumulativeScore));
        } catch (e) { /* noop */ }
    }

    _renderHistory() {
        const container = document.getElementById('history-list');
        if (!container) return;
        const roll = localStorage.getItem('wordQuest_rollNumber') || '';
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('wordQuest_history_' + roll) || '[]');
        } catch (e) { history = []; }

        container.innerHTML = '';
        if (history.length === 0) {
            container.innerHTML = '<div class="history-empty">No games played yet</div>';
            return;
        }
        history.slice().reverse().forEach((entry, i) => {
            const div = document.createElement('div');
            div.className = 'history-row';
            div.innerHTML = `<span class="history-game">#${history.length - i}</span><span class="history-score">${entry.score}</span><span class="history-date">${entry.date}</span>`;
            container.appendChild(div);
        });
    }

    _pickWords() {
        let pool = WORD_BANK;
        try {
            const custom = JSON.parse(localStorage.getItem('wordQuest_customWords') || '[]');
            if (Array.isArray(custom) && custom.length >= this.wordCount) {
                pool = custom;
            }
        } catch (e) {
            pool = WORD_BANK;
        }
        this.candidatePool = [...pool];
    }

    /* ── GRID GENERATION ──────────────────────── */
    _buildGrid() {
        this.grid = Array.from({ length: this.gridSize }, () =>
            Array(this.gridSize).fill(''));
    }

    _placeWords() {
        this.placed = {};
        const placedWords = [];

        // Exclude words already shown to this player in earlier rounds,
        // and strictly filter by w.length <= this.gridSize so words always fit the grid.
        const validCandidates = (this.candidatePool || WORD_BANK).filter(w => w && w.length <= this.gridSize);
        let unusedPool = validCandidates.filter(w => !this.usedWords.includes(w));
        if (unusedPool.length < this.wordCount) unusedPool = [...validCandidates];
        const pool = unusedPool.sort(() => Math.random() - 0.5);

        for (const word of pool) {
            if (placedWords.length >= this.wordCount) break;
            if (this._placeOne(word)) {
                placedWords.push(word);
            }
        }

        // If pool was exhausted before reaching this.wordCount, retry with default WORD_BANK fallback (filtered by gridSize)
        if (placedWords.length < this.wordCount) {
            const validBank = WORD_BANK.filter(w => w && w.length <= this.gridSize);
            let fallback = validBank.filter(w => !placedWords.includes(w) && !this.usedWords.includes(w));
            if (fallback.length < (this.wordCount - placedWords.length)) fallback = validBank.filter(w => !placedWords.includes(w));
            const fallbackPool = fallback.sort(() => Math.random() - 0.5);
            for (const word of fallbackPool) {
                if (placedWords.length >= this.wordCount) break;
                if (!placedWords.includes(word) && this._placeOne(word)) {
                    placedWords.push(word);
                }
            }
        }

        this.words = placedWords;
        this._markWordsUsed(placedWords); // these words are now "shown" — never reuse for this player
    }

    _placeOne(word) {
        const len = word.length;
        if (len > this.gridSize) return false;

        let attempts = 0;
        const directions = [...this.directions].sort(() => Math.random() - 0.5);

        while (attempts < 500) {
            attempts++;

            const [dx, dy] = directions[Math.floor(Math.random() * directions.length)];

            // Starting row bounds for direction dy
            let minR = 0;
            let maxR = this.gridSize - 1;
            if (dy > 0) {
                maxR = this.gridSize - len;
            } else if (dy < 0) {
                minR = len - 1;
            }

            // Starting column bounds for direction dx
            let minC = 0;
            let maxC = this.gridSize - 1;
            if (dx > 0) {
                maxC = this.gridSize - len;
            } else if (dx < 0) {
                minC = len - 1;
            }

            const r = Math.floor(Math.random() * (maxR - minR + 1)) + minR;
            const c = Math.floor(Math.random() * (maxC - minC + 1)) + minC;

            let ok = true;
            const cells = [];
            for (let i = 0; i < len; i++) {
                const nr = r + dy * i;
                const nc = c + dx * i;
                if (nr < 0 || nr >= this.gridSize || nc < 0 || nc >= this.gridSize) {
                    ok = false;
                    break;
                }
                if (this.grid[nr][nc] !== '' && this.grid[nr][nc] !== word[i]) {
                    ok = false;
                    break;
                }
                cells.push({ r: nr, c: nc });
            }

            if (ok) {
                cells.forEach(({ r, c }, i) => { this.grid[r][c] = word[i]; });
                this.placed[word] = cells;
                return true;
            }
        }
        return false;
    }

    _fillGarbage() {
        const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let wordLetterPool = [];
        if (this.useSmartGarbage && this.words && this.words.length > 0) {
            wordLetterPool = this.words.join('').split('');
        }

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] === '') {
                    if (wordLetterPool.length > 0 && Math.random() < 0.65) {
                        // 65% chance to pick distractor letter from target words for tricky near-matches!
                        this.grid[r][c] = wordLetterPool[Math.floor(Math.random() * wordLetterPool.length)];
                    } else {
                        this.grid[r][c] = alpha[Math.floor(Math.random() * 26)];
                    }
                }
            }
        }
    }

    /* ── RENDER GRID ──────────────────────────── */
    _renderGrid() {
        const gridEl = document.getElementById('grid');
        if (!gridEl) return;

        gridEl.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;
        gridEl.innerHTML = '';

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.textContent = this.grid[r][c];
                cell.dataset.r = r;
                cell.dataset.c = c;
                gridEl.appendChild(cell);
            }
        }
    }

    /* ── RENDER WORD LIST ─────────────────────── */
    _renderWordList() {
        const listEl = document.getElementById('word-list');
        if (!listEl) return;
        listEl.innerHTML = (this.words || []).map(w => {
            const display = window.formatWordForDisplay ? window.formatWordForDisplay(w) : w;
            return `<li id="word-${w}">${display}</li>`;
        }).join('');
        this._updateHUD();
    }

    /* ── EVENT BINDING (mouse + touch) ───────── */
    _bindEvents() {
        if (this.eventsBound) return;
        this.eventsBound = true;

        const gridEl = document.getElementById('grid');
        if (!gridEl) return;

        // ── Mouse ──────────────────────────────
        gridEl.addEventListener('mousedown', e => {
            SFX.unlock();
            const cell = e.target.closest('.cell');
            if (!cell) return;
            e.preventDefault();
            this.selecting = true;
            this.selStart  = { r: +cell.dataset.r, c: +cell.dataset.c };
            this._highlightFrom(this.selStart, this.selStart);
        });

        gridEl.addEventListener('mousemove', e => {
            if (!this.selecting) return;
            const cell = e.target.closest('.cell');
            if (!cell) return;
            this._highlightFrom(this.selStart, { r: +cell.dataset.r, c: +cell.dataset.c });
        });

        document.addEventListener('mouseup', () => {
            if (!this.selecting) return;
            this.selecting = false;
            this._checkSelection();
        });

        // ── Touch ──────────────────────────────
        gridEl.addEventListener('touchstart', e => {
            SFX.unlock();
            const touch = e.touches[0];
            const cell  = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.cell');
            if (!cell) return;
            e.preventDefault();
            this.selecting = true;
            this.selStart  = { r: +cell.dataset.r, c: +cell.dataset.c };
            this._highlightFrom(this.selStart, this.selStart);
        }, { passive: false });

        gridEl.addEventListener('touchmove', e => {
            if (!this.selecting) return;
            e.preventDefault();
            const touch = e.touches[0];
            const cell  = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.cell');
            if (!cell) return;
            this._highlightFrom(this.selStart, { r: +cell.dataset.r, c: +cell.dataset.c });
        }, { passive: false });

        gridEl.addEventListener('touchend', () => {
            if (!this.selecting) return;
            this.selecting = false;
            this._checkSelection();
        });

        // ── Sound toggle ─────────────────────────
        const sndBtn = document.getElementById('sound-toggle-btn');
        if (sndBtn) {
            const syncIcons = () => {
                const muted = SFX.isMuted;
                sndBtn.classList.toggle('muted', muted);
                const on  = document.getElementById('sound-icon-on');
                const off = document.getElementById('sound-icon-off');
                if (on)  on.classList.toggle('hidden', muted);
                if (off) off.classList.toggle('hidden', !muted);
            };
            syncIcons();
            sndBtn.addEventListener('click', () => {
                SFX.unlock();
                const muted = SFX.toggle();
                syncIcons();
                this._toast(muted ? 'Sound off' : 'Sound on', 1200);
            });
        }
    }

    /* ── SELECTION LOGIC ──────────────────────── */

    /**
     * Highlight a straight line from start → end.
     * Only horizontal, vertical, or exact diagonal allowed.
     */
    _highlightFrom(start, end) {
        // clear previous temp highlights (not found cells)
        this.selCells.forEach(({ r, c }) => {
            const el = this._cellEl(r, c);
            if (el && !el.classList.contains('found')) {
                el.classList.remove('selecting');
            }
        });
        this.selCells = [];

        const dr = end.r - start.r;
        const dc = end.c - start.c;

        // must be straight line
        if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return;

        if (Math.max(Math.abs(dr), Math.abs(dc)) > 0) SFX.playSelect();

        const steps = Math.max(Math.abs(dr), Math.abs(dc));
        const stepR = steps === 0 ? 0 : dr / steps;
        const stepC = steps === 0 ? 0 : dc / steps;

        for (let i = 0; i <= steps; i++) {
            const r = start.r + Math.round(stepR * i);
            const c = start.c + Math.round(stepC * i);
            this.selCells.push({ r, c });
            const el = this._cellEl(r, c);
            if (el && !el.classList.contains('found')) {
                el.classList.add('selecting');
            }
        }
    }

    /** After mouse-up, check if the selection spells a hidden word. */
    _checkSelection() {
        const word = this.selCells.map(({ r, c }) => this.grid[r][c]).join('');
        const rev  = word.split('').reverse().join('');

        let matched = null;
        if (this.words.includes(word) && !this.foundWords.has(word)) matched = word;
        if (this.words.includes(rev)  && !this.foundWords.has(rev))  matched = rev;

        // clear selection highlight
        this.selCells.forEach(({ r, c }) => {
            this._cellEl(r, c)?.classList.remove('selecting');
        });

        if (matched) {
            SFX.playCorrect();
            this._markFound(matched);
        } else if (this.selCells.length >= 2) {
            SFX.playWrong();
        }

        this.selStart = null;
        this.selCells = [];
    }

    /** Mark a word as found — colour its cells and strike it in the list. */
    _markFound(word) {
        this.foundWords.add(word);
        this.score += PTS_WORD;

        // Colour cells using the placed map
        const cells = this.placed[word] || [];
        cells.forEach(({ r, c }) => {
            const el = this._cellEl(r, c);
            if (el) { el.classList.remove('selecting'); el.classList.add('found'); }
        });

        // Score pop near first cell of word
        if (cells.length > 0) {
            const firstEl = this._cellEl(cells[0].r, cells[0].c);
            if (firstEl) this._scorePop(`+${PTS_WORD}`, firstEl);
        }

        // Strike word in list
        const li = document.getElementById(`word-${word}`);
        if (li) {
            li.classList.add('found-word');
            li.setAttribute('title', 'Click to view word meaning');
            li.onclick = () => this._showDefinitionBanner(word);
        }

        this._updateHUD();
        this._toast(`✓ Found: ${word}`, 1400);
        this._showDefinitionBanner(word);
        this._saveLiveProgress(); // ⚡ Instantly update Firestore leaderboard when a word is found!
        this._syncLiveGrid();     // ⚡ Sync live 2D grid matrix to Firestore for admin spectators!

        // All found?
        if (this.foundWords.size === this.words.length) {
            this._win();
        }
    }

    /* ── WORD DEFINITION BANNER & SUMMARY ─────── */
    async _showDefinitionBanner(word) {
        if (!word) return;
        const banner = document.getElementById('definition-banner');
        if (!banner) return;

        const wordEl = document.getElementById('def-banner-word');
        const textEl = document.getElementById('def-banner-text');

        const defData = window.getWordDefinition ? await window.getWordDefinition(word) : { wordDisplay: word, definition: 'A featured term in Word Quest.' };
        this.foundDefinitions[word] = defData;

        if (wordEl) wordEl.textContent = defData.wordDisplay;
        if (textEl) textEl.textContent = defData.definition;

        banner.classList.remove('hidden');
        banner.style.animation = 'none';
        banner.offsetHeight; // trigger reflow
        banner.style.animation = 'defBannerSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';

        if (this._defBannerTimer) clearTimeout(this._defBannerTimer);
        this._defBannerTimer = setTimeout(() => {
            this.hideDefinitionBanner();
        }, 5500);
    }

    hideDefinitionBanner() {
        const banner = document.getElementById('definition-banner');
        if (banner) banner.classList.add('hidden');
        if (this._defBannerTimer) {
            clearTimeout(this._defBannerTimer);
            this._defBannerTimer = null;
        }
    }

    async _renderEndDefinitionsSummary() {
        const wrap = document.getElementById('end-definitions-summary');
        const listEl = document.getElementById('end-defs-list');
        if (!wrap || !listEl) return;

        listEl.innerHTML = '';
        const wordsToReview = this.foundWords.size > 0 ? Array.from(this.foundWords) : this.words;

        for (const w of wordsToReview) {
            const defData = this.foundDefinitions[w] || (window.getWordDefinition ? await window.getWordDefinition(w) : { wordDisplay: w, definition: 'A featured term in Word Quest.' });
            const item = document.createElement('div');
            item.className = 'end-def-item';
            item.innerHTML = `
                <div class="end-def-word">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 5px; color: var(--accent-gold);">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                    <span>${defData.wordDisplay}</span>
                </div>
                <p class="end-def-meaning">${defData.definition}</p>
            `;
            listEl.appendChild(item);
        }

        wrap.classList.remove('hidden');
    }

    /* ── HUD UPDATE ───────────────────────────── */
    _updateHUD() {
        const found = document.getElementById('found-count');
        const score = document.getElementById('score-val');
        const levelVal = document.getElementById('level-val');
        if (found) found.textContent = `${this.foundWords.size} / ${this.words.length}`;
        if (score) score.textContent = this.score;
        if (levelVal) levelVal.textContent = `Lvl ${this.level}`;
        const cumEl = document.getElementById('cumulative-score');
        if (cumEl) cumEl.textContent = this.cumulativeScore;
    }

    /* ── TIMER ────────────────────────────────── */
    _startTimer() {
        this._renderTimer();
        this._timer = setInterval(() => {
            this._remaining = Math.max(0, this._remaining - 1);
            this._renderTimer();

            if (this._remaining === 30) { this._toast('30 seconds remaining!', 1600); SFX.playTick(); }
            if (this._remaining <= 5 && this._remaining > 0) { SFX.playTick(); }
            if (this._remaining <= 0) {
                this._stopTimer();
                this._timeUp();
            }
        }, 1000);
    }

    _stopTimer() {
        clearInterval(this._timer);
        this._timer = null;
    }

    /* Pause the countdown without ending the game (used by the admin-message popup).
       The timer resumes where it left off when the popup closes. */
    _pauseTimer() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
            this._timerPaused = true;
            this._renderTimer();
        }
    }

    _resumeTimer() {
        if (this._timerPaused && this._remaining > 0 && !this._timer) {
            this._timerPaused = false;
            this._startTimer();
        } else {
            this._timerPaused = false;
        }
    }

    _renderTimer() {
        const m   = Math.floor(this._remaining / 60);
        const s   = this._remaining % 60;
        const str = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        const pct = this._remaining / this.gameSecs;
        const isDanger = pct < 0.25;

        const timerEl = document.getElementById('timer-val');
        if (timerEl) {
            timerEl.textContent = str;
            timerEl.classList.toggle('danger', isDanger);
        }

        // Timer capsule danger state
        const timerCapsule = document.getElementById('timer-capsule');
        if (timerCapsule) timerCapsule.classList.toggle('danger', isDanger);

        // Rail fill
        const fillEl = document.getElementById('timer-bar-fill');
        if (fillEl) {
            fillEl.style.width = `${pct * 100}%`;
            fillEl.classList.toggle('danger', isDanger);
        }
    }

    /* ── SPEED BONUS CALCULATION ───────────────── */
    _calculateSpeedBonus() {
        const remaining = this._remaining;
        if (remaining <= 0) return { totalBonus: 0, timeBonus: 0, speedTierBonus: 0, tierName: '' };

        // Base time bonus: 2 points per unused second (scaled by Level Multiplier)
        const timeBonus = Math.round(remaining * 2 * this.levelMultiplier);

        // Speed tier bonus based on completion time ratio
        const timeTaken = this.gameSecs - remaining;
        const ratio = timeTaken / this.gameSecs;
        let speedTierBonus = 0;
        let tierName = '';

        if (ratio <= 0.25) {
            speedTierBonus = Math.round(200 * this.levelMultiplier);
            tierName = '⚡ Lightning Speed';
        } else if (ratio <= 0.40) {
            speedTierBonus = Math.round(120 * this.levelMultiplier);
            tierName = '🚀 Super Fast';
        } else if (ratio <= 0.60) {
            speedTierBonus = Math.round(70 * this.levelMultiplier);
            tierName = '🏃 Fast Finish';
        } else if (ratio <= 0.80) {
            speedTierBonus = Math.round(30 * this.levelMultiplier);
            tierName = '⏱️ Quick Finish';
        }

        const totalBonus = timeBonus + speedTierBonus;
        return { totalBonus, timeBonus, speedTierBonus, tierName };
    }

    /* ── END STATES ───────────────────────────── */
    _win() {
        this._stopTimer();
        this._unregisterActiveGame();
        SFX.playWin();
        
        const { totalBonus, timeBonus, speedTierBonus, tierName } = this._calculateSpeedBonus();
        this.score += totalBonus;
        this._updateHUD();

        // Push level + projected cumulative (previous total + this round) to the players doc
        // BEFORE the round is committed, so the cumulative is never double-counted.
        const clearedLevel = this.level;
        this._incrementPlayerLevel();

        this._saveScore(); // commits cumulative: cumulativeScore += score (localStorage + Firestore)

        this._recordSession('win', clearedLevel);

        const emojiEl = document.getElementById('end-emoji');
        if (emojiEl) emojiEl.textContent = '🏆';
        
        const titleEl = document.getElementById('end-title');
        if (titleEl) titleEl.textContent = `Level ${clearedLevel} Cleared!`;
        
        const subEl = document.getElementById('end-sub');
        let bonusInfo = `+${totalBonus} speed bonus (${timeBonus}s time + ${speedTierBonus} speed tier)`;
        let levelUpInfo = `🔥 Level Up! Next round will be Level ${this.level} (Harder grid & more words!)`;
        if (tierName) {
            subEl.textContent = `${tierName}! All ${this.words.length} words found! ${bonusInfo}. ${levelUpInfo}`;
        } else {
            subEl.textContent = `All ${this.words.length} words found! ${bonusInfo}. ${levelUpInfo}`;
        }

        const numEl = document.getElementById('score-result-num');
        if (numEl) numEl.textContent = this.score;

        const bonusNumEl = document.getElementById('time-bonus-num');
        if (bonusNumEl) bonusNumEl.textContent = `+${totalBonus}`;

        const bonusLabelEl = document.getElementById('time-bonus-label');
        if (bonusLabelEl) bonusLabelEl.textContent = tierName ? `speed bonus (${tierName})` : 'speed bonus';

        const cumEl = document.getElementById('cumulative-result-num');
        if (cumEl) cumEl.textContent = this.cumulativeScore;

        this._renderEndDefinitionsSummary();
        
        document.getElementById('overlay-end')?.classList.remove('hidden');
        document.getElementById('reopen-overlay-btn')?.classList.add('hidden');
    }

    _timeUp() {
        this._unregisterActiveGame();
        SFX.playGameOver();
        this._clearRoundScore(); // round not cleared — the earned points are NOT banked
        this._recordSession('timeout');

        // 1. Reveal answers on grid immediately
        this._revealAnswers();
        this._toast('⏰ Time Up! Revealing missed answers...', 1500);

        // 2. Delay showing the overlay dialog for 1.2s so player sees the grid reveal first
        setTimeout(() => {
            const emojiEl = document.getElementById('end-emoji');
            if (emojiEl) emojiEl.textContent = '⏰';
            
            const titleEl = document.getElementById('end-title');
            if (titleEl) titleEl.textContent = `Level ${this.level} Time's Up!`;
            
            const unfoundCount = this.words.length - this.foundWords.size;
            const subEl = document.getElementById('end-sub');
            if (subEl) {
                subEl.textContent = `Found ${this.foundWords.size} of ${this.words.length} words. ${unfoundCount > 0 ? unfoundCount + ' missed word(s) revealed!' : ''} ⚠️ Level ${this.level} not cleared — this round's score was NOT added to your total. Find ALL words to bank points & advance!`;
            }
            
            const numEl = document.getElementById('score-result-num');
            if (numEl) numEl.textContent = this.score;

            const bonusNumEl = document.getElementById('time-bonus-num');
            if (bonusNumEl) bonusNumEl.textContent = `+0`;

            const bonusLabelEl = document.getElementById('time-bonus-label');
            if (bonusLabelEl) bonusLabelEl.textContent = 'speed bonus';

            const cumEl = document.getElementById('cumulative-result-num');
            if (cumEl) cumEl.textContent = this.cumulativeScore;
            
            this._renderEndDefinitionsSummary();

            document.getElementById('overlay-end')?.classList.remove('hidden');
            document.getElementById('reopen-overlay-btn')?.classList.add('hidden');
        }, 1200);
    }

    /* Reveal all unfound words on grid & word list when time expires */
    _revealAnswers() {
        for (const word of this.words) {
            if (!this.foundWords.has(word)) {
                // Highlight cells on the grid
                const cells = this.placed[word] || [];
                cells.forEach(({ r, c }) => {
                    const el = this._cellEl(r, c);
                    if (el && !el.classList.contains('found')) {
                        el.classList.add('revealed');
                    }
                });

                // Highlight word in the sidebar list
                const li = document.getElementById(`word-${word}`);
                if (li) {
                    li.classList.add('revealed-word');
                    li.setAttribute('title', 'Missed word — revealed on grid');
                }
            }
        }
    }

    /* Toggle game over overlay modal to inspect grid */
    toggleOverlay() {
        const overlay = document.getElementById('overlay-end');
        const reopenBtn = document.getElementById('reopen-overlay-btn');
        if (overlay) {
            overlay.classList.toggle('hidden');
            const isHidden = overlay.classList.contains('hidden');
            if (reopenBtn) {
                if (isHidden) reopenBtn.classList.remove('hidden');
                else reopenBtn.classList.add('hidden');
            }
        }
    }

    /* ── PLAYER BADGE ─────────────────────────── */
    _displayPlayerBadge() {
        const nameEl = document.getElementById('player-name-display');
        const deptEl = document.getElementById('player-dept-display');
        if (!nameEl || !deptEl) return;
        const name = localStorage.getItem('wordQuest_playerName') || 'Player';
        const dept = localStorage.getItem('wordQuest_department') || '—';
        nameEl.textContent = name.length > 5 ? name.slice(0, 5).trimEnd() + '.' : name;
        if (dept.startsWith('Department of ')) {
            deptEl.textContent = dept.replace('Department of ', '');
        } else {
            deptEl.textContent = dept;
        }
    }

    /* ── SCORE PERSISTENCE ────────────────────── */
    _saveLiveProgress() {
        const name       = localStorage.getItem('wordQuest_playerName')       || 'Player';
        const rollNumber = localStorage.getItem('wordQuest_rollNumber')       || '';
        const department = localStorage.getItem('wordQuest_department')        || '';
        const year       = localStorage.getItem('wordQuest_yearOfStudy')       || '';

        const currentCumulative = this.cumulativeScore + this.score;
        const today = new Date().toLocaleDateString();
        const record = {
            id: this._getPlayerKey(),
            name, rollNumber, department, year,
            score: this.score,
            cumulativeScore: currentCumulative,
            date: today
        };

        // Update local leaderboard cache
        try {
            const key  = 'wordQuest_leaderboard';
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            const playerKey = this._getPlayerKey();
            const idx = list.findIndex(r => (r.id === playerKey || (rollNumber && r.rollNumber === rollNumber)));
            if (idx >= 0) {
                list[idx] = { ...list[idx], ...record };
            } else {
                list.push(record);
            }
            list.sort((a, b) => b.score - a.score);
            localStorage.setItem(key, JSON.stringify(list.slice(0, 100)));
        } catch { /* noop */ }

        // Live real-time update to Firestore leaderboard & cumulative collections
        if (window.WordQuestFirebase && window.WordQuestFirebase.saveScoreToFirestore) {
            window.WordQuestFirebase.saveScoreToFirestore(record).catch(() => {});
        }
        if (window.WordQuestFirebase && window.WordQuestFirebase.saveCumulativeScoreToFirestore) {
            window.WordQuestFirebase.saveCumulativeScoreToFirestore({
                id: this._getPlayerKey(),
                name, rollNumber, department, year,
                cumulativeScore: currentCumulative
            }).catch(() => {});
        }
        this._syncLevelToFirestore();
    }

    _saveScore() {
        const name       = localStorage.getItem('wordQuest_playerName')       || 'Player';
        const rollNumber = localStorage.getItem('wordQuest_rollNumber')       || '';
        const department = localStorage.getItem('wordQuest_department')        || '';
        const year       = localStorage.getItem('wordQuest_yearOfStudy')       || '';

        this.cumulativeScore += this.score;
        this._saveCumulativeScore();

        const today = new Date().toLocaleDateString();
        const record = {
            id: this._getPlayerKey(),
            name, rollNumber, department, year,
            score: this.score,
            cumulativeScore: this.cumulativeScore,
            date: today
        };

        // 1. Save to localStorage leaderboard
        try {
            const key  = 'wordQuest_leaderboard';
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            list.push(record);
            list.sort((a, b) => b.score - a.score);
            localStorage.setItem(key, JSON.stringify(list.slice(0, 100)));
        } catch { /* noop */ }

        // 2. Save score history (per-player)
        try {
            const histKey = 'wordQuest_history_' + rollNumber;
            const history = JSON.parse(localStorage.getItem(histKey) || '[]');
            history.push({ score: this.score, cumulative: this.cumulativeScore, date: today });
            localStorage.setItem(histKey, JSON.stringify(history));
        } catch { /* noop */ }

        // 3. Save to Firestore with retry
        this._saveToFirestore(record, 5);

        // 4. Save cumulative score to Firestore
        this._saveCumulativeToFirestore({ id: this._getPlayerKey(), name, rollNumber, department, year, cumulativeScore: this.cumulativeScore }, 5);
    }

    /* When a round is NOT cleared (time up), the points earned in that round are
       wiped out — they are never banked into the cumulative total. The live
       projections written during play are overwritten with the prior total. */
    _clearRoundScore() {
        const name       = localStorage.getItem('wordQuest_playerName')       || 'Player';
        const rollNumber = localStorage.getItem('wordQuest_rollNumber')       || '';
        const department = localStorage.getItem('wordQuest_department')        || '';
        const year       = localStorage.getItem('wordQuest_yearOfStudy')       || '';

        const today = new Date().toLocaleDateString();
        const record = {
            id: this._getPlayerKey(),
            name, rollNumber, department, year,
            score: 0,
            cumulativeScore: this.cumulativeScore,
            date: today
        };

        // 1. Revert local leaderboard cache to the prior total (drop this round's gain)
        try {
            const key  = 'wordQuest_leaderboard';
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            const playerKey = this._getPlayerKey();
            const idx = list.findIndex(r => (r.id === playerKey || (rollNumber && r.rollNumber === rollNumber)));
            if (idx >= 0) {
                list[idx] = { ...list[idx], ...record };
            } else {
                list.push(record);
            }
            list.sort((a, b) => Math.max(b.cumulativeScore || 0, b.score || 0) - Math.max(a.cumulativeScore || 0, a.score || 0));
            localStorage.setItem(key, JSON.stringify(list.slice(0, 100)));
        } catch { /* noop */ }

        // 2. Overwrite Firestore leaderboard & cumulativeScores so failed-round gains are cleared
        if (window.WordQuestFirebase && window.WordQuestFirebase.saveScoreToFirestore) {
            window.WordQuestFirebase.saveScoreToFirestore(record).catch(() => {});
        }
        if (window.WordQuestFirebase && window.WordQuestFirebase.saveCumulativeScoreToFirestore) {
            window.WordQuestFirebase.saveCumulativeScoreToFirestore({
                id: this._getPlayerKey(),
                name, rollNumber, department, year,
                cumulativeScore: this.cumulativeScore
            }).catch(() => {});
        }

        // 3. Sync players doc to the prior total (no round gain banked)
        this._syncLevelToFirestore(false);
    }

    _saveToFirestore(record, attempts) {
        if (!window.WordQuestFirebase || !window.WordQuestFirebase.saveScoreToFirestore) {
            if (attempts > 0) {
                setTimeout(() => this._saveToFirestore(record, attempts - 1), 2000);
            } else {
                console.warn('Firestore not available — score saved to localStorage only.');
            }
            return;
        }
        window.WordQuestFirebase.saveScoreToFirestore(record).then((docId) => {
            if (docId) {
                console.log('Score saved to Firestore:', docId);
            } else if (attempts > 0) {
                setTimeout(() => this._saveToFirestore(record, attempts - 1), 2000);
            } else {
                console.warn('Firestore score save failed after retries.');
            }
        }).catch(() => {
            if (attempts > 0) {
                setTimeout(() => this._saveToFirestore(record, attempts - 1), 2000);
            }
        });
    }

    _saveCumulativeToFirestore(data, attempts) {
        if (!window.WordQuestFirebase || !window.WordQuestFirebase.saveCumulativeScoreToFirestore) {
            if (attempts > 0) {
                setTimeout(() => this._saveCumulativeToFirestore(data, attempts - 1), 2000);
            } else {
                console.warn('Firestore not available — cumulative score saved to localStorage only.');
            }
            return;
        }
        window.WordQuestFirebase.saveCumulativeScoreToFirestore(data).catch(() => {
            if (attempts > 0) {
                setTimeout(() => this._saveCumulativeToFirestore(data, attempts - 1), 2000);
            }
        });
    }

    /* ── HELPERS ──────────────────────────────── */
    _cellEl(r, c) {
        return document.querySelector(`[data-r="${r}"][data-c="${c}"]`);
    }

    _toast(msg, ms = 2000) {
        const area = document.getElementById('toast-area');
        if (!area) return;
        const t = document.createElement('div');
        t.className = 'toast-item';
        t.textContent = msg;
        area.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transition = 'opacity 0.25s ease';
            setTimeout(() => t.remove(), 260);
        }, ms);
    }

    /** Floating +score chip near a cell element. */
    _scorePop(text, anchorEl) {
        const chip = document.createElement('div');
        chip.className = 'score-pop';
        chip.textContent = text;
        const rect = anchorEl.getBoundingClientRect();
        chip.style.left = `${rect.left + rect.width / 2 - 16}px`;
        chip.style.top  = `${rect.top}px`;
        document.body.appendChild(chip);
        setTimeout(() => chip.remove(), 950);
    }
}

/* ─── BOOT ───────────────────────────────────── */
const WS = new WordSearch();

/**
 * Wait for firebase-service.js module to expose window.WordQuestFirebase,
 * then boot the game. Falls back to immediate boot if Firebase doesn't load
 * within 3 seconds (offline / blocked).
 */
function bootGame() {
    // Flag for index.html: when the player returns from game.html, reveal the leaderboard
    try { window.sessionStorage.setItem('wordQuest_showLeaderboard', '1'); } catch (e) {}

    function startBoot() {
        if (window.WordQuestFirebase && window.WordQuestFirebase.getGameStateFromFirestore) {
            window.WordQuestFirebase.getGameStateFromFirestore().then((isActive) => {
                if (!isActive) {
                    WS._loadCumulativeScore();
                    WS._showGameEndedScreen();
                    return;
                }
                WS.init();
            }).catch(() => {
                WS.init();
            });
        } else {
            WS.init();
        }
    }

    if (window.WordQuestFirebase) {
        startBoot();
    } else {
        // Firebase module not yet ready — poll briefly then give up
        let attempts = 0;
        const poll = setInterval(() => {
            attempts++;
            if (window.WordQuestFirebase || attempts >= 30) {
                clearInterval(poll);
                startBoot();
            }
        }, 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootGame);
} else {
    bootGame();
}

// Clean up active game session if user navigates away mid-game
window.addEventListener('pagehide', () => {
    WS._recordSession('left');
    WS._unregisterActiveGame();
});
window.addEventListener('beforeunload', () => {
    WS._recordSession('left');
    WS._unregisterActiveGame();
});
