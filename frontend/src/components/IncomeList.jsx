import React from 'react';
import './IncomeList.css';

function IncomeList({ incomeEntries, categories, onDelete }) {
  const sortedEntries = [...incomeEntries].sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));

  if (sortedEntries.length === 0) {
    return <div className="empty-state"><p>No income entries yet</p></div>;
  }

  return (
    <div className="income-list">
      {sortedEntries.map(entry => (
        <div key={entry.id} className="income-item">
          <div className="item-left">
            {entry.category_color && (
              <div className="category-dot" style={{ backgroundColor: entry.category_color }} />
            )}
            <div className="item-details">
              <p className="item-category">{entry.category_name || 'Uncategorized'}</p>
              <p className="item-description">{entry.description || 'No description'}</p>
              <p className="item-date">{new Date(entry.entry_date).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="item-right">
            <p className="item-amount">€{parseFloat(entry.amount).toFixed(2)}</p>
            <button className="delete-btn" onClick={() => { if (confirm('Delete?')) onDelete(entry.id); }}>×</button>
          </div>
        </div>
      ))}
    </div>
  );
}
export default IncomeList;
