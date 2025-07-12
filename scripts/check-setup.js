/**
 * Setup Verification Script
 *
 * 检查 Hardhat 开发框架的完整性
 */

const fs = require("fs");
const path = require("path");

console.log("=".repeat(70));
console.log("Hardhat Development Framework - Setup Verification");
console.log("=".repeat(70));

const checks = {
  passed: [],
  failed: [],
  warnings: [],
};

// 检查函数
function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, "..", filePath);
  if (fs.existsSync(fullPath)) {
    checks.passed.push(`✅ ${description}: ${filePath}`);
    return true;
  } else {
    checks.failed.push(`❌ ${description}: ${filePath}`);
    return false;
  }
}

function checkDirectory(dirPath, description) {
  const fullPath = path.join(__dirname, "..", dirPath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    checks.passed.push(`✅ ${description}: ${dirPath}/`);
    return true;
  } else {
    checks.failed.push(`❌ ${description}: ${dirPath}/`);
    return false;
  }
}

function checkOptionalFile(filePath, description) {
  const fullPath = path.join(__dirname, "..", filePath);
  if (fs.existsSync(fullPath)) {
    checks.passed.push(`✅ ${description}: ${filePath}`);
    return true;
  } else {
    checks.warnings.push(`⚠️  ${description}: ${filePath} (optional)`);
    return false;
  }
}

console.log("\n📋 Checking Core Configuration Files...\n");

// 核心配置文件
checkFile("hardhat.config.ts", "Hardhat TypeScript Config");
checkFile("hardhat.config.js", "Hardhat JavaScript Config");
checkFile("package.json", "Package Configuration");
checkFile("tsconfig.json", "TypeScript Configuration");
checkFile(".env.example", "Environment Template");
checkOptionalFile(".env", "Environment Variables");

console.log("\n📁 Checking Project Directories...\n");

// 项目目录
checkDirectory("contracts", "Contracts Directory");
checkDirectory("scripts", "Scripts Directory");
checkDirectory("test", "Test Directory");
checkDirectory("public", "Frontend Directory");

console.log("\n📜 Checking Smart Contracts...\n");

// 智能合约
checkFile("contracts/PrivateParkingReservationV2.sol", "Main Contract V2");
checkOptionalFile("contracts/PrivateParkingReservation.sol", "Original Contract V1");

console.log("\n🛠️  Checking Deployment Scripts...\n");

// 部署脚本
checkFile("scripts/deploy.js", "Deployment Script");
checkFile("scripts/verify.js", "Verification Script");
checkFile("scripts/interact.js", "Interaction Script");
checkFile("scripts/simulate.js", "Simulation Script");

console.log("\n🧪 Checking Test Files...\n");

// 测试文件
checkFile("test/PrivateParkingReservationV2.test.js", "Contract Tests V2");
checkOptionalFile("test/PrivateParkingReservation.test.js", "Contract Tests V1");

console.log("\n📚 Checking Documentation...\n");

// 文档文件
checkFile("README.md", "Main README");
checkFile("DEPLOYMENT.md", "Deployment Guide");
checkFile("PROJECT_STRUCTURE.md", "Project Structure");
checkFile("FRAMEWORK_SUMMARY.md", "Framework Summary");
checkOptionalFile("IMPLEMENTATION_NOTES.md", "Implementation Notes");
checkOptionalFile("QUICK_START.md", "Quick Start Guide");
checkOptionalFile("UPGRADE_SUMMARY.md", "Upgrade Summary");

console.log("\n🌐 Checking Frontend Files...\n");

// 前端文件
checkFile("public/index.html", "Frontend HTML");
checkOptionalFile("public/app.js", "Frontend JavaScript");
checkOptionalFile("public/style.css", "Frontend Styles");
checkOptionalFile("public/config.js", "Frontend Config");

console.log("\n📦 Checking package.json Scripts...\n");

// 检查 package.json 脚本
const packageJsonPath = path.join(__dirname, "..", "package.json");
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const requiredScripts = [
    "compile",
    "deploy",
    "deploy:local",
    "test",
    "test:coverage",
    "test:gas",
    "node",
    "start",
    "verify",
  ];

  requiredScripts.forEach((scriptName) => {
    if (packageJson.scripts && packageJson.scripts[scriptName]) {
      checks.passed.push(`✅ NPM Script: ${scriptName}`);
    } else {
      checks.failed.push(`❌ NPM Script: ${scriptName}`);
    }
  });
}

console.log("\n🔌 Checking Hardhat Plugins...\n");

// 检查插件依赖
const requiredDeps = [
  "@nomicfoundation/hardhat-toolbox",
  "@nomicfoundation/hardhat-verify",
  "@typechain/hardhat",
  "hardhat-contract-sizer",
  "hardhat-deploy",
  "hardhat-gas-reporter",
  "solidity-coverage",
  "hardhat",
  "ethers",
];

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const allDeps = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};

requiredDeps.forEach((dep) => {
  if (allDeps[dep]) {
    checks.passed.push(`✅ Dependency: ${dep} (${allDeps[dep]})`);
  } else {
    checks.failed.push(`❌ Dependency: ${dep}`);
  }
});

// 显示结果
console.log("\n" + "=".repeat(70));
console.log("Verification Results");
console.log("=".repeat(70));

console.log(`\n✅ Passed: ${checks.passed.length}`);
checks.passed.forEach((msg) => console.log(`  ${msg}`));

if (checks.warnings.length > 0) {
  console.log(`\n⚠️  Warnings: ${checks.warnings.length}`);
  checks.warnings.forEach((msg) => console.log(`  ${msg}`));
}

if (checks.failed.length > 0) {
  console.log(`\n❌ Failed: ${checks.failed.length}`);
  checks.failed.forEach((msg) => console.log(`  ${msg}`));
}

console.log("\n" + "=".repeat(70));
console.log("Summary");
console.log("=".repeat(70));

const total = checks.passed.length + checks.failed.length;
const passRate = ((checks.passed.length / total) * 100).toFixed(1);

console.log(`Total Checks: ${total}`);
console.log(`Passed: ${checks.passed.length} (${passRate}%)`);
console.log(`Failed: ${checks.failed.length}`);
console.log(`Warnings: ${checks.warnings.length}`);

if (checks.failed.length === 0) {
  console.log("\n🎉 All required checks passed!");
  console.log("✅ Your Hardhat development framework is properly configured.");
  console.log("\n📝 Next Steps:");
  console.log("  1. Configure .env file with your credentials");
  console.log("  2. Run: npm install");
  console.log("  3. Run: npm run compile");
  console.log("  4. Run: npm test");
  console.log("  5. Deploy: npm run deploy -- --network sepolia");
} else {
  console.log("\n⚠️  Some checks failed. Please review the failed items above.");
  console.log("💡 Tip: Run 'npm install' to install missing dependencies.");
  process.exit(1);
}

console.log("\n" + "=".repeat(70));
console.log("For more information, see:");
console.log("  - README.md");
console.log("  - FRAMEWORK_SUMMARY.md");
console.log("  - DEPLOYMENT.md");
console.log("=".repeat(70) + "\n");
