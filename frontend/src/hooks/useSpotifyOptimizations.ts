import { useEffect, useCallback, useRef, useMemo } from 'react';

// Spotify-style optimizations
export function useSpotifyOptimizations() {
  useEffect(() => {
    try {
      // Images preload temporarily disabled until they are restored

      // Optimize font loading
      const fontLink = document.createElement('link');
      fontLink.rel = 'preload';
      fontLink.as = 'font';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Orbitron:wght@400;700;900&display=swap';
      fontLink.crossOrigin = 'anonymous';
      document.head.appendChild(fontLink);

      // Reduce layout shifts
      document.documentElement.style.scrollBehavior = 'auto';

      return () => {
        document.documentElement.style.scrollBehavior = 'smooth';
      };
    } catch (error) {
      console.error('Optimization error:', error);
    }
  }, []);
}

// Throttled scroll handler
export function useThrottledScroll(
  callback: (scrollY: number) => void,
  delay: number = 16 // 60fps
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastScrollY = useRef(0);

  const throttledCallback = useCallback(() => {
    const currentScrollY = window.scrollY;
    
    if (Math.abs(currentScrollY - lastScrollY.current) > 1) {
      callback(currentScrollY);
      lastScrollY.current = currentScrollY;
    }
  }, [callback]);

  useEffect(() => {
    const handleScroll = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(throttledCallback, delay);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [throttledCallback, delay]);
}

// Memory leak prevention
export function useCleanup(cleanup: () => void, deps: any[] = []) {
  useEffect(() => {
    return cleanup;
  }, deps);
}

// Efficient re-renders
export function useShallowMemo<T extends Record<string, any>>(obj: T): T {
  return useMemo(() => obj, Object.values(obj));
}