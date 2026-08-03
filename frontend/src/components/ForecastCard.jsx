import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './ForecastCard.css';

const API_URL = import.meta.env.VITE_API_URL;

function ForecastCard() {
  const { t } = useTranslation();
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecast();
  }, []);

  const fetchForecast = async () => {
    try {
      const response = await axios.get(`${API_URL}/income/forecast`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setForecast(response.data);
    } catch (error) {
      console.error('Error fetching forecast:', error);
    }
    setLoading(false);
  };

  if (loading) return <div className="forecast-card"><p>Loading...</p></div>;
  if (!forecast) return <div className="forecast-card"><p>{t('chart.noData')}</p></div>;

  return (
    <div className="forecast-card">
      <div className="forecast-header">
        <h3>🔮 {t('forecast.title')}</h3>
        <p className="forecast-subtext">{t('forecast.subtitle')}</p>
      </div>
      
      <div className="forecast-main">
        <div className="forecast-value">€{forecast.forecast}</div>
        <p className="forecast-label">{t('forecast.projectedIncome')}</p>
      </div>

      <div className="forecast-details">
        <div className="detail-item">
          <span className="detail-label">{t('forecast.dailyAvg')}:</span>
          <span className="detail-value">€{forecast.avg_daily}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">{t('forecast.last30Days')}:</span>
          <span className="detail-value">€{forecast.total_last_30}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">{t('forecast.daysWithIncome')}:</span>
          <span className="detail-value">{forecast.days_with_income}</span>
        </div>
      </div>
    </div>
  );
}

export default ForecastCard;
