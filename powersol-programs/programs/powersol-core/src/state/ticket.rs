use anchor_lang::prelude::*;

#[account]
pub struct Ticket {
    pub owner: Pubkey,
    pub lottery: Pubkey,
    pub ticket_number: u32,
    pub purchased_at: i64,
    pub affiliate_code: Option<String>,
    pub is_winner: bool,
    pub tier: Option<u8>,
    pub claimed: bool,
    pub bump: u8,
}

impl Ticket {
    pub const MAX_SIZE: usize = 8 +
        32 +
        32 +
        4 +
        8 +
        (1 + 4 + 32) +
        1 +
        (1 + 1) +
        1 +
        1;
}

#[account]
pub struct UserTickets {
    pub user: Pubkey,
    pub lottery: Pubkey,
    pub ticket_numbers: Vec<u32>,
    pub count: u32,
    pub bump: u8,
}

impl UserTickets {
    pub const MAX_SIZE: usize = 8 +
        32 +
        32 +
        (4 + 1000 * 4) +
        4 +
        1;
}
