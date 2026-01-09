import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, ExternalLink, Users, DollarSign, MousePointer, CreditCard, Wallet, BarChart3, LineChart, ArrowLeft } from 'lucide-react';
import { userStorage } from '../store/persist';
import { useNavigate } from 'react-router-dom';
import { affiliateDashboardService, WeeklyHistory } from '../services/affiliateDashboardService';

interface AffiliateStats {
  totalClicks: number;
  totalSignups: number;
  totalDeposits: number;
  weeklyEarnings: number;
  totalEarnings: number;
  conversionRate: number;
  referralCode: string;
  currentTier: number;
  commissionRate: number;
  dailyData: Array<{
    date: string;
    clicks: number;
    signups: number;
    deposits: number;
    earnings: number;
  }>;
}

export function AffiliateDashboard() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showClicks, setShowClicks] = useState(true);
  const [showSignups, setShowSignups] = useState(true);
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stats, setStats] = useState<AffiliateStats>({
    totalClicks: 0,
    totalSignups: 0,
    totalDeposits: 0,
    weeklyEarnings: 0,
    totalEarnings: 0,
    conversionRate: 0,
    referralCode: '',
    currentTier: 1,
    commissionRate: 0.05,
    dailyData: []
  });

  const user = userStorage.get();
  const affiliateLink = `https://powersol.io?ref=${stats.referralCode || user.publicKey?.slice(0, 8) || 'loading'}`;

  useEffect(() => {
    const fetchAffiliateData = async () => {
      if (!user.publicKey) return;

      try {
        setLoading(true);

        const statsData = await affiliateDashboardService.getDashboardStats(user.publicKey);
        const referralsData = await affiliateDashboardService.getTopReferrals(user.publicKey, 100);
        const weeklyData = await affiliateDashboardService.getWeeklyHistory(user.publicKey, 7);

        if (!statsData) {
          setStats({
            totalClicks: 0,
            totalSignups: 0,
            totalDeposits: 0,
            weeklyEarnings: 0,
            totalEarnings: 0,
            conversionRate: 0,
            referralCode: user.publicKey.slice(0, 8),
            currentTier: 1,
            commissionRate: 5,
            dailyData: []
          });
          return;
        }

        const totalEarnedSOL = statsData.totalEarnedLamports / 1_000_000_000;
        const weeklyEarnedSOL = statsData.weeklyEarnedLamports / 1_000_000_000;

        const dailyData = weeklyData.map(week => ({
          date: new Date(week.weekStartDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          clicks: 0,
          signups: week.referralCount,
          deposits: week.referralCount,
          earnings: week.earnedLamports / 1_000_000_000
        })).reverse();

        setStats({
          totalClicks: 0,
          totalSignups: statsData.totalReferrals,
          totalDeposits: statsData.totalReferrals,
          weeklyEarnings: weeklyEarnedSOL,
          totalEarnings: totalEarnedSOL,
          conversionRate: statsData.totalReferrals > 0 ? (statsData.totalReferrals / (statsData.totalReferrals + 100)) * 100 : 0,
          referralCode: user.publicKey.slice(0, 8),
          currentTier: statsData.tier,
          commissionRate: statsData.commissionRate * 100,
          dailyData: dailyData
        });

        setReferrals(referralsData.map(ref => ({
          wallet: ref.walletAddress,
          signupDate: new Date(ref.joinedAt).toLocaleDateString('pt-BR'),
          totalSpent: ref.totalSpentLamports / 1_000_000_000,
          commissionEarned: ref.commissionGeneratedLamports / 1_000_000_000,
          status: ref.isValidated ? 'Ativo' : 'Pendente'
        })));
      } catch (error) {
        console.error('Failed to fetch affiliate data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAffiliateData();
  }, [user.publicKey]);

  const copyAffiliateLink = async () => {
    await navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openLinkInNewTab = () => {
    window.open(affiliateLink, '_blank');
  };

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
    { id: 'referrals', label: 'Referidos', icon: Users },
  ];

  const maxClicks = Math.max(...stats.dailyData.map(d => d.clicks));
  const maxSignups = Math.max(...stats.dailyData.map(d => d.signups));

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-16 sm:pb-20 relative overflow-hidden">
      {/* Terminal Matrix Background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(0deg, rgba(255, 20, 147, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 20, 147, 0.08) 1px, transparent 1px),
              linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(20, 10, 20, 0.95) 100%)
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
                rgba(255, 20, 147, 0.02) 2px,
                rgba(255, 20, 147, 0.02) 4px
              )
            `,
            animation: 'terminalScan 4s linear infinite',
          }}
        />

        <style>{`
          @keyframes terminalScan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
          }
        `}</style>
      </div>

      <div className="container mx-auto px-3 sm:px-4 md:px-6 relative z-10 max-w-7xl">
        {/* Back Button */}
        <motion.button
          onClick={() => navigate('/profile')}
          className="mb-4 sm:mb-8 flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-mono text-sm sm:text-base transition-all duration-300"
          style={{
            background: 'rgba(255, 20, 147, 0.2)',
            border: '1px solid rgba(255, 20, 147, 0.4)',
            color: '#ff1493',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Voltar</span>
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8 sm:mb-12 md:mb-16"
        >
          <h1
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-6 font-mono px-2"
            style={{
              background: 'linear-gradient(135deg, #ff1493 0%, #b347ff 50%, #ff1493 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 0 40px rgba(255, 20, 147, 0.5)',
            }}
          >
            <span className="hidden sm:inline">{'>'} </span>AFFILIATE_DASHBOARD<span className="hidden md:inline">.EXE</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-2xl mx-auto font-mono px-4">
            Dashboard de Afiliados - Nivel {stats.currentTier} - {stats.commissionRate}% Comissao
          </p>
        </motion.div>

        {/* Affiliate Link Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-6 sm:mb-8 md:mb-12 p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border"
          style={{
            background: `
              linear-gradient(0deg, rgba(255, 20, 147, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 20, 147, 0.08) 1px, transparent 1px),
              linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(20, 10, 20, 0.95) 100%)
            `,
            backgroundSize: '20px 20px, 20px 20px, 100% 100%',
            borderColor: '#ff1493',
            boxShadow: '0 0 30px rgba(255, 20, 147, 0.3)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 sm:mb-6 font-mono text-center" style={{ color: '#ffffff' }}>
            Seu Link de Afiliado
          </h3>

          <div className="flex flex-col gap-3 sm:gap-4">
            <div
              className="p-3 sm:p-4 rounded-lg font-mono text-xs sm:text-sm break-all"
              style={{
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 20, 147, 0.3)',
                color: '#ff1493',
              }}
            >
              {affiliateLink}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <motion.button
                onClick={copyAffiliateLink}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 text-sm sm:text-base"
                style={{
                  background: 'rgba(255, 20, 147, 0.2)',
                  border: '1px solid rgba(255, 20, 147, 0.4)',
                  color: '#ff1493',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {copied ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </motion.button>

              <motion.button
                onClick={openLinkInNewTab}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 text-sm sm:text-base"
                style={{
                  background: 'linear-gradient(135deg, #ff1493, #b347ff)',
                  color: '#000',
                  boxShadow: '0 0 20px rgba(255, 20, 147, 0.4)',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Abrir</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex justify-start sm:justify-center overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 gap-2 sm:gap-4 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-mono font-semibold transition-all duration-300 flex items-center space-x-1.5 sm:space-x-2 whitespace-nowrap text-xs sm:text-sm flex-shrink-0"
                  style={{
                    background: isActive ? 'rgba(255, 20, 147, 0.3)' : 'rgba(0, 0, 0, 0.6)',
                    border: `1px solid ${isActive ? '#ff1493' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: isActive ? '#ff1493' : '#ffffff',
                    boxShadow: isActive ? '0 0 20px rgba(255, 20, 147, 0.4)' : 'none',
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden xs:inline sm:inline">{tab.label}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4 sm:space-y-6 md:space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {[
                  { label: 'Cliques', labelFull: 'Total de Cliques', value: stats.totalClicks.toLocaleString(), icon: MousePointer, color: '#00bfff' },
                  { label: 'Cadastros', labelFull: 'Cadastros', value: stats.totalSignups.toString(), icon: Users, color: '#00ff88' },
                  { label: 'Depositos', labelFull: 'Depositos', value: stats.totalDeposits.toString(), icon: CreditCard, color: '#ff1493' },
                  { label: 'Semana', labelFull: 'Ganhos da Semana', value: `$${stats.weeklyEarnings.toFixed(2)}`, icon: DollarSign, color: '#b347ff' },
                ].map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className="p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl border text-center"
                      style={{
                        background: `
                          linear-gradient(0deg, ${stat.color}08 1px, transparent 1px),
                          linear-gradient(90deg, ${stat.color}08 1px, transparent 1px),
                          linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(20, 10, 20, 0.8) 100%)
                        `,
                        backgroundSize: '20px 20px, 20px 20px, 100% 100%',
                        borderColor: stat.color,
                        boxShadow: `0 0 20px ${stat.color}30`,
                        backdropFilter: 'blur(20px)',
                      }}
                    >
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-lg sm:rounded-xl mx-auto mb-2 sm:mb-3 md:mb-4 flex items-center justify-center"
                        style={{
                          background: `${stat.color}20`,
                          border: `1px solid ${stat.color}40`,
                        }}
                      >
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" style={{ color: stat.color }} />
                      </div>
                      <div className="text-lg sm:text-xl md:text-2xl font-bold mb-0.5 sm:mb-1" style={{ color: stat.color }}>
                        {stat.value}
                      </div>
                      <p className="text-[10px] sm:text-xs md:text-sm text-zinc-400 font-mono">
                        <span className="sm:hidden">{stat.label}</span>
                        <span className="hidden sm:inline">{stat.labelFull}</span>
                      </p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Weekly Summary */}
              <div
                className="p-4 sm:p-6 md:p-8 rounded-lg sm:rounded-xl border"
                style={{
                  background: `
                    linear-gradient(0deg, rgba(255, 20, 147, 0.08) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 20, 147, 0.08) 1px, transparent 1px),
                    linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(20, 10, 20, 0.8) 100%)
                  `,
                  backgroundSize: '20px 20px, 20px 20px, 100% 100%',
                  borderColor: 'rgba(255, 20, 147, 0.3)',
                  boxShadow: '0 0 30px rgba(255, 20, 147, 0.2)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <h4 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 sm:mb-6 font-mono text-center" style={{ color: '#ffffff' }}>
                  Resumo da Semana
                </h4>

                <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
                  <div className="text-center p-2 sm:p-3 md:p-4 rounded-lg" style={{ background: 'rgba(0, 255, 136, 0.1)' }}>
                    <div className="text-base sm:text-xl md:text-3xl font-bold mb-1 sm:mb-2" style={{ color: '#00ff88' }}>
                      ${stats.totalEarnings.toFixed(2)}
                    </div>
                    <p className="text-[10px] sm:text-xs md:text-sm text-zinc-400 font-mono">Total</p>
                  </div>

                  <div className="text-center p-2 sm:p-3 md:p-4 rounded-lg" style={{ background: 'rgba(0, 191, 255, 0.1)' }}>
                    <div className="text-base sm:text-xl md:text-3xl font-bold mb-1 sm:mb-2" style={{ color: '#00bfff' }}>
                      {stats.conversionRate}%
                    </div>
                    <p className="text-[10px] sm:text-xs md:text-sm text-zinc-400 font-mono">Conversao</p>
                  </div>

                  <div className="text-center p-2 sm:p-3 md:p-4 rounded-lg" style={{ background: 'rgba(255, 20, 147, 0.1)' }}>
                    <div className="text-base sm:text-xl md:text-3xl font-bold mb-1 sm:mb-2" style={{ color: '#ff1493' }}>
                      {stats.commissionRate}%
                    </div>
                    <p className="text-[10px] sm:text-xs md:text-sm text-zinc-400 font-mono">Comissao</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4 sm:space-y-6 md:space-y-8"
            >
              <h4 className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-center" style={{ color: '#ffffff' }}>
                Performance (7 dias)
              </h4>

              {/* Line Chart */}
              <div
                className="p-4 sm:p-6 md:p-8 rounded-lg sm:rounded-xl border"
                style={{
                  background: `
                    linear-gradient(0deg, rgba(255, 20, 147, 0.08) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 20, 147, 0.08) 1px, transparent 1px),
                    linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(20, 10, 20, 0.8) 100%)
                  `,
                  backgroundSize: '20px 20px, 20px 20px, 100% 100%',
                  borderColor: 'rgba(255, 20, 147, 0.3)',
                  boxShadow: '0 0 30px rgba(255, 20, 147, 0.2)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                {stats.dailyData.length === 0 ? (
                  <p className="text-center text-zinc-400 font-mono text-sm">Sem dados ainda</p>
                ) : (
                  <div className="w-full h-64 relative">
                    <svg width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="earningsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="rgba(179, 71, 255, 0.3)" />
                          <stop offset="100%" stopColor="rgba(179, 71, 255, 0)" />
                        </linearGradient>
                        <linearGradient id="signupsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="rgba(0, 255, 136, 0.3)" />
                          <stop offset="100%" stopColor="rgba(0, 255, 136, 0)" />
                        </linearGradient>
                      </defs>

                      {(() => {
                        const maxEarnings = Math.max(...stats.dailyData.map(d => d.earnings), 0.001);
                        const maxSignups = Math.max(...stats.dailyData.map(d => d.signups), 1);
                        const points = stats.dailyData.length;
                        const xStep = 600 / (points - 1 || 1);

                        const earningsPath = stats.dailyData.map((d, i) => {
                          const x = i * xStep;
                          const y = 200 - (d.earnings / maxEarnings) * 180;
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ');

                        const earningsArea = earningsPath + ` L ${(points - 1) * xStep} 200 L 0 200 Z`;

                        const signupsPath = stats.dailyData.map((d, i) => {
                          const x = i * xStep;
                          const y = 200 - (d.signups / maxSignups) * 180;
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ');

                        const signupsArea = signupsPath + ` L ${(points - 1) * xStep} 200 L 0 200 Z`;

                        return (
                          <>
                            <path d={earningsArea} fill="url(#earningsGradient)" opacity="0.5" />
                            <path d={earningsPath} stroke="#b347ff" strokeWidth="2" fill="none" />

                            <path d={signupsArea} fill="url(#signupsGradient)" opacity="0.5" />
                            <path d={signupsPath} stroke="#00ff88" strokeWidth="2" fill="none" />
                          </>
                        );
                      })()}
                    </svg>

                    <div className="absolute top-2 right-2 flex gap-4 text-xs font-mono">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ background: '#00ff88' }} />
                        <span style={{ color: '#00ff88' }}>Signups</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ background: '#b347ff' }} />
                        <span style={{ color: '#b347ff' }}>Ganhos (SOL)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Daily breakdown table */}
              <div
                className="p-3 sm:p-6 md:p-8 rounded-lg sm:rounded-xl border"
                style={{
                  background: `
                    linear-gradient(0deg, rgba(255, 20, 147, 0.08) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 20, 147, 0.08) 1px, transparent 1px),
                    linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(20, 10, 20, 0.8) 100%)
                  `,
                  backgroundSize: '20px 20px, 20px 20px, 100% 100%',
                  borderColor: 'rgba(255, 20, 147, 0.3)',
                  boxShadow: '0 0 30px rgba(255, 20, 147, 0.2)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <h5 className="text-base sm:text-lg md:text-xl font-bold mb-4 sm:mb-6 font-mono text-center" style={{ color: '#ffffff' }}>
                  Detalhamento Diario
                </h5>

                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <table className="w-full text-xs sm:text-sm min-w-[400px]">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                        <th className="text-left py-2 sm:py-3 px-2 text-zinc-400 font-mono">Data</th>
                        <th className="text-left py-2 sm:py-3 px-2 text-zinc-400 font-mono">Cliques</th>
                        <th className="text-left py-2 sm:py-3 px-2 text-zinc-400 font-mono">Signups</th>
                        <th className="text-left py-2 sm:py-3 px-2 text-zinc-400 font-mono">Deps</th>
                        <th className="text-left py-2 sm:py-3 px-2 text-zinc-400 font-mono">Ganhos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.dailyData.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-zinc-500 font-mono">
                            Sem dados ainda
                          </td>
                        </tr>
                      ) : stats.dailyData.map((d, i) => (
                        <tr key={i} className="border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                          <td className="py-2 sm:py-3 px-2 text-white font-mono">{d.date}</td>
                          <td className="py-2 sm:py-3 px-2 font-mono" style={{ color: '#00bfff' }}>{d.clicks}</td>
                          <td className="py-2 sm:py-3 px-2 font-mono" style={{ color: '#00ff88' }}>{d.signups}</td>
                          <td className="py-2 sm:py-3 px-2 font-mono" style={{ color: '#ff1493' }}>{d.deposits}</td>
                          <td className="py-2 sm:py-3 px-2 font-mono" style={{ color: '#b347ff' }}>${d.earnings.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'referrals' && (
            <motion.div
              key="referrals"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4 sm:space-y-6 md:space-y-8"
            >
              <h4 className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-center" style={{ color: '#ffffff' }}>
                Seus Referidos
              </h4>

              <div
                className="p-3 sm:p-6 md:p-8 rounded-lg sm:rounded-xl border"
                style={{
                  background: `
                    linear-gradient(0deg, rgba(255, 20, 147, 0.08) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 20, 147, 0.08) 1px, transparent 1px),
                    linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(20, 10, 20, 0.8) 100%)
                  `,
                  backgroundSize: '20px 20px, 20px 20px, 100% 100%',
                  borderColor: 'rgba(255, 20, 147, 0.3)',
                  boxShadow: '0 0 30px rgba(255, 20, 147, 0.2)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div className="space-y-3 sm:space-y-4">
                  {referrals.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <Users className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-zinc-600" />
                      <p className="text-sm sm:text-base text-zinc-400 font-mono">Nenhum referido ainda</p>
                      <p className="text-xs sm:text-sm text-zinc-500 font-mono mt-2">Compartilhe seu link para comecar</p>
                    </div>
                  ) : referrals.map((referral, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 sm:p-4 md:p-6 rounded-lg"
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div className="flex items-center space-x-2 sm:space-x-4">
                        <div
                          className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255, 20, 147, 0.3), rgba(179, 71, 255, 0.2))',
                            border: '1px solid rgba(255, 20, 147, 0.4)',
                          }}
                        >
                          <Wallet className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" style={{ color: '#ff1493' }} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-mono text-sm sm:text-base md:text-lg truncate" style={{ color: '#ffffff' }}>
                            {referral.wallet_address?.slice(0, 4)}...{referral.wallet_address?.slice(-4)}
                          </div>
                          <div className="text-[10px] sm:text-xs md:text-sm text-zinc-400 font-mono">
                            {new Date(referral.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="text-sm sm:text-lg md:text-xl font-bold" style={{ color: '#00ff88' }}>
                          {referral.tickets_bought || 0}
                        </div>
                        <div className="text-[10px] sm:text-xs md:text-sm text-zinc-400 font-mono">
                          tickets
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}