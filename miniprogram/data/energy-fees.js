/**
 * 能源工程设计取费数据
 * 依据：国家计委、建设部《工程勘察设计收费标准（2002年修订本）》
 * 水利电力工程复杂程度赋分 + 新能源工程专业系数
 */

// 水利电力工程复杂程度赋分表
const ENERGY_COMPLEXITY_SCORES = {
  hub: {
    id: 'hub',
    name: '枢纽布置',
    items: [
      { desc: '坝型单一、集中布置', score: -10 },
      { desc: '坝型多样、分散布置', score: 10 },
      { desc: '引水式电站', score: -10 }
    ]
  },
  buildings: {
    id: 'buildings',
    name: '主要建筑物',
    items: [
      { desc: '土石坝/常规重力坝', score: -10 },
      { desc: '拱坝/支墩坝/空腹重力坝', score: 5 },
      { desc: '有地下洞室', score: 10 },
      { desc: '基础处理复杂', score: 10 }
    ]
  },
  utilization: {
    id: 'utilization',
    name: '综合利用',
    items: [
      { desc: '单一发电', score: -10 },
      { desc: '防洪/发电/灌溉', score: 5 },
      { desc: '防洪+发电+灌溉+供水+航运', score: 10 }
    ]
  },
  construction: {
    id: 'construction',
    name: '施工条件',
    items: [
      { desc: '施工条件简单', score: -5 },
      { desc: '施工导流复杂', score: 5 },
      { desc: '施工场地狭窄', score: 10 }
    ]
  },
  slope: {
    id: 'slope',
    name: '边坡处理',
    items: [
      { desc: '无高边坡', score: 0 },
      { desc: '有高边坡需专门处理', score: 10 }
    ]
  },
  karst: {
    id: 'karst',
    name: '岩溶/特殊地质',
    items: [
      { desc: '无特殊地质', score: 0 },
      { desc: '岩溶发育或特殊地质', score: 10 }
    ]
  }
};

// 水利工程复杂程度等级
const ENERGY_HYDRO_COMPLEXITY = {
  I: { scoreRange: [-Infinity, -20], coef: 0.85, name: 'I级（简单）' },
  II: { scoreRange: [-20, 5], coef: 1.0, name: 'II级（中等）' },
  III: { scoreRange: [5, Infinity], coef: 1.15, name: 'III级（复杂）' }
};

// 其他水利工程复杂程度
const ENERGY_OTHER_COMPLEXITY = {
  hillside_ratio: {
    I: { limit: 30, coef: 0.85, name: '丘陵/山区占地<30%' },
    II: { limit: 60, coef: 1.0, name: '丘陵/山区占地30~60%' },
    III: { limit: Infinity, coef: 1.15, name: '丘陵/山区占地>60%' }
  },
  levee_grade: {
    I: { coef: 0.85, name: '堤防等级 1/2级' },
    II: { coef: 1.0, name: '堤防等级 3级' },
    III: { coef: 1.15, name: '堤防等级 4/5级' }
  }
};

// 水利工程附加调整系数
const ENERGY_HYDRO_ADD_COEFS = {
  diversion_channel: { id: 'diversion_channel', name: '引调水渠道', coef: 0.85 },
  field: { id: 'field', name: '灌区田间工程', coef: 0.25 },
  soil_conservation: { id: 'soil_conservation', name: '水土保持工程', coef: 0.7 },
  river_treatment: { id: 'river_treatment', name: '河道治理', coef: 1.3 },
  flood_control: { id: 'flood_control', name: '防洪堤', coef: 1.2 },
  tunnel_long: { id: 'tunnel_long', name: '长隧洞 (>10km)', coef: 1.3 },
  reservoir_extra: { id: 'reservoir_extra', name: '水库淹没处理', coef: 0.6 }
};

// 新能源工程专业系数
const ENERGY_NEW_COEFS = {
  wind: { id: 'wind', name: '风力发电', coef: 0.8, desc: '陆上风电项目' },
  solar: { id: 'solar', name: '光伏发电', coef: 1.0, desc: '地面/分布式光伏' },
  storage: { id: 'storage', name: '储能电站', coef: 1.2, desc: '电化学储能/抽水蓄能' },
  integrated: { id: 'integrated', name: '综合能源', coef: 1.0, desc: '冷热电三联供/微电网' },
  biomass: { id: 'biomass', name: '生物质发电', coef: 1.0, desc: '垃圾焚烧/沼气发电' },
  hydrogen: { id: 'hydrogen', name: '氢能工程', coef: 1.6, desc: '制氢/加氢站/氢储运' },
  smart_grid: { id: 'smart_grid', name: '智能电网', coef: 1.2, desc: '配电网自动化/虚拟电厂' }
};

// 建筑节能改造取费参考（元/m²）
const ENERGY_SAVING_RATES = {
  diagnosis: { low: 2, high: 8, name: '节能诊断' },
  envelope_design: { low: 5, high: 15, name: '围护结构改造设计' },
  hvac_design: { low: 8, high: 20, name: '暖通空调系统改造设计' },
  lighting_design: { low: 3, high: 10, name: '照明系统改造设计' },
  renewable_design: { low: 5, high: 15, name: '可再生能源系统设计' },
  smart_control: { low: 3, high: 12, name: '智能控制系统设计' }
};

// 节能改造附加系数
const ENERGY_SAVING_ADD_COEFS = {
  historic: { id: 'historic', name: '历史保护建筑', coef: 1.3 },
  occupied: { id: 'occupied', name: '边运营边改造', coef: 1.2 },
  complex_envelope: { id: 'complex_envelope', name: '复杂幕墙/异形外围护', coef: 1.3 }
};

module.exports = {
  ENERGY_COMPLEXITY_SCORES,
  ENERGY_HYDRO_COMPLEXITY,
  ENERGY_OTHER_COMPLEXITY,
  ENERGY_HYDRO_ADD_COEFS,
  ENERGY_NEW_COEFS,
  ENERGY_SAVING_RATES,
  ENERGY_SAVING_ADD_COEFS
};
