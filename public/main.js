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
    // Simple page reload to reset state
    window.location.reload();
  });

  // ===============================================
  // === POMODORO TIMER LOGIC (NOW IN THE RIGHT PLACE) ===
  // ===============================================

const pomodoroCard = document.getElementById('pomodoro-card');
const timerModeTitle = document.getElementById('timer-mode-title');
const timerStatus = document.getElementById('timer-status');
const timerDisplay = document.getElementById('timer-display');
const cycleTracker = document.getElementById('cycle-tracker');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const alarmSound = document.getElementById('alarm-sound');

if (pomodoroCard) { // Only run if the timer card exists on the page
  const pomodoro = {
    settings: {
      workTime: 25 * 60,
      shortBreakTime: 5 * 60,
      longBreakTime: 15 * 60,
      longBreakInterval: 4,
    },
    state: {
      timeLeft: 25 * 60,
      sessions: 0,
      currentMode: 'work', // 'work', 'shortBreak', 'longBreak'
      timerInterval: null,
    }
  };

  function switchMode(mode) {
    pomodoro.state.currentMode = mode;
    pomodoroCard.className = 'card'; // Reset classes

    if (mode === 'work') {
      pomodoro.state.timeLeft = pomodoro.settings.workTime;
      pomodoroCard.classList.add('timer-work');
      timerStatus.textContent = "Time to focus!";
    } else if (mode === 'shortBreak') {
      pomodoro.state.timeLeft = pomodoro.settings.shortBreakTime;
      pomodoroCard.classList.add('timer-break');
      timerStatus.textContent = "Time for a short break.";
    } else if (mode === 'longBreak') {
      pomodoro.state.timeLeft = pomodoro.settings.longBreakTime;
      pomodoroCard.classList.add('timer-break');
      timerStatus.textContent = "Time for a long break!";
    }

    updateDisplay();
    updateCycleTracker();
  }

  function tick() {
    pomodoro.state.timeLeft--;
    updateDisplay();

    if (pomodoro.state.timeLeft <= 0) {
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
    timerStatus.textContent = 'Working...';
    pomodoro.state.timerInterval = setInterval(tick, 1000);
  }

  function pauseTimer() {
    clearInterval(pomodoro.state.timerInterval);
    pomodoro.state.timerInterval = null;
  }

  function resetTimer() {
    pauseTimer();
    // Reset to the beginning of the current mode
    switchMode(pomodoro.state.currentMode);
  }

  function updateDisplay() {
    const minutes = Math.floor(pomodoro.state.timeLeft / 60);
    const seconds = pomodoro.state.timeLeft % 60;
    timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    document.title = `${timerDisplay.textContent} - ${pomodoro.state.currentMode}`;
  }

  function updateCycleTracker() {
    cycleTracker.innerHTML = '';
    for (let i = 0; i < pomodoro.settings.longBreakInterval; i++) {
      const dot = document.createElement('div');
      dot.classList.add('cycle-dot');
      if (i < pomodoro.state.sessions % pomodoro.settings.longBreakInterval) {
        dot.classList.add('completed');
      }
      cycleTracker.appendChild(dot);
    }
  }

  // --- Event Listeners ---
  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', pauseTimer);
  resetBtn.addEventListener('click', resetTimer);

  // Initialize display on page load
  updateDisplay();
  updateCycleTracker();
}