import React from 'react';
import './Dashboard.css';

// Podaci prilagođeni za vizualni prikaz potrošnje
const topCategories = [
  { name: 'Hrana', amount: 450, percentage: 65, color: '#FF6B6B', icon: '🍔' },
  { name: 'Stanovanje', amount: 800, percentage: 85, color: '#4D96FF', icon: '🏠' },
  { name: 'Transport', amount: 120, percentage: 25, color: '#6BCB77', icon: '🚗' },
  { name: 'Zabava', amount: 90, percentage: 15, color: '#FFD93D', icon: '🎬' },
];

export const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <div className="card top-categories-card">
        <h3>Top kategorije</h3>
        <div className="categories-list">
          {topCategories.map((cat, index) => (
            <div key={index} className="category-item">
              <div className="category-info">
                <div className="category-label">
                  {/* Ikona s primijenjenim sivim filterom kroz CSS */}
                  <span className="category-icon-gray">{cat.icon}</span>
                  <span className="category-name">{cat.name}</span>
                </div>
                <span className="category-amount">{cat.amount} €</span>
              </div>
              {/* Vodoravni graf prikazan kao progresivna linija[cite: 2] */}
              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: cat.color
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};