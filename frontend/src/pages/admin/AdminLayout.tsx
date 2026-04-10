import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Trophy, Users, Coins, Shield, ShieldAlert } from 'lucide-react';
import { useWallet } from '../../contexts/WalletContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/adm', label: 'Overview', icon: LayoutDashboard, exact: true },
  { path: '/adm/powerpoints', label: 'PowerPoints', icon: Trophy },
  { path: '/adm/affiliates', label: 'Affiliates', icon: Users },
  { path: '/adm/users', label: 'Users & Tickets', icon: Coins },
  { path: '/adm/compliance', label: 'Compliance', icon: ShieldAlert },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const { publicKey } = useWallet();

  return (
    <div className="min-h-screen pt-20 pb-12" style={{ background: '#0a0b0f' }}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 10% 20%, rgba(239, 68, 68, 0.06) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(245, 158, 11, 0.04) 0%, transparent 40%)
          `,
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-1">
            <Shield className="w-6 h-6 text-red-400" />
            <h1
              className="text-2xl md:text-3xl font-bold font-mono"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              ADMIN_PANEL.EXE
            </h1>
          </div>
          {publicKey && (
            <p className="text-zinc-600 font-mono text-xs ml-9">
              {publicKey.slice(0, 4)}...{publicKey.slice(-4)}
            </p>
          )}
        </motion.div>

        <motion.nav
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex gap-1.5 sm:gap-2 mb-8 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={`
                  flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg font-mono text-xs sm:text-sm
                  border transition-all duration-300 whitespace-nowrap shrink-0
                  ${isActive
                    ? 'border-red-500/50 bg-red-500/10 text-red-400'
                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                  }
                `}
                style={isActive ? { boxShadow: '0 0 20px rgba(239, 68, 68, 0.15)' } : {}}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.label.split(' ')[0]}</span>
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
