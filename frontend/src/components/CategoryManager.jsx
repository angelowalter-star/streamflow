import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './CategoryManager.css';

function CategoryManager({ categories, onAddCategory }) {
  const { t } = useTranslation();
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#667eea');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (categoryName.trim()) {
      onAddCategory(categoryName, categoryColor);
      setCategoryName('');
      setCategoryColor('#667eea');
    }
  };

  return (
    <div className="category-manager">
      <h2>{t('categories.manage')}</h2>
      
      <form onSubmit={handleSubmit} className="category-form">
        <div className="form-group">
          <label>{t('categories.categoryName')}</label>
          <input type="text" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>{t('categories.color')}</label>
          <input type="color" value={categoryColor} onChange={(e) => setCategoryColor(e.target.value)} />
        </div>

        <button type="submit">{t('categories.add')}</button>
      </form>

      <div className="categories-list">
        {categories.map(cat => (
          <div key={cat.id} className="category-item">
            <div className="category-color" style={{ backgroundColor: cat.color }}></div>
            <span>{cat.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CategoryManager;
