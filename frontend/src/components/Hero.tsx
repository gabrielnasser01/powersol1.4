import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, Play, Sparkles, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { theme } from '../theme';
import { useMagnetic } from '../hooks/useMagnetic';
import { userStorage } from '../store/persist';
import { OptimizedImage } from './OptimizedImage';

export function Hero() {
  const [isHovered, setIsHovered] = useState(false);
  const [user, setUser] = useState(userStorage.get());
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const isConnected = !!user.publicKey;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);
  
  useMagnetic(buttonRef);
  useMagnetic(playButtonRef);

  // Listen for storage changes to sync across components
  React.useEffect(() => {
    const handleStorageChange = () => {
      setUser(userStorage.get());
    };

    window.addEventListener('walletStorageChange', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('walletStorageChange', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleConnect = () => {
    if (isConnected) {
      userStorage.clear();
      setUser({});
      window.dispatchEvent(new CustomEvent('walletStorageChange'));
    } else {
      // Trigger the same wallet connection as navbar
      const walletButton = document.querySelector('[data-wallet-connect]');
      if (walletButton) {
        (walletButton as HTMLElement).click();
      }
    }
  };
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Grid Pattern */}
        <motion.div
          className="absolute inset-0 opacity-20"
          style={{
            background: `
              linear-gradient(0deg, rgba(62, 203, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(62, 203, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
          animate={{
            backgroundPosition: ['0px 0px', '25px 25px', '50px 50px'],
          }}
          transition={{
            duration: 60,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Scanning Lines Effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(62, 203, 255, 0.03) 2px,
                rgba(62, 203, 255, 0.03) 4px
              )
            `,
          }}
          animate={{
            y: ['-100%', '100%'],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Corner Accent Lights */}
        {[
          { position: 'top-0 left-0', color: theme.colors.neonBlue },
          { position: 'top-0 right-0', color: theme.colors.neonPink },
          { position: 'bottom-0 left-0', color: theme.colors.neonCyan },
          { position: 'bottom-0 right-0', color: theme.colors.neonPurple },
        ].map((corner, i) => (
          <motion.div
            key={`corner-${i}`}
            className={`absolute ${corner.position} w-32 h-32 pointer-events-none`}
            style={{
              background: `radial-gradient(circle at ${i % 2 === 0 ? 'top left' : 'top right'}, ${corner.color}20 0%, transparent 70%)`,
              filter: 'blur(20px)',
            }}
            animate={{
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3 + (i * 0.5),
              delay: i * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}

        {/* Data Stream Effect */}
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={`stream-${i}`}
            className="absolute w-px opacity-30"
            style={{
              left: `${20 + (i * 15)}%`,
              top: '0%',
              height: '100%',
              background: `linear-gradient(to bottom, transparent, ${theme.colors.neonBlue}60, transparent)`,
            }}
            animate={{
              scaleY: [0, 1, 0],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 2,
              delay: i * 0.3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-6xl mx-auto">
        {/* Terminal corner decorations removed */}
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <motion.h1 
            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight"
            style={{ 
              fontFamily: 'Orbitron, monospace',
              background: theme.gradients.neon,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 0 40px rgba(62, 203, 255, 0.5)',
            }}
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            powerSOL
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl lg:text-3xl mb-8 text-zinc-300 max-w-4xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              fontFamily: 'Orbitron, monospace',
              background: 'linear-gradient(135deg, #ffffff 0%, #3ecbff 30%, #ff4ecd 60%, #2fffe2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 0 30px rgba(62, 203, 255, 0.3)',
              letterSpacing: '0.5px',
            }}
          >
            <div className="relative inline-block">
              <motion.span
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 30%, #e9ecef 60%, #ffffff 100%)',
                  backgroundSize: '200% 200%',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.6), 0 0 60px rgba(255, 255, 255, 0.4)',
                }}
              >
                Welcome to PowerSOL -- Your Lottery on Solana
              </motion.span>
            
              {/* Glowing underline effect */}
              <motion.div
                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-0.5"
                style={{
                  width: '50%',
                  background: 'linear-gradient(90deg, transparent, #3ecbff 20%, #ff4ecd 40%, #2fffe2 60%, #b347ff 80%, transparent)',
                  boxShadow: '0 0 15px rgba(62, 203, 255, 0.8), 0 0 30px rgba(255, 78, 205, 0.6), 0 0 45px rgba(47, 255, 226, 0.4)',
                  borderRadius: '2px',
                }}
                animate={{
                  opacity: [0.4, 1, 0.4],
                  scaleX: [0.9, 1.1, 0.9],
                  boxShadow: [
                    '0 0 15px rgba(62, 203, 255, 0.8), 0 0 30px rgba(255, 78, 205, 0.6)',
                    '0 0 25px rgba(62, 203, 255, 1), 0 0 50px rgba(255, 78, 205, 0.8), 0 0 75px rgba(47, 255, 226, 0.6)',
                    '0 0 15px rgba(62, 203, 255, 0.8), 0 0 30px rgba(255, 78, 205, 0.6)'
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </div>
            
            {/* Floating particles around text */}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full pointer-events-none"
                style={{
                  left: `${20 + (i * 10)}%`,
                  top: `${40 + Math.sin(i) * 20}%`,
                  background: i % 4 === 0 ? '#3ecbff' : i % 4 === 1 ? '#ff4ecd' : i % 4 === 2 ? '#2fffe2' : '#ffffff',
                  boxShadow: `0 0 8px ${i % 4 === 0 ? '#3ecbff' : i % 4 === 1 ? '#ff4ecd' : i % 4 === 2 ? '#2fffe2' : '#ffffff'}`,
                }}
                animate={{
                  y: [0, -15, 0],
                  x: [0, Math.sin(i) * 10, 0],
                  opacity: [0.3, 0.8, 0.3],
                  scale: [1, 1.3, 1],
                }}
                transition={{
                  duration: 3 + (i * 0.2),
                  delay: i * 0.3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12"
        >
            <motion.button
              ref={buttonRef}
              onClick={handleConnect}
              className="px-2 md:px-3 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-1 font-mono relative overflow-hidden text-xs md:text-sm group cursor-pointer"
              style={{
               background: isConnected 
                 ? 'linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(0, 255, 136, 0.1))' 
                 : 'linear-gradient(135deg, #ff1493, #9333ea, #3b82f6)',
               color: isConnected ? '#00ff88' : '#000',
               boxShadow: isConnected 
                 ? '0 0 20px rgba(0, 255, 136, 0.4)' 
                 : '0 0 20px rgba(255, 20, 147, 0.5)',
               border: isConnected ? '1px solid rgba(0, 255, 136, 0.4)' : 'none',
               textTransform: 'uppercase',
               letterSpacing: '0.5px',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="absolute inset-0 rounded-lg"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                }}
                animate={{ x: [-100, 100] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
              
              <div className="relative z-10 flex items-center space-x-1">
                <motion.div
                  animate={isConnected ? { rotate: [0, 10, -10, 0] } : {}}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Wallet className="w-3 h-3 md:w-4 md:h-4" />
                </motion.div>
                <span className="hidden sm:inline">
                  {isConnected 
                    ? `${user.publicKey?.slice(0, 3)}...${user.publicKey?.slice(-3)}`
                    : 'CONNECT_WALLET'
                  }
                </span>
                <span className="sm:hidden">
                  {isConnected 
                    ? `${user.publicKey?.slice(0, 2)}...${user.publicKey?.slice(-2)}`
                    : 'CONNECT_WALLET'
                  }
                </span>
              </div>
            </motion.button>

          <Link to="/faq">
            <motion.button
              ref={playButtonRef}
              className="px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 border group"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: theme.colors.text,
                backdropFilter: 'blur(10px)',
              }}
              whileHover={{
                background: 'rgba(255, 255, 255, 0.1)',
                scale: 1.02,
              }}
              whileTap={{ scale: 0.98 }}
            >
              <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>How it works</span>
            </motion.button>
          </Link>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="absolute -bottom-16 left-1/2 transform -translate-x-1/2"
        >
          <div className="text-center">
            <p className="text-zinc-400 text-sm mb-4">Scroll to explore</p>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-6 h-10 border-2 rounded-full flex justify-center mx-auto"
              style={{ borderColor: 'rgba(255, 255, 255, 0.3)' }}
            >
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1 h-3 rounded-full mt-2"
                style={{ background: theme.colors.neonBlue }}
              />
            </motion.div>
          </div>
        </motion.div>
      </div>

    </section>
  );
}