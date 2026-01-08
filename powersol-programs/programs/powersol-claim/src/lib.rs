use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("DX1rjpefmrBR8hASnExE3qCBpjpFEkUY4JEoTLmuU2JK");

#[program]
pub mod powersol_claim {
    use super::*;

    pub fn initialize_prize_pool(ctx: Context<InitializePrizePool>, lottery_type: u8) -> Result<()> {
        instructions::initialize_prize_pool(ctx, lottery_type)
    }

    pub fn initialize_affiliate_pool(ctx: Context<InitializeAffiliatePool>) -> Result<()> {
        instructions::initialize_affiliate_pool(ctx)
    }

    pub fn initialize_accumulator(ctx: Context<InitializeAccumulator>) -> Result<()> {
        instructions::initialize_accumulator(ctx)
    }

    pub fn deposit_to_prize_pool(ctx: Context<DepositToPrizePool>, amount: u64) -> Result<()> {
        instructions::deposit_to_prize_pool(ctx, amount)
    }

    pub fn deposit_to_affiliate_pool(ctx: Context<DepositToAffiliatePool>, amount: u64) -> Result<()> {
        instructions::deposit_to_affiliate_pool(ctx, amount)
    }

    pub fn accumulate_affiliate_earnings(
        ctx: Context<AccumulateAffiliateEarnings>,
        amount: u64,
        tier: u8,
    ) -> Result<()> {
        instructions::accumulate_affiliate_earnings(ctx, amount, tier)
    }

    pub fn set_vrf_completed(ctx: Context<SetVrfCompleted>, completed: bool) -> Result<()> {
        instructions::set_vrf_completed(ctx, completed)
    }

    pub fn claim_lottery_prize(
        ctx: Context<ClaimLotteryPrize>,
        amount: u64,
        tier: u8,
        lottery_round: u64,
    ) -> Result<()> {
        instructions::claim_lottery_prize(ctx, amount, tier, lottery_round)
    }

    pub fn claim_affiliate_rewards(
        ctx: Context<ClaimAffiliateRewards>,
        amount: u64,
        tier: u8,
        week_number: u64,
        referral_count: u32,
    ) -> Result<()> {
        instructions::claim_affiliate_rewards(ctx, amount, tier, week_number, referral_count)
    }
}
