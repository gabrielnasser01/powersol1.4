import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, ChevronDown, ChevronUp, X, Network,
  ArrowRight, Clock, AlertTriangle, ExternalLink, Shield,
  Eye, EyeOff, Zap, Activity, CheckCircle, ShieldCheck,
  TrendingUp, UserX, Ticket, Timer, FileText, Check,
  XCircle, ChevronRight, Loader, Mail, Globe, MessageSquare,
} from 'lucide-react';
import { adminService, AffiliateRanking, AffiliateApplication, SybilAlert } from '../../services/adminService';
import { AdminLayout } from './AdminLayout';
import { AdminGuard } from './AdminGuard';
import { useAdminAutoRefresh } from '../../hooks/useAdminAutoRefresh';

const CLAIM_PROGRAM_ID = 'DX1rjpefmrBR8hASnExE3qCBpjpFEkUY4JEoTLmuU2JK';

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Starter', color: '#a1a1aa' },
  2: { label: 'Bronze', color: '#cd7f32' },
  3: { label: 'Silver', color: '#c0c0c0' },
  4: { label: 'Gold', color: '#ffd700' },
};

function getRiskColor(score: number): string {
  if (score >= 70) return '#ef4444';
  if (score >= 40) return '#f59e0b';
  return '#eab308';
}

function getRiskLabel(score: number): string {
  if (score >= 70) return 'CRITICAL';
  if (score >= 40) return 'HIGH';
  return 'MEDIUM';
}

interface ClusterNode {
  id: string;
  label: string;
  type: 'affiliate' | 'single-ticket' | 'ghost' | 'rapid';
  x: number;
  y: number;
  radius: number;
  tickets: number;
  sol: number;
}

function ClusterVisualization({ alert }: { alert: SybilAlert }) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<ClusterNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 500 });

  useEffect(() => {
    const parent = svgRef.current?.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      setDimensions({ width: rect.width, height: Math.max(400, Math.min(rect.width * 0.7, 500)) });
    }
  }, []);

  const nodes = useMemo(() => {
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    const result: ClusterNode[] = [];

    result.push({
      id: alert.wallet_address,
      label: `${alert.wallet_address.slice(0, 6)}...${alert.wallet_address.slice(-4)}`,
      type: 'affiliate',
      x: cx,
      y: cy,
      radius: 28,
      tickets: 0,
      sol: alert.total_earned,
    });

    const rapidWalletSet = new Set(alert.rapid_signups.map(s => s.wallet));

    const allSuspect = [
      ...alert.single_ticket_wallets.map(w => ({ ...w, type: 'single-ticket' as const })),
      ...alert.zero_ticket_wallets.map(w => ({ ...w, type: 'ghost' as const })),
    ];

    const maxNodes = Math.min(allSuspect.length, 40);
    const angleStep = (2 * Math.PI) / Math.max(maxNodes, 1);
    const baseOrbit = Math.min(cx, cy) * 0.55;
    const outerOrbit = Math.min(cx, cy) * 0.8;

    for (let i = 0; i < maxNodes; i++) {
      const w = allSuspect[i];
      const isRapid = rapidWalletSet.has(w.wallet);
      const angle = angleStep * i - Math.PI / 2;
      const orbit = isRapid ? outerOrbit : baseOrbit + (Math.random() - 0.5) * 30;
      const jitterX = (Math.random() - 0.5) * 20;
      const jitterY = (Math.random() - 0.5) * 20;

      result.push({
        id: w.wallet,
        label: `${w.wallet.slice(0, 6)}...${w.wallet.slice(-4)}`,
        type: isRapid ? 'rapid' : w.type,
        x: cx + Math.cos(angle) * orbit + jitterX,
        y: cy + Math.sin(angle) * orbit + jitterY,
        radius: w.type === 'ghost' ? 8 : Math.max(6, Math.min(14, w.tickets * 3)),
        tickets: w.tickets,
        sol: w.sol,
      });
    }

    return result;
  }, [alert, dimensions]);

  const affiliateNode = nodes[0];
  const typeColors: Record<string, string> = {
    'affiliate': '#ef4444',
    'single-ticket': '#f59e0b',
    'ghost': '#6b7280',
    'rapid': '#f97316',
  };

  return (
    <div className="relative rounded-lg border border-zinc-800/50 overflow-hidden" style={{ background: 'rgba(5, 5, 10, 0.8)' }}>
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        {[
          { color: '#ef4444', label: 'Affiliate (center)' },
          { color: '#f59e0b', label: 'Single-ticket wallet' },
          { color: '#6b7280', label: 'Ghost wallet (0 tickets)' },
          { color: '#f97316', label: 'Rapid signup' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
            <span className="text-zinc-600 font-mono" style={{ fontSize: '9px' }}>{item.label}</span>
          </div>
        ))}
      </div>

      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full"
        style={{ minHeight: 400 }}
      >
        <defs>
          <radialGradient id="cluster-glow-red" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
          <filter id="node-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx={affiliateNode.x}
          cy={affiliateNode.y}
          r={Math.min(dimensions.width, dimensions.height) * 0.35}
          fill="url(#cluster-glow-red)"
        />

        {nodes.slice(1).map(node => (
          <line
            key={`line-${node.id}`}
            x1={affiliateNode.x}
            y1={affiliateNode.y}
            x2={node.x}
            y2={node.y}
            stroke={typeColors[node.type]}
            strokeOpacity={hoveredNode?.id === node.id ? 0.5 : 0.08}
            strokeWidth={hoveredNode?.id === node.id ? 1.5 : 0.5}
            strokeDasharray={node.type === 'ghost' ? '3 3' : undefined}
          />
        ))}

        {nodes.slice(1).map(node => {
          const color = typeColors[node.type];
          const isHovered = hoveredNode?.id === node.id;
          return (
            <g
              key={node.id}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
              onClick={() => window.open(`https://solscan.io/account/${node.id}?cluster=devnet`, '_blank')}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={isHovered ? node.radius + 3 : node.radius}
                fill={color}
                fillOpacity={isHovered ? 0.4 : 0.2}
                stroke={color}
                strokeOpacity={isHovered ? 0.8 : 0.4}
                strokeWidth={isHovered ? 1.5 : 0.75}
                filter={isHovered ? 'url(#node-glow)' : undefined}
              />
              {node.type === 'ghost' && (
                <line
                  x1={node.x - node.radius * 0.4}
                  y1={node.y - node.radius * 0.4}
                  x2={node.x + node.radius * 0.4}
                  y2={node.y + node.radius * 0.4}
                  stroke={color}
                  strokeOpacity={0.6}
                  strokeWidth={1}
                />
              )}
            </g>
          );
        })}

        <g filter="url(#node-glow)">
          <circle
            cx={affiliateNode.x}
            cy={affiliateNode.y}
            r={affiliateNode.radius}
            fill="#ef4444"
            fillOpacity={0.3}
            stroke="#ef4444"
            strokeWidth={2}
          />
          <circle
            cx={affiliateNode.x}
            cy={affiliateNode.y}
            r={affiliateNode.radius - 6}
            fill="none"
            stroke="#ef4444"
            strokeOpacity={0.4}
            strokeWidth={0.5}
          />
          <text
            x={affiliateNode.x}
            y={affiliateNode.y + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#ef4444"
            fontSize="8"
            fontFamily="monospace"
            fontWeight="bold"
          >
            AFF
          </text>
        </g>
      </svg>

      {hoveredNode && (
        <div
          className="absolute z-20 pointer-events-none rounded-lg border p-2.5"
          style={{
            left: Math.min(hoveredNode.x + 15, dimensions.width - 200),
            top: Math.max(hoveredNode.y - 60, 10),
            background: 'rgba(10, 11, 15, 0.95)',
            borderColor: `${typeColors[hoveredNode.type]}40`,
            backdropFilter: 'blur(8px)',
          }}
        >
          <p className="text-zinc-300 font-mono text-xs font-bold">{hoveredNode.label}</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="px-1.5 py-0.5 rounded font-mono font-bold"
              style={{ fontSize: '9px', background: `${typeColors[hoveredNode.type]}20`, color: typeColors[hoveredNode.type] }}
            >
              {hoveredNode.type.replace('-', ' ').toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-zinc-500 font-mono" style={{ fontSize: '10px' }}>
            <span>{hoveredNode.tickets} tickets</span>
            <span>{hoveredNode.sol.toFixed(4)} SOL</span>
          </div>
          <p className="text-zinc-700 font-mono mt-1" style={{ fontSize: '9px' }}>Click to view on Solscan</p>
        </div>
      )}

      <div className="absolute bottom-3 right-3">
        <span className="text-zinc-700 font-mono" style={{ fontSize: '9px' }}>
          {nodes.length - 1} connected wallets
        </span>
      </div>
    </div>
  );
}

function ClusterAnalysisTab({ alert, riskColor }: { alert: SybilAlert; riskColor: string }) {
  const [iframeWallet, setIframeWallet] = useState(alert.wallet_address);
  const [showIframe, setShowIframe] = useState(true);

  const bubblemapsIframeUrl = `https://iframe.bubblemaps.io/map?address=${iframeWallet}&chain=solana&partnerId=demo`;
  const solsniffUrl = `https://solsniff.com/address/${alert.wallet_address}`;
  const solscanProgramUrl = `https://solscan.io/account/${CLAIM_PROGRAM_ID}?cluster=devnet#transactions`;
  const solscanWalletUrl = `https://solscan.io/account/${alert.wallet_address}?cluster=devnet`;

  const suspectWallets = [...alert.single_ticket_wallets, ...alert.zero_ticket_wallets];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-800/50 p-4" style={{ background: 'rgba(15, 15, 20, 0.6)' }}>
        <h4 className="text-zinc-400 font-mono text-xs font-bold mb-3 uppercase tracking-wider">Suspect Wallet Cluster Map</h4>
        <p className="text-zinc-600 font-mono text-xs mb-3 leading-relaxed">
          Interactive visualization of the affiliate's referral network. Bubble size reflects ticket count.
          Click any node to open in Solscan.
        </p>
        <ClusterVisualization alert={alert} />
      </div>

      <div className="rounded-lg border border-cyan-500/20 p-4" style={{ background: 'rgba(15, 15, 20, 0.6)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-cyan-400" />
            <h4 className="text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">Bubblemaps Live View</h4>
          </div>
          <button
            onClick={() => setShowIframe(!showIframe)}
            className="text-zinc-500 hover:text-cyan-400 transition-colors font-mono text-xs px-2 py-1 rounded border border-zinc-800 hover:border-cyan-500/30"
          >
            {showIframe ? 'Hide' : 'Show'}
          </button>
        </div>

        {showIframe && (
          <>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <button
                onClick={() => setIframeWallet(alert.wallet_address)}
                className="font-mono text-xs px-2.5 py-1 rounded transition-all"
                style={{
                  background: iframeWallet === alert.wallet_address ? 'rgba(6, 182, 212, 0.15)' : 'rgba(39, 39, 42, 0.5)',
                  border: `1px solid ${iframeWallet === alert.wallet_address ? 'rgba(6, 182, 212, 0.4)' : 'rgba(63, 63, 70, 0.5)'}`,
                  color: iframeWallet === alert.wallet_address ? '#06b6d4' : '#71717a',
                }}
              >
                Affiliate
              </button>
              <button
                onClick={() => setIframeWallet(CLAIM_PROGRAM_ID)}
                className="font-mono text-xs px-2.5 py-1 rounded transition-all"
                style={{
                  background: iframeWallet === CLAIM_PROGRAM_ID ? 'rgba(6, 182, 212, 0.15)' : 'rgba(39, 39, 42, 0.5)',
                  border: `1px solid ${iframeWallet === CLAIM_PROGRAM_ID ? 'rgba(6, 182, 212, 0.4)' : 'rgba(63, 63, 70, 0.5)'}`,
                  color: iframeWallet === CLAIM_PROGRAM_ID ? '#06b6d4' : '#71717a',
                }}
              >
                Claim Program
              </button>
              {suspectWallets.slice(0, 5).map((w, i) => (
                <button
                  key={w.wallet}
                  onClick={() => setIframeWallet(w.wallet)}
                  className="font-mono px-2.5 py-1 rounded transition-all"
                  style={{
                    fontSize: '10px',
                    background: iframeWallet === w.wallet ? 'rgba(6, 182, 212, 0.15)' : 'rgba(39, 39, 42, 0.5)',
                    border: `1px solid ${iframeWallet === w.wallet ? 'rgba(6, 182, 212, 0.4)' : 'rgba(63, 63, 70, 0.5)'}`,
                    color: iframeWallet === w.wallet ? '#06b6d4' : '#71717a',
                  }}
                >
                  #{i + 1} {w.wallet.slice(0, 4)}...{w.wallet.slice(-3)}
                </button>
              ))}
            </div>

            <div className="rounded-lg overflow-hidden border border-cyan-500/10">
              <iframe
                src={bubblemapsIframeUrl}
                style={{ width: '100%', height: 500, border: 'none' }}
                title="Bubblemaps Cluster Analysis"
                allow="clipboard-read; clipboard-write"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
            <p className="text-zinc-700 font-mono mt-2 text-center" style={{ fontSize: '9px' }}>
              Viewing: {iframeWallet.slice(0, 12)}...{iframeWallet.slice(-8)}
            </p>
          </>
        )}
      </div>

      <div className="rounded-lg border border-zinc-800/50 p-4" style={{ background: 'rgba(15, 15, 20, 0.6)' }}>
        <h4 className="text-zinc-400 font-mono text-xs font-bold mb-3 uppercase tracking-wider">External Analysis Tools</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href={`https://app.bubblemaps.io/sol/token/${CLAIM_PROGRAM_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-lg border border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500/40 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20">
              <Network className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-mono text-sm font-bold">Bubblemaps Full</span>
                <ExternalLink className="w-3 h-3 text-cyan-400/50 group-hover:text-cyan-400 transition-colors" />
              </div>
              <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                Open full Bubblemaps for claim program
              </p>
            </div>
          </a>
          <a
            href={solsniffUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-mono text-sm font-bold">SolSniff</span>
                <ExternalLink className="w-3 h-3 text-emerald-400/50 group-hover:text-emerald-400 transition-colors" />
              </div>
              <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                Affiliate wallet risk analysis
              </p>
            </div>
          </a>
          <a
            href={solscanWalletUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
              <Eye className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 font-mono text-sm font-bold">Solscan Wallet</span>
                <ExternalLink className="w-3 h-3 text-blue-400/50 group-hover:text-blue-400 transition-colors" />
              </div>
              <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                View affiliate wallet transactions
              </p>
            </div>
          </a>
          <a
            href={solscanProgramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-lg border border-orange-500/20 bg-orange-500/5 hover:border-orange-500/40 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-500/10 border border-orange-500/20">
              <Activity className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-orange-400 font-mono text-sm font-bold">Claim Program TX</span>
                <ExternalLink className="w-3 h-3 text-orange-400/50 group-hover:text-orange-400 transition-colors" />
              </div>
              <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                All claim program transactions
              </p>
            </div>
          </a>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800/50 p-4" style={{ background: 'rgba(15, 15, 20, 0.6)' }}>
        <h4 className="text-zinc-400 font-mono text-xs font-bold mb-3 uppercase tracking-wider">Quick Links - Suspect Wallets</h4>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {suspectWallets.slice(0, 15).map((w, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded border border-zinc-800/30 bg-zinc-900/30">
              <span className="text-zinc-300 font-mono text-xs flex-1 truncate">{w.wallet}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`https://app.bubblemaps.io/sol/token/${w.wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400/50 hover:text-cyan-400 transition-colors"
                  title="Bubblemaps"
                >
                  <Network className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`https://solsniff.com/address/${w.wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400/50 hover:text-emerald-400 transition-colors"
                  title="SolSniff"
                >
                  <Shield className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`https://solscan.io/account/${w.wallet}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400/50 hover:text-blue-400 transition-colors"
                  title="Solscan"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SybilDetailModal({ alert, onClose }: { alert: SybilAlert; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'wallets' | 'rapid' | 'tools'>('overview');
  const riskColor = getRiskColor(alert.risk_score);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border"
        style={{ background: '#0a0b0f', borderColor: `${riskColor}30` }}
      >
        <div className="sticky top-0 z-10 border-b p-4" style={{ background: '#0a0b0f', borderColor: `${riskColor}20` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: `${riskColor}15`, border: `1px solid ${riskColor}40` }}
              >
                <Shield className="w-5 h-5" style={{ color: riskColor }} />
              </div>
              <div>
                <h3 className="text-white font-mono text-sm font-bold">Sybil Analysis Detail</h3>
                <p className="text-zinc-500 font-mono text-xs">
                  {alert.wallet_address.slice(0, 12)}...{alert.wallet_address.slice(-6)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold"
                style={{ background: `${riskColor}20`, border: `1px solid ${riskColor}50`, color: riskColor }}
              >
                RISK {alert.risk_score}/100
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {[
              { label: 'Total Refs', value: alert.total_referrals, color: '#a1a1aa' },
              { label: 'Validated', value: alert.validated_referrals, color: '#10b981' },
              { label: '1-Ticket', value: alert.single_ticket_referrals, color: '#f59e0b' },
              { label: '0-Ticket', value: alert.zero_ticket_referrals, color: '#ef4444' },
              { label: '1-Ticket %', value: `${alert.single_ticket_rate}%`, color: alert.single_ticket_rate > 70 ? '#ef4444' : alert.single_ticket_rate > 50 ? '#f59e0b' : '#a1a1aa' },
            ].map(stat => (
              <div key={stat.label} className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-2 text-center">
                <p className="text-zinc-600 font-mono" style={{ fontSize: '9px' }}>{stat.label}</p>
                <p className="font-mono text-sm font-bold" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-1 mt-4">
            {(['overview', 'wallets', 'rapid', 'tools'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 rounded-md font-mono text-xs transition-all"
                style={{
                  background: activeTab === tab ? `${riskColor}15` : 'transparent',
                  color: activeTab === tab ? riskColor : '#71717a',
                  border: `1px solid ${activeTab === tab ? `${riskColor}40` : 'transparent'}`,
                }}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'wallets' && `Suspect Wallets (${alert.single_ticket_wallets.length + alert.zero_ticket_wallets.length})`}
                {tab === 'rapid' && `Rapid Signups (${alert.rapid_signups.length})`}
                {tab === 'tools' && 'Cluster Analysis'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-800/50 p-4" style={{ background: 'rgba(15, 15, 20, 0.6)' }}>
                <h4 className="text-zinc-400 font-mono text-xs font-bold mb-3 uppercase tracking-wider">Risk Indicators</h4>
                <div className="space-y-3">
                  {alert.single_ticket_rate > 50 && (
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: alert.single_ticket_rate > 70 ? '#ef4444' : '#f59e0b' }} />
                      <div>
                        <p className="text-zinc-300 font-mono text-sm">
                          High single-ticket referral rate: <span style={{ color: riskColor }} className="font-bold">{alert.single_ticket_rate}%</span>
                        </p>
                        <p className="text-zinc-600 font-mono text-xs mt-0.5">
                          {alert.single_ticket_referrals} of {alert.total_referrals} referrals purchased only 1 ticket (minimum to validate)
                        </p>
                      </div>
                    </div>
                  )}
                  {alert.zero_ticket_referrals > 0 && (
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                      <div>
                        <p className="text-zinc-300 font-mono text-sm">
                          Ghost referrals: <span className="text-red-400 font-bold">{alert.zero_ticket_referrals}</span> wallets never purchased
                        </p>
                        <p className="text-zinc-600 font-mono text-xs mt-0.5">
                          Wallets registered via ref link but never bought tickets
                        </p>
                      </div>
                    </div>
                  )}
                  {alert.rapid_signups.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Zap className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                      <div>
                        <p className="text-zinc-300 font-mono text-sm">
                          Rapid signup pattern: <span className="text-amber-400 font-bold">{alert.rapid_signups.length}</span> wallets within 5-min gaps
                        </p>
                        <p className="text-zinc-600 font-mono text-xs mt-0.5">
                          Multiple referrals created in quick succession indicates automated activity
                        </p>
                      </div>
                    </div>
                  )}
                  {alert.low_value_refs.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Activity className="w-4 h-4 mt-0.5 shrink-0 text-yellow-500" />
                      <div>
                        <p className="text-zinc-300 font-mono text-sm">
                          Low-value referrals: <span className="text-yellow-500 font-bold">{alert.low_value_refs.length}</span> with minimal spend
                        </p>
                        <p className="text-zinc-600 font-mono text-xs mt-0.5">
                          Referrals with extremely low SOL per ticket ratio
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full rounded-lg overflow-hidden" style={{ height: 8, background: 'rgba(255,255,255,0.05)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${alert.risk_score}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-lg"
                  style={{ background: `linear-gradient(90deg, ${getRiskColor(30)}, ${riskColor})` }}
                />
              </div>
              <div className="flex justify-between text-zinc-600 font-mono" style={{ fontSize: '9px' }}>
                <span>LOW RISK</span>
                <span>MEDIUM</span>
                <span>HIGH</span>
                <span>CRITICAL</span>
              </div>
            </div>
          )}

          {activeTab === 'wallets' && (
            <div className="space-y-3">
              {alert.single_ticket_wallets.length > 0 && (
                <div>
                  <h4 className="text-amber-400 font-mono text-xs font-bold mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Single-Ticket Wallets ({alert.single_ticket_wallets.length})
                  </h4>
                  <div className="space-y-1.5">
                    {alert.single_ticket_wallets.map((w, i) => (
                      <a
                        key={i}
                        href={`https://solscan.io/account/${w.wallet}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-lg border border-amber-500/10 bg-amber-500/5 hover:border-amber-500/30 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>#{i + 1}</span>
                          <span className="text-zinc-300 font-mono text-sm">
                            {w.wallet.slice(0, 10)}...{w.wallet.slice(-6)}
                          </span>
                          <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex items-center gap-3 text-zinc-500 font-mono" style={{ fontSize: '10px' }}>
                          <span>{w.tickets} ticket</span>
                          <span>{w.sol.toFixed(4)} SOL</span>
                          <span>{new Date(w.created).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {alert.zero_ticket_wallets.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-red-400 font-mono text-xs font-bold mb-2 flex items-center gap-2">
                    <X className="w-3.5 h-3.5" />
                    Zero-Ticket Ghost Wallets ({alert.zero_ticket_wallets.length})
                  </h4>
                  <div className="space-y-1.5">
                    {alert.zero_ticket_wallets.map((w, i) => (
                      <a
                        key={i}
                        href={`https://solscan.io/account/${w.wallet}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-lg border border-red-500/10 bg-red-500/5 hover:border-red-500/30 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>#{i + 1}</span>
                          <span className="text-zinc-300 font-mono text-sm">
                            {w.wallet.slice(0, 10)}...{w.wallet.slice(-6)}
                          </span>
                          <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className="text-red-400/60 font-mono" style={{ fontSize: '10px' }}>
                          {new Date(w.created).toLocaleDateString('pt-BR')}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'rapid' && (
            <div>
              {alert.rapid_signups.length === 0 ? (
                <p className="text-zinc-600 font-mono text-sm text-center py-8">No rapid signup patterns detected</p>
              ) : (
                <div className="space-y-1.5">
                  <h4 className="text-amber-400 font-mono text-xs font-bold mb-3 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" />
                    Signups within 5-minute gaps
                  </h4>
                  {alert.rapid_signups.map((s, i) => (
                    <a
                      key={i}
                      href={`https://solscan.io/account/${s.wallet}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-lg border border-amber-500/10 bg-amber-500/5 hover:border-amber-500/30 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span className="text-zinc-300 font-mono text-sm">
                          {s.wallet.slice(0, 10)}...{s.wallet.slice(-6)}
                        </span>
                        <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex items-center gap-3 font-mono" style={{ fontSize: '10px' }}>
                        <span className="text-amber-400 font-bold">{s.gap_minutes}min gap</span>
                        <span className="text-zinc-600">{new Date(s.created).toLocaleString('pt-BR')}</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tools' && (
            <ClusterAnalysisTab alert={alert} riskColor={riskColor} />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function NetworkModal({ affiliate, onClose }: { affiliate: AffiliateRanking; onClose: () => void }) {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getAffiliateNetwork(affiliate.affiliate_id).then(data => {
      setReferrals(data);
      setLoading(false);
    });
  }, [affiliate.affiliate_id]);

  const totalValue = referrals.reduce((s, r) => s + Number(r.total_value_sol || 0), 0);
  const totalCommission = referrals.reduce((s, r) => s + Number(r.total_commission_earned || 0), 0);
  const validatedCount = referrals.filter(r => r.is_validated).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl border border-zinc-800"
        style={{ background: '#0f1117' }}
      >
        <div className="sticky top-0 z-10 border-b border-zinc-800 p-4" style={{ background: '#0f1117' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-red-400" />
              <h3 className="text-white font-mono text-sm font-bold">Affiliate Network</h3>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center border border-zinc-700" style={{ background: '#1a1c25' }}>
              <Users className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-zinc-300 font-mono text-sm">
                {affiliate.wallet_address.slice(0, 8)}...{affiliate.wallet_address.slice(-4)}
              </p>
              <p className="text-zinc-600 font-mono text-xs">Code: {affiliate.referral_code}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2.5 text-center">
              <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Referrals</p>
              <p className="text-white font-mono text-sm font-bold">{referrals.length}</p>
              <p className="text-emerald-400 font-mono" style={{ fontSize: '10px' }}>{validatedCount} validated</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2.5 text-center">
              <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Volume (SOL)</p>
              <p className="text-amber-400 font-mono text-sm font-bold">{totalValue.toFixed(4)}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2.5 text-center">
              <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Commission</p>
              <p className="text-emerald-400 font-mono text-sm font-bold">{totalCommission.toFixed(4)}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2.5 text-center">
              <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>Claimed</p>
              <p className="text-cyan-400 font-mono text-sm font-bold">{affiliate.total_claimed_sol.toFixed(4)}</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
            </div>
          ) : referrals.length === 0 ? (
            <p className="text-zinc-600 font-mono text-sm text-center py-8">No referrals yet</p>
          ) : (
            <div className="space-y-2">
              {referrals.map((ref) => {
                const user = ref.users as any;
                return (
                  <div
                    key={ref.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      ref.is_validated
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : 'border-zinc-800 bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{
                        background: ref.is_validated ? '#10b981' : '#52525b'
                      }} />
                      <ArrowRight className="w-3 h-3 text-zinc-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-300 font-mono text-sm truncate">
                        {user?.wallet_address?.slice(0, 8) || '???'}...{user?.wallet_address?.slice(-4) || ''}
                      </p>
                      <div className="flex items-center gap-3 text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                        <span>{user?.display_name || 'anon'}</span>
                        <span>{ref.total_tickets_purchased || 0} tickets</span>
                        <span>{Number(ref.total_value_sol || 0).toFixed(4)} SOL</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-amber-400 font-mono text-xs font-bold">
                        {Number(ref.total_commission_earned || 0).toFixed(4)} SOL
                      </p>
                      <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                        {ref.is_validated ? 'validated' : 'pending'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function TierSelector({ affiliate, onTierChanged }: { affiliate: AffiliateRanking; onTierChanged: (id: string, tier: number) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const currentTier = affiliate.manual_tier || 1;
  const tier = TIER_LABELS[currentTier] || TIER_LABELS[1];

  const handleSelect = async (newTier: number) => {
    if (newTier === currentTier) { setOpen(false); return; }
    setSaving(true);
    try {
      await adminService.updateAffiliateTier(affiliate.affiliate_id, newTier);
      onTierChanged(affiliate.affiliate_id, newTier);
    } catch (err) {
      console.error('Failed to update tier:', err);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={saving}
        className="font-mono text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 transition-all hover:brightness-125"
        style={{ color: tier.color, borderColor: `${tier.color}40`, background: `${tier.color}10` }}
      >
        {saving ? <Loader className="w-3 h-3 animate-spin" /> : null}
        {tier.label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 mt-1 z-40 rounded-lg border border-zinc-700 overflow-hidden shadow-xl"
            style={{ background: '#1a1c25', minWidth: 120 }}
          >
            {Object.entries(TIER_LABELS).map(([k, v]) => {
              const tierNum = Number(k);
              const isActive = tierNum === currentTier;
              return (
                <button
                  key={k}
                  onClick={() => handleSelect(tierNum)}
                  className="w-full px-3 py-2 flex items-center gap-2 font-mono text-xs transition-colors hover:bg-zinc-800"
                  style={{ color: v.color, background: isActive ? `${v.color}15` : undefined }}
                >
                  {isActive && <Check className="w-3 h-3" />}
                  <span className={isActive ? 'font-bold' : ''}>{v.label}</span>
                  <span className="text-zinc-600 ml-auto">T{k}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ApplicationsPanel({ onApplicationReviewed }: { onApplicationReviewed: () => void }) {
  const [applications, setApplications] = useState<AffiliateApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const loadApplications = useCallback(async () => {
    try {
      const data = await adminService.getApplications(filter);
      setApplications(data);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    loadApplications();
  }, [loadApplications]);

  const handleReview = async (id: string, decision: 'approved' | 'rejected') => {
    setReviewingId(id);
    try {
      await adminService.reviewApplication(id, decision, adminNotes || undefined);
      setAdminNotes('');
      setExpandedId(null);
      await loadApplications();
      onApplicationReviewed();
    } catch (err) {
      console.error('Review failed:', err);
    } finally {
      setReviewingId(null);
    }
  };

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
    approved: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
    rejected: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
  };

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800/80 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(15,17,23,0.9) 0%, rgba(19,22,33,0.9) 100%)' }}
    >
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h3 className="text-white font-mono text-sm font-bold">Affiliate Applications</h3>
            {filter === 'pending' && pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full font-mono text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {pendingCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-md font-mono text-xs transition-all"
              style={{
                background: filter === s ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                color: filter === s ? '#f59e0b' : '#71717a',
                border: `1px solid ${filter === s ? 'rgba(245, 158, 11, 0.4)' : 'transparent'}`,
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : applications.length === 0 ? (
          <p className="text-zinc-600 font-mono text-sm text-center py-8">
            No {filter === 'all' ? '' : filter} applications
          </p>
        ) : (
          <div className="space-y-2">
            {applications.map(app => {
              const sc = statusColors[app.status] || statusColors.pending;
              const isExpanded = expandedId === app.id;
              return (
                <motion.div
                  key={app.id}
                  layout
                  className="rounded-lg border overflow-hidden"
                  style={{ borderColor: isExpanded ? sc.border : 'rgba(63, 63, 70, 0.3)', background: 'rgba(15, 15, 20, 0.6)' }}
                >
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : app.id)}
                  >
                    <ChevronRight
                      className="w-4 h-4 text-zinc-500 shrink-0 transition-transform"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : undefined }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-zinc-300 font-mono text-sm font-bold truncate">{app.full_name}</p>
                        <span
                          className="font-mono text-xs px-2 py-0.5 rounded-full border shrink-0"
                          style={{ color: sc.text, background: sc.bg, borderColor: sc.border }}
                        >
                          {app.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-zinc-600 font-mono mt-0.5" style={{ fontSize: '10px' }}>
                        <span>{app.wallet_address.slice(0, 6)}...{app.wallet_address.slice(-4)}</span>
                        <span>{app.email}</span>
                        <span>{new Date(app.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    {app.marketing_experience && (
                      <span className="text-zinc-500 font-mono text-xs shrink-0 hidden sm:block">
                        {app.marketing_experience}
                      </span>
                    )}
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1 border-t border-zinc-800/50 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-zinc-400">
                                <Mail className="w-3.5 h-3.5" />
                                <span className="font-mono text-xs">{app.email}</span>
                              </div>
                              {app.country && (
                                <div className="flex items-center gap-2 text-zinc-400">
                                  <Globe className="w-3.5 h-3.5" />
                                  <span className="font-mono text-xs">{app.country}</span>
                                </div>
                              )}
                              {app.social_media && (
                                <div className="flex items-center gap-2">
                                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                                  <a
                                    href={app.social_media}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-xs text-cyan-400 hover:text-cyan-300 truncate"
                                  >
                                    {app.social_media}
                                  </a>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-zinc-400">
                                <Users className="w-3.5 h-3.5" />
                                <span className="font-mono text-xs">Wallet: {app.wallet_address}</span>
                              </div>
                            </div>
                            {app.marketing_strategy && (
                              <div className="rounded-lg border border-zinc-800/50 p-3" style={{ background: 'rgba(10, 10, 15, 0.5)' }}>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                                  <span className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>MARKETING STRATEGY</span>
                                </div>
                                <p className="text-zinc-300 font-mono text-xs leading-relaxed">{app.marketing_strategy}</p>
                              </div>
                            )}
                          </div>

                          {app.status === 'pending' && (
                            <div className="border-t border-zinc-800/50 pt-3 space-y-2">
                              <input
                                type="text"
                                value={adminNotes}
                                onChange={e => setAdminNotes(e.target.value)}
                                placeholder="Admin notes (optional)..."
                                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/50"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleReview(app.id, 'approved')}
                                  disabled={reviewingId === app.id}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all hover:brightness-110 disabled:opacity-50"
                                  style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                                >
                                  {reviewingId === app.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReview(app.id, 'rejected')}
                                  disabled={reviewingId === app.id}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all hover:brightness-110 disabled:opacity-50"
                                  style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                                >
                                  {reviewingId === app.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                  Reject
                                </button>
                              </div>
                            </div>
                          )}

                          {app.admin_notes && (
                            <div className="rounded-lg border border-zinc-800/50 p-2.5" style={{ background: 'rgba(10, 10, 15, 0.5)' }}>
                              <span className="text-zinc-600 font-mono" style={{ fontSize: '9px' }}>ADMIN NOTES: </span>
                              <span className="text-zinc-400 font-mono text-xs">{app.admin_notes}</span>
                            </div>
                          )}

                          {app.reviewed_at && (
                            <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                              Reviewed: {new Date(app.reviewed_at).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function AdminAffiliates() {
  const [affiliates, setAffiliates] = useState<AffiliateRanking[]>([]);
  const [unclaimedRewards, setUnclaimedRewards] = useState<any[]>([]);
  const [sybilAlerts, setSybilAlerts] = useState<SybilAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'total_earned' | 'referral_count' | 'total_referral_value_sol'>('total_earned');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateRanking | null>(null);
  const [selectedSybilAlert, setSelectedSybilAlert] = useState<SybilAlert | null>(null);
  const [showSybilPanel, setShowSybilPanel] = useState(true);
  const [showUnclaimedModal, setShowUnclaimedModal] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [a, u, s] = await Promise.all([
        adminService.getAffiliateRankings(),
        adminService.getUnclaimedAffiliateRewards(),
        adminService.getSybilAnalysis(),
      ]);
      setAffiliates(a);
      setUnclaimedRewards(u);
      setSybilAlerts(s);
    } catch (err) {
      console.error('Failed to load affiliates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const { lastRefresh } = useAdminAutoRefresh(loadData);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    let result = affiliates.filter(a => {
      if (!search) return true;
      const q = search.toLowerCase();
      return a.wallet_address.toLowerCase().includes(q) ||
        a.referral_code.toLowerCase().includes(q);
    });

    result.sort((a, b) => {
      const aVal = a[sortBy] as number;
      const bVal = b[sortBy] as number;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return result;
  }, [affiliates, search, sortBy, sortDir]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortBy }) => {
    if (sortBy !== field) return <ChevronDown className="w-3 h-3 text-zinc-600" />;
    return sortDir === 'desc'
      ? <ChevronDown className="w-3 h-3 text-red-400" />
      : <ChevronUp className="w-3 h-3 text-red-400" />;
  };

  const handleTierChanged = (affiliateId: string, newTier: number) => {
    setAffiliates(prev => prev.map(a =>
      a.affiliate_id === affiliateId ? { ...a, manual_tier: newTier } : a
    ));
  };

  const releasedUnclaimed = unclaimedRewards.filter((r: any) => r.is_released);
  const pendingRelease = unclaimedRewards.filter((r: any) => !r.is_released);
  const totalReleasedLamports = releasedUnclaimed.reduce((s: number, r: any) => s + Number(r.pending_lamports || 0), 0);
  const totalPendingReleaseLamports = pendingRelease.reduce((s: number, r: any) => s + Number(r.pending_lamports || 0), 0);
  const totalUnclaimedLamports = totalReleasedLamports + totalPendingReleaseLamports;
  const totalExpiredSol = affiliates.reduce((s, a) => s + (a.expired_rewards_sol || 0), 0);
  const totalExpiredAffiliates = affiliates.filter(a => (a.expired_rewards_sol || 0) > 0).length;
  const criticalAlerts = sybilAlerts.filter(a => a.risk_score >= 70);
  const highAlerts = sybilAlerts.filter(a => a.risk_score >= 40 && a.risk_score < 70);

  const sybilWalletSet = useMemo(() => new Set(sybilAlerts.map(a => a.wallet_address)), [sybilAlerts]);
  const sybilScoreMap = useMemo(() => {
    const map: Record<string, number> = {};
    sybilAlerts.forEach(a => { map[a.wallet_address] = a.risk_score; });
    return map;
  }, [sybilAlerts]);

  const monitoringStats = useMemo(() => {
    const totalRefs = affiliates.reduce((s, a) => s + a.referral_count, 0);
    const totalVolume = affiliates.reduce((s, a) => s + a.total_referral_value_sol, 0);
    const totalCommissions = affiliates.reduce((s, a) => s + a.total_earned, 0);
    const avgRefsPerAffiliate = affiliates.length > 0 ? totalRefs / affiliates.length : 0;
    const tiersBreakdown = affiliates.reduce((acc, a) => {
      const t = a.manual_tier || 1;
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    return { totalRefs, totalVolume, totalCommissions, avgRefsPerAffiliate, tiersBreakdown };
  }, [affiliates]);

  return (
    <AdminGuard>
      <AdminLayout>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-end gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-zinc-600 font-mono text-xs">
                LIVE {lastRefresh.toLocaleTimeString()}
              </span>
            </div>

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border overflow-hidden"
              style={{
                borderColor: sybilAlerts.length > 0
                  ? criticalAlerts.length > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'
                  : 'rgba(16, 185, 129, 0.2)',
                background: sybilAlerts.length > 0
                  ? criticalAlerts.length > 0
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.03) 0%, rgba(15, 15, 20, 0.95) 100%)'
                    : 'linear-gradient(135deg, rgba(245, 158, 11, 0.03) 0%, rgba(15, 15, 20, 0.95) 100%)'
                  : 'linear-gradient(135deg, rgba(16, 185, 129, 0.02) 0%, rgba(15, 15, 20, 0.95) 100%)',
              }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {sybilAlerts.length > 0 ? (
                        <>
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                          {criticalAlerts.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                          )}
                        </>
                      ) : (
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-white font-mono text-sm font-bold">Sybil Attack Detection</h3>
                      <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                        {sybilAlerts.length > 0 ? (
                          <>
                            {sybilAlerts.length} flagged {sybilAlerts.length === 1 ? 'affiliate' : 'affiliates'}
                            {criticalAlerts.length > 0 && <span className="text-red-400 ml-2">{criticalAlerts.length} critical</span>}
                            {highAlerts.length > 0 && <span className="text-amber-400 ml-2">{highAlerts.length} high</span>}
                          </>
                        ) : (
                          <span className="text-emerald-400/80">
                            All clear -- monitoring {affiliates.length} affiliates with {monitoringStats.totalRefs} referrals
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSybilPanel(!showSybilPanel)}
                    className="text-zinc-500 hover:text-white transition-colors p-1"
                  >
                    {showSybilPanel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <AnimatePresence>
                  {showSybilPanel && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {sybilAlerts.length > 0 ? (
                        <div className="space-y-2 mt-2">
                          {sybilAlerts.map(alert => {
                            const riskColor = getRiskColor(alert.risk_score);
                            const riskLabel = getRiskLabel(alert.risk_score);
                            const tier = TIER_LABELS[alert.manual_tier || 1] || TIER_LABELS[1];
                            return (
                              <motion.div
                                key={alert.affiliate_id}
                                whileHover={{ scale: 1.005 }}
                                onClick={() => setSelectedSybilAlert(alert)}
                                className="flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all hover:bg-white/[0.02]"
                                style={{ borderColor: `${riskColor}20`, background: `${riskColor}05` }}
                              >
                                <div className="flex items-center gap-2 shrink-0">
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold"
                                    style={{ background: `${riskColor}15`, border: `1px solid ${riskColor}30`, color: riskColor }}
                                  >
                                    {alert.risk_score}
                                  </div>
                                  <div
                                    className="px-1.5 py-0.5 rounded font-mono font-bold"
                                    style={{ fontSize: '9px', background: `${riskColor}20`, color: riskColor }}
                                  >
                                    {riskLabel}
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-zinc-300 font-mono text-sm truncate">
                                      {alert.wallet_address.slice(0, 8)}...{alert.wallet_address.slice(-4)}
                                    </p>
                                    <span
                                      className="font-mono px-1.5 py-0.5 rounded-full border"
                                      style={{ fontSize: '9px', color: tier.color, borderColor: `${tier.color}40`, background: `${tier.color}10` }}
                                    >
                                      {tier.label}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-zinc-600 font-mono mt-0.5" style={{ fontSize: '10px' }}>
                                    <span>{alert.total_referrals} refs</span>
                                    <span className="text-amber-400">{alert.single_ticket_referrals} single-ticket</span>
                                    <span className="text-red-400">{alert.zero_ticket_referrals} ghost</span>
                                    {alert.rapid_signups.length > 0 && (
                                      <span className="text-amber-400 flex items-center gap-0.5">
                                        <Zap className="w-2.5 h-2.5" />{alert.rapid_signups.length} rapid
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <p className="font-mono text-sm font-bold" style={{ color: riskColor }}>
                                    {alert.single_ticket_rate}%
                                  </p>
                                  <p className="text-zinc-600 font-mono" style={{ fontSize: '9px' }}>1-ticket rate</p>
                                </div>

                                <div className="shrink-0">
                                  <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    <div
                                      className="h-full rounded-full"
                                      style={{ width: `${alert.risk_score}%`, background: riskColor }}
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-2 space-y-4">
                          <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/15 bg-emerald-500/5">
                            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                            <div>
                              <p className="text-emerald-300 font-mono text-sm font-bold">No Sybil Risks Detected</p>
                              <p className="text-zinc-500 font-mono" style={{ fontSize: '10px' }}>
                                All affiliate referral patterns appear organic. No single-ticket farming, ghost wallets, or rapid signup bursts found.
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="rounded-lg border border-zinc-800/50 p-3 text-center" style={{ background: 'rgba(15, 15, 20, 0.6)' }}>
                              <div className="flex items-center justify-center mb-2">
                                <Users className="w-4 h-4 text-zinc-500" />
                              </div>
                              <p className="text-white font-mono text-lg font-bold">{affiliates.length}</p>
                              <p className="text-zinc-600 font-mono" style={{ fontSize: '9px' }}>AFFILIATES MONITORED</p>
                            </div>
                            <div className="rounded-lg border border-zinc-800/50 p-3 text-center" style={{ background: 'rgba(15, 15, 20, 0.6)' }}>
                              <div className="flex items-center justify-center mb-2">
                                <Network className="w-4 h-4 text-zinc-500" />
                              </div>
                              <p className="text-white font-mono text-lg font-bold">{monitoringStats.totalRefs}</p>
                              <p className="text-zinc-600 font-mono" style={{ fontSize: '9px' }}>REFERRALS SCANNED</p>
                            </div>
                            <div className="rounded-lg border border-zinc-800/50 p-3 text-center" style={{ background: 'rgba(15, 15, 20, 0.6)' }}>
                              <div className="flex items-center justify-center mb-2">
                                <TrendingUp className="w-4 h-4 text-zinc-500" />
                              </div>
                              <p className="text-white font-mono text-lg font-bold">{monitoringStats.totalVolume.toFixed(2)}</p>
                              <p className="text-zinc-600 font-mono" style={{ fontSize: '9px' }}>REFERRAL VOL (SOL)</p>
                            </div>
                            <div className="rounded-lg border border-zinc-800/50 p-3 text-center" style={{ background: 'rgba(15, 15, 20, 0.6)' }}>
                              <div className="flex items-center justify-center mb-2">
                                <Ticket className="w-4 h-4 text-zinc-500" />
                              </div>
                              <p className="text-white font-mono text-lg font-bold">{monitoringStats.avgRefsPerAffiliate.toFixed(1)}</p>
                              <p className="text-zinc-600 font-mono" style={{ fontSize: '9px' }}>AVG REFS / AFFILIATE</p>
                            </div>
                          </div>

                          <div className="rounded-lg border border-zinc-800/50 p-4" style={{ background: 'rgba(15, 15, 20, 0.6)' }}>
                            <h4 className="text-zinc-400 font-mono text-xs font-bold mb-3 uppercase tracking-wider">Detection Rules Active</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {[
                                { icon: <UserX className="w-3.5 h-3.5" />, label: 'Ghost Wallet Detection', desc: 'Referrals with 0 ticket purchases', color: '#ef4444' },
                                { icon: <Ticket className="w-3.5 h-3.5" />, label: 'Single-Ticket Farming', desc: 'Referrals buying only 1 ticket (minimum to validate)', color: '#f59e0b' },
                                { icon: <Timer className="w-3.5 h-3.5" />, label: 'Rapid Signup Bursts', desc: 'Multiple referrals within 5-minute windows', color: '#f97316' },
                                { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Low-Value Referrals', desc: 'Abnormally low SOL per ticket ratio', color: '#eab308' },
                                { icon: <Shield className="w-3.5 h-3.5" />, label: 'Tier Promotion Abuse', desc: 'Fake referrals to reach higher commission tiers', color: '#06b6d4' },
                                { icon: <Activity className="w-3.5 h-3.5" />, label: 'Volume-Based Scoring', desc: 'Weighted risk score combining all indicators', color: '#8b5cf6' },
                              ].map(rule => (
                                <div key={rule.label} className="flex items-start gap-2.5 p-2 rounded border border-zinc-800/30">
                                  <div className="mt-0.5 shrink-0" style={{ color: rule.color }}>{rule.icon}</div>
                                  <div>
                                    <p className="text-zinc-300 font-mono text-xs font-bold">{rule.label}</p>
                                    <p className="text-zinc-600 font-mono" style={{ fontSize: '9px' }}>{rule.desc}</p>
                                  </div>
                                  <CheckCircle className="w-3 h-3 text-emerald-500/60 shrink-0 ml-auto mt-0.5" />
                                </div>
                              ))}
                            </div>
                          </div>

                          {Object.keys(monitoringStats.tiersBreakdown).length > 0 && (
                            <div className="rounded-lg border border-zinc-800/50 p-4" style={{ background: 'rgba(15, 15, 20, 0.6)' }}>
                              <h4 className="text-zinc-400 font-mono text-xs font-bold mb-3 uppercase tracking-wider">Tier Distribution</h4>
                              <div className="flex items-center gap-3">
                                {Object.entries(monitoringStats.tiersBreakdown)
                                  .sort(([a], [b]) => Number(a) - Number(b))
                                  .map(([tier, count]) => {
                                    const t = TIER_LABELS[Number(tier)] || TIER_LABELS[1];
                                    return (
                                      <div key={tier} className="flex items-center gap-2">
                                        <div
                                          className="w-2.5 h-2.5 rounded-full"
                                          style={{ background: t.color }}
                                        />
                                        <span className="font-mono text-xs" style={{ color: t.color }}>{t.label}</span>
                                        <span className="text-zinc-500 font-mono text-xs font-bold">{count}</span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {(unclaimedRewards.length > 0 || totalExpiredSol > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {unclaimedRewards.length > 0 && (
                  <div
                    className="rounded-xl border border-amber-500/20 p-4 cursor-pointer transition-all hover:border-amber-500/40 hover:bg-amber-500/5"
                    style={{ background: 'rgba(245, 158, 11, 0.03)' }}
                    onClick={() => setShowUnclaimedModal(true)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-400 font-mono text-sm font-bold">
                        Pending: {(totalUnclaimedLamports / 1e9).toFixed(4)} SOL
                      </span>
                      {totalReleasedLamports > 0 && (
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded border border-amber-500/20 text-amber-300" style={{ fontSize: '10px', background: 'rgba(245,158,11,0.1)' }}>
                          {(totalReleasedLamports / 1e9).toFixed(4)} available
                        </span>
                      )}
                      {totalPendingReleaseLamports > 0 && (
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400" style={{ fontSize: '10px' }}>
                          {(totalPendingReleaseLamports / 1e9).toFixed(4)} accumulating
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-amber-500/50 ml-auto" />
                    </div>
                  </div>
                )}
                {totalExpiredSol > 0 && (
                  <div
                    className="rounded-xl border border-orange-500/20 p-4 cursor-pointer transition-all hover:border-orange-500/40 hover:bg-orange-500/5"
                    style={{ background: 'rgba(249, 115, 22, 0.03)' }}
                    onClick={() => setShowExpiredModal(true)}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400" />
                      <span className="text-orange-400 font-mono text-sm font-bold">
                        Expired: {totalExpiredSol.toFixed(4)} SOL
                      </span>
                      <span className="text-zinc-600 font-mono text-xs">
                        ({totalExpiredAffiliates} affiliate{totalExpiredAffiliates !== 1 ? 's' : ''} lost rewards)
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-orange-500/50 ml-auto" />
                    </div>
                  </div>
                )}
              </div>
            )}

            <ApplicationsPanel onApplicationReviewed={loadData} />

            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search wallet or code..."
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-red-500/50"
                />
              </div>
              <div className="text-zinc-600 font-mono text-xs">
                {filtered.length} affiliates
              </div>
            </div>

            <div
              className="rounded-xl border border-zinc-800/80 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(15,17,23,0.9) 0%, rgba(19,22,33,0.9) 100%)' }}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-3 px-4 text-zinc-500 font-mono text-xs font-normal">#</th>
                      <th className="text-left py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Wallet / Code</th>
                      <th className="text-center py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Tier</th>
                      <th
                        className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal cursor-pointer hover:text-zinc-300"
                        onClick={() => toggleSort('referral_count')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Referrals <SortIcon field="referral_count" />
                        </span>
                      </th>
                      <th
                        className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal cursor-pointer hover:text-zinc-300"
                        onClick={() => toggleSort('total_referral_value_sol')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Volume <SortIcon field="total_referral_value_sol" />
                        </span>
                      </th>
                      <th
                        className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal cursor-pointer hover:text-zinc-300"
                        onClick={() => toggleSort('total_earned')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Earned <SortIcon field="total_earned" />
                        </span>
                      </th>
                      <th className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Claimed</th>
                      <th className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Pending</th>
                      <th className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Expired</th>
                      <th className="text-center py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Risk</th>
                      <th className="text-center py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Network</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((aff, i) => {
                      const isFlagged = sybilWalletSet.has(aff.wallet_address);
                      const riskScore = sybilScoreMap[aff.wallet_address] || 0;
                      const riskColor = isFlagged ? getRiskColor(riskScore) : undefined;
                      return (
                        <motion.tr
                          key={aff.affiliate_id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors"
                          style={isFlagged ? { background: `${riskColor}05` } : undefined}
                        >
                          <td className="py-3 px-4">
                            <span className={`font-mono text-sm ${
                              i === 0 ? 'text-amber-400 font-bold' :
                              i === 1 ? 'text-zinc-300 font-bold' :
                              i === 2 ? 'text-orange-400 font-bold' :
                              'text-zinc-600'
                            }`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {isFlagged && (
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: riskColor }} />
                              )}
                              <div>
                                <p className="text-zinc-300 font-mono text-sm">
                                  {aff.wallet_address.slice(0, 6)}...{aff.wallet_address.slice(-4)}
                                </p>
                                <p className="text-zinc-600 font-mono text-xs">{aff.referral_code}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <TierSelector affiliate={aff} onTierChanged={handleTierChanged} />
                          </td>
                          <td className="py-3 px-4 text-right text-zinc-300 font-mono text-sm">
                            {aff.referral_count}
                          </td>
                          <td className="py-3 px-4 text-right text-amber-400 font-mono text-sm">
                            {aff.total_referral_value_sol.toFixed(4)}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-400 font-mono text-sm font-bold">
                            {aff.total_earned.toFixed(4)}
                          </td>
                          <td className="py-3 px-4 text-right text-cyan-400 font-mono text-sm">
                            {aff.total_claimed_sol.toFixed(4)}
                          </td>
                          <td className="py-3 px-4 text-right text-red-400 font-mono text-sm">
                            {aff.pending_earnings.toFixed(4)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-sm">
                            {aff.expired_rewards_sol > 0 ? (
                              <span className="text-orange-400" title={`${aff.expired_weeks} expired week${aff.expired_weeks !== 1 ? 's' : ''}`}>
                                {aff.expired_rewards_sol.toFixed(4)}
                              </span>
                            ) : (
                              <span className="text-zinc-700">--</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isFlagged ? (
                              <button
                                onClick={() => {
                                  const alert = sybilAlerts.find(a => a.wallet_address === aff.wallet_address);
                                  if (alert) setSelectedSybilAlert(alert);
                                }}
                                className="font-mono text-xs font-bold px-2 py-1 rounded transition-colors"
                                style={{
                                  color: riskColor,
                                  background: `${riskColor}15`,
                                  border: `1px solid ${riskColor}30`,
                                }}
                              >
                                {riskScore}
                              </button>
                            ) : (
                              <span className="text-zinc-700 font-mono text-xs">--</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setSelectedAffiliate(aff)}
                              className="text-zinc-500 hover:text-red-400 font-mono text-xs transition-colors px-2 py-1 rounded border border-zinc-800 hover:border-red-500/30"
                            >
                              View
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <AnimatePresence>
              {selectedAffiliate && (
                <NetworkModal
                  affiliate={selectedAffiliate}
                  onClose={() => setSelectedAffiliate(null)}
                />
              )}
              {selectedSybilAlert && (
                <SybilDetailModal
                  alert={selectedSybilAlert}
                  onClose={() => setSelectedSybilAlert(null)}
                />
              )}
              {showUnclaimedModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  onClick={() => setShowUnclaimedModal(false)}
                >
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    className="relative w-full max-w-2xl max-h-[80vh] rounded-2xl border border-amber-500/20 overflow-hidden flex flex-col"
                    style={{ background: 'linear-gradient(135deg, #0f1117 0%, #131621 100%)' }}
                  >
                    <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                          <Clock className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-mono text-sm font-bold">Pending Affiliate Rewards</h3>
                          <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                            {(totalUnclaimedLamports / 1e9).toFixed(4)} SOL across {Object.keys(
                              unclaimedRewards.reduce((acc: Record<string, boolean>, r: any) => { acc[r.affiliate_wallet] = true; return acc; }, {})
                            ).length} wallets
                          </p>
                        </div>
                      </div>
                      <button onClick={() => setShowUnclaimedModal(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="overflow-y-auto p-5 space-y-3">
                      {(() => {
                        const byWallet: Record<string, { total: number; released: number; pending: number; weeks: any[] }> = {};
                        unclaimedRewards.forEach((r: any) => {
                          const w = r.affiliate_wallet;
                          if (!byWallet[w]) byWallet[w] = { total: 0, released: 0, pending: 0, weeks: [] };
                          const lam = Number(r.pending_lamports || 0);
                          byWallet[w].total += lam;
                          if (r.is_released) byWallet[w].released += lam;
                          else byWallet[w].pending += lam;
                          byWallet[w].weeks.push(r);
                        });
                        const sorted = Object.entries(byWallet).sort((a, b) => b[1].total - a[1].total);
                        return sorted.map(([wallet, info]) => (
                          <div
                            key={wallet}
                            className="rounded-lg border border-zinc-800/60 p-4 hover:border-amber-500/20 transition-colors"
                            style={{ background: 'rgba(15, 15, 20, 0.6)' }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-zinc-300 font-mono text-xs truncate">{wallet}</span>
                                <a
                                  href={`https://solscan.io/account/${wallet}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-zinc-600 hover:text-cyan-400 transition-colors shrink-0"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                              <span className="text-amber-400 font-mono text-sm font-bold shrink-0 ml-3">
                                {(info.total / 1e9).toFixed(4)} SOL
                              </span>
                            </div>
                            {info.released > 0 && (
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="font-mono rounded px-1.5 py-0.5 text-amber-300 border border-amber-500/20" style={{ fontSize: '10px', background: 'rgba(245,158,11,0.1)' }}>
                                  {(info.released / 1e9).toFixed(4)} available to claim
                                </span>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1.5">
                              {info.weeks
                                .sort((a: any, b: any) => (a.week_number || 0) - (b.week_number || 0))
                                .map((w: any, j: number) => {
                                  const isReleased = w.is_released;
                                  return (
                                    <span
                                      key={j}
                                      className="font-mono rounded-md px-2 py-0.5 border"
                                      style={{
                                        fontSize: '10px',
                                        color: isReleased ? '#fcd34d' : '#a1a1aa',
                                        background: isReleased ? 'rgba(245, 158, 11, 0.08)' : 'rgba(63, 63, 70, 0.15)',
                                        borderColor: isReleased ? 'rgba(245, 158, 11, 0.2)' : 'rgba(63, 63, 70, 0.3)',
                                      }}
                                    >
                                      W{w.week_number || '?'}: {(Number(w.pending_lamports || 0) / 1e9).toFixed(4)}
                                      {isReleased ? ' (claim)' : ' (accum)'}
                                    </span>
                                  );
                                })}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </motion.div>
                </motion.div>
              )}
              {showExpiredModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  onClick={() => setShowExpiredModal(false)}
                >
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    className="relative w-full max-w-2xl max-h-[80vh] rounded-2xl border border-orange-500/20 overflow-hidden flex flex-col"
                    style={{ background: 'linear-gradient(135deg, #0f1117 0%, #131621 100%)' }}
                  >
                    <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(249, 115, 22, 0.15)' }}>
                          <AlertTriangle className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-mono text-sm font-bold">Expired Affiliate Rewards</h3>
                          <p className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                            {totalExpiredSol.toFixed(4)} SOL lost across {totalExpiredAffiliates} affiliates
                          </p>
                        </div>
                      </div>
                      <button onClick={() => setShowExpiredModal(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="overflow-y-auto p-5 space-y-3">
                      {affiliates
                        .filter(a => (a.expired_rewards_sol || 0) > 0)
                        .sort((a, b) => (b.expired_rewards_sol || 0) - (a.expired_rewards_sol || 0))
                        .map(aff => (
                          <div
                            key={aff.affiliate_id}
                            className="rounded-lg border border-zinc-800/60 p-4 hover:border-orange-500/20 transition-colors"
                            style={{ background: 'rgba(15, 15, 20, 0.6)' }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-zinc-300 font-mono text-xs truncate">{aff.wallet_address}</span>
                                <a
                                  href={`https://solscan.io/account/${aff.wallet_address}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-zinc-600 hover:text-cyan-400 transition-colors shrink-0"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                              <span className="text-orange-400 font-mono text-sm font-bold shrink-0 ml-3">
                                {aff.expired_rewards_sol.toFixed(4)} SOL
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className="font-mono rounded-md px-2 py-0.5 border"
                                style={{
                                  fontSize: '10px',
                                  color: '#f97316',
                                  background: 'rgba(249, 115, 22, 0.08)',
                                  borderColor: 'rgba(249, 115, 22, 0.15)',
                                }}
                              >
                                {aff.expired_weeks} expired week{aff.expired_weeks !== 1 ? 's' : ''}
                              </span>
                              <span className="text-zinc-600 font-mono" style={{ fontSize: '10px' }}>
                                {aff.referral_count} referrals | Tier {aff.manual_tier || '?'}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
}
