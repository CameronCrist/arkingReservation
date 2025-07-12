# 🚀 Quick Start Guide - Private Parking Reservation V2

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies (1 min)
```bash
cd D:\
npm install
```

### Step 2: Configure Environment (1 min)
```bash
# Copy the example env file
copy .env.example .env

# Edit .env and add your:
# - PRIVATE_KEY (from MetaMask)
# - SEPOLIA_RPC_URL (from Infura/Alchemy)
# - ETHERSCAN_API_KEY (optional, for verification)
```

### Step 3: Compile Contracts (1 min)
```bash
npm run compile
```

### Step 4: Run Tests (2 min)
```bash
npm run test
```

### Step 5: Deploy (optional)
```bash
# Local deployment
npm run node           # Terminal 1
npm run deploy:local   # Terminal 2

# OR Sepolia testnet
npm run deploy
```

## 📋 Essential Commands

```bash
# Development
npm run compile        # Compile contracts
npm run test          # Run tests
npm run test:coverage # Test coverage
npm run test:gas      # Gas report
npm run size          # Contract sizes

# Deployment
npm run node          # Local Hardhat node
npm run deploy:local  # Deploy locally
npm run deploy        # Deploy to Sepolia

# Frontend
npm start             # Start frontend server

# Utilities
npm run clean         # Clean artifacts
npm run typechain     # Generate TypeChain types
```

## 🎯 Key Files

```

├── 📄 PrivateParkingReservationV2.sol  ⭐ Main contract
├── 📄 01_deploy_parking.js              ⭐ Deployment script
├── 📄 PrivateParkingReservationV2.test.js ⭐ Tests
├── 📄 fhevm-integration.js              ⭐ Frontend FHE
├── 📄 IMPLEMENTATION_NOTES.md           📖 Full documentation
├── 📄 UPGRADE_SUMMARY.md                📖 Upgrade details
└── 📄 QUICK_START.md                    📖 This file
```

## 🧪 Testing Different Features

### Test Access Control
```bash
npm run test -- --grep "Access Control"
```

### Test Pausable Mechanism
```bash
npm run test -- --grep "Pausable"
```

### Test Error Handling
```bash
npm run test -- --grep "Error Handling"
```

### Full Coverage Report
```bash
npm run test:coverage
# Opens coverage/index.html
```

## 🌐 Deploy to Sepolia

1. **Get Testnet ETH**
   - Visit: https://sepoliafaucet.com/
   - Enter your wallet address
   - Wait for ETH

2. **Configure .env**
   ```env
   PRIVATE_KEY=your_key_here
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_api_key
   ETHERSCAN_API_KEY=your_etherscan_key
   ```

3. **Deploy**
   ```bash
   npm run deploy
   ```

4. **Verify Contract** (automatic if ETHERSCAN_API_KEY is set)
   ```bash
   npm run verify
   ```

## 💻 Frontend Integration Example

```javascript
// 1. Import the FHE module
import FHEVMIntegration from './fhevm-integration.js';

// 2. Initialize
const fhevm = new FHEVMIntegration();
await fhevm.initialize(provider, contractAddress, contractABI);

// 3. Register user with encrypted data
await fhevm.registerUser({
    userId: 12345,
    creditScore: 750,
    hasLicense: true,
    initialBalance: 10000
});

// 4. Reserve parking spot
const { reservationId } = await fhevm.reserveSpot({
    spotId: 0,
    duration: 3600,  // 1 hour
    paymentAmount: 100
});

// 5. Request approval via Gateway
const { requestId } = await fhevm.requestDecryption(
    'requestReservationApproval',
    [reservationId]
);

// 6. Wait for Gateway callback
const result = await fhevm.waitForGatewayCallback(requestId);
console.log('Approved:', result.success);
```

## 🔧 Troubleshooting

### "Cannot find module '@fhevm/hardhat-plugin'"
```bash
npm install
```

### "Invalid private key"
- Check .env file exists
- Verify PRIVATE_KEY has no "0x" prefix
- Ensure no extra spaces

### "Insufficient funds"
- Get Sepolia ETH from faucet
- Check wallet balance

### Tests timeout
- Increase timeout in hardhat.config.js
- Check network connection

### Contract too large
```bash
npm run size  # Check current size
# Optimize or split contract if needed
```

## 📊 Contract Features Quick Reference

### Admin Functions (onlyOwner)
```solidity
addParkingSpot(price, location, capacity)
updateSpotPrice(spotId, newPrice)
setSpotMaintenance(spotId, inMaintenance)
emergencyReleaseSpot(spotId)
setPauser(newPauser)
```

### Emergency Functions (onlyPauser)
```solidity
pause()
unpause()
```

### User Functions
```solidity
registerUser(encUserId, encCreditScore, hasLicense, balance, proof)
reserveSpot(spotId, encDuration, encPayment, proof)
completeReservation(reservationId)
cancelReservation(reservationId)
```

### Query Functions (anyone)
```solidity
checkSpotAvailability(spotId)
getSpotInfo(spotId)
getUserReservations(user)
getReservationInfo(reservationId)
getStatistics()
```

### Gateway Functions
```solidity
requestSpotAvailabilityDecryption(spotId)
requestReservationApproval(reservationId)
```

## 🎓 Learning Path

1. **Beginner** (15 min)
   - Read UPGRADE_SUMMARY.md
   - Run tests: `npm run test`
   - Check contract size: `npm run size`

2. **Intermediate** (30 min)
   - Read IMPLEMENTATION_NOTES.md
   - Study PrivateParkingReservationV2.sol
   - Examine test cases

3. **Advanced** (1 hour)
   - Study fhevm-integration.js
   - Deploy to local network
   - Test frontend integration

4. **Expert** (2+ hours)
   - Deploy to Sepolia
   - Integrate with real frontend
   - Customize for your use case

## 🔗 Useful Links

- **Zama Docs**: https://docs.zama.ai/fhevm
- **fhevmjs**: https://docs.zama.ai/fhevmjs
- **Hardhat**: https://hardhat.org/docs
- **Sepolia Faucet**: https://sepoliafaucet.com/
- **Etherscan**: https://sepolia.etherscan.io/

## ✅ Verification Checklist

Before deployment:
- [ ] Dependencies installed
- [ ] .env configured
- [ ] Contracts compile successfully
- [ ] All tests pass
- [ ] Contract size acceptable
- [ ] Testnet ETH available
- [ ] RPC URL working

After deployment:
- [ ] Contract verified on Etherscan
- [ ] Owner address correct
- [ ] Pauser set appropriately
- [ ] Test basic functions
- [ ] Document contract address

## 🆘 Get Help

1. **Check Documentation**
   - IMPLEMENTATION_NOTES.md
   - UPGRADE_SUMMARY.md
   - Test files for examples

2. **Review Test Output**
   ```bash
   npm run test -- --verbose
   ```

3. **Check Gas Usage**
   ```bash
   REPORT_GAS=true npm run test
   ```

4. **Inspect Contract Size**
   ```bash
   npm run size
   ```

## 🎉 You're Ready!

The project is fully configured and ready to use. Start with:

```bash
npm run test
```

If all tests pass, you're good to go! 🚀

---

**Need more details?** See IMPLEMENTATION_NOTES.md

**Questions about upgrade?** See UPGRADE_SUMMARY.md

**Want to dive deep?** Read the smart contract code directly!
