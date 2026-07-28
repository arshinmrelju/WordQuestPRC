/**
 * WORD QUEST — Admin Control Panel Logic (admin.js)
 * Manages player records, leaderboard filtering, CSV exports, stats calculations,
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

    // DOM Elements
    const statTotalPlayers = document.getElementById('stat-total-players');
    const statTopScore = document.getElementById('stat-top-score');
    const statTopDept = document.getElementById('stat-top-dept');
    const statAvgScore = document.getElementById('stat-avg-score');

    const searchInput = document.getElementById('admin-search-input');
    const deptFilter = document.getElementById('admin-dept-filter');
    const yearFilter = document.getElementById('admin-year-filter');
    const tableBody = document.getElementById('admin-table-body');

    const exportBtn = document.getElementById('export-csv-btn');
    const clearBtn = document.getElementById('clear-data-btn');

    const addWordForm = document.getElementById('add-word-form');
    const newWordInput = document.getElementById('new-word-input');
    const wordsTagContainer = document.getElementById('words-tag-container');

    // Data State
    let recordsList = [];
    let customWordsList = [];

    // ----------------------------------------------------------------------
    // 1. Load Data from LocalStorage
    // ----------------------------------------------------------------------
    function loadData() {
        try {
            recordsList = JSON.parse(localStorage.getItem(STORAGE_KEY_LEADERBOARD) || '[]');
        } catch (e) {
            console.warn('Error loading leaderboard records:', e);
            recordsList = [];
        }

        try {
            customWordsList = JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM_WORDS) || JSON.stringify(DEFAULT_WORD_BANK));
        } catch (e) {
            console.warn('Error loading custom words:', e);
            customWordsList = [...DEFAULT_WORD_BANK];
        }
    }

    // ----------------------------------------------------------------------
    // 2. Compute Dashboard Statistics
    // ----------------------------------------------------------------------
    function updateStats() {
        const total = recordsList.length;
        if (statTotalPlayers) statTotalPlayers.textContent = total;

        if (total === 0) {
            if (statTopScore) statTopScore.textContent = '0';
            if (statTopDept) statTopDept.textContent = 'None';
            if (statAvgScore) statAvgScore.textContent = '0';
            return;
        }

        // Top Score
        const topScore = Math.max(...recordsList.map(r => r.score || 0));
        if (statTopScore) statTopScore.textContent = topScore;

        // Average Score
        const sumScore = recordsList.reduce((acc, r) => acc + (r.score || 0), 0);
        const avgScore = Math.round(sumScore / total);
        if (statAvgScore) statAvgScore.textContent = avgScore;

        // Top Department (Highest Total Score or Count)
        const deptScores = {};
        recordsList.forEach(r => {
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
    // 3. Render Leaderboard Data Table
    // ----------------------------------------------------------------------
    function renderTable() {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        const searchVal = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const selectedDept = deptFilter ? deptFilter.value : 'ALL';
        const selectedYear = yearFilter ? yearFilter.value : 'ALL';

        const filteredList = recordsList.filter(record => {
            // Search name
            const nameMatch = !searchVal || (record.name || '').toLowerCase().includes(searchVal);
            
            // Department filter
            const deptMatch = selectedDept === 'ALL' || record.department === selectedDept;

            // Year filter
            const yearMatch = selectedYear === 'ALL' || record.year === selectedYear;

            return nameMatch && deptMatch && yearMatch;
        });

        if (filteredList.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                        No records match the current filter criteria.
                    </td>
                </tr>
            `;
            return;
        }

        filteredList.forEach((item, idx) => {
            const tr = document.createElement('tr');
            
            let rankBadge = `${idx + 1}`;
            if (idx === 0) rankBadge = '🥇';
            else if (idx === 1) rankBadge = '🥈';
            else if (idx === 2) rankBadge = '🥉';

            const deptDisplay = item.department ? item.department.replace('Department of ', '') : '—';
            const yearDisplay = item.year || '—';
            const dateDisplay = item.date || new Date().toLocaleDateString();

            tr.innerHTML = `
                <td><strong>${rankBadge}</strong></td>
                <td><strong>${escapeHtml(item.name || 'Anonymous')}</strong></td>
                <td>${escapeHtml(deptDisplay)}</td>
                <td><span class="diff-chip diff-medium">${escapeHtml(yearDisplay)}</span></td>
                <td><strong class="gold-text">${item.score || 0}</strong></td>
                <td>${escapeHtml(dateDisplay)}</td>
                <td style="text-align: right;">
                    <button class="delete-row-btn" data-index="${idx}" title="Delete entry">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </td>
            `;

            tableBody.appendChild(tr);
        });

        // Add Delete Event Handlers
        tableBody.querySelectorAll('.delete-row-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetIdx = parseInt(btn.getAttribute('data-index'), 10);
                deleteRecord(filteredList[targetIdx]);
            });
        });
    }

    // Helper: Delete record
    function deleteRecord(recordToDelete) {
        if (!recordToDelete) return;
        if (confirm(`Are you sure you want to delete entry for "${recordToDelete.name}"?`)) {
            if (recordToDelete.id && window.WordQuestFirebase && window.WordQuestFirebase.deleteScoreFromFirestore) {
                window.WordQuestFirebase.deleteScoreFromFirestore(recordToDelete.id);
            }
            recordsList = recordsList.filter(r => r !== recordToDelete);
            saveRecords();
            updateStats();
            renderTable();
        }
    }

    function saveRecords() {
        try {
            localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(recordsList));
        } catch (e) {
            console.warn('Error saving leaderboard records:', e);
        }
    }

    // ----------------------------------------------------------------------
    // 4. Word Bank Manager
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

        // Add Remove Word Handlers
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
        } catch (e) {
            console.warn('Error saving word bank:', e);
        }

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
    // 5. CSV Export Functionality
    // ----------------------------------------------------------------------
    function exportToCSV() {
        if (recordsList.length === 0) {
            alert('No records available to export.');
            return;
        }

        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'Rank,Player Name,Department,Year of Study,Score,Date\n';

        recordsList.forEach((r, idx) => {
            const name = `"${(r.name || '').replace(/"/g, '""')}"`;
            const dept = `"${(r.department || '').replace(/"/g, '""')}"`;
            const year = `"${(r.year || '').replace(/"/g, '""')}"`;
            const score = r.score || 0;
            const date = `"${(r.date || '').replace(/"/g, '""')}"`;

            csvContent += `${idx + 1},${name},${dept},${year},${score},${date}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `WordQuest_Leaderboard_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
    }

    // ----------------------------------------------------------------------
    // 6. Reset All Data
    // ----------------------------------------------------------------------
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all leaderboard and player records? This action cannot be undone.')) {
                recordsList = [];
                saveRecords();
                updateStats();
                renderTable();
            }
        });
    }

    // ----------------------------------------------------------------------
    // 7. Event Listeners for Filters
    // ----------------------------------------------------------------------
    if (searchInput) searchInput.addEventListener('input', renderTable);
    if (deptFilter) deptFilter.addEventListener('change', renderTable);
    if (yearFilter) yearFilter.addEventListener('change', renderTable);

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
    // 8. Boot Admin Controller & Firebase Live Sync
    // ----------------------------------------------------------------------
    function initFirebaseSync() {
        if (window.WordQuestFirebase && window.WordQuestFirebase.subscribeToLeaderboard) {
            window.WordQuestFirebase.subscribeToLeaderboard((firestoreList) => {
                if (Array.isArray(firestoreList) && firestoreList.length > 0) {
                    recordsList = firestoreList;
                    saveRecords();
                    updateStats();
                    renderTable();
                }
            });

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

            // Live games counter
            if (window.WordQuestFirebase.subscribeToActiveGameCount) {
                window.WordQuestFirebase.subscribeToActiveGameCount((count) => {
                    const liveEl = document.getElementById('stat-live-games');
                    if (liveEl) liveEl.textContent = count;
                });
            }
        }
    }

    loadData();
    updateStats();
    renderTable();
    renderWordTags();
    initFirebaseSync();
});
