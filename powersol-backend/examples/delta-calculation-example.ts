/**
 * 🎯 Exemplo de Cálculo do Delta de Afiliados
 *
 * Este arquivo demonstra como calcular o delta (sobra de comissões)
 * para diferentes tiers de afiliados no sistema PowerSOL.
 */

import {
  AffiliateTier,
  calculateAffiliatePaymentBreakdown,
  AFFILIATE_TIER_CONFIGS,
} from '../src/services/affiliate.service';

interface LotteryConfig {
  name: string;
  ticketPrice: bigint;
}

const LOTTERIES: LotteryConfig[] = [
  { name: 'TRI-DAILY', ticketPrice: BigInt(100_000_000) },      // 0.1 SOL
  { name: 'JACKPOT', ticketPrice: BigInt(200_000_000) },        // 0.2 SOL
  { name: 'GRAND_PRIZE', ticketPrice: BigInt(330_000_000) },    // 0.33 SOL
  { name: 'XMAS', ticketPrice: BigInt(200_000_000) },           // 0.2 SOL
];

function formatSOL(lamports: bigint): string {
  return (Number(lamports) / 1_000_000_000).toFixed(3) + ' SOL';
}

function formatPercent(rate: number): string {
  return (rate * 100).toFixed(0) + '%';
}

console.log('\n🎯 SISTEMA DELTA - CÁLCULO DE COMISSÕES E SOBRAS\n');
console.log('='.repeat(80));

// Exemplo 1: Breakdown por Tier para cada Loteria
console.log('\n📊 EXEMPLO 1: Breakdown de Pagamento por Tier\n');

LOTTERIES.forEach((lottery) => {
  console.log(`\n${lottery.name} (${formatSOL(lottery.ticketPrice)})`);
  console.log('-'.repeat(80));

  Object.values(AffiliateTier)
    .filter((t) => typeof t === 'number')
    .forEach((tier) => {
      const breakdown = calculateAffiliatePaymentBreakdown(lottery.ticketPrice, tier as AffiliateTier);
      const config = AFFILIATE_TIER_CONFIGS.find((c) => c.tier === tier);

      console.log(`\n  ${config?.label}:`);
      console.log(`    Reservado:  ${formatSOL(breakdown.reserved)} (30%)`);
      console.log(`    Comissão:   ${formatSOL(breakdown.commission)} (${formatPercent(breakdown.commissionRate)})`);
      console.log(`    🎯 Delta:   ${formatSOL(breakdown.delta)} (${formatPercent((Number(breakdown.delta) / Number(breakdown.reserved)))})`);
    });
});

// Exemplo 2: Cenário Real com 1000 Tickets
console.log('\n\n💰 EXEMPLO 2: Cenário Real - 1000 Tickets TRI-DAILY\n');
console.log('='.repeat(80));

const triDailyPrice = BigInt(100_000_000); // 0.1 SOL

const salesMix = [
  { tier: AffiliateTier.TIER_1, tickets: 400 },
  { tier: AffiliateTier.TIER_2, tickets: 300 },
  { tier: AffiliateTier.TIER_3, tickets: 200 },
  { tier: AffiliateTier.TIER_4, tickets: 100 },
];

let totalTickets = 0;
let totalReserved = BigInt(0);
let totalCommissions = BigInt(0);
let totalDelta = BigInt(0);

console.log('\nMix de Afiliados:');
salesMix.forEach(({ tier, tickets }) => {
  const config = AFFILIATE_TIER_CONFIGS.find((c) => c.tier === tier);
  console.log(`  • ${config?.label}: ${tickets} tickets`);
  totalTickets += tickets;
});

console.log(`\nTOTAL DE TICKETS: ${totalTickets}`);
console.log(`RECEITA TOTAL: ${formatSOL(triDailyPrice * BigInt(totalTickets))}`);

console.log('\n┌────────────────────────────────────────────────────────────┐');
console.log('│ DISTRIBUIÇÃO DA RECEITA                                    │');
console.log('├────────────────────────────────────────────────────────────┤');

const totalRevenue = triDailyPrice * BigInt(totalTickets);
const prizePool = (totalRevenue * BigInt(40)) / BigInt(100);
const treasury = (totalRevenue * BigInt(30)) / BigInt(100);
const affiliatesPool = (totalRevenue * BigInt(30)) / BigInt(100);

console.log(`│ Prize Pool (40%):        ${formatSOL(prizePool).padEnd(45)}│`);
console.log(`│ Treasury (30%):          ${formatSOL(treasury).padEnd(45)}│`);
console.log(`│ Affiliates Pool (30%):   ${formatSOL(affiliatesPool).padEnd(45)}│`);
console.log('└────────────────────────────────────────────────────────────┘');

console.log('\n┌────────────────────────────────────────────────────────────┐');
console.log('│ PROCESSAMENTO DE COMISSÕES                                 │');
console.log('├────────────────────────────────────────────────────────────┤');

salesMix.forEach(({ tier, tickets }) => {
  const breakdown = calculateAffiliatePaymentBreakdown(triDailyPrice, tier);
  const config = AFFILIATE_TIER_CONFIGS.find((c) => c.tier === tier);

  const tierReserved = breakdown.reserved * BigInt(tickets);
  const tierCommissions = breakdown.commission * BigInt(tickets);
  const tierDelta = breakdown.delta * BigInt(tickets);

  totalReserved += tierReserved;
  totalCommissions += tierCommissions;
  totalDelta += tierDelta;

  console.log(`│                                                            │`);
  console.log(`│ ${config?.label}:`.padEnd(60) + '│');
  console.log(`│   ${tickets} tickets × ${formatSOL(breakdown.commission)} = ${formatSOL(tierCommissions).padEnd(30)}│`);
  console.log(`│   Delta: ${tickets} tickets × ${formatSOL(breakdown.delta)} = ${formatSOL(tierDelta).padEnd(25)}│`);
});

console.log('│                                                            │');
console.log('├────────────────────────────────────────────────────────────┤');
console.log(`│ TOTAL PAGO AOS AFILIADOS:  ${formatSOL(totalCommissions).padEnd(31)}│`);
console.log(`│ 🎯 DELTA TOTAL:            ${formatSOL(totalDelta).padEnd(31)}│`);
console.log('└────────────────────────────────────────────────────────────┘');

console.log(`\n✅ Verificação: ${formatSOL(totalCommissions)} + ${formatSOL(totalDelta)} = ${formatSOL(totalReserved)}`);

// Exemplo 3: Tabela Comparativa
console.log('\n\n📊 EXEMPLO 3: Tabela Comparativa de Delta\n');
console.log('='.repeat(80));

console.log('\nDelta por Tier e Loteria:\n');
console.log('┌────────┬─────────┬──────────────┬──────────────┬──────────────┬──────────────┐');
console.log('│  Tier  │   Taxa  │  TRI-DAILY   │   JACKPOT    │ GRAND_PRIZE  │     XMAS     │');
console.log('├────────┼─────────┼──────────────┼──────────────┼──────────────┼──────────────┤');

Object.values(AffiliateTier)
  .filter((t) => typeof t === 'number')
  .forEach((tier) => {
    const config = AFFILIATE_TIER_CONFIGS.find((c) => c.tier === tier);
    const rate = formatPercent(config?.commissionRate || 0).padEnd(7);

    const deltas = LOTTERIES.map((lottery) => {
      const breakdown = calculateAffiliatePaymentBreakdown(lottery.ticketPrice, tier as AffiliateTier);
      return formatSOL(breakdown.delta).padEnd(12);
    });

    console.log(`│ Tier ${tier} │ ${rate} │ ${deltas[0]} │ ${deltas[1]} │ ${deltas[2]} │ ${deltas[3]} │`);
  });

console.log('└────────┴─────────┴──────────────┴──────────────┴──────────────┴──────────────┘');

// Exemplo 4: Projeção Anual
console.log('\n\n💎 EXEMPLO 4: Projeção Anual de Delta\n');
console.log('='.repeat(80));

const annualProjections = [
  { scenario: 'Conservador', totalSales: BigInt(100_000_000_000_000) },  // 100k SOL
  { scenario: 'Moderado', totalSales: BigInt(500_000_000_000_000) },      // 500k SOL
  { scenario: 'Otimista', totalSales: BigInt(1_000_000_000_000_000) },    // 1M SOL
];

console.log('\nCenários anuais (assumindo 70% Tier 1-2, 25% Tier 3, 5% Tier 4):\n');

annualProjections.forEach(({ scenario, totalSales }) => {
  const affiliatesReserve = (totalSales * BigInt(30)) / BigInt(100);

  const tier1Sales = (totalSales * BigInt(35)) / BigInt(100);
  const tier2Sales = (totalSales * BigInt(35)) / BigInt(100);
  const tier3Sales = (totalSales * BigInt(25)) / BigInt(100);
  const tier4Sales = (totalSales * BigInt(5)) / BigInt(100);

  const avgTicketPrice = BigInt(150_000_000); // 0.15 SOL médio

  const tier1Tickets = tier1Sales / avgTicketPrice;
  const tier2Tickets = tier2Sales / avgTicketPrice;
  const tier3Tickets = tier3Sales / avgTicketPrice;
  const tier4Tickets = tier4Sales / avgTicketPrice;

  const tier1Delta = calculateAffiliatePaymentBreakdown(avgTicketPrice, AffiliateTier.TIER_1).delta * tier1Tickets;
  const tier2Delta = calculateAffiliatePaymentBreakdown(avgTicketPrice, AffiliateTier.TIER_2).delta * tier2Tickets;
  const tier3Delta = calculateAffiliatePaymentBreakdown(avgTicketPrice, AffiliateTier.TIER_3).delta * tier3Tickets;
  const tier4Delta = calculateAffiliatePaymentBreakdown(avgTicketPrice, AffiliateTier.TIER_4).delta * tier4Tickets;

  const totalDeltaAnnual = tier1Delta + tier2Delta + tier3Delta + tier4Delta;

  console.log(`\n${scenario}:`);
  console.log(`  Receita Total:           ${formatSOL(totalSales)}`);
  console.log(`  Reserva Afiliados (30%): ${formatSOL(affiliatesReserve)}`);
  console.log(`  🎯 Delta Projetado:      ${formatSOL(totalDeltaAnnual)}`);
  console.log(`     (${formatPercent(Number(totalDeltaAnnual) / Number(totalSales))} da receita total)`);
});

console.log('\n\n✨ RESUMO:\n');
console.log('O Sistema Delta permite capturar a diferença entre a reserva máxima (30%)');
console.log('e o valor realmente pago aos afiliados baseado em seu tier de performance.');
console.log('\nEsse delta pode ser usado estrategicamente para:');
console.log('  • Aumentar o Treasury');
console.log('  • Investir em marketing');
console.log('  • Criar programas de bônus');
console.log('  • Boost em prize pools');
console.log('  • Reserva de emergência');
console.log('\nTudo é transparente e auditável on-chain! 🔐✅');
console.log('\n' + '='.repeat(80) + '\n');
