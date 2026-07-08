let fullQuestionBank = [];
let questions = [];
let currentIdx = 0;
let isTransitioning = false;
let mode = 'setup'; // 'setup', 'quiz', 'results'

// Game state
let playerName = '';
let lives = 3;
let currentScore = 0;
let timerInterval = null;
let timeLeft = 20;

const DOM = {
    cardSlot: document.getElementById('card-slot'),
    usedPile: document.getElementById('used-pile'),
    announcer: document.getElementById('announcer'),
    fakeCards: document.getElementById('fake-cards'),
    hudLeft: document.getElementById('hud-left'),
    hudRight: document.getElementById('hud-right'),
    timeLeft: document.getElementById('time-left'),
    deskScore: document.getElementById('desk-score'),
    currentScore: document.getElementById('current-score'),
    lifeMarks: document.querySelectorAll('.life-mark'),
    setupModal: document.getElementById('setup-modal'),
    dustContainer: document.getElementById('dust-particles')
};

// Fisher-Yates shuffle
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function generateDustParticles() {
    DOM.dustContainer.innerHTML = '';
    const numParticles = 40;
    for (let i = 0; i < numParticles; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        
        const size = Math.random() * 4 + 2;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        
        p.style.left = `${Math.random() * 100}%`;
        p.style.top = `${Math.random() * 100}%`;
        
        const duration = Math.random() * 15 + 10;
        p.style.animationDuration = `${duration}s`;
        
        const delay = Math.random() * 20;
        p.style.animationDelay = `-${delay}s`; // start at different points in animation
        
        DOM.dustContainer.appendChild(p);
    }
}

function initApp() {
    generateDustParticles();
    
    const nameInput = document.getElementById('player-name');
    const startBtn = document.getElementById('start-btn');
    
    nameInput.addEventListener('input', () => {
        startBtn.disabled = nameInput.value.trim().length === 0;
    });
    
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !startBtn.disabled) {
            e.preventDefault();
            startBtn.click();
        }
    });
    
    startBtn.addEventListener('click', async () => {
        playerName = nameInput.value.trim() || 'Anonymous';
        await startQuiz();
    });

    renderSetupScreen();
}

function updateHUD() {
    DOM.timeLeft.textContent = `0:${timeLeft.toString().padStart(2, '0')}`;
    DOM.currentScore.textContent = currentScore;
    
    if (timeLeft <= 5 && mode === 'quiz') {
        DOM.timeLeft.classList.add('danger');
    } else {
        DOM.timeLeft.classList.remove('danger');
    }

    DOM.lifeMarks.forEach(mark => {
        const lifeValue = parseInt(mark.dataset.life, 10);
        if (lifeValue > lives) {
            mark.classList.add('lost');
        } else {
            mark.classList.remove('lost');
        }
    });
}

function renderSetupScreen() {
    mode = 'setup';
    DOM.fakeCards.style.display = 'none';
    DOM.usedPile.innerHTML = '';
    DOM.deskScore.style.display = 'none';
    DOM.hudLeft.classList.add('hud-hidden');
    DOM.hudRight.classList.add('hud-hidden');
    
    DOM.setupModal.classList.add('active');
    
    DOM.announcer.textContent = 'Welcome to the Late Night Exam. Enter your Developer ID.';
    
    // Reset HUD
    lives = 3;
    currentScore = 0;
    timeLeft = 20;
    updateHUD();
    
    DOM.cardSlot.innerHTML = '';
    setTimeout(() => document.getElementById('player-name').focus(), 300);
}

async function startQuiz() {
    try {
        const startBtn = document.getElementById('start-btn');
        startBtn.disabled = true;
        startBtn.textContent = 'LOADING...';
        
        const res = await fetch('data/questions.json');
        if (!res.ok) throw new Error('Network error');
        fullQuestionBank = await res.json();
        
        // 10 random questions
        questions = shuffle(fullQuestionBank).slice(0, 10);
        
        if (questions.length === 0) {
            alert('No questions found.');
            startBtn.disabled = false;
            startBtn.textContent = 'BEGIN EXAM';
            return;
        }
        
        DOM.setupModal.classList.remove('active');
        
        // Reset button for next time
        setTimeout(() => {
            startBtn.disabled = false;
            startBtn.textContent = 'BEGIN EXAM';
            document.getElementById('player-name').value = '';
        }, 500);
        
        currentIdx = 0;
        currentScore = 0;
        lives = 3;
        mode = 'quiz';
        
        DOM.usedPile.innerHTML = '';
        DOM.fakeCards.style.display = 'block';
        DOM.deskScore.style.display = 'flex';
        DOM.hudLeft.classList.remove('hud-hidden');
        DOM.hudRight.classList.remove('hud-hidden');
        
        DOM.announcer.textContent = 'Exam started. Good luck!';
        
        updateHUD();
        renderCard();
        
    } catch (e) {
        console.error(e);
        alert('Failed to load questions.');
        renderSetupScreen();
    }
}

function startTimer(cardEl, q) {
    if (timerInterval) clearInterval(timerInterval);
    timeLeft = 20;
    updateHUD();
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateHUD();
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (!isTransitioning) {
                DOM.announcer.textContent = 'Time is up!';
                handleSubmit(cardEl, q, true);
            }
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    DOM.timeLeft.classList.remove('danger');
}

function updateFakeCards() {
    const remaining = questions.length - currentIdx - 1;
    const fakeCards = DOM.fakeCards.children;
    for (let i = 0; i < fakeCards.length; i++) {
        fakeCards[i].style.display = i < remaining ? 'block' : 'none';
    }
    if (remaining < 0) {
        DOM.fakeCards.style.display = 'none';
    }
}

function renderCard() {
    if (currentIdx >= questions.length || lives <= 0) {
        renderResults();
        return;
    }
    
    updateFakeCards();
    
    const q = questions[currentIdx];
    
    const cardEl = document.createElement('div');
    cardEl.className = 'card slide-up';
    
    const meta = `<div class="card-meta">Card ${currentIdx + 1} of ${questions.length}</div>`;
    const prompt = `<h2 class="question-text">${escapeHTML(q.prompt)}</h2>`;
    
    let content = '';
    
    if (q.type === 'code-snippet') {
        content += `<pre class="code-block"><code>${escapeHTML(q.code)}</code></pre>`;
    }
    
    if (q.type === 'single-select' || q.type === 'multi-select' || q.type === 'code-snippet') {
        content += `<div class="options-list" role="group" aria-label="Options">`;
        q.options.forEach((opt, idx) => {
            content += `
                <button type="button" class="option-btn" data-value="${escapeHTML(opt)}" aria-pressed="false" data-index="${idx + 1}">
                    <span class="tick-box" aria-hidden="true"></span>
                    <span class="option-text">${escapeHTML(opt)}</span>
                </button>
            `;
        });
        content += `</div>`;
    } else if (q.type === 'fill-in-blank') {
        content = `
            <div class="fill-in-container">
                <input type="text" class="fill-in-input" placeholder="Type answer here..." aria-label="Answer">
            </div>
        `;
    }
    
    const actions = `
        <div class="actions">
            <button type="button" class="submit-btn" disabled>Submit</button>
        </div>
        <div class="stamp"></div>
    `;
    
    cardEl.innerHTML = meta + prompt + content + actions;
    
    DOM.cardSlot.innerHTML = '';
    DOM.cardSlot.appendChild(cardEl);
    
    setupInteractions(cardEl, q);
    
    // Slight delay before starting timer
    setTimeout(() => {
        if (mode === 'quiz' && !isTransitioning) {
            startTimer(cardEl, q);
        }
    }, 300);
}

function setupInteractions(cardEl, q) {
    const submitBtn = cardEl.querySelector('.submit-btn');
    const options = cardEl.querySelectorAll('.option-btn');
    const input = cardEl.querySelector('.fill-in-input');
    
    // 3D Tilt Effect
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {
        cardEl.addEventListener('mousemove', (e) => {
            if (isTransitioning) return;
            const rect = cardEl.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const xPct = (x / rect.width) - 0.5; 
            const yPct = (y / rect.height) - 0.5;
            cardEl.style.transform = `rotateX(${yPct * -10}deg) rotateY(${xPct * 10}deg)`;
        });
        
        cardEl.addEventListener('mouseleave', () => {
            if (!isTransitioning) {
                cardEl.style.transform = `rotateX(0deg) rotateY(0deg)`;
            }
        });
    }

    function validateState() {
        if (q.type === 'single-select' || q.type === 'multi-select' || q.type === 'code-snippet') {
            const anySelected = Array.from(options).some(btn => btn.getAttribute('aria-pressed') === 'true');
            submitBtn.disabled = !anySelected;
        } else if (q.type === 'fill-in-blank') {
            submitBtn.disabled = input.value.trim().length === 0;
        }
    }
    
    if (options.length > 0) {
        options.forEach(btn => {
            btn.addEventListener('click', () => {
                if (q.type === 'single-select' || q.type === 'code-snippet') {
                    options.forEach(b => b.setAttribute('aria-pressed', 'false'));
                    btn.setAttribute('aria-pressed', 'true');
                } else {
                    const isPressed = btn.getAttribute('aria-pressed') === 'true';
                    btn.setAttribute('aria-pressed', !isPressed);
                }
                validateState();
            });
        });
    }
    
    if (input) {
        input.addEventListener('input', validateState);
        setTimeout(() => input.focus(), 300);
    }
    
    submitBtn.addEventListener('click', () => {
        if (submitBtn.disabled || isTransitioning) return;
        handleSubmit(cardEl, q, false);
    });
    
    // Keyboard shortcuts
    const keydownHandler = (e) => {
        if (isTransitioning || mode !== 'quiz') return;
        
        // Number keys 1-4
        if ((q.type === 'single-select' || q.type === 'code-snippet') && e.key >= '1' && e.key <= '4') {
            const idx = parseInt(e.key) - 1;
            if (options[idx]) {
                options[idx].click();
            }
        }
        
        // Enter to submit
        if (e.key === 'Enter') {
            if (document.activeElement && document.activeElement.tagName === 'BUTTON' && document.activeElement !== submitBtn) {
                return;
            }
            if (!submitBtn.disabled) {
                e.preventDefault();
                submitBtn.click();
            }
        }
    };
    
    document.addEventListener('keydown', keydownHandler);
    
    cardEl.cleanup = () => {
        document.removeEventListener('keydown', keydownHandler);
    };
}

function flashRed() {
    document.body.classList.add('flash-danger');
    setTimeout(() => {
        document.body.classList.remove('flash-danger');
    }, 400);
}

function handleSubmit(cardEl, q, isTimeout) {
    isTransitioning = true;
    stopTimer();
    if (cardEl.cleanup) cardEl.cleanup();
    
    const submitBtn = cardEl.querySelector('.submit-btn');
    const stamp = cardEl.querySelector('.stamp');
    submitBtn.disabled = true;
    
    // reset 3d tilt for animation
    cardEl.style.transform = `rotateX(0deg) rotateY(0deg)`;
    
    let isCorrect = false;
    
    if (!isTimeout) {
        if (q.type === 'single-select' || q.type === 'code-snippet') {
            const selected = cardEl.querySelector('.option-btn[aria-pressed="true"]');
            if (selected && selected.dataset.value === escapeHTML(q.correctAnswer[0])) {
                isCorrect = true;
            }
        } else if (q.type === 'multi-select') {
            const selectedValues = Array.from(cardEl.querySelectorAll('.option-btn[aria-pressed="true"]'))
                                      .map(btn => btn.dataset.value);
            const correctSet = new Set(q.correctAnswer.map(ans => escapeHTML(ans)));
            const selectedSet = new Set(selectedValues);
            
            if (correctSet.size === selectedSet.size && [...selectedSet].every(val => correctSet.has(val))) {
                isCorrect = true;
            }
        } else if (q.type === 'fill-in-blank') {
            const input = cardEl.querySelector('.fill-in-input');
            const val = input.value.trim().toLowerCase();
            const expected = q.correctAnswer[0].trim().toLowerCase();
            if (val === expected) {
                isCorrect = true;
            }
        }
    }
    
    if (isCorrect) {
        currentScore += 100 + (timeLeft * 10);
        stamp.classList.add('correct');
        DOM.announcer.textContent = `Correct! Plus ${100 + (timeLeft * 10)} points.`;
    } else {
        lives--;
        stamp.classList.add('incorrect');
        DOM.announcer.textContent = isTimeout ? `Timeout. Life lost. ${lives} lives remaining.` : `Incorrect. Life lost. ${lives} lives remaining.`;
        flashRed();
    }
    
    updateHUD();
    stamp.classList.add('stamp-anim');
    
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animationDelay = prefersReducedMotion ? 400 : 700;
    
    setTimeout(() => {
        cardEl.classList.add('slide-off');
        cardEl.classList.remove('slide-up');
        
        addUsedCard(isCorrect);
        
        const removeDelay = prefersReducedMotion ? 0 : 400;
        
        setTimeout(() => {
            currentIdx++;
            isTransitioning = false;
            renderCard();
        }, removeDelay);
        
    }, animationDelay);
}

function addUsedCard(isCorrect) {
    const used = document.createElement('div');
    used.className = 'used-card';
    
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    let transform = '';
    if (isDesktop) {
        used.style.top = `${currentIdx * 12}px`;
        used.style.left = `${(currentIdx % 3) * 3}px`;
        transform = `rotate(${Math.random() * 12 - 6}deg)`;
    } else {
        used.style.left = `${currentIdx * 20}px`;
        used.style.top = `${(currentIdx % 3) * 3}px`;
        transform = `rotate(${Math.random() * 16 - 8}deg)`;
    }
    used.style.transform = transform;
    
    used.innerHTML = `<div class="stamp-mini ${isCorrect ? 'correct' : 'incorrect'}"></div>`;
    DOM.usedPile.appendChild(used);
}

function saveAndGetLeaderboard() {
    let leaderboard = [];
    try {
        const stored = localStorage.getItem('deskExamLeaderboard');
        if (stored) leaderboard = JSON.parse(stored);
    } catch (e) {
        console.error('Could not access localStorage', e);
    }
    
    leaderboard.push({ name: playerName, score: currentScore, date: new Date().toISOString() });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 5); // Keep top 5
    
    try {
        localStorage.setItem('deskExamLeaderboard', JSON.stringify(leaderboard));
    } catch (e) {
        console.error('Could not save to localStorage', e);
    }
    
    return leaderboard;
}

function renderResults() {
    mode = 'results';
    stopTimer();
    DOM.fakeCards.style.display = 'none';
    DOM.hudLeft.classList.add('hud-hidden');
    DOM.hudRight.classList.add('hud-hidden');
    
    const leaderboard = saveAndGetLeaderboard();
    
    const cardEl = document.createElement('div');
    cardEl.className = 'card grade-slip grade-slip-anim';
    
    let feedback = "";
    if (lives <= 0) {
        feedback = "TERMINATED. Maximum strikes reached.";
    } else {
        feedback = "EXAM COMPLETED. You survived.";
    }
    
    let leaderboardHtml = `
        <h3 class="leaderboard-title">Top Clearances</h3>
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th>Developer ID</th>
                    <th class="text-right">Score</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    leaderboard.forEach(entry => {
        const isCurrent = (entry.name === playerName && entry.score === currentScore);
        leaderboardHtml += `
            <tr class="${isCurrent ? 'current-user' : ''}">
                <td>${escapeHTML(entry.name)}</td>
                <td class="text-right">${entry.score}</td>
            </tr>
        `;
    });
    
    leaderboardHtml += `
            </tbody>
        </table>
    `;
    
    const content = `
        <div class="score-text">FINAL: ${currentScore}</div>
        <p class="feedback-text">${feedback}</p>
        ${leaderboardHtml}
        <div class="actions" style="justify-content: center; margin-top: 0;">
            <button type="button" class="play-again-btn">Retake Exam</button>
        </div>
    `;
    
    cardEl.innerHTML = content;
    DOM.cardSlot.innerHTML = '';
    DOM.cardSlot.appendChild(cardEl);
    
    DOM.announcer.textContent = `Game Over. Final score: ${currentScore}.`;
    
    cardEl.querySelector('.play-again-btn').addEventListener('click', () => {
        cardEl.style.display = 'none';
        renderSetupScreen();
    });
}

// Start app
initApp();
