# Anchor Programs Integration Guide

This guide explains how PowerSOL integrates with on-chain Anchor programs for lottery operations.

## Overview

PowerSOL uses two Anchor programs deployed on Solana:

1. **powersol-core** - Main lottery operations (initialize, purchase tickets, draw winners)
2. **powersol-claim** - Prize claiming and distribution

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  - Wallet connection                                         │
│  - Ticket purchase UI                                        │
│  - Prize claiming UI                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (Express + Supabase)                    │
│  - anchorIntegrationService                                  │
│  - Lottery management                                        │
│  - Prize verification                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Anchor Programs (Solana)                   │
│  - powersol-core: Lottery & Ticket accounts                 │
│  - powersol-claim: Prize accounts                           │
└─────────────────────────────────────────────────────────────┘
```

## Program Derived Addresses (PDAs)

PDAs are deterministic addresses derived from seeds. They enable secure, verifiable state management without private keys.

### Core Program PDAs

#### 1. Global State PDA
```typescript
seeds: ['global_state']
```
- Stores global lottery configuration
- Treasury wallet address
- Affiliates pool address
- Admin authority

#### 2. Treasury PDA
```typescript
seeds: ['treasury']
```
- Receives all ticket purchase payments
- Source for prize distributions
- Controlled by program authority

#### 3. Affiliates Pool PDA
```typescript
seeds: ['affiliates_pool']
```
- Receives affiliate commissions
- Distributed based on referral system

#### 4. Lottery PDA
```typescript
seeds: ['lottery', lottery_id]
// For JACKPOT type:
seeds: ['lottery', lottery_id, month, year]
```
- Each lottery has unique PDA
- Stores lottery state, prize pool, draw schedule
- JACKPOT lotteries include month/year for periodic draws

#### 5. Ticket PDA
```typescript
seeds: ['ticket', lottery_id, ticket_number]
```
- Each ticket has unique PDA within lottery
- Stores buyer address and purchase timestamp
- Immutable once created

### Claim Program PDAs

#### 6. Prize PDA
```typescript
seeds: ['prize', lottery_id, winner_pubkey]
```
- Created when winner is drawn
- Stores prize amount and claim status
- One prize per winner per lottery

## Setup Instructions

### Prerequisites

1. **Anchor Framework** (v0.30+)
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli --locked
   ```

2. **Solana CLI** (v1.18+)
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

3. **Funded Wallets on Devnet**
   - Lottery authority wallet
   - Treasury wallet
   - Affiliates pool wallet

### Environment Variables

Add to your `.env` file:

```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# Wallet Paths (relative to project root)
LOTTERY_WALLET_PATH=/wallets/lottery-wallet.json
TREASURY_WALLET_PATH=/wallets/treasury-wallet.json
AFFILIATES_POOL_WALLET_PATH=/wallets/affiliates-pool-wallet.json

# Treasury & Affiliates (public keys)
TREASURY_ADDRESS=YourTreasuryPublicKeyHere
AFFILIATES_POOL_ADDRESS=YourAffiliatesPoolPublicKeyHere

# Supabase (for backend seeding)
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# These will be auto-populated by setup script:
ANCHOR_CORE_PROGRAM_ID=
ANCHOR_CLAIM_PROGRAM_ID=
ANCHOR_GLOBAL_STATE_PDA=
ANCHOR_TREASURY_PDA=
ANCHOR_AFFILIATES_POOL_PDA=
```

### Automated Setup

Run the complete setup with one command:

```bash
npm run setup:anchor
```

This script will:
1. Build both Anchor programs
2. Deploy to devnet
3. Derive all PDAs
4. Initialize 5 default lotteries on-chain
5. Update `.env` with Program IDs and PDAs
6. Seed Supabase `lotteries` table

### Manual Setup (if needed)

If you need to set up manually:

#### 1. Build Programs
```bash
cd powersol-programs
bash build.sh
```

#### 2. Deploy to Devnet
```bash
bash deploy-devnet.sh
```

#### 3. Get Program IDs
```bash
# Core program
anchor idl print powersol-core | grep "address"

# Claim program
anchor idl print powersol-claim | grep "address"
```

#### 4. Derive PDAs
Use `powersol-backend/src/lib/anchor/pdas.ts` helper functions:

```typescript
import { deriveLotteryPDA, deriveTicketPDA, derivePrizePDA } from './lib/anchor/pdas';

const coreProgramId = new PublicKey('Your_Core_Program_ID');
const claimProgramId = new PublicKey('Your_Claim_Program_ID');

const globalStatePda = PublicKey.findProgramAddressSync(
  [Buffer.from('global_state')],
  coreProgramId
)[0];
```

## Using the Integration Service

### Initialize a Lottery

```typescript
import { anchorIntegrationService } from './services/anchor-integration.service';

const lotteryPda = await anchorIntegrationService.initializeLottery({
  lotteryType: 'TRI_DAILY',
  ticketPrice: 0.1, // SOL
  drawInterval: 86400, // seconds (1 day)
  maxTickets: 10000
});
```

### Purchase a Ticket

```typescript
const txSignature = await anchorIntegrationService.purchaseTicket({
  lotteryId: new PublicKey('lottery_id'),
  buyer: new PublicKey('buyer_wallet'),
  ticketNumber: 1234
});
```

### Draw Winner

```typescript
const txSignature = await anchorIntegrationService.drawWinner({
  lotteryId: new PublicKey('lottery_id'),
  vrfResult: [1, 2, 3, 4, 5] // from VRF service
});
```

### Claim Prize

```typescript
const txSignature = await anchorIntegrationService.claimPrize({
  lotteryId: new PublicKey('lottery_id'),
  winner: new PublicKey('winner_wallet'),
  prizeAmount: 10.5 // SOL
});
```

### Query On-Chain Data

```typescript
// Get lottery details
const lotteryData = await anchorIntegrationService.getLotteryData(
  new PublicKey('lottery_id')
);

// Get ticket details
const ticketData = await anchorIntegrationService.getTicketData(
  new PublicKey('lottery_id'),
  1234 // ticket number
);

// Get prize details
const prizeData = await anchorIntegrationService.getPrizeData(
  new PublicKey('lottery_id'),
  new PublicKey('winner_wallet')
);
```

## Lottery Types

### TRI_DAILY
- 3 draws per day
- Lower ticket price
- Smaller prize pools
- Quick rounds

### JACKPOT
- Monthly/quarterly draws
- Month and year in PDA seeds
- Larger prize pools
- Accumulating jackpots

### XMAS
- Special seasonal lottery
- Fixed time period
- Unique rewards
- Holiday themed

### GRAND_PRIZE
- Quarterly/annual draws
- Highest ticket prices
- Massive prize pools
- Grand finale events

## Default Lotteries Seeded

The setup script creates these 5 lotteries:

| Name | Type | Ticket Price | Draw Interval | Max Tickets |
|------|------|--------------|---------------|-------------|
| Daily Lottery | TRI_DAILY | 0.1 SOL | 1 day | 10,000 |
| Weekly Lottery | TRI_DAILY | 0.5 SOL | 7 days | 50,000 |
| Monthly Lottery | JACKPOT | 1.0 SOL | 30 days | 100,000 |
| Jackpot | JACKPOT | 2.0 SOL | 7 days | 200,000 |
| Grand Prize | GRAND_PRIZE | 5.0 SOL | 90 days | 500,000 |

## Security Considerations

1. **Authority Control**
   - Only program authority can initialize lotteries and draw winners
   - Authority wallet must be securely stored
   - Consider multi-sig for production

2. **PDA Verification**
   - Always verify PDA derivation matches expected seeds
   - Never trust user-provided PDAs without verification

3. **Treasury Protection**
   - Treasury PDA is controlled by program
   - Withdrawals require authority signature
   - Monitor for unauthorized access

4. **VRF Integration**
   - Use Switchboard VRF for verifiable randomness
   - Never use predictable randomness sources
   - Store VRF results on-chain for transparency

## Troubleshooting

### Program Deployment Fails
```bash
# Increase compute units
solana program deploy --max-len 500000 target/deploy/powersol_core.so

# Check wallet balance
solana balance

# Airdrop if needed (devnet only)
solana airdrop 5
```

### PDA Derivation Errors
- Verify seeds match program implementation
- Check Buffer encoding (use `Buffer.from('string')` for strings)
- Ensure month/year are correct for JACKPOT type

### Transaction Simulation Failed
- Check account ownership
- Verify signer requirements
- Ensure sufficient SOL for rent + fees
- Review program logs: `solana logs`

## Next Steps

1. **Frontend Integration**
   - Connect wallet using `@solana/wallet-adapter-react`
   - Build transaction with `@coral-xyz/anchor`
   - Sign and send transactions

2. **Backend Automation**
   - Cron jobs for automatic draws
   - Monitor ticket purchases
   - Verify prize claims

3. **Production Deployment**
   - Deploy to mainnet
   - Configure mainnet RPC endpoint
   - Update wallet paths and keys
   - Enable monitoring and alerts

## Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [PowerSOL Programs](./powersol-programs/)
- [Backend Service](./powersol-backend/src/services/anchor-integration.service.ts)
- [PDA Utilities](./powersol-backend/src/lib/anchor/pdas.ts)

## Support

For issues or questions:
- Check program logs: `solana logs`
- Review Anchor errors in transaction simulation
- Verify environment variables are set correctly
- Ensure wallets are funded on the correct network
