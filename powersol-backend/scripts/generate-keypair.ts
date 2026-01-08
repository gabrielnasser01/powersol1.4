import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

console.log('Generating new Solana keypair...\n');

const keypair = Keypair.generate();

const publicKey = keypair.publicKey.toBase58();
const secretKey = bs58.encode(keypair.secretKey);

console.log('Public Key (Wallet Address):');
console.log(publicKey);
console.log('\nSecret Key (Base58):');
console.log(secretKey);
console.log('\nIMPORTANT: Save the secret key securely!');
console.log('Add to .env as AUTHORITY_WALLET_SECRET=');
console.log(secretKey);
