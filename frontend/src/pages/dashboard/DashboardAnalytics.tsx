import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trophy, Star, TrendingUp, Users, Coins, ArrowUpRight, ArrowDownRight, Ticket, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { affiliateDashboardService, TopReferral, WeeklyHistory, PerTicketCommission } from '../../services/affiliateDashboardService';
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
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500/80" />
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


interface ChartDataPoint {
  label: string;
  value: number;
}

function GrowthChart({
  data,
  color,
  valueFormatter,
}: {
  data: ChartDataPoint[];
  color: string;
  valueFormatter: (value: number) => string;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * 100;
    const y = 100 - ((d.value - minValue) / range) * 80 - 10;
    return { x, y, ...d };
  });

  const pathD = points.length > 1
    ? `M ${points[0].x} ${points[0].y} ` +
      points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const areaD = points.length > 1
    ? `${pathD} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`
    : '';

  const lastValue = points[points.length - 1]?.value || 0;
  const prevValue = points[points.length - 2]?.value || 0;
  const change = prevValue ? ((lastValue - prevValue) / prevValue) * 100 : 0;
  const isPositive = change >= 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold font-mono" style={{ color }}>
            {valueFormatter(lastValue)}
          </p>
          <p className="text-xs text-zinc-500 font-mono">current_week</p>
        </div>
        {points.length > 1 && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono ${
              isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>

      <div className="relative h-32">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.5"
            />
          ))}

          {areaD && (
            <path
              d={areaD}
              fill={`url(#gradient-${color.replace('#', '')})`}
            />
          )}

          {pathD && (
            <motion.path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          )}

          {points.map((point, i) => (
            <motion.circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="2"
              fill={color}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            />
          ))}
        </svg>

        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-zinc-600 font-mono">
          {points.map((point, i) => (
            <span key={i}>{point.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
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

const LOTTERY_TYPE_LABELS: Record<string, string> = {
  'tri-daily': 'TRI-DAILY',
  'tri_daily': 'TRI-DAILY',
  'jackpot': 'JACKPOT',
  'grand-prize': 'GRAND PRIZE',
  'grand_prize': 'GRAND PRIZE',
  'special-event': 'SPECIAL',
  'special_event': 'SPECIAL',
};

const LOTTERY_TYPE_COLORS: Record<string, string> = {
  'tri-daily': '#3ecbff',
  'tri_daily': '#3ecbff',
  'jackpot': '#fbbf24',
  'grand-prize': '#ff4ecd',
  'grand_prize': '#ff4ecd',
  'special-event': '#2fffe2',
  'special_event': '#2fffe2',
};

const PAGE_SIZE = 10;

function PerTicketCommissionTable({
  commissions,
  loading,
  page,
  onPageChange,
  hasMore,
}: {
  commissions: PerTicketCommission[];
  loading: boolean;
  page: number;
  onPageChange: (p: number) => void;
  hasMore: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (commissions.length === 0) {
    return (
      <div className="text-center py-8">
        <Ticket className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
        <p className="text-zinc-500 font-mono">no_commissions_yet</p>
        <p className="text-zinc-600 text-sm font-mono mt-1">commissions_per_ticket_will_appear_here</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-zinc-500 font-mono border-b border-zinc-800">
              <th className="text-left py-2 px-2">DATE</th>
              <th className="text-left py-2 px-2">BUYER</th>
              <th className="text-center py-2 px-2">TYPE</th>
              <th className="text-right py-2 px-2">TICKET</th>
              <th className="text-right py-2 px-2">COMMISSION</th>
              <th className="text-center py-2 px-2">RATE</th>
              <th className="text-center py-2 px-2">TX</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((c, index) => {
              const typeLabel = LOTTERY_TYPE_LABELS[c.lotteryType] || c.lotteryType.toUpperCase();
              const typeColor = LOTTERY_TYPE_COLORS[c.lotteryType] || '#3ecbff';
              const date = new Date(c.earnedAt);
              const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
              const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

              return (
                <motion.tr
                  key={c.earningId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                >
                  <td className="py-2.5 px-2">
                    <span className="font-mono text-xs text-zinc-300">{dateStr}</span>
                    <p className="text-[10px] text-zinc-600 font-mono">{timeStr}</p>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className="font-mono text-xs text-zinc-300">
                      {affiliateDashboardService.shortenWallet(c.buyerWallet)}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold"
                      style={{
                        background: `${typeColor}15`,
                        color: typeColor,
                        border: `1px solid ${typeColor}30`,
                      }}
                    >
                      {typeLabel}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <span className="font-mono text-xs text-zinc-300">
                      {affiliateDashboardService.formatLamportsToSOL(c.ticketPriceLamports)} SOL
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <span className="font-mono text-xs font-semibold" style={{ color: '#2fffe2' }}>
                      +{affiliateDashboardService.formatLamportsToSOL(c.commissionLamports)} SOL
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className="font-mono text-xs text-zinc-400">
                      {(c.commissionRate * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {c.transactionSignature ? (
                      <a
                        href={`https://solscan.io/tx/${c.transactionSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-zinc-500 hover:text-cyan-400 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-zinc-700">-</span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/50">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-mono text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800/50"
          style={{ color: '#3ecbff' }}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          PREV
        </button>
        <span className="font-mono text-xs text-zinc-500">
          page {page + 1}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasMore}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-mono text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800/50"
          style={{ color: '#3ecbff' }}
        >
          NEXT
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function DashboardAnalytics() {
  const navigate = useNavigate();
  const { publicKey: walletAddress, connected } = useWallet();
  const [topReferrals, setTopReferrals] = useState<TopReferral[]>([]);
  const [weeklyHistory, setWeeklyHistory] = useState<WeeklyHistory[]>([]);
  const [perTicket, setPerTicket] = useState<PerTicketCommission[]>([]);
  const [perTicketPage, setPerTicketPage] = useState(0);
  const [perTicketHasMore, setPerTicketHasMore] = useState(false);
  const [perTicketLoading, setPerTicketLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<number>(1);
  const [tierChecked, setTierChecked] = useState(false);

  useEffect(() => {
    if (!connected) {
      navigate('/affiliates');
    }
  }, [connected, navigate]);

  useEffect(() => {
    async function checkTier() {
      if (!walletAddress) return;
      const stats = await affiliateDashboardService.getDashboardStats(walletAddress);
      const userTier = stats?.tier || 1;
      setTier(userTier);
      setTierChecked(true);
      if (userTier < 3) {
        navigate('/dashboard');
      }
    }
    checkTier();
  }, [walletAddress, navigate]);

  const loadPerTicketPage = useCallback(async (page: number) => {
    if (!walletAddress) return;
    setPerTicketLoading(true);
    const results = await affiliateDashboardService.getPerTicketCommissions(
      walletAddress,
      PAGE_SIZE + 1,
      page * PAGE_SIZE,
    );
    setPerTicketHasMore(results.length > PAGE_SIZE);
    setPerTicket(results.slice(0, PAGE_SIZE));
    setPerTicketPage(page);
    setPerTicketLoading(false);
  }, [walletAddress]);

  const loadData = useCallback(async () => {
    if (!walletAddress || tier < 3) return;
    setLoading(true);
    const [referrals, history] = await Promise.all([
      affiliateDashboardService.getTopReferrals(walletAddress, 10),
      affiliateDashboardService.getWeeklyHistory(walletAddress, 8),
    ]);
    setTopReferrals(referrals);
    setWeeklyHistory(history);
    setLoading(false);
    loadPerTicketPage(0);
  }, [walletAddress, tier, loadPerTicketPage]);

  useEffect(() => {
    if (tierChecked && tier >= 3) {
      loadData();
    }
  }, [loadData, tierChecked, tier]);

  if (!connected || !tierChecked || tier < 3) {
    return null;
  }

  return (
    <DashboardLayout walletAddress={walletAddress || undefined} tier={tier}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TerminalCard title="my_top_referrals" color="#b347ff" delay={0}>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : topReferrals.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              <p className="text-zinc-500 font-mono">no_referrals_yet</p>
              <p className="text-zinc-600 text-sm font-mono mt-1">share_your_link_to_earn</p>
            </div>
          ) : (
            <div className="space-y-1">
              {topReferrals.map((referral, index) => (
                <motion.div
                  key={referral.walletAddress}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-zinc-800/50"
                >
                  <RankBadge rank={referral.rank} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-white truncate">
                        {affiliateDashboardService.shortenWallet(referral.walletAddress)}
                      </span>
                      {referral.isValidated && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-zinc-500 font-mono">
                        {referral.totalTickets} tickets
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-emerald-400 font-mono text-sm">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{affiliateDashboardService.formatSOLValue(referral.totalSpentLamports)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-purple-500 font-mono text-xs mt-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>+{affiliateDashboardService.formatSOLValue(referral.commissionGeneratedLamports)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
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
                        <span className="font-mono text-sm text-purple-500">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <TerminalCard title="earnings_growth" color="#b347ff" delay={0.15}>
          {loading ? (
            <div className="h-40 animate-pulse bg-zinc-800/50 rounded-lg" />
          ) : weeklyHistory.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              <p className="text-zinc-500 font-mono">no_data_yet</p>
              <p className="text-zinc-600 text-sm font-mono mt-1">earnings_will_appear_here</p>
            </div>
          ) : (
            <GrowthChart
              data={[...weeklyHistory].reverse().map((w) => ({
                label: `W${w.weekNumber}`,
                value: Number(w.earnedLamports) / 1e9,
              }))}
              color="#b347ff"
              valueFormatter={(v) => `${v.toFixed(4)} SOL`}
            />
          )}
        </TerminalCard>

        <TerminalCard title="referrals_growth" color="#2fffe2" delay={0.2}>
          {loading ? (
            <div className="h-40 animate-pulse bg-zinc-800/50 rounded-lg" />
          ) : weeklyHistory.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              <p className="text-zinc-500 font-mono">no_data_yet</p>
              <p className="text-zinc-600 text-sm font-mono mt-1">referrals_will_appear_here</p>
            </div>
          ) : (
            <GrowthChart
              data={[...weeklyHistory].reverse().map((w) => ({
                label: `W${w.weekNumber}`,
                value: w.referralCount,
              }))}
              color="#2fffe2"
              valueFormatter={(v) => `${v} refs`}
            />
          )}
        </TerminalCard>
      </div>

      <div className="mt-6">
        <TerminalCard title="commission_per_ticket" color="#fbbf24" delay={0.22}>
          <PerTicketCommissionTable
            commissions={perTicket}
            loading={perTicketLoading}
            page={perTicketPage}
            onPageChange={loadPerTicketPage}
            hasMore={perTicketHasMore}
          />
        </TerminalCard>
      </div>

      <div className="mt-6">
        <TerminalCard title="referral_metrics" color="#ff4ecd" delay={0.25}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'total_referrals',
                value: topReferrals.length,
                icon: Users,
                color: '#2fffe2',
              },
              {
                label: 'active_users',
                value: topReferrals.filter(r => r.isValidated).length,
                icon: Star,
                color: '#3ecbff',
              },
              {
                label: 'total_spent',
                value: affiliateDashboardService.formatSOLValue(
                  topReferrals.reduce((sum, r) => sum + Number(r.totalSpentLamports), 0)
                ) + ' SOL',
                icon: Coins,
                color: '#b347ff',
              },
              {
                label: 'commission_earned',
                value: affiliateDashboardService.formatSOLValue(
                  topReferrals.reduce((sum, r) => sum + Number(r.commissionGeneratedLamports), 0)
                ) + ' SOL',
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
