// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVerifier} from "./IVerifier.sol";

/// @title ShieldedPool (Skeleton)
/// @notice Minimal ETH-based shielded pool with nullifier checks and pluggable verifier.
/// @dev This is a simplified skeleton for integration; not production-ready.
contract ShieldedPool {
    // Reentrancy guard (minimal)
    uint256 private _locked = 1;

    modifier nonReentrant() {
        require(_locked == 1, "SP: reentrant");
        _locked = 2;
        _;
        _locked = 1;
    }

    /// @notice Emitted on new deposit.
    /// @param index Sequential index for the commitment.
    /// @param commitment Commitment representing the note being deposited.
    /// @param amount ETH amount deposited.
    /// @param sender Address that sent the deposit.
    event Deposit(uint256 indexed index, bytes32 indexed commitment, uint256 amount, address indexed sender);

    /// @notice Emitted on successful withdrawal.
    /// @param nullifier Unique nullifier for the withdrawn note.
    /// @param recipient Recipient receiving withdrawn ETH.
    /// @param relayer Relayer receiving the fee.
    /// @param amount Gross withdrawal amount.
    /// @param fee Relayer fee paid out of `amount`.
    event Withdrawal(
        bytes32 indexed nullifier,
        address indexed recipient,
        address indexed relayer,
        uint256 amount,
        uint256 fee
    );

    /// @notice Tracks if a nullifier has been used.
    mapping(bytes32 => bool) public nullifiers;

    /// @notice Stored commitments (for indexation / offchain syncing).
    bytes32[] public commitments;

    /// @notice Proof verifier contract.
    IVerifier public immutable verifier;

    /// @notice Accumulated accounting (informational only).
    uint256 public totalDeposits;
    uint256 public totalWithdrawals;

    constructor(IVerifier _verifier) {
        require(address(_verifier) != address(0), "SP: verifier required");
        verifier = _verifier;
    }

    /// @notice Deposit ETH along with a commitment. Emits Deposit event.
    /// @param commitment The note commitment for this deposit.
    function deposit(bytes32 commitment) external payable nonReentrant {
        uint256 amount = msg.value;
        require(amount > 0, "SP: zero amount");

        uint256 index = commitments.length;
        commitments.push(commitment);

        totalDeposits += amount;
        emit Deposit(index, commitment, amount, msg.sender);
    }

    /// @notice Withdraw ETH using a valid proof, marking a nullifier as spent.
    /// @dev The `publicInputs` layout is defined by the verifier implementation.
    /// Typical inputs include the merkle root and the nullifier.
    /// @param nullifier Unique nullifier for the note being spent.
    /// @param recipient Recipient to receive ETH.
    /// @param amount Gross amount to withdraw (recipient receives amount - fee).
    /// @param relayer Relayer to receive `fee`.
    /// @param fee Fee paid to the relayer. Must be <= amount.
    /// @param proof Encoded proof bytes accepted by the verifier.
    /// @param publicInputs Public inputs corresponding to the proof.
    function withdraw(
        bytes32 nullifier,
        address payable recipient,
        uint256 amount,
        address payable relayer,
        uint256 fee,
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) external nonReentrant {
        require(!nullifiers[nullifier], "SP: nullifier used");
        require(recipient != address(0), "SP: bad recipient");
        require(fee <= amount, "SP: fee > amount");
        require(address(this).balance >= amount, "SP: insufficient pool");

        // Verify ZK proof via pluggable verifier implementation
        bool ok = verifier.verify(proof, publicInputs);
        require(ok, "SP: invalid proof");

        // Effects
        nullifiers[nullifier] = true;
        totalWithdrawals += amount;

        // Interactions
        if (fee > 0 && relayer != address(0)) {
            (bool fr, ) = relayer.call{value: fee}("");
            require(fr, "SP: relayer xfer failed");
        }
        uint256 toRecipient = amount - fee;
        (bool rr, ) = recipient.call{value: toRecipient}("");
        require(rr, "SP: recipient xfer failed");

        emit Withdrawal(nullifier, recipient, relayer, amount, fee);
    }

    /// @notice Number of stored commitments.
    function commitmentCount() external view returns (uint256) {
        return commitments.length;
    }

    /// @notice Contract ETH balance (for convenience/UI).
    function poolBalance() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {
        // Accept direct ETH transfers (e.g., funding the pool for testing).
        totalDeposits += msg.value;
    }
}

