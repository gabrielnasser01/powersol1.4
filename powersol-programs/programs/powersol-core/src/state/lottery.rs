use anchor_lang::prelude::*;

#[account]
pub struct Lottery {
    pub authority: Pubkey,
    pub lottery_id: u64,
    pub lottery_type: LotteryType,
    pub ticket_price: u64,
    pub max_tickets: u32,
    pub current_tickets: u32,
    pub draw_timestamp: i64,
    pub is_drawn: bool,
    pub winning_tickets: Vec<u32>,
    pub treasury: Pubkey,
    pub affiliates_pool: Pubkey,
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
    pub const MAX_SIZE: usize = 8 +
        32 +
        8 +
        (1 + 32) +
        8 +
        4 +
        4 +
        8 +
        1 +
        (4 + 100 * 4) +
        32 +
        32 +
        8 +
        1;

    pub fn is_expired(&self, current_timestamp: i64) -> bool {
        current_timestamp >= self.draw_timestamp
    }

    pub fn can_purchase(&self, current_timestamp: i64) -> bool {
        !self.is_drawn
            && self.current_tickets < self.max_tickets
            && !self.is_expired(current_timestamp)
    }

    pub fn can_draw(&self, current_timestamp: i64) -> bool {
        !self.is_drawn && self.is_expired(current_timestamp)
    }
}
