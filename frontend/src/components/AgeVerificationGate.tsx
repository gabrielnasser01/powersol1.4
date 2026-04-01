import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, AlertTriangle, Loader2, X, Ligature as FileSignature } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { complianceService } from '../services/complianceService';

interface AgeVerificationGateProps {
  onVerified: () => void;
  onClose: () => void;
}

export function AgeVerificationGate({ onVerified, onClose }: AgeVerificationGateProps) {
  const { publicKey, connected } = useWallet();
  const [step, setStep] = useState<'prompt' | 'signing' | 'checking' | 'success' | 'error'>('checking');
  const [errorMsg, setErrorMsg] = useState('');

  const checkExisting = useCallback(async () => {
    if (!publicKey) return;
    try {
      setStep('checking');
      const verified = await complianceService.checkAgeVerification(publicKey);
      if (verified) {
        setStep('success');
        setTimeout(onVerified, 600);
      } else {
        setStep('prompt');
      }
    } catch {
      setStep('prompt');
    }
  }, [publicKey, onVerified]);

  useEffect(() => {
    if (connected && publicKey) {
      checkExisting();
    }
  }, [connected, publicKey, checkExisting]);

  const handleSign = async () => {
    if (!publicKey) return;

    try {
      setStep('signing');
      setErrorMsg('');

      const message = complianceService.getAgeVerificationMessage(publicKey);
      const encodedMessage = new TextEncoder().encode(message);

      let signature: Uint8Array | null = null;
      const phantom = (window as any).phantom?.solana || (window as any).solana;
      const solflare = (window as any).solflare;

      if (phantom?.isPhantom && phantom.signMessage) {
        const result = await phantom.signMessage(encodedMessage, 'utf8');
        signature = result.signature || result;
      } else if (solflare?.isSolflare && solflare.signMessage) {
        signature = await solflare.signMessage(encodedMessage, 'utf8');
      }

      if (!signature) {
        throw new Error('Wallet does not support message signing');
      }

      const sigBase64 = btoa(String.fromCharCode(...signature));

      const success = await complianceService.submitAgeVerification(publicKey, sigBase64, message);

      if (success) {
        complianceService.clearCache(publicKey);
        setStep('success');
        setTimeout(onVerified, 800);
      } else {
        throw new Error('Verification submission failed');
      }
    } catch (err: any) {
      setStep('error');
      setErrorMsg(err?.message || 'Failed to sign verification');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md rounded-2xl border border-zinc-800 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0f1117 0%, #131621 100%)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-5 border-b border-zinc-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/30">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-white font-mono text-sm font-bold">Age Verification</h2>
                <p className="text-zinc-500 font-mono text-xs">Compliance requirement</p>
              </div>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {step === 'checking' && (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
                <p className="text-zinc-400 font-mono text-sm">Checking verification status...</p>
              </div>
            )}

            {step === 'prompt' && (
              <div className="space-y-5">
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-200 font-mono text-sm font-bold mb-1">18+ Required</p>
                      <p className="text-zinc-400 text-sm leading-relaxed">
                        To interact with PowerSOL lotteries, you must confirm you are at least 18 years old.
                        This is a one-time verification signed with your wallet.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-800/30 border border-zinc-700/50 p-4">
                  <div className="flex gap-3">
                    <FileSignature className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-zinc-300 font-mono text-xs font-bold mb-1">What happens</p>
                      <ul className="text-zinc-500 text-xs space-y-1">
                        <li>- Your wallet will request a message signature</li>
                        <li>- No transaction is sent, no SOL is spent</li>
                        <li>- The signature proves your consent on-record</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSign}
                  className="w-full py-3.5 rounded-xl font-mono text-sm font-bold transition-all duration-300
                    bg-gradient-to-r from-amber-500 to-orange-500 text-black
                    hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-amber-500/20"
                >
                  Sign Age Verification
                </button>

                <p className="text-zinc-600 text-xs text-center font-mono">
                  By signing, you confirm you are 18+ and accept our Terms of Service
                </p>
              </div>
            )}

            {step === 'signing' && (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
                <p className="text-zinc-300 font-mono text-sm font-bold mb-1">Awaiting signature...</p>
                <p className="text-zinc-500 font-mono text-xs">Confirm in your wallet</p>
              </div>
            )}

            {step === 'success' && (
              <div className="flex flex-col items-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4"
                >
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                </motion.div>
                <p className="text-emerald-400 font-mono text-sm font-bold">Verified</p>
                <p className="text-zinc-500 font-mono text-xs mt-1">Age verification complete</p>
              </div>
            )}

            {step === 'error' && (
              <div className="space-y-4">
                <div className="flex flex-col items-center py-6">
                  <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-3">
                    <AlertTriangle className="w-7 h-7 text-red-400" />
                  </div>
                  <p className="text-red-400 font-mono text-sm font-bold mb-1">Verification Failed</p>
                  <p className="text-zinc-500 font-mono text-xs text-center">{errorMsg}</p>
                </div>
                <button
                  onClick={() => setStep('prompt')}
                  className="w-full py-3 rounded-xl font-mono text-sm border border-zinc-700 text-zinc-300
                    hover:border-zinc-600 hover:bg-zinc-800/50 transition-all"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
