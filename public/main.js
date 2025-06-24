window.onload = function() {
  const logoutButton = document.getElementById('logout-button');
  const confirmNo = document.getElementById('confirm-no');
  const confirmYes = document.getElementById('confirm-yes');

  if (logoutButton && confirmNo && confirmYes) {
    logoutButton.addEventListener('click', () => {
      document.getElementById('logout-confirm').style.display = 'flex';
    });

    confirmNo.addEventListener('click', () => {
      document.getElementById('logout-confirm').style.display = 'none';
    });

    confirmYes.addEventListener('click', () => {
      document.getElementById('content-container').style.display = 'none';
      document.getElementById('login-container').style.display = 'block';
      document.getElementById('logout-confirm').style.display = 'none';

      const logoutBtn = document.getElementById('logout-button');
      logoutBtn.classList.remove('show');
      logoutBtn.style.display = 'none';

      document.getElementById('username').value = '';
      document.getElementById('password').value = '';
      document.getElementById('message').textContent = '';
      document.getElementById('userNameMark').textContent = '';
    });
  }
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

  const message = document.getElementById('message');
  if (data.success) {
    message.textContent = "Access granted!";
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('content-container').style.display = 'block';

    const logoutBtn = document.getElementById('logout-button');
    logoutBtn.style.display = 'inline-flex';
    setTimeout(() => logoutBtn.classList.add('show'), 10); // trigger smooth fade
    document.getElementById('userNameMark').textContent = username;
  } else {
    message.textContent = data.message;
  }
}

document.getElementById('logout-button').addEventListener('click', () => {
  // Show confirmation popup
  document.getElementById('logout-confirm').style.display = 'block';

  document.getElementById('confirm-yes').onclick = async function() {
    // Assume username is stored somewhere — e.g., window.currentUsername
    if (!window.currentUsername) {
      alert("No username found for logout");
      return;
    }

    // Send logout request
    const res = await fetch('/api/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: window.currentUsername })
    });

    const data = await res.json();
    if (data.success) {
      alert("You have successfully logged out");
    } else {
      alert("Logout failed: " + data.message);
    }

    // Hide protected content and show login form
    document.getElementById('content-container').style.display = 'none';
    document.getElementById('logout-button').style.display = 'none';
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('logout-confirm').style.display = 'none';
  };

  document.getElementById('confirm-no').onclick = function() {
    document.getElementById('logout-confirm').style.display = 'none';
  };
});
