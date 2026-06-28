// ═══════════════════════════════════════════════════════════════
//  ErrorBoundary — يمنع الشاشة البيضاء عند أي خطأ غير متوقع
// ═══════════════════════════════════════════════════════════════
import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('🚨 ErrorBoundary caught:', error, info);
    this.setState({ info });
    // ممكن تبعت الخطأ للسيرفر هنا (Sentry / logAudit / ...)
  }

  handleReload = () => {
    // امسح أي cache مشكلة قبل الـ reload
    try {
      // مش نمسح كل localStorage عشان نحافظ على الـ offline data
      // بس نعمل hard reload
      window.location.reload();
    } catch (_) {}
  };

  handleClearAndReload = () => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('fmv7_'));
      keys.forEach(k => localStorage.removeItem(k));
    } catch (_) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" style={{
          fontFamily: "'Cairo', sans-serif",
          padding: 32,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7f9f6',
          color: '#14251a',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: 64,
            marginBottom: 16
          }}>🌾</div>
          <h1 style={{
            fontSize: 22,
            fontWeight: 800,
            marginBottom: 8,
            color: '#0d4c1e'
          }}>حدث خطأ غير متوقع</h1>
          <p style={{
            fontSize: 14,
            color: '#3f5a45',
            maxWidth: 320,
            lineHeight: 1.6,
            marginBottom: 20
          }}>
            نأسف على الإزعاج. يمكنك إعادة تحميل الصفحة،
            أو مسح البيانات المحلية وإعادة الدخول إذا تكرر الخطأ.
          </p>

          {this.state.error && (
            <details style={{
              background: '#fff',
              border: '1px solid #e2e9e1',
              borderRadius: 10,
              padding: 12,
              marginBottom: 20,
              maxWidth: 360,
              width: '100%',
              fontSize: 12,
              color: '#728a76',
              textAlign: 'left',
              direction: 'ltr'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                تفاصيل الخطأ
              </summary>
              <pre style={{
                marginTop: 8,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                fontSize: 11
              }}>
                {this.state.error?.message || String(this.state.error)}
                {this.state.info?.componentStack}
              </pre>
            </details>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={this.handleReload}
              style={{
                background: '#1c6b30',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '12px 22px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(28,107,48,.3)'
              }}>
              🔄 إعادة التحميل
            </button>
            <button onClick={this.handleClearAndReload}
              style={{
                background: '#fff',
                color: '#c02c2c',
                border: '1.5px solid #f3c3c3',
                borderRadius: 12,
                padding: '12px 22px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer'
              }}>
              🧹 مسح البيانات المحلية
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
