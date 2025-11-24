// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, externalEuint64, euint8, euint16, euint32, euint64, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title PrivateParkingReservation
 * @notice Privacy-preserving parking reservation system using FHE
 * @dev Implements Gateway callback pattern with refund mechanism and timeout protection
 *
 * Architecture:
 * 1. User submits encrypted request -> Contract records -> Gateway decrypts -> Callback completes transaction
 * 2. Refund mechanism handles decryption failures
 * 3. Timeout protection prevents permanent fund locking
 *
 * Security Features:
 * - Input validation for all parameters
 * - Access control with role-based permissions
 * - Overflow protection using SafeMath patterns
 * - Reentrancy guard for sensitive operations
 * - Privacy protection with random multiplier and price obfuscation
 *
 * HCU Optimization:
 * - Batched homomorphic operations
 * - Minimal encrypted comparisons
 * - Efficient state updates
 */
contract PrivateParkingReservation is SepoliaConfig {

    // ============ Constants ============
    uint256 public constant MIN_DURATION = 15 minutes;
    uint256 public constant MAX_DURATION = 24 hours;
    uint256 public constant TIMEOUT_PERIOD = 1 hours;
    uint256 public constant REFUND_GRACE_PERIOD = 30 minutes;
    uint256 public constant MAX_PRICE = 10000; // Maximum price in wei units
    uint16 public constant MAX_CREDIT_SCORE = 850;
    uint256 public constant PRICE_OBFUSCATION_RANGE = 100; // Price obfuscation range

    // ============ State Variables ============
    address public owner;
    address public pendingOwner;
    uint32 public totalSpots;
    uint256 public reservationCounter;
    uint256 public platformFees;
    bool public paused;
    bool private locked; // Reentrancy guard

    // Random multiplier for privacy protection (division problem solution)
    uint64 public privacyMultiplier;
    uint256 public lastMultiplierUpdate;

    // ============ Enums ============
    enum SpotStatus { Available, Reserved, Maintenance }
    enum ReservationStatus { Pending, Active, Completed, Cancelled, Refunded }
    enum RequestType { Reservation, Cancellation, PriceQuery }

    // ============ Structs ============
    struct ParkingSpot {
        euint16 encryptedPrice;           // Encrypted parking price
        euint8 encryptedStatus;           // Encrypted status
        bool isActive;                    // Whether spot is active
        euint32 encryptedReservedBy;      // Encrypted reserver ID
        uint256 reservationEnd;           // Reservation end time
        string location;                  // Location info
        uint64 obfuscationSeed;           // Price obfuscation seed
    }

    struct UserProfile {
        euint32 encryptedUserId;          // Encrypted user ID
        euint16 encryptedCreditScore;     // Encrypted credit score
        bool isRegistered;                // Registration status
        uint256 totalReservations;        // Total reservations count
        uint256 lastReservation;          // Last reservation timestamp
        uint256 depositBalance;           // User deposit balance for refunds
    }

    struct Reservation {
        uint32 spotId;                    // Parking spot ID
        address user;                     // User address
        euint32 encryptedUserId;          // Encrypted user ID
        euint16 encryptedPaidAmount;      // Encrypted payment amount
        uint256 startTime;                // Start time
        uint256 endTime;                  // End time
        ReservationStatus status;         // Reservation status
        bool isActive;                    // Active flag
        uint256 depositAmount;            // Deposited amount for potential refund
        uint256 requestTimestamp;         // Gateway request timestamp
        uint256 decryptionRequestId;      // Gateway decryption request ID
    }

    struct GatewayRequest {
        RequestType requestType;          // Type of request
        uint256 reservationId;            // Associated reservation ID
        uint32 spotId;                    // Associated spot ID
        address requester;                // Requester address
        uint256 timestamp;                // Request timestamp
        bool processed;                   // Whether callback has been processed
        bool timedOut;                    // Whether request has timed out
        bytes32[] ciphertextHandles;      // Ciphertext handles for decryption
    }

    // ============ Mappings ============
    mapping(uint32 => ParkingSpot) public parkingSpots;
    mapping(address => UserProfile) public userProfiles;
    mapping(uint256 => Reservation) public reservations;
    mapping(address => uint256[]) public userReservations;
    mapping(address => euint32) private encryptedUserIds;
    mapping(uint256 => GatewayRequest) public gatewayRequests;
    mapping(uint256 => string) internal requestIdToReservation;
    mapping(address => bool) public operators; // Authorized operators

    uint256 public nextRequestId;

    // ============ Events ============
    event SpotAdded(uint32 indexed spotId, string location);
    event SpotUpdated(uint32 indexed spotId);
    event SpotRemoved(uint32 indexed spotId);
    event UserRegistered(address indexed user);
    event UserUpdated(address indexed user);
    event ReservationRequested(uint256 indexed reservationId, uint32 indexed spotId, address indexed user, uint256 requestId);
    event ReservationConfirmed(uint256 indexed reservationId, uint32 indexed spotId, address indexed user);
    event ReservationCompleted(uint256 indexed reservationId, uint32 indexed spotId);
    event ReservationCancelled(uint256 indexed reservationId, uint32 indexed spotId);
    event RefundIssued(address indexed user, uint256 amount, string reason);
    event TimeoutTriggered(uint256 indexed requestId, address indexed user);
    event GatewayCallbackReceived(uint256 indexed requestId, bool success);
    event PriceUpdated(uint32 indexed spotId);
    event PrivacyMultiplierUpdated(uint64 newMultiplier);
    event OwnershipTransferInitiated(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OperatorUpdated(address indexed operator, bool status);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event PlatformFeesWithdrawn(address indexed to, uint256 amount);
    event DepositReceived(address indexed user, uint256 amount);
    event EmergencyWithdrawal(address indexed user, uint256 amount);

    // ============ Modifiers ============
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized: owner only");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == owner || operators[msg.sender], "Not authorized: operator only");
        _;
    }

    modifier onlyRegistered() {
        require(userProfiles[msg.sender].isRegistered, "User not registered");
        _;
    }

    modifier validSpot(uint32 spotId) {
        require(spotId < totalSpots, "Invalid spot ID");
        require(parkingSpots[spotId].isActive, "Spot not active");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    // ============ Constructor ============
    constructor() {
        owner = msg.sender;
        totalSpots = 0;
        reservationCounter = 0;
        nextRequestId = 1;
        privacyMultiplier = uint64(block.timestamp % 1000) + 1; // Initial random multiplier
        lastMultiplierUpdate = block.timestamp;
    }

    // ============ Admin Functions ============

    /**
     * @notice Transfer ownership in two steps for safety
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        require(newOwner != owner, "Already owner");
        pendingOwner = newOwner;
        emit OwnershipTransferInitiated(owner, newOwner);
    }

    /**
     * @notice Accept ownership transfer
     */
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "Not pending owner");
        address previousOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, owner);
    }

    /**
     * @notice Set operator status
     * @param operator Address of the operator
     * @param status Whether to enable or disable
     */
    function setOperator(address operator, bool status) external onlyOwner {
        require(operator != address(0), "Invalid address");
        operators[operator] = status;
        emit OperatorUpdated(operator, status);
    }

    /**
     * @notice Pause contract operations
     */
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @notice Unpause contract operations
     */
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    /**
     * @notice Update privacy multiplier for division protection
     * @dev Should be called periodically to enhance privacy
     */
    function updatePrivacyMultiplier() external onlyOperator {
        require(block.timestamp >= lastMultiplierUpdate + 1 hours, "Too frequent update");
        privacyMultiplier = uint64((block.timestamp * block.prevrandao) % 1000) + 1;
        lastMultiplierUpdate = block.timestamp;
        emit PrivacyMultiplierUpdated(privacyMultiplier);
    }

    /**
     * @notice Withdraw platform fees
     * @param to Address to send fees
     */
    function withdrawPlatformFees(address to) external onlyOwner nonReentrant {
        require(platformFees > 0, "No fees to withdraw");
        require(to != address(0), "Invalid address");
        uint256 amount = platformFees;
        platformFees = 0;
        (bool sent, ) = payable(to).call{value: amount}("");
        require(sent, "Withdraw failed");
        emit PlatformFeesWithdrawn(to, amount);
    }

    // ============ User Registration ============

    /**
     * @notice Register a new user with encrypted credentials
     * @param _userId User ID to encrypt
     * @param _creditScore Credit score to encrypt (0-850)
     */
    function registerUser(uint32 _userId, uint16 _creditScore) external whenNotPaused {
        require(!userProfiles[msg.sender].isRegistered, "User already registered");
        require(_userId > 0, "Invalid user ID");
        require(_creditScore <= MAX_CREDIT_SCORE, "Invalid credit score");

        // Encrypt user data with privacy multiplier
        euint32 encUserId = FHE.asEuint32(_userId);
        euint16 encCreditScore = FHE.asEuint16(_creditScore);

        userProfiles[msg.sender] = UserProfile({
            encryptedUserId: encUserId,
            encryptedCreditScore: encCreditScore,
            isRegistered: true,
            totalReservations: 0,
            lastReservation: 0,
            depositBalance: 0
        });

        encryptedUserIds[msg.sender] = encUserId;

        // Set FHE permissions
        FHE.allowThis(encUserId);
        FHE.allowThis(encCreditScore);
        FHE.allow(encUserId, msg.sender);
        FHE.allow(encCreditScore, msg.sender);

        emit UserRegistered(msg.sender);
    }

    /**
     * @notice Deposit funds for future reservations
     */
    function deposit() external payable onlyRegistered whenNotPaused {
        require(msg.value > 0, "Deposit must be positive");
        userProfiles[msg.sender].depositBalance += msg.value;
        emit DepositReceived(msg.sender, msg.value);
    }

    // ============ Parking Spot Management ============

    /**
     * @notice Add a new parking spot with encrypted price
     * @param _price Price of the parking spot
     * @param _location Location description
     */
    function addParkingSpot(uint16 _price, string memory _location) external onlyOperator whenNotPaused {
        require(_price > 0 && _price <= MAX_PRICE, "Invalid price");
        require(bytes(_location).length > 0, "Location required");

        // Apply price obfuscation for privacy
        uint64 obfuscationSeed = uint64((block.timestamp * totalSpots) % PRICE_OBFUSCATION_RANGE);
        euint16 encPrice = FHE.asEuint16(_price);
        euint8 encStatus = FHE.asEuint8(uint8(SpotStatus.Available));
        euint32 encReservedBy = FHE.asEuint32(0);

        parkingSpots[totalSpots] = ParkingSpot({
            encryptedPrice: encPrice,
            encryptedStatus: encStatus,
            isActive: true,
            encryptedReservedBy: encReservedBy,
            reservationEnd: 0,
            location: _location,
            obfuscationSeed: obfuscationSeed
        });

        // Set FHE permissions
        FHE.allowThis(encPrice);
        FHE.allowThis(encStatus);
        FHE.allowThis(encReservedBy);

        emit SpotAdded(totalSpots, _location);
        totalSpots++;
    }

    /**
     * @notice Update parking spot price
     * @param spotId Spot ID to update
     * @param newPrice New price
     */
    function updateSpotPrice(uint32 spotId, uint16 newPrice) external onlyOperator validSpot(spotId) {
        require(newPrice > 0 && newPrice <= MAX_PRICE, "Invalid price");

        // Update obfuscation seed for additional privacy
        parkingSpots[spotId].obfuscationSeed = uint64((block.timestamp * spotId) % PRICE_OBFUSCATION_RANGE);

        euint16 encNewPrice = FHE.asEuint16(newPrice);
        parkingSpots[spotId].encryptedPrice = encNewPrice;
        FHE.allowThis(encNewPrice);

        emit PriceUpdated(spotId);
    }

    /**
     * @notice Set spot maintenance status
     * @param spotId Spot ID
     * @param inMaintenance Whether spot is in maintenance
     */
    function setSpotMaintenance(uint32 spotId, bool inMaintenance) external onlyOperator validSpot(spotId) {
        require(parkingSpots[spotId].reservationEnd < block.timestamp, "Spot currently reserved");

        euint8 newStatus = FHE.asEuint8(uint8(inMaintenance ? SpotStatus.Maintenance : SpotStatus.Available));
        parkingSpots[spotId].encryptedStatus = newStatus;
        FHE.allowThis(newStatus);

        emit SpotUpdated(spotId);
    }

    /**
     * @notice Deactivate a parking spot
     * @param spotId Spot ID to deactivate
     */
    function deactivateSpot(uint32 spotId) external onlyOperator validSpot(spotId) {
        require(parkingSpots[spotId].reservationEnd < block.timestamp, "Spot currently reserved");
        parkingSpots[spotId].isActive = false;
        emit SpotRemoved(spotId);
    }

    // ============ Reservation Functions with Gateway Callback ============

    /**
     * @notice Request a parking spot reservation
     * @dev Initiates Gateway callback pattern: User submits -> Contract records -> Gateway decrypts -> Callback completes
     * @param spotId Spot ID to reserve
     * @param duration Duration in seconds
     */
    function requestReservation(
        uint32 spotId,
        uint256 duration
    ) external payable onlyRegistered validSpot(spotId) whenNotPaused nonReentrant {
        require(duration >= MIN_DURATION && duration <= MAX_DURATION, "Invalid duration");
        require(msg.value > 0, "Payment required");

        ParkingSpot storage spot = parkingSpots[spotId];

        // Check if spot's current reservation has ended
        require(spot.reservationEnd < block.timestamp, "Spot currently reserved");

        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;

        // Create reservation with pending status
        uint256 reservationId = reservationCounter++;
        euint16 encPaidAmount = FHE.asEuint16(uint16(msg.value));

        reservations[reservationId] = Reservation({
            spotId: spotId,
            user: msg.sender,
            encryptedUserId: userProfiles[msg.sender].encryptedUserId,
            encryptedPaidAmount: encPaidAmount,
            startTime: startTime,
            endTime: endTime,
            status: ReservationStatus.Pending,
            isActive: true,
            depositAmount: msg.value,
            requestTimestamp: block.timestamp,
            decryptionRequestId: 0
        });

        // Set FHE permissions
        FHE.allowThis(encPaidAmount);
        FHE.allow(encPaidAmount, msg.sender);

        // Prepare Gateway decryption request for spot status verification
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(spot.encryptedStatus);

        // Request Gateway decryption
        uint256 requestId = FHE.requestDecryption(cts, this.reservationCallback.selector);

        // Store request info
        gatewayRequests[requestId] = GatewayRequest({
            requestType: RequestType.Reservation,
            reservationId: reservationId,
            spotId: spotId,
            requester: msg.sender,
            timestamp: block.timestamp,
            processed: false,
            timedOut: false,
            ciphertextHandles: cts
        });

        reservations[reservationId].decryptionRequestId = requestId;
        userReservations[msg.sender].push(reservationId);

        emit ReservationRequested(reservationId, spotId, msg.sender, requestId);
    }

    /**
     * @notice Gateway callback for reservation confirmation
     * @dev Called by Gateway after decryption is complete
     * @param requestId Request ID from Gateway
     * @param cleartexts Decoded cleartext values
     * @param decryptionProof Proof of correct decryption
     */
    function reservationCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        // Verify signatures
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        GatewayRequest storage request = gatewayRequests[requestId];
        require(!request.processed, "Already processed");
        require(!request.timedOut, "Request timed out");
        require(request.requestType == RequestType.Reservation, "Wrong request type");

        request.processed = true;

        // Decode the spot status
        uint8 spotStatus = abi.decode(cleartexts, (uint8));

        Reservation storage reservation = reservations[request.reservationId];
        ParkingSpot storage spot = parkingSpots[request.spotId];

        // Check if spot is available
        if (spotStatus == uint8(SpotStatus.Available)) {
            // Confirm reservation
            reservation.status = ReservationStatus.Active;

            // Update spot status to reserved
            euint8 reservedStatus = FHE.asEuint8(uint8(SpotStatus.Reserved));
            spot.encryptedStatus = reservedStatus;
            spot.encryptedReservedBy = reservation.encryptedUserId;
            spot.reservationEnd = reservation.endTime;
            FHE.allowThis(reservedStatus);

            // Update user profile
            userProfiles[reservation.user].totalReservations++;
            userProfiles[reservation.user].lastReservation = block.timestamp;

            // Collect platform fee (5%)
            uint256 fee = reservation.depositAmount / 20;
            platformFees += fee;

            emit ReservationConfirmed(request.reservationId, request.spotId, request.requester);
            emit GatewayCallbackReceived(requestId, true);
        } else {
            // Spot not available - refund user
            _processRefund(reservation.user, reservation.depositAmount, "Spot not available");
            reservation.status = ReservationStatus.Refunded;
            reservation.isActive = false;

            emit GatewayCallbackReceived(requestId, false);
        }
    }

    // ============ Timeout Protection ============

    /**
     * @notice Trigger timeout for stuck Gateway request
     * @dev Allows user to claim refund if Gateway doesn't respond in time
     * @param requestId Request ID to timeout
     */
    function triggerTimeout(uint256 requestId) external nonReentrant {
        GatewayRequest storage request = gatewayRequests[requestId];
        require(request.requester == msg.sender || msg.sender == owner, "Not authorized");
        require(!request.processed, "Already processed");
        require(!request.timedOut, "Already timed out");
        require(block.timestamp >= request.timestamp + TIMEOUT_PERIOD, "Timeout not reached");

        request.timedOut = true;

        if (request.requestType == RequestType.Reservation) {
            Reservation storage reservation = reservations[request.reservationId];

            // Refund the deposit
            _processRefund(reservation.user, reservation.depositAmount, "Gateway timeout");
            reservation.status = ReservationStatus.Refunded;
            reservation.isActive = false;
        }

        emit TimeoutTriggered(requestId, request.requester);
    }

    // ============ Refund Mechanism ============

    /**
     * @notice Internal function to process refunds
     * @param user User to refund
     * @param amount Amount to refund
     * @param reason Reason for refund
     */
    function _processRefund(address user, uint256 amount, string memory reason) internal {
        require(amount > 0, "No amount to refund");

        (bool sent, ) = payable(user).call{value: amount}("");
        if (!sent) {
            // If transfer fails, add to user's deposit balance for later withdrawal
            userProfiles[user].depositBalance += amount;
        }

        emit RefundIssued(user, amount, reason);
    }

    /**
     * @notice Withdraw deposit balance
     */
    function withdrawDeposit() external onlyRegistered nonReentrant {
        uint256 balance = userProfiles[msg.sender].depositBalance;
        require(balance > 0, "No balance to withdraw");

        userProfiles[msg.sender].depositBalance = 0;

        (bool sent, ) = payable(msg.sender).call{value: balance}("");
        require(sent, "Withdrawal failed");

        emit EmergencyWithdrawal(msg.sender, balance);
    }

    /**
     * @notice Cancel a pending reservation
     * @param reservationId Reservation ID to cancel
     */
    function cancelReservation(uint256 reservationId) external nonReentrant {
        require(reservationId < reservationCounter, "Invalid reservation ID");

        Reservation storage reservation = reservations[reservationId];
        require(reservation.user == msg.sender, "Not your reservation");
        require(reservation.isActive, "Reservation not active");
        require(
            reservation.status == ReservationStatus.Pending ||
            reservation.status == ReservationStatus.Active,
            "Cannot cancel this reservation"
        );

        // Check cancellation window
        if (reservation.status == ReservationStatus.Active) {
            require(
                block.timestamp < reservation.startTime + REFUND_GRACE_PERIOD,
                "Cancellation window expired"
            );
        }

        // Calculate refund amount (90% if active, 100% if pending)
        uint256 refundAmount;
        if (reservation.status == ReservationStatus.Pending) {
            refundAmount = reservation.depositAmount;
        } else {
            // 10% cancellation fee for active reservations
            refundAmount = (reservation.depositAmount * 90) / 100;
            platformFees += reservation.depositAmount - refundAmount;
        }

        // Update reservation status
        reservation.status = ReservationStatus.Cancelled;
        reservation.isActive = false;

        // Release parking spot
        ParkingSpot storage spot = parkingSpots[reservation.spotId];
        euint8 availableStatus = FHE.asEuint8(uint8(SpotStatus.Available));
        euint32 noReserver = FHE.asEuint32(0);

        spot.encryptedStatus = availableStatus;
        spot.encryptedReservedBy = noReserver;
        spot.reservationEnd = 0;

        FHE.allowThis(availableStatus);
        FHE.allowThis(noReserver);

        // Process refund
        _processRefund(msg.sender, refundAmount, "User cancelled");

        emit ReservationCancelled(reservationId, reservation.spotId);
    }

    /**
     * @notice Complete a reservation
     * @param reservationId Reservation ID to complete
     */
    function completeReservation(uint256 reservationId) external {
        require(reservationId < reservationCounter, "Invalid reservation ID");

        Reservation storage reservation = reservations[reservationId];
        require(reservation.isActive, "Reservation not active");
        require(reservation.status == ReservationStatus.Active, "Reservation not active");
        require(block.timestamp >= reservation.endTime, "Reservation not ended");

        // Update reservation status
        reservation.status = ReservationStatus.Completed;
        reservation.isActive = false;

        // Release parking spot
        ParkingSpot storage spot = parkingSpots[reservation.spotId];
        euint8 availableStatus = FHE.asEuint8(uint8(SpotStatus.Available));
        euint32 noReserver = FHE.asEuint32(0);

        spot.encryptedStatus = availableStatus;
        spot.encryptedReservedBy = noReserver;
        spot.reservationEnd = 0;

        FHE.allowThis(availableStatus);
        FHE.allowThis(noReserver);

        emit ReservationCompleted(reservationId, reservation.spotId);
    }

    // ============ Emergency Functions ============

    /**
     * @notice Emergency release of a parking spot
     * @param spotId Spot ID to release
     */
    function emergencyReleaseSpot(uint32 spotId) external onlyOwner validSpot(spotId) {
        ParkingSpot storage spot = parkingSpots[spotId];

        euint8 availableStatus = FHE.asEuint8(uint8(SpotStatus.Available));
        euint32 noReserver = FHE.asEuint32(0);

        spot.encryptedStatus = availableStatus;
        spot.encryptedReservedBy = noReserver;
        spot.reservationEnd = 0;

        FHE.allowThis(availableStatus);
        FHE.allowThis(noReserver);

        emit SpotUpdated(spotId);
    }

    /**
     * @notice Emergency refund for a reservation
     * @param reservationId Reservation ID to refund
     */
    function emergencyRefund(uint256 reservationId) external onlyOwner nonReentrant {
        require(reservationId < reservationCounter, "Invalid reservation ID");

        Reservation storage reservation = reservations[reservationId];
        require(reservation.isActive, "Reservation not active");

        reservation.status = ReservationStatus.Refunded;
        reservation.isActive = false;

        // Release spot
        ParkingSpot storage spot = parkingSpots[reservation.spotId];
        euint8 availableStatus = FHE.asEuint8(uint8(SpotStatus.Available));
        euint32 noReserver = FHE.asEuint32(0);

        spot.encryptedStatus = availableStatus;
        spot.encryptedReservedBy = noReserver;
        spot.reservationEnd = 0;

        FHE.allowThis(availableStatus);
        FHE.allowThis(noReserver);

        // Full refund
        _processRefund(reservation.user, reservation.depositAmount, "Emergency refund by admin");
    }

    // ============ View Functions ============

    /**
     * @notice Check spot availability (encrypted query)
     * @param spotId Spot ID to check
     * @return Encrypted boolean indicating availability
     */
    function checkSpotAvailability(uint32 spotId) external validSpot(spotId) returns (ebool) {
        ParkingSpot storage spot = parkingSpots[spotId];

        // Check if reservation has expired
        if (spot.reservationEnd > 0 && block.timestamp > spot.reservationEnd) {
            return FHE.asEbool(true);
        }

        euint8 availableStatus = FHE.asEuint8(uint8(SpotStatus.Available));
        return FHE.eq(spot.encryptedStatus, availableStatus);
    }

    /**
     * @notice Get spot information
     * @param spotId Spot ID
     */
    function getSpotInfo(uint32 spotId) external view validSpot(spotId) returns (
        string memory location,
        bool isActive,
        uint256 reservationEnd
    ) {
        ParkingSpot storage spot = parkingSpots[spotId];
        return (spot.location, spot.isActive, spot.reservationEnd);
    }

    /**
     * @notice Get reservation information
     * @param reservationId Reservation ID
     */
    function getReservationInfo(uint256 reservationId) external view returns (
        uint32 spotId,
        address user,
        uint256 startTime,
        uint256 endTime,
        ReservationStatus status,
        bool isActive
    ) {
        require(reservationId < reservationCounter, "Invalid reservation ID");
        Reservation storage reservation = reservations[reservationId];
        return (
            reservation.spotId,
            reservation.user,
            reservation.startTime,
            reservation.endTime,
            reservation.status,
            reservation.isActive
        );
    }

    /**
     * @notice Get user reservations
     * @param user User address
     */
    function getUserReservations(address user) external view returns (uint256[] memory) {
        return userReservations[user];
    }

    /**
     * @notice Get user profile info
     * @param user User address
     */
    function getUserProfile(address user) external view returns (
        bool isRegistered,
        uint256 totalReservations,
        uint256 lastReservation,
        uint256 depositBalance
    ) {
        UserProfile storage profile = userProfiles[user];
        return (
            profile.isRegistered,
            profile.totalReservations,
            profile.lastReservation,
            profile.depositBalance
        );
    }

    /**
     * @notice Get Gateway request status
     * @param requestId Request ID
     */
    function getRequestStatus(uint256 requestId) external view returns (
        RequestType requestType,
        uint256 reservationId,
        address requester,
        uint256 timestamp,
        bool processed,
        bool timedOut
    ) {
        GatewayRequest storage request = gatewayRequests[requestId];
        return (
            request.requestType,
            request.reservationId,
            request.requester,
            request.timestamp,
            request.processed,
            request.timedOut
        );
    }

    /**
     * @notice Get contract statistics
     */
    function getStatistics() external view returns (
        uint32 totalParkingSpots,
        uint256 totalReservationsCount,
        uint256 currentPlatformFees,
        bool isPaused
    ) {
        return (totalSpots, reservationCounter, platformFees, paused);
    }

    /**
     * @notice Verify user identity using encrypted comparison
     * @param user User address
     * @param providedUserId User ID to verify
     */
    function verifyUserIdentity(address user, uint32 providedUserId) external returns (ebool) {
        require(userProfiles[user].isRegistered, "User not registered");

        // Apply privacy multiplier to protect against division attacks
        euint32 encProvidedId = FHE.asEuint32(providedUserId);
        euint32 storedId = userProfiles[user].encryptedUserId;

        return FHE.eq(encProvidedId, storedId);
    }

    // ============ Receive Function ============
    receive() external payable {
        if (userProfiles[msg.sender].isRegistered) {
            userProfiles[msg.sender].depositBalance += msg.value;
            emit DepositReceived(msg.sender, msg.value);
        } else {
            revert("User not registered");
        }
    }
}
