import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

export enum LotteryType {
  TRI_DAILY = 'TRI_DAILY',
  JACKPOT = 'JACKPOT',
  GRAND_PRIZE = 'GRAND_PRIZE',
  XMAS = 'XMAS',
}

export function findLotteryPDA(
  lotteryId: number,
  programId: PublicKey
): { publicKey: PublicKey; bump: number } {
  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('lottery'), new anchor.BN(lotteryId).toArrayLike(Buffer, 'le', 8)],
    programId
  );
  return { publicKey, bump };
}

export function findTriDailyLotteryPDA(
  round: number,
  programId: PublicKey
): { publicKey: PublicKey; bump: number } {
  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('tri_daily'),
      new anchor.BN(round).toArrayLike(Buffer, 'le', 8),
    ],
    programId
  );
  return { publicKey, bump };
}

export function findJackpotLotteryPDA(
  month: number,
  year: number,
  programId: PublicKey
): { publicKey: PublicKey; bump: number } {
  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('jackpot'),
      new anchor.BN(month).toArrayLike(Buffer, 'le', 2),
      new anchor.BN(year).toArrayLike(Buffer, 'le', 4),
    ],
    programId
  );
  return { publicKey, bump };
}

export function findGrandPrizeLotteryPDA(
  year: number,
  programId: PublicKey
): { publicKey: PublicKey; bump: number } {
  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('grand_prize'),
      new anchor.BN(year).toArrayLike(Buffer, 'le', 4),
    ],
    programId
  );
  return { publicKey, bump };
}

export function findXmasLotteryPDA(
  year: number,
  programId: PublicKey
): { publicKey: PublicKey; bump: number } {
  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('xmas'),
      new anchor.BN(year).toArrayLike(Buffer, 'le', 4),
    ],
    programId
  );
  return { publicKey, bump };
}

export function findTicketPDA(
  lotteryId: number,
  ticketNumber: number,
  programId: PublicKey
): { publicKey: PublicKey; bump: number } {
  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('ticket'),
      new anchor.BN(lotteryId).toArrayLike(Buffer, 'le', 8),
      new anchor.BN(ticketNumber).toArrayLike(Buffer, 'le', 4),
    ],
    programId
  );
  return { publicKey, bump };
}

export function findUserTicketsPDA(
  userPubkey: PublicKey,
  lotteryId: number,
  programId: PublicKey
): { publicKey: PublicKey; bump: number } {
  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('user_tickets'),
      userPubkey.toBuffer(),
      new anchor.BN(lotteryId).toArrayLike(Buffer, 'le', 8),
    ],
    programId
  );
  return { publicKey, bump };
}

export function findClaimPDA(
  userPubkey: PublicKey,
  lotteryId: number,
  programId: PublicKey
): { publicKey: PublicKey; bump: number } {
  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('claim'),
      userPubkey.toBuffer(),
      new anchor.BN(lotteryId).toArrayLike(Buffer, 'le', 8),
    ],
    programId
  );
  return { publicKey, bump };
}

export function findVRFRequestPDA(
  lotteryPubkey: PublicKey,
  programId: PublicKey
): { publicKey: PublicKey; bump: number } {
  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('vrf_request'), lotteryPubkey.toBuffer()],
    programId
  );
  return { publicKey, bump };
}

export function findAffiliatePDA(
  userPubkey: PublicKey,
  programId: PublicKey
): { publicKey: PublicKey; bump: number } {
  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('affiliate'), userPubkey.toBuffer()],
    programId
  );
  return { publicKey, bump };
}

export function getLotteryPDAForType(
  type: LotteryType,
  params: { round?: number; month?: number; year?: number },
  programId: PublicKey
): { publicKey: PublicKey; bump: number } {
  switch (type) {
    case LotteryType.TRI_DAILY:
      if (!params.round) throw new Error('Round required for TRI_DAILY');
      return findTriDailyLotteryPDA(params.round, programId);

    case LotteryType.JACKPOT:
      if (!params.month || !params.year)
        throw new Error('Month and year required for JACKPOT');
      return findJackpotLotteryPDA(params.month, params.year, programId);

    case LotteryType.GRAND_PRIZE:
      if (!params.year) throw new Error('Year required for GRAND_PRIZE');
      return findGrandPrizeLotteryPDA(params.year, programId);

    case LotteryType.XMAS:
      if (!params.year) throw new Error('Year required for XMAS');
      return findXmasLotteryPDA(params.year, programId);

    default:
      throw new Error(`Unknown lottery type: ${type}`);
  }
}
