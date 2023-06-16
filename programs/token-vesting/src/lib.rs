use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod token_vesting {
    use super::*;

    pub fn initialize_owner(ctx: Context<InitialOwnerContext>) -> Result<()> {
        initialize_owner::handler(ctx)
    }

    pub fn escrow_creation(ctx: Context<EscrowCreationContext>, id : Pubkey, amount: u64, time : u64, withdrawer : Pubkey) -> Result<()> {
        escrow_creation::handler(ctx, id, amount, time, withdrawer)
    }

    pub fn escrow_withdraw(ctx: Context<EscrowWithdrawContext>, id : Pubkey, escrow_owner : Pubkey, token_bump: u8) -> Result<()> {
        escrow_withdraw::handler(ctx, id, escrow_owner, token_bump)
    }
}


