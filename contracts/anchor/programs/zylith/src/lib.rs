use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

pub mod math;
pub mod vk;
use crate::math::*;

declare_id!("4CNqqTnGEMYqWkE4VCS7cRy3tAJcrPGGMvM9dyFmJwp9");

/// Circom circuits use a 20-level tree → max 2^20 leaves.
const MAX_TREE_LEAVES: u32 = 1 << 20;

/// Verify that `account_key` is the PDA for a commitment at `leaf_index`
/// under the given coordinator. Prevents arbitrary accounts being passed
/// as commitment slots in shielded_swap / shielded_mint / shielded_burn.
fn validate_commitment_pda(
    account_key: Pubkey,
    coordinator_key: Pubkey,
    leaf_index: u32,
) -> Result<()> {
    let (expected, _) = Pubkey::find_program_address(
        &[b"commitment", coordinator_key.as_ref(), &leaf_index.to_le_bytes()],
        &crate::ID,
    );
    require!(account_key == expected, ErrorCode::InvalidCommitmentPDA);
    Ok(())
}

#[program]
pub mod zylith {
    use super::*;

    pub fn initialize_coordinator(ctx: Context<InitializeCoordinator>, initial_root_submitter: Pubkey) -> Result<()> {
        let coordinator = &mut ctx.accounts.coordinator;
        coordinator.owner = ctx.accounts.owner.key();
        coordinator.root_submitter = initial_root_submitter;
        coordinator.next_leaf_index = 0;
        coordinator.paused = false;
        Ok(())
    }

    pub fn create_pool(ctx: Context<CreatePool>, config: PoolConfigParams) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.token0 = ctx.accounts.token0_mint.key();
        pool.token1 = ctx.accounts.token1_mint.key();
        pool.fee = config.fee;
        pool.tick_spacing = config.tick_spacing;
        pool.tick_lower = config.tick_lower;
        pool.tick_upper = config.tick_upper;
        pool.sqrt_price_lower_x96 = config.sqrt_price_lower_x96;
        pool.sqrt_price_upper_x96 = config.sqrt_price_upper_x96;
        pool.sqrt_price_x96 = config.initial_sqrt_price_x96;
        pool.protocol_fee_bps = config.protocol_fee_bps;
        pool.fee_recipient = config.fee_recipient;
        pool.coordinator = ctx.accounts.coordinator.key();
        
        pool.total_liquidity = 0;
        pool.reserve0 = 0;
        pool.reserve1 = 0;
        pool.shielded_balance0 = 0;
        pool.shielded_balance1 = 0;
        
        Ok(())
    }

    pub fn mint(ctx: Context<MintLiquidity>, liquidity_delta: u128) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let (amount0, amount1) = amounts_for_liquidity(
            pool.sqrt_price_x96,
            pool.sqrt_price_lower_x96,
            pool.sqrt_price_upper_x96,
            liquidity_delta
        )?;

        pool.total_liquidity += liquidity_delta;
        pool.reserve0 += amount0;
        pool.reserve1 += amount1;

        let cpi_accounts_0 = Transfer {
            from: ctx.accounts.user_token0.to_account_info(),
            to: ctx.accounts.pool_token0.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts_0), amount0)?;

        let cpi_accounts_1 = Transfer {
            from: ctx.accounts.user_token1.to_account_info(),
            to: ctx.accounts.pool_token1.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts_1), amount1)?;

        let position = &mut ctx.accounts.position;
        position.liquidity += liquidity_delta;

        Ok(())
    }

    pub fn shielded_deposit(ctx: Context<ShieldedDeposit>, amount: u64, commitment: [u8; 32]) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let token_mint = ctx.accounts.token_mint.key();
        
        if token_mint == pool.token0 {
            pool.shielded_balance0 += amount;
        } else if token_mint == pool.token1 {
            pool.shielded_balance1 += amount;
        } else {
            return Err(error!(ErrorCode::InvalidToken));
        }

        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token.to_account_info(),
            to: ctx.accounts.pool_token_custody.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts), amount)?;

        let coordinator = &mut ctx.accounts.coordinator;
        require!(coordinator.next_leaf_index < MAX_TREE_LEAVES, ErrorCode::TreeFull);

        let commitment_acc = &mut ctx.accounts.commitment_account;
        commitment_acc.commitment = commitment;
        commitment_acc.leaf_index = coordinator.next_leaf_index;
        coordinator.next_leaf_index += 1;

        Ok(())
    }

    pub fn shielded_withdraw(ctx: Context<ShieldedWithdraw>, inputs: MembershipPublicInputs, proof: Vec<u8>) -> Result<()> {
        require!(ctx.accounts.root_record.root == inputs.root, ErrorCode::UnknownRoot);
        
        let nullifier_record = &mut ctx.accounts.nullifier_record;
        nullifier_record.spent = true;
        nullifier_record.nullifier_hash = inputs.nullifier_hash;

        // Verify ZK Proof
        require!(proof.len() == 256, ErrorCode::InvalidProof);
        let proof_a: &[u8; 64] = proof[0..64].try_into().map_err(|_| ErrorCode::InvalidProof)?;
        let proof_b: &[u8; 128] = proof[64..192].try_into().map_err(|_| ErrorCode::InvalidProof)?;
        let proof_c: &[u8; 64] = proof[192..256].try_into().map_err(|_| ErrorCode::InvalidProof)?;

        let mut amount_low = [0u8; 32];
        amount_low[24..32].copy_from_slice(&inputs.amount.to_be_bytes()); // amount is u64
        let amount_high = [0u8; 32];

        // Format public inputs matching Circuit: root, nullifierHash, recipient, amount_low, amount_high, token
        let public_inputs: [[u8; 32]; 6] = [
            inputs.root,
            inputs.nullifier_hash,
            ctx.accounts.payer.key().to_bytes(), // recipient is payer
            amount_low,
            amount_high,
            inputs.token.to_bytes(),
        ];

        let verifying_key = groth16_solana::groth16::Groth16Verifyingkey {
            nr_pubinputs: 6,
            vk_alpha_g1: crate::vk::membership_vk::VK_ALPHA_G1,
            vk_beta_g2: crate::vk::membership_vk::VK_BETA_G2,
            vk_gamme_g2: crate::vk::membership_vk::VK_GAMMA_G2,
            vk_delta_g2: crate::vk::membership_vk::VK_DELTA_G2,
            vk_ic: &crate::vk::membership_vk::VK_IC,
        };

        let mut verifier = groth16_solana::groth16::Groth16Verifier::new(
            proof_a,
            proof_b,
            proof_c,
            &public_inputs,
            &verifying_key,
        ).map_err(|_| ErrorCode::InvalidProof)?;

        verifier.verify().map_err(|_| ErrorCode::InvalidProof)?;

        let pool = &mut ctx.accounts.pool;
        if inputs.token == pool.token0 {
            require!(pool.shielded_balance0 >= inputs.amount, ErrorCode::InsufficientShieldedBalance);
            pool.shielded_balance0 -= inputs.amount;
        } else if inputs.token == pool.token1 {
            require!(pool.shielded_balance1 >= inputs.amount, ErrorCode::InsufficientShieldedBalance);
            pool.shielded_balance1 -= inputs.amount;
        } else {
            return Err(error!(ErrorCode::InvalidToken));
        }

        let seeds = &[
            b"pool",
            pool.token0.as_ref(),
            pool.token1.as_ref(),
            &pool.fee.to_le_bytes(),
            &[ctx.bumps.pool_pda],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.pool_token_custody.to_account_info(),
            to: ctx.accounts.recipient_token.to_account_info(),
            authority: pool.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts, signer),
            inputs.amount
        )?;

        Ok(())
    }

    pub fn shielded_swap(ctx: Context<ShieldedSwap>, inputs: SwapPublicInputs, proof: Vec<u8>, _sqrt_price_limit_x96: u128) -> Result<()> {
        require!(ctx.accounts.root_record.root == inputs.root, ErrorCode::UnknownRoot);

        let mut amount_in_bytes = [0u8; 32];
        amount_in_bytes[0..8].copy_from_slice(&inputs.amount_in.to_le_bytes());
        let mut amount_out_min_bytes = [0u8; 32];
        amount_out_min_bytes[0..8].copy_from_slice(&inputs.amount_out_min.to_le_bytes());

        let public_inputs: [[u8; 32]; 8] = [
            inputs.root,
            inputs.nullifier_hash,
            inputs.new_commitment,
            inputs.token_in.to_bytes(),
            inputs.token_out.to_bytes(),
            amount_in_bytes,
            amount_out_min_bytes,
            inputs.change_commitment,
        ];

        let mut proof_a = [0u8; 64];
        proof_a.copy_from_slice(&proof[0..64]);
        let mut proof_b = [0u8; 128];
        proof_b.copy_from_slice(&proof[64..192]);
        let mut proof_c = [0u8; 64];
        proof_c.copy_from_slice(&proof[192..256]);

        let verifying_key = groth16_solana::groth16::Groth16Verifyingkey {
            nr_pubinputs: 8,
            vk_alpha_g1: crate::vk::swap_vk::VK_ALPHA_G1,
            vk_beta_g2: crate::vk::swap_vk::VK_BETA_G2,
            vk_gamme_g2: crate::vk::swap_vk::VK_GAMMA_G2,
            vk_delta_g2: crate::vk::swap_vk::VK_DELTA_G2,
            vk_ic: &crate::vk::swap_vk::VK_IC,
        };

        let mut verifier = groth16_solana::groth16::Groth16Verifier::new(
            &proof_a,
            &proof_b,
            &proof_c,
            &public_inputs,
            &verifying_key,
        ).map_err(|_| ErrorCode::InvalidProof)?;

        verifier.verify().map_err(|_| ErrorCode::InvalidProof)?;

        let nullifier_record = &mut ctx.accounts.nullifier_record;
        nullifier_record.spent = true;
        nullifier_record.nullifier_hash = inputs.nullifier_hash;

        let pool = &mut ctx.accounts.pool;
        let zero_for_one = inputs.token_in == pool.token0 && inputs.token_out == pool.token1;
        require!(zero_for_one || (inputs.token_in == pool.token1 && inputs.token_out == pool.token0), ErrorCode::InvalidTokenPair);

        if zero_for_one {
            require!(pool.shielded_balance0 >= inputs.amount_in, ErrorCode::InsufficientShieldedBalance);
            let amount_out = compute_swap_output(pool.reserve0, pool.reserve1, inputs.amount_in, pool.fee)?;
            require!(amount_out >= inputs.amount_out_min, ErrorCode::SlippageExceeded);
            pool.shielded_balance0 -= inputs.amount_in;
            pool.shielded_balance1 += amount_out;
            pool.reserve0 += inputs.amount_in;
            pool.reserve1 -= amount_out;
        } else {
            require!(pool.shielded_balance1 >= inputs.amount_in, ErrorCode::InsufficientShieldedBalance);
            let amount_out = compute_swap_output(pool.reserve1, pool.reserve0, inputs.amount_in, pool.fee)?;
            require!(amount_out >= inputs.amount_out_min, ErrorCode::SlippageExceeded);
            pool.shielded_balance1 -= inputs.amount_in;
            pool.shielded_balance0 += amount_out;
            pool.reserve1 += inputs.amount_in;
            pool.reserve0 -= amount_out;
        }

        let coordinator = &mut ctx.accounts.coordinator;
        require!(
            coordinator.next_leaf_index.saturating_add(1) < MAX_TREE_LEAVES,
            ErrorCode::TreeFull
        );
        validate_commitment_pda(
            ctx.accounts.new_commitment_acc.key(),
            coordinator.key(),
            coordinator.next_leaf_index,
        )?;
        validate_commitment_pda(
            ctx.accounts.change_commitment_acc.key(),
            coordinator.key(),
            coordinator.next_leaf_index + 1,
        )?;

        // Write new_commitment_acc data manually (UncheckedAccount)
        {
            let mut data = ctx.accounts.new_commitment_acc.try_borrow_mut_data()?;
            let record = CommitmentRecord {
                commitment: inputs.new_commitment,
                leaf_index: coordinator.next_leaf_index,
            };
            let mut cursor = std::io::Cursor::new(&mut data[8..]);
            AnchorSerialize::serialize(&record, &mut cursor).map_err(|_| error!(ErrorCode::InvalidToken))?;
        }
        coordinator.next_leaf_index += 1;

        // Write change_commitment_acc data manually (UncheckedAccount)
        {
            let mut data = ctx.accounts.change_commitment_acc.try_borrow_mut_data()?;
            let record = CommitmentRecord {
                commitment: inputs.change_commitment,
                leaf_index: coordinator.next_leaf_index,
            };
            let mut cursor = std::io::Cursor::new(&mut data[8..]);
            AnchorSerialize::serialize(&record, &mut cursor).map_err(|_| error!(ErrorCode::InvalidToken))?;
        }
        coordinator.next_leaf_index += 1;

        Ok(())
    }

    pub fn shielded_mint(ctx: Context<ShieldedMint>, inputs: MintPublicInputs, proof: Vec<u8>, liquidity_delta: u128) -> Result<()> {
        let inputs_box = Box::new(inputs.clone());
        require!(ctx.accounts.root_record.root == inputs_box.root, ErrorCode::UnknownRoot);

        let mut tick_lower_bytes = [0u8; 32];
        tick_lower_bytes[0..4].copy_from_slice(&inputs_box.tick_lower.to_le_bytes());
        let mut tick_upper_bytes = [0u8; 32];
        tick_upper_bytes[0..4].copy_from_slice(&inputs_box.tick_upper.to_le_bytes());

        // Note: snarkjs outputs are placed before public inputs
        let public_inputs: [[u8; 32]; 8] = [
            inputs_box.change_commitment0,
            inputs_box.change_commitment1,
            inputs_box.root,
            inputs_box.nullifier_hash0,
            inputs_box.nullifier_hash1,
            inputs_box.position_commitment,
            tick_lower_bytes,
            tick_upper_bytes,
        ];

        let mut proof_a = [0u8; 64];
        proof_a.copy_from_slice(&proof[0..64]);
        let mut proof_b = [0u8; 128];
        proof_b.copy_from_slice(&proof[64..192]);
        let mut proof_c = [0u8; 64];
        proof_c.copy_from_slice(&proof[192..256]);

        let verifying_key = groth16_solana::groth16::Groth16Verifyingkey {
            nr_pubinputs: 8,
            vk_alpha_g1: crate::vk::mint_vk::VK_ALPHA_G1,
            vk_beta_g2: crate::vk::mint_vk::VK_BETA_G2,
            vk_gamme_g2: crate::vk::mint_vk::VK_GAMMA_G2,
            vk_delta_g2: crate::vk::mint_vk::VK_DELTA_G2,
            vk_ic: &crate::vk::mint_vk::VK_IC,
        };

        let mut verifier = groth16_solana::groth16::Groth16Verifier::new(
            &proof_a,
            &proof_b,
            &proof_c,
            &public_inputs,
            &verifying_key,
        ).map_err(|_| ErrorCode::InvalidProof)?;

        verifier.verify().map_err(|_| ErrorCode::InvalidProof)?;

        // Spend nullifiers
        let n0 = &mut ctx.accounts.nullifier_record0;
        n0.spent = true;
        n0.nullifier_hash = inputs_box.nullifier_hash0;

        let n1 = &mut ctx.accounts.nullifier_record1;
        n1.spent = true;
        n1.nullifier_hash = inputs_box.nullifier_hash1;

        let pool = &mut ctx.accounts.pool;
        let (amount0, amount1) = amounts_for_liquidity(
            pool.sqrt_price_x96,
            pool.sqrt_price_lower_x96,
            pool.sqrt_price_upper_x96,
            liquidity_delta
        )?;

        require!(pool.shielded_balance0 >= amount0, ErrorCode::InsufficientShieldedBalance);
        require!(pool.shielded_balance1 >= amount1, ErrorCode::InsufficientShieldedBalance);

        pool.shielded_balance0 -= amount0;
        pool.shielded_balance1 -= amount1;
        pool.reserve0 += amount0;
        pool.reserve1 += amount1;
        pool.total_liquidity += liquidity_delta;

        let coordinator = &mut ctx.accounts.coordinator;
        require!(
            coordinator.next_leaf_index.saturating_add(2) < MAX_TREE_LEAVES,
            ErrorCode::TreeFull
        );
        validate_commitment_pda(
            ctx.accounts.position_commitment_acc.key(),
            coordinator.key(),
            coordinator.next_leaf_index,
        )?;
        validate_commitment_pda(
            ctx.accounts.change_commitment0_acc.key(),
            coordinator.key(),
            coordinator.next_leaf_index + 1,
        )?;
        validate_commitment_pda(
            ctx.accounts.change_commitment1_acc.key(),
            coordinator.key(),
            coordinator.next_leaf_index + 2,
        )?;

        // Write position_commitment_acc data manually (UncheckedAccount)
        {
            let mut data = ctx.accounts.position_commitment_acc.try_borrow_mut_data()?;
            let record = CommitmentRecord {
                commitment: inputs_box.position_commitment,
                leaf_index: coordinator.next_leaf_index,
            };
            let mut cursor = std::io::Cursor::new(&mut data[8..]);
            AnchorSerialize::serialize(&record, &mut cursor).map_err(|_| error!(ErrorCode::InvalidToken))?;
        }
        coordinator.next_leaf_index += 1;

        // Write change_commitment0_acc data manually (UncheckedAccount)
        {
            let mut data = ctx.accounts.change_commitment0_acc.try_borrow_mut_data()?;
            let record = CommitmentRecord {
                commitment: inputs_box.change_commitment0,
                leaf_index: coordinator.next_leaf_index,
            };
            let mut cursor = std::io::Cursor::new(&mut data[8..]);
            AnchorSerialize::serialize(&record, &mut cursor).map_err(|_| error!(ErrorCode::InvalidToken))?;
        }
        coordinator.next_leaf_index += 1;

        // Write change_commitment1_acc data manually (UncheckedAccount)
        {
            let mut data = ctx.accounts.change_commitment1_acc.try_borrow_mut_data()?;
            let record = CommitmentRecord {
                commitment: inputs_box.change_commitment1,
                leaf_index: coordinator.next_leaf_index,
            };
            let mut cursor = std::io::Cursor::new(&mut data[8..]);
            AnchorSerialize::serialize(&record, &mut cursor).map_err(|_| error!(ErrorCode::InvalidToken))?;
        }
        coordinator.next_leaf_index += 1;

        Ok(())
    }

    pub fn collect_protocol_fees(ctx: Context<CollectProtocolFees>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let fees0 = pool.reserve0.saturating_mul(pool.protocol_fee_bps as u64) / 10_000;
        let fees1 = pool.reserve1.saturating_mul(pool.protocol_fee_bps as u64) / 10_000;

        pool.reserve0 -= fees0;
        pool.reserve1 -= fees1;

        let seeds = &[
            b"pool",
            pool.token0.as_ref(),
            pool.token1.as_ref(),
            &pool.fee.to_le_bytes(),
            &[ctx.bumps.pool_pda],
        ];
        let signer = &[&seeds[..]];

        if fees0 > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.pool_token0.to_account_info(),
                to: ctx.accounts.fee_token0.to_account_info(),
                authority: pool.to_account_info(),
            };
            token::transfer(
                CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts, signer),
                fees0,
            )?;
        }

        if fees1 > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.pool_token1.to_account_info(),
                to: ctx.accounts.fee_token1.to_account_info(),
                authority: pool.to_account_info(),
            };
            token::transfer(
                CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts, signer),
                fees1,
            )?;
        }

        Ok(())
    }

    pub fn submit_root(ctx: Context<SubmitRoot>, new_root: [u8; 32]) -> Result<()> {
        let coordinator = &mut ctx.accounts.coordinator;
        require!(ctx.accounts.submitter.key() == coordinator.root_submitter, ErrorCode::InvalidSubmitter);
        
        coordinator.current_root = new_root;

        let root_record = &mut ctx.accounts.root_record;
        root_record.root = new_root;
        
        let clock = Clock::get()?;
        root_record.timestamp = clock.unix_timestamp;

        Ok(())
    }

    pub fn shielded_burn(ctx: Context<ShieldedBurn>, inputs: BurnPublicInputs, proof: Vec<u8>, liquidity_delta: u128) -> Result<()> {
        let inputs_box = Box::new(inputs.clone());
        require!(ctx.accounts.root_record.root == inputs_box.root, ErrorCode::UnknownRoot);

        let mut tick_lower_bytes = [0u8; 32];
        tick_lower_bytes[0..4].copy_from_slice(&inputs_box.tick_lower.to_le_bytes());
        let mut tick_upper_bytes = [0u8; 32];
        tick_upper_bytes[0..4].copy_from_slice(&inputs_box.tick_upper.to_le_bytes());

        // Note: snarkjs outputs are placed before public inputs
        let public_inputs: [[u8; 32]; 6] = [
            inputs_box.new_commitment0,
            inputs_box.new_commitment1,
            inputs_box.root,
            inputs_box.position_nullifier_hash,
            tick_lower_bytes,
            tick_upper_bytes,
        ];

        let mut proof_a = [0u8; 64];
        proof_a.copy_from_slice(&proof[0..64]);
        let mut proof_b = [0u8; 128];
        proof_b.copy_from_slice(&proof[64..192]);
        let mut proof_c = [0u8; 64];
        proof_c.copy_from_slice(&proof[192..256]);

        let verifying_key = groth16_solana::groth16::Groth16Verifyingkey {
            nr_pubinputs: 6,
            vk_alpha_g1: crate::vk::burn_vk::VK_ALPHA_G1,
            vk_beta_g2: crate::vk::burn_vk::VK_BETA_G2,
            vk_gamme_g2: crate::vk::burn_vk::VK_GAMMA_G2,
            vk_delta_g2: crate::vk::burn_vk::VK_DELTA_G2,
            vk_ic: &crate::vk::burn_vk::VK_IC,
        };

        let mut verifier = groth16_solana::groth16::Groth16Verifier::new(
            &proof_a,
            &proof_b,
            &proof_c,
            &public_inputs,
            &verifying_key,
        ).map_err(|_| ErrorCode::InvalidProof)?;

        verifier.verify().map_err(|_| ErrorCode::InvalidProof)?;

        // Spend position nullifier
        let n_pos = &mut ctx.accounts.position_nullifier_record;
        n_pos.spent = true;
        n_pos.nullifier_hash = inputs_box.position_nullifier_hash;

        let pool = &mut ctx.accounts.pool;
        let (amount0, amount1) = amounts_for_liquidity(
            pool.sqrt_price_x96,
            pool.sqrt_price_lower_x96,
            pool.sqrt_price_upper_x96,
            liquidity_delta
        )?;

        // Burn means pool sends shielded balances back to user as notes
        pool.shielded_balance0 += amount0;
        pool.shielded_balance1 += amount1;
        pool.reserve0 -= amount0;
        pool.reserve1 -= amount1;
        pool.total_liquidity -= liquidity_delta;

        let coordinator = &mut ctx.accounts.coordinator;
        require!(
            coordinator.next_leaf_index.saturating_add(1) < MAX_TREE_LEAVES,
            ErrorCode::TreeFull
        );
        validate_commitment_pda(
            ctx.accounts.new_commitment0_acc.key(),
            coordinator.key(),
            coordinator.next_leaf_index,
        )?;
        validate_commitment_pda(
            ctx.accounts.new_commitment1_acc.key(),
            coordinator.key(),
            coordinator.next_leaf_index + 1,
        )?;

        // Write new_commitment0_acc data manually (UncheckedAccount)
        {
            let mut data = ctx.accounts.new_commitment0_acc.try_borrow_mut_data()?;
            let record = CommitmentRecord {
                commitment: inputs_box.new_commitment0,
                leaf_index: coordinator.next_leaf_index,
            };
            let mut cursor = std::io::Cursor::new(&mut data[8..]);
            AnchorSerialize::serialize(&record, &mut cursor).map_err(|_| error!(ErrorCode::InvalidToken))?;
        }
        coordinator.next_leaf_index += 1;

        // Write new_commitment1_acc data manually (UncheckedAccount)
        {
            let mut data = ctx.accounts.new_commitment1_acc.try_borrow_mut_data()?;
            let record = CommitmentRecord {
                commitment: inputs_box.new_commitment1,
                leaf_index: coordinator.next_leaf_index,
            };
            let mut cursor = std::io::Cursor::new(&mut data[8..]);
            AnchorSerialize::serialize(&record, &mut cursor).map_err(|_| error!(ErrorCode::InvalidToken))?;
        }
        coordinator.next_leaf_index += 1;

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct MembershipPublicInputs {
    pub root: [u8; 32],
    pub nullifier_hash: [u8; 32],
    pub recipient: Pubkey,
    pub token: Pubkey,
    pub amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct SwapPublicInputs {
    pub root: [u8; 32],
    pub nullifier_hash: [u8; 32],
    pub new_commitment: [u8; 32],
    pub change_commitment: [u8; 32],
    pub token_in: Pubkey,
    pub token_out: Pubkey,
    pub amount_in: u64,
    pub amount_out_min: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct MintPublicInputs {
    pub root: [u8; 32],
    pub nullifier_hash0: [u8; 32],
    pub nullifier_hash1: [u8; 32],
    pub position_commitment: [u8; 32],
    pub tick_lower: u32,
    pub tick_upper: u32,
    pub change_commitment0: [u8; 32],
    pub change_commitment1: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct BurnPublicInputs {
    pub new_commitment0: [u8; 32],
    pub new_commitment1: [u8; 32],
    pub root: [u8; 32],
    pub position_nullifier_hash: [u8; 32],
    pub tick_lower: u32,
    pub tick_upper: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct PoolConfigParams {
    pub fee: u32,
    pub tick_spacing: u32,
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub sqrt_price_lower_x96: u128,
    pub sqrt_price_upper_x96: u128,
    pub initial_sqrt_price_x96: u128,
    pub protocol_fee_bps: u16,
    pub fee_recipient: Pubkey,
}

#[derive(Accounts)]
pub struct InitializeCoordinator<'info> {
    #[account(init, payer = owner, space = 8 + 32 + 32 + 32 + 4 + 1)]
    pub coordinator: Account<'info, CoordinatorState>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(config: PoolConfigParams)]
pub struct CreatePool<'info> {
    #[account(
        init, 
        payer = owner, 
        space = 8 + 32*3 + 4*2 + 4*2 + 16*4 + 2 + 32 + 16*2,
        seeds = [b"pool", token0_mint.key().as_ref(), token1_mint.key().as_ref(), config.fee.to_le_bytes().as_ref()],
        bump
    )]
    pub pool: Account<'info, PoolState>,
    pub token0_mint: Account<'info, token::Mint>,
    pub token1_mint: Account<'info, token::Mint>,
    pub coordinator: Account<'info, CoordinatorState>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintLiquidity<'info> {
    #[account(mut)]
    pub pool: Account<'info, PoolState>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 16 + 16*2 + 16*2,
        seeds = [b"position", pool.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub position: Account<'info, PositionState>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token0: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token1: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_token0: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_token1: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64, commitment: [u8; 32])]
pub struct ShieldedDeposit<'info> {
    #[account(mut)]
    pub pool: Account<'info, PoolState>,
    #[account(mut)]
    pub coordinator: Account<'info, CoordinatorState>,
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 4,
        seeds = [b"commitment", coordinator.key().as_ref(), coordinator.next_leaf_index.to_le_bytes().as_ref()],
        bump
    )]
    pub commitment_account: Account<'info, CommitmentRecord>,
    pub token_mint: Account<'info, token::Mint>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_token_custody: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(inputs: MembershipPublicInputs)]
pub struct ShieldedWithdraw<'info> {
    #[account(mut)]
    pub pool: Account<'info, PoolState>,
    #[account(
        seeds = [b"pool", pool.token0.as_ref(), pool.token1.as_ref(), pool.fee.to_le_bytes().as_ref()],
        bump
    )]
    pub pool_pda: Account<'info, PoolState>,
    #[account(mut)]
    pub coordinator: Account<'info, CoordinatorState>,
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 1,
        seeds = [b"nullifier", inputs.nullifier_hash.as_ref()],
        bump
    )]
    pub nullifier_record: Account<'info, NullifierRecord>,
    #[account(
        seeds = [b"root", inputs.root.as_ref()],
        bump
    )]
    pub root_record: Account<'info, MerkleRootRecord>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub pool_token_custody: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(inputs: SwapPublicInputs)]
pub struct ShieldedSwap<'info> {
    #[account(mut)]
    pub pool: Account<'info, PoolState>,
    #[account(mut)]
    pub coordinator: Account<'info, CoordinatorState>,
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 1,
        seeds = [b"nullifier", inputs.nullifier_hash.as_ref()],
        bump
    )]
    pub nullifier_record: Account<'info, NullifierRecord>,
    #[account(
        seeds = [b"root", inputs.root.as_ref()],
        bump
    )]
    pub root_record: Account<'info, MerkleRootRecord>,
    /// CHECK: commitment PDAs validated by seeds
    #[account(mut)]
    pub new_commitment_acc: UncheckedAccount<'info>,
    /// CHECK: commitment PDAs validated by seeds
    #[account(mut)]
    pub change_commitment_acc: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(inputs: MintPublicInputs)]
pub struct ShieldedMint<'info> {
    #[account(mut)]
    pub pool: Account<'info, PoolState>,
    #[account(mut)]
    pub coordinator: Account<'info, CoordinatorState>,
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 1,
        seeds = [b"nullifier", inputs.nullifier_hash0.as_ref()],
        bump
    )]
    pub nullifier_record0: Account<'info, NullifierRecord>,
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 1,
        seeds = [b"nullifier", inputs.nullifier_hash1.as_ref()],
        bump
    )]
    pub nullifier_record1: Account<'info, NullifierRecord>,
    #[account(
        seeds = [b"root", inputs.root.as_ref()],
        bump
    )]
    pub root_record: Account<'info, MerkleRootRecord>,
    /// CHECK: commitment PDA validated by seeds in handler
    #[account(mut)]
    pub position_commitment_acc: UncheckedAccount<'info>,
    /// CHECK: commitment PDA validated by seeds in handler
    #[account(mut)]
    pub change_commitment0_acc: UncheckedAccount<'info>,
    /// CHECK: commitment PDA validated by seeds in handler
    #[account(mut)]
    pub change_commitment1_acc: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(inputs: BurnPublicInputs)]
pub struct ShieldedBurn<'info> {
    #[account(mut)]
    pub pool: Account<'info, PoolState>,
    #[account(mut)]
    pub coordinator: Account<'info, CoordinatorState>,
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 1,
        seeds = [b"nullifier", inputs.position_nullifier_hash.as_ref()],
        bump
    )]
    pub position_nullifier_record: Account<'info, NullifierRecord>,
    #[account(
        seeds = [b"root", inputs.root.as_ref()],
        bump
    )]
    pub root_record: Account<'info, MerkleRootRecord>,
    /// CHECK: commitment PDA validated by seeds in handler
    #[account(mut)]
    pub new_commitment0_acc: UncheckedAccount<'info>,
    /// CHECK: commitment PDA validated by seeds in handler
    #[account(mut)]
    pub new_commitment1_acc: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CollectProtocolFees<'info> {
    #[account(
        mut,
        constraint = fee_recipient.key() == pool.fee_recipient @ ErrorCode::InvalidSubmitter,
    )]
    pub pool: Account<'info, PoolState>,
    #[account(
        seeds = [b"pool", pool.token0.as_ref(), pool.token1.as_ref(), pool.fee.to_le_bytes().as_ref()],
        bump
    )]
    pub pool_pda: Account<'info, PoolState>,
    #[account(mut)]
    pub fee_recipient: Signer<'info>,
    #[account(mut)]
    pub pool_token0: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_token1: Account<'info, TokenAccount>,
    #[account(mut)]
    pub fee_token0: Account<'info, TokenAccount>,
    #[account(mut)]
    pub fee_token1: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(new_root: [u8; 32])]
pub struct SubmitRoot<'info> {
    #[account(mut)]
    pub coordinator: Account<'info, CoordinatorState>,
    #[account(
        init_if_needed,
        payer = submitter,
        space = 8 + 32 + 8,
        seeds = [b"root", new_root.as_ref()],
        bump
    )]
    pub root_record: Account<'info, MerkleRootRecord>,
    #[account(mut)]
    pub submitter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct CoordinatorState {
    pub owner: Pubkey,
    pub root_submitter: Pubkey,
    pub current_root: [u8; 32],
    pub next_leaf_index: u32,
    pub paused: bool,
}

#[account]
pub struct PoolState {
    pub token0: Pubkey,
    pub token1: Pubkey,
    pub fee: u32,
    pub tick_spacing: u32,
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub sqrt_price_lower_x96: u128,
    pub sqrt_price_upper_x96: u128,
    pub sqrt_price_x96: u128,
    pub total_liquidity: u128,
    pub reserve0: u64,
    pub reserve1: u64,
    pub shielded_balance0: u64,
    pub shielded_balance1: u64,
    pub protocol_fee_bps: u16,
    pub fee_recipient: Pubkey,
    pub coordinator: Pubkey,
}

#[account]
pub struct PositionState {
    pub liquidity: u128,
    pub fee_growth_0_last: u128,
    pub fee_growth_1_last: u128,
    pub tokens_owed_0: u64,
    pub tokens_owed_1: u64,
}

#[account]
pub struct CommitmentRecord {
    pub commitment: [u8; 32],
    pub leaf_index: u32,
}

#[account]
pub struct MerkleRootRecord {
    pub root: [u8; 32],
    pub timestamp: i64,
}

#[account]
pub struct NullifierRecord {
    pub nullifier_hash: [u8; 32],
    pub spent: bool,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid token for this pool")]
    InvalidToken,
    #[msg("Unknown Merkle root")]
    UnknownRoot,
    #[msg("Insufficient shielded balance")]
    InsufficientShieldedBalance,
    #[msg("Invalid token pair for swap")]
    InvalidTokenPair,
    #[msg("Invalid ZK Proof")]
    InvalidProof,
    #[msg("Invalid root submitter")]
    InvalidSubmitter,
    #[msg("Invalid range provided")]
    InvalidRange,
    #[msg("Liquidity cannot be zero")]
    InvalidLiquidity,
    #[msg("Swap output below slippage minimum")]
    SlippageExceeded,
    #[msg("Merkle tree is full")]
    TreeFull,
    #[msg("Commitment account does not match expected PDA")]
    InvalidCommitmentPDA,
}
