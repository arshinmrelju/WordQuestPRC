/**
 * WORD QUEST — Admin Control Panel Logic (admin.js)
 * Manages player registrations, leaderboard scores, CSV exports, stats calculations,
 * and custom word bank management.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
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
    const tabBtnLeaderboard = document.getElementById('tab-btn-leaderboard');
    const viewPlayersTable  = document.getElementById('view-players-table');
    const viewLeaderboardTable = document.getElementById('view-leaderboard-table');
    const badgePlayersCount = document.getElementById('badge-players-count');
    const badgeLeaderboardCount = document.getElementById('badge-leaderboard-count');

    // DOM Elements - Filters & Tables
    const searchInput = document.getElementById('admin-search-input');
    const deptFilter  = document.getElementById('admin-dept-filter');
    const yearFilter  = document.getElementById('admin-year-filter');
    const playersTableBody = document.getElementById('admin-players-table-body');
    const leaderboardTableBody = document.getElementById('admin-leaderboard-table-body');

    // DOM Elements - Action Buttons
    const exportBtn    = document.getElementById('export-csv-btn');
    const clearBtn     = document.getElementById('clear-data-btn');
    const addWordForm  = document.getElementById('add-word-form');
    const newWordInput = document.getElementById('new-word-input');
    const wordsTagContainer = document.getElementById('words-tag-container');

    // Data State
    let playersList     = []; // Registered players from Firestore 'players'
    let leaderboardList = []; // Game scores from Firestore 'leaderboard'
    let customWordsList = [];
    let currentTab      = 'players'; // 'players' | 'leaderboard'
    let firebaseReady   = false;    // true once Firestore has responded at least once

    // ----------------------------------------------------------------------
    // 1. Tab Switching
    // ----------------------------------------------------------------------
    function switchTab(tab) {
        currentTab = tab;
        if (tab === 'players') {
            if (tabBtnPlayers) tabBtnPlayers.classList.add('active');
            if (tabBtnLeaderboard) tabBtnLeaderboard.classList.remove('active');
            if (viewPlayersTable) viewPlayersTable.classList.remove('hidden');
            if (viewLeaderboardTable) viewLeaderboardTable.classList.add('hidden');
            renderPlayersTable();
        } else {
            if (tabBtnLeaderboard) tabBtnLeaderboard.classList.add('active');
            if (tabBtnPlayers) tabBtnPlayers.classList.remove('active');
            if (viewLeaderboardTable) viewLeaderboardTable.classList.remove('hidden');
            if (viewPlayersTable) viewPlayersTable.classList.add('hidden');
            renderLeaderboardTable();
        }
    }

    if (tabBtnPlayers)     tabBtnPlayers.addEventListener('click', () => switchTab('players'));
    if (tabBtnLeaderboard) tabBtnLeaderboard.addEventListener('click', () => switchTab('leaderboard'));

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

    // ----------------------------------------------------------------------
    // 3. Compute Dashboard Statistics
    // ----------------------------------------------------------------------
    function updateStats() {
        // Total Registered Participants Count (deduplicated)
        const totalReg = deduplicatePlayers(playersList).length;
        if (statTotalPlayers) statTotalPlayers.textContent = totalReg;
        if (badgePlayersCount) badgePlayersCount.textContent = totalReg;

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
                    <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
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

            tr.innerHTML = `
                <td><strong class="gold-text">${escapeHtml(rollDisplay)}</strong></td>
                <td><strong>${escapeHtml(item.name || 'Anonymous')}</strong></td>
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
                    saveLeaderboard();
                }
                updateStats();
                renderPlayersTable();
            });
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
                    <td colspan="9" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                        Loading leaderboard from server...
                    </td>
                </tr>
            `;
            return;
        }

        if (filtered.length === 0) {
            leaderboardTableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                        No leaderboard entries match the current filter criteria.
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach((item, idx) => {
            const tr = document.createElement('tr');
            
            let rankBadge = `${idx + 1}`;
            if (idx === 0) rankBadge = '🥇';
            else if (idx === 1) rankBadge = '🥈';
            else if (idx === 2) rankBadge = '🥉';

            const rollDisplay = item.rollNumber || '—';
            const deptDisplay = item.department ? item.department.replace('Department of ', '') : '—';
            const yearDisplay = item.year || '—';
            const dateDisplay = item.date || new Date().toLocaleDateString();
            const cumScore = item.cumulativeScore || item.score || 0;

            tr.innerHTML = `
                <td><strong>${rankBadge}</strong></td>
                <td><strong class="gold-text">${escapeHtml(rollDisplay)}</strong></td>
                <td><strong>${escapeHtml(item.name || 'Anonymous')}</strong></td>
                <td>${escapeHtml(deptDisplay)}</td>
                <td><span class="diff-chip diff-medium">${escapeHtml(yearDisplay)}</span></td>
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
    // 7. CSV Export Functionality
    // ----------------------------------------------------------------------
    function exportToCSV() {
        let csvContent = 'data:text/csv;charset=utf-8,';

        if (currentTab === 'players') {
            if (playersList.length === 0) {
                alert('No registered players to export.');
                return;
            }
            csvContent += 'Roll Number,Player Name,Phone Number,Department,Year of Study,Registered Date\n';
            playersList.forEach(p => {
                const roll  = `"${(p.rollNumber   || '').replace(/"/g, '""')}"`;
                const name  = `"${(p.name         || '').replace(/"/g, '""')}"`;
                const phone = `"${(p.phoneNumber  || '').replace(/"/g, '""')}"`;
                const dept  = `"${(p.department   || '').replace(/"/g, '""')}"`;
                const year  = `"${(p.year         || '').replace(/"/g, '""')}"`;
                const date  = `"${(p.dateDisplay  || '').replace(/"/g, '""')}"`;
                csvContent += `${roll},${name},${phone},${dept},${year},${date}\n`;
            });
        } else {
            if (leaderboardList.length === 0) {
                alert('No leaderboard records to export.');
                return;
            }
            csvContent += 'Rank,Roll Number,Player Name,Department,Year of Study,Score,Date\n';
            leaderboardList.forEach((r, idx) => {
                const roll  = `"${(r.rollNumber || '').replace(/"/g, '""')}"`;
                const name  = `"${(r.name || '').replace(/"/g, '""')}"`;
                const dept  = `"${(r.department || '').replace(/"/g, '""')}"`;
                const year  = `"${(r.year || '').replace(/"/g, '""')}"`;
                const score = r.score || 0;
                const date  = `"${(r.date || '').replace(/"/g, '""')}"`;
                csvContent += `${idx + 1},${roll},${name},${dept},${year},${score},${date}\n`;
            });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `WordQuest_${currentTab === 'players' ? 'Registered_Players' : 'Leaderboard'}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    if (exportBtn) exportBtn.addEventListener('click', exportToCSV);

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
});

