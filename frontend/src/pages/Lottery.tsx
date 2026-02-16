import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, Clock, TrendingUp, Zap, Shield, Target } from 'lucide-react';
import { theme } from '../theme';
import { useNavigate } from 'react-router-dom';
import { Countdown } from '../components/Countdown';
import { TicketPurchaseCard } from '../components/TicketPurchaseCard';
import { WinnersDisplay } from '../components/WinnersDisplay';
import { statsService, LotteryStats } from '../services/statsService';

export function Lottery() {
  const navigate = useNavigate();
  const [lotteryStats, setLotteryStats] = useState<LotteryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      const data = await statsService.getLotteryStats();
      setLotteryStats(data);
      setLoading(false);
    };

    loadStats();
    const interval = setInterval(loadStats, 30000);

    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: 'Active Players', value: loading ? '...' : statsService.formatNumber(lotteryStats?.activePlayers || 0), icon: Users, color: theme.colors.neonBlue },
    { label: 'Total Prizes', value: loading ? '...' : statsService.formatUSD(lotteryStats?.totalPrizesUSD || 0), icon: Trophy, color: theme.colors.neonCyan },
    { label: 'Avg Win Time', value: lotteryStats?.averageWinTime || '2.3s', icon: Clock, color: theme.colors.neonPink },
    { label: 'Success Rate', value: `${lotteryStats?.successRate || 99.9}%`, icon: TrendingUp, color: theme.colors.neonPurple },
  ];

  return (
    <div className="min-h-screen pt-20 pb-20 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        {/* Purple Terminal Matrix Background */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(0deg, rgba(147, 51, 234, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(147, 51, 234, 0.08) 1px, transparent 1px),
              linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(30, 10, 40, 0.95) 100%)
            `,
            backgroundSize: '20px 20px, 20px 20px, 100% 100%',
          }}
        />
        
        {/* Terminal scanner effect */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(147, 51, 234, 0.02) 2px,
                rgba(147, 51, 234, 0.02) 4px
              )
            `,
            animation: 'purpleTerminalScan 4s linear infinite',
          }}
        />
        
        <style jsx>{`
          @keyframes purpleTerminalScan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
          }
        `}</style>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Terminal corner decorations */}
        <div className="absolute top-24 left-6 text-xs font-mono text-purple-400/60 md:block hidden sm:block">
          [SYSTEM_ACTIVE]
        </div>
        <div className="absolute top-24 right-6 text-xs font-mono text-purple-400/60 md:block hidden sm:block">
          [LOTTERY_MODULE]
        </div>
        
        {/* Mobile terminal indicators */}
        <div className="block sm:hidden text-center pt-4 pb-2">
          <div className="flex justify-center space-x-4 text-xs font-mono text-purple-400/80">
            <span>[SYSTEM_ACTIVE]</span>
            <span>[LOTTERY_MODULE]</span>
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
              onClick={() => navigate('/halloween')}
              className="rounded-2xl border backdrop-blur-md cursor-pointer overflow-hidden w-full md:w-[200px] h-[100px] md:h-[120px]"
              style={{
                background: 'linear-gradient(135deg, rgba(173, 216, 230, 0.35), rgba(135, 206, 250, 0.3))',
                borderColor: 'rgba(135, 206, 250, 0.5)',
                boxShadow: '0 0 20px rgba(135, 206, 250, 0.3)',
              }}
            >
              <div className="w-full h-full flex items-center justify-center p-2">
                <img
                  src="https://i.imgur.com/iE2Hq9n.png"
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
                background: `linear-gradient(135deg, ${theme.colors.neonPink}20, ${theme.colors.neonPurple}15)`,
                borderColor: `${theme.colors.neonPink}60`,
                boxShadow: `0 0 30px ${theme.colors.neonPink}40`,
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
                background: 'linear-gradient(135deg, rgba(0, 100, 180, 0.2), rgba(0, 80, 150, 0.15))',
                borderColor: 'rgba(0, 120, 200, 0.5)',
                boxShadow: '0 0 30px rgba(0, 100, 180, 0.4)',
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
              background: theme.gradients.neon,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Tri-Daily Lottery
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Join the most exciting lottery on Solana. Draws every 3 days with instant payouts! Odds 1:10
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto mb-16">
          {/* Countdown */}
          <Countdown />

          {/* Ticket Purchase */}
          <TicketPurchaseCard />
        </div>

        <WinnersDisplay
          title="Winners"
          accentColor={theme.colors.neonPink}
          lotteryType="tri-daily"
        />
      </div>
    </div>
  );
}