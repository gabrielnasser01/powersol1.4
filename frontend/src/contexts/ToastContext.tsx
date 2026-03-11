import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION = 4500;

const iconMap: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap: Record<ToastType, { border: string; icon: string; bg: string; glow: string }> = {
  success: {
    border: 'border-emerald-500/40',
    icon: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    glow: '0 0 20px rgba(60,247,158,.15)',
  },
  error: {
    border: 'border-red-500/40',
    icon: 'text-red-400',
    bg: 'bg-red-500/10',
    glow: '0 0 20px rgba(255,94,94,.15)',
  },
  warning: {
    border: 'border-amber-500/40',
    icon: 'text-amber-400',
    bg: 'bg-amber-500/10',
    glow: '0 0 20px rgba(255,195,78,.15)',
  },
  info: {
    border: 'border-cyan-500/40',
    icon: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    glow: '0 0 20px rgba(62,203,255,.15)',
  },
};

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const Icon = iconMap[t.type];
  const colors = colorMap[t.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={`relative flex items-start gap-3 px-4 py-3 rounded-xl border ${colors.border} ${colors.bg} backdrop-blur-xl max-w-sm w-full pointer-events-auto`}
      style={{ boxShadow: `${colors.glow}, 0 8px 32px rgba(0,0,0,.4)` }}
    >
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${colors.icon}`} />
      <p className="text-sm text-white/90 leading-relaxed flex-1 pr-2">{t.message}</p>
      <button
        onClick={() => onDismiss(t.id)}
        className="flex-shrink-0 text-white/30 hover:text-white/60 transition-colors mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: TOAST_DURATION / 1000, ease: 'linear' }}
        className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl origin-left ${colors.icon.replace('text-', 'bg-')}`}
        style={{ opacity: 0.4 }}
      />
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => dismiss(id), TOAST_DURATION);
  }, [dismiss]);

  const value: ToastContextValue = {
    toast: addToast,
    success: useCallback((msg: string) => addToast(msg, 'success'), [addToast]),
    error: useCallback((msg: string) => addToast(msg, 'error'), [addToast]),
    warning: useCallback((msg: string) => addToast(msg, 'warning'), [addToast]),
    info: useCallback((msg: string) => addToast(msg, 'info'), [addToast]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
