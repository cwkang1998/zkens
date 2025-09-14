// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ShieldedPool} from "../src/ShieldedPool.sol";
import {VerifierMock} from "../src/VerifierMock.sol";

/// @notice Example deployment script: deploys VerifierMock and ShieldedPool.
/// Replace VerifierMock with your real verifier when integrating circuits.
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        VerifierMock verifier = new VerifierMock();
        ShieldedPool pool = new ShieldedPool(verifier);

        vm.stopBroadcast();

        // Logs
        console2.log("VerifierMock:", address(verifier));
        console2.log("ShieldedPool:", address(pool));

        // Also write to a deterministic local deployments file for other services to consume.
        string memory outDir = string.concat(vm.projectRoot(), "/deployments");
        string memory outFile = string.concat(outDir, "/local.json");
        string memory json = vm.serializeAddress("addrs", "verifier", address(verifier));
        json = vm.serializeAddress("addrs", "shieldedPool", address(pool));
        vm.createDir(outDir, true);
        vm.writeJson(json, outFile);
    }
}
