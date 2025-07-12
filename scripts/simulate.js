const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(60));
  console.log("机密停车位预订系统 - 完整流程模拟");
  console.log("=".repeat(60));

  // 读取部署信息
  const contractName = "PrivateParkingReservationV2";
  const deploymentFile = path.join(
    __dirname,
    "..",
    "deployments",
    `${network.name}-${contractName}.json`
  );

  let contract;
  let owner, user1, user2;

  if (fs.existsSync(deploymentFile)) {
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    console.log("\n✅ 使用已部署的合约");
    console.log("合约地址:", deploymentInfo.contractAddress);

    [owner, user1, user2] = await ethers.getSigners();
    contract = await ethers.getContractAt(
      contractName,
      deploymentInfo.contractAddress,
      owner
    );
  } else {
    console.log("\n🚀 部署新合约用于模拟...");
    [owner, user1, user2] = await ethers.getSigners();

    const ContractFactory = await ethers.getContractFactory(contractName, owner);
    contract = await ContractFactory.deploy();
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log("✅ 合约部署成功:", contractAddress);
  }

  console.log("\n" + "─".repeat(60));
  console.log("参与账户:");
  console.log("─".repeat(60));
  console.log("管理员 (Owner):", owner.address);
  console.log("用户 1:", user1.address);
  console.log("用户 2:", user2.address);
  console.log("─".repeat(60));

  // 步骤 1: 查看初始统计信息
  console.log("\n" + "=".repeat(60));
  console.log("步骤 1: 查看初始系统统计信息");
  console.log("=".repeat(60));

  let stats = await contract.getStatistics();
  console.log("总停车位数:", stats[0].toString());
  console.log("总预订数:", stats[1].toString());
  console.log("当前时间戳:", stats[2].toString());

  // 步骤 2: 管理员添加停车位
  console.log("\n" + "=".repeat(60));
  console.log("步骤 2: 管理员添加停车位");
  console.log("=".repeat(60));

  const parkingSpots = [
    { location: "北京市朝阳区望京SOHO", price: "0.001" },
    { location: "上海市浦东新区陆家嘴", price: "0.002" },
    { location: "深圳市南山区科技园", price: "0.0015" },
  ];

  for (let i = 0; i < parkingSpots.length; i++) {
    const spot = parkingSpots[i];
    console.log(`\n添加停车位 ${i + 1}...`);
    console.log("位置:", spot.location);
    console.log("价格:", spot.price, "ETH/小时");

    try {
      const tx = await contract.addParkingSpot(
        spot.location,
        ethers.parseEther(spot.price)
      );
      await tx.wait();
      console.log("✅ 停车位添加成功");
    } catch (error) {
      console.log("⚠️ ", error.message);
    }
  }

  // 步骤 3: 用户注册
  console.log("\n" + "=".repeat(60));
  console.log("步骤 3: 用户注册");
  console.log("=".repeat(60));

  console.log("\n注册用户 1...");
  try {
    const tx1 = await contract.connect(user1).registerUser(10001, 750);
    await tx1.wait();
    console.log("✅ 用户 1 注册成功");
    console.log("地址:", user1.address);
    console.log("用户ID: 10001 (加密)");
    console.log("信用分数: 750 (加密)");
  } catch (error) {
    console.log("⚠️ ", error.message);
  }

  console.log("\n注册用户 2...");
  try {
    const tx2 = await contract.connect(user2).registerUser(10002, 680);
    await tx2.wait();
    console.log("✅ 用户 2 注册成功");
    console.log("地址:", user2.address);
    console.log("用户ID: 10002 (加密)");
    console.log("信用分数: 680 (加密)");
  } catch (error) {
    console.log("⚠️ ", error.message);
  }

  // 步骤 4: 查询停车位信息
  console.log("\n" + "=".repeat(60));
  console.log("步骤 4: 查询停车位信息");
  console.log("=".repeat(60));

  for (let i = 1; i <= 3; i++) {
    try {
      const spot = await contract.parkingSpots(i);
      console.log(`\n停车位 ${i}:`);
      console.log("  位置:", spot.location);
      console.log("  价格:", ethers.formatEther(spot.pricePerHour), "ETH/小时");
      console.log("  状态:", spot.isAvailable ? "✅ 可用" : "❌ 已预订");
    } catch (error) {
      console.log(`停车位 ${i}: 不存在`);
    }
  }

  // 步骤 5: 用户预订停车位
  console.log("\n" + "=".repeat(60));
  console.log("步骤 5: 用户预订停车位");
  console.log("=".repeat(60));

  console.log("\n用户 1 预订停车位 1 (2小时)...");
  try {
    const spot1 = await contract.parkingSpots(1);
    const duration1 = 2;
    const totalPrice1 = spot1.pricePerHour * BigInt(duration1);

    console.log("预订详情:");
    console.log("  停车位:", spot1.location);
    console.log("  时长:", duration1, "小时");
    console.log("  总价:", ethers.formatEther(totalPrice1), "ETH");

    const tx1 = await contract.connect(user1).makeReservation(1, duration1, {
      value: totalPrice1,
    });
    const receipt1 = await tx1.wait();
    console.log("✅ 预订成功");
    console.log("Gas 使用:", receipt1.gasUsed.toString());
  } catch (error) {
    console.log("❌ 预订失败:", error.message);
  }

  console.log("\n用户 2 预订停车位 2 (3小时)...");
  try {
    const spot2 = await contract.parkingSpots(2);
    const duration2 = 3;
    const totalPrice2 = spot2.pricePerHour * BigInt(duration2);

    console.log("预订详情:");
    console.log("  停车位:", spot2.location);
    console.log("  时长:", duration2, "小时");
    console.log("  总价:", ethers.formatEther(totalPrice2), "ETH");

    const tx2 = await contract.connect(user2).makeReservation(2, duration2, {
      value: totalPrice2,
    });
    const receipt2 = await tx2.wait();
    console.log("✅ 预订成功");
    console.log("Gas 使用:", receipt2.gasUsed.toString());
  } catch (error) {
    console.log("❌ 预订失败:", error.message);
  }

  // 步骤 6: 查看预订信息
  console.log("\n" + "=".repeat(60));
  console.log("步骤 6: 查看预订信息");
  console.log("=".repeat(60));

  for (let i = 1; i <= 2; i++) {
    try {
      const reservation = await contract.reservations(i);
      console.log(`\n预订 ${i}:`);
      console.log("  用户:", reservation.user);
      console.log("  停车位 ID:", reservation.spotId.toString());
      console.log("  开始时间:", new Date(Number(reservation.startTime) * 1000).toLocaleString());
      console.log("  结束时间:", new Date(Number(reservation.endTime) * 1000).toLocaleString());
      console.log("  总价:", ethers.formatEther(reservation.totalPrice), "ETH");
      console.log("  状态:", reservation.isCompleted ? "✅ 已完成" : "🔄 进行中");
    } catch (error) {
      console.log(`预订 ${i}: 不存在`);
    }
  }

  // 步骤 7: 完成预订
  console.log("\n" + "=".repeat(60));
  console.log("步骤 7: 完成预订");
  console.log("=".repeat(60));

  console.log("\n用户 1 完成预订 1...");
  try {
    const tx1 = await contract.connect(user1).completeReservation(1);
    await tx1.wait();
    console.log("✅ 预订 1 已完成");

    const reservation1 = await contract.reservations(1);
    console.log("  最终状态:", reservation1.isCompleted ? "✅ 已完成" : "🔄 进行中");
  } catch (error) {
    console.log("❌ 完成失败:", error.message);
  }

  // 步骤 8: 查看最终统计信息
  console.log("\n" + "=".repeat(60));
  console.log("步骤 8: 查看最终系统统计信息");
  console.log("=".repeat(60));

  stats = await contract.getStatistics();
  console.log("\n最终统计:");
  console.log("─".repeat(60));
  console.log("总停车位数:", stats[0].toString());
  console.log("总预订数:", stats[1].toString());
  console.log("当前时间戳:", stats[2].toString());
  console.log("─".repeat(60));

  // 步骤 9: 查看账户余额变化
  console.log("\n" + "=".repeat(60));
  console.log("步骤 9: 账户余额");
  console.log("=".repeat(60));

  const ownerBalance = await ethers.provider.getBalance(owner.address);
  const user1Balance = await ethers.provider.getBalance(user1.address);
  const user2Balance = await ethers.provider.getBalance(user2.address);

  console.log("\n当前余额:");
  console.log("─".repeat(60));
  console.log("管理员:", ethers.formatEther(ownerBalance), "ETH");
  console.log("用户 1:", ethers.formatEther(user1Balance), "ETH");
  console.log("用户 2:", ethers.formatEther(user2Balance), "ETH");
  console.log("─".repeat(60));

  // 生成模拟报告
  console.log("\n" + "=".repeat(60));
  console.log("模拟报告生成");
  console.log("=".repeat(60));

  const reportData = {
    network: network.name,
    contractAddress: await contract.getAddress(),
    timestamp: new Date().toISOString(),
    participants: {
      owner: owner.address,
      user1: user1.address,
      user2: user2.address,
    },
    statistics: {
      totalParkingSpots: stats[0].toString(),
      totalReservations: stats[1].toString(),
    },
    balances: {
      owner: ethers.formatEther(ownerBalance),
      user1: ethers.formatEther(user1Balance),
      user2: ethers.formatEther(user2Balance),
    },
  };

  const reportsDir = path.join(__dirname, "..", "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportFile = path.join(
    reportsDir,
    `simulation-${network.name}-${Date.now()}.json`
  );
  fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));

  console.log(`\n✅ 模拟报告已保存到: ${reportFile}`);

  console.log("\n" + "=".repeat(60));
  console.log("✨ 模拟流程完成！");
  console.log("=".repeat(60));

  console.log("\n📝 总结:");
  console.log("─".repeat(60));
  console.log("✅ 添加了", parkingSpots.length, "个停车位");
  console.log("✅ 注册了 2 个用户");
  console.log("✅ 完成了 2 次预订");
  console.log("✅ 完成了 1 次预订结算");
  console.log("─".repeat(60));
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ 模拟失败:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
