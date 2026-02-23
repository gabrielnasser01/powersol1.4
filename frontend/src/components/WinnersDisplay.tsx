import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { winnersService, Winner } from '../services/winnersService';
import { theme } from '../theme';
import { solToUsd } from '../chain/adapter';

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

  useEffect(() => {
    const loadWinners = async () => {
      setLoading(true);
      try {
        const data = await winnersService.getLatestRoundWinners(lotteryType);

        let filteredWinners = data;

        switch (lotteryType) {
          case 'jackpot':
            filteredWinners = data.slice(0, 100);
            break;
          case 'grand-prize':
            filteredWinners = data.slice(0, 3);
            break;
          case 'tri-daily':
          case 'special-event':
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
    };

    loadWinners();
    const interval = setInterval(loadWinners, 30000);

    return () => clearInterval(interval);
  }, [lotteryType]);

  const sortedWinners = winners.sort((a, b) => b.prizeSol - a.prizeSol);

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
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-zinc-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: accentColor }}></div>
              <p>Loading winners...</p>
            </div>
          ) : winners.length > 0 ? (
            <>
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
                      <div className="text-xs text-green-400 mt-1">
                        ✓ Claimed
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </>
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
