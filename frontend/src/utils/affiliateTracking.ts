const AFFILIATE_STORAGE_KEY = 'powersol_affiliate_ref';

interface StoredAffiliate {
  code: string;
  timestamp: number;
}

export function getAffiliateCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  return params.get('ref') || params.get('affiliate') || null;
}

export function storeAffiliateCode(code: string): void {
  if (typeof window === 'undefined') return;

  const data: StoredAffiliate = {
    code,
    timestamp: Date.now(),
  };

  localStorage.setItem(AFFILIATE_STORAGE_KEY, JSON.stringify(data));
}

export function getStoredAffiliateCode(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(AFFILIATE_STORAGE_KEY);
    if (!stored) return null;

    const data: StoredAffiliate = JSON.parse(stored);
    return data.code;
  } catch {
    return null;
  }
}

export function getActiveAffiliateCode(): string | null {
  const urlCode = getAffiliateCodeFromUrl();
  if (urlCode) {
    storeAffiliateCode(urlCode);
    return urlCode;
  }

  return getStoredAffiliateCode();
}

export function clearAffiliateCode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AFFILIATE_STORAGE_KEY);
}

export function initAffiliateTracking(): void {
  const urlCode = getAffiliateCodeFromUrl();
  if (urlCode) {
    storeAffiliateCode(urlCode);

    const url = new URL(window.location.href);
    url.searchParams.delete('ref');
    url.searchParams.delete('affiliate');
    window.history.replaceState({}, '', url.toString());
  }
}
