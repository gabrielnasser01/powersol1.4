const STORAGE_PREFIX = 'ps_';
const ENCODING_KEY = 'PowerSOL_2024_v1';

function obfuscate(data: string): string {
  const encoded = btoa(encodeURIComponent(data));
  let result = '';
  for (let i = 0; i < encoded.length; i++) {
    const charCode = encoded.charCodeAt(i) ^ ENCODING_KEY.charCodeAt(i % ENCODING_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result);
}

function deobfuscate(data: string): string {
  try {
    const decoded = atob(data);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ ENCODING_KEY.charCodeAt(i % ENCODING_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return decodeURIComponent(atob(result));
  } catch {
    return '';
  }
}

export const secureStorage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (!raw) {
        const legacyRaw = localStorage.getItem(key);
        if (legacyRaw) {
          const parsed = JSON.parse(legacyRaw) as T;
          this.set(key, parsed);
          localStorage.removeItem(key);
          return parsed;
        }
        return defaultValue;
      }
      const decrypted = deobfuscate(raw);
      return decrypted ? JSON.parse(decrypted) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      const encrypted = obfuscate(serialized);
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, encrypted);
    } catch {
      // storage full or unavailable
    }
  },

  remove(key: string): void {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    localStorage.removeItem(key);
  },

  clearAll(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX) || key?.startsWith('powerSOL.')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  },
};
