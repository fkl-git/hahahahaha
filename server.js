const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./masterfile.db');
const useragent = require('express-useragent');

app.use(express.json());
app.use(useragent.express());
app.use(express.static('public'));

// Initialize DB
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS access_codes (
    code TEXT PRIMARY KEY
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT,
    timestamp TEXT,
    ip TEXT,
    useragent TEXT
  )`);
  db.run(`INSERT OR IGNORE INTO access_codes (code) VALUES (?)`, ['letmein123']);
});

// API to validate
app.post('/api/validate', (req, res) => {
  const code = req.body.code;
  db.get(`SELECT code FROM access_codes WHERE code = ?`, [code], (err, row) => {
    if (err) return res.json({ success: false });
    if (row) {
      const timestamp = new Date().toISOString();
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const ua = req.useragent.source;
      db.run(`INSERT INTO access_logs (code, timestamp, ip, useragent) VALUES (?, ?, ?, ?)`,
        [code, timestamp, ip, ua]);
      const links = [
        { title: "Example Link 1", url: "https://example.com/1" },
        { title: "Example Link 2", url: "https://example.com/2" }
      ];
      res.json({ success: true, links });
    } else {
      res.json({ success: false });
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
