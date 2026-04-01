import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Loader, AlertTriangle } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';

interface AgeVerificationModalProps {
  open: boolean;
  onVerified: () => void;
  recordVerification: (wallet: string, signature: string, message: string) => Promise<boolean>;
}

const AGE_VERIFICATION_MESSAGE =
  'I confirm that I am at least 18 years old and agree to the PowerSOL Terms of Service. I understand that gambling involves risk and I am solely responsible for my actions on this platform.';

export function AgeVerificationModal({ open, onVerified, recordVerification }: AgeVerificationModalProps) {
  const { publicKey, signTransaction } = useWallet();
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  const handleSign = async () => {
    if (!publicKey) return;
    setSigning(true);
    setError('');

    try {
      const w = window as any;
      let provider = w.phantom?.solana || w.solana;
      if (!provider) provider = w.solflare;

      if (!provider?.signMessage) {
        setError('Your wallet does not support message signing. Please use Phantom or Solflare.');
        setSigning(false);
        return;
      }

      const encodedMessage = new TextEncoder().encode(AGE_VERIFICATION_MESSAGE);
      const signatureResponse = await provider.signMessage(encodedMessage, 'utf8');

      let signatureStr: string;
      if (signatureResponse?.signature) {
        const bytes = signatureResponse.signature instanceof Uint8Array
          ? signatureResponse.signature
          : new Uint8Array(signatureResponse.signature);
        signatureStr = btoa(String.fromCharCode(...bytes));
      } else if (signatureResponse instanceof Uint8Array) {
        signatureStr = btoa(String.fromCharCode(...signatureResponse));
      } else {
        setError('Unexpected signature format');
        setSigning(false);
        return;
      }

      const success = await recordVerification(publicKey, signatureStr, AGE_VERIFICATION_MESSAGE);
      if (success) {
        onVerified();
      } else {
        setError('Failed to record verification. Please try again.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signing cancelled';
      if (msg.includes('User rejected') || msg.includes('cancelled') || msg.includes('denied')) {
        setError('You must sign the age verification to use PowerSOL.');
      } else {
        setError(msg);
      }
    } finally {
      setSigning(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 min-h-screen"
        style={{ background: 'rgba(0, 0, 0, 0.92)' }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="max-w-md w-full rounded-2xl border relative overflow-hidden mx-auto"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(20, 10, 10, 0.95) 100%)',
            borderColor: 'rgba(239, 68, 68, 0.4)',
            boxShadow: '0 0 60px rgba(239, 68, 68, 0.2), inset 0 0 80px rgba(0, 0, 0, 0.9)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(239, 68, 68, 0.015) 2px,
                  rgba(239, 68, 68, 0.015) 4px
                )
              `,
            }}
          />

          <div className="relative z-10 p-6">
            <div className="text-center mb-6">
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.15))',
                  border: '2px solid rgba(239, 68, 68, 0.4)',
                  boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)',
                }}
              >
                <ShieldCheck className="w-8 h-8 text-red-400" />
              </div>

              <h2
                className="text-xl font-bold mb-2 font-mono"
                style={{
                  color: '#ffffff',
                  textShadow: '0 0 10px rgba(239, 68, 68, 0.4)',
                }}
              >
                AGE VERIFICATION
              </h2>
              <p className="text-zinc-400 font-mono text-xs">
                Required to access PowerSOL features
              </p>
            </div>

            <div
              className="p-4 rounded-xl mb-5"
              style={{
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-zinc-300 text-sm leading-relaxed">
                  You must be <span className="text-white font-bold">18 years or older</span> to use PowerSOL.
                  By signing, you confirm your age and agree to our Terms of Service.
                </p>
              </div>
            </div>

            <div
              className="p-3 rounded-lg mb-5 font-mono text-xs text-zinc-400 leading-relaxed"
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <p className="text-zinc-600 text-[10px] mb-1">MESSAGE TO SIGN:</p>
              "{AGE_VERIFICATION_MESSAGE}"
            </div>

            {error && (
              <div
                className="p-3 rounded-lg mb-4"
                style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)' }}
              >
                <p className="text-red-400 text-xs font-mono">{error}</p>
              </div>
            )}

            <motion.button
              onClick={handleSign}
              disabled={signing}
              className="w-full py-4 rounded-xl font-bold text-base transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 font-mono"
              style={{
                background: signing
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'linear-gradient(135deg, #ef4444, #f97316)',
                color: signing ? '#fff' : '#000',
                boxShadow: signing ? 'none' : '0 0 30px rgba(239, 68, 68, 0.4)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
              whileHover={!signing ? { scale: 1.02 } : {}}
              whileTap={!signing ? { scale: 0.98 } : {}}
            >
              {signing ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  SIGNING...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  SIGN & VERIFY AGE
                </>
              )}
            </motion.button>

            <p className="text-center text-zinc-600 font-mono text-[10px] mt-4">
              One-time signature. Your wallet will prompt you to sign a message (no transaction, no fees).
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
