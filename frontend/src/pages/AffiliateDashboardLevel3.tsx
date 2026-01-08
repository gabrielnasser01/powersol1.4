import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, ExternalLink, Users, DollarSign, MousePointer, CreditCard, Wallet, BarChart3, LineChart, ArrowLeft } from 'lucide-react';
import { userStorage } from '../store/persist';
import { useNavigate } from 'react-router-dom';

interface AffiliateStats {
  totalClicks: number;
  totalSignups: number;
  totalDeposits: number;
  weeklyEarnings: number;
  totalEarnings: number;
  conversionRate: number;
  dailyData: Array<{
    date: string;
    clicks: number;
    signups: number;
    deposits: number;
    earnings: number;
  }>;
}

export function AffiliateDashboardLevel3() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showClicks, setShowClicks] = useState(true);
  const [showSignups, setShowSignups] = useState(true);
  const [stats, setStats] = useState<AffiliateStats>({
    totalClicks: 2847,
    totalSignups: 189,
    totalDeposits: 84,
    weeklyEarnings: 327.50,
    totalEarnings: 2892.30,
    conversionRate: 12.1,
    dailyData: []
  });

  const user = userStorage.get();
  const affiliateLink = `https://powersol.io?ref=${user.publicKey?.slice(0, 8) || 'demo123'}`;
  const userLevel = 3;
  const commissionRate = 20; // 20% para Level 3

  // Generate daily data for the last 7 days
  useEffect(() => {
    const generateDailyData = () => {
      const data = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        data.push({
          date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          clicks: Math.floor(Math.random() * 80) + 20,
          signups: Math.floor(Math.random() * 15) + 3,
          deposits: Math.floor(Math.random() * 8) + 2,
          earnings: Math.floor(Math.random() * 60) + 15
        });
      }
      return data;
    };

    setStats(prev => ({
      ...prev,
      dailyData: generateDailyData()
    }));
  }, []);

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
      {/* Blue Terminal Background for Level 3 */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(0deg, rgba(62, 203, 255, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(62, 203, 255, 0.08) 1px, transparent 1px),
              linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(0, 20, 40, 0.95) 100%)
            `,
            backgroundSize: '20px 20px, 20px 20px, 100% 100%',
          }}
        />

        {/* Blue scanner effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(62, 203, 255, 0.02) 2px,
                rgba(62, 203, 255, 0.02) 4px
              )
            `,
            animation: 'blueTerminalScan 4s linear infinite',
          }}
        />

        <style>{`
          @keyframes blueTerminalScan {
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
            background: 'rgba(62, 203, 255, 0.2)',
            border: '1px solid rgba(62, 203, 255, 0.4)',
            color: '#3ecbff',
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
              background: 'linear-gradient(135deg, #3ecbff 0%, #00ccff 50%, #3ecbff 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 0 40px rgba(62, 203, 255, 0.5)',
            }}
          >
            <span className="hidden sm:inline">{'>'} </span>SILVER_DASHBOARD<span className="hidden md:inline">.EXE</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-2xl mx-auto font-mono px-4">
            Dashboard Silver - Level 3 - {commissionRate}% Comissao
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
              linear-gradient(0deg, rgba(62, 203, 255, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(62, 203, 255, 0.08) 1px, transparent 1px),
              linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(0, 20, 40, 0.95) 100%)
            `,
            backgroundSize: '20px 20px, 20px 20px, 100% 100%',
            borderColor: '#3ecbff',
            boxShadow: '0 0 30px rgba(62, 203, 255, 0.3)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 sm:mb-6 font-mono text-center" style={{ color: '#ffffff' }}>
            Link Silver - Level 3
          </h3>

          <div className="flex flex-col gap-3 sm:gap-4">
            <div
              className="p-3 sm:p-4 rounded-lg font-mono text-xs sm:text-sm break-all"
              style={{
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(62, 203, 255, 0.3)',
                color: '#3ecbff',
              }}
            >
              {affiliateLink}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <motion.button
                onClick={copyAffiliateLink}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 text-sm sm:text-base"
                style={{
                  background: 'rgba(62, 203, 255, 0.2)',
                  border: '1px solid rgba(62, 203, 255, 0.4)',
                  color: '#3ecbff',
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
                  background: 'linear-gradient(135deg, #3ecbff, #00ccff)',
                  color: '#000',
                  boxShadow: '0 0 20px rgba(62, 203, 255, 0.4)',
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
                    background: isActive ? 'rgba(62, 203, 255, 0.3)' : 'rgba(0, 0, 0, 0.6)',
                    border: `1px solid ${isActive ? '#3ecbff' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: isActive ? '#3ecbff' : '#ffffff',
                    boxShadow: isActive ? '0 0 20px rgba(62, 203, 255, 0.4)' : 'none',
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
                  { label: 'Cliques', labelFull: 'Total de Cliques', value: stats.totalClicks.toLocaleString(), icon: MousePointer, color: '#3ecbff' },
                  { label: 'Cadastros', labelFull: 'Cadastros', value: stats.totalSignups.toString(), icon: Users, color: '#00ccff' },
                  { label: 'Depositos', labelFull: 'Depositos', value: stats.totalDeposits.toString(), icon: CreditCard, color: '#0099ff' },
                  { label: 'Semana', labelFull: 'Ganhos da Semana', value: `$${stats.weeklyEarnings.toFixed(2)}`, icon: DollarSign, color: '#0066ff' },
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
                          linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 20, 40, 0.8) 100%)
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
                    linear-gradient(0deg, rgba(62, 203, 255, 0.08) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(62, 203, 255, 0.08) 1px, transparent 1px),
                    linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 20, 40, 0.8) 100%)
                  `,
                  backgroundSize: '20px 20px, 20px 20px, 100% 100%',
                  borderColor: 'rgba(62, 203, 255, 0.3)',
                  boxShadow: '0 0 30px rgba(62, 203, 255, 0.2)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <h4 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 sm:mb-6 font-mono text-center" style={{ color: '#ffffff' }}>
                  Resumo Silver
                </h4>

                <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
                  <div className="text-center p-2 sm:p-3 md:p-4 rounded-lg" style={{ background: 'rgba(62, 203, 255, 0.1)' }}>
                    <div className="text-base sm:text-xl md:text-3xl font-bold mb-1 sm:mb-2" style={{ color: '#3ecbff' }}>
                      ${stats.totalEarnings.toFixed(2)}
                    </div>
                    <p className="text-[10px] sm:text-xs md:text-sm text-zinc-400 font-mono">Total</p>
                  </div>

                  <div className="text-center p-2 sm:p-3 md:p-4 rounded-lg" style={{ background: 'rgba(0, 204, 255, 0.1)' }}>
                    <div className="text-base sm:text-xl md:text-3xl font-bold mb-1 sm:mb-2" style={{ color: '#00ccff' }}>
                      {stats.conversionRate}%
                    </div>
                    <p className="text-[10px] sm:text-xs md:text-sm text-zinc-400 font-mono">Conversao</p>
                  </div>

                  <div className="text-center p-2 sm:p-3 md:p-4 rounded-lg" style={{ background: 'rgba(0, 153, 255, 0.1)' }}>
                    <div className="text-base sm:text-xl md:text-3xl font-bold mb-1 sm:mb-2" style={{ color: '#0099ff' }}>
                      {commissionRate}%
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
                Analytics (7 dias)
              </h4>

              {/* Daily breakdown table */}
              <div
                className="p-3 sm:p-6 md:p-8 rounded-lg sm:rounded-xl border"
                style={{
                  background: `
                    linear-gradient(0deg, rgba(62, 203, 255, 0.08) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(62, 203, 255, 0.08) 1px, transparent 1px),
                    linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 20, 40, 0.8) 100%)
                  `,
                  backgroundSize: '20px 20px, 20px 20px, 100% 100%',
                  borderColor: 'rgba(62, 203, 255, 0.3)',
                  boxShadow: '0 0 30px rgba(62, 203, 255, 0.2)',
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
                      {stats.dailyData.map((d, i) => (
                        <tr key={i} className="border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                          <td className="py-2 sm:py-3 px-2 text-white font-mono">{d.date}</td>
                          <td className="py-2 sm:py-3 px-2 font-mono" style={{ color: '#3ecbff' }}>{d.clicks}</td>
                          <td className="py-2 sm:py-3 px-2 font-mono" style={{ color: '#00ccff' }}>{d.signups}</td>
                          <td className="py-2 sm:py-3 px-2 font-mono" style={{ color: '#0099ff' }}>{d.deposits}</td>
                          <td className="py-2 sm:py-3 px-2 font-mono" style={{ color: '#0066ff' }}>${d.earnings.toFixed(2)}</td>
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
                    linear-gradient(0deg, rgba(62, 203, 255, 0.08) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(62, 203, 255, 0.08) 1px, transparent 1px),
                    linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 20, 40, 0.8) 100%)
                  `,
                  backgroundSize: '20px 20px, 20px 20px, 100% 100%',
                  borderColor: 'rgba(62, 203, 255, 0.3)',
                  boxShadow: '0 0 30px rgba(62, 203, 255, 0.2)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div className="space-y-3 sm:space-y-4">
                  {[
                    { wallet: '7xK...9mP', joinDate: '15/01/2024', deposits: 8, earnings: '$125.30' },
                    { wallet: 'Bv2...4nQ', joinDate: '14/01/2024', deposits: 5, earnings: '$87.50' },
                    { wallet: '3hM...7wR', joinDate: '13/01/2024', deposits: 12, earnings: '$198.90' },
                    { wallet: 'Qp9...8sT', joinDate: '12/01/2024', deposits: 6, earnings: '$143.40' },
                    { wallet: 'Lm4...6vY', joinDate: '11/01/2024', deposits: 9, earnings: '$176.70' },
                  ].map((referral, index) => (
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
                            background: 'linear-gradient(135deg, rgba(62, 203, 255, 0.3), rgba(0, 204, 255, 0.2))',
                            border: '1px solid rgba(62, 203, 255, 0.4)',
                          }}
                        >
                          <Wallet className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" style={{ color: '#3ecbff' }} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-mono text-sm sm:text-base md:text-lg truncate" style={{ color: '#ffffff' }}>
                            {referral.wallet}
                          </div>
                          <div className="text-[10px] sm:text-xs md:text-sm text-zinc-400 font-mono">
                            {referral.joinDate}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="text-sm sm:text-lg md:text-xl font-bold" style={{ color: '#3ecbff' }}>
                          {referral.earnings}
                        </div>
                        <div className="text-[10px] sm:text-xs md:text-sm text-zinc-400 font-mono">
                          {referral.deposits} deps
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