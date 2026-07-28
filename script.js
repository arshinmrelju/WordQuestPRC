/**
 * WORD QUEST — Main JavaScript Controller
 * English Department Carnival
 * Handles floating letter generation, player profile validation,
 * department selection, and localStorage state persistence.
 */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // 1. DOM Elements
    // ----------------------------------------------------------------------
    const playerForm = document.getElementById('player-form');
    const playerNameInput = document.getElementById('player-name');
    const departmentSelect = document.getElementById('department');
    const yearSelect = document.getElementById('year-of-study');
    const nameError = document.getElementById('name-error');
    const departmentError = document.getElementById('department-error');
    const yearError = document.getElementById('year-error');
    const playerCard = document.getElementById('player-card');
    const startBtn = document.getElementById('start-btn');
    const lettersContainer = document.getElementById('letters-container');

    // LocalStorage Keys
    const STORAGE_KEY_NAME = 'wordQuest_playerName';
    const STORAGE_KEY_DEPARTMENT = 'wordQuest_department';
    const STORAGE_KEY_YEAR = 'wordQuest_yearOfStudy';

    // ----------------------------------------------------------------------
    // 2. Initialize Floating Background Letters (A-Z)
    // ----------------------------------------------------------------------
    function initFloatingLetters() {
        if (!lettersContainer) return;

        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const totalLetters = 35; // Total floating particle elements

        for (let i = 0; i < totalLetters; i++) {
            const letterEl = document.createElement('span');
            letterEl.classList.add('floating-letter');
            
            // Random letter from A-Z
            const randomChar = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            letterEl.textContent = randomChar;

            // Randomized layout & animation properties
            const posX = Math.random() * 95; // 0% - 95% horizontally
            const duration = 14 + Math.random() * 18; // 14s - 32s float speed
            const delay = -Math.random() * 25; // Negative delay so screen is immediately populated
            const fontSize = 1.2 + Math.random() * 2.2; // 1.2rem - 3.4rem
            const targetOpacity = (0.04 + Math.random() * 0.12).toFixed(2); // Subtle glow opacity

            // Apply inline styles for dynamic CSS variables
            letterEl.style.left = `${posX}%`;
            letterEl.style.animationDuration = `${duration}s`;
            letterEl.style.animationDelay = `${delay}s`;
            letterEl.style.fontSize = `${fontSize}rem`;
            letterEl.style.setProperty('--target-opacity', targetOpacity);

            lettersContainer.appendChild(letterEl);
        }
    }

    // ----------------------------------------------------------------------
    // 3. LocalStorage Restoration (Pre-populate Player Info)
    // ----------------------------------------------------------------------
    function restorePlayerSession() {
        const savedName = localStorage.getItem(STORAGE_KEY_NAME);
        const savedDepartment = localStorage.getItem(STORAGE_KEY_DEPARTMENT);
        const savedYear = localStorage.getItem(STORAGE_KEY_YEAR);

        if (savedName && playerNameInput) {
            playerNameInput.value = savedName;
        }

        if (savedDepartment && departmentSelect) {
            departmentSelect.value = savedDepartment;
        }

        if (savedYear && yearSelect) {
            yearSelect.value = savedYear;
        }
    }

    // Clear validation error when user interacts with inputs
    if (playerNameInput) {
        playerNameInput.addEventListener('input', () => {
            if (playerNameInput.classList.contains('input-error')) {
                playerNameInput.classList.remove('input-error');
                if (nameError) {
                    nameError.classList.remove('visible');
                    nameError.textContent = '';
                }
            }
        });
    }

    if (departmentSelect) {
        departmentSelect.addEventListener('change', () => {
            if (departmentSelect.classList.contains('input-error')) {
                departmentSelect.classList.remove('input-error');
                if (departmentError) {
                    departmentError.classList.remove('visible');
                    departmentError.textContent = '';
                }
            }
        });
    }

    if (yearSelect) {
        yearSelect.addEventListener('change', () => {
            if (yearSelect.classList.contains('input-error')) {
                yearSelect.classList.remove('input-error');
                if (yearError) {
                    yearError.classList.remove('visible');
                    yearError.textContent = '';
                }
            }
        });
    }

    // ----------------------------------------------------------------------
    // 4. Form Validation & Start Game Trigger
    // ----------------------------------------------------------------------
    if (playerForm) {
        playerForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const rawName = playerNameInput ? playerNameInput.value : '';
            const trimmedName = rawName.trim();
            const selectedDepartment = departmentSelect ? departmentSelect.value : '';
            const selectedYear = yearSelect ? yearSelect.value : '';

            let hasError = false;

            // Validate Player Name
            if (!trimmedName) {
                showNameError('Please enter your player name to continue.');
                hasError = true;
            } else if (trimmedName.length < 2) {
                showNameError('Player name must be at least 2 characters.');
                hasError = true;
            } else {
                clearNameError();
            }

            // Validate Department Selection
            if (!selectedDepartment) {
                showDepartmentError('Please select your department.');
                if (!hasError) triggerShake();
                hasError = true;
            } else {
                clearDepartmentError();
            }

            // Validate Year of Study Selection
            if (!selectedYear) {
                showYearError('Please select your year of study.');
                if (!hasError) triggerShake();
                hasError = true;
            } else {
                clearYearError();
            }

            if (hasError) return;

            // Validation Passed: Clear Errors & Store Data
            try {
                localStorage.setItem(STORAGE_KEY_NAME, trimmedName);
                localStorage.setItem(STORAGE_KEY_DEPARTMENT, selectedDepartment);
                localStorage.setItem(STORAGE_KEY_YEAR, selectedYear);
            } catch (err) {
                console.warn('LocalStorage error:', err);
            }

            // Animate Button Loading State & Redirect
            triggerStartGameTransition();
        });
    }

    // Helper: Display visual validation error for Name
    function showNameError(message) {
        if (!playerNameInput) return;
        playerNameInput.classList.add('input-error');
        if (nameError) {
            nameError.textContent = message;
            nameError.classList.add('visible');
        }
        triggerShake();
        playerNameInput.focus();
    }

    function clearNameError() {
        if (playerNameInput) playerNameInput.classList.remove('input-error');
        if (nameError) {
            nameError.classList.remove('visible');
            nameError.textContent = '';
        }
    }

    // Helper: Display visual validation error for Department
    function showDepartmentError(message) {
        if (!departmentSelect) return;
        departmentSelect.classList.add('input-error');
        if (departmentError) {
            departmentError.textContent = message;
            departmentError.classList.add('visible');
        }
        departmentSelect.focus();
    }

    function clearDepartmentError() {
        if (departmentSelect) departmentSelect.classList.remove('input-error');
        if (departmentError) {
            departmentError.classList.remove('visible');
            departmentError.textContent = '';
        }
    }

    // Helper: Display visual validation error for Year of Study
    function showYearError(message) {
        if (!yearSelect) return;
        yearSelect.classList.add('input-error');
        if (yearError) {
            yearError.textContent = message;
            yearError.classList.add('visible');
        }
        yearSelect.focus();
    }

    function clearYearError() {
        if (yearSelect) yearSelect.classList.remove('input-error');
        if (yearError) {
            yearError.classList.remove('visible');
            yearError.textContent = '';
        }
    }

    function triggerShake() {
        if (playerCard) {
            playerCard.classList.remove('shake');
            void playerCard.offsetWidth; // Force reflow
            playerCard.classList.add('shake');
            setTimeout(() => {
                playerCard.classList.remove('shake');
            }, 500);
        }
    }

    // Helper: Button transition & navigation to game.html
    function triggerStartGameTransition() {
        if (!startBtn) return;

        startBtn.disabled = true;
        const btnText = startBtn.querySelector('.btn-text');
        if (btnText) {
            btnText.textContent = 'Launching Quest...';
        }

        // Add sleek fade-out scaling to body before redirecting
        document.body.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
        document.body.style.opacity = '0.7';
        document.body.style.transform = 'scale(0.99)';

        setTimeout(() => {
            window.location.href = 'game.html';
        }, 350);
    }

    // ----------------------------------------------------------------------
    // 6. Execution Entry Point
    // ----------------------------------------------------------------------
    initFloatingLetters();
    restorePlayerSession();
});
