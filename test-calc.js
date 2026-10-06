const { calculateDesignFee, calculatePlanningFee, calculateBiddingFee } = require('./miniprogram/utils/calculator.js');
const { interpolate } = require('./miniprogram/utils/interpolation.js');
const { basePriceTable } = require('./miniprogram/data/base-price.js');

console.log("=== 开始测试易计算核心引擎 ===");

// 测试用例 1: 直线内插法 (600万元)
const test600 = interpolate(600, basePriceTable);
console.log("\n[测试用例 1] 计费额 600 万基价内插:");
console.log("预期结果: 24.48 万元");
console.log(`实际结果: ${test600.price} 万元`);
console.log(`公式详情: ${test600.formula}`);
if (Math.abs(test600.price - 24.48) < 0.0001) {
  console.log("✅ 测试通过");
} else {
  console.error("❌ 测试失败!");
  process.exit(1);
}

// 测试用例 2: 5000万，建筑设计，II级复杂程度，含预算编制和竣工图编制 (2002版收费基准价)
const test5000 = calculateDesignFee({
  cost: 5000,
  specialty: 'building',
  complexity: 'II',
  additionalCoefficients: [],
  discount: 100,
  stageRatio: 100,
  extraServices: {
    budget: true,  // +10%
    asbuilt: true  // +8%
  },
  taxRate: 0
});

console.log("\n[测试用例 2] 5000万建筑设计+预算(10%)+竣工图(8%)收费基准价:");
console.log("预期基价: 163.90 万元");
console.log(`实际基价: ${test5000.basePrice} 万元`);
console.log("预期基准价: 193.40 万元 (163.9 + 16.39 + 13.112 = 193.402)");
console.log(`实际基准价: ${test5000.feeBaseTotal} 万元`);
if (Math.abs(test5000.feeBaseTotal - 193.402) < 0.01) {
  console.log("✅ 测试通过");
} else {
  console.error("❌ 测试失败!");
  process.exit(1);
}

// 测试用例 3: 多附加调整系数叠加规则 (改扩建1.2，主体设计协调1.05)
// 公式: 1.2 + 1.05 - 2 + 1 = 1.25
const testCoefs = calculateDesignFee({
  cost: 5000,
  specialty: 'building',
  complexity: 'II',
  additionalCoefficients: [1.2, 1.05],
  discount: 100,
  stageRatio: 100,
  extraServices: {},
  taxRate: 0
});

console.log("\n[测试用例 3] 多系数叠加 (1.2 与 1.05):");
console.log("预期附加系数: 1.25");
console.log(`实际附加系数: ${testCoefs.netAdditionalCoef}`);
console.log("预期基本设计收费: 163.9 * 1.25 = 204.875 万元");
console.log(`实际基本设计收费: ${testCoefs.basicFee} 万元`);
if (Math.abs(testCoefs.netAdditionalCoef - 1.25) < 0.0001 && Math.abs(testCoefs.basicFee - 204.875) < 0.0001) {
  console.log("✅ 测试通过");
} else {
  console.error("❌ 测试失败!");
  process.exit(1);
}

// 测试用例 4: 前期决策可研报告计算 (计费额 1亿元)
// 依据规划费率表: 1-5亿区间，1亿对应可研报告为 28万
const testPlanning = calculatePlanningFee({
  cost: 10000, // 10000万元 = 1亿元
  reportType: 'feasibility_study',
  additionalCoefficients: [],
  discount: 100,
  taxRate: 6 // 含6%增值税
});

console.log("\n[测试用例 4] 1亿元可研报告编制(含6%增值税):");
console.log("预期基价: 28.00 万元");
console.log(`实际基价: ${testPlanning.basePrice} 万元`);
console.log("预期总价: 29.68 万元 (28.00 * 1.06)");
console.log(`实际总价: ${testPlanning.total} 万元`);
if (Math.abs(testPlanning.basePrice - 28.0) < 0.0001 && Math.abs(testPlanning.total - 29.68) < 0.01) {
  console.log("✅ 测试通过");
} else {
  console.error("❌ 测试失败!");
  process.exit(1);
}

const testBiddingZhejiang = calculateBiddingFee({
  cost: 5000,
  biddingType: 'eng',
  policy: 'zhejiang',
  serviceScope: 'documents_only',
  discount: 100,
  taxRate: 0
});
console.log("\n[测试用例 5] 浙江口径单独编制招标文件按 30% 计:");
console.log("预期代理费: 6.165 万元");
console.log(`实际代理费: ${testBiddingZhejiang.total} 万元`);
if (Math.abs(testBiddingZhejiang.total - 6.165) < 0.0001 && testBiddingZhejiang.serviceCoef === 0.3) {
  console.log("✅ 测试通过");
} else {
  console.error("❌ 测试失败!");
  process.exit(1);
}

const testBiddingGuangdongGov = calculateBiddingFee({
  cost: 5000,
  biddingType: 'eng',
  policy: 'guangdong_gov',
  serviceScope: 'full',
  discount: 100,
  taxRate: 0
});
console.log("\n[测试用例 6] 广东政府集中采购按附件1费率计:");
console.log("预期代理费: 16.44 万元");
console.log(`实际代理费: ${testBiddingGuangdongGov.total} 万元`);
if (Math.abs(testBiddingGuangdongGov.total - 16.44) < 0.0001 && testBiddingGuangdongGov.policy === 'guangdong_gov') {
  console.log("✅ 测试通过");
} else {
  console.error("❌ 测试失败!");
  process.exit(1);
}

const testBiddingShanghai = calculateBiddingFee({
  cost: 5000,
  biddingType: 'eng',
  policy: 'shanghai',
  serviceScope: 'full',
  discount: 120,
  taxRate: 0
});
console.log("\n[测试用例 7] 上海口径收费比例限制为 110%:");
console.log("预期代理费: 22.605 万元");
console.log(`实际代理费: ${testBiddingShanghai.total} 万元`);
if (Math.abs(testBiddingShanghai.total - 22.605) < 0.0001 && testBiddingShanghai.discount === 110 && testBiddingShanghai.discountAdjusted) {
  console.log("✅ 测试通过");
} else {
  console.error("❌ 测试失败!");
  process.exit(1);
}

console.log("\n🎉 所有计算核心测试均已顺利通过！");
