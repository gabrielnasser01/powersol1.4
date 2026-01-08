use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ClaimError;

pub fn claim_lottery_prize(
    ctx: Context<ClaimLotteryPrize>,
    amount: u64,
    tier: u8,
    lottery_round: u64,
) -> Result<()> {
    let prize_claim = &mut ctx.accounts.prize_claim;
    let prize_pool = &mut ctx.accounts.prize_pool;
    let clock = Clock::get()?;

    require!(tier >= 1 && tier <= 5, ClaimError::InvalidTier);
    require!(amount > 0, ClaimError::InvalidAmount);
    require!(prize_pool.vrf_completed, ClaimError::VrfNotCompleted);
    require!(
        prize_pool.total_deposited >= prize_pool.total_claimed + amount,
        ClaimError::InsufficientFunds
    );

    **ctx.accounts.prize_pool_vault.try_borrow_mut_lamports()? = ctx
        .accounts
        .prize_pool_vault
        .lamports()
        .checked_sub(amount)
        .ok_or(ClaimError::ArithmeticOverflow)?;

    **ctx.accounts.claimer.try_borrow_mut_lamports()? = ctx
        .accounts
        .claimer
        .lamports()
        .checked_add(amount)
        .ok_or(ClaimError::ArithmeticOverflow)?;

    prize_pool.total_claimed = prize_pool
        .total_claimed
        .checked_add(amount)
        .ok_or(ClaimError::ArithmeticOverflow)?;

    prize_claim.claimer = ctx.accounts.claimer.key();
    prize_claim.lottery_pool = prize_pool.key();
    prize_claim.lottery_round = lottery_round;
    prize_claim.tier = tier;
    prize_claim.amount = amount;
    prize_claim.vrf_verified = true;
    prize_claim.claimed_at = clock.unix_timestamp;
    prize_claim.bump = ctx.bumps.prize_claim;

    emit!(PrizeClaimEvent {
        claimer: ctx.accounts.claimer.key(),
        lottery_type: prize_pool.lottery_type,
        lottery_round,
        tier,
        amount,
        timestamp: clock.unix_timestamp,
    });

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

#[derive(Accounts)]
#[instruction(amount: u64, tier: u8, lottery_round: u64)]
pub struct ClaimLotteryPrize<'info> {
    #[account(mut)]
    pub claimer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"prize_pool", &[prize_pool.lottery_type]],
        bump = prize_pool.bump,
    )]
    pub prize_pool: Account<'info, PrizePool>,

    /// CHECK: PDA vault for prize pool
    #[account(
        mut,
        seeds = [b"prize_vault", prize_pool.key().as_ref()],
        bump,
    )]
    pub prize_pool_vault: AccountInfo<'info>,

    #[account(
        init,
        payer = claimer,
        space = PrizeClaim::MAX_SIZE,
        seeds = [
            b"prize_claim",
            claimer.key().as_ref(),
            prize_pool.key().as_ref(),
            &lottery_round.to_le_bytes(),
        ],
        bump
    )]
    pub prize_claim: Account<'info, PrizeClaim>,

    pub system_program: Program<'info, System>,
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
