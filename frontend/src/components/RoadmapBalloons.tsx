import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Trophy, Shield, Smartphone } from 'lucide-react';
import { theme } from '../theme';

const roadmapItems = [
  {
    id: 1,
    icon: Calendar,
    title: 'Phase 1',
    description: 'Lottery System, Affiliates and Missions',
    status: 'active',
    color: theme.colors.neonBlue,
  },
  {
    id: 2,
    icon: Trophy,
    title: 'Phase 2',
    description: 'Airdrop System, 2 More Traditional Lotteries, 3 Tier NFT Pack, on-chain vrf',
    status: 'upcoming',
    color: theme.colors.neonPink,
  },
  {
    id: 3,
    icon: Shield,
    title: 'Phase 3',
    description: 'TGE, Holders Rewards, NFT Special Draw, Certik Audit',
    status: 'upcoming',
    color: theme.colors.neonCyan,
  },
  {
    id: 4,
    icon: Smartphone,
    title: 'Phase 4',
    description: 'DAO, Voting System, THE FUTURE IS YOURS',
    status: 'planned',
    color: theme.colors.neonPurple,
  },
];

export function RoadmapBalloons() {
  return (
    <section className="py-20">
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
            Roadmap
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Our journey to create the most innovative lottery experience on Solana
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {roadmapItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.1,
                  ease: 'easeOut' 
                }}
                whileHover={{ 
                  y: -10, 
                  scale: 1.05,
                  transition: { duration: 0.3 }
                }}
                className="relative p-6 rounded-2xl border cursor-pointer group"
                style={{
                  background: theme.gradients.card,
                  borderColor: item.status === 'active' ? item.color : theme.colors.border,
                  boxShadow: item.status === 'active' ? `0 0 30px ${item.color}40` : theme.shadows.cardGlow,
                  backdropFilter: 'blur(20px)',
                }}
              >
                {/* Status indicator */}
                {item.status === 'active' && (
                  <motion.div
                    className="absolute -top-2 -right-2 w-4 h-4 rounded-full"
                    style={{ background: item.color }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [1, 0.7, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                )}

                {/* Icon */}

                {/* Content */}
                <h3 
                  className="text-xl font-bold mb-3 text-center"
                  style={{ color: item.color }}
                >
                  {item.title}
                </h3>
                <p className="text-zinc-400 leading-relaxed text-center">
                  {item.description}
                </p>

                {/* Status badge */}
                <div className="mt-4 text-center">
                  <span 
                    className="inline-block px-3 py-1 rounded-full text-xs font-medium capitalize"
                    style={{
                      background: `${item.color}20`,
                      color: item.color,
                      border: `1px solid ${item.color}40`,
                    }}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Hover effect overlay */}
                <motion.div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${item.color}05, transparent)`,
                  }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}