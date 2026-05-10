use anchor_lang::prelude::*;

pub const Q96: u128 = 1 << 96;
pub const FEE_DENOMINATOR: u64 = 1_000_000;

pub fn mul_div(a: u128, b: u128, denominator: u128) -> u128 {
    (a * b) / denominator
}

pub fn validate_range(
    sqrt_price_lower_x96: u128,
    sqrt_price_upper_x96: u128,
    sqrt_price_x96: u128,
) -> Result<()> {
    if sqrt_price_lower_x96 == 0
        || sqrt_price_upper_x96 <= sqrt_price_lower_x96
        || sqrt_price_x96 < sqrt_price_lower_x96
        || sqrt_price_x96 > sqrt_price_upper_x96
    {
        return Err(error!(crate::ErrorCode::InvalidRange));
    }
    Ok(())
}

pub fn compute_swap_output(
    reserve_in: u64,
    reserve_out: u64,
    amount_in: u64,
    fee: u32,
) -> Result<u64> {
    require!(reserve_in > 0 && reserve_out > 0, crate::ErrorCode::InvalidLiquidity);
    require!((fee as u64) < FEE_DENOMINATOR, crate::ErrorCode::InvalidRange);

    let fee_adjusted = (FEE_DENOMINATOR - fee as u64) as u128;
    let amount_in_after_fee = (amount_in as u128) * fee_adjusted / FEE_DENOMINATOR as u128;
    let numerator = (reserve_out as u128) * amount_in_after_fee;
    let denominator = (reserve_in as u128) + amount_in_after_fee;

    Ok((numerator / denominator) as u64)
}

pub fn amounts_for_liquidity(
    sqrt_price_x96: u128,
    sqrt_price_lower_x96: u128,
    sqrt_price_upper_x96: u128,
    liquidity: u128,
) -> Result<(u64, u64)> {
    if liquidity == 0 {
        return Err(error!(crate::ErrorCode::InvalidLiquidity));
    }
    validate_range(sqrt_price_lower_x96, sqrt_price_upper_x96, sqrt_price_x96)?;

    let liquidity_x96 = liquidity * Q96;
    let amount0 = mul_div(
        liquidity_x96,
        sqrt_price_upper_x96 - sqrt_price_x96,
        sqrt_price_upper_x96,
    ) / sqrt_price_x96;

    let amount1 = mul_div(liquidity, sqrt_price_x96 - sqrt_price_lower_x96, Q96);

    Ok((amount0 as u64, amount1 as u64))
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- mul_div ---

    #[test]
    fn mul_div_basic() {
        assert_eq!(mul_div(100, 200, 10), 2000);
    }

    #[test]
    fn mul_div_zero_numerator() {
        assert_eq!(mul_div(0, 200, 10), 0);
    }

    #[test]
    fn mul_div_truncates_toward_zero() {
        // 10 * 3 / 4 = 7.5 → 7
        assert_eq!(mul_div(10, 3, 4), 7);
    }

    // --- validate_range ---

    #[test]
    fn validate_range_valid() {
        assert!(validate_range(100, 200, 150).is_ok());
        assert!(validate_range(100, 200, 100).is_ok()); // price == lower bound is valid
    }

    #[test]
    fn validate_range_zero_lower_fails() {
        assert!(validate_range(0, 200, 100).is_err());
    }

    #[test]
    fn validate_range_inverted_bounds_fails() {
        assert!(validate_range(200, 100, 150).is_err());
        assert!(validate_range(100, 100, 100).is_err()); // equal bounds
    }

    #[test]
    fn validate_range_price_below_lower_fails() {
        assert!(validate_range(100, 200, 50).is_err());
    }

    #[test]
    fn validate_range_price_above_upper_fails() {
        assert!(validate_range(100, 200, 250).is_err());
    }

    // --- compute_swap_output ---

    #[test]
    fn swap_output_no_fee() {
        // AMM: out = reserve_out * in / (reserve_in + in) = 1000*100/1100 = 90
        let out = compute_swap_output(1000, 1000, 100, 0).unwrap();
        assert_eq!(out, 90);
    }

    #[test]
    fn swap_output_with_fee() {
        // fee=3000 (0.3%), in_after_fee = 100*997000/1_000_000 = 99
        // out = 1000*99 / (1000+99) = 99000/1099 = 90
        let out = compute_swap_output(1000, 1000, 100, 3000).unwrap();
        assert_eq!(out, 90);
    }

    #[test]
    fn swap_output_larger_input_gives_larger_output() {
        let out1 = compute_swap_output(1_000_000, 1_000_000, 1_000, 0).unwrap();
        let out2 = compute_swap_output(1_000_000, 1_000_000, 10_000, 0).unwrap();
        assert!(out2 > out1);
    }

    #[test]
    fn swap_output_price_impact_is_sublinear() {
        // Doubling input yields less than double output (AMM invariant)
        let out1 = compute_swap_output(1_000_000, 1_000_000, 1_000, 0).unwrap();
        let out2 = compute_swap_output(1_000_000, 1_000_000, 2_000, 0).unwrap();
        assert!(out2 < out1 * 2);
    }

    #[test]
    fn swap_output_zero_reserve_in_fails() {
        assert!(compute_swap_output(0, 1000, 100, 0).is_err());
    }

    #[test]
    fn swap_output_zero_reserve_out_fails() {
        assert!(compute_swap_output(1000, 0, 100, 0).is_err());
    }

    #[test]
    fn swap_output_fee_at_denominator_fails() {
        assert!(compute_swap_output(1000, 1000, 100, 1_000_000).is_err());
    }

    #[test]
    fn swap_output_fee_above_denominator_fails() {
        assert!(compute_swap_output(1000, 1000, 100, 1_000_001).is_err());
    }

    #[test]
    fn swap_output_zero_amount_in() {
        // 0 input → 0 output
        let out = compute_swap_output(1000, 1000, 0, 0).unwrap();
        assert_eq!(out, 0);
    }
}
