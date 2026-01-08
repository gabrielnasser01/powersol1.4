use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::LotteryError;

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
    lottery.winning_tickets = Vec::new();
    lottery.treasury = ctx.accounts.treasury.key();
    lottery.affiliates_pool = ctx.accounts.affiliates_pool.key();
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
        space = Lottery::MAX_SIZE,
        seeds = [b"tri_daily", round.to_le_bytes().as_ref()],
        bump
    )]
    pub lottery: Account<'info, Lottery>,

    /// CHECK: Treasury wallet
    pub treasury: AccountInfo<'info>,

    /// CHECK: Affiliates pool wallet
    pub affiliates_pool: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_jackpot_lottery(
    ctx: Context<InitializeJackpotLottery>,
    month: u16,
    year: u32,
    ticket_price: u64,
    max_tickets: u32,
    draw_timestamp: i64,
) -> Result<()> {
    let lottery = &mut ctx.accounts.lottery;

    lottery.authority = ctx.accounts.authority.key();
    lottery.lottery_id = (year as u64 * 100) + month as u64;
    lottery.lottery_type = LotteryType::Jackpot { month, year };
    lottery.ticket_price = ticket_price;
    lottery.max_tickets = max_tickets;
    lottery.current_tickets = 0;
    lottery.draw_timestamp = draw_timestamp;
    lottery.is_drawn = false;
    lottery.winning_tickets = Vec::new();
    lottery.treasury = ctx.accounts.treasury.key();
    lottery.affiliates_pool = ctx.accounts.affiliates_pool.key();
    lottery.prize_pool = 0;
    lottery.bump = ctx.bumps.lottery;

    Ok(())
}

#[derive(Accounts)]
#[instruction(month: u16, year: u32)]
pub struct InitializeJackpotLottery<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = Lottery::MAX_SIZE,
        seeds = [
            b"jackpot",
            month.to_le_bytes().as_ref(),
            year.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub lottery: Account<'info, Lottery>,

    /// CHECK: Treasury wallet
    pub treasury: AccountInfo<'info>,

    /// CHECK: Affiliates pool wallet
    pub affiliates_pool: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_grand_prize_lottery(
    ctx: Context<InitializeGrandPrizeLottery>,
    year: u32,
    ticket_price: u64,
    max_tickets: u32,
    draw_timestamp: i64,
) -> Result<()> {
    let lottery = &mut ctx.accounts.lottery;

    lottery.authority = ctx.accounts.authority.key();
    lottery.lottery_id = year as u64;
    lottery.lottery_type = LotteryType::GrandPrize { year };
    lottery.ticket_price = ticket_price;
    lottery.max_tickets = max_tickets;
    lottery.current_tickets = 0;
    lottery.draw_timestamp = draw_timestamp;
    lottery.is_drawn = false;
    lottery.winning_tickets = Vec::new();
    lottery.treasury = ctx.accounts.treasury.key();
    lottery.affiliates_pool = ctx.accounts.affiliates_pool.key();
    lottery.prize_pool = 0;
    lottery.bump = ctx.bumps.lottery;

    Ok(())
}

#[derive(Accounts)]
#[instruction(year: u32)]
pub struct InitializeGrandPrizeLottery<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = Lottery::MAX_SIZE,
        seeds = [b"grand_prize", year.to_le_bytes().as_ref()],
        bump
    )]
    pub lottery: Account<'info, Lottery>,

    /// CHECK: Treasury wallet
    pub treasury: AccountInfo<'info>,

    /// CHECK: Affiliates pool wallet
    pub affiliates_pool: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_xmas_lottery(
    ctx: Context<InitializeXmasLottery>,
    year: u32,
    ticket_price: u64,
    max_tickets: u32,
    draw_timestamp: i64,
) -> Result<()> {
    let lottery = &mut ctx.accounts.lottery;

    lottery.authority = ctx.accounts.authority.key();
    lottery.lottery_id = year as u64;
    lottery.lottery_type = LotteryType::Xmas { year };
    lottery.ticket_price = ticket_price;
    lottery.max_tickets = max_tickets;
    lottery.current_tickets = 0;
    lottery.draw_timestamp = draw_timestamp;
    lottery.is_drawn = false;
    lottery.winning_tickets = Vec::new();
    lottery.treasury = ctx.accounts.treasury.key();
    lottery.affiliates_pool = ctx.accounts.affiliates_pool.key();
    lottery.prize_pool = 0;
    lottery.bump = ctx.bumps.lottery;

    Ok(())
}

#[derive(Accounts)]
#[instruction(year: u32)]
pub struct InitializeXmasLottery<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = Lottery::MAX_SIZE,
        seeds = [b"xmas", year.to_le_bytes().as_ref()],
        bump
    )]
    pub lottery: Account<'info, Lottery>,

    /// CHECK: Treasury wallet
    pub treasury: AccountInfo<'info>,

    /// CHECK: Affiliates pool wallet
    pub affiliates_pool: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
