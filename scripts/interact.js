const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Create command line interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Prompt user for input
function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("=".repeat(60));
  console.log("Private Parking Reservation - Contract Interaction Tool");
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
  console.log("Contract Address:", deploymentInfo.contractAddress);
  console.log("Network Name:", network.name);
  console.log("─".repeat(60));

  // Connect to contract
  const [signer] = await ethers.getSigners();
  const contract = await ethers.getContractAt(
    contractName,
    deploymentInfo.contractAddress,
    signer
  );

  console.log("\n👤 Current Account:", signer.address);
  console.log(
    "Account Balance:",
    ethers.formatEther(await ethers.provider.getBalance(signer.address)),
    "ETH\n"
  );

  // Display menu
  while (true) {
    console.log("\n" + "=".repeat(60));
    console.log("Select Operation:");
    console.log("─".repeat(60));
    console.log("1. View System Statistics");
    console.log("2. View Contract Owner");
    console.log("3. Add Parking Spot (Admin Only)");
    console.log("4. View Parking Spot Information");
    console.log("5. Register User");
    console.log("6. View User Information");
    console.log("7. Make Reservation");
    console.log("8. View Reservation Information");
    console.log("9. Complete Reservation");
    console.log("0. Exit");
    console.log("─".repeat(60));

    const choice = await question("Enter option (0-9): ");

    try {
      switch (choice.trim()) {
        case "1":
          await viewStatistics(contract);
          break;
        case "2":
          await viewOwner(contract);
          break;
        case "3":
          await addParkingSpot(contract, signer);
          break;
        case "4":
          await viewParkingSpot(contract);
          break;
        case "5":
          await registerUser(contract, signer);
          break;
        case "6":
          await viewUserInfo(contract);
          break;
        case "7":
          await makeReservation(contract, signer);
          break;
        case "8":
          await viewReservation(contract);
          break;
        case "9":
          await completeReservation(contract, signer);
          break;
        case "0":
          console.log("\n👋 Thank you for using! Goodbye!");
          rl.close();
          return;
        default:
          console.log("\n❌ Invalid option, please try again");
      }
    } catch (error) {
      console.error("\n❌ Operation failed:", error.message);
    }
  }
}

// View system statistics
async function viewStatistics(contract) {
  console.log("\n📊 Fetching system statistics...");
  const stats = await contract.getStatistics();
  console.log("─".repeat(60));
  console.log("Total Parking Spots:", stats[0].toString());
  console.log("Total Reservations:", stats[1].toString());
  console.log("Current Timestamp:", stats[2].toString());
  console.log("─".repeat(60));
}

// View contract owner
async function viewOwner(contract) {
  console.log("\n👤 Fetching contract owner...");
  const owner = await contract.owner();
  console.log("─".repeat(60));
  console.log("Contract Owner:", owner);
  console.log("─".repeat(60));
}

// Add parking spot
async function addParkingSpot(contract, signer) {
  console.log("\n🅿️  Add Parking Spot");
  console.log("─".repeat(60));

  const location = await question("Enter parking spot location (e.g., Downtown Parking A): ");
  const pricePerHour = await question("Enter price per hour (ETH): ");

  console.log("\n⏳ Submitting transaction...");

  const tx = await contract.addParkingSpot(
    location,
    ethers.parseEther(pricePerHour)
  );

  console.log("Transaction Hash:", tx.hash);
  console.log("⏳ Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log("✅ Parking spot added successfully!");
  console.log("Gas Used:", receipt.gasUsed.toString());
}

// View parking spot information
async function viewParkingSpot(contract) {
  const spotId = await question("\nEnter parking spot ID: ");

  console.log("\n🔍 Querying parking spot information...");

  try {
    const spot = await contract.parkingSpots(spotId);
    console.log("─".repeat(60));
    console.log("Parking Spot ID:", spotId);
    console.log("Location:", spot.location);
    console.log("Price Per Hour:", ethers.formatEther(spot.pricePerHour), "ETH");
    console.log("Available:", spot.isAvailable ? "✅ Yes" : "❌ No");
    console.log("Owner:", spot.owner);
    console.log("─".repeat(60));
  } catch (error) {
    console.log("❌ Parking spot does not exist");
  }
}

// Register user
async function registerUser(contract, signer) {
  console.log("\n👤 User Registration");
  console.log("─".repeat(60));
  console.log("Note: FHE encryption requires special client library support");
  console.log("This demo will use regular parameters");
  console.log("─".repeat(60));

  const userId = await question("Enter User ID (number): ");
  const creditScore = await question("Enter Credit Score (300-850): ");

  console.log("\n⏳ Submitting registration transaction...");

  try {
    // Note: In production, use FHE encryption library
    const tx = await contract.registerUser(userId, creditScore);

    console.log("Transaction Hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ User registered successfully!");
    console.log("Gas Used:", receipt.gasUsed.toString());
  } catch (error) {
    console.error("❌ Registration failed:", error.message);
  }
}

// View user information
async function viewUserInfo(contract) {
  const address = await question("\nEnter user address (default: current address): ");
  const userAddress = address.trim() || (await ethers.getSigners())[0].address;

  console.log("\n🔍 Querying user information...");

  try {
    const user = await contract.users(userAddress);
    console.log("─".repeat(60));
    console.log("User Address:", userAddress);
    console.log("Registered:", user.isRegistered ? "✅ Yes" : "❌ No");
    console.log("Registration Time:", new Date(Number(user.registrationTime) * 1000).toLocaleString());
    console.log("─".repeat(60));
  } catch (error) {
    console.log("❌ Query failed");
  }
}

// Make reservation
async function makeReservation(contract, signer) {
  console.log("\n🚗 Make Reservation");
  console.log("─".repeat(60));

  const spotId = await question("Enter parking spot ID: ");
  const duration = await question("Enter reservation duration (hours): ");

  console.log("\n🔍 Querying parking spot price...");

  try {
    const spot = await contract.parkingSpots(spotId);
    const totalPrice = spot.pricePerHour * BigInt(duration);

    console.log("Parking Spot Location:", spot.location);
    console.log("Price Per Hour:", ethers.formatEther(spot.pricePerHour), "ETH");
    console.log("Reservation Duration:", duration, "hours");
    console.log("Total Price:", ethers.formatEther(totalPrice), "ETH");

    const confirm = await question("\nConfirm reservation? (y/n): ");

    if (confirm.toLowerCase() !== "y") {
      console.log("❌ Reservation cancelled");
      return;
    }

    console.log("\n⏳ Submitting reservation transaction...");

    const tx = await contract.makeReservation(spotId, duration, {
      value: totalPrice,
    });

    console.log("Transaction Hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Reservation successful!");
    console.log("Gas Used:", receipt.gasUsed.toString());
  } catch (error) {
    console.error("❌ Reservation failed:", error.message);
  }
}

// View reservation information
async function viewReservation(contract) {
  const reservationId = await question("\nEnter reservation ID: ");

  console.log("\n🔍 Querying reservation information...");

  try {
    const reservation = await contract.reservations(reservationId);
    console.log("─".repeat(60));
    console.log("Reservation ID:", reservationId);
    console.log("User:", reservation.user);
    console.log("Parking Spot ID:", reservation.spotId.toString());
    console.log("Start Time:", new Date(Number(reservation.startTime) * 1000).toLocaleString());
    console.log("End Time:", new Date(Number(reservation.endTime) * 1000).toLocaleString());
    console.log("Total Price:", ethers.formatEther(reservation.totalPrice), "ETH");
    console.log("Completed:", reservation.isCompleted ? "✅ Yes" : "❌ No");
    console.log("─".repeat(60));
  } catch (error) {
    console.log("❌ Reservation does not exist");
  }
}

// Complete reservation
async function completeReservation(contract, signer) {
  const reservationId = await question("\nEnter reservation ID to complete: ");

  console.log("\n⏳ Submitting completion transaction...");

  try {
    const tx = await contract.completeReservation(reservationId);

    console.log("Transaction Hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Reservation completed!");
    console.log("Gas Used:", receipt.gasUsed.toString());
  } catch (error) {
    console.error("❌ Operation failed:", error.message);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Error:");
      console.error(error);
      rl.close();
      process.exit(1);
    });
}

module.exports = main;
