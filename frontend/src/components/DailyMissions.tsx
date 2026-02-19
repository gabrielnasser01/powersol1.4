import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Trophy, Gift, CheckCircle, Clock, Zap, Users, Shield,
  Activity, Terminal, Heart, Share2, TrendingUp, Calendar, Star,
  Coins, Lock, LogIn, Ticket, MessageCircle, Repeat, ShoppingCart,
  Twitter, Music, MessageSquare, Eye, ShoppingBag, X, Sparkles,
  ChevronRight, Flame,
} from 'lucide-react';
import { userStatsStorage, userStorage } from '../store/persist';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { supabase } from '../lib/supabase';
import { powerPointsService } from '../services/powerPointsService';

const CATEGORY_CONFIG = [
  { id: 'daily', label: 'Diarias', icon: Calendar, color: '#00ff88', description: 'Missoes que resetam todo dia' },
  { id: 'weekly', label: 'Semanais', icon: Star, color: '#00bfff', description: 'Objetivos da semana' },
  { id: 'social', label: 'Social', icon: Share2, color: '#ff1493', description: 'Interaja com a comunidade' },
  { id: 'activity', label: 'Conquistas', color: '#ffaa00', icon: Trophy, description: 'Marcos permanentes' },
];

const DONATION_TIERS = [
  { amount: 0.05, points: 50, label: 'Apoiador' },
  { amount: 0.25, points: 150, label: 'Colaborador' },
  { amount: 0.5, points: 350, label: 'Patrocinador' },
  { amount: 1.0, points: 800, label: 'Lenda' },
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

const ICON_MAP: Record<string, React.ElementType> = {
  LogIn, Ticket, Heart, Repeat, MessageCircle, ShoppingCart,
  Twitter, Music, MessageSquare, Users, Eye, Trophy, ShoppingBag,
  Star, Gift, Flame, Share2,
};

function getMissionIcon(iconName: string): React.ElementType {
  return ICON_MAP[iconName] || Target;
}

function getMissionProgress(mission: BackendMission, ticketCount: number, referralCount: number): { current: number; target: number } | null {
  const req = mission.requirements;
  if (!req) return null;

  if (req.total_tickets) return { current: Math.min(ticketCount, req.total_tickets), target: req.total_tickets };
  if (req.tickets) return { current: Math.min(ticketCount, req.tickets), target: req.tickets };
  if (req.refs_required) return { current: Math.min(referralCount, req.refs_required), target: req.refs_required };
  if (req.min_tickets && req.period === 'week') return { current: 0, target: req.min_tickets };
  if (req.days) return { current: 0, target: req.days };
  if (req.different_lotteries) return { current: 0, target: req.different_lotteries };

  return null;
}

export function DailyMissions() {
  const [missions, setMissions] = useState<BackendMission[]>([]);
  const [activeCategory, setActiveCategory] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [donationAmount, setDonationAmount] = useState(0.05);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showReward, setShowReward] = useState<{ amount: number; missionName: string } | null>(null);
  const [processingMission, setProcessingMission] = useState<string | null>(null);
  const [ticketCount, setTicketCount] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const wallet = useWallet();

  const user = userStorage.get();
  const isConnected = !!user.publicKey;

  useEffect(() => {
    loadMissions();
    if (user.publicKey) loadUserStats();
  }, [user.publicKey]);

  const loadUserStats = async () => {
    if (!user.publicKey) return;

    const [ticketRes, refRes] = await Promise.all([
      supabase.from('ticket_purchases').select('quantity').eq('wallet_address', user.publicKey),
      supabase.from('referrals').select('id').eq('referrer_wallet', user.publicKey).eq('is_validated', true),
    ]);

    const total = (ticketRes.data || []).reduce((sum, r) => sum + (r.quantity || 0), 0);
    setTicketCount(total);
    setReferralCount((refRes.data || []).length);
  };

  const loadMissions = async () => {
    try {
      setLoading(true);
      const { data: missionsData, error } = await supabase
        .from('missions')
        .select('*')
        .eq('is_active', true)
        .order('power_points', { ascending: true });

      if (error) throw error;

      if (user.publicKey && isConnected) {
        const { data: allProgress } = await supabase
          .from('user_mission_progress')
          .select('*')
          .eq('wallet_address', user.publicKey);

        const progressMap = new Map(
          (allProgress || []).map(p => [p.mission_id, p])
        );

        setMissions((missionsData || []).map(mission => ({
          ...mission,
          user_progress: progressMap.get(mission.id) || { completed: false, completed_at: null, progress: {} },
        })));
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
      if (!mission || mission.user_progress?.completed) return false;

      setProcessingMission(mission.id);

      const { data: existingProgress } = await supabase
        .from('user_mission_progress')
        .select('*')
        .eq('wallet_address', user.publicKey)
        .eq('mission_id', mission.id)
        .maybeSingle();

      if (existingProgress?.completed) {
        setMissions(prev => prev.map(m =>
          m.id === mission.id
            ? { ...m, user_progress: { completed: true, completed_at: existingProgress.completed_at, progress: {} } }
            : m
        ));
        setProcessingMission(null);
        return false;
      }

      if (existingProgress) {
        await supabase
          .from('user_mission_progress')
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq('id', existingProgress.id);
      } else {
        await supabase
          .from('user_mission_progress')
          .insert({
            wallet_address: user.publicKey,
            mission_id: mission.id,
            completed: true,
            completed_at: new Date().toISOString(),
            progress: {},
          });
      }

      setMissions(prev => prev.map(m =>
        m.id === mission.id
          ? { ...m, user_progress: { completed: true, completed_at: new Date().toISOString(), progress: {} } }
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

      if (result.success) {
        userStatsStorage.addMissionPoints(mission.power_points);
        window.dispatchEvent(new CustomEvent('missionPointsChange'));
        setShowReward({ amount: mission.power_points, missionName: mission.name });
        setTimeout(() => setShowReward(null), 3500);
      }

      setProcessingMission(null);
      return true;
    } catch (error) {
      console.error('Failed to complete mission:', error);
      setProcessingMission(null);
      return false;
    }
  };

  const handleDailyLogin = async () => {
    if (!isConnected || !user.publicKey) return;

    setProcessingMission('daily_login');
    try {
      const { data, error } = await supabase.rpc('claim_daily_login_points', {
        p_wallet_address: user.publicKey
      });

      if (error) {
        if (error.message.includes('already claimed')) {
          alert('Voce ja resgatou seus pontos de login hoje!');
        } else {
          alert('Falha ao resgatar pontos. Tente novamente.');
        }
        setProcessingMission(null);
        return;
      }

      if (data?.already_claimed) {
        alert('Voce ja resgatou seus pontos de login hoje!');
        setProcessingMission(null);
        return;
      }

      const pointsEarned = data?.points_earned || 10;
      userStatsStorage.addMissionPoints(pointsEarned);
      window.dispatchEvent(new CustomEvent('missionPointsChange'));
      setShowReward({ amount: pointsEarned, missionName: 'Login Diario' });
      setTimeout(() => setShowReward(null), 3500);
      await loadMissions();
    } catch {
      alert('Falha ao resgatar pontos. Tente novamente.');
    }
    setProcessingMission(null);
  };

  const handleDonation = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      alert('Conecte sua wallet primeiro!');
      return;
    }

    if (donationAmount < 0.05) {
      alert('Doacao minima: 0.05 SOL');
      return;
    }

    setProcessingMission('donation');
    try {
      const connection = new Connection('https://api.devnet.solana.com');
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey('2GqAmrgsyvkE7Y4uMZgn9iBJatDR6xPRvRsW21x5iyEU'),
          lamports: donationAmount * LAMPORTS_PER_SOL,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      const signed = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature);

      const tier = [...DONATION_TIERS].reverse().find(t => donationAmount >= t.amount);
      const donationPoints = tier?.points || 50;

      const result = await powerPointsService.addPoints(
        wallet.publicKey.toBase58(),
        donationPoints,
        'donation',
        `Doacao de ${donationAmount} SOL - tx: ${signature.slice(0, 8)}...`
      );

      if (result.success) {
        userStatsStorage.addMissionPoints(donationPoints);
        window.dispatchEvent(new CustomEvent('missionPointsChange'));
        setShowReward({ amount: donationPoints, missionName: 'Doacao' });
        setTimeout(() => setShowReward(null), 3500);
      }

      setShowDonationModal(false);
      await loadMissions();
    } catch (error) {
      console.error('Donation failed:', error);
      alert('Doacao falhou. Tente novamente.');
    }
    setProcessingMission(null);
  };

  const handleMissionClick = (mission: BackendMission) => {
    if (!isConnected) {
      alert('Conecte sua wallet primeiro para completar missoes!');
      return;
    }
    if (mission.user_progress?.completed) return;

    if (mission.mission_key === 'daily_donation') {
      setShowDonationModal(true);
      return;
    }
    if (mission.mission_key === 'daily_login' || mission.mission_key === 'daily_visit') {
      handleDailyLogin();
      return;
    }
    if (mission.mission_key === 'social_join_discord' || mission.mission_key === 'social_discord_join') {
      completeMissionAPI(mission.mission_key);
      window.open('https://discord.gg/powersol', '_blank');
      return;
    }
    if (mission.mission_key === 'social_share') {
      const shareUrl = 'https://powersol.io';
      const shareText = 'Confira a PowerSOL - A Melhor Loteria Solana!';
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
  };

  const isAutoMission = (mission: BackendMission) => {
    return mission.mission_key.startsWith('social_invite_') ||
      mission.mission_key.startsWith('weekly_') ||
      (mission.mission_key.startsWith('activity_') && mission.mission_key !== 'activity_explore_transparency') ||
      mission.mission_key === 'daily_buy_ticket';
  };

  const filteredMissions = useMemo(() =>
    missions.filter(m => m.mission_type === activeCategory),
    [missions, activeCategory]
  );

  const completedCount = missions.filter(m => m.user_progress?.completed).length;
  const totalMissions = missions.length;
  const completionPct = totalMissions > 0 ? Math.round((completedCount / totalMissions) * 100) : 0;

  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number }> = {};
    CATEGORY_CONFIG.forEach(c => {
      const catMissions = missions.filter(m => m.mission_type === c.id);
      stats[c.id] = {
        total: catMissions.length,
        completed: catMissions.filter(m => m.user_progress?.completed).length,
      };
    });
    return stats;
  }, [missions]);

  return (
    <section className="py-8 sm:py-12 relative overflow-hidden min-h-screen">
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.98) 0%, rgba(0,15,8,0.95) 50%, rgba(0,0,0,0.98) 100%)',
      }}>
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(0deg, rgba(0,255,136,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 sm:mb-10"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl" style={{
                background: 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,191,255,0.1))',
                border: '1px solid rgba(0,255,136,0.3)',
                boxShadow: '0 0 20px rgba(0,255,136,0.2)',
              }}>
                <Terminal className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: '#00ff88' }} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white">
                  Missoes
                </h1>
                <p className="text-sm font-mono text-zinc-500">
                  Complete missoes para ganhar Power Points
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-mono text-zinc-500">Progresso Geral</p>
                <p className="text-lg font-bold font-mono" style={{ color: '#00ff88' }}>
                  {completedCount}/{totalMissions}
                </p>
              </div>
              <div className="w-14 h-14 rounded-full flex items-center justify-center relative">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                  <circle
                    cx="28" cy="28" r="24" fill="none"
                    stroke="#00ff88" strokeWidth="3"
                    strokeDasharray={`${completionPct * 1.508} 150.8`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-xs font-bold font-mono" style={{ color: '#00ff88' }}>
                  {completionPct}%
                </span>
              </div>
            </div>
          </div>

          {!isConnected && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border"
              style={{
                background: 'linear-gradient(135deg, rgba(255,20,147,0.1), rgba(255,20,147,0.05))',
                borderColor: 'rgba(255,20,147,0.3)',
              }}
            >
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 flex-shrink-0" style={{ color: '#ff1493' }} />
                <div>
                  <p className="font-mono font-bold text-sm" style={{ color: '#ff1493' }}>
                    WALLET NAO CONECTADA
                  </p>
                  <p className="font-mono text-xs text-zinc-500">
                    Conecte sua wallet para completar missoes e ganhar recompensas
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 sm:mb-10"
        >
          {CATEGORY_CONFIG.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            const stats = categoryStats[cat.id] || { total: 0, completed: 0 };
            const allDone = stats.total > 0 && stats.completed === stats.total;

            return (
              <motion.button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="relative px-4 py-3 rounded-xl font-mono transition-all duration-200 text-left"
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${cat.color}18, ${cat.color}08)`
                    : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? `${cat.color}60` : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: isActive ? `0 0 20px ${cat.color}15` : 'none',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" style={{ color: isActive ? cat.color : '#666' }} />
                  <span className="text-sm font-bold" style={{ color: isActive ? cat.color : '#999' }}>
                    {cat.label}
                  </span>
                  {allDone && (
                    <CheckCircle className="w-3.5 h-3.5 ml-auto" style={{ color: '#00ff88' }} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: cat.color }}
                      initial={{ width: 0 }}
                      animate={{ width: stats.total > 0 ? `${(stats.completed / stats.total) * 100}%` : '0%' }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-xs text-zinc-600 font-mono whitespace-nowrap">
                    {stats.completed}/{stats.total}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Missions Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {loading ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: '#00ff88', borderTopColor: 'transparent' }} />
                <p className="font-mono text-sm text-zinc-500">Carregando missoes...</p>
              </div>
            ) : filteredMissions.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <Target className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                <p className="font-mono text-zinc-500">Nenhuma missao nesta categoria</p>
              </div>
            ) : filteredMissions.map((mission, index) => {
              const Icon = getMissionIcon(mission.icon);
              const catConfig = CATEGORY_CONFIG.find(c => c.id === mission.mission_type);
              const catColor = catConfig?.color || '#fff';
              const isCompleted = mission.user_progress?.completed || false;
              const isAuto = isAutoMission(mission);
              const isClickable = !isCompleted && !isAuto;
              const isProcessing = processingMission === mission.id || processingMission === mission.mission_key;
              const progress = getMissionProgress(mission, ticketCount, referralCount);
              const progressPct = progress ? Math.min((progress.current / progress.target) * 100, 100) : null;

              return (
                <motion.div
                  key={mission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={isClickable ? { y: -3, scale: 1.01 } : {}}
                  onClick={() => {
                    if (isClickable && !isProcessing) handleMissionClick(mission);
                  }}
                  className={`relative p-5 rounded-xl border overflow-hidden group ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                  style={{
                    background: isCompleted
                      ? 'linear-gradient(135deg, rgba(0,255,136,0.06), rgba(0,255,136,0.02))'
                      : 'rgba(255,255,255,0.02)',
                    borderColor: isCompleted ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.06)',
                    transition: 'border-color 0.3s, background 0.3s',
                  }}
                >
                  {isProcessing && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: catColor, borderTopColor: 'transparent' }} />
                    </div>
                  )}

                  {!isConnected && !isCompleted && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}>
                      <Lock className="w-6 h-6" style={{ color: '#ff1493', opacity: 0.7 }} />
                    </div>
                  )}

                  {/* Top row: Icon + Status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{
                      background: isCompleted ? 'rgba(0,255,136,0.15)' : `${catColor}12`,
                      border: `1px solid ${isCompleted ? 'rgba(0,255,136,0.3)' : `${catColor}25`}`,
                    }}>
                      <Icon className="w-5 h-5" style={{ color: isCompleted ? '#00ff88' : catColor }} />
                    </div>
                    {isCompleted ? (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: 'rgba(0,255,136,0.15)' }}>
                        <CheckCircle className="w-3.5 h-3.5" style={{ color: '#00ff88' }} />
                        <span className="text-xs font-mono font-bold" style={{ color: '#00ff88' }}>Feito</span>
                      </div>
                    ) : isAuto ? (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <Activity className="w-3.5 h-3.5 text-zinc-600" />
                        <span className="text-xs font-mono text-zinc-600">Auto</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors" style={{ background: `${catColor}10` }}>
                        <ChevronRight className="w-3.5 h-3.5" style={{ color: catColor }} />
                        <span className="text-xs font-mono font-bold" style={{ color: catColor }}>Resgatar</span>
                      </div>
                    )}
                  </div>

                  {/* Mission info */}
                  <h3 className="text-sm font-bold font-mono text-white mb-1 leading-tight">
                    {mission.name}
                  </h3>
                  <p className="text-xs font-mono text-zinc-500 mb-3 leading-relaxed">
                    {mission.description}
                  </p>

                  {/* Progress bar (for milestone missions) */}
                  {progress && !isCompleted && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-zinc-600">Progresso</span>
                        <span className="text-xs font-mono" style={{ color: catColor }}>
                          {progress.current}/{progress.target}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${catColor}, ${catColor}cc)` }}
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 1, ease: 'easeOut', delay: index * 0.05 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Reward */}
                  <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <Zap className="w-4 h-4" style={{ color: '#ffaa00' }} />
                    <span className="text-xs font-mono font-bold" style={{ color: '#ffaa00' }}>
                      +{mission.power_points} PWRS
                    </span>
                  </div>

                  {/* Hover glow */}
                  {isClickable && (
                    <motion.div
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
                      style={{ boxShadow: `inset 0 0 30px ${catColor}08, 0 0 15px ${catColor}08` }}
                    />
                  )}
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
              style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowDonationModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-md rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(10,10,15,0.98), rgba(0,15,8,0.95))',
                  border: '1px solid rgba(0,255,136,0.2)',
                  boxShadow: '0 0 60px rgba(0,255,136,0.15)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                        background: 'rgba(0,255,136,0.15)',
                        border: '1px solid rgba(0,255,136,0.3)',
                      }}>
                        <Heart className="w-5 h-5" style={{ color: '#00ff88' }} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold font-mono text-white">Apoiar o Projeto</h2>
                        <p className="text-xs font-mono text-zinc-500">Escolha um valor de doacao</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDonationModal(false)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                    >
                      <X className="w-4 h-4 text-zinc-500" />
                    </button>
                  </div>

                  {/* Tier Selection */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {DONATION_TIERS.map((tier) => {
                      const isSelected = donationAmount === tier.amount;
                      return (
                        <motion.button
                          key={tier.amount}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setDonationAmount(tier.amount)}
                          className="relative p-4 rounded-xl text-left transition-all duration-200"
                          style={{
                            background: isSelected ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isSelected ? 'rgba(0,255,136,0.4)' : 'rgba(255,255,255,0.06)'}`,
                            boxShadow: isSelected ? '0 0 20px rgba(0,255,136,0.1)' : 'none',
                          }}
                        >
                          <p className="text-lg font-bold font-mono text-white mb-0.5">{tier.amount} SOL</p>
                          <p className="text-xs font-mono text-zinc-500 mb-2">{tier.label}</p>
                          <div className="flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5" style={{ color: '#ffaa00' }} />
                            <span className="text-xs font-mono font-bold" style={{ color: '#ffaa00' }}>
                              +{tier.points} PWRS
                            </span>
                          </div>
                          {isSelected && (
                            <motion.div
                              layoutId="tierIndicator"
                              className="absolute top-2 right-2 w-2 h-2 rounded-full"
                              style={{ background: '#00ff88' }}
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Custom Amount */}
                  <div className="mb-6">
                    <label className="block text-xs font-mono text-zinc-500 mb-2">Valor personalizado (SOL)</label>
                    <input
                      type="number"
                      min="0.05"
                      step="0.01"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(parseFloat(e.target.value) || 0.05)}
                      className="w-full p-3 rounded-lg font-mono text-white text-sm"
                      style={{
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        outline: 'none',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = 'rgba(0,255,136,0.4)')}
                      onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                    />
                  </div>

                  {/* Summary */}
                  <div className="p-3 rounded-lg mb-6" style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.15)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-400">Recompensa estimada</span>
                      <div className="flex items-center gap-1">
                        <Zap className="w-4 h-4" style={{ color: '#ffaa00' }} />
                        <span className="text-sm font-bold font-mono" style={{ color: '#ffaa00' }}>
                          +{([...DONATION_TIERS].reverse().find(t => donationAmount >= t.amount)?.points || 50)} PWRS
                        </span>
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDonation}
                    disabled={processingMission === 'donation'}
                    className="w-full py-3.5 rounded-xl font-mono font-bold text-sm transition-all duration-200 disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,191,255,0.15))',
                      border: '1px solid rgba(0,255,136,0.3)',
                      color: '#00ff88',
                      boxShadow: '0 0 20px rgba(0,255,136,0.1)',
                    }}
                  >
                    {processingMission === 'donation' ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#00ff88', borderTopColor: 'transparent' }} />
                        Processando...
                      </div>
                    ) : (
                      `DOAR ${donationAmount} SOL`
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reward Toast */}
        <AnimatePresence>
          {showReward && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,0,0,0.95))',
                border: '1px solid rgba(0,255,136,0.4)',
                boxShadow: '0 0 40px rgba(0,255,136,0.25), 0 20px 40px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6 }}
                >
                  <Sparkles className="w-6 h-6" style={{ color: '#ffaa00' }} />
                </motion.div>
                <div>
                  <p className="text-xs font-mono text-zinc-400">{showReward.missionName}</p>
                  <p className="text-lg font-bold font-mono" style={{ color: '#00ff88' }}>
                    +{showReward.amount} Power Points
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
