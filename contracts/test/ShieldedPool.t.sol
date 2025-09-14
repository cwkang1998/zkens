// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ShieldedPool} from "../src/ShieldedPool.sol";
import {VerifierMock} from "../src/VerifierMock.sol";

contract ShieldedPoolTest is Test {
    ShieldedPool internal pool;
    VerifierMock internal verifier;

    address internal alice = address(0xA11CE);
    address payable internal bob = payable(address(0xB0B));
    address payable internal relayer = payable(address(0xBEEF));

    function setUp() public {
        verifier = new VerifierMock();
        pool = new ShieldedPool(verifier);

        // Fund test actors
        vm.deal(alice, 10 ether);
        vm.deal(address(this), 0);
        vm.deal(bob, 0);
        vm.deal(relayer, 0);
    }

    function test_DepositAndWithdrawFlow() public {
        // Alice deposits 1 ETH with a commitment
        bytes32 commitment = keccak256("commitment-1");
        vm.prank(alice);
        pool.deposit{value: 1 ether}(commitment);

        assertEq(pool.commitmentCount(), 1, "commitment count");
        assertEq(pool.poolBalance(), 1 ether, "pool balance after deposit");

        // Prepare withdrawal
        bytes32 nullifier = keccak256("nullifier-1");
        uint256 amount = 0.8 ether;
        uint256 fee = 0.02 ether;
        bytes memory proof = hex""; // Mock verifier ignores
        bytes32[] memory inputs = new bytes32[](0);

        // Relayer submits the withdrawal on behalf of the user
        vm.prank(relayer);
        pool.withdraw(nullifier, bob, amount, relayer, fee, proof, inputs);

        // Check balances
        assertEq(bob.balance, amount - fee, "recipient amount");
        assertEq(relayer.balance, fee, "relayer fee");
        assertEq(pool.poolBalance(), 1 ether - amount, "pool balance after withdraw");

        // Nullifier should now be marked and cannot be reused
        vm.expectRevert(bytes("SP: nullifier used"));
        vm.prank(relayer);
        pool.withdraw(nullifier, bob, amount, relayer, fee, proof, inputs);
    }

    function test_RevertWhenFeeGtAmount() public {
        bytes32 commitment = keccak256("commitment-2");
        vm.prank(alice);
        pool.deposit{value: 1 ether}(commitment);

        bytes32 nullifier = keccak256("nullifier-2");
        bytes memory proof = hex"";
        bytes32[] memory inputs = new bytes32[](0);

        vm.expectRevert(bytes("SP: fee > amount"));
        pool.withdraw(nullifier, bob, 1, relayer, 2, proof, inputs);
    }
}
