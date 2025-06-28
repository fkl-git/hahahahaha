// =================== FINAL and COMPLETE server.js ===================
const express = require('express');
const { Pool } = require('pg'); // Import the pg library
const fs = require('fs'); // Keep fs for resource management
const app = express();

// --- Middleware Setup ---
app.use(express.json());
app.use(express.static(__dirname + '/../public'));
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// --- Database Connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const ADMIN_SECRET = 'HKTUWC112';

// --- Function to Initialize Database Tables ---
async function initializeDatabase(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      // 1. Try to connect and run a simple query
      await pool.query('SELECT NOW()'); 
      console.log('Database connection successful.');

      // 2. If connection is successful, proceed to create tables
      const userTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          type VARCHAR(10) NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          time_used_seconds INTEGER DEFAULT 0,
          last_login_timestamp TIMESTAMPTZ
        );
      `;
      const logTableQuery = `
        CREATE TABLE IF NOT EXISTS access_logs (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) NOT NULL,
          time_in TIMESTAMPTZ NOT NULL,
          time_out TIMESTAMPTZ,
          duration_seconds INTEGER,
          ip_address VARCHAR(50),
          user_agent TEXT
        );
      `;

      await pool.query(userTableQuery);
      await pool.query(logTableQuery);
      console.log('Database tables are ready.');

      return; // Exit the function successfully if all queries passed

    } catch (err) {
      console.error(`Database connection attempt ${i + 1} of ${retries} failed. Retrying in ${delay / 1000}s...`);

      // If this was the last attempt, log a final failure message
      if (i === retries - 1) {
        console.error('All database connection attempts failed.', err.stack);
        // Optional: In a real production app, you might want to stop the server
        // process.exit(1); 
      }

      // Wait for the specified delay before the next retry
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

// ===================================================================
// === USER and LOG Endpoints (using the DATABASE) ===
// ===================================================================

// LOGIN
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, message: "Missing credentials" });

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userResult.rows.length === 0) return res.json({ success: false, message: "Username not found" });
    const user = userResult.rows[0];

    if (user.password !== password) return res.json({ success: false, message: "Invalid password" });

    if (user.type === 'timed') {
      const twentyFourHours = 24 * 60 * 60;
      if (user.time_used_seconds >= twentyFourHours) return res.json({ success: false, message: "Password expired (time limit)." });
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if (user.last_login_timestamp && (new Date() - new Date(user.last_login_timestamp)) > threeDays) return res.json({ success: false, message: "Password expired (inactivity)." });
    } else if (user.type === 'otp') {
      if (user.used) return res.json({ success: false, message: "OTP already used" });
    }

    if (user.type === 'timed') {
      await pool.query('UPDATE users SET last_login_timestamp = NOW() WHERE username = $1', [username]);
    } else {
      await pool.query('UPDATE users SET used = TRUE WHERE username = $1', [username]);
    }

    const logQuery = `INSERT INTO access_logs (username, time_in, ip_address, user_agent) VALUES ($1, NOW(), $2, $3) RETURNING id;`;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const logResult = await pool.query(logQuery, [username, ip, userAgent]);

    res.json({ success: true, message: "Login successful", session_id: logResult.rows[0].id });
  } catch (err) {
    console.error('Login error:', err.stack);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// LOGOUT
app.post('/api/logout', async (req, res) => {
  const { username, session_id } = req.body;
  if (!username || !session_id) return res.json({ success: false, message: "Missing user or session info" });

  try {
    const logResult = await pool.query('SELECT time_in FROM access_logs WHERE id = $1', [session_id]);
    if(logResult.rows.length === 0) return res.json({ success: false, message: "Session not found."});

    const timeIn = new Date(logResult.rows[0].time_in);
    const timeOut = new Date();
    const durationSec = Math.floor((timeOut - timeIn) / 1000);

    await pool.query('UPDATE access_logs SET time_out = $1, duration_seconds = $2 WHERE id = $3', [timeOut, durationSec, session_id]);

    const userResult = await pool.query('SELECT type FROM users WHERE username = $1', [username]);
    if (userResult.rows.length > 0 && userResult.rows[0].type === 'timed') {
      await pool.query('UPDATE users SET time_used_seconds = time_used_seconds + $1 WHERE username = $2', [durationSec, username]);
    }

    res.json({ success: true, message: "Logout logged" });
  } catch (err) {
    console.error('Logout error:', err.stack);
    res.status(500).json({ success: false, message: 'Server error during logout.' });
  }
});

// ADD/UPDATE USER
app.post('/api/admin/add-user', async (req, res) => {
  const { username, password, type } = req.body;
  if (!req.headers.authorization || req.headers.authorization !== `Bearer ${ADMIN_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const upsertQuery = `
      INSERT INTO users (username, password, type, used, time_used_seconds, last_login_timestamp)
      VALUES ($1, $2, $3, FALSE, 0, NULL)
      ON CONFLICT (username) DO UPDATE
      SET password = $2, type = $3, used = FALSE, time_used_seconds = 0, last_login_timestamp = NULL;
    `;
    await pool.query(upsertQuery, [username, password, type]);
    res.json({ success: true, message: `User '${username}' has been created/updated.` });
  } catch (err) {
    console.error('Admin add user error:', err.stack);
    res.status(500).json({ error: 'Failed to add user.' });
  }
});

// GET ALL USERS
app.get('/api/admin/users', async (req, res) => {
  if (!req.headers.authorization || req.headers.authorization !== `Bearer ${ADMIN_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await pool.query('SELECT username FROM users ORDER BY username');
    res.json(result.rows.map(row => row.username));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get users.'});
  }
});

// GET ALL LOGS
app.get('/api/logs', async (req, res) => {
  if (!req.headers.authorization || req.headers.authorization !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await pool.query('SELECT * FROM access_logs ORDER BY time_in DESC');
    res.json(result.rows);
  } catch (err) {
    // THIS IS THE NEW, IMPORTANT LINE
    console.error('Error fetching logs from database:', err.stack); 

    res.status(500).json({ error: 'Failed to get logs.' });
  }
});

app.get('/api/admin/view-table/:tableName', async (req, res) => {
  // 1. Authenticate the admin
  if (!req.headers.authorization || req.headers.authorization !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Safely get the table name from the URL
  const tableName = req.params.tableName;

  // 3. IMPORTANT: Whitelist allowed table names to prevent security issues
  const allowedTables = ['users', 'access_logs'];
  if (!allowedTables.includes(tableName)) {
    return res.status(400).json({ error: 'Invalid table name specified.' });
  }

  // 4. Fetch the data from the database
  try {
    // We use "ORDER BY id DESC" to show the newest records first
    // We use "LIMIT 50" to avoid fetching too much data at once
    const query = `SELECT * FROM ${tableName} ORDER BY id DESC LIMIT 50;`;
    const result = await pool.query(query);
    res.json(result.rows); // Send the data back to the browser
  } catch (err) {
    console.error(`Error fetching table ${tableName}:`, err.stack);
    res.status(500).json({ error: `Failed to fetch data for table '${tableName}'.` });
  }
});

app.post('/api/admin/migrate-users', async (req, res) => {
  if (!req.headers.authorization || req.headers.authorization !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Read the old users.json file one last time
    const oldUsersFile = fs.readFileSync(__dirname + '/users.json', 'utf8');
    const oldUsers = JSON.parse(oldUsersFile);
    let migratedCount = 0;

    // 2. Loop through each old user and insert them into the database
    for (const username in oldUsers) {
      const user = oldUsers[username];
      const insertQuery = `
        INSERT INTO users (username, password, type, used, time_used_seconds, last_login_timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (username) DO NOTHING; 
      `;
      // 'ON CONFLICT DO NOTHING' prevents errors if a user already exists

      const result = await pool.query(insertQuery, [
        username,
        user.password,
        user.type,
        user.used || false,
        user.timeUsed || 0, // 'timeUsed' from JSON becomes 'time_used_seconds'
        user.lastLogin || null // 'lastLogin' from JSON becomes 'last_login_timestamp'
      ]);

      if (result.rowCount > 0) {
        migratedCount++; // Count how many new users were added
      }
    }
    res.json({ success: true, message: `Migration complete. Added ${migratedCount} new users to the database.` });

  } catch (err) {
    console.error('Migration error:', err.stack);
    res.status(500).json({ error: 'Failed to migrate data.' });
  }
});

app.post('/api/admin/update-password', async (req, res) => {
  if (!req.headers.authorization || req.headers.authorization !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or new password.' });
  }

  try {
    const query = 'UPDATE users SET password = $1 WHERE username = $2';
    await pool.query(query, [password, username]);
    res.json({ success: true, message: `Password for '${username}' has been updated.` });
  } catch (err) {
    console.error('Update password error:', err.stack);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// ===================================================================
// === RESOURCE Endpoints (using the resources.json file) ===
// ===================================================================

// GET ALL RESOURCES
app.get('/api/resources', (req, res) => {
  fs.readFile(__dirname + '/resources.json', 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading resources.json:", err);
      return res.status(500).json({ error: 'Could not load resources.' });
    }
    res.json(JSON.parse(data));
  });
});

// ADD A NEW RESOURCE (ADMIN)
app.post('/api/admin/resource', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });

  const { category, title, url, subtext } = req.body;
  if (!category || !title || !url) return res.status(400).json({ error: 'Missing required fields' });

  const resourceFile = __dirname + '/resources.json';
  fs.readFile(resourceFile, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read resources file.' });

    const resources = JSON.parse(data);
    const newResource = { id: Date.now(), title, url, subtext };

    if (resources[category]) {
      resources[category].push(newResource);
    } else {
      resources[category] = [newResource];
    }

    fs.writeFile(resourceFile, JSON.stringify(resources, null, 2), (writeErr) => {
      if (writeErr) return res.status(500).json({ error: 'Failed to save new resource.' });
      res.json({ success: true, message: `Resource '${title}' added successfully!` });
    });
  });
});

// DELETE A SINGLE RESOURCE (ADMIN)
app.delete('/api/admin/resource', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });

  const { category, id } = req.body;
  if (!category || !id) return res.status(400).json({ error: 'Missing category or resource ID' });

  const resourceFile = __dirname + '/resources.json';
  fs.readFile(resourceFile, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read resources file.' });

    const resources = JSON.parse(data);
    if (!resources[category]) return res.status(404).json({ error: 'Category not found.' });

    const indexToDelete = resources[category].findIndex(resource => resource.id === id);
    if (indexToDelete > -1) {
      resources[category].splice(indexToDelete, 1);
    } else {
      return res.status(404).json({ error: 'Resource ID not found in this category.' });
    }

    fs.writeFile(resourceFile, JSON.stringify(resources, null, 2), (writeErr) => {
      if (writeErr) return res.status(500).json({ error: 'Failed to save updated resources.' });
      res.json({ success: true, message: 'Resource deleted successfully!' });
    });
  });
});

// DELETE A CATEGORY
app.delete('/api/admin/category', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });

  const { category } = req.body;
  if (!category) return res.status(400).json({ error: 'Missing category' });

  const resourceFile = __dirname + '/resources.json';
  fs.readFile(resourceFile, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read resources file.' });

    const resources = JSON.parse(data);
    if (resources[category]) {
      delete resources[category];
    } else {
      return res.status(404).json({ error: 'Category not found.' });
    }

    fs.writeFile(resourceFile, JSON.stringify(resources, null, 2), (writeErr) => {
      if (writeErr) return res.status(500).json({ error: 'Failed to save updated resources.' });
      res.json({ success: true, message: `Category '${category}' deleted successfully!` });
    });
  });
});

// BULK DELETE RESOURCES
app.delete('/api/admin/bulk-delete', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });

  const { resources } = req.body;
  if (!resources) return res.status(400).json({ error: 'Invalid request body.' });

  const resourceFile = __dirname + '/resources.json';
  fs.readFile(resourceFile, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read resources file.' });

    let resourcesData = JSON.parse(data);
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


// --- Server Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
  initializeDatabase(); // Call the setup function when the server starts
});