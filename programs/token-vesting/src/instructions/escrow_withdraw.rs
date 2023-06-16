use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::*;
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(id: Pubkey, escrow_owner: Pubkey, token_bump: u8)]
pub struct EscrowWithdrawContext<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        close = authority,
        constraint = escrow_account.withdrawer == authority.key(),
        seeds = [b"escrow-data".as_ref(), escrow_owner.as_ref(), id.as_ref()], 
        bump = escrow_account.bump,
    )]
    pub escrow_account: Box<Account<'info, EscrowAccount>>,
   
    #[account(
        mut,
        seeds = [b"escrow-token".as_ref(), escrow_owner.as_ref(), id.as_ref()], 
        bump = token_bump
    )]
    pub escrow_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint = token_mint.key() == escrow_token_account.mint)]
    pub token_mint: Account<'info, Mint>,

    #[account(mut, constraint = token_ata_receiver.mint == token_mint.key(), constraint = token_ata_receiver.owner == authority.key())]
    pub token_ata_receiver: Box<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(ctx: Context<EscrowWithdrawContext>, id: Pubkey, escrow_owner: Pubkey, token_bump: u8) -> Result<()> {
    let escrow_account = &mut ctx.accounts.escrow_account;

    // Get the current timestamp using Clock::get() and check if the escrow account's unlock time has been reached
    let now_ts = Clock::get().unwrap().unix_timestamp;
    if escrow_account.time > now_ts.try_into().unwrap() {
        return Err(ErrorCode::EscrowNotReady.into());
    }
    
    let bump = token_bump;
    let bump_vector = bump.to_le_bytes();

    // Generate seeds for creating a derived address for the escrow_token_account
    let inner = vec![
        b"escrow-token".as_ref(),
        escrow_owner.as_ref(),
        id.as_ref(),
        bump_vector.as_ref(),
    ];
    let outer = vec![inner.as_slice()];

    // Create a transfer instruction to move tokens from the escrow_token_account to the token_ata_receiver account
    let transfer_instruction = anchor_spl::token::Transfer {
        from: ctx.accounts.escrow_token_account.to_account_info(),
        to: ctx.accounts.token_ata_receiver.to_account_info(),
        authority: ctx.accounts.escrow_token_account.to_account_info(),
    };

    // Create a CPI (Cross-Program Invocation) context for calling the token program's transfer instruction
    let cpi_ctx_trans = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_instruction,
        outer.as_slice(),
    );

    // Call the token program's transfer instruction using the CPI context and transfer the specified amount of tokens
    anchor_spl::token::transfer(cpi_ctx_trans, escrow_account.amount)?;

    Ok(())
}
