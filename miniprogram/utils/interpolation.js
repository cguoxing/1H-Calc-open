/**
 * 高精度直线内插法
 * 
 * 公式: Y = Y1 + (X - X1) * (Y2 - Y1) / (X2 - X1)
 * 
 * @param {number} x - 计费额 (万元)
 * @param {Array} table - 基价表 [{value: 计费额, price: 基价}]
 * @param {number} overLimitRatio - 超过最大档时的比例 (默认 1.6%)
 * @returns {Object} { price: 计算得到的基价(万元), formula: 公式文字描述, steps: 计算步骤说明 }
 */
function interpolate(x, table, overLimitRatio = 0.016) {
  if (x <= 0) {
    return {
      price: 0,
      formula: "0.00 万元",
      steps: "计费额小于等于0，基价为0"
    };
  }

  const len = table.length;
  const minLimit = table[0].value;
  const maxLimit = table[len - 1].value;

  // 1. 小于最小档 (0 < x < minLimit) - 从 (0,0) 到 (minLimit, Y1) 内插，相当于比例 9.0 / 200 = 4.5%
  if (x < minLimit) {
    const y1 = table[0].price;
    const price = x * (y1 / minLimit);
    const rate = ((y1 / minLimit) * 100).toFixed(2);
    return {
      price: parseFloat(price.toFixed(4)),
      formula: `${x.toFixed(2)} × ${rate}% = ${price.toFixed(2)} 万元`,
      steps: `计费额 ${x.toFixed(2)} 万元低于最小限额 ${minLimit} 万元，按 0 至 ${minLimit} 万元区间内插（费率约 ${rate}%）`
    };
  }

  // 2. 大于最大档 (x > maxLimit) - 采用 overLimitRatio 计取 (默认 1.6%)
  if (x > maxLimit) {
    const price = x * overLimitRatio;
    return {
      price: parseFloat(price.toFixed(4)),
      formula: `${x.toFixed(2)} × ${(overLimitRatio * 100).toFixed(2)}% = ${price.toFixed(2)} 万元`,
      steps: `计费额 ${x.toFixed(2)} 万元超过最大限制 ${maxLimit} 万元，按超额固定费率 ${(overLimitRatio * 100).toFixed(2)}% 计取`
    };
  }

  // 3. 落在区间内 - 寻找区间并进行直线内插
  for (let i = 0; i < len - 1; i++) {
    const x1 = table[i].value;
    const y1 = table[i].price;
    const x2 = table[i + 1].value;
    const y2 = table[i + 1].price;

    if (x >= x1 && x <= x2) {
      if (x === x1) return {
        price: y1,
        formula: `${y1.toFixed(2)} 万元`,
        steps: `计费额刚好等于基价档位 ${x1} 万元，直接取基价 ${y1} 万元`
      };
      if (x === x2) return {
        price: y2,
        formula: `${y2.toFixed(2)} 万元`,
        steps: `计费额刚好等于基价档位 ${x2} 万元，直接取基价 ${y2} 万元`
      };

      const price = y1 + (x - x1) * (y2 - y1) / (x2 - x1);
      const formula = `${y1.toFixed(2)} + (${x.toFixed(2)} - ${x1}) × (${y2.toFixed(2)} - ${y1.toFixed(2)}) / (${x2} - ${x1}) = ${price.toFixed(2)} 万元`;
      const steps = `计费额 ${x.toFixed(2)} 万元处于 [${x1}, ${x2}] 区间内。\n` +
                    `公式: ${y1} + (计费额 - ${x1}) * (${y2} - ${y1}) / (${x2} - ${x1})\n` +
                    `计算过程: ${y1} + (${x.toFixed(2)} - ${x1}) * ${(y2 - y1).toFixed(2)} / ${x2 - x1} = ${price.toFixed(2)} 万元`;
      
      return {
        price: parseFloat(price.toFixed(4)),
        formula,
        steps
      };
    }
  }

  return { price: 0, formula: "0.00 万元", steps: "计算异常" };
}

module.exports = {
  interpolate
};
