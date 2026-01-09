import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { theme } from '../theme';

const faqs = [
  {
    id: 'how-it-works',
    question: 'How does powerSOL work?',
    answer: 'powerSOL is a decentralized lottery platform built on Solana. Players purchase tickets for draws. Winners are selected using cryptographically secure random number generation, and prizes are distributed automatically via smart contracts.',
  },
  {
    id: 'ticket-cost',
    question: 'How much does a ticket cost?',
    answer: 'Each lottery ticket costs 0.1sol for the tri-daily lottery, 0.2sol for the montly jackpot, 0.2sol for special event tickets and 0.33sol for annual grand prize. You can purchase multiple tickets to increase your chances of winning.',
  },
  {
    id: 'when-draws',
    question: 'When do draws happen?',
    answer: 'Tri-daily draws occur every 3 days. We also have monthly jackpot draws and special seasonal events like Halloween and the annual grand prize. Check the countdown timer on the lottery page for the next draw.',
  },
  {
    id: 'how-winners',
    question: 'How are winners selected?',
    answer: 'Winners are selected using VRF (Verifiable Random Function), ensuring completely random and tamper-proof results. The process is fully transparent and verifiable on the blockchain.',
  },
  {
    id: 'prize-distribution',
    question: 'How are prizes distributed?',
    answer: 'Prizes are distributed automatically to winners\' claim page immediately after each draw. There are no withdrawal delays - everything is handled by smart contracts.',
  },
  {
    id: 'affiliate-program',
    question: 'How does the affiliate program work?',
    answer: 'Our affiliate program offers up to 30% commission on referrals. You earn commission when people you refer purchase lottery tickets. The more you refer, the higher your tier and commission rate.',
  },
  {
    id: 'legal-regions',
    question: 'Is powerSOL legal in my region?',
    answer: 'It\'s your responsibility to ensure lottery participation is legal in your jurisdiction. powerSOL operates on decentralized blockchain technology, but local laws may vary. Please check your local regulations.',
  },
  {
    id: 'wallet-required',
    question: 'Do I need to create an account?',
    answer: 'No account creation is required. powerSOL works with just your Solana wallet (like Phantom or Solflare). Connect your wallet to participate - that\'s it!',
  },
];

export function FAQ() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    setActiveId(activeId === id ? null : id);
  };

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 
            className="text-4xl md:text-6xl font-bold mb-6"
            style={{ 
              fontFamily: 'Orbitron, monospace',
              background: theme.gradients.neon,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            FAQ
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Find answers to frequently asked questions about powerSOL
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-4">
          {faqs.map((faq, index) => {
            const isActive = activeId === faq.id;

            return (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
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
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full p-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors duration-300"
                >
                  <div className="flex items-center space-x-4">
                    <div 
                      className="p-2 rounded-lg"
                      style={{
                        background: isActive ? `${theme.colors.neonBlue}20` : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${isActive ? theme.colors.neonBlue : 'rgba(255, 255, 255, 0.1)'}`,
                      }}
                    >
                      <HelpCircle 
                        className="w-5 h-5"
                        style={{ color: isActive ? theme.colors.neonBlue : theme.colors.textMuted }}
                      />
                    </div>
                    <h3 
                      className="text-lg font-semibold"
                      style={{ color: isActive ? theme.colors.neonBlue : theme.colors.text }}
                    >
                      {faq.question}
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
                      <div className="p-6">
                        <p className="text-zinc-300 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}