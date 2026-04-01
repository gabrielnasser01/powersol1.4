import { useState, useEffect, useCallback } from 'react';

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/age-verification`;

const headers = {
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

const verifiedCache = new Map<string, boolean>();

export function useAgeVerification(walletAddress: string | null) {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const checkVerification = useCallback(async (wallet: string) => {
    if (verifiedCache.has(wallet)) {
      const cached = verifiedCache.get(wallet)!;
      setIsVerified(cached);
      if (!cached) setShowModal(true);
      return cached;
    }

    setIsChecking(true);
    try {
      const res = await fetch(`${BASE_URL}/check?wallet_address=${wallet}`, { headers });
      if (!res.ok) {
        setIsVerified(false);
        setShowModal(true);
        return false;
      }
      const data = await res.json();
      const verified = !!data.is_verified;
      verifiedCache.set(wallet, verified);
      setIsVerified(verified);
      if (!verified) setShowModal(true);
      return verified;
    } catch {
      setIsVerified(false);
      setShowModal(true);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const recordVerification = useCallback(async (wallet: string, signature: string, message: string) => {
    try {
      const res = await fetch(`${BASE_URL}/sign`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          wallet_address: wallet,
          signature,
          message_signed: message,
        }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.success) {
        verifiedCache.set(wallet, true);
        setIsVerified(true);
        setShowModal(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (walletAddress) {
      checkVerification(walletAddress);
    } else {
      setIsVerified(null);
      setShowModal(false);
    }
  }, [walletAddress, checkVerification]);

  return {
    isVerified,
    isChecking,
    showModal,
    setShowModal,
    checkVerification,
    recordVerification,
  };
}
