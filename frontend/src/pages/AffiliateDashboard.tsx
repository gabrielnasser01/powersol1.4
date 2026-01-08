import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, ExternalLink, Users, DollarSign, TrendingUp, Calendar, MousePointer, CreditCard, Wallet, BarChart3, LineChart, Activity, ArrowLeft } from 'lucide-react';
import { theme } from '../theme';
import { userStorage } from '../store/persist';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';

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

        const statsData = await apiClient.getAffiliateStats(user.publicKey);
        const referralsData = await apiClient.getAffiliateReferrals(user.publicKey);

        setStats({
          totalClicks: statsData.totalClicks || 0,
          totalSignups: statsData.totalReferrals || 0,
          totalDeposits: statsData.validatedReferrals || 0,
          weeklyEarnings: statsData.pendingEarnings || 0,
          totalEarnings: statsData.totalEarned || 0,
          conversionRate: statsData.conversionRate || 0,
          referralCode: statsData.referralCode || '',
          currentTier: statsData.currentTier || 1,
          commissionRate: (statsData.commissionRate * 100) || 5,
          dailyData: []
        });

        setReferrals(referralsData || []);
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
    <div className="min-h-screen pt-20 pb-20 relative overflow-hidden">
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
        
        <style jsx>{`
          @keyframes terminalScan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
          }
        `}</style>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Back Button */}
        <motion.button
          onClick={() => navigate('/profile')}
          className="mb-8 flex items-center space-x-2 px-4 py-2 rounded-lg font-mono transition-all duration-300"
          style={{
            background: 'rgba(255, 20, 147, 0.2)',
            border: '1px solid rgba(255, 20, 147, 0.4)',
            color: '#ff1493',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar ao Perfil</span>
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 
            className="text-4xl md:text-6xl font-bold mb-6 font-mono"
            style={{ 
              background: 'linear-gradient(135deg, #ff1493 0%, #b347ff 50%, #ff1493 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 0 40px rgba(255, 20, 147, 0.5)',
            }}
          >
            {'>'} AFFILIATE_DASHBOARD.EXE
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-mono">
            [INITIALIZING...] Dashboard Premium de Afiliados - Nível {userLevel} • {commissionRate}% Comissão
          </p>
        </motion.div>

        {/* Affiliate Link Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-12 p-8 rounded-2xl border"
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
          <h3 className="text-2xl font-bold mb-6 font-mono text-center" style={{ color: '#ffffff' }}>
            Seu Link Premium de Afiliado
          </h3>
          
          <div className="flex flex-col lg:flex-row gap-4">
            <div 
              className="flex-1 p-4 rounded-lg font-mono text-sm break-all"
              style={{ 
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 20, 147, 0.3)',
                color: '#ff1493',
              }}
            >
              {affiliateLink}
            </div>
            
            <div className="flex gap-3">
              <motion.button
                onClick={copyAffiliateLink}
                className="px-6 py-4 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2"
                style={{
                  background: 'rgba(255, 20, 147, 0.2)',
                  border: '1px solid rgba(255, 20, 147, 0.4)',
                  color: '#ff1493',
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
              </motion.button>
              
              <motion.button
                onClick={openLinkInNewTab}
                className="px-6 py-4 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2"
                style={{
                  background: 'linear-gradient(135deg, #ff1493, #b347ff)',
                  color: '#000',
                  boxShadow: '0 0 20px rgba(255, 20, 147, 0.4)',
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ExternalLink className="w-5 h-5" />
                <span>Abrir Nova Aba</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-8"
        >
          <div className="flex justify-center space-x-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-6 py-3 rounded-lg font-mono font-semibold transition-all duration-300 flex items-center space-x-2"
                  style={{
                    background: isActive ? 'rgba(255, 20, 147, 0.3)' : 'rgba(0, 0, 0, 0.6)',
                    border: `1px solid ${isActive ? '#ff1493' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: isActive ? '#ff1493' : '#ffffff',
                    boxShadow: isActive ? '0 0 20px rgba(255, 20, 147, 0.4)' : 'none',
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
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
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total de Cliques', value: stats.totalClicks.toLocaleString(), icon: MousePointer, color: '#00bfff' },
                  { label: 'Cadastros', value: stats.totalSignups.toString(), icon: Users, color: '#00ff88' },
                  { label: 'Depósitos', value: stats.totalDeposits.toString(), icon: CreditCard, color: '#ff1493' },
                  { label: 'Ganhos da Semana', value: `$${stats.weeklyEarnings.toFixed(2)}`, icon: DollarSign, color: '#b347ff' },
                ].map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className="p-6 rounded-xl border text-center"
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
                        className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center"
                        style={{
                          background: `${stat.color}20`,
                          border: `1px solid ${stat.color}40`,
                        }}
                      >
                        <Icon className="w-8 h-8" style={{ color: stat.color }} />
                      </div>
                      <div className="text-2xl font-bold mb-1" style={{ color: stat.color }}>
                        {stat.value}
                      </div>
                      <p className="text-sm text-zinc-400 font-mono">
                        {stat.label}
                      </p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Weekly Summary */}
              <div 
                className="p-8 rounded-xl border"
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
                <h4 className="text-2xl font-bold mb-6 font-mono text-center" style={{ color: '#ffffff' }}>
                  Resumo da Semana
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 rounded-lg" style={{ background: 'rgba(0, 255, 136, 0.1)' }}>
                    <div className="text-3xl font-bold mb-2" style={{ color: '#00ff88' }}>
                      ${stats.totalEarnings.toFixed(2)}
                    </div>
                    <p className="text-sm text-zinc-400 font-mono">Total Acumulado</p>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg" style={{ background: 'rgba(0, 191, 255, 0.1)' }}>
                    <div className="text-3xl font-bold mb-2" style={{ color: '#00bfff' }}>
                      {stats.conversionRate}%
                    </div>
                    <p className="text-sm text-zinc-400 font-mono">Taxa de Conversão</p>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg" style={{ background: 'rgba(255, 20, 147, 0.1)' }}>
                    <div className="text-3xl font-bold mb-2" style={{ color: '#ff1493' }}>
                      {commissionRate}%
                    </div>
                    <p className="text-sm text-zinc-400 font-mono">Sua Comissão</p>
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
              className="space-y-8"
            >
              <h4 className="text-2xl font-bold font-mono text-center" style={{ color: '#ffffff' }}>
                Gráfico de Performance (Últimos 7 dias)
              </h4>
              
              {/* Line Chart */}
              <div 
                className="p-8 rounded-xl border"
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
              </div>

              {/* Daily breakdown table */}
              <div 
                className="p-8 rounded-xl border"
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
                <h5 className="text-xl font-bold mb-6 font-mono text-center" style={{ color: '#ffffff' }}>
                  Detalhamento Diário
                </h5>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                        <th className="text-left py-3 text-zinc-400 font-mono">Data</th>
                        <th className="text-left py-3 text-zinc-400 font-mono">Cliques</th>
                        <th className="text-left py-3 text-zinc-400 font-mono">Cadastros</th>
                        <th className="text-left py-3 text-zinc-400 font-mono">Depósitos</th>
                        <th className="text-left py-3 text-zinc-400 font-mono">Ganhos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.dailyData.map((d, i) => (
                        <tr key={i} className="border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                          <td className="py-3 text-white font-mono">{d.date}</td>
                          <td className="py-3 font-mono" style={{ color: '#00bfff' }}>{d.clicks}</td>
                          <td className="py-3 font-mono" style={{ color: '#00ff88' }}>{d.signups}</td>
                          <td className="py-3 font-mono" style={{ color: '#ff1493' }}>{d.deposits}</td>
                          <td className="py-3 font-mono" style={{ color: '#b347ff' }}>${d.earnings.toFixed(2)}</td>
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
              className="space-y-8"
            >
              <h4 className="text-2xl font-bold font-mono text-center" style={{ color: '#ffffff' }}>
                Seus Referidos
              </h4>
              
              <div 
                className="p-8 rounded-xl border"
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
                <div className="space-y-4">
                  {[
                    { wallet: '7xK...9mP', joinDate: '15/01/2024', deposits: 3, earnings: '$45.30' },
                    { wallet: 'Bv2...4nQ', joinDate: '14/01/2024', deposits: 1, earnings: '$12.50' },
                    { wallet: '3hM...7wR', joinDate: '13/01/2024', deposits: 5, earnings: '$78.90' },
                    { wallet: 'Qp9...8sT', joinDate: '12/01/2024', deposits: 2, earnings: '$23.40' },
                    { wallet: 'Lm4...6vY', joinDate: '11/01/2024', deposits: 4, earnings: '$56.70' },
                  ].map((referral, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="flex items-center justify-between p-6 rounded-lg"
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div className="flex items-center space-x-4">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255, 20, 147, 0.3), rgba(179, 71, 255, 0.2))',
                            border: '1px solid rgba(255, 20, 147, 0.4)',
                          }}
                        >
                          <Wallet className="w-6 h-6" style={{ color: '#ff1493' }} />
                        </div>
                        <div>
                          <div className="font-mono text-lg" style={{ color: '#ffffff' }}>
                            {referral.wallet}
                          </div>
                          <div className="text-sm text-zinc-400 font-mono">
                            Entrou em {referral.joinDate}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-xl font-bold" style={{ color: '#00ff88' }}>
                          {referral.earnings}
                        </div>
                        <div className="text-sm text-zinc-400 font-mono">
                          {referral.deposits} depósitos
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