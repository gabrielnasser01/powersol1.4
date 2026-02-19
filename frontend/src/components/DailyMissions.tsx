import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Trophy, Gift, CheckCircle, Clock, Zap, Users, Shield, Activity, Terminal, Heart, Share2, TrendingUp, Calendar, Star, Coins, Lock, LogIn, Ticket, MessageCircle, Repeat, ShoppingCart, Twitter, Music, MessageSquare, Eye, ShoppingBag } from 'lucide-react';
import { theme } from '../theme';
import { missionsStorage, userStatsStorage, Mission, userStorage } from '../store/persist';
import { useFrameLimiter } from '../hooks/useFrameLimiter';
import { useWallet } from '../contexts/WalletContext';
import { solanaService } from '../services/solanaService';
import { supabase } from '../lib/supabase';
import { powerPointsService } from '../services/powerPointsService';

const missionCategories = [
  { id: 'daily', label: 'Daily', icon: Calendar, color: '#00ff88' },
  { id: 'weekly', label: 'Weekly', icon: Star, color: '#00bfff' },
  { id: 'social', label: 'Social', icon: Share2, color: '#ff1493' },
  { id: 'activity', label: 'Activity', color: '#b347ff', icon: Activity },
];

interface BackendMission {
  id: string;
  mission_type: 'daily' | 'weekly' | 'social' | 'activity';
  mission_key: string;
  name: string;
  description: string;
  power_points: number;
  icon: string;
  requirements: any;
  is_active: boolean;
  user_progress?: {
    completed: boolean;
    completed_at: string | null;
    progress: any;
  };
}

export function DailyMissions() {
  const [missions, setMissions] = useState<BackendMission[]>([]);
  const [userStats, setUserStats] = useState(userStatsStorage.get());
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [showReward, setShowReward] = useState<{ amount: number } | null>(null);
  const [activeCategory, setActiveCategory] = useState('daily');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [user, setUser] = useState(userStorage.get());
  const [loading, setLoading] = useState(true);
  const [donationAmount, setDonationAmount] = useState('0.05');
  const [showDonationModal, setShowDonationModal] = useState(false);
  const { start, stop } = useFrameLimiter(30);
  const { publicKey: walletPubKey, connected: walletConnected, getWalletAdapter, refreshBalance } = useWallet();

  const isConnected = !!user.publicKey;

  useEffect(() => {
    const bootSequence = [
      { desktop: '> INITIALIZING_MISSION_SYSTEM...', mobile: '> INIT_SYSTEM...' },
      { desktop: '> LOADING_OBJECTIVES_DATABASE...', mobile: '> LOAD_DB...' },
      { desktop: '> SCANNING_USER_PROGRESS...', mobile: '> SCAN_PROGRESS...' },
      { desktop: '> CATEGORIES_LOADED: 4', mobile: '> CATEGORIES: 4' },
      { desktop: '> MISSION_MODULE_READY', mobile: '> MODULE_READY' },
    ];

    bootSequence.forEach((lineObj, index) => {
      setTimeout(() => {
        setTerminalLines(prev => [...prev, lineObj]);
      }, index * 400);
    });
  }, []);

  useEffect(() => {
    start(() => {
      setCurrentTime(new Date());
    });

    return () => stop();
  }, [start, stop]);

  useEffect(() => {
    const handleWalletChange = () => {
      setUser(userStorage.get());
    };

    window.addEventListener('walletStorageChange', handleWalletChange);
    return () => window.removeEventListener('walletStorageChange', handleWalletChange);
  }, []);

  useEffect(() => {
    loadMissions();
  }, [isConnected]);

  const loadMissions = async () => {
    try {
      setLoading(true);

      const { data: missionsData, error } = await supabase
        .from('missions')
        .select('*')
        .eq('is_active', true)
        .order('mission_type');

      if (error) {
        throw error;
      }

      if (user.publicKey && isConnected) {
        const { data: allProgress } = await supabase
          .from('user_mission_progress')
          .select('*')
          .eq('wallet_address', user.publicKey);

        const progressMap = new Map(
          (allProgress || []).map(p => [p.mission_id, p])
        );

        const missionsWithProgress = (missionsData || []).map(mission => ({
          ...mission,
          user_progress: progressMap.get(mission.id) || { completed: false, completed_at: null, progress: {} },
        }));
        setMissions(missionsWithProgress);
      } else {
        setMissions(missionsData || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const completeMissionAPI = async (missionKey: string): Promise<boolean> => {
    if (!isConnected || !user.publicKey) return false;

    try {
      const mission = missions.find(m => m.mission_key === missionKey);
      if (!mission) return false;

      const { data: existingProgress } = await supabase
        .from('user_mission_progress')
        .select('*')
        .eq('wallet_address', user.publicKey)
        .eq('mission_id', mission.id)
        .maybeSingle();

      if (existingProgress?.completed) {
        if (mission.mission_type === 'social' || mission.mission_type === 'activity') {
          return false;
        }

        const lastReset = new Date(existingProgress.last_reset || existingProgress.completed_at);
        const hoursSinceReset = (Date.now() - lastReset.getTime()) / (1000 * 60 * 60);

        if (mission.mission_type === 'daily' && hoursSinceReset < 24) {
          return false;
        }
        if (mission.mission_type === 'weekly' && hoursSinceReset < 168) {
          return false;
        }
      }

      const now = new Date().toISOString();
      if (existingProgress) {
        await supabase
          .from('user_mission_progress')
          .update({
            completed: true,
            completed_at: now,
            last_reset: now,
          })
          .eq('id', existingProgress.id);
      } else {
        await supabase
          .from('user_mission_progress')
          .insert({
            wallet_address: user.publicKey,
            mission_id: mission.id,
            completed: true,
            completed_at: now,
            last_reset: now,
            progress: {},
          });
      }

      setMissions(prev => prev.map(m =>
        m.id === mission.id
          ? { ...m, user_progress: { completed: true, completed_at: now, progress: {} } }
          : m
      ));

      const result = await powerPointsService.addPoints(
        user.publicKey,
        mission.power_points,
        'mission_complete',
        `Completed mission: ${mission.name}`,
        mission.id,
        'mission'
      );

      if (!result.success) {
        console.error('Failed to add power points:', result.error);
        return true;
      }

      userStatsStorage.addMissionPoints(mission.power_points);
      window.dispatchEvent(new CustomEvent('missionPointsChange'));

      setShowReward({ amount: mission.power_points });
      setTimeout(() => setShowReward(null), 3000);

      return true;
    } catch (error) {
      console.error('Failed to complete mission:', error);
      return false;
    }
  };

  const handleDailyLogin = async () => {
    if (!isConnected || !user.publicKey) return;

    try {
      const { data, error } = await supabase.rpc('claim_daily_login_points', {
        p_wallet_address: user.publicKey
      });

      if (error) {
        console.error('Daily login error:', error);
        if (error.message.includes('already claimed')) {
          alert('You already claimed your daily login points today!');
        } else {
          alert('Failed to claim daily login points. Please try again.');
        }
        return;
      }

      if (data?.already_claimed) {
        alert('You already claimed your daily login points today!');
        return;
      }

      const pointsEarned = data?.points_earned || 10;

      await completeMissionAPI('daily_login');

      userStatsStorage.addMissionPoints(pointsEarned);
      window.dispatchEvent(new CustomEvent('missionPointsChange'));

      setShowReward({ amount: pointsEarned });
      setTimeout(() => setShowReward(null), 3000);

      await loadMissions();
    } catch (error) {
      console.error('Failed to claim daily login:', error);
      alert('Failed to claim daily login points. Please try again.');
    }
  };

  const handleDailyVisit = async () => {
    if (!isConnected || !user.publicKey) return;

    try {
      const success = await completeMissionAPI('daily_visit');
      if (!success) {
        alert('Daily visit already recorded today!');
        return;
      }
      await loadMissions();
    } catch (error) {
      console.error('Failed to record daily visit:', error);
    }
  };

  const getDonationTierPoints = (amount: number): { points: number; tier: number } => {
    if (amount >= 1.0) return { points: 800, tier: 1.0 };
    if (amount >= 0.5) return { points: 350, tier: 0.5 };
    if (amount >= 0.25) return { points: 150, tier: 0.25 };
    return { points: 50, tier: 0.05 };
  };

  const [isDonating, setIsDonating] = useState(false);
  const [donationTxId, setDonationTxId] = useState('');

  const handleDonation = async () => {
    if (!walletConnected || !walletPubKey) {
      alert('Please connect your wallet!');
      return;
    }

    const amount = parseFloat(donationAmount);
    if (amount < 0.05) {
      alert('Minimum donation is 0.05 SOL');
      return;
    }

    const adapter = getWalletAdapter();
    if (!adapter) {
      alert('Wallet adapter not available. Please reconnect your wallet.');
      return;
    }

    setIsDonating(true);

    try {
      const { signature } = await solanaService.donateWithWallet(adapter, amount);

      setDonationTxId(signature);

      const { data: donationResult, error: donationError } = await supabase.rpc('record_donation_with_tiers', {
        p_wallet_address: walletPubKey,
        p_amount_sol: amount,
        p_transaction_signature: signature,
      });

      if (donationError) {
        console.error('Donation record error:', donationError);
      }

      const result = donationResult?.[0] || { points_earned: 50 };
      const donationPoints = result.points_earned;

      await completeMissionAPI('daily_donation');

      userStatsStorage.addMissionPoints(donationPoints);
      window.dispatchEvent(new CustomEvent('missionPointsChange'));

      setShowReward({ amount: donationPoints });
      setTimeout(() => setShowReward(null), 3000);

      await refreshBalance();
      await loadMissions();

      setTimeout(() => setShowDonationModal(false), 5000);
    } catch (error) {
      console.error('Donation failed:', error);
      const message = error instanceof Error ? error.message : 'Donation failed';
      alert(message);
    } finally {
      setIsDonating(false);
    }
  };

  const getMissionIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      'LogIn': LogIn,
      'Ticket': Ticket,
      'Heart': Heart,
      'Repeat': Repeat,
      'MessageCircle': MessageCircle,
      'ShoppingCart': ShoppingCart,
      'Twitter': Twitter,
      'Music': Music,
      'MessageSquare': MessageSquare,
      'Users': Users,
      'Eye': Eye,
      'Trophy': Trophy,
      'ShoppingBag': ShoppingBag,
    };
    return icons[iconName] || Target;
  };

  const getCategoryColor = (category: string) => {
    const cat = missionCategories.find(c => c.id === category);
    return cat?.color || '#ffffff';
  };

  const filteredMissions = missions.filter(m => m.mission_type === activeCategory);
  const completedCount = missions.filter(m => m.user_progress?.completed).length;
  const totalMissions = missions.length;

  return (
    <section className="py-12 relative overflow-hidden">
      {/* Terminal Matrix Background */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(0deg, rgba(0, 255, 136, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 136, 0.08) 1px, transparent 1px),
              linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(0, 20, 10, 0.95) 100%)
            `,
            backgroundSize: '20px 20px, 20px 20px, 100% 100%',
          }}
        />
        
        {/* Terminal scanner effect */}
        <motion.div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0, 255, 136, 0.02) 2px,
                rgba(0, 255, 136, 0.02) 4px
              )
            `,
          }}
          animate={{ y: ['-100%', '100%'] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Floating data particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: i % 4 === 0 ? '#00ff88' : i % 4 === 1 ? '#00bfff' : i % 4 === 2 ? '#ff1493' : '#b347ff',
              boxShadow: `0 0 6px ${i % 4 === 0 ? '#00ff88' : i % 4 === 1 ? '#00bfff' : i % 4 === 2 ? '#ff1493' : '#b347ff'}`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              delay: Math.random() * 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Terminal Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          {/* Terminal Status Bar */}
          <div 
            className="p-4 rounded-t-2xl border-b-0 font-mono text-sm mb-0"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(0, 30, 15, 0.8))',
              borderColor: '#00ff88',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              borderBottom: 'none',
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-xs sm:text-sm" style={{ color: '#00ff88' }}>
                  <span className="hidden sm:inline">MISSION_TERMINAL_v3.0.0</span>
                  <span className="sm:hidden">MISSION_v3.0</span>
                </span>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-6 text-xs">
                <span className="hidden sm:inline" style={{ color: '#00bfff' }}>
                  {currentTime.toLocaleTimeString()}
                </span>
                <span className="text-xs" style={{ color: '#ff1493' }}>
                  <span className="hidden sm:inline">COMPLETED: </span>
                  <span className="sm:hidden">DONE: </span>
                  {completedCount}/{totalMissions}
                </span>
                <span style={{ color: '#00ff88' }}>
                  <span className="hidden sm:inline">ACTIVE: </span>
                  <span className="sm:hidden">ACT: </span>
                  {filteredMissions.length}
                </span>
              </div>
            </div>
          </div>

          {/* Terminal Content */}
          <div 
            className="p-6 rounded-b-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(0, 20, 10, 0.9))',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              borderTop: 'none',
              boxShadow: '0 0 30px rgba(0, 255, 136, 0.2), inset 0 0 50px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div 
                  className="p-3 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.3), rgba(0, 191, 255, 0.2))',
                    border: '1px solid rgba(0, 255, 136, 0.5)',
                    boxShadow: '0 0 15px rgba(0, 255, 136, 0.4)',
                  }}
                >
                  <Terminal className="w-8 h-8" style={{ color: '#00ff88' }} />
                </div>
                <div>
                  <h1 
                    className="text-xl sm:text-3xl font-bold font-mono"
                    style={{ 
                      color: '#ffffff',
                      textShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
                    }}
                  >
                    <span className="hidden sm:inline">{'>'} MISSION_SYSTEM.EXE</span>
                    <span className="sm:hidden">{'>'} MISSIONS.EXE</span>
                  </h1>
                  <p className="text-green-300/70 font-mono text-sm">
                    <span className="hidden sm:inline">Advanced Mission Control Interface v3.0</span>
                    <span className="sm:hidden">Mission Control v3.0</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Terminal Boot Sequence */}
            <div className="mb-6 p-4 rounded-xl font-mono text-sm" style={{
              background: 'rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(0, 255, 136, 0.2)',
            }}>
              {terminalLines.map((lineObj, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  style={{ color: '#00ff88' }}
                  className="text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">{lineObj.desktop}</span>
                  <span className="sm:hidden">{lineObj.mobile}</span>
                </motion.div>
              ))}
              <motion.span
                className="inline-block w-2 h-4 ml-1"
                style={{ background: '#00ff88' }}
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>
          </div>
        </motion.div>

        {/* Wallet Connection Warning */}
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 p-4 rounded-xl border-2"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 20, 147, 0.2), rgba(255, 20, 147, 0.1))',
              borderColor: '#ff1493',
              boxShadow: '0 0 20px rgba(255, 20, 147, 0.3)',
            }}
          >
            <div className="flex items-center space-x-3">
              <Lock className="w-6 h-6" style={{ color: '#ff1493' }} />
              <div>
                <p className="font-mono font-bold text-sm sm:text-base" style={{ color: '#ff1493' }}>
                  WALLET NOT CONNECTED
                </p>
                <p className="font-mono text-xs sm:text-sm text-zinc-400">
                  Connect your wallet to start completing missions and earning rewards
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Category Tabs - 2x2 Grid Layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-2 gap-4 mb-12 max-w-2xl mx-auto"
        >
          {missionCategories.map((category, index) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            const categoryMissions = missions.filter(m => m.mission_type === category.id);
            const completedInCategory = categoryMissions.filter(m => m.user_progress?.completed).length;

            return (
              <motion.button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className="px-6 py-3 rounded-xl font-mono font-bold transition-all duration-300 relative overflow-hidden"
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${category.color}30, ${category.color}20)`
                    : 'rgba(0, 0, 0, 0.6)',
                  border: `1px solid ${isActive ? category.color : 'rgba(255, 255, 255, 0.1)'}`,
                  color: isActive ? category.color : '#ffffff',
                  boxShadow: isActive ? `0 0 20px ${category.color}40` : 'none',
                }}
                whileHover={{
                  scale: 1.05,
                  boxShadow: `0 0 25px ${category.color}50`,
                }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
              >
                {/* Scanning effect */}
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${category.color}30, transparent)`,
                    opacity: isActive ? 1 : 0,
                  }}
                  animate={{ x: [-100, 100] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />

                <div className="relative z-10 flex items-center space-x-2">
                  <Icon className="w-5 h-5" />
                  <span>{category.label}</span>
                  <div
                    className="px-2 py-1 rounded-full text-xs"
                    style={{
                      background: `${category.color}20`,
                      color: category.color,
                    }}
                  >
                    {completedInCategory}/{categoryMissions.length}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Missions Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto"
          >
            {loading ? (
              <div className="col-span-full text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-t-2" style={{ borderColor: '#00ff88' }}></div>
                <p className="mt-4 font-mono" style={{ color: '#00ff88' }}>LOADING MISSIONS...</p>
              </div>
            ) : filteredMissions.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="font-mono text-xl" style={{ color: '#ff1493' }}>NO MISSIONS IN THIS CATEGORY</p>
                <p className="font-mono text-sm text-zinc-400 mt-2">Check other categories or connect your wallet</p>
              </div>
            ) : null}

            {!loading && filteredMissions.map((mission, index) => {
              const Icon = getMissionIcon(mission.icon);
              const categoryColor = getCategoryColor(mission.mission_type);
              const isCompleted = mission.user_progress?.completed || false;
              const isDonationMission = mission.mission_key === 'daily_donation';
              const clickableSocialKeys = new Set([
                'social_discord_join', 'social_join_discord', 'social_twitter_follow',
                'social_tiktok_follow', 'social_share',
              ]);
              const isAutoMission = (mission.mission_key.startsWith('social_invite_') ||
                (mission.mission_key.startsWith('social_') && !clickableSocialKeys.has(mission.mission_key)) ||
                mission.mission_key.startsWith('weekly_') ||
                (mission.mission_key.startsWith('activity_') && mission.mission_key !== 'activity_explore_transparency') ||
                mission.mission_key === 'daily_buy_ticket');
              const isClickable = !isCompleted && !isAutoMission;

              return (
                <motion.div
                  key={mission.id}
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className={`p-6 rounded-2xl border relative overflow-hidden group ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                  style={{
                    background: `
                      linear-gradient(0deg, ${categoryColor}08 1px, transparent 1px),
                      linear-gradient(90deg, ${categoryColor}08 1px, transparent 1px),
                      linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 20, 10, 0.8) 100%)
                    `,
                    backgroundSize: '20px 20px, 20px 20px, 100% 100%',
                    borderColor: isCompleted ? '#00ff88' : categoryColor,
                    boxShadow: isCompleted
                      ? '0 0 30px rgba(0, 255, 136, 0.4)'
                      : `0 0 20px ${categoryColor}30`,
                    backdropFilter: 'blur(20px)',
                  }}
                  onClick={() => {
                    if (!isConnected) {
                      alert('Please connect your wallet first to complete missions!');
                      return;
                    }

                    if (isCompleted) return;

                    if (isDonationMission) {
                      setDonationTxId('');
                      setShowDonationModal(true);
                      return;
                    }

                    if (mission.mission_key === 'daily_login') {
                      handleDailyLogin();
                      return;
                    }

                    if (mission.mission_key === 'daily_visit') {
                      handleDailyVisit();
                      return;
                    }

                    if (mission.mission_key === 'social_join_discord' || mission.mission_key === 'social_discord_join') {
                      completeMissionAPI(mission.mission_key);
                      window.open('https://discord.gg/powersol', '_blank');
                      return;
                    }

                    if (mission.mission_key === 'social_twitter_follow') {
                      completeMissionAPI('social_twitter_follow');
                      window.open('https://twitter.com/powersol_io', '_blank');
                      return;
                    }

                    if (mission.mission_key === 'social_tiktok_follow') {
                      completeMissionAPI('social_tiktok_follow');
                      window.open('https://tiktok.com/@powersol', '_blank');
                      return;
                    }

                    if (mission.mission_key === 'social_share') {
                      const shareUrl = 'https://powersol.io';
                      const shareText = 'Check out PowerSOL - The Ultimate Solana Lottery!';
                      completeMissionAPI('social_share');
                      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
                      return;
                    }

                    if (mission.mission_key === 'activity_explore_transparency') {
                      completeMissionAPI('activity_explore_transparency').then(() => {
                        window.location.href = '/transparency';
                      });
                      return;
                    }

                    if (mission.mission_key.startsWith('social_invite_') ||
                        mission.mission_key.startsWith('weekly_') ||
                        mission.mission_key.startsWith('activity_') ||
                        mission.mission_key === 'daily_buy_ticket') {
                      return;
                    }
                  }}
                >
                  <div className="absolute top-2 left-2 text-xs font-mono opacity-60" style={{ color: categoryColor }}>
                    [{index.toString().padStart(2, '0')}]
                  </div>

                  {isCompleted && (
                    <motion.div
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: '#00ff88' }}
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.7, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    >
                      <CheckCircle className="w-4 h-4 text-black" />
                    </motion.div>
                  )}

                  {!isConnected && !isCompleted && (
                    <motion.div
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    >
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{
                          background: 'rgba(0, 0, 0, 0.9)',
                          border: '2px solid #ff1493',
                          boxShadow: '0 0 20px rgba(255, 20, 147, 0.5)',
                        }}
                      >
                        <Lock className="w-8 h-8" style={{ color: '#ff1493' }} />
                      </div>
                    </motion.div>
                  )}

                  <div
                    className="w-16 h-16 rounded-xl mb-4 flex items-center justify-center relative"
                    style={{
                      background: `linear-gradient(135deg, ${categoryColor}30, ${categoryColor}15)`,
                      border: `1px solid ${categoryColor}50`,
                      boxShadow: `inset 0 0 15px ${categoryColor}20`,
                      opacity: !isConnected && !isCompleted ? 0.3 : 1,
                    }}
                  >
                    <Icon className="w-8 h-8" style={{ color: categoryColor }} />

                    <motion.div
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${categoryColor}30, transparent)`,
                      }}
                      animate={{ x: [-100, 100] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>

                  <h3 className="text-lg font-bold mb-2 font-mono" style={{ color: '#ffffff' }}>
                    {mission.name}
                  </h3>
                  <p className="text-sm text-zinc-400 mb-4 font-mono">
                    {mission.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-5 h-5" style={{ color: categoryColor }} />
                      <span className="text-sm font-mono font-bold" style={{ color: '#ffffff' }}>
                        {mission.power_points} POWER
                      </span>
                    </div>

                    {isCompleted ? (
                      <div className="flex items-center space-x-1 text-sm font-mono" style={{ color: '#00ff88' }}>
                        <CheckCircle className="w-4 h-4" />
                        <span>COMPLETE</span>
                      </div>
                    ) : isAutoMission ? (
                      <div className="flex items-center space-x-1 text-sm font-mono" style={{ color: '#888888' }}>
                        <Activity className="w-4 h-4" />
                        <span>AUTO</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-sm font-mono" style={{ color: categoryColor }}>
                        <Clock className="w-4 h-4" />
                        <span>CLAIM</span>
                      </div>
                    )}
                  </div>

                  <motion.div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none"
                    style={{
                      background: `linear-gradient(135deg, ${categoryColor}05, transparent)`,
                      boxShadow: `inset 0 0 20px ${categoryColor}20`,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>


        {/* Donation Modal */}
        <AnimatePresence>
          {showDonationModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0, 0, 0, 0.9)' }}
              onClick={() => setShowDonationModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="p-8 rounded-2xl max-w-md w-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 20, 10, 0.9) 100%)',
                  border: '1px solid rgba(0, 255, 136, 0.3)',
                  boxShadow: '0 0 50px rgba(0, 255, 136, 0.3)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold font-mono" style={{ color: '#00ff88' }}>
                    DONATE SOL
                  </h2>
                  <button
                    onClick={() => setShowDonationModal(false)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <p className="text-zinc-400 mb-6 font-mono text-sm">
                  Support PowerSOL development! Minimum donation: 0.05 SOL
                </p>

                <div className="mb-6">
                  <label className="block mb-2 font-mono text-sm" style={{ color: '#00ff88' }}>
                    AMOUNT (SOL)
                  </label>
                  <input
                    type="number"
                    min="0.05"
                    step="0.01"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    className="w-full p-3 rounded-xl font-mono text-white"
                    style={{
                      background: 'rgba(0, 0, 0, 0.6)',
                      border: '1px solid rgba(0, 255, 136, 0.3)',
                    }}
                  />
                </div>

                <div className="mb-6 space-y-2">
                  {[
                    { amount: 0.05, points: 50 },
                    { amount: 0.25, points: 150 },
                    { amount: 0.5, points: 350 },
                    { amount: 1.0, points: 800 },
                  ].map((tier) => {
                    const currentAmount = parseFloat(donationAmount) || 0;
                    const matched = getDonationTierPoints(currentAmount);
                    const isMatched = matched.tier === tier.amount;
                    return (
                      <div
                        key={tier.amount}
                        className="flex items-center justify-between p-3 rounded-xl font-mono text-sm transition-all duration-200"
                        style={{
                          background: isMatched ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${isMatched ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
                        }}
                      >
                        <span style={{ color: isMatched ? '#00ff88' : '#888' }}>
                          {'>='} {tier.amount} SOL
                        </span>
                        <span style={{ color: isMatched ? '#00ff88' : '#888' }} className="font-bold">
                          +{tier.points} POWER
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleDonation}
                  disabled={isDonating}
                  className="w-full py-3 rounded-xl font-mono font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.3), rgba(0, 191, 255, 0.2))',
                    border: '1px solid rgba(0, 255, 136, 0.5)',
                    color: '#00ff88',
                    boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)',
                  }}
                >
                  {isDonating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                      <span>SIGNING TRANSACTION...</span>
                    </>
                  ) : (
                    <span>DONATE NOW</span>
                  )}
                </button>

                {donationTxId && (
                  <div className="mt-4 p-3 rounded-xl" style={{
                    background: 'rgba(0, 255, 136, 0.1)',
                    border: '1px solid rgba(0, 255, 136, 0.3)',
                  }}>
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00ff88' }} />
                      <span className="text-sm font-mono font-bold" style={{ color: '#00ff88' }}>DONATION SUCCESSFUL!</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-400">TX: {donationTxId.slice(0, 20)}...</span>
                      <a
                        href={solanaService.getExplorerUrl(donationTxId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono hover:underline"
                        style={{ color: '#00bfff' }}
                      >
                        View on Explorer
                      </a>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 p-4 rounded-xl text-center"
          style={{
            background: 'rgba(0, 255, 136, 0.1)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
          }}
        >
          <div className="flex items-center justify-center space-x-4 font-mono text-sm">
            <div className="flex items-center space-x-2">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#00ff88' }}
              />
              <span style={{ color: '#00ff88' }}>
                <span className="hidden sm:inline">SYSTEM_STATUS: OPERATIONAL</span>
                <span className="sm:hidden">STATUS: OK</span>
              </span>
            </div>
            <div className="text-zinc-400">|</div>
            <div style={{ color: '#00bfff' }}>
              <span className="hidden sm:inline">MISSIONS_LOADED: {totalMissions}</span>
              <span className="sm:hidden">LOADED: {totalMissions}</span>
            </div>
            <div className="text-zinc-400">|</div>
            <div style={{ color: '#ffffff' }}>
              <span className="hidden sm:inline">COMPLETION_RATE: {((completedCount/totalMissions)*100).toFixed(1)}%</span>
              <span className="sm:hidden">RATE: {((completedCount/totalMissions)*100).toFixed(1)}%</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}