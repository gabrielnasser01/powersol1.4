import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const ENV = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  SUPABASE_URL: requireEnv('VITE_SUPABASE_URL'),
  SUPABASE_ANON_KEY: requireEnv('VITE_SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  NODE_ENV: process.env.NODE_ENV || 'production',
  CLUSTER: process.env.CLUSTER || 'devnet',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
  RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  RPC_COMMITMENT: process.env.RPC_COMMITMENT || 'confirmed',
};
