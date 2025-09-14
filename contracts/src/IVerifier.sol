// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVerifier {
    /// @notice Verifies a proof against given public inputs.
    /// @dev The concrete verifier implementation defines the encoding.
    /// @param proof Encoded zero-knowledge proof bytes.
    /// @param publicInputs Public inputs as bytes32 words (e.g. merkle root, nullifier, etc.).
    /// @return valid True if the proof is valid.
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool valid);
}

