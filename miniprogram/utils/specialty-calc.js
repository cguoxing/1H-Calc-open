/**
 * 专项设计取费计算器 (F4b)
 * 涵盖：室内设计(S1)、住宅装修(S2)、园林景观(S3)、私宅自建(S4)、
 *       导视标识(S5)、软装陈设(S6)、艺术照明(S7)、声学装修(S8)
 *
 * 设计基价来源：计价格[2002]10号《工程勘察设计收费标准》
 *   工程设计收费基价表（附表一），各专项统一沿用该基价表
 */

const { interpolate } = require('./interpolation.js');

// ==================== S1 室内装饰设计 ====================

/** 室内装饰设计基价表（万元）
 * 来源：计价格[2002]10号 工程设计收费基价表
 * 计费额单位为万元，基价为基本服务成本（不含附加系数） */
const interiorBaseCostTable = [
  { value: 200, price: 11.02 },
  { value: 500, price: 25.45 },
  { value: 1000, price: 47.30 },
  { value: 3000, price: 126.60 },
  { value: 5000, price: 200.00 },
  { value: 8000, price: 304.80 },
  { value: 10000, price: 355.00 },
  { value: 20000, price: 662.00 },
  { value: 40000, price: 1232.00 },
  { value: 60000, price: 1770.00 },
  { value: 80000, price: 2288.00 },
  { value: 100000, price: 2800.00 },
  { value: 200000, price: 4960.00 },
  { value: 400000, price: 9240.00 },
  { value: 600000, price: 13260.00 },
  { value: 800000, price: 17120.00 },
  { value: 1000000, price: 19900.00 },
  { value: 2000000, price: 37000.00 },
  { value: Infinity, price: null } // 超限按 1.85% 计算
];

/** 室内装饰面积指标法单价（元/m²）
 * 来源：计价格[2002]10号 工程设计收费基价表 */
const interiorAreaRates = {
  hotel:    { low: 200, high: 500 },
  retail:   { low: 150, high: 350 },
  office:   { low: 200, high: 400 },
  museum:   { low: 150, high: 450 },
  culture:  { low: 100, high: 280 },
  dining:   { low: 500, high: 800 },
  leisure:  { low: 500, high: 800 },
  transit:  { low: 50,  high: 100 },
  medical:  { low: 100, high: 180 },
  residential: { low: 300, high: 1000 },
  club:     { low: 500, high: 1000 },
  industrial: { low: 100, high: 150 }
};

/** 室内装饰附加调整系数
 * 来源：计价格[2002]10号 工程勘察设计收费标准 */
const interiorAddCoefs = {
  interior_base: 1.5,     // 室内装修设计基础系数
  acoustics_2002: 2.0,    // 特殊声学装修(2002)
  acoustics_2024: 2.5,    // 特殊声学装修(2024)
  mep_secondary: 1.3,     // 机电设备二次深化
  furniture_art: 1.25,    // 家具/陈设艺术
  lighting_art: 1.3,      // 建筑环境艺术照明
  signage: 1.1,           // 建筑标识系统
  renovation_light: 1.2,  // 既有建筑改造(轻)
  renovation_heavy: 1.5   // 既有建筑改造(重)
};

/**
 * S1 室内装饰设计 - 工程费法
 */
function calcInteriorByCost(params) {
  const { cost, complexity = 'II', additionalCoefs = [], discount = 100, taxRate = 0 } = params;
  
  // 内插法求基本服务成本
  let basePrice;
  if (cost <= 200) {
    basePrice = interiorBaseCostTable[0].price; // 最低200万
  } else if (cost > 2000000) {
    basePrice = cost * 0.0185; // >200亿 按1.85%
  } else {
    const interpolationRes = interpolate(cost, interiorBaseCostTable, 0);
    basePrice = interpolationRes.price;
  }

  // 复杂程度系数
  const complexityMap = { I: 0.85, II: 1.0, III: 1.15 };
  const complexityCoef = complexityMap[complexity] || 1.0;

  const specialtyCoef = params.specialtyCoef !== undefined ? parseFloat(params.specialtyCoef) : 1.0;
  const baseDecoCoef = params.baseDecoCoef !== undefined ? parseFloat(params.baseDecoCoef) : 1.0;

  // 附加调整系数与可叠加的其它服务系数乘积
  let otherServiceCoef = 1.0;
  if (additionalCoefs.length > 0) {
    otherServiceCoef = additionalCoefs.reduce((acc, c) => acc * c, 1.0);
    otherServiceCoef = parseFloat(otherServiceCoef.toFixed(4));
  }
  const netAddCoef = parseFloat((baseDecoCoef * otherServiceCoef).toFixed(4));

  const basicFee = basePrice * specialtyCoef * complexityCoef * netAddCoef;
  const discountedTotal = basicFee * (discount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    method: '工程费法',
    cost: parseFloat(cost.toFixed(2)),
    basePrice: parseFloat(basePrice.toFixed(4)),
    specialtyCoef,
    specialtyName: '室内装饰工程设计',
    complexityCoef,
    baseDecoCoef,
    otherServiceCoef,
    netAddCoef,
    basicFee: parseFloat(basicFee.toFixed(4)),
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(total.toFixed(4))
  };
}

/**
 * S1 室内装饰设计 - 面积指标法
 */
function calcInteriorByArea(params) {
  const { area, category, complexity = 'II', designerPremium = false, discount = 100, taxRate = 0 } = params;
  
  const rates = interiorAreaRates[category];
  if (!rates) throw new Error(`未知的项目类别: ${category}`);
  
  const defaultUnitPrice = rates.low !== undefined ? (rates.low + rates.high) / 2 : (rates[complexity] || rates['II']);
  const unitPrice = params.unitPrice !== undefined ? parseFloat(params.unitPrice) : defaultUnitPrice;
  const designerCoef = designerPremium ? 1.2 : 1.0;
  
  const basicFee = area * unitPrice * designerCoef / 10000; // 元→万元
  const discountedTotal = basicFee * (discount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    method: '面积指标法',
    area: parseFloat(area.toFixed(2)),
    unitPrice,
    designerPremium,
    designerCoef,
    basicFee: parseFloat(basicFee.toFixed(4)),
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(total.toFixed(4))
  };
}

// ==================== S2 住宅装修设计 ====================

/** 住宅装修面积指标法单价（元/m²）
 * 来源：计价格[2002]10号 工程设计收费基价表 */
const residenceRates = { I: 128, II: 383, III: 980 };

/**
 * S2 住宅装修设计 - 面积指标法
 */
function calcResidenceDecoByArea(params) {
  const { area, complexity = 'II', discount = 100, taxRate = 0 } = params;
  
  const unitPrice = residenceRates[complexity] || residenceRates['II'];
  const basicFee = area * unitPrice / 10000; // 元→万元
  const discountedTotal = basicFee * (discount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    method: '面积指标法',
    area: parseFloat(area.toFixed(2)),
    unitPrice,
    basicFee: parseFloat(basicFee.toFixed(4)),
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(total.toFixed(4))
  };
}

/**
 * S2 住宅装修设计 - 工程费法（复用S1室内装饰工程费法）
 */
function calcResidenceDecoByCost(params) {
  return calcInteriorByCost({ ...params, complexity: params.complexity || 'II' });
}

/**
 * S2 自建住宅设计+装修综合取费
 */
function calcSelfBuildResidence(params) {
  const { area, designRate = 80, decoComplexity = 'II', combo = false, discount = 100, taxRate = 0 } = params;
  
  // 建筑设计费
  const designFee = area * designRate / 10000;
  // 装修设计费
  const decoRate = residenceRates[decoComplexity] || residenceRates['II'];
  const decoFee = area * decoRate / 10000;
  
  const comboCoef = combo ? 0.875 : 1.0; // 一体化优惠85~90%，取87.5%
  const basicFee = (designFee + decoFee) * comboCoef;
  const discountedTotal = basicFee * (discount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    method: '自建住宅设计+装修',
    area: parseFloat(area.toFixed(2)),
    designRate,
    designFee: parseFloat(designFee.toFixed(4)),
    decoRate,
    decoFee: parseFloat(decoFee.toFixed(4)),
    comboCoef,
    basicFee: parseFloat(basicFee.toFixed(4)),
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(total.toFixed(4))
  };
}

// ==================== S3 园林和景观设计 ====================

/** 园林景观基本服务成本表（工程费法，2024版广东省导则） */
const landscapeBaseCostTable = [
  { value: 200, price: 9.90 },
  { value: 500, price: 22.85 },
  { value: 1000, price: 42.40 },
  { value: 3000, price: 113.40 },
  { value: 5000, price: 179.50 },
  { value: 8000, price: 273.60 },
  { value: 10000, price: 319.00 },
  { value: 20000, price: 594.00 },
  { value: 40000, price: 1104.00 },
  { value: 60000, price: 1590.00 },
  { value: 80000, price: 2048.00 },
  { value: 100000, price: 2510.00 },
  { value: 200000, price: 4440.00 },
  { value: 400000, price: 8280.00 },
  { value: 600000, price: 11880.00 },
  { value: 800000, price: 15360.00 },
  { value: 1000000, price: 17800.00 },
  { value: 2000000, price: 33200.00 },
  { value: Infinity, price: null } // >200亿 按1.66%
];

/** 景观面积指标法参考单价（元/m²）
 * 来源：计价格[2002]10号 工程设计收费基价表 */
const landscapeAreaRates = {
  residential: { I: [15, 25], II: [25, 50], III: [50, 100] },
  public_bldg: { I: [20, 35], II: [35, 60], III: [60, 120] },
  park:       { I: [15, 30], II: [30, 55], III: [55, 110] },
  roadside:   { I: [8, 15],  II: [15, 30], III: [30, 60] },
  courtyard:  { I: [30, 60], II: [60, 100], III: [100, 200] }
};

/** 景观附加调整系数
 * 来源：计价格[2002]10号 工程勘察设计收费标准 */
const landscapeAddCoefs = {
  heritage: [1.3, 1.6],      // 古建筑/保护性建筑
  roof_garden: [1.2, 1.5],   // 屋顶花园/室内花园
  golf: 1.5,                 // 高尔夫球场
  wetland: 1.3,              // 湿地公园/生态修复
  night_light: 1.3           // 夜景照明
};

/**
 * S3 园林景观设计 - 工程费法
 */
function calcLandscapeByCost(params) {
  const { cost, complexity = 'II', additionalCoefs = [], discount = 100, taxRate = 0 } = params;
  
  let basePrice;
  if (cost <= 200) {
    basePrice = landscapeBaseCostTable[0].price;
  } else if (cost > 2000000) {
    basePrice = cost * 0.0166;
  } else {
    const interpolationRes = interpolate(cost, landscapeBaseCostTable, 0);
    basePrice = interpolationRes.price;
  }

  // 园林绿化专业系数默认1.1
  const specialtyCoef = params.specialtyCoef !== undefined ? parseFloat(params.specialtyCoef) : 1.1;
  const complexityMap = { I: 0.85, II: 1.0, III: 1.15 };
  const complexityCoef = complexityMap[complexity] || 1.0;
  const baseLandscapeCoef = params.baseLandscapeCoef !== undefined ? parseFloat(params.baseLandscapeCoef) : 1.0;

  let otherServiceCoef = 1.0;
  if (additionalCoefs.length > 0) {
    otherServiceCoef = additionalCoefs.reduce((acc, c) => acc * c, 1.0);
    otherServiceCoef = parseFloat(otherServiceCoef.toFixed(4));
  }
  const netAddCoef = parseFloat((baseLandscapeCoef * otherServiceCoef).toFixed(4));

  const basicFee = basePrice * specialtyCoef * complexityCoef * netAddCoef;
  const discountedTotal = basicFee * (discount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    method: '工程费法',
    cost: parseFloat(cost.toFixed(2)),
    basePrice: parseFloat(basePrice.toFixed(4)),
    specialtyCoef,
    specialtyName: '园林绿化工程',
    complexityCoef,
    baseLandscapeCoef,
    otherServiceCoef,
    netAddCoef,
    basicFee: parseFloat(basicFee.toFixed(4)),
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(total.toFixed(4))
  };
}

/**
 * S3 园林景观设计 - 面积指标法
 */
function calcLandscapeByArea(params) {
  const { area, landscapeType = 'residential', complexity = 'II', discount = 100, taxRate = 0 } = params;
  
  const range = landscapeAreaRates[landscapeType];
  if (!range) throw new Error(`未知的景观类型: ${landscapeType}`);
  
  const [low, high] = range[complexity] || range['II'];
  const unitPrice = params.unitPrice !== undefined ? parseFloat(params.unitPrice) : ((low + high) / 2); // 取中值
  
  const basicFee = area * unitPrice / 10000; // 元→万元
  const discountedTotal = basicFee * (discount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    method: '面积指标法',
    area: parseFloat(area.toFixed(2)),
    unitPrice: parseFloat(unitPrice.toFixed(2)),
    basicFee: parseFloat(basicFee.toFixed(4)),
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(total.toFixed(4))
  };
}

// ==================== S4 私宅自建 ====================

/** 自建住宅设计费率（元/m²）
 * 来源：计价格[2002]10号 工程设计收费基价表 */
const selfBuildDesignRates = [
  { limit: 200, rate: [50, 150], decoRate: [80, 300] },
  { limit: 500, rate: [40, 120], decoRate: [70, 250] },
  { limit: 1000, rate: [30, 100], decoRate: [60, 200] },
  { limit: Infinity, rate: [25, 80], decoRate: [50, 180] }
];

/**
 * S4 自建住宅设计取费
 */
function calcSelfBuildDesign(params) {
  const { area, complexity = 'II', includeDeco = false, includeLandscape = false, discount = 100, taxRate = 0 } = params;
  
  // 查找费率区间
  let rateRange, decoRange;
  for (const bracket of selfBuildDesignRates) {
    if (area <= bracket.limit) {
      rateRange = bracket.rate;
      decoRange = bracket.decoRate;
      break;
    }
  }
  
  const complexityIdx = { I: 0, II: 0.5, III: 1 };
  const idx = complexityIdx[complexity] || 0.5;
  
  const designRate = params.designUnitPrice !== undefined ? parseFloat(params.designUnitPrice) : (rateRange[0] + (rateRange[1] - rateRange[0]) * idx);
  let basicFee = area * designRate / 10000;
  
  let decoFee = 0;
  let decoDesignRate = 0;
  if (includeDeco) {
    decoDesignRate = params.decoUnitPrice !== undefined ? parseFloat(params.decoUnitPrice) : (decoRange[0] + (decoRange[1] - decoRange[0]) * idx);
    decoFee = area * decoDesignRate / 10000;
    basicFee += decoFee;
  }

  let landscapeFee = 0;
  let landscapeDesignRate = 0;
  if (includeLandscape) {
    landscapeDesignRate = params.landscapeUnitPrice !== undefined ? parseFloat(params.landscapeUnitPrice) : (40 + (120 - 40) * idx);
    landscapeFee = area * landscapeDesignRate / 10000;
    basicFee += landscapeFee;
  }
  
  const discountedTotal = basicFee * (discount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    method: '自建住宅设计',
    area: parseFloat(area.toFixed(2)),
    designRate: parseFloat(designRate.toFixed(2)),
    decoDesignRate: parseFloat(decoDesignRate.toFixed(2)),
    landscapeDesignRate: parseFloat(landscapeDesignRate.toFixed(2)),
    basicFee: parseFloat(basicFee.toFixed(4)),
    decoFee: parseFloat(decoFee.toFixed(4)),
    landscapeFee: parseFloat(landscapeFee.toFixed(4)),
    includeDeco,
    includeLandscape,
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(total.toFixed(4))
  };
}

// ==================== S5 导视标识系统设计及制作 ====================

/** 标识设计费按总投资百分比
 * 来源：计价格[2002]10号 工程设计收费基价表 */
const signageDesignRates = [
  { limit: 100, rate: [0.08, 0.12] },
  { limit: 500, rate: [0.05, 0.08] },
  { limit: 2000, rate: [0.03, 0.05] },
  { limit: Infinity, rate: [0.02, 0.03] }
];

/** 标识制作安装费参考 */
const signageProductionRates = {
  door_plate:    { low: 50,  high: 200,  unit: '元/块' },
  indoor_small:  { low: 200, high: 800,  unit: '元/块' },
  indoor_medium: { low: 800, high: 3000, unit: '元/块' },
  floor_index:   { low: 500, high: 2000, unit: '元/块' },
  outdoor:       { low: 1000, high: 5000, unit: '元/块' },
  monument:      { low: 10000, high: 100000, unit: '元/座' },
  road_sign:     { low: 500, high: 3000, unit: '元/块' },
  parking:       { low: 3000, high: 15000, unit: '元/套' },
  scenic:        { low: 800, high: 5000, unit: '元/块' },
  led:           { low: 5000, high: 50000, unit: '元/套' },
  letter:        { low: 300, high: 1500, unit: '元/字' }
};

/**
 * S5 导视标识系统设计 - 按总投资百分比
 */
function calcSignageByInvestment(params) {
  const { cost, discount = 100, taxRate = 0 } = params;
  
  let rateRange;
  for (const bracket of signageDesignRates) {
    if (cost <= bracket.limit) {
      rateRange = bracket.rate;
      break;
    }
  }
  
  const rate = (rateRange[0] + rateRange[1]) / 2;
  const basicFee = cost * rate;
  const discountedTotal = basicFee * (discount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    method: '按总投资百分比',
    cost: parseFloat(cost.toFixed(2)),
    rate: parseFloat((rate * 100).toFixed(2)),
    basicFee: parseFloat(basicFee.toFixed(4)),
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(total.toFixed(4))
  };
}

/**
 * S5 导视标识系统设计 - 按面积指标
 */
function calcSignageByArea(params) {
  const { area, signageType = 'indoor', discount = 100, taxRate = 0 } = params;
  
  const rates = {
    indoor: [3, 15],
    outdoor_campus: [0.5, 3]
  };
  
  const range = rates[signageType] || rates['indoor'];
  const unitPrice = params.unitPrice !== undefined ? parseFloat(params.unitPrice) : ((range[0] + range[1]) / 2);
  
  const basicFee = area * unitPrice / 10000;
  const discountedTotal = basicFee * (discount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    method: '按面积指标',
    area: parseFloat(area.toFixed(2)),
    unitPrice: parseFloat(unitPrice.toFixed(2)),
    basicFee: parseFloat(basicFee.toFixed(4)),
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(total.toFixed(4))
  };
}

/**
 * S5 导视标识制作安装费 - 实物量清单法
 */
function calcSignageProduction(params) {
  const { items = [], installRate = 20, discount = 100, taxRate = 0 } = params;
  
  let productionFee = 0;
  const details = [];
  
  for (const item of items) {
    const rates = signageProductionRates[item.type];
    if (!rates && item.unitPrice === undefined) continue;
    const unitPrice = item.unitPrice !== undefined ? parseFloat(item.unitPrice) : (rates.low + rates.high) / 2;
    const fee = unitPrice * item.qty;
    productionFee += fee;
    details.push({
      name: item.name || item.type,
      unitPrice: parseFloat(unitPrice.toFixed(2)),
      qty: item.qty,
      unit: item.unit || '项',
      fee: parseFloat(fee.toFixed(2))
    });
  }
  
  const productionInWan = productionFee / 10000;
  const installFee = productionInWan * (installRate / 100);
  const basicFee = productionInWan + installFee;
  
  const discountedTotal = basicFee * (discount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    method: '实物量清单法',
    productionFee: parseFloat(productionInWan.toFixed(4)),
    installFee: parseFloat(installFee.toFixed(4)),
    installRate,
    details,
    basicFee: parseFloat(basicFee.toFixed(4)),
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(total.toFixed(4))
  };
}

// ==================== S6 软装陈设艺术设计 ====================

/**
 * S6 软装陈设艺术设计
 * 来源：计价格[2002]10号 工程设计收费基价表
 */
function calcSoftFurnishing(params) {
  const { method = 'area', area = 0, budget = 0, days = 0, singleItems = [], discount = 100, taxRate = 0 } = params;
  
  let basicFee = 0;
  let detailMethod = '';
  let unitPrice = 0;
  
  if (method === 'area') {
    // 按套内面积 30~80 元/m²，取中值55
    unitPrice = params.unitPrice !== undefined ? parseFloat(params.unitPrice) : 55;
    basicFee = area * unitPrice / 10000;
    detailMethod = `面积法 ${unitPrice}元/m²`;
  } else if (method === 'budget') {
    // 按软装总预算 8%~15%，取中值11.5%
    basicFee = budget * 0.115;
    detailMethod = '按软装预算 11.5%';
  } else if (method === 'days') {
    // 按天数 2000~5000 元/天，取中值3500
    const dayUnitPrice = params.dayUnitPrice !== undefined ? parseFloat(params.dayUnitPrice) : 3500;
    unitPrice = dayUnitPrice;
    basicFee = days * dayUnitPrice / 10000;
    detailMethod = `按天数 ${dayUnitPrice}元/天`;
  } else if (method === 'items') {
    // 单品设计 500~5000 元/件，取中值2750
    basicFee = singleItems.length * 2750 / 10000;
    detailMethod = `单品设计 ${singleItems.length}件`;
  }
  
  const discountedTotal = basicFee * (discount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    method: '软装陈设',
    detailMethod,
    area: method === 'area' ? parseFloat(area.toFixed(2)) : undefined,
    unitPrice: method === 'area' || method === 'days' ? unitPrice : undefined,
    days: method === 'days' ? days : undefined,
    basicFee: parseFloat(basicFee.toFixed(4)),
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(total.toFixed(4))
  };
}

// ==================== S7 建筑环境艺术照明设计 ====================

/** 照明设计面积单价（元/m²）
 * 来源：计价格[2002]10号 工程设计收费基价表 */
const lightingAreaRates = {
  facade:    { low: 5,  high: 35,  unit: '元/m²', base: '建筑面积' },
  landscape: { low: 3,  high: 55,  unit: '元/m²', base: '景观面积' },
  interior:  { low: 5,  high: 200, unit: '元/m²', base: '室内面积' },
  city:      { low: 1,  high: 9,   unit: '元/m²', base: '区域面积', minFee: 10 }
};

/**
 * S7 建筑环境艺术照明设计
 */
function calcLighting(params) {
  const { method = 'area', area = 0, cost = 0, lightingType = 'facade', discount = 100, taxRate = 0 } = params;
  
  const rates = lightingAreaRates[lightingType];
  if (!rates) throw new Error(`未知的照明类型: ${lightingType}`);
  
  const unitPrice = params.unitPrice !== undefined ? parseFloat(params.unitPrice) : ((rates.low + rates.high) / 2);
  const rate = params.rate !== undefined ? parseFloat(params.rate) : 3;
  let basicFee = method === 'cost' ? cost * (rate / 100) : area * unitPrice / 10000;
  
  if (method === 'area' && rates.minFee && basicFee < rates.minFee) {
    basicFee = rates.minFee;
  }
  
  const discountedTotal = basicFee * (discount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    method: method === 'cost' ? '工程费法' : '面积指标法',
    cost: method === 'cost' ? parseFloat(cost.toFixed(2)) : undefined,
    rate: method === 'cost' ? parseFloat(rate.toFixed(2)) : undefined,
    area: method === 'area' ? parseFloat(area.toFixed(2)) : undefined,
    unitPrice: method === 'area' ? parseFloat(unitPrice.toFixed(2)) : undefined,
    lightingType,
    basicFee: parseFloat(basicFee.toFixed(4)),
    minFeeApplied: rates.minFee && (area * unitPrice / 10000 < rates.minFee),
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(total.toFixed(4))
  };
}

// ==================== S8 特殊声学装修设计 ====================

/** 声学装修费率
 * 来源：计价格[2002]10号 工程设计收费基价表 */
const acousticRates = {
  studio:     { low: 0.08, high: 0.15, unit: '工程费%' },
  concert:    { low: 0.10, high: 0.20, unit: '工程费%' },
  cinema:     { low: 0.06, high: 0.12, unit: '工程费%' },
  soundproof: { low: 20,   high: 50,   unit: '元/m²' }
};

/**
 * S8 特殊声学装修设计
 */
function calcAcoustic(params) {
  const { method = 'rate', cost = 0, area = 0, acousticType = 'studio', discount = 100, taxRate = 0 } = params;
  
  let basicFee = 0;
  let unitPrice = 0;
  
  if (method === 'rate') {
    const rates = acousticRates[acousticType];
    if (!rates || rates.unit !== '工程费%') throw new Error(`未知的声学类型: ${acousticType}`);
    const rate = (rates.low + rates.high) / 2;
    basicFee = cost * rate;
  } else if (method === 'area') {
    const rates = acousticRates['soundproof'];
    unitPrice = params.unitPrice !== undefined ? parseFloat(params.unitPrice) : ((rates.low + rates.high) / 2);
    basicFee = area * unitPrice / 10000;
  }
  
  const discountedTotal = basicFee * (discount / 100);
  const tax = discountedTotal * (taxRate / 100);
  const total = discountedTotal + tax;

  return {
    method: method === 'rate' ? '工程费法' : '面积法',
    area: method === 'area' ? parseFloat(area.toFixed(2)) : undefined,
    unitPrice: method === 'area' ? unitPrice : undefined,
    basicFee: parseFloat(basicFee.toFixed(4)),
    discount,
    discountedTotal: parseFloat(discountedTotal.toFixed(4)),
    taxRate,
    tax: parseFloat(tax.toFixed(4)),
    total: parseFloat(total.toFixed(4))
  };
}

module.exports = {
  // S1 室内装饰
  calcInteriorByCost,
  calcInteriorByArea,
  interiorBaseCostTable,
  interiorAreaRates,
  interiorAddCoefs,
  // S2 住宅装修
  calcResidenceDecoByArea,
  calcResidenceDecoByCost,
  calcSelfBuildResidence,
  // S3 园林景观
  calcLandscapeByCost,
  calcLandscapeByArea,
  landscapeAddCoefs,
  landscapeAreaRates,
  // S4 住宅设计
  calcSelfBuildDesign,
  selfBuildDesignRates,
  // S5 导视标识
  calcSignageByInvestment,
  calcSignageByArea,
  calcSignageProduction,
  // S6 软装陈设
  calcSoftFurnishing,
  // S7 艺术照明
  calcLighting,
  lightingAreaRates,
  // S8 声学装修
  calcAcoustic,
  acousticRates
};
