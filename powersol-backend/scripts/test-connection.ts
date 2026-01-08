import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Connection } from '@solana/web3.js';
import Redis from 'ioredis';

config();

console.log('Testing connections...\n');

async function testSupabase() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.from('users').select('count').limit(1).maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    console.log('✅ Supabase: Connected');
    return true;
  } catch (error) {
    console.log('❌ Supabase: Failed', error);
    return false;
  }
}

async function testSolana() {
  try {
    const connection = new Connection(process.env.RPC_URL!);
    const version = await connection.getVersion();
    console.log('✅ Solana: Connected', version);
    return true;
  } catch (error) {
    console.log('❌ Solana: Failed', error);
    return false;
  }
}

async function testRedis() {
  try {
    const redis = new Redis(process.env.REDIS_URL!);
    await redis.ping();
    await redis.quit();
    console.log('✅ Redis: Connected');
    return true;
  } catch (error) {
    console.log('❌ Redis: Failed', error);
    return false;
  }
}

async function main() {
  const [supabaseOk, solanaOk, redisOk] = await Promise.all([
    testSupabase(),
    testSolana(),
    testRedis(),
  ]);

  console.log('\n=== Results ===');
  console.log(`Supabase: ${supabaseOk ? '✅' : '❌'}`);
  console.log(`Solana: ${solanaOk ? '✅' : '❌'}`);
  console.log(`Redis: ${redisOk ? '✅' : '❌'}`);

  if (supabaseOk && solanaOk && redisOk) {
    console.log('\n🎉 All connections successful!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some connections failed');
    process.exit(1);
  }
}

main();
