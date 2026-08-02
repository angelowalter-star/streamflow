import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

function IncomeChart({ incomeByCategory }) {
  const data = Object.entries(incomeByCategory).map(([name, info]) => ({
    name,
    value: parseFloat(info.total.toFixed(2)),
    color: info.color
  }));

  if (data.length === 0) {
    return <div style={{textAlign: 'center', padding: '40px', color: '#999'}}>No income data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
export default IncomeChart;
