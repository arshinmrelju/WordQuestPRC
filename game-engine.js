/**
 * WORD QUEST — High-Performance Game Engine & Audio Synthesizer
 * English Department Carnival 2026
 * Features: Web Audio API sound effects, 3 dynamic round solvers,
 * interactive tile slots, streak multipliers, and leaderboard persistence.
 */

// ==========================================================================
// 1. WEB AUDIO API SOUND SYNTHESIZER (Zero external asset dependencies)
// ==========================================================================
class SoundFxSynthesizer {
    constructor() {
        this.ctx = null;
        this.isMuted = localStorage.getItem('wordQuest_muted') === 'true';
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('wordQuest_muted', this.isMuted);
        return this.isMuted;
    }

    playClick() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playSelect() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, this.ctx.currentTime + 0.08); // E5

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playCorrect() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + index * 0.08);

            gain.gain.setValueAtTime(0.25, this.ctx.currentTime + index * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + index * 0.08 + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + index * 0.08);
            osc.stop(this.ctx.currentTime + index * 0.08 + 0.25);
        });
    }

    playWrong() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }

    playTick() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.03);
    }

    playFanfare() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const melody = [
            { f: 523.25, d: 0.15 },
            { f: 659.25, d: 0.15 },
            { f: 783.99, d: 0.15 },
            { f: 1046.50, d: 0.4 }
        ];

        let timeOffset = 0;
        melody.forEach((note) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.f, this.ctx.currentTime + timeOffset);

            gain.gain.setValueAtTime(0.3, this.ctx.currentTime + timeOffset);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + timeOffset + note.d);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + timeOffset);
            osc.stop(this.ctx.currentTime + timeOffset + note.d);

            timeOffset += note.d * 0.85;
        });
    }
}

// Global Sound Instance
const audioSynth = new SoundFxSynthesizer();

// ==========================================================================
// 2. DICTIONARY & WORD DATASETS
// ==========================================================================
const R1_WORD_BANK = [
    { word: 'CARNIVAL', clue: 'Festive gathering with games, spectacle, and celebration' },
    { word: 'METAPHOR', clue: 'Figure of speech directly comparing two distinct things' },
    { word: 'SYMBOLISM', clue: 'Use of symbols to signify ideas or deeper meanings' },
    { word: 'PARADOX', clue: 'A statement that leads to a self-contradictory conclusion' },
    { word: 'RHETORIC', clue: 'The art of effective or persuasive speaking and writing' },
    { word: 'ALLUSION', clue: 'Indirect reference to a person, event, or literary work' },
    { word: 'ELOQUENCE', clue: 'Fluent or persuasive speaking or expression' },
    { word: 'HYPERBOLE', clue: 'Exaggerated statements not meant to be taken literally' }
];

const VALID_ENGLISH_WORDS = new Set([
    'APPLE', 'BALL', 'CAT', 'DOG', 'EAGLE', 'FLAME', 'GIANT', 'HERO', 'IMAGE', 'JESTER',
    'KNIGHT', 'LANTERN', 'MAGIC', 'NOVEL', 'ORBIT', 'POETRY', 'QUEST', 'RHYME', 'STORY',
    'TALE', 'UNIVERSE', 'VERSE', 'WONDER', 'XENON', 'YARN', 'ZEAL', 'STAGE', 'DRAMA',
    'ACTOR', 'REASON', 'NOBLE', 'ESSAY', 'YOUTH', 'HONOR', 'REALM', 'MYTH', 'THOUGHT',
    'TRUTH', 'HEART', 'THEATER', 'RHYTHM', 'MIND', 'LIGHT', 'THEME', 'EMPIRE', 'ECHO'
]);

// ==========================================================================
// 3. MAIN GAME STATE ENGINE
// ==========================================================================
class WordQuestEngine {
    constructor() {
        this.playerName = localStorage.getItem('wordQuest_playerName') || 'Player';
        this.department = localStorage.getItem('wordQuest_department') || 'Department of English';
        this.yearOfStudy = localStorage.getItem('wordQuest_yearOfStudy') || '';
        this.difficulty = localStorage.getItem('wordQuest_difficulty') || 'medium';

        // Difficulty Settings Config
        this.diffConfig = {
            easy: { time: 60, mult: 1.0, wordsNeeded: 3 },
            medium: { time: 45, mult: 1.5, wordsNeeded: 4 },
            hard: { time: 30, mult: 2.0, wordsNeeded: 5 }
        }[this.difficulty] || { time: 45, mult: 1.5, wordsNeeded: 4 };

        // Dynamic State Variables
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.currentRound = 1;
        this.timeLeft = this.diffConfig.time;
        this.maxTime = this.diffConfig.time;
        this.timerInterval = null;
        this.totalAttempts = 0;
        this.correctSubmissions = 0;

        // Round 1 State Variables
        this.r1WordsList = [];
        this.r1CurrentIndex = 0;
        this.r1CurrentWord = '';
        this.r1ScrambledChars = [];
        this.r1SelectedTiles = []; // Array of { char, originalIndex }

        // Round 2 State Variables
        this.r2TargetLetter = 'A';
        this.r2ChainWords = [];

        // Round 3 State Variables
        this.r3WordsToFind = ['POEM', 'EPIC', 'PROSE', 'TALE'];
        this.r3FoundWords = new Set();
        this.r3SelectedCells = [];

        this.initDOMReferences();
        this.bindEvents();
        this.updateHUDHeader();
        this.initFloatingLetters();
    }

    // ----------------------------------------------------------------------
    // DOM References
    // ----------------------------------------------------------------------
    initDOMReferences() {
        // HUD Elements
        this.hudPlayerName = document.getElementById('hud-player-name');
        this.welcomeName = document.getElementById('welcome-name');
        this.hudAvatar = document.getElementById('hud-avatar');
        this.hudDiffTag = document.getElementById('hud-diff-tag');
        this.hudRoundNumber = document.getElementById('hud-round-number');
        this.hudScore = document.getElementById('hud-score');
        this.hudStreak = document.getElementById('hud-streak');
        this.hudStreakBox = document.getElementById('hud-streak-box');
        this.hudTimer = document.getElementById('hud-timer');
        this.timerRing = document.getElementById('timer-ring');
        this.soundToggleBtn = document.getElementById('sound-toggle-btn');
        this.soundIconOn = document.getElementById('sound-icon-on');
        this.soundIconOff = document.getElementById('sound-icon-off');

        // Screen Containers
        this.screenIntro = document.getElementById('screen-intro');
        this.screenRound1 = document.getElementById('screen-round1');
        this.screenRound2 = document.getElementById('screen-round2');
        this.screenRound3 = document.getElementById('screen-round3');

        // Round 1 Elements
        this.r1Category = document.getElementById('r1-category');
        this.r1CurrentIndexEl = document.getElementById('r1-current-index');
        this.r1TotalWordsEl = document.getElementById('r1-total-words');
        this.r1HintDisplay = document.getElementById('r1-hint-display');
        this.r1LetterSlots = document.getElementById('r1-letter-slots');
        this.r1TileBank = document.getElementById('r1-tile-bank');
        this.r1UndoBtn = document.getElementById('r1-undo-btn');
        this.r1ClearBtn = document.getElementById('r1-clear-btn');
        this.r1HintBtn = document.getElementById('r1-hint-btn');
        this.r1SubmitBtn = document.getElementById('r1-submit-btn');

        // Round 2 Elements
        this.r2ChainCount = document.getElementById('r2-chain-count');
        this.r2TargetLetterEl = document.getElementById('r2-target-letter');
        this.r2ChainHistory = document.getElementById('r2-chain-history');
        this.r2Form = document.getElementById('r2-form');
        this.r2Input = document.getElementById('r2-input');
        this.r2Feedback = document.getElementById('r2-feedback');

        // Round 3 Elements
        this.r3FoundCount = document.getElementById('r3-found-count');
        this.r3TotalCount = document.getElementById('r3-total-count');
        this.r3SearchGrid = document.getElementById('r3-search-grid');
        this.r3WordsList = document.getElementById('r3-words-list');

        // Modal Elements
        this.victoryModal = document.getElementById('victory-modal');
        this.modalFinalScore = document.getElementById('modal-final-score');
        this.modalMaxStreak = document.getElementById('modal-max-streak');
        this.modalAccuracy = document.getElementById('modal-accuracy');
        this.modalRankTitle = document.getElementById('modal-rank-title');
        this.modalDiffBadge = document.getElementById('modal-diff-badge');
        this.leaderboardBody = document.getElementById('leaderboard-body');
        this.modalReplayBtn = document.getElementById('modal-replay-btn');

        // Toast Container
        this.toastContainer = document.getElementById('toast-container');
    }

    // ----------------------------------------------------------------------
    // Event Listeners Initialization
    // ----------------------------------------------------------------------
    bindEvents() {
        // Start Game Button
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                audioSynth.playClick();
                this.startQuest();
            });
        }

        // Sound Toggle
        if (this.soundToggleBtn) {
            this.soundToggleBtn.addEventListener('click', () => {
                const muted = audioSynth.toggleMute();
                this.updateSoundIcons(muted);
                this.showToast(muted ? 'Audio Muted' : 'Audio Enabled 🔊');
            });
            this.updateSoundIcons(audioSynth.isMuted);
        }

        // Round 1 Buttons
        if (this.r1UndoBtn) this.r1UndoBtn.addEventListener('click', () => this.r1UndoLetter());
        if (this.r1ClearBtn) this.r1ClearBtn.addEventListener('click', () => this.r1ClearAll());
        if (this.r1HintBtn) this.r1HintBtn.addEventListener('click', () => this.r1UseHint());
        if (this.r1SubmitBtn) this.r1SubmitBtn.addEventListener('click', () => this.r1SubmitWord());

        // Keyboard Support for Round 1
        document.addEventListener('keydown', (e) => {
            if (this.currentRound === 1 && !this.screenRound1.classList.contains('hidden')) {
                if (e.key >= 'a' && e.key <= 'z') {
                    this.r1TypeChar(e.key.toUpperCase());
                } else if (e.key === 'Backspace') {
                    e.preventDefault();
                    this.r1UndoLetter();
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    this.r1SubmitWord();
                }
            }
        });

        // Round 2 Submit
        if (this.r2Form) {
            this.r2Form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.r2SubmitWord();
            });
        }

        // Modal Replay Button
        if (this.modalReplayBtn) {
            this.modalReplayBtn.addEventListener('click', () => {
                audioSynth.playClick();
                this.victoryModal.classList.add('hidden');
                this.resetGameState();
                this.startQuest();
            });
        }
    }

    updateSoundIcons(isMuted) {
        if (this.soundIconOn && this.soundIconOff) {
            if (isMuted) {
                this.soundIconOn.classList.add('hidden');
                this.soundIconOff.classList.remove('hidden');
            } else {
                this.soundIconOn.classList.remove('hidden');
                this.soundIconOff.classList.add('hidden');
            }
        }
    }

    updateHUDHeader() {
        if (this.hudPlayerName) this.hudPlayerName.textContent = this.playerName;
        if (this.welcomeName) this.welcomeName.textContent = this.playerName;
        if (this.hudAvatar) this.hudAvatar.textContent = this.playerName.charAt(0).toUpperCase();

        if (this.hudDiffTag) {
            this.hudDiffTag.textContent = this.difficulty.toUpperCase();
            this.hudDiffTag.className = `diff-tag diff-${this.difficulty}`;
        }

        this.updateHUDStats();
    }

    updateHUDStats() {
        if (this.hudRoundNumber) this.hudRoundNumber.textContent = `${this.currentRound} / 3`;
        if (this.hudScore) this.hudScore.textContent = String(this.score).padStart(4, '0');
        if (this.hudStreak) this.hudStreak.textContent = `${this.streak}x`;

        if (this.hudStreakBox) {
            if (this.streak >= 2) {
                this.hudStreakBox.classList.add('active');
            } else {
                this.hudStreakBox.classList.remove('active');
            }
        }
    }

    // ----------------------------------------------------------------------
    // Floating Background Letters Particle Engine
    // ----------------------------------------------------------------------
    initFloatingLetters() {
        const container = document.getElementById('letters-container');
        if (!container) return;

        container.innerHTML = '';
        const chars = 'WORDQUESTCARNIVALPOETRYRHETORIC';
        for (let i = 0; i < 30; i++) {
            const el = document.createElement('span');
            el.className = 'floating-letter';
            el.textContent = chars[Math.floor(Math.random() * chars.length)];
            el.style.left = `${Math.random() * 95}%`;
            el.style.animationDuration = `${14 + Math.random() * 16}s`;
            el.style.animationDelay = `${-Math.random() * 20}s`;
            el.style.fontSize = `${1.2 + Math.random() * 2}rem`;
            el.style.setProperty('--target-opacity', '0.08');
            container.appendChild(el);
        }
    }

    // ----------------------------------------------------------------------
    // Game Lifecycle Management
    // ----------------------------------------------------------------------
    resetGameState() {
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.currentRound = 1;
        this.totalAttempts = 0;
        this.correctSubmissions = 0;
        this.updateHUDStats();
    }

    startQuest() {
        this.screenIntro.classList.add('hidden');
        this.startRound1();
    }

    startTimer(onComplete) {
        clearInterval(this.timerInterval);
        this.timeLeft = this.diffConfig.time;
        this.maxTime = this.diffConfig.time;
        this.updateTimerDisplay();

        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();

            if (this.timeLeft <= 5 && this.timeLeft > 0) {
                audioSynth.playTick();
            }

            if (this.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                audioSynth.playWrong();
                this.showToast('Time Up for this round!');
                if (onComplete) onComplete();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        if (this.hudTimer) this.hudTimer.textContent = this.timeLeft;
        if (this.timerRing) {
            const radius = 16;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (this.timeLeft / this.maxTime) * circumference;
            this.timerRing.style.strokeDasharray = `${circumference} ${circumference}`;
            this.timerRing.style.strokeDashoffset = offset;

            // Timer color warning state
            if (this.timeLeft <= 5) {
                this.timerRing.style.stroke = '#f43f5e';
            } else if (this.timeLeft <= 15) {
                this.timerRing.style.stroke = '#f59e0b';
            } else {
                this.timerRing.style.stroke = '#38bdf8';
            }
        }
    }

    stopTimer() {
        clearInterval(this.timerInterval);
    }

    // ----------------------------------------------------------------------
    // ROUND 1: UNSCRAMBLE ANAGRAMS ENGINE
    // ----------------------------------------------------------------------
    startRound1() {
        this.currentRound = 1;
        this.updateHUDStats();
        this.screenRound1.classList.remove('hidden');

        // Select shuffle of words based on difficulty needed
        this.r1WordsList = [...R1_WORD_BANK]
            .sort(() => 0.5 - Math.random())
            .slice(0, this.diffConfig.wordsNeeded);

        this.r1CurrentIndex = 0;
        if (this.r1TotalWordsEl) this.r1TotalWordsEl.textContent = this.r1WordsList.length;

        this.loadR1Word();
        this.startTimer(() => {
            this.finishRound1();
        });
    }

    loadR1Word() {
        if (this.r1CurrentIndex >= this.r1WordsList.length) {
            this.finishRound1();
            return;
        }

        const currentItem = this.r1WordsList[this.r1CurrentIndex];
        this.r1CurrentWord = currentItem.word;
        if (this.r1CurrentIndexEl) this.r1CurrentIndexEl.textContent = this.r1CurrentIndex + 1;
        if (this.r1HintDisplay) this.r1HintDisplay.textContent = `Clue: ${currentItem.clue}`;

        // Scramble letters
        this.r1ScrambledChars = this.shuffleString(this.r1CurrentWord).split('');
        // Ensure scramble isn't identical to target
        if (this.r1ScrambledChars.join('') === this.r1CurrentWord) {
            this.r1ScrambledChars.reverse();
        }

        this.r1SelectedTiles = [];
        this.renderR1Slots();
        this.renderR1TileBank();
    }

    shuffleString(str) {
        return str.split('').sort(() => 0.5 - Math.random()).join('');
    }

    renderR1Slots() {
        if (!this.r1LetterSlots) return;
        this.r1LetterSlots.innerHTML = '';

        for (let i = 0; i < this.r1CurrentWord.length; i++) {
            const slot = document.createElement('div');
            slot.className = 'letter-slot';
            
            if (this.r1SelectedTiles[i]) {
                slot.textContent = this.r1SelectedTiles[i].char;
                slot.classList.add('filled');
            } else {
                slot.textContent = '';
            }
            this.r1LetterSlots.appendChild(slot);
        }
    }

    renderR1TileBank() {
        if (!this.r1TileBank) return;
        this.r1TileBank.innerHTML = '';

        this.r1ScrambledChars.forEach((char, index) => {
            const tile = document.createElement('button');
            tile.className = 'letter-tile';
            tile.textContent = char;

            // Check if tile is currently selected in slots
            const isSelected = this.r1SelectedTiles.some(item => item.originalIndex === index);
            if (isSelected) {
                tile.classList.add('used');
                tile.disabled = true;
            } else {
                tile.addEventListener('click', () => {
                    this.r1SelectTile(char, index);
                });
            }

            this.r1TileBank.appendChild(tile);
        });
    }

    r1SelectTile(char, index) {
        if (this.r1SelectedTiles.length >= this.r1CurrentWord.length) return;

        audioSynth.playSelect();
        this.r1SelectedTiles.push({ char, originalIndex: index });
        this.renderR1Slots();
        this.renderR1TileBank();
    }

    r1TypeChar(char) {
        // Find first unused tile with matching character
        const unusedIndex = this.r1ScrambledChars.findIndex((c, i) => {
            return c === char && !this.r1SelectedTiles.some(st => st.originalIndex === i);
        });

        if (unusedIndex !== -1) {
            this.r1SelectTile(char, unusedIndex);
        }
    }

    r1UndoLetter() {
        if (this.r1SelectedTiles.length > 0) {
            audioSynth.playClick();
            this.r1SelectedTiles.pop();
            this.renderR1Slots();
            this.renderR1TileBank();
        }
    }

    r1ClearAll() {
        if (this.r1SelectedTiles.length > 0) {
            audioSynth.playClick();
            this.r1SelectedTiles = [];
            this.renderR1Slots();
            this.renderR1TileBank();
        }
    }

    r1UseHint() {
        if (this.score < 25) {
            this.showToast('Not enough points for hint! (Needs 25 pts)');
            return;
        }

        // Find first incorrect or unfilled slot index
        let hintIndex = -1;
        for (let i = 0; i < this.r1CurrentWord.length; i++) {
            if (!this.r1SelectedTiles[i] || this.r1SelectedTiles[i].char !== this.r1CurrentWord[i]) {
                hintIndex = i;
                break;
            }
        }

        if (hintIndex !== -1) {
            this.score -= 25;
            this.updateHUDStats();
            const targetChar = this.r1CurrentWord[hintIndex];

            // Auto select matching tile
            this.r1TypeChar(targetChar);
            audioSynth.playSelect();
            this.showToast(`Hint applied: ${targetChar} (-25 pts)`);
        }
    }

    r1SubmitWord() {
        this.totalAttempts++;
        const submitted = this.r1SelectedTiles.map(item => item.char).join('');

        if (submitted.length < this.r1CurrentWord.length) {
            this.showToast('Fill all letter slots before submitting!');
            return;
        }

        if (submitted === this.r1CurrentWord) {
            // Correct Answer!
            this.correctSubmissions++;
            this.streak++;
            if (this.streak > this.maxStreak) this.maxStreak = this.streak;

            const basePts = 100;
            const timeBonus = Math.floor(this.timeLeft * 2);
            const streakBonus = (this.streak - 1) * 25;
            const roundPoints = Math.floor((basePts + timeBonus + streakBonus) * this.diffConfig.mult);

            this.score += roundPoints;
            this.updateHUDStats();
            audioSynth.playCorrect();

            this.showToast(`+${roundPoints} PTS! Outstanding! 🌟`);
            this.r1CurrentIndex++;

            setTimeout(() => {
                this.loadR1Word();
            }, 600);
        } else {
            // Wrong Answer
            this.streak = 0;
            this.updateHUDStats();
            audioSynth.playWrong();
            this.showToast('Incorrect anagram arrangement! Try again!');

            // Shake slots
            if (this.r1LetterSlots) {
                this.r1LetterSlots.classList.add('shake');
                setTimeout(() => this.r1LetterSlots.classList.remove('shake'), 500);
            }
        }
    }

    finishRound1() {
        this.stopTimer();
        this.screenRound1.classList.add('hidden');
        this.startRound2();
    }

    // ----------------------------------------------------------------------
    // ROUND 2: WORD CHAIN ENGINE
    // ----------------------------------------------------------------------
    startRound2() {
        this.currentRound = 2;
        this.updateHUDStats();
        this.screenRound2.classList.remove('hidden');

        this.r2TargetLetter = ['S', 'P', 'R', 'T', 'M', 'C'][Math.floor(Math.random() * 6)];
        this.r2ChainWords = [];

        if (this.r2TargetLetterEl) this.r2TargetLetterEl.textContent = this.r2TargetLetter;
        if (this.r2ChainCount) this.r2ChainCount.textContent = '0';
        if (this.r2ChainHistory) {
            this.r2ChainHistory.innerHTML = '<span class="chain-empty-text">Your word chain will appear here as you submit valid words!</span>';
        }

        this.startTimer(() => {
            this.finishRound2();
        });
    }

    r2SubmitWord() {
        if (!this.r2Input) return;
        const val = this.r2Input.value.trim().toUpperCase();
        this.r2Input.value = '';

        if (!val) return;
        this.totalAttempts++;

        if (val.charAt(0) !== this.r2TargetLetter) {
            audioSynth.playWrong();
            this.showR2Error(`Word must start with letter ${this.r2TargetLetter}!`);
            return;
        }

        if (val.length < 3) {
            audioSynth.playWrong();
            this.showR2Error('Word must be at least 3 letters long!');
            return;
        }

        if (this.r2ChainWords.includes(val)) {
            audioSynth.playWrong();
            this.showR2Error('Word has already been used in this chain!');
            return;
        }

        if (!VALID_ENGLISH_WORDS.has(val)) {
            // Also accept if valid English literature/carnival dataset
            const inR1 = R1_WORD_BANK.some(item => item.word === val);
            if (!inR1) {
                audioSynth.playWrong();
                this.showR2Error('Word not recognized in Carnival Vocabulary!');
                return;
            }
        }

        // Valid Word Submission!
        this.clearR2Error();
        this.correctSubmissions++;
        this.streak++;
        if (this.streak > this.maxStreak) this.maxStreak = this.streak;

        this.r2ChainWords.push(val);
        this.r2TargetLetter = val.charAt(val.length - 1);
        if (this.r2TargetLetterEl) this.r2TargetLetterEl.textContent = this.r2TargetLetter;
        if (this.r2ChainCount) this.r2ChainCount.textContent = this.r2ChainWords.length;

        const points = Math.floor((val.length * 20 + this.streak * 15) * this.diffConfig.mult);
        this.score += points;
        this.updateHUDStats();
        audioSynth.playCorrect();

        this.renderR2ChainHistory();
        this.showToast(`+${points} PTS! Chain connected! 🔗`);

        if (this.r2ChainWords.length >= this.diffConfig.wordsNeeded + 1) {
            setTimeout(() => this.finishRound2(), 800);
        }
    }

    renderR2ChainHistory() {
        if (!this.r2ChainHistory) return;
        this.r2ChainHistory.innerHTML = '';

        this.r2ChainWords.forEach((w, i) => {
            const tag = document.createElement('div');
            tag.className = 'chain-word-tag';
            tag.innerHTML = `<span>${w}</span> <span class="chain-arrow">&rarr;</span>`;
            this.r2ChainHistory.appendChild(tag);
        });
    }

    showR2Error(msg) {
        if (this.r2Feedback) {
            this.r2Feedback.textContent = msg;
            this.r2Feedback.classList.add('visible');
        }
    }

    clearR2Error() {
        if (this.r2Feedback) {
            this.r2Feedback.textContent = '';
            this.r2Feedback.classList.remove('visible');
        }
    }

    finishRound2() {
        this.stopTimer();
        this.screenRound2.classList.add('hidden');
        this.startRound3();
    }

    // ----------------------------------------------------------------------
    // ROUND 3: WORD SEARCH MATRIX ENGINE
    // ----------------------------------------------------------------------
    startRound3() {
        this.currentRound = 3;
        this.updateHUDStats();
        this.screenRound3.classList.remove('hidden');

        this.r3WordsToFind = ['POEM', 'EPIC', 'PROSE', 'TALE'];
        this.r3FoundWords = new Set();
        this.r3SelectedCells = [];

        if (this.r3FoundCount) this.r3FoundCount.textContent = '0';
        if (this.r3TotalCount) this.r3TotalCount.textContent = this.r3WordsToFind.length;

        this.renderR3WordsList();
        this.generateR3Grid();

        this.startTimer(() => {
            this.finishQuest();
        });
    }

    renderR3WordsList() {
        if (!this.r3WordsList) return;
        this.r3WordsList.innerHTML = '';

        this.r3WordsToFind.forEach(word => {
            const li = document.createElement('li');
            li.className = 'target-word-item';
            if (this.r3FoundWords.has(word)) {
                li.classList.add('found');
            }
            li.textContent = word;
            this.r3WordsList.appendChild(li);
        });
    }

    generateR3Grid() {
        if (!this.r3SearchGrid) return;
        this.r3SearchGrid.innerHTML = '';

        // Preset 6x6 grid matrix embedded with target words
        // Row 0: P O E M X X
        // Row 1: E P I C A Y
        // Row 2: P R O S E Z
        // Row 3: T A L E B W
        // Row 4: R H Y M E V
        // Row 5: S T O R Y U
        const matrix = [
            ['P', 'O', 'E', 'M', 'S', 'X'],
            ['E', 'P', 'I', 'C', 'A', 'Y'],
            ['P', 'R', 'O', 'S', 'E', 'Z'],
            ['T', 'A', 'L', 'E', 'B', 'W'],
            ['R', 'H', 'Y', 'M', 'E', 'V'],
            ['S', 'T', 'O', 'R', 'Y', 'U']
        ];

        matrix.forEach((row, r) => {
            row.forEach((char, c) => {
                const cell = document.createElement('button');
                cell.className = 'grid-cell';
                cell.textContent = char;
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.dataset.char = char;

                cell.addEventListener('click', () => {
                    this.handleR3CellClick(cell, r, c, char);
                });

                this.r3SearchGrid.appendChild(cell);
            });
        });
    }

    handleR3CellClick(cell, r, c, char) {
        audioSynth.playSelect();

        // Toggle selection state
        if (cell.classList.contains('selected')) {
            cell.classList.remove('selected');
            this.r3SelectedCells = this.r3SelectedCells.filter(item => !(item.r === r && item.c === c));
        } else {
            cell.classList.add('selected');
            this.r3SelectedCells.push({ cell, r, c, char });
        }

        // Check if selected sequence forms a target word
        const selectedWord = this.r3SelectedCells.map(item => item.char).join('');
        this.r3WordsToFind.forEach(target => {
            if (!this.r3FoundWords.has(target) && selectedWord === target) {
                // Word Found!
                this.r3FoundWords.add(target);
                this.correctSubmissions++;
                this.streak++;
                if (this.streak > this.maxStreak) this.maxStreak = this.streak;

                const points = Math.floor(150 * this.diffConfig.mult);
                this.score += points;
                this.updateHUDStats();
                audioSynth.playCorrect();

                this.r3SelectedCells.forEach(item => {
                    item.cell.classList.remove('selected');
                    item.cell.classList.add('found-cell');
                });
                this.r3SelectedCells = [];

                if (this.r3FoundCount) this.r3FoundCount.textContent = this.r3FoundWords.size;
                this.renderR3WordsList();
                this.showToast(`Found "${target}"! +${points} PTS! 🎉`);

                if (this.r3FoundWords.size >= this.r3WordsToFind.length) {
                    setTimeout(() => this.finishQuest(), 800);
                }
            }
        });
    }

    finishQuest() {
        this.stopTimer();
        this.screenRound3.classList.add('hidden');

        audioSynth.playFanfare();
        this.showVictoryModal();
    }

    // ----------------------------------------------------------------------
    // Victory & Leaderboard System
    // ----------------------------------------------------------------------
    showVictoryModal() {
        if (!this.victoryModal) return;

        // Save High Score to LocalStorage
        this.saveScoreToLeaderboard();

        // Accuracy Calculation
        const accuracy = this.totalAttempts > 0 
            ? Math.round((this.correctSubmissions / this.totalAttempts) * 100) 
            : 100;

        // Rank Title
        let rank = 'Carnival Scholar';
        if (this.score >= 1200) rank = 'Grandmaster Polymath';
        else if (this.score >= 800) rank = 'Literary Champion';

        if (this.modalFinalScore) this.modalFinalScore.textContent = this.score;
        if (this.modalMaxStreak) this.modalMaxStreak.textContent = `🔥 ${this.maxStreak}x`;
        if (this.modalAccuracy) this.modalAccuracy.textContent = `${accuracy}%`;
        if (this.modalRankTitle) this.modalRankTitle.textContent = rank;
        if (this.modalDiffBadge) {
            this.modalDiffBadge.textContent = this.difficulty.toUpperCase();
            this.modalDiffBadge.className = `diff-tag diff-${this.difficulty}`;
        }

        this.renderLeaderboardTable();
        this.victoryModal.classList.remove('hidden');
    }

    saveScoreToLeaderboard() {
        const scoreRecord = {
            name: this.playerName,
            department: this.department,
            year: this.yearOfStudy,
            difficulty: this.difficulty,
            score: this.score,
            date: new Date().toLocaleDateString()
        };

        // Save to Firebase Cloud Firestore
        if (window.WordQuestFirebase && window.WordQuestFirebase.saveScoreToFirestore) {
            window.WordQuestFirebase.saveScoreToFirestore(scoreRecord);
        }

        try {
            const list = JSON.parse(localStorage.getItem('wordQuest_leaderboard') || '[]');
            list.push(scoreRecord);

            // Sort descending by score and keep top 10
            list.sort((a, b) => b.score - a.score);
            const topScores = list.slice(0, 10);

            localStorage.setItem('wordQuest_leaderboard', JSON.stringify(topScores));
        } catch (e) {
            console.warn('Leaderboard save error:', e);
        }
    }

    _buildMedalSvg(kind, num) {
        const colors = { gold: ['#f7c948', '#b8860b'], silver: ['#cfd8dc', '#90a4ae'], bronze: ['#e0a458', '#b4652a'] };
        const [face, edge] = colors[kind] || colors.gold;
        return `<svg class="rank-medal" width="20" height="20" viewBox="0 0 24 24" aria-label="${num}st place">
            <circle cx="12" cy="14" r="7" fill="${edge}"/>
            <circle cx="12" cy="14" r="5.6" fill="${face}"/>
            <path d="M8.21 13.89 7 22l5-3 5 3-1.21-8.11" stroke="${edge}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <text x="12" y="15.1" font-size="7" font-weight="bold" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif">${num}</text>
        </svg>`;
    }

    renderLeaderboardTable() {
        if (!this.leaderboardBody) return;
        this.leaderboardBody.innerHTML = '';

        try {
            const list = JSON.parse(localStorage.getItem('wordQuest_leaderboard') || '[]');
            if (list.length === 0) {
                this.leaderboardBody.innerHTML = '<tr><td colspan="4" style="text-align:center; opacity:0.6;">No records yet! Be the first!</td></tr>';
                return;
            }

            list.forEach((item, index) => {
                const tr = document.createElement('tr');
                const rankBadge = (index === 0) ? this._buildMedalSvg('gold', '1') : (index === 1) ? this._buildMedalSvg('silver', '2') : (index === 2) ? this._buildMedalSvg('bronze', '3') : `${index + 1}`;

                const deptRaw = item.department ? item.department.replace('Department of ', '') : item.difficulty;
                const deptText = deptRaw.length > 4 ? deptRaw.slice(0, 4) : deptRaw;

                tr.innerHTML = `
                    <td><strong>${rankBadge}</strong></td>
                    <td>${item.name}</td>
                    <td><span class="diff-tag diff-medium">${deptText}</span></td>
                    <td class="gradient-text font-bold">${item.score}</td>
                `;
                this.leaderboardBody.appendChild(tr);
            });
        } catch (e) {
            this.leaderboardBody.innerHTML = '<tr><td colspan="4">Error loading leaderboard</td></tr>';
        }
    }

    showToast(message) {
        if (!this.toastContainer) return;
        const toast = document.createElement('div');
        toast.className = 'toast animate-toast';
        toast.textContent = message;
        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 2200);
    }
}

// Instantiate Engine on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    window.gameEngine = new WordQuestEngine();
});
