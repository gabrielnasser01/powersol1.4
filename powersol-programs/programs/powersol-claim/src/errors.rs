use anchor_lang::prelude::*;

#[error_code]
pub enum ClaimError {
    #[msg("Lottery has not been drawn yet")]
    LotteryNotDrawn,

    #[msg("Not a winning ticket")]
    NotWinningTicket,

    #[msg("Not the ticket owner")]
    NotTicketOwner,

    #[msg("Prize already claimed")]
    PrizeAlreadyClaimed,

    #[msg("Invalid tier")]
    InvalidTier,

    #[msg("Insufficient prize pool funds")]
    InsufficientFunds,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Invalid prize percentage")]
    InvalidPrizePercentage,

    #[msg("Invalid amount")]
    InvalidAmount,

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("VRF not completed for this lottery round")]
    VrfNotCompleted,

    #[msg("Claim not yet available - wait until Wednesday 23:59:59 GMT")]
    ClaimNotYetAvailable,

    #[msg("Insufficient pending rewards")]
    InsufficientPendingRewards,
}
