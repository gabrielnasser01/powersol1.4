const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/[^\s<>'"]+$/;

export function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return SOLANA_ADDRESS_REGEX.test(address.trim());
}

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim()) && email.length <= 320;
}

export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return URL_REGEX.test(url.trim()) && url.length <= 2048;
}

export function sanitizeString(input: string, maxLength = 500): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeDisplayName(name: string): string {
  return sanitizeString(name, 50).replace(/[^a-zA-Z0-9\s._-]/g, '');
}

export function isValidQuantity(qty: unknown): qty is number {
  if (typeof qty !== 'number') return false;
  return Number.isInteger(qty) && qty > 0 && qty <= 1000;
}

export function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function isValidLotteryType(type: string): boolean {
  const validTypes = ['tri-daily', 'jackpot', 'grand-prize', 'special-event', 'xmas'];
  return validTypes.includes(type);
}

export function sanitizeFormData<T extends Record<string, unknown>>(
  data: T,
  schema: Record<keyof T, 'string' | 'email' | 'url' | 'wallet' | 'number'>
): T {
  const sanitized = { ...data };

  for (const [key, type] of Object.entries(schema)) {
    const value = sanitized[key as keyof T];
    if (value === undefined || value === null) continue;

    switch (type) {
      case 'string':
        (sanitized as Record<string, unknown>)[key] = sanitizeString(String(value));
        break;
      case 'email':
        if (!isValidEmail(String(value))) {
          throw new Error(`Invalid email: ${key}`);
        }
        (sanitized as Record<string, unknown>)[key] = String(value).trim().toLowerCase();
        break;
      case 'url':
        if (String(value) && !isValidUrl(String(value))) {
          throw new Error(`Invalid URL: ${key}`);
        }
        break;
      case 'wallet':
        if (!isValidSolanaAddress(String(value))) {
          throw new Error(`Invalid wallet address: ${key}`);
        }
        (sanitized as Record<string, unknown>)[key] = String(value).trim();
        break;
      case 'number':
        if (typeof value !== 'number' || !isFinite(value as number)) {
          throw new Error(`Invalid number: ${key}`);
        }
        break;
    }
  }

  return sanitized;
}
