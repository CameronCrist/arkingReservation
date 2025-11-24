# PrivateParkingReservation API Documentation

## Overview

This document describes the API for the PrivateParkingReservation smart contract, a privacy-preserving parking reservation system using Fully Homomorphic Encryption (FHE).

## Table of Contents

- [Constants](#constants)
- [Data Types](#data-types)
- [Admin Functions](#admin-functions)
- [User Functions](#user-functions)
- [Parking Spot Functions](#parking-spot-functions)
- [Reservation Functions](#reservation-functions)
- [View Functions](#view-functions)
- [Events](#events)
- [Error Codes](#error-codes)

---

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `MIN_DURATION` | 15 minutes | Minimum reservation duration |
| `MAX_DURATION` | 24 hours | Maximum reservation duration |
| `TIMEOUT_PERIOD` | 1 hour | Gateway callback timeout |
| `REFUND_GRACE_PERIOD` | 30 minutes | Cancellation window for active reservations |
| `MAX_PRICE` | 10000 | Maximum spot price |
| `MAX_CREDIT_SCORE` | 850 | Maximum credit score |
| `PRICE_OBFUSCATION_RANGE` | 100 | Price obfuscation range |

---

## Data Types

### Enums

#### SpotStatus
```solidity
enum SpotStatus {
    Available,    // 0 - Spot is available for reservation
    Reserved,     // 1 - Spot is currently reserved
    Maintenance   // 2 - Spot is under maintenance
}
```

#### ReservationStatus
```solidity
enum ReservationStatus {
    Pending,      // 0 - Awaiting Gateway callback
    Active,       // 1 - Reservation confirmed
    Completed,    // 2 - Reservation completed
    Cancelled,    // 3 - Cancelled by user
    Refunded      // 4 - Refunded due to failure/timeout
}
```

#### RequestType
```solidity
enum RequestType {
    Reservation,   // 0 - Reservation request
    Cancellation,  // 1 - Cancellation request
    PriceQuery     // 2 - Price query request
}
```

### Structs

#### ParkingSpot
```solidity
struct ParkingSpot {
    euint16 encryptedPrice;        // Encrypted parking price
    euint8 encryptedStatus;        // Encrypted status
    bool isActive;                 // Whether spot is active
    euint32 encryptedReservedBy;   // Encrypted reserver ID
    uint256 reservationEnd;        // Reservation end timestamp
    string location;               // Location description
    uint64 obfuscationSeed;        // Price obfuscation seed
}
```

#### UserProfile
```solidity
struct UserProfile {
    euint32 encryptedUserId;       // Encrypted user ID
    euint16 encryptedCreditScore;  // Encrypted credit score
    bool isRegistered;             // Registration status
    uint256 totalReservations;     // Total reservations count
    uint256 lastReservation;       // Last reservation timestamp
    uint256 depositBalance;        // Deposit balance for refunds
}
```

#### Reservation
```solidity
struct Reservation {
    uint32 spotId;                 // Parking spot ID
    address user;                  // User address
    euint32 encryptedUserId;       // Encrypted user ID
    euint16 encryptedPaidAmount;   // Encrypted payment amount
    uint256 startTime;             // Start timestamp
    uint256 endTime;               // End timestamp
    ReservationStatus status;      // Reservation status
    bool isActive;                 // Active flag
    uint256 depositAmount;         // Deposit for potential refund
    uint256 requestTimestamp;      // Gateway request timestamp
    uint256 decryptionRequestId;   // Gateway request ID
}
```

---

## Admin Functions

### transferOwnership

Initiates ownership transfer to a new address.

```solidity
function transferOwnership(address newOwner) external onlyOwner
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| newOwner | address | Address of the new owner |

**Requirements:**
- Caller must be owner
- newOwner cannot be zero address
- newOwner cannot be current owner

**Events:** `OwnershipTransferInitiated(address previousOwner, address newOwner)`

---

### acceptOwnership

Accepts pending ownership transfer.

```solidity
function acceptOwnership() external
```

**Requirements:**
- Caller must be pending owner

**Events:** `OwnershipTransferred(address previousOwner, address newOwner)`

---

### setOperator

Sets or removes operator status for an address.

```solidity
function setOperator(address operator, bool status) external onlyOwner
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| operator | address | Address to set as operator |
| status | bool | true to enable, false to disable |

**Events:** `OperatorUpdated(address operator, bool status)`

---

### pause

Pauses contract operations.

```solidity
function pause() external onlyOwner
```

**Events:** `Paused(address by)`

---

### unpause

Unpauses contract operations.

```solidity
function unpause() external onlyOwner
```

**Events:** `Unpaused(address by)`

---

### updatePrivacyMultiplier

Updates the privacy multiplier for division protection.

```solidity
function updatePrivacyMultiplier() external onlyOperator
```

**Requirements:**
- Must wait at least 1 hour between updates

**Events:** `PrivacyMultiplierUpdated(uint64 newMultiplier)`

---

### withdrawPlatformFees

Withdraws accumulated platform fees.

```solidity
function withdrawPlatformFees(address to) external onlyOwner
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| to | address | Address to receive fees |

**Events:** `PlatformFeesWithdrawn(address to, uint256 amount)`

---

## User Functions

### registerUser

Registers a new user with encrypted credentials.

```solidity
function registerUser(uint32 _userId, uint16 _creditScore) external
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| _userId | uint32 | User ID to encrypt (must be > 0) |
| _creditScore | uint16 | Credit score (0-850) |

**Requirements:**
- User not already registered
- Valid user ID (> 0)
- Credit score <= 850
- Contract not paused

**Events:** `UserRegistered(address user)`

---

### deposit

Deposits funds for future reservations.

```solidity
function deposit() external payable
```

**Requirements:**
- User must be registered
- Deposit amount > 0
- Contract not paused

**Events:** `DepositReceived(address user, uint256 amount)`

---

### withdrawDeposit

Withdraws user's deposit balance.

```solidity
function withdrawDeposit() external
```

**Requirements:**
- User must be registered
- Balance > 0

**Events:** `EmergencyWithdrawal(address user, uint256 amount)`

---

## Parking Spot Functions

### addParkingSpot

Adds a new parking spot.

```solidity
function addParkingSpot(uint16 _price, string memory _location) external onlyOperator
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| _price | uint16 | Spot price (1-10000) |
| _location | string | Location description |

**Requirements:**
- Price between 1 and MAX_PRICE
- Location not empty
- Contract not paused

**Events:** `SpotAdded(uint32 spotId, string location)`

---

### updateSpotPrice

Updates parking spot price.

```solidity
function updateSpotPrice(uint32 spotId, uint16 newPrice) external onlyOperator
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| spotId | uint32 | Spot ID to update |
| newPrice | uint16 | New price (1-10000) |

**Events:** `PriceUpdated(uint32 spotId)`

---

### setSpotMaintenance

Sets spot maintenance status.

```solidity
function setSpotMaintenance(uint32 spotId, bool inMaintenance) external onlyOperator
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| spotId | uint32 | Spot ID |
| inMaintenance | bool | Maintenance status |

**Requirements:**
- Spot not currently reserved

**Events:** `SpotUpdated(uint32 spotId)`

---

### deactivateSpot

Deactivates a parking spot.

```solidity
function deactivateSpot(uint32 spotId) external onlyOperator
```

**Requirements:**
- Spot not currently reserved

**Events:** `SpotRemoved(uint32 spotId)`

---

### emergencyReleaseSpot

Emergency release of a parking spot (owner only).

```solidity
function emergencyReleaseSpot(uint32 spotId) external onlyOwner
```

**Events:** `SpotUpdated(uint32 spotId)`

---

## Reservation Functions

### requestReservation

Requests a parking spot reservation.

```solidity
function requestReservation(uint32 spotId, uint256 duration) external payable
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| spotId | uint32 | Spot ID to reserve |
| duration | uint256 | Duration in seconds (15min - 24h) |

**Value:** Payment amount for reservation

**Requirements:**
- User must be registered
- Valid spot ID and active
- Duration within MIN_DURATION and MAX_DURATION
- Payment amount > 0
- Spot not currently reserved
- Contract not paused

**Events:** `ReservationRequested(uint256 reservationId, uint32 spotId, address user, uint256 requestId)`

---

### reservationCallback

Gateway callback for reservation confirmation.

```solidity
function reservationCallback(
    uint256 requestId,
    bytes memory cleartexts,
    bytes memory decryptionProof
) external
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| requestId | uint256 | Gateway request ID |
| cleartexts | bytes | Decoded cleartext values |
| decryptionProof | bytes | Decryption proof |

**Events:**
- On success: `ReservationConfirmed`, `GatewayCallbackReceived(requestId, true)`
- On failure: `RefundIssued`, `GatewayCallbackReceived(requestId, false)`

---

### cancelReservation

Cancels a reservation.

```solidity
function cancelReservation(uint256 reservationId) external
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| reservationId | uint256 | Reservation to cancel |

**Refund Policy:**
- Pending reservations: 100% refund
- Active reservations (within grace period): 90% refund

**Events:** `ReservationCancelled(uint256 reservationId, uint32 spotId)`

---

### completeReservation

Marks a reservation as completed.

```solidity
function completeReservation(uint256 reservationId) external
```

**Requirements:**
- Reservation must be active
- Current time >= end time

**Events:** `ReservationCompleted(uint256 reservationId, uint32 spotId)`

---

### triggerTimeout

Triggers timeout for stuck Gateway request.

```solidity
function triggerTimeout(uint256 requestId) external
```

**Requirements:**
- Caller is requester or owner
- Request not already processed
- Timeout period has elapsed

**Events:** `TimeoutTriggered(uint256 requestId, address user)`

---

### emergencyRefund

Emergency refund for a reservation (owner only).

```solidity
function emergencyRefund(uint256 reservationId) external onlyOwner
```

**Events:** `RefundIssued` with reason "Emergency refund by admin"

---

## View Functions

### checkSpotAvailability

Checks spot availability (encrypted).

```solidity
function checkSpotAvailability(uint32 spotId) external returns (ebool)
```

**Returns:** Encrypted boolean indicating availability

---

### getSpotInfo

Gets public spot information.

```solidity
function getSpotInfo(uint32 spotId) external view returns (
    string memory location,
    bool isActive,
    uint256 reservationEnd
)
```

---

### getReservationInfo

Gets reservation information.

```solidity
function getReservationInfo(uint256 reservationId) external view returns (
    uint32 spotId,
    address user,
    uint256 startTime,
    uint256 endTime,
    ReservationStatus status,
    bool isActive
)
```

---

### getUserReservations

Gets user's reservation IDs.

```solidity
function getUserReservations(address user) external view returns (uint256[] memory)
```

---

### getUserProfile

Gets user profile information.

```solidity
function getUserProfile(address user) external view returns (
    bool isRegistered,
    uint256 totalReservations,
    uint256 lastReservation,
    uint256 depositBalance
)
```

---

### getRequestStatus

Gets Gateway request status.

```solidity
function getRequestStatus(uint256 requestId) external view returns (
    RequestType requestType,
    uint256 reservationId,
    address requester,
    uint256 timestamp,
    bool processed,
    bool timedOut
)
```

---

### getStatistics

Gets contract statistics.

```solidity
function getStatistics() external view returns (
    uint32 totalParkingSpots,
    uint256 totalReservationsCount,
    uint256 currentPlatformFees,
    bool isPaused
)
```

---

### verifyUserIdentity

Verifies user identity using encrypted comparison.

```solidity
function verifyUserIdentity(address user, uint32 providedUserId) external returns (ebool)
```

**Returns:** Encrypted boolean indicating if IDs match

---

## Events

### Spot Events
```solidity
event SpotAdded(uint32 indexed spotId, string location);
event SpotUpdated(uint32 indexed spotId);
event SpotRemoved(uint32 indexed spotId);
event PriceUpdated(uint32 indexed spotId);
```

### User Events
```solidity
event UserRegistered(address indexed user);
event UserUpdated(address indexed user);
event DepositReceived(address indexed user, uint256 amount);
```

### Reservation Events
```solidity
event ReservationRequested(uint256 indexed reservationId, uint32 indexed spotId, address indexed user, uint256 requestId);
event ReservationConfirmed(uint256 indexed reservationId, uint32 indexed spotId, address indexed user);
event ReservationCompleted(uint256 indexed reservationId, uint32 indexed spotId);
event ReservationCancelled(uint256 indexed reservationId, uint32 indexed spotId);
```

### Refund Events
```solidity
event RefundIssued(address indexed user, uint256 amount, string reason);
event TimeoutTriggered(uint256 indexed requestId, address indexed user);
event EmergencyWithdrawal(address indexed user, uint256 amount);
```

### Gateway Events
```solidity
event GatewayCallbackReceived(uint256 indexed requestId, bool success);
event PrivacyMultiplierUpdated(uint64 newMultiplier);
```

### Admin Events
```solidity
event OwnershipTransferInitiated(address indexed previousOwner, address indexed newOwner);
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
event OperatorUpdated(address indexed operator, bool status);
event Paused(address indexed by);
event Unpaused(address indexed by);
event PlatformFeesWithdrawn(address indexed to, uint256 amount);
```

---

## Error Codes

| Error | Description |
|-------|-------------|
| "Not authorized: owner only" | Caller is not the contract owner |
| "Not authorized: operator only" | Caller is not an operator or owner |
| "User not registered" | User has not registered |
| "User already registered" | User is already registered |
| "Invalid spot ID" | Spot ID does not exist |
| "Spot not active" | Parking spot is deactivated |
| "Contract is paused" | Contract operations are paused |
| "Reentrant call" | Reentrancy detected |
| "Invalid duration" | Duration outside allowed range |
| "Payment required" | No payment provided |
| "Spot currently reserved" | Spot has active reservation |
| "Already processed" | Gateway request already handled |
| "Request timed out" | Gateway request has timed out |
| "Timeout not reached" | Cannot trigger timeout yet |
| "Not your reservation" | Caller doesn't own reservation |
| "Cancellation window expired" | Too late to cancel |
| "No balance to withdraw" | No deposit balance available |
| "Invalid address" | Zero address provided |
| "Invalid price" | Price outside allowed range |
| "Invalid credit score" | Credit score > 850 |
| "Location required" | Empty location string |
| "Too frequent update" | Privacy multiplier update too soon |

---

## Usage Examples

### Register User
```javascript
const userId = 12345;
const creditScore = 750;
await contract.registerUser(userId, creditScore);
```

### Add Parking Spot (Operator)
```javascript
const price = 100; // in smallest unit
const location = "Building A, Level 2, Spot 15";
await contract.addParkingSpot(price, location);
```

### Reserve Spot
```javascript
const spotId = 0;
const duration = 3600; // 1 hour in seconds
const payment = ethers.parseEther("0.01");
await contract.requestReservation(spotId, duration, { value: payment });
```

### Check Reservation Status
```javascript
const reservationId = 0;
const info = await contract.getReservationInfo(reservationId);
console.log(`Status: ${info.status}, Active: ${info.isActive}`);
```

### Cancel Reservation
```javascript
const reservationId = 0;
await contract.cancelReservation(reservationId);
```

### Trigger Timeout (if Gateway doesn't respond)
```javascript
const requestId = 1;
await contract.triggerTimeout(requestId);
```
