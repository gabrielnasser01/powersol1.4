import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { theme } from '../theme';

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-4 rounded-full shadow-lg transition-all duration-300 group"
          style={{
            background: theme.gradients.button,
            boxShadow: theme.shadows.buttonGlow,
          }}
          whileHover={{
            scale: 1.1,
            rotate: [0, -5, 5, 0],
            background: `linear-gradient(135deg, ${theme.colors.neonBlue}, ${theme.colors.neonCyan})`,
            boxShadow: `0 0 25px rgba(62, 203, 255, 0.5), 0 0 50px rgba(47, 255, 226, 0.3)`,
            border: `2px solid ${theme.colors.neonBlue}`,
          }}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
        >
          <motion.div
            animate={isHovered ? {
              y: [-2, -6, -2],
              scale: [1, 1.1, 1],
            } : {}}
            transition={{
              duration: 0.6,
              repeat: isHovered ? Infinity : 0,
              ease: "easeInOut"
            }}
          >
            <ArrowUp 
              className="w-6 h-6 text-black" 
              style={{
                filter: 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.3))',
              }}
            />
          </motion.div>
          
          {/* Enhanced ripple effects */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${theme.colors.neonCyan}40 0%, transparent 70%)`,
            }}
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ 
              scale: [0, 1.8, 2.2],
              opacity: [0.6, 0.3, 0]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
          
          {/* Secondary ripple */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${theme.colors.neonBlue}30 0%, transparent 60%)`,
            }}
            initial={{ scale: 0, opacity: 0.4 }}
            animate={{ 
              scale: [0, 1.2, 1.8],
              opacity: [0.4, 0.2, 0]
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.3
            }}
          />
          
        </motion.button>
      )}
    </AnimatePresence>
  );
}