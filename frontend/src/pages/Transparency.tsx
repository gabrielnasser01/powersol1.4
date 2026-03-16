import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, CheckCircle, Database, ExternalLink, Loader2, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { LOTTERY_WALLETS } from '../services/walletBalanceService';
import { supabase } from '../lib/supabase';

interface DrawVRFData {
  drawId: string;
  lotteryType: string;
  timestamp: string;
  commitHash: string;
  seedHash: string;
  participants: number;
  prizePool: string;
  winners: { position: number; wallet: string; prize: string }[];
}

function truncateWallet(wallet: string): string {
  if (wallet.length <= 10) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

function lamportsToSol(lamports: number): string {
  const sol = lamports / 1_000_000_000;
  return `${sol.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
}

function mapRowToDrawVRF(row: any): DrawVRFData {
  const winners = (row.winners_json || []).map((w: any) => ({
    position: w.position,
    wallet: truncateWallet(w.wallet),
    prize: lamportsToSol(w.prize_lamports),
  }));

  return {
    drawId: `${row.lottery_type || 'tri-daily'}-${row.round}`,
    lotteryType: row.lottery_type || 'tri-daily',
    timestamp: row.draw_timestamp,
    commitHash: row.commit_hash,
    seedHash: row.seed_hash,
    participants: row.participants_count || 0,
    prizePool: lamportsToSol(row.prize_lamports),
    winners,
  };
}

async function fetchAllDraws(): Promise<DrawVRFData[]> {
  const { data, error } = await supabase
    .from('solana_draws')
    .select('round, lottery_type, draw_timestamp, commit_hash, seed_hash, participants_count, prize_lamports, winners_json')
    .not('commit_hash', 'is', null)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map(mapRowToDrawVRF);
}

const fairnessFeatures = [
  {
    icon: Shield,
    title: 'VRF_RANDOMNESS.EXE',
    description: 'VRF (Verifiable Random Function) ensures truly random and tamper-proof draw results. Military-grade entropy generation.',
    terminalCode: '> vrf.verify(seed_hash)',
  },
  {
    icon: Eye,
    title: 'AUDIT_PROTOCOL.SYS',
    description: 'Every draw can be independently verified using our verification protocols. Complete audit trail available.',
    terminalCode: '> verify_draw.exe --hash=0xa1b2c3',
  },
  {
    icon: CheckCircle,
    title: 'PRIZEPOOL_LEDGER.DB',
    description: 'All draws are recorded on the Solana blockchain, making them permanent and unchangeable. Distributed ledger security.',
    terminalCode: '> solana_scan.check_transaction()',
  },
];

const terminalCardStyle = {
  background: `
    linear-gradient(0deg, rgba(0, 255, 136, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 136, 0.08) 1px, transparent 1px),
    linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(0, 20, 10, 0.95) 100%)
  `,
  backgroundSize: '20px 20px, 20px 20px, 100% 100%',
  borderColor: 'rgba(0, 255, 136, 0.5)',
  boxShadow: '0 0 25px rgba(0, 255, 136, 0.4), inset 0 0 40px rgba(0, 0, 0, 0.9)',
  backdropFilter: 'blur(20px)',
  fontFamily: 'monospace',
};

const navButtonStyle = {
  background: 'rgba(0, 0, 0, 0.7)',
  border: '1px solid rgba(0, 255, 136, 0.4)',
  color: '#00ff88',
};

const navButtonDisabledStyle = {
  background: 'rgba(0, 0, 0, 0.4)',
  border: '1px solid rgba(0, 255, 136, 0.15)',
  color: 'rgba(0, 255, 136, 0.25)',
};

function NavButton({ onClick, disabled, children, label }: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className="p-2 sm:px-3 sm:py-2 rounded-lg font-mono text-xs flex items-center gap-1 transition-all duration-200"
      style={disabled ? navButtonDisabledStyle : navButtonStyle}
      whileHover={disabled ? {} : {
        boxShadow: '0 0 15px rgba(0, 255, 136, 0.4)',
        borderColor: '#00ff88',
      }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      title={label}
    >
      {children}
    </motion.button>
  );
}

function DrawDataSection({
  draws,
  currentIndex,
  setCurrentIndex,
  loading,
  error,
}: {
  draws: DrawVRFData[];
  currentIndex: number;
  setCurrentIndex: (i: number) => void;
  loading: boolean;
  error: string | null;
}) {
  const drawData = draws[currentIndex] || null;
  const totalDraws = draws.length;
  const isNewest = currentIndex === 0;
  const isOldest = currentIndex >= totalDraws - 1;

  const displayData = drawData
    ? {
        drawId: drawData.drawId,
        timestamp: drawData.timestamp,
        commitHash: drawData.commitHash,
        seedHash: drawData.seedHash,
        participants: drawData.participants,
        prizePool: drawData.prizePool,
        winners: drawData.winners,
      }
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-center space-x-3 mb-8">
        <div
          className="p-3 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.3), rgba(0, 204, 255, 0.2))',
            border: '1px solid rgba(0, 255, 136, 0.5)',
            boxShadow: '0 0 15px rgba(0, 255, 136, 0.4)',
          }}
        >
          <Database className="w-6 h-6" style={{ color: '#00ff88' }} />
        </div>
        <div>
          <h2
            className="text-2xl font-bold font-mono"
            style={{
              color: '#ffffff',
              textShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
            }}
          >
            <span className="hidden sm:inline">DRAW_VRF_LOG.JSON</span>
            <span className="sm:hidden text-lg">DRAW_VRF.JSON</span>
          </h2>
          <p className="text-green-300/70 font-mono text-sm">
            {drawData
              ? `${drawData.lotteryType} | Draw ${currentIndex + 1} of ${totalDraws}`
              : 'Real-time draw verification data'}
          </p>
        </div>
      </div>

      {!loading && !error && totalDraws > 1 && (
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
          <NavButton
            onClick={() => setCurrentIndex(totalDraws - 1)}
            disabled={isOldest}
            label="Oldest draw"
          >
            <ChevronsLeft className="w-4 h-4" />
            <span className="hidden sm:inline">OLDEST</span>
          </NavButton>

          <NavButton
            onClick={() => setCurrentIndex(currentIndex + 1)}
            disabled={isOldest}
            label="Previous draw"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">PREV</span>
          </NavButton>

          <div
            className="px-3 py-2 rounded-lg font-mono text-xs"
            style={{
              background: 'rgba(0, 255, 136, 0.1)',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              color: '#00ff88',
              minWidth: '80px',
              textAlign: 'center',
            }}
          >
            {currentIndex + 1} / {totalDraws}
          </div>

          <NavButton
            onClick={() => setCurrentIndex(currentIndex - 1)}
            disabled={isNewest}
            label="Next draw"
          >
            <span className="hidden sm:inline">NEXT</span>
            <ChevronRight className="w-4 h-4" />
          </NavButton>

          <NavButton
            onClick={() => setCurrentIndex(0)}
            disabled={isNewest}
            label="Latest draw"
          >
            <span className="hidden sm:inline">LATEST</span>
            <ChevronsRight className="w-4 h-4" />
          </NavButton>
        </div>
      )}

      <div
        className="p-8 rounded-2xl border relative overflow-hidden"
        style={{
          ...terminalCardStyle,
          boxShadow: '0 0 30px rgba(0, 255, 136, 0.3), inset 0 0 50px rgba(0, 0, 0, 0.9)',
        }}
      >
        <div className="absolute top-2 left-2 text-xs font-mono text-green-400/60">
          [DATA_STREAM]
        </div>
        <div className="absolute top-2 right-2 text-xs font-mono text-green-400/60">
          {loading ? '[LOADING...]' : error ? '[ERROR]' : '[VERIFIED]'}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12 gap-3">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#00ff88' }} />
            <span className="font-mono text-sm" style={{ color: '#00ff88' }}>
              Fetching draw data...
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12 gap-3">
            <AlertCircle className="w-5 h-5" style={{ color: '#ff4444' }} />
            <span className="font-mono text-sm text-red-400">{error}</span>
          </div>
        )}

        {!loading && !error && displayData && (
          <AnimatePresence mode="wait">
            <motion.div
              key={drawData?.drawId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <pre
                className="text-sm font-mono overflow-x-auto whitespace-pre-wrap"
                style={{
                  color: '#00ff88',
                  textShadow: '0 0 8px rgba(0, 255, 136, 0.6)',
                }}
              >
                {JSON.stringify(displayData, null, 2)}
              </pre>

              <motion.div
                className="inline-block w-2 h-4 ml-1"
                style={{ background: '#00ff88' }}
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </motion.div>
          </AnimatePresence>
        )}

        {!loading && !error && !displayData && (
          <div className="flex items-center justify-center py-12">
            <span className="font-mono text-sm text-zinc-500">
              No draws recorded yet. Data will appear after the first draw.
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function Transparency() {
  const [draws, setDraws] = useState<DrawVRFData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllDraws()
      .then((data) => {
        setDraws(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch draw data');
        setLoading(false);
      });
  }, []);

  const handleSetIndex = useCallback((i: number) => {
    setCurrentIndex(Math.max(0, Math.min(i, draws.length - 1)));
  }, [draws.length]);

  return (
    <div className="min-h-screen pt-20 pb-20 relative overflow-hidden">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(0deg, rgba(0, 255, 136, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 136, 0.08) 1px, transparent 1px),
              linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(0, 20, 10, 0.95) 100%)
            `,
            backgroundSize: '20px 20px, 20px 20px, 100% 100%',
          }}
        />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0, 255, 136, 0.02) 2px,
                rgba(0, 255, 136, 0.02) 4px
              )
            `,
            animation: 'terminalScan 4s linear infinite',
          }}
        />

        <style>{`
          @keyframes terminalScan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
          }
        `}</style>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="absolute top-24 left-6 text-xs font-mono text-green-500/40 hidden sm:block">
          [SYSTEM_ACTIVE]
        </div>
        <div className="absolute top-24 right-6 text-xs font-mono text-green-500/40 hidden sm:block">
          [TRANSPARENCY_MODULE]
        </div>

        <div className="block sm:hidden text-center pt-4 pb-2">
          <div className="flex justify-center space-x-4 text-xs font-mono text-green-500/80">
            <span>[SYSTEM_ACTIVE]</span>
            <span>[TRANSPARENCY_MODULE]</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1
            className="text-2xl md:text-6xl font-bold mb-6 font-mono"
            style={{
              background: 'linear-gradient(135deg, #00ff88 0%, #00ccff 50%, #00ff88 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 0 40px rgba(0, 255, 136, 0.5)',
            }}
          >
            {'>'} PROVABLY_FAIR.SYS
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-mono">
            [INITIALIZING...] Transparency and fairness protocols active. Every draw is cryptographically verifiable.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {fairnessFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="p-6 rounded-2xl border relative overflow-hidden"
                style={terminalCardStyle}
              >
                <div className="absolute top-2 left-2 text-xs font-mono text-green-400/60">
                  [{index.toString().padStart(2, '0')}]
                </div>
                <div className="absolute top-2 right-2 text-xs font-mono text-green-400/60">
                  [ACTIVE]
                </div>

                <div
                  className="w-16 h-16 rounded-xl mb-6 flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.3), rgba(0, 204, 255, 0.2))',
                    border: '1px solid rgba(0, 255, 136, 0.5)',
                    boxShadow: '0 0 15px rgba(0, 255, 136, 0.4)',
                  }}
                >
                  <Icon className="w-8 h-8" style={{ color: '#00ff88' }} />
                </div>

                <h3
                  className="text-xl font-bold mb-3 font-mono"
                  style={{
                    color: '#00ff88',
                    textShadow: '0 0 10px rgba(0, 255, 136, 0.6)',
                  }}
                >
                  {feature.title}
                </h3>

                <p className="text-zinc-300 leading-relaxed mb-4 font-mono text-sm">
                  {feature.description}
                </p>

                {index === 2 ? (
                  <div className="space-y-2">
                    <div
                      className="p-3 rounded-lg font-mono text-xs"
                      style={{
                        background: 'rgba(0, 0, 0, 0.7)',
                        border: '1px solid rgba(0, 255, 136, 0.3)',
                        color: '#00ff88',
                      }}
                    >
                      {feature.terminalCode}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {[
                        { label: 'Tri-Daily', wallet: LOTTERY_WALLETS['tri-daily'] },
                        { label: 'Special Event', wallet: LOTTERY_WALLETS['special-event'] },
                        { label: 'Jackpot', wallet: LOTTERY_WALLETS['jackpot'] },
                        { label: 'Grand Prize', wallet: LOTTERY_WALLETS['grand-prize'] },
                      ].map((lottery, idx) => (
                        <motion.a
                          key={idx}
                          href={`https://solscan.io/account/${lottery.wallet}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg font-mono text-xs transition-all duration-300 flex items-center justify-center gap-1.5"
                          style={{
                            background: 'rgba(0, 0, 0, 0.7)',
                            border: '1px solid rgba(0, 255, 136, 0.3)',
                            color: '#00ff88',
                          }}
                          whileHover={{
                            borderColor: '#00ff88',
                            boxShadow: '0 0 15px rgba(0, 255, 136, 0.4)',
                            scale: 1.05,
                          }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {lottery.label}
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </motion.a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    className="p-3 rounded-lg font-mono text-xs"
                    style={{
                      background: 'rgba(0, 0, 0, 0.7)',
                      border: '1px solid rgba(0, 255, 136, 0.3)',
                      color: '#00ff88',
                    }}
                  >
                    {feature.terminalCode}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <DrawDataSection
          draws={draws}
          currentIndex={currentIndex}
          setCurrentIndex={handleSetIndex}
          loading={loading}
          error={error}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 p-4 rounded-xl text-center"
          style={{
            background: 'rgba(0, 255, 136, 0.1)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
          }}
        >
          <div className="flex items-center justify-center space-x-4 font-mono text-sm">
            <div className="flex items-center space-x-2">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#00ff88' }}
              />
              <span style={{ color: '#00ff88' }}>
                <span className="hidden sm:inline">SYSTEM_STATUS: OPERATIONAL</span>
                <span className="sm:hidden text-xs">SYS: OK</span>
              </span>
            </div>
            <div className="text-zinc-400">|</div>
            <div style={{ color: '#00ccff' }}>
              <span className="hidden sm:inline">VRF_MODULE: ACTIVE</span>
              <span className="sm:hidden">VRF: OK</span>
            </div>
            <div className="text-zinc-400">|</div>
            <div style={{ color: '#ffffff' }}>BLOCKCHAIN_SYNC: 100%</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
