import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface CandleData {
  id: number;
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
}

export function SolanaCandlestickChart() {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [currentPrice, setCurrentPrice] = useState(150.25);

  const chartMetrics = useMemo(() => {
    if (candles.length === 0) return { maxPrice: 0, minPrice: 0, priceRange: 0 };
    
    const maxPrice = Math.max(...candles.map(c => c.high));
    const minPrice = Math.min(...candles.map(c => c.low));
    const priceRange = maxPrice - minPrice;
    
    return { maxPrice, minPrice, priceRange };
  }, [candles]);

  // Generate initial candle data
  useEffect(() => {
    const initialCandles: CandleData[] = [];
    let basePrice = 148;
    
    for (let i = 0; i < 20; i++) {
      const open = basePrice + (Math.random() - 0.5) * 4;
      const close = open + (Math.random() - 0.5) * 6;
      const high = Math.max(open, close) + Math.random() * 3;
      const low = Math.min(open, close) - Math.random() * 3;
      
      initialCandles.push({
        id: i,
        open,
        high,
        low,
        close,
        timestamp: Date.now() - (20 - i) * 60000,
      });
      
      basePrice = close;
    }
    
    setCandles(initialCandles);
    setCurrentPrice(basePrice);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCandles(prev => {
        const lastCandle = prev[prev.length - 1];
        if (!lastCandle) return prev;
        const newOpen = lastCandle.close;
        const priceChange = (Math.random() - 0.5) * 4;
        const newClose = newOpen + priceChange;
        const newHigh = Math.max(newOpen, newClose) + Math.random() * 2;
        const newLow = Math.min(newOpen, newClose) - Math.random() * 2;

        const newCandle: CandleData = {
          id: Date.now(),
          open: newOpen,
          high: newHigh,
          low: newLow,
          close: newClose,
          timestamp: Date.now(),
        };

        setCurrentPrice(newClose);

        return [...prev.slice(-19), newCandle];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const { maxPrice, minPrice, priceRange } = chartMetrics;
  const chartHeight = 120;

  const getY = (price: number) => {
    return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  };

  const priceChange = candles.length > 1 ? candles[candles.length - 1].close - candles[candles.length - 2].close : 0;
  const priceChangePercent = candles.length > 1 ? (priceChange / candles[candles.length - 2].close) * 100 : 0;

  if (candles.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center text-zinc-400 font-mono text-sm">
          Loading chart data...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Price Display */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold font-mono" style={{ 
            color: '#ffffff',
            textShadow: '0 0 8px rgba(255, 255, 255, 0.5)'
          }}>
            ${currentPrice.toFixed(2)}
          </div>
          <div className="text-sm font-mono" style={{ 
            color: priceChange >= 0 ? '#00ff88' : '#ff4444',
            textShadow: `0 0 6px ${priceChange >= 0 ? '#00ff88' : '#ff4444'}60`
          }}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
          </div>
        </div>
        
        <div className="text-xs font-mono text-white/60">
          REAL-TIME
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: `${chartHeight}px` }}>
        <svg 
          width="100%" 
          height={chartHeight}
          className="overflow-visible"
          style={{ background: 'rgba(0, 0, 0, 0.3)' }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <line
              key={i}
              x1="0"
              y1={chartHeight * ratio}
              x2="100%"
              y2={chartHeight * ratio}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="0.5"
            />
          ))}

          {/* Candles */}
          {candles.map((candle, index) => {
            const x = (index / (candles.length - 1)) * 100;
            const isGreen = candle.close > candle.open;
            const bodyTop = getY(Math.max(candle.open, candle.close));
            const bodyBottom = getY(Math.min(candle.open, candle.close));
            const bodyHeight = Math.max(1, bodyBottom - bodyTop);
            
            return (
              <motion.g
                key={candle.id}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ duration: 0.5 }}
              >
                {/* Wick */}
                <line
                  x1={`${x}%`}
                  y1={getY(candle.high)}
                  x2={`${x}%`}
                  y2={getY(candle.low)}
                  stroke={isGreen ? '#00ff88' : '#ff4444'}
                  strokeWidth="1"
                  opacity="0.8"
                />
                
                {/* Body */}
                <rect
                  x={`${x - 1}%`}
                  y={bodyTop}
                  width="2%"
                  height={bodyHeight}
                  fill={isGreen ? '#00ff88' : '#ff4444'}
                  opacity="0.9"
                  rx="1"
                />
                
                {/* Glow effect for latest candle */}
                {index === candles.length - 1 && (
                  <rect
                    x={`${x - 1}%`}
                    y={bodyTop}
                    width="2%"
                    height={bodyHeight}
                    fill="none"
                    stroke={isGreen ? '#00ff88' : '#ff4444'}
                    strokeWidth="2"
                    opacity="0.6"
                    rx="1"
                    filter="blur(2px)"
                  />
                )}
              </motion.g>
            );
          })}
        </svg>
        
        {/* Price labels */}
        <div className="absolute left-0 top-0 text-xs font-mono text-white/60">
          ${maxPrice.toFixed(0)}
        </div>
        <div className="absolute left-0 bottom-0 text-xs font-mono text-white/60">
          ${minPrice.toFixed(0)}
        </div>
      </div>

      {/* Time indicators */}
      <div className="flex justify-between text-xs font-mono text-white/40">
        <span>-20m</span>
        <span>-10m</span>
        <span>NOW</span>
      </div>
    </div>
  );
}