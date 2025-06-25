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

async function loadResources() {
  // Get the container where we will place the cards
  const grid = document.querySelector('.grid-container');
  // NOTE: I've moved the creation of the timer card OUT of this function
  // so that it doesn't get re-created every time resources are loaded.
  // The timer card is now permanently in your index.html.

  // Clear only the resource cards, not the timer
  const resourceCards = grid.querySelectorAll('.resource-card');
  resourceCards.forEach(card => card.remove());

  try {
    const response = await fetch('/api/resources');
    const resourceCategories = await response.json();

    for (const categoryName in resourceCategories) {
      const card = document.createElement('div');
      card.className = 'card resource-card'; // Added a specific class

      let cardHTML = `<h2>${categoryName}</h2>`;
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
      card.innerHTML = cardHTML;
      grid.appendChild(card);
    }
  } catch (error) {
    console.error("Failed to load resources:", error);
  }
}


// In main.js, replace your entire window.onload function with this one.

window.onload = function () {
  // --- LOGOUT AND LOGIN LOGIC ---
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

    // ... (All the `getElementById` calls stay the same) ...
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
    const sliders = { work: document.getElementById('work-time-slider'), short: document.getElementById('short-break-slider'), long: document.getElementById('long-break-slider'), interval: document.getElementById('long-break-interval-slider') };
    const values = { work: document.getElementById('work-time-value'), short: document.getElementById('short-break-value'), long: document.getElementById('long-break-value'), interval: document.getElementById('long-break-interval-value') };

    // ... (The pomodoro object stays the same) ...
    const pomodoro = { settings: { workTime: 25, shortBreakTime: 5, longBreakTime: 15, longBreakInterval: 4, }, state: { timeLeft: 25 * 60, sessions: 0, currentMode: 'work', timerInterval: null, } };

    // ... (switchMode and tick functions stay the same) ...
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
      // MODIFIED: Reset title when paused
      document.title = 'DLSZ Masterfile';
    }
    function resetTimer() {
      pauseTimer();
      switchMode(pomodoro.state.currentMode);
      // MODIFIED: Reset title when reset
      document.title = 'DLSZ Masterfile';
    }

    function updateDisplay() {
      const minutes = Math.floor(pomodoro.state.timeLeft / 60);
      const seconds = pomodoro.state.timeLeft % 60;
      const displayString = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      timerDisplay.textContent = displayString;
      // MODIFIED: Only update the title if the timer is actually running
      if (pomodoro.state.timerInterval) {
        document.title = `${displayString} - ${timerStatus.textContent}`;
      }
    }

    // ... (All other functions and event listeners stay the same) ...
    function updateCycleTracker() {
      cycleTracker.innerHTML = '';
      const sessionsInCurrentCycle = pomodoro.state.sessions % pomodoro.settings.longBreakInterval;
      for (let i = 0; i < pomodoro.settings.longBreakInterval; i++) {
        const dot = document.createElement('div');
        dot.classList.add('cycle-dot');
        if (i < sessionsInCurrentCycle) {
          dot.classList.add('completed');
        }
        cycleTracker.appendChild(dot);
      }
    }
    function setupSlider(sliderName) {
      const slider = sliders[sliderName];
      const valueDisplay = values[sliderName];
      slider.addEventListener('input', () => {
        valueDisplay.textContent = slider.value;
      });
    }
    function saveSettings() {
      localStorage.setItem('pomodoroSettings', JSON.stringify(pomodoro.settings));
    }
    function loadSettings() {
      const savedSettings = JSON.parse(localStorage.getItem('pomodoroSettings'));
      if (savedSettings) {
        pomodoro.settings = savedSettings;
      }
      sliders.work.value = pomodoro.settings.workTime;
      sliders.short.value = pomodoro.settings.shortBreakTime;
      sliders.long.value = pomodoro.settings.longBreakTime;
      sliders.interval.value = pomodoro.settings.longBreakInterval;
      Object.values(sliders).forEach(slider => slider.dispatchEvent(new Event('input')));
    }
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
      pomodoro.settings.workTime = parseInt(sliders.work.value);
      pomodoro.settings.shortBreakTime = parseInt(sliders.short.value);
      pomodoro.settings.longBreakTime = parseInt(sliders.long.value);
      pomodoro.settings.longBreakInterval = parseInt(sliders.interval.value);
      saveSettings();
      settingsModal.classList.remove('open');
      resetTimer();
    });
    setupSlider('work');
    setupSlider('short');
    setupSlider('long');
    setupSlider('interval');
    setTimeout(() => {
      loadSettings();
      resetTimer();
    }, 100);
  }
};