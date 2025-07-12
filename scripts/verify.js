const { run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(60));
  console.log("开始验证合约...");
  console.log("=".repeat(60));

  // 读取部署信息
  const contractName = "ParkingReservation";
  const deploymentFile = path.join(
    __dirname,
    "..",
    "deployments",
    `${network.name}-${contractName}.json`
  );

  if (!fs.existsSync(deploymentFile)) {
    throw new Error(
      `❌ 未找到部署文件: ${deploymentFile}\n请先运行部署脚本: npx hardhat run scripts/deploy.js --network ${network.name}`
    );
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

  console.log("\n📋 合约信息:");
  console.log("─".repeat(60));
  console.log("合约名称:", deploymentInfo.contractName);
  console.log("合约地址:", deploymentInfo.contractAddress);
  console.log("网络名称:", deploymentInfo.network);
  console.log("部署者:", deploymentInfo.deployer);
  console.log("部署时间:", deploymentInfo.deploymentTime);
  console.log("─".repeat(60));

  // 检查是否是可验证的网络
  const verifiableNetworks = ["sepolia", "mainnet", "goerli", "polygon", "mumbai"];
  if (!verifiableNetworks.includes(network.name)) {
    console.log(`\n⚠️  网络 "${network.name}" 不支持 Etherscan 验证`);
    console.log("支持的网络:", verifiableNetworks.join(", "));
    return;
  }

  // 检查 Etherscan API Key
  if (!process.env.ETHERSCAN_API_KEY) {
    throw new Error(
      "❌ 未设置 ETHERSCAN_API_KEY 环境变量\n请在 .env 文件中添加: ETHERSCAN_API_KEY=your_api_key"
    );
  }

  console.log("\n⏳ 等待区块确认...");
  console.log("建议等待至少 5 个区块确认后再验证");
  await new Promise((resolve) => setTimeout(resolve, 30000)); // 等待 30 秒

  // 构造参数（如果有）
  const constructorArguments = [];

  console.log("\n🔍 开始在 Etherscan 上验证合约...");
  console.log("─".repeat(60));

  try {
    await run("verify:verify", {
      address: deploymentInfo.contractAddress,
      constructorArguments: constructorArguments,
      contract: `contracts/${contractName}.sol:${contractName}`,
    });

    console.log("\n✅ 合约验证成功！");
    console.log("─".repeat(60));

    // 显示 Etherscan 链接
    const explorerUrls = {
      sepolia: `https://sepolia.etherscan.io/address/${deploymentInfo.contractAddress}#code`,
      mainnet: `https://etherscan.io/address/${deploymentInfo.contractAddress}#code`,
      goerli: `https://goerli.etherscan.io/address/${deploymentInfo.contractAddress}#code`,
      polygon: `https://polygonscan.com/address/${deploymentInfo.contractAddress}#code`,
      mumbai: `https://mumbai.polygonscan.com/address/${deploymentInfo.contractAddress}#code`,
    };

    const explorerUrl = explorerUrls[network.name];
    if (explorerUrl) {
      console.log("📊 查看已验证的合约代码:");
      console.log(explorerUrl);
    }

    // 更新部署信息
    deploymentInfo.verified = true;
    deploymentInfo.verifiedAt = new Date().toISOString();
    deploymentInfo.explorerUrl = explorerUrl;
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 验证信息已更新到: ${deploymentFile}`);

  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("\n✅ 合约已经被验证过了！");

      const explorerUrls = {
        sepolia: `https://sepolia.etherscan.io/address/${deploymentInfo.contractAddress}#code`,
        mainnet: `https://etherscan.io/address/${deploymentInfo.contractAddress}#code`,
        goerli: `https://goerli.etherscan.io/address/${deploymentInfo.contractAddress}#code`,
      };

      const explorerUrl = explorerUrls[network.name];
      if (explorerUrl) {
        console.log("📊 查看合约代码:");
        console.log(explorerUrl);
      }
    } else {
      throw error;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✨ 验证流程完成！");
  console.log("=".repeat(60));
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ 验证失败:");
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = main;
