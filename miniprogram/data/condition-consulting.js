/**
 * condition-consulting.js — 建设条件单项咨询取费数据
 * 依据：计价格[2002]125号（环评）、2024版广东省导则、行业标准
 * @module condition-consulting
 */

// ========== 咨询类型 ==========
const CONSULT_TYPES = {
  env_assessment: {
    id: 'env_assessment',
    name: '环境影响评价',
    icon: 'leaf',
    color: '#2E7D32',
    subTypes: [
      { id: 'env_report_book', name: '编制环境影响报告书（含大纲）' },
      { id: 'env_report_table', name: '编制环境影响报告表' },
      { id: 'env_assess_book', name: '评估环境影响报告书' },
      { id: 'env_assess_table', name: '评估环境影响报告表' }
    ]
  },
  energy_assessment: {
    id: 'energy_assessment',
    name: '节能评估',
    icon: 'bolt',
    color: '#EF6C00',
    subTypes: [
      { id: 'energy_report', name: '节能评估报告书' },
      { id: 'energy_table', name: '节能评估报告表' },
      { id: 'energy_registration', name: '节能登记表' }
    ]
  },
  water_soil: {
    id: 'water_soil',
    name: '水土保持方案',
    icon: 'water',
    color: '#1565C0',
    subTypes: [
      { id: 'ws_report_book', name: '水土保持方案报告书' },
      { id: 'ws_report_table', name: '水土保持方案报告表' }
    ]
  },
  flood_impact: {
    id: 'flood_impact',
    name: '防洪影响评价',
    icon: 'shield',
    color: '#00838F',
    subTypes: [
      { id: 'flood_assess', name: '防洪影响评价报告' }
    ]
  },
  water_resource: {
    id: 'water_resource',
    name: '水资源论证',
    icon: 'droplet',
    color: '#0277BD',
    subTypes: [
      { id: 'surface_water', name: '地表水取水论证' },
      { id: 'groundwater', name: '地下水取水论证' }
    ]
  },
  social_stability: {
    id: 'social_stability',
    name: '社会稳定风险分析/评估',
    icon: 'users',
    color: '#6A1B9A',
    subTypes: [
      { id: 'stability_analysis', name: '社会稳定风险分析' },
      { id: 'stability_assessment', name: '社会稳定风险评估' }
    ]
  },
  cultural_relic: {
    id: 'cultural_relic',
    name: '文物影响评估',
    icon: 'landmark',
    color: '#C62828',
    subTypes: [
      { id: 'relic_survey', name: '文物考古调查' },
      { id: 'relic_explore', name: '文物考古勘探' },
      { id: 'relic_assess', name: '文物影响评估报告' }
    ]
  },
  tree_protection: {
    id: 'tree_protection',
    name: '树木保护专章',
    icon: 'tree',
    color: '#558B2F',
    subTypes: [
      { id: 'tree_survey', name: '树木资源调查' },
      { id: 'tree_protect_plan', name: '树木保护方案编制' }
    ]
  },
  ppp_consult: {
    id: 'ppp_consult',
    name: 'PPP项目咨询',
    icon: 'handshake',
    color: '#37474F',
    subTypes: [
      { id: 'ppp_plan', name: 'PPP实施方案编制' },
      { id: 'ppp_value', name: '物有所值评价' },
      { id: 'ppp_finance', name: '财政承受能力论证' },
      { id: 'ppp_contract', name: 'PPP项目合同咨询' }
    ]
  },
  post_evaluation: {
    id: 'post_evaluation',
    name: '项目后评价',
    icon: 'clipboard',
    color: '#546E7A',
    subTypes: [
      { id: 'post_eval', name: '项目后评价报告' }
    ]
  }
};

// ========== 环境影响评价收费表（计价格[2002]125号） ==========
// 单位：万元，按估算投资额（亿元）分档
const ENV_ASSESSMENT_TABLE = [
  { limit: 0.3, reportBook: [5, 6], reportTable: [1, 2], assessBook: [1.5, 2], assessTable: [0.8, 1.0] },
  { limit: 2, reportBook: [6, 15], reportTable: [2, 4], assessBook: [2, 4], assessTable: [1.0, 1.5] },
  { limit: 10, reportBook: [15, 35], reportTable: [4, 7], assessBook: [4, 7], assessTable: [1.5, 2.0] },
  { limit: 50, reportBook: [35, 75], reportTable: [7, 9], assessBook: [7, 9], assessTable: [2.0, 2.5] },
  { limit: 100, reportBook: [75, 110], reportTable: [9, 13], assessBook: [9, 13], assessTable: [2.5, 3.0] },
  { limit: Infinity, reportBook: [110, 150], reportTable: [13, 20], assessBook: [13, 20], assessTable: [3.0, 4.0] }
];

// 环评行业调整系数
const ENV_INDUSTRY_COEF = {
  chemical: { name: '化工/石化/冶金', coef: 1.2 },
  water_power: { name: '水利/水电', coef: 1.1 },
  traffic: { name: '交通', coef: 1.0 },
  social: { name: '社会服务', coef: 0.8 },
  general: { name: '一般项目', coef: 1.0 }
};

// 环评敏感区系数
const ENV_SENSITIVE_COEF = {
  type1: { name: 'Ⅰ类（邻近敏感区大中型）', coef: 1.0 },
  type2: { name: 'Ⅱ类（非敏感区大中型）', coef: 0.85 },
  type3: { name: 'Ⅲ类（小型敏感区）', coef: 1.1 }
};

// ========== 节能评估收费（按投资额分档） ==========
const ENERGY_ASSESSMENT_TABLE = [
  { limit: 0.5, reportBook: [3, 5], reportTable: [1, 2], registration: [0.3, 0.5] },
  { limit: 1, reportBook: [5, 10], reportTable: [2, 4], registration: [0.5, 1] },
  { limit: 5, reportBook: [10, 20], reportTable: [4, 7], registration: [1, 2] },
  { limit: 10, reportBook: [20, 35], reportTable: [7, 10], registration: [2, 3] },
  { limit: 50, reportBook: [35, 60], reportTable: [10, 15], registration: [3, 5] },
  { limit: Infinity, reportBook: [60, 100], reportTable: [15, 25], registration: [5, 8] }
];

// ========== 水土保持方案收费 ==========
const WATER_SOIL_TABLE = [
  { limit: 0.5, reportBook: [5, 10], reportTable: [2, 4] },
  { limit: 1, reportBook: [10, 20], reportTable: [4, 6] },
  { limit: 5, reportBook: [20, 40], reportTable: [6, 10] },
  { limit: 10, reportBook: [40, 60], reportTable: [10, 15] },
  { limit: 50, reportBook: [60, 100], reportTable: [15, 25] },
  { limit: Infinity, reportBook: [100, 150], reportTable: [25, 40] }
];

// ========== 防洪影响评价收费 ==========
const FLOOD_IMPACT_TABLE = [
  { limit: 0.5, fee: [10, 15] },
  { limit: 1, fee: [15, 25] },
  { limit: 5, fee: [25, 40] },
  { limit: 10, fee: [40, 60] },
  { limit: 50, fee: [60, 80] },
  { limit: Infinity, fee: [80, 120] }
];

// ========== 水资源论证收费（按水源类别+取水量） ==========
const WATER_RESOURCE_FEES = {
  surface_water: [
    { limit: 1000, fee: [14, 20] },   // 万m³/年
    { limit: 5000, fee: [20, 30] },
    { limit: 10000, fee: [30, 42] },
    { limit: Infinity, fee: [42, 52] }
  ],
  groundwater: [
    { limit: 100, fee: [14, 22] },
    { limit: 500, fee: [22, 35] },
    { limit: 1000, fee: [35, 46] },
    { limit: Infinity, fee: [46, 52] }
  ]
};

// 水资源论证行业系数
const WATER_RESOURCE_INDUSTRY_COEF = {
  thermal_power: { name: '火电', coef: 1.2 },
  chemical: { name: '化工/石化', coef: 1.1 },
  general: { name: '一般工业', coef: 1.0 },
  living: { name: '生活用水', coef: 0.8 }
};

// ========== 社会稳定风险分析/评估（累进计算） ==========
function calcStabilityFee(investment, type) {
  // 投资额单位：亿元
  let fee = 0;
  if (type === 'analysis') {
    // 社会稳定风险分析：1亿以下6万 + 超额累进
    if (investment <= 1) {
      fee = 6;
    } else if (investment <= 5) {
      fee = 6 + (investment - 1) * 4;
    } else if (investment <= 10) {
      fee = 6 + 16 + (investment - 5) * 3;
    } else if (investment <= 50) {
      fee = 6 + 16 + 15 + (investment - 10) * 2;
    } else {
      fee = 6 + 16 + 15 + 80 + (investment - 50) * 1;
    }
  } else {
    // 社会稳定风险评估：1亿以下4万 + 超额累进
    if (investment <= 1) {
      fee = 4;
    } else if (investment <= 5) {
      fee = 4 + (investment - 1) * 2.5;
    } else if (investment <= 10) {
      fee = 4 + 10 + (investment - 5) * 2;
    } else if (investment <= 50) {
      fee = 4 + 10 + 10 + (investment - 10) * 1.5;
    } else {
      fee = 4 + 10 + 10 + 60 + (investment - 50) * 0.8;
    }
  }
  return fee;
}

// ========== 文物影响评估收费 ==========
const RELIC_ASSESSMENT_TABLE = [
  { limit: 0.5, fee: [15, 25] },
  { limit: 1, fee: [25, 40] },
  { limit: 5, fee: [40, 65] },
  { limit: 10, fee: [65, 85] },
  { limit: 50, fee: [85, 110] },
  { limit: Infinity, fee: [110, 150] }
];

// ========== 树木保护专章收费 ==========
const TREE_PROTECTION_FEES = {
  tree_survey: { unit: '株', feePerUnit: 0.003, minFee: 0.3, desc: '树木资源调查（万元/株）' },
  tree_protect_plan: { unit: '株', feePerUnit: 0.005, minFee: 0.5, desc: '树木保护方案编制（万元/株）' }
};

// ========== PPP项目咨询收费 ==========
const PPP_CONSULT_TABLE = [
  { limit: 1, plan: [11, 20], value: [5, 8], finance: [3, 5], contract: [3, 5] },
  { limit: 5, plan: [20, 40], value: [8, 15], finance: [5, 10], contract: [5, 8] },
  { limit: 10, plan: [40, 60], value: [15, 25], finance: [10, 15], contract: [8, 12] },
  { limit: 50, plan: [60, 100], value: [25, 40], finance: [15, 25], contract: [12, 20] },
  { limit: 100, plan: [100, 150], value: [40, 60], finance: [25, 40], contract: [20, 30] },
  { limit: Infinity, plan: [150, 200], value: [60, 80], finance: [40, 60], contract: [30, 50] }
];

// ========== 项目后评价收费 ==========
const POST_EVAL_TABLE = [
  { limit: 1, fee: [3, 6] },
  { limit: 5, fee: [6, 15] },
  { limit: 10, fee: [15, 25] },
  { limit: 50, fee: [25, 40] },
  { limit: 100, fee: [40, 60] },
  { limit: Infinity, fee: [60, 100] }
];

module.exports = {
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
};
