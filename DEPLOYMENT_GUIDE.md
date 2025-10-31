# Deployment Guide

Complete deployment guide for the Private Parking Reservation System using Hardhat framework.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Testnet Deployment (Sepolia)](#testnet-deployment-sepolia)
5. [Contract Verification](#contract-verification)
6. [Deployment Scripts](#deployment-scripts)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **Git**: Latest version

### Check Installations

```bash
node --version  # Should be v18.0.0+
npm --version   # Should be v8.0.0+
```

### Required Accounts

1. **MetaMask Wallet**: For deploying and interacting with contracts
2. **Etherscan API Key**: For contract verification (get from [etherscan.io](https://etherscan.io/apis))
3. **Sepolia Testnet ETH**: For deployment (get from [Sepolia Faucet](https://sepoliafaucet.com/))

---

## Environment Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd private-parking-reservation
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` file with your credentials:

```env
# Private key from MetaMask (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Sepolia RPC URL (get from Infura or Alchemy)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# Etherscan API Key for verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Optional: CoinMarketCap API Key for gas reporting
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key_here
```

### 3. Security Best Practices

⚠️ **IMPORTANT**: Never commit your `.env` file to version control!

---

## Local Development

### 1. Compile Contracts

```bash
npm run compile
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests with gas reporting
npm run test:gas
```

### 3. Start Local Hardhat Node

```bash
npm run node
```

### 4. Deploy to Local Network

```bash
npm run deploy:local
```

---

## Testnet Deployment (Sepolia)

### 1. Get Sepolia ETH

Visit [Sepolia Faucet](https://sepoliafaucet.com/) and get testnet ETH

### 2. Deploy Contract

```bash
npm run deploy
```

**Expected Output:**

```
============================================================
Starting Private Parking Reservation Contract Deployment...
============================================================

📋 Deployment Information:
────────────────────────────────────────────────────────────
Deployer Address: 0x...
Account Balance: 0.5 ETH
Network Name: sepolia
Chain ID: 11155111
────────────────────────────────────────────────────────────

✅ Contract deployed successfully!
Contract Address: 0x...
```

---

## Contract Verification

### Verify on Etherscan

```bash
npm run verify
```

---

## Deployment Scripts

### 1. `scripts/deploy.js`

Deploys the contract and saves deployment information.

**Usage:**
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 2. `scripts/verify.js`

Verifies contract source code on Etherscan.

**Usage:**
```bash
npx hardhat run scripts/verify.js --network sepolia
```

### 3. `scripts/interact.js`

Interactive CLI tool for contract interaction.

**Usage:**
```bash
npx hardhat run scripts/interact.js --network sepolia
```

**Menu Options:**
```
1. View System Statistics
2. View Contract Owner
3. Add Parking Spot (Admin Only)
4. View Parking Spot Information
5. Register User
6. View User Information
7. Make Reservation
8. View Reservation Information
9. Complete Reservation
0. Exit
```

### 4. `scripts/simulate.js`

Full workflow simulation.

**Usage:**
```bash
npx hardhat run scripts/simulate.js --network sepolia
```

**Simulation Steps:**
1. View initial statistics
2. Admin adds parking spots
3. Users register
4. Users make reservations
5. Complete reservations
6. View final statistics
7. Generate report

---

## Complete Deployment Workflow

```bash
# 1. Clean previous builds
npm run clean

# 2. Compile contracts
npm run compile

# 3. Run tests
npm test

# 4. Deploy to Sepolia
npm run deploy

# 5. Verify contract
npm run verify

# 6. Run simulation
npm run simulate

# 7. Interact with contract
npm run interact
```

---

## Troubleshooting

### Issue 1: "Insufficient funds for gas"

**Solution:**
```bash
# Get testnet ETH from faucet
# Visit: https://sepoliafaucet.com/
```

### Issue 2: "Invalid nonce"

**Solution:**
```bash
# Reset account in MetaMask
# Settings > Advanced > Clear activity tab data
```

### Issue 3: "Contract verification failed"

**Solution:**
```bash
# Wait 2-3 minutes after deployment
npm run verify
```

### Issue 4: "Module not found"

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Network Configuration

### Hardhat Network (Local)
- URL: `http://127.0.0.1:8545`
- Chain ID: 31337

### Sepolia Testnet
- Chain ID: 11155111
- Explorer: https://sepolia.etherscan.io/

### Network Selection

```bash
# Local network
npx hardhat run scripts/deploy.js --network hardhat

# Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia
```

---

## Post-Deployment

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Contracts compiled successfully
- [ ] All tests passing
- [ ] Contract deployed
- [ ] Deployment info saved
- [ ] Contract verified on Etherscan
- [ ] Simulation test successful
- [ ] Documentation updated

---

## Security Considerations

### Before Mainnet Deployment

⚠️ **IMPORTANT**:

1. Get professional security audit
2. Extensive testing on testnet
3. Use hardware wallet
4. Never expose private keys
5. Implement access controls

---

## Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Sepolia Faucet](https://sepoliafaucet.com/)

---

**Last Updated:** 2025-01-03
**Framework:** Hardhat
**Solidity Version:** 0.8.24
