import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, ShieldX, ShieldAlert, Search, Ban, Unlock,
  FileText, Clock, Eye, ChevronDown, ChevronUp,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { AdminGuard } from './AdminGuard';
import { useWallet } from '../../contexts/WalletContext';
import {
  complianceService,
  AdminComplianceOverview,
  AuditLogEntry,
  BlockedWallet,
  AgeVerification,
  WalletCheck,
} from '../../services/complianceService';

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800/80 p-5"
      style={{ background: 'linear-gradient(135deg, rgba(15,17,23,0.9) 0%, rgba(19,22,33,0.9) 100%)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <p className="text-zinc-500 font-mono text-xs mb-1">{label}</p>
      <p className="text-white font-mono text-xl font-bold">{value}</p>
    </motion.div>
  );
}

function RiskBreakdownBar({ breakdown }: { breakdown: Record<string, number> }) {
  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
  if (total === 0) return <p className="text-zinc-600 font-mono text-xs">No data yet</p>;

  const colors: Record<string, string> = {
    clear: '#10b981',
    low: '#3b82f6',
    medium: '#f59e0b',
    high: '#ef4444',
    sanctioned: '#dc2626',
  };

  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden bg-zinc-800">
        {Object.entries(breakdown).map(([level, count]) => (
          <div
            key={level}
            style={{ width: `${(count / total) * 100}%`, background: colors[level] || '#6b7280' }}
            title={`${level}: ${count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {Object.entries(breakdown).map(([level, count]) => (
          <div key={level} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors[level] || '#6b7280' }} />
            <span className="text-zinc-400 font-mono text-xs">{level}: {count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockedWalletsTable({ wallets, onUnblock }: {
  wallets: BlockedWallet[];
  onUnblock: (wallet: string) => void;
}) {
  if (wallets.length === 0) {
    return <p className="text-zinc-600 font-mono text-sm text-center py-4">No blocked wallets</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Wallet</th>
            <th className="text-left py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Reason</th>
            <th className="text-left py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Source</th>
            <th className="text-left py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Blocked At</th>
            <th className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Action</th>
          </tr>
        </thead>
        <tbody>
          {wallets.map((w) => (
            <tr key={w.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
              <td className="py-3 px-4 text-zinc-300 font-mono text-xs">
                {w.wallet_address.slice(0, 6)}...{w.wallet_address.slice(-4)}
              </td>
              <td className="py-3 px-4 text-zinc-400 text-xs max-w-[200px] truncate">{w.reason}</td>
              <td className="py-3 px-4">
                <span className={`inline-flex px-2 py-0.5 rounded font-mono text-xs ${
                  w.source === 'ofac' ? 'bg-red-500/10 text-red-400' :
                  w.source === 'manual' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-zinc-700/50 text-zinc-400'
                }`}>
                  {w.source}
                </span>
              </td>
              <td className="py-3 px-4 text-zinc-500 font-mono text-xs">
                {new Date(w.blocked_at).toLocaleDateString()}
              </td>
              <td className="py-3 px-4 text-right">
                <button
                  onClick={() => onUnblock(w.wallet_address)}
                  className="px-3 py-1 rounded-lg font-mono text-xs border border-emerald-500/30
                    text-emerald-400 hover:bg-emerald-500/10 transition-all"
                >
                  <Unlock className="w-3 h-3 inline mr-1" />
                  Unblock
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditLogTable({ entries }: { entries: AuditLogEntry[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (entries.length === 0) {
    return <p className="text-zinc-600 font-mono text-sm text-center py-4">No audit entries</p>;
  }

  const actionColors: Record<string, string> = {
    age_verification_submitted: 'text-emerald-400',
    wallet_risk_check: 'text-blue-400',
    wallet_sanctioned_auto_block: 'text-red-400',
    admin_block_wallet: 'text-red-400',
    admin_unblock_wallet: 'text-emerald-400',
    admin_revoke_age_verification: 'text-amber-400',
  };

  return (
    <div className="space-y-1">
      {entries.map((entry) => (
        <div key={entry.id} className="border-b border-zinc-800/30">
          <button
            onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
            className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-zinc-800/20 transition-colors rounded"
          >
            <div className="flex items-center gap-3 text-left">
              <span className="text-zinc-500 font-mono text-xs w-32 shrink-0">
                {new Date(entry.created_at).toLocaleString()}
              </span>
              <span className="text-zinc-300 font-mono text-xs">
                {entry.wallet_address.slice(0, 6)}...{entry.wallet_address.slice(-4)}
              </span>
              <span className={`font-mono text-xs ${actionColors[entry.action] || 'text-zinc-400'}`}>
                {entry.action.replace(/_/g, ' ')}
              </span>
            </div>
            {entry.details && (
              expanded === entry.id
                ? <ChevronUp className="w-3 h-3 text-zinc-500" />
                : <ChevronDown className="w-3 h-3 text-zinc-500" />
            )}
          </button>
          {expanded === entry.id && entry.details && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="px-3 pb-3 overflow-hidden"
            >
              <pre className="text-zinc-500 font-mono text-xs bg-zinc-900/50 rounded-lg p-3 overflow-x-auto">
                {JSON.stringify(entry.details, null, 2)}
              </pre>
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );
}

type TabKey = 'overview' | 'verifications' | 'checks' | 'blocked' | 'audit';

export function AdminCompliance() {
  const { publicKey } = useWallet();
  const [tab, setTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState<AdminComplianceOverview | null>(null);
  const [verifications, setVerifications] = useState<AgeVerification[]>([]);
  const [walletChecks, setWalletChecks] = useState<WalletCheck[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

  const [blockWallet, setBlockWallet] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockLoading, setBlockLoading] = useState(false);
  const [searchWallet, setSearchWallet] = useState('');

  const loadOverview = useCallback(async () => {
    if (!publicKey) return;
    try {
      setLoading(true);
      const data = await complianceService.getAdminOverview(publicKey);
      setOverview(data);
    } catch (err) {
      console.error('Failed to load compliance overview:', err);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  const loadVerifications = useCallback(async () => {
    if (!publicKey) return;
    try {
      const { data } = await complianceService.getAdminVerifications(publicKey);
      setVerifications(data);
    } catch (err) {
      console.error(err);
    }
  }, [publicKey]);

  const loadWalletChecks = useCallback(async () => {
    if (!publicKey) return;
    try {
      const { data } = await complianceService.getAdminWalletChecks(publicKey);
      setWalletChecks(data);
    } catch (err) {
      console.error(err);
    }
  }, [publicKey]);

  const loadAuditLog = useCallback(async () => {
    if (!publicKey) return;
    try {
      const params: [string, number, string?] = [publicKey, 1];
      if (searchWallet.trim()) params.push(searchWallet.trim());
      const { data } = await complianceService.getAdminAuditLog(...params);
      setAuditLog(data);
    } catch (err) {
      console.error(err);
    }
  }, [publicKey, searchWallet]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (tab === 'verifications') loadVerifications();
    if (tab === 'checks') loadWalletChecks();
    if (tab === 'audit') loadAuditLog();
  }, [tab, loadVerifications, loadWalletChecks, loadAuditLog]);

  const handleBlock = async () => {
    if (!publicKey || !blockWallet.trim()) return;
    try {
      setBlockLoading(true);
      await complianceService.adminBlockWallet(publicKey, blockWallet.trim(), blockReason || 'Manually blocked');
      setBlockWallet('');
      setBlockReason('');
      loadOverview();
    } catch (err) {
      console.error(err);
    } finally {
      setBlockLoading(false);
    }
  };

  const handleUnblock = async (wallet: string) => {
    if (!publicKey) return;
    try {
      await complianceService.adminUnblockWallet(publicKey, wallet);
      loadOverview();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeAge = async (wallet: string) => {
    if (!publicKey) return;
    const reason = prompt('Reason for revoking age verification:');
    if (reason === null) return;
    try {
      await complianceService.adminRevokeAge(publicKey, wallet, reason || 'No reason provided');
      loadVerifications();
      loadOverview();
    } catch (err) {
      console.error(err);
    }
  };

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'overview', label: 'Overview', icon: Eye },
    { key: 'verifications', label: 'Age Verifications', icon: ShieldCheck },
    { key: 'checks', label: 'Risk Checks', icon: ShieldAlert },
    { key: 'blocked', label: 'Blocked', icon: Ban },
    { key: 'audit', label: 'Audit Log', icon: FileText },
  ];

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-xs border transition-all whitespace-nowrap ${
                    tab === t.key
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {loading && tab === 'overview' ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {tab === 'overview' && overview && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Age Verified" value={overview.total_age_verified} icon={ShieldCheck} color="#10b981" />
                    <StatCard label="Wallet Checks" value={overview.total_wallet_checks} icon={ShieldAlert} color="#3b82f6" />
                    <StatCard label="Blocked Wallets" value={overview.total_blocked} icon={Ban} color="#ef4444" />
                    <StatCard label="Audit Events" value={overview.recent_audit.length} icon={FileText} color="#f59e0b" />
                  </div>

                  <div
                    className="rounded-xl border border-zinc-800/80 p-5"
                    style={{ background: 'linear-gradient(135deg, rgba(15,17,23,0.9) 0%, rgba(19,22,33,0.9) 100%)' }}
                  >
                    <h3 className="text-white font-mono text-sm font-bold mb-4">Risk Distribution</h3>
                    <RiskBreakdownBar breakdown={overview.risk_breakdown} />
                  </div>

                  <div
                    className="rounded-xl border border-zinc-800/80 p-5 space-y-4"
                    style={{ background: 'linear-gradient(135deg, rgba(15,17,23,0.9) 0%, rgba(19,22,33,0.9) 100%)' }}
                  >
                    <h3 className="text-white font-mono text-sm font-bold flex items-center gap-2">
                      <Ban className="w-4 h-4 text-red-400" />
                      Block Wallet
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={blockWallet}
                        onChange={(e) => setBlockWallet(e.target.value)}
                        placeholder="Wallet address"
                        className="flex-1 bg-zinc-800/50 border border-zinc-700 text-zinc-300 font-mono text-xs
                          rounded-lg px-3 py-2.5 focus:outline-none focus:border-red-500/50"
                      />
                      <input
                        type="text"
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        placeholder="Reason (optional)"
                        className="flex-1 bg-zinc-800/50 border border-zinc-700 text-zinc-300 font-mono text-xs
                          rounded-lg px-3 py-2.5 focus:outline-none focus:border-red-500/50"
                      />
                      <button
                        onClick={handleBlock}
                        disabled={!blockWallet.trim() || blockLoading}
                        className="px-5 py-2.5 rounded-lg font-mono text-xs font-bold border border-red-500/50
                          text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {blockLoading ? 'Blocking...' : 'Block Wallet'}
                      </button>
                    </div>
                  </div>

                  <div
                    className="rounded-xl border border-zinc-800/80 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(15,17,23,0.9) 0%, rgba(19,22,33,0.9) 100%)' }}
                  >
                    <div className="p-5 border-b border-zinc-800/50">
                      <h3 className="text-white font-mono text-sm font-bold flex items-center gap-2">
                        <ShieldX className="w-4 h-4 text-red-400" />
                        Blocked Wallets ({overview.blocked_wallets.length})
                      </h3>
                    </div>
                    <BlockedWalletsTable wallets={overview.blocked_wallets} onUnblock={handleUnblock} />
                  </div>

                  <div
                    className="rounded-xl border border-zinc-800/80 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(15,17,23,0.9) 0%, rgba(19,22,33,0.9) 100%)' }}
                  >
                    <div className="p-5 border-b border-zinc-800/50">
                      <h3 className="text-white font-mono text-sm font-bold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        Recent Audit Log
                      </h3>
                    </div>
                    <div className="p-3">
                      <AuditLogTable entries={overview.recent_audit.slice(0, 20)} />
                    </div>
                  </div>
                </div>
              )}

              {tab === 'verifications' && (
                <div
                  className="rounded-xl border border-zinc-800/80 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(15,17,23,0.9) 0%, rgba(19,22,33,0.9) 100%)' }}
                >
                  <div className="p-5 border-b border-zinc-800/50">
                    <h3 className="text-white font-mono text-sm font-bold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Age Verifications ({verifications.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="text-left py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Wallet</th>
                          <th className="text-left py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Status</th>
                          <th className="text-left py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Verified At</th>
                          <th className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {verifications.map((v) => (
                          <tr key={v.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                            <td className="py-3 px-4 text-zinc-300 font-mono text-xs">
                              {v.wallet_address.slice(0, 6)}...{v.wallet_address.slice(-4)}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2 py-0.5 rounded font-mono text-xs ${
                                v.is_valid
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-red-500/10 text-red-400'
                              }`}>
                                {v.is_valid ? 'Valid' : 'Revoked'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-zinc-500 font-mono text-xs">
                              {new Date(v.verified_at).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {v.is_valid && (
                                <button
                                  onClick={() => handleRevokeAge(v.wallet_address)}
                                  className="px-3 py-1 rounded-lg font-mono text-xs border border-amber-500/30
                                    text-amber-400 hover:bg-amber-500/10 transition-all"
                                >
                                  Revoke
                                </button>
                              )}
                              {!v.is_valid && v.revoked_reason && (
                                <span className="text-zinc-600 font-mono text-xs">{v.revoked_reason}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {verifications.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-zinc-600 font-mono text-sm">
                              No age verifications yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'checks' && (
                <div
                  className="rounded-xl border border-zinc-800/80 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(15,17,23,0.9) 0%, rgba(19,22,33,0.9) 100%)' }}
                >
                  <div className="p-5 border-b border-zinc-800/50">
                    <h3 className="text-white font-mono text-sm font-bold flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-blue-400" />
                      Wallet Risk Checks ({walletChecks.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="text-left py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Wallet</th>
                          <th className="text-left py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Type</th>
                          <th className="text-left py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Risk Level</th>
                          <th className="text-left py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Checked At</th>
                          <th className="text-left py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Expires</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walletChecks.map((c) => (
                          <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                            <td className="py-3 px-4 text-zinc-300 font-mono text-xs">
                              {c.wallet_address.slice(0, 6)}...{c.wallet_address.slice(-4)}
                            </td>
                            <td className="py-3 px-4 text-zinc-400 font-mono text-xs">{c.check_type}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2 py-0.5 rounded font-mono text-xs ${
                                c.risk_level === 'clear' ? 'bg-emerald-500/10 text-emerald-400' :
                                c.risk_level === 'sanctioned' ? 'bg-red-500/10 text-red-400' :
                                c.risk_level === 'high' ? 'bg-red-500/10 text-red-400' :
                                c.risk_level === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                                'bg-blue-500/10 text-blue-400'
                              }`}>
                                {c.risk_level}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-zinc-500 font-mono text-xs">
                              {new Date(c.checked_at).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-zinc-500 font-mono text-xs">
                              {new Date(c.expires_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        {walletChecks.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-zinc-600 font-mono text-sm">
                              No wallet checks yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'blocked' && overview && (
                <div className="space-y-6">
                  <div
                    className="rounded-xl border border-zinc-800/80 p-5 space-y-4"
                    style={{ background: 'linear-gradient(135deg, rgba(15,17,23,0.9) 0%, rgba(19,22,33,0.9) 100%)' }}
                  >
                    <h3 className="text-white font-mono text-sm font-bold flex items-center gap-2">
                      <Ban className="w-4 h-4 text-red-400" />
                      Block a Wallet
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={blockWallet}
                        onChange={(e) => setBlockWallet(e.target.value)}
                        placeholder="Wallet address"
                        className="flex-1 bg-zinc-800/50 border border-zinc-700 text-zinc-300 font-mono text-xs
                          rounded-lg px-3 py-2.5 focus:outline-none focus:border-red-500/50"
                      />
                      <input
                        type="text"
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        placeholder="Reason"
                        className="flex-1 bg-zinc-800/50 border border-zinc-700 text-zinc-300 font-mono text-xs
                          rounded-lg px-3 py-2.5 focus:outline-none focus:border-red-500/50"
                      />
                      <button
                        onClick={handleBlock}
                        disabled={!blockWallet.trim() || blockLoading}
                        className="px-5 py-2.5 rounded-lg font-mono text-xs font-bold border border-red-500/50
                          text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40 whitespace-nowrap"
                      >
                        {blockLoading ? 'Blocking...' : 'Block'}
                      </button>
                    </div>
                  </div>

                  <div
                    className="rounded-xl border border-zinc-800/80 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(15,17,23,0.9) 0%, rgba(19,22,33,0.9) 100%)' }}
                  >
                    <div className="p-5 border-b border-zinc-800/50">
                      <h3 className="text-white font-mono text-sm font-bold">
                        Active Blocks ({overview.blocked_wallets.length})
                      </h3>
                    </div>
                    <BlockedWalletsTable wallets={overview.blocked_wallets} onUnblock={handleUnblock} />
                  </div>
                </div>
              )}

              {tab === 'audit' && (
                <div
                  className="rounded-xl border border-zinc-800/80 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(15,17,23,0.9) 0%, rgba(19,22,33,0.9) 100%)' }}
                >
                  <div className="p-5 border-b border-zinc-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <h3 className="text-white font-mono text-sm font-bold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400" />
                      Compliance Audit Log
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchWallet}
                          onChange={(e) => setSearchWallet(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && loadAuditLog()}
                          placeholder="Filter by wallet..."
                          className="bg-zinc-800/50 border border-zinc-700 text-zinc-300 font-mono text-xs
                            rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-amber-500/50 w-56"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <AuditLogTable entries={auditLog} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
