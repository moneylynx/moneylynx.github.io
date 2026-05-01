import { Component } from 'react';
import { Ic } from './ui.jsx';

// ─── ChunkErrorBoundary ───────────────────────────────────────────────────────
// Screen-level error boundary with inline retry (no full page reload).
// Wrap individual screens (Charts, Settings, etc.) so a single NaN or
// render crash is contained to that screen — the rest of the app stays alive.
//
// Usage:
//   <ChunkErrorBoundary C={C} label="Statistika" t={t}>
//     <Charts ... />
//   </ChunkErrorBoundary>
// ─────────────────────────────────────────────────────────────────────────────
export default class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryKey: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(`[ChunkErrorBoundary:${this.props.label || 'screen'}]`, error, info);
  }

  retry = () => {
    this.setState(s => ({ hasError: false, error: null, retryKey: s.retryKey + 1 }));
  };

  render() {
    const { C, label = 'Ekran', t = (x) => x, children } = this.props;

    if (!this.state.hasError) {
      // Pass retryKey as a key to force remount on retry
      return (
        <div key={this.state.retryKey} style={{ width: '100%' }}>
          {children}
        </div>
      );
    }

    const accent  = C?.accent  || '#38BDF8';
    const expense = C?.expense || '#F87171';
    const bg      = C?.bg      || '#0A1628';
    const card    = C?.card    || '#0F2035';
    const border  = C?.border  || '#1A3355';
    const text    = C?.text    || '#F1F5F9';
    const muted   = C?.textMuted || '#7A9EC0';

    return (
      <div style={{ width: '100%', padding: '20px 16px' }}>
        <div style={{
          background: card,
          border: `1px solid ${border}`,
          borderLeft: `4px solid ${expense}`,
          borderRadius: 16,
          padding: 20,
          textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: `${expense}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <svg viewBox="0 0 24 24" width={24} height={24} fill="none"
              stroke={expense} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>

          <p style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 6 }}>
            {t('Greška u prikazu')} — {label}
          </p>
          <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 16 }}>
            {t('Ekran nije mogao prikazati podatke. Vaše transakcije su sigurne.')}
          </p>

          {this.state.error && (
            <div style={{
              background: `${expense}10`, border: `1px solid ${expense}30`,
              borderRadius: 8, padding: '7px 10px', marginBottom: 14,
              fontSize: 11, color: muted, textAlign: 'left',
              fontFamily: 'monospace', wordBreak: 'break-all',
            }}>
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <button onClick={this.retry} style={{
            width: '100%', padding: '11px 16px',
            background: `linear-gradient(135deg, ${accent}, ${C?.accentDk || accent})`,
            border: 'none', borderRadius: 11,
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            🔄 {t('Pokušaj ponovo')}
          </button>
        </div>
      </div>
    );
  }
}
