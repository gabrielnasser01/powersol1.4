let cachedPrice: number = 150;
let lastFetch: number = 0;
let pendingFetch: Promise<number> | null = null;
const CACHE_DURATION = 60000;
const listeners: Set<(price: number) => void> = new Set();

export const solPriceService = {
  async fetchPrice(): Promise<number> {
    const now = Date.now();
    if (now - lastFetch < CACHE_DURATION && cachedPrice > 0) {
      return cachedPrice;
    }

    if (pendingFetch) {
      return pendingFetch;
    }

    pendingFetch = (async () => {
      try {
        const response = await fetch(
          'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT'
        );
        const data = await response.json();
        const price = data?.price ? parseFloat(data.price) : 0;
        if (price > 0) {
          cachedPrice = price;
          lastFetch = Date.now();
          listeners.forEach(cb => cb(cachedPrice));
        }
      } catch (error) {
        try {
          const fallback = await fetch(
            'https://api.coinbase.com/v2/prices/SOL-USD/spot'
          );
          const json = await fallback.json();
          const price = json?.data?.amount ? parseFloat(json.data.amount) : 0;
          if (price > 0) {
            cachedPrice = price;
            lastFetch = Date.now();
            listeners.forEach(cb => cb(cachedPrice));
          }
        } catch {
          console.warn('Failed to fetch SOL price, using cached:', cachedPrice);
        }
      } finally {
        pendingFetch = null;
      }
      return cachedPrice;
    })();

    return pendingFetch;
  },

  getPrice(): number {
    return cachedPrice;
  },

  subscribe(callback: (price: number) => void): () => void {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  startAutoRefresh(intervalMs: number = 60000): () => void {
    this.fetchPrice();
    const id = setInterval(() => this.fetchPrice(), intervalMs);
    return () => clearInterval(id);
  }
};
