/**
 * WORD QUEST — Admin Control Panel Logic (admin.js)
 * Manages player registrations, leaderboard scores, PDF exports, stats calculations,
 * and custom word bank management.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // 0. Admin Access Code Authentication Gate
    // ----------------------------------------------------------------------
    const ADMIN_ACCESS_CODE = '673579';
    const STORAGE_KEY_ADMIN_AUTH = 'wordQuest_adminAuthed';

    const loginGate      = document.getElementById('admin-login-gate');
    const loginCodeInput = document.getElementById('admin-code-input');
    const loginSubmitBtn = document.getElementById('admin-code-submit');
    const loginErrorEl   = document.getElementById('admin-code-error');

    function isAdminAuthed() {
        try { return sessionStorage.getItem(STORAGE_KEY_ADMIN_AUTH) === 'true'; } catch (e) { return false; }
    }

    function unlockAdminPanel() {
        try { sessionStorage.setItem(STORAGE_KEY_ADMIN_AUTH, 'true'); } catch (e) {}
        if (loginGate) loginGate.classList.add('hidden');
        if (loginErrorEl) loginErrorEl.classList.add('hidden');
        if (loginCodeInput) loginCodeInput.value = '';
    }

    function attemptLogin() {
        const code = (loginCodeInput ? loginCodeInput.value : '').trim();
        if (code === ADMIN_ACCESS_CODE) {
            unlockAdminPanel();
        } else {
            if (loginErrorEl) loginErrorEl.classList.remove('hidden');
            if (loginCodeInput) {
                loginCodeInput.value = '';
                loginCodeInput.focus();
            }
        }
    }

    if (loginSubmitBtn) loginSubmitBtn.addEventListener('click', attemptLogin);
    if (loginCodeInput) {
        loginCodeInput.addEventListener('input', () => {
            // Auto-login once the full 6-digit code is entered
            if (loginCodeInput.value.trim().length === ADMIN_ACCESS_CODE.length) {
                attemptLogin();
            }
        });
        loginCodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                attemptLogin();
            }
        });
    }

    // ----------------------------------------------------------------------
    // 0.5. Present Mode (Live Players / Leaderboard) with code-locked close
    // ----------------------------------------------------------------------
    const previewBtn        = document.getElementById('btn-preview-leaderboard');
    const previewModal      = document.getElementById('modal-leaderboard-preview');
    const previewCloseBtn   = document.getElementById('close-leaderboard-preview');
    const previewLockGate   = document.getElementById('preview-lock-gate');
    const previewLockInput  = document.getElementById('preview-lock-code-input');
    const previewLockSubmit = document.getElementById('preview-lock-submit');
    const previewLockError  = document.getElementById('preview-lock-error');

    function buildPresentLeaderboard() {
        // Build the same deduplicated + sorted ranking as the leaderboard tab
        const bestByPlayer = {};
        leaderboardList.forEach(record => {
            const key = `${record.rollNumber || ''}|${record.department || ''}|${record.year || ''}`;
            const existing = bestByPlayer[key];
            const currCum = record.cumulativeScore || record.score || 0;
            const existCum = existing ? (existing.cumulativeScore || existing.score || 0) : -1;
            if (!existing || currCum > existCum) {
                bestByPlayer[key] = record;
            }
        });
        const ranked = Object.values(bestByPlayer).sort((a, b) => {
            const totalA = Math.max(a.cumulativeScore || 0, a.score || 0);
            const totalB = Math.max(b.cumulativeScore || 0, b.score || 0);
            if (totalB !== totalA) return totalB - totalA;
            return (b.score || 0) - (a.score || 0);
        });

        let rows = '';
        if (ranked.length === 0) {
            rows = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 2.5rem;">
                        No leaderboard scores recorded yet.
                    </td>
                </tr>`;
        } else {
            ranked.forEach((item, idx) => {
                const playerDoc = playersList.find(p => p.rollNumber && p.rollNumber === item.rollNumber) || {};
                const lvlNum = item.currentLevel || playerDoc.currentLevel || 1;
                const lvlTitle = item.levelTitle || playerDoc.levelTitle || 'Novice';

                let rankHtml = `${idx + 1}`;
                if (idx === 0) rankHtml = medalSvg('gold', '1');
                else if (idx === 1) rankHtml = medalSvg('silver', '2');
                else if (idx === 2) rankHtml = medalSvg('bronze', '3');

                rows += `
                    <tr>
                        <td><strong>${rankHtml}</strong></td>
                        <td><strong class="gold-text">${escapeHtml(item.rollNumber || '—')}</strong></td>
                        <td><strong>${escapeHtml(item.name || 'Anonymous')}</strong></td>
                        <td>${escapeHtml((item.department || '—').replace('Department of ', ''))}</td>
                        <td><span class="diff-chip diff-medium">${escapeHtml(item.year || '—')}</span></td>
                        <td>${getLevelBadgeHtml(lvlNum, lvlTitle)}</td>
                        <td><span class="cum-score">${Math.max(item.cumulativeScore || 0, item.score || 0)}</span></td>
                    </tr>`;
            });
        }

        return `
            <table class="admin-table preview-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Roll No</th>
                        <th>Player Name</th>
                        <th>Department</th>
                        <th>Year</th>
                        <th>Level</th>
                        <th>Total Score</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;
    }

    function buildPresentLive() {
        const deduped = deduplicatePlayers(playersList);
        const livePlayers = deduped.filter(item => isPlayerLiveInGame(item));

        let rows = '';
        if (livePlayers.length === 0) {
            rows = `
                <tr>
                    <td colspan="9" style="text-align: center; color: var(--text-secondary); padding: 2.5rem;">
                        No active live players right now.
                    </td>
                </tr>`;
        } else {
            livePlayers.forEach((item, idx) => {
                const lvlNum = item.currentLevel || 1;
                const lvlTitle = item.levelTitle || 'Novice';

                let rankHtml = `${idx + 1}`;
                if (idx === 0) rankHtml = medalSvg('gold', '1');
                else if (idx === 1) rankHtml = medalSvg('silver', '2');
                else if (idx === 2) rankHtml = medalSvg('bronze', '3');

                rows += `
                    <tr>
                        <td><strong>${rankHtml}</strong></td>
                        <td><span class="status-pill-live"><span class="live-pulse-dot"></span>LIVE</span></td>
                        <td><strong class="gold-text">${escapeHtml(item.rollNumber || '—')}</strong></td>
                        <td><strong>${escapeHtml(item.name || 'Anonymous')}</strong></td>
                        <td>${escapeHtml((item.department || '—').replace('Department of ', ''))}</td>
                        <td><span class="diff-chip diff-medium">${escapeHtml(item.year || '—')}</span></td>
                        <td>${getLevelBadgeHtml(lvlNum, lvlTitle)}</td>
                        <td><strong class="gold-text">${item.score || 0}</strong></td>
                        <td><span class="cum-score">${item.cumulativeScore || item.score || 0}</span></td>
                    </tr>`;
            });
        }

        return `
            <table class="admin-table preview-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Status</th>
                        <th>Roll No</th>
                        <th>Player Name</th>
                        <th>Department</th>
                        <th>Year</th>
                        <th>Level</th>
                        <th>Round Score</th>
                        <th>Total Score</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;
    }

    function openPresent(mode) {
        const container = document.getElementById('present-table-container');
        if (!container) return;

        const modeLabel = document.getElementById('present-mode-label');
        const modeTitle = document.getElementById('present-mode-title');

        if (mode === 'live') {
            if (modeLabel) modeLabel.textContent = 'LIVE PLAYERS';
            if (modeTitle) modeTitle.innerHTML = 'Word <span class="gold-text">Quest</span> — Live Players';
            container.innerHTML = buildPresentLive();
        } else {
            if (modeLabel) modeLabel.textContent = 'LIVE LEADERBOARD';
            if (modeTitle) modeTitle.innerHTML = 'Word <span class="gold-text">Quest</span> — Leaderboard';
            container.innerHTML = buildPresentLeaderboard();
        }

        if (previewModal) previewModal.classList.remove('hidden');
    }

    function closeLeaderboardPreview() {
        if (previewModal) previewModal.classList.add('hidden');
        if (previewLockGate) previewLockGate.classList.add('hidden');
        if (previewLockInput) previewLockInput.value = '';
        if (previewLockError) previewLockError.classList.add('hidden');
    }

    function attemptPreviewUnlock() {
        const code = (previewLockInput ? previewLockInput.value : '').trim();
        if (code === ADMIN_ACCESS_CODE) {
            closeLeaderboardPreview();
        } else {
            if (previewLockError) previewLockError.classList.remove('hidden');
            if (previewLockInput) {
                previewLockInput.value = '';
                previewLockInput.focus();
            }
        }
    }

    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            openPresent(currentTab === 'live' ? 'live' : 'leaderboard');
        });
    }
    if (previewCloseBtn) {
        previewCloseBtn.addEventListener('click', () => {
            if (previewLockGate) previewLockGate.classList.remove('hidden');
            if (previewLockError) previewLockError.classList.add('hidden');
            if (previewLockInput) {
                previewLockInput.value = '';
                previewLockInput.focus();
            }
        });
    }
    if (previewLockSubmit) {
        previewLockSubmit.addEventListener('click', attemptPreviewUnlock);
    }
    if (previewLockInput) {
        previewLockInput.addEventListener('input', () => {
            if (previewLockInput.value.trim().length === ADMIN_ACCESS_CODE.length) {
                attemptPreviewUnlock();
            }
        });
        previewLockInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                attemptPreviewUnlock();
            }
        });
    }

    // Default initial word bank if none saved
    const DEFAULT_WORD_BANK = [
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
        'SYNECDOCHE'
    ];

    // LocalStorage Keys
    const STORAGE_KEY_LEADERBOARD = 'wordQuest_leaderboard';
    const STORAGE_KEY_CUSTOM_WORDS = 'wordQuest_customWords';

    // DOM Elements - Dashboard Stats
    const statTotalPlayers = document.getElementById('stat-total-players');
    const statTopScore     = document.getElementById('stat-top-score');
    const statTopDept      = document.getElementById('stat-top-dept');
    const statAvgScore     = document.getElementById('stat-avg-score');

    // DOM Elements - Tabs
    const tabBtnPlayers     = document.getElementById('tab-btn-players');
    const tabBtnLive        = document.getElementById('tab-btn-live');
    const tabBtnLeaderboard = document.getElementById('tab-btn-leaderboard');
    const viewPlayersTable  = document.getElementById('view-players-table');
    const viewLiveTable     = document.getElementById('view-live-table');
    const viewLeaderboardTable = document.getElementById('view-leaderboard-table');
    const badgePlayersCount = document.getElementById('badge-players-count');
    const badgeLiveCount    = document.getElementById('badge-live-count');
    const badgeLeaderboardCount = document.getElementById('badge-leaderboard-count');
    const statCardLive      = document.getElementById('stat-card-live');

    // DOM Elements - Filters & Tables
    const searchInput = document.getElementById('admin-search-input');
    const deptFilter  = document.getElementById('admin-dept-filter');
    const yearFilter  = document.getElementById('admin-year-filter');
    const playersTableBody = document.getElementById('admin-players-table-body');
    const liveTableBody    = document.getElementById('admin-live-table-body');
    const leaderboardTableBody = document.getElementById('admin-leaderboard-table-body');

    // DOM Elements - Action Buttons
    const exportBtn    = document.getElementById('export-pdf-btn');
    const clearBtn     = document.getElementById('clear-data-btn');
    const addWordForm  = document.getElementById('add-word-form');
    const newWordInput = document.getElementById('new-word-input');
    const wordsTagContainer = document.getElementById('words-tag-container');

    // Data State
    let playersList     = []; // Registered players from Firestore 'players'
    let leaderboardList = []; // Game scores from Firestore 'leaderboard'
    let playSessionsList = []; // Completed/abandoned rounds from Firestore 'playSessions'
    let customWordsList = [];
    let currentTab      = 'players'; // 'players' | 'live' | 'leaderboard'
    let firebaseReady   = false;    // true once Firestore has responded at least once

    // ----------------------------------------------------------------------
    // 1. Tab Switching
    // ----------------------------------------------------------------------
    function switchTab(tab) {
        currentTab = tab;
        if (tabBtnPlayers)     tabBtnPlayers.classList.toggle('active', tab === 'players');
        if (tabBtnLive)        tabBtnLive.classList.toggle('active', tab === 'live');
        if (tabBtnLeaderboard) tabBtnLeaderboard.classList.toggle('active', tab === 'leaderboard');

        if (viewPlayersTable)     viewPlayersTable.classList.toggle('hidden', tab !== 'players');
        if (viewLiveTable)        viewLiveTable.classList.toggle('hidden', tab !== 'live');
        if (viewLeaderboardTable) viewLeaderboardTable.classList.toggle('hidden', tab !== 'leaderboard');

        // Present button only appears on the Live Players & Leaderboard tabs
        if (previewBtn) previewBtn.classList.toggle('hidden', tab !== 'live' && tab !== 'leaderboard');

        renderCurrentTab();
    }

    if (tabBtnPlayers)     tabBtnPlayers.addEventListener('click', () => switchTab('players'));
    if (tabBtnLive)        tabBtnLive.addEventListener('click', () => switchTab('live'));
    if (tabBtnLeaderboard) tabBtnLeaderboard.addEventListener('click', () => switchTab('leaderboard'));
    if (statCardLive)      statCardLive.addEventListener('click', () => switchTab('live'));

    // ----------------------------------------------------------------------
    // 2. Load Local Data Backup
    // ----------------------------------------------------------------------
    let leaderboardCache = []; // localStorage fallback cached separately

    function loadData() {
        leaderboardList = [];
        try {
            leaderboardCache = JSON.parse(localStorage.getItem(STORAGE_KEY_LEADERBOARD) || '[]');
        } catch (e) {
            leaderboardCache = [];
        }
        try {
            customWordsList = JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM_WORDS) || JSON.stringify(DEFAULT_WORD_BANK));
        } catch (e) {
            customWordsList = [...DEFAULT_WORD_BANK];
        }
    }

    // A player is "live" only if they reported in recently.
    // Heartbeat syncs every 15s, so a stale player who closed their tab abruptly
    // (no reliable unload write) drops off after LIVE_STALE_MS without a Firestore write.
    const LIVE_STALE_MS = 60000;

    function tsToMillis(ts) {
        if (!ts) return null;
        if (typeof ts.toMillis === 'function') return ts.toMillis();
        if (ts instanceof Date) return ts.getTime();
        if (typeof ts === 'number') return ts;
        if (typeof ts === 'string') return Date.parse(ts);
        return null;
    }

    function isFreshLiveState(item) {
        const liveState = item && item.liveState;
        if (!liveState) return false;
        const stamp = tsToMillis(liveState.updatedAt) || tsToMillis(item.lastActiveAt);
        return stamp !== null && (Date.now() - stamp) < LIVE_STALE_MS;
    }

    function isPlayerLiveInGame(item) {
        return item && item.active === true && item.liveState && Array.isArray(item.liveState.grid) && item.liveState.grid.length > 0 && isFreshLiveState(item);
    }

    function getStatusBadgeHtml(isActive) {
        if (isActive) {
            return `<span class="status-pill-live"><span class="live-pulse-dot"></span>LIVE</span>`;
        }
        return `<span class="status-pill-offline">Offline</span>`;
    }

    function medalSvg(kind, num) {
        const colors = { gold: ['#f7c948', '#b8860b'], silver: ['#cfd8dc', '#90a4ae'], bronze: ['#e0a458', '#b4652a'] };
        const [face, edge] = colors[kind] || colors.gold;
        return `<svg class="rank-medal" width="20" height="20" viewBox="0 0 24 24" aria-label="${num}st place">
            <circle cx="12" cy="14" r="7" fill="${edge}"/>
            <circle cx="12" cy="14" r="5.6" fill="${face}"/>
            <path d="M8.21 13.89 7 22l5-3 5 3-1.21-8.11" stroke="${edge}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <text x="12" y="15.1" font-size="7" font-weight="bold" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif">${num}</text>
        </svg>`;
    }

    function getLevelBadgeHtml(lvlNum, lvlTitle) {
        const lvl = lvlNum || 1;
        const title = lvlTitle || (lvl === 1 ? 'Novice' : lvl === 2 ? 'Apprentice' : lvl === 3 ? 'Scholar' : lvl === 4 ? 'Master' : `Grandmaster Lvl ${lvl}`);
        const isMaster = lvl >= 4;
        return `<span class="level-chip ${isMaster ? 'level-chip-master' : ''}">Lvl ${lvl} (${escapeHtml(title)})</span>`;
    }

    // ----------------------------------------------------------------------
    // 3. Compute Dashboard Statistics
    // ----------------------------------------------------------------------
    function updateStats() {
        // Total Registered Participants Count (deduplicated)
        const dedupedReg = deduplicatePlayers(playersList);
        const totalReg = dedupedReg.length;
        if (statTotalPlayers) statTotalPlayers.textContent = totalReg;
        if (badgePlayersCount) badgePlayersCount.textContent = totalReg;

        // Live Players Count (Strictly active inside game.html with generated grid)
        const liveCount = dedupedReg.filter(p => isPlayerLiveInGame(p)).length;
        if (badgeLiveCount) badgeLiveCount.textContent = liveCount;
        const statLiveGames = document.getElementById('stat-live-games');
        if (statLiveGames) statLiveGames.textContent = liveCount;

        // Leaderboard Count — deduplicated unique players (same key as renderLeaderboardTable)
        const uniquePlayers = {};
        leaderboardList.forEach(r => {
            const key = `${r.rollNumber || ''}|${r.department || ''}|${r.year || ''}`;
            const currTotal = Math.max(r.cumulativeScore || 0, r.score || 0);
            const existTotal = uniquePlayers[key] ? Math.max(uniquePlayers[key].cumulativeScore || 0, uniquePlayers[key].score || 0) : -1;
            if (!uniquePlayers[key] || currTotal > existTotal) {
                uniquePlayers[key] = r;
            }
        });
        const uniquePlayerCount = Object.keys(uniquePlayers).length;
        if (badgeLeaderboardCount) badgeLeaderboardCount.textContent = uniquePlayerCount;

        // Use deduplicated best scores for all stat calculations
        const dedupedScores = Object.values(uniquePlayers);
        if (dedupedScores.length === 0) {
            if (statTopScore) statTopScore.textContent = '0';
            if (statTopDept) statTopDept.textContent = 'None';
            if (statAvgScore) statAvgScore.textContent = '0';
            return;
        }

        // Top Score — use cumulativeScore (true total), fallback to score
        const topScore = Math.max(...dedupedScores.map(r => Math.max(r.cumulativeScore || 0, r.score || 0)));
        if (statTopScore) statTopScore.textContent = topScore;

        // Average Score (based on each player's cumulative total)
        const sumScore = dedupedScores.reduce((acc, r) => acc + Math.max(r.cumulativeScore || 0, r.score || 0), 0);
        const avgScore = Math.round(sumScore / dedupedScores.length);
        if (statAvgScore) statAvgScore.textContent = avgScore;

        // Top Department (highest cumulative best-score per department)
        const deptScores = {};
        dedupedScores.forEach(r => {
            if (!r.department) return;
            const shortDept = r.department.replace('Department of ', '');
            deptScores[shortDept] = (deptScores[shortDept] || 0) + Math.max(r.cumulativeScore || 0, r.score || 0);
        });

        let topDeptName = 'None';
        let maxDeptScore = -1;
        for (const [dept, score] of Object.entries(deptScores)) {
            if (score > maxDeptScore) {
                maxDeptScore = score;
                topDeptName = dept;
            }
        }
        if (statTopDept) statTopDept.textContent = topDeptName;
    }

    // ----------------------------------------------------------------------
    // 4. Render Registered Players Table
    // ----------------------------------------------------------------------
    function renderPlayersTable() {
        if (!playersTableBody) return;
        playersTableBody.innerHTML = '';

        const searchVal = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const selectedDept = deptFilter ? deptFilter.value : 'ALL';
        const selectedYear = yearFilter ? yearFilter.value : 'ALL';

        const deduped = deduplicatePlayers(playersList);

        const filtered = deduped.filter(item => {
            const nameMatch = !searchVal || 
                (item.name || '').toLowerCase().includes(searchVal) ||
                (item.rollNumber || '').toLowerCase().includes(searchVal);

            const deptMatch = selectedDept === 'ALL' || item.department === selectedDept;
            const yearMatch = selectedYear === 'ALL' || item.year === selectedYear;

            return nameMatch && deptMatch && yearMatch;
        });

        if (filtered.length === 0) {
            playersTableBody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                        No registered players match the current criteria.
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach((item, idx) => {
            const tr = document.createElement('tr');
            const deptDisplay  = item.department ? item.department.replace('Department of ', '') : '—';
            const rollDisplay  = item.rollNumber || '—';
            const yearDisplay  = item.year || '—';
            const dateDisplay  = item.dateDisplay || '—';
            const phoneDisplay = item.phoneNumber || '—';
            const statusHtml   = getStatusBadgeHtml(isPlayerLiveInGame(item));
            const levelHtml    = getLevelBadgeHtml(item.currentLevel, item.levelTitle);
            const totalScore   = Math.max(Number(item.cumulativeScore) || 0, Number(item.score) || 0);

            tr.innerHTML = `
                <td><strong class="gold-text">${escapeHtml(rollDisplay)}</strong></td>
                <td><a class="player-name-link" data-id="${item.id}" title="View play history" style="font-weight: 600; color: var(--text-primary); text-decoration: none;">${escapeHtml(item.name || 'Anonymous')}</a></td>
                <td>${statusHtml}</td>
                <td>${levelHtml}</td>
                <td style="font-weight: 700; color: var(--accent-gold-light);">${totalScore}</td>
                <td><a href="tel:${escapeHtml(phoneDisplay)}" style="color: var(--accent-gold-light); font-weight: 600; text-decoration: none;">${escapeHtml(phoneDisplay)}</a></td>
                <td>${escapeHtml(deptDisplay)}</td>
                <td><span class="diff-chip diff-medium">${escapeHtml(yearDisplay)}</span></td>
                <td>${escapeHtml(dateDisplay)}</td>
                <td style="text-align: right;">
                    <button class="delete-row-btn" data-id="${item.id}" data-roll="${escapeHtml(item.rollNumber || '')}" data-dept="${escapeHtml(item.department || '')}" data-year="${escapeHtml(item.year || '')}" data-name="${escapeHtml(item.name || 'Player')}" title="Delete registration">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </td>
            `;
            playersTableBody.appendChild(tr);
        });

        // Event Handlers for viewing a player's play history (click the name)
        playersTableBody.querySelectorAll('.player-name-link').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = el.getAttribute('data-id');
                const player = deduped.find(p => p.id === id);
                if (player) openPlayerHistoryModal(player);
            });
        });

        // Event Handlers for delete player
        playersTableBody.querySelectorAll('.delete-row-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const roll = btn.getAttribute('data-roll') || '';
                const dept = btn.getAttribute('data-dept') || '';
                const year = btn.getAttribute('data-year') || '';
                const name = btn.getAttribute('data-name');
                if (!confirm(`Are you sure you want to delete registration & score data for "${name}"?`)) return;
                btn.disabled = true;
                btn.innerHTML = '<span style="opacity:0.5">Deleting...</span>';
                const target = { id, rollNumber: roll, department: dept, year };
                const deleted = window.WordQuestFirebase && window.WordQuestFirebase.deletePlayerFromFirestore
                    ? await window.WordQuestFirebase.deletePlayerFromFirestore(target).catch(() => false)
                    : false;
                if (deleted !== false) {
                    playersList = playersList.filter(p => p.id !== id && p.rollNumber !== roll);
                    leaderboardList = leaderboardList.filter(r => r.id !== id && r.rollNumber !== roll);
                    playSessionsList = playSessionsList.filter(s => s.rollNumber !== roll);
                    saveLeaderboard();
                }
                updateStats();
                renderPlayersTable();
            });
        });
    }

    // ----------------------------------------------------------------------
    // 4.5. Render Live Players Table View
    // ----------------------------------------------------------------------
    function renderLivePlayersTable() {
        if (!liveTableBody) return;
        liveTableBody.innerHTML = '';

        const searchVal = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const selectedDept = deptFilter ? deptFilter.value : 'ALL';
        const selectedYear = yearFilter ? yearFilter.value : 'ALL';

        const deduped = deduplicatePlayers(playersList);
        const livePlayers = deduped.filter(item => isPlayerLiveInGame(item));

        const filtered = livePlayers.filter(item => {
            const nameMatch = !searchVal || 
                (item.name || '').toLowerCase().includes(searchVal) ||
                (item.rollNumber || '').toLowerCase().includes(searchVal);

            const deptMatch = selectedDept === 'ALL' || item.department === selectedDept;
            const yearMatch = selectedYear === 'ALL' || item.year === selectedYear;

            return nameMatch && deptMatch && yearMatch;
        });

        if (filtered.length === 0) {
            liveTableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; color: var(--text-secondary); padding: 2.5rem;">
                        <div style="font-size: 1.05rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">No Active Live Players</div>
                        <div>Players currently playing in <code>game.html</code> will appear here automatically in real time.</div>
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach((item) => {
            const tr = document.createElement('tr');
            const deptDisplay  = item.department ? item.department.replace('Department of ', '') : '—';
            const rollDisplay  = item.rollNumber || '—';
            const yearDisplay  = item.year || '—';
            const phoneDisplay = item.phoneNumber || '—';
            const statusHtml   = getStatusBadgeHtml(true);
            const levelHtml    = getLevelBadgeHtml(item.currentLevel, item.levelTitle);
            const roundScore   = item.score || 0;
            const totalScore   = item.cumulativeScore || item.score || 0;

            tr.innerHTML = `
                <td>${statusHtml}</td>
                <td><strong class="gold-text">${escapeHtml(rollDisplay)}</strong></td>
                <td><strong>${escapeHtml(item.name || 'Anonymous')}</strong></td>
                <td>${escapeHtml(deptDisplay)}</td>
                <td><span class="diff-chip diff-medium">${escapeHtml(yearDisplay)}</span></td>
                <td>${levelHtml}</td>
                <td><strong class="gold-text">${roundScore}</strong></td>
                <td><span class="cum-score">${totalScore}</span></td>
                <td><a href="tel:${escapeHtml(phoneDisplay)}" style="color: var(--accent-gold-light); font-weight: 600; text-decoration: none;">${escapeHtml(phoneDisplay)}</a></td>
                <td class="action-cell">
                    <div class="action-btns">
                        <button class="glass-btn btn-sm btn-secondary btn-icon btn-msg-player" data-id="${item.id}" data-name="${escapeHtml((item.name || 'Anonymous').replace(/"/g, '&quot;'))}" title="Send a live message to this player" aria-label="Message player">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        </button>
                        <button class="glass-btn btn-sm btn-secondary btn-icon btn-spectate-grid" data-id="${item.id}" title="Inspect Live Grid" aria-label="Inspect live grid">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                    </div>
                </td>
            `;
            liveTableBody.appendChild(tr);
        });

        // Event Handlers for spectating live player grid
        liveTableBody.querySelectorAll('.btn-spectate-grid').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const player = deduped.find(p => p.id === id);
                if (player) openSpectatorModal(player);
            });
        });

        // Event Handlers for messaging a single live player
        liveTableBody.querySelectorAll('.btn-msg-player').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const player = deduped.find(p => p.id === id);
                if (player) openMessageCompose(player);
            });
        });
    }

    // ----------------------------------------------------------------------
    // 4.6. Live Grid Spectator Mode Modal Logic
    // ----------------------------------------------------------------------
    let spectatorUnsubscribe = null;
    let activeSpectatePlayerId = null;
    let spectatorTimerInterval = null;
    let spectatorTimerTarget = null;

    const modalLiveGrid      = document.getElementById('modal-live-grid');
    const closeSpectateBtn   = document.getElementById('close-spectate-modal');
    const spectateNameEl     = document.getElementById('spectate-player-name');
    const spectateSubEl      = document.getElementById('spectate-player-sub');
    const spectateLevelEl    = document.getElementById('spectate-level-val');
    const spectateScoreEl    = document.getElementById('spectate-score-val');
    const spectateTotalEl    = document.getElementById('spectate-total-val');
    const spectateFoundEl    = document.getElementById('spectate-found-val');
    const spectateTimerEl    = document.getElementById('spectate-timer-val');
    const spectateGridMatrix = document.getElementById('spectate-grid-matrix');
    const spectateWordsList  = document.getElementById('spectate-words-list');

    function openSpectatorModal(player) {
        if (!player || !player.id) return;
        activeSpectatePlayerId = player.id;

        if (spectateNameEl) spectateNameEl.textContent = player.name || 'Anonymous Player';
        if (spectateSubEl)  spectateSubEl.textContent  = `Roll: ${player.rollNumber || '—'} • Dept: ${(player.department || '—').replace('Department of ', '')} • Year: ${player.year || '—'}`;
        
        if (modalLiveGrid) modalLiveGrid.classList.remove('hidden');

        // Close any previous listener
        if (spectatorUnsubscribe) {
            spectatorUnsubscribe();
            spectatorUnsubscribe = null;
        }

        // Subscribe real-time
        if (window.WordQuestFirebase && window.WordQuestFirebase.subscribeToPlayerLiveGrid) {
            spectatorUnsubscribe = window.WordQuestFirebase.subscribeToPlayerLiveGrid(player.id, (liveDoc) => {
                renderSpectatorGrid(liveDoc);
            });
        } else {
            renderSpectatorGrid(player);
        }
    }

    function closeSpectatorModal() {
        if (modalLiveGrid) modalLiveGrid.classList.add('hidden');
        if (spectatorUnsubscribe) {
            spectatorUnsubscribe();
            spectatorUnsubscribe = null;
        }
        stopSpectatorTimer();
        activeSpectatePlayerId = null;
    }

    // Recompute the absolute end time from the player's last synced remaining seconds + timestamp
    function startSpectatorTimer(remainingSeconds, updatedAt) {
        stopSpectatorTimer();
        if (typeof remainingSeconds !== 'number') {
            if (spectateTimerEl) spectateTimerEl.textContent = '--:--';
            return;
        }

        let stampMs = null;
        if (updatedAt && typeof updatedAt.toMillis === 'function') {
            stampMs = updatedAt.toMillis();
        } else if (updatedAt instanceof Date) {
            stampMs = updatedAt.getTime();
        } else if (typeof updatedAt === 'number') {
            stampMs = updatedAt;
        } else if (typeof updatedAt === 'string') {
            stampMs = Date.parse(updatedAt);
        }

        spectatorTimerTarget = stampMs ? stampMs + remainingSeconds * 1000 : null;
        updateSpectatorTimerTick();

        if (spectatorTimerTarget) {
            spectatorTimerInterval = setInterval(updateSpectatorTimerTick, 1000);
        }
    }

    function stopSpectatorTimer() {
        if (spectatorTimerInterval) {
            clearInterval(spectatorTimerInterval);
            spectatorTimerInterval = null;
        }
        spectatorTimerTarget = null;
    }

    function updateSpectatorTimerTick() {
        if (!spectateTimerEl) return;
        let remaining = 0;
        if (spectatorTimerTarget) {
            remaining = Math.max(0, Math.ceil((spectatorTimerTarget - Date.now()) / 1000));
        }
        const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
        const ss = String(remaining % 60).padStart(2, '0');
        spectateTimerEl.textContent = `${mm}:${ss}`;
        spectateTimerEl.classList.toggle('spectate-timer-danger', remaining <= 30);
    }

    if (closeSpectateBtn) closeSpectateBtn.addEventListener('click', closeSpectatorModal);
    if (modalLiveGrid) {
        modalLiveGrid.addEventListener('click', (e) => {
            if (e.target === modalLiveGrid) closeSpectatorModal();
        });
    }

    function renderSpectatorGrid(playerData) {
        if (!playerData) return;
        const liveState = playerData.liveState || {};
        const grid = liveState.grid || [];
        const words = liveState.words || [];
        const placed = liveState.placed || {};
        const foundWords = new Set(liveState.foundWords || []);
        const gridSize = liveState.gridSize || (grid.length || 12);
        const levelNum = liveState.level || playerData.currentLevel || 1;
        const levelTitle = liveState.levelTitle || playerData.levelTitle || 'Novice';
        const roundScore = typeof liveState.score === 'number' ? liveState.score : (playerData.score || 0);
        const totalScore = typeof liveState.cumulativeScore === 'number' ? liveState.cumulativeScore : (playerData.cumulativeScore || roundScore);

        if (spectateLevelEl) spectateLevelEl.textContent = `Lvl ${levelNum} (${levelTitle})`;
        if (spectateScoreEl) spectateScoreEl.textContent = roundScore;
        if (spectateTotalEl) spectateTotalEl.textContent = totalScore;
        if (spectateFoundEl) spectateFoundEl.textContent = `${foundWords.size} / ${words.length}`;

        // Sync the live countdown from the player's latest synced remaining time.
        // remainingSeconds is stamped at updatedAt, so derive the absolute end time
        // and tick it down locally every second for a smooth spectator clock.
        startSpectatorTimer(liveState.remainingSeconds, liveState.updatedAt);

        // Build set of cell coordinates (r, c) that belong to found words
        const foundCells = new Set();
        foundWords.forEach(word => {
            const cells = placed[word] || [];
            cells.forEach(({ r, c }) => {
                foundCells.add(`${r},${c}`);
            });
        });

        // Render Grid Matrix
        if (spectateGridMatrix) {
            spectateGridMatrix.style.gridTemplateColumns = `repeat(${gridSize}, 32px)`;
            spectateGridMatrix.innerHTML = '';

            if (!grid || grid.length === 0) {
                spectateGridMatrix.innerHTML = '<div style="color: var(--text-secondary); padding: 1.5rem; text-align: center;">Waiting for player to initialize puzzle grid...</div>';
            } else {
                for (let r = 0; r < gridSize; r++) {
                    for (let c = 0; c < gridSize; c++) {
                        const cellEl = document.createElement('div');
                        cellEl.className = 'spectate-cell';
                        const letter = (grid[r] && grid[r][c]) ? grid[r][c] : ' ';
                        cellEl.textContent = letter;
                        if (foundCells.has(`${r},${c}`)) {
                            cellEl.classList.add('spectate-cell-found');
                        }
                        spectateGridMatrix.appendChild(cellEl);
                    }
                }
            }
        }

        // Render Words Sidebar Checklist
        if (spectateWordsList) {
            spectateWordsList.innerHTML = '';
            if (words.length === 0) {
                spectateWordsList.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.8rem;">No target words found</div>';
            } else {
                words.forEach(word => {
                    const isFound = foundWords.has(word);
                    const itemEl = document.createElement('div');
                    itemEl.className = `spectate-word-item ${isFound ? 'spectate-word-found' : ''}`;
                    itemEl.innerHTML = `
                        <span>${escapeHtml(word)}</span>
                        <span>${isFound ? '✓' : '—'}</span>
                    `;
                    spectateWordsList.appendChild(itemEl);
                });
            }
        }
    }

    // ----------------------------------------------------------------------
    // 4.7. Admin Message Compose Modal (single player or broadcast to live)
    // ----------------------------------------------------------------------
    let msgComposeTarget = null; // { type: 'single', id, name } | { type: 'broadcast', ids: [] }

    const msgComposeModal = document.getElementById('modal-msg-compose');
    const msgComposeTitleEl = document.getElementById('msg-compose-title');
    const msgComposeSubEl = document.getElementById('msg-compose-sub');
    const msgComposeTextEl = document.getElementById('msg-compose-text');
    const msgComposeSendBtn = document.getElementById('msg-compose-send');
    const msgComposeCancelBtn = document.getElementById('msg-compose-cancel');
    const closeMsgComposeBtn = document.getElementById('close-msg-compose');

    function openMessageCompose(player) {
        msgComposeTarget = { type: 'single', id: player.id, name: player.name || 'Anonymous Player' };
        if (msgComposeTitleEl) msgComposeTitleEl.textContent = 'Message to Player';
        if (msgComposeSubEl) {
            msgComposeSubEl.textContent = `${msgComposeTarget.name} • Roll: ${player.rollNumber || '—'}`;
        }
        if (msgComposeTextEl) msgComposeTextEl.value = '';
        if (msgComposeModal) msgComposeModal.classList.remove('hidden');
        if (msgComposeTextEl) setTimeout(() => msgComposeTextEl.focus(), 60);
    }

    function openBroadcastCompose(livePlayers) {
        const ids = livePlayers.map(p => p.id).filter(Boolean);
        if (ids.length === 0) {
            alert('No live players currently online to broadcast to.');
            return;
        }
        msgComposeTarget = { type: 'broadcast', ids };
        if (msgComposeTitleEl) msgComposeTitleEl.textContent = 'Broadcast to Live Players';
        if (msgComposeSubEl) msgComposeSubEl.textContent = `This message will go to ${ids.length} live player${ids.length === 1 ? '' : 's'} in real time.`;
        if (msgComposeTextEl) msgComposeTextEl.value = '';
        if (msgComposeModal) msgComposeModal.classList.remove('hidden');
        if (msgComposeTextEl) setTimeout(() => msgComposeTextEl.focus(), 60);
    }

    function closeMessageCompose() {
        if (msgComposeModal) msgComposeModal.classList.add('hidden');
        msgComposeTarget = null;
        if (msgComposeTextEl) msgComposeTextEl.value = '';
    }

    async function sendComposedMessage() {
        const text = (msgComposeTextEl ? msgComposeTextEl.value : '').trim();
        if (!text) {
            alert('Please type a message before sending.');
            return;
        }
        if (!msgComposeTarget) return;
        if (msgComposeSendBtn) {
            msgComposeSendBtn.disabled = true;
        }

        const fb = window.WordQuestFirebase;
        let ok = false;
        if (msgComposeTarget.type === 'single') {
            if (fb && fb.sendMessageToPlayer) {
                ok = await fb.sendMessageToPlayer(msgComposeTarget.id, text);
            }
        } else {
            if (fb && fb.broadcastMessageToLivePlayers) {
                const sent = await fb.broadcastMessageToLivePlayers(msgComposeTarget.ids, text);
                ok = sent > 0;
            }
        }

        if (ok) {
            const wasBroadcast = msgComposeTarget.type === 'broadcast';
            closeMessageCompose();
            alert(wasBroadcast ? 'Message broadcast to all live players.' : 'Message sent to the player.');
        } else {
            if (msgComposeSendBtn) msgComposeSendBtn.disabled = false;
            alert('Failed to send message. Please check the player is still live and try again.');
        }
    }

    if (msgComposeSendBtn) msgComposeSendBtn.addEventListener('click', sendComposedMessage);
    if (msgComposeCancelBtn) msgComposeCancelBtn.addEventListener('click', closeMessageCompose);
    if (closeMsgComposeBtn) closeMsgComposeBtn.addEventListener('click', closeMessageCompose);
    if (msgComposeModal) {
        msgComposeModal.addEventListener('click', (e) => {
            if (e.target === msgComposeModal) closeMessageCompose();
        });
    }
    const broadcastBtn = document.getElementById('btn-broadcast-message');
    if (broadcastBtn) {
        broadcastBtn.addEventListener('click', () => {
            const livePlayers = deduplicatePlayers(playersList).filter(p => isPlayerLiveInGame(p));
            openBroadcastCompose(livePlayers);
        });
    }

    // ----------------------------------------------------------------------
    // 4.8. Player Play History Modal (per-player session log)
    // ----------------------------------------------------------------------
    const historyModal        = document.getElementById('modal-player-history');
    const closeHistoryBtn     = document.getElementById('close-history-modal');
    const historyNameEl       = document.getElementById('history-player-name');
    const historySubEl        = document.getElementById('history-player-sub');
    const historyTableBody    = document.getElementById('history-table-body');
    const historySummaryEls   = {
        games: document.getElementById('history-games-val'),
        time:  document.getElementById('history-time-val'),
        best:  document.getElementById('history-best-val'),
        total: document.getElementById('history-total-val'),
        level: document.getElementById('history-level-val'),
        last:  document.getElementById('history-last-val')
    };

    function formatDuration(secs) {
        secs = Math.max(0, Math.round(Number(secs) || 0));
        if (secs < 60) return `${secs}s`;
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
        const h = Math.floor(m / 60);
        const rm = m % 60;
        return `${h}h ${String(rm).padStart(2, '0')}m`;
    }

    function tsToStamp(ts) {
        const ms = tsToMillis(ts);
        return ms ? new Date(ms) : null;
    }

    function formatDateTime12hr(ts) {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        });
    }

    function getSessionResultHtml(result) {
        switch (result) {
            case 'win':     return '<span class="history-result-pill result-win">Cleared</span>';
            case 'timeout': return '<span class="history-result-pill result-fail">Failed</span>';
            case 'ended':   return '<span class="history-result-pill result-ended">Ended by Admin</span>';
            default:        return '<span class="history-result-pill result-left">Left mid-game</span>';
        }
    }

    function playerSessionKey(player) {
        return `${player.rollNumber || ''}|${player.department || ''}|${player.year || ''}`;
    }

    function openPlayerHistoryModal(player) {
        if (!player) return;

        if (historyNameEl) historyNameEl.textContent = player.name || 'Anonymous Player';
        if (historySubEl)  historySubEl.textContent  = `Roll: ${player.rollNumber || '—'} • Dept: ${(player.department || '—').replace('Department of ', '')} • Year: ${player.year || '—'}`;

        const key = playerSessionKey(player);
        const sessions = playSessionsList
            .filter(s => playerSessionKey(s) === key)
            .slice()
            .sort((a, b) => tsToMillis(b.endedAt) - tsToMillis(a.endedAt));

        // ── Summary strip ──────────────────────────────
        const totalTimeSecs = sessions.reduce((acc, s) => acc + (Number(s.timePlayedSecs) || 0), 0);
        const bestRound = sessions.reduce((mx, s) => Math.max(mx, Number(s.score) || 0), 0);
        let lastPlayedStamp = null;
        sessions.forEach(s => {
            const t = tsToMillis(s.endedAt);
            if (t && (!lastPlayedStamp || t > lastPlayedStamp)) lastPlayedStamp = t;
        });

        const levelNum = Number(player.currentLevel) || 1;
        const levelTitle = player.levelTitle || 'Novice';

        if (historySummaryEls.games) historySummaryEls.games.textContent = sessions.length;
        if (historySummaryEls.time)  historySummaryEls.time.textContent  = sessions.length ? formatDuration(totalTimeSecs) : '—';
        if (historySummaryEls.best)  historySummaryEls.best.textContent  = sessions.length ? bestRound : '—';
        if (historySummaryEls.total) historySummaryEls.total.textContent = Math.max(Number(player.cumulativeScore) || 0, Number(player.score) || 0);
        if (historySummaryEls.level) historySummaryEls.level.textContent = `Lvl ${levelNum} (${escapeHtml(levelTitle)})`;

        let lastPlayedText = '—';
        if (lastPlayedStamp) {
            lastPlayedText = formatDateTime12hr(lastPlayedStamp) || new Date(lastPlayedStamp).toLocaleString();
        } else {
            const fallback = tsToMillis(player.lastActiveAt) || tsToMillis(player.gameStartedAt) || tsToMillis(player.registeredAt);
            if (fallback) lastPlayedText = formatDateTime12hr(fallback) || new Date(fallback).toLocaleString();
        }
        if (historySummaryEls.last) historySummaryEls.last.textContent = lastPlayedText;

        // ── Session table ──────────────────────────────
        if (historyTableBody) historyTableBody.innerHTML = '';

        if (sessions.length === 0) {
            if (historyTableBody) {
                historyTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                            No recorded play sessions yet.
                        </td>
                    </tr>`;
            }
        } else {
            sessions.forEach((s, i) => {
                const tr = document.createElement('tr');
                const when = tsToStamp(s.endedAt);
                tr.innerHTML = `
                    <td><strong class="gold-text">#${i + 1}</strong></td>
                    <td>${getLevelBadgeHtml(Number(s.level) || 1, s.levelTitle || 'Novice')}</td>
                    <td>${getSessionResultHtml(s.result)}</td>
                    <td>${(s.wordsFound || 0)} / ${(s.totalWords || 0)}</td>
                    <td><strong class="gold-text">${Number(s.score) || 0}</strong></td>
                    <td>${formatDuration(s.timePlayedSecs)}</td>
                    <td>${when ? when.toLocaleString() : '—'}</td>
                `;
                historyTableBody.appendChild(tr);
            });
        }

        if (historyModal) historyModal.classList.remove('hidden');
    }

    function closePlayerHistoryModal() {
        if (historyModal) historyModal.classList.add('hidden');
        if (historyTableBody) historyTableBody.innerHTML = '';
    }

    if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', closePlayerHistoryModal);
    if (historyModal) {
        historyModal.addEventListener('click', (e) => {
            if (e.target === historyModal) closePlayerHistoryModal();
        });
    }

    // ----------------------------------------------------------------------
    // 5. Render Leaderboard Data Table
    // ----------------------------------------------------------------------
    function renderLeaderboardTable() {
        if (!leaderboardTableBody) return;
        leaderboardTableBody.innerHTML = '';

        const searchVal = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const selectedDept = deptFilter ? deptFilter.value : 'ALL';
        const selectedYear = yearFilter ? yearFilter.value : 'ALL';

        // ── Deduplicate: keep only each player's best (highest) score ──────
        // Key = rollNumber + department + year to uniquely identify a player
        const bestByPlayer = {};
        leaderboardList.forEach(record => {
            const key = `${record.rollNumber || ''}|${record.department || ''}|${record.year || ''}`;
            const existing = bestByPlayer[key];
            const currCum = record.cumulativeScore || record.score || 0;
            const existCum = existing ? (existing.cumulativeScore || existing.score || 0) : -1;
            if (!existing || currCum > existCum) {
                bestByPlayer[key] = record;
            }
        });
        // Convert map back to array, sorted by cumulativeScore / total score descending
        const deduped = Object.values(bestByPlayer).sort((a, b) => {
            const totalA = Math.max(a.cumulativeScore || 0, a.score || 0);
            const totalB = Math.max(b.cumulativeScore || 0, b.score || 0);
            if (totalB !== totalA) return totalB - totalA;
            return (b.score || 0) - (a.score || 0);
        });

        const filtered = deduped.filter(record => {
            const nameMatch = !searchVal || 
                (record.name || '').toLowerCase().includes(searchVal) ||
                (record.rollNumber || '').toLowerCase().includes(searchVal);

            const deptMatch = selectedDept === 'ALL' || record.department === selectedDept;
            const yearMatch = selectedYear === 'ALL' || record.year === selectedYear;

            return nameMatch && deptMatch && yearMatch;
        });

        if (!firebaseReady) {
            leaderboardTableBody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                        Loading leaderboard from server...
                    </td>
                </tr>
            `;
            return;
        }

        if (filtered.length === 0) {
            leaderboardTableBody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                        No leaderboard entries match the current filter criteria.
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach((item, idx) => {
            const tr = document.createElement('tr');
            
            let rankBadge = `${idx + 1}`;
            if (idx === 0) rankBadge = medalSvg('gold', '1');
            else if (idx === 1) rankBadge = medalSvg('silver', '2');
            else if (idx === 2) rankBadge = medalSvg('bronze', '3');

            const rollDisplay = item.rollNumber || '—';
            const deptDisplay = item.department ? item.department.replace('Department of ', '') : '—';
            const yearDisplay = item.year || '—';
            const dateDisplay = item.date || new Date().toLocaleDateString();
            const cumScore = item.cumulativeScore || item.score || 0;

            // Cross-reference player registered level if available
            const playerDoc = playersList.find(p => p.rollNumber && p.rollNumber === item.rollNumber) || {};
            const lvlNum = item.currentLevel || playerDoc.currentLevel || 1;
            const lvlTitle = item.levelTitle || playerDoc.levelTitle || 'Novice';
            const levelHtml = getLevelBadgeHtml(lvlNum, lvlTitle);

            tr.innerHTML = `
                <td><strong>${rankBadge}</strong></td>
                <td><strong class="gold-text">${escapeHtml(rollDisplay)}</strong></td>
                <td><strong>${escapeHtml(item.name || 'Anonymous')}</strong></td>
                <td>${escapeHtml(deptDisplay)}</td>
                <td><span class="diff-chip diff-medium">${escapeHtml(yearDisplay)}</span></td>
                <td>${levelHtml}</td>
                <td><strong class="gold-text">${item.score || 0}</strong></td>
                <td><span class="cum-score">${cumScore}</span></td>
                <td>${escapeHtml(dateDisplay)}</td>
                <td style="text-align: right;">
                    <button class="delete-row-btn" data-id="${item.id}" data-roll="${escapeHtml(item.rollNumber || '')}" data-dept="${escapeHtml(item.department || '')}" data-year="${escapeHtml(item.year || '')}" data-name="${escapeHtml(item.name || 'Player')}" title="Delete score entry">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </td>
            `;
            leaderboardTableBody.appendChild(tr);
        });

        // Event Handlers for delete score
        leaderboardTableBody.querySelectorAll('.delete-row-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const roll = btn.getAttribute('data-roll') || '';
                const dept = btn.getAttribute('data-dept') || '';
                const year = btn.getAttribute('data-year') || '';
                const name = btn.getAttribute('data-name');
                if (!confirm(`Are you sure you want to delete score entry & registration for "${name}"?`)) return;
                btn.disabled = true;
                btn.innerHTML = '<span style="opacity:0.5">Deleting...</span>';
                const target = { id, rollNumber: roll, department: dept, year };
                const deleted = window.WordQuestFirebase && window.WordQuestFirebase.deleteScoreFromFirestore
                    ? await window.WordQuestFirebase.deleteScoreFromFirestore(target).catch(() => false)
                    : false;
                if (deleted !== false) {
                    leaderboardList = leaderboardList.filter(r => r.id !== id && r.rollNumber !== roll);
                    playersList = playersList.filter(p => p.id !== id && p.rollNumber !== roll);
                    playSessionsList = playSessionsList.filter(s => s.rollNumber !== roll);
                    saveLeaderboard();
                }
                updateStats();
                renderLeaderboardTable();
            });
        });
    }

    function saveLeaderboard() {
        try {
            localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(leaderboardList));
        } catch (e) {}
    }

    function renderCurrentTab() {
        if (currentTab === 'players') {
            renderPlayersTable();
        } else if (currentTab === 'live') {
            renderLivePlayersTable();
        } else {
            renderLeaderboardTable();
        }
    }

    // ----------------------------------------------------------------------
    // 6. Word Bank Manager
    // ----------------------------------------------------------------------
    function renderWordTags() {
        if (!wordsTagContainer) return;
        wordsTagContainer.innerHTML = '';

        customWordsList.forEach((word, index) => {
            const tag = document.createElement('div');
            tag.className = 'word-tag';
            tag.innerHTML = `
                <span>${escapeHtml(word)}</span>
                <button type="button" class="word-tag-remove" data-index="${index}" title="Remove word">&times;</button>
            `;
            wordsTagContainer.appendChild(tag);
        });

        wordsTagContainer.querySelectorAll('.word-tag-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                removeWord(idx);
            });
        });
    }

    function addWord(word) {
        const cleanWord = word.trim().toUpperCase();
        if (!cleanWord) return;

        if (cleanWord.length < 3 || cleanWord.length > 12) {
            alert('Word must be between 3 and 12 letters.');
            return;
        }

        if (customWordsList.includes(cleanWord)) {
            alert('This word is already in the word bank!');
            return;
        }

        customWordsList.push(cleanWord);
        saveWordBank();
        renderWordTags();
        if (newWordInput) newWordInput.value = '';
    }

    function removeWord(index) {
        if (customWordsList.length <= 8) {
            alert('Minimum 8 words required for the word search puzzle grid!');
            return;
        }
        customWordsList.splice(index, 1);
        saveWordBank();
        renderWordTags();
    }

    function saveWordBank() {
        try {
            localStorage.setItem(STORAGE_KEY_CUSTOM_WORDS, JSON.stringify(customWordsList));
        } catch (e) {}

        if (window.WordQuestFirebase && window.WordQuestFirebase.saveWordBankToFirestore) {
            window.WordQuestFirebase.saveWordBankToFirestore(customWordsList);
        }
    }

    if (addWordForm) {
        addWordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (newWordInput) addWord(newWordInput.value);
        });
    }

    // ----------------------------------------------------------------------
    // 7. PDF Export Functionality (Preview modal + Download)
    // ----------------------------------------------------------------------
    const pdfPreviewModal    = document.getElementById('modal-pdf-preview');
    const pdfPreviewFrame    = document.getElementById('pdf-preview-frame');
    const pdfPreviewTitle    = document.getElementById('pdf-preview-title');
    const pdfPreviewSub      = document.getElementById('pdf-preview-sub');
    const pdfPreviewClose    = document.getElementById('close-pdf-preview');
    const pdfPreviewCancel   = document.getElementById('pdf-preview-cancel');
    const pdfPreviewDownload = document.getElementById('pdf-preview-download');

    let pendingPdfBlobUrl = null;
    let pendingPdfDoc     = null;
    let pendingPdfFileName = '';

    function buildExportPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

        let title, subtitle, head, body;

        if (currentTab === 'players') {
            if (playersList.length === 0) {
                alert('No registered players to export.');
                return null;
            }
            title = 'Word Quest — Registered Players';
            subtitle = 'English Department Carnival 2026';
            head = [['#', 'Roll Number', 'Player Name', 'Status', 'Level', 'Level Title', 'Phone Number', 'Department', 'Year', 'Registered Date']];
            body = playersList.map((p, idx) => [
                idx + 1,
                p.rollNumber   || '',
                p.name         || '',
                p.active === true ? 'LIVE' : 'Offline',
                p.currentLevel || 1,
                p.levelTitle   || 'Novice',
                p.phoneNumber  || '',
                p.department   || '',
                p.year         || '',
                p.dateDisplay  || ''
            ]);
        } else if (currentTab === 'live') {
            const livePlayers = deduplicatePlayers(playersList).filter(p => p.active === true);
            if (livePlayers.length === 0) {
                alert('No live players currently online to export.');
                return null;
            }
            title = 'Word Quest — Live Players';
            subtitle = 'English Department Carnival 2026';
            head = [['#', 'Roll Number', 'Player Name', 'Status', 'Level', 'Level Title', 'Round Score', 'Total Score', 'Department', 'Year', 'Phone Number']];
            body = livePlayers.map((p, idx) => [
                idx + 1,
                p.rollNumber   || '',
                p.name         || '',
                'LIVE NOW',
                p.currentLevel || 1,
                p.levelTitle   || 'Novice',
                p.score || 0,
                p.cumulativeScore || p.score || 0,
                p.department   || '',
                p.year         || '',
                p.phoneNumber  || ''
            ]);
        } else {
            if (leaderboardList.length === 0) {
                alert('No leaderboard records to export.');
                return null;
            }
            title = 'Word Quest — Leaderboard';
            subtitle = 'English Department Carnival 2026';
            head = [['Rank', 'Roll Number', 'Player Name', 'Department', 'Year', 'Level Reached', 'Score', 'Total Score', 'Date']];
            body = leaderboardList.map((r, idx) => {
                const playerDoc = playersList.find(p => p.rollNumber && p.rollNumber === r.rollNumber) || {};
                return [
                    idx + 1,
                    r.rollNumber || '',
                    r.name || '',
                    r.department || '',
                    r.year || '',
                    `${r.currentLevel || playerDoc.currentLevel || 1} (${r.levelTitle || playerDoc.levelTitle || 'Novice'})`,
                    r.score || 0,
                    r.cumulativeScore || r.score || 0,
                    r.date || ''
                ];
            });
        }

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 40;

        // ---- Branded header band (shared vertical center = bandCenter) ----
        const bandH = 132;
        const bandCenter = bandH / 2;
        doc.setFillColor(30, 41, 59);            // dark slate
        doc.rect(0, 0, pageWidth, bandH, 'F');
        doc.setFillColor(217, 119, 6);           // gold accent strip
        doc.rect(0, bandH, pageWidth, 4, 'F');

        // College logo — placed directly on the band (no white tile)
        const college = window.WQ_REPORT_LOGOS && window.WQ_REPORT_LOGOS.collegeLogo;
        const collegeW = 46, collegeH = 65;
        if (college) {
            try { doc.addImage(college, 'PNG', 30, bandCenter - collegeH / 2, collegeW, collegeH); } catch (e) { /* skip logo if invalid */ }
        }

        // Word Quest app logo (actual favicon image)
        const appLogo = window.WQ_REPORT_LOGOS && window.WQ_REPORT_LOGOS.appLogo;
        const emX = college ? 30 + collegeW + 20 : 40;
        const emS = 52, emY = bandCenter - emS / 2;
        if (appLogo) {
            try { doc.addImage(appLogo, 'PNG', emX, emY, emS, emS); } catch (e) { /* skip logo if invalid */ }
        }

        // Title block — vertically centered on bandCenter, aligned to emblem
        const titleX = emX + emS + 20;
        doc.setFontSize(9);
        doc.setTextColor(217, 119, 6);
        doc.text('WORD QUEST ADMIN PANEL', titleX, bandCenter - 17);

        doc.setFontSize(21);
        doc.setTextColor(255, 255, 255);
        doc.text(title, titleX, bandCenter + 8);

        doc.setFontSize(10);
        doc.setTextColor(203, 213, 225);
        doc.text(subtitle, titleX, bandCenter + 26);

        // Right-aligned event / timestamp — vertically centered on bandCenter
        const exportedAt = new Date().toLocaleString();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text('ENGLISH DEPARTMENT', pageWidth - margin, bandCenter - 17, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text('CARNIVAL 2026', pageWidth - margin, bandCenter + 2, { align: 'right' });
        doc.text(`Exported: ${exportedAt}`, pageWidth - margin, bandCenter + 20, { align: 'right' });

        // ---- Meta strip under header ----
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(148, 113, 13);
        doc.text(`REPORT: ${title.toUpperCase()}`, margin, 150);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Total Records: ${body.length}`, pageWidth - margin, 150, { align: 'right' });

        // ---- Themed data table ----
        doc.autoTable({
            head: head,
            body: body,
            startY: 160,
            margin: { left: margin, right: margin, top: 140, bottom: 60 },
            styles: { fontSize: 8, cellPadding: 5, textColor: [51, 65, 85] },
            headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
            alternateRowStyles: { fillColor: [250, 245, 235] },
            didDrawPage: (data) => {
                const pageCount = doc.internal.getNumberOfPages();
                doc.setDrawColor(203, 213, 225);
                doc.setLineWidth(0.75);
                doc.line(margin, 574, pageWidth - margin, 574);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(120, 135, 155);
                doc.text('Word Quest — English Department Carnival 2026', margin, 583);
                doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth - margin, 583, { align: 'right' });
            }
        });

        const fileName = `WordQuest_${currentTab.toUpperCase()}_PLAYERS_${new Date().toISOString().slice(0, 10)}.pdf`;
        return { doc: doc, fileName: fileName, title: title };
    }

    function closePdfPreview() {
        if (pdfPreviewModal) pdfPreviewModal.classList.add('hidden');
        if (pdfPreviewFrame) pdfPreviewFrame.src = 'about:blank';
    }

    function exportToPDF() {
        const result = buildExportPDF();
        if (!result) return;

        pendingPdfDoc     = result.doc;
        pendingPdfFileName = result.fileName;

        if (pdfPreviewTitle) pdfPreviewTitle.textContent = result.title;
        if (pdfPreviewSub)   pdfPreviewSub.textContent   = 'Preview below, then Download to save.';

        if (pdfPreviewFrame && pendingPdfBlobUrl) {
            URL.revokeObjectURL(pendingPdfBlobUrl);
        }
        pendingPdfBlobUrl = URL.createObjectURL(result.doc.output('blob'));
        if (pdfPreviewFrame) pdfPreviewFrame.src = pendingPdfBlobUrl;
        if (pdfPreviewModal) pdfPreviewModal.classList.remove('hidden');
    }

    function downloadPdf() {
        if (pendingPdfDoc) pendingPdfDoc.save(pendingPdfFileName);
    }

    if (exportBtn)           exportBtn.addEventListener('click', exportToPDF);
    if (pdfPreviewClose)     pdfPreviewClose.addEventListener('click', closePdfPreview);
    if (pdfPreviewCancel)    pdfPreviewCancel.addEventListener('click', closePdfPreview);
    if (pdfPreviewDownload)  pdfPreviewDownload.addEventListener('click', downloadPdf);

    // ----------------------------------------------------------------------
    // 8. Reset All Data Button (Erases Firestore & LocalStorage)
    // ----------------------------------------------------------------------
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            if (!confirm('⚠️ DANGER: Are you sure you want to PERMANENTLY ERASE ALL player registrations and leaderboard data from Firebase?')) return;
            if (!confirm('Final Confirmation: This action CANNOT be undone. Proceed with full reset?')) return;
            
            clearBtn.disabled = true;
            clearBtn.innerHTML = '<span>Erasing Firebase...</span>';

            if (window.WordQuestFirebase && window.WordQuestFirebase.clearAllDataFromFirestore) {
                await window.WordQuestFirebase.clearAllDataFromFirestore().catch(() => {});
            }
            playersList = [];
            leaderboardList = [];
            playSessionsList = [];
            leaderboardCache = [];
            localStorage.removeItem(STORAGE_KEY_LEADERBOARD);

            clearBtn.disabled = false;
            clearBtn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                <span>Reset Data</span>
            `;

            updateStats();
            renderCurrentTab();
            alert('✅ All player and leaderboard data has been completely erased from Firebase!');
        });
    }

    // ----------------------------------------------------------------------
    // 9. Filter Event Listeners
    // ----------------------------------------------------------------------
    if (searchInput) searchInput.addEventListener('input', renderCurrentTab);
    if (deptFilter)  deptFilter.addEventListener('change', renderCurrentTab);
    if (yearFilter)  yearFilter.addEventListener('change', renderCurrentTab);

    // Deduplicate players list by rollNumber + department + year
    function deduplicatePlayers(players) {
        const seen = {};
        return players.filter(p => {
            const key = `${p.rollNumber || ''}|${p.department || ''}|${p.year || ''}`;
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        });
    }

    // Escape HTML Helper
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ----------------------------------------------------------------------
    // 10. Boot Admin Controller & Firebase Live Sync
    // ----------------------------------------------------------------------
    function waitForFirebase(cb, retries = 40, delay = 250) {
        if (window.WordQuestFirebase) { cb(); return; }
        if (retries <= 0) { console.warn('[Admin] Firebase service not found after waiting.'); return; }
        setTimeout(() => waitForFirebase(cb, retries - 1, delay), delay);
    }

    function initFirebaseSync() {
        waitForFirebase(() => {
        if (!window.WordQuestFirebase) return;

        // 1. Subscribe to Live Registered Players
        if (window.WordQuestFirebase.subscribeToPlayers) {
            window.WordQuestFirebase.subscribeToPlayers((list) => {
                if (Array.isArray(list)) {
                    playersList = deduplicatePlayers(list);
                    updateStats();
                    if (currentTab === 'players') renderPlayersTable();
                    if (currentTab === 'live') renderLivePlayersTable();
                }
            });
        }

        // 2. Subscribe to Live Leaderboard Scores (real-time from Firestore)
        if (window.WordQuestFirebase.subscribeToLeaderboard) {
            window.WordQuestFirebase.subscribeToLeaderboard((list) => {
                if (Array.isArray(list)) {
                    leaderboardList = list;
                    saveLeaderboard();
                    firebaseReady = true;
                    updateStats();
                    renderLeaderboardTable();
                }
            });
        }

        // 2.5. Subscribe to Live Play Session Records (per-player play history)
        if (window.WordQuestFirebase.subscribeToPlaySessions) {
            window.WordQuestFirebase.subscribeToPlaySessions((list) => {
                if (Array.isArray(list)) {
                    playSessionsList = list;
                }
            });
        }

        // Fallback: if Firebase doesn't respond within 6s, show cached localStorage data
        setTimeout(() => {
            if (!firebaseReady && leaderboardCache.length > 0) {
                leaderboardList = leaderboardCache;
                firebaseReady = true;
                updateStats();
                renderLeaderboardTable();
            }
        }, 6000);

        // 3. Fetch Word Bank
        if (window.WordQuestFirebase.getWordBankFromFirestore) {
            window.WordQuestFirebase.getWordBankFromFirestore().then((remoteWords) => {
                if (Array.isArray(remoteWords) && remoteWords.length >= 8) {
                    customWordsList = remoteWords;
                    try {
                        localStorage.setItem(STORAGE_KEY_CUSTOM_WORDS, JSON.stringify(customWordsList));
                    } catch (e) {}
                    renderWordTags();
                }
            });
        }

        // 4. Subscribe to Game Control State (Start/End game status)
        if (window.WordQuestFirebase.subscribeToGameState) {
            window.WordQuestFirebase.subscribeToGameState((isActive) => {
                updateGameStatusUI(isActive);
            });
        }

        // 5. Live Games Counter
        if (window.WordQuestFirebase.subscribeToActiveGameCount) {
            window.WordQuestFirebase.subscribeToActiveGameCount((count) => {
                const liveEl = document.getElementById('stat-live-games');
                if (liveEl) liveEl.textContent = count;
            });
        }

        // 6. Re-evaluate staleness periodically so players who closed their tab
        // abruptly (no reliable unload write) drop off the live views on their own.
        // Firestore snapshots only fire when a doc CHANGES; a dead player's doc
        // never changes, so a local timer re-checks the heartbeat timestamps and,
        // if available, cleans them up server-side too.
        setInterval(() => {
            updateStats();
            if (currentTab === 'live') renderLivePlayersTable();
            if (currentTab === 'players') renderPlayersTable();
            if (window.WordQuestFirebase && window.WordQuestFirebase.cleanupStaleLivePlayers) {
                window.WordQuestFirebase.cleanupStaleLivePlayers().catch(() => {});
            }
        }, 15000);
        }); // end waitForFirebase
    }

    // ----------------------------------------------------------------------
    // Game Control Buttons & State Sync
    // ----------------------------------------------------------------------
    const startGameBtn   = document.getElementById('start-game-btn');
    const endGameBtn     = document.getElementById('end-game-btn');
    const gameStatusText = document.getElementById('game-status-text');
    const gameStatusDot  = document.getElementById('game-status-dot');

    function updateGameStatusUI(isActive) {
        if (gameStatusText) {
            gameStatusText.textContent = isActive ? 'GAME STARTED (ONLINE)' : 'GAME ENDED (CLOSED)';
            gameStatusText.style.color = isActive ? '#10b981' : '#ef4444';
        }
        if (gameStatusDot) {
            gameStatusDot.style.backgroundColor = isActive ? '#10b981' : '#ef4444';
            gameStatusDot.style.boxShadow = isActive ? '0 0 12px #10b981' : '0 0 12px #ef4444';
        }
        if (startGameBtn) {
            startGameBtn.style.opacity = isActive ? '0.5' : '1';
            startGameBtn.style.pointerEvents = isActive ? 'none' : 'auto';
        }
        if (endGameBtn) {
            endGameBtn.style.opacity = isActive ? '1' : '0.5';
            endGameBtn.style.pointerEvents = isActive ? 'auto' : 'none';
        }
    }

    if (startGameBtn) {
        startGameBtn.addEventListener('click', async () => {
            if (window.WordQuestFirebase && window.WordQuestFirebase.setGameStateInFirestore) {
                await window.WordQuestFirebase.setGameStateInFirestore(true);
                updateGameStatusUI(true);
                alert('🟢 Game has been Started! Players can now join and play.');
            }
        });
    }

    if (endGameBtn) {
        endGameBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to End the Game? This will close access to game.html for all players.')) {
                if (window.WordQuestFirebase && window.WordQuestFirebase.setGameStateInFirestore) {
                    await window.WordQuestFirebase.setGameStateInFirestore(false);
                    updateGameStatusUI(false);
                    alert('🔴 Game has been Ended! Access to game.html is now closed.');
                }
            }
        });
    }

    loadData();
    updateStats();
    renderPlayersTable();
    renderWordTags();
    initFirebaseSync();

    // Show the access gate unless the session is already authenticated
    if (!isAdminAuthed() && loginGate) {
        loginGate.classList.remove('hidden');
        if (loginCodeInput) loginCodeInput.focus();
    } else if (loginGate) {
        loginGate.classList.add('hidden');
    }
});

