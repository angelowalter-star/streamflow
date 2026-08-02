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
      alert('Fill amount and date');
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
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Date</label>
          <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
        </div>
      </div>
      <div className="form-group">
        <label>Category</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Select category</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Description (optional)</label>
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <button type="submit" className="submit-btn">Add Entry</button>
    </form>
  );
}
export default IncomeForm;
