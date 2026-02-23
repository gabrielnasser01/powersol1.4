import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { solanaService, WalletAdapter } from '../services/solanaService';
import { userStorage, userStatsStorage, ticketsStorage } from '../store/persist';
import { getActiveAffiliateCode, initAffiliateTracking } from '../utils/affiliateTracking';
import { apiClient } from '../services/api';
import { powerPointsService } from '../services/powerPointsService';

function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

function isInPhantomBrowser(): boolean {
  const w = window as any;
  return !!(w.phantom?.solana?.isPhantom);
}

function isInSolflareBrowser(): boolean {
  const w = window as any;
  return !!(w.solflare);
}

function openPhantomBrowseDeepLink() {
  const currentUrl = encodeURIComponent(window.location.href);
  window.location.href = `https://phantom.app/ul/browse/${currentUrl}`;
}

function openSolflareBrowseDeepLink() {
  const currentUrl = encodeURIComponent(window.location.href);
  window.location.href = `https://solflare.com/ul/v1/browse/${currentUrl}`;
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

interface WalletContextType {
  publicKey: string | null;
  connected: boolean;
  connecting: boolean;
  balance: number;
  connect: (walletType?: 'phantom' | 'solflare' | 'manual', manualKey?: string) => Promise<void>;
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

  useEffect(() => {
    initAffiliateTracking();
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

  const connect = useCallback(async (walletType: 'phantom' | 'solflare' | 'manual' = 'phantom', manualKey?: string) => {
    setConnecting(true);

    try {
      if (walletType === 'manual' && manualKey) {
        try {
          new PublicKey(manualKey);
        } catch {
          throw new Error('Invalid public key');
        }
        setPublicKey(manualKey);
        setConnected(true);
        setProvider(null);

        userStorage.set({ publicKey: manualKey, connectedAt: Date.now() });
        window.dispatchEvent(new CustomEvent('walletStorageChange'));
        window.dispatchEvent(new CustomEvent('walletConnected'));

        const bal = await solanaService.getBalance(manualKey);
        setBalance(bal);
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
      const pubKey = response.publicKey.toBase58();

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
  }, []);

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
    try {
      if (provider) {
        await provider.disconnect();
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    }

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
  }, [provider]);

  const signTransaction = useCallback(async (transaction: Transaction): Promise<Transaction> => {
    if (!provider) {
      throw new Error('No wallet provider available. Connect with Phantom or Solflare for real transactions.');
    }
    return provider.signTransaction(transaction);
  }, [provider]);

  const signAllTransactions = useCallback(async (transactions: Transaction[]): Promise<Transaction[]> => {
    if (!provider) {
      throw new Error('No wallet provider available');
    }
    return provider.signAllTransactions(transactions);
  }, [provider]);

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
    userStorage.clear();
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
