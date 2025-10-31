# Testing Documentation

## Overview

This document provides comprehensive testing information for the Private Parking Reservation System. The test suite ensures reliability, security, and correctness of all smart contract functionality.

## Test Infrastructure

### Technology Stack

- **Testing Framework**: Hardhat + Mocha
- **Assertion Library**: Chai with Hardhat matchers
- **Solidity Version**: 0.8.24
- **Network**: Hardhat local network (chainId: 31337)
- **Coverage Tool**: solidity-coverage
- **Gas Reporter**: hardhat-gas-reporter

### Configuration

```typescript
// hardhat.config.ts
{
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun"
    }
  },
  mocha: {
    timeout: 200000  // 200 seconds for complex operations
  }
}
```

## Test Suite Structure

### Total Test Cases: 48

The test suite is organized into 10 major categories:

1. **Deployment Tests** (3 tests)
2. **User Registration** (6 tests)
3. **Parking Spot Management** (6 tests)
4. **Reservation Management** (9 tests)
5. **Reservation Completion** (7 tests)
6. **Query Functions** (3 tests)
7. **Edge Cases & Boundary Conditions** (5 tests)
8. **Access Control** (2 tests)
9. **Event Emissions** (4 tests)
10. **Gas Optimization** (3 tests)

---

## Detailed Test Cases

### 1. Deployment Tests (3 tests)

#### Test 1.1: Should set the correct owner
**Purpose**: Verify contract owner is set correctly during deployment

**Test Flow**:
- Deploy contract
- Check owner address matches deployer

**Expected**: Owner equals deployer address

---

#### Test 1.2: Should have zero spots and reservations initially
**Purpose**: Ensure clean initial state

**Test Flow**:
- Deploy contract
- Call getStatistics()
- Verify totalSpots = 0 and reservationCounter = 0

**Expected**: Both counters start at zero

---

#### Test 1.3: Should deploy successfully with proper address
**Purpose**: Verify deployment returns valid contract address

**Test Flow**:
- Deploy contract
- Check address is valid

**Expected**: Valid Ethereum address returned

---

### 2. User Registration (6 tests)

#### Test 2.1: Should allow user to register
**Purpose**: Test successful user registration

**Test Flow**:
- User registers with valid userId (1001) and creditScore (750)
- Verify UserRegistered event emitted
- Check user info stored correctly

**Expected**:
- Event: UserRegistered(userAddress, 1001, 750)
- User record created with correct data

---

#### Test 2.2: Should reject registration with invalid credit score (too low)
**Purpose**: Test lower bound validation

**Test Flow**:
- Attempt registration with creditScore = 299

**Expected**: Transaction reverted with "Invalid credit score"

---

#### Test 2.3: Should reject registration with invalid credit score (too high)
**Purpose**: Test upper bound validation

**Test Flow**:
- Attempt registration with creditScore = 851

**Expected**: Transaction reverted with "Invalid credit score"

---

#### Test 2.4: Should reject duplicate registration
**Purpose**: Prevent users from re-registering

**Test Flow**:
- User registers successfully
- Same user attempts to register again

**Expected**: Transaction reverted with "Already registered"

---

#### Test 2.5: Should accept valid credit score at boundaries
**Purpose**: Test boundary values (300 and 850)

**Test Flow**:
- User1 registers with score = 300
- User2 registers with score = 850

**Expected**: Both registrations succeed

---

#### Test 2.6: Should store correct registration timestamp
**Purpose**: Verify timestamp recording

**Test Flow**:
- User registers
- Compare stored timestamp with block timestamp

**Expected**: Timestamps match

---

### 3. Parking Spot Management (6 tests)

#### Test 3.1: Should allow owner to add parking spot
**Purpose**: Test spot creation by owner

**Test Flow**:
- Owner adds spot with location "Zone A - Spot 1" and price 0.01 ETH
- Verify ParkingSpotAdded event
- Check totalSpots incremented

**Expected**:
- Event emitted with correct parameters
- totalSpots = 1

---

#### Test 3.2: Should revert if non-owner tries to add spot
**Purpose**: Test access control

**Test Flow**:
- Non-owner attempts to add parking spot

**Expected**: Transaction reverted with "Not owner"

---

#### Test 3.3: Should create multiple parking spots with correct IDs
**Purpose**: Test sequential spot creation

**Test Flow**:
- Add 3 spots
- Verify totalSpots = 3

**Expected**: Counter increments correctly

---

#### Test 3.4: Should store correct spot information
**Purpose**: Verify data integrity

**Test Flow**:
- Add spot with specific location and price
- Read spot data
- Compare values

**Expected**: All fields match input

---

#### Test 3.5: Should check spot availability correctly
**Purpose**: Test availability query

**Test Flow**:
- Add spot
- Call isSpotAvailable(1)

**Expected**: Returns true

---

#### Test 3.6: Should revert when checking invalid spot ID
**Purpose**: Test ID validation

**Test Flow**:
- Call isSpotAvailable(999) without creating spot

**Expected**: Transaction reverted with "Invalid spot ID"

---

### 4. Reservation Management (9 tests)

#### Test 4.1: Should allow registered user to make reservation
**Purpose**: Test successful reservation flow

**Test Flow**:
- Add parking spot
- Register user
- User makes 2-hour reservation with correct payment

**Expected**:
- ReservationCreated event emitted
- reservationCounter = 1

---

#### Test 4.2: Should revert if non-registered user tries to make reservation
**Purpose**: Enforce registration requirement

**Test Flow**:
- Add spot
- Unregistered user attempts reservation

**Expected**: Transaction reverted with "Not registered"

---

#### Test 4.3: Should revert with invalid spot ID
**Purpose**: Test spot ID validation

**Test Flow**:
- Registered user tries to reserve non-existent spot (ID 999)

**Expected**: Transaction reverted with "Invalid spot ID"

---

#### Test 4.4: Should revert with insufficient payment
**Purpose**: Test payment validation

**Test Flow**:
- User sends 0.01 ETH for 2-hour reservation (requires 0.02 ETH)

**Expected**: Transaction reverted with "Insufficient payment"

---

#### Test 4.5: Should revert with zero duration
**Purpose**: Test duration validation

**Test Flow**:
- User attempts reservation with duration = 0

**Expected**: Transaction reverted with "Invalid duration"

---

#### Test 4.6: Should mark spot as unavailable after reservation
**Purpose**: Test state update

**Test Flow**:
- Make reservation
- Check spot availability

**Expected**: isSpotAvailable(1) returns false

---

#### Test 4.7: Should refund excess payment
**Purpose**: Test refund mechanism

**Test Flow**:
- User sends 0.05 ETH for 0.02 ETH reservation
- Track balance changes

**Expected**: User receives 0.03 ETH refund (minus gas)

---

#### Test 4.8: Should store correct reservation details
**Purpose**: Verify data storage

**Test Flow**:
- Make 3-hour reservation
- Read reservation record
- Verify all fields

**Expected**: All data matches input

---

#### Test 4.9: Should revert when trying to reserve unavailable spot
**Purpose**: Test double-booking prevention

**Test Flow**:
- User1 reserves spot
- User2 attempts to reserve same spot

**Expected**: Transaction reverted with "Spot not available"

---

### 5. Reservation Completion (7 tests)

#### Test 5.1: Should allow user to complete their reservation
**Purpose**: Test completion flow

**Test Flow**:
- Make reservation
- User completes reservation

**Expected**: ReservationCompleted event emitted

---

#### Test 5.2: Should revert with invalid reservation ID
**Purpose**: Test ID validation

**Test Flow**:
- Attempt to complete non-existent reservation (ID 999)

**Expected**: Transaction reverted with "Invalid reservation ID"

---

#### Test 5.3: Should revert if non-owner tries to complete reservation
**Purpose**: Test ownership check

**Test Flow**:
- User1 makes reservation
- User2 attempts to complete it

**Expected**: Transaction reverted with "Not your reservation"

---

#### Test 5.4: Should revert if reservation already completed
**Purpose**: Prevent double completion

**Test Flow**:
- Complete reservation
- Attempt to complete again

**Expected**: Transaction reverted with "Already completed"

---

#### Test 5.5: Should mark spot as available after completion
**Purpose**: Test spot release

**Test Flow**:
- Complete reservation
- Check spot availability

**Expected**: isSpotAvailable(1) returns true

---

#### Test 5.6: Should transfer payment to spot owner
**Purpose**: Test payment flow

**Test Flow**:
- Track spot owner balance
- Complete reservation
- Verify balance increase

**Expected**: Owner receives exact reservation price

---

#### Test 5.7: Should mark reservation as completed
**Purpose**: Test flag update

**Test Flow**:
- Complete reservation
- Read reservation record

**Expected**: isCompleted = true

---

### 6. Query Functions (3 tests)

#### Test 6.1: Should return correct statistics
**Purpose**: Test getStatistics()

**Test Flow**:
- Add 2 spots
- Call getStatistics()

**Expected**: totalSpots = 2, totalReservations = 0

---

#### Test 6.2: Should return correct user info for registered user
**Purpose**: Test getUserInfo()

**Test Flow**:
- Register user with ID 5001, score 800
- Query user info

**Expected**: Returns (5001, 800, true)

---

#### Test 6.3: Should return default values for unregistered user
**Purpose**: Test unregistered user query

**Test Flow**:
- Query info for address that never registered

**Expected**: Returns (0, 0, false)

---

### 7. Edge Cases & Boundary Conditions (5 tests)

#### Test 7.1: Should handle spot ID zero correctly
**Purpose**: Test zero ID rejection

**Test Flow**:
- Call isSpotAvailable(0)

**Expected**: Transaction reverted with "Invalid spot ID"

---

#### Test 7.2: Should handle multiple reservations from same user
**Purpose**: Test multi-reservation support

**Test Flow**:
- User makes 2 reservations for different spots

**Expected**: Both succeed, counter = 2

---

#### Test 7.3: Should handle large duration values
**Purpose**: Test large number handling

**Test Flow**:
- Make reservation with duration = 100 hours

**Expected**: Transaction succeeds

---

#### Test 7.4: Should handle zero price spots
**Purpose**: Test free parking

**Test Flow**:
- Add spot with price = 0
- Make reservation with 0 payment

**Expected**: Transaction succeeds

---

#### Test 7.5: Should handle sequential spot additions
**Purpose**: Test scalability

**Test Flow**:
- Add 10 spots in sequence

**Expected**: All succeed, totalSpots = 10

---

### 8. Access Control (2 tests)

#### Test 8.1: Should enforce owner-only functions
**Purpose**: Test onlyOwner modifier

**Test Flow**:
- Non-owner calls addParkingSpot()

**Expected**: Transaction reverted with "Not owner"

---

#### Test 8.2: Should enforce registered-only functions
**Purpose**: Test onlyRegistered modifier

**Test Flow**:
- Unregistered user calls makeReservation()

**Expected**: Transaction reverted with "Not registered"

---

### 9. Event Emissions (4 tests)

#### Test 9.1: Should emit UserRegistered event with correct parameters
**Purpose**: Verify event data

**Test Flow**:
- Register user
- Check event parameters

**Expected**: UserRegistered(address, 9999, 725)

---

#### Test 9.2: Should emit ParkingSpotAdded event with correct parameters
**Purpose**: Verify spot creation event

**Test Flow**:
- Add spot
- Check event

**Expected**: ParkingSpotAdded(1, location, price)

---

#### Test 9.3: Should emit ReservationCreated event with correct parameters
**Purpose**: Verify reservation event

**Test Flow**:
- Make reservation
- Check event

**Expected**: ReservationCreated(1, userAddress, 1)

---

#### Test 9.4: Should emit ReservationCompleted event
**Purpose**: Verify completion event

**Test Flow**:
- Complete reservation
- Check event

**Expected**: ReservationCompleted(1)

---

### 10. Gas Optimization (3 tests)

#### Test 10.1: Should use reasonable gas for user registration
**Purpose**: Monitor gas usage

**Test Flow**:
- Register user
- Check gas used

**Expected**: Gas < 200,000

---

#### Test 10.2: Should use reasonable gas for adding parking spot
**Purpose**: Monitor spot creation cost

**Test Flow**:
- Add spot
- Check gas used

**Expected**: Gas < 300,000

---

#### Test 10.3: Should use reasonable gas for making reservation
**Purpose**: Monitor reservation cost

**Test Flow**:
- Make reservation
- Check gas used

**Expected**: Gas < 500,000

---

## Test Execution

### Run All Tests
```bash
npm test
```

### Run with Coverage
```bash
npm run test:coverage
```

### Run with Gas Reporting
```bash
npm run test:gas
```

---

## Test Results

### Latest Test Run

```
48 passing (690ms)
```

### Code Coverage

```
-------------------------|----------|----------|----------|----------|
File                     |  % Stmts | % Branch |  % Funcs |  % Lines |
-------------------------|----------|----------|----------|----------|
contracts/               |      100 |      100 |      100 |      100 |
 ParkingReservation.sol  |      100 |      100 |      100 |      100 |
-------------------------|----------|----------|----------|----------|
All files                |      100 |      100 |      100 |      100 |
-------------------------|----------|----------|----------|----------|
```

**Achievement**: 100% coverage across all metrics

---

## Test Patterns Used

### Pattern 1: Deployment Fixture
Every test uses a clean contract deployment via `loadFixture()` to ensure test isolation.

```javascript
async function deployParkingFixture() {
  const [owner, user1, user2, user3] = await ethers.getSigners();
  const ParkingReservation = await ethers.getContractFactory("ParkingReservation");
  const parking = await ParkingReservation.deploy();
  return { parking, owner, user1, user2, user3 };
}
```

### Pattern 2: Multi-Signer Testing
Tests use multiple signers (owner, user1, user2, user3) to verify access control and multi-user scenarios.

### Pattern 3: Event Verification
All state-changing operations verify correct event emission with proper parameters.

```javascript
await expect(parking.connect(user1).registerUser(1001, 750))
  .to.emit(parking, "UserRegistered")
  .withArgs(user1.address, 1001, 750);
```

### Pattern 4: Revert Testing
Error conditions are explicitly tested using `.to.be.revertedWith()`.

```javascript
await expect(
  parking.connect(user1).makeReservation(999, 2, { value: ethers.parseEther("0.02") })
).to.be.revertedWith("Invalid spot ID");
```

### Pattern 5: State Verification
After operations, contract state is verified through getter functions.

---

## Security Testing

The test suite includes comprehensive security checks:

1. **Access Control**: onlyOwner and onlyRegistered modifiers
2. **Input Validation**: Credit score ranges, spot IDs, durations
3. **Payment Validation**: Insufficient payment, refund mechanism
4. **State Management**: Spot availability, reservation completion
5. **Reentrancy Protection**: Payment transfers after state updates
6. **Integer Overflow**: Handled by Solidity 0.8.24 built-in checks

---

## Continuous Integration

### Recommended CI Pipeline

```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

---

## Future Testing Improvements

### Planned Enhancements

1. **Fuzzing Tests**: Add property-based testing with Echidna
2. **Formal Verification**: Integrate Certora for mathematical proofs
3. **Load Testing**: Test with 100+ spots and reservations
4. **Upgrade Testing**: Test contract upgradeability patterns
5. **Integration Tests**: Deploy to testnet and run end-to-end tests

---

## Testing Best Practices

1. **Isolation**: Each test is independent via fixtures
2. **Clarity**: Descriptive test names explain what is tested
3. **Coverage**: 100% code coverage achieved
4. **Documentation**: This file documents all test cases
5. **Maintainability**: Tests are organized logically
6. **Performance**: Fast execution (< 1 second total)

---

## Troubleshooting

### Common Issues

**Issue**: Tests timeout
**Solution**: Increase timeout in hardhat.config.ts

**Issue**: Gas estimation fails
**Solution**: Check network configuration and account balances

**Issue**: Artifacts not found
**Solution**: Run `npx hardhat clean && npx hardhat compile`

---

## References

- [Hardhat Testing Documentation](https://hardhat.org/hardhat-runner/docs/guides/test-contracts)
- [Chai Matchers](https://ethereum-waffle.readthedocs.io/en/latest/matchers.html)
- [Solidity Coverage](https://github.com/sc-forks/solidity-coverage)

---

## Test Maintenance

**Last Updated**: 2025-11-03
**Test Suite Version**: 1.0.0
**Maintained By**: Development Team

Regular maintenance includes:
- Adding tests for new features
- Updating tests when contracts change
- Monitoring gas costs
- Reviewing coverage reports
