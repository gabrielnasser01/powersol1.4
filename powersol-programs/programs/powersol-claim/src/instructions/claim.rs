use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ClaimError;

pub fn init_prize_vault(ctx: Context<InitPrizeVault>, lottery_type: u8) -> Result<()> {
    let vault = &mut ctx.accounts.prize_vault;
    vault.authority = ctx.accounts.authority.key();
    vault.lottery_type = lottery_type;
    vault.total_deposited = 0;
    vault.total_claimed = 0;
    vault.current_round = 0;
    vault.bump = ctx.bumps.prize_vault;
    Ok(())
}

pub fn register_winner(
    ctx: Context<RegisterWinner>,
    lottery_round: u64,
    tier: u8,
    amount: u64,
) -> Result<()> {
    let winner_record = &mut ctx.accounts.winner_record;
    let prize_vault = &mut ctx.accounts.prize_vault;
    let clock = Clock::get()?;

    require!(tier >= 1 && tier <= 5, ClaimError::InvalidTier);
    require!(amount > 0, ClaimError::InvalidAmount);

    winner_record.winner = ctx.accounts.winner.key();
    winner_record.prize_vault = prize_vault.key();
    winner_record.lottery_round = lottery_round;
    winner_record.tier = tier;
    winner_record.amount = amount;
    winner_record.claimed = false;
    winner_record.registered_at = clock.unix_timestamp;
    winner_record.claimed_at = 0;
    winner_record.claim_signature = [0u8; 64];
    winner_record.bump = ctx.bumps.winner_record;

    emit!(WinnerRegisteredEvent {
        winner: ctx.accounts.winner.key(),
        lottery_type: prize_vault.lottery_type,
        lottery_round,
        tier,
        amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn claim_lottery_prize(ctx: Context<ClaimLotteryPrize>) -> Result<()> {
    let winner_record = &mut ctx.accounts.winner_record;
    let prize_vault = &mut ctx.accounts.prize_vault;
    let clock = Clock::get()?;

    require!(!winner_record.claimed, ClaimError::PrizeAlreadyClaimed);
    require!(
        winner_record.winner == ctx.accounts.claimer.key(),
        ClaimError::NotTicketOwner
    );

    let amount = winner_record.amount;

    let vault_balance = ctx.accounts.prize_vault_pda.lamports();
    require!(vault_balance >= amount, ClaimError::InsufficientFunds);

    let lottery_type = prize_vault.lottery_type;
    let vault_key = prize_vault.key();
    let seeds = &[
        b"vault_sol" as &[u8],
        &[lottery_type],
        vault_key.as_ref(),
        &[ctx.bumps.prize_vault_pda],
    ];
    let signer_seeds = &[&seeds[..]];

    **ctx.accounts.prize_vault_pda.try_borrow_mut_lamports()? = ctx
        .accounts
        .prize_vault_pda
        .lamports()
        .checked_sub(amount)
        .ok_or(ClaimError::ArithmeticOverflow)?;

    **ctx.accounts.claimer.try_borrow_mut_lamports()? = ctx
        .accounts
        .claimer
        .lamports()
        .checked_add(amount)
        .ok_or(ClaimError::ArithmeticOverflow)?;

    prize_vault.total_claimed = prize_vault
        .total_claimed
        .checked_add(amount)
        .ok_or(ClaimError::ArithmeticOverflow)?;

    winner_record.claimed = true;
    winner_record.claimed_at = clock.unix_timestamp;

    emit!(PrizeClaimEvent {
        claimer: ctx.accounts.claimer.key(),
        lottery_type,
        lottery_round: winner_record.lottery_round,
        tier: winner_record.tier,
        amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn advance_round(ctx: Context<AdvanceRound>) -> Result<()> {
    let prize_vault = &mut ctx.accounts.prize_vault;
    prize_vault.current_round = prize_vault
        .current_round
        .checked_add(1)
        .ok_or(ClaimError::ArithmeticOverflow)?;
    Ok(())
}

pub fn claim_affiliate_rewards(
    ctx: Context<ClaimAffiliateRewards>,
    amount: u64,
    tier: u8,
    week_number: u64,
    referral_count: u32,
) -> Result<()> {
    let affiliate_claim = &mut ctx.accounts.affiliate_claim;
    let affiliate_pool = &mut ctx.accounts.affiliate_pool;
    let accumulator = &mut ctx.accounts.accumulator;
    let clock = Clock::get()?;

    require!(tier >= 1 && tier <= 4, ClaimError::InvalidTier);
    require!(amount > 0, ClaimError::InvalidAmount);

    let current_week = calculate_current_week(clock.unix_timestamp);
    require!(
        week_number < current_week || is_after_wednesday_release(clock.unix_timestamp),
        ClaimError::ClaimNotYetAvailable
    );

    require!(
        accumulator.pending_amount >= amount,
        ClaimError::InsufficientPendingRewards
    );
    require!(
        affiliate_pool.total_deposited >= affiliate_pool.total_claimed + amount,
        ClaimError::InsufficientFunds
    );

    **ctx.accounts.affiliate_pool_vault.try_borrow_mut_lamports()? = ctx
        .accounts
        .affiliate_pool_vault
        .lamports()
        .checked_sub(amount)
        .ok_or(ClaimError::ArithmeticOverflow)?;

    **ctx.accounts.affiliate.try_borrow_mut_lamports()? = ctx
        .accounts
        .affiliate
        .lamports()
        .checked_add(amount)
        .ok_or(ClaimError::ArithmeticOverflow)?;

    affiliate_pool.total_claimed = affiliate_pool
        .total_claimed
        .checked_add(amount)
        .ok_or(ClaimError::ArithmeticOverflow)?;

    accumulator.pending_amount = accumulator
        .pending_amount
        .checked_sub(amount)
        .ok_or(ClaimError::ArithmeticOverflow)?;

    affiliate_claim.affiliate = ctx.accounts.affiliate.key();
    affiliate_claim.amount = amount;
    affiliate_claim.tier = tier;
    affiliate_claim.week_number = week_number;
    affiliate_claim.referral_count = referral_count;
    affiliate_claim.claimed_at = clock.unix_timestamp;
    affiliate_claim.bump = ctx.bumps.affiliate_claim;

    emit!(AffiliateClaimEvent {
        affiliate: ctx.accounts.affiliate.key(),
        tier,
        amount,
        week_number,
        referral_count,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn accumulate_affiliate_earnings(
    ctx: Context<AccumulateAffiliateEarnings>,
    amount: u64,
    tier: u8,
) -> Result<()> {
    let accumulator = &mut ctx.accounts.accumulator;
    let affiliate_pool = &mut ctx.accounts.affiliate_pool;
    let clock = Clock::get()?;

    let current_week = calculate_current_week(clock.unix_timestamp);

    if accumulator.week_number != current_week {
        accumulator.week_number = current_week;
    }

    accumulator.pending_amount = accumulator
        .pending_amount
        .checked_add(amount)
        .ok_or(ClaimError::ArithmeticOverflow)?;
    accumulator.tier = tier.max(accumulator.tier);
    accumulator.referral_count = accumulator
        .referral_count
        .checked_add(1)
        .ok_or(ClaimError::ArithmeticOverflow)?;
    accumulator.last_updated = clock.unix_timestamp;

    affiliate_pool.total_deposited = affiliate_pool
        .total_deposited
        .checked_add(amount)
        .ok_or(ClaimError::ArithmeticOverflow)?;

    emit!(AffiliateEarningAccumulated {
        affiliate: accumulator.affiliate,
        amount,
        tier,
        week_number: current_week,
        total_pending: accumulator.pending_amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn initialize_prize_pool(ctx: Context<InitializePrizePool>, lottery_type: u8) -> Result<()> {
    let prize_pool = &mut ctx.accounts.prize_pool;

    prize_pool.authority = ctx.accounts.authority.key();
    prize_pool.lottery_type = lottery_type;
    prize_pool.total_deposited = 0;
    prize_pool.total_claimed = 0;
    prize_pool.current_round = 0;
    prize_pool.vrf_completed = false;
    prize_pool.bump = ctx.bumps.prize_pool;

    Ok(())
}

pub fn initialize_affiliate_pool(ctx: Context<InitializeAffiliatePool>) -> Result<()> {
    let affiliate_pool = &mut ctx.accounts.affiliate_pool;
    let clock = Clock::get()?;

    affiliate_pool.authority = ctx.accounts.authority.key();
    affiliate_pool.total_deposited = 0;
    affiliate_pool.total_claimed = 0;
    affiliate_pool.current_week = calculate_current_week(clock.unix_timestamp);
    affiliate_pool.last_release_timestamp = clock.unix_timestamp;
    affiliate_pool.bump = ctx.bumps.affiliate_pool;

    Ok(())
}

pub fn initialize_accumulator(ctx: Context<InitializeAccumulator>) -> Result<()> {
    let accumulator = &mut ctx.accounts.accumulator;
    let clock = Clock::get()?;

    accumulator.affiliate = ctx.accounts.affiliate.key();
    accumulator.pending_amount = 0;
    accumulator.tier = 1;
    accumulator.referral_count = 0;
    accumulator.week_number = calculate_current_week(clock.unix_timestamp);
    accumulator.last_updated = clock.unix_timestamp;
    accumulator.bump = ctx.bumps.accumulator;

    Ok(())
}

pub fn set_vrf_completed(ctx: Context<SetVrfCompleted>, completed: bool) -> Result<()> {
    let prize_pool = &mut ctx.accounts.prize_pool;
    prize_pool.vrf_completed = completed;
    if completed {
        prize_pool.current_round = prize_pool
            .current_round
            .checked_add(1)
            .ok_or(ClaimError::ArithmeticOverflow)?;
    }
    Ok(())
}

pub fn deposit_to_prize_pool(ctx: Context<DepositToPrizePool>, amount: u64) -> Result<()> {
    let prize_pool = &mut ctx.accounts.prize_pool;

    let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.depositor.key(),
        &ctx.accounts.prize_pool_vault.key(),
        amount,
    );

    anchor_lang::solana_program::program::invoke(
        &transfer_ix,
        &[
            ctx.accounts.depositor.to_account_info(),
            ctx.accounts.prize_pool_vault.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    prize_pool.total_deposited = prize_pool
        .total_deposited
        .checked_add(amount)
        .ok_or(ClaimError::ArithmeticOverflow)?;

    Ok(())
}

pub fn deposit_to_affiliate_pool(ctx: Context<DepositToAffiliatePool>, amount: u64) -> Result<()> {
    let affiliate_pool = &mut ctx.accounts.affiliate_pool;

    let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.depositor.key(),
        &ctx.accounts.affiliate_pool_vault.key(),
        amount,
    );

    anchor_lang::solana_program::program::invoke(
        &transfer_ix,
        &[
            ctx.accounts.depositor.to_account_info(),
            ctx.accounts.affiliate_pool_vault.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    affiliate_pool.total_deposited = affiliate_pool
        .total_deposited
        .checked_add(amount)
        .ok_or(ClaimError::ArithmeticOverflow)?;

    Ok(())
}

// === Account Structs ===

#[derive(Accounts)]
#[instruction(lottery_type: u8)]
pub struct InitPrizeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = PrizeVault::MAX_SIZE,
        seeds = [b"prize_vault", &[lottery_type]],
        bump
    )]
    pub prize_vault: Account<'info, PrizeVault>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(lottery_round: u64, tier: u8, amount: u64)]
pub struct RegisterWinner<'info> {
    #[account(
        mut,
        constraint = authority.key() == prize_vault.authority @ ClaimError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"prize_vault", &[prize_vault.lottery_type]],
        bump = prize_vault.bump,
    )]
    pub prize_vault: Account<'info, PrizeVault>,

    /// CHECK: The winner's wallet address
    pub winner: AccountInfo<'info>,

    #[account(
        init,
        payer = authority,
        space = WinnerRecord::MAX_SIZE,
        seeds = [
            b"winner",
            prize_vault.key().as_ref(),
            winner.key().as_ref(),
            &lottery_round.to_le_bytes(),
            &[tier],
        ],
        bump
    )]
    pub winner_record: Account<'info, WinnerRecord>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimLotteryPrize<'info> {
    #[account(mut)]
    pub claimer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"prize_vault", &[prize_vault.lottery_type]],
        bump = prize_vault.bump,
    )]
    pub prize_vault: Account<'info, PrizeVault>,

    /// CHECK: PDA that holds SOL for this lottery type
    #[account(
        mut,
        seeds = [b"vault_sol", &[prize_vault.lottery_type], prize_vault.key().as_ref()],
        bump,
    )]
    pub prize_vault_pda: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [
            b"winner",
            prize_vault.key().as_ref(),
            claimer.key().as_ref(),
            &winner_record.lottery_round.to_le_bytes(),
            &[winner_record.tier],
        ],
        bump = winner_record.bump,
        constraint = winner_record.winner == claimer.key() @ ClaimError::NotTicketOwner,
        constraint = !winner_record.claimed @ ClaimError::PrizeAlreadyClaimed,
    )]
    pub winner_record: Account<'info, WinnerRecord>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdvanceRound<'info> {
    #[account(
        mut,
        constraint = authority.key() == prize_vault.authority @ ClaimError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"prize_vault", &[prize_vault.lottery_type]],
        bump = prize_vault.bump,
    )]
    pub prize_vault: Account<'info, PrizeVault>,
}

#[derive(Accounts)]
#[instruction(amount: u64, tier: u8, week_number: u64, referral_count: u32)]
pub struct ClaimAffiliateRewards<'info> {
    #[account(mut)]
    pub affiliate: Signer<'info>,

    #[account(
        mut,
        seeds = [b"affiliate_pool"],
        bump = affiliate_pool.bump,
    )]
    pub affiliate_pool: Account<'info, AffiliatePool>,

    /// CHECK: PDA vault for affiliate pool
    #[account(
        mut,
        seeds = [b"affiliate_vault"],
        bump,
    )]
    pub affiliate_pool_vault: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"accumulator", affiliate.key().as_ref()],
        bump = accumulator.bump,
        constraint = accumulator.affiliate == affiliate.key() @ ClaimError::Unauthorized,
    )]
    pub accumulator: Account<'info, AffiliateAccumulator>,

    #[account(
        init,
        payer = affiliate,
        space = AffiliateClaim::MAX_SIZE,
        seeds = [
            b"affiliate_claim",
            affiliate.key().as_ref(),
            &week_number.to_le_bytes(),
        ],
        bump
    )]
    pub affiliate_claim: Account<'info, AffiliateClaim>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AccumulateAffiliateEarnings<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"affiliate_pool"],
        bump = affiliate_pool.bump,
    )]
    pub affiliate_pool: Account<'info, AffiliatePool>,

    #[account(
        mut,
        seeds = [b"accumulator", accumulator.affiliate.as_ref()],
        bump = accumulator.bump,
    )]
    pub accumulator: Account<'info, AffiliateAccumulator>,
}

#[derive(Accounts)]
#[instruction(lottery_type: u8)]
pub struct InitializePrizePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = PrizePool::MAX_SIZE,
        seeds = [b"prize_pool", &[lottery_type]],
        bump
    )]
    pub prize_pool: Account<'info, PrizePool>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeAffiliatePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = AffiliatePool::MAX_SIZE,
        seeds = [b"affiliate_pool"],
        bump
    )]
    pub affiliate_pool: Account<'info, AffiliatePool>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeAccumulator<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: The affiliate wallet address
    pub affiliate: AccountInfo<'info>,

    #[account(
        init,
        payer = payer,
        space = AffiliateAccumulator::MAX_SIZE,
        seeds = [b"accumulator", affiliate.key().as_ref()],
        bump
    )]
    pub accumulator: Account<'info, AffiliateAccumulator>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetVrfCompleted<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"prize_pool", &[prize_pool.lottery_type]],
        bump = prize_pool.bump,
        constraint = prize_pool.authority == authority.key() @ ClaimError::Unauthorized,
    )]
    pub prize_pool: Account<'info, PrizePool>,
}

#[derive(Accounts)]
pub struct DepositToPrizePool<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"prize_pool", &[prize_pool.lottery_type]],
        bump = prize_pool.bump,
    )]
    pub prize_pool: Account<'info, PrizePool>,

    /// CHECK: PDA vault
    #[account(
        mut,
        seeds = [b"prize_vault", prize_pool.key().as_ref()],
        bump,
    )]
    pub prize_pool_vault: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositToAffiliatePool<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"affiliate_pool"],
        bump = affiliate_pool.bump,
    )]
    pub affiliate_pool: Account<'info, AffiliatePool>,

    /// CHECK: PDA vault
    #[account(
        mut,
        seeds = [b"affiliate_vault"],
        bump,
    )]
    pub affiliate_pool_vault: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

// === Events ===

#[event]
pub struct WinnerRegisteredEvent {
    pub winner: Pubkey,
    pub lottery_type: u8,
    pub lottery_round: u64,
    pub tier: u8,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct PrizeClaimEvent {
    pub claimer: Pubkey,
    pub lottery_type: u8,
    pub lottery_round: u64,
    pub tier: u8,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct AffiliateClaimEvent {
    pub affiliate: Pubkey,
    pub tier: u8,
    pub amount: u64,
    pub week_number: u64,
    pub referral_count: u32,
    pub timestamp: i64,
}

#[event]
pub struct AffiliateEarningAccumulated {
    pub affiliate: Pubkey,
    pub amount: u64,
    pub tier: u8,
    pub week_number: u64,
    pub total_pending: u64,
    pub timestamp: i64,
}
