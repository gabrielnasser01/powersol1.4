use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::LotteryError;

pub fn execute_draw(
    ctx: Context<ExecuteDraw>,
    winning_tickets: Vec<u32>,
) -> Result<()> {
    let lottery = &mut ctx.accounts.lottery;
    let clock = Clock::get()?;

    require!(
        !lottery.is_drawn,
        LotteryError::LotteryAlreadyDrawn
    );

    require!(
        lottery.can_draw(clock.unix_timestamp),
        LotteryError::LotteryNotExpired
    );

    for &ticket_num in &winning_tickets {
        require!(
            ticket_num > 0 && ticket_num <= lottery.current_tickets,
            LotteryError::InvalidWinningTicket
        );
    }

    lottery.is_drawn = true;
    lottery.winning_tickets = winning_tickets;

    Ok(())
}

#[derive(Accounts)]
pub struct ExecuteDraw<'info> {
    #[account(
        mut,
        has_one = authority,
    )]
    pub lottery: Account<'info, Lottery>,

    pub authority: Signer<'info>,
}
