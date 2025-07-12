const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// 创建命令行接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 提示用户输入
function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("=".repeat(60));
  console.log("机密停车位预订系统 - 合约交互工具");
  console.log("=".repeat(60));

  // 读取部署信息
  const contractName = "PrivateParkingReservationV2";
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
  console.log("合约地址:", deploymentInfo.contractAddress);
  console.log("网络名称:", network.name);
  console.log("─".repeat(60));

  // 连接合约
  const [signer] = await ethers.getSigners();
  const contract = await ethers.getContractAt(
    contractName,
    deploymentInfo.contractAddress,
    signer
  );

  console.log("\n👤 当前账户:", signer.address);
  console.log(
    "账户余额:",
    ethers.formatEther(await ethers.provider.getBalance(signer.address)),
    "ETH\n"
  );

  // 显示菜单
  while (true) {
    console.log("\n" + "=".repeat(60));
    console.log("请选择操作:");
    console.log("─".repeat(60));
    console.log("1. 查看系统统计信息");
    console.log("2. 查看合约所有者");
    console.log("3. 添加停车位 (仅管理员)");
    console.log("4. 查看停车位信息");
    console.log("5. 注册用户");
    console.log("6. 查看用户信息");
    console.log("7. 预订停车位");
    console.log("8. 查看预订信息");
    console.log("9. 完成预订");
    console.log("0. 退出");
    console.log("─".repeat(60));

    const choice = await question("请输入选项 (0-9): ");

    try {
      switch (choice.trim()) {
        case "1":
          await viewStatistics(contract);
          break;
        case "2":
          await viewOwner(contract);
          break;
        case "3":
          await addParkingSpot(contract, signer);
          break;
        case "4":
          await viewParkingSpot(contract);
          break;
        case "5":
          await registerUser(contract, signer);
          break;
        case "6":
          await viewUserInfo(contract);
          break;
        case "7":
          await makeReservation(contract, signer);
          break;
        case "8":
          await viewReservation(contract);
          break;
        case "9":
          await completeReservation(contract, signer);
          break;
        case "0":
          console.log("\n👋 感谢使用！再见！");
          rl.close();
          return;
        default:
          console.log("\n❌ 无效选项，请重新选择");
      }
    } catch (error) {
      console.error("\n❌ 操作失败:", error.message);
    }
  }
}

// 查看系统统计信息
async function viewStatistics(contract) {
  console.log("\n📊 正在获取系统统计信息...");
  const stats = await contract.getStatistics();
  console.log("─".repeat(60));
  console.log("总停车位数:", stats[0].toString());
  console.log("总预订数:", stats[1].toString());
  console.log("当前时间戳:", stats[2].toString());
  console.log("─".repeat(60));
}

// 查看合约所有者
async function viewOwner(contract) {
  console.log("\n👤 正在获取合约所有者...");
  const owner = await contract.owner();
  console.log("─".repeat(60));
  console.log("合约所有者:", owner);
  console.log("─".repeat(60));
}

// 添加停车位
async function addParkingSpot(contract, signer) {
  console.log("\n🅿️  添加停车位");
  console.log("─".repeat(60));

  const location = await question("请输入停车位位置 (例如: 北京市朝阳区): ");
  const pricePerHour = await question("请输入每小时价格 (ETH): ");

  console.log("\n⏳ 正在提交交易...");

  const tx = await contract.addParkingSpot(
    location,
    ethers.parseEther(pricePerHour)
  );

  console.log("交易哈希:", tx.hash);
  console.log("⏳ 等待确认...");

  const receipt = await tx.wait();
  console.log("✅ 停车位添加成功！");
  console.log("Gas 使用:", receipt.gasUsed.toString());
}

// 查看停车位信息
async function viewParkingSpot(contract) {
  const spotId = await question("\n请输入停车位 ID: ");

  console.log("\n🔍 正在查询停车位信息...");

  try {
    const spot = await contract.parkingSpots(spotId);
    console.log("─".repeat(60));
    console.log("停车位 ID:", spotId);
    console.log("位置:", spot.location);
    console.log("每小时价格:", ethers.formatEther(spot.pricePerHour), "ETH");
    console.log("是否可用:", spot.isAvailable ? "✅ 可用" : "❌ 已预订");
    console.log("拥有者:", spot.owner);
    console.log("─".repeat(60));
  } catch (error) {
    console.log("❌ 停车位不存在");
  }
}

// 注册用户
async function registerUser(contract, signer) {
  console.log("\n👤 用户注册");
  console.log("─".repeat(60));
  console.log("注意: FHE 加密功能需要特殊的客户端库支持");
  console.log("此演示将使用普通参数");
  console.log("─".repeat(60));

  const userId = await question("请输入用户 ID (数字): ");
  const creditScore = await question("请输入信用分数 (300-850): ");

  console.log("\n⏳ 正在提交注册交易...");

  try {
    // 注意: 实际使用时需要使用 FHE 加密库
    const tx = await contract.registerUser(userId, creditScore);

    console.log("交易哈希:", tx.hash);
    console.log("⏳ 等待确认...");

    const receipt = await tx.wait();
    console.log("✅ 用户注册成功！");
    console.log("Gas 使用:", receipt.gasUsed.toString());
  } catch (error) {
    console.error("❌ 注册失败:", error.message);
  }
}

// 查看用户信息
async function viewUserInfo(contract) {
  const address = await question("\n请输入用户地址 (默认为当前地址): ");
  const userAddress = address.trim() || (await ethers.getSigners())[0].address;

  console.log("\n🔍 正在查询用户信息...");

  try {
    const user = await contract.users(userAddress);
    console.log("─".repeat(60));
    console.log("用户地址:", userAddress);
    console.log("是否已注册:", user.isRegistered ? "✅ 是" : "❌ 否");
    console.log("注册时间:", new Date(Number(user.registrationTime) * 1000).toLocaleString());
    console.log("─".repeat(60));
  } catch (error) {
    console.log("❌ 查询失败");
  }
}

// 预订停车位
async function makeReservation(contract, signer) {
  console.log("\n🚗 预订停车位");
  console.log("─".repeat(60));

  const spotId = await question("请输入停车位 ID: ");
  const duration = await question("请输入预订时长 (小时): ");

  console.log("\n🔍 正在查询停车位价格...");

  try {
    const spot = await contract.parkingSpots(spotId);
    const totalPrice = spot.pricePerHour * BigInt(duration);

    console.log("停车位位置:", spot.location);
    console.log("每小时价格:", ethers.formatEther(spot.pricePerHour), "ETH");
    console.log("预订时长:", duration, "小时");
    console.log("总价格:", ethers.formatEther(totalPrice), "ETH");

    const confirm = await question("\n确认预订? (y/n): ");

    if (confirm.toLowerCase() !== "y") {
      console.log("❌ 已取消预订");
      return;
    }

    console.log("\n⏳ 正在提交预订交易...");

    const tx = await contract.makeReservation(spotId, duration, {
      value: totalPrice,
    });

    console.log("交易哈希:", tx.hash);
    console.log("⏳ 等待确认...");

    const receipt = await tx.wait();
    console.log("✅ 预订成功！");
    console.log("Gas 使用:", receipt.gasUsed.toString());
  } catch (error) {
    console.error("❌ 预订失败:", error.message);
  }
}

// 查看预订信息
async function viewReservation(contract) {
  const reservationId = await question("\n请输入预订 ID: ");

  console.log("\n🔍 正在查询预订信息...");

  try {
    const reservation = await contract.reservations(reservationId);
    console.log("─".repeat(60));
    console.log("预订 ID:", reservationId);
    console.log("用户:", reservation.user);
    console.log("停车位 ID:", reservation.spotId.toString());
    console.log("开始时间:", new Date(Number(reservation.startTime) * 1000).toLocaleString());
    console.log("结束时间:", new Date(Number(reservation.endTime) * 1000).toLocaleString());
    console.log("总价格:", ethers.formatEther(reservation.totalPrice), "ETH");
    console.log("是否完成:", reservation.isCompleted ? "✅ 是" : "❌ 否");
    console.log("─".repeat(60));
  } catch (error) {
    console.log("❌ 预订不存在");
  }
}

// 完成预订
async function completeReservation(contract, signer) {
  const reservationId = await question("\n请输入要完成的预订 ID: ");

  console.log("\n⏳ 正在提交完成交易...");

  try {
    const tx = await contract.completeReservation(reservationId);

    console.log("交易哈希:", tx.hash);
    console.log("⏳ 等待确认...");

    const receipt = await tx.wait();
    console.log("✅ 预订已完成！");
    console.log("Gas 使用:", receipt.gasUsed.toString());
  } catch (error) {
    console.error("❌ 操作失败:", error.message);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ 错误:");
      console.error(error);
      rl.close();
      process.exit(1);
    });
}

module.exports = main;
