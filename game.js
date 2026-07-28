/**
 * Word Quest — Word Search Engine (game.js)
 *
 * Features:
 *  - Generates a random 12×12 letter grid
 *  - Places 8 hidden words (horizontal, vertical, diagonal — all directions)
 *  - Click-and-drag selection on desktop & touch
 *  - Countdown timer (2 minutes default)
 *  - Score: +10 per word found, +remaining seconds when complete
 *  - Game-over overlay on time-up or all words found
 */

'use strict';

/* ─── WORD BANK ─────────────────────────────── */
/* 20 words; 8 are chosen randomly each game */
const WORD_BANK = [
    'QUEST', 'WORD', 'SPELL', 'CLUE', 'GRID',
    'FIND', 'HUNT', 'LETTER', 'BRAIN', 'THINK',
    'PLAY', 'SCORE', 'TIMER', 'PUZZLE', 'SEARCH',
    'HINT', 'SOLVE', 'LEARN', 'FOCUS', 'SWIFT',
];

const GRID_SIZE  = 12;   // 12×12 grid
const WORD_COUNT = 8;    // words to hide
const GAME_SECS  = 120;  // 2 minutes
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

/* ─── MAIN CLASS ─────────────────────────────── */
class WordSearch {

    constructor() {
        this.gridSize   = GRID_SIZE;
        this.grid       = [];        // 2D array of letters
        this.words      = [];        // chosen words
        this.placed     = {};        // word → [{r,c},...] cell list
        this.foundWords = new Set(); // words found so far
        this.score      = 0;

        /* selection state */
        this.selecting  = false;
        this.selStart   = null;      // {r, c}
        this.selCells   = [];        // [{r,c},...] currently highlighted

        /* timer */
        this._remaining = GAME_SECS;
        this._timer     = null;
    }

    /* ── BOOT ─────────────────────────────────── */
    init() {
        this._pickWords();
        this._buildGrid();
        this._placeWords();
        this._fillGarbage();
        this._renderGrid();
        this._renderWordList();
        this._bindEvents();
        this._startTimer();
    }

    restart() {
        this._stopTimer();
        document.getElementById('overlay-end')?.classList.add('hidden');

        // reset state
        this.grid       = [];
        this.placed     = {};
        this.foundWords = new Set();
        this.score      = 0;
        this._remaining = GAME_SECS;
        this.selecting  = false;
        this.selStart   = null;
        this.selCells   = [];

        this._pickWords();
        this._buildGrid();
        this._placeWords();
        this._fillGarbage();
        this._renderGrid();
        this._renderWordList();
        this._bindEvents();
        this._startTimer();
        this._updateHUD();
    }

    _pickWords() {
        let pool = WORD_BANK;
        try {
            const custom = JSON.parse(localStorage.getItem('wordQuest_customWords') || '[]');
            if (Array.isArray(custom) && custom.length >= WORD_COUNT) {
                pool = custom;
            }
        } catch (e) {
            pool = WORD_BANK;
        }
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        this.words = shuffled.slice(0, WORD_COUNT);
    }

    /* ── GRID GENERATION ──────────────────────── */
    _buildGrid() {
        this.grid = Array.from({ length: this.gridSize }, () =>
            Array(this.gridSize).fill(''));
    }

    _placeWords() {
        this.placed = {};
        for (const word of this.words) {
            this._placeOne(word);
        }
    }

    _placeOne(word) {
        const len = word.length;
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < 200) {
            attempts++;

            const [dx, dy] = DIRS[Math.floor(Math.random() * DIRS.length)];
            const maxR = dy === 0  ? this.gridSize
                       : dy > 0   ? this.gridSize - len
                       : len - 1;
            const maxC = dx === 0  ? this.gridSize
                       : dx > 0   ? this.gridSize - len
                       : len - 1;
            const minR = dy < 0 ? len - 1 : 0;
            const minC = dx < 0 ? len - 1 : 0;

            const r = Math.floor(Math.random() * (maxR - minR)) + minR;
            const c = Math.floor(Math.random() * (maxC - minC)) + minC;

            // Check if all cells are free or already match
            let ok = true;
            const cells = [];
            for (let i = 0; i < len; i++) {
                const nr = r + dy * i;
                const nc = c + dx * i;
                if (nr < 0 || nr >= this.gridSize || nc < 0 || nc >= this.gridSize) { ok = false; break; }
                if (this.grid[nr][nc] !== '' && this.grid[nr][nc] !== word[i]) { ok = false; break; }
                cells.push({ r: nr, c: nc });
            }

            if (ok) {
                cells.forEach(({ r, c }, i) => { this.grid[r][c] = word[i]; });
                this.placed[word] = cells;
                placed = true;
            }
        }
    }

    _fillGarbage() {
        const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] === '') {
                    this.grid[r][c] = alpha[Math.floor(Math.random() * 26)];
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
        listEl.innerHTML = this.words.map(w =>
            `<li id="word-${w}">${w}</li>`
        ).join('');
        this._updateHUD();
    }

    /* ── EVENT BINDING (mouse + touch) ───────── */
    _bindEvents() {
        const gridEl = document.getElementById('grid');
        if (!gridEl) return;

        // ── Mouse ──────────────────────────────
        gridEl.addEventListener('mousedown', e => {
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
            this._markFound(matched);
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
        if (li) li.classList.add('found-word');

        this._updateHUD();
        this._toast(`✓ Found: ${word}`, 1400);

        // All found?
        if (this.foundWords.size === this.words.length) {
            this._win();
        }
    }

    /* ── HUD UPDATE ───────────────────────────── */
    _updateHUD() {
        const found = document.getElementById('found-count');
        const score = document.getElementById('score-val');
        if (found) found.textContent = `${this.foundWords.size} / ${this.words.length}`;
        if (score) score.textContent = this.score;
    }

    /* ── TIMER ────────────────────────────────── */
    _startTimer() {
        this._renderTimer();
        this._timer = setInterval(() => {
            this._remaining = Math.max(0, this._remaining - 1);
            this._renderTimer();

            if (this._remaining === 30) this._toast('30 seconds remaining!', 1600);
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

    _renderTimer() {
        const m   = Math.floor(this._remaining / 60);
        const s   = this._remaining % 60;
        const str = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        const pct = this._remaining / GAME_SECS;
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

    /* ── END STATES ───────────────────────────── */
    _win() {
        this._stopTimer();
        const bonus = this._remaining;
        this.score += bonus;
        this._updateHUD();
        this._saveScore();

        const emojiEl = document.getElementById('end-emoji');
        if (emojiEl) emojiEl.textContent = '🏆';
        
        const titleEl = document.getElementById('end-title');
        if (titleEl) titleEl.textContent = 'You Found Them All!';
        
        const subEl = document.getElementById('end-sub');
        if (subEl) subEl.textContent = `All ${this.words.length} words found! +${bonus} time bonus.`;
        
        const numEl = document.getElementById('score-result-num');
        if (numEl) numEl.textContent = this.score;
        
        document.getElementById('overlay-end')?.classList.remove('hidden');
    }

    _timeUp() {
        this._saveScore();

        const emojiEl = document.getElementById('end-emoji');
        if (emojiEl) emojiEl.textContent = '⏰';
        
        const titleEl = document.getElementById('end-title');
        if (titleEl) titleEl.textContent = "Time's Up!";
        
        const subEl = document.getElementById('end-sub');
        if (subEl) subEl.textContent = `Found ${this.foundWords.size} of ${this.words.length} words.`;
        
        const numEl = document.getElementById('score-result-num');
        if (numEl) numEl.textContent = this.score;
        
        document.getElementById('overlay-end')?.classList.remove('hidden');
    }

    /* ── SCORE PERSISTENCE ────────────────────── */
    _saveScore() {
        try {
            const key = 'wq_scores';
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            list.push({ score: this.score, date: new Date().toLocaleDateString() });
            list.sort((a, b) => b.score - a.score);
            localStorage.setItem(key, JSON.stringify(list.slice(0, 10)));
        } catch { /* noop */ }
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
document.addEventListener('DOMContentLoaded', () => WS.init());
