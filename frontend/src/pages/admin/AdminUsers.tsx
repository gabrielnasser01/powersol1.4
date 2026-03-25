import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronDown, ChevronUp, Ban, ShieldCheck,
  Ticket, DollarSign, Trophy, Calendar, X, AlertTriangle,
} from 'lucide-react';
import { adminService, UserRanking } from '../../services/adminService';
import { useWallet } from '../../contexts/WalletContext';
import { AdminLayout } from './AdminLayout';
import { AdminGuard } from './AdminGuard';

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

export function AdminUsers() {
  const { publicKey } = useWallet();
  const [users, setUsers] = useState<UserRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('total_spent_sol');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [banTarget, setBanTarget] = useState<UserRanking | null>(null);
  const [detailTarget, setDetailTarget] = useState<UserRanking | null>(null);
  const [showBanned, setShowBanned] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const u = await adminService.getAllUsers();
      setUsers(u);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

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
            </AnimatePresence>
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
}
