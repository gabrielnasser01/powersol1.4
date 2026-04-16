import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronDown, ChevronUp, Ban, ShieldCheck,
  Ticket, DollarSign, Trophy, Calendar, X, AlertTriangle,
  ExternalLink, Wallet, BarChart3, Eye, ShieldAlert,
  TrendingUp, TrendingDown, Minus, History, Save, CheckCircle,
} from 'lucide-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { adminService, UserRanking, WhaleUser, WhaleAnalysis, WhaleHistoryData, WhaleHistoryEntry } from '../../services/adminService';
import { walletBalanceService } from '../../services/walletBalanceService';
import { useWallet } from '../../contexts/WalletContext';
import { AdminLayout } from './AdminLayout';
import { AdminGuard } from './AdminGuard';
import { useAdminAutoRefresh } from '../../hooks/useAdminAutoRefresh';

const CLAIM_PROGRAM_ID = 'DX1rjpefmrBR8hASnExE3qCBpjpFEkUY4JEoTLmuU2JK';

const LOTTERY_LABELS: Record<string, string> = {
  'tri-daily': 'Tri-Daily',
  'jackpot': 'Jackpot',
  'special-event': 'Special',
  'grand-prize': 'Grand',
};

const LOTTERY_COLORS: Record<string, string> = {
  'tri-daily': '#3b82f6',
  'jackpot': '#f59e0b',
  'special-event': '#10b981',
  'grand-prize': '#ef4444',
};

type SortField = 'total_tickets' | 'total_spent_sol' | 'total_won_lamports' | 'power_points' | 'created_at';

function BanModal({ user, adminWallet, onConfirm, onClose }: {
  user: UserRanking;
  adminWallet: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);

  const handleBan = async () => {
    if (!reason.trim()) return;
    setConfirming(true);
    try {
      await adminService.banUser(user.wallet_address, adminWallet, reason.trim());
      onConfirm();
    } catch (err) {
      console.error('Ban failed:', err);
    } finally {
      setConfirming(false);
    }
  };

  const handleUnban = async () => {
    setConfirming(true);
    try {
      await adminService.unbanUser(user.wallet_address, adminWallet);
      onConfirm();
    } catch (err) {
      console.error('Unban failed:', err);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md rounded-xl border border-zinc-800 p-6"
        style={{ background: '#0f1117' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {user.is_banned ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <Ban className="w-5 h-5 text-red-400" />
            )}
            <h3 className="text-white font-mono text-sm font-bold">
              {user.is_banned ? 'Unban User' : 'Ban User'}
            </h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 mb-4">
          <p className="text-zinc-300 font-mono text-sm">
            {user.wallet_address.slice(0, 8)}...{user.wallet_address.slice(-6)}
          </p>
          <div className="flex items-center gap-4 mt-2 text-zinc-500 font-mono text-xs">
            <span>{user.total_tickets} tickets</span>
            <span>{user.total_spent_sol.toFixed(4)} SOL spent</span>
            <span>{(user.total_won_lamports / 1e9).toFixed(4)} SOL won</span>
          </div>
        </div>

        {user.is_banned ? (
          <div className="space-y-4">
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 font-mono text-xs mb-1">Currently banned</p>
              <p className="text-zinc-400 font-mono text-xs">{user.banned_reason || 'No reason provided'}</p>
              <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                {user.banned_at ? new Date(user.banned_at).toLocaleString() : ''}
              </p>
            </div>
            <button
              onClick={handleUnban}
              disabled={confirming}
              className="w-full py-2.5 rounded-lg font-mono text-sm border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
            >
              {confirming ? 'Processing...' : 'Confirm Unban'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-zinc-500 font-mono text-xs block mb-1.5">Reason for ban</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Describe the reason..."
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-sm rounded-lg px-3 py-2 h-24 resize-none focus:outline-none focus:border-red-500/50"
              />
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-amber-400 font-mono" style={{ fontSize: '10px' }}>
                This action will prevent the user from accessing the platform.
              </p>
            </div>
            <button
              onClick={handleBan}
              disabled={confirming || !reason.trim()}
              className="w-full py-2.5 rounded-lg font-mono text-sm border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {confirming ? 'Processing...' : 'Confirm Ban'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function UserDetailModal({ user, onClose }: { user: UserRanking; onClose: () => void }) {
  const [expiredPrizes, setExpiredPrizes] = useState<any[]>([]);

  useEffect(() => {
    adminService.getExpiredUnclaimedPrizes().then(prizes => {
      setExpiredPrizes(prizes.filter(p => p.user_wallet === user.wallet_address));
    });
  }, [user.wallet_address]);

  const lostClaimsLamports = expiredPrizes.reduce((s, p) => s + Number(p.prize_amount_lamports || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-xl border border-zinc-800 p-6"
        style={{ background: '#0f1117' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-mono text-sm font-bold">User Details</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
            <p className="text-zinc-400 font-mono text-xs mb-1">Wallet</p>
            <p className="text-zinc-200 font-mono text-sm break-all">{user.wallet_address}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
              <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Tickets</p>
              <p className="text-white font-mono text-lg font-bold">{user.total_tickets}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
              <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Total Spent</p>
              <p className="text-amber-400 font-mono text-lg font-bold">{user.total_spent_sol.toFixed(4)}</p>
              <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>SOL</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
              <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Total Won</p>
              <p className="text-emerald-400 font-mono text-lg font-bold">{(user.total_won_lamports / 1e9).toFixed(4)}</p>
              <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>SOL</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
              <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Lost Claims</p>
              <p className="text-red-400 font-mono text-lg font-bold">{(lostClaimsLamports / 1e9).toFixed(4)}</p>
              <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>SOL (expired)</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
              <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Power Points</p>
              <p className="text-cyan-400 font-mono text-lg font-bold">{user.power_points.toLocaleString()}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
              <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Login Streak</p>
              <p className="text-white font-mono text-lg font-bold">{user.login_streak}d</p>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Last Login</p>
                <p className="text-zinc-300 font-mono text-sm">
                  {user.last_login_date || 'Never'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Joined</p>
                <p className="text-zinc-300 font-mono text-sm">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {expiredPrizes.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 font-mono text-xs font-bold mb-2">Expired Prizes ({expiredPrizes.length})</p>
              {expiredPrizes.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between py-1 border-b border-red-500/10 last:border-0">
                  <span className="text-zinc-400 font-mono" style={{ fontSize: '10px' }}>
                    {p.lottery_type} R{p.round}
                  </span>
                  <span className="text-red-400 font-mono text-xs">
                    {(Number(p.prize_amount_lamports) / 1e9).toFixed(4)} SOL
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ConcentrationBar({ pct, color }: { pct: number; color: string }) {
  const level = pct > 50 ? 'critical' : pct > 30 ? 'high' : pct > 15 ? 'medium' : 'low';
  const barColor = level === 'critical' ? '#ef4444' : level === 'high' ? '#f59e0b' : color;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden" style={{ minWidth: 40 }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
        />
      </div>
      <span className="font-mono shrink-0" style={{
        fontSize: '10px',
        color: level === 'critical' ? '#ef4444' : level === 'high' ? '#f59e0b' : '#a1a1aa',
      }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function WhaleScoreBadge({ score }: { score: number }) {
  const level = score >= 70 ? 'critical' : score >= 40 ? 'high' : score >= 15 ? 'medium' : 'low';
  const config = {
    critical: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' },
    high: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' },
    medium: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)', color: '#3b82f6' },
    low: { bg: 'rgba(39, 39, 42, 0.5)', border: 'rgba(63, 63, 70, 0.5)', color: '#71717a' },
  }[level];

  return (
    <span
      className="font-mono text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: config.bg, border: `1px solid ${config.border}`, color: config.color }}
    >
      {score}
    </span>
  );
}

function WhaleDetailModal({ whale, onClose }: { whale: WhaleUser; onClose: () => void }) {
  const lotteryTypes = ['tri-daily', 'jackpot', 'special-event', 'grand-prize'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-xl border border-zinc-800 p-6 max-h-[85vh] overflow-y-auto"
        style={{ background: '#0f1117' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-red-400" />
            <h3 className="text-white font-mono text-sm font-bold">Whale Analysis</h3>
            <WhaleScoreBadge score={whale.whale_score} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                try {
                  await adminService.createWhaleWarning(
                    whale.wallet_address,
                    whale.whale_score,
                    `Whale manipulation: ${whale.overall_concentration}% concentration, ${whale.global_ticket_share}% global share, ${whale.win_rate}% win rate. Score: ${whale.whale_score}/100.`
                  );
                } catch {}
              }}
              className="px-2.5 py-1.5 rounded-lg font-mono text-xs border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              Flag Compliance
            </button>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 mb-4">
          <p className="text-zinc-400 font-mono text-xs mb-1">Wallet</p>
          <p className="text-zinc-200 font-mono text-sm break-all">{whale.wallet_address}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Current Tickets</p>
            <p className="text-white font-mono text-lg font-bold">{whale.total_current_tickets}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>All-Time Tickets</p>
            <p className="text-zinc-300 font-mono text-lg font-bold">{whale.total_all_time_tickets}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Global Share</p>
            <p className="text-amber-400 font-mono text-lg font-bold">{whale.global_ticket_share}%</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-zinc-400 font-mono text-xs font-bold mb-3">Ticket Concentration by Lottery</p>
          <div className="space-y-3">
            {lotteryTypes.map(lt => {
              const c = whale.concentration[lt];
              if (!c) return (
                <div key={lt} className="flex items-center gap-3">
                  <span className="text-zinc-600 font-mono text-xs w-16">{LOTTERY_LABELS[lt]}</span>
                  <span className="text-zinc-700 font-mono" style={{ fontSize: '10px' }}>No tickets</span>
                </div>
              );
              return (
                <div key={lt}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs" style={{ color: LOTTERY_COLORS[lt] }}>
                      {LOTTERY_LABELS[lt]}
                    </span>
                    <span className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>
                      {c.user} / {c.total} tickets
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(c.pct, 100)}%`,
                        background: c.pct > 50
                          ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                          : c.pct > 30
                            ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                            : LOTTERY_COLORS[lt],
                      }}
                    />
                  </div>
                  <p className="text-right font-mono mt-0.5" style={{
                    fontSize: '10px',
                    color: c.pct > 50 ? '#ef4444' : c.pct > 30 ? '#f59e0b' : '#71717a',
                  }}>
                    {c.pct.toFixed(1)}% concentration
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
            <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Prizes Won</p>
            <p className="text-emerald-400 font-mono text-lg font-bold">{whale.prizes_won}</p>
            <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
              {(whale.prizes_won_lamports / 1e9).toFixed(4)} SOL
            </p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
            <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Win Rate</p>
            <p className={`font-mono text-lg font-bold ${
              whale.win_rate > 20 ? 'text-red-400' : whale.win_rate > 10 ? 'text-amber-400' : 'text-zinc-300'
            }`}>
              {whale.win_rate}%
            </p>
            <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
              prizes / tickets bought
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-zinc-400 font-mono text-xs font-bold">External Analysis</p>
          <div className="grid grid-cols-1 gap-2">
            <a
              href={`https://solscan.io/account/${whale.wallet_address}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 transition-colors"
            >
              <Wallet className="w-4 h-4 text-cyan-400" />
              <span className="text-zinc-300 font-mono text-xs flex-1">Solscan Wallet</span>
              <ExternalLink className="w-3 h-3 text-zinc-600" />
            </a>
            <a
              href={`https://solsniffer.com/address/${whale.wallet_address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 transition-colors"
            >
              <Eye className="w-4 h-4 text-orange-400" />
              <span className="text-zinc-300 font-mono text-xs flex-1">SolSniffer Analysis</span>
              <ExternalLink className="w-3 h-3 text-zinc-600" />
            </a>
            <a
              href={`https://app.bubblemaps.io/sol/token/${CLAIM_PROGRAM_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span className="text-zinc-300 font-mono text-xs flex-1">Bubblemaps Cluster Analysis</span>
              <ExternalLink className="w-3 h-3 text-zinc-600" />
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ScoreTrend({ current, peak }: { current: number; peak: number }) {
  if (current > peak) return <TrendingUp className="w-3 h-3 text-red-400" />;
  if (current < peak) return <TrendingDown className="w-3 h-3 text-emerald-400" />;
  return <Minus className="w-3 h-3 text-zinc-600" />;
}

function WhaleHistoryRanking({ history, onSelectWhale, whaleData }: {
  history: WhaleHistoryData | null;
  onSelectWhale: (whale: WhaleUser) => void;
  whaleData: WhaleAnalysis | null;
}) {
  const [expanded, setExpanded] = useState(true);

  const currentScoreMap = useMemo(() => {
    const map: Record<string, WhaleUser> = {};
    (whaleData?.users || []).forEach(u => { map[u.wallet_address] = u; });
    return map;
  }, [whaleData]);

  const entries = useMemo(() => {
    if (!history) return [];
    return history.ranking.map(entry => ({
      ...entry,
      current_whale: currentScoreMap[entry.wallet_address] || null,
      current_score: currentScoreMap[entry.wallet_address]?.whale_score ?? null,
    }));
  }, [history, currentScoreMap]);

  if (!history || entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800/60 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.02) 0%, rgba(15, 15, 20, 0.95) 100%)' }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <span className="text-white font-mono text-sm font-bold">Historical Whale Risk Ranking</span>
            <span className="text-zinc-600 font-mono px-2 py-0.5 rounded-full border border-zinc-800" style={{ fontSize: '10px' }}>
              {entries.length} wallets tracked
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-zinc-500 hover:text-white transition-colors p-1"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-2 px-3 text-zinc-500 font-mono text-xs font-normal">#</th>
                      <th className="text-left py-2 px-3 text-zinc-500 font-mono text-xs font-normal">Wallet</th>
                      <th className="text-center py-2 px-3 text-zinc-500 font-mono text-xs font-normal">Peak Score</th>
                      <th className="text-center py-2 px-3 text-zinc-500 font-mono text-xs font-normal">Current</th>
                      <th className="text-center py-2 px-3 text-zinc-500 font-mono text-xs font-normal">Trend</th>
                      <th className="text-right py-2 px-3 text-zinc-500 font-mono text-xs font-normal">Peak Conc.</th>
                      <th className="text-right py-2 px-3 text-zinc-500 font-mono text-xs font-normal">Win Rate</th>
                      <th className="text-right py-2 px-3 text-zinc-500 font-mono text-xs font-normal">Tickets</th>
                      <th className="text-right py-2 px-3 text-zinc-500 font-mono text-xs font-normal">Won (SOL)</th>
                      <th className="text-center py-2 px-3 text-zinc-500 font-mono text-xs font-normal">Snapshots</th>
                      <th className="text-center py-2 px-2 text-zinc-500 font-mono text-xs font-normal">Links</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, i) => {
                      const currentScore = entry.current_score;
                      const scoreChange = currentScore !== null ? currentScore - entry.peak_score : null;
                      const peakLevel = entry.peak_score >= 70 ? 'critical' : entry.peak_score >= 40 ? 'high' : entry.peak_score >= 15 ? 'medium' : 'low';
                      const rowBorderColor = peakLevel === 'critical' ? 'rgba(239, 68, 68, 0.08)' : peakLevel === 'high' ? 'rgba(245, 158, 11, 0.06)' : 'transparent';

                      return (
                        <tr
                          key={entry.wallet_address}
                          className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors cursor-pointer"
                          style={{ background: rowBorderColor }}
                          onClick={() => {
                            const whale = entry.current_whale;
                            if (whale) onSelectWhale(whale);
                          }}
                        >
                          <td className="py-2.5 px-3">
                            <span className={`font-mono text-sm ${
                              i === 0 ? 'text-red-400 font-bold' :
                              i === 1 ? 'text-amber-400 font-bold' :
                              i === 2 ? 'text-orange-400 font-bold' :
                              'text-zinc-600'
                            }`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="text-zinc-300 font-mono text-xs">
                              {entry.wallet_address.slice(0, 6)}...{entry.wallet_address.slice(-4)}
                            </p>
                            <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                              Peak: {entry.peak_date}
                            </p>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <WhaleScoreBadge score={entry.peak_score} />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {currentScore !== null ? (
                              <WhaleScoreBadge score={currentScore} />
                            ) : (
                              <span className="text-zinc-700 font-mono text-xs">--</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {currentScore !== null ? (
                                <>
                                  <ScoreTrend current={currentScore} peak={entry.peak_score} />
                                  {scoreChange !== null && scoreChange !== 0 && (
                                    <span className={`font-mono ${scoreChange > 0 ? 'text-red-400' : 'text-emerald-400'}`} style={{ fontSize: '10px' }}>
                                      {scoreChange > 0 ? '+' : ''}{scoreChange}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-zinc-700 font-mono" style={{ fontSize: '10px' }}>N/A</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`font-mono text-xs ${
                              entry.peak_concentration > 50 ? 'text-red-400 font-bold' :
                              entry.peak_concentration > 30 ? 'text-amber-400' : 'text-zinc-400'
                            }`}>
                              {Number(entry.peak_concentration).toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`font-mono text-xs ${
                              entry.peak_win_rate > 20 ? 'text-red-400 font-bold' :
                              entry.peak_win_rate > 10 ? 'text-amber-400' : 'text-zinc-400'
                            }`}>
                              {Number(entry.peak_win_rate).toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-zinc-300 font-mono text-xs">
                            {entry.all_time_tickets}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400 font-mono text-xs">
                            {(entry.prizes_won_lamports / 1e9).toFixed(4)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-zinc-500 font-mono text-xs">{entry.snapshots}</span>
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-1 justify-center" onClick={e => e.stopPropagation()}>
                              <a
                                href={`https://solscan.io/account/${entry.wallet_address}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded hover:bg-zinc-800 transition-colors"
                                title="Solscan"
                              >
                                <Wallet className="w-3 h-3 text-cyan-400" />
                              </a>
                              <a
                                href={`https://solsniffer.com/address/${entry.wallet_address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded hover:bg-zinc-800 transition-colors"
                                title="SolSniffer"
                              >
                                <Eye className="w-3 h-3 text-orange-400" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function WhaleAnalysisPanel({ whaleData, onSelectWhale, onSnapshotSaved }: {
  whaleData: WhaleAnalysis | null;
  onSelectWhale: (whale: WhaleUser) => void;
  onSnapshotSaved: () => void;
}) {
  const [showTable, setShowTable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [balances, setBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!whaleData?.users.length) return;
    const wallets = whaleData.users.map(u => u.wallet_address);
    Promise.allSettled(
      wallets.map(w => walletBalanceService.getWalletBalance(w).then(b => ({ w, b })))
    ).then(results => {
      const map: Record<string, number> = {};
      results.forEach(r => {
        if (r.status === 'fulfilled') map[r.value.w] = r.value.b;
      });
      setBalances(map);
    });
  }, [whaleData]);

  const hasUsers = whaleData && whaleData.users.length > 0;
  const flagged = hasUsers ? whaleData.users.filter(u => u.whale_score >= 15) : [];
  const critical = hasUsers ? whaleData.users.filter(u => u.whale_score >= 70) : [];

  const handleSaveSnapshot = async () => {
    if (!whaleData || whaleData.users.length === 0) return;
    setSaving(true);
    try {
      await adminService.saveWhaleSnapshot(whaleData.users);
      setSaved(true);
      onSnapshotSaved();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save snapshot:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: !hasUsers
          ? 'rgba(16, 185, 129, 0.2)'
          : critical.length > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)',
        background: !hasUsers
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.02) 0%, rgba(15, 15, 20, 0.95) 100%)'
          : critical.length > 0
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.03) 0%, rgba(15, 15, 20, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(15, 15, 20, 0.95) 100%)',
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {hasUsers ? (
              <BarChart3 className="w-4 h-4 text-red-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}
            <span className="text-white font-mono text-sm font-bold">Whale / Pool Manipulation Analysis</span>
            {critical.length > 0 && (
              <span className="text-red-400 font-mono text-xs px-2 py-0.5 rounded-full border border-red-500/30 bg-red-500/10">
                {critical.length} critical
              </span>
            )}
            {hasUsers && flagged.length === 0 && (
              <span className="text-emerald-400 font-mono text-xs px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10">
                all clear
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {hasUsers && (
              <button
                onClick={handleSaveSnapshot}
                disabled={saving || saved}
                className={`flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-lg border transition-all ${
                  saved
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-zinc-700 bg-zinc-900/50 text-zinc-400 hover:text-white hover:border-zinc-500'
                }`}
              >
                {saved ? <CheckCircle className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                {saving ? 'Saving...' : saved ? 'Saved' : 'Save Snapshot'}
              </button>
            )}
            <a
              href={`https://app.bubblemaps.io/sol/token/${CLAIM_PROGRAM_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-emerald-400 font-mono text-xs hover:text-emerald-300 transition-colors"
            >
              Bubblemaps <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={`https://solsniffer.com/address/${CLAIM_PROGRAM_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-orange-400 font-mono text-xs hover:text-orange-300 transition-colors"
            >
              SolSniffer <ExternalLink className="w-3 h-3" />
            </a>
            {hasUsers && (
              <button
                onClick={() => setShowTable(!showTable)}
                className="text-zinc-500 hover:text-white transition-colors p-1"
              >
                {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {!hasUsers && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/15 bg-emerald-500/5">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-emerald-300 font-mono text-sm font-bold">No Active Whale Risks</p>
              <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>
                No users have active (undrawn) tickets in current rounds, or all concentration levels are within normal ranges.
              </p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {hasUsers && showTable && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-2 px-3 text-zinc-500 font-mono text-xs font-normal">Wallet</th>
                      <th className="text-right py-2 px-3 text-zinc-500 font-mono text-xs font-normal">Balance</th>
                      {['tri-daily', 'jackpot', 'special-event', 'grand-prize'].map(lt => (
                        <th key={lt} className="text-center py-2 px-2 font-mono text-xs font-normal" style={{ color: LOTTERY_COLORS[lt] }}>
                          {LOTTERY_LABELS[lt]}
                        </th>
                      ))}
                      <th className="text-right py-2 px-3 text-zinc-500 font-mono text-xs font-normal">Win Rate</th>
                      <th className="text-right py-2 px-3 text-zinc-500 font-mono text-xs font-normal">Prizes</th>
                      <th className="text-center py-2 px-3 text-zinc-500 font-mono text-xs font-normal">Score</th>
                      <th className="text-center py-2 px-2 text-zinc-500 font-mono text-xs font-normal">Links</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whaleData!.users.map((whale) => (
                      <tr
                        key={whale.wallet_address}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors cursor-pointer"
                        onClick={() => onSelectWhale(whale)}
                      >
                        <td className="py-2.5 px-3">
                          <p className="text-zinc-300 font-mono text-xs">
                            {whale.wallet_address.slice(0, 6)}...{whale.wallet_address.slice(-4)}
                          </p>
                          <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                            {whale.total_current_tickets} current / {whale.total_all_time_tickets} total
                          </p>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {balances[whale.wallet_address] !== undefined ? (
                            <span className="text-amber-400 font-mono text-xs font-bold">
                              {(balances[whale.wallet_address] / LAMPORTS_PER_SOL).toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-zinc-700 font-mono text-xs">...</span>
                          )}
                          <p className="text-zinc-600 font-mono" style={{ fontSize: '9px' }}>SOL</p>
                        </td>
                        {['tri-daily', 'jackpot', 'special-event', 'grand-prize'].map(lt => {
                          const c = whale.concentration[lt];
                          return (
                            <td key={lt} className="py-2.5 px-2">
                              {c ? (
                                <div>
                                  <ConcentrationBar pct={c.pct} color={LOTTERY_COLORS[lt]} />
                                  <p className="text-zinc-600 font-mono text-center" style={{ fontSize: '9px' }}>
                                    {c.user}/{c.total}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-zinc-800 font-mono text-xs block text-center">--</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-3 text-right">
                          <span className={`font-mono text-xs font-bold ${
                            whale.win_rate > 20 ? 'text-red-400' : whale.win_rate > 10 ? 'text-amber-400' : 'text-zinc-400'
                          }`}>
                            {whale.win_rate}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="text-emerald-400 font-mono text-xs">{whale.prizes_won}</span>
                          <p className="text-zinc-600 font-mono" style={{ fontSize: '9px' }}>
                            {(whale.prizes_won_lamports / 1e9).toFixed(4)}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <WhaleScoreBadge score={whale.whale_score} />
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-1 justify-center" onClick={e => e.stopPropagation()}>
                            <a
                              href={`https://solscan.io/account/${whale.wallet_address}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded hover:bg-zinc-800 transition-colors"
                              title="Solscan"
                            >
                              <Wallet className="w-3 h-3 text-cyan-400" />
                            </a>
                            <a
                              href={`https://solsniffer.com/address/${whale.wallet_address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded hover:bg-zinc-800 transition-colors"
                              title="SolSniffer"
                            >
                              <Eye className="w-3 h-3 text-orange-400" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function AdminUsers() {
  const { publicKey } = useWallet();
  const [users, setUsers] = useState<UserRanking[]>([]);
  const [whaleData, setWhaleData] = useState<WhaleAnalysis | null>(null);
  const [whaleHistory, setWhaleHistory] = useState<WhaleHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('total_spent_sol');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [banTarget, setBanTarget] = useState<UserRanking | null>(null);
  const [detailTarget, setDetailTarget] = useState<UserRanking | null>(null);
  const [selectedWhale, setSelectedWhale] = useState<WhaleUser | null>(null);
  const [showBanned, setShowBanned] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const h = await adminService.getWhaleHistory(30);
      setWhaleHistory(h);
    } catch (err) {
      console.error('Failed to load whale history:', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [u, w] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getWhaleAnalysis(),
      ]);
      setUsers(u);
      setWhaleData(w);
      loadHistory();
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [loadHistory]);

  const { lastRefresh } = useAdminAutoRefresh(loadData);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    let result = users.filter(u => {
      if (!showBanned && u.is_banned) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return u.wallet_address.toLowerCase().includes(q) ||
        (u.display_name || '').toLowerCase().includes(q);
    });

    result.sort((a, b) => {
      let aVal: number, bVal: number;
      if (sortBy === 'created_at') {
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
      } else {
        aVal = a[sortBy] as number;
        bVal = b[sortBy] as number;
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return result;
  }, [users, search, sortBy, sortDir, showBanned]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ChevronDown className="w-3 h-3 text-zinc-600" />;
    return sortDir === 'desc'
      ? <ChevronDown className="w-3 h-3 text-red-400" />
      : <ChevronUp className="w-3 h-3 text-red-400" />;
  };

  const bannedCount = users.filter(u => u.is_banned).length;

  return (
    <AdminGuard>
      <AdminLayout>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-end gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-zinc-600 font-mono text-xs">
                LIVE {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search wallet or name..."
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-red-500/50"
                />
              </div>
              <button
                onClick={() => setShowBanned(!showBanned)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg font-mono text-xs border transition-colors ${
                  showBanned
                    ? 'border-red-500/30 bg-red-500/10 text-red-400'
                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                Banned ({bannedCount})
              </button>
              <div className="text-zinc-600 font-mono text-xs">
                {filtered.length} users
              </div>
            </div>

            <WhaleAnalysisPanel whaleData={whaleData} onSelectWhale={setSelectedWhale} onSnapshotSaved={loadHistory} />

            <WhaleHistoryRanking history={whaleHistory} onSelectWhale={setSelectedWhale} whaleData={whaleData} />

            <div
              className="rounded-xl border border-zinc-800/80 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(15,17,23,0.9) 0%, rgba(19,22,33,0.9) 100%)' }}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-3 px-4 text-zinc-500 font-mono text-xs font-normal">#</th>
                      <th className="text-left py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Wallet</th>
                      <th
                        className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal cursor-pointer hover:text-zinc-300"
                        onClick={() => toggleSort('total_tickets')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Tickets <SortIcon field="total_tickets" />
                        </span>
                      </th>
                      <th
                        className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal cursor-pointer hover:text-zinc-300"
                        onClick={() => toggleSort('total_spent_sol')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Spent (SOL) <SortIcon field="total_spent_sol" />
                        </span>
                      </th>
                      <th
                        className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal cursor-pointer hover:text-zinc-300"
                        onClick={() => toggleSort('total_won_lamports')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Won (SOL) <SortIcon field="total_won_lamports" />
                        </span>
                      </th>
                      <th className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Last Login</th>
                      <th className="text-center py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Warnings</th>
                      <th className="text-center py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Status</th>
                      <th className="text-center py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 100).map((user, i) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.01 }}
                        className={`border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors ${
                          user.is_banned ? 'bg-red-500/5' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className={`font-mono text-sm ${
                            i === 0 ? 'text-amber-400 font-bold' :
                            i === 1 ? 'text-zinc-300 font-bold' :
                            i === 2 ? 'text-orange-400 font-bold' :
                            'text-zinc-600'
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setDetailTarget(user)}
                            className="text-left hover:opacity-80 transition-opacity"
                          >
                            <p className="text-zinc-300 font-mono text-sm">
                              {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                            </p>
                            {user.display_name && (
                              <p className="text-zinc-600 font-mono text-xs">{user.display_name}</p>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-300 font-mono text-sm">
                          {user.total_tickets}
                        </td>
                        <td className="py-3 px-4 text-right text-amber-400 font-mono text-sm">
                          {user.total_spent_sol.toFixed(4)}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-400 font-mono text-sm">
                          {(user.total_won_lamports / 1e9).toFixed(4)}
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-500 font-mono text-xs">
                          {user.last_login_date || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {user.warning_count > 0 ? (
                            <span
                              className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-full border"
                              style={{
                                color: user.max_warning_severity === 'critical' ? '#ef4444' :
                                       user.max_warning_severity === 'high' ? '#f97316' :
                                       user.max_warning_severity === 'medium' ? '#f59e0b' : '#a1a1aa',
                                borderColor: user.max_warning_severity === 'critical' ? 'rgba(239,68,68,0.3)' :
                                             user.max_warning_severity === 'high' ? 'rgba(249,115,22,0.3)' :
                                             user.max_warning_severity === 'medium' ? 'rgba(245,158,11,0.3)' : 'rgba(161,161,170,0.3)',
                                background: user.max_warning_severity === 'critical' ? 'rgba(239,68,68,0.1)' :
                                            user.max_warning_severity === 'high' ? 'rgba(249,115,22,0.1)' :
                                            user.max_warning_severity === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(161,161,170,0.1)',
                              }}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              {user.warning_count}
                            </span>
                          ) : (
                            <span className="text-zinc-700 font-mono text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {user.is_banned ? (
                            <span className="text-red-400 font-mono text-xs px-2 py-0.5 rounded-full border border-red-500/30 bg-red-500/10">
                              banned
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-mono text-xs px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10">
                              active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setBanTarget(user)}
                            className={`font-mono text-xs transition-colors px-2 py-1 rounded border ${
                              user.is_banned
                                ? 'text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10'
                                : 'text-red-500 border-red-500/30 hover:bg-red-500/10'
                            }`}
                          >
                            {user.is_banned ? 'Unban' : 'Ban'}
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <AnimatePresence>
              {banTarget && publicKey && (
                <BanModal
                  user={banTarget}
                  adminWallet={publicKey}
                  onConfirm={() => { setBanTarget(null); loadData(); }}
                  onClose={() => setBanTarget(null)}
                />
              )}
              {detailTarget && (
                <UserDetailModal
                  user={detailTarget}
                  onClose={() => setDetailTarget(null)}
                />
              )}
              {selectedWhale && (
                <WhaleDetailModal
                  whale={selectedWhale}
                  onClose={() => setSelectedWhale(null)}
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
}
