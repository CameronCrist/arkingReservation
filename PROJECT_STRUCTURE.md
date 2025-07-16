# Project Structure - Private Parking Reservation System

Complete Hardhat-based development framework with TypeScript support.

## 📂 Directory Structure

```

├── contracts/                          # Smart Contracts
│   ├── PrivateParkingReservation.sol  # V1 Contract
│   └── PrivateParkingReservationV2.sol # V2 Contract (Current)
│
├── scripts/                            # Deployment & Interaction Scripts
│   ├── deploy.js                      # Main deployment script
│   ├── verify.js                      # Contract verification script
│   ├── interact.js                    # Interactive CLI tool
│   └── simulate.js                    # Full workflow simulation
│
├── test/                              # Test Suite
│   └── PrivateParkingReservation.test.js
│
├── deploy/                            # Hardhat-deploy tasks
│
├── deployments/                       # Deployment artifacts (auto-generated)
│   ├── sepolia-PrivateParkingReservationV2.json
│   └── PrivateParkingReservationV2-ABI.json
│
├── reports/                           # Simulation reports (auto-generated)
│   └── simulation-*.json
│
├── public/                            # Frontend files
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   └── config.js
│
├── artifacts/                         # Compiled contracts (auto-generated)
├── cache/                             # Hardhat cache (auto-generated)
├── typechain-types/                   # TypeScript types (auto-generated)
│
├── hardhat.config.ts                  # Hardhat configuration (TypeScript)
├── hardhat.config.js                  # Hardhat configuration (JavaScript)
├── tsconfig.json                      # TypeScript configuration
├── package.json                       # Dependencies and scripts
│
├── .env                               # Environment variables (DO NOT COMMIT)
├── .env.example                       # Environment template
├── .gitignore                         # Git ignore rules
│
├── README.md                          # Main documentation
├── DEPLOYMENT.md                      # Deployment guide
├── IMPLEMENTATION_NOTES.md            # Technical notes
├── QUICK_START.md                     # Quick start guide
├── UPGRADE_SUMMARY.md                 # Version history
└── PROJECT_STRUCTURE.md              # This file
```

## 🔧 Configuration Files

### `hardhat.config.ts`

TypeScript configuration file with:

- **Solidity Version**: 0.8.24
- **Optimizer**: Enabled (200 runs)
- **Networks**:
  - Hardhat (local)
  - Localhost
  - Sepolia testnet
  - FHEVM (Zama)
- **Plugins**:
  - @nomicfoundation/hardhat-toolbox
  - @nomicfoundation/hardhat-verify
  - @typechain/hardhat
  - hardhat-contract-sizer
  - hardhat-deploy
  - hardhat-gas-reporter
  - solidity-coverage

### `package.json`

NPM scripts available:

```json
{
  "scripts": {
    "compile": "npx hardhat compile",
    "deploy": "npx hardhat deploy --network sepolia",
    "deploy:local": "npx hardhat deploy --network localhost",
    "test": "npx hardhat test",
    "test:coverage": "npx hardhat coverage",
    "test:gas": "REPORT_GAS=true npx hardhat test",
    "node": "npx hardhat node",
    "start": "npx http-server public -p 3000 -c-1 --cors",
    "verify": "npx hardhat verify --network sepolia",
    "typechain": "npx hardhat typechain",
    "size": "npx hardhat size-contracts",
    "clean": "npx hardhat clean"
  }
}
```

### `.env.example`

Environment variables template:

```env
# Network Configuration
PRIVATE_KEY=                    # Deployment account private key
SEPOLIA_RPC_URL=               # Sepolia RPC endpoint
FHEVM_RPC_URL=                 # Zama FHEVM endpoint

# Verification
ETHERSCAN_API_KEY=             # Etherscan API key

# Optional
REPORT_GAS=false               # Enable gas reporting
COINMARKETCAP_API_KEY=        # For USD gas estimates
```

## 📜 Smart Contracts

### PrivateParkingReservationV2.sol

Main contract featuring:

- **FHE Support**: Zama TFHE library integration
- **User Management**: Encrypted user registration
- **Parking Spots**: Add and manage parking locations
- **Reservations**: Book and complete parking sessions
- **Privacy**: All sensitive data encrypted on-chain

**Key Functions**:

- `registerUser(euint32 userId, euint16 creditScore)`
- `addParkingSpot(string location, uint256 pricePerHour)`
- `makeReservation(uint256 spotId, uint256 durationHours)`
- `completeReservation(uint256 reservationId)`
- `getStatistics()`

## 🛠️ Scripts Documentation

### 1. deploy.js

**Purpose**: Deploy contracts to any network

**Features**:
- Network validation
- Balance checking
- Deployment confirmation
- Auto-save deployment info
- ABI extraction
- Explorer link generation

**Usage**:
```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Deploy to local
npx hardhat run scripts/deploy.js --network localhost
```

**Output**:
- Deployment info saved to `deployments/`
- Contract ABI exported
- Explorer links displayed

---

### 2. verify.js

**Purpose**: Verify contract source code on Etherscan

**Features**:
- Auto-read deployment info
- Constructor arguments handling
- Multiple network support
- Verification status tracking

**Usage**:
```bash
npx hardhat run scripts/verify.js --network sepolia
```

**Requirements**:
- Valid `ETHERSCAN_API_KEY` in `.env`
- Contract already deployed
- At least 5 block confirmations

---

### 3. interact.js

**Purpose**: Interactive CLI for contract operations

**Features**:
- Menu-driven interface
- All contract functions accessible
- Real-time transaction monitoring
- User-friendly prompts

**Usage**:
```bash
npx hardhat run scripts/interact.js --network sepolia
```

**Menu Options**:
1. View system statistics
2. View contract owner
3. Add parking spot (admin only)
4. View parking spot info
5. Register user
6. View user info
7. Make reservation
8. View reservation
9. Complete reservation
0. Exit

---

### 4. simulate.js

**Purpose**: Full workflow simulation

**Features**:
- Automated testing sequence
- Multiple user scenarios
- Complete booking flow
- Report generation

**Usage**:
```bash
npx hardhat run scripts/simulate.js --network sepolia
```

**Simulation Steps**:
1. View initial statistics
2. Add 3 parking spots
3. Register 2 users
4. Query parking info
5. Make 2 reservations
6. View reservations
7. Complete 1 reservation
8. View final statistics
9. Generate report

**Output**:
- Detailed console logs
- JSON report in `reports/` directory

## 📊 Deployment Information

### Current Deployment (Sepolia)

```json
{
  "network": "sepolia",
  "chainId": 11155111,
  "contractName": "PrivateParkingReservationV2",
  "contractAddress": "0x78257622318fC85f2a9c909DD7aF9d0142cd90ce",
  "deployer": "0x...",
  "deploymentTime": "2024-XX-XX",
  "verified": true,
  "explorerUrl": "https://sepolia.etherscan.io/address/0x78257622318fC85f2a9c909DD7aF9d0142cd90ce"
}
```

### Network Configuration

| Network | Chain ID | RPC URL | Explorer |
|---------|----------|---------|----------|
| **Sepolia** | 11155111 | Infura/Alchemy | https://sepolia.etherscan.io |
| **Localhost** | 31337 | http://127.0.0.1:8545 | - |
| **Hardhat** | 31337 | Built-in | - |
| **FHEVM** | 8009 | https://devnet.zama.ai | - |

## 🧪 Testing

### Test Structure

```
test/
└── PrivateParkingReservation.test.js
```

### Running Tests

```bash
# Run all tests
npm test

# Run with gas reporting
npm run test:gas

# Generate coverage report
npm run test:coverage
```

### Test Coverage

- Contract deployment
- User registration
- Parking spot management
- Reservation creation
- Reservation completion
- Access control
- Edge cases

## 📦 Dependencies

### Production

- `@fhevm/solidity`: ^0.2.0 - FHE library for Solidity
- `@fhevm/hardhat-plugin`: ^0.1.0 - Hardhat FHE plugin
- `fhevmjs`: ^0.3.0 - JavaScript FHE library
- `ethers`: ^6.9.0 - Ethereum library
- `dotenv`: ^16.3.1 - Environment variables

### Development

- `hardhat`: ^2.19.0 - Development framework
- `@nomicfoundation/hardhat-toolbox`: ^3.0.0 - Hardhat tools
- `@nomicfoundation/hardhat-verify`: ^1.0.0 - Contract verification
- `@typechain/hardhat`: ^8.0.0 - TypeScript bindings
- `hardhat-gas-reporter`: ^1.0.9 - Gas analytics
- `hardhat-contract-sizer`: ^2.10.0 - Contract size checker
- `hardhat-deploy`: ^0.11.45 - Deployment system
- `solidity-coverage`: ^0.8.5 - Code coverage
- `typescript`: ^5.2.0 - TypeScript support
- `ts-node`: ^10.9.1 - TypeScript execution

## 🚀 Workflow

### Development Workflow

1. **Setup**
   ```bash
   npm install
   cp .env.example .env
   # Edit .env with your values
   ```

2. **Development**
   ```bash
   npm run compile
   npm test
   npm run node  # Start local network
   ```

3. **Deployment**
   ```bash
   npm run deploy:local          # Test locally
   npm run deploy -- --network sepolia  # Deploy to testnet
   ```

4. **Verification**
   ```bash
   npx hardhat run scripts/verify.js --network sepolia
   ```

5. **Interaction**
   ```bash
   npx hardhat run scripts/interact.js --network sepolia
   npx hardhat run scripts/simulate.js --network sepolia
   ```

### CI/CD Workflow

1. Code commit
2. Automated tests
3. Test coverage check
4. Contract size check
5. Gas optimization review
6. Deploy to testnet
7. Verify contract
8. Run simulations
9. Update documentation

## 🔐 Security

### Best Practices

- Never commit `.env` file
- Use hardware wallet for mainnet
- Verify all transactions
- Regular security audits
- Monitor contract activity
- Keep dependencies updated

### Audit Checklist

- [ ] Reentrancy protection
- [ ] Access control
- [ ] Integer overflow/underflow
- [ ] Gas optimization
- [ ] FHE implementation
- [ ] Input validation
- [ ] Event logging
- [ ] Error handling

## 📚 Resources

### Documentation

- [Hardhat Docs](https://hardhat.org/docs)
- [Ethers.js Docs](https://docs.ethers.org/)
- [Zama FHE Docs](https://docs.zama.ai/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Tools

- [Remix IDE](https://remix.ethereum.org/)
- [Etherscan](https://sepolia.etherscan.io/)
- [OpenZeppelin](https://www.openzeppelin.com/)
- [Tenderly](https://tenderly.co/)

### Community

- [Hardhat Discord](https://hardhat.org/discord)
- [Ethereum Stack Exchange](https://ethereum.stackexchange.com/)
- [Zama Community](https://discord.fhe.org/)

---

**Last Updated**: 2024
**Framework Version**: Hardhat 2.19.0
**Solidity Version**: 0.8.24
**TypeScript**: Enabled
