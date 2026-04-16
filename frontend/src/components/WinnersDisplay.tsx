import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { winnersService, Winner } from '../services/winnersService';
import { theme } from '../theme';
import { solToUsd } from '../chain/adapter';
import { solPriceService } from '../services/solPriceService';

interface WinnersDisplayProps {
  title?: string;
  accentColor?: string;
  lotteryType: 'tri-daily' | 'special-event' | 'jackpot' | 'grand-prize';
}

export function WinnersDisplay({
  title = 'Winners',
  accentColor = theme.colors.neonPink,
  lotteryType
}: WinnersDisplayProps) {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState<number[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [, setSolPrice] = useState(solPriceService.getPrice());

  useEffect(() => {
    return solPriceService.subscribe((price) => setSolPrice(price));
  }, []);

  const loadRounds = useCallback(async () => {
    const available = await winnersService.getAvailableRounds(lotteryType);
    setRounds(available);
    setCurrentRoundIndex(0);
  }, [lotteryType]);

  const loadWinnersForRound = useCallback(async (round: number) => {
    setLoading(true);
    try {
      const data = await winnersService.getWinnersByRound(lotteryType, round);
      let filteredWinners = data;

      switch (lotteryType) {
        case 'jackpot':
          filteredWinners = data.slice(0, 100);
          break;
        case 'grand-prize':
          filteredWinners = data.slice(0, 3);
          break;
        default:
          filteredWinners = data;
          break;
      }
      setWinners(filteredWinners);
    } catch (error) {
      console.error('Error loading winners:', error);
    } finally {
      setLoading(false);
    }
  }, [lotteryType]);

  useEffect(() => {
    loadRounds();
  }, [loadRounds]);

  useEffect(() => {
    if (rounds.length > 0) {
      loadWinnersForRound(rounds[currentRoundIndex]);
    } else {
      setWinners([]);
      setLoading(false);
    }
  }, [rounds, currentRoundIndex, loadWinnersForRound]);

  useEffect(() => {
    if (rounds.length === 0) return;
    const interval = setInterval(() => {
      loadWinnersForRound(rounds[currentRoundIndex]);
    }, 30000);
    return () => clearInterval(interval);
  }, [rounds, currentRoundIndex, loadWinnersForRound]);

  const goToPreviousRound = () => {
    if (currentRoundIndex < rounds.length - 1) {
      setCurrentRoundIndex(prev => prev + 1);
    }
  };

  const goToNextRound = () => {
    if (currentRoundIndex > 0) {
      setCurrentRoundIndex(prev => prev - 1);
    }
  };

  const isLatestRound = currentRoundIndex === 0;
  const isOldestRound = currentRoundIndex >= rounds.length - 1;
  const currentRound = rounds[currentRoundIndex];

  const getRoundDateLabel = (): string => {
    if (winners.length > 0 && winners[0].draw_date) {
      return new Date(winners[0].draw_date).toLocaleDateString();
    }
    return `Round #${currentRound}`;
  };

  const sortedWinners = [...winners].sort((a, b) => b.prizeSol - a.prizeSol);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.8 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-center space-x-3 mb-8">
        <div
          className="p-3 rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}10)`,
            border: `1px solid ${accentColor}40`,
          }}
        >
          <img
            src="https://i.imgur.com/F5w1guM.png"
            alt="Trophy"
            className="w-6 h-6 object-contain"
            style={{
              filter: `brightness(1.2) contrast(1.1) drop-shadow(0 0 8px ${accentColor}60)`,
            }}
          />
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: theme.colors.text, fontFamily: 'Orbitron, monospace' }}>
            {title}
          </h2>
        </div>
      </div>
      <div
        className="p-6 rounded-2xl border"
        style={{
          background: theme.gradients.card,
          borderColor: accentColor,
          boxShadow: `0 0 30px ${accentColor}20`,
          backdropFilter: 'blur(20px)',
        }}
      >
        {rounds.length > 1 && (
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: `1px solid ${accentColor}20` }}>
            <motion.button
              onClick={goToPreviousRound}
              disabled={isOldestRound}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg font-mono text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: isOldestRound ? 'rgba(255,255,255,0.02)' : `${accentColor}15`,
                border: `1px solid ${isOldestRound ? 'rgba(255,255,255,0.05)' : `${accentColor}40`}`,
                color: accentColor,
              }}
              whileHover={isOldestRound ? {} : { scale: 1.05, background: `${accentColor}25` }}
              whileTap={isOldestRound ? {} : { scale: 0.95 }}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">OLDER</span>
            </motion.button>

            <div className="flex flex-col items-center">
              <span className="font-mono text-xs text-zinc-400 uppercase tracking-wider">
                {isLatestRound ? 'Latest Draw' : 'Past Draw'}
              </span>
              <span className="font-mono text-sm font-bold" style={{ color: accentColor }}>
                {currentRound !== undefined ? getRoundDateLabel() : '—'}
              </span>
            </div>

            <motion.button
              onClick={goToNextRound}
              disabled={isLatestRound}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg font-mono text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: isLatestRound ? 'rgba(255,255,255,0.02)' : `${accentColor}15`,
                border: `1px solid ${isLatestRound ? 'rgba(255,255,255,0.05)' : `${accentColor}40`}`,
                color: accentColor,
              }}
              whileHover={isLatestRound ? {} : { scale: 1.05, background: `${accentColor}25` }}
              whileTap={isLatestRound ? {} : { scale: 0.95 }}
            >
              <span className="hidden sm:inline">NEWER</span>
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        )}

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-zinc-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: accentColor }}></div>
              <p>Loading winners...</p>
            </div>
          ) : winners.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentRound}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {sortedWinners.map((winner, index) => (
                  <motion.div
                    key={`${winner.id}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-lg"
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <img
                          src={index === 0 ? "https://i.imgur.com/jF1YzEF.png" : index === 1 ? "https://i.imgur.com/8WfHMkU.png" : index === 2 ? "https://i.imgur.com/r6hiZta.png" : "https://i.imgur.com/oNzelCb.png"}
                          alt={`${index + 1}º lugar`}
                          className="w-8 h-8 object-contain"
                          style={{
                            filter: `brightness(1.2) contrast(1.1) drop-shadow(0 0 8px ${accentColor}60)`,
                          }}
                        />
                      </div>
                      <div>
                        <div className="font-mono text-sm" style={{ color: theme.colors.text }}>
                          {winner.maskedWallet}
                        </div>
                        <div className="text-xs text-zinc-400">
                          Ticket #{winner.ticket_number} • {new Date(winner.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex flex-col items-end space-y-1">
                        <motion.img
                          src="https://i.imgur.com/eE1m8fp.png"
                          alt="Solana Coin"
                          className="w-8 h-8 rounded-full object-cover"
                          animate={{
                            rotate: [0, 360],
                          }}
                          transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                        />
                        <div className="font-bold" style={{ color: theme.colors.neonCyan }}>
                          {winner.prizeSol.toFixed(2)} SOL
                        </div>
                      </div>
                      <div className="text-xs text-zinc-400">
                        ≈ ${solToUsd(winner.prizeSol).toFixed(2)}
                      </div>
                      {winner.claimed && (
                        winner.claim_signature ? (
                          <a
                            href={`https://solscan.io/tx/${winner.claim_signature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-green-400 mt-1 hover:text-green-300 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>Claimed</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <div className="text-xs text-green-400 mt-1">
                            Claimed
                          </div>
                        )
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="text-center py-8 text-zinc-400">
              <img
                src="https://i.imgur.com/T3PVktI.png"
                alt="PWRS Ticket"
                className="w-8 h-8 object-contain mx-auto mb-4"
                style={{
                  filter: 'brightness(1.3) contrast(1.2) drop-shadow(0 0 8px rgba(62, 203, 255, 0.6))',
                }}
              />
              <p>No recent winners yet. Be the first!</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
