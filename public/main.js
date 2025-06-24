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

  const timerHeader = document.getElementById('timer-header');
  const timerContent = document.getElementById('timer-content');
  const timerDisplay = document.getElementById('timer-display');
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resetBtn = document.getElementById('reset-btn');

  // Check if timer elements exist before adding listeners
  if (timerHeader) {
      const WORK_TIME = 25 * 60; // 25 minutes in seconds
      let timerInterval = null;
      let timeLeft = WORK_TIME;

      // --- Main Functions ---
      function startTimer() {
        if (timerInterval) return;
        timerInterval = setInterval(() => {
          timeLeft--;
          updateDisplay();
          if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            alert("Time for a break!");
          }
        }, 1000);
      }

      function pauseTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
      }

      function resetTimer() {
        pauseTimer();
        timeLeft = WORK_TIME;
        updateDisplay();
      }

      function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      }

      // --- Event Listeners ---
      timerHeader.addEventListener('click', () => {
        timerContent.classList.toggle('open');
      });

      startBtn.addEventListener('click', startTimer);
      pauseBtn.addEventListener('click', pauseTimer);
      resetBtn.addEventListener('click', resetTimer);
  }
};