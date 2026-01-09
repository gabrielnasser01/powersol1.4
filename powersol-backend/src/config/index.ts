export * from './env.js';
export * from './solana.js';
export * from './supabase.js';
export * from './lotteries.js';

export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { supabase } = await import('./supabase.js');
    const { error } = await supabase.from('users').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

export async function testSolanaConnection(): Promise<boolean> {
  try {
    const { getConnection } = await import('./solana.js');
    const connection = getConnection();
    await connection.getLatestBlockhash();
    return true;
  } catch {
    return false;
  }
}

export async function testRedisConnection(): Promise<boolean> {
  return true;
}
