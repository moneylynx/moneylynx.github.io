import { Component } from 'react';

// ─── ErrorBoundary ────────────────────────────────────────────────────────────
// Catches uncaught React render errors and shows a friendly message
// instead of a blank white screen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const C = this.props.C || {
      bg: "#0A1628", card: "#0F2035", accent: "#38BDF8",
      text: "#F1F5F9", textMuted: "#7A9EC0", expense: "#F87171",
      border: "#1A3355",
    };

    return (
      <div style={{
        background: C.bg, minHeight:"100vh", display:"flex",
        flexDirection:"column", alignItems:"center", justifyContent:"center",
        padding:24, fontFamily:"'Inter',sans-serif",
      }}>
        <div style={{
          background: C.card, border:`1px solid ${C.border}`,
          borderLeft:`4px solid ${C.expense}`,
          borderRadius:18, padding:28, maxWidth:360, width:"100%",
          textAlign:"center",
        }}>
          <div style={{
            width:56, height:56, borderRadius:16,
            background:`${C.expense}20`,
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 16px",
          }}>
            <svg viewBox="0 0 24 24" width={28} height={28} fill="none"
              stroke={C.expense} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>

          <h2 style={{ fontSize:18, fontWeight:700, color:C.text, marginBottom:8 }}>
            Ups, nešto je pošlo po krivu
          </h2>
          <p style={{ fontSize:13, color:C.textMuted, lineHeight:1.6, marginBottom:20 }}>
            Aplikacija je naišla na neočekivanu grešku. Vaši podaci su sigurni.
          </p>

          {this.state.error && (
            <div style={{
              background:`${C.expense}10`, border:`1px solid ${C.expense}30`,
              borderRadius:10, padding:"8px 12px", marginBottom:16,
              fontSize:11, color:C.textMuted, textAlign:"left",
              fontFamily:"monospace", wordBreak:"break-all",
            }}>
              {this.state.error.message}
            </div>
          )}

          <button
            onClick={() => window.location.reload()}
            style={{
              width:"100%", padding:"12px 16px",
              background:`linear-gradient(135deg,${C.accent},#0EA5E9)`,
              border:"none", borderRadius:12,
              color:"#fff", fontSize:14, fontWeight:700,
              cursor:"pointer",
            }}
          >
            🔄 Osvježi aplikaciju
          </button>

          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              width:"100%", padding:"10px 16px", marginTop:8,
              background:"transparent", border:`1px solid ${C.border}`,
              borderRadius:12, color:C.textMuted, fontSize:13,
              cursor:"pointer",
            }}
          >
            Pokušaj nastaviti
          </button>
        </div>
      </div>
    );
  }
}
