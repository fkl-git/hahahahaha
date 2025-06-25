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
if (pomodoroCard) {

  // --- Get all DOM Elements ---
  const timerDisplay = document.getElementById('timer-display');
  const startBtn = document.getElementById('start-btn');
  // ... (and all the other timer elements)

  // --- NEW: Get Settings Modal elements ---
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const settingsForm = document.getElementById('settings-form');

  // --- NEW: Get all slider and value display elements ---
  const sliders = {
    work: document.getElementById('work-time-slider'),
    short: document.getElementById('short-break-slider'),
    long: document.getElementById('long-break-slider'),
    interval: document.getElementById('long-break-interval-slider')
  };
  const values = {
    work: document.getElementById('work-time-value'),
    short: document.getElementById('short-break-value'),
    long: document.getElementById('long-break-value'),
    interval: document.getElementById('long-break-interval-value')
  };

  // --- Main Pomodoro Object ---
  const pomodoro = { /* ... (this object stays the same) ... */ };

  // ... (All the core functions like switchMode, tick, startTimer stay the same) ...

  // --- NEW: Reusable function to link a slider to its text display ---
  function setupSlider(sliderName) {
    const slider = sliders[sliderName];
    const valueDisplay = values[sliderName];
    // This event fires every time the slider is moved
    slider.addEventListener('input', () => {
      valueDisplay.textContent = slider.value;
    });
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
    // Update sliders and their text displays to reflect loaded settings
    sliders.work.value = pomodoro.settings.workTime;
    sliders.short.value = pomodoro.settings.shortBreakTime;
    sliders.long.value = pomodoro.settings.longBreakTime;
    sliders.interval.value = pomodoro.settings.longBreakInterval;
    // Trigger the input event to update the text display
    Object.values(sliders).forEach(slider => slider.dispatchEvent(new Event('input')));
  }

  // --- Event Listeners ---
  // ... (start, pause, reset listeners stay the same) ...

  settingsBtn.addEventListener('click', () => settingsModal.classList.add('open'));
  closeModalBtn.addEventListener('click', () => settingsModal.classList.remove('open'));
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove('open');
    }
  });

  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // Get values from the sliders now
    pomodoro.settings.workTime = parseInt(sliders.work.value);
    pomodoro.settings.shortBreakTime = parseInt(sliders.short.value);
    pomodoro.settings.longBreakTime = parseInt(sliders.long.value);
    pomodoro.settings.longBreakInterval = parseInt(sliders.interval.value);

    saveSettings();
    settingsModal.classList.remove('open');
    resetTimer(); // Apply new settings immediately
  });

  // --- Initialize Timer on Page Load ---
  // Setup all sliders to be interactive
  setupSlider('work');
  setupSlider('short');
  setupSlider('long');
  setupSlider('interval');

  // Load saved settings and then reset the timer to apply them
  loadSettings();
  resetTimer();
}
