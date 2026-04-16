import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Loader, AlertTriangle, FileText, ChevronDown, Check } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { termsSections } from '../pages/terms/termsData';

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
  const [termsRead, setTermsRead] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const termsScrollRef = useRef<HTMLDivElement>(null);

  const handleTermsScroll = useCallback(() => {
    const el = termsScrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom) setScrolledToBottom(true);
  }, []);

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
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 min-h-screen"
        style={{ background: 'rgba(0, 0, 0, 0.92)' }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="max-w-md w-full rounded-2xl border relative overflow-hidden mx-auto max-h-[92vh] overflow-y-auto"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(20, 10, 10, 0.95) 100%)',
            borderColor: 'rgba(239, 68, 68, 0.4)',
            boxShadow: '0 0 60px rgba(239, 68, 68, 0.2), inset 0 0 80px rgba(0, 0, 0, 0.9)',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(239, 68, 68, 0.3) transparent',
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

          <div className="relative z-10 p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-5">
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.15))',
                  border: '2px solid rgba(239, 68, 68, 0.4)',
                  boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)',
                }}
              >
                <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-red-400" />
              </div>

              <h2
                className="text-lg sm:text-xl font-bold mb-1 font-mono"
                style={{
                  color: '#ffffff',
                  textShadow: '0 0 10px rgba(239, 68, 68, 0.4)',
                }}
              >
                AGE VERIFICATION
              </h2>
              <p className="text-zinc-400 font-mono text-[10px] sm:text-xs">
                Required to access PowerSOL features
              </p>
            </div>

            <div
              className="p-3 sm:p-4 rounded-xl mb-3 sm:mb-4"
              style={{
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                  You must be <span className="text-white font-bold">18 years or older</span> to use PowerSOL.
                  You must read and accept our Terms of Service before proceeding.
                </p>
              </div>
            </div>

            <div className="mb-3 sm:mb-4">
              <button
                onClick={() => setShowTerms(!showTerms)}
                className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-mono transition-all duration-200"
                style={{
                  background: showTerms ? 'rgba(62, 203, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${showTerms ? 'rgba(62, 203, 255, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                }}
              >
                <span className="flex items-center gap-2 text-zinc-300">
                  <FileText className="w-4 h-4" style={{ color: showTerms ? '#3ecbff' : '#71717a' }} />
                  Terms of Service
                </span>
                <ChevronDown
                  className="w-4 h-4 text-zinc-500 transition-transform duration-200"
                  style={{ transform: showTerms ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              <AnimatePresence>
                {showTerms && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div
                      ref={termsScrollRef}
                      onScroll={handleTermsScroll}
                      className="mt-2 rounded-xl p-3 sm:p-4 overflow-y-auto relative"
                      style={{
                        maxHeight: 'min(160px, 30vh)',
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      {termsSections.map((section) => (
                        <div key={section.id} className="mb-3 last:mb-0">
                          <h4 className="text-[10px] sm:text-xs font-bold text-zinc-300 mb-1.5 font-mono">
                            {section.title}
                          </h4>
                          {section.content.map((p, i) => (
                            <p key={i} className="text-[10px] sm:text-[11px] text-zinc-500 leading-relaxed mb-1 last:mb-0">
                              {p}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                    {!scrolledToBottom && (
                      <div className="flex items-center justify-center gap-1 mt-1.5">
                        <ChevronDown className="w-3 h-3 text-zinc-600 animate-bounce" />
                        <span className="text-[10px] text-zinc-600 font-mono">Scroll to read all terms</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <label
              className="flex items-start gap-2.5 sm:gap-3 mb-3 sm:mb-4 cursor-pointer group px-1"
              style={{ opacity: scrolledToBottom ? 1 : 0.4, pointerEvents: scrolledToBottom ? 'auto' : 'none' }}
            >
              <div
                onClick={() => scrolledToBottom && setTermsRead(!termsRead)}
                className="mt-0.5 w-[18px] h-[18px] sm:w-5 sm:h-5 rounded flex-shrink-0 flex items-center justify-center transition-all duration-200"
                style={{
                  background: termsRead ? 'linear-gradient(135deg, #ef4444, #f97316)' : 'rgba(255, 255, 255, 0.06)',
                  border: termsRead ? 'none' : '1.5px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: termsRead ? '0 0 12px rgba(239, 68, 68, 0.4)' : 'none',
                }}
              >
                {termsRead && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
              </div>
              <span
                className="text-[11px] sm:text-xs leading-relaxed transition-colors"
                style={{ color: termsRead ? '#d4d4d8' : '#71717a' }}
                onClick={() => scrolledToBottom && setTermsRead(!termsRead)}
              >
                I have read and agree to the <span className="text-white font-semibold">Terms of Service</span> and
                confirm I am at least <span className="text-white font-semibold">18 years old</span>
              </span>
            </label>

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
              disabled={signing || !termsRead}
              className="w-full py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-mono"
              style={{
                background: signing || !termsRead
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'linear-gradient(135deg, #ef4444, #f97316)',
                color: signing || !termsRead ? '#71717a' : '#000',
                boxShadow: signing || !termsRead ? 'none' : '0 0 30px rgba(239, 68, 68, 0.4)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
              whileHover={!signing && termsRead ? { scale: 1.02 } : {}}
              whileTap={!signing && termsRead ? { scale: 0.98 } : {}}
            >
              {signing ? (
                <>
                  <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  SIGNING...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                  SIGN & VERIFY AGE
                </>
              )}
            </motion.button>

            <p className="text-center text-zinc-600 font-mono text-[9px] sm:text-[10px] mt-3 sm:mt-4">
              One-time signature. Your wallet will prompt you to sign a message (no transaction, no fees).
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
