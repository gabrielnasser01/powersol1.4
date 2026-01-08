import React, { useRef, useEffect, useCallback } from 'react';

export function useFrameLimiter(fps = 30) {
  const handleRef = useRef<number>();
  const lastRef = useRef(0);
  const interval = 1000 / fps;

  const start = useCallback((callback: () => void) => {
    const loop = (timestamp: number) => {
      if (timestamp - lastRef.current >= interval) {
        lastRef.current = timestamp;
        callback();
      }
      handleRef.current = requestAnimationFrame(loop);
    };
    
    if (!handleRef.current) {
      handleRef.current = requestAnimationFrame(loop);
    }
  }, [interval]);

  const stop = useCallback(() => {
    if (handleRef.current) {
      cancelAnimationFrame(handleRef.current);
      handleRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { start, stop };
}

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}