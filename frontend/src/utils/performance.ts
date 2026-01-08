import { useState, useCallback, useRef, useEffect } from 'react';

// Spotify-level performance optimizations
import { useMemo } from 'react';

// Optimized state updates
export function useOptimizedState<T>(
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState(initialValue);
  const frameRef = useRef<number>();

  const optimizedSetState = useCallback((value: T | ((prev: T) => T)) => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      setState(value);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return [state, optimizedSetState];
}

// Virtual scrolling for large lists
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const scrollTop = useRef(0);
  const startIndex = Math.floor(scrollTop.current / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  return useMemo(() => ({
    visibleItems: items.slice(startIndex, endIndex),
    startIndex,
    totalHeight: items.length * itemHeight,
    offsetY: startIndex * itemHeight,
  }), [items, startIndex, endIndex, itemHeight]);
}

// Debounced state updates
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 16 // 60fps
): [T, (value: T) => void] {
  const [state, setState] = useState(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedSetState = useCallback((value: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setState(value);
    }, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, debouncedSetState];
}

// Intersection observer for lazy loading
export function useIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
) {
  const targetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options,
    });

    observer.observe(target);

    return () => {
      observer.unobserve(target);
      observer.disconnect();
    };
  }, [callback, options]);

  return targetRef;
}

// Preload critical resources
export function preloadCriticalResources() {
  // Temporarily disabled until images are properly loaded
  try {
    console.log('Preload skipped - images need to be restored');
  } catch (error) {
    console.error('Preload error:', error);
  }
}

// Memory-efficient animation frame
export function useOptimizedAnimation(
  callback: () => void,
  deps: any[] = []
) {
  const frameRef = useRef<number>();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const animate = () => {
      callbackRef.current();
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, deps);
}

// Component memoization helper
export function createMemoComponent<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  propsAreEqual?: (prevProps: T, nextProps: T) => boolean
) {
  return React.memo(Component, propsAreEqual);
}

// Batch state updates
export function useBatchedUpdates() {
  const [, forceUpdate] = useState({});
  const pendingUpdates = useRef<(() => void)[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const batchUpdate = useCallback((updateFn: () => void) => {
    pendingUpdates.current.push(updateFn);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      pendingUpdates.current.forEach(fn => fn());
      pendingUpdates.current = [];
      forceUpdate({});
    }, 0);
  }, []);

  return batchUpdate;
}