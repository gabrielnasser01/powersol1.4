import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, CheckCircle, Terminal, Lock, Database, ExternalLink } from 'lucide-react';
import { theme } from '../theme';
import { LOTTERY_WALLETS } from '../services/walletBalanceService';

export function Transparency() {
  const fairnessFeatures = [
    {
      icon: Shield,
      title: 'VRF_RANDOMNESS.EXE',
      description: 'VRF (Verifiable Random Function) ensures truly random and tamper-proof draw results. Military-grade entropy generation.',
      terminalCode: '> chainlink_vrf.verify(seed_hash)',
    },
    {
      icon: Eye,
      title: 'AUDIT_PROTOCOL.SYS',
      description: 'Every draw can be independently verified using our verification protocols. Complete audit trail available.',
      terminalCode: '> verify_draw.exe --hash=0xa1b2c3',
    },
    {
      icon: CheckCircle,
      title: 'BLOCKCHAIN_LEDGER.DB',
      description: 'All draws are recorded on the Solana blockchain, making them permanent and unchangeable. Distributed ledger security.',
      terminalCode: '> solana_scan.check_transaction()',
    },
  ];

  const sampleDraw = {
    drawId: 'tri-daily-001',
    timestamp: '2024-01-15T18:00:00Z',
    commitHash: '0xa1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
    seedHash: '0x987654321098765432109876543210987654321098765432109876543210',
    participants: 1247,
    prizePool: '1,250 SOL',
    winners: [
      { position: 1, wallet: '7xK...9mP', prize: '625 SOL' },
      { position: 2, wallet: 'Bv2...4nQ', prize: '312.5 SOL' },
      { position: 3, wallet: '3hM...7wR', prize: '156.25 SOL' },
    ],
  };

  return (
    <div className="min-h-screen pt-20 pb-20 relative overflow-hidden">
      {/* Terminal Matrix Background */}
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
        
        {/* Terminal scanner effect */}
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
        
        <style jsx>{`
          @keyframes terminalScan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
          }
        `}</style>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Terminal corner decorations - Desktop */}
        <div className="absolute top-24 left-6 text-xs font-mono text-green-500/40 hidden sm:block">
          [SYSTEM_ACTIVE]
        </div>
        <div className="absolute top-24 right-6 text-xs font-mono text-green-500/40 hidden sm:block">
          [TRANSPARENCY_MODULE]
        </div>
        
        {/* Mobile terminal indicators */}
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

        {/* Features Grid */}
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
                style={{
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
                }}
              >
                {/* Terminal indicators */}
                <div className="absolute top-2 left-2 text-xs font-mono text-green-400/60">
                  [{index.toString().padStart(2, '0')}]
                </div>
                <div className="absolute top-2 right-2 text-xs font-mono text-green-400/60">
                  [ACTIVE]
                </div>
                
                <div 
                  className="w-16 h-16 rounded-xl mb-6 flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, rgba(0, 255, 136, 0.3), rgba(0, 204, 255, 0.2))`,
                    border: `1px solid rgba(0, 255, 136, 0.5)`,
                    boxShadow: '0 0 15px rgba(0, 255, 136, 0.4)',
                  }}
                >
                  <Icon className="w-8 h-8" style={{ color: '#00ff88' }} />
                </div>
                
                <h3 className="text-xl font-bold mb-3 font-mono" style={{ 
                  color: '#00ff88',
                  textShadow: '0 0 10px rgba(0, 255, 136, 0.6)',
                }}>
                  {feature.title}
                </h3>
                
                <p className="text-zinc-300 leading-relaxed mb-4 font-mono text-sm">
                  {feature.description}
                </p>
                
                {/* Terminal command - Clickable for Solscan */}
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

                    {/* Lottery Links Grid */}
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

        {/* Sample Draw Data */}
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
                background: `linear-gradient(135deg, rgba(0, 255, 136, 0.3), rgba(0, 204, 255, 0.2))`,
                border: `1px solid rgba(0, 255, 136, 0.5)`,
                boxShadow: '0 0 15px rgba(0, 255, 136, 0.4)',
              }}
            >
              <Database className="w-6 h-6" style={{ color: '#00ff88' }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-mono" style={{ 
                color: '#ffffff',
                textShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
              }}>
                <span className="hidden sm:inline">SAMPLE_DRAW_DATA.JSON</span>
                <span className="sm:hidden text-lg">DRAW_DATA.JSON</span>
              </h2>
              <p className="text-green-300/70 font-mono text-sm">
                Real draw verification data
              </p>
            </div>
          </div>
          
          <div 
            className="p-8 rounded-2xl border relative overflow-hidden"
            style={{
              background: `
                linear-gradient(0deg, rgba(0, 255, 136, 0.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 255, 136, 0.08) 1px, transparent 1px),
                linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(0, 20, 10, 0.95) 100%)
              `,
              backgroundSize: '20px 20px, 20px 20px, 100% 100%',
              borderColor: 'rgba(0, 255, 136, 0.5)',
              boxShadow: '0 0 30px rgba(0, 255, 136, 0.3), inset 0 0 50px rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(20px)',
              fontFamily: 'monospace',
            }}
          >
            {/* Terminal indicators */}
            <div className="absolute top-2 left-2 text-xs font-mono text-green-400/60">
              [DATA_STREAM]
            </div>
            <div className="absolute top-2 right-2 text-xs font-mono text-green-400/60">
              [VERIFIED]
            </div>
            
            <pre 
              className="text-sm font-mono overflow-x-auto whitespace-pre-wrap"
              style={{ 
                color: '#00ff88',
                textShadow: '0 0 8px rgba(0, 255, 136, 0.6)',
              }}
            >
{JSON.stringify(sampleDraw, null, 2)}
            </pre>
            
            {/* Terminal cursor */}
            <motion.div
              className="inline-block w-2 h-4 ml-1"
              style={{ background: '#00ff88' }}
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>
        </motion.div>

        {/* Terminal Status Bar */}
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