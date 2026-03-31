use anchor_lang::prelude::*;

#[account]
pub struct PrizeClaim {
    pub claimer: Pubkey,
    pub lottery_pool: Pubkey,
    pub lottery_round: u64,
    pub tier: u8,
    pub amount: u64,
    pub vrf_verified: bool,
    pub claimed_at: i64,
    pub bump: u8,
}

impl PrizeClaim {
    pub const MAX_SIZE: usize = 8 + 32 + 32 + 8 + 1 + 8 + 1 + 8 + 1;
}

#[account]
pub struct AffiliateClaim {
    pub affiliate: Pubkey,
    pub amount: u64,
    pub tier: u8,
    pub week_number: u64,
    pub referral_count: u32,
    pub claimed_at: i64,
    pub bump: u8,
}

impl AffiliateClaim {
    pub const MAX_SIZE: usize = 8 + 32 + 8 + 1 + 8 + 4 + 8 + 1;
}

#[account]
pub struct AffiliatePool {
    pub authority: Pubkey,
    pub total_deposited: u64,
    pub total_claimed: u64,
    pub current_week: u64,
    pub last_release_timestamp: i64,
    pub bump: u8,
}

impl AffiliatePool {
    pub const MAX_SIZE: usize = 8 + 32 + 8 + 8 + 8 + 8 + 1;

    pub const SECONDS_PER_WEEK: i64 = 604800;
    pub const WEDNESDAY_OFFSET: i64 = 259199;
}

#[account]
pub struct PrizePool {
    pub authority: Pubkey,
    pub lottery_type: u8,
    pub total_deposited: u64,
    pub total_claimed: u64,
    pub current_round: u64,
    pub vrf_completed: bool,
    pub bump: u8,
}

impl PrizePool {
    pub const MAX_SIZE: usize = 8 + 32 + 1 + 8 + 8 + 8 + 1 + 1;
}

#[account]
pub struct AffiliateAccumulator {
    pub affiliate: Pubkey,
    pub pending_amount: u64,
    pub tier: u8,
    pub referral_count: u32,
    pub week_number: u64,
    pub last_updated: i64,
    pub bump: u8,
}

impl AffiliateAccumulator {
    pub const MAX_SIZE: usize = 8 + 32 + 8 + 1 + 4 + 8 + 8 + 1;
}

pub fn get_affiliate_commission_rate(tier: u8) -> u8 {
    match tier {
        1 => 5,
        2 => 10,
        3 => 20,
        4 => 30,
        _ => 5,
    }
}

pub fn get_prize_tier_percentage_bps(tier: u8, lottery_type: u8) -> u16 {
    if lottery_type == 3 {
        match tier {
            1 => 5000,
            2 => 3000,
            3 => 2000,
            _ => 0,
        }
    } else {
        match tier {
            1 => 2000,
            2 => 1000,
            3 => 1250,
            4 => 2750,
            5 => 3000,
            _ => 0,
        }
    }
}

pub fn calculate_current_week(timestamp: i64) -> u64 {
    let epoch_start: i64 = 345600;
    ((timestamp - epoch_start) / AffiliatePool::SECONDS_PER_WEEK) as u64
}

pub fn is_after_wednesday_release(timestamp: i64) -> bool {
    let epoch_start: i64 = 345600;
    let week_progress = (timestamp - epoch_start) % AffiliatePool::SECONDS_PER_WEEK;
    week_progress >= AffiliatePool::WEDNESDAY_OFFSET
}
