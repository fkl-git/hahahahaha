const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.static(__dirname + '/../public'));
app.use((req, res, next) => {
res.setHeader("X-Frame-Options", "DENY");
next();
});

const LOG_FILE = __dirname + '/logs.json';
const USERS_FILE = __dirname + '/users.json';
const ADMIN_SECRET = 'HKTUWC112';

// --- Data Loading and Saving ---
let users = {};
if (fs.existsSync(USERS_FILE)) {
users = JSON.parse(fs.readFileSync(USERS_FILE));
} else {
fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
}

let loginLogs = [];
if (fs.existsSync(LOG_FILE)) {
loginLogs = JSON.parse(fs.readFileSync(LOG_FILE));
}

const activeSessions = {};

function saveUsers() {
fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function saveLogs() {
fs.writeFileSync(LOG_FILE, JSON.stringify(loginLogs, null, 2));
}

// UPGRADED LOGIN ENDPOINT
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({ success: false, message: "Please enter username and password" });
  }

  const user = users[username];

  if (!user) {
    return res.json({ success: false, message: "Username not found" });
  }

  // --- LOGIC FOR TIMED PASSWORDS ---
  if (user.type === 'timed') {
    const twentyFourHours = 24 * 60 * 60; // 24 hours in seconds
    if (user.timeUsed >= twentyFourHours) {
      return res.json({ success: false, message: "Password has expired (time limit exceeded)." });
    }

    const threeDays = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
    if (user.lastLogin && (new Date() - new Date(user.lastLogin)) > threeDays) {
      return res.json({ success: false, message: "Password has expired (3 days of inactivity)." });
    }

    if (user.password !== password) {
      return res.json({ success: false, message: "Invalid password" });
    }

    // All checks passed, update lastLogin time
    user.lastLogin = new Date().toISOString();

  // --- LOGIC FOR ONE-TIME PASSWORDS (OTP) ---
  } else if (user.type === 'otp') {
    if (user.used) {
      return res.json({ success: false, message: "OTP already used" });
    }
    if (user.password !== password) {
      return res.json({ success: false, message: "Invalid password" });
    }
    user.used = true; // Mark OTP as used

  } else {
    return res.json({ success: false, message: "Invalid user type configured." });
  }

  // --- Create Log Entry (For Both User Types) ---
  const entry = {
    username,
    timeIn: new Date().toISOString(),
    timeOut: null,
    duration: null,
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    useragent: req.headers['user-agent']
  };

  loginLogs.push(entry);
  activeSessions[username] = entry;

  saveUsers(); // Save the updated user data (used flag or lastLogin)
  saveLogs();

  res.json({ success: true, message: "Login successful" });
});

// UPGRADED LOGOUT ENDPOINT
app.post('/api/logout', (req, res) => {
  const { username } = req.body;
  if (!username || !activeSessions[username]) {
    return res.json({ success: false, message: "No active session found for user" });
  }

  const log = activeSessions[username];
  log.timeOut = new Date().toISOString();

  const durationMs = new Date(log.timeOut) - new Date(log.timeIn);
  const durationSec = Math.floor(durationMs / 1000);
  log.duration = `${durationSec} seconds`;

  const user = users[username];
  // If the user is a 'timed' user, add the session duration to their total time used
  if (user && user.type === 'timed') {
    user.timeUsed += durationSec;
  }

  delete activeSessions[username];

  saveUsers(); // Save the updated timeUsed
  saveLogs();

  res.json({ success: true, message: "Logout logged" });
});

// RENAMED AND UPGRADED ENDPOINT FOR ADDING/UPDATING USERS
app.post('/api/admin/add-user', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { username, password, type } = req.body;
  if (!username || !password || !type) {
    return res.status(400).json({ error: 'Missing username, password, or type' });
  }

  if (type === 'otp') {
    users[username] = { type: 'otp', password, used: false };
  } else if (type === 'timed') {
    users[username] = { type: 'timed', password, timeUsed: 0, lastLogin: null };
  } else {
    return res.status(400).json({ error: 'Invalid user type specified' });
  }

  saveUsers(); // Save the new user to our file
  res.json({ success: true, message: `User '${username}' added/updated successfully!` });
});

// GET ALL USERS (No change in logic, just for consistency with the code block)
app.get('/api/admin/users', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(Object.keys(users));
});

// GET ALL RESOURCES
app.get('/api/resources', (req, res) => {
  // We use 'fs' (File System module) which you already have.
    fs.readFile(__dirname + '/resources.json', 'utf8', (err, data) => {
    // Basic error handling
    if (err) {
      console.error("Error reading resources.json:", err);
      // Send an error message back to the client
      return res.status(500).json({ error: 'Could not load resources.' });
    }
    // If successful, parse the file content and send it as a JSON response
    res.json(JSON.parse(data));
  });
});

// PASTE THIS CODE INTO server.js

// ADD A NEW RESOURCE (ADMIN)
app.post('/api/admin/resource', (req, res) => {
  // 1. Authenticate the admin
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Get the new resource data from the request
  const { category, title, url, subtext } = req.body;
  if (!category || !title || !url) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const resourceFile = __dirname + '/resources.json';

  // 3. Read the existing resources.json file
  fs.readFile(resourceFile, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to read resources file.' });
    }

    const resources = JSON.parse(data);
    const newResource = { id: Date.now(), title, url, subtext };

    // 4. Add the new resource to the correct category
    if (resources[category]) {
      // If the category already exists, add to it
      resources[category].push(newResource);
    } else {
      // If it's a new category, create it
      resources[category] = [newResource];
    }

    // 5. Write the updated data back to the file
    fs.writeFile(resourceFile, JSON.stringify(resources, null, 2), (writeErr) => {
      if (writeErr) {
        console.error(writeErr);
        return res.status(500).json({ error: 'Failed to save new resource.' });
      }

      // 6. Send a success message
      res.json({ success: true, message: `Resource '${title}' added successfully!` });
    });
  });
});

// In server.js

// DELETE A SINGLE RESOURCE (ADMIN)
app.delete('/api/admin/resource', (req, res) => {
  // 1. Authenticate
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Get data from the request
  const { category, id } = req.body;
  if (!category || !id) {
    return res.status(400).json({ error: 'Missing category or resource ID' });
  }

  const resourceFile = __dirname + '/resources.json';

  // 3. Read the file
  fs.readFile(resourceFile, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read resources file.' });

    const resources = JSON.parse(data);

    // 4. Find and remove the resource
    if (!resources[category]) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    // Find the index of the resource to delete
    const indexToDelete = resources[category].findIndex(resource => resource.id === id);

    if (indexToDelete > -1) {
      // Remove the item from the array
      resources[category].splice(indexToDelete, 1);
    } else {
      return res.status(404).json({ error: 'Resource ID not found in this category.' });
    }

    // 5. Write the updated data back to the file
    fs.writeFile(resourceFile, JSON.stringify(resources, null, 2), (writeErr) => {
      if (writeErr) return res.status(500).json({ error: 'Failed to save updated resources.' });

      res.json({ success: true, message: 'Resource deleted successfully!' });
    });
  });
});

app.delete('/api/admin/category', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { category } = req.body;
  if (!category) return res.status(400).json({ error: 'Missing category' });

  const resourceFile = __dirname + '/resources.json';

  fs.readFile(resourceFile, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read resources file.' });

    const resources = JSON.parse(data);

    if (resources[category]) {
      delete resources[category]; // This deletes the whole category
    } else {
      return res.status(404).json({ error: 'Category not found.' });
    }

    fs.writeFile(resourceFile, JSON.stringify(resources, null, 2), (writeErr) => {
      if (writeErr) return res.status(500).json({ error: 'Failed to save updated resources.' });

      res.json({ success: true, message: `Category '${category}' deleted successfully!` });
    });
  });
});

app.delete('/api/admin/bulk-delete', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // We only expect 'resources' in the body now
  const { resources } = req.body;
  if (!resources) {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  const resourceFile = __dirname + '/resources.json';

  fs.readFile(resourceFile, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read resources file.' });

    let resourcesData = JSON.parse(data);

    // We no longer need to loop through categories to delete, only resources
    resources.forEach(itemToDelete => {
      if (resourcesData[itemToDelete.category]) {
        resourcesData[itemToDelete.category] = resourcesData[itemToDelete.category].filter(
          resource => resource.id !== itemToDelete.id
        );
      }
    });

    fs.writeFile(resourceFile, JSON.stringify(resourcesData, null, 2), (writeErr) => {
      if (writeErr) return res.status(500).json({ error: 'Failed to save updated resources.' });
      res.json({ success: true, message: 'Selected items deleted successfully!' });
    });
  });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));