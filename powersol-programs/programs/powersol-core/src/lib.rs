use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("GqfdkAjpFJMZnzRaLrgeoBCr7exvSfqSib1wSJM49BxW");

#[program]
pub mod powersol_core {
    use super::*;

    pub fn initialize_tri_daily_lottery(
        ctx: Context<InitializeTriDailyLottery>,
        round: u64,
        ticket_price: u64,
        max_tickets: u32,
        draw_timestamp: i64,
    ) -> Result<()> {
        instructions::initialize_tri_daily_lottery(ctx, round, ticket_price, max_tickets, draw_timestamp)
    }

    pub fn initialize_jackpot_lottery(
        ctx: Context<InitializeJackpotLottery>,
        month: u16,
        year: u32,
        ticket_price: u64,
        max_tickets: u32,
        draw_timestamp: i64,
    ) -> Result<()> {
        instructions::initialize_jackpot_lottery(ctx, month, year, ticket_price, max_tickets, draw_timestamp)
    }

    pub fn initialize_grand_prize_lottery(
        ctx: Context<InitializeGrandPrizeLottery>,
        year: u32,
        ticket_price: u64,
        max_tickets: u32,
        draw_timestamp: i64,
    ) -> Result<()> {
        instructions::initialize_grand_prize_lottery(ctx, year, ticket_price, max_tickets, draw_timestamp)
    }

    pub fn initialize_xmas_lottery(
        ctx: Context<InitializeXmasLottery>,
        year: u32,
        ticket_price: u64,
        max_tickets: u32,
        draw_timestamp: i64,
    ) -> Result<()> {
        instructions::initialize_xmas_lottery(ctx, year, ticket_price, max_tickets, draw_timestamp)
    }

    pub fn purchase_ticket(
        ctx: Context<PurchaseTicket>,
        affiliate_code: Option<String>,
    ) -> Result<()> {
        instructions::purchase_ticket(ctx, affiliate_code)
    }

    pub fn execute_draw(
        ctx: Context<ExecuteDraw>,
        winning_tickets: Vec<u32>,
    ) -> Result<()> {
        instructions::execute_draw(ctx, winning_tickets)
    }

    pub fn close_lottery(
        ctx: Context<CloseLottery>,
    ) -> Result<()> {
        instructions::close_lottery(ctx)
    }
}
