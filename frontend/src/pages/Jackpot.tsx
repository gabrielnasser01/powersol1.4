import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Coins, Plus, Minus, Loader, Calendar, Users, TrendingUp, X, Zap, Shield, Crown } from 'lucide-react';
import { theme } from '../theme';
import { useNavigate, useLocation } from 'react-router-dom';
import { chainAdapter, formatSol, formatUsd, solToUsd, JACKPOT_TICKET_PRICE_SOL, LAMPORTS_PER_SOL, HOUSE_COMMISSION_RATE } from '../chain/adapter';
import { ticketsStorage } from '../store/ticketStorage';
import { useMagnetic } from '../hooks/useMagnetic';
import { WinnersDisplay } from '../components/WinnersDisplay';
import { useWallet } from '../contexts/WalletContext';
import { solanaService } from '../services/solanaService';
import { supabase } from '../lib/supabase';

export function Jackpot() {
  const navigate = useNavigate();
  const location = useLocation();
  const { publicKey, connected, balance, getWalletAdapter, refreshBalance } = useWallet();

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');
  const [globalPool, setGlobalPool] = useState({ prizePoolSol: 0, prizePoolUsd: 0, ticketCount: 0 });
  const [liveContributors, setLiveContributors] = useState(0);
  const [liveGrowthRate, setLiveGrowthRate] = useState(0);
  const [liveDaysLeft, setLiveDaysLeft] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const depositButtonRef = useRef<HTMLButtonElement>(null);

  useMagnetic(buttonRef);
  useMagnetic(depositButtonRef);

  useEffect(() => {
    const loadGlobalPool = async () => {
      try {
        const globalState = await chainAdapter.getGlobalPoolState();
        setGlobalPool(globalState);
      } catch (error) {
        console.error('Failed to load global pool state:', error);
      }
    };

    loadGlobalPool();
    const interval = setInterval(loadGlobalPool, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchLotteryStats = async () => {
      try {
        const { data } = await supabase.rpc('get_lottery_public_stats', { p_lottery_type: 'jackpot' });
        if (data) {
          setLiveContributors(data.contributors);
          setLiveGrowthRate(data.growth_rate);
          setLiveDaysLeft(data.days_left);
        }
      } catch (err) {
        console.error('Failed to fetch jackpot stats:', err);
      }
    };
    fetchLotteryStats();
  }, []);

  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const totalSol = JACKPOT_TICKET_PRICE_SOL * depositAmount;
  const totalUsd = solToUsd(totalSol);

  const banners = [
    {
      id: 1,
      icon: Zap,
      title: 'POWER BOOST',
      subtitle: 'System Enhanced',
      color: '#FFD700',
      gradient: `linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 193, 7, 0.2))`,
      onClick: () => navigate('/specialevent'),
      path: '/specialevent',
    },
    {
      id: 2,
      icon: Shield,
      title: 'SECURE PLAY',
      subtitle: 'Protected Mode',
      color: theme.colors.neonPink,
      gradient: `linear-gradient(135deg, ${theme.colors.neonPink}20, ${theme.colors.neonPurple}20)`,
      onClick: () => navigate('/lottery'),
      path: '/lottery',
    },
    {
      id: 3,
      icon: Trophy,
      title: 'WIN BIG',
      subtitle: 'Jackpot Ready',
      color: theme.colors.neonCyan,
      gradient: `linear-gradient(135deg, ${theme.colors.neonCyan}20, ${theme.colors.neonBlue}20)`,
      onClick: () => navigate('/jackpot'),
      path: '/jackpot',
    },
    {
      id: 4,
      icon: Crown,
      title: 'GRAND PRIZE',
      subtitle: 'Annual Event',
      color: '#ffffff',
      gradient: `linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(233, 236, 239, 0.2))`,
      onClick: () => navigate('/grandprize'),
      path: '/grandprize',
    },
  ];

  const handleQuantityChange = (delta: number) => {
    setDepositAmount(Math.max(1, Math.min(1000, depositAmount + delta)));
  };

  const handleDeposit = async () => {
    if (!connected || !publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    if (balance < totalSol) {
      setError(`Insufficient SOL balance. You need ${totalSol.toFixed(2)} SOL but only have ${balance.toFixed(4)} SOL.`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const wallet = getWalletAdapter();

      if (!wallet) {
        setError('Wallet adapter not available. Please reconnect your wallet.');
        return;
      }

      const result = await solanaService.purchaseTicketsWithWallet(
        wallet,
        depositAmount,
        JACKPOT_TICKET_PRICE_SOL,
        'jackpot'
      );
      const signature = result.signature;

      setTxId(signature);

      const { data: currentLottery } = await supabase
        .from('blockchain_lotteries')
        .select('lottery_id')
        .eq('lottery_type', 'jackpot')
        .eq('is_drawn', false)
        .order('draw_timestamp', { ascending: true })
        .limit(1)
        .maybeSingle();

      const roundId = currentLottery?.lottery_id || null;

      const { data: purchaseData, error: purchaseError } = await supabase.from('ticket_purchases').insert({
        wallet_address: publicKey,
        lottery_type: 'jackpot',
        quantity: depositAmount,
        total_sol: totalSol,
        transaction_signature: signature,
        lottery_round_id: roundId,
      }).select('id').maybeSingle();

      if (purchaseError) {
        console.error('Failed to save ticket purchase:', purchaseError);
      }

      if (purchaseData) {
        const houseEarningsLamports = Math.floor(totalSol * LAMPORTS_PER_SOL * HOUSE_COMMISSION_RATE);
        await supabase.from('house_earnings').insert({
          ticket_purchase_id: purchaseData.id,
          wallet_address: publicKey,
          lottery_type: 'jackpot',
          amount_lamports: houseEarningsLamports,
          transaction_signature: signature,
        });
      }

      await ticketsStorage.add(depositAmount, 'jackpot', roundId || undefined);

      window.dispatchEvent(new CustomEvent('ticketsPurchased', {
        detail: { quantity: depositAmount, signature }
      }));

      if (wallet) {
        await refreshBalance();
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Purchase failed';
      setError(message);
      console.error('Purchase failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    { label: 'Current Jackpot', value: `$${globalPool.prizePoolUsd.toLocaleString()}`, icon: Trophy, color: '#0099ff' },
    { label: 'Contributors', value: liveContributors.toLocaleString(), icon: Users, color: '#00ccff' },
    { label: 'Days Left', value: (liveDaysLeft || daysLeft).toString(), icon: Calendar, color: '#0066ff' },
    { label: 'Growth Rate', value: `${liveGrowthRate >= 0 ? '+' : ''}${liveGrowthRate}%`, icon: TrendingUp, color: '#3399ff' },
  ];

  return (
    <div className="min-h-screen pt-20 pb-20 relative overflow-hidden">
      {/* Blue Matrix Background */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(0deg, rgba(0, 153, 255, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 153, 255, 0.08) 1px, transparent 1px),
              linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(0, 20, 40, 0.95) 100%)
            `,
            backgroundSize: '20px 20px, 20px 20px, 100% 100%',
          }}
        />
        
        {/* Blue scanner effect */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0, 153, 255, 0.02) 2px,
                rgba(0, 153, 255, 0.02) 4px
              )
            `,
            animation: 'blueTerminalScan 4s linear infinite',
          }}
        />
        
        <style jsx>{`
          @keyframes blueTerminalScan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
          }
        `}</style>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Terminal corner decorations - Desktop */}
        <div className="absolute top-24 left-6 text-xs font-mono text-blue-500/40 hidden sm:block">
          [SYSTEM_ACTIVE]
        </div>
        <div className="absolute top-24 right-6 text-xs font-mono text-blue-500/40 hidden sm:block">
          [JACKPOT_MODULE]
        </div>
        
        {/* Mobile terminal indicators */}
        <div className="block sm:hidden text-center pt-4 pb-2">
          <div className="flex justify-center space-x-4 text-xs font-mono text-blue-500/80">
            <span>[SYSTEM_ACTIVE]</span>
            <span>[JACKPOT_MODULE]</span>
          </div>
        </div>
        
        {/* Banners Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-2 md:flex md:flex-row justify-center items-start gap-4 md:gap-6 mb-8 px-4 max-w-md md:max-w-none mx-auto"
        >
          {/* Banner 1 - Halloween */}
          <div className="flex flex-col items-center gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0 }}
              whileHover={{
                scale: 1.05,
                boxShadow: '0 0 30px rgba(135, 206, 250, 0.6)',
              }}
              onClick={() => navigate('/specialevent')}
              className="rounded-2xl border backdrop-blur-md cursor-pointer relative w-full md:w-[200px] h-[100px] md:h-[120px]"
              style={{
                background: 'linear-gradient(135deg, rgba(173, 216, 230, 0.35), rgba(135, 206, 250, 0.3))',
                borderColor: 'rgba(135, 206, 250, 0.5)',
                boxShadow: '0 0 20px rgba(135, 206, 250, 0.3)',
              }}
            >
              <div className="w-full h-full flex items-center justify-center p-2">
                <img
                  src="https://i.imgur.com/484ahmV.png"
                  alt="Valentine's Day"
                  className="w-full h-full object-contain"
                />
              </div>
            </motion.div>
            <div className="text-center">
              <h3 className="text-sm md:text-lg font-bold text-sky-300">Special Event</h3>
              <p className="text-xs md:text-sm text-sky-300/80">0.2 SOL</p>
            </div>
          </div>

          {/* Banner 2 - Secure Play */}
          <div className="flex flex-col items-center gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{
                scale: 1.05,
                boxShadow: `0 0 30px ${theme.colors.neonPink}60`,
              }}
              onClick={() => navigate('/lottery')}
              className="rounded-2xl border backdrop-blur-md cursor-pointer w-full md:w-[200px] h-[100px] md:h-[120px]"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.neonPink}20, ${theme.colors.neonPurple}20)`,
                borderColor: `${theme.colors.neonPink}40`,
                boxShadow: `0 0 20px ${theme.colors.neonPink}30`,
              }}
            >
              <div className="w-full h-full flex items-center justify-center p-2">
                <img
                  src="https://i.imgur.com/5MEQvFp.png"
                  alt="Lottery"
                  className="w-full h-full object-contain"
                />
              </div>
            </motion.div>
            <div className="text-center">
              <h3 className="text-sm md:text-lg font-bold" style={{ color: theme.colors.neonPink }}>Tri-Daily Lottery</h3>
              <p className="text-xs md:text-sm text-purple-300/80">0.1 SOL</p>
            </div>
          </div>

          {/* Banner 3 - Win Big */}
          <div className="flex flex-col items-center gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{
                scale: 1.05,
                boxShadow: '0 0 30px rgba(0, 153, 255, 0.6)',
              }}
              onClick={() => navigate('/jackpot')}
              className="rounded-2xl border backdrop-blur-md cursor-pointer w-full md:w-[200px] h-[100px] md:h-[120px]"
              style={{
                background: `linear-gradient(135deg, rgba(0, 153, 255, 0.3), rgba(0, 204, 255, 0.2))`,
                borderColor: `rgba(0, 153, 255, 0.8)`,
                boxShadow: `0 0 40px rgba(0, 153, 255, 0.6), inset 0 0 20px rgba(0, 153, 255, 0.2)`,
                transform: 'translateY(-2px)',
                filter: 'brightness(1.2)',
              }}
            >
              <div className="w-full h-full flex items-center justify-center p-2">
                <img
                  src="https://i.imgur.com/9O8KPGf.png"
                  alt="Jackpot"
                  className="w-full h-full object-contain"
                />
              </div>
            </motion.div>
            <div className="text-center">
              <h3 className="text-sm md:text-lg font-bold text-cyan-400">Montly Jackpot</h3>
              <p className="text-xs md:text-sm text-cyan-300/80">0.2 SOL</p>
            </div>
          </div>

          {/* Banner 4 - Grand Prize */}
          <div className="flex flex-col items-center gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              whileHover={{
                scale: 1.05,
                boxShadow: '0 0 30px rgba(248, 249, 250, 0.6)',
              }}
              onClick={() => navigate('/grandprize')}
              className="rounded-2xl border backdrop-blur-md cursor-pointer overflow-hidden w-full md:w-[200px] h-[100px] md:h-[120px]"
              style={{
                background: 'linear-gradient(135deg, rgba(248, 249, 250, 0.2), rgba(233, 236, 239, 0.2))',
                borderColor: 'rgba(248, 249, 250, 0.4)',
                boxShadow: '0 0 20px rgba(248, 249, 250, 0.3)',
              }}
            >
              <div className="w-full h-full flex items-center justify-center p-2">
                <img
                  src="https://i.imgur.com/3X540iY.png"
                  alt="Grand Prize"
                  className="w-full h-full object-contain"
                />
              </div>
            </motion.div>
            <div className="text-center">
              <h3 className="text-sm md:text-lg font-bold text-gray-200">Annual Grand Prize</h3>
              <p className="text-xs md:text-sm text-gray-300/80">0.33 SOL</p>
            </div>
          </div>
        </motion.div>
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 
            className="text-4xl md:text-6xl font-bold mb-6"
            style={{ 
              fontFamily: 'Orbitron, monospace',
              background: 'linear-gradient(135deg, #0099ff 0%, #00ccff 50%, #0066ff 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 0 40px rgba(0, 153, 255, 0.5)',
            }}
          >
            Monthly Jackpot
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Contribute to the montly jackpot and win big at the end of each month! 100 winners.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="p-6 rounded-2xl border text-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(0, 30, 60, 0.6))',
                  borderColor: stat.color,
                  boxShadow: `0 0 20px ${stat.color}20`,
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div 
                  className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}10)`,
                    border: `1px solid ${stat.color}40`,
                  }}
                >
                  <Icon className="w-8 h-8" style={{ color: stat.color }} />
                </div>
                
                <div className="text-2xl font-bold mb-1" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <p className="text-xs md:text-sm text-zinc-400">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Jackpot Progress */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <div 
            className="p-8 rounded-2xl border"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(0, 30, 60, 0.6))',
              borderColor: '#0099ff',
              boxShadow: '0 0 30px rgba(0, 153, 255, 0.3)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2" style={{ color: '#0099ff', fontFamily: 'Orbitron, monospace' }}>
                Current Jackpot Pool
              </h2>
              <div className="text-5xl font-bold mb-2" style={{ 
                color: '#ffffff',
                textShadow: '0 0 20px rgba(0, 153, 255, 0.5)'
              }}>
                <div className="flex items-center justify-center space-x-4">
                  {/* Animated dollar coin */}
                  <motion.div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #0099ff, #00ccff)',
                      boxShadow: '0 0 20px rgba(0, 153, 255, 0.6)',
                    }}
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 10, -10, 0],
                      boxShadow: [
                        '0 0 20px rgba(0, 153, 255, 0.6)',
                        '0 0 30px rgba(0, 204, 255, 0.8)',
                        '0 0 20px rgba(0, 153, 255, 0.6)',
                      ],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    $
                  </motion.div>
                  <span>${globalPool.prizePoolUsd.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2 text-xl" style={{ color: '#00ccff' }}>
                <motion.div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                >
                  <img
                    src="https://i.imgur.com/eE1m8fp.png"
                    alt="Solana Coin"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                </motion.div>
                <span>{globalPool.prizePoolSol.toFixed(2)} SOL</span>
              </div>
              
              {/* 40% indicator */}
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: '#ffffff' }}>Jackpot Pool Growth</span>
                <span style={{ color: '#0099ff' }}>${globalPool.prizePoolUsd.toLocaleString()}</span>
              </div>
              <div 
                className="w-full h-4 rounded-full overflow-hidden"
                style={{ background: 'rgba(0, 0, 0, 0.5)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #0099ff, #00ccff)',
                    boxShadow: '0 0 20px rgba(0, 153, 255, 0.5)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((globalPool.prizePoolUsd / 10000) * 100, 100)}%` }}
                  transition={{ duration: 2, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Contribute Button */}
            <div className="text-center">
              <motion.button
                ref={buttonRef}
                onClick={() => setShowDepositModal(true)}
                className="px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-3 mx-auto"
                style={{
                  background: 'linear-gradient(135deg, #0099ff, #00ccff)',
                  color: '#000',
                  boxShadow: '0 0 30px rgba(0, 153, 255, 0.5)',
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Coins className="w-6 h-6" />
                <span>Enter Jackpot</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showDepositModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 min-h-screen"
              style={{ background: 'rgba(0, 0, 0, 0.9)' }}
              onClick={() => setShowDepositModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="max-w-lg w-full p-8 rounded-2xl border relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 153, 255, 0.1), rgba(0, 204, 255, 0.08))',
                  borderColor: '#0099ff',
                  boxShadow: '0 0 50px rgba(0, 153, 255, 0.5)',
                  backdropFilter: 'blur(20px)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="absolute top-4 right-4 p-2 rounded-lg transition-all duration-300"
                  style={{ color: '#0099ff' }}
                >
                  <X className="w-6 h-6" />
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                  <div 
                    className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0, 153, 255, 0.3), rgba(0, 204, 255, 0.2))',
                      border: '2px solid #0099ff',
                      boxShadow: '0 0 30px rgba(0, 153, 255, 0.4)',
                    }}
                  >
                    <Trophy className="w-8 h-8" style={{ color: '#0099ff' }} />
                  </div>
                  
                  <h3 
                    className="text-2xl font-bold mb-2"
                    style={{ 
                      color: '#ffffff',
                      fontFamily: 'Orbitron, monospace',
                    }}
                  >
                    Jackpot Entry
                  </h3>
                  <p className="text-zinc-400">
                    Enter the monthly jackpot lottery
                  </p>
                </div>

                {/* Amount Selector */}
                <div className="mb-8">
                  <label className="block text-sm font-medium mb-3 text-center" style={{ color: '#ffffff' }}>
                    Number of Entries (0.2 SOL each)
                  </label>
                  <div className="flex items-center justify-center space-x-6">
                    <motion.button
                      onClick={() => handleQuantityChange(-1)}
                      disabled={depositAmount <= 1}
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-50"
                      style={{
                        background: 'rgba(0, 153, 255, 0.2)',
                        border: '1px solid rgba(0, 153, 255, 0.3)',
                        color: '#0099ff',
                      }}
                      whileHover={depositAmount > 1 ? { scale: 1.05 } : {}}
                      whileTap={depositAmount > 1 ? { scale: 0.95 } : {}}
                    >
                      <Minus className="w-5 h-5" />
                    </motion.button>
                    
                    <div className="flex-1 text-center max-w-32">
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                        className="w-full text-center text-2xl font-bold bg-transparent border-none outline-none"
                        style={{ color: '#ffffff' }}
                        min="1"
                        max="1000"
                      />
                      <div className="text-xs text-zinc-400 mt-1">entries</div>
                    </div>
                    
                    <motion.button
                      onClick={() => handleQuantityChange(1)}
                      disabled={depositAmount >= 1000}
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-50"
                      style={{
                        background: 'rgba(0, 153, 255, 0.2)',
                        border: '1px solid rgba(0, 153, 255, 0.3)',
                        color: '#0099ff',
                      }}
                      whileHover={depositAmount < 1000 ? { scale: 1.05 } : {}}
                      whileTap={depositAmount < 1000 ? { scale: 0.95 } : {}}
                    >
                      <Plus className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>

                {/* Total Cost */}
                <div className="mb-4 p-4 rounded-xl text-center" style={{
                  background: 'rgba(0, 153, 255, 0.1)',
                  border: '1px solid rgba(0, 153, 255, 0.3)'
                }}>
                  <div className="text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                    Total Cost
                  </div>
                  <div className="text-2xl font-bold" style={{ color: '#0099ff' }}>
                    {(depositAmount * 0.2).toFixed(1)} SOL
                  </div>
                  <div className="text-sm text-zinc-400">
                    = ${solToUsd(depositAmount * 0.2).toFixed(0)}
                  </div>
                </div>

                {connected && balance > 0 && (
                  <div className="mb-4 p-2 rounded-lg text-center" style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.3)' }}>
                    <p className="text-xs font-mono text-green-400">
                      Balance: {balance.toFixed(4)} SOL
                    </p>
                  </div>
                )}

                {/* Purchase Button */}
                <motion.button
                  ref={depositButtonRef}
                  onClick={handleDeposit}
                  disabled={!connected || isLoading}
                  className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
                  style={{
                    background: connected ? 'linear-gradient(135deg, #0099ff, #00ccff)' : 'rgba(255, 255, 255, 0.1)',
                    color: connected ? '#000' : '#ffffff',
                    boxShadow: connected ? '0 0 30px rgba(0, 153, 255, 0.5)' : 'none',
                  }}
                  whileHover={connected && !isLoading ? { scale: 1.05 } : {}}
                  whileTap={connected && !isLoading ? { scale: 0.95 } : {}}
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-6 h-6 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <img
                        src="https://i.imgur.com/4vL7f4m.png"
                        alt="PWRS Ticket"
                        className="w-8 h-8 object-contain"
                        style={{
                          filter: 'brightness(1.3) contrast(1.2) drop-shadow(0 0 8px rgba(0, 153, 255, 0.6))',
                        }}
                      />
                      <span>
                        {connected ? `Enter Jackpot (${(depositAmount * 0.2).toFixed(1)} SOL)` : 'Connect Wallet First'}
                      </span>
                    </>
                  )}
                </motion.button>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl"
                    style={{
                      background: 'rgba(255, 0, 0, 0.1)',
                      border: '1px solid rgba(255, 0, 0, 0.3)',
                    }}
                  >
                    <p className="text-xs md:text-sm font-semibold text-center text-red-400">
                      {error}
                    </p>
                  </motion.div>
                )}

                {/* Success Message */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: showSuccess ? 1 : 0, y: showSuccess ? 0 : 10 }}
                  className="mt-6 p-4 rounded-xl"
                  style={{
                    background: 'rgba(0, 153, 255, 0.1)',
                    border: '1px solid rgba(0, 153, 255, 0.3)',
                    display: showSuccess ? 'block' : 'none',
                  }}
                >
                  <p className="text-xs md:text-sm font-semibold text-center" style={{ color: '#0099ff' }}>
                    Jackpot entry successful! TX: {txId}
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Winners Display */}
        <div className="mt-16">
          <WinnersDisplay
            title="Jackpot Winners"
            accentColor="#0099ff"
            lotteryType="jackpot"
          />
        </div>
      </div>
    </div>
  );
}