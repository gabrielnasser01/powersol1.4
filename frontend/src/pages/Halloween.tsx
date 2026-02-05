import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, Zap, Shield, Trophy, Plus, Minus, Ticket, Loader, Calendar, Users, TrendingUp, Ghost, Crown, AlertTriangle } from 'lucide-react';
import { theme } from '../theme';
import { useNavigate, useLocation } from 'react-router-dom';
import { chainAdapter, formatSol, formatUsd, solToUsd, HALLOWEEN_TICKET_PRICE_SOL } from '../chain/adapter';
import { ticketsStorage } from '../store/ticketStorage';
import { useMagnetic } from '../hooks/useMagnetic';
import { WinnersDisplay } from '../components/WinnersDisplay';
import { useWallet } from '../contexts/WalletContext';
import { solanaService } from '../services/solanaService';
import { supabase } from '../lib/supabase';

const LAMPORTS_PER_SOL = 1_000_000_000;
const HOUSE_COMMISSION_RATE = 0.30;

export function Halloween() {
  const navigate = useNavigate();
  const location = useLocation();
  const { publicKey, connected, getWalletAdapter, refreshBalance, balance } = useWallet();

  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [poolState, setPoolState] = useState({ totalSol: 0, ticketCount: 0 });
  const [globalPool, setGlobalPool] = useState({ prizePoolSol: 0, prizePoolUsd: 0, ticketCount: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useMagnetic(buttonRef);

  const isConnected = connected && !!publicKey;

  const totalSol = HALLOWEEN_TICKET_PRICE_SOL * quantity;
  const totalUsd = solToUsd(totalSol);

  // Valentine's countdown
  useEffect(() => {
    // Load both pool states
    const loadPoolState = async () => {
      try {
        const [localState, globalState] = await Promise.all([
          chainAdapter.getPoolState(),
          chainAdapter.getGlobalPoolState()
        ]);
        setPoolState(localState);
        setGlobalPool(globalState);
      } catch (error) {
        console.error('Failed to load pool state:', error);
      }
    };
    
    loadPoolState();
    const poolInterval = setInterval(loadPoolState, 10000); // Update every 10 seconds

    const updateCountdown = () => {
      const valentines = new Date('2025-02-14T23:59:59').getTime();
      const now = Date.now();
      const difference = valentines - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => {
      clearInterval(interval);
      clearInterval(poolInterval);
    };
  }, []);

  const banners = [
    {
      id: 1,
      icon: Zap,
      title: 'POWER BOOST',
      subtitle: 'System Enhanced',
      color: '#FF69B4',
      gradient: `linear-gradient(135deg, rgba(255, 105, 180, 0.2), rgba(255, 20, 147, 0.2))`,
      onClick: () => navigate('/halloween'),
      path: '/halloween',
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
      color: '#0099ff',
      gradient: `linear-gradient(135deg, rgba(0, 153, 255, 0.2), rgba(0, 204, 255, 0.2))`,
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
      onClick: () => navigate('/grand-prize'),
      path: '/grand-prize',
    },
  ];

  const stats = [
    { label: 'Prize Pool', value: `$${globalPool.prizePoolUsd.toLocaleString()}`, icon: Trophy, color: '#FF69B4' },
    { label: 'Participants', value: '666', icon: Users, color: '#FF1493' },
    { label: 'Participants', value: '666', icon: Users, color: '#FF69B4' },
    { label: 'Days Left', value: timeLeft.days.toString(), icon: Calendar, color: '#FF69B4' },
    { label: 'Love Factor', value: '100%', icon: Ghost, color: '#FF1493' },
  ];

  const timeUnits = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds },
  ];

  const handleQuantityChange = (delta: number) => {
    setQuantity(Math.max(1, Math.min(1000, quantity + delta)));
  };

  const handlePurchase = async () => {
    if (!isConnected || !publicKey) return;

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
        quantity,
        HALLOWEEN_TICKET_PRICE_SOL,
        'special-event'
      );
      const signature = result.signature;

      setTxId(signature);

      await supabase.from('ticket_purchases').insert({
        wallet_address: publicKey,
        lottery_type: 'special-event',
        quantity: quantity,
        total_sol: totalSol,
        transaction_signature: signature,
      });

      const houseEarningsLamports = Math.floor(totalSol * LAMPORTS_PER_SOL * HOUSE_COMMISSION_RATE);
      await supabase.from('house_earnings').insert({
        wallet_address: publicKey,
        lottery_type: 'special-event',
        amount_lamports: houseEarningsLamports,
        transaction_signature: signature,
      });

      ticketsStorage.add(quantity, 'special-event');

      window.dispatchEvent(new CustomEvent('ticketsPurchased', {
        detail: { quantity, signature }
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

  return (
    <div className="min-h-screen pt-20 pb-20 relative overflow-hidden">
      {/* Valentine's Terminal Background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(0deg, rgba(255, 105, 180, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 105, 180, 0.08) 1px, transparent 1px),
              linear-gradient(135deg, rgba(80, 0, 0, 0.98) 0%, rgba(50, 0, 0, 0.95) 100%)
            `,
            backgroundSize: '20px 20px, 20px 20px, 100% 100%',
          }}
        />

        {/* Valentine's scanner effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(255, 105, 180, 0.03) 2px,
                rgba(255, 105, 180, 0.03) 4px
              ),
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 3px,
                rgba(255, 105, 180, 0.02) 3px,
                rgba(255, 105, 180, 0.02) 6px
              )
            `,
            animation: 'valentineScan 4s linear infinite',
          }}
        />

        <style jsx>{`
          @keyframes valentineScan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
          }
        `}</style>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Terminal corner decorations - Desktop */}
        <div className="absolute top-24 left-6 text-xs font-mono text-pink-400/40 hidden sm:block">
          [SYSTEM_ACTIVE]
        </div>
        <div className="absolute top-24 right-6 text-xs font-mono text-pink-400/60 hidden sm:block">
          [SPECIAL_MODULE]
        </div>
        
        {/* Banners Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-2 md:flex md:flex-row justify-center items-start gap-4 md:gap-6 mb-8 px-4 max-w-md md:max-w-none mx-auto"
        >
          {/* Banner 1 - Valentine's */}
          <div className="flex flex-col items-center gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0 }}
              whileHover={{
                scale: 1.05,
                boxShadow: '0 0 30px rgba(255, 0, 0, 0.6)',
              }}
              onClick={() => navigate('/halloween')}
              className="rounded-2xl border backdrop-blur-md cursor-pointer overflow-hidden w-full md:w-[200px] h-[100px] md:h-[120px]"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 0, 0, 0.2), rgba(220, 20, 60, 0.2))',
                borderColor: 'rgba(255, 105, 180, 0.4)',
                boxShadow: '0 0 20px rgba(255, 0, 0, 0.3)',
              }}
            >
              <div className="w-full h-full flex items-center justify-center p-2">
                <img
                  src="https://i.imgur.com/Aad4yVk.png"
                  alt="Valentine's Day"
                  className="w-full h-full object-contain"
                  style={{
                    filter: 'brightness(1.1) contrast(1.1)',
                  }}
                />
              </div>
            </motion.div>
            <div className="text-center">
              <h3 className="text-sm md:text-lg font-bold text-pink-400">Special Event</h3>
              <p className="text-xs md:text-sm text-pink-300/80">0.2 SOL</p>
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
                background: 'linear-gradient(135deg, rgba(0, 153, 255, 0.2), rgba(0, 204, 255, 0.2))',
                borderColor: 'rgba(0, 153, 255, 0.4)',
                boxShadow: '0 0 20px rgba(0, 153, 255, 0.3)',
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
              <h3 className="text-sm md:text-lg font-bold text-cyan-400">Monthly Jackpot</h3>
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
              onClick={() => navigate('/grand-prize')}
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
            className="text-2xl md:text-3xl font-bold mb-4 text-center"
            style={{
              fontFamily: 'Orbitron, monospace',
              background: 'linear-gradient(135deg, #FF69B4 0%, #FF1493 50%, #FF69B4 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 0 40px rgba(255, 105, 180, 0.5)',
            }}
          >
            VALENTINE'S DAY
          </h1>
          <h2
            className="text-3xl md:text-5xl mb-6 text-center"
            style={{
              fontFamily: 'Orbitron, monospace',
              background: 'linear-gradient(135deg, #FF69B4 0%, #FF1493 50%, #FF69B4 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 0 40px rgba(255, 105, 180, 0.5)',
            }}
          >
            SPECIAL
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-mono">
            Love lottery event accumulating until February 14th! Odds 1:10
          </p>
        </motion.div>

        {/* Stats Grid */}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Countdown */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl border text-center relative overflow-hidden"
            style={{
              background: `
                linear-gradient(0deg, rgba(255, 105, 180, 0.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 105, 180, 0.08) 1px, transparent 1px),
                linear-gradient(135deg, rgba(60, 0, 0, 0.98) 0%, rgba(40, 0, 0, 0.95) 100%)
              `,
              backgroundSize: '20px 20px, 20px 20px, 100% 100%',
              borderColor: 'rgba(255, 105, 180, 0.5)',
              boxShadow: '0 0 25px rgba(255, 105, 180, 0.4), inset 0 0 40px rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(20px)',
              fontFamily: 'monospace',
            }}
          >
            {/* Terminal indicators */}
            <div className="absolute top-2 left-2 text-xs font-mono text-pink-400/60">
              [COUNTDOWN_SYS]
            </div>
            <div className="absolute top-2 right-2 text-xs font-mono text-pink-400/60">
              [ACTIVE]
            </div>

            <div className="flex items-center justify-center space-x-3 mb-6">
              <div
                className="p-3 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, rgba(255, 105, 180, 0.3), rgba(255, 20, 147, 0.2))`,
                  border: `1px solid rgba(255, 105, 180, 0.5)`,
                }}
              >
                <img
                  src="https://i.imgur.com/AO1X60a.png"
                  alt="Valentine's Day"
                  className="w-6 h-6 object-contain"
                  style={{
                    filter: 'brightness(1.2) contrast(1.1)',
                  }}
                />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold font-mono" style={{ color: '#aaaaaa' }}>
                  Valentine's Draw
                </h3>
                <p className="text-pink-400/70 font-mono text-sm">
                  February 14, 2025
                </p>
              </div>
            </div>

            {/* Prize Pool Display */}
            <div className="mb-6 p-4 rounded-xl relative" style={{
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(30, 15, 20, 0.4))',
              border: '1px solid rgba(255, 105, 180, 0.3)',
              boxShadow: 'inset 0 0 20px rgba(255, 105, 180, 0.1)'
            }}>
              <div className="flex items-center justify-center space-x-2 mb-3">
                <Trophy className="w-5 h-5" style={{ color: '#FF69B4' }} />
                <span className="text-sm font-medium font-mono" style={{ color: '#aaaaaa' }}>Love Prize Pool</span>
              </div>
              <div className="text-2xl font-bold font-mono mb-2 flex items-center justify-center" style={{
                color: '#FF69B4',
                textShadow: '0 0 10px rgba(255, 105, 180, 0.5)'
              }}>
                <div className="flex items-center space-x-3">
                  {/* Valentine's heart with love effects */}
                  <motion.div
                    className="w-12 h-12 flex items-center justify-center"
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 15, -15, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <img
                      src="https://i.imgur.com/iBbZJGo.png"
                      alt="Valentine Heart"
                      className="w-full h-full object-contain"
                      style={{
                        filter: 'brightness(1.2) contrast(1.1) drop-shadow(0 0 8px rgba(255, 105, 180, 0.6))',
                      }}
                    />
                  </motion.div>
                  <span>${globalPool.prizePoolUsd.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2 text-lg font-mono" style={{
                color: '#FF69B4',
                textShadow: '0 0 8px rgba(255, 105, 180, 0.4)'
              }}>
                <motion.img
                  src="https://i.imgur.com/eE1m8fp.png"
                  alt="Moeda"
                  className="w-8 h-8 rounded-full object-cover mr-2"
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
                {globalPool.prizePoolSol.toFixed(2)} SOL
              </div>
              <div className="text-center mt-2">
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              {timeUnits.map((unit, index) => (
                <motion.div
                  key={unit.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-2 sm:p-4 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(30, 15, 20, 0.5))',
                    border: '1px solid rgba(255, 105, 180, 0.3)',
                    boxShadow: 'inset 0 0 15px rgba(255, 105, 180, 0.1)',
                  }}
                >
                  <motion.div
                    key={unit.value}
                    initial={{ scale: 1.2, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-lg sm:text-2xl md:text-3xl font-bold mb-1"
                    style={{
                      color: '#aaaaaa',
                      fontFamily: 'monospace',
                      textShadow: '0 0 8px rgba(255, 105, 180, 0.6)',
                    }}
                  >
                    {unit.value.toString().padStart(2, '0')}
                  </motion.div>
                  <div className="text-xs uppercase tracking-wide font-mono" style={{ color: '#FF69B4' }}>
                    <span className="hidden sm:inline">{unit.label}</span>
                    <span className="sm:hidden">{unit.label.slice(0, 3)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Ticket Purchase */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl border relative overflow-hidden"
            style={{
              background: `
                linear-gradient(0deg, rgba(255, 105, 180, 0.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 105, 180, 0.08) 1px, transparent 1px),
                linear-gradient(135deg, rgba(80, 0, 0, 0.98) 0%, rgba(50, 0, 0, 0.95) 100%)
              `,
              backgroundSize: '20px 20px, 20px 20px, 100% 100%',
              borderColor: 'rgba(255, 105, 180, 0.4)',
              boxShadow: '0 0 30px rgba(255, 105, 180, 0.3), inset 0 0 50px rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(20px)',
              fontFamily: 'monospace',
            }}
          >
            {/* Terminal indicators */}
            <div className="absolute top-2 left-2 text-xs font-mono text-pink-400/60">
              [TICKET_SYS]
            </div>
            <div className="absolute top-2 right-2 text-xs font-mono text-pink-400/60">
              [READY]
            </div>

            <div className="flex items-center justify-center space-x-3 mb-8 mt-4 text-center">
              <div className="text-center">
                <h3 className="text-xl font-bold font-mono mb-2" style={{
                  color: '#aaaaaa',
                  textShadow: '0 0 10px rgba(255, 105, 180, 0.5)'
                }}>
                  Love Tickets
                </h3>
                <div className="text-lg font-bold font-mono" style={{ color: '#FF69B4' }}>
                  {formatSol(HALLOWEEN_TICKET_PRICE_SOL)}
                </div>
              </div>
            </div>

            {/* Quantity selector */}
            <div className="mb-8">
              <label className="block text-sm font-medium mb-3 font-mono text-center" style={{ color: '#aaaaaa' }}>
                <span className="text-gray-400/90">Quantity</span>
              </label>
              <div className="flex items-center justify-center space-x-6">
                <motion.button
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className="w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(30, 15, 20, 0.5))',
                    border: '1px solid rgba(255, 105, 180, 0.3)',
                    boxShadow: 'inset 0 0 15px rgba(255, 105, 180, 0.1)',
                    color: '#FF69B4',
                  }}
                  whileHover={quantity > 1 ? { scale: 1.05 } : {}}
                  whileTap={quantity > 1 ? { scale: 0.95 } : {}}
                >
                  <Minus className="w-6 h-6" />
                </motion.button>

                <div className="flex-1 text-center px-4 max-w-32">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                    className="w-full text-center text-3xl font-bold bg-transparent border-none outline-none font-mono"
                    style={{
                      color: '#aaaaaa',
                      textShadow: '0 0 8px rgba(255, 105, 180, 0.6)'
                    }}
                    min="1"
                    max="1000"
                  />
                  <div className="text-xs text-white/40 font-mono mt-1">tickets</div>
                </div>

                <motion.button
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= 1000}
                  className="w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(30, 15, 20, 0.5))',
                    border: '1px solid rgba(255, 105, 180, 0.3)',
                    boxShadow: 'inset 0 0 15px rgba(255, 105, 180, 0.1)',
                    color: '#FF69B4',
                  }}
                  whileHover={quantity < 1000 ? { scale: 1.05 } : {}}
                  whileTap={quantity < 1000 ? { scale: 0.95 } : {}}
                >
                  <Plus className="w-6 h-6" />
                </motion.button>
              </div>
            </div>

            {/* Total Cost */}
            <div className="mb-6 p-4 rounded-xl text-center" style={{
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(20, 15, 20, 0.6))',
              border: '1px solid rgba(255, 105, 180, 0.3)',
              boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.9)'
            }}>
              <div className="text-sm font-medium font-mono mb-2" style={{ color: '#aaaaaa' }}>
                TOTAL COST ({quantity} love ticket{quantity > 1 ? 's' : ''})
              </div>
              <div className="flex items-center justify-center space-x-4">
                <div className="text-2xl font-bold font-mono" style={{
                  color: '#FF69B4',
                  textShadow: '0 0 10px rgba(255, 105, 180, 0.5)'
                }}>
                  {formatSol(totalSol)}
                </div>
                <div className="text-lg text-gray-400/70 font-mono" style={{
                  textShadow: '0 0 8px rgba(255, 105, 180, 0.5)',
                  color: '#FF69B4'
                }}>
                  {formatUsd(totalUsd)}
                </div>
              </div>
              {isConnected && (
                <div className="text-xs text-gray-400/50 font-mono mt-2">
                  Your balance: {balance.toFixed(4)} SOL
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 rounded-xl flex items-center space-x-3"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                }}
              >
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm font-mono">{error}</p>
              </motion.div>
            )}

            {/* Purchase button */}
            <motion.button
              ref={buttonRef}
              onClick={handlePurchase}
              disabled={!isConnected || isLoading}
              className="w-full py-5 rounded-xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
              style={{
                background: isConnected ? 'linear-gradient(135deg, #FF69B4, #FF1493)' : 'rgba(170, 170, 170, 0.1)',
                color: isConnected ? '#000' : '#aaaaaa',
                boxShadow: isConnected ? '0 0 30px rgba(255, 105, 180, 0.5)' : 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: 'monospace',
              }}
              whileHover={isConnected && !isLoading ? { scale: 1.02 } : {}}
              whileTap={isConnected && !isLoading ? { scale: 0.98 } : {}}
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <img
                    src="https://i.imgur.com/WcTrCMS.png"
                    alt="PWRS Ticket"
                    className="w-8 h-8 object-contain"
                    style={{
                      filter: 'brightness(1.3) contrast(1.2) drop-shadow(0 0 8px rgba(255, 105, 180, 0.6))',
                    }}
                  />
                  <span>
                    {isConnected
                      ? `Buy ${quantity} Love Ticket${quantity > 1 ? 's' : ''}`
                      : 'Connect Wallet'
                    }
                  </span>
                </>
              )}
            </motion.button>

            {/* Success message */}
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-4 p-4 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 105, 180, 0.2), rgba(255, 20, 147, 0.1))',
                    border: '1px solid rgba(255, 105, 180, 0.4)',
                    boxShadow: '0 0 20px rgba(255, 105, 180, 0.3)',
                  }}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ background: '#FF69B4' }}
                    />
                    <p className="text-sm font-semibold font-mono" style={{
                      color: '#FF69B4',
                      textShadow: `0 0 8px rgba(255, 105, 180, 0.6)`
                    }}>
                      LOVE TICKETS PURCHASED!
                    </p>
                  </div>
                  <p className="text-xs font-mono ml-5" style={{
                    color: 'rgba(170, 170, 170, 0.7)',
                    letterSpacing: '0.5px'
                  }}>
                    TX_ID: {txId}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {!isConnected && (
              <p className="text-xs text-center text-zinc-500 mt-4 font-mono">
                Connect your wallet to purchase love tickets
              </p>
            )}
          </motion.div>
        </div>

        {/* Winners Display */}
        <div className="mt-16">
          <WinnersDisplay
            title="Winners"
            accentColor="#FF69B4"
            lotteryType="halloween"
          />
        </div>
      </div>
    </div>
  );
}