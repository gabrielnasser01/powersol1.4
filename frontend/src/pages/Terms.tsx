import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { theme } from '../theme';

export function Terms() {
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
            Terms of Service
          </h1>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="prose prose-invert max-w-none"
            style={{
              background: theme.gradients.card,
              borderRadius: '2rem',
              border: `1px solid ${theme.colors.border}`,
              boxShadow: theme.shadows.cardGlow,
              backdropFilter: 'blur(20px)',
              padding: '3rem',
            }}
          >
            <div className="flex items-center space-x-4 mb-8">
              <div 
                className="p-3 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.neonBlue}20, ${theme.colors.neonCyan}20)`,
                  border: `1px solid ${theme.colors.neonBlue}40`,
                }}
              >
                <FileText className="w-6 h-6" style={{ color: theme.colors.neonBlue }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                  Legal Terms & Conditions
                </h2>
                <p className="text-zinc-400">Last updated: January 2024</p>
              </div>
            </div>

            <div className="space-y-6 text-zinc-300">
              <section>
                <h3 className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>
                  1. Acceptance of Terms
                </h3>
                <p>
                  By accessing and using powerSOL, you accept and agree to be bound by the terms and provision of this agreement.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>
                  2. Age Requirement
                </h3>
                <p>
                  You must be 18 years or older to participate in powerSOL lottery draws. By using our service, you represent that you meet this age requirement.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>
                  3. Legal Compliance
                </h3>
                <p>
                  It is your responsibility to ensure that your participation in lottery activities is legal in your jurisdiction. powerSOL does not accept responsibility for users who participate in regions where such activities are prohibited.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>
                  4. Responsible Gaming
                </h3>
                <p>
                  powerSOL promotes responsible gaming. Please gamble responsibly and never spend more than you can afford to lose. If you feel you may have a gambling problem, please seek help from appropriate support services.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>
                  5. Prize Distribution
                </h3>
                <p>
                  Prizes are distributed automatically via smart contracts on the Solana blockchain. Winners are determined through cryptographically secure random number generation.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>
                  6. Limitation of Liability
                </h3>
                <p>
                  powerSOL shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>
                  7. Changes to Terms
                </h3>
                <p>
                  We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting on our website.
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}