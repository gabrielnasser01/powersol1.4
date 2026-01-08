# ⚓ Anchor Programs Integration

Guia para criar e integrar os programas Anchor do PowerSOL.

## 🏗️ ESTRUTURA DOS PROGRAMAS

Você precisa criar **2 programas Anchor**:

### 1. powersol-core
**Responsável por:**
- Gerenciamento de loterias
- Compra de tickets
- Execução de sorteios
- VRF integration

### 2. powersol-claim
**Responsável por:**
- Reivindicação de prêmios
- Transferências seguras
- Validações de winners

---

## 📁 ESTRUTURA DE DIRETÓRIOS

```
powersol-programs/
├── Anchor.toml
├── Cargo.toml
└── programs/
    ├── powersol-core/
    │   ├── Cargo.toml
    │   └── src/
    │       ├── lib.rs
    │       ├── state/
    │       │   ├── mod.rs
    │       │   ├── lottery.rs
    │       │   ├── ticket.rs
    │       │   └── vrf_request.rs
    │       ├── instructions/
    │       │   ├── mod.rs
    │       │   ├── initialize_lottery.rs
    │       │   ├── purchase_ticket.rs
    │       │   ├── execute_draw.rs
    │       │   └── request_vrf.rs
    │       └── errors.rs
    └── powersol-claim/
        ├── Cargo.toml
        └── src/
            ├── lib.rs
            ├── state/
            │   ├── mod.rs
            │   └── claim.rs
            ├── instructions/
            │   ├── mod.rs
            │   ├── claim_prize.rs
            │   └── verify_winner.rs
            └── errors.rs
```

---

## 🎯 POWERSOL-CORE PROGRAM

### State: Lottery Account

```rust
// programs/powersol-core/src/state/lottery.rs

use anchor_lang::prelude::*;

#[account]
pub struct Lottery {
    pub authority: Pubkey,        // Backend authority
    pub lottery_id: u64,          // Unique ID
    pub lottery_type: LotteryType, // TRI_DAILY, JACKPOT, etc
    pub ticket_price: u64,        // In lamports
    pub max_tickets: u32,
    pub current_tickets: u32,
    pub draw_timestamp: i64,
    pub is_drawn: bool,
    pub winning_ticket: Option<u32>,
    pub treasury: Pubkey,
    pub prize_pool: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum LotteryType {
    TriDaily { round: u64 },
    Jackpot { month: u16, year: u32 },
    GrandPrize { year: u32 },
    Xmas { year: u32 },
}

impl Lottery {
    pub const LEN: usize = 8 + // discriminator
        32 +                    // authority
        8 +                     // lottery_id
        1 + 32 +                // lottery_type (enum + max data)
        8 +                     // ticket_price
        4 +                     // max_tickets
        4 +                     // current_tickets
        8 +                     // draw_timestamp
        1 +                     // is_drawn
        1 + 4 +                 // winning_ticket (Option<u32>)
        32 +                    // treasury
        8 +                     // prize_pool
        1;                      // bump
}
```

### State: Ticket Account

```rust
// programs/powersol-core/src/state/ticket.rs

use anchor_lang::prelude::*;

#[account]
pub struct Ticket {
    pub owner: Pubkey,
    pub lottery: Pubkey,
    pub ticket_number: u32,
    pub purchased_at: i64,
    pub bump: u8,
}

impl Ticket {
    pub const LEN: usize = 8 + 32 + 32 + 4 + 8 + 1;
}

#[account]
pub struct UserTickets {
    pub user: Pubkey,
    pub lottery: Pubkey,
    pub ticket_numbers: Vec<u32>,
    pub count: u32,
    pub bump: u8,
}
```

### Instruction: Initialize Lottery

```rust
// programs/powersol-core/src/instructions/initialize_lottery.rs

use anchor_lang::prelude::*;
use crate::state::*;

pub fn initialize_tri_daily_lottery(
    ctx: Context<InitializeTriDailyLottery>,
    round: u64,
    ticket_price: u64,
    max_tickets: u32,
    draw_timestamp: i64,
) -> Result<()> {
    let lottery = &mut ctx.accounts.lottery;

    lottery.authority = ctx.accounts.authority.key();
    lottery.lottery_id = round;
    lottery.lottery_type = LotteryType::TriDaily { round };
    lottery.ticket_price = ticket_price;
    lottery.max_tickets = max_tickets;
    lottery.current_tickets = 0;
    lottery.draw_timestamp = draw_timestamp;
    lottery.is_drawn = false;
    lottery.winning_ticket = None;
    lottery.treasury = ctx.accounts.treasury.key();
    lottery.prize_pool = 0;
    lottery.bump = ctx.bumps.lottery;

    Ok(())
}

#[derive(Accounts)]
#[instruction(round: u64)]
pub struct InitializeTriDailyLottery<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = Lottery::LEN,
        seeds = [b"tri_daily", round.to_le_bytes().as_ref()],
        bump
    )]
    pub lottery: Account<'info, Lottery>,

    /// CHECK: Treasury wallet
    pub treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
```

### Instruction: Purchase Ticket

```rust
// programs/powersol-core/src/instructions/purchase_ticket.rs

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;

pub fn purchase_ticket(
    ctx: Context<PurchaseTicket>,
) -> Result<()> {
    let lottery = &mut ctx.accounts.lottery;
    let ticket = &mut ctx.accounts.ticket;
    let user_tickets = &mut ctx.accounts.user_tickets;

    require!(
        !lottery.is_drawn,
        ErrorCode::LotteryAlreadyDrawn
    );

    require!(
        lottery.current_tickets < lottery.max_tickets,
        ErrorCode::LotteryFull
    );

    require!(
        Clock::get()?.unix_timestamp < lottery.draw_timestamp,
        ErrorCode::LotteryExpired
    );

    // Transfer SOL to treasury
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        ),
        lottery.ticket_price,
    )?;

    // Update lottery
    lottery.current_tickets += 1;
    lottery.prize_pool += lottery.ticket_price;

    // Create ticket
    let ticket_number = lottery.current_tickets;
    ticket.owner = ctx.accounts.buyer.key();
    ticket.lottery = lottery.key();
    ticket.ticket_number = ticket_number;
    ticket.purchased_at = Clock::get()?.unix_timestamp;
    ticket.bump = ctx.bumps.ticket;

    // Update user tickets
    user_tickets.ticket_numbers.push(ticket_number);
    user_tickets.count += 1;

    Ok(())
}

#[derive(Accounts)]
#[instruction(lottery_id: u64)]
pub struct PurchaseTicket<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"lottery", lottery_id.to_le_bytes().as_ref()],
        bump = lottery.bump
    )]
    pub lottery: Account<'info, Lottery>,

    #[account(
        init,
        payer = buyer,
        space = Ticket::LEN,
        seeds = [
            b"ticket",
            lottery_id.to_le_bytes().as_ref(),
            lottery.current_tickets.checked_add(1).unwrap().to_le_bytes().as_ref()
        ],
        bump
    )]
    pub ticket: Account<'info, Ticket>,

    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + 32 + 32 + 4 + (4 + 1000 * 4) + 1,
        seeds = [b"user_tickets", buyer.key().as_ref(), lottery_id.to_le_bytes().as_ref()],
        bump
    )]
    pub user_tickets: Account<'info, UserTickets>,

    /// CHECK: Treasury wallet
    #[account(mut)]
    pub treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
```

### Instruction: Execute Draw

```rust
// programs/powersol-core/src/instructions/execute_draw.rs

use anchor_lang::prelude::*;
use crate::state::*;

pub fn execute_draw(
    ctx: Context<ExecuteDraw>,
    winning_ticket: u32,
) -> Result<()> {
    let lottery = &mut ctx.accounts.lottery;

    require!(
        !lottery.is_drawn,
        ErrorCode::LotteryAlreadyDrawn
    );

    require!(
        Clock::get()?.unix_timestamp >= lottery.draw_timestamp,
        ErrorCode::LotteryNotExpired
    );

    require!(
        winning_ticket > 0 && winning_ticket <= lottery.current_tickets,
        ErrorCode::InvalidWinningTicket
    );

    lottery.is_drawn = true;
    lottery.winning_ticket = Some(winning_ticket);

    Ok(())
}

#[derive(Accounts)]
#[instruction(lottery_id: u64)]
pub struct ExecuteDraw<'info> {
    #[account(
        mut,
        has_one = authority,
        seeds = [b"lottery", lottery_id.to_le_bytes().as_ref()],
        bump = lottery.bump
    )]
    pub lottery: Account<'info, Lottery>,

    pub authority: Signer<'info>,
}
```

---

## 💰 POWERSOL-CLAIM PROGRAM

### State: Claim Account

```rust
// programs/powersol-claim/src/state/claim.rs

use anchor_lang::prelude::*;

#[account]
pub struct Claim {
    pub claimer: Pubkey,
    pub lottery: Pubkey,
    pub ticket_number: u32,
    pub amount: u64,
    pub claimed_at: i64,
    pub bump: u8,
}

impl Claim {
    pub const LEN: usize = 8 + 32 + 32 + 4 + 8 + 8 + 1;
}
```

### Instruction: Claim Prize

```rust
// programs/powersol-claim/src/instructions/claim_prize.rs

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;

pub fn claim_prize(
    ctx: Context<ClaimPrize>,
) -> Result<()> {
    let lottery = &ctx.accounts.lottery;
    let ticket = &ctx.accounts.ticket;
    let claim = &mut ctx.accounts.claim;

    require!(
        lottery.is_drawn,
        ErrorCode::LotteryNotDrawn
    );

    require!(
        lottery.winning_ticket == Some(ticket.ticket_number),
        ErrorCode::NotWinningTicket
    );

    require!(
        ticket.owner == ctx.accounts.claimer.key(),
        ErrorCode::NotTicketOwner
    );

    // Calculate prize (70-80% of prize pool)
    let prize_percentage = get_prize_percentage(&lottery.lottery_type);
    let prize_amount = (lottery.prize_pool * prize_percentage) / 100;

    // Transfer from treasury to winner
    **ctx.accounts.treasury.try_borrow_mut_lamports()? -= prize_amount;
    **ctx.accounts.claimer.try_borrow_mut_lamports()? += prize_amount;

    // Record claim
    claim.claimer = ctx.accounts.claimer.key();
    claim.lottery = lottery.key();
    claim.ticket_number = ticket.ticket_number;
    claim.amount = prize_amount;
    claim.claimed_at = Clock::get()?.unix_timestamp;
    claim.bump = ctx.bumps.claim;

    Ok(())
}

fn get_prize_percentage(lottery_type: &LotteryType) -> u64 {
    match lottery_type {
        LotteryType::TriDaily { .. } => 70,
        LotteryType::Jackpot { .. } => 75,
        LotteryType::GrandPrize { .. } => 80,
        LotteryType::Xmas { .. } => 78,
    }
}

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    #[account(mut)]
    pub claimer: Signer<'info>,

    /// CHECK: Lottery account from core program
    pub lottery: AccountInfo<'info>,

    /// CHECK: Ticket account from core program
    pub ticket: AccountInfo<'info>,

    #[account(
        init,
        payer = claimer,
        space = Claim::LEN,
        seeds = [
            b"claim",
            claimer.key().as_ref(),
            lottery.key().as_ref()
        ],
        bump
    )]
    pub claim: Account<'info, Claim>,

    /// CHECK: Treasury wallet (PDA with authority)
    #[account(mut)]
    pub treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
```

---

## 🔧 BACKEND INTEGRATION

### Atualizar lib/anchor/programs.ts

```typescript
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { PowersolCore } from '../idl/powersol_core';
import { PowersolClaim } from '../idl/powersol_claim';

export function getCoreProgram(
  connection: Connection,
  wallet: any
): Program<PowersolCore> {
  const provider = new AnchorProvider(connection, wallet, {});
  const programId = new PublicKey(process.env.POWERSOL_CORE_PROGRAM_ID!);

  return new Program(
    require('../idl/powersol_core.json'),
    programId,
    provider
  );
}

export function getClaimProgram(
  connection: Connection,
  wallet: any
): Program<PowersolClaim> {
  const provider = new AnchorProvider(connection, wallet, {});
  const programId = new PublicKey(process.env.POWERSOL_CLAIM_PROGRAM_ID!);

  return new Program(
    require('../idl/powersol_claim.json'),
    programId,
    provider
  );
}
```

---

## 📋 CHECKLIST DE DEPLOY

### 1. Desenvolver Programas
- [ ] Criar powersol-core program
- [ ] Criar powersol-claim program
- [ ] Implementar todas instruções
- [ ] Adicionar testes

### 2. Testar em Devnet
- [ ] `anchor build`
- [ ] `anchor deploy --provider.cluster devnet`
- [ ] Copiar Program IDs
- [ ] Testar com backend em devnet

### 3. Gerar IDLs
- [ ] Copiar `target/idl/powersol_core.json` para `backend/src/lib/idl/`
- [ ] Copiar `target/idl/powersol_claim.json` para `backend/src/lib/idl/`

### 4. Atualizar Backend
- [ ] Atualizar PROGRAM_IDS no .env
- [ ] Atualizar imports dos IDLs
- [ ] Testar todas instruções

### 5. Deploy Mainnet
- [ ] `anchor build --verifiable`
- [ ] `anchor deploy --provider.cluster mainnet`
- [ ] Verificar programs no Solana Explorer
- [ ] Atualizar .env production

---

## 🎯 COMANDOS ÚTEIS

```bash
# Build
anchor build

# Deploy devnet
anchor deploy --provider.cluster devnet

# Deploy mainnet
anchor deploy --provider.cluster mainnet

# Verificar program
solana program show <PROGRAM_ID>

# Ver logs
solana logs <PROGRAM_ID>

# Atualizar program
anchor upgrade target/deploy/powersol_core.so --program-id <ID>
```

---

**Programas Anchor + Backend = PowerSOL Completo! ⚓🚀**
