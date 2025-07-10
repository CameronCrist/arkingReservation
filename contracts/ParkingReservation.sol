// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ParkingReservation
 * @notice Simplified parking reservation system (without FHE for actual deployment)
 * @dev Standard Solidity implementation for Sepolia deployment
 */
contract ParkingReservation {

    // ============ State Variables ============

    address public owner;
    uint32 public totalSpots;
    uint32 public reservationCounter;

    // ============ Structs ============

    struct ParkingSpot {
        string location;
        uint256 pricePerHour;  // Price in wei
        bool isAvailable;
        address spotOwner;
    }

    struct User {
        uint32 userId;
        uint16 creditScore;
        bool isRegistered;
        uint256 registrationTime;
    }

    struct Reservation {
        address user;
        uint256 spotId;
        uint256 startTime;
        uint256 endTime;
        uint256 totalPrice;
        bool isCompleted;
    }

    // ============ Mappings ============

    mapping(uint256 => ParkingSpot) public parkingSpots;
    mapping(address => User) public users;
    mapping(uint256 => Reservation) public reservations;

    // ============ Events ============

    event UserRegistered(address indexed user, uint32 userId, uint16 creditScore);
    event ParkingSpotAdded(uint256 indexed spotId, string location, uint256 pricePerHour);
    event ReservationCreated(uint256 indexed reservationId, address indexed user, uint256 spotId);
    event ReservationCompleted(uint256 indexed reservationId);

    // ============ Modifiers ============

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyRegistered() {
        require(users[msg.sender].isRegistered, "Not registered");
        _;
    }

    // ============ Constructor ============

    constructor() {
        owner = msg.sender;
        totalSpots = 0;
        reservationCounter = 0;
    }

    // ============ User Functions ============

    /**
     * @notice Register a new user
     * @param userId User ID
     * @param creditScore Credit score (300-850)
     */
    function registerUser(uint32 userId, uint16 creditScore) external {
        require(!users[msg.sender].isRegistered, "Already registered");
        require(creditScore >= 300 && creditScore <= 850, "Invalid credit score");

        users[msg.sender] = User({
            userId: userId,
            creditScore: creditScore,
            isRegistered: true,
            registrationTime: block.timestamp
        });

        emit UserRegistered(msg.sender, userId, creditScore);
    }

    // ============ Parking Management ============

    /**
     * @notice Add a new parking spot (owner only)
     * @param location Parking spot location
     * @param pricePerHour Price per hour in wei
     */
    function addParkingSpot(string memory location, uint256 pricePerHour) external onlyOwner {
        totalSpots++;

        parkingSpots[totalSpots] = ParkingSpot({
            location: location,
            pricePerHour: pricePerHour,
            isAvailable: true,
            spotOwner: msg.sender
        });

        emit ParkingSpotAdded(totalSpots, location, pricePerHour);
    }

    /**
     * @notice Make a reservation
     * @param spotId Parking spot ID
     * @param durationHours Duration in hours
     */
    function makeReservation(uint256 spotId, uint256 durationHours) external payable onlyRegistered {
        require(spotId > 0 && spotId <= totalSpots, "Invalid spot ID");
        require(parkingSpots[spotId].isAvailable, "Spot not available");
        require(durationHours > 0, "Invalid duration");

        uint256 totalPrice = parkingSpots[spotId].pricePerHour * durationHours;
        require(msg.value >= totalPrice, "Insufficient payment");

        reservationCounter++;

        reservations[reservationCounter] = Reservation({
            user: msg.sender,
            spotId: spotId,
            startTime: block.timestamp,
            endTime: block.timestamp + (durationHours * 1 hours),
            totalPrice: totalPrice,
            isCompleted: false
        });

        parkingSpots[spotId].isAvailable = false;

        // Refund excess payment
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }

        emit ReservationCreated(reservationCounter, msg.sender, spotId);
    }

    /**
     * @notice Complete a reservation
     * @param reservationId Reservation ID
     */
    function completeReservation(uint256 reservationId) external {
        require(reservationId > 0 && reservationId <= reservationCounter, "Invalid reservation ID");
        Reservation storage reservation = reservations[reservationId];

        require(reservation.user == msg.sender, "Not your reservation");
        require(!reservation.isCompleted, "Already completed");

        reservation.isCompleted = true;
        parkingSpots[reservation.spotId].isAvailable = true;

        // Transfer payment to spot owner
        payable(parkingSpots[reservation.spotId].spotOwner).transfer(reservation.totalPrice);

        emit ReservationCompleted(reservationId);
    }

    // ============ View Functions ============

    /**
     * @notice Get system statistics
     * @return _totalSpots Total parking spots
     * @return _totalReservations Total reservations
     * @return _timestamp Current timestamp
     */
    function getStatistics() external view returns (
        uint32 _totalSpots,
        uint32 _totalReservations,
        uint256 _timestamp
    ) {
        return (totalSpots, reservationCounter, block.timestamp);
    }

    /**
     * @notice Check if a spot is available
     * @param spotId Spot ID
     * @return available Availability status
     */
    function isSpotAvailable(uint256 spotId) external view returns (bool available) {
        require(spotId > 0 && spotId <= totalSpots, "Invalid spot ID");
        return parkingSpots[spotId].isAvailable;
    }

    /**
     * @notice Get user info
     * @param userAddress User address
     * @return userId User ID
     * @return creditScore Credit score
     * @return isRegistered Registration status
     */
    function getUserInfo(address userAddress) external view returns (
        uint32 userId,
        uint16 creditScore,
        bool isRegistered
    ) {
        User memory user = users[userAddress];
        return (user.userId, user.creditScore, user.isRegistered);
    }
}
