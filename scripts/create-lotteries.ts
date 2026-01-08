import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROGRAM_ID = new PublicKey('GqfdkAjpFJMZnzRaLrgeoBCr7exvSfqSib1wSJM49BxW');
const RPC_URL = 'https://api.devnet.solana.com';

const TREASURY = new PublicKey('55zv671N9QUBv9UCke6BTu1mM21dRKhvWcZDxiYLSXm1');
const AFFILIATES_POOL = new PublicKey('8KWvsj1QzCzKnDEViSnza1PJhEg3CyHPVS3nLU8CG3yf');

function getAnchorDiscriminator(instructionName: string): Buffer {
  const preimage = `global:${instructionName}`;
  const hash = createHash('sha256').update(preimage).digest();
  return hash.slice(0, 8);
}

function loadAuthority(): Keypair {
  const walletPath = path.resolve(__dirname, '../powersol-backend/wallets-generated.json');
  const data = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const authorityWallet = data.find((w: any) => w.name === 'AUTHORITY');
  if (!authorityWallet) throw new Error('AUTHORITY wallet not found');
  return Keypair.fromSecretKey(new Uint8Array(authorityWallet.privateKeyArray));
}

function deriveJackpotPDA(month: number, year: number): [PublicKey, number] {
  const monthBytes = Buffer.alloc(2);
  monthBytes.writeUInt16LE(month);
  const yearBytes = Buffer.alloc(4);
  yearBytes.writeUInt32LE(year);

  return PublicKey.findProgramAddressSync(
    [Buffer.from('jackpot'), monthBytes, yearBytes],
    PROGRAM_ID
  );
}

function deriveGrandPrizePDA(year: number): [PublicKey, number] {
  const yearBytes = Buffer.alloc(4);
  yearBytes.writeUInt32LE(year);

  return PublicKey.findProgramAddressSync(
    [Buffer.from('grand_prize'), yearBytes],
    PROGRAM_ID
  );
}

function deriveXmasPDA(year: number): [PublicKey, number] {
  const yearBytes = Buffer.alloc(4);
  yearBytes.writeUInt32LE(year);

  return PublicKey.findProgramAddressSync(
    [Buffer.from('xmas'), yearBytes],
    PROGRAM_ID
  );
}

function createInitializeJackpotIx(
  authority: PublicKey,
  lotteryPda: PublicKey,
  month: number,
  year: number,
  ticketPrice: bigint,
  maxTickets: number,
  drawTimestamp: bigint
): TransactionInstruction {
  const discriminator = getAnchorDiscriminator('initialize_jackpot_lottery');

  const data = Buffer.alloc(8 + 2 + 4 + 8 + 4 + 8);
  let offset = 0;

  discriminator.copy(data, offset); offset += 8;
  data.writeUInt16LE(month, offset); offset += 2;
  data.writeUInt32LE(year, offset); offset += 4;
  data.writeBigUInt64LE(ticketPrice, offset); offset += 8;
  data.writeUInt32LE(maxTickets, offset); offset += 4;
  data.writeBigInt64LE(drawTimestamp, offset); offset += 8;

  return new TransactionInstruction({
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: lotteryPda, isSigner: false, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: false },
      { pubkey: AFFILIATES_POOL, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

function createInitializeGrandPrizeIx(
  authority: PublicKey,
  lotteryPda: PublicKey,
  year: number,
  ticketPrice: bigint,
  maxTickets: number,
  drawTimestamp: bigint
): TransactionInstruction {
  const discriminator = getAnchorDiscriminator('initialize_grand_prize_lottery');

  const data = Buffer.alloc(8 + 4 + 8 + 4 + 8);
  let offset = 0;

  discriminator.copy(data, offset); offset += 8;
  data.writeUInt32LE(year, offset); offset += 4;
  data.writeBigUInt64LE(ticketPrice, offset); offset += 8;
  data.writeUInt32LE(maxTickets, offset); offset += 4;
  data.writeBigInt64LE(drawTimestamp, offset); offset += 8;

  return new TransactionInstruction({
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: lotteryPda, isSigner: false, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: false },
      { pubkey: AFFILIATES_POOL, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

function createInitializeXmasIx(
  authority: PublicKey,
  lotteryPda: PublicKey,
  year: number,
  ticketPrice: bigint,
  maxTickets: number,
  drawTimestamp: bigint
): TransactionInstruction {
  const discriminator = getAnchorDiscriminator('initialize_xmas_lottery');

  const data = Buffer.alloc(8 + 4 + 8 + 4 + 8);
  let offset = 0;

  discriminator.copy(data, offset); offset += 8;
  data.writeUInt32LE(year, offset); offset += 4;
  data.writeBigUInt64LE(ticketPrice, offset); offset += 8;
  data.writeUInt32LE(maxTickets, offset); offset += 4;
  data.writeBigInt64LE(drawTimestamp, offset); offset += 8;

  return new TransactionInstruction({
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: lotteryPda, isSigner: false, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: false },
      { pubkey: AFFILIATES_POOL, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');
  const authority = loadAuthority();

  console.log('Authority:', authority.publicKey.toBase58());
  console.log('Treasury:', TREASURY.toBase58());
  console.log('Affiliates Pool:', AFFILIATES_POOL.toBase58());

  const balance = await connection.getBalance(authority.publicKey);
  console.log('Balance:', balance / LAMPORTS_PER_SOL, 'SOL');

  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log('Requesting airdrop...');
    const sig = await connection.requestAirdrop(authority.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig);
    console.log('Airdrop confirmed');
  }

  console.log('\n=== Creating Lotteries On-Chain ===\n');

  console.log('--- 1. Special Event (Xmas) - January 2026 ---');
  {
    const year = 2026;
    const ticketPrice = BigInt(0.2 * LAMPORTS_PER_SOL);
    const maxTickets = 7500;
    const drawTimestamp = BigInt(Math.floor(new Date('2026-01-31T00:00:00Z').getTime() / 1000));
    const [lotteryPda] = deriveXmasPDA(year);

    console.log('  PDA:', lotteryPda.toBase58());
    console.log('  Year:', year);
    console.log('  Price: 0.2 SOL');
    console.log('  Max Tickets:', maxTickets);
    console.log('  Draw:', new Date(Number(drawTimestamp) * 1000).toISOString());

    const existingAccount = await connection.getAccountInfo(lotteryPda);
    if (existingAccount) {
      console.log('  STATUS: Already exists on-chain!');
    } else {
      try {
        const ix = createInitializeXmasIx(
          authority.publicKey,
          lotteryPda,
          year,
          ticketPrice,
          maxTickets,
          drawTimestamp
        );

        const tx = new Transaction().add(ix);
        tx.feePayer = authority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        const signature = await sendAndConfirmTransaction(connection, tx, [authority]);
        console.log('  TX:', signature);
        console.log('  STATUS: Created successfully!');
      } catch (error: any) {
        console.log('  ERROR:', error.message);
        if (error.logs) {
          console.log('  LOGS:', error.logs);
        }
      }
    }
  }

  console.log('\n--- 2. Monthly Jackpot - January 2026 ---');
  {
    const month = 1;
    const year = 2026;
    const ticketPrice = BigInt(0.2 * LAMPORTS_PER_SOL);
    const maxTickets = 5000;
    const drawTimestamp = BigInt(Math.floor(new Date('2026-01-31T23:59:59Z').getTime() / 1000));
    const [lotteryPda] = deriveJackpotPDA(month, year);

    console.log('  PDA:', lotteryPda.toBase58());
    console.log('  Month:', month, 'Year:', year);
    console.log('  Price: 0.2 SOL');
    console.log('  Max Tickets:', maxTickets);
    console.log('  Draw:', new Date(Number(drawTimestamp) * 1000).toISOString());

    const existingAccount = await connection.getAccountInfo(lotteryPda);
    if (existingAccount) {
      console.log('  STATUS: Already exists on-chain!');
    } else {
      try {
        const ix = createInitializeJackpotIx(
          authority.publicKey,
          lotteryPda,
          month,
          year,
          ticketPrice,
          maxTickets,
          drawTimestamp
        );

        const tx = new Transaction().add(ix);
        tx.feePayer = authority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        const signature = await sendAndConfirmTransaction(connection, tx, [authority]);
        console.log('  TX:', signature);
        console.log('  STATUS: Created successfully!');
      } catch (error: any) {
        console.log('  ERROR:', error.message);
        if (error.logs) {
          console.log('  LOGS:', error.logs);
        }
      }
    }
  }

  console.log('\n--- 3. Annual Grand Prize - 2026 ---');
  {
    const year = 2026;
    const ticketPrice = BigInt(0.33 * LAMPORTS_PER_SOL);
    const maxTickets = 10000;
    const drawTimestamp = BigInt(Math.floor(new Date('2027-01-01T00:00:00Z').getTime() / 1000));
    const [lotteryPda] = deriveGrandPrizePDA(year);

    console.log('  PDA:', lotteryPda.toBase58());
    console.log('  Year:', year);
    console.log('  Price: 0.33 SOL');
    console.log('  Max Tickets:', maxTickets);
    console.log('  Draw:', new Date(Number(drawTimestamp) * 1000).toISOString());

    const existingAccount = await connection.getAccountInfo(lotteryPda);
    if (existingAccount) {
      console.log('  STATUS: Already exists on-chain!');
    } else {
      try {
        const ix = createInitializeGrandPrizeIx(
          authority.publicKey,
          lotteryPda,
          year,
          ticketPrice,
          maxTickets,
          drawTimestamp
        );

        const tx = new Transaction().add(ix);
        tx.feePayer = authority.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        const signature = await sendAndConfirmTransaction(connection, tx, [authority]);
        console.log('  TX:', signature);
        console.log('  STATUS: Created successfully!');
      } catch (error: any) {
        console.log('  ERROR:', error.message);
        if (error.logs) {
          console.log('  LOGS:', error.logs);
        }
      }
    }
  }

  console.log('\n=== Summary ===\n');

  const [xmasPda] = deriveXmasPDA(2026);
  const [jackpotPda] = deriveJackpotPDA(1, 2026);
  const [grandPrizePda] = deriveGrandPrizePDA(2026);

  console.log('Special Event 2026:', xmasPda.toBase58());
  console.log('Monthly Jackpot Jan 2026:', jackpotPda.toBase58());
  console.log('Annual Grand Prize 2026:', grandPrizePda.toBase58());
}

main().catch(console.error);
