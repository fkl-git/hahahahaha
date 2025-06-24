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
