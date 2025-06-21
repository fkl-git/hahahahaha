const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const users = {
  "admin": { otp: "admin1", used: false },
  "studentA": { otp: "stuA123", used: false }
};

const loginLogs = [];

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

  // Success
  users[username].used = true;
  loginLogs.push({ username, timestamp: new Date().toISOString() });

  res.json({ success: true, message: "Login successful" });
});

app.get('/api/logs', (req, res) => {
  res.json(loginLogs);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
