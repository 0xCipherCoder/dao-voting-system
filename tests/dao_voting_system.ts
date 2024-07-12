import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import { DaoVotingSystem } from "../target/types/dao_voting_system";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

describe("dao_voting_system", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.DaoVotingSystem as Program<DaoVotingSystem>;

  const user = anchor.web3.Keypair.generate();
  let mint: anchor.web3.PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;
  let proposal: anchor.web3.PublicKey;
  let rewardPool: anchor.web3.PublicKey;
  let rewardPoolBump: number;
  let rewardPoolTokenAccount: anchor.web3.PublicKey;

  before(async () => {
    // Airdrop SOL to the user
    const signature = await provider.connection.requestAirdrop(user.publicKey, 1000000000);
    await provider.connection.confirmTransaction(signature);

    // Create mint
    mint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      0,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );
    
    // Create associated token account for the user
    const userTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      user.publicKey
    );
    userTokenAccount = userTokenAccountInfo.address;

    // Mint tokens to the user's account
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mint,
      userTokenAccount,
      provider.wallet.publicKey,
      1000
    );

    // Derive the proposal PDA
    [proposal] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("proposal"), user.publicKey.toBuffer()],
      program.programId
    );

    // Derive the reward pool PDA
    [rewardPool, rewardPoolBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("reward_pool"), mint.toBuffer()],
      program.programId
    );

    // Create associated token account for the reward pool
    const rewardPoolTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      rewardPool,
      true
    );
    rewardPoolTokenAccount = rewardPoolTokenAccountInfo.address;

    // Initialize reward pool
    await program.methods
      .initializeRewardPool(rewardPoolBump)
      .accounts({
        rewardPool: rewardPool,
        authority: provider.wallet.publicKey,
        mint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // Mint tokens to the reward pool token account
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mint,
      rewardPoolTokenAccount,
      provider.wallet.publicKey,
      1000
    );
  });

  it("Creates a proposal", async () => {
    await program.methods
      .createProposal("Proposal description")
      .accounts({
        proposal,
        authority: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const account = await program.account.proposal.fetch(proposal);
    assert.equal(account.description, "Proposal description");
  });

  it("Votes on a proposal", async () => {
    await program.methods
      .vote(true)
      .accounts({
        proposal,
        user: user.publicKey,
        userTokenAccount: userTokenAccount,
        rewardPool: rewardPool,
        rewardPoolTokenAccount: rewardPoolTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const account = await program.account.proposal.fetch(proposal);
    assert.equal(account.votesFor, 1);
  });

  it("Closes a proposal", async () => {
    await program.methods
      .closeProposal()
      .accounts({
        proposal,
        authority: user.publicKey,
      })
      .signers([user])
      .rpc();

    const account = await program.account.proposal.fetch(proposal);
    assert.isTrue(account.closed);
  });

  it("Displays proposal results", async () => {
    const proposalAccount = await program.account.proposal.fetch(proposal);

    console.log("Proposal description:", proposalAccount.description);
    console.log("Votes for:", proposalAccount.votesFor);
    console.log("Votes against:", proposalAccount.votesAgainst);
    console.log("Proposal closed:", proposalAccount.closed);
    
    assert.equal(proposalAccount.description, "Proposal description");
    assert.equal(proposalAccount.votesFor, 1);
    assert.equal(proposalAccount.votesAgainst, 0);
    assert.isTrue(proposalAccount.closed);
  });
});
