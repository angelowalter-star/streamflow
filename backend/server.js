import express from 'express';
import { Pool } from 'pg';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const JWT_SECRET = 'your-secret-key-change-in-production';

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

app.use(cors());
app.use(express.json());

// Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcryptjs.hash(password, 10);
  
  try {
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcryptjs.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Income Routes
app.post('/api/income', verifyToken, async (req, res) => {
  const { amount, description, entry_date, category_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO income_entries (user_id, amount, description, entry_date, category_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [req.user.id, amount, description, entry_date, category_id]
    );
    
    const entry = result.rows[0];
    const catResult = await pool.query(
      'SELECT name, color FROM categories WHERE id = $1',
      [category_id]
    );
    
    if (catResult.rows.length > 0) {
      entry.category_name = catResult.rows[0].name;
      entry.category_color = catResult.rows[0].color;
    }
    
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/income', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ie.*, c.name as category_name, c.color as category_color 
       FROM income_entries ie 
       LEFT JOIN categories c ON ie.category_id = c.id 
       WHERE ie.user_id = $1 
       ORDER BY ie.entry_date DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/income/:id', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM income_entries WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trends
app.get('/api/income/trends', verifyToken, async (req, res) => {
  const period = req.query.period || 'daily';
  let groupBy;

  if (period === 'daily') groupBy = "DATE(entry_date)";
  else if (period === 'weekly') groupBy = "TO_CHAR(entry_date, 'YYYY-W')";
  else if (period === 'monthly') groupBy = "TO_CHAR(entry_date, 'YYYY-MM')";

  try {
    const result = await pool.query(
      `SELECT ${groupBy} as period, SUM(amount) as total, COUNT(*) as count 
       FROM income_entries 
       WHERE user_id = $1 
       GROUP BY ${groupBy} 
       ORDER BY period ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Forecast
app.get('/api/income/forecast', verifyToken, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const result = await pool.query(
      `SELECT SUM(amount) as total_last_30, COUNT(*) as days_with_income 
       FROM income_entries 
       WHERE user_id = $1 AND entry_date >= $2`,
      [req.user.id, thirtyDaysAgo]
    );
    
    const row = result.rows[0];
    const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    const daysInNextMonth = nextMonth.getDate();
    const avgDaily = (parseFloat(row.total_last_30 || 0)) / 30;
    const forecast = (avgDaily * daysInNextMonth).toFixed(2);
    
    res.json({
      forecast,
      avg_daily: avgDaily.toFixed(2),
      total_last_30: (parseFloat(row.total_last_30 || 0)).toFixed(2),
      days_with_income: row.days_with_income || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Categories
app.get('/api/categories', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories WHERE user_id = $1',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', verifyToken, async (req, res) => {
  const { name, color } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO categories (user_id, name, color) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, name, color]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recurring Income
app.post('/api/income/recurring', verifyToken, async (req, res) => {
  const { amount, description, entry_date, category_id, recurring_frequency, recurring_end_date } = req.body;
  
  try {
    const entries = [];
    const startDate = new Date(entry_date);
    let currentDate = new Date(startDate);
    const endDate = new Date(recurring_end_date);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      await pool.query(
        `INSERT INTO income_entries (user_id, amount, description, entry_date, category_id, recurring_type, recurring_frequency, recurring_end_date) 
         VALUES ($1, $2, $3, $4, $5, 'recurring', $6, $7)`,
        [req.user.id, amount, description, dateStr, category_id, recurring_frequency, recurring_end_date]
      );
      entries.push({ date: dateStr, amount });

      if (recurring_frequency === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (recurring_frequency === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (recurring_frequency === 'quarterly') {
        currentDate.setMonth(currentDate.getMonth() + 3);
      } else if (recurring_frequency === 'yearly') {
        currentDate.setFullYear(currentDate.getFullYear() + 1);
      }
    }

    res.json({ success: true, entries_created: entries.length, entries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CSV Export
app.get('/api/income/export-csv', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ie.entry_date, c.name as category_name, ie.description, ie.amount 
       FROM income_entries ie 
       LEFT JOIN categories c ON ie.category_id = c.id 
       WHERE ie.user_id = $1 
       ORDER BY ie.entry_date DESC`,
      [req.user.id]
    );

    let csv = 'Date,Category,Description,Amount\n';
    result.rows.forEach(row => {
      csv += `"${row.entry_date}","${row.category_name || 'Uncategorized'}","${row.description || ''}",${row.amount}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="streamflow-export.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings Routes
app.put('/api/user/email', verifyToken, async (req, res) => {
  const { newEmail, password } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    
    const valid = await bcryptjs.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });
    
    await pool.query('UPDATE users SET email = $1 WHERE id = $2', [newEmail, req.user.id]);
    res.json({ success: true, email: newEmail });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.put('/api/user/password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    
    const valid = await bcryptjs.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });
    
    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/user/account', verifyToken, async (req, res) => {
  const { password } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    
    const valid = await bcryptjs.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });
    
    await pool.query('DELETE FROM income_entries WHERE user_id = $1', [req.user.id]);
    await pool.query('DELETE FROM categories WHERE user_id = $1', [req.user.id]);
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5001, () => {
  console.log('🚀 StreamFlow Backend running on http://localhost:5001');
  console.log('✅ Connected to PostgreSQL (Supabase)');
});
