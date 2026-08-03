import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import './IncomeChart.css';

const API_URL = import.meta.env.VITE_API_URL;

function IncomeChart({ incomeByCategory }) {
  const { t } = useTranslation();
  const [trendData, setTrendData] = useState([]);
  const [period, setPeriod] = useState('weekly');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrends();
  }, [period]);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/income/trends?period=${period}`);
      setTrendData(response.data);
    } catch (error) {
      console.error('Error fetching trends:', error);
    }
    setLoading(false);
  };

  const pieData = Object.entries(incomeByCategory).map(([name, info]) => ({
    name,
    value: parseFloat(info.total.toFixed(2)),
    color: info.color
  }));

  return (
    <div className="charts-container">
      <div className="chart-section">
        <div className="chart-header">
          <h3>{t('trends.title')}</h3>
          <div className="period-toggle">
            <button className={period === 'daily' ? 'active' : ''} onClick={() => setPeriod('daily')}>
              {t('trends.daily')}
            </button>
            <button className={period === 'weekly' ? 'active' : ''} onClick={() => setPeriod('weekly')}>
              {t('trends.weekly')}
            </button>
            <button className={period === 'monthly' ? 'active' : ''} onClick={() => setPeriod('monthly')}>
              {t('trends.monthly')}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="loading">Loading...</p>
        ) : trendData.length === 0 ? (
          <p className="empty-chart">{t('chart.noData')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#667eea" name={t('trends.income')} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="chart-section">
        <h3>{t('chart.incomeBySource')}</h3>
        {pieData.length === 0 ? (
          <div className="empty-chart">{t('chart.noData')}</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value">
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default IncomeChart;
