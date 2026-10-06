const { calculateSurveyFee, calculateCostFee, calculatePlanningF2Fee, calculateBiddingFee, calculatePlanningFee } = require('./miniprogram/utils/calculator.js');

console.log('=== 开始测试 易计算 Phase 2 扩充计算引擎 ===\n');

// ================= F3 勘察测试 =================
console.log('[测试 F3: 工程勘察]');
try {
  // 1000万元工程费，基本勘察服务，中等复杂(1.0)，中等场地(1.0)，市政系数(1.3)
  const resF3 = calculateSurveyFee({
    cost: 1000,
    surveyType: 'survey',
    complexity: 'II',
    siteComplexity: 'II',
    additionalCoefficients: [1.3]
  });
  console.log(`计费额: ${resF3.cost} 万元`);
  console.log(`基价: ${resF3.basePrice} 万元 (预期: 31.4)`);
  console.log(`实际基本勘察费: ${resF3.basicFee} 万元 (预期: 40.82)`);
  if (Math.abs(resF3.basicFee - 40.82) < 0.0001) {
    console.log('✅ F3 基础计算测试通过\n');
  } else {
    console.log('❌ F3 基础计算测试失败\n');
  }
} catch (e) {
  console.error('❌ F3 测试运行出错:', e);
}

// ================= F5 造价累进测试 =================
console.log('[测试 F5: 造价咨询 (累进费率)]');
try {
  // 1500万投资额，估算编制/审核 (estimate)
  // 100万 * 1.3‰ = 0.13
  // 400万 * 1.1‰ = 0.44
  // 500万 * 0.9‰ = 0.45
  // 500万 * 0.7‰ = 0.35
  // 预期基本费: 1.37 万元
  const resF5 = calculateCostFee({
    cost: 1500,
    costType: 'estimate'
  });
  console.log(`计费额: ${resF5.cost} 万元`);
  console.log(`实际基本造价费: ${resF5.basicFee} 万元 (预期: 1.37)`);
  console.log('累进明细:', JSON.stringify(resF5.diffBreakdown));
  if (Math.abs(resF5.basicFee - 1.37) < 0.0001) {
    console.log('✅ F5 累进计算测试通过\n');
  } else {
    console.log('❌ F5 累进计算测试失败\n');
  }
} catch (e) {
  console.error('❌ F5 测试运行出错:', e);
}

// ================= F2 规划测试 =================
console.log('[测试 F2: 国土空间规划 (修规/控规)]');
try {
  // 1. 修规居住区，4万m² (落在3-5区间，费率 22000元/万m²)
  // 基准 = 4 * 2.2 = 8.8万元. 竖向规划(x1.3) -> 11.44万元
  const resF2a = calculatePlanningF2Fee({
    cost: 4,
    planningType: 'constructive',
    constructiveType: 'residential',
    constructiveScheme: 'general',
    constructiveVertical: true
  });
  console.log(`修规面积: ${resF2a.cost} 万m²`);
  console.log(`实际基本服务费: ${resF2a.basicFee} 万元 (预期: 11.44)`);
  
  // 2. 修规居住区保底，2万m² (落在<3区间，费率 26000)
  // 基准 = 2 * 2.6 = 5.2万元. 保底10万
  const resF2b = calculatePlanningF2Fee({
    cost: 2,
    planningType: 'constructive',
    constructiveType: 'residential',
    constructiveScheme: 'general',
    constructiveVertical: false
  });
  console.log(`修规保底面积: ${resF2b.cost} 万m²`);
  console.log(`实际基本服务费 (保底后): ${resF2b.basicFee} 万元 (预期: 10.0, 保底触发: ${resF2b.minFeeApplied})`);

  if (Math.abs(resF2a.basicFee - 11.44) < 0.0001 && Math.abs(resF2b.basicFee - 10.0) < 0.0001) {
    console.log('✅ F2 规划计算测试通过\n');
  } else {
    console.log('❌ F2 规划计算测试失败\n');
  }
} catch (e) {
  console.error('❌ F2 测试运行出错:', e);
}

// ================= 新增 Bidding (招标代理) 与 F1 (前期评估) 测试 =================
console.log('[测试 Bidding: 招标代理 (累进费率)]');
try {
  // 5000万工程招标
  // 100万 * 1% = 1
  // 400万 * 0.7% = 2.8
  // 500万 * 0.55% = 2.75
  // 4000万 * 0.35% = 14
  // 预期基本费: 20.55 万元
  const resBidding = calculateBiddingFee({
    cost: 5000,
    biddingType: 'eng'
  });
  console.log(`中标金额: ${resBidding.cost} 万元`);
  console.log(`实际基本费: ${resBidding.basePrice} 万元 (预期: 20.55)`);
  if (Math.abs(resBidding.basePrice - 20.55) < 0.0001) {
    console.log('✅ Bidding 差额累进测试通过\n');
  } else {
    console.log('❌ Bidding 差额累进测试失败\n');
  }
} catch (e) {
  console.error('❌ Bidding 测试出错:', e);
}

console.log('[测试 F1: 前期评估收费]');
try {
  // 3000万投资额，评估可行性研究报告
  const resF1Eval = calculatePlanningFee({
    cost: 3000,
    reportType: 'feasibility_study_eval'
  });
  console.log(`投资额: ${resF1Eval.cost} 万元`);
  console.log(`评估基价: ${resF1Eval.basePrice} 万元 (预期: 8.0)`);
  if (Math.abs(resF1Eval.basePrice - 8.0) < 0.0001) {
    console.log('✅ F1 评估项目计算测试通过\n');
  } else {
    console.log('❌ F1 评估项目计算测试失败\n');
  }
} catch (e) {
  console.error('❌ F1 评估测试出错:', e);
}

console.log('=== 所有 Phase 2 算法测试校验结束 ===');
