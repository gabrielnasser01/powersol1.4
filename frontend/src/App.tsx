import { useEffect } from 'react';
import { AppRouter } from './router';
import { initializeStorage } from './store/persist';
import { useSpotifyOptimizations } from './hooks/useSpotifyOptimizations';
import { preloadCriticalResources } from './utils/performance';
import { WalletProvider, useWallet } from './contexts/WalletContext';
import { ToastProvider } from './contexts/ToastContext';
import { initAffiliateTracking } from './utils/affiliateTracking';
import { solPriceService } from './services/solPriceService';
import { notificationService } from './services/notificationService';
import { useAgeVerification } from './hooks/useAgeVerification';
import { AgeVerificationModal } from './components/AgeVerificationModal';

function AgeVerificationGate({ children }: { children: React.ReactNode }) {
  const { publicKey, connected } = useWallet();
  const { showModal, recordVerification, setShowModal } = useAgeVerification(connected ? publicKey : null);

  return (
    <>
      {children}
      <AgeVerificationModal
        open={showModal}
        onVerified={() => setShowModal(false)}
        recordVerification={recordVerification}
      />
    </>
  );
}

function App() {
  useSpotifyOptimizations();

  useEffect(() => {
    try {
      initializeStorage();
      preloadCriticalResources();
      initAffiliateTracking();
      notificationService.init();
      const stopPriceRefresh = solPriceService.startAutoRefresh(60000);
      return () => stopPriceRefresh();
    } catch (error) {
      console.error('App initialization error:', error);
    }
  }, []);

  return (
    <WalletProvider>
      <ToastProvider>
        <AgeVerificationGate>
          <AppRouter />
        </AgeVerificationGate>
      </ToastProvider>
    </WalletProvider>
  );
}

export default App;