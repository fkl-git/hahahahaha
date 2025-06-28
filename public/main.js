let currentUsername = null;
let currentSessionId = null;

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const messageEl = document.getElementById('message'); // Get the message element

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success) {
      currentUsername = username;
      currentSessionId = data.session_id;
      document.getElementById('login-container').style.display = 'none';
      document.getElementById('content-container').style.display = 'block';
      document.getElementById('logout-button').style.display = 'inline-flex';
      document.getElementById('userNameMark').innerText = username;
      loadResources();
      messageEl.textContent = ''; // Clear any old error messages
    } else {
      // We will replace this with a better notification later
      messageEl.textContent = data.message;
    }
  } catch (error) {
    // This will catch network errors or other unexpected issues
    console.error('Login request failed:', error);
    messageEl.textContent = 'An unexpected error occurred. Please try again.';
  }
}

async function loadResources() {
  const grid = document.querySelector('.grid-container');
  grid.innerHTML = ''; // Clear previous resources

  try {
    const response = await fetch('/api/resources');
    const resourceCategories = await response.json();

    let allCardsHTML = ''; 
    for (const categoryName in resourceCategories) {
      let cardHTML = `<div class="card resource-card"><h2>${categoryName}</h2>`;

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
      cardHTML += `</div>`;
      allCardsHTML += cardHTML;
    }

    grid.innerHTML = allCardsHTML;

  } catch (error) {
    console.error("Failed to load resources:", error);
  }
}

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
    body: JSON.stringify({ username: currentUsername, session_id: currentSessionId })
    const data = await res.json();
    if (data.success) {
      alert("You have successfully logged out");
    } else {
      alert("Logout failed: " + data.message);
    }
    window.location.reload();
  });

  // ===============================================
  // === TOOLKIT SIDE PANEL LOGIC ==================
  // ===============================================
  const toolkitToggleBtn = document.getElementById('toolkit-toggle-btn');
  const sidePanel = document.getElementById('side-panel');
  const overlay = document.getElementById('overlay');
  const sidePanelCloseBtn = document.getElementById('side-panel-close-btn');
  const contentContainer = document.getElementById('content-container');
  const loginContainer = document.getElementById('login-container');

  function toggleToolkit() {
    sidePanel.classList.toggle('open');
    overlay.classList.toggle('open'); // <-- ADD THIS LINE
  }
  if(overlay) overlay.addEventListener('click', toggleToolkit);


  if(toolkitToggleBtn) toolkitToggleBtn.addEventListener('click', toggleToolkit);
  if(sidePanelCloseBtn) sidePanelCloseBtn.addEventListener('click', toggleToolkit);

  // ===============================================
  // === UNIFIED FOCUS DASHBOARD LOGIC =============
  // ===============================================
  const dashboard = document.getElementById('focus-dashboard');
  if (dashboard) {

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

    const musicToggle = document.getElementById('music-toggle');
    const musicControls = document.getElementById('music-controls');
    const player = document.getElementById('youtube-player');
    const playlistButtons = document.querySelectorAll('.playlist-btn');

    const pomodoro = {
      settings: { workTime: 25, shortBreakTime: 5, longBreakTime: 15, longBreakInterval: 4 },
      state: { timeLeft: 25 * 60, sessions: 0, currentMode: 'work', timerInterval: null }
    };

    function switchMode(mode) {
      pomodoro.state.currentMode = mode;
      dashboard.className = 'card';
      if (mode === 'work') {
        pomodoro.state.timeLeft = pomodoro.settings.workTime * 60;
        dashboard.classList.add('timer-work');
        timerStatus.textContent = "Time to focus!";
      } else if (mode === 'shortBreak') {
        pomodoro.state.timeLeft = pomodoro.settings.shortBreakTime * 60;
        dashboard.classList.add('timer-break');
        timerStatus.textContent = "Time for a short break.";
      } else if (mode === 'longBreak') {
        pomodoro.state.timeLeft = pomodoro.settings.longBreakTime * 60;
        dashboard.classList.add('timer-break');
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
        if(alarmSound) alarmSound.play();
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
      document.title = 'DLSZ Masterfile';
    }

    function resetTimer() {
      pauseTimer();
      switchMode(pomodoro.state.currentMode);
      document.title = 'DLSZ Masterfile';
    }

    function updateDisplay() {
      const minutes = Math.floor(pomodoro.state.timeLeft / 60);
      const seconds = pomodoro.state.timeLeft % 60;
      const displayString = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      timerDisplay.textContent = displayString;
      if (pomodoro.state.timerInterval) {
        document.title = `${displayString} - ${timerStatus.textContent}`;
      }
    }

    function updateCycleTracker() {
      cycleTracker.innerHTML = '';
      const sessionsInCurrentCycle = pomodoro.state.sessions % pomodoro.settings.longBreakInterval;
      for (let i = 0; i < pomodoro.settings.longBreakInterval; i++) {
        const dot = document.createElement('div');
        dot.classList.add('cycle-dot');
        // THIS IS THE CORRECTED LINE - 'pomodoro' instead of 'pomoro'
        if (i < sessionsInCurrentCycle) {
          dot.classList.add('completed');
        }
        cycleTracker.appendChild(dot);
      }
    }

    function setupSlider(sliderName) {
      const slider = sliders[sliderName];
      const valueDisplay = values[sliderName];
      if(slider && valueDisplay) {
        slider.addEventListener('input', () => {
          valueDisplay.textContent = slider.value;
        });
      }
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
      Object.values(sliders).forEach(slider => {
        if(slider) slider.dispatchEvent(new Event('input'))
      });
    }

    function loadVideo(videoId) {
      if (videoId) {
        player.src = `http://www.youtube.com/embed/?autoplay=1&modestbranding=1&loop=1&playlist=${videoId}`;
      } else {
        player.src = 'about:blank';
      }
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
      pomodoro.settings.workTime = parseInt(sliders.work.value);
      pomodoro.settings.shortBreakTime = parseInt(sliders.short.value);
      pomodoro.settings.longBreakTime = parseInt(sliders.long.value);
      pomodoro.settings.longBreakInterval = parseInt(sliders.interval.value);
      saveSettings();
      settingsModal.classList.remove('open');
      resetTimer();
    });

    musicToggle.addEventListener('click', () => {
      musicControls.classList.toggle('open');
    });

    playlistButtons.forEach(button => {
      button.addEventListener('click', () => {
        if (button.id === 'stop-music-btn') {
          loadVideo(null);
          playlistButtons.forEach(btn => btn.classList.remove('active'));
          return;
        }
        playlistButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const videoId = button.dataset.videoId;
        loadVideo(videoId);
      });
    });

    // --- Initialize Timer on Page Load ---
    Object.keys(sliders).forEach(key => setupSlider(key));

    setTimeout(() => {
      loadSettings();
      resetTimer();
    }, 100);
  }
};