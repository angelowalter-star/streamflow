import React from 'react';

const API_URL = import.meta.env.VITE_API_URL;

function CSVExportButton() {
  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/income/export-csv`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `streamflow-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error:', error);
      alert('CSV Export failed');
    }
  };

  return (
    <button onClick={handleExport} style={{
      padding: '10px 20px',
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      fontWeight: '600',
      cursor: 'pointer',
      marginRight: '10px'
    }}>
      📥 Export CSV
    </button>
  );
}

export default CSVExportButton;
