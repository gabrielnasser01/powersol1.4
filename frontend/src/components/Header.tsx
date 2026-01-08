import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Menu, X, Zap, Home, Activity, Users, User, Shield, Target } from 'lucide-react';
import { WalletConnection } from './WalletConnection';
import { theme } from '../theme';
import { useThrottledScroll } from '../hooks/useSpotifyOptimizations';
import { supabase } from '../lib/supabase';
import { userStatsStorage } from '../store/persist';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [missionPoints, setMissionPoints] = useState(0);
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const loadPointsFromDB = async () => {
      try {
        const userDataStr = localStorage.getItem('powerSOL.user');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          if (userData.publicKey) {
            const { data } = await supabase
              .from('users')
              .select('power_points')
              .eq('wallet_address', userData.publicKey)
              .maybeSingle();

            if (data?.power_points !== undefined) {
              setMissionPoints(data.power_points);
              const currentStats = userStatsStorage.get();
              if (currentStats.missionPoints !== data.power_points) {
                currentStats.missionPoints = data.power_points;
                userStatsStorage.set(currentStats);
              }
              return;
            }
          }
        }

        const userStatsData = localStorage.getItem('powerSOL.userStats');
        if (userStatsData) {
          const stats = JSON.parse(userStatsData);
          setMissionPoints(stats.missionPoints || 0);
        }
      } catch (e) {
        const userStatsData = localStorage.getItem('powerSOL.userStats');
        if (userStatsData) {
          const stats = JSON.parse(userStatsData);
          setMissionPoints(stats.missionPoints || 0);
        }
      }
    };

    const loadPointsFromLocal = () => {
      try {
        const userStatsData = localStorage.getItem('powerSOL.userStats');
        if (userStatsData) {
          const stats = JSON.parse(userStatsData);
          setMissionPoints(stats.missionPoints || 0);
        }
      } catch (e) {
        setMissionPoints(0);
      }
    };

    loadPointsFromDB();

    window.addEventListener('storage', loadPointsFromLocal);
    window.addEventListener('missionPointsChange', loadPointsFromDB);
    window.addEventListener('walletConnected', loadPointsFromDB);

    return () => {
      window.removeEventListener('storage', loadPointsFromLocal);
      window.removeEventListener('missionPointsChange', loadPointsFromDB);
      window.removeEventListener('walletConnected', loadPointsFromDB);
    };
  }, []);
  
  // Optimized scroll handler
  useThrottledScroll((scrollY) => {
    setIsScrolled(scrollY > 20);
  }, 8); // 120fps for ultra-smooth header

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Lottery', path: '/lottery', icon: Activity },
    { name: 'Affiliates', path: '/affiliates', icon: Users },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Transparency', path: '/transparency', icon: Shield },
    { name: 'Missions', path: '/missions', icon: Target },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleNavClick = () => {
    setIsMenuOpen(false);
    // Small delay to ensure navigation happens first
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: `rgba(10, 11, 15, ${isScrolled ? 0.95 : 0.9})`,
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${theme.colors.border}`,
        boxShadow: isScrolled ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.2)',
      }}
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 mr-8">
            <motion.div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: theme.gradients.button,
                boxShadow: theme.shadows.buttonGlow,
              }}
              whileHover={{ scale: 1.1, rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <Zap className="w-6 h-6 text-black" />
            </motion.div>
            
            <span 
              className="text-xl sm:text-2xl font-bold"
              style={{ 
                fontFamily: 'Orbitron, monospace',
                background: theme.gradients.neon,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              powerSOL
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300"
                  style={{
                    color: active ? theme.colors.neonBlue : theme.colors.textMuted,
                    background: active ? `${theme.colors.neonBlue}20` : 'transparent',
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mission Points Display - Desktop */}
          <Link to="/missions">
            <motion.div
              className="hidden lg:flex items-center space-x-2 px-4 py-2 rounded-xl ml-auto mr-4 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  background: theme.gradients.button,
                  boxShadow: theme.shadows.buttonGlow,
                }}
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Zap className="w-4 h-4 text-black" />
              </motion.div>
              <span
                className="font-mono font-bold text-sm"
                style={{
                  color: theme.colors.text,
                }}
              >
                {missionPoints.toLocaleString()}
              </span>
            </motion.div>
          </Link>

          {/* Desktop Wallet Connection */}
          <div className="hidden lg:block">
            <WalletConnection />
          </div>

          {/* Mobile: Mission Points and Menu Button */}
          <div className="lg:hidden flex items-center space-x-3">
            {/* Mission Points - Mobile */}
            <Link to="/missions">
              <motion.div
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.neonBlue}15, ${theme.colors.neonBlue}08)`,
                  border: `1px solid ${theme.colors.neonBlue}40`,
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{
                    background: theme.gradients.button,
                    boxShadow: theme.shadows.buttonGlow,
                  }}
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Zap className="w-3 h-3 text-black" />
                </motion.div>
                <span
                  className="font-mono font-bold text-xs"
                  style={{
                    color: theme.colors.neonBlue,
                  }}
                >
                  {missionPoints.toLocaleString()}
                </span>
              </motion.div>
            </Link>

            {/* Mobile Menu Button */}
            <motion.button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="relative px-3 py-1.5 rounded-lg font-semibold overflow-hidden"
              style={{
                background: theme.gradients.button,
                color: '#000',
                boxShadow: theme.shadows.buttonGlow,
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                  backgroundSize: '200% 200%',
                }}
                animate={{
                  backgroundPosition: ['0% 0%', '100% 100%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
              <span className="relative z-10 flex items-center">
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </span>
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className="lg:hidden border-t relative overflow-hidden max-h-[calc(100vh-4rem)]"
              style={{ 
                borderColor: theme.colors.border,
                background: `
                  linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(10, 11, 15, 0.95) 100%),
                  linear-gradient(0deg, rgba(62, 203, 255, 0.05) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(62, 203, 255, 0.05) 1px, transparent 1px)
                `,
                backgroundSize: '100% 100%, 20px 20px, 20px 20px',
                backdropFilter: 'blur(20px)',
                boxShadow: 'inset 0 1px 0 rgba(62, 203, 255, 0.2), 0 10px 30px rgba(0, 0, 0, 0.5)',
              }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ 
                duration: 0.4, 
                ease: [0.4, 0, 0.2, 1],
                height: { duration: 0.3 }
              }}
            >
              {/* Animated scanner line */}
              <motion.div
                className="absolute top-0 left-0 w-full h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${theme.colors.neonBlue}, transparent)`,
                }}
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
              
              <div className="py-3 px-2 overflow-y-auto max-h-[calc(100vh-5rem)]">
                <nav className="flex flex-col space-y-1 mb-4">
                  {navItems.map((item, index) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    
                    return (
                      <motion.div
                        key={item.path}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          duration: 0.4, 
                          delay: index * 0.1,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                      >
                        <Link
                          to={item.path}
                          onClick={handleNavClick}
                          className="group flex items-center space-x-3 px-3 py-3 mx-2 rounded-xl transition-all duration-300 relative overflow-hidden"
                          style={{
                            color: active ? theme.colors.neonBlue : theme.colors.text,
                            background: active 
                              ? `linear-gradient(135deg, ${theme.colors.neonBlue}15, ${theme.colors.neonBlue}08)`
                              : 'transparent',
                            border: active 
                              ? `1px solid ${theme.colors.neonBlue}40` 
                              : '1px solid transparent',
                            boxShadow: active 
                              ? `0 0 20px ${theme.colors.neonBlue}20, inset 0 1px 0 ${theme.colors.neonBlue}30`
                              : 'none',
                          }}
                        >
                          {/* Hover effect background */}
                          <motion.div
                            className="absolute inset-0 rounded-xl"
                            style={{
                              background: `linear-gradient(135deg, ${theme.colors.neonBlue}10, transparent)`,
                              opacity: 0,
                            }}
                            whileHover={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          />
                          
                          {/* Icon with glow effect */}
                          <motion.div
                            className="relative z-10 p-1.5 rounded-lg"
                            style={{
                              background: active 
                                ? `${theme.colors.neonBlue}20` 
                                : 'rgba(255, 255, 255, 0.05)',
                              border: `1px solid ${active ? theme.colors.neonBlue : 'rgba(255, 255, 255, 0.1)'}40`,
                            }}
                            whileHover={{ 
                              scale: 1.1,
                              boxShadow: `0 0 15px ${theme.colors.neonBlue}40`,
                            }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Icon 
                              className="w-4 h-4" 
                              style={{
                                filter: active ? `drop-shadow(0 0 8px ${theme.colors.neonBlue})` : 'none'
                              }}
                            />
                          </motion.div>
                          
                          {/* Text with glow */}
                          <span 
                            className="font-semibold text-base relative z-10"
                            style={{
                              textShadow: active ? `0 0 10px ${theme.colors.neonBlue}60` : 'none'
                            }}
                          >
                            {item.name}
                          </span>
                          
                          {/* Active indicator */}
                          {active && (
                            <motion.div
                              className="absolute right-3 w-2 h-2 rounded-full"
                              style={{ background: theme.colors.neonBlue }}
                              animate={{
                                scale: [1, 1.2, 1],
                                opacity: [1, 0.7, 1],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeInOut',
                              }}
                            />
                          )}
                          
                          {/* Ripple effect on tap */}
                          <motion.div
                            className="absolute inset-0 rounded-xl"
                            style={{
                              background: `radial-gradient(circle, ${theme.colors.neonBlue}30 0%, transparent 70%)`,
                              opacity: 0,
                            }}
                            whileTap={{ 
                              opacity: [0, 0.5, 0],
                              scale: [0.8, 1.2, 1],
                            }}
                            transition={{ duration: 0.4 }}
                          />
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>
                
                {/* Wallet Connection - Mobile */}
                <motion.div
                  className="px-3 mt-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: navItems.length * 0.1 + 0.1,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                >
                  <div
                    className="p-2 rounded-xl border flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01))`,
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <WalletConnection />
                  </div>
                </motion.div>
              </div>
              
              {/* Bottom glow effect */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${theme.colors.neonBlue}60, transparent)`,
                  boxShadow: `0 0 10px ${theme.colors.neonBlue}40`,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}