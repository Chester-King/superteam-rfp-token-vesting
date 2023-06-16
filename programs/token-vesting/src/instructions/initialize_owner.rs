use anchor_lang::prelude::*;

use crate::state::{*};

// Uncomment this line to use the error codes defined in errors.rs
// use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct InitialOwnerContext<'info> {
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
   
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 1,
        seeds = [b"ownership".as_ref()], 
        bump
    )]
    pub owner_account: Box<Account<'info, InitialOwner>>,



    pub system_program: Program<'info, System>,
}



pub fn handler(ctx: Context<InitialOwnerContext>) -> Result<()> {
    
    let owner_account = &mut ctx.accounts.owner_account;
    let authority_clone = ctx.accounts.authority.to_account_info().key();

    owner_account.owner = authority_clone;
    owner_account.bump = *ctx.bumps.get("owner_account").unwrap();

    msg!("Owner set to {}",owner_account.owner);
    msg!("Bump is set to {}",owner_account.bump);
    
    Ok(())
}