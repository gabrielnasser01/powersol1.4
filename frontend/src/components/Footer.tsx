import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Github, MessageCircle, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { theme } from '../theme';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    platform: [
      { to: '/lottery', label: 'Lottery' },
      { to: '/affiliates', label: 'Affiliates' },
      { to: '/transparency', label: 'Transparency' },
      { to: '/profile', label: 'Profile' },
    ],
    legal: [
      { to: '/terms', label: 'Terms of Service', isExternal: false },
      { to: '/privacy', label: 'Privacy Policy', isExternal: false },
      { to: '/faq', label: 'FAQ', isExternal: false },
      { to: '/PowerSOL_Whitepaper_v1.0.6_(2)_(1)_(1).pdf', label: 'Whitepaper', isExternal: true },
    ],
    social: [
      { href: 'https://x.com/PowerS0L', icon: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ), label: 'X' },
      { href: 'https://github.com/powerSOL', icon: Github, label: 'GitHub' },
      { href: 'https://discord.gg/powerSOL', icon: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
      ), label: 'Discord' },
      { href: 'https://www.tiktok.com/@powersollottery', icon: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.88a8.18 8.18 0 0 0 4.76 1.52V6.94a4.84 4.84 0 0 1-1-.25z"/>
        </svg>
      ), label: 'TikTok' },
      { href: 'mailto:hello@powersol.io', icon: Mail, label: 'Email' },
    ],
  };

  return (
    <footer 
      className="relative border-t"
      style={{
        background: theme.colors.bg,
        borderColor: theme.colors.border,
      }}
    >
      {/* Gradient overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `linear-gradient(135deg, ${theme.colors.neonBlue}10, transparent, ${theme.colors.neonPink}10)`,
        }}
      />

      <div className="relative container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center space-x-2">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="p-2 rounded-lg"
                style={{
                  background: theme.gradients.button,
                  boxShadow: theme.shadows.neonGlow,
                }}
              >
                <Zap className="w-6 h-6 text-black" />
              </motion.div>
              <span 
                className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent"
                style={{ fontFamily: 'Orbitron, monospace' }}
              >
                powerSOL
              </span>
            </Link>
            
            <p className="text-zinc-400 leading-relaxed">
              The lottery protocol on Solana. Fair, transparent, and instant.
            </p>
            
            <div className="flex space-x-4">
              {footerLinks.social.map((social) => {
                const Icon = social.icon;
                return (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg transition-all duration-300"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(62, 203, 255, 0.05))',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    }}
                    whileHover={{
                      background: 'linear-gradient(135deg, rgba(62, 203, 255, 0.2), rgba(47, 255, 226, 0.15))',
                      borderColor: theme.colors.neonBlue,
                      boxShadow: `0 0 25px ${theme.colors.neonBlue}60, 0 0 40px ${theme.colors.neonCyan}30, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                      scale: 1.05,
                      rotate: [0, -2, 2, 0],
                    }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <Icon
                      className="w-4 h-4 text-zinc-300 transition-all duration-300"
                      style={{
                        filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5))',
                      }}
                    />
                  </motion.a>
                );
              })}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6" style={{ color: theme.colors.text }}>
              Platform
            </h4>
            <div className="space-y-3">
              {footerLinks.platform.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block text-zinc-400 hover:text-white transition-colors duration-300 hover:translate-x-1"
                  style={{ transition: 'all 0.3s ease' }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6" style={{ color: theme.colors.text }}>
              Legal
            </h4>
            <div className="space-y-3">
              {footerLinks.legal.map((link) => (
                link.isExternal ? (
                  <a
                    key={link.to}
                    href={link.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-zinc-400 hover:text-white transition-colors duration-300 hover:translate-x-1"
                    style={{ transition: 'all 0.3s ease' }}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="block text-zinc-400 hover:text-white transition-colors duration-300 hover:translate-x-1"
                    style={{ transition: 'all 0.3s ease' }}
                  >
                    {link.label}
                  </Link>
                )
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-lg font-semibold mb-6" style={{ color: theme.colors.text }}>
              Stay Updated
            </h4>
            <p className="text-zinc-400 mb-4">
              Get notified about new draws and features.
            </p>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full p-3 rounded-lg border bg-transparent text-white placeholder-zinc-500 focus:outline-none focus:ring-2"
                style={{
                  borderColor: theme.colors.border,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }}
              />
              <motion.button
                className="w-full py-3 rounded-lg font-semibold transition-all duration-300"
                style={{
                  background: theme.gradients.button,
                  color: '#000',
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Subscribe
              </motion.button>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-16 pt-8 border-t border-zinc-800">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="text-zinc-400 text-center md:text-left">
              <p>Responsible Play • 18+ • Check local laws • © 2025 powerSOL</p>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-zinc-500">
              <span>Powered by</span>
              <div className="flex items-center space-x-2">
                <img
                  src="https://i.imgur.com/eE1m8fp.png"
                  alt="Solana Coin"
                  className="w-8 h-8 object-contain"
                />
                <span style={{ color: theme.colors.text }}>Solana</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}