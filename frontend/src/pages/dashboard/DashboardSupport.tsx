import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Send, Mail, FileText, ExternalLink, HelpCircle, BookOpen, Shield } from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useWallet } from '../../contexts/WalletContext';

function TerminalCard({
  title,
  children,
  color = '#3ecbff',
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  color?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="relative rounded-lg overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(15, 17, 23, 0.95), rgba(10, 11, 15, 0.98))',
        border: `1px solid ${color}30`,
        boxShadow: `0 0 30px ${color}10, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      <div
        className="px-4 py-2.5 border-b font-mono text-xs uppercase tracking-wider flex items-center gap-2"
        style={{
          borderColor: `${color}20`,
          background: `linear-gradient(90deg, ${color}10, transparent)`,
        }}
      >
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <span style={{ color }}>{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </motion.div>
  );
}

interface SupportButtonProps {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  color: string;
  delay: number;
}

function SupportButton({ icon: Icon, label, description, href, color, delay }: SupportButtonProps) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="block p-6 rounded-xl transition-all duration-300 group"
      style={{
        background: `linear-gradient(135deg, ${color}15, ${color}08)`,
        border: `1px solid ${color}30`,
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
          style={{
            background: `${color}20`,
            border: `1px solid ${color}40`,
            boxShadow: `0 0 20px ${color}20`,
          }}
        >
          <Icon className="w-7 h-7" style={{ color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono font-bold text-lg text-white">{label}</span>
            <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          </div>
          <p className="text-zinc-400 text-sm font-mono">{description}</p>
        </div>
      </div>
    </motion.a>
  );
}

const faqItems = [
  {
    question: 'How do I earn commissions?',
    answer: 'Share your unique referral link. When someone purchases tickets using your link, you earn a commission based on your tier level (5% to 30%).',
  },
  {
    question: 'When can I claim my earnings?',
    answer: 'Earnings are released every Wednesday at 23:59:59 GMT. After release, you can claim your accumulated rewards.',
  },
  {
    question: 'How do I upgrade my tier?',
    answer: 'Your tier automatically upgrades based on total referrals: Starter (0+), Bronze (100+), Silver (1000+), Gold (5000+).',
  },
  {
    question: 'Is there a minimum withdrawal amount?',
    answer: 'No minimum withdrawal. You can claim any available balance after the Wednesday release time.',
  },
];

export function DashboardSupport() {
  const navigate = useNavigate();
  const { walletAddress, connected } = useWallet();

  useEffect(() => {
    if (!connected) {
      navigate('/affiliates');
    }
  }, [connected, navigate]);

  if (!connected) {
    return null;
  }

  return (
    <DashboardLayout walletAddress={walletAddress || undefined}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <SupportButton
          icon={MessageCircle}
          label="Discord Community"
          description="Join our Discord server for real-time support, announcements, and community discussions."
          href="https://discord.gg/powersol"
          color="#5865F2"
          delay={0}
        />

        <SupportButton
          icon={Send}
          label="Telegram Channel"
          description="Follow our Telegram for instant updates, tips, and direct affiliate support."
          href="https://t.me/powersol"
          color="#0088cc"
          delay={0.1}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TerminalCard title="quick_support" color="#3ecbff" delay={0.2}>
          <div className="space-y-4">
            <a
              href="mailto:affiliates@powersol.io"
              className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1">
                <p className="font-mono text-sm text-white">Email Support</p>
                <p className="text-xs text-zinc-500 font-mono">affiliates@powersol.io</p>
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
            </a>

            <a
              href="/faq"
              className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="font-mono text-sm text-white">FAQ Center</p>
                <p className="text-xs text-zinc-500 font-mono">find_answers_quickly</p>
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
            </a>

            <a
              href="/terms"
              className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="font-mono text-sm text-white">Affiliate Terms</p>
                <p className="text-xs text-zinc-500 font-mono">program_guidelines</p>
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 transition-colors" />
            </a>
          </div>
        </TerminalCard>

        <TerminalCard title="affiliate_faq" color="#2fffe2" delay={0.3}>
          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <motion.details
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="group"
              >
                <summary className="flex items-center gap-2 cursor-pointer p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors list-none">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono text-sm text-white flex-1">{item.question}</span>
                  <span className="text-zinc-500 group-open:rotate-180 transition-transform">+</span>
                </summary>
                <div className="mt-2 ml-6 p-3 rounded-lg bg-zinc-900/50 border-l-2 border-emerald-500/30">
                  <p className="text-sm text-zinc-400 font-mono">{item.answer}</p>
                </div>
              </motion.details>
            ))}
          </div>
        </TerminalCard>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-6"
      >
        <TerminalCard title="security_notice" color="#fbbf24" delay={0.5}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="font-mono font-bold text-white mb-2">Stay Safe</h3>
              <ul className="space-y-2 text-sm text-zinc-400 font-mono">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">-</span>
                  <span>PowerSOL team will NEVER ask for your private keys or seed phrase</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">-</span>
                  <span>Always verify you're on the official powersol.io domain</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">-</span>
                  <span>Report suspicious activity to security@powersol.io</span>
                </li>
              </ul>
            </div>
          </div>
        </TerminalCard>
      </motion.div>
    </DashboardLayout>
  );
}
