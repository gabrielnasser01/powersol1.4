interface User {
  publicKey?: string;
  connectedAt?: number;
  name?: string;
  email?: string;
  country?: string;
  notifications?: boolean;
}

interface Ticket {
  txId: string;
  amount: number;
  priceUsd: number;
  priceSol: number;
  drawId: string;
  createdAt: number;
}

interface Draw {
  id: string;
  kind: 'tri-daily' | 'monthly' | 'event:halloween';
  scheduledAt: number;
  executedAt?: number;
  seedHash?: string;
  poolSol?: number;
}

interface Winner {
  drawId: string;
  maskedPk: string;
  prizeSol: number;
  timestamp: number;
}

interface Jackpot {
  monthlySol: number;
  lastUpdated: number;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: { type: 'ticket' | 'chest' | 'points'; amount: number };
  completed: boolean;
  type: 'daily' | 'weekly' | 'special';
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
}

export type { Mission };

interface AffiliateData {
  clicks: number;
  wallets: number;
  ticketsByRefs: number;
  estCommission: number;
  tier: number;
  referralLink: string;
}

interface Settings {
  notifications: boolean;
  theme: 'dark' | 'auto';
  language: string;
}

interface UserStats {
  tickets: number;
  chests: number;
  loginStreak: number;
  lastLogin: number;
  totalReferrals: number;
  totalTicketsPurchased: number;
  dailyMissions?: number;
  missionPoints: number;
}
const STORAGE_KEYS = {
  USER: 'powerSOL.user',
  TICKETS: 'powerSOL.tickets',
  DRAWS: 'powerSOL.draws',
  WINNERS: 'powerSOL.winners',
  JACKPOT: 'powerSOL.jackpot',
  MISSIONS: 'powerSOL.missions',
  AFFILIATES: 'powerSOL.affiliates',
  SETTINGS: 'powerSOL.settings',
  USER_STATS: 'powerSOL.userStats',
} as const;

// Storage utilities
export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

// Specific storage functions
export const userStorage = {
  get: (): User => getStorageItem(STORAGE_KEYS.USER, {}),
  set: (user: User) => {
    setStorageItem(STORAGE_KEYS.USER, user);
    // Dispatch custom event to notify components
    window.dispatchEvent(new CustomEvent('walletStorageChange'));
  },
  clear: () => {
    // Keep user data, only clear wallet connection
    const currentUser = userStorage.get();
    const clearedUser = {
      ...currentUser,
      publicKey: undefined,
      connectedAt: undefined,
    };
    setStorageItem(STORAGE_KEYS.USER, clearedUser);
    // Dispatch custom event to notify components
    window.dispatchEvent(new CustomEvent('walletStorageChange'));
  },
};

export const ticketsStorage = {
  get: (): Ticket[] => getStorageItem(STORAGE_KEYS.TICKETS, []),
  add: (ticket: Ticket) => {
    const tickets = ticketsStorage.get();
    tickets.push(ticket);
    setStorageItem(STORAGE_KEYS.TICKETS, tickets);
  },
  clear: () => {
    setStorageItem(STORAGE_KEYS.TICKETS, []);
  },
};

export const drawsStorage = {
  get: (): Draw[] => getStorageItem(STORAGE_KEYS.DRAWS, []),
  set: (draws: Draw[]) => setStorageItem(STORAGE_KEYS.DRAWS, draws),
  getNext: (): Draw | null => {
    const draws = drawsStorage.get();
    const now = Date.now();
    return draws.find(d => d.scheduledAt > now && !d.executedAt) || null;
  },
};

export const winnersStorage = {
  get: (): Winner[] => getStorageItem(STORAGE_KEYS.WINNERS, []),
  add: (winner: Winner) => {
    const winners = winnersStorage.get();
    winners.unshift(winner);
    if (winners.length > 100) winners.splice(100); // Keep only last 100
    setStorageItem(STORAGE_KEYS.WINNERS, winners);
  },
};

export const jackpotStorage = {
  get: (): Jackpot => getStorageItem(STORAGE_KEYS.JACKPOT, { monthlySol: 5000, lastUpdated: Date.now() }),
  update: (amount: number) => {
    const jackpot = jackpotStorage.get();
    jackpot.monthlySol += amount;
    jackpot.lastUpdated = Date.now();
    setStorageItem(STORAGE_KEYS.JACKPOT, jackpot);
  },
};

export const missionsStorage = {
  get: (): Record<string, Mission[]> => getStorageItem(STORAGE_KEYS.MISSIONS, {}),
  getDailyMissions: (): Mission[] => {
    const today = new Date().toISOString().split('T')[0];
    const missions = missionsStorage.get();
    return missions[today] || generateDailyMissions();
  },
  updateMission: (missionId: string, progress: number) => {
    const today = new Date().toISOString().split('T')[0];
    const allMissions = missionsStorage.get();
    const todayMissions = allMissions[today] || generateDailyMissions();
    
    const mission = todayMissions.find(m => m.id === missionId);
    if (mission) {
      mission.progress = Math.min(progress, mission.target);
      mission.completed = mission.progress >= mission.target;
    }
    
    allMissions[today] = todayMissions;
    setStorageItem(STORAGE_KEYS.MISSIONS, allMissions);
  },
};

export const affiliatesStorage = {
  get: (): AffiliateData => getStorageItem(STORAGE_KEYS.AFFILIATES, {
    clicks: 0,
    wallets: 0,
    ticketsByRefs: 0,
    estCommission: 0,
    tier: 0,
    referralLink: '',
  }),
  set: (data: AffiliateData) => setStorageItem(STORAGE_KEYS.AFFILIATES, data),
};

export const settingsStorage = {
  get: (): Settings => getStorageItem(STORAGE_KEYS.SETTINGS, {
    notifications: true,
    theme: 'dark',
    language: 'en',
  }),
  set: (settings: Settings) => setStorageItem(STORAGE_KEYS.SETTINGS, settings),
};

export const userStatsStorage = {
  get: (): UserStats => {
    const user = userStorage.get();
    const publicKey = user.publicKey;

    if (!publicKey) {
      return {
        tickets: 0,
        chests: 0,
        loginStreak: 0,
        lastLogin: 0,
        totalReferrals: 0,
        totalTicketsPurchased: 0,
        missionPoints: 0,
      };
    }

    const allStats = getStorageItem<Record<string, UserStats>>('powerSOL.allUserStats', {});

    if (!allStats[publicKey]) {
      const oldStats = getStorageItem<UserStats>(STORAGE_KEYS.USER_STATS, {
        tickets: 0,
        chests: 0,
        loginStreak: 0,
        lastLogin: 0,
        totalReferrals: 0,
        totalTicketsPurchased: 0,
        missionPoints: 0,
      });

      if (oldStats.missionPoints > 0) {
        allStats[publicKey] = oldStats;
        setStorageItem('powerSOL.allUserStats', allStats);
      }
    }

    return allStats[publicKey] || {
      tickets: 0,
      chests: 0,
      loginStreak: 0,
      lastLogin: 0,
      totalReferrals: 0,
      totalTicketsPurchased: 0,
      missionPoints: 0,
    };
  },
  set: (stats: UserStats) => {
    const user = userStorage.get();
    const publicKey = user.publicKey;

    if (!publicKey) return;

    const allStats = getStorageItem<Record<string, UserStats>>('powerSOL.allUserStats', {});
    allStats[publicKey] = stats;
    setStorageItem('powerSOL.allUserStats', allStats);
    window.dispatchEvent(new CustomEvent('missionPointsChange'));
  },
  addTickets: (amount: number) => {
    const stats = userStatsStorage.get();
    stats.tickets += amount;
    userStatsStorage.set(stats);
  },
  addChests: (amount: number) => {
    const stats = userStatsStorage.get();
    stats.chests += amount;
    userStatsStorage.set(stats);
  },
  addMissionPoints: (amount: number) => {
    const stats = userStatsStorage.get();
    stats.missionPoints = (stats.missionPoints || 0) + amount;
    userStatsStorage.set(stats);
  },
  updateLoginStreak: () => {
    const stats = userStatsStorage.get();
    const today = new Date().toDateString();
    const lastLogin = new Date(stats.lastLogin).toDateString();

    if (today !== lastLogin) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastLogin === yesterday.toDateString()) {
        stats.loginStreak += 1;
      } else {
        stats.loginStreak = 1;
      }

      stats.lastLogin = Date.now();
      userStatsStorage.set(stats);
    }
  },
};
// Generate daily missions
function generateDailyMissions(): Mission[] {
  return [
    {
      id: 'daily-login',
      title: 'Daily Login',
      description: 'Connect your wallet and login today',
      progress: 0,
      target: 1,
      reward: { type: 'ticket', amount: 1 },
      completed: false,
      type: 'daily',
      difficulty: 'easy',
    },
    {
      id: 'buy-tickets',
      title: 'Purchase Tickets',
      description: 'Buy at least 2 lottery tickets',
      progress: 0,
      target: 2,
      reward: { type: 'ticket', amount: 2 },
      completed: false,
      type: 'daily',
      difficulty: 'medium',
    },
    {
      id: 'invite-friends',
      title: 'Invite Friends',
      description: 'Share your referral link with 2 friends',
      progress: 0,
      target: 2,
      reward: { type: 'chest', amount: 1 },
      completed: false,
      type: 'daily',
      difficulty: 'hard',
    },
    {
      id: 'check-transparency',
      title: 'Verify Fairness',
      description: 'Visit the transparency page to learn about our provably fair system',
      progress: 0,
      target: 1,
      reward: { type: 'ticket', amount: 1 },
      completed: false,
      type: 'daily',
      difficulty: 'easy',
    },
    {
      id: 'blockchain-interaction',
      title: 'Blockchain Explorer',
      description: 'Check recent winners and verify on-chain transactions',
      progress: 0,
      target: 1,
      reward: { type: 'ticket', amount: 3 },
      completed: false,
      type: 'daily',
      difficulty: 'medium',
    },
  ];
}

// Initialize storage with seed data
export function initializeStorage(): void {
  const draws = drawsStorage.get();
  if (draws.length === 0) {
    const now = Date.now();
    const seedDraws: Draw[] = [
      {
        id: 'tri-daily-001',
        kind: 'tri-daily',
        scheduledAt: now + 2 * 24 * 60 * 60 * 1000, // 2 days from now
        poolSol: 1500,
      },
      {
        id: 'monthly-001',
        kind: 'monthly',
        scheduledAt: now + 15 * 24 * 60 * 60 * 1000, // 15 days from now
      },
      {
        id: 'halloween-2024',
        kind: 'event:halloween',
        scheduledAt: new Date('2024-10-31').getTime(),
      },
    ];
    drawsStorage.set(seedDraws);
  }

  // Seed some winners
  const winners = winnersStorage.get();
  if (winners.length === 0) {
    const seedWinners: Winner[] = [
      { drawId: 'tri-daily-000', maskedPk: '7xK...9mP', prizeSol: 450, timestamp: Date.now() - 3000000 },
      { drawId: 'tri-daily-000', maskedPk: 'Bv2...4nQ', prizeSol: 180, timestamp: Date.now() - 2000000 },
      { drawId: 'tri-daily-000', maskedPk: '3hM...7wR', prizeSol: 90, timestamp: Date.now() - 1000000 },
    ];
    seedWinners.forEach(winner => winnersStorage.add(winner));
  }
}