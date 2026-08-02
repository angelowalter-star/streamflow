import React, { useState, useMemo } from 'react';
import IncomeChart from './IncomeChart';
import IncomeForm from './IncomeForm';
import IncomeList from './IncomeList';
import CategoryManager from './CategoryManager';
import './Dashboard.css';

function Dashboard({ incomeEntries, categories, onAddIncome, onDeleteIncome, onAddCategory, onLogout, user }) {
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
        <div>
          <h1>StreamFlow</h1>
          <p className="user-email">{user?.email}</p>
        </div>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </header>
      <div className="dashboard-content">
        <div className="stat-card">
          <p className="stat-label">Total Income (This Month)</p>
          <h2 className="stat-value">€{stats.total}</h2>
          <p className="stat-subtext">{stats.count} entries</p>
        </div>
        <div className="chart-section">
          <h2>Income by Source</h2>
          <IncomeChart incomeByCategory={incomeByCategory} />
        </div>
        <div className="action-buttons">
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Cancel' : '+ Add Income'}
          </button>
          <button onClick={() => setShowCategories(!showCategories)} className="btn btn-secondary">
            {showCategories ? 'Done' : 'Manage Categories'}
          </button>
        </div>
        {showForm && <IncomeForm categories={categories} onSubmit={(data) => { onAddIncome(data); setShowForm(false); }} />}
        {showCategories && <CategoryManager categories={categories} onAddCategory={onAddCategory} />}
        <div className="income-list-section">
          <h2>Recent Income</h2>
          <IncomeList incomeEntries={incomeEntries} categories={categories} onDelete={onDeleteIncome} />
        </div>
      </div>
    </div>
  );
}
export default Dashboard;
