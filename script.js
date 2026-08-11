/**
 * WORD QUEST — Main JavaScript Controller
 * English Department Carnival
 * Handles player registration (new + returning), Firebase sync,
 * floating letter background, and localStorage state.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // ------------------------------------------------------------------
    // 1. DOM References
    // ------------------------------------------------------------------
    // New registration form
    const playerForm       = document.getElementById('player-form');
    const playerNameInput  = document.getElementById('player-name');
    const playerPhoneInput = document.getElementById('player-phone');
    const rollNumberInput  = document.getElementById('roll-number');
    const departmentSelect = document.getElementById('department');
    const yearSelect       = document.getElementById('year-of-study');
    const nameError        = document.getElementById('name-error');
    const phoneError       = document.getElementById('phone-error');
    const rollError        = document.getElementById('roll-error');
    const departmentError  = document.getElementById('department-error');
    const yearError        = document.getElementById('year-error');
    const startBtn         = document.getElementById('start-btn');
    const playerCard       = document.getElementById('player-card');
    const lettersContainer = document.getElementById('letters-container');

    // Toggle
    const alreadyRegToggle = document.getElementById('already-reg-toggle');

    // Returning player form
    const returningForm    = document.getElementById('returning-form');
    const retRollInput     = document.getElementById('ret-roll');
    const retDeptSelect    = document.getElementById('ret-department');
    const retYearSelect    = document.getElementById('ret-year');
    const retRollError     = document.getElementById('ret-roll-error');
    const retDeptError     = document.getElementById('ret-dept-error');
    const retYearError     = document.getElementById('ret-year-error');
    const retLookupError   = document.getElementById('ret-lookup-error');
    const retStartBtn      = document.getElementById('ret-start-btn');
    const retBackBtn       = document.getElementById('ret-back-btn');

    // Card header text
    const formCardTitle    = document.getElementById('form-card-title');
    const formCardDesc     = document.getElementById('form-card-desc');

    // LocalStorage Keys
    const KEY_NAME       = 'wordQuest_playerName';
    const KEY_PHONE      = 'wordQuest_phoneNumber';
    const KEY_ROLL       = 'wordQuest_rollNumber';
    const KEY_DEPARTMENT = 'wordQuest_department';
    const KEY_YEAR       = 'wordQuest_yearOfStudy';
    const KEY_PLAYER_ID  = 'wordQuest_playerFirestoreId';
    const KEY_RULES_ACCEPTED_PREFIX = 'wordQuest_rulesAccepted_';

    // Rules modal DOM
    const rulesModal       = document.getElementById('rules-modal');
    const rulesScroller    = document.getElementById('rules-scroll-container');
    const rulesScrollHint  = document.getElementById('rules-scroll-hint');
    const rulesMasterWrap  = document.getElementById('rules-master-checkbox-wrapper');
    const ruleCheckAll     = document.getElementById('rule-check-all');
    const rulesConfirmBtn  = document.getElementById('rules-confirm-btn');
    const rulesCloseX      = document.getElementById('rules-close-x');
    const rulesAgreeError  = document.getElementById('rules-agree-error');
    let pendingRegData     = null;
    let rulesAcceptedShown = false;
    let rulesScrolledFully = false;

    // ------------------------------------------------------------------
    // 2. Floating Background Letters
    // ------------------------------------------------------------------
    function initFloatingLetters() {
        if (!lettersContainer) return;
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let i = 0; i < 35; i++) {
            const el = document.createElement('span');
            el.classList.add('floating-letter');
            el.textContent = alphabet[Math.floor(Math.random() * 26)];
            el.style.left             = `${Math.random() * 95}%`;
            el.style.animationDuration = `${14 + Math.random() * 18}s`;
            el.style.animationDelay   = `${-Math.random() * 25}s`;
            el.style.fontSize         = `${1.2 + Math.random() * 2.2}rem`;
            el.style.setProperty('--target-opacity', (0.04 + Math.random() * 0.12).toFixed(2));
            lettersContainer.appendChild(el);
        }
    }

    // ------------------------------------------------------------------
    // 3. Restore session (pre-fill from localStorage)
    // ------------------------------------------------------------------
    function restoreSession() {
        const name  = localStorage.getItem(KEY_NAME);
        const phone = localStorage.getItem(KEY_PHONE);
        const roll  = localStorage.getItem(KEY_ROLL);
        const dept  = localStorage.getItem(KEY_DEPARTMENT);
        const year  = localStorage.getItem(KEY_YEAR);
        if (name && playerNameInput)   playerNameInput.value  = name;
        if (phone && playerPhoneInput) playerPhoneInput.value = phone;
        if (roll && rollNumberInput)   rollNumberInput.value  = roll;
        if (dept && departmentSelect)  departmentSelect.value = dept;
        if (year && yearSelect)        yearSelect.value       = year;
    }

    // ------------------------------------------------------------------
    // 4. Toggle between New Registration / Already Registered
    // ------------------------------------------------------------------
    function showReturningForm() {
        playerForm.classList.add('hidden');
        alreadyRegToggle.classList.add('hidden');
        document.querySelector('.already-reg-divider').classList.add('hidden');
        returningForm.classList.remove('hidden');
        if (formCardTitle) formCardTitle.textContent = 'Already Registered?';
        if (formCardDesc)  formCardDesc.textContent  = 'Enter your roll number to resume your profile';
    }

    function showNewForm() {
        returningForm.classList.add('hidden');
        playerForm.classList.remove('hidden');
        alreadyRegToggle.classList.remove('hidden');
        document.querySelector('.already-reg-divider').classList.remove('hidden');
        if (formCardTitle) formCardTitle.textContent = 'Player Profile';
        if (formCardDesc)  formCardDesc.textContent  = 'Enter your credentials to enter the competition';
    }

    if (alreadyRegToggle) alreadyRegToggle.addEventListener('click', showReturningForm);
    if (retBackBtn)       retBackBtn.addEventListener('click', showNewForm);

    // ------------------------------------------------------------------
    // 4b. Rules & Regulations modal logic (bank-style checkbox system)
    // ------------------------------------------------------------------
    function resetRulesCheckboxes() {
        rulesScrolledFully = false;
        if (ruleCheckAll) { ruleCheckAll.disabled = true; ruleCheckAll.checked = false; }
        if (rulesConfirmBtn) rulesConfirmBtn.disabled = true;
        if (rulesAgreeError) { rulesAgreeError.textContent = ''; rulesAgreeError.classList.remove('visible'); }
        if (rulesScrollHint) rulesScrollHint.classList.remove('rules-unlocked');
        if (rulesScroller) rulesScroller.classList.remove('rules-fully-scrolled');
        if (rulesMasterWrap) {
            rulesMasterWrap.classList.remove('checkbox-enabled');
            rulesMasterWrap.classList.add('checkbox-locked');
        }
        const label = rulesMasterWrap ? rulesMasterWrap.querySelector('.checkbox-master-label') : null;
        if (label) label.classList.remove('has-ticked');
    }

    function markRulesFullyScrolled() {
        if (rulesScrolledFully) return;
        rulesScrolledFully = true;
        if (rulesScroller) rulesScroller.classList.add('rules-fully-scrolled');
        if (rulesScrollHint) rulesScrollHint.classList.add('rules-unlocked');
        if (rulesMasterWrap) {
            rulesMasterWrap.classList.remove('checkbox-locked');
            rulesMasterWrap.classList.add('checkbox-enabled');
        }
        if (ruleCheckAll) ruleCheckAll.disabled = false;
        syncConfirmButton();
    }

    function isAtScrollBottom(el, tolerance = 8) {
        if (!el) return true;
        return el.scrollTop + el.clientHeight >= el.scrollHeight - tolerance;
    }

    function initScrollGate() {
        if (!rulesScroller) { markRulesFullyScrolled(); return; }
        rulesScroller.addEventListener('scroll', () => {
            if (isAtScrollBottom(rulesScroller)) markRulesFullyScrolled();
        }, { passive: true });
        setTimeout(() => {
            if (rulesScroller.scrollHeight <= rulesScroller.clientHeight + 6) {
                markRulesFullyScrolled();
            }
        }, 80);
    }

    function allRuleChecksSelected() {
        return !!(ruleCheckAll && ruleCheckAll.checked);
    }

    function syncConfirmButton() {
        const ok = rulesScrolledFully && allRuleChecksSelected();
        if (rulesConfirmBtn) rulesConfirmBtn.disabled = !ok;
        if (ok && rulesAgreeError) {
            rulesAgreeError.textContent = '';
            rulesAgreeError.classList.remove('visible');
        }
    }

    function initRulesCheckboxesSync() {
        initScrollGate();
        if (ruleCheckAll) {
            ruleCheckAll.addEventListener('change', () => {
                const label = rulesMasterWrap ? rulesMasterWrap.querySelector('.checkbox-master-label') : null;
                if (ruleCheckAll.checked && label) label.classList.add('has-ticked');
                else if (label) label.classList.remove('has-ticked');
                syncConfirmButton();
            });
        }
        if (rulesMasterWrap) {
            rulesMasterWrap.addEventListener('click', (e) => {
                if (!rulesScrolledFully) {
                    e.preventDefault();
                    e.stopPropagation();
                    rulesMasterWrap.classList.remove('shake');
                    void rulesMasterWrap.offsetWidth;
                    rulesMasterWrap.classList.add('shake');
                    setTimeout(() => rulesMasterWrap.classList.remove('shake'), 400);
                    if (rulesAgreeError) {
                        rulesAgreeError.textContent = '⚠️ Scroll through all rules first to unlock the checkbox.';
                        rulesAgreeError.classList.add('visible');
                    }
                    if (rulesScroller) {
                        rulesScroller.scrollTo({ top: rulesScroller.scrollHeight, behavior: 'smooth' });
                    }
                }
            }, true);
        }
    }

    function showRulesModal(regData) {
        if (!rulesModal) { pendingRegData = regData; proceedWithRegistration(); return; }
        pendingRegData = regData;
        resetRulesCheckboxes();
        rulesModal.classList.remove('hidden');
        rulesAcceptedShown = true;
        setTimeout(() => {
            if (rulesScroller) rulesScroller.scrollTop = 0;
            if (rulesScroller && rulesScroller.scrollHeight <= rulesScroller.clientHeight + 6) {
                markRulesFullyScrolled();
            }
        }, 30);
    }

    function hideRulesModal() {
        if (!rulesModal) return;
        rulesModal.classList.add('hidden');
        pendingRegData = null;
    }

    initRulesCheckboxesSync();
    if (rulesCloseX) rulesCloseX.addEventListener('click', () => {
        hideRulesModal();
        if (startBtn) {
            startBtn.disabled = false;
            const t = startBtn.querySelector('.btn-text');
            if (t) t.textContent = 'Begin Quest';
        }
    });
    if (rulesConfirmBtn) {
        rulesConfirmBtn.addEventListener('click', () => {
            if (!allRuleChecksSelected()) {
                if (rulesAgreeError) {
                    rulesAgreeError.textContent = '⚠️ Please accept all Rules & Regulations to continue.';
                    rulesAgreeError.classList.add('visible');
                }
                if (rulesModal) {
                    const card = rulesModal.querySelector('.modal-card');
                    if (card) {
                        card.classList.remove('shake');
                        void card.offsetWidth;
                        card.classList.add('shake');
                        setTimeout(() => card.classList.remove('shake'), 500);
                    }
                }
                return;
            }
            const data = pendingRegData;
            if (data) {
                const key = KEY_RULES_ACCEPTED_PREFIX + data.roll + '|' + data.dept + '|' + data.year;
                try { localStorage.setItem(key, String(Date.now())); } catch (e) {}
            }
            hideRulesModal();
            proceedWithRegistration();
        });
    }

    // ------------------------------------------------------------------
    // 5. Inline validation helpers — clear errors on input
    // ------------------------------------------------------------------
    function attachClearError(input, errorEl) {
        if (!input) return;
        input.addEventListener('input', () => {
            input.classList.remove('input-error');
            if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('visible'); }
        });
        if (input.tagName === 'SELECT') {
            input.addEventListener('change', () => {
                input.classList.remove('input-error');
                if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('visible'); }
            });
        }
    }

    attachClearError(playerNameInput, nameError);
    attachClearError(playerPhoneInput, phoneError);
    attachClearError(rollNumberInput, rollError);
    attachClearError(departmentSelect, departmentError);
    attachClearError(yearSelect, yearError);
    attachClearError(retRollInput, retRollError);
    attachClearError(retDeptSelect, retDeptError);
    attachClearError(retYearSelect, retYearError);

    function showErr(input, errorEl, msg) {
        if (input)    input.classList.add('input-error');
        if (errorEl)  { errorEl.textContent = msg; errorEl.classList.add('visible'); }
    }

    function triggerShake() {
        if (!playerCard) return;
        playerCard.classList.remove('shake');
        void playerCard.offsetWidth;
        playerCard.classList.add('shake');
        setTimeout(() => playerCard.classList.remove('shake'), 500);
    }

    // ------------------------------------------------------------------
    // 6. Save to localStorage helper
    // ------------------------------------------------------------------
    function saveToStorage(name, roll, dept, year, phone) {
        try {
            localStorage.setItem(KEY_NAME,       name);
            localStorage.setItem(KEY_ROLL,       roll);
            localStorage.setItem(KEY_DEPARTMENT, dept);
            localStorage.setItem(KEY_YEAR,       year);
            if (phone) localStorage.setItem(KEY_PHONE, phone);
        } catch (e) { console.warn('localStorage error:', e); }
    }

    // ------------------------------------------------------------------
    // 7. Navigate to game (with game-active gate)
    // ------------------------------------------------------------------
    function launchGame(btn) {
        const doNavigate = () => {
            document.body.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
            document.body.style.opacity    = '0.7';
            document.body.style.transform  = 'scale(0.99)';
            setTimeout(() => { window.location.href = 'game.html'; }, 380);
        };

        const blockLaunch = () => {
            if (btn) {
                btn.disabled = false;
                const t = btn.querySelector('.btn-text');
                if (t) t.textContent = 'Begin Quest';
            }
            document.body.style.opacity   = '';
            document.body.style.transform = '';
            showGameClosedBanner();
        };

        if (btn) {
            btn.disabled = true;
            const t = btn.querySelector('.btn-text');
            if (t) t.textContent = 'Checking access...';
        }

        if (window.WordQuestFirebase && window.WordQuestFirebase.getGameStateFromFirestore) {
            window.WordQuestFirebase.getGameStateFromFirestore().then((isActive) => {
                if (!isActive) { blockLaunch(); } else { doNavigate(); }
            }).catch(() => {
                doNavigate(); // offline fallback — let them through
            });
        } else {
            doNavigate(); // Firebase not loaded yet — let them through
        }
    }

    function showGameClosedBanner() {
        let banner = document.getElementById('game-closed-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'game-closed-banner';
            banner.style.cssText = [
                'position: fixed', 'top: 50%', 'left: 50%',
                'transform: translate(-50%, -50%)',
                'background: linear-gradient(135deg, rgba(239,68,68,0.95) 0%, rgba(185,28,28,0.95) 100%)',
                'color: white', 'padding: 2rem 2.5rem', 'border-radius: 1.25rem',
                'box-shadow: 0 25px 60px rgba(0,0,0,0.6)', 'z-index: 9999',
                'text-align: center', 'max-width: 380px', 'width: 90%',
                'backdrop-filter: blur(12px)', 'border: 1px solid rgba(255,255,255,0.15)',
                'font-family: inherit', 'animation: fadeIn 0.3s ease'
            ].join(';');
            banner.innerHTML = `
                <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">⛔</div>
                <h2 style="font-size: 1.35rem; font-weight: 800; margin: 0 0 0.5rem;">Game Closed</h2>
                <p style="font-size: 0.9rem; opacity: 0.9; margin: 0 0 1.25rem; line-height: 1.5;">
                    The admin has ended this game session.<br>Please wait for the next round to begin.
                </p>
                <button onclick="document.getElementById('game-closed-banner').remove()"
                    style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4);
                    color: white; padding: 0.55rem 1.5rem; border-radius: 0.6rem;
                    font-weight: 600; cursor: pointer; font-size: 0.9rem;">OK</button>
            `;
            document.body.appendChild(banner);
        }
        // Auto-dismiss after 6s
        setTimeout(() => { if (banner) banner.remove(); }, 6000);
    }

    // ------------------------------------------------------------------
    // 8. Wait for Firebase to be ready (module loads async)
    // ------------------------------------------------------------------
    function waitForFirebase(cb) {
        if (window.WordQuestFirebase) { cb(window.WordQuestFirebase); return; }
        let tries = 0;
        const poll = setInterval(() => {
            tries++;
            if (window.WordQuestFirebase || tries >= 40) {
                clearInterval(poll);
                cb(window.WordQuestFirebase || null);
            }
        }, 100);
    }

    // ------------------------------------------------------------------
    // 9. NEW REGISTRATION form submit (Rules & Regs gated)
    // ------------------------------------------------------------------
    function proceedWithRegistration() {
        const data = pendingRegData || {};
        const name  = data.name  || (playerNameInput  ? playerNameInput.value  : '').trim();
        const phone = data.phone || (playerPhoneInput ? playerPhoneInput.value : '').trim();
        const roll  = data.roll  || (rollNumberInput  ? rollNumberInput.value  : '').trim().toUpperCase();
        const dept  = data.dept  || (departmentSelect ? departmentSelect.value : '');
        const year  = data.year  || (yearSelect       ? yearSelect.value       : '');

        saveToStorage(name, roll, dept, year, phone);

        if (startBtn) {
            startBtn.disabled = true;
            const t = startBtn.querySelector('.btn-text');
            if (t) t.textContent = 'Checking...';
        }

        const resetFreshProgression = () => {
            try {
                const freshKey = `${roll}|${dept}|${year}`;
                localStorage.removeItem('wordQuest_level_' + freshKey);
                localStorage.removeItem('wordQuest_cumulative_' + freshKey);
                localStorage.removeItem('wordQuest_cumulative_' + roll);
                localStorage.removeItem('wordQuest_history_' + roll);
                localStorage.removeItem('wordQuest_usedWords_' + freshKey);
            } catch (e) { /* noop */ }
        };

        waitForFirebase(async (fb) => {
            if (fb && fb.getPlayerByRollNumber) {
                try {
                    const existing = await fb.getPlayerByRollNumber(roll, dept, year);
                    if (existing) {
                        saveToStorage(
                            existing.name || name,
                            roll, dept, year,
                            existing.phoneNumber || phone
                        );
                        localStorage.setItem(KEY_PLAYER_ID, existing.id);
                        showWelcomeBackModal(existing);
                        return;
                    }
                } catch (e) {
                    console.warn('Existing-player lookup error:', e);
                }
            }

            resetFreshProgression();
            const doRegister = fb && fb.registerPlayer
                ? fb.registerPlayer({ name, phoneNumber: phone, rollNumber: roll, department: dept, year })
                : Promise.resolve(null);

            doRegister.then((docId) => {
                if (docId) localStorage.setItem(KEY_PLAYER_ID, docId);
                launchGame(null);
            }).catch(() => {
                launchGame(null);
            });
        });
    }

    if (playerForm) {
        playerForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name  = (playerNameInput  ? playerNameInput.value  : '').trim();
            const phone = (playerPhoneInput ? playerPhoneInput.value : '').trim();
            const roll  = (rollNumberInput  ? rollNumberInput.value  : '').trim().toUpperCase();
            const dept  = departmentSelect ? departmentSelect.value : '';
            const year  = yearSelect       ? yearSelect.value       : '';

            let hasError = false;

            if (!name || name.length < 2) {
                showErr(playerNameInput, nameError, name ? 'Name must be at least 2 characters.' : 'Please enter your player name.');
                hasError = true;
            }
            if (!phone || !/^[0-9]{10}$/.test(phone)) {
                showErr(playerPhoneInput, phoneError, 'Please enter a valid 10-digit phone number.');
                hasError = true;
            }
            if (!roll) {
                showErr(rollNumberInput, rollError, 'Please select your roll number.');
                hasError = true;
            }
            if (!dept) {
                showErr(departmentSelect, departmentError, 'Please select your department.');
                hasError = true;
            }
            if (!year) {
                showErr(yearSelect, yearError, 'Please select your year of study.');
                hasError = true;
            }

            if (hasError) { triggerShake(); return; }

            const regData = { name, phone, roll, dept, year };
            const rulesKey = KEY_RULES_ACCEPTED_PREFIX + roll + '|' + dept + '|' + year;
            let alreadyAccepted = false;
            try { alreadyAccepted = !!localStorage.getItem(rulesKey); } catch (e) {}

            if (alreadyAccepted) {
                pendingRegData = regData;
                proceedWithRegistration();
            } else {
                if (startBtn) {
                    startBtn.disabled = true;
                    const t = startBtn.querySelector('.btn-text');
                    if (t) t.textContent = 'Review Rules...';
                }
                showRulesModal(regData);
            }
        });
    }

    // ------------------------------------------------------------------
    // 10. ALREADY REGISTERED form submit — lookup by roll + dept + year
    // ------------------------------------------------------------------
    if (returningForm) {
        returningForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const roll = (retRollInput   ? retRollInput.value   : '').trim().toUpperCase();
            const dept = retDeptSelect   ? retDeptSelect.value  : '';
            const year = retYearSelect   ? retYearSelect.value  : '';

            let hasError = false;

            if (!roll) {
                showErr(retRollInput, retRollError, 'Please select your roll number.');
                hasError = true;
            }
            if (!dept) {
                showErr(retDeptSelect, retDeptError, 'Please select your department.');
                hasError = true;
            }
            if (!year) {
                showErr(retYearSelect, retYearError, 'Please select your year of study.');
                hasError = true;
            }

            if (hasError) { triggerShake(); return; }

            // Show searching state
            if (retStartBtn) {
                retStartBtn.disabled = true;
                const t = retStartBtn.querySelector('.btn-text');
                if (t) t.textContent = 'Searching...';
            }
            if (retLookupError) { retLookupError.textContent = ''; retLookupError.classList.remove('visible'); }

            waitForFirebase(async (fb) => {
                if (!fb || !fb.getPlayerByRollNumber) {
                    // Firebase unavailable — proceed with whatever is in localStorage
                    saveToStorage(
                        localStorage.getItem(KEY_NAME) || 'Player',
                        roll, dept, year
                    );
                    launchGame(retStartBtn);
                    return;
                }

                try {
                    const player = await fb.getPlayerByRollNumber(roll, dept, year);

                    if (!player) {
                        // Not found
                        if (retLookupError) {
                            retLookupError.textContent = '❌ No registration found. Please use New Registration.';
                            retLookupError.classList.add('visible');
                        }
                        if (retStartBtn) {
                            retStartBtn.disabled = false;
                            const t = retStartBtn.querySelector('.btn-text');
                            if (t) t.textContent = 'Find & Begin Quest';
                        }
                        triggerShake();
                        return;
                    }

                    // Found — restore profile and go
                    saveToStorage(player.name || 'Player', roll, dept, year);
                    if (player.id) localStorage.setItem(KEY_PLAYER_ID, player.id);
                    launchGame(retStartBtn);

                } catch (err) {
                    console.warn('Lookup error:', err);
                    // Network error fallback — still let them in
                    saveToStorage(localStorage.getItem(KEY_NAME) || 'Player', roll, dept, year);
                    launchGame(retStartBtn);
                }
            });
        });
    }

    // ------------------------------------------------------------------
    // 10b. Welcome Back modal — shown when "Begin Quest" finds an existing player
    // ------------------------------------------------------------------
    function showWelcomeBackModal(player) {
        const modal   = document.getElementById('welcome-back-modal');
        const contBtn = document.getElementById('wb-continue-btn');
        if (!modal || !contBtn) { launchGame(null); return; }

        const wbName  = document.getElementById('wb-modal-subtitle');
        const wbLevel = document.getElementById('wb-modal-level');
        const wbScore = document.getElementById('wb-modal-score');

        if (wbName)  wbName.textContent  = 'You\'re already registered as ' + (player.name || 'Player') + '.';
        if (wbLevel) wbLevel.textContent = player.currentLevel || 1;
        if (wbScore) wbScore.textContent = player.cumulativeScore || 0;

        // Reset the disabled button label while the modal is open
        if (startBtn) {
            const t = startBtn.querySelector('.btn-text');
            if (t) t.textContent = 'Begin Quest';
        }

        modal.classList.remove('hidden');

        contBtn.disabled = false;
        const onContinue = () => {
            contBtn.removeEventListener('click', onContinue);
            modal.classList.add('hidden');
            launchGame(null);
        };
        contBtn.addEventListener('click', onContinue);
    }

    // ------------------------------------------------------------------
    // 11. Leaderboard rendering (live from Firestore, fallback to localStorage)
    // ------------------------------------------------------------------
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

    function renderLeaderboardRows(list) {
        const tbody = document.getElementById('lb-body');
        if (!tbody) return;
        try {
            const arr = (list && Array.isArray(list)) ? list : JSON.parse(localStorage.getItem('wordQuest_leaderboard') || '[]');
            if (arr.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; opacity:0.6; padding:1rem;">No scores yet! Be the first to play.</td></tr>';
                return;
            }
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
            tbody.innerHTML = '';
            deduped.slice(0, 10).forEach((item, index) => {
                const tr = document.createElement('tr');
                let rank = `${index + 1}`;
                if (index === 0) rank = medalSvg('gold', '1');
                else if (index === 1) rank = medalSvg('silver', '2');
                else if (index === 2) rank = medalSvg('bronze', '3');
                const dept = item.department ? String(item.department).replace('Department of ', '') : '';
                tr.innerHTML = `
                    <td><strong>${rank}</strong></td>
                    <td>${item.name}</td>
                    <td>${dept}</td>
                    <td style="font-weight:700; color:var(--accent-gold-light);">${total(item)}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; opacity:0.6; padding:1rem;">Could not load leaderboard.</td></tr>';
        }
    }

    function subscribeLeaderboard() {
        const trySubscribe = (fb) => {
            if (fb && fb.subscribeToLeaderboard) {
                const unsub = fb.subscribeToLeaderboard((list) => {
                    if (Array.isArray(list)) renderLeaderboardRows(list);
                });
                // Kick a localStorage render so the table is never blank while Firestore loads
                renderLeaderboardRows();
                return unsub;
            }
            return null;
        };
        const immediate = trySubscribe(window.WordQuestFirebase);
        if (!immediate) {
            waitForFirebase(trySubscribe);
        }
    }

    // Ensure player is marked inactive while on index.html (not in game.html)
    function clearIndexActiveState(retries = 20) {
        if (window.WordQuestFirebase && window.WordQuestFirebase.unregisterActiveGame) {
            window.WordQuestFirebase.unregisterActiveGame();
        } else if (retries > 0) {
            setTimeout(() => clearIndexActiveState(retries - 1), 200);
        }
    }

    // ------------------------------------------------------------------
    // 11b. When the player returns from game.html, reveal the leaderboard
    // ------------------------------------------------------------------
    function maybeRevealLeaderboard() {
        let show = false;
        try { show = sessionStorage.getItem('wordQuest_showLeaderboard') === '1'; } catch (e) {}
        try { sessionStorage.removeItem('wordQuest_showLeaderboard'); } catch (e) {}
        if (!show) return;

        // Let the card-entrance animations settle, then bring the freshest scores into view
        setTimeout(() => {
            const card = document.getElementById('leaderboard-card');
            if (!card) return;
            renderLeaderboardRows();
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.remove('lb-flash');
            void card.offsetWidth;
            card.classList.add('lb-flash');
            setTimeout(() => card.classList.remove('lb-flash'), 2600);
        }, 700);
    }

    initFloatingLetters();
    restoreSession();
    renderLeaderboardRows();
    subscribeLeaderboard();
    maybeRevealLeaderboard();
    clearIndexActiveState();
});
