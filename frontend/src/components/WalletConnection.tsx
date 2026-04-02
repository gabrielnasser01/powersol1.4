import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Zap, Loader } from 'lucide-react';
import { theme } from '../theme';
import { useMagnetic } from '../hooks/useMagnetic';
import { useWallet } from '../contexts/WalletContext';

export function WalletConnection() {
  const { publicKey, connected, connecting, balance, connect, disconnect } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useMagnetic(buttonRef, { strength: 15 });

  const handleConnect = () => {
    if (connected) {
      disconnect();
    } else {
      setShowModal(true);
      setError('');
    }
  };

  const handleWalletConnect = async (walletName: string) => {
    setError('');
    setIsConnecting(true);
    try {
      if (walletName === 'Phantom') {
        await connect('phantom');
      } else if (walletName === 'Solflare') {
        await connect('solflare');
      } else if (walletName === 'WalletConnect') {
        window.open('https://walletconnect.network/', '_blank');
        setIsConnecting(false);
        setShowModal(false);
        return;
      }
      setShowModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect';
      if (msg.includes('Opening')) {
        setShowModal(false);
      } else {
        setError(msg);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSubmitConnection = async () => {
    if (manualKey.length >= 32) {
      setError('');
      setIsConnecting(true);
      try {
        await connect('manual', manualKey);
        setShowModal(false);
        setManualKey('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid public key');
      } finally {
        setIsConnecting(false);
      }
    }
  };

  const walletOptions = [
    {
      name: 'Phantom',
      description: 'Most popular Solana wallet',
      icon: '👻',
      color: theme.colors.neonPurple,
    },
    {
      name: 'Solflare',
      description: 'Web & Mobile compatible',
      icon: '🔥',
      color: theme.colors.neonBlue,
    },
    {
      name: 'WalletConnect',
      description: 'Scan QR with any wallet',
      icon: '🔗',
      color: '#3B99FC',
    },
  ];

  return (
    <>
      <motion.button
        data-wallet-connect
        ref={buttonRef}
        onClick={handleConnect}
        disabled={connecting}
        className="px-2 md:px-3 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-1 font-mono relative overflow-hidden text-xs md:text-sm group disabled:opacity-70"
        style={{
          background: connected
            ? 'linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(0, 255, 136, 0.1))'
            : 'linear-gradient(135deg, #ff1493, #9333ea, #3b82f6)',
          color: connected ? '#00ff88' : '#000',
          boxShadow: connected
            ? '0 0 20px rgba(0, 255, 136, 0.4)'
            : '0 0 20px rgba(255, 20, 147, 0.5)',
          border: connected ? '1px solid rgba(0, 255, 136, 0.4)' : 'none',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
        whileHover={{
          scale: 1.05,
          rotate: [0, -0.5, 0.5, 0]
        }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className="absolute inset-0 rounded-lg"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
          }}
          animate={{ x: [-100, 100] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />

        <div className="relative z-10 flex items-center space-x-1">
          {connecting ? (
            <Loader className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
          ) : (
            <motion.div
              animate={connected ? { rotate: [0, 10, -10, 0] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Wallet className="w-3 h-3 md:w-4 md:h-4" />
            </motion.div>
          )}
          <span className="hidden sm:inline">
            {connecting
              ? 'CONNECTING...'
              : connected
                ? `${publicKey?.slice(0, 4)}...${publicKey?.slice(-4)}`
                : 'CONNECT_WALLET'
            }
          </span>
          <span className="sm:hidden">
            {connecting
              ? '...'
              : connected
                ? `${publicKey?.slice(0, 4)}...`
                : 'CONNECT'
            }
          </span>
        </div>
      </motion.button>

      {showModal && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 min-h-screen"
            style={{ background: 'rgba(0, 0, 0, 0.9)' }}
            onClick={() => !isConnecting && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full p-6 rounded-2xl border relative overflow-hidden mx-auto"
              style={{
                background: `
                  linear-gradient(0deg, rgba(0, 255, 136, 0.08) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0, 255, 136, 0.08) 1px, transparent 1px),
                  linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(0, 20, 10, 0.95) 100%)
                `,
                backgroundSize: '20px 20px, 20px 20px, 100% 100%',
                borderColor: '#00ff88',
                boxShadow: '0 0 50px rgba(0, 255, 136, 0.5), inset 0 0 100px rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(20px)',
                fontFamily: 'monospace',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-2 left-2 text-xs font-mono text-green-400/60">
                [WALLET_SYS]
              </div>
              <div className="absolute top-2 right-2 text-xs font-mono text-green-400/60">
                [CONNECT]
              </div>

              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `
                    repeating-linear-gradient(
                      0deg,
                      transparent,
                      transparent 2px,
                      rgba(0, 255, 136, 0.02) 2px,
                      rgba(0, 255, 136, 0.02) 4px
                    )
                  `,
                  animation: 'terminalScan 4s linear infinite',
                }}
              />

              <div className="text-center mb-6 mt-2">
                <div
                  className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center relative"
                  style={{
                    background: `linear-gradient(135deg, rgba(0, 255, 136, 0.3), rgba(0, 204, 255, 0.2))`,
                    border: `2px solid #00ff88`,
                    boxShadow: `0 0 30px rgba(0, 255, 136, 0.4)`,
                  }}
                >
                  <Wallet className="w-6 h-6" style={{ color: '#00ff88' }} />

                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: `linear-gradient(90deg, transparent, rgba(0, 255, 136, 0.3), transparent)`,
                    }}
                    animate={{ x: [-100, 100] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                </div>

                <h3
                  className="text-lg font-bold mb-2 font-mono"
                  style={{
                    color: '#ffffff',
                    textShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
                  }}
                >
                  {'>'} WALLET_CONNECTION.EXE
                </h3>
                <p className="text-green-300/70 font-mono text-xs">
                  Select wallet to connect (real Solana transactions)
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50">
                  <p className="text-red-400 text-xs font-mono">{error}</p>
                </div>
              )}

              <div className="space-y-3 mb-6">
                {walletOptions.map((wallet, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleWalletConnect(wallet.name)}
                    disabled={isConnecting}
                    className="w-full p-3 rounded-lg border transition-all duration-300 group text-left relative overflow-hidden disabled:opacity-50"
                    style={{
                      background: `
                        linear-gradient(0deg, ${wallet.color}08 1px, transparent 1px),
                        linear-gradient(90deg, ${wallet.color}08 1px, transparent 1px),
                        linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 20, 10, 0.8) 100%)
                      `,
                      backgroundSize: '15px 15px, 15px 15px, 100% 100%',
                      borderColor: `${wallet.color}40`,
                      boxShadow: `0 0 15px ${wallet.color}20`,
                    }}
                    whileHover={{
                      borderColor: wallet.color,
                      boxShadow: `0 0 25px ${wallet.color}50`,
                      scale: 1.02,
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${wallet.color}20, transparent)`,
                      }}
                      animate={{ x: [-100, 100] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />

                    <div className="flex items-center space-x-4">
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center text-sm relative"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          boxShadow: 'none',
                        }}
                      >
                        {wallet.name === 'Phantom' ? (
                          <img
                            src="https://i.imgur.com/g8nBa6n.png"
                            alt="Phantom Wallet"
                            className="w-8 h-8 object-contain"
                          />
                        ) : wallet.name === 'Solflare' ? (
                          <img
                            src="https://i.imgur.com/juhrcfm.png"
                            alt="Solflare Wallet"
                            className="w-8 h-8 object-contain"
                          />
                        ) : wallet.name === 'WalletConnect' ? (
                          <svg className="w-8 h-8" viewBox="0 0 480 480" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="480" height="480" rx="120" fill="#3B99FC"/>
                            <path d="M141.78 196.94c54.34-53.2 142.42-53.2 196.76 0l6.54 6.4a6.71 6.71 0 010 9.64l-22.38 21.9a3.53 3.53 0 01-4.92 0l-9-8.82c-37.92-37.13-99.38-37.13-137.3 0l-9.64 9.44a3.53 3.53 0 01-4.92 0l-22.38-21.9a6.71 6.71 0 010-9.64l5.24-5.02zm243.14 45.28l19.92 19.5a6.71 6.71 0 010 9.64l-89.78 87.9a7.06 7.06 0 01-9.84 0l-63.72-62.38a1.76 1.76 0 00-2.46 0l-63.72 62.38a7.06 7.06 0 01-9.84 0l-89.78-87.9a6.71 6.71 0 010-9.64l19.92-19.5a7.06 7.06 0 019.84 0l63.72 62.38c.68.66 1.78.66 2.46 0l63.72-62.38a7.06 7.06 0 019.84 0l63.72 62.38c.68.66 1.78.66 2.46 0l63.72-62.38a7.06 7.06 0 019.84 0z" fill="#fff"/>
                          </svg>
                        ) : (
                          wallet.icon
                        )}

                        <motion.div
                          className="absolute inset-0 rounded-lg"
                          style={{
                            background: 'transparent',
                            opacity: 0,
                          }}
                          whileHover={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm font-mono" style={{ color: '#ffffff' }}>
                          {wallet.name}
                        </h4>
                        <p className="text-xs text-zinc-400 font-mono">
                          {wallet.description}
                        </p>
                      </div>
                      <div
                        className="text-zinc-400 group-hover:text-white transition-colors font-mono"
                        style={{ color: wallet.color }}
                      >
                        {isConnecting ? <Loader className="w-4 h-4 animate-spin" /> : '→'}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-xs font-medium mb-2 font-mono" style={{ color: '#ffffff' }}>
                  MANUAL_INPUT (read-only mode):
                </label>
                <input
                  type="text"
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value)}
                  placeholder="PASTE_PUBLIC_KEY_HERE..."
                  disabled={isConnecting}
                  className="w-full p-2 rounded-md border bg-transparent text-white placeholder-zinc-500 focus:outline-none focus:ring-2 font-mono text-xs select-text disabled:opacity-50"
                  style={{
                    borderColor: 'rgba(0, 255, 136, 0.3)',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    boxShadow: 'inset 0 0 10px rgba(0, 255, 136, 0.1)',
                  }}
                />
                <p className="text-xs text-zinc-500 mt-1 font-mono">
                  Manual input cannot sign transactions
                </p>
              </div>

              <div className="flex gap-3">
                <motion.button
                  onClick={() => setShowModal(false)}
                  disabled={isConnecting}
                  className="flex-1 py-2 rounded-md font-semibold transition-all duration-300 border font-mono text-sm disabled:opacity-50"
                  style={{
                    background: 'rgba(0, 0, 0, 0.6)',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: '#ffffff',
                  }}
                  whileHover={{ background: 'rgba(255, 255, 255, 0.1)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  CANCEL
                </motion.button>

                <motion.button
                  onClick={handleSubmitConnection}
                  disabled={manualKey.length < 32 || isConnecting}
                  className="flex-1 py-2 rounded-md font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 font-mono text-sm"
                  style={{
                    background: manualKey.length >= 32 ? 'linear-gradient(135deg, #00ff88, #00ccff)' : 'rgba(255, 255, 255, 0.1)',
                    color: manualKey.length >= 32 ? '#000' : '#ffffff',
                    boxShadow: manualKey.length >= 32 ? '0 0 30px rgba(0, 255, 136, 0.5)' : 'none',
                  }}
                  whileHover={manualKey.length >= 32 ? { scale: 1.05 } : {}}
                  whileTap={manualKey.length >= 32 ? { scale: 0.95 } : {}}
                >
                  {isConnecting ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>EXECUTE</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
