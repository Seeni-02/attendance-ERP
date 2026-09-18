import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          background: '#f8fafc',
          padding: '2rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            borderLeft: '4px solid #ef4444'
          }}>
            <h1 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>⚠️ Application Error</h1>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              The app encountered an error. This is usually caused by:
            </p>
            <ul style={{ color: '#374151', marginBottom: '1rem', paddingLeft: '1.5rem' }}>
              <li>Missing Supabase environment variables in Vercel</li>
              <li>Supabase database tables not created yet (run <code>supabase.sql</code>)</li>
              <li>Network connectivity issue</li>
            </ul>
            <details style={{ marginBottom: '1rem' }}>
              <summary style={{ cursor: 'pointer', color: '#6b7280', marginBottom: '0.5rem' }}>
                Technical Details
              </summary>
              <pre style={{
                background: '#f1f5f9',
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '12px',
                overflowX: 'auto',
                color: '#ef4444'
              }}>
                {this.state.error?.message}
                {'\n\n'}
                {this.state.error?.stack}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              🔄 Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
