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
      logoutBtn.style.display = 'inline-flex';  // make visible

      document.getElementById('userNameMark').innerText = username;
    } else {
      document.getElementById('message').textContent = data.message;
    }
  }

  window.onload = function () {
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

      currentUsername = null;
      document.getElementById('content-container').style.display = 'none';
      document.getElementById('login-container').style.display = 'block';
      document.getElementById('logout-button').style.display = 'none';
      document.getElementById('userNameMark').innerText = '';
      document.getElementById('logout-confirm').style.display = 'none';
    });
  };

document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('sideMenu').style.right = '0';
});

function closeMenu() {
  document.getElementById('sideMenu').style.right = '-300px';
}

function showCitationGenerator() {
  document.getElementById('toolContent').innerHTML = `
    <h3>📝 Citation Generator</h3>
    <input type="text" id="cita-author" placeholder="Author (e.g. John Doe)" class="login-input" />
    <input type="text" id="cita-title" placeholder="Title (e.g. The Science of AI)" class="login-input" />
    <input type="text" id="cita-pub" placeholder="Publisher" class="login-input" />
    <input type="text" id="cita-year" placeholder="Year (e.g. 2023)" class="login-input" />
    <input type="text" id="cita-url" placeholder="URL (if online)" class="login-input" />
    <button onclick="generateCitations()" class="login-button">Generate Citations</button>
    <div id="cita-output" class="login-message" style="margin-top: 10px; text-align: left;"></div>
  `;
}