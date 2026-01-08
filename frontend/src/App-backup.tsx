import React, { useEffect } from 'react';
import { AppRouter } from './router';
import { initializeStorage, userStorage } from './store/persist';
import { useSpotifyOptimizations } from './hooks/useSpotifyOptimizations';
import { preloadCriticalResources } from './utils/performance';

function App() {
  useSpotifyOptimizations();

  useEffect(() => {
    initializeStorage();
    preloadCriticalResources();

    const user = userStorage.get();
    if (!user.publicKey) {
      userStorage.set({
        publicKey: '7xKj9mPqR8vN3wL5tY2uE6sA1bC4dF8hG9iJ0kM3nO5pQ7rS9tU',
        connectedAt: Date.now(),
        name: 'Demo User',
        email: 'demo@powersol.io',
        country: 'US',
        notifications: true,
      });
    }
  }, []);

  return <AppRouter />;
}

export default App;
