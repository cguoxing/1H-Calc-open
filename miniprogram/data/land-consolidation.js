/**
 * land-consolidation.js — 全域土地综合整治取费数据
 * 依据：自然资源部《全域土地综合整治实施指南（2024版）》
 *      财政部国土资源部《土地开发整理项目预算定额标准》（财综〔2011〕128号）
 * @module land-consolidation
 */

// ========== 项目类型（整治内容分类） ==========
const CONSOLIDATION_TYPES = {
  farmland: {
    id: 'farmland',
    name: '农用地整理',
    icon: 'field',
    color: '#2E7D32',
    subTypes: [
      { id: 'high_standard', name: '高标准农田建设', baseRate: 0.030, minRate: 0.025, maxRate: 0.040 },
      { id: 'land_quality', name: '耕地提质改造（旱改水）', baseRate: 0.028, minRate: 0.022, maxRate: 0.035 },
      { id: 'reserve_dev', name: '宜耕后备资源开发', baseRate: 0.035, minRate: 0.030, maxRate: 0.040 },
      { id: 'farm_infra', name: '农田基础设施配套', baseRate: 0.025, minRate: 0.020, maxRate: 0.030 }
    ]
  },
  construction: {
    id: 'construction',
    name: '建设用地整理',
    icon: 'building',
    color: '#EF6C00',
    subTypes: [
      { id: 'homestead', name: '农村宅基地拆旧复垦', baseRate: 0.035, minRate: 0.030, maxRate: 0.040 },
      { id: 'industrial', name: '低效工矿废弃地整治', baseRate: 0.038, minRate: 0.032, maxRate: 0.045 },
      { id: 'linkage', name: '城乡建设用地增减挂钩', baseRate: 0.040, minRate: 0.035, maxRate: 0.050 },
      { id: 'stock_land', name: '存量建设用地盘活利用', baseRate: 0.032, minRate: 0.028, maxRate: 0.038 }
    ]
  },
  ecological: {
    id: 'ecological',
    name: '乡村生态保护修复',
    icon: 'leaf',
    color: '#1565C0',
    subTypes: [
      { id: 'soil_erosion', name: '水土流失治理', baseRate: 0.030, minRate: 0.025, maxRate: 0.038 },
      { id: 'mine_restore', name: '历史遗留矿山生态修复', baseRate: 0.045, minRate: 0.035, maxRate: 0.050 },
      { id: 'wetland', name: '湿地保护与恢复', baseRate: 0.035, minRate: 0.028, maxRate: 0.042 },
      { id: 'water_system', name: '水系连通及水生态修复', baseRate: 0.032, minRate: 0.025, maxRate: 0.040 },
      { id: 'shelterbelt', name: '农田防护林网建设', baseRate: 0.020, minRate: 0.015, maxRate: 0.025 }
    ]
  },
  landscape: {
    id: 'landscape',
    name: '乡村风貌提升与保护',
    icon: 'home',
    color: '#6A1B9A',
    subTypes: [
      { id: 'village_protect', name: '传统村落保护修缮', baseRate: 0.040, minRate: 0.035, maxRate: 0.048 },
      { id: 'env_upgrade', name: '农村人居环境整治', baseRate: 0.028, minRate: 0.022, maxRate: 0.035 },
      { id: 'greening', name: '村庄绿化美化', baseRate: 0.025, minRate: 0.020, maxRate: 0.030 },
      { id: 'infra_upgrade', name: '基础设施配套提升', baseRate: 0.030, minRate: 0.025, maxRate: 0.035 }
    ]
  }
};

// ========== 勘测费率表 ==========
const SURVEY_RATES = {
  land_dev: { name: '土地开发整理项目勘测', rate: 0.015, minRate: 0.012, maxRate: 0.015 },
  high_standard: { name: '高标准农田勘测', rate: 0.0135, minRate: 0.012, maxRate: 0.015 },
  mine_restore: { name: '矿山修复勘测', rate: 0.018, minRate: 0.015, maxRate: 0.020 },
  water_system: { name: '水系治理勘测', rate: 0.013, minRate: 0.010, maxRate: 0.015 }
};

// ========== 设计与预算编制费率表（分档累进） ==========
const DESIGN_RATE_TABLE = [
  { limit: 500,   rateMin: 0.030, rateMax: 0.040 },
  { limit: 1000,  rateMin: 0.028, rateMax: 0.035 },
  { limit: 3000,  rateMin: 0.025, rateMax: 0.030 },
  { limit: 5000,  rateMin: 0.022, rateMax: 0.028 },
  { limit: 10000, rateMin: 0.020, rateMax: 0.025 },
  { limit: 50000, rateMin: 0.015, rateMax: 0.020 },
  { limit: 100000,rateMin: 0.012, rateMax: 0.015 },
  { limit: Infinity, rateMin: 0.01107, rateMax: 0.01107 }
];

// ========== 地貌调整系数 ==========
const TERRAIN_COEFFICIENTS = [
  { id: 'plain', name: '平原', coef: 1.0 },
  { id: 'hill', name: '丘陵', coef: 1.1 },
  { id: 'mountain', name: '山区', coef: 1.2 }
];

// ========== 乡镇数量系数 ==========
const TOWNSHIP_COEFFICIENTS = [
  { id: 'single', name: '1个乡镇', coef: 1.0 },
  { id: 'two', name: '2个乡镇', coef: 1.1 },
  { id: 'multi', name: '3个及以上乡镇', coef: 1.25 }
];

// ========== 规模调整系数 ==========
const SCALE_COEFFICIENTS = [
  { limit: 1000, coef: 1.2, label: '≤1000万' },
  { limit: 3000, coef: 1.1, label: '1000~3000万' },
  { limit: 5000, coef: 1.05, label: '3000~5000万' },
  { limit: 10000, coef: 1.0, label: '5000万~1亿' },
  { limit: 50000, coef: 0.95, label: '1~5亿' },
  { limit: Infinity, coef: 0.9, label: '>5亿' }
];

// ========== 附加调整系数 ==========
const ADDITIONAL_COEFFICIENTS = [
  { id: 'village_heritage', name: '含传统村落保护', coef: 1.15 },
  { id: 'mine_restoration', name: '含矿山生态修复', coef: 1.2 },
  { id: 'water_connect', name: '含水系连通工程', coef: 1.15 },
  { id: 'brownfield', name: '含污染场地修复', coef: 1.25 },
  { id: 'karst', name: '喀斯特地貌区', coef: 1.1 },
  { id: 'cold_region', name: '高寒地区', coef: 1.15 }
];

// ========== 专项服务取费标准 ==========
const SPECIAL_SERVICES = {
  plan_compilation: {
    name: '全域土地综合整治实施方案编制',
    unit: '乡镇',
    calcType: 'area',
    basePrice: 30, // 万元（≤5km²）
    extraPerKm: 1.5, // 每增加1km²加收1.5万
    maxStandard: 80
  },
  farmland_design: {
    name: '农用地整理规划设计',
    unit: '亩',
    calcType: 'per_mu',
    rateMin: 200,
    rateMax: 500
  },
  construction_reclaim: {
    name: '建设用地复垦方案',
    unit: '亩',
    calcType: 'per_mu',
    rateMin: 300,
    rateMax: 800
  },
  mine_restore_design: {
    name: '矿山生态修复设计',
    unit: '亩',
    calcType: 'per_mu_or_rate',
    rateMin: 500,
    rateMax: 2000,
    ratePercentMin: 0.03,
    ratePercentMax: 0.05
  },
  farmland_grade: {
    name: '耕地质量等别评定',
    unit: '项目',
    calcType: 'range',
    minFee: 5,
    maxFee: 20
  },
  land_evaluation: {
    name: '节约集约用地评价',
    unit: '项目',
    calcType: 'range',
    minFee: 10,
    maxFee: 30
  },
  village_layout: {
    name: '村庄布局优化方案',
    unit: '村',
    calcType: 'per_village',
    minFee: 5,
    maxFee: 15
  },
  basic_farmland: {
    name: '永久基本农田调整方案',
    unit: '项目',
    calcType: 'range',
    minFee: 10,
    maxFee: 50
  },
  completion_survey: {
    name: '整治项目竣工验收测绘',
    unit: '亩',
    calcType: 'per_mu',
    rateMin: 50,
    rateMax: 150
  },
  whole_process: {
    name: '全域整治全流程咨询',
    unit: '总投资',
    calcType: 'percent',
    rateMin: 0.02,
    rateMax: 0.04
  }
};

// ========== 高标准农田专项取费（元/亩） ==========
const HIGH_STANDARD_FARMLAND_FEES = {
  land_leveling: { name: '土地平整工程', minFee: 30, maxFee: 80 },
  irrigation: { name: '灌溉与排水工程', minFee: 40, maxFee: 100 },
  field_road: { name: '田间道路工程', minFee: 20, maxFee: 50 },
  protection: { name: '农田防护与生态', minFee: 15, maxFee: 40 },
  power: { name: '农田输配电工程', minFee: 15, maxFee: 35 },
  comprehensive: { name: '综合设计（含以上全部）', minFee: 100, maxFee: 250 }
};

module.exports = {
  CONSOLIDATION_TYPES,
  SURVEY_RATES,
  DESIGN_RATE_TABLE,
  TERRAIN_COEFFICIENTS,
  TOWNSHIP_COEFFICIENTS,
  SCALE_COEFFICIENTS,
  ADDITIONAL_COEFFICIENTS,
  SPECIAL_SERVICES,
  HIGH_STANDARD_FARMLAND_FEES
};
