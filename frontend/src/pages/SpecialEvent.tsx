import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Trophy, Plus, Minus, Ticket, Loader, Calendar, Users, TrendingUp, Crown, AlertTriangle, Star } from 'lucide-react';
import { theme } from '../theme';
import { useNavigate, useLocation } from 'react-router-dom';
import { chainAdapter, formatSol, formatUsd, solToUsd, SPECIAL_EVENT_TICKET_PRICE_SOL } from '../chain/adapter';
import { solPriceService } from '../services/solPriceService';
import { ticketsStorage } from '../store/ticketStorage';
import { useMagnetic } from '../hooks/useMagnetic';
import { WinnersDisplay } from '../components/WinnersDisplay';
import { useWallet } from '../contexts/WalletContext';
import { solanaService } from '../services/solanaService';
import { supabase } from '../lib/supabase';
import { apiClient } from '../services/api';

const ACCENT_BLUE = '#1a3a6e';
const ACCENT_RED = '#b22234';
const ACCENT_BLUE_LIGHT = '#3c65a4';
const ACCENT_RED_LIGHT = '#d4485a';
const TEXT_DARK = '#1a2744';
const TEXT_MID = '#4a5568';

export function SpecialEvent() {
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
  const [solPrice, setSolPrice] = useState(solPriceService.getPrice());

  const totalSol = SPECIAL_EVENT_TICKET_PRICE_SOL * quantity;
  const totalUsd = totalSol * solPrice;

  useEffect(() => {
    const stopRefresh = solPriceService.startAutoRefresh(30000);
    const unsubscribe = solPriceService.subscribe((price) => {
      setSolPrice(price);
      setGlobalPool(prev => ({
        ...prev,
        prizePoolUsd: prev.prizePoolSol * price,
      }));
    });
    return () => { stopRefresh(); unsubscribe(); };
  }, []);

  useEffect(() => {
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
    const poolInterval = setInterval(loadPoolState, 10000);

    const updateCountdown = () => {
      const drawDate = new Date('2026-07-04T23:59:00Z').getTime();
      const now = Date.now();
      const difference = drawDate - now;

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
        SPECIAL_EVENT_TICKET_PRICE_SOL,
        'special-event'
      );
      const signature = result.signature;

      setTxId(signature);

      const { data: currentLottery } = await supabase
        .from('blockchain_lotteries')
        .select('lottery_id')
        .eq('lottery_type', 'special-event')
        .eq('is_drawn', false)
        .order('draw_timestamp', { ascending: true })
        .limit(1)
        .maybeSingle();

      const roundId = currentLottery?.lottery_id || null;

      const { data: purchaseData, error: purchaseError } = await supabase.from('ticket_purchases').insert({
        wallet_address: publicKey,
        lottery_type: 'special-event',
        quantity: quantity,
        total_sol: totalSol,
        transaction_signature: signature,
        lottery_round_id: roundId,
      }).select('id').maybeSingle();

      if (purchaseError) {
        console.error('Failed to save ticket purchase:', purchaseError);
      }

      await ticketsStorage.add(quantity, 'special-event', roundId || undefined);

      window.dispatchEvent(new CustomEvent('ticketsPurchased', {
        detail: { quantity, signature }
      }));

      try {
        await apiClient.recordTicketPurchase(publicKey, {
          lottery_type: 'special_event',
          ticket_count: quantity,
          transaction_signature: signature,
        });
      } catch (missionErr) {
        console.error('Mission update failed:', missionErr);
      }

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
    <div className="min-h-screen pt-20 pb-20 relative overflow-hidden" style={{ background: '#ffffff' }}>
      {/* Patriotic Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(0deg, rgba(26, 58, 110, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(178, 34, 52, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ background: `linear-gradient(90deg, ${ACCENT_RED}, ${ACCENT_BLUE}, ${ACCENT_RED}, ${ACCENT_BLUE})` }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-2"
          style={{ background: `linear-gradient(90deg, ${ACCENT_BLUE}, ${ACCENT_RED}, ${ACCENT_BLUE}, ${ACCENT_RED})` }}
        />

        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.06,
            }}
            animate={{
              y: [0, -20, 0],
              rotate: [0, 180, 360],
              opacity: [0.04, 0.08, 0.04],
            }}
            transition={{
              duration: 6 + Math.random() * 4,
              delay: Math.random() * 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Star className="w-4 h-4" style={{ color: i % 2 === 0 ? ACCENT_BLUE : ACCENT_RED }} fill={i % 2 === 0 ? ACCENT_BLUE : ACCENT_RED} />
          </motion.div>
        ))}
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="absolute top-24 left-6 text-xs font-mono" style={{ color: `${ACCENT_BLUE}60` }}>
          [SYSTEM_ACTIVE]
        </div>
        <div className="absolute top-24 right-6 text-xs font-mono hidden sm:block" style={{ color: `${ACCENT_RED}60` }}>
          [INDEPENDENCE_MODULE]
        </div>

        {/* Banners Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-2 md:flex md:flex-row justify-center items-start gap-4 md:gap-6 mb-8 px-4 max-w-md md:max-w-none mx-auto"
        >
          {/* Banner 1 - Special Event */}
          <div className="flex flex-col items-center gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0 }}
              whileHover={{
                scale: 1.05,
                boxShadow: `0 0 30px ${ACCENT_BLUE}40`,
              }}
              onClick={() => navigate('/special-event')}
              className="rounded-2xl border cursor-pointer overflow-hidden w-full md:w-[200px] h-[100px] md:h-[120px]"
              style={{
                background: `linear-gradient(135deg, ${ACCENT_BLUE}15, ${ACCENT_RED}10)`,
                borderColor: `${ACCENT_BLUE}40`,
                boxShadow: `0 4px 20px ${ACCENT_BLUE}15`,
              }}
            >
              <div className="w-full h-full flex items-center justify-center p-3">
                <div className="text-center">
                  <div className="text-3xl mb-1">&#127482;&#127480;</div>
                  <span className="font-mono text-xs font-bold" style={{ color: ACCENT_BLUE }}>JULY 4TH</span>
                </div>
              </div>
            </motion.div>
            <div className="text-center">
              <h3 className="text-sm md:text-lg font-bold" style={{ color: ACCENT_BLUE }}>Special Event</h3>
              <p className="text-xs md:text-sm" style={{ color: ACCENT_RED }}>0.2 SOL</p>
            </div>
          </div>

          {/* Banner 2 - Lottery */}
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

          {/* Banner 3 - Jackpot */}
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
          <div className="flex items-center justify-center gap-3 mb-4">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Star className="w-5 h-5 md:w-6 md:h-6" style={{ color: ACCENT_BLUE }} fill={ACCENT_BLUE} />
              </motion.div>
            ))}
          </div>
          <h1
            className="text-3xl md:text-4xl font-bold mb-2 text-center"
            style={{
              fontFamily: 'Orbitron, monospace',
              color: ACCENT_BLUE,
            }}
          >
            INDEPENDENCE DAY
          </h1>
          <h2
            className="text-4xl md:text-6xl font-bold mb-6 text-center"
            style={{
              fontFamily: 'Orbitron, monospace',
              background: `linear-gradient(135deg, ${ACCENT_RED} 0%, ${ACCENT_BLUE} 50%, ${ACCENT_RED} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            SPECIAL
          </h2>
          <p className="text-lg font-mono max-w-2xl mx-auto" style={{ color: TEXT_MID }}>
            July 4th celebration draw! Accumulating until Independence Day. Odds 1:20
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Star className="w-5 h-5 md:w-6 md:h-6" style={{ color: ACCENT_RED }} fill={ACCENT_RED} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Countdown */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl border text-center relative overflow-hidden"
            style={{
              background: '#ffffff',
              borderColor: `${ACCENT_BLUE}25`,
              boxShadow: `0 4px 30px ${ACCENT_BLUE}10, 0 1px 3px rgba(0,0,0,0.08)`,
              fontFamily: 'monospace',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${ACCENT_RED}, ${ACCENT_BLUE})` }} />
            <div className="absolute top-3 left-3 text-xs font-mono" style={{ color: `${ACCENT_BLUE}80` }}>
              [COUNTDOWN_SYS]
            </div>
            <div className="absolute top-3 right-3 text-xs font-mono" style={{ color: `${ACCENT_RED}80` }}>
              [ACTIVE]
            </div>

            <div className="flex items-center justify-center space-x-3 mb-6 mt-4">
              <div
                className="p-3 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${ACCENT_BLUE}12, ${ACCENT_RED}08)`,
                  border: `1px solid ${ACCENT_BLUE}20`,
                }}
              >
                <span className="text-2xl">&#127482;&#127480;</span>
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold font-mono" style={{ color: TEXT_DARK }}>
                  Independence Day Draw
                </h3>
                <p className="font-mono text-sm" style={{ color: ACCENT_RED }}>
                  July 4, 2026
                </p>
              </div>
            </div>

            {/* Prize Pool Display */}
            <div className="mb-6 p-4 rounded-xl relative" style={{
              background: `linear-gradient(135deg, ${ACCENT_BLUE}06, ${ACCENT_RED}04)`,
              border: `1px solid ${ACCENT_BLUE}15`,
            }}>
              <div className="flex items-center justify-center space-x-2 mb-3">
                <Trophy className="w-5 h-5" style={{ color: ACCENT_RED }} />
                <span className="text-sm font-medium font-mono" style={{ color: TEXT_MID }}>Prize Pool</span>
              </div>
              <div className="text-2xl font-bold font-mono mb-2 flex items-center justify-center" style={{
                color: ACCENT_BLUE,
              }}>
                <div className="flex items-center space-x-3">
                  <motion.div
                    className="flex items-center justify-center"
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <Star className="w-8 h-8" style={{ color: ACCENT_RED }} fill={ACCENT_RED} />
                  </motion.div>
                  <span>${globalPool.prizePoolUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2 text-lg font-mono" style={{
                color: ACCENT_RED,
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
                    background: index % 2 === 0
                      ? `linear-gradient(135deg, ${ACCENT_BLUE}08, ${ACCENT_BLUE}04)`
                      : `linear-gradient(135deg, ${ACCENT_RED}08, ${ACCENT_RED}04)`,
                    border: `1px solid ${index % 2 === 0 ? ACCENT_BLUE : ACCENT_RED}18`,
                  }}
                >
                  <motion.div
                    key={unit.value}
                    initial={{ scale: 1.2, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-lg sm:text-2xl md:text-3xl font-bold mb-1"
                    style={{
                      color: TEXT_DARK,
                      fontFamily: 'monospace',
                    }}
                  >
                    {unit.value.toString().padStart(2, '0')}
                  </motion.div>
                  <div className="text-xs uppercase tracking-wide font-mono" style={{ color: index % 2 === 0 ? ACCENT_BLUE : ACCENT_RED }}>
                    <span className="hidden sm:inline">{unit.label}</span>
                    <span className="sm:hidden">{unit.label.slice(0, 3)}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-5 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, ${ACCENT_BLUE}06, ${ACCENT_RED}04)`,
                border: `1px solid ${ACCENT_BLUE}15`,
              }}
            >
              <Ticket className="w-3.5 h-3.5" style={{ color: ACCENT_BLUE }} />
              <span className="font-mono text-xs" style={{ color: TEXT_MID }}>
                TICKETS IN POOL:
              </span>
              <motion.span
                key={poolState.ticketCount}
                initial={{ opacity: 0.5, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="font-mono text-sm font-bold tabular-nums"
                style={{
                  color: ACCENT_RED,
                  letterSpacing: '1px',
                }}
              >
                {poolState.ticketCount.toLocaleString()}
              </motion.span>
            </motion.div>
          </motion.div>

          {/* Ticket Purchase */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl border relative overflow-hidden"
            style={{
              background: '#ffffff',
              borderColor: `${ACCENT_RED}25`,
              boxShadow: `0 4px 30px ${ACCENT_RED}10, 0 1px 3px rgba(0,0,0,0.08)`,
              fontFamily: 'monospace',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${ACCENT_BLUE}, ${ACCENT_RED})` }} />
            <div className="absolute top-3 left-3 text-xs font-mono" style={{ color: `${ACCENT_BLUE}80` }}>
              [TICKET_SYS]
            </div>
            <div className="absolute top-3 right-3 text-xs font-mono" style={{ color: `${ACCENT_RED}80` }}>
              [READY]
            </div>

            <div className="flex items-center justify-center space-x-3 mb-8 mt-6 text-center">
              <div className="text-center">
                <h3 className="text-xl font-bold font-mono mb-2" style={{ color: TEXT_DARK }}>
                  Independence Day Tickets
                </h3>
                <div className="text-lg font-bold font-mono" style={{ color: ACCENT_RED }}>
                  {formatSol(SPECIAL_EVENT_TICKET_PRICE_SOL)}
                </div>
              </div>
            </div>

            {/* Quantity selector */}
            <div className="mb-8">
              <label className="block text-sm font-medium mb-3 font-mono text-center" style={{ color: TEXT_MID }}>
                Quantity
              </label>
              <div className="flex items-center justify-center space-x-6">
                <motion.button
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className="w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT_BLUE}08, ${ACCENT_BLUE}04)`,
                    border: `1px solid ${ACCENT_BLUE}20`,
                    color: ACCENT_BLUE,
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
                    style={{ color: TEXT_DARK }}
                    min="1"
                    max="1000"
                  />
                  <div className="text-xs font-mono mt-1" style={{ color: TEXT_MID }}>tickets</div>
                </div>

                <motion.button
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= 1000}
                  className="w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT_RED}08, ${ACCENT_RED}04)`,
                    border: `1px solid ${ACCENT_RED}20`,
                    color: ACCENT_RED,
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
              background: `linear-gradient(135deg, ${ACCENT_BLUE}06, ${ACCENT_RED}04)`,
              border: `1px solid ${ACCENT_BLUE}15`,
            }}>
              <div className="text-sm font-medium font-mono mb-2" style={{ color: TEXT_MID }}>
                TOTAL COST ({quantity} ticket{quantity > 1 ? 's' : ''})
              </div>
              <div className="flex items-center justify-center space-x-4">
                <div className="text-2xl font-bold font-mono" style={{ color: ACCENT_BLUE }}>
                  {formatSol(totalSol)}
                </div>
                <div className="text-lg font-mono" style={{ color: ACCENT_RED }}>
                  {formatUsd(totalUsd)}
                </div>
              </div>
              {isConnected && (
                <div className="text-xs font-mono mt-2" style={{ color: TEXT_MID }}>
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
                  background: `${ACCENT_RED}10`,
                  border: `1px solid ${ACCENT_RED}30`,
                }}
              >
                <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: ACCENT_RED }} />
                <p className="text-sm font-mono" style={{ color: ACCENT_RED }}>{error}</p>
              </motion.div>
            )}

            {/* Purchase button */}
            <motion.button
              ref={buttonRef}
              onClick={handlePurchase}
              disabled={!isConnected || isLoading}
              className="w-full py-5 rounded-xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
              style={{
                background: isConnected
                  ? `linear-gradient(135deg, ${ACCENT_BLUE}, ${ACCENT_RED})`
                  : `${ACCENT_BLUE}10`,
                color: isConnected ? '#ffffff' : TEXT_MID,
                boxShadow: isConnected ? `0 4px 20px ${ACCENT_BLUE}30` : 'none',
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
                      filter: 'brightness(2) contrast(1.2)',
                    }}
                  />
                  <span>
                    {isConnected
                      ? `Buy ${quantity} Ticket${quantity > 1 ? 's' : ''}`
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
                    background: `linear-gradient(135deg, ${ACCENT_BLUE}10, ${ACCENT_RED}08)`,
                    border: `1px solid ${ACCENT_BLUE}25`,
                  }}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ background: ACCENT_BLUE }}
                    />
                    <p className="text-sm font-semibold font-mono" style={{ color: ACCENT_BLUE }}>
                      TICKETS PURCHASED!
                    </p>
                  </div>
                  <p className="text-xs font-mono ml-5" style={{ color: TEXT_MID }}>
                    TX_ID: {txId}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {!isConnected && (
              <p className="text-xs text-center mt-4 font-mono" style={{ color: TEXT_MID }}>
                Connect your wallet to purchase tickets
              </p>
            )}
          </motion.div>
        </div>

        {/* Winners Display */}
        <div className="mt-16">
          <WinnersDisplay
            title="Winners"
            accentColor={ACCENT_BLUE}
            lotteryType="special-event"
          />
        </div>
      </div>
    </div>
  );
}
