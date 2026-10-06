/**
 * six-networks.js — "六张网"工程设计取费数据
 * 依据：中央政治局会议部署（2026.4.28）+ 国务院常务会议（2026.5.9）
 *       各网分别参照 2002版收费标准、2024版广东省导则、行业标准
 * @module six-networks
 */

// ========== 六张网概览 ==========
const NETWORKS = {
  N1: {
    id: 'N1',
    name: '水网工程',
    icon: 'water',
    color: '#1565C0',
    desc: '国家水网骨干工程 · 跨流域调水 · 灌区改造 · 智慧水务',
    investment: '6万亿+'
  },
  N2: {
    id: 'N2',
    name: '新型电网',
    icon: 'power',
    color: '#E65100',
    desc: '特高压输电 · 新能源并网 · 智能电网 · 储能',
    investment: '5万亿+'
  },
  N3: {
    id: 'N3',
    name: '算力网',
    icon: 'compute',
    color: '#6A1B9A',
    desc: '全国一体化算力枢纽 · 数据中心集群 · 智算中心',
    investment: '万亿级'
  },
  N4: {
    id: 'N4',
    name: '新一代通信网',
    icon: 'telecom',
    color: '#00838F',
    desc: '5G-A/6G基站 · 千兆光网 · 卫星互联网',
    investment: '万亿级'
  },
  N5: {
    id: 'N5',
    name: '城市地下管网',
    icon: 'pipeline',
    color: '#37474F',
    desc: '燃气/供水/排水/污水/热力管网77万公里改造',
    investment: '万亿级'
  },
  N6: {
    id: 'N6',
    name: '物流网',
    icon: 'logistics',
    color: '#2E7D32',
    desc: '国家物流枢纽 · 冷链基地 · 多式联运 · 应急物流',
    investment: '万亿级'
  }
};

// ========== N1 水网工程 ==========
const WATER_ENGINEERING = {
  types: [
    { id: 'reservoir', name: '水库工程', coef: 1.2, desc: '坝型/枢纽布置赋分' },
    { id: 'diversion_structure', name: '引调水工程（建构筑物）', coef: 1.2, desc: '含隧洞/渡槽/倒虹吸' },
    { id: 'diversion_pipeline', name: '引调水工程（渠道管线）', coef: 0.85, desc: '管径/压力/地形' },
    { id: 'river_training', name: '河道整治工程', coef: 1.3, desc: '堤防级别/地形' },
    { id: 'irrigation_field', name: '灌区工程（田间）', coef: 0.25, desc: '田间工程' },
    { id: 'soil_conservation', name: '水土保持工程', coef: 0.7, desc: '水保措施' },
    { id: 'urban_flood', name: '城市防洪工程', coef: 1.0, desc: '市政防洪' }
  ],
  stageRatios: {
    reservoir: { preliminary: 0.25, bidding: 0.20, construction: 0.55 },
    diversion_structure: { preliminary: 0.25, bidding: 0.20, construction: 0.55 },
    diversion_pipeline: { preliminary: 0.45, bidding: 0.20, construction: 0.35 },
    river_training_structure: { preliminary: 0.25, bidding: 0.20, construction: 0.55 },
    river_training_dike: { preliminary: 0.55, bidding: 0.10, construction: 0.35 },
    irrigation_field: { preliminary: 0.60, bidding: 0, construction: 0.40 },
    soil_conservation: { preliminary: 0.70, bidding: 0.10, construction: 0.20 }
  },
  specialServices: [
    { id: 'water_planning', name: '水网规划（流域级）', unit: '项', minFee: 50, maxFee: 300 },
    { id: 'water_resource', name: '水资源论证', unit: '项', minFee: 14, maxFee: 52 },
    { id: 'flood_impact', name: '防洪影响评价', unit: '项', minFee: 10, maxFee: 80 },
    { id: 'smart_water', name: '智慧水务方案设计', unit: '项', minFee: 30, maxFee: 200 },
    { id: 'water_ecology', name: '水生态修复设计', unit: '工程费%', minRate: 0.03, maxRate: 0.05 },
    { id: 'river_health', name: '河湖健康评价', unit: '项', minFee: 15, maxFee: 50 }
  ]
};

// ========== N2 新型电网工程 ==========
const POWER_ENGINEERING = {
  types: [
    { id: 'thermal', name: '火电工程', coef: 1.0 },
    { id: 'nuclear_conventional', name: '核电常规岛', coef: 1.2 },
    { id: 'nuclear', name: '核能工程', coef: 1.6 },
    { id: 'hydropower', name: '水电工程', coef: 1.2 },
    { id: 'transmission', name: '送变电工程', coef: 1.2 },
    { id: 'wind', name: '风力发电', coef: 0.8 },
    { id: 'solar', name: '光伏发电', coef: 1.0 },
    { id: 'energy_storage', name: '储能电站', coef: 1.2 }
  ],
  transmissionComplexity: [
    { id: 'I', name: 'I级 - 110kV及以下', coef: 0.85 },
    { id: 'II', name: 'II级 - 220kV/330kV', coef: 1.0 },
    { id: 'III', name: 'III级 - 500kV及以上/换流站/新能源', coef: 1.15 }
  ],
  stageRatios: {
    nuclear_transmission: { preliminary: 0.40, construction: 0.60 },
    thermal: { preliminary: 0.30, construction: 0.70 },
    wind: { preliminary: 0.45, construction: 0.55 }
  },
  specialServices: [
    { id: 'uhv_line', name: '特高压输电线路设计', desc: '工程费法（1.2系数）' },
    { id: 'smart_substation', name: '智能变电站设计', desc: '数字化附加×1.15' },
    { id: 'microgrid', name: '微电网/虚拟电厂方案', unit: '项', minFee: 20, maxFee: 100 },
    { id: 'storage_design', name: '储能电站设计（电化学）', unit: '工程费%', minRate: 0.015, maxRate: 0.025 },
    { id: 'pumped_storage', name: '抽水蓄能电站设计', desc: '水电1.2系数' },
    { id: 'grid_connection', name: '新能源并网接入设计', unit: '项', minFee: 5, maxFee: 30 },
    { id: 'distribution_planning', name: '增量配电网规划', unit: '项', minFee: 30, maxFee: 150 },
    { id: 'power_tunnel', name: '电力管廊/电缆隧道设计', desc: '市政1.0 + 隧道1.1' }
  ]
};

// ========== N3 算力网工程 ==========
const COMPUTE_ENGINEERING = {
  types: [
    { id: 'dc_building', name: '数据中心建筑', coef: 1.0, desc: '工程费法（建筑）' },
    { id: 'dc_electrical', name: '数据中心机电', coef: 1.0, desc: '供配电/UPS/柴油发电/空调/弱电' },
    { id: 'dc_hvac', name: '数据中心暖通', coef: 1.0, desc: '精密空调/冷冻水/间接蒸发冷却' },
    { id: 'dc_smart', name: '数据中心弱电智能化', coef: 1.0, desc: '动环监控/BMS/DCIM' },
    { id: 'dc_process', name: '算力中心工艺设计', coef: 1.0, desc: '机柜布局/功率密度' },
    { id: 'dc_interior', name: '数据中心装修', coef: 1.0, desc: '面积指标法 30~150元/m²' },
    { id: 'dc_disaster', name: '灾备数据中心', coef: 1.3, desc: '双活/两地三中心架构' }
  ],
  dcComplexity: [
    { id: 'I', name: 'I级 - 小型EDC（<500机柜，单路供电）', coef: 0.85 },
    { id: 'II', name: 'II级 - 中型IDC（500-3000机柜，N+1冗余）', coef: 1.0 },
    { id: 'III', name: 'III级 - 大型/超大型（>3000机柜，2N冗余/Tier IV）', coef: 1.25 }
  ],
  specialServices: [
    { id: 'compute_hub_plan', name: '算力枢纽总体规划', unit: '项', minFee: 100, maxFee: 500 },
    { id: 'dc_site_select', name: '数据中心选址论证', unit: '项', minFee: 20, maxFee: 60 },
    { id: 'pue_optimize', name: 'PUE优化咨询', unit: '项', minFee: 10, maxFee: 50 },
    { id: 'liquid_cooling', name: '液冷系统专项设计', unit: '工程费%', minRate: 0.02, maxRate: 0.04 },
    { id: 'compute_platform', name: '算力调度平台设计', unit: '项', minFee: 50, maxFee: 200 },
    { id: 'dc_energy_eval', name: '数据中心能效评估', unit: '元/m²', minFee: 3, maxFee: 8 }
  ]
};

// ========== N4 新一代通信网工程 ==========
const TELECOM_ENGINEERING = {
  types: [
    { id: 'telecom_pipe', name: '通信管道工程', coef: 1.0, desc: '按管孔公里' },
    { id: 'telecom_cable', name: '通信光缆/电缆线路', coef: 1.0, desc: '架空/直埋/管道敷设' },
    { id: 'macro_station', name: '移动通信基站（宏站）', coef: 1.0, desc: '塔桅/机房/天馈' },
    { id: 'indoor_dist', name: '室内分布系统', coef: 1.0, desc: '5~15元/m²' },
    { id: 'g5_6g_station', name: '5G-A/6G基站', coef: 1.35, desc: '高频段/大规模MIMO附加' },
    { id: 'satellite_ground', name: '卫星互联网地面站', coef: 1.0, desc: '天线口径/频段系数' },
    { id: 'telecom_room', name: '通信机房/数据中心', coef: 1.0, desc: '电源/空调/传输配套' },
    { id: 'iot', name: '物联网（NB-IoT/Cat.1）', coef: 0.65, desc: '批量系数0.5~0.8' }
  ],
  stationSurveyFees: [
    { id: 'macro', name: '宏蜂窝基站', fee: 5500 },
    { id: 'micro', name: '微蜂窝基站', fee: 4400 },
    { id: 'indoor', name: '室内分布站', fee: 3500 },
    { id: 'edge', name: '边际站/直放站', fee: 3000 }
  ],
  specialServices: [
    { id: 'telecom_plan', name: '通信管网专项规划', desc: '参照F2.5市政管线规划' },
    { id: 'g5_site_plan', name: '5G站址规划', unit: '项', minFee: 10, maxFee: 50 },
    { id: 'smart_pole', name: '智慧灯杆/多杆合一', unit: '元/杆', minFee: 800, maxFee: 3000 },
    { id: 'satellite_gateway', name: '卫星互联网关口站设计', coef: 1.15 },
    { id: 'infra_sharing', name: '通信基础设施共建共享方案', unit: '项', minFee: 10, maxFee: 30 }
  ]
};

// ========== N5 城市地下管网工程 ==========
const PIPELINE_ENGINEERING = {
  types: [
    { id: 'pipe_comprehensive', name: '市政管线综合', coef: 1.0 },
    { id: 'gas_pipe', name: '燃气管网', coef: 1.0, safetyAdd: 1.2, desc: '含门站/调压站' },
    { id: 'water_supply', name: '供水管网', coef: 1.0, extraAdd: 1.1, desc: '含加压泵站/分区计量' },
    { id: 'drain_rain', name: '排水管网（雨水）', coef: 1.0, extraAdd: 1.1, desc: '含排涝泵站/海绵' },
    { id: 'sewage', name: '污水管网', coef: 1.0, desc: '含提升泵站' },
    { id: 'heat_pipe', name: '供热管网', coef: 1.0, extraAdd: 1.1, desc: '含换热站' },
    { id: 'utility_tunnel', name: '综合管廊', coef: 1.0, undergroundAdd: 1.2, desc: '含附属设施' },
    { id: 'power_trench', name: '电力管沟/隧道', coef: 1.2, desc: '含电缆敷设' },
    { id: 'telecom_duct', name: '通信管道', coef: 1.0, desc: '含人孔/手孔' }
  ],
  planningServices: [
    { id: 'pipe_plan_comprehensive', name: '市政管线规划方案综合', unit: '根·km', feePerUnit: 0.3, minFee: 5 },
    { id: 'pipe_design_comprehensive', name: '市政管线设计方案综合', unit: '根·km', feePerUnit: 0.5, minFee: 5 },
    { id: 'pipe_main_road', name: '综合管线（主干道）', unit: 'km', feePerUnit: 5 },
    { id: 'utility_tunnel_urban', name: '综合管廊（城市用地）', unit: 'km²', feePerUnit: 7 },
    { id: 'utility_tunnel_main', name: '综合管廊（主通道）', unit: 'km', feePerUnit: 6.5 },
    { id: 'pipe_route_select', name: '管线选线规划', unit: 'km', feePerUnit: 1.5, minFee: 5 },
    { id: 'pipe_facility_site', name: '管线设施选址', unit: '处', feePerUnit: 20 }
  ],
  inspectionServices: [
    { id: 'cctv', name: '管网CCTV检测', unit: '元/m', minFee: 15, maxFee: 50 },
    { id: 'health_eval', name: '管网健康度评估', unit: '万元/km', minFee: 1, maxFee: 3 },
    { id: 'gis_digital', name: '管网GIS数字化', unit: '元/km', minFee: 500, maxFee: 1500 },
    { id: 'leak_detect', name: '管网渗漏检测', unit: '元/段', minFee: 5000, maxFee: 15000 },
    { id: 'safety_assess', name: '管网安全风险评估', unit: '元/km', minFee: 2000, maxFee: 5000 },
    { id: 'lifeline_monitor', name: '生命线安全工程监测方案', unit: '工程费%', minRate: 0.02, maxRate: 0.04 }
  ],
  targets: {
    gas: 20, drain: 17.5, water: 17.5, sewage: 10, heat: 12
  }
};

// ========== N6 物流网工程 ==========
const LOGISTICS_ENGINEERING = {
  types: [
    { id: 'logistics_park', name: '物流园区/枢纽建筑', coef: 1.0, desc: '仓库/分拣中心/综合楼' },
    { id: 'cold_chain', name: '冷链物流基地', coef: 1.0, coldAdd: 1.2, desc: '冷库/恒温仓' },
    { id: 'multimodal', name: '多式联运场站', coef: 1.1, desc: '铁路专用线/港口/公路' },
    { id: 'air_cargo', name: '航空货运枢纽', coef: 1.0, desc: '跑道/货站/机坪' },
    { id: 'urban_dc', name: '城市配送中心', coef: 1.0, desc: '分拨/配送/末端网点' },
    { id: 'emergency_logistics', name: '应急物流基地', coef: 1.0, emergencyAdd: 1.15, desc: '物资储备/调度中心' }
  ],
  specialFactors: [
    { id: 'auto_warehouse', name: '自动化立体仓库', coef: 1.3, desc: '堆垛机/输送系统/AGV' },
    { id: 'cold_warehouse', name: '冷链仓库（-18℃以下）', coef: 1.4, desc: '制冷系统/保温结构' },
    { id: 'hazard_warehouse', name: '危险品仓储', coef: 1.45, desc: '消防/防爆/泄漏处置' }
  ],
  specialServices: [
    { id: 'logistics_hub_plan', name: '国家物流枢纽规划', unit: '项', minFee: 100, maxFee: 300 },
    { id: 'logistics_park_plan', name: '物流园区总体规划', desc: '参照F2.4控规/修规' },
    { id: 'cold_chain_plan', name: '冷链物流专项规划', unit: '项', minFee: 30, maxFee: 100 },
    { id: 'multimodal_design', name: '多式联运方案设计', unit: '项', minFee: 50, maxFee: 150 },
    { id: 'urban_delivery_plan', name: '城市三级配送网络规划', unit: '项', minFee: 30, maxFee: 80 },
    { id: 'emergency_logistics_plan', name: '应急物流体系规划', unit: '项', minFee: 20, maxFee: 60 },
    { id: 'smart_logistics_platform', name: '智慧物流平台方案', unit: '项', minFee: 30, maxFee: 100 }
  ]
};

module.exports = {
  NETWORKS,
  WATER_ENGINEERING,
  POWER_ENGINEERING,
  COMPUTE_ENGINEERING,
  TELECOM_ENGINEERING,
  PIPELINE_ENGINEERING,
  LOGISTICS_ENGINEERING
};
