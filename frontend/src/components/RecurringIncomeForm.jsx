import React, { useState } from 'react';
import axios from 'axios';
import './RecurringIncomeForm.css';

const API_URL = import.meta.env.VITE_API_URL;

function RecurringIncomeForm({ categories, onSubmit }) {
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
          setMessage('Please set an end date for recurring income');
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
        setMessage(`✅ Created ${response.data.entries_created} recurring entries!`);
      } else {
        const response = await axios.post(`${API_URL}/income`, {
          amount: parseFloat(amount),
          description,
          entry_date,
          category_id: category_id || null
        });
        setMessage('✅ Income entry added!');
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
      setMessage('❌ Error: ' + (error.response?.data?.error || 'Failed to add income'));
    }
    setLoading(false);
  };

  return (
    <div className="recurring-form">
      <h2>Add Income</h2>
      
      <div className="toggle-recurring">
        <label>
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
          />
          🔄 Recurring Income (Contract, Retainer, etc.)
        </label>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Amount (€)</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Start Date</label>
          <input
            type="date"
            value={entry_date}
            onChange={(e) => setEntry_date(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Category</label>
          <select value={category_id} onChange={(e) => setCategory_id(e.target.value)}>
            <option value="">Select category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
          />
        </div>

        {isRecurring && (
          <>
            <div className="form-group">
              <label>Frequency</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly (3 months)</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={entry_date}
                required
              />
            </div>
          </>
        )}

        {message && (
          <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : (isRecurring ? 'Create Recurring Entries' : 'Add Income')}
        </button>
      </form>
    </div>
  );
}

export default RecurringIncomeForm;
