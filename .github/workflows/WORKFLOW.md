# GitHub Actions Workflows

This directory contains the CI/CD workflows for automated testing and quality checks.

## Workflows

### 🧪 test.yml - Main Test Suite
**Triggers:** Push to main/develop, Pull Requests

**Jobs:**
- Test on Node.js 18.x
- Test on Node.js 20.x
- Code quality checks
- Build verification

**Features:**
- Automated testing
- Code coverage reporting
- Codecov integration
- Multi-version compatibility

---

### 🎯 manual.yml - Manual Testing
**Trigger:** Manual dispatch

**Options:**
- Select Node.js version (18.x or 20.x)
- Enable/disable coverage

**Use Cases:**
- On-demand testing
- Debug failing tests
- Pre-release verification

---

### 🔍 pr.yml - Pull Request Validation
**Trigger:** Pull request events

**Features:**
- Automated PR validation
- Test result comments
- Security audit
- Coverage analysis

---

## Running Workflows Locally

### Simulate CI Environment

```bash
# Install dependencies (like CI)
npm ci

# Run linter
npm run lint:sol

# Compile contracts
npm run compile

# Run tests
npm test

# Generate coverage
npm run test:coverage

# Check contract sizes
npm run size
```

---

## Workflow Status

Check workflow status:
- Navigate to repository → Actions tab
- View recent workflow runs
- Check logs for failures
- Re-run failed jobs if needed

---

## Adding New Workflows

1. Create new `.yml` file in this directory
2. Define trigger events
3. Add jobs and steps
4. Test with manual trigger
5. Update this README

---

## Troubleshooting

### Workflow fails to start
- Check YAML syntax
- Verify trigger conditions
- Review branch protection rules

### Tests fail in CI but pass locally
- Check Node.js version match
- Verify environment variables
- Review workflow logs

### Coverage upload fails
- Verify CODECOV_TOKEN secret
- Check Codecov service status
- Review upload logs

---

For detailed documentation, see [CI_CD_DOCUMENTATION.md](../../CI_CD_DOCUMENTATION.md)
