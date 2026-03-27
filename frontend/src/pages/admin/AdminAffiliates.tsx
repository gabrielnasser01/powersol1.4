import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, ChevronDown, ChevronUp, X, Network,
  ArrowRight, Clock, AlertTriangle, ExternalLink, Shield,
  Eye, EyeOff, Zap, Activity,
} from 'lucide-react';
import { adminService, AffiliateRanking, SybilAlert } from '../../services/adminService';
import { AdminLayout } from './AdminLayout';
import { AdminGuard } from './AdminGuard';
import { useAdminAutoRefresh } from '../../hooks/useAdminAutoRefresh';

const CLAIM_PROGRAM_ID = 'DX1rjpefmrBR8hASnExE3qCBpjpFEkUY4JEoTLmuU2JK';

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Starter', color: '#a1a1aa' },
  2: { label: 'Bronze', color: '#cd7f32' },
  3: { label: 'Silver', color: '#c0c0c0' },
  4: { label: 'Gold', color: '#ffd700' },
};

function getRiskColor(score: number): string {
  if (score >= 70) return '#ef4444';
  if (score >= 40) return '#f59e0b';
  return '#eab308';
}

function getRiskLabel(score: number): string {
  if (score >= 70) return 'CRITICAL';
  if (score >= 40) return 'HIGH';
  return 'MEDIUM';
}

function SybilDetailModal({ alert, onClose }: { alert: SybilAlert; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'wallets' | 'rapid' | 'tools'>('overview');
  const riskColor = getRiskColor(alert.risk_score);

  const bubblemapsUrl = `https://app.bubblemaps.io/sol/token/${CLAIM_PROGRAM_ID}`;
  const solsniffUrl = `https://solsniff.com/address/${alert.wallet_address}`;
  const solscanProgramUrl = `https://solscan.io/account/${CLAIM_PROGRAM_ID}?cluster=devnet#transactions`;
  const solscanWalletUrl = `https://solscan.io/account/${alert.wallet_address}?cluster=devnet`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border"
        style={{ background: '#0a0b0f', borderColor: `${riskColor}30` }}
      >
        <div className="sticky top-0 z-10 border-b p-4" style={{ background: '#0a0b0f', borderColor: `${riskColor}20` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: `${riskColor}15`, border: `1px solid ${riskColor}40` }}
              >
                <Shield className="w-5 h-5" style={{ color: riskColor }} />
              </div>
              <div>
                <h3 className="text-white font-mono text-sm font-bold">Sybil Analysis Detail</h3>
                <p className="text-zinc-500 font-mono text-xs">
                  {alert.wallet_address.slice(0, 12)}...{alert.wallet_address.slice(-6)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold"
                style={{ background: `${riskColor}20`, border: `1px solid ${riskColor}50`, color: riskColor }}
              >
                RISK {alert.risk_score}/100
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {[
              { label: 'Total Refs', value: alert.total_referrals, color: '#a1a1aa' },
              { label: 'Validated', value: alert.validated_referrals, color: '#10b981' },
              { label: '1-Ticket', value: alert.single_ticket_referrals, color: '#f59e0b' },
              { label: '0-Ticket', value: alert.zero_ticket_referrals, color: '#ef4444' },
              { label: '1-Ticket %', value: `${alert.single_ticket_rate}%`, color: alert.single_ticket_rate > 70 ? '#ef4444' : alert.single_ticket_rate > 50 ? '#f59e0b' : '#a1a1aa' },
            ].map(stat => (
              <div key={stat.label} className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-2 text-center">
                <p className="text-zinc-600 font-mono" style={{ fontSize: '9px' }}>{stat.label}</p>
                <p className="font-mono text-sm font-bold" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-1 mt-4">
            {(['overview', 'wallets', 'rapid', 'tools'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 rounded-md font-mono text-xs transition-all"
                style={{
                  background: activeTab === tab ? `${riskColor}15` : 'transparent',
                  color: activeTab === tab ? riskColor : '#71717a',
                  border: `1px solid ${activeTab === tab ? `${riskColor}40` : 'transparent'}`,
                }}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'wallets' && `Suspect Wallets (${alert.single_ticket_wallets.length + alert.zero_ticket_wallets.length})`}
                {tab === 'rapid' && `Rapid Signups (${alert.rapid_signups.length})`}
                {tab === 'tools' && 'Cluster Analysis'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-800/50 p-4" style={{ background: 'rgba(15, 15, 20, 0.6)' }}>
                <h4 className="text-zinc-400 font-mono text-xs font-bold mb-3 uppercase tracking-wider">Risk Indicators</h4>
                <div className="space-y-3">
                  {alert.single_ticket_rate > 50 && (
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: alert.single_ticket_rate > 70 ? '#ef4444' : '#f59e0b' }} />
                      <div>
                        <p className="text-zinc-300 font-mono text-sm">
                          High single-ticket referral rate: <span style={{ color: riskColor }} className="font-bold">{alert.single_ticket_rate}%</span>
                        </p>
                        <p className="text-zinc-600 font-mono text-xs mt-0.5">
                          {alert.single_ticket_referrals} of {alert.total_referrals} referrals purchased only 1 ticket (minimum to validate)
                        </p>
                      </div>
                    </div>
                  )}
                  {alert.zero_ticket_referrals > 0 && (
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                      <div>
                        <p className="text-zinc-300 font-mono text-sm">
                          Ghost referrals: <span className="text-red-400 font-bold">{alert.zero_ticket_referrals}</span> wallets never purchased
                        </p>
                        <p className="text-zinc-600 font-mono text-xs mt-0.5">
                          Wallets registered via ref link but never bought tickets
                        </p>
                      </div>
                    </div>
                  )}
                  {alert.rapid_signups.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Zap className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                      <div>
                        <p className="text-zinc-300 font-mono text-sm">
                          Rapid signup pattern: <span className="text-amber-400 font-bold">{alert.rapid_signups.length}</span> wallets within 5-min gaps
                        </p>
                        <p className="text-zinc-600 font-mono text-xs mt-0.5">
                          Multiple referrals created in quick succession indicates automated activity
                        </p>
                      </div>
                    </div>
                  )}
                  {alert.low_value_refs.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Activity className="w-4 h-4 mt-0.5 shrink-0 text-yellow-500" />
                      <div>
                        <p className="text-zinc-300 font-mono text-sm">
                          Low-value referrals: <span className="text-yellow-500 font-bold">{alert.low_value_refs.length}</span> with minimal spend
                        </p>
                        <p className="text-zinc-600 font-mono text-xs mt-0.5">
                          Referrals with extremely low SOL per ticket ratio
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full rounded-lg overflow-hidden" style={{ height: 8, background: 'rgba(255,255,255,0.05)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${alert.risk_score}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-lg"
                  style={{ background: `linear-gradient(90deg, ${getRiskColor(30)}, ${riskColor})` }}
                />
              </div>
              <div className="flex justify-between text-zinc-600 font-mono" style={{ fontSize: '9px' }}>
                <span>LOW RISK</span>
                <span>MEDIUM</span>
                <span>HIGH</span>
                <span>CRITICAL</span>
              </div>
            </div>
          )}

          {activeTab === 'wallets' && (
            <div className="space-y-3">
              {alert.single_ticket_wallets.length > 0 && (
                <div>
                  <h4 className="text-amber-400 font-mono text-xs font-bold mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Single-Ticket Wallets ({alert.single_ticket_wallets.length})
                  </h4>
                  <div className="space-y-1.5">
                    {alert.single_ticket_wallets.map((w, i) => (
                      <a
                        key={i}
                        href={`https://solscan.io/account/${w.wallet}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-lg border border-amber-500/10 bg-amber-500/5 hover:border-amber-500/30 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>#{i + 1}</span>
                          <span className="text-zinc-300 font-mono text-sm">
                            {w.wallet.slice(0, 10)}...{w.wallet.slice(-6)}
                          </span>
                          <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex items-center gap-3 text-zinc-500 font-mono" style={{ fontSize: '10px' }}>
                          <span>{w.tickets} ticket</span>
                          <span>{w.sol.toFixed(4)} SOL</span>
                          <span>{new Date(w.created).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {alert.zero_ticket_wallets.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-red-400 font-mono text-xs font-bold mb-2 flex items-center gap-2">
                    <X className="w-3.5 h-3.5" />
                    Zero-Ticket Ghost Wallets ({alert.zero_ticket_wallets.length})
                  </h4>
                  <div className="space-y-1.5">
                    {alert.zero_ticket_wallets.map((w, i) => (
                      <a
                        key={i}
                        href={`https://solscan.io/account/${w.wallet}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-lg border border-red-500/10 bg-red-500/5 hover:border-red-500/30 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>#{i + 1}</span>
                          <span className="text-zinc-300 font-mono text-sm">
                            {w.wallet.slice(0, 10)}...{w.wallet.slice(-6)}
                          </span>
                          <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className="text-red-400/60 font-mono" style={{ fontSize: '10px' }}>
                          {new Date(w.created).toLocaleDateString('pt-BR')}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'rapid' && (
            <div>
              {alert.rapid_signups.length === 0 ? (
                <p className="text-zinc-600 font-mono text-sm text-center py-8">No rapid signup patterns detected</p>
              ) : (
                <div className="space-y-1.5">
                  <h4 className="text-amber-400 font-mono text-xs font-bold mb-3 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" />
                    Signups within 5-minute gaps
                  </h4>
                  {alert.rapid_signups.map((s, i) => (
                    <a
                      key={i}
                      href={`https://solscan.io/account/${s.wallet}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-lg border border-amber-500/10 bg-amber-500/5 hover:border-amber-500/30 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span className="text-zinc-300 font-mono text-sm">
                          {s.wallet.slice(0, 10)}...{s.wallet.slice(-6)}
                        </span>
                        <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex items-center gap-3 font-mono" style={{ fontSize: '10px' }}>
                        <span className="text-amber-400 font-bold">{s.gap_minutes}min gap</span>
                        <span className="text-zinc-600">{new Date(s.created).toLocaleString('pt-BR')}</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-800/50 p-4" style={{ background: 'rgba(15, 15, 20, 0.6)' }}>
                <h4 className="text-zinc-400 font-mono text-xs font-bold mb-3 uppercase tracking-wider">On-Chain Cluster Analysis</h4>
                <p className="text-zinc-600 font-mono text-xs mb-4 leading-relaxed">
                  Use these tools to verify wallet clustering. Sybil attackers typically fund multiple wallets from
                  a single source, creating traceable on-chain patterns.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href={bubblemapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-lg border border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500/40 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20">
                      <Network className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-mono text-sm font-bold">Bubblemaps</span>
                        <ExternalLink className="w-3 h-3 text-cyan-400/50 group-hover:text-cyan-400 transition-colors" />
                      </div>
                      <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                        Visual wallet clustering for claim program interactions
                      </p>
                    </div>
                  </a>
                  <a
                    href={solsniffUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
                      <Shield className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-mono text-sm font-bold">SolSniff</span>
                        <ExternalLink className="w-3 h-3 text-emerald-400/50 group-hover:text-emerald-400 transition-colors" />
                      </div>
                      <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                        Affiliate wallet risk analysis and funding source trace
                      </p>
                    </div>
                  </a>
                  <a
                    href={solscanWalletUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
                      <Eye className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400 font-mono text-sm font-bold">Solscan Wallet</span>
                        <ExternalLink className="w-3 h-3 text-blue-400/50 group-hover:text-blue-400 transition-colors" />
                      </div>
                      <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                        View affiliate wallet transactions and token flows
                      </p>
                    </div>
                  </a>
                  <a
                    href={solscanProgramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-lg border border-orange-500/20 bg-orange-500/5 hover:border-orange-500/40 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-500/10 border border-orange-500/20">
                      <Activity className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-orange-400 font-mono text-sm font-bold">Claim Program TX</span>
                        <ExternalLink className="w-3 h-3 text-orange-400/50 group-hover:text-orange-400 transition-colors" />
                      </div>
                      <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                        All claim program transactions for pattern analysis
                      </p>
                    </div>
                  </a>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800/50 p-4" style={{ background: 'rgba(15, 15, 20, 0.6)' }}>
                <h4 className="text-zinc-400 font-mono text-xs font-bold mb-3 uppercase tracking-wider">Quick Links - Suspect Wallets</h4>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {[...alert.single_ticket_wallets, ...alert.zero_ticket_wallets].slice(0, 15).map((w, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded border border-zinc-800/30 bg-zinc-900/30">
                      <span className="text-zinc-300 font-mono text-xs flex-1 truncate">{w.wallet}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`https://app.bubblemaps.io/sol/token/${w.wallet}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400/50 hover:text-cyan-400 transition-colors"
                          title="Bubblemaps"
                        >
                          <Network className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://solsniff.com/address/${w.wallet}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400/50 hover:text-emerald-400 transition-colors"
                          title="SolSniff"
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://solscan.io/account/${w.wallet}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400/50 hover:text-blue-400 transition-colors"
                          title="Solscan"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

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
              {referrals.map((ref) => {
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
  const [sybilAlerts, setSybilAlerts] = useState<SybilAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'total_earned' | 'referral_count' | 'total_referral_value_sol'>('total_earned');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateRanking | null>(null);
  const [selectedSybilAlert, setSelectedSybilAlert] = useState<SybilAlert | null>(null);
  const [showSybilPanel, setShowSybilPanel] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [a, u, s] = await Promise.all([
        adminService.getAffiliateRankings(),
        adminService.getUnclaimedAffiliateRewards(),
        adminService.getSybilAnalysis(),
      ]);
      setAffiliates(a);
      setUnclaimedRewards(u);
      setSybilAlerts(s);
    } catch (err) {
      console.error('Failed to load affiliates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const { lastRefresh } = useAdminAutoRefresh(loadData);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
  const criticalAlerts = sybilAlerts.filter(a => a.risk_score >= 70);
  const highAlerts = sybilAlerts.filter(a => a.risk_score >= 40 && a.risk_score < 70);

  const sybilWalletSet = useMemo(() => new Set(sybilAlerts.map(a => a.wallet_address)), [sybilAlerts]);
  const sybilScoreMap = useMemo(() => {
    const map: Record<string, number> = {};
    sybilAlerts.forEach(a => { map[a.wallet_address] = a.risk_score; });
    return map;
  }, [sybilAlerts]);

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

            {sybilAlerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border overflow-hidden"
                style={{
                  borderColor: criticalAlerts.length > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                  background: criticalAlerts.length > 0
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.03) 0%, rgba(15, 15, 20, 0.95) 100%)'
                    : 'linear-gradient(135deg, rgba(245, 158, 11, 0.03) 0%, rgba(15, 15, 20, 0.95) 100%)',
                }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        {criticalAlerts.length > 0 && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-white font-mono text-sm font-bold">Sybil Attack Detection</h3>
                        <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                          {sybilAlerts.length} flagged {sybilAlerts.length === 1 ? 'affiliate' : 'affiliates'}
                          {criticalAlerts.length > 0 && <span className="text-red-400 ml-2">{criticalAlerts.length} critical</span>}
                          {highAlerts.length > 0 && <span className="text-amber-400 ml-2">{highAlerts.length} high</span>}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSybilPanel(!showSybilPanel)}
                      className="text-zinc-500 hover:text-white transition-colors p-1"
                    >
                      {showSybilPanel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showSybilPanel && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 mt-2">
                          {sybilAlerts.map(alert => {
                            const riskColor = getRiskColor(alert.risk_score);
                            const riskLabel = getRiskLabel(alert.risk_score);
                            const tier = TIER_LABELS[alert.manual_tier || 1] || TIER_LABELS[1];
                            return (
                              <motion.div
                                key={alert.affiliate_id}
                                whileHover={{ scale: 1.005 }}
                                onClick={() => setSelectedSybilAlert(alert)}
                                className="flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all hover:bg-white/[0.02]"
                                style={{ borderColor: `${riskColor}20`, background: `${riskColor}05` }}
                              >
                                <div className="flex items-center gap-2 shrink-0">
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold"
                                    style={{ background: `${riskColor}15`, border: `1px solid ${riskColor}30`, color: riskColor }}
                                  >
                                    {alert.risk_score}
                                  </div>
                                  <div
                                    className="px-1.5 py-0.5 rounded font-mono font-bold"
                                    style={{ fontSize: '9px', background: `${riskColor}20`, color: riskColor }}
                                  >
                                    {riskLabel}
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-zinc-300 font-mono text-sm truncate">
                                      {alert.wallet_address.slice(0, 8)}...{alert.wallet_address.slice(-4)}
                                    </p>
                                    <span
                                      className="font-mono px-1.5 py-0.5 rounded-full border"
                                      style={{ fontSize: '9px', color: tier.color, borderColor: `${tier.color}40`, background: `${tier.color}10` }}
                                    >
                                      {tier.label}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-zinc-600 font-mono mt-0.5" style={{ fontSize: '10px' }}>
                                    <span>{alert.total_referrals} refs</span>
                                    <span className="text-amber-400">{alert.single_ticket_referrals} single-ticket</span>
                                    <span className="text-red-400">{alert.zero_ticket_referrals} ghost</span>
                                    {alert.rapid_signups.length > 0 && (
                                      <span className="text-amber-400 flex items-center gap-0.5">
                                        <Zap className="w-2.5 h-2.5" />{alert.rapid_signups.length} rapid
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <p className="font-mono text-sm font-bold" style={{ color: riskColor }}>
                                    {alert.single_ticket_rate}%
                                  </p>
                                  <p className="text-zinc-600 font-mono" style={{ fontSize: '9px' }}>1-ticket rate</p>
                                </div>

                                <div className="shrink-0">
                                  <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    <div
                                      className="h-full rounded-full"
                                      style={{ width: `${alert.risk_score}%`, background: riskColor }}
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

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
                      <th className="text-center py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Risk</th>
                      <th className="text-center py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Network</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((aff, i) => {
                      const tier = TIER_LABELS[aff.manual_tier || 1] || TIER_LABELS[1];
                      const isFlagged = sybilWalletSet.has(aff.wallet_address);
                      const riskScore = sybilScoreMap[aff.wallet_address] || 0;
                      const riskColor = isFlagged ? getRiskColor(riskScore) : undefined;
                      return (
                        <motion.tr
                          key={aff.affiliate_id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors"
                          style={isFlagged ? { background: `${riskColor}05` } : undefined}
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
                            <div className="flex items-center gap-2">
                              {isFlagged && (
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: riskColor }} />
                              )}
                              <div>
                                <p className="text-zinc-300 font-mono text-sm">
                                  {aff.wallet_address.slice(0, 6)}...{aff.wallet_address.slice(-4)}
                                </p>
                                <p className="text-zinc-600 font-mono text-xs">{aff.referral_code}</p>
                              </div>
                            </div>
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
                            {isFlagged ? (
                              <button
                                onClick={() => {
                                  const alert = sybilAlerts.find(a => a.wallet_address === aff.wallet_address);
                                  if (alert) setSelectedSybilAlert(alert);
                                }}
                                className="font-mono text-xs font-bold px-2 py-1 rounded transition-colors"
                                style={{
                                  color: riskColor,
                                  background: `${riskColor}15`,
                                  border: `1px solid ${riskColor}30`,
                                }}
                              >
                                {riskScore}
                              </button>
                            ) : (
                              <span className="text-zinc-700 font-mono text-xs">--</span>
                            )}
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
              {selectedSybilAlert && (
                <SybilDetailModal
                  alert={selectedSybilAlert}
                  onClose={() => setSelectedSybilAlert(null)}
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
}
