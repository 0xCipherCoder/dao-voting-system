use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer, InitializeAccount};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("3psKCKAmTQEJ3idseY6tKs11JYN7BGoPuX6w7jqs1BAJ");

#[program]
pub mod dao_voting_system {
    use super::*;

    pub fn initialize_reward_pool(ctx: Context<InitializeRewardPool>, bump: u8) -> Result<()> {
        ctx.accounts.reward_pool.bump = bump;
    
        let cpi_accounts = InitializeAccount {
            account: ctx.accounts.reward_pool.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        };
    
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::initialize_account(cpi_ctx)?;
        Ok(())
    }
    
    pub fn create_proposal(ctx: Context<CreateProposal>, description: String) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        proposal.description = description;
        proposal.votes_for = 0;
        proposal.votes_against = 0;
        proposal.closed = false;
        Ok(())
    }

    pub fn vote(ctx: Context<Vote>, vote_for: bool) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        require!(!proposal.closed, ErrorCode::ProposalClosed);

        if vote_for {
            proposal.votes_for += 1;
        } else {
            proposal.votes_against += 1;
        }

        // Reward user
        let reward_amount = 10; // Example reward amount
        let cpi_accounts = Transfer {
            from: ctx.accounts.reward_pool_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.reward_pool.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let seeds: &[&[u8]] = &[b"reward_pool", &[ctx.accounts.reward_pool.bump]];
        let signer = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, reward_amount)?;

        Ok(())
    }

    pub fn close_proposal(ctx: Context<CloseProposal>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        proposal.closed = true;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeRewardPool<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 8,
        seeds = [b"reward_pool", mint.key().as_ref()],
        bump
    )]
    pub reward_pool: Account<'info, RewardPool>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(init, payer = authority, space = 8 + 64 + 8 + 8 + 1)]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct RewardPool {
    pub bump: u8,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub reward_pool: Account<'info, RewardPool>,
    #[account(mut)]
    pub reward_pool_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseProposal<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Proposal {
    pub description: String,
    pub votes_for: u64,
    pub votes_against: u64,
    pub closed: bool,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The proposal is already closed.")]
    ProposalClosed,
}
