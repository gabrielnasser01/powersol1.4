import jsPDF from 'jspdf';
import { adminService, UserRanking, AffiliateRanking, RevenueData, ComplianceStats, SybilAlert, WhaleAnalysis } from './adminService';
import { solPriceService } from './solPriceService';

const COLORS = {
  bg: [10, 11, 15] as [number, number, number],
  card: [15, 17, 23] as [number, number, number],
  text: [255, 255, 255] as [number, number, number],
  muted: [161, 161, 170] as [number, number, number],
  dim: [113, 113, 122] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  green: [16, 185, 129] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  cyan: [62, 203, 255] as [number, number, number],
  border: [39, 39, 42] as [number, number, number],
};

interface ReportData {
  stats: any;
  users: UserRanking[];
  affiliates: AffiliateRanking[];
  revenue: RevenueData[];
  monthlyRevenue: RevenueData[];
  compliance: ComplianceStats;
  sybilAlerts: SybilAlert[];
  whaleAnalysis: WhaleAnalysis;
  solPrice: number;
  generatedAt: string;
}

function shortWallet(w: string): string {
  return `${w.slice(0, 6)}...${w.slice(-4)}`;
}

class PDFReportService {
  private doc!: jsPDF;
  private y = 0;
  private pageWidth = 0;
  private pageHeight = 0;
  private margin = 20;

  async generateReport(): Promise<void> {
    const [stats, users, affiliates, revenue, monthlyRevenue, compliance, sybilAlerts, whaleAnalysis] = await Promise.all([
      adminService.getPlatformStats(),
      adminService.getAllUsers(),
      adminService.getAffiliateRankings(),
      adminService.getRevenueData('daily'),
      adminService.getRevenueData('monthly'),
      adminService.getComplianceStats(),
      adminService.getSybilAnalysis(),
      adminService.getWhaleAnalysis(),
    ]);

    const data: ReportData = {
      stats,
      users,
      affiliates,
      revenue,
      monthlyRevenue,
      compliance,
      sybilAlerts,
      whaleAnalysis,
      solPrice: solPriceService.getPrice(),
      generatedAt: new Date().toISOString(),
    };

    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();

    this.renderCoverPage(data);
    this.addPage();
    this.renderOverviewSection(data);
    this.addPage();
    this.renderRevenueSection(data);
    this.addPage();
    this.renderUsersSection(data);
    this.addPage();
    this.renderAffiliatesSection(data);
    this.addPage();
    this.renderComplianceSection(data);

    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    this.doc.save(`PowerSOL_Admin_Report_${month.replace(' ', '_')}.pdf`);
  }

  private addPage() {
    this.doc.addPage();
    this.y = this.margin;
  }

  private checkPageBreak(needed: number) {
    if (this.y + needed > this.pageHeight - this.margin) {
      this.addPage();
    }
  }

  private setColor(color: [number, number, number]) {
    this.doc.setTextColor(color[0], color[1], color[2]);
  }

  private drawRect(x: number, y: number, w: number, h: number, color: [number, number, number]) {
    this.doc.setFillColor(color[0], color[1], color[2]);
    this.doc.rect(x, y, w, h, 'F');
  }

  private drawLine(x1: number, y1: number, x2: number, y2: number, color: [number, number, number]) {
    this.doc.setDrawColor(color[0], color[1], color[2]);
    this.doc.setLineWidth(0.3);
    this.doc.line(x1, y1, x2, y2);
  }

  private renderCoverPage(data: ReportData) {
    this.drawRect(0, 0, this.pageWidth, this.pageHeight, COLORS.bg);

    this.drawRect(0, 0, this.pageWidth, 3, COLORS.red);

    this.y = 70;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(32);
    this.setColor(COLORS.text);
    this.doc.text('POWERSOL', this.pageWidth / 2, this.y, { align: 'center' });

    this.y += 14;
    this.doc.setFontSize(14);
    this.setColor(COLORS.muted);
    this.doc.text('Admin Panel Monthly Report', this.pageWidth / 2, this.y, { align: 'center' });

    this.y += 30;
    this.drawLine(this.margin + 30, this.y, this.pageWidth - this.margin - 30, this.y, COLORS.border);

    this.y += 15;
    this.doc.setFontSize(18);
    this.setColor(COLORS.cyan);
    const reportDate = new Date();
    this.doc.text(
      reportDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      this.pageWidth / 2, this.y, { align: 'center' }
    );

    this.y += 30;
    this.doc.setFontSize(10);
    this.setColor(COLORS.dim);

    const coverStats = [
      ['Total Users', data.stats?.totalUsers?.toLocaleString() || '0'],
      ['Total Tickets', data.stats?.totalTickets?.toLocaleString() || '0'],
      ['Revenue', `${data.stats?.totalRevenueSol?.toFixed(4) || '0'} SOL`],
      ['Affiliates', data.stats?.totalAffiliates?.toLocaleString() || '0'],
      ['SOL/USD', `$${data.solPrice.toFixed(2)}`],
    ];

    for (const [label, value] of coverStats) {
      this.doc.setFont('helvetica', 'normal');
      this.setColor(COLORS.dim);
      this.doc.text(label, this.pageWidth / 2 - 30, this.y, { align: 'right' });
      this.doc.setFont('helvetica', 'bold');
      this.setColor(COLORS.text);
      this.doc.text(value, this.pageWidth / 2 + 5, this.y);
      this.y += 8;
    }

    this.y = this.pageHeight - 30;
    this.doc.setFontSize(8);
    this.setColor(COLORS.dim);
    this.doc.text(
      `Generated: ${new Date(data.generatedAt).toLocaleString()}`,
      this.pageWidth / 2, this.y, { align: 'center' }
    );
    this.y += 5;
    this.doc.text('CONFIDENTIAL - For authorized admin use only', this.pageWidth / 2, this.y, { align: 'center' });
  }

  private renderSectionTitle(title: string, color: [number, number, number]) {
    this.checkPageBreak(20);
    this.drawRect(0, this.y - 2, this.pageWidth, 12, COLORS.card);
    this.drawRect(this.margin, this.y, 3, 8, color);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.setColor(COLORS.text);
    this.doc.text(title, this.margin + 8, this.y + 6);
    this.y += 18;
  }

  private renderStatRow(label: string, value: string, valueColor: [number, number, number] = COLORS.text) {
    this.checkPageBreak(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.setColor(COLORS.muted);
    this.doc.text(label, this.margin + 4, this.y);
    this.doc.setFont('helvetica', 'bold');
    this.setColor(valueColor);
    this.doc.text(value, this.pageWidth - this.margin - 4, this.y, { align: 'right' });
    this.y += 6;
  }

  private renderOverviewSection(data: ReportData) {
    this.drawRect(0, 0, this.pageWidth, this.pageHeight, COLORS.bg);
    this.renderSectionTitle('1. Platform Overview', COLORS.cyan);

    this.renderStatRow('Total Registered Users', data.stats?.totalUsers?.toLocaleString() || '0');
    this.renderStatRow('Total Tickets Sold', data.stats?.totalTickets?.toLocaleString() || '0');
    this.renderStatRow('Total Revenue', `${data.stats?.totalRevenueSol?.toFixed(4) || '0'} SOL`, COLORS.green);
    this.renderStatRow('Revenue (USD)', `$${((data.stats?.totalRevenueSol || 0) * data.solPrice).toFixed(2)}`, COLORS.green);
    this.renderStatRow('Total Draws', data.stats?.totalDraws?.toLocaleString() || '0');
    this.renderStatRow('Total Prizes Distributed', `${((data.stats?.totalPrizesLamports || 0) / 1e9).toFixed(4)} SOL`, COLORS.amber);
    this.renderStatRow('Unclaimed Prizes', `${((data.stats?.unclaimedPrizesLamports || 0) / 1e9).toFixed(4)} SOL`, COLORS.amber);
    this.renderStatRow('Total Affiliates', data.stats?.totalAffiliates?.toLocaleString() || '0');
    this.renderStatRow('Dev Treasury', `${((data.stats?.totalDevTreasuryLamports || 0) / 1e9).toFixed(4)} SOL`, COLORS.cyan);
    this.renderStatRow('Delta Pool', `${((data.stats?.totalDeltaLamports || 0) / 1e9).toFixed(4)} SOL`, COLORS.cyan);
    this.renderStatRow('SOL/USD Price', `$${data.solPrice.toFixed(2)}`);

    this.y += 8;
    this.renderSectionTitle('Power Points Summary', COLORS.amber);

    const topByPoints = [...data.users].sort((a, b) => b.power_points - a.power_points).slice(0, 10);
    const totalPoints = data.users.reduce((s, u) => s + u.power_points, 0);
    const avgPoints = data.users.length > 0 ? Math.round(totalPoints / data.users.length) : 0;
    const usersWithMissions = data.users.filter(u => u.missions_completed > 0).length;

    this.renderStatRow('Total Power Points in Circulation', totalPoints.toLocaleString());
    this.renderStatRow('Average Power Points per User', avgPoints.toLocaleString());
    this.renderStatRow('Users with Completed Missions', usersWithMissions.toLocaleString());

    this.y += 4;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.setColor(COLORS.muted);
    this.doc.text('Top 10 Users by Power Points:', this.margin + 4, this.y);
    this.y += 6;

    for (const user of topByPoints) {
      this.checkPageBreak(6);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.setColor(COLORS.dim);
      this.doc.text(shortWallet(user.wallet_address), this.margin + 6, this.y);
      this.doc.setFont('helvetica', 'bold');
      this.setColor(COLORS.amber);
      this.doc.text(`${user.power_points.toLocaleString()} PP`, this.pageWidth / 2, this.y);
      this.setColor(COLORS.green);
      this.doc.text(`${user.missions_completed} missions`, this.pageWidth - this.margin - 4, this.y, { align: 'right' });
      this.y += 5;
    }
  }

  private renderRevenueSection(data: ReportData) {
    this.drawRect(0, 0, this.pageWidth, this.pageHeight, COLORS.bg);
    this.renderSectionTitle('2. Revenue & Financial Data', COLORS.green);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.setColor(COLORS.muted);
    this.doc.text('Monthly Revenue Breakdown:', this.margin + 4, this.y);
    this.y += 8;

    const headers = ['Month', 'Tickets', 'Revenue (SOL)', 'Dev Treasury', 'Delta'];
    const colWidths = [30, 25, 40, 40, 35];
    let x = this.margin + 4;

    this.drawRect(this.margin, this.y - 4, this.pageWidth - this.margin * 2, 8, [20, 22, 30]);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.setColor(COLORS.muted);
    for (let i = 0; i < headers.length; i++) {
      this.doc.text(headers[i], x, this.y);
      x += colWidths[i];
    }
    this.y += 8;

    const monthlyData = [...data.monthlyRevenue].reverse().slice(0, 12);
    for (const row of monthlyData) {
      this.checkPageBreak(6);
      x = this.margin + 4;
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7);

      this.setColor(COLORS.dim);
      this.doc.text(row.date, x, this.y);
      x += colWidths[0];

      this.setColor(COLORS.text);
      this.doc.text(row.ticket_count.toString(), x, this.y);
      x += colWidths[1];

      this.setColor(COLORS.green);
      this.doc.text((row.ticket_revenue_lamports / 1e9).toFixed(4), x, this.y);
      x += colWidths[2];

      this.setColor(COLORS.amber);
      this.doc.text((row.dev_treasury_lamports / 1e9).toFixed(4), x, this.y);
      x += colWidths[3];

      this.setColor(COLORS.cyan);
      this.doc.text((row.delta_lamports / 1e9).toFixed(4), x, this.y);
      this.y += 5;
    }

    this.y += 4;
    this.drawLine(this.margin, this.y, this.pageWidth - this.margin, this.y, COLORS.border);
    this.y += 4;

    const totalTickets = monthlyData.reduce((s, r) => s + r.ticket_count, 0);
    const totalRevSol = monthlyData.reduce((s, r) => s + r.ticket_revenue_lamports, 0) / 1e9;
    const totalDevSol = monthlyData.reduce((s, r) => s + r.dev_treasury_lamports, 0) / 1e9;
    const totalDeltaSol = monthlyData.reduce((s, r) => s + r.delta_lamports, 0) / 1e9;

    this.renderStatRow('Total Tickets (shown months)', totalTickets.toLocaleString());
    this.renderStatRow('Total Revenue (shown months)', `${totalRevSol.toFixed(4)} SOL`, COLORS.green);
    this.renderStatRow('Total Dev Treasury (shown months)', `${totalDevSol.toFixed(4)} SOL`, COLORS.amber);
    this.renderStatRow('Total Delta (shown months)', `${totalDeltaSol.toFixed(4)} SOL`, COLORS.cyan);

    this.y += 8;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.setColor(COLORS.muted);
    this.doc.text('Recent Daily Revenue (Last 15 Days):', this.margin + 4, this.y);
    this.y += 8;

    const recentDaily = [...data.revenue].reverse().slice(0, 15);
    for (const row of recentDaily) {
      this.checkPageBreak(5);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7);
      this.setColor(COLORS.dim);
      this.doc.text(row.date, this.margin + 6, this.y);
      this.setColor(COLORS.text);
      this.doc.text(`${row.ticket_count} tix`, this.margin + 40, this.y);
      this.setColor(COLORS.green);
      this.doc.text(`${(row.ticket_revenue_lamports / 1e9).toFixed(4)} SOL`, this.pageWidth - this.margin - 4, this.y, { align: 'right' });
      this.y += 5;
    }
  }

  private renderUsersSection(data: ReportData) {
    this.drawRect(0, 0, this.pageWidth, this.pageHeight, COLORS.bg);
    this.renderSectionTitle('3. Users & Tickets', COLORS.cyan);

    const totalUsers = data.users.length;
    const activeUsers = data.users.filter(u => u.last_login_date).length;
    const bannedUsers = data.users.filter(u => u.is_banned).length;
    const withWarnings = data.users.filter(u => u.warning_count > 0).length;
    const totalSpent = data.users.reduce((s, u) => s + u.total_spent_sol, 0);
    const totalWon = data.users.reduce((s, u) => s + u.total_won_lamports, 0) / 1e9;
    const totalTickets = data.users.reduce((s, u) => s + u.total_tickets, 0);

    this.renderStatRow('Total Users', totalUsers.toLocaleString());
    this.renderStatRow('Active Users (logged in)', activeUsers.toLocaleString());
    this.renderStatRow('Banned Users', bannedUsers.toLocaleString(), COLORS.red);
    this.renderStatRow('Users with Warnings', withWarnings.toLocaleString(), COLORS.amber);
    this.renderStatRow('Total Tickets Purchased', totalTickets.toLocaleString());
    this.renderStatRow('Total SOL Spent', `${totalSpent.toFixed(4)} SOL`, COLORS.amber);
    this.renderStatRow('Total SOL Won', `${totalWon.toFixed(4)} SOL`, COLORS.green);
    this.renderStatRow('House Edge', `${totalSpent > 0 ? ((totalSpent - totalWon) / totalSpent * 100).toFixed(2) : '0'}%`);

    this.y += 8;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.setColor(COLORS.muted);
    this.doc.text('Top 15 Users by SOL Spent:', this.margin + 4, this.y);
    this.y += 8;

    const topSpenders = [...data.users].sort((a, b) => b.total_spent_sol - a.total_spent_sol).slice(0, 15);
    for (const user of topSpenders) {
      this.checkPageBreak(5);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7);
      this.setColor(COLORS.dim);
      this.doc.text(shortWallet(user.wallet_address), this.margin + 6, this.y);
      this.setColor(COLORS.text);
      this.doc.text(`${user.total_tickets} tix`, this.margin + 45, this.y);
      this.setColor(COLORS.amber);
      this.doc.text(`${user.total_spent_sol.toFixed(4)} SOL spent`, this.margin + 70, this.y);
      this.setColor(COLORS.green);
      this.doc.text(`${(user.total_won_lamports / 1e9).toFixed(4)} SOL won`, this.pageWidth - this.margin - 4, this.y, { align: 'right' });
      this.y += 5;
    }

    this.y += 8;
    this.renderSectionTitle('Whale / Pool Manipulation Analysis', COLORS.red);

    const whaleUsers = data.whaleAnalysis.users;
    const criticalWhales = whaleUsers.filter(u => u.whale_score >= 70);
    const highWhales = whaleUsers.filter(u => u.whale_score >= 40 && u.whale_score < 70);

    this.renderStatRow('Total Wallets Analyzed', whaleUsers.length.toLocaleString());
    this.renderStatRow('Critical Risk (Score 70+)', criticalWhales.length.toLocaleString(), COLORS.red);
    this.renderStatRow('High Risk (Score 40-69)', highWhales.length.toLocaleString(), COLORS.amber);

    if (whaleUsers.length > 0) {
      this.y += 4;
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8);
      this.setColor(COLORS.muted);
      this.doc.text('Whale Risk Details:', this.margin + 4, this.y);
      this.y += 6;

      for (const whale of whaleUsers.slice(0, 10)) {
        this.checkPageBreak(5);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(7);
        this.setColor(COLORS.dim);
        this.doc.text(shortWallet(whale.wallet_address), this.margin + 6, this.y);

        const scoreColor = whale.whale_score >= 70 ? COLORS.red : whale.whale_score >= 40 ? COLORS.amber : COLORS.dim;
        this.setColor(scoreColor);
        this.doc.text(`Score: ${whale.whale_score}`, this.margin + 45, this.y);
        this.setColor(COLORS.text);
        this.doc.text(`${whale.total_current_tickets} tix`, this.margin + 75, this.y);
        this.doc.text(`${whale.overall_concentration}% conc.`, this.margin + 100, this.y);
        this.setColor(COLORS.green);
        this.doc.text(`${whale.win_rate}% WR`, this.pageWidth - this.margin - 4, this.y, { align: 'right' });
        this.y += 5;
      }
    }
  }

  private renderAffiliatesSection(data: ReportData) {
    this.drawRect(0, 0, this.pageWidth, this.pageHeight, COLORS.bg);
    this.renderSectionTitle('4. Affiliates Program', COLORS.amber);

    const totalAffiliates = data.affiliates.length;
    const totalEarned = data.affiliates.reduce((s, a) => s + a.total_earned, 0);
    const totalClaimed = data.affiliates.reduce((s, a) => s + a.total_claimed_sol, 0);
    const totalPending = data.affiliates.reduce((s, a) => s + a.pending_earnings, 0);
    const totalReferrals = data.affiliates.reduce((s, a) => s + a.referral_count, 0);
    const totalExpired = data.affiliates.reduce((s, a) => s + a.expired_rewards_sol, 0);

    this.renderStatRow('Total Affiliates', totalAffiliates.toLocaleString());
    this.renderStatRow('Total Referrals', totalReferrals.toLocaleString());
    this.renderStatRow('Total Commissions Earned', `${totalEarned.toFixed(4)} SOL`, COLORS.green);
    this.renderStatRow('Total Commissions Claimed', `${totalClaimed.toFixed(4)} SOL`, COLORS.amber);
    this.renderStatRow('Pending Commissions', `${totalPending.toFixed(4)} SOL`, COLORS.cyan);
    this.renderStatRow('Expired/Unclaimed Rewards', `${totalExpired.toFixed(4)} SOL`, COLORS.red);

    this.y += 8;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.setColor(COLORS.muted);
    this.doc.text('Top 15 Affiliates by Earnings:', this.margin + 4, this.y);
    this.y += 8;

    const topAffiliates = [...data.affiliates].sort((a, b) => b.total_earned - a.total_earned).slice(0, 15);
    for (const aff of topAffiliates) {
      this.checkPageBreak(5);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7);
      this.setColor(COLORS.dim);
      this.doc.text(shortWallet(aff.wallet_address), this.margin + 6, this.y);
      this.setColor(COLORS.text);
      this.doc.text(`Code: ${aff.referral_code}`, this.margin + 45, this.y);
      this.doc.text(`${aff.referral_count} refs`, this.margin + 85, this.y);
      this.setColor(COLORS.green);
      this.doc.text(`${aff.total_earned.toFixed(4)} SOL`, this.pageWidth - this.margin - 4, this.y, { align: 'right' });
      this.y += 5;
    }

    this.y += 8;
    this.renderSectionTitle('Sybil Attack Analysis', COLORS.red);

    const sybilAlerts = data.sybilAlerts;
    const criticalSybil = sybilAlerts.filter(a => a.risk_score >= 70);
    const highSybil = sybilAlerts.filter(a => a.risk_score >= 40 && a.risk_score < 70);

    this.renderStatRow('Total Sybil Alerts', sybilAlerts.length.toLocaleString());
    this.renderStatRow('Critical Risk (Score 70+)', criticalSybil.length.toLocaleString(), COLORS.red);
    this.renderStatRow('High Risk (Score 40-69)', highSybil.length.toLocaleString(), COLORS.amber);

    if (sybilAlerts.length > 0) {
      this.y += 4;
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8);
      this.setColor(COLORS.muted);
      this.doc.text('Sybil Alert Details:', this.margin + 4, this.y);
      this.y += 6;

      for (const alert of sybilAlerts.slice(0, 10)) {
        this.checkPageBreak(10);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(7);
        this.setColor(COLORS.dim);
        this.doc.text(shortWallet(alert.wallet_address), this.margin + 6, this.y);

        const scoreColor = alert.risk_score >= 70 ? COLORS.red : alert.risk_score >= 40 ? COLORS.amber : COLORS.dim;
        this.setColor(scoreColor);
        this.doc.text(`Risk: ${alert.risk_score}`, this.margin + 45, this.y);
        this.setColor(COLORS.text);
        this.doc.text(`${alert.total_referrals} refs`, this.margin + 75, this.y);
        this.doc.text(`${alert.single_ticket_referrals} single-tix`, this.margin + 100, this.y);
        this.setColor(COLORS.amber);
        this.doc.text(`${alert.total_earned.toFixed(4)} SOL`, this.pageWidth - this.margin - 4, this.y, { align: 'right' });
        this.y += 5;
      }
    }
  }

  private renderComplianceSection(data: ReportData) {
    this.drawRect(0, 0, this.pageWidth, this.pageHeight, COLORS.bg);
    this.renderSectionTitle('5. Compliance & Security', COLORS.red);

    this.renderStatRow('Total Warnings', data.compliance.totalWarnings.toLocaleString());
    this.renderStatRow('Active Warnings', data.compliance.activeWarnings.toLocaleString(), COLORS.amber);
    this.renderStatRow('Total Reports', data.compliance.totalReports.toLocaleString());
    this.renderStatRow('Open Reports', data.compliance.openReports.toLocaleString(), COLORS.red);
    this.renderStatRow('OFAC Checks Run', data.compliance.totalOfacChecks.toLocaleString());
    this.renderStatRow('OFAC Flagged Wallets', data.compliance.ofacFlagged.toLocaleString(), COLORS.red);
    this.renderStatRow('Age Verified Users', `${data.compliance.ageVerified} / ${data.compliance.totalUsers}`, COLORS.green);
    this.renderStatRow('Age Verification Rate', `${data.compliance.totalUsers > 0 ? ((data.compliance.ageVerified / data.compliance.totalUsers) * 100).toFixed(1) : '0'}%`, COLORS.green);

    if (data.compliance.flaggedUsers.length > 0) {
      this.y += 8;
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(9);
      this.setColor(COLORS.muted);
      this.doc.text('Flagged Users:', this.margin + 4, this.y);
      this.y += 8;

      for (const user of data.compliance.flaggedUsers) {
        this.checkPageBreak(5);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(7);
        this.setColor(COLORS.dim);
        this.doc.text(shortWallet(user.wallet_address), this.margin + 6, this.y);
        this.setColor(user.compliance_status === 'flagged' ? COLORS.red : COLORS.amber);
        this.doc.text(user.compliance_status, this.margin + 50, this.y);
        this.setColor(user.ofac_flagged ? COLORS.red : COLORS.green);
        this.doc.text(user.ofac_flagged ? 'OFAC MATCH' : 'OFAC Clear', this.margin + 80, this.y);
        this.setColor(user.is_banned ? COLORS.red : COLORS.dim);
        this.doc.text(user.is_banned ? 'BANNED' : 'active', this.pageWidth - this.margin - 4, this.y, { align: 'right' });
        this.y += 5;
      }
    }

    if (data.compliance.recentWarnings.length > 0) {
      this.y += 8;
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(9);
      this.setColor(COLORS.muted);
      this.doc.text('Recent Warnings:', this.margin + 4, this.y);
      this.y += 8;

      for (const w of data.compliance.recentWarnings.slice(0, 10)) {
        this.checkPageBreak(5);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(7);
        this.setColor(COLORS.dim);
        this.doc.text(shortWallet(w.wallet_address), this.margin + 6, this.y);

        const sevColor = w.severity === 'critical' ? COLORS.red : w.severity === 'high' ? COLORS.amber : COLORS.dim;
        this.setColor(sevColor);
        this.doc.text(w.severity, this.margin + 45, this.y);
        this.setColor(COLORS.text);
        const desc = w.description.length > 50 ? w.description.slice(0, 47) + '...' : w.description;
        this.doc.text(desc, this.margin + 65, this.y);
        this.setColor(COLORS.dim);
        this.doc.text(new Date(w.created_at).toLocaleDateString(), this.pageWidth - this.margin - 4, this.y, { align: 'right' });
        this.y += 5;
      }
    }

    this.y += 15;
    this.drawLine(this.margin, this.y, this.pageWidth - this.margin, this.y, COLORS.border);
    this.y += 8;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.setColor(COLORS.dim);
    this.doc.text('-- End of Report --', this.pageWidth / 2, this.y, { align: 'center' });
    this.y += 5;
    this.doc.text(`PowerSOL Admin Report | Generated ${new Date().toLocaleString()}`, this.pageWidth / 2, this.y, { align: 'center' });
  }
}

export const pdfReportService = new PDFReportService();
