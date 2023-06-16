
use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct InitialOwner {
    pub owner : Pubkey,
    pub bump: u8
}

impl EscrowAccount {
    pub const MAX_SIZE: usize = 32 + 32 + 8 + 32 + 8 + 32 + 1;
}

#[account]
#[derive(Default)]
pub struct EscrowAccount {
    pub owner : Pubkey,
    pub id: Pubkey,
    pub amount: u64,
    pub token: Pubkey,
    pub time : u64,
    pub withdrawer : Pubkey,
    pub bump: u8
}
