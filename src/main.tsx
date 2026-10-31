import React, { Component, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import '@lichess-org/chessground/assets/chessground.base.css';
import '@lichess-org/chessground/assets/chessground.brown.css';
import '@lichess-org/chessground/assets/chessground.cburnett.css';
import './styles/app.css';
import { App } from './App';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Chess Coach AI] Error en tiempo de ejecución:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          maxWidth: '640px',
          margin: '4rem auto',
          backgroundColor: '#171f2c',
          color: '#f1f5f9',
          borderRadius: '0.75rem',
          border: '1px solid #ef4444',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h2 style={{ color: '#ef4444', marginTop: 0 }}>Error al inicializar Chess Coach AI</h2>
          <p>{this.state.error?.message || 'Se produjo un error inesperado al renderizar la aplicación.'}</p>
          <pre style={{
            backgroundColor: '#0f141c',
            padding: '1rem',
            borderRadius: '0.5rem',
            overflow: 'auto',
            fontSize: '0.8rem',
            color: '#f87171'
          }}>
            {this.state.error?.stack}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '0.55rem 1.1rem',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
          >
            ↻ Recargar aplicación
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
