const { network } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log("----------------------------------------------------");
  log("Deploying PrivateParkingReservationV2 contract...");
  log(`Network: ${network.name}`);
  log(`Deployer: ${deployer}`);

  const args = [];

  const privateParkingReservation = await deploy("PrivateParkingReservationV2", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.name === "sepolia" ? 6 : 1,
  });

  log(`Contract deployed at: ${privateParkingReservation.address}`);
  log("----------------------------------------------------");

  // Verify on Etherscan if deployed to testnet/mainnet
  if (network.name === "sepolia" && process.env.ETHERSCAN_API_KEY) {
    log("Waiting for block confirmations...");
    await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait 1 minute

    log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: privateParkingReservation.address,
        constructorArguments: args,
      });
      log("Contract verified successfully!");
    } catch (error) {
      if (error.message.toLowerCase().includes("already verified")) {
        log("Contract already verified!");
      } else {
        log("Verification failed:", error.message);
      }
    }
  }

  log("----------------------------------------------------");
  log("Deployment Summary:");
  log(`Contract: PrivateParkingReservationV2`);
  log(`Address: ${privateParkingReservation.address}`);
  log(`Network: ${network.name}`);
  log(`Block Explorer: ${
    network.name === "sepolia"
      ? `https://sepolia.etherscan.io/address/${privateParkingReservation.address}`
      : "N/A"
  }`);
  log("----------------------------------------------------");
};

module.exports.tags = ["all", "parking"];
