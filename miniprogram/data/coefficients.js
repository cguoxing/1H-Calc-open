// 2002版《工程勘察设计收费标准》专业调整系数、复杂程度与阶段比例数据
const professionalCoefficients = {
  // 矿山采选工程
  'mining_black_gold_chemical_nonmetal': 1.1,
  'mining_coal_nonferrous_uranium': 1.2,
  'mining_coal_processing_other': 1.3,

  // 加工冶炼工程
  'processing_cold': 1.0,
  'processing_ship_hydraulic': 1.1,
  'processing_smelting_heat_pressure': 1.2,
  'processing_nuclear': 1.3,

  // 石油化工工程
  'petrochemical_general': 1.2,
  'petrochemical_nuclear': 1.6,

  // 水利电力工程
  'airport_field': 0.8,

  // 建筑与市政
  'building': 1.0,      // 建筑工程
  'interior_deco': 1.0,  // 室内装饰工程设计
  'municipal': 1.0,     // 市政/给排水
  'telecom': 1.0,       // 电信工程
  'civil_defense': 1.1,  // 人防工程
  'landscape': 1.1,     // 园林绿化工程
  'broadcasting': 1.1,   // 广电工艺
  
  // 交通运输
  'highway': 0.9,       // 公路工程
  'urban_road': 0.9,    // 城市道路工程
  'light_rail': 1.0,    // 轻轨工程
  'airport_runway': 0.8, // 机场场道
  'airport_control': 1.0,// 空管和助航灯光
  'subway': 1.1,        // 地铁工程
  'bridge': 1.1,        // 桥梁工程
  'tunnel': 1.1,        // 隧道工程
  'waterway': 1.1,      // 水运工程
  'ropeway': 1.3,       // 索道工程

  // 水利电力/能源
  'wind_power': 0.8,    // 风力发电
  'water_conservancy_other': 0.8, // 其他水利
  'thermal_power': 1.0,  // 火电工程
  'hydro_power': 1.2,    // 水电/水库
  'transmission': 1.2,   // 送变电工程
  'nuclear_power': 1.6,  // 核能工程
  
  // 农林
  'agriculture': 0.9,   // 农业工程
  'forestry': 0.8,      // 林业工程

  // 全过程工程咨询
  'F6a': 1.15,          // 全过程工程咨询（建筑）
  'F6b': 1.10,          // 全过程工程咨询（市政）
  'F6c': 1.20           // 全过程工程咨询（工业）
};

const complexityCoefficients = {
  'I': 0.85,    // 简单 (I 级)
  'II': 1.00,   // 较复杂 (II 级)
  'III': 1.15   // 复杂 (III 级)
};

const stageRatios = {
  'default': { prelim: 0.45, detail: 0.55 }, // 建筑市政工程默认
  'traffic': { prelim: 0.40, detail: 0.60 }, // 交通运输工程
  'water_power': { prelim: 0.40, detail: 0.60 }, // 送变电工程
  'hydropower_reservoir': { prelim: 0.25, bidding: 0.20, detail: 0.55 } // 水利/水电/引调水
};

module.exports = {
  professionalCoefficients,
  complexityCoefficients,
  stageRatios
};
