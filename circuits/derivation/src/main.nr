use dep common;

// Return both the stealth commitment and a 1-byte view tag.
fn main(p_spend : Field, p_view : Field, r : Field) -> (pub Field, pub Field) {
    let a_stealth = common::derive_commitment(p_spend, p_view, r);
    let view_tag  = common::derive_view_tag(p_view, r);
    (a_stealth, view_tag)
}

#[test]
fn test_derivation_simple() {
    let (a, t) = main(1, 2, 3);
    let a2 = common::derive_commitment(1, 2, 3);
    let t2 = common::derive_view_tag(2, 3);
    assert(a == a2);
    assert(t == t2);
}
