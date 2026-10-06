// 工程勘察收费标准数据
// 依据: 《工程勘察设计收费标准》（2002版）

// 岩土工程勘察基本服务成本基价表 (单位: 万元)
const surveyBasePrices = {
  // 勘察(万)
  'survey': [
    { value: 200, price: 10.2 },
    { value: 500, price: 20.9 },
    { value: 1000, price: 31.4 },
    { value: 3000, price: 68.7 },
    { value: 5000, price: 101.9 },
    { value: 10000, price: 157.5 },
    { value: 20000, price: 258.3 },
    { value: 40000, price: 413.2 },
    { value: 100000, price: 894.7 },
    { value: 200000, price: 1664.1 },
    { value: 500000, price: 4503.4 },
    { value: 1000000, price: 7113.8 }
  ],
  // 勘察咨询(万)
  'consult': [
    { value: 200, price: 6.1 },
    { value: 500, price: 12.5 },
    { value: 1000, price: 18.8 },
    { value: 3000, price: 41.2 },
    { value: 5000, price: 61.1 },
    { value: 10000, price: 94.5 },
    { value: 20000, price: 155.0 },
    { value: 40000, price: 247.9 },
    { value: 100000, price: 536.8 },
    { value: 200000, price: 998.5 },
    { value: 500000, price: 2702.0 },
    { value: 1000000, price: 4268.3 }
  ],
  // 旁站监理(万)
  'supervision': [
    { value: 200, price: 3.0 },
    { value: 500, price: 7.0 },
    { value: 1000, price: 13.0 },
    { value: 3000, price: 14.3 },
    { value: 5000, price: 15.0 },
    { value: 10000, price: 20.0 },
    { value: 20000, price: 26.0 },
    { value: 40000, price: 28.7 },
    { value: 100000, price: 36.0 },
    { value: 200000, price: 40.0 },
    { value: 500000, price: 60.0 },
    { value: 1000000, price: 100.0 }
  ]
};

// 工程复杂程度影响系数
const surveyComplexityCoefficients = {
  'I': 0.85,    // I级（简单）
  'II': 1.0,     // II级（中等）
  'III': 1.15,   // III级（复杂）
  'IV': 1.3      // IV级（特别复杂）
};

// 场地复杂程度附加调整系数
const surveySiteCoefficients = {
  'I': 0.8,     // I级（简单）
  'II': 1.0,     // II级（中等）
  'III': 1.2,    // III级（复杂）
  'IV': 1.3      // IV级（特别复杂）
};

// 常见附加调整系数
const surveyAdditionalCoefficients = {
  'stages': 1.1,         // 分阶段完成（可研勘察+初勘+详勘）
  'coordination': 1.15,  // 两个以上咨询方，主体协调
  'municipal': 1.3,      // 市政工程
  'night': 1.2           // 夜间作业
};

module.exports = {
  surveyBasePrices,
  surveyComplexityCoefficients,
  surveySiteCoefficients,
  surveyAdditionalCoefficients
};
