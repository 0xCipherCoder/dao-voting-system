import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import { DaoVotingSystem } from "../target/types/dao_voting_system";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

describe("dao_voting_system", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DaoVotingSystem as Program<DaoVotingSystem>;

  const user = anchor.web3.Keypair.generate();
  const protocolWallet = anchor.web3.Keypair.generate();

  let mint: anchor.web3.PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;
  let proposal: anchor.web3.PublicKey;
  let rewardPool: anchor.web3.PublicKey;
  let rewardPoolBump: number;
  let rewardPoolTokenAccount: anchor.web3.PublicKey;

  before(async () => {
    // Airdrop SOL to the user
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user.publicKey, 1000000000)
    );

    // Create mint
    mint = await createMint(
      provider.connection,
      user,
      user.publicKey,
      null,
      0
    );

    // Create user token account
    userTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      user,
      mint,
      user.publicKey
    );

    // Derive the reward pool PDA
    [rewardPool, rewardPoolBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("reward_pool"), mint.toBuffer()],
      program.programId
    );

    // Create reward pool token account
    rewardPoolTokenAccount = await getAssociatedTokenAddress(
      mint,
      rewardPool,
      true
    );

    // Initialize reward pool
    await program.methods
      .initializeRewardPool(rewardPoolBump)
      .accounts({
        rewardPool: rewardPool,
        authority: user.publicKey,
        mint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([user])
      .rpc();

    // Mint tokens to the user's account
    await mintTo(
      provider.connection,
      user,
      mint,
      userTokenAccount,
      user,
      1000
    );

    // Mint tokens to the reward pool token account
    await mintTo(
      provider.connection,
      user,
      mint,
      rewardPoolTokenAccount,
      user,
      1000
    );

    // Create proposal
    [proposal] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("proposal"), user.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .createProposal("Proposal description")
      .accounts({
        proposal: proposal,
        authority: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();
  });

  it("Votes on a proposal", async () => {
    await program.methods
      .vote(true)
      .accounts({
        proposal: proposal,
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
        proposal: proposal,
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
