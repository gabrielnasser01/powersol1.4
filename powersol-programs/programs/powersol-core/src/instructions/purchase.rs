use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::errors::LotteryError;

pub fn purchase_ticket(
    ctx: Context<PurchaseTicket>,
    affiliate_code: Option<String>,
) -> Result<()> {
    let lottery = &mut ctx.accounts.lottery;
    let ticket = &mut ctx.accounts.ticket;
    let user_tickets = &mut ctx.accounts.user_tickets;
    let clock = Clock::get()?;

    require!(
        lottery.can_purchase(clock.unix_timestamp),
        LotteryError::LotteryExpired
    );

    require!(
        lottery.current_tickets < lottery.max_tickets,
        LotteryError::LotteryFull
    );

    let ticket_price = lottery.ticket_price;

    let prize_pool_amount = ticket_price
        .checked_mul(40)
        .ok_or(LotteryError::ArithmeticOverflow)?
        .checked_div(100)
        .ok_or(LotteryError::ArithmeticOverflow)?;

    let treasury_amount = ticket_price
        .checked_mul(30)
        .ok_or(LotteryError::ArithmeticOverflow)?
        .checked_div(100)
        .ok_or(LotteryError::ArithmeticOverflow)?;

    let affiliates_amount = ticket_price
        .checked_mul(30)
        .ok_or(LotteryError::ArithmeticOverflow)?
        .checked_div(100)
        .ok_or(LotteryError::ArithmeticOverflow)?;

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.lottery.to_account_info(),
            },
        ),
        prize_pool_amount,
    )?;

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        ),
        treasury_amount,
    )?;

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.affiliates_pool.to_account_info(),
            },
        ),
        affiliates_amount,
    )?;

    lottery.current_tickets = lottery.current_tickets
        .checked_add(1)
        .ok_or(LotteryError::ArithmeticOverflow)?;

    lottery.prize_pool = lottery.prize_pool
        .checked_add(prize_pool_amount)
        .ok_or(LotteryError::ArithmeticOverflow)?;

    let ticket_number = lottery.current_tickets;
    ticket.owner = ctx.accounts.buyer.key();
    ticket.lottery = lottery.key();
    ticket.ticket_number = ticket_number;
    ticket.purchased_at = clock.unix_timestamp;
    ticket.affiliate_code = affiliate_code;
    ticket.is_winner = false;
    ticket.tier = None;
    ticket.claimed = false;
    ticket.bump = ctx.bumps.ticket;

    if user_tickets.user == Pubkey::default() {
        user_tickets.user = ctx.accounts.buyer.key();
        user_tickets.lottery = lottery.key();
        user_tickets.ticket_numbers = Vec::new();
        user_tickets.count = 0;
        user_tickets.bump = ctx.bumps.user_tickets;
    }

    user_tickets.ticket_numbers.push(ticket_number);
    user_tickets.count = user_tickets.count
        .checked_add(1)
        .ok_or(LotteryError::ArithmeticOverflow)?;

    Ok(())
}

#[derive(Accounts)]
pub struct PurchaseTicket<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut)]
    pub lottery: Account<'info, Lottery>,

    #[account(
        init,
        payer = buyer,
        space = Ticket::MAX_SIZE,
        seeds = [
            b"ticket",
            lottery.key().as_ref(),
            lottery.current_tickets.checked_add(1).unwrap().to_le_bytes().as_ref()
        ],
        bump
    )]
    pub ticket: Account<'info, Ticket>,

    #[account(
        init_if_needed,
        payer = buyer,
        space = UserTickets::MAX_SIZE,
        seeds = [
            b"user_tickets",
            buyer.key().as_ref(),
            lottery.key().as_ref()
        ],
        bump
    )]
    pub user_tickets: Account<'info, UserTickets>,

    #[account(
        mut,
        constraint = treasury.key() == lottery.treasury @ LotteryError::TreasuryMismatch
    )]
    pub treasury: AccountInfo<'info>,

    #[account(
        mut,
        constraint = affiliates_pool.key() == lottery.affiliates_pool @ LotteryError::AffiliatesPoolMismatch
    )]
    pub affiliates_pool: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
