import { useEffect, useRef, useCallback, useState } from 'react';

const REFRESH_INTERVAL = 10_000;

export function useAdminAutoRefresh(loadFn: () => Promise<void>) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadRef = useRef(loadFn);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  loadRef.current = loadFn;

  const refresh = useCallback(async () => {
    try {
      await loadRef.current();
      setLastRefresh(new Date());
    } catch {
    }
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(refresh, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  return { lastRefresh, refresh };
}
