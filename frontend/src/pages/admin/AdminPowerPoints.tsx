import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Search, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle, XCircle, Filter, X,
} from 'lucide-react';
import { adminService, UserRanking, MissionAlert } from '../../services/adminService';
import { AdminLayout } from './AdminLayout';
import { AdminGuard } from './AdminGuard';

function MissionDetailModal({ wallet, onClose }: { wallet: string; onClose: () => void }) {
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getUserMissionDetails(wallet).then(data => {
      setMissions(data);
      setLoading(false);
    });
  }, [wallet]);

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
        className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border border-zinc-800"
        style={{ background: '#0f1117' }}
      >
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-zinc-800" style={{ background: '#0f1117' }}>
          <div>
            <h3 className="text-white font-mono text-sm font-bold">Mission Progress</h3>
            <p className="text-zinc-500 font-mono text-xs">{wallet.slice(0, 6)}...{wallet.slice(-4)}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
            </div>
          ) : missions.length === 0 ? (
            <p className="text-zinc-600 font-mono text-sm text-center py-8">No mission data</p>
          ) : (
            <div className="space-y-2">
              {missions.map(m => {
                const mission = m.missions;
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      m.completed
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : 'border-zinc-800 bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {m.completed ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-zinc-600 shrink-0" />
                      )}
                      <div>
                        <p className="text-zinc-300 font-mono text-sm">{mission?.name || m.mission_id}</p>
                        <p className="text-zinc-600 font-mono text-xs">
                          {mission?.mission_type} | {mission?.mission_key}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-amber-400 font-mono text-xs font-bold">
                        +{mission?.power_points || 0} PP
                      </p>
                      {m.completed_at && (
                        <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                          {new Date(m.completed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function AdminPowerPoints() {
  const [users, setUsers] = useState<UserRanking[]>([]);
  const [alerts, setAlerts] = useState<MissionAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'power_points' | 'missions_completed'>('power_points');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, a] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getMissionAlerts(),
      ]);
      setUsers(u);
      setAlerts(a);
    } catch (err) {
      console.error('Failed to load PowerPoints data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let result = users.filter(u => {
      if (!search) return true;
      const q = search.toLowerCase();
      return u.wallet_address.toLowerCase().includes(q) ||
        (u.display_name || '').toLowerCase().includes(q);
    });

    result.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortDir === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });

    return result;
  }, [users, search, sortBy, sortDir]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: typeof sortBy }) => {
    if (sortBy !== field) return <ChevronDown className="w-3 h-3 text-zinc-600" />;
    return sortDir === 'desc'
      ? <ChevronDown className="w-3 h-3 text-red-400" />
      : <ChevronUp className="w-3 h-3 text-red-400" />;
  };

  return (
    <AdminGuard>
      <AdminLayout>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {alerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-amber-500/30 p-4"
                style={{ background: 'rgba(245, 158, 11, 0.05)' }}
              >
                <button
                  onClick={() => setShowAlerts(!showAlerts)}
                  className="flex items-center gap-2 w-full"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-400 font-mono text-sm font-bold">
                    {alerts.length} Mission Alert{alerts.length > 1 ? 's' : ''}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-amber-400 ml-auto transition-transform ${showAlerts ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showAlerts && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-2">
                        {alerts.slice(0, 20).map((a, i) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-amber-500/10 last:border-0">
                            <div>
                              <p className="text-zinc-300 font-mono text-xs">
                                {a.wallet_address.slice(0, 6)}...{a.wallet_address.slice(-4)}
                              </p>
                              <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>{a.mission_name}</p>
                            </div>
                            <p className="text-amber-400 font-mono text-xs">{a.issue}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search wallet or name..."
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-red-500/50"
                />
              </div>
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
                        className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal cursor-pointer hover:text-zinc-300 transition-colors"
                        onClick={() => toggleSort('power_points')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Power Points <SortIcon field="power_points" />
                        </span>
                      </th>
                      <th
                        className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal cursor-pointer hover:text-zinc-300 transition-colors"
                        onClick={() => toggleSort('missions_completed')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Missions <SortIcon field="missions_completed" />
                        </span>
                      </th>
                      <th className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Streak</th>
                      <th className="text-center py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Details</th>
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
                          user.is_banned ? 'opacity-40' : ''
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
                          <div>
                            <p className="text-zinc-300 font-mono text-sm">
                              {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                            </p>
                            {user.display_name && (
                              <p className="text-zinc-600 font-mono text-xs">{user.display_name}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-amber-400 font-mono text-sm font-bold">
                            {user.power_points.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-emerald-400 font-mono text-sm">
                            {user.missions_completed}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-cyan-400 font-mono text-sm">
                            {user.login_streak}d
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedWallet(user.wallet_address)}
                            className="text-zinc-500 hover:text-red-400 font-mono text-xs transition-colors px-2 py-1 rounded border border-zinc-800 hover:border-red-500/30"
                          >
                            View
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <AnimatePresence>
              {selectedWallet && (
                <MissionDetailModal
                  wallet={selectedWallet}
                  onClose={() => setSelectedWallet(null)}
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
}
