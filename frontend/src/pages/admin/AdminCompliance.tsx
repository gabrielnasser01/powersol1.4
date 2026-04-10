import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ShieldAlert, ShieldCheck, Search, X, AlertTriangle,
  FileText, Clock, CheckCircle, XCircle, Eye, UserX,
  ChevronDown, ChevronUp, Plus, ExternalLink, Fingerprint,
  Ban, Wallet, Activity, Filter,
} from 'lucide-react';
import {
  adminService,
  ComplianceStats,
  ComplianceWarning,
  ComplianceReport,
  OfacCheck,
  WalletComplianceSummary,
} from '../../services/adminService';
import { useWallet } from '../../contexts/WalletContext';
import { AdminLayout } from './AdminLayout';
import { AdminGuard } from './AdminGuard';
import { useAdminAutoRefresh } from '../../hooks/useAdminAutoRefresh';

type ComplianceTab = 'overview' | 'ofac' | 'warnings' | 'reports' | 'age';

const SEVERITY_CONFIG: Record<string, { bg: string; border: string; color: string }> = {
  critical: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' },
  high: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' },
  medium: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)', color: '#3b82f6' },
  low: { bg: 'rgba(39, 39, 42, 0.5)', border: 'rgba(63, 63, 70, 0.5)', color: '#71717a' },
};

const STATUS_CONFIG: Record<string, { bg: string; border: string; color: string }> = {
  open: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' },
  investigating: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b' },
  resolved: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' },
  dismissed: { bg: 'rgba(113, 113, 122, 0.1)', border: 'rgba(113, 113, 122, 0.3)', color: '#71717a' },
};

const COMPLIANCE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  clear: { label: 'Clear', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)' },
  warning: { label: 'Warning', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' },
  flagged: { label: 'Flagged', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' },
  banned: { label: 'Banned', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.15)', border: 'rgba(220, 38, 38, 0.4)' },
  under_review: { label: 'Under Review', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)' },
};

function SeverityBadge({ severity }: { severity: string }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.low;
  return (
    <span
      className="font-mono text-xs px-2 py-0.5 rounded-full"
      style={{ background: config.bg, border: `1px solid ${config.border}`, color: config.color }}
    >
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  return (
    <span
      className="font-mono text-xs px-2 py-0.5 rounded-full"
      style={{ background: config.bg, border: `1px solid ${config.border}`, color: config.color }}
    >
      {status}
    </span>
  );
}

function ComplianceStatusBadge({ status }: { status: string }) {
  const config = COMPLIANCE_STATUS_CONFIG[status] || COMPLIANCE_STATUS_CONFIG.clear;
  return (
    <span
      className="font-mono text-xs px-2 py-0.5 rounded-full"
      style={{ background: config.bg, border: `1px solid ${config.border}`, color: config.color }}
    >
      {config.label}
    </span>
  );
}

function WalletShort({ address }: { address: string }) {
  return (
    <span className="text-zinc-300 font-mono text-xs">
      {address.slice(0, 6)}...{address.slice(-4)}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 shrink-0" style={{ color }} />
        <span className="text-zinc-500 font-mono truncate" style={{ fontSize: '10px' }}>{label}</span>
      </div>
      <p className="font-mono text-lg sm:text-2xl font-bold truncate" style={{ color }}>{value}</p>
    </div>
  );
}

function OfacCheckPanel({ onRefresh }: { onRefresh: () => void }) {
  const [walletInput, setWalletInput] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ wallet_address: string; is_flagged: boolean; checked_at: string } | null>(null);
  const [history, setHistory] = useState<OfacCheck[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    adminService.getOfacCheckHistory().then(h => {
      setHistory(h);
      setLoadingHistory(false);
    });
  }, []);

  const handleCheck = async () => {
    if (!walletInput.trim()) return;
    setChecking(true);
    setResult(null);
    try {
      const res = await adminService.runOfacCheck(walletInput.trim());
      setResult(res);
      const h = await adminService.getOfacCheckHistory();
      setHistory(h);
      onRefresh();
    } catch (err) {
      console.error('OFAC check failed:', err);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800/60 p-4" style={{ background: 'rgba(15,17,23,0.9)' }}>
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span className="text-white font-mono text-sm font-bold">OFAC Sanctions Check</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
          <input
            type="text"
            value={walletInput}
            onChange={e => setWalletInput(e.target.value)}
            placeholder="Enter wallet address..."
            className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-red-500/50 min-w-0"
            onKeyDown={e => e.key === 'Enter' && handleCheck()}
          />
          <button
            onClick={handleCheck}
            disabled={checking || !walletInput.trim()}
            className="px-4 py-2.5 rounded-lg font-mono text-sm border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {checking ? 'Checking...' : 'OFAC Check'}
          </button>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`rounded-lg border p-4 mb-4 ${
                result.is_flagged
                  ? 'border-red-500/30 bg-red-500/5'
                  : 'border-emerald-500/30 bg-emerald-500/5'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {result.is_flagged ? (
                  <XCircle className="w-5 h-5 text-red-400" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                )}
                <span className={`font-mono text-sm font-bold ${result.is_flagged ? 'text-red-400' : 'text-emerald-400'}`}>
                  {result.is_flagged ? 'MATCH FOUND - SANCTIONED WALLET' : 'No Match - Wallet Clear'}
                </span>
              </div>
              <p className="text-zinc-400 font-mono text-xs break-all">{result.wallet_address}</p>
              <p className="text-zinc-600 font-mono mt-1" style={{ fontSize: '10px' }}>
                Checked: {new Date(result.checked_at).toLocaleString()}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
          Checks wallet against OFAC SDN (Specially Designated Nationals) list. Flagged wallets are automatically marked and a critical warning is issued.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800/60 overflow-hidden" style={{ background: 'rgba(15,17,23,0.9)' }}>
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-white font-mono text-sm font-bold">Check History</span>
            <span className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
              {history.length} checks
            </span>
          </div>
        </div>
        {loadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="p-6 text-center text-zinc-600 font-mono text-sm">No checks performed yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Wallet</th>
                  <th className="text-center py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Result</th>
                  <th className="text-left py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Source</th>
                  <th className="text-left py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Checked By</th>
                  <th className="text-right py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map(check => (
                  <tr key={check.id} className={`border-b border-zinc-800/50 ${check.is_flagged ? 'bg-red-500/5' : ''}`}>
                    <td className="py-2.5 px-4"><WalletShort address={check.wallet_address} /></td>
                    <td className="py-2.5 px-4 text-center">
                      {check.is_flagged ? (
                        <span className="text-red-400 font-mono text-xs px-2 py-0.5 rounded-full border border-red-500/30 bg-red-500/10">FLAGGED</span>
                      ) : (
                        <span className="text-emerald-400 font-mono text-xs px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10">CLEAR</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-500 font-mono text-xs">{check.data_source}</td>
                    <td className="py-2.5 px-4">{check.checked_by ? <WalletShort address={check.checked_by} /> : <span className="text-zinc-700">--</span>}</td>
                    <td className="py-2.5 px-4 text-right text-zinc-500 font-mono text-xs">{new Date(check.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function WarningModal({ onSubmit, onClose }: {
  onSubmit: () => void;
  onClose: () => void;
}) {
  const [wallet, setWallet] = useState('');
  const [warningType, setWarningType] = useState('suspicious_activity');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!wallet.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await adminService.issueWarning(wallet.trim(), warningType, severity, description.trim());
      onSubmit();
    } catch (err) {
      console.error('Failed to issue warning:', err);
    } finally {
      setSubmitting(false);
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
        className="relative w-full max-w-lg rounded-xl border border-zinc-800 p-6"
        style={{ background: '#0f1117' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-white font-mono text-sm font-bold">Issue Compliance Warning</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-zinc-500 font-mono text-xs block mb-1.5">Target Wallet</label>
            <input
              type="text"
              value={wallet}
              onChange={e => setWallet(e.target.value)}
              placeholder="Wallet address..."
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 font-mono text-xs block mb-1.5">Warning Type</label>
              <select
                value={warningType}
                onChange={e => setWarningType(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/50"
              >
                <option value="suspicious_activity">Suspicious Activity</option>
                <option value="ofac_match">OFAC Match</option>
                <option value="age_verification">Age Verification</option>
                <option value="terms_violation">Terms Violation</option>
                <option value="fraud_attempt">Fraud Attempt</option>
                <option value="bot_detection">Bot Detection</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-zinc-500 font-mono text-xs block mb-1.5">Severity</label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-zinc-500 font-mono text-xs block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the compliance concern..."
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-sm rounded-lg px-3 py-2 h-24 resize-none focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !wallet.trim() || !description.trim()}
            className="w-full py-2.5 rounded-lg font-mono text-sm border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Issuing...' : 'Issue Warning'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReportModal({ onSubmit, onClose }: {
  onSubmit: () => void;
  onClose: () => void;
}) {
  const [wallet, setWallet] = useState('');
  const [reportType, setReportType] = useState('compliance_review');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!wallet.trim() || !title.trim() || !details.trim()) return;
    setSubmitting(true);
    try {
      await adminService.createReport({
        wallet_address: wallet.trim(),
        report_type: reportType,
        title: title.trim(),
        details: details.trim(),
        priority,
      });
      onSubmit();
    } catch (err) {
      console.error('Failed to create report:', err);
    } finally {
      setSubmitting(false);
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
        className="relative w-full max-w-lg rounded-xl border border-zinc-800 p-6 max-h-[85vh] overflow-y-auto"
        style={{ background: '#0f1117' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h3 className="text-white font-mono text-sm font-bold">Create Compliance Report</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-zinc-500 font-mono text-xs block mb-1.5">Target Wallet</label>
            <input
              type="text"
              value={wallet}
              onChange={e => setWallet(e.target.value)}
              placeholder="Wallet address..."
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 font-mono text-xs block mb-1.5">Report Type</label>
              <select
                value={reportType}
                onChange={e => setReportType(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500/50"
              >
                <option value="compliance_review">Compliance Review</option>
                <option value="sanctions_match">Sanctions Match</option>
                <option value="suspicious_pattern">Suspicious Pattern</option>
                <option value="fraud_investigation">Fraud Investigation</option>
                <option value="terms_violation">Terms Violation</option>
                <option value="age_verification_issue">Age Verification Issue</option>
              </select>
            </div>
            <div>
              <label className="text-zinc-500 font-mono text-xs block mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-zinc-500 font-mono text-xs block mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Brief title..."
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div>
            <label className="text-zinc-500 font-mono text-xs block mb-1.5">Details</label>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Full report details..."
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-sm rounded-lg px-3 py-2 h-32 resize-none focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !wallet.trim() || !title.trim() || !details.trim()}
            className="w-full py-2.5 rounded-lg font-mono text-sm border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Report'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function WalletLookupModal({ onClose }: { onClose: () => void }) {
  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<WalletComplianceSummary | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const handleLookup = async () => {
    if (!wallet.trim()) return;
    setLoading(true);
    setSummary(null);
    try {
      const s = await adminService.getWalletComplianceSummary(wallet.trim());
      setSummary(s);
    } catch (err) {
      console.error('Lookup failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!wallet.trim()) return;
    setStatusUpdating(true);
    try {
      await adminService.updateComplianceStatus(wallet.trim(), newStatus);
      handleLookup();
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setStatusUpdating(false);
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
        className="relative w-full max-w-2xl rounded-xl border border-zinc-800 p-6 max-h-[85vh] overflow-y-auto"
        style={{ background: '#0f1117' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-zinc-400" />
            <h3 className="text-white font-mono text-sm font-bold">Wallet Compliance Lookup</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={wallet}
            onChange={e => setWallet(e.target.value)}
            placeholder="Enter wallet address..."
            className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-zinc-600"
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
          />
          <button
            onClick={handleLookup}
            disabled={loading || !wallet.trim()}
            className="px-4 py-2.5 rounded-lg font-mono text-sm border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Lookup'}
          </button>
        </div>

        {summary && (
          <div className="space-y-4">
            {summary.user ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-zinc-300 font-mono text-sm break-all">{summary.user.wallet_address}</p>
                    {summary.user.display_name && <p className="text-zinc-600 font-mono text-xs">{summary.user.display_name}</p>}
                  </div>
                  <ComplianceStatusBadge status={summary.user.compliance_status} />
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Age Verified</p>
                    <p className={`font-mono text-sm font-bold ${summary.user.age_verified ? 'text-emerald-400' : 'text-zinc-600'}`}>
                      {summary.user.age_verified ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>OFAC Status</p>
                    <p className={`font-mono text-sm font-bold ${summary.user.ofac_flagged ? 'text-red-400' : 'text-emerald-400'}`}>
                      {summary.user.ofac_flagged ? 'Flagged' : 'Clear'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Banned</p>
                    <p className={`font-mono text-sm font-bold ${summary.user.is_banned ? 'text-red-400' : 'text-emerald-400'}`}>
                      {summary.user.is_banned ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-zinc-500 font-mono text-xs mb-2">Update Status:</p>
                  <div className="flex gap-2 flex-wrap">
                    {['clear', 'warning', 'flagged', 'under_review', 'banned'].map(s => {
                      const cfg = COMPLIANCE_STATUS_CONFIG[s];
                      const isActive = summary.user?.compliance_status === s;
                      return (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          disabled={statusUpdating || isActive}
                          className="px-3 py-1.5 rounded-lg font-mono text-xs border transition-colors disabled:opacity-40"
                          style={{
                            borderColor: isActive ? cfg.color : 'rgba(63, 63, 70, 0.5)',
                            color: cfg.color,
                            background: isActive ? cfg.bg : 'transparent',
                          }}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
                <p className="text-zinc-500 font-mono text-sm">User not found</p>
              </div>
            )}

            {summary.warnings.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <p className="text-amber-400 font-mono text-xs font-bold mb-3">Warnings ({summary.warnings.length})</p>
                <div className="space-y-2">
                  {summary.warnings.slice(0, 5).map(w => (
                    <div key={w.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={w.severity} />
                        <span className="text-zinc-400 font-mono text-xs">{w.warning_type}</span>
                      </div>
                      <span className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>{new Date(w.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.reports.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <p className="text-cyan-400 font-mono text-xs font-bold mb-3">Reports ({summary.reports.length})</p>
                <div className="space-y-2">
                  {summary.reports.slice(0, 5).map(r => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={r.status} />
                        <span className="text-zinc-400 font-mono text-xs">{r.title}</span>
                      </div>
                      <SeverityBadge severity={r.priority} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.ofac_checks.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <p className="text-red-400 font-mono text-xs font-bold mb-3">OFAC Checks ({summary.ofac_checks.length})</p>
                <div className="space-y-2">
                  {summary.ofac_checks.map(c => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                      <span className={`font-mono text-xs ${c.is_flagged ? 'text-red-400' : 'text-emerald-400'}`}>
                        {c.is_flagged ? 'FLAGGED' : 'Clear'}
                      </span>
                      <span className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.age_verification && (
              <div className="bg-zinc-900/50 border border-emerald-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                  <p className="text-emerald-400 font-mono text-xs font-bold">Age Verified</p>
                </div>
                <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>
                  Verified: {new Date(summary.age_verification.verified_at).toLocaleString()}
                </p>
                <p className="text-zinc-600 font-mono mt-1" style={{ fontSize: '10px' }}>
                  Signature: {summary.age_verification.signature.slice(0, 20)}...
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function WarningsPanel({ onRefresh }: { onRefresh: () => void }) {
  const [warnings, setWarnings] = useState<ComplianceWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  const loadWarnings = useCallback(async () => {
    try {
      const w = await adminService.getComplianceWarnings(undefined, showResolved);
      setWarnings(w);
    } catch (err) {
      console.error('Failed to load warnings:', err);
    } finally {
      setLoading(false);
    }
  }, [showResolved]);

  useEffect(() => { loadWarnings(); }, [loadWarnings]);

  const handleResolve = async (warningId: string) => {
    setResolving(warningId);
    try {
      await adminService.resolveWarning(warningId);
      await loadWarnings();
      onRefresh();
    } catch (err) {
      console.error('Failed to resolve:', err);
    } finally {
      setResolving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-white font-mono text-sm font-bold">Compliance Warnings</span>
          <span className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>{warnings.length} entries</span>
        </div>
        <button
          onClick={() => setShowResolved(!showResolved)}
          className={`flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-lg border transition-all ${
            showResolved
              ? 'border-zinc-600 bg-zinc-800 text-zinc-300'
              : 'border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Filter className="w-3 h-3" />
          {showResolved ? 'Showing All' : 'Active Only'}
        </button>
      </div>

      {warnings.length === 0 ? (
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-6 text-center">
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-emerald-300 font-mono text-sm">No active warnings</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800/60 overflow-hidden" style={{ background: 'rgba(15,17,23,0.9)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Wallet</th>
                  <th className="text-left py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Type</th>
                  <th className="text-center py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Severity</th>
                  <th className="text-left py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Description</th>
                  <th className="text-center py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Status</th>
                  <th className="text-right py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Date</th>
                  <th className="text-center py-2 px-3 text-zinc-500 font-mono text-xs font-normal">Action</th>
                </tr>
              </thead>
              <tbody>
                {warnings.map(w => (
                  <tr key={w.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <td className="py-2.5 px-4"><WalletShort address={w.wallet_address} /></td>
                    <td className="py-2.5 px-4 text-zinc-400 font-mono text-xs">{w.warning_type.replace(/_/g, ' ')}</td>
                    <td className="py-2.5 px-4 text-center"><SeverityBadge severity={w.severity} /></td>
                    <td className="py-2.5 px-4 text-zinc-400 font-mono text-xs max-w-[200px] truncate">{w.description}</td>
                    <td className="py-2.5 px-4 text-center">
                      {w.resolved ? (
                        <span className="text-emerald-400 font-mono text-xs px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10">resolved</span>
                      ) : (
                        <span className="text-amber-400 font-mono text-xs px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10">active</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right text-zinc-500 font-mono text-xs">{new Date(w.created_at).toLocaleDateString()}</td>
                    <td className="py-2.5 px-3 text-center">
                      {!w.resolved && (
                        <button
                          onClick={() => handleResolve(w.id)}
                          disabled={resolving === w.id}
                          className="text-emerald-500 font-mono text-xs px-2 py-1 rounded border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                        >
                          {resolving === w.id ? '...' : 'Resolve'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsPanel({ onRefresh }: { onRefresh: () => void }) {
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      const r = await adminService.getComplianceReports(undefined, statusFilter);
      setReports(r);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleStatusUpdate = async (reportId: string, newStatus: string) => {
    setUpdatingId(reportId);
    try {
      await adminService.updateReport(reportId, { status: newStatus });
      await loadReports();
      onRefresh();
    } catch (err) {
      console.error('Failed to update:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-white font-mono text-sm font-bold">Reports</span>
          <span className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>{reports.length}</span>
        </div>
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {['all', 'open', 'investigating', 'resolved', 'dismissed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`font-mono text-xs px-2 sm:px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap shrink-0 ${
                statusFilter === s
                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                  : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-zinc-800/60 p-6 text-center" style={{ background: 'rgba(15,17,23,0.9)' }}>
          <p className="text-zinc-500 font-mono text-sm">No reports found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-zinc-800/60 p-4"
              style={{ background: 'rgba(15,17,23,0.9)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={report.status} />
                    <SeverityBadge severity={report.priority} />
                    <span className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>{report.report_type.replace(/_/g, ' ')}</span>
                  </div>
                  <h4 className="text-zinc-200 font-mono text-sm font-bold">{report.title}</h4>
                </div>
                <span className="text-zinc-600 font-mono shrink-0 ml-3" style={{ fontSize: '10px' }}>
                  {new Date(report.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-lg p-3 mb-3">
                <p className="text-zinc-400 font-mono text-xs whitespace-pre-wrap">{report.details}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <WalletShort address={report.wallet_address} />
                  <a
                    href={`https://solscan.io/account/${report.wallet_address}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {report.status !== 'resolved' && report.status !== 'dismissed' && (
                  <div className="flex gap-2">
                    {report.status === 'open' && (
                      <button
                        onClick={() => handleStatusUpdate(report.id, 'investigating')}
                        disabled={updatingId === report.id}
                        className="text-amber-400 font-mono text-xs px-2 py-1 rounded border border-amber-500/30 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                      >
                        Investigate
                      </button>
                    )}
                    <button
                      onClick={() => handleStatusUpdate(report.id, 'resolved')}
                      disabled={updatingId === report.id}
                      className="text-emerald-400 font-mono text-xs px-2 py-1 rounded border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(report.id, 'dismissed')}
                      disabled={updatingId === report.id}
                      className="text-zinc-500 font-mono text-xs px-2 py-1 rounded border border-zinc-700 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>

              {report.resolution_notes && (
                <div className="mt-3 p-2 rounded-lg border border-emerald-500/15 bg-emerald-500/5">
                  <p className="text-emerald-400 font-mono" style={{ fontSize: '10px' }}>Resolution: {report.resolution_notes}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgeVerificationPanel() {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getAgeVerifications().then(v => {
      setVerifications(v);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800/60 p-4" style={{ background: 'rgba(15,17,23,0.9)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Fingerprint className="w-4 h-4 text-emerald-400" />
          <span className="text-white font-mono text-sm font-bold">Age Verification System</span>
        </div>
        <p className="text-zinc-400 font-mono text-xs mb-3">
          Users must sign a message with their wallet confirming they are 18+ to participate. The signature serves as a cryptographic attestation.
        </p>
        <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-lg p-3">
          <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Message Template:</p>
          <p className="text-zinc-300 font-mono text-xs mt-1">
            "I confirm that I am at least 18 years of age and agree to the Terms of Service of PowerSOL. Wallet: [address] | Timestamp: [ISO date]"
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800/60 overflow-hidden" style={{ background: 'rgba(15,17,23,0.9)' }}>
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-white font-mono text-sm font-bold">Verification Records</span>
            <span className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>{verifications.length} records</span>
          </div>
        </div>
        {verifications.length === 0 ? (
          <div className="p-6 text-center text-zinc-600 font-mono text-sm">No verifications recorded yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Wallet</th>
                  <th className="text-left py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Signature</th>
                  <th className="text-right py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Verified At</th>
                </tr>
              </thead>
              <tbody>
                {verifications.map((v: any) => (
                  <tr key={v.id} className="border-b border-zinc-800/50">
                    <td className="py-2.5 px-4"><WalletShort address={v.wallet_address} /></td>
                    <td className="py-2.5 px-4 text-zinc-500 font-mono text-xs">{v.signature.slice(0, 24)}...</td>
                    <td className="py-2.5 px-4 text-right text-zinc-500 font-mono text-xs">{new Date(v.verified_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminCompliance() {
  const { publicKey } = useWallet();
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ComplianceTab>('overview');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showLookupModal, setShowLookupModal] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const s = await adminService.getComplianceStats();
      setStats(s);
    } catch (err) {
      console.error('Failed to load compliance stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const { lastRefresh } = useAdminAutoRefresh(loadStats);

  useEffect(() => { loadStats(); }, [loadStats]);

  const tabs: { key: ComplianceTab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: Shield },
    { key: 'ofac', label: 'OFAC Check', icon: ShieldAlert },
    { key: 'warnings', label: 'Warnings', icon: AlertTriangle },
    { key: 'reports', label: 'Reports', icon: FileText },
    { key: 'age', label: 'Age Verification', icon: Fingerprint },
  ];

  return (
    <AdminGuard>
      <AdminLayout>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg font-mono text-xs border transition-all whitespace-nowrap shrink-0 ${
                          isActive
                            ? 'border-red-500/50 bg-red-500/10 text-red-400'
                            : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                  <button
                    onClick={() => setShowLookupModal(true)}
                    className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg font-mono text-xs border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Lookup</span>
                  </button>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-zinc-600 font-mono text-xs hidden sm:inline">
                    LIVE {lastRefresh.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            {activeTab === 'overview' && stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <StatCard label="Active Warnings" value={stats.activeWarnings} icon={AlertTriangle} color="#f59e0b" />
                  <StatCard label="Open Reports" value={stats.openReports} icon={FileText} color="#3b82f6" />
                  <StatCard label="OFAC Flagged" value={stats.ofacFlagged} icon={ShieldAlert} color="#ef4444" />
                  <StatCard label="Age Verified" value={`${stats.ageVerified}/${stats.totalUsers}`} icon={Fingerprint} color="#10b981" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <StatCard label="Total Warnings" value={stats.totalWarnings} icon={AlertTriangle} color="#71717a" />
                  <StatCard label="Total Reports" value={stats.totalReports} icon={FileText} color="#71717a" />
                  <StatCard label="OFAC Checks" value={stats.totalOfacChecks} icon={Shield} color="#71717a" />
                  <StatCard label="Total Users" value={stats.totalUsers} icon={Activity} color="#71717a" />
                </div>

                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowWarningModal(true)}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-lg font-mono text-xs sm:text-sm border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Issue</span> Warning
                  </button>
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-lg font-mono text-xs sm:text-sm border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Create</span> Report
                  </button>
                </div>

                {stats.flaggedUsers.length > 0 && (
                  <div className="rounded-xl border border-red-500/20 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.02) 0%, rgba(15, 15, 20, 0.95) 100%)' }}>
                    <div className="p-4 border-b border-zinc-800">
                      <div className="flex items-center gap-2">
                        <UserX className="w-4 h-4 text-red-400" />
                        <span className="text-white font-mono text-sm font-bold">Flagged Users</span>
                        <span className="text-red-400 font-mono text-xs px-2 py-0.5 rounded-full border border-red-500/30 bg-red-500/10">
                          {stats.flaggedUsers.length}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-zinc-800">
                            <th className="text-left py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Wallet</th>
                            <th className="text-center py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Status</th>
                            <th className="text-center py-2 px-4 text-zinc-500 font-mono text-xs font-normal">OFAC</th>
                            <th className="text-center py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Age</th>
                            <th className="text-center py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Banned</th>
                            <th className="text-right py-2 px-4 text-zinc-500 font-mono text-xs font-normal">Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.flaggedUsers.map(u => (
                            <tr key={u.wallet_address} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                              <td className="py-2.5 px-4">
                                <WalletShort address={u.wallet_address} />
                                {u.display_name && <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>{u.display_name}</p>}
                              </td>
                              <td className="py-2.5 px-4 text-center"><ComplianceStatusBadge status={u.compliance_status} /></td>
                              <td className="py-2.5 px-4 text-center">
                                {u.ofac_flagged ? (
                                  <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 text-zinc-700 mx-auto" />
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                {u.age_verified ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-zinc-700 mx-auto" />
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                {u.is_banned ? (
                                  <Ban className="w-4 h-4 text-red-400 mx-auto" />
                                ) : (
                                  <span className="text-zinc-700 font-mono text-xs">--</span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-right text-zinc-500 font-mono text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {stats.recentWarnings.length > 0 && (
                  <div className="rounded-xl border border-zinc-800/60 p-4" style={{ background: 'rgba(15,17,23,0.9)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span className="text-white font-mono text-sm font-bold">Recent Warnings</span>
                    </div>
                    <div className="space-y-2">
                      {stats.recentWarnings.slice(0, 5).map(w => (
                        <div key={w.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0 gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
                            <WalletShort address={w.wallet_address} />
                            <SeverityBadge severity={w.severity} />
                            <span className="text-zinc-500 font-mono text-xs hidden sm:inline">{w.warning_type.replace(/_/g, ' ')}</span>
                          </div>
                          <span className="text-zinc-600 font-mono shrink-0" style={{ fontSize: '10px' }}>{new Date(w.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.recentReports.length > 0 && (
                  <div className="rounded-xl border border-zinc-800/60 p-4" style={{ background: 'rgba(15,17,23,0.9)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span className="text-white font-mono text-sm font-bold">Recent Reports</span>
                    </div>
                    <div className="space-y-2">
                      {stats.recentReports.slice(0, 5).map(r => (
                        <div key={r.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0 gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
                            <WalletShort address={r.wallet_address} />
                            <StatusBadge status={r.status} />
                            <span className="text-zinc-300 font-mono text-xs truncate hidden sm:inline">{r.title}</span>
                          </div>
                          <SeverityBadge severity={r.priority} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ofac' && <OfacCheckPanel onRefresh={loadStats} />}
            {activeTab === 'warnings' && <WarningsPanel onRefresh={loadStats} />}
            {activeTab === 'reports' && <ReportsPanel onRefresh={loadStats} />}
            {activeTab === 'age' && <AgeVerificationPanel />}

            <AnimatePresence>
              {showWarningModal && (
                <WarningModal
                  onSubmit={() => { setShowWarningModal(false); loadStats(); }}
                  onClose={() => setShowWarningModal(false)}
                />
              )}
              {showReportModal && (
                <ReportModal
                  onSubmit={() => { setShowReportModal(false); loadStats(); }}
                  onClose={() => setShowReportModal(false)}
                />
              )}
              {showLookupModal && (
                <WalletLookupModal onClose={() => setShowLookupModal(false)} />
              )}
            </AnimatePresence>
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
}
