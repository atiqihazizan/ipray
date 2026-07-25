import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Render error:', error, info.componentStack);
  }

  componentDidUpdate(_, prevState) {
    if (!prevState.hasError && this.state.hasError) {
      setTimeout(() => window.location.reload(), 10000);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', inset: 0,
          background: '#1a1a1a', color: '#fff',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'sans-serif', textAlign: 'center', padding: '32px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠</div>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>Ralat paparan</div>
          <div style={{ fontSize: '16px', color: '#aaa' }}>
            Sistem akan muat semula dalam 10 saat...
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
