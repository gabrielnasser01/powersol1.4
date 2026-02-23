import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, DollarSign, Crown, Star, Copy, Check, ExternalLink, ArrowRight, Sparkles, Loader, LayoutDashboard, Lock } from 'lucide-react';
import { theme } from '../theme';
import { useMagnetic } from '../hooks/useMagnetic';
import { apiClient } from '../services/api';
import { affiliateDashboardService, ApplicationStatus } from '../services/affiliateDashboardService';
import { useWallet } from '../contexts/WalletContext';
import { supabase } from '../lib/supabase';
import { solPriceService } from '../services/solPriceService';

const affiliateTiers = [
  { 
    threshold: 0, 
    rate: 0.05, 
    label: 'Starter', 
    color: '#1e40af',
    icon: Star,
    benefits: ['5% commission', 'Basic analytics', 'Email support']
  },
  { 
    threshold: 100, 
    rate: 0.10,
    label: 'Bronze', 
    color: theme.colors.neonPink,
    icon: TrendingUp,
    benefits: ['10% commission', 'Priority support', 'Basic analytics', 'Custom referral codes']
  },
  { 
    threshold: 1000, 
    rate: 0.20,
    label: 'Silver', 
    color: '#3ecbff',
    icon: Crown,
    benefits: ['20% commission',  'Dedicated manager', 'Advanced analytics', 'Marketing materials']
  },
  { 
    threshold: 5000, 
    rate: 0.30, 
    label: 'Gold', 
    color: theme.colors.neonPurple,
    icon: Sparkles,
    benefits: ['30% commission', 'Advanced analytics', 'VIP treatment', 'Revenue sharing']
  },
];

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return `$${value.toFixed(0)}`;
}

function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

export function Affiliates() {
  const navigate = useNavigate();
  const { publicKey: walletAddress, connected } = useWallet();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    wallet: '',
    country: '',
    social: '',
    experience: '',
    message: ''
  });
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>({
    hasApplied: false,
    status: null,
    appliedAt: null,
  });
  const [stats, setStats] = useState([
    { label: 'Active Affiliates', value: '...', icon: Users, color: theme.colors.neonBlue },
    { label: 'Total Commissions Paid', value: '...', icon: DollarSign, color: theme.colors.neonCyan },
    { label: 'Average Monthly Earnings', value: '...', icon: TrendingUp, color: theme.colors.neonPink },
    { label: 'Top Affiliate Earnings', value: '...', icon: Crown, color: '#b347ff' },
  ]);
  const spanRef = useRef<HTMLSpanElement>(null);
  const ctaButtonRef = useRef<HTMLButtonElement>(null);
  const applyButtonRef = useRef<HTMLButtonElement>(null);
  const dashboardButtonRef = useRef<HTMLButtonElement>(null);

  useMagnetic(ctaButtonRef);
  useMagnetic(applyButtonRef);
  useMagnetic(dashboardButtonRef);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [{ data }, solPrice] = await Promise.all([
          supabase.rpc('get_affiliate_public_stats'),
          solPriceService.fetchPrice(),
        ]);
        if (data) {
          const d = data as {
            active_affiliates: number;
            total_commissions_paid_lamports: number;
            avg_monthly_earnings_lamports: number;
            top_affiliate_earnings_lamports: number;
          };
          const totalPaidUsd = lamportsToSol(d.total_commissions_paid_lamports) * solPrice;
          const avgMonthlyUsd = lamportsToSol(d.avg_monthly_earnings_lamports) * solPrice;
          const topEarningsUsd = lamportsToSol(d.top_affiliate_earnings_lamports) * solPrice;

          setStats([
            { label: 'Active Affiliates', value: d.active_affiliates.toLocaleString(), icon: Users, color: theme.colors.neonBlue },
            { label: 'Total Commissions Paid', value: formatUsd(totalPaidUsd), icon: DollarSign, color: theme.colors.neonCyan },
            { label: 'Average Monthly Earnings', value: formatUsd(avgMonthlyUsd), icon: TrendingUp, color: theme.colors.neonPink },
            { label: 'Top Affiliate Earnings', value: formatUsd(topEarningsUsd), icon: Crown, color: '#b347ff' },
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch affiliate stats:', err);
      }
    };
    fetchStats();
  }, []);

  const checkApplicationStatus = useCallback(async () => {
    if (!walletAddress) return;
    const status = await affiliateDashboardService.checkApplicationStatus(walletAddress);
    setApplicationStatus(status);
  }, [walletAddress]);

  useEffect(() => {
    checkApplicationStatus();
  }, [checkApplicationStatus]);

  const canAccessDashboard = connected && applicationStatus.hasApplied && applicationStatus.status === 'approved';
  const needsWalletConnection = !connected;
  const needsApplication = connected && !applicationStatus.hasApplied;

  const handleDashboardClick = () => {
    if (canAccessDashboard) {
      navigate('/dashboard');
    }
  };

  const getDashboardButtonText = () => {
    if (needsWalletConnection) return '(connect wallet)';
    if (needsApplication) return '(apply first)';
    if (applicationStatus.status === 'rejected') return '(rejected)';
    return '';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    const walletToUse = walletAddress || formData.wallet;

    try {
      await apiClient.submitAffiliateApplication({
        wallet_address: walletToUse,
        full_name: formData.name,
        email: formData.email,
        country: formData.country || undefined,
        social_media: formData.social || undefined,
        marketing_experience: formData.experience || undefined,
        marketing_strategy: formData.message || undefined,
      });

      setSubmitStatus('success');

      setApplicationStatus({
        hasApplied: true,
        status: 'pending',
        appliedAt: new Date().toISOString(),
      });

      setTimeout(() => {
        setShowForm(false);
        setSubmitStatus('idle');
        setFormData({
          name: '',
          email: '',
          wallet: '',
          country: '',
          social: '',
          experience: '',
          message: ''
        });
      }, 2000);
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyReferralLink = async () => {
    if (!walletAddress) return;
    const link = `https://powersol.io?ref=${walletAddress}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="min-h-screen pt-20 pb-20 relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Animated Background with Moving Dots */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(circle at 20% 20%, rgba(62, 203, 255, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(255, 78, 205, 0.12) 0%, transparent 50%),
              radial-gradient(circle at 40% 60%, rgba(47, 255, 226, 0.08) 0%, transparent 50%),
              linear-gradient(135deg, #0a0b0f 0%, #0f1117 50%, #0a0b0f 100%)
            `,
          }}
        />
        
        {/* Moving dots pattern */}
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: i % 4 === 0 ? theme.colors.neonBlue : 
                         i % 4 === 1 ? theme.colors.neonPink : 
                         i % 4 === 2 ? theme.colors.neonCyan : 
                         theme.colors.neonPurple,
              boxShadow: `0 0 4px ${
                i % 4 === 0 ? theme.colors.neonBlue : 
                i % 4 === 1 ? theme.colors.neonPink : 
                i % 4 === 2 ? theme.colors.neonCyan : 
                theme.colors.neonPurple
              }`,
            }}
            animate={{
              x: [0, Math.random() * 100 - 50, 0],
              y: [0, Math.random() * 100 - 50, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              delay: Math.random() * 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <motion.h1 
            className="text-xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight font-mono"
            style={{ 
              background: 'linear-gradient(135deg, #3ecbff 0%, #ff4ecd 50%, #2fffe2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 0 40px rgba(62, 203, 255, 0.5)',
            }}
          >
            {'>'} PREMIUM_AFFILIATES.EXE
          </motion.h1>
          
          <motion.p 
            className="text-lg sm:text-xl md:text-2xl mb-8 text-zinc-300 max-w-3xl mx-auto leading-relaxed font-mono"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            [INITIALIZING...] Join elite affiliate network. Earn up to <span 
              className="font-bold"
              style={{
                background: 'linear-gradient(135deg, #3ecbff, #2fffe2)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                textShadow: '0 0 20px rgba(62, 203, 255, 0.8)',
              }}
            >
              30% COMMISSION
            </span> and build crypto empire. Dashboard access is granted after application.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <motion.button
              ref={ctaButtonRef}
              onClick={() => setShowForm(true)}
              className="px-4 sm:px-8 py-2 sm:py-4 rounded-lg font-bold text-sm sm:text-lg transition-all duration-300 flex items-center space-x-2 font-mono"
              style={{
                background: 'linear-gradient(135deg, #3ecbff, #2fffe2)',
                color: '#000',
                boxShadow: '0 0 30px rgba(62, 203, 255, 0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Crown className="w-6 h-6" />
              <span>Execute_Premium_Access</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>

            <motion.button
              onClick={copyReferralLink}
              disabled={!connected}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 border font-mono ${!connected ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: theme.colors.text,
                backdropFilter: 'blur(10px)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
              whileHover={connected ? {
                background: 'rgba(255, 255, 255, 0.1)',
                scale: 1.02,
              } : {}}
              whileTap={connected ? { scale: 0.98 } : {}}
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              <span>{copied ? 'COPIED!' : !connected ? 'CONNECT_WALLET' : 'COPY_AFFILIATE_LINK'}</span>
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex justify-center"
          >
            <motion.button
              ref={dashboardButtonRef}
              onClick={handleDashboardClick}
              disabled={!canAccessDashboard}
              className={`
                px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 border font-mono
                ${!canAccessDashboard ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              style={{
                background: canAccessDashboard
                  ? 'linear-gradient(135deg, rgba(62, 203, 255, 0.2), rgba(47, 255, 226, 0.1))'
                  : 'rgba(255, 255, 255, 0.02)',
                borderColor: canAccessDashboard ? 'rgba(62, 203, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                color: canAccessDashboard ? '#3ecbff' : 'rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(10px)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                boxShadow: canAccessDashboard ? '0 0 20px rgba(62, 203, 255, 0.2)' : 'none',
              }}
              whileHover={canAccessDashboard ? {
                scale: 1.02,
                boxShadow: '0 0 30px rgba(62, 203, 255, 0.4)',
              } : {}}
              whileTap={canAccessDashboard ? { scale: 0.98 } : {}}
            >
              {canAccessDashboard ? (
                <LayoutDashboard className="w-5 h-5" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
              <span>ACCESS_DASHBOARD</span>
              {!canAccessDashboard && (
                <span className="text-xs ml-2 opacity-70">{getDashboardButtonText()}</span>
              )}
            </motion.button>
          </motion.div>
        </motion.div>
        
        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-20"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="p-4 sm:p-6 rounded-2xl border text-center relative overflow-hidden"
                style={{
                  background: `
                    linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(15, 17, 23, 0.6)),
                    repeating-linear-gradient(
                      45deg,
                      transparent,
                      transparent 2px,
                      rgba(62, 203, 255, 0.02) 2px,
                      rgba(62, 203, 255, 0.02) 4px
                    )
                  `,
                  borderColor: stat.color,
                  boxShadow: `0 0 20px ${stat.color}20`,
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div 
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl mx-auto mb-3 sm:mb-4 flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}10)`,
                    border: `1px solid ${stat.color}40`,
                    boxShadow: `inset 0 0 10px ${stat.color}20`,
                  }}
                >
                  <Icon className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: stat.color }} />
                </div>
                
                <div className="text-xl sm:text-2xl font-bold mb-1 font-mono" style={{ 
                  color: stat.color,
                  textShadow: `0 0 10px ${stat.color}60`,
                }}>
                  {stat.value}
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 font-mono uppercase tracking-wide">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Tiers Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="mb-20"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-center" style={{ color: theme.colors.text, fontFamily: 'Orbitron, monospace' }}>
            Affiliate Tiers
          </h2>
          <p className="text-center text-zinc-400 mb-12 max-w-2xl mx-auto">
            Progress through our tier system and unlock higher commissions and exclusive benefits
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {affiliateTiers.map((tier, index) => {
              const Icon = tier.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    duration: 0.6, 
                    delay: 1.2 + index * 0.1,
                    ease: 'easeOut' 
                  }}
                  whileHover={{ 
                    y: -10, 
                    scale: 1.05,
                    transition: { duration: 0.3 }
                  }}
                  className="relative p-6 rounded-2xl border cursor-pointer group overflow-hidden"
                  style={{
                    background: theme.gradients.card,
                    borderColor: tier.color,
                    boxShadow: `0 0 30px ${tier.color}40`,
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  {/* Tier Badge */}
                  <div className="absolute top-4 right-4">
                    <div 
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{
                        background: `${tier.color}20`,
                        color: tier.color,
                        border: `1px solid ${tier.color}40`,
                      }}
                    >
                      {tier.threshold === 0 ? 'START HERE' : `${tier.threshold}+ REFS`}
                    </div>
                  </div>

                  {/* Icon */}
                  <motion.div
                    className="w-16 h-16 rounded-xl mb-6 flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${tier.color}20, ${tier.color}10)`,
                      border: `1px solid ${tier.color}40`,
                    }}
                    whileHover={{
                      boxShadow: `0 0 20px ${tier.color}60`,
                      scale: 1.1,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <Icon 
                      className="w-8 h-8"
                      style={{ color: tier.color }}
                    />
                  </motion.div>

                  {/* Content */}
                  <h3 
                    className="text-2xl font-bold mb-2"
                    style={{ color: tier.color, fontFamily: 'Orbitron, monospace' }}
                  >
                    {tier.label}
                  </h3>
                  
                  <div className="text-3xl font-bold mb-4" style={{ color: theme.colors.text }}>
                    {(tier.rate * 100).toFixed(0)}%
                  </div>

                  {/* Benefits */}
                  <div className="space-y-2">
                    {tier.benefits.map((benefit, benefitIndex) => (
                      <div key={benefitIndex} className="flex items-center text-sm text-zinc-400">
                        <div 
                          className="w-2 h-2 rounded-full mr-3"
                          style={{ background: tier.color }}
                        />
                        {benefit}
                      </div>
                    ))}
                  </div>

                  {/* Hover effect overlay */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                     background: `linear-gradient(135deg, #3ecbff20, #3ecbff10)`,
                    }}
                  />
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* How It Works Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="mb-20"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-12 text-center" style={{ color: theme.colors.text, fontFamily: 'Orbitron, monospace' }}>
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Apply & Get Approved',
                description: 'Submit your application with your experience and marketing strategy. Our team reviews within 24 hours.',
                icon: Users,
                color: theme.colors.neonBlue
              },
              {
                step: '02', 
                title: 'Share Your Link',
                description: 'Get your unique referral link and start promoting powerSOL to your audience across all channels.',
                icon: ExternalLink,
                color: theme.colors.neonCyan
              },
              {
                step: '03',
                title: 'Earn Commissions',
                description: 'Earn up to 30% commission on every ticket purchase from your referrals. Weekly payments.',
                icon: DollarSign,
                color: theme.colors.neonPink
              }
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.6 + index * 0.2 }}
                  className="text-center"
                >
                  <div 
                    className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center relative"
                    style={{
                      background: `linear-gradient(135deg, ${step.color}20, ${step.color}10)`,
                      border: `1px solid ${step.color}40`,
                    }}
                  >
                    <Icon className="w-10 h-10" style={{ color: step.color }} />
                    <div 
                      className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: step.color,
                        color: '#000',
                      }}
                    >
                      {step.step}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-4" style={{ color: step.color }}>
                    {step.title}
                  </h3>
                  <p className="text-zinc-400 leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Application Form Modal */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 min-h-screen"
            style={{ background: 'rgba(0, 0, 0, 0.9)' }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 rounded-2xl border mx-4"
              style={{
                background: theme.gradients.card,
                borderColor: theme.colors.neonBlue,
                boxShadow: theme.shadows.neonGlow,
                backdropFilter: 'blur(20px)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold mb-6 text-center" style={{ color: theme.colors.text, fontFamily: 'Orbitron, monospace' }}>
                Premium Affiliate Application
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full p-2.5 rounded-lg border bg-transparent text-white placeholder-zinc-500 focus:outline-none focus:ring-2 text-sm"
                      style={{
                        borderColor: theme.colors.border,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      }}
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full p-2.5 rounded-lg border bg-transparent text-white placeholder-zinc-500 focus:outline-none focus:ring-2 text-sm"
                      style={{
                        borderColor: theme.colors.border,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      }}
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
                    Solana Wallet Address *
                  </label>
                  <input
                    type="text"
                    name="wallet"
                    value={formData.wallet}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2.5 rounded-lg border bg-transparent text-white placeholder-zinc-500 focus:outline-none focus:ring-2 font-mono text-xs"
                    style={{
                      borderColor: theme.colors.border,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    }}
                    placeholder="Enter your Solana wallet address"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
                      Country
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full p-2.5 rounded-lg border bg-transparent text-white focus:outline-none focus:ring-2 text-sm"
                      style={{
                        borderColor: theme.colors.border,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <option value="" className="bg-gray-800">Select Country</option>
                      <option value="US" className="bg-gray-800">United States</option>
                      <option value="BR" className="bg-gray-800">Brazil</option>
                      <option value="UK" className="bg-gray-800">United Kingdom</option>
                      <option value="CA" className="bg-gray-800">Canada</option>
                      <option value="AU" className="bg-gray-800">Australia</option>
                      <option value="DE" className="bg-gray-800">Germany</option>
                      <option value="FR" className="bg-gray-800">France</option>
                      <option value="JP" className="bg-gray-800">Japan</option>
                      <option value="other" className="bg-gray-800">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
                      Social Media / Website
                    </label>
                    <input
                      type="url"
                      name="social"
                      value={formData.social}
                      onChange={handleInputChange}
                      className="w-full p-2.5 rounded-lg border bg-transparent text-white placeholder-zinc-500 focus:outline-none focus:ring-2 text-sm"
                      style={{
                        borderColor: theme.colors.border,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      }}
                      placeholder="https://twitter.com/yourhandle"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
                    Marketing Experience
                  </label>
                  <select
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    className="w-full p-2.5 rounded-lg border bg-transparent text-white focus:outline-none focus:ring-2 text-sm"
                    style={{
                      borderColor: theme.colors.border,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <option value="" className="bg-gray-800">Select Experience Level</option>
                    <option value="beginner" className="bg-gray-800">Beginner (0-1 years)</option>
                    <option value="intermediate" className="bg-gray-800">Intermediate (1-3 years)</option>
                    <option value="advanced" className="bg-gray-800">Advanced (3-5 years)</option>
                    <option value="expert" className="bg-gray-800">Expert (5+ years)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
                    Tell us about your marketing strategy
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full p-2.5 rounded-lg border bg-transparent text-white placeholder-zinc-500 focus:outline-none focus:ring-2 resize-none text-sm"
                    style={{
                      borderColor: theme.colors.border,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    }}
                    placeholder="Describe how you plan to promote powerSOL and your target audience..."
                  />
                </div>

                {submitStatus === 'success' && (
                  <div className="p-4 rounded-lg text-center" style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.5)' }}>
                    <Check className="w-8 h-8 mx-auto mb-2 text-green-400" />
                    <p className="text-green-400 font-semibold">Application submitted successfully!</p>
                    <p className="text-green-300 text-sm">We'll contact you within 24 hours.</p>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="p-4 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
                    <p className="text-red-400 font-semibold">{errorMessage}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                  <motion.button
                    type="button"
                    onClick={() => setShowForm(false)}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-lg font-semibold transition-all duration-300 border text-sm disabled:opacity-50"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      color: theme.colors.text,
                    }}
                    whileHover={{ background: 'rgba(255, 255, 255, 0.1)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>

                  <motion.button
                    ref={applyButtonRef}
                    type="submit"
                    disabled={isSubmitting || submitStatus === 'success'}
                    className="flex-1 py-2.5 rounded-lg font-semibold transition-all duration-300 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{
                      background: theme.gradients.button,
                      color: '#000',
                      boxShadow: theme.shadows.buttonGlow,
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : submitStatus === 'success' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Submitted!
                      </>
                    ) : (
                      'Submit Application'
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}