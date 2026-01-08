import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Ticket, Coins, Clock, TrendingUp, Star, Crown, Sparkles } from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { affiliateDashboardService, DashboardStats } from '../../services/affiliateDashboardService';
import { useWallet } from '../../contexts/WalletContext';

function TerminalCard({
  title,
  children,
  color = '#3ecbff',
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  color?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="relative rounded-lg overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(15, 17, 23, 0.95), rgba(10, 11, 15, 0.98))',
        border: `1px solid ${color}30`,
        boxShadow: `0 0 30px ${color}10, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      <div
        className="px-4 py-2.5 border-b font-mono text-xs uppercase tracking-wider flex items-center gap-2"
        style={{
          borderColor: `${color}20`,
          background: `linear-gradient(90deg, ${color}10, transparent)`,
        }}
      >
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <span style={{ color }}>{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </motion.div>
  );
}

function SkeletonLine({ width = '100%' }: { width?: string }) {
  return (
    <div
      className="h-4 rounded animate-pulse"
      style={{
        width,
        background: 'linear-gradient(90deg, rgba(62, 203, 255, 0.1), rgba(62, 203, 255, 0.05), rgba(62, 203, 255, 0.1))',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="space-y-3">
      <SkeletonLine width="60%" />
      <SkeletonLine width="80%" />
      <SkeletonLine width="40%" />
    </div>
  );
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetDate).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const timeUnits = [
    { label: 'DAYS', value: timeLeft.days },
    { label: 'HRS', value: timeLeft.hours },
    { label: 'MIN', value: timeLeft.minutes },
    { label: 'SEC', value: timeLeft.seconds },
  ];

  return (
    <div className="flex gap-3">
      {timeUnits.map((unit) => (
        <div key={unit.label} className="text-center">
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center font-mono text-xl font-bold"
            style={{
              background: 'rgba(62, 203, 255, 0.1)',
              border: '1px solid rgba(62, 203, 255, 0.3)',
              color: '#3ecbff',
              textShadow: '0 0 10px rgba(62, 203, 255, 0.5)',
            }}
          >
            {String(unit.value).padStart(2, '0')}
          </div>
          <span className="text-xs text-zinc-500 font-mono mt-1 block">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}

function TierBadge({ tier, label }: { tier: number; label: string }) {
  const config = {
    1: { icon: Star, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    2: { icon: TrendingUp, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    3: { icon: Crown, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
    4: { icon: Sparkles, color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' },
  }[tier] || { icon: Star, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };

  const Icon = config.icon;

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-sm"
      style={{
        background: config.bg,
        border: `1px solid ${config.color}40`,
        color: config.color,
      }}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </div>
  );
}

export function DashboardHome() {
  const navigate = useNavigate();
  const { publicKey: walletAddress, connected } = useWallet();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected) {
      navigate('/affiliates');
    }
  }, [connected, navigate]);

  const loadStats = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    const data = await affiliateDashboardService.getDashboardStats(walletAddress);
    setStats(data);
    setLoading(false);
  }, [walletAddress]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (!connected) {
    return null;
  }

  const tierProgress = stats
    ? affiliateDashboardService.getTierProgress(stats.totalReferrals, stats.tier)
    : 0;

  return (
    <DashboardLayout walletAddress={walletAddress || undefined}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <TerminalCard title="level_tier" color="#3ecbff" delay={0}>
          {loading ? (
            <SkeletonCard />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <TierBadge tier={stats?.tier || 1} label={stats?.tierLabel || 'Starter'} />
                <span className="text-cyan-400 font-mono text-lg font-bold">
                  {(stats?.commissionRate || 0.05) * 100}%
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-500">progress_to_next</span>
                  <span className="text-zinc-400">{tierProgress.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${tierProgress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, #3ecbff, #2fffe2)`,
                      boxShadow: '0 0 10px rgba(62, 203, 255, 0.5)',
                    }}
                  />
                </div>
                {stats?.nextTierThreshold && (
                  <p className="text-xs text-zinc-500 font-mono">
                    {stats.referralsToNextTier} refs to next tier
                  </p>
                )}
              </div>
            </div>
          )}
        </TerminalCard>

        <TerminalCard title="referrals_count" color="#2fffe2" delay={0.1}>
          {loading ? (
            <SkeletonCard />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(47, 255, 226, 0.1)', border: '1px solid rgba(47, 255, 226, 0.3)' }}
                >
                  <Users className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white font-mono">
                    {stats?.totalReferrals || 0}
                  </p>
                  <p className="text-xs text-zinc-500 font-mono">total_refs</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-emerald-400 font-mono">+{stats?.weeklyReferrals || 0}</span>
                <span className="text-zinc-500 font-mono">this_week</span>
              </div>
            </div>
          )}
        </TerminalCard>

        <TerminalCard title="tickets_generated" color="#ff4ecd" delay={0.2}>
          {loading ? (
            <SkeletonCard />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255, 78, 205, 0.1)', border: '1px solid rgba(255, 78, 205, 0.3)' }}
                >
                  <Ticket className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white font-mono">
                    {stats?.totalTickets || 0}
                  </p>
                  <p className="text-xs text-zinc-500 font-mono">total_tickets</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-pink-400 font-mono">+{stats?.weeklyTickets || 0}</span>
                <span className="text-zinc-500 font-mono">this_week</span>
              </div>
            </div>
          )}
        </TerminalCard>

        <TerminalCard title="weekly_earned" color="#fbbf24" delay={0.3}>
          {loading ? (
            <SkeletonCard />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)' }}
                >
                  <Coins className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white font-mono">
                    {affiliateDashboardService.formatSOLValue(stats?.weeklyEarnedLamports || 0)}
                  </p>
                  <p className="text-xs text-zinc-500 font-mono">SOL_this_week</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-yellow-400 font-mono">
                  {affiliateDashboardService.formatSOLValue(stats?.totalEarnedLamports || 0)} SOL
                </span>
                <span className="text-zinc-500 font-mono">total_earned</span>
              </div>
            </div>
          )}
        </TerminalCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TerminalCard title="next_claim_countdown" color="#3ecbff" delay={0.4}>
          {loading ? (
            <SkeletonCard />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-zinc-400 font-mono text-sm">
                <Clock className="w-4 h-4" />
                <span>wednesday_release_schedule</span>
              </div>

              {stats?.nextReleaseTimestamp && (
                <CountdownTimer targetDate={stats.nextReleaseTimestamp} />
              )}

              <div className="pt-2 border-t border-zinc-800">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-mono text-sm">claimable_now:</span>
                  <span className="text-cyan-400 font-mono font-bold">
                    {affiliateDashboardService.formatLamportsToSOL(stats?.pendingClaimableLamports || 0)} SOL
                  </span>
                </div>
              </div>

              {(stats?.pendingClaimableLamports || 0) > 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-lg font-mono font-bold text-black"
                  style={{
                    background: 'linear-gradient(135deg, #3ecbff, #2fffe2)',
                    boxShadow: '0 0 20px rgba(62, 203, 255, 0.4)',
                  }}
                >
                  CLAIM_REWARDS()
                </motion.button>
              )}
            </div>
          )}
        </TerminalCard>

        <TerminalCard title="earnings_summary" color="#2fffe2" delay={0.5}>
          {loading ? (
            <SkeletonCard />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div
                  className="p-3 rounded-lg"
                  style={{ background: 'rgba(47, 255, 226, 0.05)', border: '1px solid rgba(47, 255, 226, 0.2)' }}
                >
                  <p className="text-xs text-zinc-500 font-mono mb-1">total_earned</p>
                  <p className="text-xl font-bold text-emerald-400 font-mono">
                    {affiliateDashboardService.formatLamportsToSOL(stats?.totalEarnedLamports || 0)}
                  </p>
                  <p className="text-xs text-zinc-500 font-mono">SOL</p>
                </div>

                <div
                  className="p-3 rounded-lg"
                  style={{ background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.2)' }}
                >
                  <p className="text-xs text-zinc-500 font-mono mb-1">pending_release</p>
                  <p className="text-xl font-bold text-yellow-400 font-mono">
                    {affiliateDashboardService.formatLamportsToSOL(
                      (stats?.weeklyEarnedLamports || 0) - (stats?.pendingClaimableLamports || 0)
                    )}
                  </p>
                  <p className="text-xs text-zinc-500 font-mono">SOL</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-zinc-400 font-mono">commission_rate</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-white font-mono">
                    {(stats?.commissionRate || 0.05) * 100}%
                  </span>
                  <TierBadge tier={stats?.tier || 1} label={stats?.tierLabel || 'Starter'} />
                </div>
              </div>
            </div>
          )}
        </TerminalCard>
      </div>
    </DashboardLayout>
  );
}
