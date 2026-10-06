/**
 * 西部数码虚拟主机备份配置
 *
 * 部署 west-host-backup/api.php 后再填写。
 * 注意：小程序端代码会被反编译看到，这里绝不能放任何密钥。
 * 鉴权方式：每次备份调用 wx.login 获取一次性 code，由服务端换取 openid。
 */

module.exports = {
  enabled: true,
  apiUrl: 'https://www.1h-arch.com/yicalc-backup/api.php?action=backup',
  deviceId: '1h-arch',
  // 数据有变化才上传；数据没变时只做低频心跳，确认服务器备份仍在
  heartbeatMs: 24 * 60 * 60 * 1000
};
