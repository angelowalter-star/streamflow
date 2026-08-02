import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './IncomeForm.css';

const API_URL = 'http://localhost:5001/api';

function IncomeForm({ categories, onSubmit }) {
  const { t } = useTranslation();
  const [isRecurring, setIsRecurring] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [entry_date, setEntry_date] = useState(new Date().toISOString().split('T')[0]);
  const [category_id, setCategory_id] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isRecurring) {
        if (!endDate) {
          setMessage(t('form.setEndDate'));
          setLoading(false);
          return;
        }
        const response = await axios.post(`${API_URL}/income/recurring`, {
          amount: parseFloat(amount),
          description,
          entry_date,
          category_id: category_id || null,
          recurring_frequency: frequency,
          recurring_end_date: endDate
        });
        setMessage(`✅ Created ${response.data.entries_created} entries!`);
      } else {
        await axios.post(`${API_URL}/income`, {
          amount: parseFloat(amount),
          description,
          entry_date,
          category_id: category_id || null
        });
        setMessage('✅ Added!');
      }
      
      setTimeout(() => {
        setAmount('');
        setDescription('');
        setEntry_date(new Date().toISOString().split('T')[0]);
        setCategory_id('');
        setEndDate('');
        setMessage('');
        onSubmit();
      }, 1000);
    } catch (error) {
      setMessage('❌ ' + (error.response?.data?.error || t('auth.error')));
    }
    setLoading(false);
  };

  return (
    <div className="income-form">
      <h2>{t('form.addIncome')}</h2>
      
      <div className="toggle-recurring">
        <label>
          <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
          {t('form.recurring')}
        </label>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{t('form.amount')}</label>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>{t('form.startDate')}</label>
          <input type="date" value={entry_date} onChange={(e) => setEntry_date(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>{t('form.category')}</label>
          <select value={category_id} onChange={(e) => setCategory_id(e.target.value)}>
            <option value="">{t('form.select')}</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>{t('form.description')}</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {isRecurring && (
          <>
            <div className="form-group">
              <label>{t('form.frequency')}</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                <option value="weekly">{t('form.weekly')}</option>
                <option value="monthly">{t('form.monthly')}</option>
                <option value="quarterly">{t('form.quarterly')}</option>
                <option value="yearly">{t('form.yearly')}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('form.endDate')}</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={entry_date} required />
            </div>
          </>
        )}

        {message && <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>{message}</div>}

        <button type="submit" disabled={loading}>
          {loading ? t('form.adding') : (isRecurring ? t('form.create') : t('form.submit'))}
        </button>
      </form>
    </div>
  );
}

export default IncomeForm;
