import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trophy, Star, TrendingUp, Crown, Sparkles, Users, Coins } from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { affiliateDashboardService, TopAffiliate, WeeklyHistory } from '../../services/affiliateDashboardService';
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

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-zinc-800" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-3/4" />
        <div className="h-3 bg-zinc-800 rounded w-1/2" />
      </div>
    </div>
  );
}

function TierIcon({ tier }: { tier: number }) {
  const config = {
    1: { icon: Star, color: '#3b82f6' },
    2: { icon: TrendingUp, color: '#f59e0b' },
    3: { icon: Crown, color: '#8b5cf6' },
    4: { icon: Sparkles, color: '#eab308' },
  }[tier] || { icon: Star, color: '#3b82f6' };

  const Icon = config.icon;
  return <Icon className="w-4 h-4" style={{ color: config.color }} />;
}

function RankBadge({ rank }: { rank: number }) {
  const colors = {
    1: { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', text: '#000', shadow: 'rgba(251, 191, 36, 0.5)' },
    2: { bg: 'linear-gradient(135deg, #94a3b8, #64748b)', text: '#000', shadow: 'rgba(148, 163, 184, 0.5)' },
    3: { bg: 'linear-gradient(135deg, #cd7f32, #b87333)', text: '#000', shadow: 'rgba(205, 127, 50, 0.5)' },
  }[rank] || { bg: 'rgba(62, 203, 255, 0.2)', text: '#3ecbff', shadow: 'transparent' };

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-sm"
      style={{
        background: colors.bg,
        color: colors.text,
        boxShadow: `0 0 15px ${colors.shadow}`,
      }}
    >
      {rank <= 3 ? <Trophy className="w-4 h-4" /> : rank}
    </div>
  );
}

export function DashboardAnalytics() {
  const navigate = useNavigate();
  const { publicKey: walletAddress, connected } = useWallet();
  const [topAffiliates, setTopAffiliates] = useState<TopAffiliate[]>([]);
  const [weeklyHistory, setWeeklyHistory] = useState<WeeklyHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected) {
      navigate('/affiliates');
    }
  }, [connected, navigate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [affiliates, history] = await Promise.all([
      affiliateDashboardService.getTopAffiliates(10),
      walletAddress ? affiliateDashboardService.getWeeklyHistory(walletAddress, 8) : Promise.resolve([]),
    ]);
    setTopAffiliates(affiliates);
    setWeeklyHistory(history);
    setLoading(false);
  }, [walletAddress]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!connected) {
    return null;
  }

  return (
    <DashboardLayout walletAddress={walletAddress || undefined}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TerminalCard title="top_referrers_ranking" color="#fbbf24" delay={0}>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : topAffiliates.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              <p className="text-zinc-500 font-mono">no_rankings_yet</p>
              <p className="text-zinc-600 text-sm font-mono mt-1">be_the_first_to_rank</p>
            </div>
          ) : (
            <div className="space-y-1">
              {topAffiliates.map((affiliate, index) => {
                const isCurrentUser = affiliate.walletAddress === walletAddress;
                return (
                  <motion.div
                    key={affiliate.walletAddress}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg transition-all
                      ${isCurrentUser ? 'bg-cyan-500/10 border border-cyan-500/30' : 'hover:bg-zinc-800/50'}
                    `}
                  >
                    <RankBadge rank={affiliate.rank} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-white truncate">
                          {affiliateDashboardService.shortenWallet(affiliate.walletAddress)}
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <TierIcon tier={affiliate.tier} />
                        <span className="text-xs text-zinc-500 font-mono">{affiliate.tierLabel}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-emerald-400 font-mono text-sm">
                        <Users className="w-3.5 h-3.5" />
                        <span>{affiliate.totalReferrals}</span>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-400 font-mono text-xs mt-1">
                        <Coins className="w-3 h-3" />
                        <span>{affiliateDashboardService.formatSOLValue(affiliate.totalEarnedLamports)}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TerminalCard>

        <TerminalCard title="weekly_earnings_history" color="#2fffe2" delay={0.1}>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : weeklyHistory.length === 0 ? (
            <div className="text-center py-8">
              <Coins className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              <p className="text-zinc-500 font-mono">no_earnings_history</p>
              <p className="text-zinc-600 text-sm font-mono mt-1">start_referring_to_earn</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-zinc-500 font-mono border-b border-zinc-800">
                    <th className="text-left py-2 px-2">WEEK</th>
                    <th className="text-center py-2 px-2">REFS</th>
                    <th className="text-right py-2 px-2">EARNED</th>
                    <th className="text-center py-2 px-2">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyHistory.map((week, index) => (
                    <motion.tr
                      key={week.weekNumber}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                    >
                      <td className="py-3 px-2">
                        <span className="font-mono text-sm text-zinc-300">
                          #{week.weekNumber}
                        </span>
                        <p className="text-xs text-zinc-500 font-mono">{week.weekStartDate}</p>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="font-mono text-sm text-emerald-400">{week.referralCount}</span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="font-mono text-sm text-yellow-400">
                          {affiliateDashboardService.formatLamportsToSOL(week.earnedLamports)} SOL
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {week.isReleased ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 font-mono">
                            CLAIMED
                          </span>
                        ) : week.isClaimable ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-mono animate-pulse">
                            CLAIMABLE
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-zinc-700/50 text-zinc-400 font-mono">
                            PENDING
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TerminalCard>
      </div>

      <div className="mt-6">
        <TerminalCard title="performance_metrics" color="#ff4ecd" delay={0.2}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'total_referrals',
                value: topAffiliates.reduce((sum, a) => sum + Number(a.totalReferrals), 0),
                icon: Users,
                color: '#2fffe2',
              },
              {
                label: 'active_affiliates',
                value: topAffiliates.length,
                icon: Star,
                color: '#3ecbff',
              },
              {
                label: 'total_distributed',
                value: affiliateDashboardService.formatSOLValue(
                  topAffiliates.reduce((sum, a) => sum + Number(a.totalEarnedLamports), 0)
                ) + ' SOL',
                icon: Coins,
                color: '#fbbf24',
              },
              {
                label: 'avg_per_affiliate',
                value: topAffiliates.length > 0
                  ? affiliateDashboardService.formatSOLValue(
                      topAffiliates.reduce((sum, a) => sum + Number(a.totalEarnedLamports), 0) / topAffiliates.length
                    ) + ' SOL'
                  : '0 SOL',
                icon: TrendingUp,
                color: '#ff4ecd',
              },
            ].map((metric) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className="p-4 rounded-lg"
                  style={{
                    background: `${metric.color}08`,
                    border: `1px solid ${metric.color}25`,
                  }}
                >
                  <Icon className="w-5 h-5 mb-2" style={{ color: metric.color }} />
                  <p className="text-lg font-bold text-white font-mono">{metric.value}</p>
                  <p className="text-xs text-zinc-500 font-mono">{metric.label}</p>
                </div>
              );
            })}
          </div>
        </TerminalCard>
      </div>
    </DashboardLayout>
  );
}
