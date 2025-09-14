use dep common;

// Verify both the stealth commitment and the 1-byte view tag.
fn main(
    p_spend   : Field,
    p_view    : Field,
    r         : Field,
    a_stealth : Field,
    view_tag  : Field,
) -> pub bool {
    let recomputed_a = common::derive_commitment(p_spend, p_view, r);
    let recomputed_t = common::derive_view_tag(p_view, r);
    constrain recomputed_a == a_stealth;
    constrain recomputed_t == view_tag;
    true
}

#[test]
fn test_ownership_ok() {
    let p_spend = 1;
    let p_view = 2;
    let r = 3;
    let a = common::derive_commitment(p_spend, p_view, r);
    let t = common::derive_view_tag(p_view, r);
    let ok = main(p_spend, p_view, r, a, t);
    assert(ok == true);
}
