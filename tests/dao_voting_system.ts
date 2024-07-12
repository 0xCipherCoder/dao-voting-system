import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DaoVotingSystem } from "../target/types/dao_voting_system";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { expect } from "chai";

describe("dao-voting-system", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DaoVotingSystem as Program<DaoVotingSystem>;

  let rewardMint: anchor.web3.PublicKey;
  let dao: anchor.web3.PublicKey;
  let rewardVault: anchor.web3.PublicKey;
  let proposal: anchor.web3.PublicKey;
  let user1: anchor.web3.Keypair;
  let user2: anchor.web3.Keypair;
  let user1TokenAccount: anchor.web3.PublicKey;
  let user2TokenAccount: anchor.web3.PublicKey;

  before(async () => {
    // Create a new mint for reward tokens
    rewardMint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      6
    );

    // Generate DAO address
    [dao] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("dao")],
      program.programId
    );

    // Generate reward vault address
    rewardVault = await anchor.utils.token.associatedAddress({
      mint: rewardMint,
      owner: dao
    });

    // Create users
    user1 = anchor.web3.Keypair.generate();
    user2 = anchor.web3.Keypair.generate();

    // Airdrop SOL to users
    await provider.connection.requestAirdrop(user1.publicKey, 1000000000);
    await provider.connection.requestAirdrop(user2.publicKey, 1000000000);

    // Initialize DAO
    const [daoPda, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("dao")],
      program.programId
    );

    await program.methods
      .initializeDao(bump)
      .accounts({
        dao: daoPda,
        rewardVault: rewardVault,
        rewardMint: rewardMint,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // Mint reward tokens to the vault
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      rewardMint,
      rewardVault,
      provider.wallet.payer,
      1000000000 // 1000 tokens
    );
  });

  it("Creates a proposal", async () => {
    const description = "Should we implement feature X?";
    const [proposalPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("proposal"), new anchor.BN(0).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    await program.methods
      .createProposal(description)
      .accounts({
        dao: dao,
        proposal: proposalPda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const proposalAccount = await program.account.proposal.fetch(proposalPda);
    expect(proposalAccount.description).to.equal(description);
    expect(proposalAccount.votesFor.toNumber()).to.equal(0);
    expect(proposalAccount.votesAgainst.toNumber()).to.equal(0);
    expect(proposalAccount.isActive).to.be.true;

    proposal = proposalPda;
  });

  it("Allows users to vote and rewards them", async () => {
    // User 1 votes in favor
    user1TokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user1,
      rewardMint,
      user1.publicKey
    ).then(account => account.address);

    await program.methods
      .vote(true)
      .accounts({
        dao: dao,
        proposal: proposal,
        rewardVault: rewardVault,
        userTokenAccount: user1TokenAccount,
        rewardMint: rewardMint,
        user: user1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([user1])
      .rpc();

    // User 2 votes against
    user2TokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user2,
      rewardMint,
      user2.publicKey
    ).then(account => account.address);

    await program.methods
      .vote(false)
      .accounts({
        dao: dao,
        proposal: proposal,
        rewardVault: rewardVault,
        userTokenAccount: user2TokenAccount,
        rewardMint: rewardMint,
        user: user2.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([user2])
      .rpc();

    // Check proposal state
    const proposalAccount = await program.account.proposal.fetch(proposal);
    expect(proposalAccount.votesFor.toNumber()).to.equal(1);
    expect(proposalAccount.votesAgainst.toNumber()).to.equal(1);

    // Check reward balances
    const user1Balance = await provider.connection.getTokenAccountBalance(user1TokenAccount);
    const user2Balance = await provider.connection.getTokenAccountBalance(user2TokenAccount);

    expect(user1Balance.value.uiAmount).to.equal(10);
    expect(user2Balance.value.uiAmount).to.equal(10);
});

  it("Closes the proposal", async () => {
    await program.methods
      .closeProposal()
      .accounts({
        proposal: proposal,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    const proposalAccount = await program.account.proposal.fetch(proposal);
    expect(proposalAccount.isActive).to.be.false;
  });

  it("Prevents voting on a closed proposal", async () => {
    try {
      await program.methods
        .vote(true)
        .accounts({
          dao: dao,
          proposal: proposal,
          rewardVault: rewardVault,
          userTokenAccount: user1TokenAccount,
          rewardMint: rewardMint,
          user: user1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user1])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).to.include("The proposal is not active");
    }
  });
});