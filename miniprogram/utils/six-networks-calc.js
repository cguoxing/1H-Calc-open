/**
 * six-networks-calc.js — "六张网"工程设计取费计算器
 *
 * 各网统一采用工程费法：
 * 设计费 = 基价 × 专业调整系数 × 复杂程度系数 × 附加调整系数
 * 基价通过 2002版直线内插法从基价表查得
 *
 * @module six-networks-calc
 */

const { interpolate } = require('./interpolation.js');
const {
  NETWORKS,
  WATER_ENGINEERING,
  POWER_ENGINEERING,
  COMPUTE_ENGINEERING,
  TELECOM_ENGINEERING,
  PIPELINE_ENGINEERING,
  LOGISTICS_ENGINEERING
} = require('../data/six-networks.js');

// 2002版工程设计收费基价表（万元）
const BASE_PRICE_TABLE = [
  { value: 0, price: 0 },
  { value: 200, price: 9.0 },
  { value: 500, price: 20.9 },
  { value: 1000, price: 38.8 },
  { value: 3000, price: 103.8 },
  { value: 5000, price: 163.9 },
  { value: 8000, price: 249.6 },
  { value: 10000, price: 304.8 },
  { value: 20000, price: 566.8 },
  { value: 40000, price: 1054.0 },
  { value: 60000, price: 1515.2 },
  { value: 80000, price: 1960.1 },
  { value: 100000, price: 2393.4 },
  { value: 200000, price: 4450.8 },
  { value: 400000, price: 8276.7 },
  { value: 600000, price: 11897.5 },
  { value: 800000, price: 15391.4 },
  { value: 1000000, price: 18793.8 },
  { value: 2000000, price: 34948.9 }
];

/**
 * 通用六张网工程设计取费计算
 * @param {Object} params
 * @param {string} params.networkId - 网络ID: 'N1'~'N6'
 * @param {number} params.cost - 工程计费额（万元）
 * @param {string} params.subType - 子类型id
 * @param {string} params.complexity - 复杂程度: 'I'|'II'|'III'
 * @param {Array<string>} [params.additionals] - 附加调整项
 * @param {number} [params.discount=100] - 折扣
 * @param {number} [params.taxRate=0] - 税率
 * @returns {Object}
 */
function calculateSixNetworksFee(params) {
  const {
    networkId = 'N1',
    cost = 0,
    subType = '',
    complexity = 'II',
    additionals = [],
    discount = 100,
    taxRate = 0
  } = params;

  const network = NETWORKS[networkId];
  if (!network) return { error: '未知网络类型: ' + networkId };

  // 获取对应网络的工程类型配置
  let engConfig, typeInfo;
  switch (networkId) {
    case 'N1': engConfig = WATER_ENGINEERING; break;
    case 'N2': engConfig = POWER_ENGINEERING; break;
    case 'N3': engConfig = COMPUTE_ENGINEERING; break;
    case 'N4': engConfig = TELECOM_ENGINEERING; break;
    case 'N5': engConfig = PIPELINE_ENGINEERING; break;
    case 'N6': engConfig = LOGISTICS_ENGINEERING; break;
    default: return { error: '未知网络类型' };
  }

  typeInfo = engConfig.types.find(t => t.id === subType);
  if (!typeInfo) {
    typeInfo = engConfig.types[0] || { name: '综合', coef: 1.0 };
  }

  // 1. 基价内插
  const interpResult = interpolate(cost, BASE_PRICE_TABLE, 0.016);

  // 2. 专业调整系数
  const specialtyCoef = typeInfo.coef || 1.0;

  // 3. 复杂程度系数
  let complexityCoef = 1.0;
  let complexityName = 'II级';

  if (networkId === 'N2' && engConfig.transmissionComplexity) {
    const cInfo = engConfig.transmissionComplexity.find(c => c.id === complexity);
    if (cInfo) { complexityCoef = cInfo.coef; complexityName = cInfo.name; }
  } else if (networkId === 'N3' && engConfig.dcComplexity) {
    const cInfo = engConfig.dcComplexity.find(c => c.id === complexity);
    if (cInfo) { complexityCoef = cInfo.coef; complexityName = cInfo.name; }
  } else {
    const compMap = { I: 0.85, II: 1.0, III: 1.15 };
    complexityCoef = compMap[complexity] || 1.0;
    complexityName = { I: 'I级', II: 'II级', III: 'III级' }[complexity] || 'II级';
  }

  // 4. 附加调整系数
  let additionalCoef = 1.0;
  const additionalDetails = [];

  // 内置附加项
  if (typeInfo.safetyAdd) { additionalCoef *= typeInfo.safetyAdd; additionalDetails.push({ name: '安全附加', coef: typeInfo.safetyAdd }); }
  if (typeInfo.extraAdd) { additionalCoef *= typeInfo.extraAdd; additionalDetails.push({ name: '专项附加', coef: typeInfo.extraAdd }); }
  if (typeInfo.undergroundAdd) { additionalCoef *= typeInfo.undergroundAdd; additionalDetails.push({ name: '地下工程附加', coef: typeInfo.undergroundAdd }); }
  if (typeInfo.coldAdd) { additionalCoef *= typeInfo.coldAdd; additionalDetails.push({ name: '冷库附加', coef: typeInfo.coldAdd }); }
  if (typeInfo.emergencyAdd) { additionalCoef *= typeInfo.emergencyAdd; additionalDetails.push({ name: '平急两用附加', coef: typeInfo.emergencyAdd }); }

  // 用户选择的附加项
  additionals.forEach(addId => {
    if (networkId === 'N6' && engConfig.specialFactors) {
      const sf = engConfig.specialFactors.find(f => f.id === addId);
      if (sf) { additionalCoef *= sf.coef; additionalDetails.push({ name: sf.name, coef: sf.coef }); }
    }
  });

  // 5. 设计费
  const basePrice = interpResult.price;
  const designFee = basePrice * specialtyCoef * complexityCoef * additionalCoef;

  // 6. 合计
  const subtotal = designFee;
  const discountedTotal = subtotal * (discount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    networkId,
    networkName: network.name,
    cost,
    subType: typeInfo.name,
    subTypeDesc: typeInfo.desc || '',
    specialtyCoef,
    complexity,
    complexityName,
    complexityCoef,
    additionalCoef,
    additionalDetails,
    basePrice: round2(basePrice),
    designFee: round2(designFee),
    discount,
    taxRate,
    tax: round2(tax),
    total: round2(total),
    interpolationDetail: interpResult
  };
}

/**
 * 计算通信基站勘察费
 */
function calculateStationSurveyFee(params) {
  const { stationType = 'macro', count = 1 } = params;
  const stationInfo = TELECOM_ENGINEERING.stationSurveyFees.find(s => s.id === stationType);
  const feePerStation = stationInfo ? stationInfo.fee : 5500;
  return {
    stationType: stationInfo ? stationInfo.name : '未知',
    count,
    feePerStation,
    total: round2(count * feePerStation / 10000) // 元转万元
  };
}

/**
 * 计算管网规划设计费
 */
function calculatePipelinePlanningFee(params) {
  const { serviceId, quantity = 0 } = params;
  const service = PIPELINE_ENGINEERING.planningServices.find(s => s.id === serviceId);
  if (!service) return { error: '未知服务类型' };

  let fee = quantity * service.feePerUnit;
  if (service.minFee && fee < service.minFee) fee = service.minFee;

  return {
    serviceName: service.name,
    quantity,
    unit: service.unit,
    feePerUnit: service.feePerUnit,
    fee: round2(fee)
  };
}

/**
 * 计算管网检测评估费
 */
function calculatePipelineInspectionFee(params) {
  const { serviceId, quantity = 0 } = params;
  const service = PIPELINE_ENGINEERING.inspectionServices.find(s => s.id === serviceId);
  if (!service) return { error: '未知检测类型' };

  let fee = 0;
  if (service.minRate) {
    fee = quantity * ((service.minRate + service.maxRate) / 2);
  } else {
    fee = quantity * ((service.minFee + service.maxFee) / 2) / 10000; // 元转万元
  }

  return {
    serviceName: service.name,
    quantity,
    fee: round2(fee)
  };
}

/**
 * 获取网络下的所有工程类型
 */
function getNetworkTypes(networkId) {
  let engConfig;
  switch (networkId) {
    case 'N1': engConfig = WATER_ENGINEERING; break;
    case 'N2': engConfig = POWER_ENGINEERING; break;
    case 'N3': engConfig = COMPUTE_ENGINEERING; break;
    case 'N4': engConfig = TELECOM_ENGINEERING; break;
    case 'N5': engConfig = PIPELINE_ENGINEERING; break;
    case 'N6': engConfig = LOGISTICS_ENGINEERING; break;
    default: return [];
  }
  return engConfig.types || [];
}

/**
 * 获取网络的特殊服务列表
 */
function getNetworkSpecialServices(networkId) {
  let engConfig;
  switch (networkId) {
    case 'N1': engConfig = WATER_ENGINEERING; break;
    case 'N2': engConfig = POWER_ENGINEERING; break;
    case 'N3': engConfig = COMPUTE_ENGINEERING; break;
    case 'N4': engConfig = TELECOM_ENGINEERING; break;
    case 'N5': engConfig = PIPELINE_ENGINEERING; break;
    case 'N6': engConfig = LOGISTICS_ENGINEERING; break;
    default: return [];
  }
  return engConfig.specialServices || [];
}

function round2(n) { return Math.round(n * 100) / 100; }

module.exports = {
  calculateSixNetworksFee,
  calculateStationSurveyFee,
  calculatePipelinePlanningFee,
  calculatePipelineInspectionFee,
  getNetworkTypes,
  getNetworkSpecialServices,
  NETWORKS,
  BASE_PRICE_TABLE
};
