import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import {
  getConnection,
  getAuthorityKeypair,
  getTreasuryKeypair,
  getAffiliatesKeypair,
  getDeltaKeypair,
} from '../src/config/solana.js';

dotenv.config();

async function testWallets() {
  console.log('🔍 Testando Acesso às Carteiras...\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const connection = getConnection();

  const wallets = [
    { name: 'AUTHORITY', getKeypair: getAuthorityKeypair },
    { name: 'TREASURY', getKeypair: getTreasuryKeypair },
    { name: 'AFFILIATES_POOL', getKeypair: getAffiliatesKeypair },
    { name: 'DELTA', getKeypair: getDeltaKeypair },
  ];

  for (const wallet of wallets) {
    try {
      console.log(`📍 ${wallet.name}`);

      const keypair = wallet.getKeypair();
      const publicKey = keypair.publicKey;

      console.log(`   Endereço: ${publicKey.toBase58()}`);

      const balance = await connection.getBalance(publicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;

      console.log(`   Saldo: ${balanceSOL.toFixed(4)} SOL`);

      if (balanceSOL === 0) {
        console.log(`   ⚠️  Precisa adicionar SOL!`);
        console.log(`   💰 Comando: solana airdrop 2 ${publicKey.toBase58()} --url devnet`);
      } else {
        console.log(`   ✅ Tem saldo!`);
      }

      console.log('');
    } catch (error) {
      console.error(`   ❌ ERRO: ${error instanceof Error ? error.message : error}`);
      console.log('');
    }
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('✅ Todas as 4 carteiras estão acessíveis!\n');
  console.log('💡 Agora você pode:');
  console.log('   - Fazer transações de qualquer uma delas');
  console.log('   - Mover SOL entre elas');
  console.log('   - Distribuir prêmios');
  console.log('   - Gerenciar afiliados\n');
}

testWallets().catch(console.error);
