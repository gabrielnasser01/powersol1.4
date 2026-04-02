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

    const closeTimer = setTimeout(() => window.close(), 2000);
    const textTimer = setTimeout(() => {
      const el = document.getElementById('hint');
      if (el) el.textContent = 'You can close this tab manually.';
    }, 4000);

    return () => {
      clearTimeout(closeTimer);
      clearTimeout(textTimer);
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
        <div id="hint" style={{ color: '#888', fontSize: 12 }}>
          Closing automatically...
        </div>
      </div>
    </div>
  );
}
