import React, { useState, useEffect } from 'react';
import './App.css';

// Uvoz glavnih komponenti
import Dashboard from './components/Dashboard';
import { TxForm } from './components/TxForm';
import { TxList } from './components/TxList';
import { Settings } from './components/Settings';
import { AuthScreen } from './components/AuthScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');

  useEffect(() => {
    // Logika za provjeru sesije može ići ovdje
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>MoneyLynx</h1>
        <nav>
          <button onClick={() => setView('dashboard')}>Početna</button>
          <button onClick={() => setView('settings')}>Postavke</button>
        </nav>
      </header>

      <main className="app-content">
        {view === 'dashboard' ? (
          <>
            <Dashboard />
            <TxForm />
            <TxList />
          </>
        ) : (
          <Settings />
        )}
      </main>

      {/* ISPRAVLJENO: Pravilno zatvaranje footer oznake */}
      <footer className="app-footer">
        <p>Verzija 1.0</p>
      </footer>
    </div>
  );
};

// Exporti potrebni za main.jsx
export const AppWithBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithBoundary;
