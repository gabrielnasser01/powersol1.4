import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, ChevronDown, ChevronUp, X, Network,
  ArrowRight, Coins, Clock, CheckCircle,
} from 'lucide-react';
import { adminService, AffiliateRanking } from '../../services/adminService';
import { AdminLayout } from './AdminLayout';
import { AdminGuard } from './AdminGuard';

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Starter', color: '#a1a1aa' },
  2: { label: 'Bronze', color: '#cd7f32' },
  3: { label: 'Silver', color: '#c0c0c0' },
  4: { label: 'Gold', color: '#ffd700' },
};

function NetworkModal({ affiliate, onClose }: { affiliate: AffiliateRanking; onClose: () => void }) {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getAffiliateNetwork(affiliate.affiliate_id).then(data => {
      setReferrals(data);
      setLoading(false);
    });
  }, [affiliate.affiliate_id]);

  const totalValue = referrals.reduce((s, r) => s + Number(r.total_value_sol || 0), 0);
  const totalCommission = referrals.reduce((s, r) => s + Number(r.total_commission_earned || 0), 0);
  const validatedCount = referrals.filter(r => r.is_validated).length;

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
        className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl border border-zinc-800"
        style={{ background: '#0f1117' }}
      >
        <div className="sticky top-0 z-10 border-b border-zinc-800 p-4" style={{ background: '#0f1117' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-red-400" />
              <h3 className="text-white font-mono text-sm font-bold">Affiliate Network</h3>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center border border-zinc-700" style={{ background: '#1a1c25' }}>
              <Users className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-zinc-300 font-mono text-sm">
                {affiliate.wallet_address.slice(0, 8)}...{affiliate.wallet_address.slice(-4)}
              </p>
              <p className="text-zinc-600 font-mono text-xs">Code: {affiliate.referral_code}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2.5 text-center">
              <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Referrals</p>
              <p className="text-white font-mono text-sm font-bold">{referrals.length}</p>
              <p className="text-emerald-400 font-mono" style={{ fontSize: '10px' }}>{validatedCount} validated</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2.5 text-center">
              <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Volume (SOL)</p>
              <p className="text-amber-400 font-mono text-sm font-bold">{totalValue.toFixed(4)}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2.5 text-center">
              <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Commission</p>
              <p className="text-emerald-400 font-mono text-sm font-bold">{totalCommission.toFixed(4)}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2.5 text-center">
              <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Claimed</p>
              <p className="text-cyan-400 font-mono text-sm font-bold">{affiliate.total_claimed_sol.toFixed(4)}</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
            </div>
          ) : referrals.length === 0 ? (
            <p className="text-zinc-600 font-mono text-sm text-center py-8">No referrals yet</p>
          ) : (
            <div className="space-y-2">
              {referrals.map((ref, i) => {
                const user = ref.users as any;
                return (
                  <div
                    key={ref.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      ref.is_validated
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : 'border-zinc-800 bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{
                        background: ref.is_validated ? '#10b981' : '#52525b'
                      }} />
                      <ArrowRight className="w-3 h-3 text-zinc-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-300 font-mono text-sm truncate">
                        {user?.wallet_address?.slice(0, 8) || '???'}...{user?.wallet_address?.slice(-4) || ''}
                      </p>
                      <div className="flex items-center gap-3 text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                        <span>{user?.display_name || 'anon'}</span>
                        <span>{ref.total_tickets_purchased || 0} tickets</span>
                        <span>{Number(ref.total_value_sol || 0).toFixed(4)} SOL</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-amber-400 font-mono text-xs font-bold">
                        {Number(ref.total_commission_earned || 0).toFixed(4)} SOL
                      </p>
                      <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                        {ref.is_validated ? 'validated' : 'pending'}
                      </p>
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

export function AdminAffiliates() {
  const [affiliates, setAffiliates] = useState<AffiliateRanking[]>([]);
  const [unclaimedRewards, setUnclaimedRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'total_earned' | 'referral_count' | 'total_referral_value_sol'>('total_earned');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateRanking | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [a, u] = await Promise.all([
        adminService.getAffiliateRankings(),
        adminService.getUnclaimedAffiliateRewards(),
      ]);
      setAffiliates(a);
      setUnclaimedRewards(u);
    } catch (err) {
      console.error('Failed to load affiliates:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let result = affiliates.filter(a => {
      if (!search) return true;
      const q = search.toLowerCase();
      return a.wallet_address.toLowerCase().includes(q) ||
        a.referral_code.toLowerCase().includes(q);
    });

    result.sort((a, b) => {
      const aVal = a[sortBy] as number;
      const bVal = b[sortBy] as number;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return result;
  }, [affiliates, search, sortBy, sortDir]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortBy }) => {
    if (sortBy !== field) return <ChevronDown className="w-3 h-3 text-zinc-600" />;
    return sortDir === 'desc'
      ? <ChevronDown className="w-3 h-3 text-red-400" />
      : <ChevronUp className="w-3 h-3 text-red-400" />;
  };

  const totalUnclaimedLamports = unclaimedRewards.reduce((s, r) => s + Number(r.pending_lamports || 0), 0);

  return (
    <AdminGuard>
      <AdminLayout>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {unclaimedRewards.length > 0 && (
              <div
                className="rounded-xl border border-amber-500/20 p-4"
                style={{ background: 'rgba(245, 158, 11, 0.03)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400 font-mono text-sm font-bold">
                    Unclaimed Rewards: {(totalUnclaimedLamports / 1e9).toFixed(4)} SOL
                  </span>
                  <span className="text-zinc-600 font-mono text-xs">
                    ({unclaimedRewards.length} pending weeks)
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search wallet or code..."
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-red-500/50"
                />
              </div>
              <div className="text-zinc-600 font-mono text-xs">
                {filtered.length} affiliates
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
                      <th className="text-left py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Wallet / Code</th>
                      <th className="text-center py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Tier</th>
                      <th
                        className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal cursor-pointer hover:text-zinc-300"
                        onClick={() => toggleSort('referral_count')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Referrals <SortIcon field="referral_count" />
                        </span>
                      </th>
                      <th
                        className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal cursor-pointer hover:text-zinc-300"
                        onClick={() => toggleSort('total_referral_value_sol')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Volume <SortIcon field="total_referral_value_sol" />
                        </span>
                      </th>
                      <th
                        className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal cursor-pointer hover:text-zinc-300"
                        onClick={() => toggleSort('total_earned')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Earned <SortIcon field="total_earned" />
                        </span>
                      </th>
                      <th className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Claimed</th>
                      <th className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Pending</th>
                      <th className="text-center py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Network</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((aff, i) => {
                      const tier = TIER_LABELS[aff.manual_tier || 1] || TIER_LABELS[1];
                      return (
                        <motion.tr
                          key={aff.affiliate_id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors"
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
                            <p className="text-zinc-300 font-mono text-sm">
                              {aff.wallet_address.slice(0, 6)}...{aff.wallet_address.slice(-4)}
                            </p>
                            <p className="text-zinc-600 font-mono text-xs">{aff.referral_code}</p>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className="font-mono text-xs px-2 py-0.5 rounded-full border"
                              style={{ color: tier.color, borderColor: `${tier.color}40`, background: `${tier.color}10` }}
                            >
                              {tier.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-zinc-300 font-mono text-sm">
                            {aff.referral_count}
                          </td>
                          <td className="py-3 px-4 text-right text-amber-400 font-mono text-sm">
                            {aff.total_referral_value_sol.toFixed(4)}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-400 font-mono text-sm font-bold">
                            {aff.total_earned.toFixed(4)}
                          </td>
                          <td className="py-3 px-4 text-right text-cyan-400 font-mono text-sm">
                            {aff.total_claimed_sol.toFixed(4)}
                          </td>
                          <td className="py-3 px-4 text-right text-red-400 font-mono text-sm">
                            {aff.pending_earnings.toFixed(4)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setSelectedAffiliate(aff)}
                              className="text-zinc-500 hover:text-red-400 font-mono text-xs transition-colors px-2 py-1 rounded border border-zinc-800 hover:border-red-500/30"
                            >
                              View
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <AnimatePresence>
              {selectedAffiliate && (
                <NetworkModal
                  affiliate={selectedAffiliate}
                  onClose={() => setSelectedAffiliate(null)}
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
}
