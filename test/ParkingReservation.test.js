const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ParkingReservation", function () {
  // Fixture for deploying the contract
  async function deployParkingFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    const ParkingReservation = await ethers.getContractFactory("ParkingReservation");
    const parking = await ParkingReservation.deploy();
    await parking.waitForDeployment();

    return { parking, owner, user1, user2, user3 };
  }

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);
      expect(await parking.owner()).to.equal(owner.address);
    });

    it("Should have zero spots and reservations initially", async function () {
      const { parking } = await loadFixture(deployParkingFixture);
      const stats = await parking.getStatistics();
      expect(stats[0]).to.equal(0); // totalSpots
      expect(stats[1]).to.equal(0); // reservationCounter
    });

    it("Should deploy successfully with proper address", async function () {
      const { parking } = await loadFixture(deployParkingFixture);
      expect(await parking.getAddress()).to.be.properAddress;
    });
  });

  describe("User Registration", function () {
    it("Should allow user to register", async function () {
      const { parking, user1 } = await loadFixture(deployParkingFixture);

      await expect(parking.connect(user1).registerUser(1001, 750))
        .to.emit(parking, "UserRegistered")
        .withArgs(user1.address, 1001, 750);

      const userInfo = await parking.getUserInfo(user1.address);
      expect(userInfo[0]).to.equal(1001); // userId
      expect(userInfo[1]).to.equal(750); // creditScore
      expect(userInfo[2]).to.equal(true); // isRegistered
    });

    it("Should reject registration with invalid credit score (too low)", async function () {
      const { parking, user1 } = await loadFixture(deployParkingFixture);

      await expect(parking.connect(user1).registerUser(1001, 299)).to.be.revertedWith(
        "Invalid credit score"
      );
    });

    it("Should reject registration with invalid credit score (too high)", async function () {
      const { parking, user1 } = await loadFixture(deployParkingFixture);

      await expect(parking.connect(user1).registerUser(1001, 851)).to.be.revertedWith(
        "Invalid credit score"
      );
    });

    it("Should reject duplicate registration", async function () {
      const { parking, user1 } = await loadFixture(deployParkingFixture);

      await parking.connect(user1).registerUser(1001, 750);

      await expect(parking.connect(user1).registerUser(1002, 800)).to.be.revertedWith(
        "Already registered"
      );
    });

    it("Should accept valid credit score at boundaries", async function () {
      const { parking, user1, user2 } = await loadFixture(deployParkingFixture);

      // Test minimum valid score
      await expect(parking.connect(user1).registerUser(1001, 300)).to.not.be.reverted;

      // Test maximum valid score
      await expect(parking.connect(user2).registerUser(1002, 850)).to.not.be.reverted;
    });

    it("Should store correct registration timestamp", async function () {
      const { parking, user1 } = await loadFixture(deployParkingFixture);

      const tx = await parking.connect(user1).registerUser(1001, 750);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      const userInfo = await parking.users(user1.address);
      expect(userInfo.registrationTime).to.equal(block.timestamp);
    });
  });

  describe("Parking Spot Management", function () {
    it("Should allow owner to add parking spot", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);
      const location = "Zone A - Spot 1";
      const pricePerHour = ethers.parseEther("0.01");

      await expect(parking.connect(owner).addParkingSpot(location, pricePerHour))
        .to.emit(parking, "ParkingSpotAdded")
        .withArgs(1, location, pricePerHour);

      const stats = await parking.getStatistics();
      expect(stats[0]).to.equal(1); // totalSpots
    });

    it("Should revert if non-owner tries to add spot", async function () {
      const { parking, user1 } = await loadFixture(deployParkingFixture);

      await expect(
        parking.connect(user1).addParkingSpot("Zone A", ethers.parseEther("0.01"))
      ).to.be.revertedWith("Not owner");
    });

    it("Should create multiple parking spots with correct IDs", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);

      await parking.connect(owner).addParkingSpot("Spot 1", ethers.parseEther("0.01"));
      await parking.connect(owner).addParkingSpot("Spot 2", ethers.parseEther("0.02"));
      await parking.connect(owner).addParkingSpot("Spot 3", ethers.parseEther("0.03"));

      const stats = await parking.getStatistics();
      expect(stats[0]).to.equal(3);
    });

    it("Should store correct spot information", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);
      const location = "Premium Zone A1";
      const pricePerHour = ethers.parseEther("0.05");

      await parking.connect(owner).addParkingSpot(location, pricePerHour);

      const spot = await parking.parkingSpots(1);
      expect(spot.location).to.equal(location);
      expect(spot.pricePerHour).to.equal(pricePerHour);
      expect(spot.isAvailable).to.equal(true);
      expect(spot.spotOwner).to.equal(owner.address);
    });

    it("Should check spot availability correctly", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);

      await parking.connect(owner).addParkingSpot("Spot 1", ethers.parseEther("0.01"));

      expect(await parking.isSpotAvailable(1)).to.equal(true);
    });

    it("Should revert when checking invalid spot ID", async function () {
      const { parking } = await loadFixture(deployParkingFixture);

      await expect(parking.isSpotAvailable(999)).to.be.revertedWith("Invalid spot ID");
    });
  });

  describe("Reservation Management", function () {
    async function setupWithSpotAndUser() {
      const fixture = await deployParkingFixture();
      const { parking, owner, user1 } = fixture;

      // Add parking spot
      await parking.connect(owner).addParkingSpot("Zone A - Spot 1", ethers.parseEther("0.01"));

      // Register user
      await parking.connect(user1).registerUser(1001, 750);

      return fixture;
    }

    it("Should allow registered user to make reservation", async function () {
      const { parking, user1 } = await loadFixture(setupWithSpotAndUser);
      const durationHours = 2;
      const totalPrice = ethers.parseEther("0.02");

      await expect(parking.connect(user1).makeReservation(1, durationHours, { value: totalPrice }))
        .to.emit(parking, "ReservationCreated")
        .withArgs(1, user1.address, 1);

      const stats = await parking.getStatistics();
      expect(stats[1]).to.equal(1); // reservationCounter
    });

    it("Should revert if non-registered user tries to make reservation", async function () {
      const { parking, user2, owner } = await loadFixture(deployParkingFixture);

      await parking.connect(owner).addParkingSpot("Spot 1", ethers.parseEther("0.01"));

      await expect(
        parking.connect(user2).makeReservation(1, 2, { value: ethers.parseEther("0.02") })
      ).to.be.revertedWith("Not registered");
    });

    it("Should revert with invalid spot ID", async function () {
      const { parking, user1 } = await loadFixture(setupWithSpotAndUser);

      await expect(
        parking.connect(user1).makeReservation(999, 2, { value: ethers.parseEther("0.02") })
      ).to.be.revertedWith("Invalid spot ID");
    });

    it("Should revert with insufficient payment", async function () {
      const { parking, user1 } = await loadFixture(setupWithSpotAndUser);

      await expect(
        parking.connect(user1).makeReservation(1, 2, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should revert with zero duration", async function () {
      const { parking, user1 } = await loadFixture(setupWithSpotAndUser);

      await expect(
        parking.connect(user1).makeReservation(1, 0, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("Invalid duration");
    });

    it("Should mark spot as unavailable after reservation", async function () {
      const { parking, user1 } = await loadFixture(setupWithSpotAndUser);

      await parking.connect(user1).makeReservation(1, 2, { value: ethers.parseEther("0.02") });

      expect(await parking.isSpotAvailable(1)).to.equal(false);
    });

    it("Should refund excess payment", async function () {
      const { parking, user1 } = await loadFixture(setupWithSpotAndUser);

      const initialBalance = await ethers.provider.getBalance(user1.address);
      const payment = ethers.parseEther("0.05"); // Overpay
      const expectedCost = ethers.parseEther("0.02"); // 2 hours at 0.01 per hour

      const tx = await parking.connect(user1).makeReservation(1, 2, { value: payment });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(user1.address);
      const actualCost = initialBalance - finalBalance;

      expect(actualCost).to.equal(expectedCost + gasUsed);
    });

    it("Should store correct reservation details", async function () {
      const { parking, user1 } = await loadFixture(setupWithSpotAndUser);

      await parking.connect(user1).makeReservation(1, 3, { value: ethers.parseEther("0.03") });

      const reservation = await parking.reservations(1);
      expect(reservation.user).to.equal(user1.address);
      expect(reservation.spotId).to.equal(1);
      expect(reservation.totalPrice).to.equal(ethers.parseEther("0.03"));
      expect(reservation.isCompleted).to.equal(false);
    });

    it("Should revert when trying to reserve unavailable spot", async function () {
      const { parking, user1, user2 } = await loadFixture(setupWithSpotAndUser);

      // User1 makes reservation
      await parking.connect(user1).makeReservation(1, 2, { value: ethers.parseEther("0.02") });

      // Register user2
      await parking.connect(user2).registerUser(1002, 700);

      // User2 tries to reserve same spot
      await expect(
        parking.connect(user2).makeReservation(1, 2, { value: ethers.parseEther("0.02") })
      ).to.be.revertedWith("Spot not available");
    });
  });

  describe("Reservation Completion", function () {
    async function setupWithReservation() {
      const fixture = await deployParkingFixture();
      const { parking, owner, user1 } = fixture;

      await parking.connect(owner).addParkingSpot("Spot 1", ethers.parseEther("0.01"));
      await parking.connect(user1).registerUser(1001, 750);
      await parking.connect(user1).makeReservation(1, 2, { value: ethers.parseEther("0.02") });

      return fixture;
    }

    it("Should allow user to complete their reservation", async function () {
      const { parking, user1 } = await loadFixture(setupWithReservation);

      await expect(parking.connect(user1).completeReservation(1))
        .to.emit(parking, "ReservationCompleted")
        .withArgs(1);
    });

    it("Should revert with invalid reservation ID", async function () {
      const { parking, user1 } = await loadFixture(setupWithReservation);

      await expect(parking.connect(user1).completeReservation(999)).to.be.revertedWith(
        "Invalid reservation ID"
      );
    });

    it("Should revert if non-owner tries to complete reservation", async function () {
      const { parking, user2 } = await loadFixture(setupWithReservation);

      await expect(parking.connect(user2).completeReservation(1)).to.be.revertedWith(
        "Not your reservation"
      );
    });

    it("Should revert if reservation already completed", async function () {
      const { parking, user1 } = await loadFixture(setupWithReservation);

      await parking.connect(user1).completeReservation(1);

      await expect(parking.connect(user1).completeReservation(1)).to.be.revertedWith(
        "Already completed"
      );
    });

    it("Should mark spot as available after completion", async function () {
      const { parking, user1 } = await loadFixture(setupWithReservation);

      await parking.connect(user1).completeReservation(1);

      expect(await parking.isSpotAvailable(1)).to.equal(true);
    });

    it("Should transfer payment to spot owner", async function () {
      const { parking, owner, user1 } = await loadFixture(setupWithReservation);

      const initialBalance = await ethers.provider.getBalance(owner.address);

      await parking.connect(user1).completeReservation(1);

      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("0.02"));
    });

    it("Should mark reservation as completed", async function () {
      const { parking, user1 } = await loadFixture(setupWithReservation);

      await parking.connect(user1).completeReservation(1);

      const reservation = await parking.reservations(1);
      expect(reservation.isCompleted).to.equal(true);
    });
  });

  describe("Query Functions", function () {
    it("Should return correct statistics", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);

      await parking.connect(owner).addParkingSpot("Spot A1", ethers.parseEther("0.01"));
      await parking.connect(owner).addParkingSpot("Spot A2", ethers.parseEther("0.02"));

      const stats = await parking.getStatistics();
      expect(stats[0]).to.equal(2); // totalSpots
      expect(stats[1]).to.equal(0); // totalReservations
    });

    it("Should return correct user info for registered user", async function () {
      const { parking, user1 } = await loadFixture(deployParkingFixture);

      await parking.connect(user1).registerUser(5001, 800);

      const userInfo = await parking.getUserInfo(user1.address);
      expect(userInfo[0]).to.equal(5001);
      expect(userInfo[1]).to.equal(800);
      expect(userInfo[2]).to.equal(true);
    });

    it("Should return default values for unregistered user", async function () {
      const { parking, user1 } = await loadFixture(deployParkingFixture);

      const userInfo = await parking.getUserInfo(user1.address);
      expect(userInfo[0]).to.equal(0); // userId
      expect(userInfo[1]).to.equal(0); // creditScore
      expect(userInfo[2]).to.equal(false); // isRegistered
    });
  });

  describe("Edge Cases & Boundary Conditions", function () {
    it("Should handle spot ID zero correctly", async function () {
      const { parking } = await loadFixture(deployParkingFixture);

      await expect(parking.isSpotAvailable(0)).to.be.revertedWith("Invalid spot ID");
    });

    it("Should handle multiple reservations from same user", async function () {
      const { parking, owner, user1 } = await loadFixture(deployParkingFixture);

      await parking.connect(owner).addParkingSpot("Spot 1", ethers.parseEther("0.01"));
      await parking.connect(owner).addParkingSpot("Spot 2", ethers.parseEther("0.01"));
      await parking.connect(user1).registerUser(1001, 750);

      await parking.connect(user1).makeReservation(1, 2, { value: ethers.parseEther("0.02") });
      await parking.connect(user1).makeReservation(2, 3, { value: ethers.parseEther("0.03") });

      const stats = await parking.getStatistics();
      expect(stats[1]).to.equal(2); // two reservations
    });

    it("Should handle large duration values", async function () {
      const { parking, owner, user1 } = await loadFixture(deployParkingFixture);

      await parking.connect(owner).addParkingSpot("Spot 1", ethers.parseEther("0.001"));
      await parking.connect(user1).registerUser(1001, 750);

      const duration = 100; // 100 hours
      await parking.connect(user1).makeReservation(1, duration, {
        value: ethers.parseEther("0.1"),
      });

      const reservation = await parking.reservations(1);
      expect(reservation.isCompleted).to.equal(false);
    });

    it("Should handle zero price spots", async function () {
      const { parking, owner, user1 } = await loadFixture(deployParkingFixture);

      await parking.connect(owner).addParkingSpot("Free Spot", 0);
      await parking.connect(user1).registerUser(1001, 750);

      await expect(parking.connect(user1).makeReservation(1, 5, { value: 0 })).to.not.be.reverted;
    });

    it("Should handle sequential spot additions", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);

      for (let i = 1; i <= 10; i++) {
        await parking.connect(owner).addParkingSpot(`Spot ${i}`, ethers.parseEther(`0.0${i}`));
      }

      const stats = await parking.getStatistics();
      expect(stats[0]).to.equal(10);
    });
  });

  describe("Access Control", function () {
    it("Should enforce owner-only functions", async function () {
      const { parking, user1 } = await loadFixture(deployParkingFixture);

      await expect(
        parking.connect(user1).addParkingSpot("Spot", ethers.parseEther("0.01"))
      ).to.be.revertedWith("Not owner");
    });

    it("Should enforce registered-only functions", async function () {
      const { parking, owner, user1 } = await loadFixture(deployParkingFixture);

      await parking.connect(owner).addParkingSpot("Spot 1", ethers.parseEther("0.01"));

      await expect(
        parking.connect(user1).makeReservation(1, 2, { value: ethers.parseEther("0.02") })
      ).to.be.revertedWith("Not registered");
    });
  });

  describe("Event Emissions", function () {
    it("Should emit UserRegistered event with correct parameters", async function () {
      const { parking, user1 } = await loadFixture(deployParkingFixture);

      await expect(parking.connect(user1).registerUser(9999, 725))
        .to.emit(parking, "UserRegistered")
        .withArgs(user1.address, 9999, 725);
    });

    it("Should emit ParkingSpotAdded event with correct parameters", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);
      const location = "Premium A1";
      const price = ethers.parseEther("0.05");

      await expect(parking.connect(owner).addParkingSpot(location, price))
        .to.emit(parking, "ParkingSpotAdded")
        .withArgs(1, location, price);
    });

    it("Should emit ReservationCreated event with correct parameters", async function () {
      const { parking, owner, user1 } = await loadFixture(deployParkingFixture);

      await parking.connect(owner).addParkingSpot("Spot 1", ethers.parseEther("0.01"));
      await parking.connect(user1).registerUser(1001, 750);

      await expect(
        parking.connect(user1).makeReservation(1, 2, { value: ethers.parseEther("0.02") })
      )
        .to.emit(parking, "ReservationCreated")
        .withArgs(1, user1.address, 1);
    });

    it("Should emit ReservationCompleted event", async function () {
      const { parking, owner, user1 } = await loadFixture(deployParkingFixture);

      await parking.connect(owner).addParkingSpot("Spot 1", ethers.parseEther("0.01"));
      await parking.connect(user1).registerUser(1001, 750);
      await parking.connect(user1).makeReservation(1, 2, { value: ethers.parseEther("0.02") });

      await expect(parking.connect(user1).completeReservation(1))
        .to.emit(parking, "ReservationCompleted")
        .withArgs(1);
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for user registration", async function () {
      const { parking, user1 } = await loadFixture(deployParkingFixture);

      const tx = await parking.connect(user1).registerUser(1001, 750);
      const receipt = await tx.wait();

      expect(receipt.gasUsed).to.be.lt(200000);
    });

    it("Should use reasonable gas for adding parking spot", async function () {
      const { parking, owner } = await loadFixture(deployParkingFixture);

      const tx = await parking.connect(owner).addParkingSpot("Spot 1", ethers.parseEther("0.01"));
      const receipt = await tx.wait();

      expect(receipt.gasUsed).to.be.lt(300000);
    });

    it("Should use reasonable gas for making reservation", async function () {
      const { parking, owner, user1 } = await loadFixture(deployParkingFixture);

      await parking.connect(owner).addParkingSpot("Spot 1", ethers.parseEther("0.01"));
      await parking.connect(user1).registerUser(1001, 750);

      const tx = await parking
        .connect(user1)
        .makeReservation(1, 2, { value: ethers.parseEther("0.02") });
      const receipt = await tx.wait();

      expect(receipt.gasUsed).to.be.lt(500000);
    });
  });
});
