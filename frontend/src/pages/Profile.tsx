import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Trophy, Target, Wallet, Copy, TrendingUp, Zap, Globe, Bell, BellOff, X, Ticket, Gift, Users, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userStorage, userStatsStorage } from '../store/persist';
import { ticketStorage, MockTicket } from '../store/ticketStorage';
import { prizeService, Prize } from '../services/prizeService';
import { affiliateDashboardService, DashboardStats } from '../services/affiliateDashboardService';
import { claimService } from '../services/claimService';
import { supabase } from '../lib/supabase';
import { useWallet } from '../contexts/WalletContext';
import { useNotifications } from '../hooks/useNotifications';
import { Connection, clusterApiUrl } from '@solana/web3.js';

export function Profile() {
  const navigate = useNavigate();
  const { publicKey: walletPublicKey, connected, disconnect, getWalletAdapter } = useWallet();
  const { isEnabled: notificationsEnabled, enableNotifications, disableNotifications, checkForPrizes } = useNotifications(walletPublicKey);
  const [user, setUser] = useState(userStorage.get());
  const [userStats, setUserStats] = useState(userStatsStorage.get());
  const [personalInfo, setPersonalInfo] = useState({
    displayName: '',
    email: '',
    location: '',
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [togglingNotifications, setTogglingNotifications] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTicketsModal, setShowTicketsModal] = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [claimingPrize, setClaimingPrize] = useState<number | null>(null);
  const [affiliateStats, setAffiliateStats] = useState<DashboardStats | null>(null);
  const [loadingAffiliate, setLoadingAffiliate] = useState(false);
  const [claimingAffiliate, setClaimingAffiliate] = useState(false);
  const [scanlinePosition, setScanlinePosition] = useState(0);
  const [glitchActive, setGlitchActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cpuUsage, setCpuUsage] = useState(12);
  const [memUsage, setMemUsage] = useState(8.923);
  const [bootSequence, setBootSequence] = useState<string[]>([]);
  const [showCursor, setShowCursor] = useState(true);
  const [userTickets, setUserTickets] = useState<Array<{lottery: string; color: string; tickets: MockTicket[]}>>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [userPrizes, setUserPrizes] = useState<Prize[]>([]);
  const [loadingPrizes, setLoadingPrizes] = useState(false);
  const [totalPrizeAmount, setTotalPrizeAmount] = useState(0);

  const isConnected = connected && !!walletPublicKey;

  const loadTickets = async () => {
    if (!walletPublicKey) {
      setUserTickets([]);
      setTotalTickets(0);
      return;
    }

    await ticketStorage.syncFromDatabase(walletPublicKey);
    const allTickets = ticketStorage.getAll();

    const lotteryMap: Record<string, {lottery: string; color: string; tickets: MockTicket[]}> = {
      'tri-daily': { lottery: 'Tri-Daily Lottery', color: '#ff1493', tickets: [] },
      'special-event': { lottery: 'Special Event', color: '#ff8c00', tickets: [] },
      'jackpot': { lottery: 'Jackpot', color: '#00bfff', tickets: [] },
      'grand-prize': { lottery: 'Grand Prize', color: '#9ca3af', tickets: [] },
    };

    allTickets.forEach(ticket => {
      if (lotteryMap[ticket.lotteryType]) {
        lotteryMap[ticket.lotteryType].tickets.push(ticket);
      }
    });

    const grouped = Object.values(lotteryMap).filter(group => group.tickets.length > 0);
    setUserTickets(grouped);
    setTotalTickets(allTickets.length);
  };

  const loadPrizes = async () => {
    if (!walletPublicKey) return;

    setLoadingPrizes(true);
    try {
      const prizes = await prizeService.getUserPrizes(walletPublicKey);
      setUserPrizes(prizes);

      const total = prizes.reduce((sum, prize) => sum + prize.prize_amount_lamports, 0);
      setTotalPrizeAmount(total);
    } catch (error) {
      console.error('Failed to load prizes:', error);
    } finally {
      setLoadingPrizes(false);
    }
  };

  const loadPowerPoints = async () => {
    if (!walletPublicKey) return;

    try {
      const { data } = await supabase
        .from('users')
        .select('power_points')
        .eq('wallet_address', walletPublicKey)
        .maybeSingle();

      if (data?.power_points !== undefined) {
        const currentStats = userStatsStorage.get();
        if (currentStats.missionPoints !== data.power_points) {
          currentStats.missionPoints = data.power_points;
          userStatsStorage.set(currentStats);
          setUserStats(currentStats);
        }
      }
    } catch (error) {
      console.error('Failed to load power points:', error);
    }
  };

  const loadAffiliateData = async () => {
    if (!walletPublicKey) return;

    setLoadingAffiliate(true);
    try {
      const stats = await affiliateDashboardService.getDashboardStats(walletPublicKey);
      setAffiliateStats(stats);
    } catch (error) {
      console.error('Failed to load affiliate data:', error);
    } finally {
      setLoadingAffiliate(false);
    }
  };

  const loadUserProfile = async () => {
    if (!walletPublicKey) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('display_name, email, location')
        .eq('wallet_address', walletPublicKey)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPersonalInfo({
          displayName: data.display_name || '',
          email: data.email || '',
          location: data.location || '',
        });
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const saveUserProfile = async () => {
    if (!walletPublicKey) return;

    setSavingConfig(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: personalInfo.displayName || null,
          email: personalInfo.email || null,
          location: personalInfo.location || null,
          updated_at: new Date().toISOString(),
        })
        .eq('wallet_address', walletPublicKey);

      if (error) throw error;

      alert('Configuracoes salvas com sucesso!');
    } catch (error) {
      console.error('Failed to save user profile:', error);
      alert('Erro ao salvar configuracoes. Tente novamente.');
    } finally {
      setSavingConfig(false);
    }
  };

  // Reset everything instantly when wallet disconnects
  useEffect(() => {
    if (!connected) {
      setUserStats({
        tickets: 0,
        chests: 0,
        loginStreak: 0,
        lastLogin: 0,
        totalReferrals: 0,
        totalTicketsPurchased: 0,
        missionPoints: 0,
      });
      setUserPrizes([]);
      setTotalPrizeAmount(0);
      setAffiliateStats(null);
      setUserTickets([]);
      setTotalTickets(0);
      setPersonalInfo({
        displayName: '',
        email: '',
        location: '',
      });
    }
  }, [connected]);

  useEffect(() => {
    if (isConnected) {
      loadTickets();
      loadPrizes();
      loadPowerPoints();
      loadAffiliateData();
      loadUserProfile();
    }
  }, [walletPublicKey, isConnected]);

  // Listen for ticket purchases
  useEffect(() => {
    const handleTicketsPurchased = async () => {
      await loadTickets();
    };

    window.addEventListener('ticketsPurchased', handleTicketsPurchased);
    return () => window.removeEventListener('ticketsPurchased', handleTicketsPurchased);
  }, [walletPublicKey]);

  // Listen for mission points changes
  useEffect(() => {
    const handleMissionPointsChange = async () => {
      if (walletPublicKey && connected) {
        setUserStats(userStatsStorage.get());
        await loadPowerPoints();
      }
    };

    window.addEventListener('missionPointsChange', handleMissionPointsChange);
    return () => window.removeEventListener('missionPointsChange', handleMissionPointsChange);
  }, [walletPublicKey, connected]);

  // Listen for wallet storage changes
  useEffect(() => {
    const handleWalletStorageChange = () => {
      const updatedUser = userStorage.get();
      setUser(updatedUser);

      if (connected && walletPublicKey) {
        loadTickets();
      }
    };

    window.addEventListener('walletStorageChange', handleWalletStorageChange);
    return () => window.removeEventListener('walletStorageChange', handleWalletStorageChange);
  }, [connected, walletPublicKey]);

  // 30fps animation config for mobile optimization
  const transition30fps = {
    type: "spring",
    stiffness: 100,
    damping: 20,
    mass: 1
  };

  // Terminal-style scanline effect at 30fps
  useEffect(() => {
    const interval = setInterval(() => {
      setScanlinePosition(prev => (prev + 1) % 100);
    }, 33); // ~30fps
    return () => clearInterval(interval);
  }, []);

  // Random glitch effect at 30fps
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.95) {
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 100);
      }
    }, 33); // ~30fps
    return () => clearInterval(glitchInterval);
  }, []);

  // Update time every second
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  // Simulate CPU usage fluctuation slowly
  useEffect(() => {
    const cpuInterval = setInterval(() => {
      setCpuUsage(prev => {
        const change = (Math.random() - 0.5) * 0.5;
        const newValue = prev + change;
        return Math.max(5, Math.min(95, newValue));
      });
    }, 2000); // Every 2 seconds
    return () => clearInterval(cpuInterval);
  }, []);

  // Simulate memory usage fluctuation slowly
  useEffect(() => {
    const memInterval = setInterval(() => {
      setMemUsage(prev => {
        const change = (Math.random() - 0.5) * 0.05;
        const newValue = prev + change;
        return Math.max(6, Math.min(15, newValue));
      });
    }, 3000); // Every 3 seconds
    return () => clearInterval(memInterval);
  }, []);

  // Terminal boot sequence effect
  useEffect(() => {
    const messages = [
      '> INITIALIZING_PROFILE_MODULE...',
      '> AUTHENTICATING_WALLET...',
      '> SYSTEM_READY'
    ];

    // Add first message immediately
    setBootSequence([messages[0]]);

    // Then add the rest with delays
    const timer1 = setTimeout(() => {
      setBootSequence([messages[0], messages[1]]);
    }, 400);

    const timer2 = setTimeout(() => {
      setBootSequence([messages[0], messages[1], messages[2]]);
    }, 800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Blinking cursor effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  const handleConnect = () => {
    if (!isConnected) {
      const walletButton = document.querySelector('[data-wallet-connect]');
      if (walletButton) {
        (walletButton as HTMLElement).click();
      }
    }
  };

  const handleCopyWallet = () => {
    if (user.publicKey) {
      navigator.clipboard.writeText(user.publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnectWallet = async () => {
    if (isConnected) {
      await disconnect();
      setUser(userStorage.get());
    } else {
      handleConnect();
    }
  };

  const handleClaimPrize = async (prizeId: string) => {
    if (!user.publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    setClaimingPrize(prizeId as any);

    try {
      const result = await prizeService.claimPrize(prizeId, user.publicKey);

      alert(`Prize claimed successfully! Transaction: ${result.data.signature}`);

      await loadPrizes();
    } catch (error) {
      console.error('Failed to claim prize:', error);
      alert(error instanceof Error ? error.message : 'Failed to claim prize. Please try again.');
    } finally {
      setClaimingPrize(null);
    }
  };

  const handleClaimAffiliate = async () => {
    if (!user.publicKey || !affiliateStats) {
      alert('Please connect your wallet first');
      return;
    }

    const pendingLamports = affiliateStats.pendingClaimableLamports;
    if (pendingLamports <= 0) {
      alert('No rewards available to claim');
      return;
    }

    setClaimingAffiliate(true);

    try {
      const wallet = getWalletAdapter();
      if (!wallet || !wallet.signTransaction) {
        alert('Wallet adapter not available. Please reconnect your wallet.');
        return;
      }

      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

      const result = await claimService.claimAllAvailableAffiliateRewards(
        user.publicKey,
        wallet.signTransaction.bind(wallet),
        connection
      );

      if (result.success) {
        const solAmount = claimService.lamportsToSol(result.totalAmount);
        alert(`Successfully claimed ${solAmount.toFixed(4)} SOL from ${result.claimed} week(s)!\n\nTransactions:\n${result.txSignatures.join('\n')}`);
        await loadAffiliateData();
      } else {
        alert(`Failed to claim some rewards:\n${result.errors.join('\n')}`);
      }
    } catch (error) {
      console.error('Failed to claim affiliate rewards:', error);
      alert(error instanceof Error ? error.message : 'Failed to claim rewards. Please try again.');
    } finally {
      setClaimingAffiliate(false);
    }
  };

  const affiliateLevel = affiliateStats?.tier || 1;
  const affiliateTierLabel = affiliateStats?.tierLabel || 'Starter';
  const validReferrals = affiliateStats?.totalReferrals || 0;
  const commissionRate = affiliateStats?.commissionRate || 0.05;
  const affiliateRewardsLamports = affiliateStats?.pendingClaimableLamports || 0;
  const affiliateRewardsSOL = affiliateRewardsLamports / 1_000_000_000;

  const getNextLevelReferrals = () => {
    if (affiliateLevel >= 4) return 5000;
    if (affiliateLevel === 3) return 5000;
    if (affiliateLevel === 2) return 1000;
    return 100;
  };

  const getLevelProgress = () => {
    return affiliateDashboardService.getTierProgress(validReferrals, affiliateLevel);
  };

  // User can access profile data even when wallet is disconnected
  // Only show minimal connection prompt if they need to perform wallet operations

  return (
    <div className="min-h-screen pt-20 pb-20 relative overflow-hidden">
      {/* Terminal scanline effect */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-10"
        style={{
          background: `linear-gradient(to bottom, transparent ${scanlinePosition}%, rgba(0, 255, 136, 0.03) ${scanlinePosition}%, transparent ${scanlinePosition + 2}%)`,
          mixBlendMode: 'screen'
        }}
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />

      {/* CRT screen curvature overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-10"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.3) 100%)',
          mixBlendMode: 'multiply'
        }}
      />

      {/* Glitch effect */}
      {glitchActive && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.1, 0] }}
          transition={{ duration: 0.1 }}
          style={{
            background: 'repeating-linear-gradient(0deg, rgba(0, 255, 136, 0.1) 0px, transparent 2px, transparent 4px)',
            mixBlendMode: 'overlay'
          }}
        />
      )}

      {/* Terminal Grid Background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(0deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px),
              linear-gradient(135deg, #000000 0%, #0a0a0a 100%)
            `,
            backgroundSize: '30px 30px, 30px 30px, 100% 100%',
          }}
        />
      </div>

      <div className="container mx-auto px-2 sm:px-4 md:px-6 relative z-10 max-w-7xl">
        {/* Terminal Header with macOS dots and system info */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition30fps}
          className="mb-6 p-2 sm:p-4 rounded-2xl"
          style={{
            background: 'rgba(0, 0, 0, 0.95)',
            border: '1px solid #00ff88',
            boxShadow: '0 0 40px rgba(0, 255, 136, 0.2)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="ml-1 sm:ml-2 font-mono text-xs sm:text-sm" style={{ color: '#00ff88' }}>
                PROFILE_TERMINAL_v2.1.0
              </span>
            </div>
            <motion.div
              className="hidden sm:flex items-center space-x-4 font-mono text-xs"
              style={{ color: '#00ff88' }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <motion.span
                key={currentTime.toLocaleTimeString()}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {currentTime.toLocaleTimeString()}
              </motion.span>
              <motion.span
                animate={{
                  color: cpuUsage > 70 ? '#ff4444' : cpuUsage > 40 ? '#ffaa00' : '#00ff88'
                }}
                transition={{ duration: 0.5 }}
              >
                CPU: {Math.round(cpuUsage)}%
              </motion.span>
              <motion.span
                animate={{
                  color: memUsage > 12 ? '#ff4444' : memUsage > 10 ? '#ffaa00' : '#00ff88'
                }}
                transition={{ duration: 0.5 }}
              >
                MEM: {memUsage.toFixed(3)}GB
              </motion.span>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Terminal Content */}
        <div>
          {/* Terminal Icon and Title Card */}
          <div
            className="p-3 sm:p-4 md:p-6 rounded-xl border-2 mb-6 sm:mb-8"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(0, 10, 10, 0.95))',
              borderColor: '#00ff88',
              boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)',
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(0, 191, 255, 0.2))',
                    border: '2px solid #00ff88',
                  }}
                >
                  <span className="text-xl sm:text-2xl font-mono" style={{ color: '#00ff88' }}>{'>'}_</span>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-mono mb-1" style={{ color: '#fff' }}>
                    {'>'} USER_PROFILE.EXE
                  </h1>
                  <p className="font-mono text-xs sm:text-sm" style={{ color: '#00ff88' }}>
                    Industrial Terminal Interface v2.1.0
                  </p>
                </div>
              </div>

              {/* Status Badges */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3 sm:justify-end w-full sm:w-auto">
                <div
                  className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold flex items-center justify-center space-x-1.5"
                  style={{
                    background: 'rgba(0, 255, 136, 0.2)',
                    border: '1px solid rgba(0, 255, 136, 0.4)',
                    color: '#00ff88',
                  }}
                >
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span>ONLINE</span>
                </div>
                <div
                  className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold text-center"
                  style={{
                    background: 'rgba(0, 191, 255, 0.2)',
                    border: '1px solid rgba(0, 191, 255, 0.4)',
                    color: '#00bfff',
                  }}
                >
                  0 ACTIVE
                </div>
                <div
                  className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold text-center"
                  style={{
                    background: 'rgba(179, 71, 255, 0.2)',
                    border: '1px solid rgba(179, 71, 255, 0.4)',
                    color: '#b347ff',
                  }}
                >
                  0 RUNNING
                </div>
                <div
                  className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold text-center"
                  style={{
                    background: 'rgba(255, 20, 147, 0.2)',
                    border: '1px solid rgba(255, 20, 147, 0.4)',
                    color: '#ff1493',
                  }}
                >
                  0 STABLE
                </div>
              </div>
            </div>

            {/* Terminal Boot Sequence */}
            <div className="space-y-1 font-mono text-xs sm:text-sm">
              {bootSequence.map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  style={{ color: '#00ff88' }}
                >
                  {line}
                </motion.div>
              ))}
              {bootSequence.length === 3 && (
                <div style={{ color: '#00ff88', opacity: showCursor ? 1 : 0, display: 'inline-block', fontSize: '1.2em', fontWeight: 'bold' }}>|</div>
              )}
            </div>
          </div>


          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-12">
            {/* Card 1 - Tickets */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...transition30fps, delay: 0.1 }}
              whileHover={{ scale: 1.02, transition: transition30fps }}
              className="relative"
            >
              <div
                className="p-4 sm:p-6 rounded-xl border-2 flex flex-col items-center justify-center text-center cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(0, 20, 10, 0.95))',
                  borderColor: '#00ff88',
                  boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)',
                }}
                onClick={() => setShowTicketsModal(true)}
              >
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg mb-3 sm:mb-4 flex items-center justify-center"
                  style={{
                    background: 'rgba(0, 255, 136, 0.2)',
                    border: '1px solid rgba(0, 255, 136, 0.4)',
                  }}
                >
                  <Trophy className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: '#00ff88' }} />
                </div>
                <div className="text-3xl sm:text-4xl font-bold mb-1 sm:mb-2 font-mono" style={{ color: '#00ff88' }}>
                  {String(isConnected ? totalTickets : 0).padStart(3, '0')}
                </div>
                <p className="text-xs text-zinc-400 font-mono uppercase">
                  TICKETS PURCHASED
                </p>
              </div>
            </motion.div>

            {/* Card 2 - Missions */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...transition30fps, delay: 0.2 }}
              whileHover={{ scale: 1.02, transition: transition30fps }}
              className="relative"
            >
              <div
                className="p-4 sm:p-6 rounded-xl border-2 flex flex-col items-center justify-center text-center cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(0, 10, 20, 0.95))',
                  borderColor: '#00bfff',
                  boxShadow: '0 0 20px rgba(0, 191, 255, 0.3)',
                }}
                onClick={() => navigate('/missions')}
              >
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg mb-3 sm:mb-4 flex items-center justify-center"
                  style={{
                    background: 'rgba(0, 191, 255, 0.2)',
                    border: '1px solid rgba(0, 191, 255, 0.4)',
                  }}
                >
                  <Target className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: '#00bfff' }} />
                </div>
                <div className="text-3xl sm:text-4xl font-bold mb-1 sm:mb-2 font-mono" style={{ color: '#00bfff' }}>
                  {String(userStats.missionPoints || 0).padStart(3, '0')}
                </div>
                <p className="text-xs text-zinc-400 font-mono uppercase">
                  POWER POINTS
                </p>
              </div>
            </motion.div>

            {/* Card 3 - Rewards */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...transition30fps, delay: 0.3 }}
              whileHover={{ scale: 1.02, transition: transition30fps }}
              className="relative"
            >
              <div
                className="p-4 sm:p-6 rounded-xl border-2 flex flex-col items-center justify-center text-center cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(10, 0, 20, 0.95))',
                  borderColor: '#b347ff',
                  boxShadow: '0 0 20px rgba(179, 71, 255, 0.3)',
                }}
                onClick={() => setShowRewardsModal(true)}
              >
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg mb-3 sm:mb-4 flex items-center justify-center"
                  style={{
                    background: 'rgba(179, 71, 255, 0.2)',
                    border: '1px solid rgba(179, 71, 255, 0.4)',
                  }}
                >
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: '#b347ff' }} />
                </div>
                <div className="text-3xl sm:text-4xl font-bold mb-1 sm:mb-2 font-mono" style={{ color: '#b347ff' }}>
                  {isConnected ? prizeService.formatPrizeAmountUSD(totalPrizeAmount, 100) : '$0.00'}
                </div>
                <p className="text-xs text-zinc-400 font-mono uppercase">
                  PRIZE REWARDS {isConnected && userPrizes.length > 0 && `(${userPrizes.filter(p => !p.claimed).length} UNCLAIMED)`}
                </p>
              </div>
            </motion.div>

            {/* Card 4 - Level */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...transition30fps, delay: 0.4 }}
              whileHover={{ scale: 1.02, transition: transition30fps }}
              className="relative"
            >
              <div
                className="p-4 sm:p-6 rounded-xl border-2 flex flex-col items-center justify-center text-center"
                style={{
                  background: affiliateLevel === 1 ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(10, 20, 40, 0.95))' : affiliateLevel === 2 ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(20, 0, 10, 0.95))' : affiliateLevel === 3 ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(0, 20, 20, 0.95))' : 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(20, 0, 30, 0.95))',
                  borderColor: affiliateLevel === 1 ? '#3b82f6' : affiliateLevel === 2 ? '#ff1493' : affiliateLevel === 3 ? '#2fffea' : '#a855f7',
                  boxShadow: affiliateLevel === 1 ? '0 0 20px rgba(59, 130, 246, 0.3)' : affiliateLevel === 2 ? '0 0 20px rgba(255, 20, 147, 0.3)' : affiliateLevel === 3 ? '0 0 20px rgba(47, 255, 234, 0.3)' : '0 0 20px rgba(168, 85, 247, 0.3)',
                }}
              >
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg mb-3 sm:mb-4 flex items-center justify-center"
                  style={{
                    background: affiliateLevel === 1 ? 'rgba(59, 130, 246, 0.2)' : affiliateLevel === 2 ? 'rgba(255, 20, 147, 0.2)' : affiliateLevel === 3 ? 'rgba(47, 255, 234, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                    border: affiliateLevel === 1 ? '1px solid rgba(59, 130, 246, 0.4)' : affiliateLevel === 2 ? '1px solid rgba(255, 20, 147, 0.4)' : affiliateLevel === 3 ? '1px solid rgba(47, 255, 234, 0.4)' : '1px solid rgba(168, 85, 247, 0.4)',
                  }}
                >
                  <Zap className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: isConnected && affiliateLevel === 1 ? '#3b82f6' : isConnected && affiliateLevel === 2 ? '#ff1493' : isConnected && affiliateLevel === 3 ? '#2fffea' : isConnected && affiliateLevel === 4 ? '#a855f7' : '#3b82f6' }} />
                </div>
                <div className="text-3xl sm:text-4xl font-bold mb-1 sm:mb-2 font-mono" style={{ color: isConnected && affiliateLevel === 1 ? '#3b82f6' : isConnected && affiliateLevel === 2 ? '#ff1493' : isConnected && affiliateLevel === 3 ? '#2fffea' : isConnected && affiliateLevel === 4 ? '#a855f7' : '#3b82f6' }}>
                  LVL_0{isConnected ? affiliateLevel : 1}
                </div>
                <p className="text-xs text-zinc-400 font-mono uppercase">
                  ACCOUNT LEVEL
                </p>
              </div>
            </motion.div>
          </div>

          {/* Two Column Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
            {/* Wallet Connection */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...transition30fps, delay: 0.5 }}
              className="relative"
            >
              <div
                className="p-4 sm:p-6 md:p-8 rounded-xl border-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(0, 10, 20, 0.95))',
                  borderColor: '#00bfff',
                  boxShadow: '0 0 20px rgba(0, 191, 255, 0.3)',
                }}
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="px-2 sm:px-3 py-0.5 sm:py-1 rounded font-mono text-xs font-bold"
                    style={{
                      background: 'rgba(0, 191, 255, 0.3)',
                      border: '1px solid rgba(0, 191, 255, 0.5)',
                      color: '#00bfff',
                    }}
                  >
                    [WALLET_SYS]
                  </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'rgba(0, 191, 255, 0.2)',
                      border: '1px solid rgba(0, 191, 255, 0.4)',
                    }}
                  >
                    <Wallet className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#00bfff' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-mono font-bold text-sm sm:text-base md:text-lg" style={{ color: '#fff' }}>
                      WALLET_CONNECTION
                    </h3>
                    <p className="font-mono text-xs hidden sm:block" style={{ color: '#00bfff' }}>
                      CONNECTED_01/10/2025
                    </p>
                  </div>
                  <motion.button
                    onClick={handleCopyWallet}
                    className="p-1.5 sm:p-2 rounded-lg"
                    style={{
                      background: 'rgba(0, 191, 255, 0.2)',
                      border: '1px solid rgba(0, 191, 255, 0.4)',
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={transition30fps}
                  >
                    <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#00bfff' }} />
                  </motion.button>
                </div>
                <div
                  className="p-2 sm:p-3 rounded-lg font-mono text-xs break-all mb-3 sm:mb-4"
                  style={{
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '1px solid rgba(0, 191, 255, 0.3)',
                    color: '#00bfff',
                  }}
                >
                  {user.publicKey || 'NOT_CONNECTED - CONNECT_WALLET_TO_VIEW'}
                </div>

                <motion.button
                  onClick={handleDisconnectWallet}
                  className="w-full py-2 sm:py-3 rounded-lg font-mono text-xs sm:text-sm font-bold"
                  style={{
                    background: isConnected ? 'rgba(255, 20, 147, 0.2)' : 'rgba(0, 255, 136, 0.2)',
                    border: isConnected ? '1px solid rgba(255, 20, 147, 0.4)' : '1px solid rgba(0, 255, 136, 0.4)',
                    color: isConnected ? '#ff1493' : '#00ff88',
                  }}
                  whileHover={{
                    background: isConnected ? 'rgba(255, 20, 147, 0.3)' : 'rgba(0, 255, 136, 0.3)',
                    scale: 1.02
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={transition30fps}
                >
                  {isConnected ? '[+] DISCONNECT_WALLET' : '[+] CONNECT_WALLET'}
                </motion.button>
              </div>

              {/* Affiliate Rewards Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...transition30fps, delay: 0.6 }}
                className="mt-4 sm:mt-6"
              >
                <div
                  className="p-3 sm:p-6 rounded-xl border-2"
                  style={{
                    background: affiliateLevel === 1 ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(10, 20, 40, 0.95))' : affiliateLevel === 2 ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(20, 0, 10, 0.95))' : affiliateLevel === 3 ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(0, 20, 20, 0.95))' : 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(20, 0, 30, 0.95))',
                    borderColor: affiliateLevel === 1 ? '#3b82f6' : affiliateLevel === 2 ? '#ff1493' : affiliateLevel === 3 ? '#2fffea' : '#a855f7',
                    boxShadow: affiliateLevel === 1 ? '0 0 20px rgba(59, 130, 246, 0.3)' : affiliateLevel === 2 ? '0 0 20px rgba(255, 20, 147, 0.3)' : affiliateLevel === 3 ? '0 0 20px rgba(47, 255, 234, 0.3)' : '0 0 20px rgba(168, 85, 247, 0.3)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="px-2 py-0.5 rounded font-mono text-xs font-bold"
                      style={{
                        background: affiliateLevel === 1 ? 'rgba(59, 130, 246, 0.3)' : affiliateLevel === 2 ? 'rgba(255, 20, 147, 0.3)' : affiliateLevel === 3 ? 'rgba(47, 255, 234, 0.3)' : 'rgba(168, 85, 247, 0.3)',
                        border: affiliateLevel === 1 ? '1px solid rgba(59, 130, 246, 0.5)' : affiliateLevel === 2 ? '1px solid rgba(255, 20, 147, 0.5)' : affiliateLevel === 3 ? '1px solid rgba(47, 255, 234, 0.5)' : '1px solid rgba(168, 85, 247, 0.5)',
                        color: affiliateLevel === 1 ? '#3b82f6' : affiliateLevel === 2 ? '#ff1493' : affiliateLevel === 3 ? '#2fffea' : '#a855f7',
                      }}
                    >
                      [AFFILIATE_REWARDS]
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                    <div
                      className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center"
                      style={{
                        background: affiliateLevel === 1 ? 'rgba(59, 130, 246, 0.2)' : affiliateLevel === 2 ? 'rgba(255, 20, 147, 0.2)' : affiliateLevel === 3 ? 'rgba(47, 255, 234, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                        border: affiliateLevel === 1 ? '1px solid rgba(59, 130, 246, 0.4)' : affiliateLevel === 2 ? '1px solid rgba(255, 20, 147, 0.4)' : affiliateLevel === 3 ? '1px solid rgba(47, 255, 234, 0.4)' : '1px solid rgba(168, 85, 247, 0.4)',
                      }}
                    >
                      <Gift className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: affiliateLevel === 1 ? '#3b82f6' : affiliateLevel === 2 ? '#ff1493' : affiliateLevel === 3 ? '#2fffea' : '#a855f7' }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-mono font-bold text-xs sm:text-base" style={{ color: '#fff' }}>
                        {affiliateTierLabel.toUpperCase()} ({(commissionRate * 100).toFixed(0)}%)
                      </h3>
                      <p className="font-mono text-[10px] sm:text-xs" style={{ color: affiliateLevel === 1 ? '#3b82f6' : affiliateLevel === 2 ? '#ff1493' : affiliateLevel === 3 ? '#2fffea' : '#a855f7' }}>
                        {validReferrals} VALID REFERRALS
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar or Max Level */}
                  {affiliateLevel < 4 ? (
                    <div className="mb-3 sm:mb-4">
                      <div className="flex justify-between font-mono text-[10px] sm:text-xs mb-1.5 sm:mb-2" style={{ color: affiliateLevel === 1 ? '#3b82f6' : affiliateLevel === 2 ? '#ff1493' : '#2fffea' }}>
                        <span>PROGRESS TO LEVEL {affiliateLevel + 1}</span>
                        <span>{validReferrals}/{getNextLevelReferrals()}</span>
                      </div>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{
                          background: 'rgba(0, 0, 0, 0.6)',
                          border: affiliateLevel === 1 ? '1px solid rgba(59, 130, 246, 0.3)' : affiliateLevel === 2 ? '1px solid rgba(255, 20, 147, 0.3)' : '1px solid rgba(47, 255, 234, 0.3)',
                        }}
                      >
                        <motion.div
                          className="h-full"
                          style={{
                            background: affiliateLevel === 1 ? 'linear-gradient(90deg, #1e3a8a, #3b82f6)' : affiliateLevel === 2 ? 'linear-gradient(90deg, #ff1493, #ff69b4)' : 'linear-gradient(90deg, #00bfff, #2fffea)',
                            boxShadow: affiliateLevel === 1 ? '0 0 10px rgba(30, 58, 138, 0.5)' : affiliateLevel === 2 ? '0 0 10px rgba(255, 20, 147, 0.5)' : '0 0 10px rgba(47, 255, 234, 0.5)',
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${getLevelProgress()}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3 sm:mb-4 text-center">
                      <div className="py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-mono text-xs sm:text-sm font-bold" style={{
                        background: 'rgba(168, 85, 247, 0.2)',
                        border: '1px solid rgba(168, 85, 247, 0.5)',
                        color: '#a855f7',
                        boxShadow: '0 0 15px rgba(168, 85, 247, 0.3)'
                      }}>
                        👑 MAX LEVEL ACHIEVED 👑
                      </div>
                    </div>
                  )}

                  {/* Rewards Amount */}
                  <div
                    className="p-2 sm:p-3 rounded-lg mb-3 sm:mb-4 flex items-center justify-between"
                    style={{
                      background: 'rgba(0, 0, 0, 0.6)',
                      border: affiliateLevel === 1 ? '1px solid rgba(59, 130, 246, 0.3)' : affiliateLevel === 2 ? '1px solid rgba(255, 20, 147, 0.3)' : affiliateLevel === 3 ? '1px solid rgba(47, 255, 234, 0.3)' : '1px solid rgba(168, 85, 247, 0.3)',
                    }}
                  >
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: affiliateLevel === 1 ? '#3b82f6' : affiliateLevel === 2 ? '#ff1493' : affiliateLevel === 3 ? '#2fffea' : '#a855f7' }} />
                      <span className="font-mono text-[10px] sm:text-xs" style={{ color: affiliateLevel === 1 ? '#3b82f6' : affiliateLevel === 2 ? '#ff1493' : affiliateLevel === 3 ? '#2fffea' : '#a855f7' }}>CLAIMABLE</span>
                    </div>
                    <span className="font-mono font-bold text-base sm:text-lg" style={{ color: affiliateLevel === 1 ? '#3b82f6' : affiliateLevel === 2 ? '#ff1493' : affiliateLevel === 3 ? '#2fffea' : '#a855f7' }}>
                      {affiliateRewardsSOL.toFixed(4)} SOL
                    </span>
                  </div>

                  {/* Claim Button */}
                  <motion.button
                    onClick={handleClaimAffiliate}
                    disabled={claimingAffiliate || affiliateRewardsLamports === 0}
                    className="w-full py-2.5 sm:py-3 rounded-lg font-mono text-xs sm:text-sm font-bold relative overflow-hidden"
                    style={{
                      background: affiliateRewardsLamports > 0
                        ? (affiliateLevel === 1 ? 'linear-gradient(135deg, #1e3a8a, #3b82f6)' : affiliateLevel === 2 ? 'linear-gradient(135deg, #ff1493, #ff69b4)' : affiliateLevel === 3 ? 'linear-gradient(135deg, #00bfff, #2fffea)' : 'linear-gradient(135deg, #9333ea, #a855f7)')
                        : 'rgba(100, 100, 100, 0.3)',
                      border: affiliateRewardsLamports > 0
                        ? (affiliateLevel === 1 ? '2px solid #3b82f6' : affiliateLevel === 2 ? '2px solid #ff1493' : affiliateLevel === 3 ? '2px solid #2fffea' : '2px solid #a855f7')
                        : '1px solid rgba(100, 100, 100, 0.5)',
                      color: affiliateRewardsLamports > 0 ? '#fff' : '#666',
                      boxShadow: affiliateRewardsLamports > 0
                        ? (affiliateLevel === 1 ? '0 0 20px rgba(59, 130, 246, 0.4)' : affiliateLevel === 2 ? '0 0 20px rgba(255, 20, 147, 0.4)' : affiliateLevel === 3 ? '0 0 20px rgba(47, 255, 234, 0.4)' : '0 0 20px rgba(168, 85, 247, 0.4)')
                        : 'none',
                      cursor: affiliateRewardsLamports > 0 ? 'pointer' : 'not-allowed',
                    }}
                    whileHover={affiliateRewardsLamports > 0 ? {
                      scale: 1.02,
                      boxShadow: affiliateLevel === 1 ? '0 0 30px rgba(59, 130, 246, 0.6)' : affiliateLevel === 2 ? '0 0 30px rgba(255, 20, 147, 0.6)' : affiliateLevel === 3 ? '0 0 30px rgba(47, 255, 234, 0.6)' : '0 0 30px rgba(168, 85, 247, 0.6)',
                    } : {}}
                    whileTap={affiliateRewardsLamports > 0 ? { scale: 0.98 } : {}}
                    transition={transition30fps}
                  >
                    {claimingAffiliate ? (
                      <span className="flex items-center justify-center space-x-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Zap className="w-4 h-4" />
                        </motion.div>
                        <span>CLAIMING...</span>
                      </span>
                    ) : (
                      '[+] CLAIM REWARDS'
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>

            {/* User Configuration */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...transition30fps, delay: 0.5 }}
              className="relative"
            >
              <div
                className="p-4 sm:p-6 md:p-8 rounded-xl border-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(10, 0, 20, 0.95))',
                  borderColor: '#b347ff',
                  boxShadow: '0 0 20px rgba(179, 71, 255, 0.3)',
                }}
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="px-2 sm:px-3 py-0.5 sm:py-1 rounded font-mono text-xs font-bold"
                    style={{
                      background: 'rgba(179, 71, 255, 0.3)',
                      border: '1px solid rgba(179, 71, 255, 0.5)',
                      color: '#b347ff',
                    }}
                  >
                    [CONFIG_SYS]
                  </div>
                  <div className="px-2 sm:px-3 py-0.5 sm:py-1 rounded font-mono text-xs font-bold"
                    style={{
                      background: 'rgba(179, 71, 255, 0.3)',
                      border: '1px solid rgba(179, 71, 255, 0.5)',
                      color: '#b347ff',
                    }}
                  >
                    [EDITABLE]
                  </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'rgba(179, 71, 255, 0.2)',
                      border: '1px solid rgba(179, 71, 255, 0.4)',
                    }}
                  >
                    <Settings className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#b347ff' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-mono font-bold text-sm sm:text-base md:text-lg" style={{ color: '#fff' }}>
                      USER_CONFIGURATION
                    </h3>
                    <p className="font-mono text-xs hidden sm:block" style={{ color: '#b347ff' }}>
                      PROFILE_SETTINGS_V1.0
                    </p>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block font-mono text-xs mb-2 uppercase" style={{ color: '#fff' }}>
                      DISPLAY_NAME:
                    </label>
                    <input
                      type="text"
                      value={personalInfo.displayName}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, displayName: e.target.value })}
                      className="w-full p-2 sm:p-3 rounded-lg font-mono text-xs sm:text-sm"
                      style={{
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(179, 71, 255, 0.3)',
                        color: '#ff1493',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs mb-2 uppercase" style={{ color: '#fff' }}>
                      EMAIL_ADDRESS:
                    </label>
                    <input
                      type="email"
                      value={personalInfo.email}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                      className="w-full p-2 sm:p-3 rounded-lg font-mono text-xs sm:text-sm"
                      style={{
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(179, 71, 255, 0.3)',
                        color: '#ff1493',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs mb-2 uppercase" style={{ color: '#fff' }}>
                      LOCATION:
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#b347ff' }} />
                      <input
                        type="text"
                        value={personalInfo.location}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, location: e.target.value })}
                        className="w-full p-2 sm:p-3 pl-9 sm:pl-10 rounded-lg font-mono text-xs sm:text-sm"
                        style={{
                          background: 'rgba(0, 0, 0, 0.6)',
                          border: '1px solid rgba(179, 71, 255, 0.3)',
                          color: '#ff1493',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-xs mb-2 uppercase" style={{ color: '#fff' }}>
                      NOTIFICATIONS:
                    </label>
                    <div
                      className="flex items-center justify-between p-2 sm:p-3 rounded-lg"
                      style={{
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: `1px solid ${notificationsEnabled ? 'rgba(0, 255, 136, 0.3)' : 'rgba(179, 71, 255, 0.3)'}`,
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        {notificationsEnabled ? (
                          <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#00ff88' }} />
                        ) : (
                          <BellOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#b347ff' }} />
                        )}
                        <div>
                          <span className="font-mono text-xs sm:text-sm block" style={{ color: '#fff' }}>
                            PUSH_NOTIFICATIONS
                          </span>
                          <span className="font-mono text-[10px] block" style={{ color: notificationsEnabled ? '#00ff88' : '#888' }}>
                            {notificationsEnabled ? 'Ativo - receba alertas de premios' : 'Desativado'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (togglingNotifications) return;
                          setTogglingNotifications(true);
                          try {
                            if (notificationsEnabled) {
                              disableNotifications();
                            } else {
                              await enableNotifications();
                            }
                          } finally {
                            setTogglingNotifications(false);
                          }
                        }}
                        disabled={togglingNotifications}
                        className="relative w-12 h-6 rounded-full transition-all duration-300"
                        style={{
                          background: notificationsEnabled ? '#00ff88' : 'rgba(100, 100, 100, 0.5)',
                        }}
                      >
                        <motion.div
                          className="absolute top-1 w-4 h-4 rounded-full bg-white flex items-center justify-center"
                          animate={{
                            left: notificationsEnabled ? '26px' : '4px'
                          }}
                          transition={transition30fps}
                        >
                          {togglingNotifications ? (
                            <motion.div
                              className="w-2 h-2 border border-zinc-400 border-t-transparent rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                            />
                          ) : notificationsEnabled ? (
                            <Check className="w-2.5 h-2.5 text-emerald-500" />
                          ) : null}
                        </motion.div>
                      </button>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={savingConfig || !isConnected}
                    className="w-full p-3 rounded-lg font-mono text-sm font-bold uppercase tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, rgba(179, 71, 255, 0.8), rgba(179, 71, 255, 0.6))',
                      border: '1px solid #b347ff',
                      color: '#fff',
                      boxShadow: '0 0 20px rgba(179, 71, 255, 0.3)',
                    }}
                    onClick={saveUserProfile}
                  >
                    {savingConfig ? 'Salvando...' : 'Save Changes'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Tickets Modal */}
      <AnimatePresence>
        {showTicketsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.85)' }}
            onClick={() => setShowTicketsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={transition30fps}
              className="w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-2xl border-2"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(0, 20, 10, 0.95))',
                borderColor: '#00ff88',
                boxShadow: '0 0 40px rgba(0, 255, 136, 0.4)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                className="flex items-center justify-between p-4 sm:p-6 border-b"
                style={{ borderColor: 'rgba(0, 255, 136, 0.2)' }}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'rgba(0, 255, 136, 0.2)',
                      border: '1px solid rgba(0, 255, 136, 0.4)',
                    }}
                  >
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#00ff88' }} />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold font-mono" style={{ color: '#00ff88' }}>
                      MY TICKETS
                    </h2>
                    <p className="text-xs sm:text-sm font-mono text-zinc-400">
                      Total: {totalTickets} tickets
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTicketsModal(false)}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: 'rgba(255, 20, 147, 0.2)',
                    border: '1px solid rgba(255, 20, 147, 0.4)',
                    color: '#ff1493',
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-4 sm:p-6">
                <div className="space-y-6">
                  {!isConnected ? (
                    <div className="text-center py-12">
                      <Wallet className="w-16 h-16 mx-auto mb-4" style={{ color: '#00ff88' }} />
                      <p className="font-mono text-lg" style={{ color: '#00ff88' }}>
                        Connect your wallet to view tickets
                      </p>
                    </div>
                  ) : userTickets.length === 0 ? (
                    <div className="text-center py-12">
                      <Ticket className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                      <p className="font-mono text-lg text-zinc-400">
                        No tickets purchased yet
                      </p>
                    </div>
                  ) : (
                    userTickets.map((lotteryGroup, index) => (
                    <motion.div
                      key={lotteryGroup.lottery}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...transition30fps, delay: index * 0.1 }}
                    >
                      {/* Lottery Title */}
                      <div
                        className="flex items-center space-x-2 mb-3 pb-2 border-b"
                        style={{ borderColor: `${lotteryGroup.color}33` }}
                      >
                        <Ticket className="w-4 h-4" style={{ color: lotteryGroup.color }} />
                        <h3 className="font-mono text-sm sm:text-base font-bold uppercase" style={{ color: lotteryGroup.color }}>
                          {lotteryGroup.lottery}
                        </h3>
                        <span className="text-xs font-mono text-zinc-400">
                          ({lotteryGroup.tickets.length} tickets)
                        </span>
                      </div>

                      {/* Tickets Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {lotteryGroup.tickets.map((ticket) => (
                          <motion.div
                            key={ticket.id}
                            whileHover={{ scale: 1.02 }}
                            className="p-3 sm:p-4 rounded-lg border"
                            style={{
                              background: 'rgba(0, 0, 0, 0.6)',
                              borderColor: `${lotteryGroup.color}4d`,
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-lg sm:text-xl font-bold font-mono" style={{ color: lotteryGroup.color }}>
                                #{ticket.number}
                              </span>
                              <div
                                className="px-2 py-1 rounded text-xs font-mono"
                                style={{
                                  background: `${lotteryGroup.color}33`,
                                  border: `1px solid ${lotteryGroup.color}66`,
                                  color: lotteryGroup.color,
                                }}
                              >
                                ACTIVE
                              </div>
                            </div>
                            <div className="space-y-1 text-xs font-mono text-zinc-400">
                              <div>Purchased: {ticket.purchaseDate}</div>
                              <div>Draw Date: {ticket.drawDate}</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rewards Modal */}
      <AnimatePresence>
        {showRewardsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRewardsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl rounded-2xl border-2 relative max-h-[85vh] flex flex-col"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(10, 0, 20, 0.95))',
                borderColor: '#b347ff',
                boxShadow: '0 0 40px rgba(179, 71, 255, 0.4)',
              }}
            >
              {/* Modal Header */}
              <div
                className="p-4 sm:p-6 border-b flex items-center justify-between"
                style={{ borderColor: 'rgba(179, 71, 255, 0.3)' }}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'rgba(179, 71, 255, 0.2)',
                      border: '1px solid rgba(179, 71, 255, 0.4)',
                    }}
                  >
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#b347ff' }} />
                  </div>
                  <div>
                    <h2 className="font-mono font-bold text-lg sm:text-xl" style={{ color: '#b347ff' }}>
                      MY REWARDS
                    </h2>
                    <p className="text-xs font-mono text-zinc-400">
                      Total won: {prizeService.formatPrizeAmountUSD(totalPrizeAmount, 100)}
                    </p>
                  </div>
                </div>
                <motion.button
                  onClick={() => setShowRewardsModal(false)}
                  className="p-2 rounded-lg"
                  style={{
                    background: 'rgba(179, 71, 255, 0.2)',
                    border: '1px solid rgba(179, 71, 255, 0.4)',
                  }}
                  whileHover={{ scale: 1.1, background: 'rgba(179, 71, 255, 0.3)' }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" style={{ color: '#b347ff' }} />
                </motion.button>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-4 sm:p-6">
                {loadingPrizes ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#b347ff' }}></div>
                    <p className="font-mono text-sm text-zinc-400">Loading prizes...</p>
                  </div>
                ) : !isConnected ? (
                  <div className="text-center py-12">
                    <Wallet className="w-16 h-16 mx-auto mb-4" style={{ color: '#b347ff' }} />
                    <p className="font-mono text-lg" style={{ color: '#b347ff' }}>
                      Connect your wallet to view prizes
                    </p>
                  </div>
                ) : userPrizes.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                    <p className="font-mono text-lg text-zinc-400">
                      No prizes won yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userPrizes.map((prize, index) => {
                      const lotteryColors: Record<string, string> = {
                        'tri-daily': '#ff1493',
                        'special-event': '#ff8c00',
                        'halloween': '#ff8c00',
                        'jackpot': '#00bfff',
                        'grand-prize': '#9ca3af',
                      };
                      const color = lotteryColors[prize.lottery_type] || '#b347ff';

                      return (
                        <motion.div
                          key={prize.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...transition30fps, delay: index * 0.05 }}
                          whileHover={{ scale: 1.02 }}
                          className="p-4 sm:p-5 rounded-lg border"
                          style={{
                            background: 'rgba(0, 0, 0, 0.6)',
                            borderColor: `${color}4d`,
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="text-xl sm:text-2xl font-bold font-mono" style={{ color }}>
                                #{prize.ticket_number}
                              </span>
                              <p className="text-xs font-mono text-zinc-400 mt-1">
                                {prize.lottery_type.toUpperCase().replace('-', ' ')}
                              </p>
                            </div>
                            <div
                              className="px-3 py-1.5 rounded text-xs font-mono font-bold"
                              style={{
                                background: prize.claimed ? 'rgba(34, 197, 94, 0.2)' : `${color}33`,
                                border: prize.claimed ? '1px solid rgba(34, 197, 94, 0.4)' : `1px solid ${color}66`,
                                color: prize.claimed ? '#22c55e' : color,
                              }}
                            >
                              {prize.claimed ? 'CLAIMED' : prize.prize_position}
                            </div>
                          </div>

                          <div className="mb-3">
                            <div className="text-2xl sm:text-3xl font-bold font-mono mb-1" style={{ color }}>
                              {prizeService.formatPrizeAmount(prize.prize_amount_lamports)}
                            </div>
                            <div className="text-sm font-mono text-zinc-400">
                              ≈ {prizeService.formatPrizeAmountUSD(prize.prize_amount_lamports, 100)}
                            </div>
                          </div>

                          <div className="space-y-1 text-xs font-mono text-zinc-400 mb-4">
                            <div>Draw Date: {new Date(prize.draw_date).toLocaleDateString()}</div>
                            <div>Round: #{prize.round}</div>
                            {prize.claimed_at && (
                              <div className="text-green-400">
                                Claimed: {new Date(prize.claimed_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>

                          {!prize.claimed && (
                            <motion.button
                              onClick={() => handleClaimPrize(prize.id)}
                              disabled={claimingPrize === prize.id}
                              className="w-full py-2.5 rounded-lg font-mono text-sm font-bold"
                              style={{
                                background: claimingPrize === prize.id ? 'rgba(156, 163, 175, 0.2)' : `${color}33`,
                                border: claimingPrize === prize.id ? '1px solid rgba(156, 163, 175, 0.4)' : `1px solid ${color}66`,
                                color: claimingPrize === prize.id ? '#9ca3af' : color,
                              }}
                              whileHover={claimingPrize === prize.id ? {} : {
                                scale: 1.05,
                                background: `${color}4d`,
                              }}
                              whileTap={claimingPrize === prize.id ? {} : { scale: 0.95 }}
                              transition={transition30fps}
                            >
                              {claimingPrize === prize.id ? 'CLAIMING...' : 'CLAIM REWARD'}
                            </motion.button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
