import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TokenVesting } from "../target/types/token_vesting";
import { expect } from "chai";
import * as spl from "@solana/spl-token";
import { isBytesLike } from "ethers";
import { Keypair } from "@solana/web3.js";
const {
  Connection,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
  SystemProgram,
} = anchor.web3;

describe("token-vesting", async () => {
  
  const provider = anchor.AnchorProvider.local();

  const program = anchor.workspace.TokenVesting as Program<TokenVesting>;

  const wallet = provider.wallet as anchor.Wallet;

  let [owner_account,pda_owner_account] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("ownership")],
    program.programId
  );

  const id = anchor.web3.Keypair.generate();
  // [b"escrow-data".as_ref(), authority.key().as_ref(), id.as_ref()],
  let [escrow_account,pda_escrow_account] = await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from("escrow-data"),
      wallet.publicKey.toBuffer(),
      id.publicKey.toBuffer()
    ],
    program.programId
  );

  let [escrow_token_account,pda_escrow_token_account] = await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from("escrow-token"),
      wallet.publicKey.toBuffer(),
      id.publicKey.toBuffer()
    ],
    program.programId
  );

  let usdcKey;
  let usdc_ata;

  it("Create usdc tokens",async()=>{

    // New keypair to create a project token
    usdcKey = anchor.web3.Keypair.generate();

      // Deterministically finding out the project token's ATA owned by provider.wallet
      usdc_ata = await spl.getAssociatedTokenAddress(usdcKey.publicKey, provider.wallet.publicKey, false, spl.TOKEN_PROGRAM_ID, spl.ASSOCIATED_TOKEN_PROGRAM_ID);

      // Creating transaction to Initialize usdcKey keypair as a token and then minting tokens to  ATA owned by provider.wallet

      let create_mint_tx = new Transaction().add(
        // create mint account
        SystemProgram.createAccount({
          fromPubkey: provider.wallet.publicKey,
          newAccountPubkey: usdcKey.publicKey,
          space: spl.MintLayout.span,
          lamports: await spl.getMinimumBalanceForRentExemptMint(program.provider.connection),
          programId: spl.TOKEN_PROGRAM_ID,
        }),
        // init mint account
        spl.createInitializeMintInstruction(usdcKey.publicKey, 6, provider.wallet.publicKey, provider.wallet.publicKey, spl.TOKEN_PROGRAM_ID)
      )
      .add(
        spl.createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey, usdc_ata, provider.wallet.publicKey, usdcKey.publicKey, spl.TOKEN_PROGRAM_ID, spl.ASSOCIATED_TOKEN_PROGRAM_ID
        )
      ).add(
        spl.createMintToInstruction(// always TOKEN_PROGRAM_ID
          usdcKey.publicKey, // mint
          usdc_ata, // receiver (should be a token account)
          provider.wallet.publicKey, // mint authority
          47402004034546,
          [], // only multisig account will use. leave it empty now.
          spl.TOKEN_PROGRAM_ID,  // amount. if your decimals is 8, you mint 10^8 for 1 token.
        ));

      await program.provider.sendAndConfirm(create_mint_tx, [usdcKey]);



  });

  it("Init Owner", async () => {
    // Add your test here.
    const tx = await program.methods.initializeOwner()
    .accounts({
      ownerAccount : owner_account,
      authority : wallet.publicKey
    })
    .rpc();
    
    let ownerData = await program.account.initialOwner.fetch(owner_account);
    expect(ownerData.owner).to.eql(wallet.publicKey);
  });

  it("Init Vesting", async () => {

    const tx = await program.methods.escrowCreation(
      id.publicKey,
      new anchor.BN(4000),
      new anchor.BN(1686870517),
      wallet.publicKey
    ).accounts({
      escrowAccount : escrow_account,
      escrowTokenAccount: escrow_token_account,
      tokenMint : usdcKey.publicKey,
      tokenAtaSender : usdc_ata,
      authority : wallet.publicKey
    }).rpc();

    let escrowData = await program.account.escrowAccount.fetch(escrow_account);
    
    
    expect(escrowData.owner).to.eql(wallet.publicKey);
    expect(escrowData.id).to.eql(id.publicKey);
    expect(escrowData.amount.toString()).to.eql(new anchor.BN(4000).toString());
    expect(escrowData.token).to.eql(usdcKey.publicKey);
    expect(escrowData.time.toString()).to.eql(new anchor.BN(1686870517).toString());
    expect(escrowData.withdrawer).to.eql(wallet.publicKey);
    
    let escrow_balance = await program.provider.connection.getTokenAccountBalance(escrow_token_account);
    expect(escrow_balance.value.amount).to.eql('4000');

  });

  it("Withdraw Escrow", async () => {

    try {
      
      const tx = await program.methods.escrowWithdraw(
        id.publicKey,
        wallet.publicKey,
        pda_escrow_token_account
      ).accounts({
        escrowAccount : escrow_account,
        escrowTokenAccount: escrow_token_account,
        tokenMint : usdcKey.publicKey,
        tokenAtaReceiver : usdc_ata,
        authority : wallet.publicKey
      }).rpc();
    } catch (error) {
      await console.log(error);
    }


    let escrow_balance = await program.provider.connection.getTokenAccountBalance(escrow_token_account);
    expect(escrow_balance.value.amount).to.eql('0');

  });


  
});
