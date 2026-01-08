import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WalletInfo {
  name: string;
  publicKey: string;
  privateKeyArray?: number[];
  privateKeyBase58?: string;
  needsPrivateKey: boolean;
}

function generateWallet(name: string, needsPrivateKey: boolean): WalletInfo {
  const keypair = Keypair.generate();

  const info: WalletInfo = {
    name,
    publicKey: keypair.publicKey.toBase58(),
    needsPrivateKey,
  };

  if (needsPrivateKey) {
    info.privateKeyArray = Array.from(keypair.secretKey);
    info.privateKeyBase58 = Buffer.from(keypair.secretKey).toString('base64');
  }

  return info;
}

console.log('🎯 Gerando 8 Wallets para PowerSOL (TODAS com chave privada)...\n');

const wallets: WalletInfo[] = [
  generateWallet('AUTHORITY', true),
  generateWallet('TREASURY', true),
  generateWallet('AFFILIATES_POOL', true),
  generateWallet('DELTA', true),
  generateWallet('LOTTERY_TRI_DAILY', true),   // Prize pool 3 em 3 dias - COM chave privada
  generateWallet('LOTTERY_WEEKLY', true),       // Prize pool semanal - COM chave privada
  generateWallet('LOTTERY_MEGA', true),         // Prize pool mega - COM chave privada
  generateWallet('SPECIAL_EVENT', true),        // Eventos especiais (Halloween, Natal) - COM chave privada
];

console.log('═══════════════════════════════════════════════════════════════\n');

wallets.forEach((wallet, index) => {
  console.log(`${index + 1}. ${wallet.name}`);
  console.log(`   Public Key: ${wallet.publicKey}`);

  if (wallet.needsPrivateKey) {
    console.log(`   Private Key (Array): [${wallet.privateKeyArray!.slice(0, 5).join(',')},...] (${wallet.privateKeyArray!.length} bytes)`);
    console.log(`   Private Key (Base64): ${wallet.privateKeyBase58!.slice(0, 40)}...`);
  }

  console.log('');
});

console.log('═══════════════════════════════════════════════════════════════\n');

// Generate .env format
console.log('📋 ADICIONE NO SEU .env:\n');
console.log('# ═══════════════════════════════════════════════════════════');
console.log('# PowerSOL Wallets Configuration');
console.log('# ═══════════════════════════════════════════════════════════\n');

const walletDescriptions: Record<string, string> = {
  'AUTHORITY': 'Backend Authority - signs transactions',
  'TREASURY': '30% dos tickets',
  'AFFILIATES_POOL': 'Pool de afiliados (ate 30%)',
  'DELTA': 'Diferenca (30% - affiliates%)',
  'LOTTERY_TRI_DAILY': 'Prize Pool 3 em 3 dias',
  'LOTTERY_WEEKLY': 'Prize Pool Semanal',
  'LOTTERY_MEGA': 'Prize Pool Mega',
  'SPECIAL_EVENT': 'Eventos Especiais (Halloween, Natal, etc)',
};

wallets.forEach((wallet) => {
  const desc = walletDescriptions[wallet.name] || wallet.name;
  console.log(`# ${wallet.name} (${desc})`);
  console.log(`SOLANA_${wallet.name}_PUBLIC=${wallet.publicKey}`);
  console.log(`SOLANA_${wallet.name}_PRIVATE='${JSON.stringify(wallet.privateKeyArray)}'`);
  console.log('');
});

console.log('# ═══════════════════════════════════════════════════════════\n');

// Save to file
const outputPath = path.join(__dirname, '../wallets-generated.json');
fs.writeFileSync(outputPath, JSON.stringify(wallets, null, 2));
console.log(`✅ Wallets salvas em: ${outputPath}\n`);

console.log('⚠️  IMPORTANTE:');
console.log('1. Copie as variaveis acima para seu .env');
console.log('2. NUNCA compartilhe as PRIVATE KEYS');
console.log('3. Transfira SOL para TODAS as 8 carteiras (para gas fees)');
console.log('4. O backend PODE enviar premios de TODAS as carteiras de loteria\n');
