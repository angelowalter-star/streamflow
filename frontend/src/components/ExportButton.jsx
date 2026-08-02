import React from 'react';
import './ExportButton.css';

const API_URL = 'http://localhost:5001/api';

function ExportButton() {
  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/income/export-pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `streamflow-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error:', error);
      alert('Export failed');
    }
  };

  return (
    <button onClick={handleExport} className="export-btn">
      📥 Download Report
    </button>
  );
}

export default ExportButton;
