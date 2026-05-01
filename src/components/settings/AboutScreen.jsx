
import React from 'react';

const AboutScreen = () => {
  return (
    <div className="about-container">
      <div className="about-header">
        <img src="/logo.png" alt="MoneyLynx Logo" className="about-logo" />
        <h2>MoneyLynx</h2>
        <p className="version-tag">Verzija 1.0</p>
      </div>
      
      <div className="about-content">
        <p>
          MoneyLynx je vaša privatna platforma za upravljanje osobnim financijama. 
          Dizajnirana s naglaskom na sigurnost, enkripciju i korisničko iskustvo.
        </p>
        
        <div className="info-section">
          <h4>Status sustava</h4>
          <ul>
            <li>Enkripcija: Aktivna (AES-256)</li>
            <li>Backup: Google Drive povezan</li>
            <li>Verzija baze: v1.0</li>
          </ul>
        </div>
      </div>
      
      <div className="footer-credits">
        <p>© 2024 MoneyLynx. Sva prava pridržana.</p>
      </div>
    </div>
  );
};

export const AboutScreen = () => {
  // ... ostatak koda ...
};
