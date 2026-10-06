const USAGE_KEY = 'yicalc_usage_count';

function getUsageCount() {
  try {
    return Number(wx.getStorageSync(USAGE_KEY)) || 0;
  } catch (e) {
    return 0;
  }
}

function incrementUsageCount() {
  const next = getUsageCount() + 1;
  try {
    wx.setStorageSync(USAGE_KEY, next);
  } catch (e) {
    // 计数失败不影响计算结果生成
  }
  return next;
}

module.exports = {
  USAGE_KEY,
  getUsageCount,
  incrementUsageCount
};
