// 全局方法：点击 LOGO/品牌名返回首页
// Page({}) 不支持 behaviors，使用普通模块导出
function onGoHome() {
  wx.switchTab({ url: '/pages/index/index' });
}

module.exports = { onGoHome };
