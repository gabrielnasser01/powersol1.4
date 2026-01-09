import crypto from 'crypto';

export function generateReferralCode(): string {
  const prefix = 'POWER';
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
  return `${prefix}${randomPart}`;
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function hashString(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
