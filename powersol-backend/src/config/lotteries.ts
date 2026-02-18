import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export enum LotteryType {
  TRI_DAILY = 'TRI_DAILY',
  JACKPOT = 'JACKPOT',
  GRAND_PRIZE = 'GRAND_PRIZE',
  XMAS = 'XMAS',
}

export interface WinnerTier {
  tierNumber: number;
  winnersCount?: number;
  winnersPercentage?: number;
  poolPercentage: number;
  description: string;
}

export interface RevenueDistribution {
  prizePool: number;
  treasury: number;
  affiliates: number;
}

export interface LotteryConfig {
  type: LotteryType;
  name: string;
  description: string;
  ticketPrice: bigint;
  maxTickets: number;
  frequency: string;
  drawSchedule: string;
  revenueDistribution: RevenueDistribution;
  prizeDistribution: RevenueDistribution;
  winnerTiers: WinnerTier[];
  winnersSelectionType: 'PERCENTAGE' | 'FIXED';
  totalWinnersPercentage?: number;
  totalWinnersFixed?: number;
  features: string[];
}

export const TRI_DAILY_CONFIG: LotteryConfig = {
  type: LotteryType.TRI_DAILY,
  name: 'Tri-Daily Lottery',
  description: 'Sorteio a cada 3 dias com múltiplos vencedores',
  ticketPrice: BigInt(0.1 * LAMPORTS_PER_SOL),
  maxTickets: 1000,
  frequency: 'Every 3 days',
  drawSchedule: 'Every 3 days at 00:00 UTC',
  revenueDistribution: {
    prizePool: 40,
    treasury: 30,
    affiliates: 30,
  },
  prizeDistribution: {
    prizePool: 40,
    treasury: 30,
    affiliates: 30,
  },
  winnersSelectionType: 'PERCENTAGE',
  totalWinnersPercentage: 5,
  winnerTiers: [
    {
      tierNumber: 1,
      winnersPercentage: 1,
      poolPercentage: 20,
      description: 'Tier 1 - Prêmio Maior',
    },
    {
      tierNumber: 2,
      winnersPercentage: 2,
      poolPercentage: 10,
      description: 'Tier 2 - Prêmio Grande',
    },
    {
      tierNumber: 3,
      winnersPercentage: 6,
      poolPercentage: 12.5,
      description: 'Tier 3 - Prêmio Médio',
    },
    {
      tierNumber: 4,
      winnersPercentage: 36,
      poolPercentage: 27.5,
      description: 'Tier 4 - Prêmio Pequeno',
    },
    {
      tierNumber: 5,
      winnersPercentage: 55,
      poolPercentage: 30,
      description: 'Tier 5 - Prêmio Mínimo',
    },
  ],
  features: [
    'Draw every 3 days',
    'Multiple winners (5% of tickets)',
    '5 prize tiers',
    'Affordable ticket price',
  ],
};

export const JACKPOT_CONFIG: LotteryConfig = {
  type: LotteryType.JACKPOT,
  name: 'Monthly Jackpot',
  description: 'Sorteio mensal com 100 ganhadores fixos',
  ticketPrice: BigInt(0.2 * LAMPORTS_PER_SOL),
  maxTickets: 5000,
  frequency: 'Monthly',
  drawSchedule: 'Last day of each month at 00:00 UTC',
  revenueDistribution: {
    prizePool: 40,
    treasury: 30,
    affiliates: 30,
  },
  prizeDistribution: {
    prizePool: 40,
    treasury: 30,
    affiliates: 30,
  },
  winnersSelectionType: 'FIXED',
  totalWinnersFixed: 100,
  winnerTiers: [
    {
      tierNumber: 1,
      winnersCount: 1,
      poolPercentage: 20,
      description: 'Tier 1 - Campeão',
    },
    {
      tierNumber: 2,
      winnersCount: 2,
      poolPercentage: 10,
      description: 'Tier 2 - Vice-Campeões',
    },
    {
      tierNumber: 3,
      winnersCount: 6,
      poolPercentage: 12.5,
      description: 'Tier 3 - Top 10',
    },
    {
      tierNumber: 4,
      winnersCount: 36,
      poolPercentage: 27.5,
      description: 'Tier 4 - Top 50',
    },
    {
      tierNumber: 5,
      winnersCount: 55,
      poolPercentage: 30,
      description: 'Tier 5 - Top 100',
    },
  ],
  features: [
    'Monthly draw',
    '100 fixed winners',
    'Bigger prize pool',
    '5 prize tiers',
  ],
};

export const GRAND_PRIZE_CONFIG: LotteryConfig = {
  type: LotteryType.GRAND_PRIZE,
  name: 'New Year Grand Prize',
  description: 'Sorteio especial de Ano Novo - Top 3 Vencedores',
  ticketPrice: BigInt(0.33 * LAMPORTS_PER_SOL),
  maxTickets: 10000,
  frequency: 'Yearly',
  drawSchedule: 'January 1st at 00:00 UTC',
  revenueDistribution: {
    prizePool: 40,
    treasury: 30,
    affiliates: 30,
  },
  prizeDistribution: {
    prizePool: 40,
    treasury: 30,
    affiliates: 30,
  },
  winnersSelectionType: 'FIXED',
  totalWinnersFixed: 3,
  winnerTiers: [
    {
      tierNumber: 1,
      winnersCount: 1,
      poolPercentage: 50,
      description: '1º Lugar - Campeão',
    },
    {
      tierNumber: 2,
      winnersCount: 1,
      poolPercentage: 30,
      description: '2º Lugar - Vice-Campeão',
    },
    {
      tierNumber: 3,
      winnersCount: 1,
      poolPercentage: 20,
      description: '3º Lugar - Terceiro Colocado',
    },
  ],
  features: [
    'Biggest prize of the year',
    'Top 3 winners',
    'New Year celebration',
    'Special NFTs for winners',
  ],
};

export const XMAS_CONFIG: LotteryConfig = {
  type: LotteryType.XMAS,
  name: "Valentine's Day Special",
  description: 'Sorteio especial Dia dos Namorados 2026 com multiplos vencedores',
  ticketPrice: BigInt(0.2 * LAMPORTS_PER_SOL),
  maxTickets: 7500,
  frequency: 'Yearly',
  drawSchedule: 'February 14, 2026 at 00:00 UTC',
  revenueDistribution: {
    prizePool: 40,
    treasury: 30,
    affiliates: 30,
  },
  prizeDistribution: {
    prizePool: 40,
    treasury: 30,
    affiliates: 30,
  },
  winnersSelectionType: 'PERCENTAGE',
  totalWinnersPercentage: 5,
  winnerTiers: [
    {
      tierNumber: 1,
      winnersPercentage: 1,
      poolPercentage: 20,
      description: 'Tier 1 - Prêmio Maior',
    },
    {
      tierNumber: 2,
      winnersPercentage: 2,
      poolPercentage: 10,
      description: 'Tier 2 - Prêmio Grande',
    },
    {
      tierNumber: 3,
      winnersPercentage: 6,
      poolPercentage: 12.5,
      description: 'Tier 3 - Prêmio Médio',
    },
    {
      tierNumber: 4,
      winnersPercentage: 36,
      poolPercentage: 27.5,
      description: 'Tier 4 - Prêmio Pequeno',
    },
    {
      tierNumber: 5,
      winnersPercentage: 55,
      poolPercentage: 30,
      description: 'Tier 5 - Prêmio Mínimo',
    },
  ],
  features: [
    "Valentine's Day special event",
    'Multiple winners (5% of tickets)',
    '5 prize tiers',
    "Special Valentine's NFTs",
  ],
};

export const LOTTERY_CONFIGS: Record<LotteryType, LotteryConfig> = {
  [LotteryType.TRI_DAILY]: TRI_DAILY_CONFIG,
  [LotteryType.JACKPOT]: JACKPOT_CONFIG,
  [LotteryType.GRAND_PRIZE]: GRAND_PRIZE_CONFIG,
  [LotteryType.XMAS]: XMAS_CONFIG,
};

export function getLotteryConfig(type: LotteryType): LotteryConfig {
  return LOTTERY_CONFIGS[type];
}

export function getNextTriDailyDrawTime(): Date {
  const now = new Date();
  const startDate = new Date(Date.UTC(2024, 0, 1, 0, 0, 0, 0));

  const diffMs = now.getTime() - startDate.getTime();
  const daysSinceStart = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const currentRound = Math.floor(daysSinceStart / 3);
  const nextRound = currentRound + 1;

  const nextDrawDate = new Date(startDate);
  nextDrawDate.setUTCDate(startDate.getUTCDate() + (nextRound * 3));

  return nextDrawDate;
}

export function getNextJackpotDrawTime(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 0, 0, 0, 0);
  return nextMonth;
}

export function getGrandPrizeDrawTime(): Date {
  const now = new Date();
  const nextYear = now.getFullYear() + 1;
  return new Date(Date.UTC(nextYear, 0, 1, 0, 0, 0, 0));
}

export function getXmasDrawTime(): Date {
  return new Date(Date.UTC(2026, 1, 14, 0, 0, 0, 0));
}

export function getDrawTimeForType(type: LotteryType): Date {
  switch (type) {
    case LotteryType.TRI_DAILY:
      return getNextTriDailyDrawTime();
    case LotteryType.JACKPOT:
      return getNextJackpotDrawTime();
    case LotteryType.GRAND_PRIZE:
      return getGrandPrizeDrawTime();
    case LotteryType.XMAS:
      return getXmasDrawTime();
    default:
      throw new Error(`Unknown lottery type: ${type}`);
  }
}

export function calculateTriDailyRound(): number {
  const startDate = new Date(Date.UTC(2024, 0, 1, 0, 0, 0, 0));
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const daysSinceStart = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return Math.floor(daysSinceStart / 3) + 1;
}

export function getCurrentMonth(): number {
  return new Date().getUTCMonth() + 1;
}

export function getCurrentYear(): number {
  return new Date().getUTCFullYear();
}

export interface TierWinnersCalculation {
  tierNumber: number;
  winnersCount: number;
  poolAmount: bigint;
  prizePerWinner: bigint;
  description: string;
}

export function calculateWinnersForLottery(
  config: LotteryConfig,
  totalTicketsSold: number,
  totalPrizePool: bigint
): TierWinnersCalculation[] {
  const results: TierWinnersCalculation[] = [];

  if (config.winnersSelectionType === 'PERCENTAGE') {
    const totalWinners = Math.floor(
      (totalTicketsSold * (config.totalWinnersPercentage || 0)) / 100
    );

    for (const tier of config.winnerTiers) {
      const winnersCount = Math.floor(
        (totalWinners * (tier.winnersPercentage || 0)) / 100
      );

      if (winnersCount === 0) continue;

      const poolAmount = (totalPrizePool * BigInt(tier.poolPercentage * 100)) / BigInt(10000);
      const prizePerWinner = poolAmount / BigInt(winnersCount);

      results.push({
        tierNumber: tier.tierNumber,
        winnersCount,
        poolAmount,
        prizePerWinner,
        description: tier.description,
      });
    }
  } else {
    for (const tier of config.winnerTiers) {
      const winnersCount = tier.winnersCount || 0;

      if (winnersCount === 0) continue;

      const poolAmount = (totalPrizePool * BigInt(tier.poolPercentage * 100)) / BigInt(10000);
      const prizePerWinner = poolAmount / BigInt(winnersCount);

      results.push({
        tierNumber: tier.tierNumber,
        winnersCount,
        poolAmount,
        prizePerWinner,
        description: tier.description,
      });
    }
  }

  return results;
}

export function getTotalWinnersForLottery(
  config: LotteryConfig,
  totalTicketsSold: number
): number {
  if (config.winnersSelectionType === 'PERCENTAGE') {
    return Math.floor((totalTicketsSold * (config.totalWinnersPercentage || 0)) / 100);
  } else {
    return config.totalWinnersFixed || 0;
  }
}

export function calculateRevenueDistribution(
  config: LotteryConfig,
  totalRevenue: bigint
): {
  prizePool: bigint;
  treasury: bigint;
  affiliates: bigint;
} {
  const prizePool = (totalRevenue * BigInt(config.revenueDistribution.prizePool)) / BigInt(100);
  const treasury = (totalRevenue * BigInt(config.revenueDistribution.treasury)) / BigInt(100);
  const affiliates = (totalRevenue * BigInt(config.revenueDistribution.affiliates)) / BigInt(100);

  return {
    prizePool,
    treasury,
    affiliates,
  };
}
