import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { getWallets } from '@wallet-standard/app';
import type { Wallet as StandardWallet } from '@wallet-standard/base';
import { solanaService, WalletAdapter } from '../services/solanaService';
import { userStorage, userStatsStorage, ticketsStorage } from '../store/persist';
import { getActiveAffiliateCode, getStoredAffiliateCode, initAffiliateTracking } from '../utils/affiliateTracking';
import { apiClient } from '../services/api';
import { powerPointsService } from '../services/powerPointsService';

function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

function buildUrlWithRef(baseHref: string): string {
  const url = new URL(baseHref);
  const ref = getStoredAffiliateCode();
  if (ref && !url.searchParams.has('ref')) {
    url.searchParams.set('ref', ref);
  }
  return url.toString();
}

function openPhantomBrowseDeepLink() {
  const targetUrl = encodeURIComponent(buildUrlWithRef(window.location.href));
  if (isAndroid()) {
    const intentUrl = `intent://browse/${targetUrl}#Intent;scheme=phantom;package=app.phantom;end;`;
    window.location.href = intentUrl;
  } else {
    window.location.href = `https://phantom.app/ul/browse/${targetUrl}`;
  }
}

function openSolflareBrowseDeepLink() {
  const targetUrl = encodeURIComponent(buildUrlWithRef(window.location.href));
  if (isAndroid()) {
    const intentUrl = `intent://ul/v1/browse/${targetUrl}#Intent;scheme=https;package=com.solflare.mobile;S.browser_fallback_url=${encodeURIComponent('https://solflare.com/')};end;`;
    window.location.href = intentUrl;
  } else {
    window.location.href = `https://solflare.com/ul/v1/browse/${targetUrl}`;
  }
}

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: { toBase58(): string };
  isConnected?: boolean;
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  signTransaction(transaction: Transaction): Promise<Transaction>;
  signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
  on(event: string, callback: () => void): void;
  off(event: string, callback: () => void): void;
}

export interface DiscoveredWallet {
  name: string;
  icon: string;
  id: string;
  standardWallet?: StandardWallet;
}

function isSolanaWallet(wallet: StandardWallet): boolean {
  return wallet.chains?.some((c: string) => c.startsWith('solana:')) ?? false;
}

function getWalletIcon(wallet: StandardWallet): string {
  if (typeof wallet.icon === 'string' && wallet.icon.length > 0) {
    return wallet.icon;
  }
  return '';
}

interface WalletContextType {
  publicKey: string | null;
  connected: boolean;
  connecting: boolean;
  balance: number;
  discoveredWallets: DiscoveredWallet[];
  connect: (walletType?: 'phantom' | 'solflare' | 'standard', walletId?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  getWalletAdapter: () => WalletAdapter | null;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [balance, setBalance] = useState(0);
  const [provider, setProvider] = useState<PhantomProvider | null>(null);
  const [discoveredWallets, setDiscoveredWallets] = useState<DiscoveredWallet[]>([]);
  const standardWalletRef = useRef<StandardWallet | null>(null);

  useEffect(() => {
    initAffiliateTracking();
  }, []);

  useEffect(() => {
    const walletsApi = getWallets();

    const updateWallets = () => {
      const allWallets = walletsApi.get();
      const solanaWallets: DiscoveredWallet[] = allWallets
        .filter(isSolanaWallet)
        .filter(w => {
          const name = w.name.toLowerCase();
          return !name.includes('phantom') && !name.includes('solflare');
        })
        .map(w => ({
          name: w.name,
          icon: getWalletIcon(w),
          id: `standard:${w.name}`,
          standardWallet: w,
        }));
      setDiscoveredWallets(solanaWallets);
    };

    updateWallets();
    const off = walletsApi.on('register', updateWallets);
    return () => { off(); };
  }, []);

  const getPhantomProvider = (): PhantomProvider | null => {
    if (typeof window !== 'undefined') {
      const windowWithSolana = window as unknown as { solana?: PhantomProvider; phantom?: { solana?: PhantomProvider } };
      if (windowWithSolana.phantom?.solana?.isPhantom) {
        return windowWithSolana.phantom.solana;
      }
      if (windowWithSolana.solana?.isPhantom) {
        return windowWithSolana.solana;
      }
    }
    return null;
  };

  const getSolflareProvider = (): PhantomProvider | null => {
    if (typeof window !== 'undefined') {
      const windowWithSolflare = window as unknown as { solflare?: PhantomProvider };
      if (windowWithSolflare.solflare) {
        return windowWithSolflare.solflare;
      }
    }
    return null;
  };

  const refreshBalance = useCallback(async () => {
    if (publicKey) {
      try {
        const bal = await solanaService.getBalance(publicKey);
        setBalance(bal);
      } catch (error) {
        console.error('Failed to refresh balance:', error);
      }
    }
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey || !connected) return;

    const poll = setInterval(() => {
      solanaService.getBalance(publicKey).then(setBalance).catch(() => {});
    }, 15000);

    const handleVisibility = () => {
      if (!document.hidden && publicKey) {
        solanaService.getBalance(publicKey).then(setBalance).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [publicKey, connected]);

  const connectStandardWallet = useCallback(async (walletId: string) => {
    const wallet = discoveredWallets.find(w => w.id === walletId);
    if (!wallet?.standardWallet) {
      throw new Error('Wallet not found');
    }

    const stdWallet = wallet.standardWallet;
    const connectFeature = (stdWallet.features as any)['standard:connect'];
    if (!connectFeature) {
      throw new Error('Wallet does not support connect');
    }

    const result = await connectFeature.connect();
    const account = result.accounts?.[0];
    if (!account) {
      throw new Error('No account returned from wallet');
    }

    const pubKey = new PublicKey(account.address).toBase58();
    standardWalletRef.current = stdWallet;
    setProvider(null);
    setPublicKey(pubKey);
    setConnected(true);

    userStorage.set({ publicKey: pubKey, connectedAt: Date.now() });
    window.dispatchEvent(new CustomEvent('walletStorageChange'));
    window.dispatchEvent(new CustomEvent('walletConnected'));

    const referralCode = getActiveAffiliateCode();
    if (referralCode) {
      try {
        await apiClient.login(pubKey, '', referralCode);
      } catch (error) {
        console.error('Failed to register referral:', error);
      }
    }

    const bal = await solanaService.getBalance(pubKey);
    setBalance(bal);
    claimDailyLoginPoints(pubKey);
  }, [discoveredWallets]);

  const connect = useCallback(async (walletType: 'phantom' | 'solflare' | 'standard' = 'phantom', walletId?: string) => {
    setConnecting(true);

    try {
      if (walletType === 'standard' && walletId) {
        await connectStandardWallet(walletId);
        return;
      }

      let walletProvider: PhantomProvider | null = null;

      if (walletType === 'phantom') {
        walletProvider = getPhantomProvider();
        if (!walletProvider) {
          if (isMobileDevice()) {
            openPhantomBrowseDeepLink();
            throw new Error('Opening Phantom app...');
          }
          window.open('https://phantom.app/', '_blank');
          throw new Error('Phantom wallet not installed. Please install it from phantom.app');
        }
      } else if (walletType === 'solflare') {
        walletProvider = getSolflareProvider();
        if (!walletProvider) {
          if (isMobileDevice()) {
            openSolflareBrowseDeepLink();
            throw new Error('Opening Solflare app...');
          }
          window.open('https://solflare.com/', '_blank');
          throw new Error('Solflare wallet not installed. Please install it from solflare.com');
        }
      }

      if (!walletProvider) {
        throw new Error('Wallet not available');
      }

      const response = await walletProvider.connect();
      const pubKey = response?.publicKey?.toBase58()
        ?? walletProvider.publicKey?.toBase58();

      if (!pubKey) {
        throw new Error('Wallet connected but no public key returned');
      }

      standardWalletRef.current = null;
      setProvider(walletProvider);
      setPublicKey(pubKey);
      setConnected(true);

      userStorage.set({ publicKey: pubKey, connectedAt: Date.now() });
      window.dispatchEvent(new CustomEvent('walletStorageChange'));
      window.dispatchEvent(new CustomEvent('walletConnected'));

      const referralCode = getActiveAffiliateCode();
      if (referralCode) {
        try {
          await apiClient.login(pubKey, '', referralCode);
        } catch (error) {
          console.error('Failed to register referral:', error);
        }
      }

      const bal = await solanaService.getBalance(pubKey);
      setBalance(bal);

      claimDailyLoginPoints(pubKey);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    } finally {
      setConnecting(false);
    }
  }, [connectStandardWallet]);

  const claimDailyLoginPoints = async (walletAddress: string) => {
    try {
      const result = await powerPointsService.claimDailyLogin(walletAddress);
      if (result.success && !result.alreadyClaimed && result.pointsEarned && result.pointsEarned > 0) {
        userStatsStorage.addMissionPoints(result.pointsEarned);
        window.dispatchEvent(new CustomEvent('missionPointsChange'));
        window.dispatchEvent(new CustomEvent('dailyLoginClaimed', {
          detail: { points: result.pointsEarned, newBalance: result.newBalance }
        }));
      }
    } catch (error) {
      console.error('Failed to claim daily login points:', error);
    }
  };

  const disconnect = useCallback(async () => {
    setProvider(null);
    setPublicKey(null);
    setConnected(false);
    setBalance(0);

    userStorage.clear();
    userStatsStorage.set({
      tickets: 0,
      chests: 0,
      loginStreak: 0,
      lastLogin: 0,
      totalReferrals: 0,
      totalTicketsPurchased: 0,
      missionPoints: 0,
    });
    ticketsStorage.clear();
    window.dispatchEvent(new CustomEvent('walletStorageChange'));
    window.dispatchEvent(new CustomEvent('missionPointsChange'));
    window.dispatchEvent(new CustomEvent('walletDisconnected'));

    try {
      if (provider) {
        await provider.disconnect();
      }
      if (standardWalletRef.current) {
        const disconnectFeature = (standardWalletRef.current.features as any)['standard:disconnect'];
        if (disconnectFeature) {
          await disconnectFeature.disconnect();
        }
        standardWalletRef.current = null;
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }, [provider]);

  const signTransaction = useCallback(async (transaction: Transaction): Promise<Transaction> => {
    if (standardWalletRef.current) {
      const signFeature = (standardWalletRef.current.features as any)['solana:signTransaction'];
      if (!signFeature) {
        throw new Error('Wallet does not support transaction signing');
      }
      const serialized = transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
      const result = await signFeature.signTransaction({ transaction: serialized, chain: 'solana:mainnet' });
      return Transaction.from(result.signedTransaction);
    }
    if (!provider) {
      throw new Error('No wallet provider available. Connect a wallet for real transactions.');
    }
    return provider.signTransaction(transaction);
  }, [provider]);

  const signAllTransactions = useCallback(async (transactions: Transaction[]): Promise<Transaction[]> => {
    if (standardWalletRef.current) {
      const results: Transaction[] = [];
      for (const tx of transactions) {
        results.push(await signTransaction(tx));
      }
      return results;
    }
    if (!provider) {
      throw new Error('No wallet provider available');
    }
    return provider.signAllTransactions(transactions);
  }, [provider, signTransaction]);

  const getWalletAdapter = useCallback((): WalletAdapter | null => {
    if (!publicKey || !connected) return null;

    return {
      publicKey: new PublicKey(publicKey),
      connected,
      signTransaction,
      signAllTransactions,
    };
  }, [publicKey, connected, signTransaction, signAllTransactions]);

  useEffect(() => {
    const tryAutoReconnect = async () => {
      const saved = userStorage.get();
      if (!saved.publicKey) return;

      const phantom = getPhantomProvider();
      if (phantom) {
        try {
          const resp = await phantom.connect();
          const pubKey = resp?.publicKey?.toBase58()
            ?? phantom.publicKey?.toBase58();
          if (!pubKey) throw new Error('No public key');
          setProvider(phantom);
          setPublicKey(pubKey);
          setConnected(true);
          userStorage.set({ publicKey: pubKey, connectedAt: Date.now() });
          const bal = await solanaService.getBalance(pubKey);
          setBalance(bal);
          return;
        } catch {}
      }

      const solflare = getSolflareProvider();
      if (solflare) {
        try {
          const resp = await solflare.connect();
          const pubKey = resp?.publicKey?.toBase58()
            ?? solflare.publicKey?.toBase58();
          if (!pubKey) throw new Error('No public key');
          setProvider(solflare);
          setPublicKey(pubKey);
          setConnected(true);
          userStorage.set({ publicKey: pubKey, connectedAt: Date.now() });
          const bal = await solanaService.getBalance(pubKey);
          setBalance(bal);
          return;
        } catch {}
      }

      userStorage.clear();
    };

    tryAutoReconnect();
  }, []);

  useEffect(() => {
    const phantom = getPhantomProvider();
    if (!phantom) return;

    const handleDisconnect = () => {
      disconnect();
    };

    phantom.on('disconnect', handleDisconnect);
    return () => {
      phantom.off('disconnect', handleDisconnect);
    };
  }, [disconnect]);

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        connected,
        connecting,
        balance,
        discoveredWallets,
        connect,
        disconnect,
        signTransaction,
        signAllTransactions,
        getWalletAdapter,
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
