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

async function getLinkedAccounts(walletAddress: string): Promise<SocialAccount[]> {
  const res = await fetch(`${API_BASE}?wallet_address=${walletAddress}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch social accounts');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function startOAuthFlow(platform: 'discord' | 'youtube' | 'tiktok' | 'twitter', walletAddress: string): Promise<SocialAccount | null> {
  return new Promise((resolve) => {
    const oauthUrl = `${API_BASE}/oauth/${platform}?wallet_address=${walletAddress}`;
    const width = 500;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      oauthUrl,
      `powersol-${platform}-oauth`,
      `width=${width},height=${height},left=${left},top=${top},popup=yes`
    );

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'social-link-success' || event.data?.type === 'social-link-error') {
        window.removeEventListener('message', handleMessage);
        clearInterval(pollTimer);
        resolve(event.data.type === 'social-link-success' ? {} as SocialAccount : null);
      }
    };

    window.addEventListener('message', handleMessage);

    const pollTimer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(pollTimer);
        window.removeEventListener('message', handleMessage);
        resolve(null);
      }
    }, 500);

    setTimeout(() => {
      clearInterval(pollTimer);
      window.removeEventListener('message', handleMessage);
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
};
