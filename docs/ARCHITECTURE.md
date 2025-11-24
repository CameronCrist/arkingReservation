# PrivateParkingReservation Architecture

## Overview

PrivateParkingReservation is a privacy-preserving parking reservation system built on Fully Homomorphic Encryption (FHE). It enables users to reserve parking spots while keeping sensitive information like user IDs, credit scores, and payment amounts encrypted on-chain.

## System Architecture

```
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
|   User/Frontend   |---->|  Smart Contract   |---->|   FHE Gateway     |
|                   |     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
        ^                        |   ^                     |
        |                        |   |                     |
        +------------------------+   +---------------------+
              Results                    Decryption Callback
```

## Gateway Callback Pattern

### Flow Diagram

```
1. User Request
   User submits encrypted reservation request
   |
   v
2. Contract Records
   Contract stores reservation with PENDING status
   Collects deposit as collateral
   |
   v
3. Gateway Decryption Request
   Contract requests spot status decryption from Gateway
   Records request ID and timestamp for timeout tracking
   |
   v
4. Gateway Processing
   Gateway decrypts ciphertext
   Prepares callback with cleartext and proof
   |
   v
5. Callback Execution
   Gateway calls reservationCallback()
   Contract verifies proof and processes result
   |
   v
6. Transaction Completion
   - Success: Reservation confirmed, spot marked reserved
   - Failure: Refund issued, spot remains available
```

### Request States

```
PENDING -----> ACTIVE -----> COMPLETED
    |             |
    v             v
 REFUNDED    CANCELLED
    ^
    |
 TIMEOUT
```

## Security Architecture

### Access Control Hierarchy

```
+---------------+
|    Owner      |  - Contract deployment
|               |  - Emergency functions
|               |  - Ownership transfer
|               |  - Operator management
+-------+-------+
        |
        v
+---------------+
|   Operators   |  - Add/update parking spots
|               |  - Set maintenance status
|               |  - Update privacy multiplier
+-------+-------+
        |
        v
+---------------+
| Registered    |  - Create reservations
| Users         |  - Cancel reservations
|               |  - View own data
+---------------+
```

### Security Features

1. **Input Validation**
   - All parameters validated before processing
   - Range checks for prices, durations, credit scores
   - Address validation (non-zero checks)

2. **Access Control**
   - Role-based permissions (owner, operator, user)
   - Function-level modifiers
   - Two-step ownership transfer

3. **Overflow Protection**
   - Solidity 0.8.x built-in overflow checks
   - Explicit bounds checking for critical values
   - Safe arithmetic in fee calculations

4. **Reentrancy Protection**
   - nonReentrant modifier on sensitive functions
   - State changes before external calls
   - Pull payment pattern for withdrawals

5. **Audit Considerations**
   - Comprehensive event logging
   - State transition tracking
   - Clear error messages

## Privacy Protection

### Division Attack Protection

Problem: Division operations can leak information about encrypted values.

Solution: Random multiplier applied to sensitive calculations.

```solidity
// Privacy multiplier updated periodically
uint64 privacyMultiplier = (block.timestamp * block.prevrandao) % 1000 + 1;
```

### Price Obfuscation

Problem: Price patterns can reveal sensitive business information.

Solution: Each spot has an obfuscation seed for price calculations.

```solidity
struct ParkingSpot {
    euint16 encryptedPrice;
    uint64 obfuscationSeed;  // Added noise to price queries
    ...
}
```

### Encrypted Data Fields

| Field | Type | Purpose |
|-------|------|---------|
| User ID | euint32 | Identity privacy |
| Credit Score | euint16 | Financial privacy |
| Payment Amount | euint16 | Transaction privacy |
| Spot Status | euint8 | Availability privacy |
| Reserved By | euint32 | Reservation privacy |

## Timeout Protection

### Configuration

```solidity
uint256 public constant TIMEOUT_PERIOD = 1 hours;
uint256 public constant REFUND_GRACE_PERIOD = 30 minutes;
```

### Timeout Flow

```
Request Submitted (t=0)
        |
        v
Gateway Processing Window (0 < t < 1 hour)
        |
        v
Timeout Eligible (t >= 1 hour)
        |
        v
User/Admin triggers triggerTimeout()
        |
        v
Automatic Refund Issued
```

## Refund Mechanism

### Refund Scenarios

| Scenario | Refund Amount | Trigger |
|----------|---------------|---------|
| Spot Unavailable | 100% | Gateway callback |
| Gateway Timeout | 100% | User/admin action |
| User Cancellation (Pending) | 100% | User action |
| User Cancellation (Active) | 90% | User action |
| Emergency Refund | 100% | Admin action |

### Refund Flow

```
1. Calculate refund amount
2. Attempt direct transfer
3. If transfer fails:
   - Add to user deposit balance
   - User can withdraw later
4. Emit RefundIssued event
```

## HCU (Homomorphic Compute Unit) Optimization

### Optimization Strategies

1. **Batch Operations**
   - Group related FHE operations
   - Minimize encrypted comparisons

2. **Efficient State Updates**
   - Update all encrypted fields in single operation
   - Use select operations instead of conditionals

3. **Permission Management**
   - Set allowThis() immediately after encryption
   - Pre-compute common encrypted values

### Gas Optimization

```solidity
// Efficient: Single encrypted comparison
ebool isAvailable = FHE.eq(spot.encryptedStatus, FHE.asEuint8(0));

// Inefficient: Multiple comparisons (avoided)
// ebool notReserved = FHE.ne(spot.encryptedStatus, FHE.asEuint8(1));
// ebool notMaintenance = FHE.ne(spot.encryptedStatus, FHE.asEuint8(2));
```

## Contract Interactions

### Reservation Flow

```
reserveSpot()
    |
    +-- Validate inputs
    +-- Check spot availability (time-based)
    +-- Create pending reservation
    +-- Request Gateway decryption
    +-- Store request metadata
    +-- Emit ReservationRequested

reservationCallback()
    |
    +-- Verify decryption proof
    +-- Check request not processed/timed out
    +-- Decode cleartext status
    +-- If available:
    |       +-- Confirm reservation
    |       +-- Update spot status
    |       +-- Collect platform fee
    +-- If unavailable:
            +-- Issue refund
            +-- Mark as refunded
```

### Cancellation Flow

```
cancelReservation()
    |
    +-- Validate reservation ownership
    +-- Check cancellation eligibility
    +-- Calculate refund (100% or 90%)
    +-- Update reservation status
    +-- Release parking spot
    +-- Process refund
    +-- Emit event
```

## Event System

### Event Categories

1. **Spot Events**
   - SpotAdded
   - SpotUpdated
   - SpotRemoved
   - PriceUpdated

2. **User Events**
   - UserRegistered
   - UserUpdated
   - DepositReceived

3. **Reservation Events**
   - ReservationRequested
   - ReservationConfirmed
   - ReservationCompleted
   - ReservationCancelled

4. **Refund Events**
   - RefundIssued
   - TimeoutTriggered
   - EmergencyWithdrawal

5. **Admin Events**
   - OwnershipTransferred
   - OperatorUpdated
   - Paused/Unpaused
   - PlatformFeesWithdrawn

## Deployment Considerations

### Prerequisites

1. FHEVM network access (Sepolia testnet or mainnet)
2. Gateway configuration
3. Sufficient gas for FHE operations

### Initialization Steps

1. Deploy contract
2. Add initial operators
3. Configure privacy multiplier
4. Add parking spots
5. Enable user registration

### Upgradability

Current implementation is non-upgradeable. For production:
- Consider proxy pattern for upgradability
- Implement proper migration strategy
- Document upgrade procedures
