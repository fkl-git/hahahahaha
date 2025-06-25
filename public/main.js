let currentUsername = null;

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (data.success) {
    currentUsername = username;
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('content-container').style.display = 'block';

    const logoutBtn = document.getElementById('logout-button');
    logoutBtn.style.display = 'inline-flex';

    document.getElementById('userNameMark').innerText = username;
    loadResources();
  } else {
    document.getElementById('message').textContent = data.message;
  }
}

// === OPTIMIZED VERSION OF THIS FUNCTION ===
async function loadResources() {
  const grid = document.querySelector('.grid-container');

  // Clear only the resource cards, not the timer
  const resourceCards = grid.querySelectorAll('.resource-card');
  resourceCards.forEach(card => card.remove());

  try {
    const response = await fetch('/api/resources');
    const resourceCategories = await response.json();

    // 1. Build one giant HTML string in the background
    let allCardsHTML = ''; 
    for (const categoryName in resourceCategories) {
      let cardHTML = `<div class="card resource-card"><h2>${categoryName}</h2>`; // Start the card

      const links = resourceCategories[categoryName];
      links.forEach(link => {
        cardHTML += `
          <p>
            <strong>${link.title}</strong><br>
            <a href="${link.url}" target="_blank">${link.url}</a><br>
            <span class="subtext">${link.subtext}</span>
          </p>
        `;
      });
      cardHTML += `</div>`; // Close the card
      allCardsHTML += cardHTML; // Add this card's HTML to the master string
    }

    // 2. Add the entire HTML string to the page just ONCE. This is much faster.
    grid.insertAdjacentHTML('beforeend', allCardsHTML);

  } catch (error) {
    console.error("Failed to load resources:", error);
  }
}


window.onload = function () {
  // --- EXISTING LOGOUT AND LOGIN LOGIC ---
  const logoutButton = document.getElementById('logout-button');
  const confirmYes = document.getElementById('confirm-yes');
  const confirmNo = document.getElementById('confirm-no');

  document.getElementById('login-button').addEventListener('click', login);

  logoutButton.addEventListener('click', () => {
    document.getElementById('logout-confirm').style.display = 'flex';
  });

  confirmNo.addEventListener('click', () => {
    document.getElementById('logout-confirm').style.display = 'none';
  });

  confirmYes.addEventListener('click', async () => {
    if (!currentUsername) {
      alert("No username found for logout");
      return;
    }
    const res = await fetch('/api/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUsername })
    });
    const data = await res.json();
    if (data.success) {
      alert("You have successfully logged out");
    } else {
      alert("Logout failed: " + data.message);
    }
    window.location.reload();
  });

  // ===============================================
  // === FINAL "ALL-OUT" POMODORO TIMER LOGIC ======
  // ===============================================
  const pomodoroCard = document.getElementById('pomodoro-card');
  if (pomodoroCard) {

    // --- Get all DOM Elements ---
    const timerModeTitle = document.getElementById('timer-mode-title');
    const timerStatus = document.getElementById('timer-status');
    const timerDisplay = document.getElementById('timer-display');
    const cycleTracker = document.getElementById('cycle-tracker');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const alarmSound = document.getElementById('alarm-sound');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const settingsForm = document.getElementById('settings-form');

    // --- Main Pomodoro Object ---
    const pomodoro = {
      settings: {
        workTime: 25,
        shortBreakTime: 5,
        longBreakTime: 15,
        longBreakInterval: 4,
      },
      state: {
        timeLeft: 25 * 60,
        sessions: 0,
        currentMode: 'work',
        timerInterval: null,
      }
    };

    // --- Core Functions ---
    function switchMode(mode) {
      pomodoro.state.currentMode = mode;
      pomodoroCard.className = 'card';
      if (mode === 'work') {
        pomodoro.state.timeLeft = pomodoro.settings.workTime * 60;
        pomodoroCard.classList.add('timer-work');
        timerStatus.textContent = "Time to focus!";
      } else if (mode === 'shortBreak') {
        pomodoro.state.timeLeft = pomodoro.settings.shortBreakTime * 60;
        pomodoroCard.classList.add('timer-break');
        timerStatus.textContent = "Time for a short break.";
      } else if (mode === 'longBreak') {
        pomodoro.state.timeLeft = pomodoro.settings.longBreakTime * 60;
        pomodoroCard.classList.add('timer-break');
        timerStatus.textContent = "Time for a long break!";
      }
      updateDisplay();
      updateCycleTracker();
    }

    function tick() {
      pomodoro.state.timeLeft--;
      updateDisplay();
      if (pomodoro.state.timeLeft < 0) {
        pauseTimer();
        alarmSound.play();
        if (pomodoro.state.currentMode === 'work') {
          pomodoro.state.sessions++;
          if (pomodoro.state.sessions % pomodoro.settings.longBreakInterval === 0) {
            switchMode('longBreak');
          } else {
            switchMode('shortBreak');
          }
        } else {
          switchMode('work');
        }
      }
    }

    function startTimer() {
      if (pomodoro.state.timerInterval) return;
      timerStatus.textContent = pomodoro.state.currentMode === 'work' ? 'Working...' : 'On a break...';
      pomodoro.state.timerInterval = setInterval(tick, 1000);
    }
    function pauseTimer() {
      clearInterval(pomodoro.state.timerInterval);
      pomodoro.state.timerInterval = null;
    }
    function resetTimer() {
      pauseTimer();
      switchMode(pomodoro.state.currentMode);
    }

    function updateDisplay() {
      const minutes = Math.floor(pomodoro.state.timeLeft / 60);
      const seconds = pomodoro.state.timeLeft % 60;
      const displayString = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      timerDisplay.textContent = displayString;
      document.title = `${displayString} - ${timerStatus.textContent}`;
    }

    function updateCycleTracker() {
      cycleTracker.innerHTML = '';
      const sessionsInCurrentCycle = pomodoro.state.sessions % pomodoro.settings.longBreakInterval;
      for (let i = 0; i < pomodoro.settings.longBreakInterval; i++) {
        const dot = document.createElement('div');
        dot.classList.add('cycle-dot');
        if (pomodoro.state.currentMode !== 'work' && i < sessionsInCurrentCycle) {
          dot.classList.add('completed');
        } else if (pomodoro.state.currentMode === 'work' && i < sessionsInCurrentCycle) {
          dot.classList.add('completed');
        }
        cycleTracker.appendChild(dot);
      }
    }

    // --- Settings and Local Storage ---
    function saveSettings() {
      localStorage.setItem('pomodoroSettings', JSON.stringify(pomodoro.settings));
    }

    function loadSettings() {
      const savedSettings = JSON.parse(localStorage.getItem('pomodoroSettings'));
      if (savedSettings) {
        pomodoro.settings = savedSettings;
      }
      settingsForm.elements['work-time'].value = pomodoro.settings.workTime;
      settingsForm.elements['short-break-time'].value = pomodoro.settings.shortBreakTime;
      settingsForm.elements['long-break-time'].value = pomodoro.settings.longBreakTime;
      settingsForm.elements['long-break-interval'].value = pomodoro.settings.longBreakInterval;
    }

    // --- Event Listeners ---
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);

    settingsBtn.addEventListener('click', () => settingsModal.classList.add('open'));
    closeModalBtn.addEventListener('click', () => settingsModal.classList.remove('open'));
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.remove('open');
      }
    });

    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      pomodoro.settings.workTime = parseInt(settingsForm.elements['work-time'].value);
      pomodoro.settings.shortBreakTime = parseInt(settingsForm.elements['short-break-time'].value);
      pomodoro.settings.longBreakTime = parseInt(settingsForm.elements['long-break-time'].value);
      pomodoro.settings.longBreakInterval = parseInt(settingsForm.elements['long-break-interval'].value);

      saveSettings();
      settingsModal.classList.remove('open');
      resetTimer(); // Apply new settings immediately
    });

    // --- Initialize Timer on Page Load ---
    loadSettings();
    resetTimer();
  }
};