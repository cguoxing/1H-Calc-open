/**
 * land-consolidation-calc.js — 全域土地综合整治取费计算器
 *
 * 计算模型：
 * 设计服务成本 = 项目勘测费 + 项目设计与预算编制费 + 其他专项费用
 *
 * 项目勘测费 = 工程施工费 × 勘测费率 × 地貌系数
 * 项目设计与预算编制费 = 工程施工费 × 设计费率 × 调整系数
 * 调整系数 = 地貌调整系数 × 乡镇数量系数 × 规模调整系数 × Π(附加系数)
 *
 * @module land-consolidation-calc
 */

const {
  CONSOLIDATION_TYPES,
  SURVEY_RATES,
  DESIGN_RATE_TABLE,
  TERRAIN_COEFFICIENTS,
  TOWNSHIP_COEFFICIENTS,
  SCALE_COEFFICIENTS,
  ADDITIONAL_COEFFICIENTS,
  SPECIAL_SERVICES,
  HIGH_STANDARD_FARMLAND_FEES
} = require('../data/land-consolidation.js');

/**
 * 计算全域土地综合整治设计服务成本
 *
 * @param {Object} params
 * @param {number} params.cost - 工程施工费（万元）
 * @param {string} params.type - 整治类型: 'farmland' | 'construction' | 'ecological' | 'landscape' | 'comprehensive'
 * @param {string} params.subType - 子类型 id
 * @param {string} params.terrain - 地貌: 'plain' | 'hill' | 'mountain'
 * @param {string} params.townshipCount - 乡镇数: 'single' | 'two' | 'multi'
 * @param {Array<string>} [params.additionals] - 附加系数 id 列表
 * @param {string} [params.complexity] - 复杂程度: 'simple' | 'medium' | 'complex' (影响费率高低)
 * @param {number} [params.discount=100] - 折扣比例 (%)
 * @param {number} [params.taxRate=0] - 增值税率 (%)
 * @returns {Object} 计算结果
 */
function calculateLandConsolidation(params) {
  const {
    cost = 0,
    type = 'farmland',
    subType = '',
    terrain = 'plain',
    townshipCount = 'single',
    additionals = [],
    complexity = 'medium',
    discount = 100,
    taxRate = 0
  } = params;

  // 1. 查找子类型费率
  let subTypeConfig = null;
  const typeConfig = CONSOLIDATION_TYPES[type];
  if (typeConfig && typeConfig.subTypes) {
    subTypeConfig = typeConfig.subTypes.find(s => s.id === subType);
  }
  if (!subTypeConfig) {
    subTypeConfig = { name: '综合整治', baseRate: 0.030, minRate: 0.025, maxRate: 0.040 };
  }

  // 2. 确定设计费率（根据复杂度取高低区间内的值）
  const rateRange = {
    simple: subTypeConfig.minRate,
    medium: subTypeConfig.baseRate,
    complex: subTypeConfig.maxRate
  };
  const designRate = rateRange[complexity] || subTypeConfig.baseRate;

  // 3. 项目勘测费
  const terrainCoef = (TERRAIN_COEFFICIENTS.find(t => t.id === terrain) || { coef: 1.0 }).coef;
  const surveyRate = getSurveyRate(subType, type);
  const surveyFee = cost * surveyRate * terrainCoef;

  // 4. 调整系数
  const townshipCoef = (TOWNSHIP_COEFFICIENTS.find(t => t.id === townshipCount) || { coef: 1.0 }).coef;
  const scaleCoef = getScaleCoefficient(cost);
  let additionalCoef = 1.0;
  const additionalDetails = [];

  additionals.forEach(addId => {
    const addConfig = ADDITIONAL_COEFFICIENTS.find(a => a.id === addId);
    if (addConfig) {
      additionalCoef *= addConfig.coef;
      additionalDetails.push({ name: addConfig.name, coef: addConfig.coef });
    }
  });

  const adjustmentCoef = terrainCoef * townshipCoef * scaleCoef * additionalCoef;

  // 5. 项目设计与预算编制费
  const designFee = cost * designRate * adjustmentCoef;

  // 6. 合计
  const subtotal = surveyFee + designFee;
  const discountedTotal = subtotal * (discount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    cost,
    type,
    subType: subTypeConfig.name,
    complexity,
    complexityLabel: { simple: '简单（平原/单一类型）', medium: '中等', complex: '复杂（山区/多类型综合）' }[complexity] || '中等',
    terrain,
    terrainName: (TERRAIN_COEFFICIENTS.find(t => t.id === terrain) || { name: '平原' }).name,
    terrainCoef,
    townshipCount,
    townshipCoef,
    surveyRate,
    surveyFee: round2(surveyFee),
    designRate,
    designFee: round2(designFee),
    scaleCoef,
    additionalCoef,
    additionalDetails,
    adjustmentCoef: round4(adjustmentCoef),
    subtotal: round2(subtotal),
    discount,
    taxRate,
    tax: round2(tax),
    total: round2(total),
    // 用于内插法公式展示
    interpolationDetail: {
      formula: `勘测费 ${round2(surveyFee)} + 设计费 ${round2(designFee)} = ${round2(subtotal)} 万元（调整系数 ${round4(adjustmentCoef)}）`,
      steps: buildSteps(cost, surveyRate, designRate, terrainCoef, townshipCoef, scaleCoef, additionalCoef, discount, taxRate)
    }
  };
}

/**
 * 计算高标准农田专项设计费
 */
function calculateHighStandardFarmland(params) {
  const { area = 0, subItems = [] } = params;
  let total = 0;
  const breakdown = [];

  subItems.forEach(item => {
    const config = HIGH_STANDARD_FARMLAND_FEES[item.id];
    if (config) {
      const feePerMu = (config.minFee + config.maxFee) / 2;
      const fee = area * feePerMu / 10000; // 元转万元
      total += fee;
      breakdown.push({
        name: config.name,
        feePerMu,
        fee: round2(fee)
      });
    }
  });

  return {
    area,
    breakdown,
    total: round2(total)
  };
}

/**
 * 计算专项服务取费
 */
function calculateSpecialService(serviceId, params) {
  const service = SPECIAL_SERVICES[serviceId];
  if (!service) return { error: '未知服务类型' };

  let fee = 0;
  const detail = {};

  switch (service.calcType) {
    case 'area':
      // 按乡镇面积
      const area = params.area || 5;
      if (area <= 5) {
        fee = service.basePrice;
      } else if (area <= 25) {
        fee = service.basePrice + (area - 5) * service.extraPerKm;
      } else {
        fee = service.maxStandard || (service.basePrice + 20 * service.extraPerKm);
      }
      detail.area = area;
      detail.unit = 'km²';
      break;

    case 'per_mu':
      fee = (params.area || 0) * ((service.rateMin + service.rateMax) / 2) / 10000;
      detail.area = params.area;
      detail.rate = (service.rateMin + service.rateMax) / 2;
      detail.unit = '元/亩';
      break;

    case 'per_mu_or_rate':
      if (params.calcMode === 'rate' && params.engineeringCost) {
        fee = params.engineeringCost * ((service.ratePercentMin + service.ratePercentMax) / 2);
        detail.mode = '工程费法';
        detail.engineeringCost = params.engineeringCost;
      } else {
        fee = (params.area || 0) * ((service.rateMin + service.rateMax) / 2) / 10000;
        detail.mode = '面积法';
        detail.area = params.area;
      }
      break;

    case 'range':
      fee = (service.minFee + service.maxFee) / 2;
      detail.range = service.minFee + '~' + service.maxFee + ' 万元';
      break;

    case 'per_village':
      fee = (params.villageCount || 1) * ((service.minFee + service.maxFee) / 2);
      detail.villageCount = params.villageCount || 1;
      break;

    case 'percent':
      fee = (params.investment || 0) * ((service.rateMin + service.rateMax) / 2);
      detail.investment = params.investment;
      detail.rate = ((service.rateMin + service.rateMax) / 2 * 100).toFixed(2) + '%';
      break;

    default:
      fee = 0;
  }

  return {
    serviceId,
    serviceName: service.name,
    fee: round2(fee),
    detail
  };
}

// ========== 辅助函数 ==========

function getSurveyRate(subType, type) {
  if (subType === 'mine_restore' || type === 'ecological') return SURVEY_RATES.mine_restore.rate;
  if (subType === 'water_system') return SURVEY_RATES.water_system.rate;
  if (subType === 'high_standard') return SURVEY_RATES.high_standard.rate;
  return SURVEY_RATES.land_dev.rate;
}

function getScaleCoefficient(cost) {
  for (let i = 0; i < SCALE_COEFFICIENTS.length; i++) {
    if (cost <= SCALE_COEFFICIENTS[i].limit) {
      return SCALE_COEFFICIENTS[i].coef;
    }
  }
  return 0.9;
}

function buildSteps(cost, surveyRate, designRate, terrainCoef, townshipCoef, scaleCoef, additionalCoef, discount, taxRate) {
  const steps = [];
  steps.push(`工程施工费：${cost.toFixed(2)} 万元`);
  steps.push(`勘测费：${cost.toFixed(2)} × ${(surveyRate * 100).toFixed(2)}% × ${terrainCoef}（地貌）= ${round2(cost * surveyRate * terrainCoef)} 万元`);
  steps.push(`设计费率：${(designRate * 100).toFixed(2)}%`);
  steps.push(`调整系数：${terrainCoef}（地貌）× ${townshipCoef}（乡镇）× ${scaleCoef}（规模）× ${additionalCoef.toFixed(2)}（附加）= ${round4(terrainCoef * townshipCoef * scaleCoef * additionalCoef)}`);
  if (discount < 100) steps.push(`折扣：${discount}%`);
  if (taxRate > 0) steps.push(`增值税：${taxRate}%`);
  return steps.join('\n');
}

function round2(n) { return Math.round(n * 100) / 100; }
function round4(n) { return Math.round(n * 10000) / 10000; }

module.exports = {
  calculateLandConsolidation,
  calculateHighStandardFarmland,
  calculateSpecialService,
  CONSOLIDATION_TYPES,
  TERRAIN_COEFFICIENTS,
  TOWNSHIP_COEFFICIENTS,
  ADDITIONAL_COEFFICIENTS,
  SPECIAL_SERVICES,
  HIGH_STANDARD_FARMLAND_FEES
};
