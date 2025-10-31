const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(60));
  console.log("Starting Private Parking Reservation Contract Deployment...");
  console.log("=".repeat(60));

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("\n📋 Deployment Information:");
  console.log("─".repeat(60));
  console.log("Deployer Address:", deployer.address);
  console.log("Account Balance:", ethers.formatEther(balance), "ETH");
  console.log("Network Name:", network.name);
  console.log("Chain ID:", network.config.chainId);
  console.log("─".repeat(60));

  // Check balance
  if (balance === 0n) {
    throw new Error("❌ Insufficient balance! Please fund the deployer account.");
  }

  // Select contract to deploy
  const contractName = "ParkingReservation";
  console.log(`\n🚀 Deploying contract: ${contractName}...`);

  // Deploy contract
  const ContractFactory = await ethers.getContractFactory(contractName);

  console.log("📦 Starting deployment transaction...");
  const contract = await ContractFactory.deploy();

  console.log("⏳ Waiting for deployment confirmation...");
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  console.log("\n✅ Contract deployed successfully!");
  console.log("─".repeat(60));
  console.log("Contract Address:", contractAddress);
  console.log("─".repeat(60));

  // Verify deployment
  console.log("\n🔍 Verifying contract deployment...");
  try {
    const owner = await contract.owner();
    console.log("✓ Contract Owner:", owner);

    const stats = await contract.getStatistics();
    console.log("\n📊 Initial Statistics:");
    console.log("  • Total Parking Spots:", stats[0].toString());
    console.log("  • Total Reservations:", stats[1].toString());
    console.log("  • Current Timestamp:", stats[2].toString());

  } catch (error) {
    console.error("⚠️  Warning during verification:", error.message);
  }

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    contractName: contractName,
    contractAddress: contractAddress,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    txHash: contract.deploymentTransaction()?.hash || "N/A",
  };

  // Create deployments directory
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info to file
  const deploymentFile = path.join(
    deploymentsDir,
    `${network.name}-${contractName}.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);

  // Save ABI
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    `${contractName}.sol`,
    `${contractName}.json`
  );

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abiFile = path.join(deploymentsDir, `${contractName}-ABI.json`);
    fs.writeFileSync(abiFile, JSON.stringify(artifact.abi, null, 2));
    console.log(`📄 ABI saved to: ${abiFile}`);
  }

  // Display blockchain explorer links
  console.log("\n🔗 Blockchain Explorer Links:");
  console.log("─".repeat(60));

  const explorerUrls = {
    sepolia: `https://sepolia.etherscan.io/address/${contractAddress}`,
    mainnet: `https://etherscan.io/address/${contractAddress}`,
    goerli: `https://goerli.etherscan.io/address/${contractAddress}`,
    localhost: "Local Network - No Explorer",
    hardhat: "Hardhat Network - No Explorer",
  };

  const explorerUrl = explorerUrls[network.name] || "Unknown Network";
  console.log("Etherscan:", explorerUrl);
  console.log("─".repeat(60));

  // Display next steps
  console.log("\n📝 Next Steps:");
  console.log("─".repeat(60));
  console.log("1. Verify contract (if on testnet/mainnet):");
  console.log(`   npx hardhat run scripts/verify.js --network ${network.name}`);
  console.log("\n2. Interact with contract:");
  console.log(`   npx hardhat run scripts/interact.js --network ${network.name}`);
  console.log("\n3. Run simulation test:");
  console.log(`   npx hardhat run scripts/simulate.js --network ${network.name}`);
  console.log("─".repeat(60));

  console.log("\n" + "=".repeat(60));
  console.log("✨ Deployment Complete!");
  console.log("=".repeat(60));

  return {
    contract,
    address: contractAddress,
    deployer: deployer.address,
  };
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Deployment Failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
