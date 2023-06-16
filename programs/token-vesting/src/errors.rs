use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    
    #[msg("The escrow account yet to reach the unlock time")]
    EscrowNotReady,

}