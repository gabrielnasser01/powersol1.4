import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notificationService';
import { claimService } from '../services/claimService';

interface UseNotificationsReturn {
  isEnabled: boolean;
  permissionStatus: NotificationPermission | 'unsupported';
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => void;
  checkForPrizes: () => Promise<void>;
}

export function useNotifications(walletAddress: string | null): UseNotificationsReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    const init = async () => {
      await notificationService.init();
      setIsEnabled(notificationService.isEnabled());
      setPermissionStatus(notificationService.getPermissionStatus());
    };

    init();
  }, []);

  useEffect(() => {
    if (!walletAddress || !isEnabled) {
      notificationService.stopPrizeChecker();
      return;
    }

    const checkFunction = async () => {
      const prizes = await claimService.getUnclaimedPrizes(walletAddress);
      const affiliateRewards = await claimService.getClaimableAffiliateRewards(walletAddress);

      const totalPrizeAmount = prizes.reduce((sum, p) => sum + p.amount_lamports, 0);
      const availableAffiliate = affiliateRewards.filter(w => w.is_available);
      const totalAffiliateAmount = availableAffiliate.reduce((sum, w) => sum + w.pending_lamports, 0);

      return {
        hasPrizes: prizes.length > 0,
        totalAmount: totalPrizeAmount,
        hasAffiliate: availableAffiliate.length > 0,
        affiliateAmount: totalAffiliateAmount
      };
    };

    notificationService.startPrizeChecker(walletAddress, checkFunction);

    return () => {
      notificationService.stopPrizeChecker();
    };
  }, [walletAddress, isEnabled]);

  const enableNotifications = useCallback(async () => {
    const granted = await notificationService.requestPermission();
    setIsEnabled(granted);
    setPermissionStatus(notificationService.getPermissionStatus());

    if (granted) {
      notificationService.playNotificationSound();
    }

    return granted;
  }, []);

  const disableNotifications = useCallback(() => {
    notificationService.setEnabled(false);
    notificationService.stopPrizeChecker();
    setIsEnabled(false);
  }, []);

  const checkForPrizes = useCallback(async () => {
    if (!walletAddress) return;

    const prizes = await claimService.getUnclaimedPrizes(walletAddress);
    const affiliateRewards = await claimService.getClaimableAffiliateRewards(walletAddress);

    const totalPrizeAmount = prizes.reduce((sum, p) => sum + p.amount_lamports, 0);
    const availableAffiliate = affiliateRewards.filter(w => w.is_available);
    const totalAffiliateAmount = availableAffiliate.reduce((sum, w) => sum + w.pending_lamports, 0);

    if (prizes.length > 0 && totalPrizeAmount > 0) {
      await notificationService.showClaimAvailableNotification(totalPrizeAmount, 'prize');
      notificationService.playNotificationSound();
    }

    if (availableAffiliate.length > 0 && totalAffiliateAmount > 0) {
      await notificationService.showClaimAvailableNotification(totalAffiliateAmount, 'affiliate');
      notificationService.playNotificationSound();
    }
  }, [walletAddress]);

  return {
    isEnabled,
    permissionStatus,
    enableNotifications,
    disableNotifications,
    checkForPrizes
  };
}
