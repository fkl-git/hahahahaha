let currentUsername = null;

window.onload = function () {
  const logoutButton = document.getElementById('logout-button');
  const confirmYes = document.getElementById('confirm-yes');
  const confirmNo = document.getElementById('confirm-no');

  // Show confirm dialog when clicking logout
  logoutButton.addEventListener('click', () => {
    document.getElementById('logout-confirm').style.display = 'flex';
  });

  // No = hide confirm
  confirmNo.addEventListener('click', () => {
    document.getElementById('logout-confirm').style.display = 'none';
  });

  // Yes = call logout API
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

    // Reset UI + state
    currentUsername = null;
    document.getElementById('content-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('logout-button').style.display = 'none';
    document.getElementById('userNameMark').innerText = '';
    document.getElementById('logout-confirm').style.display = 'none';
  });
};

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
  logoutBtn.style.display = 'inline-block';
  logoutBtn.style.visibility = 'visible';  // <-- Force visible
  logoutBtn.style.opacity = '1';           // <-- Ensure not transparent

  document.getElementById('userNameMark').innerText = username;
}
