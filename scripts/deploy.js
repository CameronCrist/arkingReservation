const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(60));
  console.log("开始部署机密停车位预订合约...");
  console.log("=".repeat(60));

  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("\n📋 部署信息:");
  console.log("─".repeat(60));
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(balance), "ETH");
  console.log("网络名称:", network.name);
  console.log("Chain ID:", network.config.chainId);
  console.log("─".repeat(60));

  // 检查余额是否足够
  if (balance === 0n) {
    throw new Error("❌ 部署账户余额不足！请向账户充值。");
  }

  // 选择要部署的合约
  const contractName = "ParkingReservation";
  console.log(`\n🚀 正在部署合约: ${contractName}...`);

  // 部署合约
  const ContractFactory = await ethers.getContractFactory(contractName);

  console.log("📦 开始部署交易...");
  const contract = await ContractFactory.deploy();

  console.log("⏳ 等待合约部署确认...");
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  console.log("\n✅ 合约部署成功！");
  console.log("─".repeat(60));
  console.log("合约地址:", contractAddress);
  console.log("─".repeat(60));

  // 验证合约部署
  console.log("\n🔍 验证合约部署...");
  try {
    const owner = await contract.owner();
    console.log("✓ 合约所有者:", owner);

    const stats = await contract.getStatistics();
    console.log("\n📊 初始统计信息:");
    console.log("  • 总停车位数:", stats[0].toString());
    console.log("  • 总预订数:", stats[1].toString());
    console.log("  • 当前时间戳:", stats[2].toString());

  } catch (error) {
    console.error("⚠️  验证合约时出现警告:", error.message);
  }

  // 保存部署信息
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    contractName: contractName,
    contractAddress: contractAddress,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    txHash: contract.deploymentTransaction()?.hash || "N/A",
  };

  // 创建 deployments 目录
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // 保存部署信息到文件
  const deploymentFile = path.join(
    deploymentsDir,
    `${network.name}-${contractName}.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 部署信息已保存到: ${deploymentFile}`);

  // 保存 ABI
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    `${contractName}.sol`,
    `${contractName}.json`
  );

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abiFile = path.join(deploymentsDir, `${contractName}-ABI.json`);
    fs.writeFileSync(abiFile, JSON.stringify(artifact.abi, null, 2));
    console.log(`📄 ABI 已保存到: ${abiFile}`);
  }

  // 显示区块链浏览器链接
  console.log("\n🔗 区块链浏览器链接:");
  console.log("─".repeat(60));

  const explorerUrls = {
    sepolia: `https://sepolia.etherscan.io/address/${contractAddress}`,
    mainnet: `https://etherscan.io/address/${contractAddress}`,
    goerli: `https://goerli.etherscan.io/address/${contractAddress}`,
    localhost: "本地网络 - 无浏览器",
    hardhat: "Hardhat 网络 - 无浏览器",
  };

  const explorerUrl = explorerUrls[network.name] || "未知网络";
  console.log("Etherscan:", explorerUrl);
  console.log("─".repeat(60));

  // 显示后续步骤
  console.log("\n📝 后续步骤:");
  console.log("─".repeat(60));
  console.log("1. 验证合约（如果在测试网/主网）:");
  console.log(`   npx hardhat run scripts/verify.js --network ${network.name}`);
  console.log("\n2. 与合约交互:");
  console.log(`   npx hardhat run scripts/interact.js --network ${network.name}`);
  console.log("\n3. 运行模拟测试:");
  console.log(`   npx hardhat run scripts/simulate.js --network ${network.name}`);
  console.log("─".repeat(60));

  console.log("\n" + "=".repeat(60));
  console.log("✨ 部署流程完成！");
  console.log("=".repeat(60));

  return {
    contract,
    address: contractAddress,
    deployer: deployer.address,
  };
}

// 执行部署
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ 部署失败:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
