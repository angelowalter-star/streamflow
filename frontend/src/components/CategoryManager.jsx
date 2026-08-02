import React, { useState } from 'react';
import './CategoryManager.css';

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

function CategoryManager({ categories, onAddCategory }) {
  const [categoryName, setCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      alert('Enter category name');
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
                <div className="category-color" style={{ backgroundColor: cat.color }} />
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
          <input type="text" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="e.g., Upwork..." />
        </div>
        <div className="form-group">
          <label>Color</label>
          <div className="color-picker">
            {COLORS.map(color => (
              <button key={color} type="button" className={`color-option ${selectedColor === color ? 'active' : ''}`} style={{ backgroundColor: color }} onClick={() => setSelectedColor(color)} />
            ))}
          </div>
        </div>
        <button type="submit" className="submit-btn">Add Category</button>
      </form>
    </div>
  );
}
export default CategoryManager;
