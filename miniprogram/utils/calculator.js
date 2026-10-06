const { basePriceTable, overLimitRatio } = require('../data/base-price.js');
const { professionalCoefficients, complexityCoefficients } = require('../data/coefficients.js');
const { planningFees } = require('../data/planning-fees.js');
const { interpolate } = require('./interpolation.js');

const { surveyBasePrices, surveyComplexityCoefficients, surveySiteCoefficients } = require('../data/survey-fees.js');
const { f2OverallFees, f2RegulatoryFees, f2ConstructiveFees } = require('../data/planning-fees-f2.js');
const { costBrackets } = require('../data/cost-fees.js');

function toCoefValue(coef) {
  if (typeof coef === 'object' && coef !== null) {
    return parseFloat(coef.coef ?? coef.value ?? 1);
  }
  return parseFloat(coef);
}

const biddingBrackets = {
  eng: [
    { limit: 100, rate: 0.0100 },
    { limit: 500, rate: 0.0070 },
    { limit: 1000, rate: 0.0055 },
    { limit: 5000, rate: 0.0035 },
    { limit: 10000, rate: 0.0020 },
    { limit: 50000, rate: 0.0005 },
    { limit: 100000, rate: 0.00035 },
    { limit: 500000, rate: 0.00008 },
    { limit: 1000000, rate: 0.00006 },
    { limit: Infinity, rate: 0.00004 }
  ],
  goods: [
    { limit: 100, rate: 0.0150 },
    { limit: 500, rate: 0.0110 },
    { limit: 1000, rate: 0.0080 },
    { limit: 5000, rate: 0.0050 },
    { limit: 10000, rate: 0.0025 },
    { limit: 50000, rate: 0.0005 },
    { limit: 100000, rate: 0.00035 },
    { limit: 500000, rate: 0.00008 },
    { limit: 1000000, rate: 0.00006 },
    { limit: Infinity, rate: 0.00004 }
  ],
  service: [
    { limit: 100, rate: 0.0150 },
    { limit: 500, rate: 0.0080 },
    { limit: 1000, rate: 0.0045 },
    { limit: 5000, rate: 0.0025 },
    { limit: 10000, rate: 0.0010 },
    { limit: 50000, rate: 0.0005 },
    { limit: 100000, rate: 0.00035 },
    { limit: 500000, rate: 0.00008 },
    { limit: 1000000, rate: 0.00006 },
    { limit: Infinity, rate: 0.00004 }
  ]
};

const biddingBracketsGuangdongGov = {
  eng: biddingBrackets.eng.map(item => ({ limit: item.limit, rate: item.rate * 0.8 })),
  goods: biddingBrackets.goods.map(item => ({ limit: item.limit, rate: item.rate * 0.8 })),
  service: biddingBrackets.service.map(item => ({ limit: item.limit, rate: item.rate * 0.8 }))
};

const NATIONAL_BIDDING_SOURCE = '计价格[2002]1980号、发改办价格[2011]534号';

const biddingPolicies = {
  national: {
    name: '国家标准',
    source: NATIONAL_BIDDING_SOURCE,
    limits: { eng: 450.0, goods: 350.0, service: 300.0 },
    serviceFactors: {
      full: { name: '全过程代理', coef: 1 },
      documents_only: { name: '仅编制招标文件', coef: 1 }
    }
  },
  guangdong_other: {
    name: '广东其他项目',
    source: `${NATIONAL_BIDDING_SOURCE} + 粤价函[2013]1233号附件2`,
    limits: { eng: 450.0, goods: 350.0, service: 300.0 },
    serviceFactors: {
      full: { name: '全过程代理', coef: 1 },
      documents_only: { name: '仅编制招标文件', coef: 1 }
    }
  },
  guangdong_gov: {
    name: '广东政府集中采购',
    source: `${NATIONAL_BIDDING_SOURCE} + 粤价函[2013]1233号附件1`,
    brackets: biddingBracketsGuangdongGov,
    limits: { eng: 360.0, goods: 280.0, service: 240.0 },
    serviceFactors: {
      full: { name: '全过程代理', coef: 1 },
      documents_only: { name: '仅编制招标文件', coef: 1 }
    }
  },
  shanghai: {
    name: '上海口径',
    source: `${NATIONAL_BIDDING_SOURCE} + 沪建计联[2005]834号、沪价费[2005]056号`,
    limits: { eng: 450.0, goods: 350.0, service: 300.0 },
    minDiscount: 90,
    maxDiscount: 110,
    serviceFactors: {
      full: { name: '全过程代理', coef: 1 },
      documents_only: { name: '仅编制招标文件', coef: 1 }
    }
  },
  zhejiang: {
    name: '浙江口径',
    source: `${NATIONAL_BIDDING_SOURCE} + 浙价服[2003]77号`,
    limits: { eng: 450.0, goods: 350.0, service: 300.0 },
    serviceFactors: {
      full: { name: '全过程代理', coef: 1 },
      documents_only: { name: '单独编制招标文件', coef: 0.3 }
    }
  }
};

function getBiddingPolicy(policy) {
  return biddingPolicies[policy] || biddingPolicies.national;
}

/**
 * 计算工程设计收费
 * 
 * @param {Object} params 
 * @param {number} params.cost - 计费额 (万元)
 * @param {string} params.specialty - 专业类别 (如 'building')
 * @param {string} params.complexity - 复杂程度 ('I', 'II', 'III')
 * @param {Array<number>} [params.additionalCoefficients=[]] - 附加调整系数列表
 * @param {number} [params.discount=100] - 浮动幅度/折扣百分比 (如 90 表示打九折, 120 表示上浮20%)
 * @param {number} [params.stageRatio=100] - 阶段工作量比例百分比 (100 表示全阶段, 45 表示初步设计)
 * @param {Object} [params.extraServices] - 额外设计服务
 * @param {boolean} [params.extraServices.budget=false] - 施工图预算编制费 (+10% 基本设计收费)
 * @param {boolean} [params.extraServices.asbuilt=false] - 竣工图编制费 (+8% 基本设计收费)
 * @param {boolean} [params.extraServices.overall=false] - 总体设计费 (+5% 基本设计收费)
 * @param {boolean} [params.extraServices.coordination=false] - 主体设计协调费 (+5% 基本设计收费)
 * @param {number} [params.extraServices.nonStdDevBase=0] - 非标准设备设计计费额 (万元)
 * @param {number} [params.extraServices.nonStdDevRate=0] - 非标准设备设计费率 (如 5 表示 5%)
 * @param {number} [params.taxRate=0] - 税率百分比 (如 6 表示 6% 增值税, 0 表示不计算税费)
 * @returns {Object} 包含详细计算结果与明细的对象
 */
function calculateDesignFee(params) {
  const {
    cost,
    specialty,
    complexity,
    additionalCoefficients = [],
    discount = 100,
    stageRatio = 100,
    extraServices = {},
    taxRate = 0
  } = params;

  // 1. 直线内插求收费基价
  const interpolationRes = interpolate(cost, basePriceTable, overLimitRatio);
  const basePrice = interpolationRes.price;

  // 2. 获取各项系数
  const specialtyCoef = params.specialtyCoef !== undefined ? parseFloat(params.specialtyCoef) : (professionalCoefficients[specialty] || 1.0);
  const complexityCoef = complexityCoefficients[complexity] || 1.0;

  // 3. 计算合并后的附加调整系数 (公式: Σ各附加调整系数 - 附加调整系数个数 + 1)
  let netAdditionalCoef = 1.0;
  if (additionalCoefficients.length > 0) {
    const sum = additionalCoefficients.reduce((acc, c) => acc + toCoefValue(c), 0);
    netAdditionalCoef = sum - additionalCoefficients.length + 1;
    netAdditionalCoef = parseFloat(netAdditionalCoef.toFixed(4));
  }

  // 4. 计算基本设计收费 (公式: 收费基价 * 专业系数 * 复杂程度系数 * 附加调整系数)
  const basicFeeNoStage = basePrice * specialtyCoef * complexityCoef * netAdditionalCoef;
  
  // 5. 应用设计阶段工作量比例
  const basicFee = basicFeeNoStage * (stageRatio / 100);

  // 6. 计算其他收费项 (以基本设计收费为基数)
  const extraDetails = [];
  let extraSum = 0;

  if (extraServices.budget) {
    const fee = basicFee * 0.10;
    extraSum += fee;
    extraDetails.push({ name: '施工图预算编制费', ratio: '10%', amount: parseFloat(fee.toFixed(4)) });
  }
  if (extraServices.asbuilt) {
    const fee = basicFee * 0.08;
    extraSum += fee;
    extraDetails.push({ name: '竣工图编制费', ratio: '8%', amount: parseFloat(fee.toFixed(4)) });
  }
  if (extraServices.overall) {
    const fee = basicFee * 0.05;
    extraSum += fee;
    extraDetails.push({ name: '总体设计费', ratio: '5%', amount: parseFloat(fee.toFixed(4)) });
  }
  if (extraServices.coordination) {
    const fee = basicFee * 0.05;
    extraSum += fee;
    extraDetails.push({ name: '主体设计协调费', ratio: '5%', amount: parseFloat(fee.toFixed(4)) });
  }
  // 非标准设备设计费 = 设备计费额 * 费率
  if (extraServices.nonStdDevBase > 0 && extraServices.nonStdDevRate > 0) {
    const fee = extraServices.nonStdDevBase * (extraServices.nonStdDevRate / 100);
    extraSum += fee;
    extraDetails.push({ 
      name: `非标准设备设计费`, 
      ratio: `${extraServices.nonStdDevRate}%`, 
      amount: parseFloat(fee.toFixed(4)),
      desc: `计费额 ${extraServices.nonStdDevBase} 万元`
    });
  }

  // 7. 收费基准价 = 基本设计收费 + 其他收费
  const feeBaseTotal = basicFee + extraSum;

  // 8. 应用浮动幅度/折扣
  const discountedTotal = feeBaseTotal * (discount / 100);
  const discountAmount = feeBaseTotal - discountedTotal;

  // 9. 计算增值税
  const tax = discountedTotal * (taxRate / 100);
  const finalTotal = discountedTotal + tax;

  return {
    cost: parseFloat(cost.toFixed(2)),
    basePrice: parseFloat(basePrice.toFixed(4)),
    specialtyCoef,
    complexityCoef,
    additionalCoefs: additionalCoefficients,
    netAdditionalCoef,
    basicFeeNoStage: parseFloat(basicFeeNoStage.toFixed(4)),
    stageRatio,
    basicFee: parseFloat(basicFee.toFixed(4)),
    extraDetails,
    extraSum: parseFloat(extraSum.toFixed(4)),
    feeBaseTotal: parseFloat(feeBaseTotal.toFixed(4)),
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    discountAmount: parseFloat(discountAmount.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(finalTotal.toFixed(4)),
    interpolationDetail: interpolationRes
  };
}

/**
 * 计算前期投资决策工作咨询服务收费
 * 
 * @param {Object} params
 * @param {number} params.cost - 估算投资额 (万元)
 * @param {string} params.reportType - 报告类型 (如 'project_proposal')
 * @param {Array<number>} [params.additionalCoefficients=[]] - 附加系数列表
 * @param {number} [params.discount=100] - 浮动幅度百分比
 * @param {number} [params.taxRate=0] - 税率百分比
 * @returns {Object}
 */
function calculatePlanningFee(params) {
  const {
    cost,
    reportType,
    additionalCoefficients = [],
    discount = 100,
    taxRate = 0
  } = params;

  const table = planningFees[reportType];
  if (!table) {
    throw new Error(`未知的报告类型: ${reportType}`);
  }

  // 1. 内插法求收费基价
  const interpolationRes = interpolate(cost, table, 0); // 前期暂无超额上限，返回基价
  const basePrice = interpolationRes.price;

  // 2. 附加调整系数
  let netAdditionalCoef = 1.0;
  if (additionalCoefficients.length > 0) {
    netAdditionalCoef = additionalCoefficients.reduce((acc, c) => acc * toCoefValue(c), 1.0);
    netAdditionalCoef = parseFloat(netAdditionalCoef.toFixed(4));
  }

  // 3. 计算基本费用
  const basicFee = basePrice * netAdditionalCoef;

  // 4. 折扣
  const discountedTotal = basicFee * (discount / 100);

  // 5. 增值税
  const tax = discountedTotal * (taxRate / 100);
  const finalTotal = discountedTotal + tax;

  return {
    cost: parseFloat(cost.toFixed(2)),
    basePrice: parseFloat(basePrice.toFixed(4)),
    netAdditionalCoef,
    basicFee: parseFloat(basicFee.toFixed(4)),
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(finalTotal.toFixed(4)),
    interpolationDetail: interpolationRes
  };
}

/**
 * 辅助函数：差额定率分档累进计算
 */
function calculateProgressiveFee(amount, brackets, unitType = 'percent') {
  let remaining = amount;
  let totalFee = 0;
  let lastLimit = 0;
  const diffBreakdown = [];

  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const currentLimit = bracket.limit;
    const rate = bracket.rate;
    const range = currentLimit - lastLimit;

    if (remaining <= 0) break;

    const chargeAmount = Math.min(remaining, range);
    const fee = chargeAmount * rate;
    totalFee += fee;

    let rateText = '';
    if (unitType === 'permil') {
      rateText = parseFloat((rate * 1000).toFixed(5)).toString() + '‰';
    } else {
      rateText = parseFloat((rate * 100).toFixed(5)).toString() + '%';
    }

    let rangeText = '';
    if (currentLimit === Infinity) {
      rangeText = `${lastLimit}以上`;
    } else {
      rangeText = `${lastLimit}-${currentLimit}`;
    }

    diffBreakdown.push({
      range: rangeText,
      base: parseFloat(chargeAmount.toFixed(4)),
      rateText,
      charge: parseFloat(fee.toFixed(4))
    });

    remaining -= chargeAmount;
    lastLimit = currentLimit;
  }

  return { totalFee, diffBreakdown };
}

/**
 * 计算工程勘察取费 (F3)
 */
function calculateSurveyFee(params) {
  const {
    cost,
    surveyType,
    complexity,
    siteComplexity,
    additionalCoefficients = [],
    discount = 100,
    taxRate = 0
  } = params;

  const table = surveyBasePrices[surveyType];
  if (!table) {
    throw new Error(`未知的勘察类型: ${surveyType}`);
  }

  // 1. 直线内插求收费基价
  const interpolationRes = interpolate(cost, table, 0); // 暂不考虑超额系数，返回插值基价
  const basePrice = interpolationRes.price;

  // 2. 获取各项系数
  const complexityCoef = surveyComplexityCoefficients[complexity] || 1.0;
  const siteComplexityCoef = surveySiteCoefficients[siteComplexity] || 1.0;

  // 3. 附加调整系数组合（相乘）
  let netAdditionalCoef = 1.0;
  if (additionalCoefficients.length > 0) {
    netAdditionalCoef = additionalCoefficients.reduce((acc, c) => acc * toCoefValue(c), 1.0);
    netAdditionalCoef = parseFloat(netAdditionalCoef.toFixed(4));
  }

  // 4. 基本勘察费 = 基价 * 复杂程度系数 * 场地复杂程度系数 * 附加调整系数
  const basicFee = basePrice * complexityCoef * siteComplexityCoef * netAdditionalCoef;

  // 5. 折扣与税率
  const discountedTotal = basicFee * (discount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    cost: parseFloat(cost.toFixed(2)),
    basePrice: parseFloat(basePrice.toFixed(4)),
    complexityCoef,
    siteComplexityCoef,
    netAdditionalCoef,
    basicFee: parseFloat(basicFee.toFixed(4)),
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(total.toFixed(4)),
    interpolationDetail: interpolationRes
  };
}

/**
 * 计算国土空间规划取费 (F2)
 */
function calculatePlanningF2Fee(params) {
  const {
    cost,
    planningType,
    constructiveType = 'residential',
    constructiveScheme = 'general',
    constructiveVertical = false,
    regulatoryType = 'general_zone',
    regulatoryExtra = false,
    regulatoryLevel = 'one_level',
    regulatoryAmendment = false,
    overallPopulation = 50,
    overallApproval = 'province',
    overallType = 'normal',
    discount = 100,
    taxRate = 0
  } = params;

  let basePrice = 0;
  let minFeeApplied = false;

  if (planningType === 'overall') {
    // 总体国土空间规划
    const scale = f2OverallFees.scales.find(s => overallPopulation <= s.limit) || f2OverallFees.scales[f2OverallFees.scales.length - 1];
    const rate = scale.rate; // 万元/km²
    basePrice = cost * rate; // 基价

    // 审批调整系数
    let approvalCoef = 1.0;
    if (overallApproval === 'council') {
      approvalCoef = 1.3;
    } else if (overallApproval === 'province') {
      approvalCoef = 1.1;
    }

    // 规划类型系数
    let typeRatio = 1.0;
    if (overallType === 'recent') {
      typeRatio = 0.4;
    } else if (overallType === 'assessment') {
      typeRatio = 0.3;
    }

    let basicFee = basePrice * approvalCoef * typeRatio;
    if (basicFee < f2OverallFees.minFee) {
      basicFee = f2OverallFees.minFee;
      minFeeApplied = true;
    }
    basePrice = basicFee;

  } else if (planningType === 'regulatory') {
    // 控制性详细规划
    const item = f2RegulatoryFees[regulatoryType];
    if (!item) {
      throw new Error(`未知的控规地段类型: ${regulatoryType}`);
    }
    const rate = item.base + (regulatoryExtra ? item.extra : 0); // 元/万m²
    basePrice = (cost * rate) / 10000; // 转换为万元

    // 控规修改论证
    let basicFee = basePrice;
    if (regulatoryAmendment) {
      basicFee = basicFee * 0.5;
    }

    // 保底
    const minFee = regulatoryLevel === 'two_levels' ? 35.0 : 30.0;
    if (basicFee < minFee) {
      basicFee = minFee;
      minFeeApplied = true;
    }
    basePrice = basicFee;

  } else if (planningType === 'constructive') {
    // 修建性详细规划
    const scale = f2ConstructiveFees.scales.find(s => cost <= s.limit) || f2ConstructiveFees.scales[f2ConstructiveFees.scales.length - 1];
    const rate = constructiveType === 'residential' ? scale.residential : scale.public; // 元/万m²
    basePrice = (cost * rate) / 10000; // 转换为万元

    let basicFee = basePrice;
    if (constructiveVertical) {
      basicFee = basicFee * 1.3;
    }

    // 保底
    const minFee = f2ConstructiveFees.minFee;
    if (basicFee < minFee) {
      basicFee = minFee;
      minFeeApplied = true;
    }
    basePrice = basicFee;
  } else {
    throw new Error(`未知的规划类型: ${planningType}`);
  }

  // 最终计费
  const basicFee = basePrice;
  const discountedTotal = basicFee * (discount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    cost: parseFloat(cost.toFixed(2)),
    planningType,
    basicFee: parseFloat(basicFee.toFixed(4)),
    minFeeApplied,
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(total.toFixed(4))
  };
}

/**
 * 计算造价咨询费 (F5)
 */
function calculateCostFee(params) {
  const {
    cost,
    costType,
    deduction = 0,
    steelWeight = 0,
    discount = 100,
    taxRate = 0
  } = params;

  let basePrice = 0;
  let diffBreakdown = [];

  if (costType === 'settlement_audit') {
    // 粤价函[2011]742号：2.8‰ 基本费率 + 5% 核减效益费率
    const basicFee = cost * 0.0028;
    const benefitFee = deduction * 0.05;
    basePrice = basicFee + benefitFee;
    diffBreakdown = [
      { range: '基本审核费(2.8‰)', base: cost, rateText: '2.8‰', charge: parseFloat(basicFee.toFixed(4)) },
      { range: '核减效益费(5%)', base: deduction, rateText: '5%', charge: parseFloat(benefitFee.toFixed(4)) }
    ];
  } else if (costType === 'steel_calc') {
    // 12.0 元/吨
    basePrice = (steelWeight * 12.0) / 10000;
    diffBreakdown = [
      { range: '钢筋计算(12元/吨)', base: steelWeight, rateText: '12元/吨', charge: parseFloat(basePrice.toFixed(4)) }
    ];
  } else {
    // 累进费率
    const brackets = costBrackets[costType];
    if (!brackets) {
      throw new Error(`未知的造价咨询类型: ${costType}`);
    }
    const res = calculateProgressiveFee(cost, brackets, 'permil');
    basePrice = res.totalFee;
    diffBreakdown = res.diffBreakdown;
  }

  const basicFee = basePrice;
  const discountedTotal = basicFee * (discount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    cost: parseFloat(cost.toFixed(2)),
    basePrice: parseFloat(basePrice.toFixed(4)),
    basicFee: parseFloat(basicFee.toFixed(4)),
    diffBreakdown,
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(total.toFixed(4))
  };
}

/**
 * 计算招标代理服务费
 */
function calculateBiddingFee(params) {
  const {
    cost,
    biddingType,
    policy = 'national',
    serviceScope = 'full',
    discount = 100,
    taxRate = 0
  } = params;

  const policyConfig = getBiddingPolicy(policy);
  const policyBrackets = policyConfig.brackets || biddingBrackets;
  const brackets = policyBrackets[biddingType];
  if (!brackets) {
    throw new Error(`未知的招标代理类型: ${biddingType}`);
  }

  const serviceFactor = (policyConfig.serviceFactors && policyConfig.serviceFactors[serviceScope]) || policyConfig.serviceFactors.full;
  let effectiveDiscount = Number(discount);
  let discountAdjusted = false;
  if (policyConfig.minDiscount !== undefined && effectiveDiscount < policyConfig.minDiscount) {
    effectiveDiscount = policyConfig.minDiscount;
    discountAdjusted = true;
  }
  if (policyConfig.maxDiscount !== undefined && effectiveDiscount > policyConfig.maxDiscount) {
    effectiveDiscount = policyConfig.maxDiscount;
    discountAdjusted = true;
  }

  // 1. 差额累进计费
  const res = calculateProgressiveFee(cost, brackets, 'percent');
  let basePrice = res.totalFee;

  // 2. 限制上限
  const maxLimit = policyConfig.limits[biddingType];
  let isCapped = false;
  if (basePrice > maxLimit) {
    basePrice = maxLimit;
    isCapped = true;
  }
  const policyBasePrice = basePrice;
  basePrice = basePrice * serviceFactor.coef;

  const biddingTypeNames = {
    eng: '工程招标',
    goods: '货物招标',
    service: '服务招标'
  };

  // 3. 折扣与税率
  const discountedTotal = basePrice * (effectiveDiscount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    cost: parseFloat(cost.toFixed(2)),
    basePrice: parseFloat(basePrice.toFixed(4)),
    policyBasePrice: parseFloat(policyBasePrice.toFixed(4)),
    isCapped,
    biddingTypeName: biddingTypeNames[biddingType] || '工程招标',
    policy,
    policyName: policyConfig.name,
    policySource: policyConfig.source,
    serviceScope,
    serviceScopeName: serviceFactor.name,
    serviceCoef: serviceFactor.coef,
    diffBreakdown: res.diffBreakdown,
    discount: effectiveDiscount,
    originalDiscount: discount,
    discountAdjusted,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(total.toFixed(4))
  };
}

/**
 * 监理费基价表（发改价格[2007]670号）
 * 计费额 万 → 基价 万
 */
const supervisionBasePrices = [
  { value: 500, price: 16.5 },
  { value: 1000, price: 30.1 },
  { value: 3000, price: 78.1 },
  { value: 5000, price: 120.8 },
  { value: 8000, price: 181.0 },
  { value: 10000, price: 218.6 },
  { value: 20000, price: 393.4 },
  { value: 40000, price: 708.2 },
  { value: 60000, price: 991.4 },
  { value: 80000, price: 1255.8 },
  { value: 100000, price: 1507.0 },
  { value: 200000, price: 2712.5 },
  { value: 400000, price: 4882.6 },
  { value: 600000, price: 6835.6 },
  { value: 800000, price: 8658.4 },
  { value: 1000000, price: 10390.1 }
];
const supervisionOverLimitRatio = 0.01039; // 1.039% for >100亿

const supervisionProfessionCoefs = {
  building: 1.0,
  municipal: 1.0,
  highway: 0.9,
  waterway: 1.1,
  metro: 1.1,
  water: 1.2,
  electric: 1.2
};

const supervisionElevationCoefs = [
  { limit: 2000, coef: 1.0, label: '≤2000m (1.0)' },
  { limit: 3000, coef: 1.1, label: '2001~3000m (1.1)' },
  { limit: 3500, coef: 1.2, label: '3001~3500m (1.2)' },
  { limit: 4000, coef: 1.3, label: '3501~4000m (1.3)' },
  { limit: Infinity, coef: 1.4, label: '>4000m (1.4)' }
];

/**
 * 计算工程监理服务费（发改价格[2007]670号）
 */
function calculateSupervisionFee(params) {
  const {
    cost,
    professionType = 'building',
    elevationIndex = 0,
    discount = 100,
    taxRate = 0
  } = params;

  // 1. 直线内插求基价
  const interpRes = interpolate(cost, supervisionBasePrices, supervisionOverLimitRatio);
  const basePrice = interpRes.price;

  // 2. 专业调整系数
  const professionCoef = supervisionProfessionCoefs[professionType] || 1.0;

  // 3. 高程调整系数
  const elevationCoef = supervisionElevationCoefs[elevationIndex]?.coef || 1.0;

  // 4. 监理服务费 = 基价 x 专业系数 x 高程系数
  const feeBeforeDiscount = basePrice * professionCoef * elevationCoef;

  // 5. 折扣
  const discountedTotal = feeBeforeDiscount * (discount / 100);
  const discountAmount = feeBeforeDiscount - discountedTotal;

  // 6. 增值税
  const tax = discountedTotal * (taxRate / 100);
  const finalTotal = discountedTotal + tax;

  return {
    cost: parseFloat(cost.toFixed(2)),
    basePrice: parseFloat(basePrice.toFixed(4)),
    professionCoef,
    elevationCoef,
    elevationLabel: supervisionElevationCoefs[elevationIndex]?.label || '≤2000m (1.0)',
    feeBeforeDiscount: parseFloat(feeBeforeDiscount.toFixed(4)),
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    discountAmount: parseFloat(discountAmount.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(finalTotal.toFixed(4)),
    interpolationDetail: interpRes
  };
}

/**
 * 建设单位管理费率表（财建[2016]504号）
 */
const constructionMgmtBrackets = [
  { limit: 1000, rate: 0.020 },
  { limit: 5000, rate: 0.015 },
  { limit: 10000, rate: 0.012 },
  { limit: 50000, rate: 0.010 },
  { limit: 100000, rate: 0.008 },
  { limit: 200000, rate: 0.005 },
  { limit: Infinity, rate: 0.002 }
];

/**
 * 计算建设单位管理费/代建费（财建[2016]504号）
 */
function calculateConstructionManagementFee(params) {
  const {
    cost,
    agentCoef = 1.0,  // 代建系数 0.8~1.0
    discount = 100,
    taxRate = 0
  } = params;

  // 1. 差额定率累进计费
  const progressiveRes = calculateProgressiveFee(cost, constructionMgmtBrackets, 'percent');
  const managementFee = progressiveRes.totalFee;

  // 2. 代建管理费 = 管理费 x 代建系数
  const feeBeforeDiscount = managementFee * agentCoef;

  // 3. 折扣
  const discountedTotal = feeBeforeDiscount * (discount / 100);
  const discountAmount = feeBeforeDiscount - discountedTotal;

  // 4. 增值税
  const tax = discountedTotal * (taxRate / 100);
  const finalTotal = discountedTotal + tax;

  return {
    cost: parseFloat(cost.toFixed(2)),
    managementFee: parseFloat(managementFee.toFixed(4)),
    agentCoef,
    feeBeforeDiscount: parseFloat(feeBeforeDiscount.toFixed(4)),
    diffBreakdown: progressiveRes.diffBreakdown,
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    discountAmount: parseFloat(discountAmount.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(finalTotal.toFixed(4))
  };
}

module.exports = {
  calculateDesignFee,
  calculatePlanningFee,
  calculateSurveyFee,
  calculatePlanningF2Fee,
  calculateCostFee,
  calculateBiddingFee,
  calculateSupervisionFee,
  calculateConstructionManagementFee
};
