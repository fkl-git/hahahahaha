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
const ADMIN_SECRET = 'HKTUWC112';

const users = {
  "admin": { otp: "admin1", used: false },
  "studentA": { otp: "stuA123", used: false },
  "ilovemybf123": { otp: "wya12c", used: false },
  "fkl.kael": { otp: "joshmichael", used: false }
};

// Load existing logs from file if present
let loginLogs = [];
if (fs.existsSync(LOG_FILE)) {
  loginLogs = JSON.parse(fs.readFileSync(LOG_FILE));
}

// Track active sessions (username -> entry log object)
const activeSessions = {};

function saveLogs() {
  fs.writeFileSync(LOG_FILE, JSON.stringify(loginLogs, null, 2));
}

// LOGIN
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ success: false, message: "Please enter username and password" });
  }

  if (!users[username]) {
    return res.json({ success: false, message: "Username not found" });
  }

  if (users[username].used) {
    return res.json({ success: false, message: "OTP already used" });
  }

  if (users[username].otp !== password) {
    return res.json({ success: false, message: "Invalid password" });
  }

  users[username].used = true;

  // Create new log entry
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
  saveLogs();

  res.json({ success: true, message: "Login successful" });
});

// LOGOUT endpoint
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

  delete activeSessions[username];
  saveLogs();

  res.json({ success: true, message: "Logout logged" });
});

// VIEW LOGS (ADMIN)
app.get('/api/logs', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(loginLogs);
});

// ADD / UPDATE OTP (ADMIN)
app.post('/api/admin/add-otp', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { username, otp } = req.body;
  if (!username || !otp) {
    return res.status(400).json({ error: 'Missing username or OTP' });
  }

  users[username] = { otp, used: false };
  res.json({ success: true, message: `OTP added for ${username}` });
});

// GET ALL USERS (ADMIN)
app.get('/api/admin/users', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.json(Object.keys(users));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
