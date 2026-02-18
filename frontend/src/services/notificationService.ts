const NOTIFICATION_STORAGE_KEY = 'powersol_notifications_enabled';
const LAST_CHECK_KEY = 'powersol_last_prize_check';
const CHECK_INTERVAL = 60000;

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
}

class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  async init(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      } catch (error) {
        console.warn('Service worker not available, using fallback notifications');
      }
    }

    this.initialized = true;
    return true;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      this.setEnabled(true);
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    this.setEnabled(granted);
    return granted;
  }

  isEnabled(): boolean {
    return localStorage.getItem(NOTIFICATION_STORAGE_KEY) === 'true';
  }

  setEnabled(enabled: boolean): void {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, String(enabled));
  }

  getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  async showNotification(payload: NotificationPayload): Promise<void> {
    if (!this.isEnabled() || Notification.permission !== 'granted') {
      return;
    }

    if (this.swRegistration?.active) {
      try {
        this.swRegistration.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          ...payload
        });
        return;
      } catch {
        // fallback to native notification
      }
    }

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: '/img-moeda.png',
        tag: 'powersol-claim',
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        if (payload.url) {
          window.location.href = payload.url;
        }
        notification.close();
      };

      this.playNotificationSound();
    } catch (error) {
      console.warn('Failed to show notification:', error);
    }
  }

  async showClaimAvailableNotification(amount: number, type: 'prize' | 'affiliate' = 'prize'): Promise<void> {
    const formattedAmount = (amount / 1_000_000_000).toFixed(4);

    const payload: NotificationPayload = type === 'prize'
      ? {
          title: 'Premio Disponivel!',
          body: `Voce ganhou ${formattedAmount} SOL! Resgate agora.`,
          url: '/profile'
        }
      : {
          title: 'Comissao de Afiliado!',
          body: `Voce tem ${formattedAmount} SOL em comissoes para resgatar!`,
          url: '/profile'
        };

    await this.showNotification(payload);
  }

  async showNewPrizeNotification(lotteryType: string, tier: number): Promise<void> {
    const tierNames: Record<number, string> = {
      1: 'Primeiro Lugar',
      2: 'Segundo Lugar',
      3: 'Terceiro Lugar'
    };

    const lotteryNames: Record<string, string> = {
      'tri-daily': 'Loteria Tri-Diaria',
      'special-event': 'Special Event',
      'jackpot': 'Jackpot',
      'grand-prize': 'Grand Prize'
    };

    await this.showNotification({
      title: 'Voce Ganhou!',
      body: `${tierNames[tier] || `Tier ${tier}`} na ${lotteryNames[lotteryType] || lotteryType}!`,
      url: '/profile'
    });
  }

  startPrizeChecker(
    walletAddress: string,
    checkFunction: () => Promise<{ hasPrizes: boolean; totalAmount: number; hasAffiliate: boolean; affiliateAmount: number }>
  ): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    if (!this.isEnabled() || !walletAddress) {
      return;
    }

    const check = async () => {
      const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
      const now = Date.now();

      if (lastCheck && now - parseInt(lastCheck) < CHECK_INTERVAL) {
        return;
      }

      try {
        const result = await checkFunction();

        if (result.hasPrizes && result.totalAmount > 0) {
          await this.showClaimAvailableNotification(result.totalAmount, 'prize');
        }

        if (result.hasAffiliate && result.affiliateAmount > 0) {
          await this.showClaimAvailableNotification(result.affiliateAmount, 'affiliate');
        }

        localStorage.setItem(LAST_CHECK_KEY, String(now));
      } catch (error) {
        console.error('Prize check failed:', error);
      }
    };

    check();
    this.checkInterval = setInterval(check, CHECK_INTERVAL);
  }

  stopPrizeChecker(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  playNotificationSound(): void {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }
}

export const notificationService = new NotificationService();
