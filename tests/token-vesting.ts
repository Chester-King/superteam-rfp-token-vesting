import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TokenVesting } from "../target/types/token_vesting";
import { expect } from "chai";
import * as spl from "@solana/spl-token";
import { Keypair } from "@solana/web3.js";

const {
  Connection,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
  SystemProgram,
} = anchor.web3;

describe("Token Vesting", async () => {
  // Initialize the Anchor provider
  const provider = anchor.AnchorProvider.local();
  // Get the program instance
  const program = anchor.workspace.TokenVesting as Program<TokenVesting>;
  // Get the wallet instance
  const wallet = provider.wallet as anchor.Wallet;

  // Generate keypairs for the owner and escrow accounts
  let [ownerAccount, pdaOwnerAccount] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("ownership")],
    program.programId
  );

  // Generate a keypair for the escrow account ID
  const id = anchor.web3.Keypair.generate();

  // Generate keypairs for the escrow and token accounts
  let [escrowAccount, pdaEscrowAccount] = await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from("escrow-data"),
      wallet.publicKey.toBuffer(),
      id.publicKey.toBuffer()
    ],
    program.programId
  );

  let [escrowTokenAccount, pdaEscrowTokenAccount] = await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from("escrow-token"),
      wallet.publicKey.toBuffer(),
      id.publicKey.toBuffer()
    ],
    program.programId
  );

  // Variables for USDC token creation
  let usdcKey; // Keypair for the USDC token
  let usdcAta; // Associated token account (ATA) for the USDC token

  it("Create USDC tokens", async () => {
    // Generate a new keypair for the USDC token
    usdcKey = anchor.web3.Keypair.generate();

    // Determine the associated token account (ATA) owned by the provider's wallet
    usdcAta = await spl.getAssociatedTokenAddress(
      usdcKey.publicKey,
      provider.wallet.publicKey,
      false,
      spl.TOKEN_PROGRAM_ID,
      spl.ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Create a transaction to initialize the USDC token and mint tokens to the ATA owned by the provider's wallet
    const mintAmount = 47402004034546; // Amount of tokens to mint
    let createMintTx = new Transaction().add(
      // Create the mint account
      SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: usdcKey.publicKey,
        space: spl.MintLayout.span,
        lamports: await spl.getMinimumBalanceForRentExemptMint(program.provider.connection),
        programId: spl.TOKEN_PROGRAM_ID,
      }),
      // Initialize the mint account
      spl.createInitializeMintInstruction(usdcKey.publicKey, 6, provider.wallet.publicKey, provider.wallet.publicKey, spl.TOKEN_PROGRAM_ID)
    ).add(
      // Create the associated token account
      spl.createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        usdcAta,
        provider.wallet.publicKey,
        usdcKey.publicKey,
        spl.TOKEN_PROGRAM_ID,
        spl.ASSOCIATED_TOKEN_PROGRAM_ID
      )
    ).add(
      // Mint tokens to the associated token account
      spl.createMintToInstruction(
        usdcKey.publicKey, // Mint
        usdcAta, // Receiver (should be a token account)
        provider.wallet.publicKey, // Mint authority
        mintAmount,
        [], // Only multisig account will use. Leave it empty for now.
        spl.TOKEN_PROGRAM_ID // Program ID
      )
    );

    await program.provider.sendAndConfirm(createMintTx, [usdcKey]);
  });

  it("Initialize Vesting", async () => {
    // Create an escrow account with the specified parameters
    const vestingAmount = new anchor.BN(4000); // Amount of tokens to vest
    const vestingTime = new anchor.BN(1686870517); // Vesting period (UNIX timestamp)
    const withdrawer = wallet.publicKey; // Account authorized to withdraw the vested tokens

    const tx = await program.methods.escrowCreation(
      id.publicKey,
      vestingAmount,
      vestingTime,
      withdrawer
    ).accounts({
      escrowAccount,
      escrowTokenAccount,
      tokenMint: usdcKey.publicKey,
      tokenAtaSender: usdcAta,
      authority: wallet.publicKey
    }).rpc();

    // Fetch the escrow account data
    let escrowData = await program.account.escrowAccount.fetch(escrowAccount);

    // Verify the escrow account data
    expect(escrowData.owner).to.eql(wallet.publicKey);
    expect(escrowData.id).to.eql(id.publicKey);
    expect(escrowData.amount.toString()).to.eql(vestingAmount.toString());
    expect(escrowData.token).to.eql(usdcKey.publicKey);
    expect(escrowData.time.toString()).to.eql(vestingTime.toString());
    expect(escrowData.withdrawer).to.eql(wallet.publicKey);

    // Check the escrow account balance
    let escrowBalance = await program.provider.connection.getTokenAccountBalance(escrowTokenAccount);
    expect(escrowBalance.value.amount).to.eql(vestingAmount.toString());
  });

  it("Withdraw from Escrow", async () => {
    try {
      // Withdraw tokens from the escrow account
      const tx = await program.methods.escrowWithdraw(
        id.publicKey,
        wallet.publicKey,
        pdaEscrowTokenAccount
      ).accounts({
        escrowAccount,
        escrowTokenAccount,
        tokenMint: usdcKey.publicKey,
        tokenAtaReceiver: usdcAta,
        authority: wallet.publicKey
      }).rpc();
    } catch (error) {
      await console.log(error);
    }

    // Check the escrow account balance after withdrawal
    let escrowBalance = await program.provider.connection.getTokenAccountBalance(escrowTokenAccount);
    expect(escrowBalance.value.amount).to.eql('0');
  });
});
