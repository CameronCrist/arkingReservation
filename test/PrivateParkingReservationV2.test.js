const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("PrivateParkingReservationV2", function () {
  // Fixture for deploying the contract
  async function deployParkingFixture() {
    const [owner, pauser, user1, user2, user3] = await ethers.getSigners();

    const PrivateParkingReservation = await ethers.getContractFactory(
      "PrivateParkingReservationV2"
    );
    const parking = await PrivateParkingReservation.deploy();
    await parking.waitForDeployment();

    return { parking, owner, pauser, user1, user2, user3 };
  }

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);
      expect(await parking.owner()).to.equal(owner.address);
    });

    it("Should set the correct pauser", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);
      expect(await parking.pauser()).to.equal(owner.address);
    });

    it("Should not be paused initially", async function () {
      const { parking } = await loadFixture(deployParkingFixture);
      expect(await parking.paused()).to.equal(false);
    });

    it("Should have zero spots and reservations initially", async function () {
      const { parking } = await loadFixture(deployParkingFixture);
      const stats = await parking.getStatistics();
      expect(stats[0]).to.equal(0); // totalSpots
      expect(stats[1]).to.equal(0); // totalReservations
    });
  });

  describe("Pausable Mechanism", function () {
    it("Should allow pauser to pause the contract", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);
      await expect(parking.connect(owner).pause())
        .to.emit(parking, "ContractPaused")
        .withArgs(owner.address, await getBlockTimestamp());

      expect(await parking.paused()).to.equal(true);
    });

    it("Should allow pauser to unpause the contract", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);
      await parking.connect(owner).pause();

      await expect(parking.connect(owner).unpause())
        .to.emit(parking, "ContractUnpaused");

      expect(await parking.paused()).to.equal(false);
    });

    it("Should revert if non-pauser tries to pause", async function () {
      const { parking, user1 } = await loadFixture(deployParkingFixture);
      await expect(parking.connect(user1).pause()).to.be.revertedWithCustomError(
        parking,
        "NotAuthorized"
      );
    });

    it("Should allow owner to set new pauser", async function () {
      const { parking, owner, user1 } = await loadFixture(deployParkingFixture);

      await expect(parking.connect(owner).setPauser(user1.address))
        .to.emit(parking, "PauserChanged")
        .withArgs(owner.address, user1.address);

      expect(await parking.pauser()).to.equal(user1.address);
    });

    it("Should revert setting zero address as pauser", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);
      await expect(
        parking.connect(owner).setPauser(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid pauser address");
    });
  });

  describe("Parking Spot Management", function () {
    it("Should allow owner to add parking spot", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);
      const price = 100;
      const location = "Spot A1";
      const capacity = 5;

      await expect(parking.connect(owner).addParkingSpot(price, location, capacity))
        .to.emit(parking, "SpotAdded")
        .withArgs(0, location, await getBlockTimestamp());

      const stats = await parking.getStatistics();
      expect(stats[0]).to.equal(1); // totalSpots
    });

    it("Should revert if non-owner tries to add spot", async function () {
      const { parking, user1 } = await loadFixture(deployParkingFixture);
      await expect(
        parking.connect(user1).addParkingSpot(100, "Spot A1", 5)
      ).to.be.revertedWithCustomError(parking, "NotAuthorized");
    });

    it("Should allow owner to update spot price", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);
      await parking.connect(owner).addParkingSpot(100, "Spot A1", 5);

      await expect(parking.connect(owner).updateSpotPrice(0, 150))
        .to.emit(parking, "PriceUpdated")
        .withArgs(0, await getBlockTimestamp());
    });

    it("Should allow owner to set maintenance status", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);
      await parking.connect(owner).addParkingSpot(100, "Spot A1", 5);

      await expect(parking.connect(owner).setSpotMaintenance(0, true))
        .to.emit(parking, "SpotStatusUpdated")
        .withArgs(0, await getBlockTimestamp());
    });

    it("Should revert when accessing invalid spot ID", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);
      await expect(
        parking.connect(owner).updateSpotPrice(999, 150)
      ).to.be.revertedWithCustomError(parking, "InvalidSpotId");
    });

    it("Should allow emergency spot release by owner", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);
      await parking.connect(owner).addParkingSpot(100, "Spot A1", 5);

      await expect(parking.connect(owner).emergencyReleaseSpot(0))
        .to.emit(parking, "SpotStatusUpdated");
    });
  });

  describe("Access Control & Permissions", function () {
    it("Should enforce onlyOwner modifier", async function () {
      const { parking, user1 } = await loadFixture(deployParkingFixture);

      await expect(
        parking.connect(user1).addParkingSpot(100, "Test", 5)
      ).to.be.revertedWithCustomError(parking, "NotAuthorized");

      await expect(
        parking.connect(user1).setPauser(user1.address)
      ).to.be.revertedWithCustomError(parking, "NotAuthorized");
    });

    it("Should enforce whenNotPaused modifier", async function () {
      const { parking, owner, user1 } = await loadFixture(deployParkingFixture);

      // Pause contract
      await parking.connect(owner).pause();

      // Try to add spot while paused
      await expect(
        parking.connect(owner).addParkingSpot(100, "Test", 5)
      ).to.be.revertedWithCustomError(parking, "ContractPaused");
    });
  });

  describe("Error Handling (Fail-Closed Design)", function () {
    it("Should revert with custom errors for unauthorized access", async function () {
      const { parking, user1 } = await loadFixture(deployParkingFixture);

      await expect(
        parking.connect(user1).pause()
      ).to.be.revertedWithCustomError(parking, "NotAuthorized");
    });

    it("Should revert with InvalidSpotId for non-existent spots", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);

      await expect(
        parking.connect(owner).updateSpotPrice(0, 100)
      ).to.be.revertedWithCustomError(parking, "InvalidSpotId");
    });

    it("Should revert with InvalidReservationId for invalid reservations", async function () {
      const { parking, user1 } = await loadFixture(deployParkingFixture);

      await expect(
        parking.getReservationInfo(0)
      ).to.be.revertedWithCustomError(parking, "InvalidReservationId");
    });
  });

  describe("Query Functions", function () {
    it("Should return correct spot info", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);
      const location = "Spot A1";
      await parking.connect(owner).addParkingSpot(100, location, 5);

      const spotInfo = await parking.getSpotInfo(0);
      expect(spotInfo[0]).to.equal(location);
      expect(spotInfo[1]).to.equal(true); // isActive
    });

    it("Should return correct statistics", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);

      await parking.connect(owner).addParkingSpot(100, "Spot A1", 5);
      await parking.connect(owner).addParkingSpot(200, "Spot A2", 10);

      const stats = await parking.getStatistics();
      expect(stats[0]).to.equal(2); // totalSpots
      expect(stats[1]).to.equal(0); // totalReservations
      expect(stats[3]).to.equal(false); // isPaused
    });

    it("Should return empty array for user with no reservations", async function () {
      const { parking, user1 } = await loadFixture(deployParkingFixture);

      const reservations = await parking.getUserReservations(user1.address);
      expect(reservations.length).to.equal(0);
    });
  });

  describe("Event Emissions", function () {
    it("Should emit SpotAdded event with correct parameters", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);
      const location = "Spot A1";

      const tx = await parking.connect(owner).addParkingSpot(100, location, 5);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(parking, "SpotAdded")
        .withArgs(0, location, block.timestamp);
    });

    it("Should emit ContractPaused event", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);

      const tx = await parking.connect(owner).pause();
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(parking, "ContractPaused")
        .withArgs(owner.address, block.timestamp);
    });

    it("Should emit PauserChanged event", async function () {
      const { parking, owner, user1 } = await loadFixture(deployParkingFixture);

      await expect(parking.connect(owner).setPauser(user1.address))
        .to.emit(parking, "PauserChanged")
        .withArgs(owner.address, user1.address);
    });
  });

  describe("Edge Cases & Boundary Conditions", function () {
    it("Should handle multiple spots correctly", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);

      // Add 10 spots
      for (let i = 0; i < 10; i++) {
        await parking.connect(owner).addParkingSpot(100 + i, `Spot ${i}`, 5);
      }

      const stats = await parking.getStatistics();
      expect(stats[0]).to.equal(10);
    });

    it("Should maintain state after pause/unpause cycle", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);

      await parking.connect(owner).addParkingSpot(100, "Spot A1", 5);
      await parking.connect(owner).pause();
      await parking.connect(owner).unpause();

      const stats = await parking.getStatistics();
      expect(stats[0]).to.equal(1); // spot still exists
      expect(stats[3]).to.equal(false); // not paused
    });

    it("Should handle zero values appropriately", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);

      // Adding spot with 0 price (should work, validation is encrypted)
      await parking.connect(owner).addParkingSpot(0, "Free Spot", 0);

      const stats = await parking.getStatistics();
      expect(stats[0]).to.equal(1);
    });
  });

  // Helper function to get current block timestamp
  async function getBlockTimestamp() {
    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    return block.timestamp;
  }
});

// Note: FHE-specific tests (encrypted operations, Gateway callbacks) would require
// a mock FHE environment or integration with Zama's test framework.
// These tests focus on access control, state management, and fail-closed design.
