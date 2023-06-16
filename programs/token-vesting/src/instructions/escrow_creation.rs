use anchor_lang::prelude::*;
use anchor_lang::solana_program::{self,system_program, sysvar::rent::Rent,};
use anchor_spl::token::{self,Mint,TokenAccount,Token};
use anchor_spl::associated_token::{self,AssociatedToken};
use crate::state::{*};

// Uncomment this line to use the error codes defined in errors.rs
// use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(id: Pubkey)]
pub struct EscrowCreationContext<'info> {
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
   
    #[account(
        init,
        payer = authority,
        space = 8 + EscrowAccount::MAX_SIZE,
        seeds = [b"escrow-data".as_ref(), authority.key().as_ref(), id.as_ref()], 
        bump
    )]
    pub escrow_account: Box<Account<'info, EscrowAccount>>,
   
    #[account(
        init,
        payer = authority,
        seeds = [b"escrow-token".as_ref(), authority.key().as_ref(), id.as_ref()], 
        bump,
        token::mint = token_mint,
        token::authority = escrow_token_account,
        
    )]
    pub escrow_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub token_mint: Account<'info, Mint>,

    #[account(mut, constraint = token_ata_sender.mint ==  token_mint.key(), constraint = token_ata_sender.owner == authority.key())]
    pub token_ata_sender: Box<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}



pub fn handler(ctx: Context<EscrowCreationContext>, id : Pubkey, amount: u64, time : u64, withdrawer : Pubkey) -> Result<()> {
    
    let escrow_account = &mut ctx.accounts.escrow_account;
    let authority_clone = ctx.accounts.authority.to_account_info().key();

    escrow_account.owner = authority_clone;
    escrow_account.id = id;
    escrow_account.amount = amount;
    escrow_account.token = ctx.accounts.token_mint.to_account_info().key();
    escrow_account.time = time;
    escrow_account.withdrawer = withdrawer;
    escrow_account.bump = *ctx.bumps.get("escrow_account").unwrap();
    

    let transfer_instruction = anchor_spl::token::Transfer {
        from: ctx.accounts.token_ata_sender.to_account_info(),
        to: ctx.accounts.escrow_token_account.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        transfer_instruction,
    );

    anchor_spl::token::transfer(cpi_ctx, amount)?;

    Ok(())
}