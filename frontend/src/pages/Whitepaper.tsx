import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, ExternalLink, Zap, Shield, Users, Trophy, BarChart3, Globe } from 'lucide-react';
import { theme } from '../theme';

const sections = [
  {
    icon: Zap,
    title: 'Protocol Overview',
    content: 'powerSOL is a decentralized lottery protocol built natively on Solana. It leverages the speed and low-cost transactions of Solana to deliver a transparent, fair, and instant lottery experience. All operations are governed by smart contracts deployed on-chain, ensuring trustless execution of draws and prize distributions.',
  },
  {
    icon: Shield,
    title: 'Verifiable Randomness (VRF)',
    content: 'Every draw uses Verifiable Random Function (VRF) technology to guarantee provably fair and tamper-proof winner selection. The VRF proof is published on-chain, allowing anyone to independently verify that the result was not manipulated. This eliminates the need to trust a centralized operator.',
  },
  {
    icon: BarChart3,
    title: 'Lottery Types & Economics',
    content: 'The protocol offers four lottery tiers: Tri-Daily (0.1 SOL, every 3 days), Monthly Jackpot (0.2 SOL), Special Events (0.2 SOL, seasonal), and Annual Grand Prize (0.33 SOL). Prize pool distribution is designed to maximize player value while maintaining protocol sustainability. A portion of each ticket sale funds the house operations, affiliate commissions, and future development.',
  },
  {
    icon: Trophy,
    title: 'Prize Distribution',
    content: 'Winners receive their prizes instantly through the on-chain claim system. The smart contract holds all funds in escrow until a draw occurs, then automatically makes prizes available for claiming. No withdrawal delays, no manual processing. The entire flow is trustless and verifiable on the Solana blockchain.',
  },
  {
    icon: Users,
    title: 'Affiliate Program',
    content: 'The three-tier affiliate program incentivizes community growth. Level 1 affiliates earn 10% commission, Level 2 earns 15%, and Level 3 earns up to 20% on referred ticket purchases. Commission tracking and payouts are handled on-chain, ensuring transparency and timely distributions.',
  },
  {
    icon: Globe,
    title: 'Transparency & Governance',
    content: 'All lottery wallets, prize pools, and transaction histories are publicly verifiable on the Solana blockchain. The transparency page provides real-time data on pool sizes, draw histories, and fund flows. powerSOL is committed to full operational transparency as a core protocol principle.',
  },
];

export function Whitepaper() {
  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="container mx-auto px-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
            style={{
              background: theme.gradients.button,
              boxShadow: theme.shadows.buttonGlow,
            }}
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <FileText className="w-8 h-8 text-black" />
          </motion.div>

          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{
              fontFamily: 'Orbitron, monospace',
              background: theme.gradients.neon,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Whitepaper
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: theme.colors.textMuted }}>
            A technical overview of the powerSOL decentralized lottery protocol on Solana.
          </p>

          <motion.a
            href="/powersol_whitepaper_v1.0.6.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 mt-8 px-6 py-3 rounded-xl font-semibold transition-all duration-300"
            style={{
              background: theme.gradients.button,
              color: '#000',
              boxShadow: theme.shadows.buttonGlow,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download className="w-5 h-5" />
            <span>Download Full PDF</span>
            <ExternalLink className="w-4 h-4" />
          </motion.a>
        </motion.div>

        <div className="space-y-6">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="rounded-2xl border p-6 md:p-8 transition-all duration-300"
                style={{
                  background: theme.colors.card,
                  borderColor: theme.colors.border,
                }}
              >
                <div className="flex items-start space-x-4">
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${theme.colors.neonBlue}15`,
                      border: `1px solid ${theme.colors.neonBlue}30`,
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: theme.colors.neonBlue }} />
                  </div>
                  <div>
                    <h2
                      className="text-xl font-bold mb-3"
                      style={{ color: theme.colors.text }}
                    >
                      {section.title}
                    </h2>
                    <p
                      className="leading-relaxed"
                      style={{ color: theme.colors.textMuted, lineHeight: '1.75' }}
                    >
                      {section.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-12 text-center rounded-2xl border p-8"
          style={{
            background: `linear-gradient(135deg, ${theme.colors.neonBlue}08, ${theme.colors.neonCyan}05)`,
            borderColor: `${theme.colors.neonBlue}30`,
          }}
        >
          <p className="text-lg font-semibold mb-2" style={{ color: theme.colors.text }}>
            Version 1.0.6
          </p>
          <p style={{ color: theme.colors.textMuted }}>
            For the complete technical specification including smart contract architecture,
            security audits, and tokenomics, download the full PDF above.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
