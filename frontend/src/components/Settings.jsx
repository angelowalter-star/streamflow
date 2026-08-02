import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './Settings.css';

const API_URL = 'http://localhost:5001/api';

function Settings({ onLogout, userEmail }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('email');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deleteForm, setDeleteForm] = useState({ password: '', confirm: false });

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await axios.put(`${API_URL}/user/email`, emailForm);
      setMessage('✅ ' + t('settings.updateEmail') + ' successfully!');
      setEmailForm({ newEmail: '', password: '' });
    } catch (err) {
      setError(err.response?.data?.error || t('auth.error'));
    }
    setLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${API_URL}/user/password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setMessage('✅ ' + t('settings.changePassword') + ' successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || t('auth.error'));
    }
    setLoading(false);
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!deleteForm.confirm) {
      setError('Please confirm account deletion');
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`${API_URL}/user/account`, {
        data: { password: deleteForm.password }
      });
      setMessage('Account deleted. Logging out...');
      setTimeout(() => onLogout(), 2000);
    } catch (err) {
      setError(err.response?.data?.error || t('auth.error'));
    }
    setLoading(false);
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1>{t('settings.title')}</h1>
        <p className="current-email">{t('settings.email')}: <strong>{userEmail}</strong></p>

        <div className="settings-tabs">
          <button className={`tab ${activeTab === 'email' ? 'active' : ''}`} onClick={() => setActiveTab('email')}>
            📧 {t('settings.email')}
          </button>
          <button className={`tab ${activeTab === 'password' ? 'active' : ''}`} onClick={() => setActiveTab('password')}>
            🔐 {t('settings.password')}
          </button>
          <button className={`tab ${activeTab === 'delete' ? 'active' : ''}`} onClick={() => setActiveTab('delete')}>
            🗑️ {t('settings.deleteAccount')}
          </button>
        </div>

        <div className="settings-content">
          {message && <div className="message success">{message}</div>}
          {error && <div className="message error">{error}</div>}

          {activeTab === 'email' && (
            <form onSubmit={handleChangeEmail} className="settings-form">
              <h2>{t('settings.changeEmail')}</h2>
              <div className="form-group">
                <label>{t('settings.newEmail')}</label>
                <input type="email" value={emailForm.newEmail} onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{t('settings.currentPassword')}</label>
                <input type="password" value={emailForm.password} onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })} required />
              </div>
              <button type="submit" disabled={loading}>{loading ? 'Updating...' : t('settings.updateEmail')}</button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="settings-form">
              <h2>{t('settings.changePassword')}</h2>
              <div className="form-group">
                <label>{t('settings.currentPassword')}</label>
                <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{t('settings.newPassword')}</label>
                <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{t('settings.confirmPassword')}</label>
                <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required />
              </div>
              <button type="submit" disabled={loading}>{loading ? 'Updating...' : t('settings.update')}</button>
            </form>
          )}

          {activeTab === 'delete' && (
            <form onSubmit={handleDeleteAccount} className="settings-form danger">
              <h2>{t('settings.deleteAccount')}</h2>
              <p className="warning">{t('settings.warning')}</p>
              <div className="form-group">
                <label>{t('settings.currentPassword')}</label>
                <input type="password" value={deleteForm.password} onChange={(e) => setDeleteForm({ ...deleteForm, password: e.target.value })} required />
              </div>
              <div className="form-group checkbox">
                <input type="checkbox" checked={deleteForm.confirm} onChange={(e) => setDeleteForm({ ...deleteForm, confirm: e.target.checked })} />
                <label>{t('settings.confirmDeletion')}</label>
              </div>
              <button type="submit" disabled={loading} className="delete-btn">{loading ? 'Deleting...' : t('settings.deleteAccount')}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
