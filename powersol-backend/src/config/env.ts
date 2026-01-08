import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'powerSOL-super-secret-jwt-key-2024',
  SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLUSTER: process.env.CLUSTER || 'devnet',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '*',
};

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
  console.warn('Warning: Supabase credentials not found in environment variables');
}
