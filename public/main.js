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

  if (data.success) {
    window.currentUsername = username; // <-- SET THIS!
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('content-container').style.display = 'block';
    document.getElementById('logout-button').style.display = 'inline-block';
    document.getElementById('userNameMark').innerText = username;
  }

  document.getElementById('message').textContent = data.message;
}

    document.getElementById('logout-button').addEventListener('click', () => {
      document.getElementById('logout-confirm').style.display = 'block';

      document.getElementById('confirm-yes').onclick = async function() {
        if (!window.currentUsername) {
          alert("No username found for logout");
          return;
        }

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

        // Reset state
        window.currentUsername = null;
        document.getElementById('content-container').style.display = 'none';
        document.getElementById('logout-button').style.display = 'none';
        document.getElementById('login-container').style.display = 'block';
        document.getElementById('logout-confirm').style.display = 'none';
      };

      document.getElementById('confirm-no').onclick = function() {
        document.getElementById('logout-confirm').style.display = 'none';
      };
    });

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
