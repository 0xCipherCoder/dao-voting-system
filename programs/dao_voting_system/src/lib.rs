use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("3psKCKAmTQEJ3idseY6tKs11JYN7BGoPuX6w7jqs1BAJ");

#[program]
pub mod dao_voting_system {
    use super::*;

    pub fn initialize_dao(ctx: Context<InitializeDao>, bump: u8) -> Result<()> {
        ctx.accounts.dao.bump = bump;
        ctx.accounts.dao.proposal_count = 0;
        Ok(())
    }

    pub fn create_proposal(ctx: Context<CreateProposal>, description: String) -> Result<()> {
        let dao = &mut ctx.accounts.dao;
        let proposal = &mut ctx.accounts.proposal;

        proposal.id = dao.proposal_count;
        proposal.description = description;
        proposal.votes_for = 0;
        proposal.votes_against = 0;
        proposal.is_active = true;

        dao.proposal_count += 1;

        Ok(())
    }

    pub fn vote(ctx: Context<Vote>, vote_for: bool) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        require!(proposal.is_active, ErrorCode::ProposalNotActive);
    
        if vote_for {
            proposal.votes_for += 1;
        } else {
            proposal.votes_against += 1;
        }
    
        // Reward user
        let reward_amount = 10_000_000; // 10 tokens (assuming 6 decimals)
        let cpi_accounts = Transfer {
            from: ctx.accounts.reward_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.dao.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let seeds = &[b"dao".as_ref(), &[ctx.accounts.dao.bump]];
        let signer = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, reward_amount)?;
    
        Ok(())
    }

    pub fn close_proposal(ctx: Context<CloseProposal>) -> Result<()> {
        ctx.accounts.proposal.is_active = false;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeDao<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 8 + 1,
        seeds = [b"dao"],
        bump
    )]
    pub dao: Account<'info, Dao>,
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = reward_mint,
        associated_token::authority = dao
    )]
    pub reward_vault: Account<'info, TokenAccount>,
    pub reward_mint: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub dao: Account<'info, Dao>,
    #[account(
        init,
        payer = authority,
        space = 8 + 8 + 256 + 8 + 8 + 1,
        seeds = [b"proposal", dao.proposal_count.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub dao: Account<'info, Dao>,
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub reward_vault: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = reward_mint,
        associated_token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    pub reward_mint: Account<'info, Mint>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CloseProposal<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Dao {
    pub bump: u8,
    pub proposal_count: u64,
}

#[account]
pub struct Proposal {
    pub id: u64,
    pub description: String,
    pub votes_for: u64,
    pub votes_against: u64,
    pub is_active: bool,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The proposal is not active.")]
    ProposalNotActive,
}