import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Unlink, Loader2, ExternalLink, AlertTriangle, Copy, Check } from 'lucide-react';
import { socialAccountService, SocialAccount } from '../services/socialAccountService';
import { useToast } from '../contexts/ToastContext';

interface SocialAccountsCardProps {
  walletAddress: string | null;
  isConnected: boolean;
}

const PLATFORMS = [
  {
    id: 'twitter' as const,
    label: 'X',
    color: '#ffffff',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    id: 'youtube' as const,
    label: 'YouTube',
    color: '#FF0000',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  {
    id: 'tiktok' as const,
    label: 'TikTok',
    color: '#00f2ea',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
  },
  {
    id: 'discord' as const,
    label: 'Discord',
    color: '#5865F2',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    ),
  },
];

const transition30fps = {
  type: "spring" as const,
  stiffness: 100,
  damping: 20,
  mass: 1,
};

export function SocialAccountsCard({ walletAddress, isConnected }: SocialAccountsCardProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkingPlatform, setLinkingPlatform] = useState<string | null>(null);
  const [unlinkingPlatform, setUnlinkingPlatform] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const inAppBrowser = useMemo(() => socialAccountService.isInAppBrowser(), []);

  const loadAccounts = async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const data = await socialAccountService.getLinkedAccounts(walletAddress);
      setAccounts(data);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && walletAddress) {
      loadAccounts();
    } else {
      setAccounts([]);
    }
  }, [walletAddress, isConnected]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'social-link-success') {
        loadAccounts();
        toast.success(event.data.message || 'Account linked successfully!');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [walletAddress]);

  const handleLink = async (platform: 'discord' | 'youtube' | 'tiktok' | 'twitter') => {
    if (!walletAddress) return;
    setLinkingPlatform(platform);
    try {
      await socialAccountService.startOAuthFlow(platform, walletAddress);
      await loadAccounts();
    } finally {
      setLinkingPlatform(null);
    }
  };

  const handleUnlink = async (platform: string) => {
    if (!walletAddress) return;
    setUnlinkingPlatform(platform);
    try {
      const success = await socialAccountService.unlinkAccount(walletAddress, platform);
      if (success) {
        toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} account unlinked`);
        await loadAccounts();
      } else {
        toast.error('Failed to unlink account');
      }
    } catch {
      toast.error('Failed to unlink account');
    } finally {
      setUnlinkingPlatform(null);
    }
  };

  const getLinkedAccount = (platform: string) =>
    accounts.find((a) => a.platform === platform);

  return (
    <div
      className="p-4 sm:p-6 md:p-8 rounded-xl border-2"
      style={{
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(0, 10, 15, 0.95))',
        borderColor: '#00bfff',
        boxShadow: '0 0 20px rgba(0, 191, 255, 0.3)',
      }}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div
          className="px-2 sm:px-3 py-0.5 sm:py-1 rounded font-mono text-xs font-bold"
          style={{
            background: 'rgba(0, 191, 255, 0.3)',
            border: '1px solid rgba(0, 191, 255, 0.5)',
            color: '#00bfff',
          }}
        >
          [SOCIAL_LINK]
        </div>
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#00bfff' }} />
        )}
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-5">
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center"
          style={{
            background: 'rgba(0, 191, 255, 0.2)',
            border: '1px solid rgba(0, 191, 255, 0.4)',
          }}
        >
          <Link2 className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#00bfff' }} />
        </div>
        <div className="flex-1">
          <h3 className="font-mono font-bold text-sm sm:text-base md:text-lg" style={{ color: '#fff' }}>
            LINKED_ACCOUNTS
          </h3>
          <p className="font-mono text-xs hidden sm:block" style={{ color: '#00bfff' }}>
            CONNECT_YOUR_SOCIALS
          </p>
        </div>
      </div>

      {inAppBrowser && (
        <div
          className="mb-4 p-3 sm:p-4 rounded-lg flex flex-col gap-2"
          style={{
            background: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
          }}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#eab308' }} />
            <div>
              <p className="font-mono text-xs font-bold" style={{ color: '#eab308' }}>
                IN-APP BROWSER DETECTED
              </p>
              <p className="font-mono text-[10px] sm:text-xs mt-1" style={{ color: '#d4d4d8' }}>
                Google login does not work in embedded browsers. Open this page in Safari or Chrome to link your accounts.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              toast.success('Link copied! Paste it in Safari or Chrome.');
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg font-mono text-xs font-bold transition-all"
            style={{
              background: 'rgba(234, 179, 8, 0.2)',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              color: '#eab308',
            }}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'COPIED!' : 'COPY LINK'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {PLATFORMS.map((platform) => {
          const linked = getLinkedAccount(platform.id);
          const isLinking = linkingPlatform === platform.id;
          const isUnlinking = unlinkingPlatform === platform.id;

          return (
            <motion.div
              key={platform.id}
              className="relative rounded-lg overflow-hidden"
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: `1px solid ${linked ? platform.color + '66' : 'rgba(255,255,255,0.08)'}`,
              }}
              whileHover={{ scale: 1.01 }}
              transition={transition30fps}
            >
              <div className="flex items-center justify-between p-3 sm:p-4">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: linked ? `${platform.color}22` : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${linked ? platform.color + '44' : 'rgba(255,255,255,0.1)'}`,
                      color: linked ? platform.color : '#666',
                    }}
                  >
                    {linked?.platform_avatar_url ? (
                      <img
                        src={linked.platform_avatar_url}
                        alt=""
                        className="w-full h-full rounded-lg object-cover"
                      />
                    ) : (
                      platform.icon
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs sm:text-sm font-bold truncate" style={{ color: linked ? '#fff' : '#888' }}>
                      {platform.label}
                    </div>
                    {linked ? (
                      <div className="font-mono text-[10px] sm:text-xs truncate" style={{ color: platform.color }}>
                        {linked.platform_username || linked.platform_user_id}
                      </div>
                    ) : (
                      <div className="font-mono text-[10px] sm:text-xs text-zinc-600">
                        NOT_LINKED
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 ml-2">
                  {linked ? (
                    <motion.button
                      onClick={() => handleUnlink(platform.id)}
                      disabled={isUnlinking}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] sm:text-xs font-bold transition-all disabled:opacity-50"
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                      }}
                      whileHover={{ background: 'rgba(239, 68, 68, 0.25)' }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isUnlinking ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Unlink className="w-3 h-3" />
                      )}
                      <span>UNLINK</span>
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={() => handleLink(platform.id)}
                      disabled={isLinking || !isConnected}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] sm:text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: `${platform.color}22`,
                        border: `1px solid ${platform.color}44`,
                        color: platform.color,
                      }}
                      whileHover={isConnected ? { background: `${platform.color}33` } : {}}
                      whileTap={isConnected ? { scale: 0.95 } : {}}
                    >
                      {isLinking ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ExternalLink className="w-3 h-3" />
                      )}
                      <span>LINK</span>
                    </motion.button>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {linked && (
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    exit={{ width: '0%' }}
                    className="h-0.5"
                    style={{ background: `linear-gradient(90deg, transparent, ${platform.color}, transparent)` }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {!isConnected && (
        <div className="mt-4 p-3 rounded-lg text-center font-mono text-xs" style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#666',
        }}>
          CONNECT_WALLET_TO_LINK_ACCOUNTS
        </div>
      )}
    </div>
  );
}
