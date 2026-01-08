import { useEffect } from 'react';
import { AppRouter } from './router';
import { initializeStorage } from './store/persist';
import { useSpotifyOptimizations } from './hooks/useSpotifyOptimizations';
import { preloadCriticalResources } from './utils/performance';
import { WalletProvider } from './contexts/WalletContext';
import { initAffiliateTracking } from './utils/affiliateTracking';
import { solPriceService } from './services/solPriceService';
import { notificationService } from './services/notificationService';

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
      <AppRouter />
    </WalletProvider>
  );
}

export default App;