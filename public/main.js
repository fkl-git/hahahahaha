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
loadResources(); // <-- ADD THIS LINE TO CALL THE NEW FUNCTION
} else {
  document.getElementById('message').textContent = data.message;
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

// This is the corrected version of the function.
async function loadResources() {
  // Get the container where we will place the cards
  const grid = document.querySelector('.grid-container');
  // Clear any old content (like a "loading..." message)
  grid.innerHTML = '';

  try {
    // Fetch the data from the API endpoint we created
    const response = await fetch('/api/resources');
    const resourceCategories = await response.json();

    // Loop over each category (e.g., "DLSZ Resources", "GENERAL")
    for (const categoryName in resourceCategories) {
      // Create a new card div for this category
      const card = document.createElement('div');
      card.className = 'card';

      // Create the title for the card
      let cardHTML = `<h2>${categoryName}</h2>`;

      // Get the array of links for the current category
      const links = resourceCategories[categoryName];

      // Loop over each link in the category and add its HTML
      links.forEach(link => {
        // THIS IS THE CORRECTED PART:
        cardHTML += `
          <p>
            <strong>${link.title}</strong><br>
            <a href="${link.url}" target="_blank">${link.url}</a><br>
            <span class="subtext">${link.subtext}</span>
          </p>
        `;
      }); // The forEach loop ends here

      // Set the final HTML for the card
      card.innerHTML = cardHTML;

      // Add the newly created card to the grid container on the webpage
      grid.appendChild(card);
    }
  } catch (error) {
    console.error("Failed to load resources:", error);
    // Display an error message to the user if something goes wrong
    grid.innerHTML = '<p style="color: red;">Could not load resources. Please try again later.</p>';
  }
}