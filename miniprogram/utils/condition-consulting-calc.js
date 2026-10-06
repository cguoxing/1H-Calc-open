/**
 * condition-consulting-calc.js — 建设条件单项咨询取费计算器
 *
 * 各咨询类型统一采用按投资额分档内插法：
 * 费用 = 分档区间内的线性内插值
 *
 * @module condition-consulting-calc
 */

const {
  CONSULT_TYPES,
  ENV_ASSESSMENT_TABLE,
  ENV_INDUSTRY_COEF,
  ENV_SENSITIVE_COEF,
  ENERGY_ASSESSMENT_TABLE,
  WATER_SOIL_TABLE,
  FLOOD_IMPACT_TABLE,
  WATER_RESOURCE_FEES,
  WATER_RESOURCE_INDUSTRY_COEF,
  calcStabilityFee,
  RELIC_ASSESSMENT_TABLE,
  TREE_PROTECTION_FEES,
  PPP_CONSULT_TABLE,
  POST_EVAL_TABLE
} = require('../data/condition-consulting.js');

/**
 * 通用分档内插
 * @param {number} investment - 投资额（亿元）
 * @param {Array} table - 分档表 [{limit, fee: [min, max]}]
 * @param {number} rate - 费率偏向（0=最低, 1=最高, 0.5=中值）
 */
function interpolateByTier(investment, table, rate = 0.5) {
  if (investment <= 0) return { fee: 0, tier: '', formula: '' };

  for (let i = 0; i < table.length; i++) {
    const tier = table[i];
    if (investment <= tier.limit || tier.limit === Infinity) {
      const prevLimit = i > 0 ? table[i - 1].limit : 0;
      const feeMin = tier.fee ? tier.fee[0] : (tier.reportBook ? tier.reportBook[0] : 0);
      const feeMax = tier.fee ? tier.fee[1] : (tier.reportBook ? tier.reportBook[1] : 0);
      const prevFeeMin = i > 0 ? ((table[i - 1].fee ? table[i - 1].fee[0] : 0) || 0) : 0;
      const prevFeeMax = i > 0 ? ((table[i - 1].fee ? table[i - 1].fee[1] : 0) || 0) : 0;

      // 线性内插
      const rangeSize = tier.limit === Infinity ? prevLimit : tier.limit - prevLimit;
      const posInRange = investment - prevLimit;
      const ratio = rangeSize > 0 ? posInRange / rangeSize : 0;

      const minVal = prevFeeMin + (feeMin - prevFeeMin) * ratio;
      const maxVal = prevFeeMax + (feeMax - prevFeeMax) * ratio;
      const fee = minVal + (maxVal - minVal) * rate;

      return {
        fee: round2(fee),
        tier: `≤${tier.limit === Infinity ? '∞' : tier.limit}亿`,
        rangeLow: round2(minVal),
        rangeHigh: round2(maxVal),
        formula: `${round2(minVal)} ~ ${round2(maxVal)} 万元（取${rate === 0.5 ? '中值' : (rate < 0.5 ? '低值' : '高值')}）`
      };
    }
  }
  return { fee: 0, tier: '', formula: '' };
}

/**
 * 计算环评费用
 */
function calculateEnvAssessment(params) {
  const { investment, subType = 'env_report_book', industry = 'general', sensitiveType = 'type2', rate = 0.5 } = params;
  const invBill = investment / 10000; // 万元 → 亿元

  let result;
  switch (subType) {
    case 'env_report_book':
      result = interpolateByTier(invBill, ENV_ASSESSMENT_TABLE.map(t => ({ ...t, fee: t.reportBook })), rate);
      break;
    case 'env_report_table':
      result = interpolateByTier(invBill, ENV_ASSESSMENT_TABLE.map(t => ({ ...t, fee: t.reportTable })), rate);
      break;
    case 'env_assess_book':
      result = interpolateByTier(invBill, ENV_ASSESSMENT_TABLE.map(t => ({ ...t, fee: t.assessBook })), rate);
      break;
    case 'env_assess_table':
      result = interpolateByTier(invBill, ENV_ASSESSMENT_TABLE.map(t => ({ ...t, fee: t.assessTable })), rate);
      break;
    default:
      result = { fee: 0, formula: '' };
  }

  const industryCoef = (ENV_INDUSTRY_COEF[industry] || ENV_INDUSTRY_COEF.general).coef;
  const sensitiveCoef = (ENV_SENSITIVE_COEF[sensitiveType] || ENV_SENSITIVE_COEF.type2).coef;
  const totalFee = result.fee * industryCoef * sensitiveCoef;

  return {
    type: 'env_assessment',
    typeName: '环境影响评价',
    subType,
    subTypeName: CONSULT_TYPES.env_assessment.subTypes.find(s => s.id === subType)?.name || '',
    investment: investment,
    investmentBill: invBill,
    baseFee: result.fee,
    industryCoef,
    industryName: ENV_INDUSTRY_COEF[industry]?.name || '一般项目',
    sensitiveCoef,
    sensitiveName: ENV_SENSITIVE_COEF[sensitiveType]?.name || '',
    totalFee: round2(totalFee),
    formula: result.formula,
    tier: result.tier
  };
}

/**
 * 计算节能评估费用
 */
function calculateEnergyAssessment(params) {
  const { investment, subType = 'energy_report', rate = 0.5 } = params;
  const invBill = investment / 10000;

  let result;
  switch (subType) {
    case 'energy_report':
      result = interpolateByTier(invBill, ENERGY_ASSESSMENT_TABLE.map(t => ({ ...t, fee: t.reportBook })), rate);
      break;
    case 'energy_table':
      result = interpolateByTier(invBill, ENERGY_ASSESSMENT_TABLE.map(t => ({ ...t, fee: t.reportTable })), rate);
      break;
    case 'energy_registration':
      result = interpolateByTier(invBill, ENERGY_ASSESSMENT_TABLE.map(t => ({ ...t, fee: t.registration })), rate);
      break;
    default:
      result = { fee: 0, formula: '' };
  }

  return {
    type: 'energy_assessment',
    typeName: '节能评估',
    subType,
    subTypeName: CONSULT_TYPES.energy_assessment.subTypes.find(s => s.id === subType)?.name || '',
    investment,
    totalFee: result.fee,
    formula: result.formula,
    tier: result.tier
  };
}

/**
 * 计算水土保持方案费用
 */
function calculateWaterSoil(params) {
  const { investment, subType = 'ws_report_book', rate = 0.5 } = params;
  const invBill = investment / 10000;

  let result;
  if (subType === 'ws_report_book') {
    result = interpolateByTier(invBill, WATER_SOIL_TABLE.map(t => ({ ...t, fee: t.reportBook })), rate);
  } else {
    result = interpolateByTier(invBill, WATER_SOIL_TABLE.map(t => ({ ...t, fee: t.reportTable })), rate);
  }

  return {
    type: 'water_soil',
    typeName: '水土保持方案',
    subType,
    subTypeName: CONSULT_TYPES.water_soil.subTypes.find(s => s.id === subType)?.name || '',
    investment,
    totalFee: result.fee,
    formula: result.formula,
    tier: result.tier
  };
}

/**
 * 计算防洪影响评价费用
 */
function calculateFloodImpact(params) {
  const { investment, rate = 0.5 } = params;
  const invBill = investment / 10000;
  const result = interpolateByTier(invBill, FLOOD_IMPACT_TABLE, rate);

  return {
    type: 'flood_impact',
    typeName: '防洪影响评价',
    investment,
    totalFee: result.fee,
    formula: result.formula,
    tier: result.tier
  };
}

/**
 * 计算水资源论证费用
 */
function calculateWaterResource(params) {
  const { waterVolume = 0, subType = 'surface_water', industry = 'general', rate = 0.5 } = params;
  const table = WATER_RESOURCE_FEES[subType] || WATER_RESOURCE_FEES.surface_water;
  const result = interpolateByTier(waterVolume, table, rate);
  const industryCoef = (WATER_RESOURCE_INDUSTRY_COEF[industry] || WATER_RESOURCE_INDUSTRY_COEF.general).coef;
  const totalFee = result.fee * industryCoef;

  return {
    type: 'water_resource',
    typeName: '水资源论证',
    subType,
    subTypeName: subType === 'surface_water' ? '地表水取水论证' : '地下水取水论证',
    waterVolume,
    baseFee: result.fee,
    industryCoef,
    industryName: WATER_RESOURCE_INDUSTRY_COEF[industry]?.name || '一般工业',
    totalFee: round2(totalFee),
    formula: result.formula
  };
}

/**
 * 计算社会稳定风险费用
 */
function calculateSocialStability(params) {
  const { investment, subType = 'stability_analysis' } = params;
  const invBill = investment / 10000;
  const fee = calcStabilityFee(invBill, subType === 'stability_analysis' ? 'analysis' : 'assessment');

  return {
    type: 'social_stability',
    typeName: '社会稳定风险',
    subType,
    subTypeName: subType === 'stability_analysis' ? '社会稳定风险分析' : '社会稳定风险评估',
    investment,
    totalFee: round2(fee),
    formula: `累进计算：投资额 ${invBill.toFixed(2)} 亿元 → ${round2(fee)} 万元`
  };
}

/**
 * 计算文物影响评估费用
 */
function calculateCulturalRelic(params) {
  const { investment, subType = 'relic_assess', rate = 0.5 } = params;
  const invBill = investment / 10000;
  let result;

  if (subType === 'relic_survey') {
    // 考古调查：按面积 1~3万元/km²
    const area = params.area || 1;
    const fee = area * 2;
    result = { fee: round2(fee), formula: `${area} km² × 2 万元/km² = ${round2(fee)} 万元`, tier: '' };
  } else if (subType === 'relic_explore') {
    // 考古勘探：按面积 3~8万元/km²
    const area = params.area || 1;
    const fee = area * 5.5;
    result = { fee: round2(fee), formula: `${area} km² × 5.5 万元/km² = ${round2(fee)} 万元`, tier: '' };
  } else {
    result = interpolateByTier(invBill, RELIC_ASSESSMENT_TABLE, rate);
  }

  return {
    type: 'cultural_relic',
    typeName: '文物影响评估',
    subType,
    subTypeName: CONSULT_TYPES.cultural_relic.subTypes.find(s => s.id === subType)?.name || '',
    investment,
    totalFee: result.fee,
    formula: result.formula,
    tier: result.tier
  };
}

/**
 * 计算树木保护专章费用
 */
function calculateTreeProtection(params) {
  const { treeCount = 0, subType = 'tree_survey' } = params;
  const config = TREE_PROTECTION_FEES[subType];
  if (!config) return { error: '未知类型' };

  let fee = treeCount * config.feePerUnit;
  if (fee < config.minFee) fee = config.minFee;

  return {
    type: 'tree_protection',
    typeName: '树木保护专章',
    subType,
    subTypeName: config.desc,
    treeCount,
    totalFee: round2(fee),
    formula: `${treeCount} 株 × ${config.feePerUnit} 万元/株 = ${round2(fee)} 万元（最低 ${config.minFee} 万）`
  };
}

/**
 * 计算PPP咨询费用
 */
function calculatePPP(params) {
  const { investment, subType = 'ppp_plan', rate = 0.5 } = params;
  const invBill = investment / 10000;

  let fieldMap = { ppp_plan: 'plan', ppp_value: 'value', ppp_finance: 'finance', ppp_contract: 'contract' };
  let field = fieldMap[subType] || 'plan';

  const result = interpolateByTier(invBill, PPP_CONSULT_TABLE.map(t => ({ ...t, fee: t[field] })), rate);

  return {
    type: 'ppp_consult',
    typeName: 'PPP项目咨询',
    subType,
    subTypeName: CONSULT_TYPES.ppp_consult.subTypes.find(s => s.id === subType)?.name || '',
    investment,
    totalFee: result.fee,
    formula: result.formula,
    tier: result.tier
  };
}

/**
 * 计算项目后评价费用
 */
function calculatePostEvaluation(params) {
  const { investment, rate = 0.5 } = params;
  const invBill = investment / 10000;
  const result = interpolateByTier(invBill, POST_EVAL_TABLE, rate);

  return {
    type: 'post_evaluation',
    typeName: '项目后评价',
    investment,
    totalFee: result.fee,
    formula: result.formula,
    tier: result.tier
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

module.exports = {
  calculateEnvAssessment,
  calculateEnergyAssessment,
  calculateWaterSoil,
  calculateFloodImpact,
  calculateWaterResource,
  calculateSocialStability,
  calculateCulturalRelic,
  calculateTreeProtection,
  calculatePPP,
  calculatePostEvaluation,
  CONSULT_TYPES,
  ENV_INDUSTRY_COEF,
  ENV_SENSITIVE_COEF,
  WATER_RESOURCE_INDUSTRY_COEF
};
