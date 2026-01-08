use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::LotteryError;

pub fn close_lottery(
    ctx: Context<CloseLottery>,
) -> Result<()> {
    let lottery = &ctx.accounts.lottery;

    require!(
        lottery.is_drawn,
        LotteryError::LotteryNotDrawn
    );

    Ok(())
}

#[derive(Accounts)]
pub struct CloseLottery<'info> {
    #[account(
        mut,
        has_one = authority,
        close = authority
    )]
    pub lottery: Account<'info, Lottery>,

    #[account(mut)]
    pub authority: Signer<'info>,
}
