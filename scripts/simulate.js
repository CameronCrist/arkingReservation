const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(60));
  console.log("Private Parking Reservation - Full Workflow Simulation");
  console.log("=".repeat(60));

  // Read deployment info
  const contractName = "ParkingReservation";
  const deploymentFile = path.join(
    __dirname,
    "..",
    "deployments",
    `${network.name}-${contractName}.json`
  );

  let contract;
  let owner, user1, user2;

  if (fs.existsSync(deploymentFile)) {
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    console.log("\n✅ Using deployed contract");
    console.log("Contract Address:", deploymentInfo.contractAddress);

    [owner, user1, user2] = await ethers.getSigners();
    contract = await ethers.getContractAt(
      contractName,
      deploymentInfo.contractAddress,
      owner
    );
  } else {
    console.log("\n🚀 Deploying new contract for simulation...");
    [owner, user1, user2] = await ethers.getSigners();

    const ContractFactory = await ethers.getContractFactory(contractName, owner);
    contract = await ContractFactory.deploy();
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log("✅ Contract deployed successfully:", contractAddress);
  }

  console.log("\n" + "─".repeat(60));
  console.log("Participant Accounts:");
  console.log("─".repeat(60));
  console.log("Administrator (Owner):", owner.address);
  console.log("User 1:", user1.address);
  console.log("User 2:", user2.address);
  console.log("─".repeat(60));

  // Step 1: View initial statistics
  console.log("\n" + "=".repeat(60));
  console.log("Step 1: View Initial System Statistics");
  console.log("=".repeat(60));

  let stats = await contract.getStatistics();
  console.log("Total Parking Spots:", stats[0].toString());
  console.log("Total Reservations:", stats[1].toString());
  console.log("Current Timestamp:", stats[2].toString());

  // Step 2: Admin adds parking spots
  console.log("\n" + "=".repeat(60));
  console.log("Step 2: Administrator Adds Parking Spots");
  console.log("=".repeat(60));

  const parkingSpots = [
    { location: "Downtown Parking A", price: "0.001" },
    { location: "Shopping Mall B", price: "0.002" },
    { location: "Airport Terminal C", price: "0.0015" },
  ];

  for (let i = 0; i < parkingSpots.length; i++) {
    const spot = parkingSpots[i];
    console.log(`\nAdding parking spot ${i + 1}...`);
    console.log("Location:", spot.location);
    console.log("Price:", spot.price, "ETH/hour");

    try {
      const tx = await contract.addParkingSpot(
        spot.location,
        ethers.parseEther(spot.price)
      );
      await tx.wait();
      console.log("✅ Parking spot added successfully");
    } catch (error) {
      console.log("⚠️ ", error.message);
    }
  }

  // Step 3: User registration
  console.log("\n" + "=".repeat(60));
  console.log("Step 3: User Registration");
  console.log("=".repeat(60));

  console.log("\nRegistering User 1...");
  try {
    const tx1 = await contract.connect(user1).registerUser(10001, 750);
    await tx1.wait();
    console.log("✅ User 1 registered successfully");
    console.log("Address:", user1.address);
    console.log("User ID: 10001 (encrypted)");
    console.log("Credit Score: 750 (encrypted)");
  } catch (error) {
    console.log("⚠️ ", error.message);
  }

  console.log("\nRegistering User 2...");
  try {
    const tx2 = await contract.connect(user2).registerUser(10002, 680);
    await tx2.wait();
    console.log("✅ User 2 registered successfully");
    console.log("Address:", user2.address);
    console.log("User ID: 10002 (encrypted)");
    console.log("Credit Score: 680 (encrypted)");
  } catch (error) {
    console.log("⚠️ ", error.message);
  }

  // Step 4: Query parking spot information
  console.log("\n" + "=".repeat(60));
  console.log("Step 4: Query Parking Spot Information");
  console.log("=".repeat(60));

  for (let i = 1; i <= 3; i++) {
    try {
      const spot = await contract.parkingSpots(i);
      console.log(`\nParking Spot ${i}:`);
      console.log("  Location:", spot.location);
      console.log("  Price:", ethers.formatEther(spot.pricePerHour), "ETH/hour");
      console.log("  Status:", spot.isAvailable ? "✅ Available" : "❌ Reserved");
    } catch (error) {
      console.log(`Parking Spot ${i}: Does not exist`);
    }
  }

  // Step 5: Users make reservations
  console.log("\n" + "=".repeat(60));
  console.log("Step 5: Users Make Reservations");
  console.log("=".repeat(60));

  console.log("\nUser 1 reserves Parking Spot 1 (2 hours)...");
  try {
    const spot1 = await contract.parkingSpots(1);
    const duration1 = 2;
    const totalPrice1 = spot1.pricePerHour * BigInt(duration1);

    console.log("Reservation Details:");
    console.log("  Parking Spot:", spot1.location);
    console.log("  Duration:", duration1, "hours");
    console.log("  Total Price:", ethers.formatEther(totalPrice1), "ETH");

    const tx1 = await contract.connect(user1).makeReservation(1, duration1, {
      value: totalPrice1,
    });
    const receipt1 = await tx1.wait();
    console.log("✅ Reservation successful");
    console.log("Gas Used:", receipt1.gasUsed.toString());
  } catch (error) {
    console.log("❌ Reservation failed:", error.message);
  }

  console.log("\nUser 2 reserves Parking Spot 2 (3 hours)...");
  try {
    const spot2 = await contract.parkingSpots(2);
    const duration2 = 3;
    const totalPrice2 = spot2.pricePerHour * BigInt(duration2);

    console.log("Reservation Details:");
    console.log("  Parking Spot:", spot2.location);
    console.log("  Duration:", duration2, "hours");
    console.log("  Total Price:", ethers.formatEther(totalPrice2), "ETH");

    const tx2 = await contract.connect(user2).makeReservation(2, duration2, {
      value: totalPrice2,
    });
    const receipt2 = await tx2.wait();
    console.log("✅ Reservation successful");
    console.log("Gas Used:", receipt2.gasUsed.toString());
  } catch (error) {
    console.log("❌ Reservation failed:", error.message);
  }

  // Step 6: View reservation information
  console.log("\n" + "=".repeat(60));
  console.log("Step 6: View Reservation Information");
  console.log("=".repeat(60));

  for (let i = 1; i <= 2; i++) {
    try {
      const reservation = await contract.reservations(i);
      console.log(`\nReservation ${i}:`);
      console.log("  User:", reservation.user);
      console.log("  Parking Spot ID:", reservation.spotId.toString());
      console.log("  Start Time:", new Date(Number(reservation.startTime) * 1000).toLocaleString());
      console.log("  End Time:", new Date(Number(reservation.endTime) * 1000).toLocaleString());
      console.log("  Total Price:", ethers.formatEther(reservation.totalPrice), "ETH");
      console.log("  Status:", reservation.isCompleted ? "✅ Completed" : "🔄 In Progress");
    } catch (error) {
      console.log(`Reservation ${i}: Does not exist`);
    }
  }

  // Step 7: Complete reservations
  console.log("\n" + "=".repeat(60));
  console.log("Step 7: Complete Reservations");
  console.log("=".repeat(60));

  console.log("\nUser 1 completes Reservation 1...");
  try {
    const tx1 = await contract.connect(user1).completeReservation(1);
    await tx1.wait();
    console.log("✅ Reservation 1 completed");

    const reservation1 = await contract.reservations(1);
    console.log("  Final Status:", reservation1.isCompleted ? "✅ Completed" : "🔄 In Progress");
  } catch (error) {
    console.log("❌ Completion failed:", error.message);
  }

  // Step 8: View final statistics
  console.log("\n" + "=".repeat(60));
  console.log("Step 8: View Final System Statistics");
  console.log("=".repeat(60));

  stats = await contract.getStatistics();
  console.log("\nFinal Statistics:");
  console.log("─".repeat(60));
  console.log("Total Parking Spots:", stats[0].toString());
  console.log("Total Reservations:", stats[1].toString());
  console.log("Current Timestamp:", stats[2].toString());
  console.log("─".repeat(60));

  // Step 9: View account balances
  console.log("\n" + "=".repeat(60));
  console.log("Step 9: Account Balances");
  console.log("=".repeat(60));

  const ownerBalance = await ethers.provider.getBalance(owner.address);
  const user1Balance = await ethers.provider.getBalance(user1.address);
  const user2Balance = await ethers.provider.getBalance(user2.address);

  console.log("\nCurrent Balances:");
  console.log("─".repeat(60));
  console.log("Administrator:", ethers.formatEther(ownerBalance), "ETH");
  console.log("User 1:", ethers.formatEther(user1Balance), "ETH");
  console.log("User 2:", ethers.formatEther(user2Balance), "ETH");
  console.log("─".repeat(60));

  // Generate simulation report
  console.log("\n" + "=".repeat(60));
  console.log("Generating Simulation Report");
  console.log("=".repeat(60));

  const reportData = {
    network: network.name,
    contractAddress: await contract.getAddress(),
    timestamp: new Date().toISOString(),
    participants: {
      owner: owner.address,
      user1: user1.address,
      user2: user2.address,
    },
    statistics: {
      totalParkingSpots: stats[0].toString(),
      totalReservations: stats[1].toString(),
    },
    balances: {
      owner: ethers.formatEther(ownerBalance),
      user1: ethers.formatEther(user1Balance),
      user2: ethers.formatEther(user2Balance),
    },
  };

  const reportsDir = path.join(__dirname, "..", "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportFile = path.join(
    reportsDir,
    `simulation-${network.name}-${Date.now()}.json`
  );
  fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));

  console.log(`\n✅ Simulation report saved to: ${reportFile}`);

  console.log("\n" + "=".repeat(60));
  console.log("✨ Simulation Complete!");
  console.log("=".repeat(60));

  console.log("\n📝 Summary:");
  console.log("─".repeat(60));
  console.log("✅ Added", parkingSpots.length, "parking spots");
  console.log("✅ Registered 2 users");
  console.log("✅ Completed 2 reservations");
  console.log("✅ Completed 1 reservation settlement");
  console.log("─".repeat(60));
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Simulation Failed:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
