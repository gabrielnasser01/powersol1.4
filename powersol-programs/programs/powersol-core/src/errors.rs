use anchor_lang::prelude::*;

#[error_code]
pub enum LotteryError {
    #[msg("Lottery has already been drawn")]
    LotteryAlreadyDrawn,

    #[msg("Lottery is full, no more tickets available")]
    LotteryFull,

    #[msg("Lottery has expired, cannot purchase tickets")]
    LotteryExpired,

    #[msg("Lottery has not expired yet, cannot execute draw")]
    LotteryNotExpired,

    #[msg("Invalid winning ticket number")]
    InvalidWinningTicket,

    #[msg("Lottery has not been drawn yet")]
    LotteryNotDrawn,

    #[msg("Not the ticket owner")]
    NotTicketOwner,

    #[msg("Not a winning ticket")]
    NotWinningTicket,

    #[msg("Prize already claimed")]
    PrizeAlreadyClaimed,

    #[msg("Invalid lottery type")]
    InvalidLotteryType,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Invalid affiliate code")]
    InvalidAffiliateCode,

    #[msg("Treasury mismatch")]
    TreasuryMismatch,

    #[msg("Affiliates pool mismatch")]
    AffiliatesPoolMismatch,

    #[msg("Invalid prize distribution")]
    InvalidPrizeDistribution,
}
