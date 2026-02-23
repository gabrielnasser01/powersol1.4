import { motion } from 'framer-motion';
import { FileText, Shield, Zap, Users, BarChart3, Lock, ArrowRight, ExternalLink } from 'lucide-react';
import { theme } from '../theme';

const sections = [
  {
    id: 'abstract',
    icon: FileText,
    title: 'Abstract',
    content: `powerSOL is a decentralized lottery protocol built natively on the Solana blockchain. By leveraging Solana's high throughput and low transaction costs, powerSOL delivers a fair, transparent, and instant lottery experience. All draws use Verifiable Random Functions (VRF) to guarantee tamper-proof randomness, and all transactions are publicly verifiable on-chain.`,
  },
  {
    id: 'problem',
    icon: Shield,
    title: 'The Problem',
    content: `Traditional lotteries suffer from opacity, high fees, slow payouts, and centralized control. Players have no way to verify fairness, operators take excessive cuts, and winnings can take weeks to arrive. These systems rely entirely on trust in a central authority, with no mechanism for independent verification.`,
  },
  {
    id: 'solution',
    icon: Zap,
    title: 'The powerSOL Solution',
    content: `powerSOL eliminates these issues through smart contract automation on Solana. Ticket purchases, prize pools, draws, and payouts are all handled on-chain with zero intermediaries. VRF-based randomness ensures provably fair winner selection. Prizes are distributed instantly to winners' wallets after each draw, with no withdrawal delays or manual processing.`,
  },
  {
    id: 'tokenomics',
    icon: BarChart3,
    title: 'Prize Pool Distribution',
    content: `Each lottery type follows a transparent distribution model. For the tri-daily lottery: 70% goes to the prize pool, 10% to the jackpot accumulator, 10% to the grand prize fund, and 10% to platform operations and affiliate commissions. The jackpot and grand prize pools grow continuously, creating increasingly attractive rewards over time.`,
  },
  {
    id: 'lottery-types',
    icon: Users,
    title: 'Lottery Types',
    content: `powerSOL offers four distinct lottery experiences: (1) Tri-Daily Lottery - draws every 3 days with 0.1 SOL tickets, (2) Monthly Jackpot - accumulated pool drawn monthly at 0.2 SOL per ticket, (3) Special Events - seasonal themed lotteries with unique prize structures at 0.2 SOL, and (4) Annual Grand Prize - the ultimate draw with the largest accumulated pool at 0.33 SOL per ticket.`,
  },
  {
    id: 'security',
    icon: Lock,
    title: 'Security & Fairness',
    content: `All smart contracts are open-source and auditable. VRF integration ensures that no party — including the powerSOL team — can predict or manipulate draw outcomes. The protocol uses Solana's native security features, and all prize funds are held in program-derived accounts controlled exclusively by the smart contracts.`,
  },
];

const keyMetrics = [
  { label: 'Blockchain', value: 'Solana' },
  { label: 'Randomness', value: 'VRF' },
  { label: 'Min Ticket', value: '0.1 SOL' },
  { label: 'Prize Pool', value: '70%' },
  { label: 'Draw Types', value: '4' },
  { label: 'Payout', value: 'Instant' },
];

export function Whitepaper() {
  return (
    <div className="min-h-screen pt-20 pb-20 relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(0deg, rgba(62, 203, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(62, 203, 255, 0.04) 1px, transparent 1px),
            linear-gradient(180deg, rgba(10, 11, 15, 1) 0%, rgba(15, 20, 30, 1) 50%, rgba(10, 11, 15, 1) 100%)
          `,
          backgroundSize: '30px 30px, 30px 30px, 100% 100%',
        }}
      />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full mb-6"
            style={{
              background: `${theme.colors.neonBlue}15`,
              border: `1px solid ${theme.colors.neonBlue}30`,
            }}
          >
            <FileText className="w-4 h-4" style={{ color: theme.colors.neonBlue }} />
            <span className="text-sm font-mono" style={{ color: theme.colors.neonBlue }}>
              v1.0.6
            </span>
          </div>

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
            Whitepaper
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            The technical foundation behind the powerSOL decentralized lottery protocol on Solana
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 max-w-4xl mx-auto mb-16"
        >
          {keyMetrics.map((metric, i) => (
            <div
              key={metric.label}
              className="p-4 rounded-xl text-center border"
              style={{
                background: theme.gradients.card,
                borderColor: theme.colors.border,
              }}
            >
              <div className="text-lg font-bold font-mono" style={{ color: theme.colors.neonBlue }}>
                {metric.value}
              </div>
              <div className="text-xs text-zinc-500 mt-1">{metric.label}</div>
            </div>
          ))}
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-8">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                className="rounded-2xl border overflow-hidden"
                style={{
                  background: theme.gradients.card,
                  borderColor: theme.colors.border,
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div className="p-8">
                  <div className="flex items-start space-x-4 mb-6">
                    <div
                      className="p-3 rounded-xl shrink-0"
                      style={{
                        background: `${theme.colors.neonBlue}15`,
                        border: `1px solid ${theme.colors.neonBlue}30`,
                      }}
                    >
                      <Icon className="w-6 h-6" style={{ color: theme.colors.neonBlue }} />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-zinc-500 mb-1">
                        SECTION {String(index + 1).padStart(2, '0')}
                      </div>
                      <h2 className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                        {section.title}
                      </h2>
                    </div>
                  </div>
                  <p className="text-zinc-300 leading-relaxed text-base pl-0 md:pl-16">
                    {section.content}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="max-w-4xl mx-auto mt-12"
        >
          <div
            className="rounded-2xl border p-8 text-center"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.neonBlue}08, ${theme.colors.neonCyan}05)`,
              borderColor: `${theme.colors.neonBlue}30`,
            }}
          >
            <h3 className="text-xl font-bold mb-3" style={{ color: theme.colors.text }}>
              Full Whitepaper PDF
            </h3>
            <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
              Download the complete whitepaper with detailed technical specifications, architecture diagrams, and roadmap.
            </p>
            <a
              href="/powersol_whitepaper_v1.0.6.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
              style={{
                background: theme.gradients.button,
                color: '#000',
                boxShadow: theme.shadows.buttonGlow,
              }}
            >
              <span>Download PDF</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
