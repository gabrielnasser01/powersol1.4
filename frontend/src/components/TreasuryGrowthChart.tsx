import React, { useState, useMemo, useCallback } from 'react';
import { TrendingUp, ChevronDown } from 'lucide-react';
import type { WalletActivity } from '../services/adminService';

import { LOTTERY_WALLETS } from '../services/walletBalanceService';

const TREASURY_WALLETS = [
  { address: LOTTERY_WALLETS['tri-daily'], label: 'Tri-Daily Vault', color: '#3ecbff' },
  { address: LOTTERY_WALLETS['special-event'], label: 'Special Event Vault', color: '#f59e0b' },
  { address: LOTTERY_WALLETS['grand-prize'], label: 'Grand Prize Vault', color: '#ef4444' },
  { address: LOTTERY_WALLETS['jackpot'], label: 'Jackpot Vault', color: '#a855f7' },
  { address: '2GqAmrgsyvkE7Y4uMZgn9iBJatDR6xPRvRsW21x5iyEU', label: 'Delta', color: '#f97316' },
  { address: '8KWvsj1QzCzKnDEViSnza1PJhEg3CyHPVS3nLU8CG3yf', label: 'Affiliates Pool', color: '#ec4899' },
  { address: '55zv671N9QUBv9UCke6BTu1mM21dRKhvWcZDxiYLSXm1', label: 'Dev Treasury', color: '#10b981' },
];

type Period = 'daily' | 'weekly' | 'monthly';

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function aggregateByPeriod(
  data: WalletActivity[],
  period: Period
): { dates: string[]; walletData: Record<string, Record<string, number>> } {
  const walletData: Record<string, Record<string, number>> = {};
  const dateSet = new Set<string>();

  data.forEach(d => {
    let key: string;
    if (period === 'daily') key = d.date;
    else if (period === 'weekly') key = getWeekKey(d.date);
    else key = getMonthKey(d.date);

    dateSet.add(key);
    if (!walletData[d.wallet_address]) walletData[d.wallet_address] = {};
    walletData[d.wallet_address][key] = (walletData[d.wallet_address][key] || 0) + d.lamports;
  });

  const dates = [...dateSet].sort();
  return { dates, walletData };
}

function formatDateLabel(key: string, period: Period): string {
  if (period === 'daily') return key.slice(5);
  if (period === 'weekly') return key;
  const [y, m] = key.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
}

interface TooltipInfo {
  x: number;
  y: number;
  date: string;
  items: { label: string; sol: number; color: string }[];
}

export function TreasuryGrowthChart({ data }: { data: WalletActivity[] }) {
  const [period, setPeriod] = useState<Period>('daily');
  const [visibleWallets, setVisibleWallets] = useState<Set<string>>(
    () => new Set(TREASURY_WALLETS.map(w => w.address))
  );
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [viewMode, setViewMode] = useState<'cumulative' | 'perPeriod'>('cumulative');

  const toggleWallet = useCallback((address: string) => {
    setVisibleWallets(prev => {
      const next = new Set(prev);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      return next;
    });
  }, []);

  const { dates, walletData } = useMemo(() => aggregateByPeriod(data, period), [data, period]);

  const chartData = useMemo(() => {
    const activeWallets = TREASURY_WALLETS.filter(w => visibleWallets.has(w.address));

    if (viewMode === 'cumulative') {
      const cumulative: Record<string, number[]> = {};
      activeWallets.forEach(w => {
        let total = 0;
        cumulative[w.address] = dates.map(d => {
          total += (walletData[w.address]?.[d] || 0) / 1e9;
          return total;
        });
      });
      return cumulative;
    }

    const perPeriod: Record<string, number[]> = {};
    activeWallets.forEach(w => {
      perPeriod[w.address] = dates.map(d => (walletData[w.address]?.[d] || 0) / 1e9);
    });
    return perPeriod;
  }, [dates, walletData, visibleWallets, viewMode]);

  const maxValue = useMemo(() => {
    let max = 0;
    if (viewMode === 'cumulative') {
      Object.values(chartData).forEach(values => {
        values.forEach(v => { if (v > max) max = v; });
      });
    } else {
      dates.forEach((_, i) => {
        let stacked = 0;
        TREASURY_WALLETS.filter(w => visibleWallets.has(w.address)).forEach(w => {
          stacked += chartData[w.address]?.[i] || 0;
        });
        if (stacked > max) max = stacked;
      });
    }
    return max || 1;
  }, [chartData, dates, visibleWallets, viewMode]);

  const W = 900;
  const H = 340;
  const PAD_L = 60;
  const PAD_R = 20;
  const PAD_T = 20;
  const PAD_B = 50;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const xScale = useCallback((i: number) => {
    if (dates.length <= 1) return PAD_L + chartW / 2;
    return PAD_L + (i / (dates.length - 1)) * chartW;
  }, [dates.length, chartW]);

  const yScale = useCallback((v: number) => {
    return PAD_T + chartH - (v / maxValue) * chartH;
  }, [maxValue, chartH]);

  const gridLines = useMemo(() => {
    const lines: number[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      lines.push((maxValue / steps) * i);
    }
    return lines;
  }, [maxValue]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * W;
    const mouseY = ((e.clientY - rect.top) / rect.height) * H;

    if (mouseX < PAD_L || mouseX > W - PAD_R || mouseY < PAD_T || mouseY > H - PAD_B) {
      setTooltip(null);
      return;
    }

    let closestIdx = 0;
    let closestDist = Infinity;
    dates.forEach((_, i) => {
      const dist = Math.abs(xScale(i) - mouseX);
      if (dist < closestDist) { closestDist = dist; closestIdx = i; }
    });

    const activeWallets = TREASURY_WALLETS.filter(w => visibleWallets.has(w.address));
    const items = activeWallets
      .map(w => ({
        label: w.label,
        sol: chartData[w.address]?.[closestIdx] || 0,
        color: w.color,
      }))
      .filter(it => it.sol > 0)
      .sort((a, b) => b.sol - a.sol);

    setTooltip({
      x: xScale(closestIdx),
      y: mouseY,
      date: dates[closestIdx],
      items,
    });
  }, [dates, xScale, chartData, visibleWallets]);

  const activeWallets = TREASURY_WALLETS.filter(w => visibleWallets.has(w.address));

  return (
    <div
      className="rounded-xl border border-zinc-800/80 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(15,17,23,0.9) 0%, rgba(19,22,33,0.9) 100%)' }}
    >
      <div className="flex items-center justify-between p-5 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h3 className="text-white font-mono text-sm font-bold">Treasury Wallets Growth</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-800/80 rounded-lg p-0.5">
            {(['cumulative', 'perPeriod'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-md font-mono text-xs transition-all ${
                  viewMode === mode
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {mode === 'cumulative' ? 'Cumulative' : 'Per Period'}
              </button>
            ))}
          </div>
          <div className="relative">
            <select
              value={period}
              onChange={e => setPeriod(e.target.value as Period)}
              className="appearance-none bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-xs rounded-lg px-3 py-1.5 pr-7 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="p-5">
        {dates.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-zinc-600 font-mono text-sm">
            No treasury data yet
          </div>
        ) : (
          <>
            <div className="relative">
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full"
                style={{ maxHeight: 380 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setTooltip(null)}
              >
                {gridLines.map((val, i) => (
                  <g key={i}>
                    <line
                      x1={PAD_L}
                      y1={yScale(val)}
                      x2={W - PAD_R}
                      y2={yScale(val)}
                      stroke="rgba(63,63,70,0.3)"
                      strokeDasharray={i === 0 ? undefined : '4 4'}
                    />
                    <text
                      x={PAD_L - 8}
                      y={yScale(val) + 4}
                      textAnchor="end"
                      fill="#71717a"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {val < 0.01 ? val.toFixed(4) : val < 1 ? val.toFixed(3) : val.toFixed(2)}
                    </text>
                  </g>
                ))}

                {dates.map((d, i) => {
                  const showLabel = dates.length <= 15 || i % Math.ceil(dates.length / 12) === 0;
                  if (!showLabel) return null;
                  return (
                    <text
                      key={d}
                      x={xScale(i)}
                      y={H - PAD_B + 20}
                      textAnchor="middle"
                      fill="#71717a"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {formatDateLabel(d, period)}
                    </text>
                  );
                })}

                {viewMode === 'cumulative' ? (
                  activeWallets.map(w => {
                    const values = chartData[w.address];
                    if (!values || values.length === 0) return null;

                    const areaPath = `M${xScale(0)},${yScale(0)} ` +
                      values.map((v, i) => `L${xScale(i)},${yScale(v)}`).join(' ') +
                      ` L${xScale(values.length - 1)},${yScale(0)} Z`;

                    const linePath = values
                      .map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(v)}`)
                      .join(' ');

                    return (
                      <g key={w.address}>
                        <defs>
                          <linearGradient id={`grad-${w.address.slice(0, 6)}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={w.color} stopOpacity="0.2" />
                            <stop offset="100%" stopColor={w.color} stopOpacity="0.01" />
                          </linearGradient>
                        </defs>
                        <path d={areaPath} fill={`url(#grad-${w.address.slice(0, 6)})`} />
                        <path d={linePath} fill="none" stroke={w.color} strokeWidth="2" strokeLinejoin="round" />
                        {values.length <= 30 && values.map((v, i) => (
                          <circle
                            key={i}
                            cx={xScale(i)}
                            cy={yScale(v)}
                            r="3"
                            fill={w.color}
                            opacity="0.7"
                          />
                        ))}
                      </g>
                    );
                  })
                ) : (
                  dates.map((_, i) => {
                    const barWidth = Math.max(4, (chartW / dates.length) * 0.6);
                    let yOffset = yScale(0);

                    return (
                      <g key={i}>
                        {activeWallets.map(w => {
                          const val = chartData[w.address]?.[i] || 0;
                          if (val <= 0) return null;
                          const barH = (val / maxValue) * chartH;
                          const barY = yOffset - barH;
                          yOffset = barY;
                          return (
                            <rect
                              key={w.address}
                              x={xScale(i) - barWidth / 2}
                              y={barY}
                              width={barWidth}
                              height={barH}
                              rx="2"
                              fill={w.color}
                              opacity="0.85"
                            />
                          );
                        })}
                      </g>
                    );
                  })
                )}

                {tooltip && (
                  <line
                    x1={tooltip.x}
                    y1={PAD_T}
                    x2={tooltip.x}
                    y2={H - PAD_B}
                    stroke="rgba(255,255,255,0.15)"
                    strokeDasharray="4 4"
                  />
                )}

                <text
                  x={PAD_L - 8}
                  y={12}
                  textAnchor="end"
                  fill="#52525b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  SOL
                </text>
              </svg>

              {tooltip && tooltip.items.length > 0 && (
                <div
                  className="absolute pointer-events-none z-20"
                  style={{
                    left: `${(tooltip.x / W) * 100}%`,
                    top: `${(tooltip.y / H) * 100}%`,
                    transform: tooltip.x > W * 0.65 ? 'translate(-105%, -50%)' : 'translate(10px, -50%)',
                  }}
                >
                  <div
                    className="rounded-lg border border-zinc-700/80 px-3 py-2 shadow-xl"
                    style={{ background: 'rgba(15,17,23,0.95)', backdropFilter: 'blur(8px)' }}
                  >
                    <p className="text-zinc-400 font-mono text-xs mb-1.5 border-b border-zinc-800 pb-1">
                      {formatDateLabel(tooltip.date, period)}
                    </p>
                    {tooltip.items.map(it => (
                      <div key={it.label} className="flex items-center justify-between gap-4 py-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: it.color }} />
                          <span className="text-zinc-400 font-mono" style={{ fontSize: 10 }}>{it.label}</span>
                        </div>
                        <span className="text-white font-mono font-bold" style={{ fontSize: 10 }}>
                          {it.sol < 0.001 ? it.sol.toFixed(6) : it.sol < 1 ? it.sol.toFixed(4) : it.sol.toFixed(2)} SOL
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-zinc-800/50">
              {TREASURY_WALLETS.map(w => {
                const active = visibleWallets.has(w.address);
                return (
                  <button
                    key={w.address}
                    onClick={() => toggleWallet(w.address)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-xs transition-all border ${
                      active
                        ? 'border-zinc-700 text-zinc-300'
                        : 'border-zinc-800/50 text-zinc-600 opacity-50'
                    }`}
                    style={active ? { background: `${w.color}10` } : undefined}
                    title={w.address}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full transition-opacity"
                      style={{ background: active ? w.color : '#52525b' }}
                    />
                    {w.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
