// Common derivation utilities shared by circuits.
// Demo derivation simulates stealth address logic with Poseidon2.
// In production, follow ERC-5564 (EC ops on secp256k1 + keccak).

pub fn derive_commitment(p_spend : Field, p_view : Field, r : Field) -> Field {
    std::hash::poseidon2::poseidon2([p_spend, p_view, r])
}

// A lightweight view tag: one-byte tag derived from (p_view, r).
// We reduce modulo 256 to keep it in a byte.
pub fn derive_view_tag(p_view : Field, r : Field) -> Field {
    let h = std::hash::poseidon2::poseidon2([p_view, r]);
    h % 256
}

