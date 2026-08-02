import React from 'react';
import { useTranslation } from 'react-i18next';
import './IncomeList.css';

function IncomeList({ incomeEntries, categories, onDelete }) {
  const { t } = useTranslation();

  return (
    <div className="income-list">
      {incomeEntries.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999' }}>{t('chart.noData')}</p>
      ) : (
        incomeEntries.map(entry => (
          <div key={entry.id} className="income-entry">
            <div className="entry-content">
              <p className="entry-date">{entry.entry_date}</p>
              <p className="entry-category">{entry.category_name || 'Uncategorized'}</p>
              <p className="entry-description">{entry.description || '-'}</p>
            </div>
            <div className="entry-amount">€{parseFloat(entry.amount).toFixed(2)}</div>
            <button onClick={() => onDelete(entry.id)} className="delete-btn">×</button>
          </div>
        ))
      )}
    </div>
  );
}

export default IncomeList;
