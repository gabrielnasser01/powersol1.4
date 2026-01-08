import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { chainAdapter } from '../chain/adapter';
import { lotteryService, NextDraw } from '../services/lotteryService';

export function Countdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [nextDraw, setNextDraw] = useState<NextDraw | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalPool, setGlobalPool] = useState({ prizePoolSol: 0, prizePoolUsd: 0, ticketCount: 0 });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [draw, globalState] = await Promise.all([
          lotteryService.getNextDraw(),
          chainAdapter.getGlobalPoolState()
        ]);
        setNextDraw(draw);
        setGlobalPool(globalState);
      } catch (error) {
        console.error('Failed to load lottery data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const poolInterval = setInterval(async () => {
      try {
        const [draw, globalState] = await Promise.all([
          lotteryService.getNextDraw(),
          chainAdapter.getGlobalPoolState()
        ]);
        setNextDraw(draw);
        setGlobalPool(globalState);
      } catch (error) {
        console.error('Failed to refresh pool state:', error);
      }
    }, 30000);

    return () => clearInterval(poolInterval);
  }, []);

  useEffect(() => {
    if (!nextDraw) return;

    const updateCountdown = () => {
      const now = Date.now();
      const difference = nextDraw.scheduledAt - now;

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

    return () => clearInterval(interval);
  }, [nextDraw]);

  const timeUnits = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl border text-center relative overflow-hidden"
      style={{
        background: `
          linear-gradient(0deg, rgba(255, 20, 147, 0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 20, 147, 0.08) 1px, transparent 1px),
          linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(10, 10, 10, 0.95) 100%)
        `,
        backgroundSize: '20px 20px, 20px 20px, 100% 100%',
        borderColor: 'rgba(255, 20, 147, 0.5)',
        boxShadow: '0 0 25px rgba(255, 20, 147, 0.4), inset 0 0 40px rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(20px)',
        fontFamily: 'monospace',
      }}
    >
      {/* Terminal scan lines effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(255, 20, 147, 0.02) 2px,
              rgba(255, 20, 147, 0.02) 4px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 3px,
              rgba(0, 255, 255, 0.02) 3px,
              rgba(0, 255, 255, 0.02) 6px
            )
          `,
          animation: 'terminalScan 4s linear infinite',
        }}
      />
      
      {/* Terminal corner indicators */}
      <div className="absolute top-2 left-2 text-xs font-mono text-pink-400/60">
        [DRAW_SYS]
      </div>
      <div className="absolute top-2 right-2 text-xs font-mono text-pink-400/60">
        [ACTIVE]
      </div>
      
      <style>{`
        @keyframes terminalScan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>

      <div className="flex items-center justify-center space-x-3 mb-6">
        <div className="text-center">
          <h3 className="text-xl font-bold font-mono" style={{ color: '#ffffff' }}>
            Next Draw
          </h3>
          <p className="text-pink-300/70 capitalize font-mono text-sm">
            {loading ? 'Loading...' : (nextDraw?.kind || 'No upcoming draws')}
          </p>
        </div>
      </div>

      {/* Prize Pool Display */}
      <div className="mb-6 p-4 rounded-xl relative" style={{ 
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(30, 30, 30, 0.4))',
        border: '1px solid rgba(255, 20, 147, 0.3)',
        boxShadow: 'inset 0 0 20px rgba(255, 20, 147, 0.1)'
      }}>
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Trophy className="w-5 h-5" style={{ color: '#ff1493' }} />
          <span className="text-sm font-medium font-mono" style={{ color: '#ffffff' }}>Current Prize Pool</span>
        </div>
        <div className="flex items-center justify-center space-x-3 relative">
          {/* Prize Pool with coin animation */}
          <motion.div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, #ff1493, #ff69b4)',
              boxShadow: '0 0 10px rgba(255, 20, 147, 0.5)',
            }}
            animate={{
              scale: [1, 1.1, 1],
              boxShadow: [
                '0 0 10px rgba(255, 20, 147, 0.5)',
                '0 0 20px rgba(255, 105, 180, 0.8)',
                '0 0 10px rgba(255, 20, 147, 0.5)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            $
          </motion.div>
          <div className="text-2xl font-bold font-mono" style={{ 
          color: '#ff1493',
          textShadow: '0 0 10px rgba(255, 20, 147, 0.5)'
        }}>
          ${globalPool.prizePoolUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        </div>
        <div className="flex items-center justify-center space-x-2 mt-1">
          <motion.div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <img
              src="https://i.imgur.com/eE1m8fp.png"
              alt="Moeda"
              className="w-full h-full rounded-full object-cover"
            />
          </motion.div>
          <div className="text-lg font-mono" style={{ 
          color: '#00ffff',
          textShadow: '0 0 8px rgba(0, 255, 255, 0.4)'
        }}>
          {globalPool.prizePoolSol.toFixed(2)} SOL
        </div>
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
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(30, 30, 30, 0.5))',
              border: '1px solid rgba(255, 20, 147, 0.3)',
              boxShadow: 'inset 0 0 15px rgba(255, 20, 147, 0.1)',
            }}
          >
            <motion.div
              key={unit.value}
              initial={{ scale: 1.2, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-lg sm:text-2xl md:text-3xl font-bold mb-1"
              style={{ 
                color: '#ffffff',
                fontFamily: 'monospace',
                textShadow: '0 0 8px rgba(255, 20, 147, 0.6)',
              }}
            >
              {unit.value.toString().padStart(2, '0')}
            </motion.div>
            <div className="text-xs uppercase tracking-wide font-mono" style={{ color: '#ff69b4' }}>
              <span className="hidden sm:inline">{unit.label}</span>
              <span className="sm:hidden">{unit.label.slice(0, 3)}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 rounded-lg"
          style={{
            background: 'rgba(255, 20, 147, 0.2)',
            border: '1px solid rgba(255, 20, 147, 0.4)',
          }}
        >
          <p className="text-sm font-medium font-mono" style={{ color: '#ff1493' }}>
            Draw is happening now! 🎉
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}