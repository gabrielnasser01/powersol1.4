import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function OAuthCallback() {
  const [params] = useSearchParams();
  const status = params.get('status') || 'error';
  const message = params.get('message') || 'Unknown result';
  const isSuccess = status === 'success';
  const color = isSuccess ? '#00ff88' : '#ff4444';

  useEffect(() => {
    const msg = { type: `social-link-${status}`, message };

    try {
      if (window.opener) {
        window.opener.postMessage(msg, '*');
      }
    } catch {}

    try {
      localStorage.setItem('powersol-social-link', JSON.stringify(msg));
    } catch {}

    const hasOpener = !!window.opener;

    const closeTimer = setTimeout(() => {
      if (hasOpener) {
        window.close();
      } else {
        window.location.href = '/profile';
      }
    }, 2000);

    const fallbackTimer = setTimeout(() => {
      window.location.href = '/profile';
    }, 3000);

    return () => {
      clearTimeout(closeTimer);
      clearTimeout(fallbackTimer);
    };
  }, [status, message]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: 'rgba(0,0,0,0.9)',
          border: `2px solid ${color}`,
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          maxWidth: 400,
          boxShadow: `0 0 40px ${color}33`,
          fontFamily: 'monospace',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 48, color, marginBottom: 16 }}>
          {isSuccess ? '\u2713' : '\u2717'}
        </div>
        <div style={{ color, fontSize: 16, marginBottom: 24, wordBreak: 'break-word' }}>
          {message}
        </div>
        <div style={{ color: '#888', fontSize: 12 }}>
          Redirecting to profile...
        </div>
      </div>
    </div>
  );
}
