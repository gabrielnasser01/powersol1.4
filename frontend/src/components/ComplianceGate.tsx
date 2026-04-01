import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, ShieldX, Loader2 } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { complianceService, ComplianceStatus } from '../services/complianceService';
import { AgeVerificationGate } from './AgeVerificationGate';

interface ComplianceGateProps {
  children: React.ReactNode;
  onBlocked?: (reason: string) => void;
}

export function ComplianceGate({ children, onBlocked }: ComplianceGateProps) {
  const { publicKey, connected } = useWallet();
  const [status, setStatus] = useState<ComplianceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [riskChecking, setRiskChecking] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!publicKey) return;
    try {
      setLoading(true);
      const s = await complianceService.getComplianceStatus(publicKey);
      setStatus(s);

      if (s.is_blocked || s.is_sanctioned) {
        const reason = s.block_reason || 'Wallet blocked by compliance';
        setBlocked(reason);
        onBlocked?.(reason);
      } else if (!s.age_verified) {
        setShowAgeGate(true);
      } else if (s.risk_level === 'unchecked') {
        setRiskChecking(true);
        const result = await complianceService.checkWalletRisk(publicKey);
        complianceService.clearCache(publicKey);
        if (!result.allowed) {
          setBlocked(result.reason || 'Risk check failed');
          onBlocked?.(result.reason || 'Risk check failed');
        }
        setRiskChecking(false);
      }
    } catch {
      // allow through on error
    } finally {
      setLoading(false);
    }
  }, [publicKey, onBlocked]);

  useEffect(() => {
    if (connected && publicKey) {
      loadStatus();
    } else {
      setStatus(null);
      setBlocked(null);
      setLoading(false);
    }
  }, [connected, publicKey, loadStatus]);

  if (!connected || !publicKey) {
    return <>{children}</>;
  }

  if (loading || riskChecking) {
    return (
      <div className="rounded-xl border border-zinc-800/80 p-6" style={{ background: 'rgba(15,17,23,0.9)' }}>
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
          <div>
            <p className="text-zinc-300 font-mono text-sm">
              {riskChecking ? 'Running wallet risk check...' : 'Checking compliance status...'}
            </p>
            <p className="text-zinc-600 font-mono text-xs mt-0.5">This only takes a moment</p>
          </div>
        </div>
      </div>
    );
  }

  if (blocked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-red-500/30 p-6"
        style={{ background: 'linear-gradient(135deg, rgba(127,29,29,0.15) 0%, rgba(15,17,23,0.9) 100%)' }}
      >
        <div className="flex items-start gap-3">
          <ShieldX className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-mono text-sm font-bold mb-1">Access Restricted</p>
            <p className="text-zinc-400 text-sm">{blocked}</p>
            <p className="text-zinc-600 text-xs mt-2 font-mono">
              Contact support if you believe this is an error.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (showAgeGate) {
    return (
      <>
        <div className="rounded-xl border border-amber-500/30 p-6" style={{ background: 'rgba(15,17,23,0.9)' }}>
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-400 font-mono text-sm font-bold mb-1">Age Verification Required</p>
              <p className="text-zinc-400 text-sm mb-3">
                You must verify your age before interacting with lotteries.
              </p>
              <button
                onClick={() => setShowAgeGate(true)}
                className="px-4 py-2 rounded-lg font-mono text-xs font-bold
                  bg-amber-500/10 border border-amber-500/30 text-amber-400
                  hover:bg-amber-500/20 transition-all"
              >
                Verify Now
              </button>
            </div>
          </div>
        </div>
        <AgeVerificationGate
          onVerified={() => {
            setShowAgeGate(false);
            complianceService.clearCache(publicKey);
            loadStatus();
          }}
          onClose={() => setShowAgeGate(false)}
        />
      </>
    );
  }

  return <>{children}</>;
}

export function ComplianceBadge({ wallet }: { wallet: string }) {
  const [status, setStatus] = useState<ComplianceStatus | null>(null);

  useEffect(() => {
    complianceService.getComplianceStatus(wallet).then(setStatus).catch(() => {});
  }, [wallet]);

  if (!status) return null;

  const isFullyCompliant = status.age_verified && status.risk_level === 'clear' && !status.is_blocked;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs border ${
      isFullyCompliant
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        : status.is_blocked
        ? 'bg-red-500/10 border-red-500/30 text-red-400'
        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
    }`}>
      {isFullyCompliant ? (
        <><ShieldCheck className="w-3 h-3" /> Compliant</>
      ) : status.is_blocked ? (
        <><ShieldX className="w-3 h-3" /> Blocked</>
      ) : (
        <><ShieldAlert className="w-3 h-3" /> Pending</>
      )}
    </div>
  );
}
