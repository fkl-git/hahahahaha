const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const users = {
  "admin": { otp: "admin1", used: false },
  "studentA": { otp: "stuA123", used: false }
};

const loginLogs = [];

// 🚀 LOGIN ROUTE
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
  loginLogs.push({
    username,
    timestamp: new Date().toISOString(),
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    useragent: req.headers['user-agent']
  });

  res.json({ success: true, message: "Login successful" });
});

// 🌟 SECURED LOGS ROUTE
const ADMIN_SECRET = 'HKTUWC112';

app.get('/api/logs', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(loginLogs);
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
