import React from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { isAdminWallet } from '../../services/adminService';
import { ShieldOff, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { publicKey, connected } = useWallet();

  if (!connected || !publicKey) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0b0f' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <Wallet className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-xl font-mono text-zinc-400 mb-2">Connect Wallet</h2>
          <p className="text-zinc-600 font-mono text-sm">Authorization required</p>
        </motion.div>
      </div>
    );
  }

  if (!isAdminWallet(publicKey)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0b0f' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <ShieldOff className="w-16 h-16 text-red-500/60 mx-auto mb-4" />
          <h2 className="text-xl font-mono text-red-400 mb-2">Access Denied</h2>
          <p className="text-zinc-600 font-mono text-sm">404 - Page not found</p>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
