import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, BarChart3, HeadphonesIcon, ChevronLeft, Lock } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  walletAddress?: string;
  tier?: number;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  minTier?: number;
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, minTier: 3 },
  { path: '/dashboard/support', label: 'Support', icon: HeadphonesIcon },
];

export function DashboardLayout({ children, walletAddress, tier = 1 }: DashboardLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen pt-20 pb-12" style={{ background: '#0a0b0f' }}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 10% 20%, rgba(62, 203, 255, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(47, 255, 226, 0.06) 0%, transparent 40%)
          `,
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <NavLink
            to="/affiliates"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-cyan-400 transition-colors font-mono text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>back_to_affiliates</span>
          </NavLink>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1
            className="text-2xl md:text-3xl font-bold font-mono mb-2"
            style={{
              background: 'linear-gradient(135deg, #3ecbff 0%, #2fffe2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {'>'} AFFILIATE_DASHBOARD.EXE
          </h1>
          {walletAddress && (
            <p className="text-zinc-500 font-mono text-sm">
              connected: {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
            </p>
          )}
        </motion.div>

        <motion.nav
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex gap-2 mb-8 overflow-x-auto pb-2"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isLocked = item.minTier !== undefined && tier < item.minTier;

            if (isLocked) {
              return (
                <div
                  key={item.path}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono text-sm border border-zinc-800 bg-zinc-900/50 text-zinc-600 whitespace-nowrap cursor-not-allowed relative group"
                  title={`Requires Silver tier or higher`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  <Lock className="w-3 h-3 ml-1" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Silver+ only
                  </div>
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono text-sm
                  border transition-all duration-300 whitespace-nowrap
                  ${isActive
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                  }
                `}
                style={isActive ? { boxShadow: '0 0 20px rgba(62, 203, 255, 0.2)' } : {}}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </motion.nav>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
