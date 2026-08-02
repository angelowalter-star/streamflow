import React, { useState, useMemo, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import IncomeChart from './IncomeChart';
import IncomeForm from './IncomeForm';
import IncomeList from './IncomeList';
import CategoryManager from './CategoryManager';
import ForecastCard from './ForecastCard';
import ExportButton from './ExportButton';
import CSVExportButton from './CSVExportButton';
import Settings from './Settings';
import { DarkModeContext } from '../DarkModeContext';
import './Dashboard.css';

function Dashboard({ incomeEntries, categories, onAddIncome, onDeleteIncome, onAddCategory, onLogout, user }) {
  const { t, i18n } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { isDark, setIsDark } = useContext(DarkModeContext);

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

  const toggleLanguage = () => {
    const newLang = i18n.language === 'de' ? 'en' : 'de';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return showSettings ? (
    <Settings onLogout={onLogout} userEmail={user?.email} />
  ) : (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>{t('app.title')}</h1>
          <p className="user-email">{user?.email}</p>
        </div>
        <div className="header-buttons">
          <button 
            onClick={toggleLanguage} 
            className="language-btn"
            title={i18n.language === 'de' ? 'Switch to English' : 'Zu Deutsch wechseln'}
          >
            {i18n.language === 'de' ? '🇬🇧' : '🇩🇪'}
          </button>
          <button 
            onClick={() => setIsDark(!isDark)} 
            className="darkmode-btn"
            title={isDark ? 'Light Mode' : 'Dark Mode'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setShowSettings(true)} className="settings-btn">⚙️ Settings</button>
          <button onClick={onLogout} className="logout-btn">{t('dashboard.logout')}</button>
        </div>
      </header>
      <div className="dashboard-content">
        <div className="stat-card">
          <p className="stat-label">{t('dashboard.totalIncome')}</p>
          <h2 className="stat-value">€{stats.total}</h2>
          <p className="stat-subtext">{stats.count} {t('dashboard.entries')}</p>
        </div>
        
        <ForecastCard />
        <IncomeChart incomeByCategory={incomeByCategory} />
        
        <div className="export-buttons">
          <ExportButton />
          <CSVExportButton />
        </div>
        
        <div className="action-buttons">
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Cancel' : t('dashboard.addIncome')}
          </button>
          <button onClick={() => setShowCategories(!showCategories)} className="btn btn-secondary">
            {showCategories ? 'Done' : t('dashboard.manageCategories')}
          </button>
        </div>
        {showForm && <IncomeForm categories={categories} onSubmit={(data) => { onAddIncome(data); setShowForm(false); }} />}
        {showCategories && <CategoryManager categories={categories} onAddCategory={onAddCategory} />}
        <div className="income-list-section">
          <h2>{t('dashboard.recentIncome')}</h2>
          <IncomeList incomeEntries={incomeEntries} categories={categories} onDelete={onDeleteIncome} />
        </div>
      </div>
    </div>
  );
}
export default Dashboard;
