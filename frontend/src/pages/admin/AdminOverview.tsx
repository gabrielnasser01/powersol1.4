import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Ticket, DollarSign, Trophy, TrendingUp, Flame,
  Calendar, ChevronDown, AlertTriangle, ArrowUpRight, ArrowDownRight,
  BarChart3, Download, Loader,
} from 'lucide-react';
import { adminService, RevenueData, WalletActivity } from '../../services/adminService';
import { AdminLayout } from './AdminLayout';
import { AdminGuard } from './AdminGuard';
import { TreasuryGrowthChart } from '../../components/TreasuryGrowthChart';
import { solPriceService } from '../../services/solPriceService';
import { useAdminAutoRefresh } from '../../hooks/useAdminAutoRefresh';
import { pdfReportService } from '../../services/pdfReportService';

function StatCard({ label, value, subValue, icon: Icon, color, trend }: {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800/80 p-5"
      style={{ background: 'linear-gradient(135deg, rgba(15,17,23,0.9) 0%, rgba(19,22,33,0.9) 100%)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-mono ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-zinc-500 font-mono text-xs mb-1">{label}</p>
      <p className="text-white font-mono text-xl font-bold">{value}</p>
      {subValue && <p className="text-zinc-600 font-mono text-xs mt-1">{subValue}</p>}
    </motion.div>
  );
}

function RevenueTable({ data, period }: { data: RevenueData[]; period: string }) {
  const recentData = useMemo(() => [...data].reverse().slice(0, 30), [data]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Period</th>
            <th className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Tickets</th>
            <th className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Revenue (SOL)</th>
            <th className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Dev Treasury (SOL)</th>
            <th className="text-right py-3 px-4 text-zinc-500 font-mono text-xs font-normal">Delta (SOL)</th>
          </tr>
        </thead>
        <tbody>
          {recentData.map((row, i) => (
            <motion.tr
              key={row.date}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors"
            >
              <td className="py-3 px-4 text-zinc-300 font-mono text-sm">{row.date}</td>
              <td className="py-3 px-4 text-zinc-400 font-mono text-sm text-right">{row.ticket_count}</td>
              <td className="py-3 px-4 text-emerald-400 font-mono text-sm text-right">
                {(row.ticket_revenue_lamports / 1e9).toFixed(4)}
              </td>
              <td className="py-3 px-4 text-amber-400 font-mono text-sm text-right">
                {(row.dev_treasury_lamports / 1e9).toFixed(4)}
              </td>
              <td className="py-3 px-4 text-cyan-400 font-mono text-sm text-right">
                {(row.delta_lamports / 1e9).toFixed(4)}
              </td>
            </motion.tr>
          ))}
          {recentData.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-zinc-600 font-mono text-sm">
                No data available
              </td>
            </tr>
          )}
        </tbody>
        {recentData.length > 0 && (
          <tfoot>
            <tr className="border-t border-zinc-700">
              <td className="py-3 px-4 text-zinc-300 font-mono text-sm font-bold">Total</td>
              <td className="py-3 px-4 text-zinc-300 font-mono text-sm text-right font-bold">
                {recentData.reduce((s, r) => s + r.ticket_count, 0)}
              </td>
              <td className="py-3 px-4 text-emerald-400 font-mono text-sm text-right font-bold">
                {(recentData.reduce((s, r) => s + r.ticket_revenue_lamports, 0) / 1e9).toFixed(4)}
              </td>
              <td className="py-3 px-4 text-amber-400 font-mono text-sm text-right font-bold">
                {(recentData.reduce((s, r) => s + r.dev_treasury_lamports, 0) / 1e9).toFixed(4)}
              </td>
              <td className="py-3 px-4 text-cyan-400 font-mono text-sm text-right font-bold">
                {(recentData.reduce((s, r) => s + r.delta_lamports, 0) / 1e9).toFixed(4)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

interface MonthlyVolume {
  month: string;
  label: string;
  ticketCount: number;
  revenueSol: number;
  devTreasurySol: number;
  deltaSol: number;
}

function MonthlyVolumeSection({ data, solPrice }: { data: MonthlyVolume[]; solPrice: number }) {
  const recent = useMemo(() => [...data].reverse().slice(0, 12), [data]);
  const currentMonth = recent[0];
  const prevMonth = recent[1];

  const monthOverMonthChange = useMemo(() => {
    if (!currentMonth || !prevMonth || prevMonth.revenueSol === 0) return undefined;
    return ((currentMonth.revenueSol - prevMonth.revenueSol) / prevMonth.revenueSol) * 100;
  }, [currentMonth, prevMonth]);

  const maxRevenue = useMemo(
    () => Math.max(...recent.map(m => m.revenueSol), 0.0001),
    [recent]
  );

  const formatUsd = (sol: number) => {
    const usd = sol * solPrice;
    if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}k`;
    return `$${usd.toFixed(2)}`;
  };

  return (
    <div
      className="rounded-xl border border-zinc-800/80 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(15,17,23,0.9) 0%, rgba(19,22,33,0.9) 100%)' }}
    >
      <div className="flex items-center justify-between p-5 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          <h3 className="text-white font-mono text-sm font-bold">Monthly Volume</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-zinc-500 font-mono text-xs">
            SOL/USD: <span className="text-emerald-400">${solPrice.toFixed(2)}</span>
          </span>
          {monthOverMonthChange !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-mono ${monthOverMonthChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {monthOverMonthChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(monthOverMonthChange).toFixed(1)}% MoM
            </div>
          )}
        </div>
      </div>

      {currentMonth && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800/30">
          <div className="p-4" style={{ background: 'rgba(15,17,23,0.6)' }}>
            <p className="text-zinc-500 font-mono text-xs mb-1">This Month Tickets</p>
            <p className="text-white font-mono text-lg font-bold">{currentMonth.ticketCount.toLocaleString()}</p>
          </div>
          <div className="p-4" style={{ background: 'rgba(15,17,23,0.6)' }}>
            <p className="text-zinc-500 font-mono text-xs mb-1">This Month Revenue</p>
            <p className="text-emerald-400 font-mono text-lg font-bold">{currentMonth.revenueSol.toFixed(4)} SOL</p>
            <p className="text-zinc-600 font-mono text-xs">{formatUsd(currentMonth.revenueSol)}</p>
          </div>
          <div className="p-4" style={{ background: 'rgba(15,17,23,0.6)' }}>
            <p className="text-zinc-500 font-mono text-xs mb-1">This Month Dev Treasury</p>
            <p className="text-amber-400 font-mono text-lg font-bold">{currentMonth.devTreasurySol.toFixed(4)} SOL</p>
            <p className="text-zinc-600 font-mono text-xs">{formatUsd(currentMonth.devTreasurySol)}</p>
          </div>
          <div className="p-4" style={{ background: 'rgba(15,17,23,0.6)' }}>
            <p className="text-zinc-500 font-mono text-xs mb-1">This Month Delta</p>
            <p className="text-cyan-400 font-mono text-lg font-bold">{currentMonth.deltaSol.toFixed(4)} SOL</p>
            <p className="text-zinc-600 font-mono text-xs">{formatUsd(currentMonth.deltaSol)}</p>
          </div>
        </div>
      )}

      <div className="p-5">
        <div className="space-y-3">
          {recent.map((month, i) => {
            const barWidth = (month.revenueSol / maxRevenue) * 100;
            return (
              <motion.div
                key={month.month}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-zinc-400 font-mono text-xs w-20">{month.label}</span>
                  <div className="flex items-center gap-4 text-right">
                    <span className="text-zinc-500 font-mono text-xs w-14">{month.ticketCount} tix</span>
                    <span className="text-emerald-400 font-mono text-xs w-28">{month.revenueSol.toFixed(4)} SOL</span>
                    <span className="text-zinc-500 font-mono text-xs w-20">{formatUsd(month.revenueSol)}</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-zinc-800/60 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.6, delay: i * 0.04 }}
                    className="h-full rounded-full"
                    style={{
                      background: i === 0
                        ? 'linear-gradient(90deg, #10b981, #34d399)'
                        : 'linear-gradient(90deg, #3f3f46, #52525b)',
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {recent.length > 0 && (
          <div className="mt-5 pt-4 border-t border-zinc-800/50">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-mono text-xs font-bold">All-Time Total</span>
              <div className="flex items-center gap-4 text-right">
                <span className="text-zinc-400 font-mono text-xs font-bold w-14">
                  {recent.reduce((s, m) => s + m.ticketCount, 0)} tix
                </span>
                <span className="text-emerald-400 font-mono text-xs font-bold w-28">
                  {recent.reduce((s, m) => s + m.revenueSol, 0).toFixed(4)} SOL
                </span>
                <span className="text-zinc-400 font-mono text-xs font-bold w-20">
                  {formatUsd(recent.reduce((s, m) => s + m.revenueSol, 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminOverview() {
  const [stats, setStats] = useState<any>(null);
  const [revenue, setRevenue] = useState<RevenueData[]>([]);
  const [heatmap, setHeatmap] = useState<WalletActivity[]>([]);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);
  const [solPrice, setSolPrice] = useState(solPriceService.getPrice());

  const [monthlyRevenue, setMonthlyRevenue] = useState<RevenueData[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const periodRef = React.useRef(period);
  periodRef.current = period;

  const loadData = useCallback(async () => {
    try {
      const [s, r, h, m] = await Promise.all([
        adminService.getPlatformStats(),
        adminService.getRevenueData(periodRef.current),
        adminService.getWalletHeatmap(),
        adminService.getRevenueData('monthly'),
      ]);
      setStats(s);
      setRevenue(r);
      setHeatmap(h);
      setMonthlyRevenue(m);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const { lastRefresh } = useAdminAutoRefresh(loadData);

  useEffect(() => {
    loadData();
    solPriceService.fetchPrice();
    return solPriceService.subscribe((price) => setSolPrice(price));
  }, [loadData]);

  useEffect(() => {
    adminService.getRevenueData(period).then(setRevenue);
  }, [period]);

  const handleDownloadReport = async () => {
    setGeneratingPdf(true);
    try {
      await pdfReportService.generateReport();
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const monthlyVolume: MonthlyVolume[] = useMemo(() => {
    return monthlyRevenue.map(row => {
      const [year, monthStr] = row.date.split('-');
      const monthIdx = parseInt(monthStr, 10) - 1;
      return {
        month: row.date,
        label: `${MONTH_NAMES[monthIdx]} ${year}`,
        ticketCount: row.ticket_count,
        revenueSol: row.ticket_revenue_lamports / 1e9,
        devTreasurySol: row.dev_treasury_lamports / 1e9,
        deltaSol: row.delta_lamports / 1e9,
      };
    });
  }, [monthlyRevenue]);

  return (
    <AdminGuard>
      <AdminLayout>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between mb--4">
              <button
                onClick={handleDownloadReport}
                disabled={generatingPdf}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono text-sm border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
              >
                {generatingPdf ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download Monthly Report
                  </>
                )}
              </button>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-zinc-600 font-mono text-xs">
                  LIVE {lastRefresh.toLocaleTimeString()}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Total Users"
                value={stats?.totalUsers?.toLocaleString() || '0'}
                icon={Users}
                color="#3ecbff"
              />
              <StatCard
                label="Total Tickets"
                value={stats?.totalTickets?.toLocaleString() || '0'}
                icon={Ticket}
                color="#10b981"
              />
              <StatCard
                label="Revenue (SOL)"
                value={stats?.totalRevenueSol?.toFixed(2) || '0'}
                icon={DollarSign}
                color="#f59e0b"
              />
              <StatCard
                label="Total Draws"
                value={stats?.totalDraws?.toLocaleString() || '0'}
                icon={Trophy}
                color="#ef4444"
              />
              <StatCard
                label="Prizes (SOL)"
                value={(stats?.totalPrizesLamports / 1e9)?.toFixed(4) || '0'}
                subValue={`${((stats?.unclaimedPrizesLamports || 0) / 1e9).toFixed(4)} unclaimed`}
                icon={TrendingUp}
                color="#8b5cf6"
              />
              <StatCard
                label="Affiliates"
                value={stats?.totalAffiliates?.toLocaleString() || '0'}
                icon={Users}
                color="#ec4899"
              />
              <StatCard
                label="Dev Treasury (SOL)"
                value={((stats?.totalDevTreasuryLamports || 0) / 1e9).toFixed(4)}
                icon={TrendingUp}
                color="#f59e0b"
              />
              <StatCard
                label="Delta Pool (SOL)"
                value={((stats?.totalDeltaLamports || 0) / 1e9).toFixed(4)}
                icon={Flame}
                color="#f97316"
              />
              <StatCard
                label="Unclaimed Prizes"
                value={((stats?.unclaimedPrizesLamports || 0) / 1e9).toFixed(4)}
                subValue="SOL"
                icon={AlertTriangle}
                color="#eab308"
              />
            </div>

            <MonthlyVolumeSection data={monthlyVolume} solPrice={solPrice} />

            <div
              className="rounded-xl border border-zinc-800/80 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(15,17,23,0.9) 0%, rgba(19,22,33,0.9) 100%)' }}
            >
              <div className="flex items-center justify-between p-5 border-b border-zinc-800/50">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  <h3 className="text-white font-mono text-sm font-bold">Revenue Table</h3>
                </div>
                <div className="relative">
                  <select
                    value={period}
                    onChange={e => setPeriod(e.target.value as any)}
                    className="appearance-none bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-xs rounded-lg px-3 py-1.5 pr-7 focus:outline-none focus:border-red-500/50"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <RevenueTable data={revenue} period={period} />
            </div>

            <TreasuryGrowthChart data={heatmap} />
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
}
