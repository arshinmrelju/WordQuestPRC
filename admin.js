/**
 * WORD QUEST — Admin Control Panel Logic (admin.js)
 * Manages player registrations, leaderboard scores, CSV exports, stats calculations,
 * and custom word bank management.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // Default initial word bank if none saved
    const DEFAULT_WORD_BANK = [
        'QUEST', 'WORD', 'SPELL', 'CLUE', 'GRID',
        'FIND', 'HUNT', 'LETTER', 'BRAIN', 'THINK',
        'PLAY', 'SCORE', 'TIMER', 'PUZZLE', 'SEARCH',
        'HINT', 'SOLVE', 'LEARN', 'FOCUS', 'SWIFT'
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
    function loadData() {
        try {
            leaderboardList = JSON.parse(localStorage.getItem(STORAGE_KEY_LEADERBOARD) || '[]');
        } catch (e) {
            leaderboardList = [];
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
        // Total Registered Participants Count
        const totalReg = playersList.length;
        if (statTotalPlayers) statTotalPlayers.textContent = totalReg;
        if (badgePlayersCount) badgePlayersCount.textContent = totalReg;

        // Leaderboard Count
        const totalScores = leaderboardList.length;
        if (badgeLeaderboardCount) badgeLeaderboardCount.textContent = totalScores;

        if (totalScores === 0) {
            if (statTopScore) statTopScore.textContent = '0';
            if (statTopDept) statTopDept.textContent = 'None';
            if (statAvgScore) statAvgScore.textContent = '0';
            return;
        }

        // Top Score
        const topScore = Math.max(...leaderboardList.map(r => r.score || 0));
        if (statTopScore) statTopScore.textContent = topScore;

        // Average Score
        const sumScore = leaderboardList.reduce((acc, r) => acc + (r.score || 0), 0);
        const avgScore = Math.round(sumScore / totalScores);
        if (statAvgScore) statAvgScore.textContent = avgScore;

        // Top Department (Highest total cumulative score)
        const deptScores = {};
        leaderboardList.forEach(r => {
            if (!r.department) return;
            const shortDept = r.department.replace('Department of ', '');
            deptScores[shortDept] = (deptScores[shortDept] || 0) + (r.score || 0);
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

        const filtered = playersList.filter(item => {
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
            const deptDisplay = item.department ? item.department.replace('Department of ', '') : '—';
            const rollDisplay = item.rollNumber || '—';
            const yearDisplay = item.year || '—';
            const dateDisplay = item.dateDisplay || '—';

            tr.innerHTML = `
                <td><strong class="gold-text">${escapeHtml(rollDisplay)}</strong></td>
                <td><strong>${escapeHtml(item.name || 'Anonymous')}</strong></td>
                <td>${escapeHtml(deptDisplay)}</td>
                <td><span class="diff-chip diff-medium">${escapeHtml(yearDisplay)}</span></td>
                <td>${escapeHtml(dateDisplay)}</td>
                <td style="text-align: right;">
                    <button class="delete-row-btn" data-id="${item.id}" data-name="${escapeHtml(item.name || 'Player')}" title="Delete registration">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </td>
            `;
            playersTableBody.appendChild(tr);
        });

        // Event Handlers for delete player
        playersTableBody.querySelectorAll('.delete-row-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const name = btn.getAttribute('data-name');
                if (confirm(`Are you sure you want to delete registration for "${name}"?`)) {
                    if (window.WordQuestFirebase && window.WordQuestFirebase.deletePlayerFromFirestore) {
                        window.WordQuestFirebase.deletePlayerFromFirestore(id);
                    }
                    playersList = playersList.filter(p => p.id !== id);
                    updateStats();
                    renderPlayersTable();
                }
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

        const filtered = leaderboardList.filter(record => {
            const nameMatch = !searchVal || 
                (record.name || '').toLowerCase().includes(searchVal) ||
                (record.rollNumber || '').toLowerCase().includes(searchVal);

            const deptMatch = selectedDept === 'ALL' || record.department === selectedDept;
            const yearMatch = selectedYear === 'ALL' || record.year === selectedYear;

            return nameMatch && deptMatch && yearMatch;
        });

        if (filtered.length === 0) {
            leaderboardTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
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

            tr.innerHTML = `
                <td><strong>${rankBadge}</strong></td>
                <td><strong class="gold-text">${escapeHtml(rollDisplay)}</strong></td>
                <td><strong>${escapeHtml(item.name || 'Anonymous')}</strong></td>
                <td>${escapeHtml(deptDisplay)}</td>
                <td><span class="diff-chip diff-medium">${escapeHtml(yearDisplay)}</span></td>
                <td><strong class="gold-text">${item.score || 0}</strong></td>
                <td>${escapeHtml(dateDisplay)}</td>
                <td style="text-align: right;">
                    <button class="delete-row-btn" data-id="${item.id}" data-name="${escapeHtml(item.name || 'Player')}" title="Delete score entry">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </td>
            `;
            leaderboardTableBody.appendChild(tr);
        });

        // Event Handlers for delete score
        leaderboardTableBody.querySelectorAll('.delete-row-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const name = btn.getAttribute('data-name');
                if (confirm(`Are you sure you want to delete score entry for "${name}"?`)) {
                    if (window.WordQuestFirebase && window.WordQuestFirebase.deleteScoreFromFirestore) {
                        window.WordQuestFirebase.deleteScoreFromFirestore(id);
                    }
                    leaderboardList = leaderboardList.filter(r => r.id !== id);
                    saveLeaderboard();
                    updateStats();
                    renderLeaderboardTable();
                }
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
            csvContent += 'Roll Number,Player Name,Department,Year of Study,Registered Date\n';
            playersList.forEach(p => {
                const roll = `"${(p.rollNumber || '').replace(/"/g, '""')}"`;
                const name = `"${(p.name || '').replace(/"/g, '""')}"`;
                const dept = `"${(p.department || '').replace(/"/g, '""')}"`;
                const year = `"${(p.year || '').replace(/"/g, '""')}"`;
                const date = `"${(p.dateDisplay || '').replace(/"/g, '""')}"`;
                csvContent += `${roll},${name},${dept},${year},${date}\n`;
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
    // 8. Reset Data Button
    // ----------------------------------------------------------------------
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset local leaderboard cache? This will not erase Firestore remote entries.')) {
                leaderboardList = [];
                saveLeaderboard();
                updateStats();
                renderCurrentTab();
            }
        });
    }

    // ----------------------------------------------------------------------
    // 9. Filter Event Listeners
    // ----------------------------------------------------------------------
    if (searchInput) searchInput.addEventListener('input', renderCurrentTab);
    if (deptFilter)  deptFilter.addEventListener('change', renderCurrentTab);
    if (yearFilter)  yearFilter.addEventListener('change', renderCurrentTab);

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
    function initFirebaseSync() {
        if (!window.WordQuestFirebase) return;

        // 1. Subscribe to Live Registered Players
        if (window.WordQuestFirebase.subscribeToPlayers) {
            window.WordQuestFirebase.subscribeToPlayers((list) => {
                if (Array.isArray(list)) {
                    playersList = list;
                    updateStats();
                    if (currentTab === 'players') renderPlayersTable();
                }
            });
        }

        // 2. Subscribe to Live Leaderboard Scores
        if (window.WordQuestFirebase.subscribeToLeaderboard) {
            window.WordQuestFirebase.subscribeToLeaderboard((list) => {
                if (Array.isArray(list)) {
                    leaderboardList = list;
                    saveLeaderboard();
                    updateStats();
                    if (currentTab === 'leaderboard') renderLeaderboardTable();
                }
            });
        }

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

        // 4. Live Games Counter
        if (window.WordQuestFirebase.subscribeToActiveGameCount) {
            window.WordQuestFirebase.subscribeToActiveGameCount((count) => {
                const liveEl = document.getElementById('stat-live-games');
                if (liveEl) liveEl.textContent = count;
            });
        }
    }

    loadData();
    updateStats();
    renderPlayersTable();
    renderWordTags();
    initFirebaseSync();
});
