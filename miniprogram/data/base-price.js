/**
 * 工程设计收费基价表（万元）
 * 来源：计价格[2002]10号《工程勘察设计收费标准》
 * 附表一：工程设计收费基价表
 * 计费额单位为万元，基价=各档对应设计收费
 * 计费额 > 2000000 万元时，收费基价 = 计费额 × 1.6%
 */
const basePriceTable = [
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

module.exports = {
  basePriceTable,
  // 计费额 > 2000000 万元时，按 1.6% 计算（计价格[2002]10号 附表一注）
  overLimitRatio: 0.016
};
