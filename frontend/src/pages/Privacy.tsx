import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, Lock, Database, UserCheck, FileText } from 'lucide-react';
import { theme } from '../theme';

export function Privacy() {
  const privacySections = [
    {
      icon: Shield,
      title: 'Data Protection',
      content: 'We implement industry-standard security measures to protect your personal information. All data is encrypted in transit and at rest using AES-256 encryption.',
    },
    {
      icon: Eye,
      title: 'Information We Collect',
      content: 'We only collect essential information: wallet addresses for transactions, IP addresses for security, and optional email addresses for notifications. No personal identification is required.',
    },
    {
      icon: Lock,
      title: 'How We Use Your Data',
      content: 'Your data is used solely for platform functionality: processing lottery entries, distributing prizes, preventing fraud, and sending optional notifications.',
    },
    {
      icon: Database,
      title: 'Data Storage',
      content: 'Data is stored on secure servers with regular backups. We retain transaction data for legal compliance and delete unnecessary personal data after 2 years of inactivity.',
    },
    {
      icon: UserCheck,
      title: 'Your Rights',
      content: 'You have the right to access, correct, or delete your personal data. Contact us to exercise these rights or for any privacy-related questions.',
    },
    {
      icon: FileText,
      title: 'Third-Party Services',
      content: 'We use Solana blockchain (public), VRF (randomness), and optional analytics services. These services have their own privacy policies.',
    },
  ];

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
        {/* Terminal corner decorations */}
        <div className="absolute top-24 left-6 text-xs font-mono text-green-500/40 hidden sm:block">
          [SYSTEM_ACTIVE]
        </div>
        <div className="absolute top-24 right-6 text-xs font-mono text-green-500/40 hidden sm:block">
          [PRIVACY_MODULE]
        </div>
        
        {/* Mobile terminal indicators */}
        <div className="block sm:hidden text-center pt-4 pb-2">
          <div className="flex justify-center space-x-4 text-xs font-mono text-green-500/80">
            <span>[SYSTEM_ACTIVE]</span>
            <span>[PRIVACY_MODULE]</span>
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
            {'>'} PRIVACY_POLICY.SYS
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-mono">
            [INITIALIZING...] Your privacy and data protection protocols. Last updated: January 2024.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="prose prose-invert max-w-none mb-12"
            style={{
              background: `
                linear-gradient(0deg, rgba(0, 255, 136, 0.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 255, 136, 0.08) 1px, transparent 1px),
                linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(0, 20, 10, 0.95) 100%)
              `,
              backgroundSize: '20px 20px, 20px 20px, 100% 100%',
              borderRadius: '2rem',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              boxShadow: '0 0 30px rgba(0, 255, 136, 0.2), inset 0 0 50px rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(20px)',
              padding: '3rem',
            }}
          >
            <div className="flex items-center space-x-4 mb-8">
              <div 
                className="p-3 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, rgba(0, 255, 136, 0.3), rgba(0, 204, 255, 0.2))`,
                  border: `1px solid rgba(0, 255, 136, 0.5)`,
                  boxShadow: '0 0 15px rgba(0, 255, 136, 0.4)',
                }}
              >
                <Shield className="w-6 h-6" style={{ color: '#00ff88' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-mono" style={{ color: '#ffffff' }}>
                  Privacy & Data Protection
                </h2>
                <p className="text-green-300/70 font-mono text-sm">
                  Your privacy is our priority
                </p>
              </div>
            </div>

            <div className="space-y-6 text-zinc-300 font-mono">
              <section>
                <h3 className="text-xl font-bold mb-4" style={{ color: '#00ff88' }}>
                  1. OVERVIEW
                </h3>
                <p>
                  powerSOL is committed to protecting your privacy. This policy explains how we collect, use, and protect your information when you use our decentralized lottery platform.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4" style={{ color: '#00ff88' }}>
                  2. WALLET-ONLY AUTHENTICATION
                </h3>
                <p>
                  We use wallet-only authentication, meaning no personal information is required to participate. Your Solana wallet address is the only identifier we use for transactions and prize distribution.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4" style={{ color: '#00ff88' }}>
                  3. BLOCKCHAIN TRANSPARENCY
                </h3>
                <p>
                  All lottery transactions are recorded on the Solana blockchain, which is public by design. While wallet addresses are visible on-chain, they are pseudonymous and don't directly reveal personal identity.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4" style={{ color: '#00ff88' }}>
                  4. COOKIES AND TRACKING
                </h3>
                <p>
                  We use minimal cookies for essential functionality only. No third-party tracking or advertising cookies are used. You can disable cookies in your browser settings.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4" style={{ color: '#00ff88' }}>
                  5. DATA RETENTION
                </h3>
                <p>
                  We retain transaction data as required by law and for platform functionality. Personal data (if any) is deleted after 2 years of account inactivity.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4" style={{ color: '#00ff88' }}>
                  6. CONTACT US
                </h3>
                <p>
                  For privacy-related questions or to exercise your data rights, contact us at privacy@powersol.io or through our official channels.
                </p>
              </section>
            </div>
          </motion.div>

          {/* Privacy Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {privacySections.map((section, index) => {
              const Icon = section.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
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
                    [SECURE]
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
                    {section.title}
                  </h3>
                  
                  <p className="text-zinc-300 leading-relaxed font-mono text-sm">
                    {section.content}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Terminal Status Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
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
                <span className="hidden sm:inline">PRIVACY_STATUS: PROTECTED</span>
                <span className="sm:hidden text-xs">PRIVACY: OK</span>
              </span>
            </div>
            <div className="text-zinc-400">|</div>
            <div style={{ color: '#00ccff' }}>
              <span className="hidden sm:inline">ENCRYPTION: AES-256</span>
              <span className="sm:hidden">ENC: AES-256</span>
            </div>
            <div className="text-zinc-400">|</div>
            <div style={{ color: '#ffffff' }}>
              <span className="hidden sm:inline">COMPLIANCE: GDPR</span>
              <span className="sm:hidden">GDPR: ✓</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}