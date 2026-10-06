// 国土空间规划收费标准数据
// 依据: 《广东省工程勘察设计服务成本取费导则（2024版）》第三部分

// 1. 城市总体国土空间规划收费率 (单位: 万元/km²)
const f2OverallFees = {
  scales: [
    { limit: 50, rate: 7.0, label: '小城市 (<50万人)' },
    { limit: 100, rate: 6.0, label: '中等城市 (50-100万人)' },
    { limit: 500, rate: 5.0, label: '大城市 (100-500万人)' },
    { limit: 1000, rate: 4.0, label: '特大城市 (500-1000万人)' },
    { limit: Infinity, rate: 3.0, label: '超大城市 (>1000万人)' }
  ],
  minFee: 50.0 // 最低基本服务成本: 50 万元
};

// 2. 控制性详细规划收费率 (单位: 元/万m²)
const f2RegulatoryFees = {
  'new_zone': { base: 3500, extra: 2500, label: '城市新区/开发区/自贸区' },
  'general_zone': { base: 3500, extra: 2500, label: '城市一般地段' },
  'key_zone': { base: 4000, extra: 2500, label: '城市重点地段' }
};

// 3. 修建性详细规划分类分档收费率 (单位: 元/万m²)
const f2ConstructiveFees = {
  scales: [
    { limit: 3, residential: 26000, public: 30000 },
    { limit: 5, residential: 22000, public: 28000 },
    { limit: 10, residential: 20000, public: 26000 },
    { limit: 20, residential: 18000, public: 22000 },
    { limit: 30, residential: 16000, public: 18000 },
    { limit: 50, residential: 12000, public: 14000 },
    { limit: Infinity, residential: 10000, public: 12000 }
  ],
  minFee: 10.0 // 最低基本服务成本: 10 万元
};

module.exports = {
  f2OverallFees,
  f2RegulatoryFees,
  f2ConstructiveFees
};
