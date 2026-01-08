import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: 'lazy' | 'eager';
  placeholder?: string;
  onLoad?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  style = {},
  loading = 'lazy',
  placeholder,
  onLoad,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // Preload image
    const imageLoader = new Image();
    imageLoader.onload = () => {
      setIsLoaded(true);
      onLoad?.();
    };
    imageLoader.onerror = () => setHasError(true);
    imageLoader.src = src;

    return () => {
      imageLoader.onload = null;
      imageLoader.onerror = null;
    };
  }, [src, onLoad]);

  if (hasError) {
    return (
      <div 
        className={`bg-gray-800 flex items-center justify-center ${className}`}
        style={style}
      >
        <span className="text-gray-400 text-sm">Failed to load</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {/* Placeholder */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center"
          style={{
            background: placeholder || 'linear-gradient(90deg, #1f2937 25%, #374151 50%, #1f2937 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        >
          <style jsx>{`
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
          `}</style>
        </div>
      )}

      {/* Actual image */}
      <motion.img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        className="w-full h-full object-contain"
        style={{
          ...style,
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        decoding="async"
      />
    </div>
  );
}