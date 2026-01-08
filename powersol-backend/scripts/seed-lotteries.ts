import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function getNextTriDailyDraw(): Date {
  const startDate = new Date(Date.UTC(2024, 0, 1, 0, 0, 0, 0));
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const daysSinceStart = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const currentRound = Math.floor(daysSinceStart / 3);
  const nextRound = currentRound + 1;
  const nextDrawDate = new Date(startDate);
  nextDrawDate.setUTCDate(startDate.getUTCDate() + (nextRound * 3));
  return nextDrawDate;
}

function getNextMonthLastDay(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 0, 0, 0, 0);
  return nextMonth;
}

function getXmasDraw(): Date {
  return new Date(Date.UTC(2024, 11, 25, 0, 0, 0, 0));
}

function getNewYearDraw(): Date {
  return new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0));
}

async function seedLotteries() {
  console.log('🎰 Seeding PowerSOL Lotteries...\n');

  const startDate = Date.UTC(2024, 0, 1);
  const now = Date.now();
  const daysSinceStart = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
  const currentRound = Math.floor(daysSinceStart / 3) + 1;

  const lotteries = [
    {
      lottery_id: currentRound,
      type: 'TRI_DAILY',
      ticket_price: (0.1 * LAMPORTS_PER_SOL).toString(),
      max_tickets: 1000,
      draw_timestamp: getNextTriDailyDraw().toISOString(),
      metadata: {
        name: 'Tri-Daily Lottery',
        description: 'Sorteio a cada 3 dias',
        frequency: 'Every 3 days',
        round: currentRound,
      },
    },
    {
      lottery_id: 2,
      type: 'JACKPOT',
      ticket_price: (0.2 * LAMPORTS_PER_SOL).toString(),
      max_tickets: 5000,
      draw_timestamp: getNextMonthLastDay().toISOString(),
      metadata: {
        name: 'Monthly Jackpot',
        description: 'Sorteio mensal com prêmio acumulado',
        frequency: 'Monthly',
        month: new Date().getUTCMonth() + 1,
        year: new Date().getUTCFullYear(),
      },
    },
    {
      lottery_id: 3,
      type: 'GRAND_PRIZE',
      ticket_price: (0.33 * LAMPORTS_PER_SOL).toString(),
      max_tickets: 10000,
      draw_timestamp: getNewYearDraw().toISOString(),
      metadata: {
        name: 'New Year Grand Prize 2025',
        description: 'Sorteio especial de Ano Novo',
        frequency: 'Yearly',
        year: 2025,
      },
    },
    {
      lottery_id: 4,
      type: 'XMAS',
      ticket_price: (0.2 * LAMPORTS_PER_SOL).toString(),
      max_tickets: 7500,
      draw_timestamp: getXmasDraw().toISOString(),
      metadata: {
        name: 'Christmas Special 2024',
        description: 'Sorteio especial de Natal',
        frequency: 'Yearly',
        year: 2024,
      },
    },
  ];

  for (const lottery of lotteries) {
    const { data: existing } = await supabase
      .from('lotteries')
      .select('id')
      .eq('type', lottery.type)
      .eq('is_drawn', false)
      .maybeSingle();

    if (existing) {
      console.log(`⏭️  ${lottery.metadata.name} already exists, skipping...`);
      continue;
    }

    const { data, error } = await supabase
      .from('lotteries')
      .insert(lottery)
      .select()
      .single();

    if (error) {
      console.log(`❌ Failed to create ${lottery.type}:`, error.message);
    } else {
      console.log(
        `✅ Created ${lottery.metadata.name} (ID: ${data.id})\n` +
        `   Ticket Price: ${parseFloat(lottery.ticket_price) / LAMPORTS_PER_SOL} SOL\n` +
        `   Max Tickets: ${lottery.max_tickets}\n` +
        `   Draw Time: ${new Date(lottery.draw_timestamp).toLocaleString()}\n`
      );
    }
  }

  console.log('🎉 Seeding complete!\n');
  console.log('📊 Summary:');
  console.log('   - TRI-DAILY: Every 3 days (0.1 SOL)');
  console.log('   - JACKPOT: Monthly (0.2 SOL)');
  console.log('   - GRAND PRIZE: New Year 2025 (0.33 SOL)');
  console.log('   - XMAS: Christmas 2024 (0.2 SOL)');
}

seedLotteries().catch(console.error);
