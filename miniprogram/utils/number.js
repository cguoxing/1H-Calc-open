// 数值输入工具：只在“未填写或无法解析”时使用默认值，用户明确填 0 时保留 0。

function toNumber(value, fallback) {
  if (value === '' || value === null || value === undefined) return fallback;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

// 校验收费比例（%）和税率（%），返回错误提示；合法时返回空字符串
function validateRates(discount, taxRate) {
  if (!Number.isFinite(discount) || discount <= 0) return '收费比例需大于 0';
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate >= 100) return '税率需在 0~100 之间';
  return '';
}

module.exports = { toNumber, validateRates };
