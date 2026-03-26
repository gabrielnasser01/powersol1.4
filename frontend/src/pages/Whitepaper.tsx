import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Download, ExternalLink, Zap, Shield, Ticket, Trophy,
  Users, BarChart3, Eye, Vote, Coins, Target, ChevronDown, Clock,
  TrendingUp, Gift, Rocket, Lock, Globe, Layers
} from 'lucide-react';
import { theme } from '../theme';

type SectionId =
  | 'overview' | 'tri-daily' | 'special-event' | 'jackpot' | 'grand-prize'
  | 'tickets' | 'revenue' | 'affiliates' | 'withdrawals' | 'missions'
  | 'airdrop' | 'voting' | 'tokenomics' | 'transparency' | 'roadmap';

interface TableRow {
  cells: string[];
  highlight?: boolean;
}

interface TableData {
  headers: string[];
  rows: TableRow[];
}

interface Section {
  id: SectionId;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  badge?: string;
  badgeColor?: string;
  content: string;
  details?: string[];
  table?: TableData;
}

const sections: Section[] = [
  {
    id: 'overview',
    icon: Zap,
    title: 'PowerSOL Overview',
    content: 'PowerSOL is your lottery on Solana \u2014 decentralized, transparent, and secure. It is designed to reward the community, from cautious players to risk-takers. With VRF (Verifiable Random Function) draws, instant payouts, and seamless wallet integration, the protocol combines frequent rewards with life-changing jackpots for both players and affiliates.',
    details: [
      'In the long term, the project aims to evolve into a DAO, achieving full decentralization through its own SPL voting token.'
    ],
  },
  {
    id: 'tri-daily',
    icon: Clock,
    title: 'Tri-Daily Lottery',
    badge: '0.1 SOL',
    badgeColor: theme.colors.neonCyan,
    content: 'Designed to reward the largest number of players. Prize pools accumulate every 3 days, ensuring frequent winners and continuous engagement.',
    details: [
      'Draw runs at 23:59:59 GMT',
      'Ticket price: 0.1 SOL per ticket',
      'Odds: 1:20',
    ],
    table: {
      headers: ['Tier', 'Winners (%)', 'Prize Share (%)'],
      rows: [
        { cells: ['1', '1%', '20%'], highlight: true },
        { cells: ['2', '2%', '10%'] },
        { cells: ['3', '6%', '12.5%'] },
        { cells: ['4', '36%', '27.5%'] },
        { cells: ['5', '55%', '30%'] },
      ],
    },
  },
  {
    id: 'special-event',
    icon: Gift,
    title: 'Seasonal Special Event',
    badge: '0.2 SOL',
    badgeColor: '#ff8c00',
    content: 'Designed to reward the largest number of players. Accumulates over several months with distribution on the announced date.',
    details: [
      'Draw runs at 23:59:59 GMT',
      'Ticket price: 0.2 SOL per ticket',
      'Odds: 1:20',
    ],
    table: {
      headers: ['Tier', 'Winners (%)', 'Prize Share (%)'],
      rows: [
        { cells: ['1', '1%', '20%'], highlight: true },
        { cells: ['2', '2%', '10%'] },
        { cells: ['3', '6%', '12.5%'] },
        { cells: ['4', '36%', '27.5%'] },
        { cells: ['5', '55%', '30%'] },
      ],
    },
  },
  {
    id: 'jackpot',
    icon: Trophy,
    title: 'Monthly Jackpot',
    badge: '0.2 SOL',
    badgeColor: theme.colors.neonPink,
    content: 'Designed to reward bigger prizes. Distributed among 100 winners at the end of each month, following the same five-tier model.',
    details: [
      'Draw runs at 23:59:59 GMT',
      'Ticket price: 0.2 SOL per ticket',
      'Odds: 100 : Total Tickets',
    ],
    table: {
      headers: ['Tier', 'Number of Winners', 'Prize Share (%)'],
      rows: [
        { cells: ['1', '1 winner', '20%'], highlight: true },
        { cells: ['2', '2 winners', '10%'] },
        { cells: ['3', '6 winners', '12.5%'] },
        { cells: ['4', '36 winners', '27.5%'] },
        { cells: ['5', '55 winners', '30%'] },
      ],
    },
  },
  {
    id: 'grand-prize',
    icon: Layers,
    title: 'Annual Grand Prize',
    badge: '0.33 SOL',
    badgeColor: '#9ca3af',
    content: 'Designed to reward bigger prizes. Prizes accumulate throughout the year and are awarded on December 31st to 3 winners \u2014 life-changing rewards to start the new year in wealth.',
    details: [
      'Draw runs at 23:59:59 GMT',
      'Ticket price: 0.33 SOL per ticket',
      'Odds: 3 : Total Tickets',
    ],
    table: {
      headers: ['Rank', 'Prize Share (%)'],
      rows: [
        { cells: ['1st Place', '50%'], highlight: true },
        { cells: ['2nd Place', '30%'] },
        { cells: ['3rd Place', '20%'] },
      ],
    },
  },
  {
    id: 'tickets',
    icon: Ticket,
    title: 'Ticket System',
    content: 'Each PowerSOL ticket is registered as a unique transaction on the Solana blockchain, representing a verifiable and immutable entry into the decentralized lottery draws. Once created, the ticket automatically participates in the next eligible draw.',
    details: [
      'All transactions are recorded on-chain, ensuring transparency and fairness through verifiable random selection (VRF).',
      'Winners receive automatic prize distributions directly to claim in their profile.',
      'No purchase limits.',
    ],
  },
  {
    id: 'revenue',
    icon: BarChart3,
    title: 'Revenue Distribution',
    content: 'Each ticket purchased is allocated as follows: 40% to prizes, 30% to development, and up to 30% to affiliates \u2014 returning up to 70% directly to the community. Volume-based milestones further increase community rewards.',
    details: [
      'Milestone 1 \u2013 20M monthly revenue (3 consecutive months).',
      'Milestone 2 \u2013 50M monthly revenue (3 consecutive months).',
    ],
    table: {
      headers: ['Stage', 'Development (%)', 'Affiliates (%)', 'Prizes (%)', 'Community (%)'],
      rows: [
        { cells: ['Initial', '30%', '30%', '40%', 'Up to 70%'] },
        { cells: ['Milestone 1', '27.5%', '27.5%', '45%', 'Up to 72.5%'] },
        { cells: ['Milestone 2', '25%', '25%', '50%', 'Up to 75%'], highlight: true },
      ],
    },
  },
  {
    id: 'affiliates',
    icon: Users,
    title: 'Affiliate Program',
    badge: 'Weekly Payouts',
    badgeColor: theme.colors.success,
    content: 'Affiliates receive weekly rewards based on the number of validated referrals. The program offers up to 30% of total revenues across 4 tiers.',
    details: [
      'Payouts every Wednesday at 23:59:59 GMT',
    ],
    table: {
      headers: ['Tier', 'Referral Requirement', 'Revenue Share (%)'],
      rows: [
        { cells: ['Tier 1', 'Up to 100 referrals with ticket purchase', '5%'] },
        { cells: ['Tier 2', 'Up to 1,000 validated referrals', '10%'] },
        { cells: ['Tier 3', 'Up to 5,000 validated referrals', '20%'] },
        { cells: ['Tier 4', 'More than 5,000 validated referrals', '30%'], highlight: true },
      ],
    },
  },
  {
    id: 'withdrawals',
    icon: TrendingUp,
    title: 'Withdrawals',
    content: 'Prize rewards must be claimed before the next draw. Unclaimed prizes accumulate to the next draw. Affiliate rewards must be claimed before the next payout. Unclaimed affiliate rewards fund operations and TGE.',
  },
  {
    id: 'missions',
    icon: Target,
    title: 'Missions System',
    content: 'The mission system encourages community engagement through gamified challenges such as connecting wallets, inviting new players, and consistent participation. Players earn Power Points for completing missions, which contribute to their eligibility and ranking in the upcoming PowerSOL token airdrop. Every ticket on PowerSOL grants you Power Points.',
  },
  {
    id: 'airdrop',
    icon: Rocket,
    title: 'Airdrop System',
    content: 'Our airdrop system will take into account Power Points earned through missions, activities, and interactions with the project, including the affiliate base and content creation. We will allocate a portion of the total supply to early adopters.',
    details: [
      'A 3-tier NFT collection will grant holders a special draw, voting power, and airdrop bonus allocation.',
      'More details will be shared soon.',
    ],
  },
  {
    id: 'voting',
    icon: Vote,
    title: 'Voting System',
    content: 'SPL voting tokens will be created to decide the direction of the project and make it 100% decentralized. Each proposal submitted by users or by the DAO must go through 3 stages to be approved, with each stage involving token burning, making the project deflationary in the long term.',
  },
  {
    id: 'tokenomics',
    icon: Coins,
    title: 'Tokenomics',
    content: 'Under development.',
  },
  {
    id: 'transparency',
    icon: Eye,
    title: 'Transparency & Technology',
    content: 'PowerSOL is built on full operational transparency as a core principle.',
    details: [
      'Wallet-only access: No accounts, no emails \u2014 just your Solana wallet.',
      'VRF: All draws use a Verifiable Random Function, ensuring provably fair results.',
      'On-chain monitoring: Every ticket and payout is fully traceable on Solana.',
      'Instant payouts: Rewards are automatically distributed after each draw and are available to claim on your profile page.',
    ],
  },
  {
    id: 'roadmap',
    icon: Globe,
    title: 'Governance and Roadmap',
    content: 'PowerSOL is evolving into a DAO.',
  },
];

const roadmapPhases = [
  {
    phase: 'Phase 1',
    title: 'Ecosystem Launch',
    color: theme.colors.neonBlue,
    description: 'Activation of lotteries (Tri-Daily, Seasonal, Monthly Jackpot, and Annual Grand Prize), affiliate program with weekly payouts, missions for engagement and airdrop calculation. VRF system live and public on-chain audit panel.',
    active: true,
  },
  {
    phase: 'Phase 2',
    title: 'Growth and Rewards',
    color: theme.colors.neonCyan,
    description: 'Launch of airdrop system and badges, UX/UI improvements, 2 traditional lottery models, community partnerships, NFT special pack. On-chain VRF.',
  },
  {
    phase: 'Phase 3',
    title: 'Validation and Token',
    color: theme.colors.neonPink,
    description: 'Independent security audit (e.g., Certik). Token Generation Event (TGE), airdrop, holders exclusive lottery, NFT special draws.',
  },
  {
    phase: 'Phase 4',
    title: 'Full Decentralization (DAO)',
    color: theme.colors.success,
    description: 'DAO activation with on-chain voting system, transparent treasury management, community-driven prize parameters. Affiliates rewards evolving into Shareholders rewards.',
  },
];

function SectionNav({ activeSection, onSelect }: { activeSection: SectionId | null; onSelect: (id: SectionId) => void }) {
  const navGroups = [
    { label: 'Overview', items: [{ id: 'overview' as SectionId, label: 'Overview' }] },
    {
      label: 'Lotteries', items: [
        { id: 'tri-daily' as SectionId, label: 'Tri-Daily' },
        { id: 'special-event' as SectionId, label: 'Special Event' },
        { id: 'jackpot' as SectionId, label: 'Jackpot' },
        { id: 'grand-prize' as SectionId, label: 'Grand Prize' },
      ]
    },
    {
      label: 'Economics', items: [
        { id: 'tickets' as SectionId, label: 'Tickets' },
        { id: 'revenue' as SectionId, label: 'Revenue' },
        { id: 'affiliates' as SectionId, label: 'Affiliates' },
        { id: 'withdrawals' as SectionId, label: 'Withdrawals' },
      ]
    },
    {
      label: 'Ecosystem', items: [
        { id: 'missions' as SectionId, label: 'Missions' },
        { id: 'airdrop' as SectionId, label: 'Airdrop' },
        { id: 'voting' as SectionId, label: 'Voting' },
        { id: 'tokenomics' as SectionId, label: 'Tokenomics' },
      ]
    },
    {
      label: 'Future', items: [
        { id: 'transparency' as SectionId, label: 'Transparency' },
        { id: 'roadmap' as SectionId, label: 'Roadmap' },
      ]
    },
  ];

  return (
    <nav className="hidden lg:block sticky top-24 w-56 flex-shrink-0 self-start">
      <div
        className="rounded-2xl border p-4 space-y-4"
        style={{ background: theme.colors.card, borderColor: theme.colors.border }}
      >
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.colors.textMuted }}>
          Contents
        </p>
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: `${theme.colors.neonBlue}90` }}>
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className="block w-full text-left text-sm px-3 py-1.5 rounded-lg transition-all duration-200"
                  style={{
                    color: activeSection === item.id ? theme.colors.text : theme.colors.textMuted,
                    background: activeSection === item.id ? `${theme.colors.neonBlue}15` : 'transparent',
                    borderLeft: activeSection === item.id ? `2px solid ${theme.colors.neonBlue}` : '2px solid transparent',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}

function DataTable({ data }: { data: TableData }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border" style={{ borderColor: `${theme.colors.border}` }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: `${theme.colors.neonBlue}10` }}>
            {data.headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                style={{ color: theme.colors.neonBlue, borderBottom: `1px solid ${theme.colors.border}` }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr
              key={i}
              style={{
                background: row.highlight ? `${theme.colors.neonCyan}08` : 'transparent',
                borderBottom: i < data.rows.length - 1 ? `1px solid ${theme.colors.border}50` : undefined,
              }}
            >
              {row.cells.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-3 whitespace-nowrap"
                  style={{
                    color: row.highlight && j === row.cells.length - 1 ? theme.colors.neonCyan : theme.colors.textMuted,
                    fontWeight: row.highlight ? 600 : 400,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionCard({ section, index }: { section: Section; index: number }) {
  const [expanded, setExpanded] = useState(true);
  const Icon = section.icon;

  return (
    <motion.div
      id={section.id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3) }}
      className="rounded-2xl border overflow-hidden transition-all duration-300"
      style={{
        background: theme.colors.card,
        borderColor: theme.colors.border,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 md:p-6 text-left group"
      >
        <div className="flex items-center space-x-4 min-w-0">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
            style={{
              background: `${theme.colors.neonBlue}12`,
              border: `1px solid ${theme.colors.neonBlue}25`,
            }}
          >
            <Icon className="w-5 h-5" style={{ color: theme.colors.neonBlue }} />
          </div>
          <h2
            className="text-lg md:text-xl font-bold truncate"
            style={{ color: theme.colors.text }}
          >
            {section.title}
          </h2>
          {section.badge && (
            <span
              className="hidden sm:inline-flex text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: `${section.badgeColor}18`,
                color: section.badgeColor,
                border: `1px solid ${section.badgeColor}35`,
              }}
            >
              {section.badge}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 ml-3"
        >
          <ChevronDown className="w-5 h-5" style={{ color: theme.colors.textMuted }} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 md:px-6 pb-6 space-y-3">
              <div
                className="h-px w-full mb-4"
                style={{ background: `linear-gradient(90deg, ${theme.colors.neonBlue}30, transparent)` }}
              />
              <p className="leading-relaxed" style={{ color: theme.colors.textMuted, lineHeight: 1.75 }}>
                {section.content}
              </p>

              {section.details && section.details.length > 0 && (
                <ul className="space-y-2 mt-3">
                  {section.details.map((d, i) => (
                    <li key={i} className="flex items-start space-x-2.5">
                      <span
                        className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: theme.colors.neonBlue }}
                      />
                      <span style={{ color: theme.colors.textMuted, lineHeight: 1.7 }}>{d}</span>
                    </li>
                  ))}
                </ul>
              )}

              {section.table && <DataTable data={section.table} />}

              {section.id === 'roadmap' && <RoadmapTimeline />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RoadmapTimeline() {
  return (
    <div className="mt-4 space-y-4">
      {roadmapPhases.map((phase, i) => (
        <motion.div
          key={phase.phase}
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="relative pl-8"
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-0.5"
            style={{
              background: i < roadmapPhases.length - 1
                ? `linear-gradient(180deg, ${phase.color}, ${roadmapPhases[i + 1].color}40)`
                : phase.color,
            }}
          />
          <div
            className="absolute left-0 top-1.5 w-3 h-3 rounded-full -translate-x-[5px]"
            style={{
              background: phase.color,
              boxShadow: phase.active ? `0 0 12px ${phase.color}80` : 'none',
            }}
          />
          {phase.active && (
            <div
              className="absolute left-0 top-1.5 w-3 h-3 rounded-full -translate-x-[5px] animate-ping"
              style={{ background: phase.color, opacity: 0.4 }}
            />
          )}
          <div
            className="rounded-xl border p-4"
            style={{
              background: phase.active ? `${phase.color}08` : 'transparent',
              borderColor: phase.active ? `${phase.color}30` : theme.colors.border,
            }}
          >
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: `${phase.color}20`, color: phase.color }}>
                {phase.phase}
              </span>
              <h4 className="font-bold" style={{ color: theme.colors.text }}>{phase.title}</h4>
              {phase.active && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${phase.color}20`, color: phase.color }}>
                  Current
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: theme.colors.textMuted }}>
              {phase.description}
            </p>
          </div>
        </motion.div>
      ))}

      <div className="pl-8 pt-2">
        <div
          className="rounded-xl border p-4"
          style={{ background: `${theme.colors.warning}06`, borderColor: `${theme.colors.warning}25` }}
        >
          <h4 className="font-bold mb-2 flex items-center space-x-2" style={{ color: theme.colors.warning }}>
            <Lock className="w-4 h-4" />
            <span>Next Steps (Community Suggestions after DAO)</span>
          </h4>
          <p className="text-sm leading-relaxed" style={{ color: theme.colors.textMuted }}>
            Expand the range of games and explore new lottery formats. Launch a fundraising system for projects and charitable initiatives. Enable community-driven adjustments to prize and revenue distribution. Strategic marketing and partnerships voted. Encourage innovative proposals voted on by DAO members.
          </p>
        </div>
      </div>
    </div>
  );
}

export function Whitepaper() {
  const [activeSection, setActiveSection] = useState<SectionId | null>('overview');

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
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
            className="text-4xl md:text-5xl font-bold mb-3"
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
          <p className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>
            v1.0.6
          </p>
          <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: theme.colors.textMuted }}>
            The complete technical overview of the PowerSOL decentralized lottery protocol on Solana.
          </p>

          <motion.a
            href="/PowerSOL_Whitepaper_(v1.0.6).pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300"
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

        <div className="flex gap-8 max-w-5xl mx-auto">
          <SectionNav activeSection={activeSection} onSelect={scrollToSection} />

          <div className="flex-1 min-w-0 space-y-4">
            {sections.map((section, index) => (
              <SectionCard key={section.id} section={section} index={index} />
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mt-8 text-center rounded-2xl border p-8"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.neonBlue}08, ${theme.colors.neonCyan}05)`,
                borderColor: `${theme.colors.neonBlue}30`,
              }}
            >
              <p
                className="text-2xl md:text-3xl font-bold mb-2"
                style={{
                  fontFamily: 'Orbitron, monospace',
                  background: theme.gradients.neon,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                You own the Lottery.
              </p>
              <p className="text-lg font-semibold" style={{ color: theme.colors.neonBlue }}>
                PowerSOL DAO
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
