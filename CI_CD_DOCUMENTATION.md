# CI/CD Documentation

## Overview

This project implements a comprehensive Continuous Integration and Continuous Deployment (CI/CD) pipeline using GitHub Actions to ensure code quality, automated testing, and reliable deployments.

---

## 🚀 CI/CD Features

### ✅ Automated Testing
- Runs on every push to `main` and `develop` branches
- Runs on all pull requests
- Tests across multiple Node.js versions (18.x, 20.x)
- Generates code coverage reports
- Uploads coverage to Codecov

### ✅ Code Quality Checks
- Solidity code linting with Solhint
- Code formatting checks with Prettier
- Contract size verification
- Security audit with npm audit

### ✅ Multi-Version Testing
- Node.js 18.x support
- Node.js 20.x support
- Ensures compatibility across versions

### ✅ Manual Workflows
- On-demand testing via workflow_dispatch
- Configurable Node.js version
- Optional coverage report generation

---

## 📁 Workflow Files

### 1. Main Test Workflow (`.github/workflows/test.yml`)

**Triggers:**
- Push to `main` branch
- Push to `develop` branch
- Pull requests to `main` or `develop`

**Jobs:**
- `test-node-18`: Runs tests on Node.js 18.x
- `test-node-20`: Runs tests on Node.js 20.x
- `code-quality`: Performs code quality checks
- `build`: Compiles contracts and generates types

---

### 2. Manual Test Workflow (`.github/workflows/manual.yml`)

**Trigger:** Manual dispatch from GitHub Actions UI

**Inputs:**
- `node-version`: Choose Node.js version (18.x or 20.x)
- `run-coverage`: Enable/disable coverage report

---

### 3. Pull Request Workflow (`.github/workflows/pr.yml`)

**Trigger:** Pull request opened, synchronized, or reopened

**Features:**
- Validates PR changes
- Runs full test suite
- Generates coverage
- Comments on PR with test results
- Runs security audit

---

## 🔧 Configuration Files

### Solhint Configuration (`.solhint.json`)

```json
{
  "extends": "solhint:recommended",
  "rules": {
    "code-complexity": ["error", 10],
    "compiler-version": ["error", ">=0.8.24"],
    "func-visibility": ["error", { "ignoreConstructors": true }],
    "max-line-length": ["warn", 120]
  }
}
```

### Codecov Configuration (`codecov.yml`)

```yaml
coverage:
  range: "70...100"
  status:
    project:
      default:
        target: 80%
        threshold: 5%
```

---

## 📊 NPM Scripts

### Testing Scripts

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests with gas reporting
npm run test:gas
```

### Linting Scripts

```bash
# Run Solhint on all contracts
npm run lint:sol

# Auto-fix Solhint issues
npm run lint:sol:fix

# Check code formatting
npm run format:check

# Auto-format code
npm run format
```

---

## 🔐 Required Secrets

Configure these in GitHub Repository Settings → Secrets:

| Secret Name | Description | Required For |
|-------------|-------------|--------------|
| `CODECOV_TOKEN` | Codecov upload token | Coverage reporting |
| `SEPOLIA_RPC_URL` | Sepolia testnet RPC URL | Testnet deployment |
| `PRIVATE_KEY` | Deployment wallet private key | Contract deployment |
| `ETHERSCAN_API_KEY` | Etherscan verification key | Contract verification |

---

## 📈 Quality Gates

All checks must pass for PR merge:

| Check | Threshold | Status |
|-------|-----------|--------|
| Tests Pass | 100% | ✅ Required |
| Code Coverage | ≥ 80% | ✅ Required |
| Solhint Linter | 0 errors | ⚠️ Warnings OK |
| Contract Size | < 24 KiB | ✅ Required |

---

## 🧪 Local Testing

Before pushing, test locally:

```bash
# 1. Install dependencies
npm ci

# 2. Run linter
npm run lint:sol

# 3. Compile contracts
npm run compile

# 4. Run tests
npm test

# 5. Generate coverage
npm run test:coverage
```

---

**Last Updated:** 2025-11-03
**Maintained By:** Development Team
