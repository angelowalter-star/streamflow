import express from 'express';
import sqlite3 from 'sqlite3';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 5001;
const JWT_SECRET = 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./streamflow.db', (err) => {
  if (err) {
    console.error('Database error:', err);
  } else {
    console.log('✅ Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#3B82F6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS income_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER,
      amount DECIMAL(10, 2) NOT NULL,
      description TEXT,
      entry_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_income_entries_user_id ON income_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_income_entries_entry_date ON income_entries(entry_date);
    CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
  `;

  schema.split(';').forEach(sql => {
    if (sql.trim()) {
      db.run(sql, (err) => {
        if (err) console.error('Schema error:', err);
      });
    }
  });
}

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const hashedPassword = await bcryptjs.hash(password, 10);

  db.run(
    'INSERT INTO users (email, password) VALUES (?, ?)',
    [email, hashedPassword],
    function (err) {
      if (err) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET);
      res.json({ token, user: { id: this.lastID, email } });
    }
  );
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcryptjs.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email } });
  });
});

app.get('/api/income', verifyToken, (req, res) => {
  db.all(
    `SELECT ie.*, c.name as category_name, c.color as category_color 
     FROM income_entries ie 
     LEFT JOIN categories c ON ie.category_id = c.id 
     WHERE ie.user_id = ? 
     ORDER BY ie.entry_date DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/income', verifyToken, (req, res) => {
  const { amount, description, category_id, entry_date } = req.body;
  if (!amount || !entry_date) {
    return res.status(400).json({ error: 'Amount and entry_date required' });
  }

  db.run(
    `INSERT INTO income_entries (user_id, category_id, amount, description, entry_date)
     VALUES (?, ?, ?, ?, ?)`,
    [req.user.id, category_id || null, amount, description || '', entry_date],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, user_id: req.user.id, amount, description, category_id, entry_date });
    }
  );
});

app.delete('/api/income/:id', verifyToken, (req, res) => {
  db.run(
    'DELETE FROM income_entries WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Income entry not found' });
      }
      res.json({ success: true });
    }
  );
});

app.get('/api/categories', verifyToken, (req, res) => {
  db.all(
    'SELECT * FROM categories WHERE user_id = ? ORDER BY name',
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/categories', verifyToken, (req, res) => {
  const { name, color } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Category name required' });
  }

  db.run(
    'INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)',
    [req.user.id, name, color || '#3B82F6'],
    function (err) {
      if (err) {
        return res.status(400).json({ error: 'Category already exists' });
      }
      res.json({ id: this.lastID, user_id: req.user.id, name, color: color || '#3B82F6' });
    }
  );
});

app.listen(PORT, () => {
  console.log(`🚀 StreamFlow Backend running on http://localhost:${PORT}`);
});
