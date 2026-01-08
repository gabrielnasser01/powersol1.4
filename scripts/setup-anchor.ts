import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

interface LotteryConfig {
  name: string;
  lotteryType: 'TRI_DAILY' | 'JACKPOT' | 'XMAS' | 'GRAND_PRIZE';
  ticketPrice: number;
  drawInterval: number;
  maxTickets: number;
  month?: number;
  year?: number;
}

const PROGRAM_DIR = resolve(__dirname, '../powersol-programs');
const CORE_PROGRAM_NAME = 'powersol_core';
const CLAIM_PROGRAM_NAME = 'powersol_claim';

function loadEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function loadWallet(pathEnvKey: string, defaultPath: string): Keypair {
  const walletPath = process.env[pathEnvKey] || defaultPath;
  const fullPath = resolve(__dirname, '..', walletPath);

  if (!existsSync(fullPath)) {
    throw new Error(`Wallet file not found: ${fullPath}`);
  }

  const walletData = JSON.parse(readFileSync(fullPath, 'utf-8'));
  return Keypair.fromSecretKey(new Uint8Array(walletData));
}

async function buildAndDeployPrograms(): Promise<{ coreId: string; claimId: string }> {
  console.log('\n📦 Building Anchor programs...');
  execSync('bash build.sh', { cwd: PROGRAM_DIR, stdio: 'inherit' });

  console.log('\n🚀 Deploying to devnet...');
  execSync('bash deploy-devnet.sh', { cwd: PROGRAM_DIR, stdio: 'inherit' });

  const coreIdlPath = resolve(PROGRAM_DIR, `target/idl/${CORE_PROGRAM_NAME}.json`);
  const claimIdlPath = resolve(PROGRAM_DIR, `target/idl/${CLAIM_PROGRAM_NAME}.json`);

  const coreIdl = JSON.parse(readFileSync(coreIdlPath, 'utf-8'));
  const claimIdl = JSON.parse(readFileSync(claimIdlPath, 'utf-8'));

  return {
    coreId: coreIdl.metadata.address,
    claimId: claimIdl.metadata.address
  };
}

function derivePDAs(coreProgramId: PublicKey) {
  const [globalStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_state')],
    coreProgramId
  );

  const [treasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('treasury')],
    coreProgramId
  );

  const [affiliatesPoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('affiliates_pool')],
    coreProgramId
  );

  return { globalStatePda, treasuryPda, affiliatesPoolPda };
}

function updateEnvFile(programIds: { coreId: string; claimId: string }, pdas: any) {
  const envPath = resolve(__dirname, '../.env');
  let envContent = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : '';

  const updates = {
    ANCHOR_CORE_PROGRAM_ID: programIds.coreId,
    ANCHOR_CLAIM_PROGRAM_ID: programIds.claimId,
    ANCHOR_GLOBAL_STATE_PDA: pdas.globalStatePda.toBase58(),
    ANCHOR_TREASURY_PDA: pdas.treasuryPda.toBase58(),
    ANCHOR_AFFILIATES_POOL_PDA: pdas.affiliatesPoolPda.toBase58()
  };

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }

  writeFileSync(envPath, envContent);
  console.log('\n✅ Updated .env with Program IDs and PDAs');
}

function buildLotteries(): LotteryConfig[] {
  return [
    {
      name: 'Daily Lottery',
      lotteryType: 'TRI_DAILY',
      ticketPrice: 0.1,
      drawInterval: 86400,
      maxTickets: 10000
    },
    {
      name: 'Weekly Lottery',
      lotteryType: 'TRI_DAILY',
      ticketPrice: 0.5,
      drawInterval: 604800,
      maxTickets: 50000
    },
    {
      name: 'Monthly Lottery',
      lotteryType: 'JACKPOT',
      ticketPrice: 1.0,
      drawInterval: 2592000,
      maxTickets: 100000,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear()
    },
    {
      name: 'Jackpot',
      lotteryType: 'JACKPOT',
      ticketPrice: 2.0,
      drawInterval: 604800,
      maxTickets: 200000,
      month: 12,
      year: 2025
    },
    {
      name: 'Grand Prize',
      lotteryType: 'GRAND_PRIZE',
      ticketPrice: 5.0,
      drawInterval: 7776000,
      maxTickets: 500000
    }
  ];
}

async function initializeLotteries(
  program: Program,
  authority: Keypair,
  coreProgramId: PublicKey,
  lotteries: LotteryConfig[]
) {
  console.log('\n🎰 Initializing lotteries on-chain...');

  const lotteryIds: string[] = [];

  for (const lottery of lotteries) {
    const lotteryId = Keypair.generate().publicKey;
    lotteryIds.push(lotteryId.toBase58());

    const seeds: Buffer[] = [Buffer.from('lottery'), lotteryId.toBuffer()];

    if (lottery.lotteryType === 'JACKPOT' && lottery.month && lottery.year) {
      seeds.push(Buffer.from([lottery.month]));
      seeds.push(Buffer.from(lottery.year.toString()));
    }

    const [lotteryPda] = PublicKey.findProgramAddressSync(seeds, coreProgramId);

    try {
      await program.methods
        .initialize({
          lotteryType: { [lottery.lotteryType.toLowerCase()]: {} },
          ticketPrice: lottery.ticketPrice * 1e9,
          drawInterval: lottery.drawInterval,
          maxTickets: lottery.maxTickets,
          month: lottery.month || null,
          year: lottery.year || null
        })
        .accounts({
          lottery: lotteryPda,
          authority: authority.publicKey
        })
        .signers([authority])
        .rpc();

      console.log(`✅ ${lottery.name}: ${lotteryPda.toBase58()}`);
    } catch (error) {
      console.error(`❌ Failed to initialize ${lottery.name}:`, error);
    }
  }

  return lotteryIds;
}

async function seedSupabase(lotteries: LotteryConfig[], lotteryIds: string[]) {
  const supabaseUrl = loadEnv('VITE_SUPABASE_URL');
  const supabaseKey = loadEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('\n💾 Seeding Supabase lotteries table...');

  const lotteryRecords = lotteries.map((lottery, index) => ({
    id: lotteryIds[index],
    name: lottery.name,
    ticket_price: lottery.ticketPrice,
    draw_interval: lottery.drawInterval,
    max_tickets: lottery.maxTickets,
    status: 'active',
    current_pot: 0,
    tickets_sold: 0,
    next_draw: new Date(Date.now() + lottery.drawInterval * 1000).toISOString(),
    created_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('lotteries')
    .upsert(lotteryRecords, { onConflict: 'id' });

  if (error) {
    console.error('❌ Failed to seed Supabase:', error);
  } else {
    console.log(`✅ Seeded ${lotteryRecords.length} lotteries in Supabase`);
  }
}

async function main() {
  try {
    console.log('🚀 PowerSOL Anchor Setup\n');

    const programIds = await buildAndDeployPrograms();
    console.log(`\n📋 Core Program: ${programIds.coreId}`);
    console.log(`📋 Claim Program: ${programIds.claimId}`);

    const coreProgramId = new PublicKey(programIds.coreId);
    const pdas = derivePDAs(coreProgramId);

    console.log(`\n🔑 Global State PDA: ${pdas.globalStatePda.toBase58()}`);
    console.log(`🔑 Treasury PDA: ${pdas.treasuryPda.toBase58()}`);
    console.log(`🔑 Affiliates Pool PDA: ${pdas.affiliatesPoolPda.toBase58()}`);

    updateEnvFile(programIds, pdas);

    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const authorityWallet = loadWallet('LOTTERY_WALLET_PATH', '/wallets/lottery-wallet.json');
    const wallet = new Wallet(authorityWallet);
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });

    const coreIdlPath = resolve(PROGRAM_DIR, `target/idl/${CORE_PROGRAM_NAME}.json`);
    const coreIdl = JSON.parse(readFileSync(coreIdlPath, 'utf-8'));
    const program = new Program(coreIdl, coreProgramId, provider);

    const lotteries = buildLotteries();
    const lotteryIds = await initializeLotteries(program, authorityWallet, coreProgramId, lotteries);

    await seedSupabase(lotteries, lotteryIds);

    console.log('\n✨ Setup complete! Run your backend with these environment variables.\n');
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

main();
