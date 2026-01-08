import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationToggleProps {
  walletAddress: string | null;
  compact?: boolean;
}

export function NotificationToggle({ walletAddress, compact = false }: NotificationToggleProps) {
  const { isEnabled, permissionStatus, enableNotifications, disableNotifications } = useNotifications(walletAddress);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (loading) return;

    setLoading(true);
    try {
      if (isEnabled) {
        disableNotifications();
      } else {
        await enableNotifications();
      }
    } finally {
      setLoading(false);
    }
  };

  if (permissionStatus === 'unsupported') {
    return null;
  }

  if (compact) {
    return (
      <motion.button
        onClick={handleToggle}
        disabled={loading || permissionStatus === 'denied'}
        className={`p-2 sm:p-3 rounded-lg transition-all duration-300 ${
          isEnabled
            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
            : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400'
        } border`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={isEnabled ? 'Notificacoes ativas' : 'Ativar notificacoes'}
      >
        {loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.div>
        ) : isEnabled ? (
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        ) : (
          <BellOff className="w-4 h-4 sm:w-5 sm:h-5" />
        )}
      </motion.button>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
      <div className="flex items-center space-x-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isEnabled ? 'bg-emerald-500/20' : 'bg-zinc-700/50'
          }`}
        >
          {isEnabled ? (
            <Bell className="w-5 h-5 text-emerald-400" />
          ) : (
            <BellOff className="w-5 h-5 text-zinc-400" />
          )}
        </div>
        <div>
          <p className="text-sm sm:text-base font-medium text-white">
            Notificacoes Push
          </p>
          <p className="text-xs sm:text-sm text-zinc-400">
            {permissionStatus === 'denied'
              ? 'Bloqueado pelo navegador'
              : isEnabled
              ? 'Receba alertas de premios'
              : 'Ative para saber quando ganhar'}
          </p>
        </div>
      </div>

      <motion.button
        onClick={handleToggle}
        disabled={loading || permissionStatus === 'denied'}
        className={`relative w-12 h-7 sm:w-14 sm:h-8 rounded-full transition-colors duration-300 ${
          isEnabled ? 'bg-emerald-500' : 'bg-zinc-600'
        } ${permissionStatus === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className="absolute top-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white shadow-md flex items-center justify-center"
          animate={{ left: isEnabled ? 'calc(100% - 24px)' : '4px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          {loading ? (
            <motion.div
              className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          ) : isEnabled ? (
            <Check className="w-3 h-3 text-emerald-500" />
          ) : (
            <X className="w-3 h-3 text-zinc-400" />
          )}
        </motion.div>
      </motion.button>
    </div>
  );
}
