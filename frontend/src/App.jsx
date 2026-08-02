import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import './App.css';

const API_URL = 'http://localhost:5001/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      const [incomeRes, categoriesRes] = await Promise.all([
        axios.get(`${API_URL}/income`),
        axios.get(`${API_URL}/categories`)
      ]);
      setIncomeEntries(incomeRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleLogin = (response) => {
    localStorage.setItem('token', response.token);
    setToken(response.token);
    setUser(response.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIncomeEntries([]);
    setCategories([]);
    delete axios.defaults.headers.common['Authorization'];
  };

  const handleAddIncome = async (incomeData) => {
    try {
      const response = await axios.post(`${API_URL}/income`, incomeData);
      setIncomeEntries([response.data, ...incomeEntries]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteIncome = async (id) => {
    try {
      await axios.delete(`${API_URL}/income/${id}`);
      setIncomeEntries(incomeEntries.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleAddCategory = async (categoryName, categoryColor) => {
    try {
      const response = await axios.post(`${API_URL}/categories`, {
        name: categoryName,
        color: categoryColor
      });
      setCategories([...categories, response.data]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <Dashboard
        incomeEntries={incomeEntries}
        categories={categories}
        onAddIncome={handleAddIncome}
        onDeleteIncome={handleDeleteIncome}
        onAddCategory={handleAddCategory}
        onLogout={handleLogout}
        user={user}
      />
    </div>
  );
}

export default App;
