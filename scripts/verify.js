const { run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(60));
  console.log("Starting Contract Verification...");
  console.log("=".repeat(60));

  // Read deployment info
  const contractName = "ParkingReservation";
  const deploymentFile = path.join(
    __dirname,
    "..",
    "deployments",
    `${network.name}-${contractName}.json`
  );

  if (!fs.existsSync(deploymentFile)) {
    throw new Error(
      `❌ Deployment file not found: ${deploymentFile}\nPlease run deployment script first: npx hardhat run scripts/deploy.js --network ${network.name}`
    );
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

  console.log("\n📋 Contract Information:");
  console.log("─".repeat(60));
  console.log("Contract Name:", deploymentInfo.contractName);
  console.log("Contract Address:", deploymentInfo.contractAddress);
  console.log("Network Name:", deploymentInfo.network);
  console.log("Deployer:", deploymentInfo.deployer);
  console.log("Deployment Time:", deploymentInfo.deploymentTime);
  console.log("─".repeat(60));

  // Check if network supports verification
  const verifiableNetworks = ["sepolia", "mainnet", "goerli", "polygon", "mumbai"];
  if (!verifiableNetworks.includes(network.name)) {
    console.log(`\n⚠️  Network "${network.name}" does not support Etherscan verification`);
    console.log("Supported networks:", verifiableNetworks.join(", "));
    return;
  }

  // Check Etherscan API Key
  if (!process.env.ETHERSCAN_API_KEY) {
    throw new Error(
      "❌ ETHERSCAN_API_KEY not set in environment variables\nPlease add to .env file: ETHERSCAN_API_KEY=your_api_key"
    );
  }

  console.log("\n⏳ Waiting for block confirmations...");
  console.log("Recommended to wait at least 5 block confirmations before verification");
  await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds

  // Constructor arguments (if any)
  const constructorArguments = [];

  console.log("\n🔍 Starting contract verification on Etherscan...");
  console.log("─".repeat(60));

  try {
    await run("verify:verify", {
      address: deploymentInfo.contractAddress,
      constructorArguments: constructorArguments,
      contract: `contracts/${contractName}.sol:${contractName}`,
    });

    console.log("\n✅ Contract verified successfully!");
    console.log("─".repeat(60));

    // Display Etherscan link
    const explorerUrls = {
      sepolia: `https://sepolia.etherscan.io/address/${deploymentInfo.contractAddress}#code`,
      mainnet: `https://etherscan.io/address/${deploymentInfo.contractAddress}#code`,
      goerli: `https://goerli.etherscan.io/address/${deploymentInfo.contractAddress}#code`,
      polygon: `https://polygonscan.com/address/${deploymentInfo.contractAddress}#code`,
      mumbai: `https://mumbai.polygonscan.com/address/${deploymentInfo.contractAddress}#code`,
    };

    const explorerUrl = explorerUrls[network.name];
    if (explorerUrl) {
      console.log("📊 View verified contract code:");
      console.log(explorerUrl);
    }

    // Update deployment info
    deploymentInfo.verified = true;
    deploymentInfo.verifiedAt = new Date().toISOString();
    deploymentInfo.explorerUrl = explorerUrl;
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Verification info updated in: ${deploymentFile}`);

  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("\n✅ Contract already verified!");

      const explorerUrls = {
        sepolia: `https://sepolia.etherscan.io/address/${deploymentInfo.contractAddress}#code`,
        mainnet: `https://etherscan.io/address/${deploymentInfo.contractAddress}#code`,
        goerli: `https://goerli.etherscan.io/address/${deploymentInfo.contractAddress}#code`,
      };

      const explorerUrl = explorerUrls[network.name];
      if (explorerUrl) {
        console.log("📊 View contract code:");
        console.log(explorerUrl);
      }
    } else {
      throw error;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✨ Verification Complete!");
  console.log("=".repeat(60));
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Verification Failed:");
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = main;
