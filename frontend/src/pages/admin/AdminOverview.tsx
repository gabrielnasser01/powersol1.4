import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Ticket, DollarSign, Trophy, TrendingUp, Flame,
  Calendar, ChevronDown, AlertTriangle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { adminService, RevenueData, WalletActivity } from '../../services/adminService';
import { AdminLayout } from './AdminLayout';
import { AdminGuard } from './AdminGuard';
import { TreasuryGrowthChart } from '../../components/TreasuryGrowthChart';

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

export function AdminOverview() {
  const [stats, setStats] = useState<any>(null);
  const [revenue, setRevenue] = useState<RevenueData[]>([]);
  const [heatmap, setHeatmap] = useState<WalletActivity[]>([]);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    adminService.getRevenueData(period).then(setRevenue);
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, r, h] = await Promise.all([
        adminService.getPlatformStats(),
        adminService.getRevenueData(period),
        adminService.getWalletHeatmap(),
      ]);
      setStats(s);
      setRevenue(r);
      setHeatmap(h);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminGuard>
      <AdminLayout>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
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
