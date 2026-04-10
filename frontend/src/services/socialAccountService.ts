const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface SocialAccount {
  id: string;
  wallet_address: string;
  platform: 'discord' | 'youtube' | 'tiktok' | 'twitter';
  platform_user_id: string;
  platform_username: string;
  platform_avatar_url: string;
  linked_at: string;
  updated_at: string;
}

const API_BASE = `${SUPABASE_URL}/functions/v1/social-accounts`;

const headers = {
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

function isInAppBrowser(): boolean {
  const ua = navigator.userAgent || navigator.vendor || '';
  return /FBAN|FBAV|Instagram|Line\/|Snapchat|Twitter|MicroMessenger|TikTok|BytedanceWebview|Musical_ly|SamsungBrowser\/.*CrossApp/i.test(ua);
}

async function getLinkedAccounts(walletAddress: string): Promise<SocialAccount[]> {
  const res = await fetch(`${API_BASE}?wallet_address=${walletAddress}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch social accounts');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function startOAuthFlow(platform: 'discord' | 'youtube' | 'tiktok' | 'twitter', walletAddress: string): Promise<SocialAccount | null> {
  return new Promise((resolve) => {
    try { localStorage.removeItem('powersol-social-link'); } catch {}

    const oauthUrl = `${API_BASE}/oauth/${platform}?wallet_address=${walletAddress}&origin=${encodeURIComponent(window.location.origin)}`;

    if (isInAppBrowser()) {
      try {
        const isAndroid = /android/i.test(navigator.userAgent);
        localStorage.setItem('powersol-pending-oauth', JSON.stringify({ platform, walletAddress, url: oauthUrl }));

        if (isAndroid) {
          const intentUrl = `intent://${window.location.host}/oauth/callback?pending=${platform}#Intent;scheme=https;package=com.android.chrome;end`;
          window.location.href = intentUrl;
        } else {
          window.location.href = oauthUrl;
        }
      } catch {
        window.location.href = oauthUrl;
      }
      resolve(null);
      return;
    }

    const width = 500;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      oauthUrl,
      `powersol-${platform}-oauth`,
      `width=${width},height=${height},left=${left},top=${top},popup=yes`
    );

    let resolved = false;
    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      window.removeEventListener('message', handleMessage);
      clearInterval(pollTimer);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'social-link-success' || event.data?.type === 'social-link-error') {
        cleanup();
        resolve(event.data.type === 'social-link-success' ? {} as SocialAccount : null);
      }
    };

    window.addEventListener('message', handleMessage);

    const pollTimer = setInterval(() => {
      try {
        const stored = localStorage.getItem('powersol-social-link');
        if (stored) {
          localStorage.removeItem('powersol-social-link');
          const msg = JSON.parse(stored);
          cleanup();
          resolve(msg.type === 'social-link-success' ? {} as SocialAccount : null);
          return;
        }
      } catch {}

      if (popup?.closed) {
        cleanup();
        resolve(null);
      }
    }, 500);

    setTimeout(() => {
      cleanup();
      if (popup && !popup.closed) popup.close();
      resolve(null);
    }, 120000);
  });
}

async function unlinkAccount(walletAddress: string, platform: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/unlink`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ wallet_address: walletAddress, platform }),
  });
  return res.ok;
}

export const socialAccountService = {
  getLinkedAccounts,
  startOAuthFlow,
  unlinkAccount,
  isInAppBrowser,
};
