import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Coins, Plus, Minus, Loader, Calendar, Users, TrendingUp, X, Crown, Star, AlertTriangle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { chainAdapter, formatSol, formatUsd, solToUsd, GRAND_PRIZE_TICKET_PRICE_SOL, LAMPORTS_PER_SOL, HOUSE_COMMISSION_RATE } from '../chain/adapter';
import { ticketsStorage } from '../store/ticketStorage';
import { useMagnetic } from '../hooks/useMagnetic';
import { theme } from '../theme';
import { OptimizedImage } from '../components/OptimizedImage';
import { useOptimizedState } from '../utils/performance';
import { WinnersDisplay } from '../components/WinnersDisplay';
import { useWallet } from '../contexts/WalletContext';
import { solanaService } from '../services/solanaService';
import { supabase } from '../lib/supabase';

export function GrandPrize() {
  const navigate = useNavigate();
  const location = useLocation();
  const { publicKey, connected, getWalletAdapter, refreshBalance, balance } = useWallet();

  const [showPurchaseModal, setShowPurchaseModal] = useOptimizedState(false);
  const [ticketAmount, setTicketAmount] = useOptimizedState(1);
  const [isLoading, setIsLoading] = useOptimizedState(false);
  const [showSuccess, setShowSuccess] = useOptimizedState(false);
  const [txId, setTxId] = useOptimizedState('');
  const [error, setError] = useOptimizedState('');
  const [globalPool, setGlobalPool] = useOptimizedState({ prizePoolUsd: 0, prizePoolSol: 0 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const purchaseButtonRef = useRef<HTMLButtonElement>(null);

  useMagnetic(buttonRef);
  useMagnetic(purchaseButtonRef);

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
    const interval = setInterval(loadGlobalPool, 5000);

    return () => clearInterval(interval);
  }, []);

  const isConnected = connected && !!publicKey;

  const totalSol = GRAND_PRIZE_TICKET_PRICE_SOL * ticketAmount;
  const totalUsd = solToUsd(totalSol);

  const banners = [
    {
      id: 1,
      icon: Crown,
      title: 'POWER BOOST',
      subtitle: 'System Enhanced',
      color: '#FFD700',
      gradient: `linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 193, 7, 0.2))`,
      onClick: () => navigate('/halloween'),
      path: '/halloween',
    },
    {
      id: 2,
      icon: Star,
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
      gradient: `linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(233, 236, 239, 0.2))`,
      onClick: () => navigate('/grand-prize'),
      path: '/grand-prize',
    },
  ];

  const stats = [
    { label: 'Prize Pool', value: `$${globalPool.prizePoolUsd.toLocaleString()}`, icon: Trophy, color: '#f8f9fa' },
    { label: 'Participants', value: '2,847', icon: Users, color: '#e9ecef' },
    { label: 'Days Until Draw', value: '127', icon: Calendar, color: '#dee2e6' },
    { label: 'Growth Rate', value: '+8.3%', icon: TrendingUp, color: '#ced4da' },
  ];

  const handleQuantityChange = (delta: number) => {
    setTicketAmount(Math.max(1, Math.min(1000, ticketAmount + delta)));
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
        ticketAmount,
        GRAND_PRIZE_TICKET_PRICE_SOL
      );
      const signature = result.signature;

      setTxId(signature);

      await supabase.from('ticket_purchases').insert({
        wallet_address: publicKey,
        lottery_type: 'grand-prize',
        quantity: ticketAmount,
        total_sol: totalSol,
        transaction_signature: signature,
      });

      const houseEarningsLamports = Math.floor(totalSol * LAMPORTS_PER_SOL * HOUSE_COMMISSION_RATE);
      await supabase.from('house_earnings').insert({
        wallet_address: publicKey,
        lottery_type: 'grand-prize',
        amount_lamports: houseEarningsLamports,
        transaction_signature: signature,
      });

      ticketsStorage.add(ticketAmount, 'grand-prize');

      window.dispatchEvent(new CustomEvent('ticketsPurchased', {
        detail: { quantity: ticketAmount, signature }
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
      {/* White/Gray Matrix Background */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(0deg, rgba(248, 249, 250, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(248, 249, 250, 0.08) 1px, transparent 1px),
              linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(248, 249, 250, 0.05) 100%)
            `,
            backgroundSize: '20px 20px, 20px 20px, 100% 100%',
          }}
        />
        
        {/* White scanner effect */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(248, 249, 250, 0.03) 2px,
                rgba(248, 249, 250, 0.03) 4px
              )
            `,
            animation: 'whiteTerminalScan 4s linear infinite',
          }}
        />
        
        <style jsx>{`
          @keyframes whiteTerminalScan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
          }
        `}</style>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Terminal corner decorations - Desktop */}
        <div className="absolute top-24 left-6 text-xs font-mono text-gray-400/60 hidden sm:block">
          [SYSTEM_ACTIVE]
        </div>
        <div className="absolute top-24 right-6 text-xs font-mono text-gray-400/60 hidden sm:block">
          [GRAND_PRIZE_MODULE]
        </div>
        
        {/* Mobile terminal indicators */}
        <div className="block sm:hidden text-center pt-4 pb-2">
          <div className="flex justify-center space-x-4 text-xs font-mono text-gray-400/80">
            <span>[SYSTEM_ACTIVE]</span>
            <span>[GRAND_PRIZE_MODULE]</span>
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
                boxShadow: '0 0 30px rgba(255, 0, 0, 0.6)',
              }}
              onClick={() => navigate('/halloween')}
              className="rounded-2xl border backdrop-blur-md cursor-pointer overflow-hidden w-full md:w-[200px] h-[100px] md:h-[120px]"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 0, 0, 0.2), rgba(220, 20, 60, 0.2))',
                borderColor: 'rgba(255, 0, 0, 0.4)',
                boxShadow: '0 0 20px rgba(255, 0, 0, 0.3)',
              }}
            >
              <div className="w-full h-full flex items-center justify-center p-2">
                <img
                  src="https://i.imgur.com/Aad4yVk.png"
                  alt="Christmas"
                  className="w-full h-full object-contain"
                  style={{
                    filter: 'brightness(1.1) contrast(1.1)',
                  }}
                />
              </div>
            </motion.div>
            <div className="text-center">
              <h3 className="text-sm md:text-lg font-bold text-red-400">Special Event</h3>
              <p className="text-xs md:text-sm text-red-300/80">0.2 SOL</p>
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
              onClick={() => navigate('/grand-prize')}
              className="rounded-2xl border backdrop-blur-md cursor-pointer overflow-hidden w-full md:w-[200px] h-[100px] md:h-[120px]"
              style={{
                background: `linear-gradient(135deg, rgba(248, 249, 250, 0.4), rgba(233, 236, 239, 0.3)), linear-gradient(135deg, rgba(248, 249, 250, 0.2), rgba(233, 236, 239, 0.2))`,
                borderColor: `rgba(248, 249, 250, 0.9)`,
                boxShadow: `0 0 40px rgba(248, 249, 250, 0.7), inset 0 0 20px rgba(248, 249, 250, 0.3)`,
                transform: 'translateY(-2px)',
                filter: 'brightness(1.2)',
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
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 0 40px rgba(248, 249, 250, 0.5)',
            }}
          >
            Annual Grand Prize
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            The ultimate annual lottery event with the biggest prize pool of the year! 3 winners.
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
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(248, 249, 250, 0.03))',
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

        {/* Main Prize Display */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <div 
            className="p-8 rounded-2xl border"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(248, 249, 250, 0.05))',
              borderColor: '#f8f9fa',
              boxShadow: '0 0 30px rgba(248, 249, 250, 0.3)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2" style={{ color: '#f8f9fa', fontFamily: 'Orbitron, monospace' }}>
                Annual Grand Prize Pool
              </h2>
              <div className="text-5xl font-bold mb-2" style={{ 
                color: '#ffffff',
                textShadow: '0 0 20px rgba(248, 249, 250, 0.5)'
              }}>
                <div className="flex items-center justify-center space-x-4">
                  {/* Grand Prize crown coin */}
                  <motion.div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                    style={{
                      background: 'transparent',
                    }}
                    animate={{
                      scale: [1, 1.15, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <img
                      src="https://i.imgur.com/BOxafuS.png"
                      alt="Crown"
                      className="w-16 h-16 object-contain"
                      style={{ 
                        filter: 'brightness(1.2) contrast(1.1) drop-shadow(0 0 8px rgba(248, 249, 250, 0.6))',
                      }}
                    />
                  </motion.div>
                  <span>${globalPool.prizePoolUsd.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2 text-xl" style={{ color: '#e9ecef' }}>
                <motion.img
                  src="https://i.imgur.com/eE1m8fp.png"
                  alt="Solana Coin"
                  className="w-8 h-8 rounded-full object-cover"
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
                <span>{(globalPool.prizePoolUsd / 150).toFixed(2)} SOL</span>
              </div>
            </div>

            {/* Contribute Button */}
            <div className="text-center">
              <motion.button
                ref={buttonRef}
                onClick={() => setShowPurchaseModal(true)}
                className="px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-3 mx-auto"
                style={{
                  background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
                  color: '#000',
                  boxShadow: '0 0 30px rgba(248, 249, 250, 0.5)',
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Crown className="w-6 h-6" />
                <span>Enter Grand Prize</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showPurchaseModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 min-h-screen"
              style={{ background: 'rgba(0, 0, 0, 0.9)' }}
              onClick={() => setShowPurchaseModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="max-w-lg w-full p-8 rounded-2xl border relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(248, 249, 250, 0.08))',
                  borderColor: '#f8f9fa',
                  boxShadow: '0 0 50px rgba(248, 249, 250, 0.5)',
                  backdropFilter: 'blur(20px)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowPurchaseModal(false)}
                  className="absolute top-4 right-4 p-2 rounded-lg transition-all duration-300"
                  style={{ color: '#f8f9fa' }}
                >
                  <X className="w-6 h-6" />
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                  <div 
                    className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(248, 249, 250, 0.3), rgba(233, 236, 239, 0.2))',
                      border: '2px solid #f8f9fa',
                      boxShadow: '0 0 30px rgba(248, 249, 250, 0.4)',
                    }}
                  >
                    <Crown className="w-8 h-8" style={{ color: '#f8f9fa' }} />
                  </div>
                  
                  <h3 
                    className="text-2xl font-bold mb-2"
                    style={{ 
                      color: '#ffffff',
                      fontFamily: 'Orbitron, monospace',
                    }}
                  >
                    Grand Prize Entry
                  </h3>
                  <p className="text-zinc-400">
                    Enter the annual grand prize lottery
                  </p>
                </div>

                {/* Amount Selector */}
                <div className="mb-8">
                  <label className="block text-sm font-medium mb-3 text-center" style={{ color: '#ffffff' }}>
                    Number of Entries (0.33 sol each)
                  </label>
                  <div className="flex items-center justify-center space-x-6">
                    <motion.button
                      onClick={() => handleQuantityChange(-1)}
                      disabled={ticketAmount <= 1}
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-50"
                      style={{
                        background: 'rgba(248, 249, 250, 0.2)',
                        border: '1px solid rgba(248, 249, 250, 0.3)',
                        color: '#f8f9fa',
                      }}
                      whileHover={ticketAmount > 1 ? { scale: 1.05 } : {}}
                      whileTap={ticketAmount > 1 ? { scale: 0.95 } : {}}
                    >
                      <Minus className="w-5 h-5" />
                    </motion.button>
                    
                    <div className="flex-1 text-center max-w-32">
                      <input
                        type="number"
                        value={ticketAmount}
                        onChange={(e) => setTicketAmount(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                        className="w-full text-center text-2xl font-bold bg-transparent border-none outline-none"
                        style={{ color: '#ffffff' }}
                        min="1"
                        max="1000"
                      />
                      <div className="text-xs text-zinc-400 mt-1">entries</div>
                    </div>
                    
                    <motion.button
                      onClick={() => handleQuantityChange(1)}
                      disabled={ticketAmount >= 1000}
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-50"
                      style={{
                        background: 'rgba(248, 249, 250, 0.2)',
                        border: '1px solid rgba(248, 249, 250, 0.3)',
                        color: '#f8f9fa',
                      }}
                      whileHover={ticketAmount < 1000 ? { scale: 1.05 } : {}}
                      whileTap={ticketAmount < 1000 ? { scale: 0.95 } : {}}
                    >
                      <Plus className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>

                {/* Total Cost */}
                <div className="mb-6 p-4 rounded-xl text-center" style={{
                  background: 'rgba(248, 249, 250, 0.1)',
                  border: '1px solid rgba(248, 249, 250, 0.3)'
                }}>
                  <div className="text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                    Total Cost
                  </div>
                  <div className="text-2xl font-bold" style={{ color: '#f8f9fa' }}>
                    {formatSol(totalSol)}
                  </div>
                  <div className="text-sm text-zinc-400">
                    ≈ ${totalUsd}
                  </div>
                  {isConnected && (
                    <div className="text-xs text-zinc-500 mt-2">
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
                    <p className="text-red-400 text-sm">{error}</p>
                  </motion.div>
                )}

                {/* Purchase Button */}
                <motion.button
                  ref={purchaseButtonRef}
                  onClick={handlePurchase}
                  disabled={!isConnected || isLoading}
                  className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
                  style={{
                    background: isConnected ? 'linear-gradient(135deg, #f8f9fa, #e9ecef)' : 'rgba(255, 255, 255, 0.1)',
                    color: isConnected ? '#000' : '#ffffff',
                    boxShadow: isConnected ? '0 0 30px rgba(248, 249, 250, 0.5)' : 'none',
                  }}
                  whileHover={isConnected && !isLoading ? { scale: 1.05 } : {}}
                  whileTap={isConnected && !isLoading ? { scale: 0.95 } : {}}
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-6 h-6 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <img
                        src="https://i.imgur.com/ixnV8ms.png"
                        alt="PWRS Ticket"
                        className="w-8 h-8 object-contain"
                        style={{
                          filter: 'brightness(1.3) contrast(1.2) drop-shadow(0 0 8px rgba(248, 249, 250, 0.6))',
                        }}
                      />
                      <span>
                        {isConnected ? `Enter Grand Prize (${totalSol.toFixed(1)} SOL)` : 'Connect Wallet First'}
                      </span>
                    </>
                  )}
                </motion.button>

                {/* Success Message */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: showSuccess ? 1 : 0, y: showSuccess ? 0 : 10 }}
                  className="mt-6 p-4 rounded-xl"
                  style={{
                    background: 'rgba(248, 249, 250, 0.1)',
                    border: '1px solid rgba(248, 249, 250, 0.3)',
                    display: showSuccess ? 'block' : 'none',
                  }}
                >
                  <p className="text-xs md:text-sm font-semibold text-center" style={{ color: '#f8f9fa' }}>
                    Grand Prize entry successful! TX: {txId}
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Winners Display */}
        <div className="mt-16">
          <WinnersDisplay
            title="Grand Prize Winners"
            accentColor="#f8f9fa"
            lotteryType="grand-prize"
          />
        </div>
      </div>
    </div>
  );
}