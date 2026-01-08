import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Zap, UserX, Link, Shield, Users, CheckCircle, Vote } from 'lucide-react';
import { theme } from '../theme';

const pillars = [
  {
    id: 'instant-win',
    icon: Zap,
    title: 'INSTANT WIN PAYOUTS',
    description: 'Lightning-fast prize distribution powered by Solana\'s blazing speed. Winners receive their prizes instantly upon draw completion.',
    features: ['Sub-second transactions', 'No withdrawal delays', 'Automatic distribution'],
  },
  {
    id: 'no-account',
    icon: UserX,
    title: 'NO ACCOUNT, JUST WALLET',
    description: 'Play anonymously using only your Solana wallet. No personal information required, no lengthy registration processes.',
    features: ['Complete anonymity', 'One-click participation', 'Wallet-only authentication'],
  },
  {
    id: 'on-chain',
    icon: Link,
    title: 'ON-CHAIN READY',
    description: 'Built for full blockchain transparency and decentralization. Every transaction is verifiable and immutable.',
    features: ['Blockchain verified', 'Immutable records', 'Full transparency'],
  },
  {
    id: 'anon-secure',
    icon: Shield,
    title: 'ANON & SECURE',
    description: 'Advanced cryptographic security without compromising your privacy. Your identity stays protected while ensuring fair play.',
    features: ['Zero-knowledge proofs', 'Encrypted transactions', 'Privacy-first design'],
  },
  {
    id: 'friends-rewards',
    icon: Users,
    title: 'FRIENDS = REWARDS',
    description: 'Earn generous commissions by inviting friends. Our multi-tier affiliate program rewards community builders.',
    features: ['Up to 30% commission', 'Lifetime earnings', 'Tiered reward system'],
  },
  {
    id: 'provably-fair',
    icon: CheckCircle,
    title: 'PROVABLY FAIR & TRANSPARENT',
    description: 'Cryptographically provable fairness using VRF technology. Every draw is transparent and mathematically verifiable.',
    features: ['VRF random generation', 'Open-source verification', 'Public audit trail'],
  },
  {
    id: 'decentralized-dao',
    icon: Vote,
    title: 'DECENTRALIZED & DAO GOVERNED',
    description: 'True decentralization with community-driven governance. Token holders vote on protocol upgrades, prize structures, and treasury allocations through our DAO.',
    features: ['Community governance', 'On-chain voting', 'Decentralized treasury'],
  },
];

export function PillarsAccordion() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const togglePillar = (id: string) => {
    setActiveId(activeId === id ? null : id);
  };

  return (
    <section id="how-it-works" className="py-20">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 
            className="text-4xl md:text-5xl font-bold mb-6"
            style={{ 
              fontFamily: 'Orbitron, monospace',
              color: theme.colors.text,
            }}
          >
            Our Pillars
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            The core principles that make powerSOL the most innovative lottery platform
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-4">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            const isActive = activeId === pillar.id;

            return (
              <motion.div
                key={pillar.id}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="rounded-2xl border overflow-hidden"
                style={{
                  background: theme.gradients.card,
                  borderColor: isActive ? theme.colors.neonBlue : theme.colors.border,
                  boxShadow: isActive ? theme.shadows.neonGlow : theme.shadows.cardGlow,
                  backdropFilter: 'blur(20px)',
                }}
              >
                <button
                  onClick={() => togglePillar(pillar.id)}
                  className="w-full p-6 flex items-center space-x-4 text-left hover:bg-white/5 transition-colors duration-300"
                >
                  <motion.div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${theme.colors.neonBlue}20, ${theme.colors.neonCyan}20)`,
                      border: `1px solid ${isActive ? theme.colors.neonBlue : 'rgba(255, 255, 255, 0.1)'}`,
                    }}
                    animate={{
                      scale: isActive ? 1.1 : 1,
                      boxShadow: isActive ? `0 0 20px ${theme.colors.neonBlue}60` : 'none',
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <Icon 
                      className="w-6 h-6"
                      style={{ color: isActive ? theme.colors.neonBlue : theme.colors.text }}
                    />
                  </motion.div>
                  
                  <div className="flex-grow">
                    <h3 
                      className="text-lg font-bold"
                      style={{ 
                        color: isActive ? theme.colors.neonBlue : theme.colors.text,
                        fontFamily: 'Orbitron, monospace',
                      }}
                    >
                      {pillar.title}
                    </h3>
                  </div>
                  
                  <motion.div
                    animate={{ rotate: isActive ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown 
                      className="w-6 h-6"
                      style={{ color: isActive ? theme.colors.neonBlue : theme.colors.textMuted }}
                    />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="border-t"
                      style={{ borderColor: theme.colors.border }}
                    >
                      <div className="p-6 space-y-4">
                        <p className="text-zinc-300 leading-relaxed">
                          {pillar.description}
                        </p>
                        
                        <div className="flex flex-wrap gap-2">
                          {pillar.features.map((feature, featureIndex) => (
                            <motion.span
                              key={featureIndex}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3, delay: featureIndex * 0.1 }}
                              className="px-3 py-1 rounded-full text-sm font-medium"
                              style={{
                                background: `${theme.colors.neonBlue}20`,
                                color: theme.colors.neonBlue,
                                border: `1px solid ${theme.colors.neonBlue}40`,
                              }}
                            >
                              {feature}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}