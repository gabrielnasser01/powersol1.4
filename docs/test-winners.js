// Script de teste para gerar ganhadores aleatórios
// Execute este código no console do navegador

function generateRandomWallet() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
  const prefix = Array(3).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
  const suffix = Array(3).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix}...${suffix}`;
}

function generateRandomPrize(min, max) {
  return Math.random() * (max - min) + min;
}

function generateWinners(drawId, count, minPrize, maxPrize) {
  const winners = [];
  const baseTime = Date.now() - 3600000; // 1 hora atrás

  for (let i = 0; i < count; i++) {
    winners.push({
      drawId: drawId,
      maskedPk: generateRandomWallet(),
      prizeSol: generateRandomPrize(minPrize, maxPrize),
      timestamp: baseTime + (i * 1000) // Espaça os ganhadores por 1 segundo
    });
  }

  return winners;
}

// Limpar ganhadores existentes
localStorage.removeItem('powerSOL.winners');

// Gerar ganhadores para cada loteria
const allWinners = [
  // Tri-Daily: 150 ganhadores com prêmios entre 10 e 500 SOL
  ...generateWinners('tri-daily-001', 150, 10, 500),

  // Halloween: 120 ganhadores com prêmios entre 20 e 800 SOL
  ...generateWinners('halloween-2024', 120, 20, 800),

  // Jackpot: 100 ganhadores com prêmios entre 50 e 2000 SOL
  ...generateWinners('monthly-001', 100, 50, 2000),

  // Grand Prize: 3 ganhadores com prêmios entre 5000 e 50000 SOL
  ...generateWinners('grand-prize-2024', 3, 5000, 50000)
];

// Salvar no localStorage
localStorage.setItem('powerSOL.winners', JSON.stringify(allWinners));

console.log('✅ Ganhadores gerados com sucesso!');
console.log(`📊 Total: ${allWinners.length} ganhadores`);
console.log('📋 Detalhes:');
console.log('  - Tri-Daily: 150 ganhadores');
console.log('  - Halloween: 120 ganhadores');
console.log('  - Jackpot: 100 ganhadores');
console.log('  - Grand Prize: 3 ganhadores');
console.log('\n🔄 Recarregue a página para ver os resultados!');
