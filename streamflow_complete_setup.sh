#!/bin/bash

# ============================================
# StreamFlow - Complete Auto Setup Script
# ============================================
# Usage: bash streamflow_complete_setup.sh
# ============================================

set -e

echo "🚀 StreamFlow - Complete Setup Starting..."
echo ""

# Get current working directory
STREAMFLOW_DIR="$(pwd)"

echo "📍 Working directory: $STREAMFLOW_DIR"
echo ""

# ============ BACKEND SETUP ============
echo "========== BACKEND SETUP =========="

mkdir -p backend
cd backend

# === backend/package.json ===
cat > package.json << 'EOF'
{
  "name": "streamflow-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "sqlite3": "^5.1.6",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.1.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  }
}
EOF
echo "✅ Created backend/package.json"

# === backend/server.js ===
cat > server.js << 'EOF'
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
const PORT = 5000;
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
EOF
echo "✅ Created backend/server.js"

echo "⏳ Installing npm dependencies..."
npm install --silent

cd ..

# ============ FRONTEND SETUP ============
echo ""
echo "========== FRONTEND SETUP =========="

mkdir -p frontend/src/components
cd frontend

# === frontend/package.json ===
cat > package.json << 'EOF'
{
  "name": "streamflow-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.2",
    "recharts": "^2.10.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.1.0",
    "vite": "^5.0.0"
  }
}
EOF
echo "✅ Created frontend/package.json"

# === frontend/vite.config.js ===
cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
});
EOF
echo "✅ Created frontend/vite.config.js"

# === frontend/index.html ===
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StreamFlow - Income Tracker</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f7fa;
      color: #333;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
EOF
echo "✅ Created frontend/index.html"

# === frontend/src/main.jsx ===
cat > src/main.jsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF
echo "✅ Created frontend/src/main.jsx"

# === frontend/src/index.css ===
cat > src/index.css << 'EOF'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f5f7fa;
  color: #333;
  line-height: 1.6;
}

html, body, #root {
  height: 100%;
  width: 100%;
}

button {
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
}

input, select, textarea {
  font-family: inherit;
  font-size: inherit;
}
EOF
echo "✅ Created frontend/src/index.css"

# === frontend/src/App.css ===
cat > src/App.css << 'EOF'
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
EOF
echo "✅ Created frontend/src/App.css"

# === frontend/src/App.jsx ===
cat > src/App.jsx << 'EOF'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import './App.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      const [incomeRes, categoriesRes] = await Promise.all([
        axios.get(`${API_URL}/income`),
        axios.get(`${API_URL}/categories`)
      ]);
      setIncomeEntries(incomeRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleLogin = (response) => {
    localStorage.setItem('token', response.token);
    setToken(response.token);
    setUser(response.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIncomeEntries([]);
    setCategories([]);
    delete axios.defaults.headers.common['Authorization'];
  };

  const handleAddIncome = async (incomeData) => {
    try {
      const response = await axios.post(`${API_URL}/income`, incomeData);
      setIncomeEntries([response.data, ...incomeEntries]);
    } catch (error) {
      console.error('Error adding income:', error);
    }
  };

  const handleDeleteIncome = async (id) => {
    try {
      await axios.delete(`${API_URL}/income/${id}`);
      setIncomeEntries(incomeEntries.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Error deleting income:', error);
    }
  };

  const handleAddCategory = async (categoryName, categoryColor) => {
    try {
      const response = await axios.post(`${API_URL}/categories`, {
        name: categoryName,
        color: categoryColor
      });
      setCategories([...categories, response.data]);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <Dashboard
        incomeEntries={incomeEntries}
        categories={categories}
        onAddIncome={handleAddIncome}
        onDeleteIncome={handleDeleteIncome}
        onAddCategory={handleAddCategory}
        onLogout={handleLogout}
        user={user}
      />
    </div>
  );
}

export default App;
EOF
echo "✅ Created frontend/src/App.jsx"

# === Component Files ===

# Auth.jsx
cat > src/components/Auth.jsx << 'EOF'
import React, { useState } from 'react';
import axios from 'axios';
import './Auth.css';

const API_URL = 'http://localhost:5000/api';

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await axios.post(`${API_URL}${endpoint}`, {
        email,
        password
      });
      onLogin(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>StreamFlow</h1>
        <p className="subtitle">Track all your income streams</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Loading...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <p className="toggle-auth">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="toggle-btn"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Auth;
EOF
echo "✅ Created frontend/src/components/Auth.jsx"

# Auth.css
cat > src/components/Auth.css << 'EOF'
.auth-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.auth-box {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
}

.auth-box h1 {
  font-size: 2rem;
  margin-bottom: 10px;
  color: #667eea;
  text-align: center;
}

.subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  background: #667eea;
  color: white;
  border-radius: 5px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 20px;
}

.submit-btn:hover:not(:disabled) {
  background: #5568d3;
}

.error-message {
  color: #ef4444;
  font-size: 0.9rem;
  margin-bottom: 15px;
  padding: 10px;
  background: #fee;
  border-radius: 5px;
}

.toggle-auth {
  text-align: center;
  margin-top: 20px;
}

.toggle-btn {
  background: none;
  color: #667eea;
  font-weight: 600;
  cursor: pointer;
}
EOF
echo "✅ Created frontend/src/components/Auth.css"

# Dashboard.jsx
cat > src/components/Dashboard.jsx << 'EOF'
import React, { useState, useMemo } from 'react';
import IncomeChart from './IncomeChart';
import IncomeForm from './IncomeForm';
import IncomeList from './IncomeList';
import CategoryManager from './CategoryManager';
import './Dashboard.css';

function Dashboard({
  incomeEntries,
  categories,
  onAddIncome,
  onDeleteIncome,
  onAddCategory,
  onLogout,
  user
}) {
  const [showForm, setShowForm] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const filteredEntries = incomeEntries.filter(e => {
      const date = new Date(e.entry_date);
      return date >= monthStart && date <= monthEnd;
    });

    const total = filteredEntries.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const count = filteredEntries.length;

    return { total: total.toFixed(2), count };
  }, [incomeEntries]);

  const incomeByCategory = useMemo(() => {
    const grouped = {};
    incomeEntries.forEach(entry => {
      const catName = entry.category_name || 'Uncategorized';
      if (!grouped[catName]) {
        grouped[catName] = { total: 0, color: entry.category_color || '#3B82F6' };
      }
      grouped[catName].total += parseFloat(entry.amount || 0);
    });
    return grouped;
  }, [incomeEntries]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>StreamFlow</h1>
          <p className="user-email">{user?.email}</p>
        </div>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </header>

      <div className="dashboard-content">
        <div className="stats-section">
          <div className="stats-cards">
            <div className="stat-card">
              <p className="stat-label">Total Income (This Month)</p>
              <h2 className="stat-value">€{stats.total}</h2>
              <p className="stat-subtext">{stats.count} entries</p>
            </div>
          </div>
        </div>

        <div className="chart-section">
          <h2>Income by Source</h2>
          <IncomeChart incomeByCategory={incomeByCategory} />
        </div>

        <div className="action-buttons">
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
          >
            {showForm ? 'Cancel' : '+ Add Income'}
          </button>
          <button
            onClick={() => setShowCategories(!showCategories)}
            className="btn btn-secondary"
          >
            {showCategories ? 'Done' : 'Manage Categories'}
          </button>
        </div>

        {showForm && (
          <IncomeForm
            categories={categories}
            onSubmit={(data) => {
              onAddIncome(data);
              setShowForm(false);
            }}
          />
        )}

        {showCategories && (
          <CategoryManager
            categories={categories}
            onAddCategory={onAddCategory}
          />
        )}

        <div className="income-list-section">
          <h2>Recent Income</h2>
          <IncomeList
            incomeEntries={incomeEntries}
            categories={categories}
            onDelete={onDeleteIncome}
          />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
EOF
echo "✅ Created frontend/src/components/Dashboard.jsx"

# Dashboard.css
cat > src/components/Dashboard.css << 'EOF'
.dashboard {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f7fa;
}

.dashboard-header {
  background: white;
  padding: 20px 40px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dashboard-header h1 {
  font-size: 1.8rem;
  color: #667eea;
  margin: 0;
}

.user-email {
  color: #666;
  font-size: 0.9rem;
  margin-top: 5px;
}

.logout-btn {
  padding: 10px 20px;
  background: #ef4444;
  color: white;
  border-radius: 5px;
  font-weight: 500;
  cursor: pointer;
}

.dashboard-content {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
}

.stats-cards {
  display: grid;
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: white;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 2rem;
  color: #667eea;
  margin-bottom: 5px;
}

.stat-subtext {
  color: #999;
  font-size: 0.85rem;
}

.chart-section {
  background: white;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  margin-bottom: 40px;
}

.chart-section h2 {
  margin-bottom: 20px;
}

.action-buttons {
  display: flex;
  gap: 15px;
  margin-bottom: 40px;
}

.btn {
  padding: 12px 24px;
  border-radius: 5px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-secondary {
  background: #10B981;
  color: white;
}

.income-list-section {
  background: white;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.income-list-section h2 {
  margin-bottom: 20px;
}
EOF
echo "✅ Created frontend/src/components/Dashboard.css"

# IncomeChart.jsx
cat > src/components/IncomeChart.jsx << 'EOF'
import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

function IncomeChart({ incomeByCategory }) {
  const data = Object.entries(incomeByCategory).map(([name, info]) => ({
    name,
    value: parseFloat(info.total.toFixed(2)),
    color: info.color
  }));

  if (data.length === 0) {
    return (
      <div className="empty-chart">
        <p>No income data yet. Add your first entry!</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default IncomeChart;
EOF
echo "✅ Created frontend/src/components/IncomeChart.jsx"

# IncomeForm.jsx
cat > src/components/IncomeForm.jsx << 'EOF'
import React, { useState } from 'react';
import './IncomeForm.css';

function IncomeForm({ categories, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !entryDate) {
      alert('Please fill in amount and date');
      return;
    }

    onSubmit({
      amount: parseFloat(amount),
      description,
      category_id: categoryId ? parseInt(categoryId) : null,
      entry_date: entryDate
    });

    setAmount('');
    setDescription('');
    setCategoryId('');
    setEntryDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <form onSubmit={handleSubmit} className="income-form">
      <h3>Add Income Entry</h3>

      <div className="form-row">
        <div className="form-group">
          <label>Amount (€)</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        <div className="form-group">
          <label>Date</label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Category</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Select a category</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Description (optional)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Upwork project..."
        />
      </div>

      <button type="submit" className="submit-btn">Add Entry</button>
    </form>
  );
}

export default IncomeForm;
EOF
echo "✅ Created frontend/src/components/IncomeForm.jsx"

# IncomeForm.css
cat > src/components/IncomeForm.css << 'EOF'
.income-form {
  background: white;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  margin-bottom: 40px;
}

.income-form h3 {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  margin-bottom: 8px;
}

.form-group input,
.form-group select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.submit-btn {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border-radius: 5px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
  border: none;
}
EOF
echo "✅ Created frontend/src/components/IncomeForm.css"

# IncomeList.jsx
cat > src/components/IncomeList.jsx << 'EOF'
import React from 'react';
import './IncomeList.css';

function IncomeList({ incomeEntries, categories, onDelete }) {
  const sortedEntries = [...incomeEntries].sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));

  if (sortedEntries.length === 0) {
    return (
      <div className="empty-state">
        <p>No income entries yet. Start by adding your first one!</p>
      </div>
    );
  }

  return (
    <div className="income-list">
      {sortedEntries.map(entry => (
        <div key={entry.id} className="income-item">
          <div className="item-left">
            {entry.category_color && (
              <div
                className="category-dot"
                style={{ backgroundColor: entry.category_color }}
              />
            )}
            <div className="item-details">
              <p className="item-category">{entry.category_name || 'Uncategorized'}</p>
              <p className="item-description">{entry.description || 'No description'}</p>
              <p className="item-date">{new Date(entry.entry_date).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="item-right">
            <p className="item-amount">€{parseFloat(entry.amount).toFixed(2)}</p>
            <button
              className="delete-btn"
              onClick={() => {
                if (confirm('Delete this entry?')) {
                  onDelete(entry.id);
                }
              }}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default IncomeList;
EOF
echo "✅ Created frontend/src/components/IncomeList.jsx"

# IncomeList.css
cat > src/components/IncomeList.css << 'EOF'
.income-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.income-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f9fafb;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.item-left {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 15px;
}

.category-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.item-details {
  flex: 1;
}

.item-category {
  font-weight: 600;
  margin-bottom: 4px;
}

.item-description {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 4px;
}

.item-date {
  font-size: 0.8rem;
  color: #999;
}

.item-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.item-amount {
  font-weight: 700;
  font-size: 1.2rem;
  color: #10B981;
  min-width: 100px;
  text-align: right;
}

.delete-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #fee;
  color: #ef4444;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}
EOF
echo "✅ Created frontend/src/components/IncomeList.css"

# CategoryManager.jsx
cat > src/components/CategoryManager.jsx << 'EOF'
import React, { useState } from 'react';
import './CategoryManager.css';

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

function CategoryManager({ categories, onAddCategory }) {
  const [categoryName, setCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    onAddCategory(categoryName, selectedColor);
    setCategoryName('');
    setSelectedColor('#3B82F6');
  };

  return (
    <div className="category-manager">
      <h3>Manage Categories</h3>

      <div className="existing-categories">
        <h4>Your Categories</h4>
        {categories.length === 0 ? (
          <p className="empty-text">No categories yet</p>
        ) : (
          <div className="category-list">
            {categories.map(cat => (
              <div key={cat.id} className="category-item">
                <div
                  className="category-color"
                  style={{ backgroundColor: cat.color }}
                />
                <span>{cat.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="add-category-form">
        <h4>Add New Category</h4>

        <div className="form-group">
          <label>Category Name</label>
          <input
            type="text"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="e.g., Upwork, Affiliate..."
          />
        </div>

        <div className="form-group">
          <label>Color</label>
          <div className="color-picker">
            {COLORS.map(color => (
              <button
                key={color}
                type="button"
                className={`color-option ${selectedColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
        </div>

        <button type="submit" className="submit-btn">Add Category</button>
      </form>
    </div>
  );
}

export default CategoryManager;
EOF
echo "✅ Created frontend/src/components/CategoryManager.jsx"

# CategoryManager.css
cat > src/components/CategoryManager.css << 'EOF'
.category-manager {
  background: white;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  margin-bottom: 40px;
}

.category-manager h3 {
  margin-bottom: 20px;
}

.category-manager h4 {
  margin-bottom: 15px;
  color: #666;
  font-size: 1rem;
}

.existing-categories {
  margin-bottom: 30px;
  padding-bottom: 30px;
  border-bottom: 1px solid #eee;
}

.category-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.category-color {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.category-item span {
  font-weight: 500;
}

.empty-text {
  color: #999;
  font-style: italic;
}

.add-category-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  margin-bottom: 8px;
}

.form-group input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.color-picker {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.color-option {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.color-option.active {
  border-color: #333;
}

.submit-btn {
  padding: 12px 24px;
  background: #10B981;
  color: white;
  border-radius: 5px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  align-self: flex-start;
}
EOF
echo "✅ Created frontend/src/components/CategoryManager.css"

echo ""
echo "⏳ Installing npm dependencies for frontend..."
npm install --silent

cd ..

# ============ FINISH ============
echo ""
echo "================================================================"
echo "✅ STREAMFLOW SETUP COMPLETE!"
echo "================================================================"
echo ""
echo "📁 Project structure created:"
echo "  streamflow/"
echo "  ├── backend/"
echo "  └── frontend/"
echo ""
echo "🚀 Next steps - Run in SEPARATE terminal windows:"
echo ""
echo "Terminal 1 - Start Backend:"
echo "  cd streamflow/backend && npm start"
echo ""
echo "Terminal 2 - Start Frontend:"
echo "  cd streamflow/frontend && npm run dev"
echo ""
echo "🌐 Then open in browser:"
echo "  http://localhost:3000"
echo ""
echo "📝 Login credentials (create on first use):"
echo "  Email: streamflow.app@gmx.at"
echo "  Password: (your choice)"
echo ""
echo "================================================================"

