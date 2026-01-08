import React from 'react';
import { motion } from 'framer-motion';

export function SpotifyLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{
      background: 'linear-gradient(135deg, #0a0b0f 0%, #1a1a1a 100%)',
    }}>
      {/* Spotify-style loading animation */}
      <div className="flex items-center space-x-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="w-1 bg-white rounded-full"
            style={{
              height: '20px',
              background: 'linear-gradient(135deg, #3ecbff, #2fffe2)',
            }}
            animate={{
              scaleY: [0.3, 1, 0.3],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.1,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      
      {/* Loading text */}
      <motion.div
        className="absolute bottom-1/3 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div 
          className="text-2xl font-bold mb-2"
          style={{ 
            fontFamily: 'Orbitron, monospace',
            background: 'linear-gradient(135deg, #3ecbff, #2fffe2)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}
        >
          powerSOL
        </div>
        <div className="text-sm text-zinc-400">Loading at light speed...</div>
      </motion.div>
    </div>
  );
}