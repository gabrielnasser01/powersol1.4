import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Loader, ChevronDown, Scan, Smartphone, ExternalLink } from 'lucide-react';
import { theme } from '../theme';
import { useMagnetic } from '../hooks/useMagnetic';
import { useWallet } from '../contexts/WalletContext';
import { isMobileDevice, isInsideWalletBrowser, openWalletDeepLink } from '../contexts/WalletContext';
import type { DiscoveredWallet } from '../contexts/WalletContext';

interface WalletConfig {
  name: string;
  type: 'phantom' | 'solflare' | 'backpack';
  description: string;
  icon: string;
  color: string;
  deepLinkSupported: boolean;
}

const KNOWN_WALLETS: WalletConfig[] = [
  {
    name: 'Phantom',
    type: 'phantom',
    description: 'Most popular Solana wallet',
    icon: 'https://i.imgur.com/g8nBa6n.png',
    color: theme.colors.neonPurple,
    deepLinkSupported: true,
  },
  {
    name: 'Solflare',
    type: 'solflare',
    description: 'Web & Mobile compatible',
    icon: 'https://i.imgur.com/juhrcfm.png',
    color: theme.colors.neonBlue,
    deepLinkSupported: true,
  },
  {
    name: 'Backpack',
    type: 'backpack',
    description: 'Multi-chain wallet',
    icon: 'https://i.imgur.com/TiAPbMH.png',
    color: '#e33e3f',
    deepLinkSupported: true,
  },
];

function WalletIcon({ wallet }: { wallet: DiscoveredWallet }) {
  if (wallet.icon) {
    return (
      <img
        src={wallet.icon}
        alt={wallet.name}
        className="w-8 h-8 object-contain rounded-md"
      />
    );
  }
  return <Wallet className="w-5 h-5 text-teal-400" />;
}

export function WalletConnection() {
  const { publicKey, connected, connecting, balance, connect, disconnect, discoveredWallets } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showOtherWallets, setShowOtherWallets] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useMagnetic(buttonRef, { strength: 15 });

  const isMobile = isMobileDevice();
  const walletBrowser = isInsideWalletBrowser();

  const handleConnect = async () => {
    if (connected) {
      await disconnect();
    } else {
      setShowModal(true);
      setError('');
    }
  };

  const handleWalletConnect = async (walletType: 'phantom' | 'solflare' | 'backpack') => {
    setError('');
    setIsConnecting(true);
    try {
      await connect(walletType);
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

  const handleMobileDeepLink = (walletType: string) => {
    openWalletDeepLink(walletType);
    setShowModal(false);
  };

  const handleStandardWalletConnect = async (walletId: string) => {
    setError('');
    setIsConnecting(true);
    try {
      await connect('standard', walletId);
      setShowModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect';
      setError(msg);
    } finally {
      setIsConnecting(false);
    }
  };

  const hasNativeProvider = (walletType: string): boolean => {
    const w = window as any;
    if (walletType === 'phantom') return !!(w.phantom?.solana?.isPhantom || w.solana?.isPhantom);
    if (walletType === 'solflare') return !!w.solflare;
    if (walletType === 'backpack') return !!w.backpack;
    return false;
  };

  const renderWalletButton = (wallet: WalletConfig) => {
    const providerAvailable = hasNativeProvider(wallet.type);
    const needsDeepLink = isMobile && !providerAvailable;

    const handleClick = () => {
      if (needsDeepLink) {
        handleMobileDeepLink(wallet.type);
      } else {
        handleWalletConnect(wallet.type);
      }
    };

    return (
      <motion.button
        key={wallet.type}
        onClick={handleClick}
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
          <div className="w-8 h-8 rounded-md flex items-center justify-center text-sm relative">
            <img
              src={wallet.icon}
              alt={wallet.name}
              className="w-8 h-8 object-contain"
            />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm font-mono" style={{ color: '#ffffff' }}>
              {wallet.name}
            </h4>
            <p className="text-xs text-zinc-400 font-mono">
              {needsDeepLink ? 'Open in app' : wallet.description}
            </p>
          </div>
          <div
            className="text-zinc-400 group-hover:text-white transition-colors font-mono"
            style={{ color: wallet.color }}
          >
            {isConnecting ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : needsDeepLink ? (
              <ExternalLink className="w-4 h-4" />
            ) : (
              '\u2192'
            )}
          </div>
        </div>
      </motion.button>
    );
  };

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
                  {isMobile && !walletBrowser
                    ? 'Select a wallet app to open'
                    : 'Select wallet to connect (real Solana transactions)'
                  }
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50">
                  <p className="text-red-400 text-xs font-mono">{error}</p>
                </div>
              )}

              {isMobile && !walletBrowser && (
                <div className="mb-4 p-3 rounded-lg border" style={{ background: 'rgba(0, 204, 255, 0.05)', borderColor: 'rgba(0, 204, 255, 0.2)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                    <p className="text-xs font-mono text-cyan-300">MOBILE_MODE</p>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-400">
                    Your wallet app will open and load this page in its built-in browser. Your referral link is preserved.
                  </p>
                </div>
              )}

              <div className="space-y-3 mb-6">
                {KNOWN_WALLETS.map(renderWalletButton)}

                {!isMobile && (
                  <>
                    <motion.button
                      onClick={() => setShowOtherWallets(!showOtherWallets)}
                      className="w-full p-3 rounded-lg border transition-all duration-300 group text-left relative overflow-hidden"
                      style={{
                        background: `
                          linear-gradient(0deg, rgba(0, 204, 170, 0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(0, 204, 170, 0.03) 1px, transparent 1px),
                          linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 20, 10, 0.8) 100%)
                        `,
                        backgroundSize: '15px 15px, 15px 15px, 100% 100%',
                        borderColor: 'rgba(0, 204, 170, 0.25)',
                        boxShadow: '0 0 15px rgba(0, 204, 170, 0.1)',
                      }}
                      whileHover={{
                        borderColor: '#00ccaa',
                        boxShadow: '0 0 25px rgba(0, 204, 170, 0.3)',
                        scale: 1.02,
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <motion.div
                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(0, 204, 170, 0.12), transparent)',
                        }}
                        animate={{ x: [-100, 100] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      />

                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 rounded-md flex items-center justify-center relative">
                          <Scan className="w-5 h-5" style={{ color: '#00ccaa' }} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm font-mono" style={{ color: '#ffffff' }}>
                            Other Wallets
                          </h4>
                          <p className="text-xs text-zinc-400 font-mono">
                            {discoveredWallets.length > 0
                              ? `${discoveredWallets.length} wallet${discoveredWallets.length > 1 ? 's' : ''} detected`
                              : 'Wallet Standard auto-detect'}
                          </p>
                        </div>
                        <motion.div
                          animate={{ rotate: showOtherWallets ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ color: '#00ccaa' }}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.div>
                      </div>
                    </motion.button>

                    <AnimatePresence>
                      {showOtherWallets && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden space-y-2"
                        >
                          {discoveredWallets.length > 0 ? (
                            discoveredWallets.map((wallet) => (
                              <motion.button
                                key={wallet.id}
                                onClick={() => handleStandardWalletConnect(wallet.id)}
                                disabled={isConnecting}
                                className="w-full p-3 rounded-lg border transition-all duration-300 group text-left relative overflow-hidden disabled:opacity-50"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 20, 15, 0.8) 100%)',
                                  borderColor: 'rgba(0, 204, 170, 0.2)',
                                }}
                                whileHover={{
                                  borderColor: '#00ccaa',
                                  boxShadow: '0 0 20px rgba(0, 204, 170, 0.25)',
                                  scale: 1.02,
                                }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className="flex items-center space-x-4">
                                  <div className="w-8 h-8 rounded-md flex items-center justify-center relative">
                                    <WalletIcon wallet={wallet} />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-bold text-sm font-mono" style={{ color: '#ffffff' }}>
                                      {wallet.name}
                                    </h4>
                                    <p className="text-xs text-zinc-400 font-mono">
                                      Wallet Standard
                                    </p>
                                  </div>
                                  <div className="text-zinc-400 group-hover:text-white transition-colors font-mono" style={{ color: '#00ccaa' }}>
                                    {isConnecting ? <Loader className="w-4 h-4 animate-spin" /> : '\u2192'}
                                  </div>
                                </div>
                              </motion.button>
                            ))
                          ) : (
                            <div
                              className="p-4 rounded-lg border text-center"
                              style={{
                                background: 'rgba(0, 0, 0, 0.5)',
                                borderColor: 'rgba(0, 204, 170, 0.15)',
                              }}
                            >
                              <p className="text-xs font-mono text-zinc-500 mb-1">
                                No additional wallets detected
                              </p>
                              <p className="text-[10px] font-mono text-zinc-600">
                                Install any Solana wallet extension (Backpack, Glow, etc.)
                              </p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>

              <motion.button
                onClick={() => setShowModal(false)}
                disabled={isConnecting}
                className="w-full py-2 rounded-md font-semibold transition-all duration-300 border font-mono text-sm disabled:opacity-50"
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
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
