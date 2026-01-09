import crypto from 'crypto';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

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

export function generateNonce(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateAuthMessage(walletAddress: string, nonce: string): string {
  return `Sign this message to authenticate with PowerSOL.\n\nWallet: ${walletAddress}\nNonce: ${nonce}`;
}

export function verifySignature(
  message: string,
  signature: string,
  walletAddress: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = new PublicKey(walletAddress).toBytes();

    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}
