/**
 * 乡村/整村规划设计取费数据
 * 依据：自然资源部《市级国土空间总体规划编制指南（试行）》2020
 * 参照：各省自然资源厅 村庄规划编制指南
 */

// 镇国土空间总体规划费率表（万元）
const TOWN_PLAN_RATES = {
  scales: [
    { limit: 1, rate: 120, label: '<1 万人' },
    { limit: 3, rate: 100, label: '1~3 万人' },
    { limit: 5, rate: 80, label: '3~5 万人' },
    { limit: 10, rate: 60, label: '5~10 万人' },
    { limit: Infinity, rate: 40, label: '>10 万人' }
  ],
  minFee: 80
};

// 乡（村）国土空间规划费率
const VILLAGE_PLAN_RATES = {
  township: {
    rate: [2, 4], // 万元/km²
    minFee: 30,
    name: '乡域国土空间规划',
    desc: '按乡域面积计，2~4万元/km²'
  },
  village_single: {
    rate: [10, 30], // 万元/村
    minFee: 10,
    name: '单个行政村规划',
    desc: '10~30万元/村'
  },
  village_bundle: {
    rate: [8, 20], // 万元/村
    minFee: 15,
    name: '多个行政村打包',
    desc: '8~20万元/村（打包优惠）'
  },
  beautiful_village: {
    rate: [15, 50], // 万元/村
    minFee: 15,
    name: '美丽乡村规划',
    desc: '含人居环境整治、风貌提升'
  }
};

// 整村规划设计取费表
const WHOLE_VILLAGE_RATES = {
  development_plan: {
    low: 15, high: 60, unit: '万元/项',
    name: '发展策划',
    desc: '含资源评估、产业定位、发展路径'
  },
  industry_plan: {
    low: 10, high: 30, unit: '万元/项',
    name: '产业策划',
    desc: '含产业选型、布局、运营模式'
  },
  detailed_plan: {
    low: 1.0, high: 1.8, unit: '万元/万m²',
    name: '修建性详细规划',
    desc: '按规划建设用地面积计'
  },
  style_guide: {
    low: 8, high: 25, unit: '万元/项',
    name: '风貌导则',
    desc: '含建筑风貌、景观指引'
  },
  heritage_conservation: {
    low: 20, high: 80, unit: '万元/项',
    name: '传统村落保护规划',
    desc: '含建筑测绘、价值评估、保护方案'
  }
};

// 最低保底费用
const VILLAGE_MIN_FEES = {
  township: 30,     // 乡域规划最低
  village: 10,      // 村庄规划最低
  detailed: 10,     // 整村详规最低
  heritage: 20      // 传统村落保护最低
};

// 乡村规划附加调整系数
const VILLAGE_ADD_COEFS = {
  remote: { id: 'remote', name: '偏远地区/交通不便', coef: 1.3 },
  mountain: { id: 'mountain', name: '山区/地形复杂', coef: 1.2 },
  ethnic: { id: 'ethnic', name: '少数民族特色村寨', coef: 1.25 },
  tourism: { id: 'tourism', name: '旅游重点村', coef: 1.2 },
  industrial: { id: 'industrial', name: '产业融合示范村', coef: 1.15 }
};

module.exports = {
  TOWN_PLAN_RATES,
  VILLAGE_PLAN_RATES,
  WHOLE_VILLAGE_RATES,
  VILLAGE_MIN_FEES,
  VILLAGE_ADD_COEFS
};
