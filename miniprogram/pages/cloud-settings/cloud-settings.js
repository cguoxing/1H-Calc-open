const { onGoHome } = require("../../utils/goHome");
const account = require('../../utils/cloud-account.js');
const serverBackup = require('../../utils/server-backup.js');
const app = getApp();

Page({
  onGoHome,
  data: {
    cloudReady: false,
    envId: '',
    // 账户信息
    hasAccount: false,
    accountName: '',
    accountInitial: '',
    accountPhone: '',
    accountCompany: '',
    accountPosition: '',
    accountEmail: '',
    maskedOpenid: '',
    registeredAt: ''
  },

  onShow: function () {
    this.refreshView();
  },

  // 刷新视图数据
  refreshView: function () {
    const cloudReady = app.globalData.cloudReady || false;
    const envId = app.globalData.cloudEnvId || '';
    const local = account.getLocalAccount();

    if (local && local.openid) {
      const name = local.name || '';
      this.setData({
        cloudReady,
        envId,
        hasAccount: true,
        accountName: name,
        accountInitial: name ? name.charAt(0).toUpperCase() : 'U',
        accountPhone: local.phone || '',
        accountCompany: local.company || '',
        accountPosition: local.position || '',
        accountEmail: local.email || '',
        maskedOpenid: account.maskOpenid(local.openid),
        registeredAt: this.formatDate(local.registeredAt)
      });
    } else {
      this.setData({
        cloudReady,
        envId,
        hasAccount: false,
        accountName: '',
        accountInitial: '',
        accountPhone: '',
        accountCompany: '',
        accountPosition: '',
        accountEmail: '',
        maskedOpenid: '',
        registeredAt: ''
      });
    }
  },

  // 格式化日期
  formatDate: function (iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch (e) {
      return '';
    }
  },

  // 填写/更新本地账户
  onTapRegister: function () {
    wx.navigateTo({ url: '/pages/register/register' });
  },

  // 查看本机账户。未启用账户同步时不再尝试远程登录。
  onTapLogin: function () {
    if (!this.data.cloudReady) {
      wx.showModal({
        title: '本机账户',
        content: '当前账户信息保存在本机。需要恢复数据时，请使用服务器备份功能。',
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }
    wx.showLoading({ title: '查询账户...', mask: true });
    account.fetchCloudProfile()
      .then((res) => {
        wx.hideLoading();
        if (res.registered) {
          this.refreshView();
          wx.showToast({ title: '登录成功', icon: 'success' });
        } else {
          wx.showModal({
            title: '未找到账户',
            content: '当前微信尚未注册云端账户，是否前往注册？',
            confirmText: '去注册',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.navigateTo({ url: '/pages/register/register' });
              }
            }
          });
        }
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showModal({
          title: '登录失败',
          content: err.message || '请稍后重试',
          showCancel: false,
          confirmText: '知道了'
        });
      });
  },

  // 编辑账户信息
  onTapEdit: function () {
    wx.navigateTo({ url: '/pages/register/register' });
  },

  // 退出登录
  onTapLogout: function () {
    wx.showModal({
      title: '退出登录',
      content: '退出后本机账户信息将被清除，项目和计算历史不受影响。',
      confirmText: '退出',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          account.clearLocalAccount();
          this.refreshView();
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  },

  // 注销账户：删除服务器上的备份，再清除本机账户（停止后续备份）
  onTapDeleteAccount: function () {
    wx.showModal({
      title: '注销并删除云端备份',
      content: '将删除服务器上保存的您的全部备份，并清除本机账户信息，之后不再自动备份。本机的项目和计算历史保留。此操作不可恢复，确定继续？',
      confirmText: '注销',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...', mask: true });
        serverBackup.deleteRemoteBackup()
          .then(() => {
            wx.hideLoading();
            account.clearLocalAccount();
            this.refreshView();
            wx.showToast({ title: '已注销并删除', icon: 'success' });
          })
          .catch((err) => {
            wx.hideLoading();
            wx.showModal({
              title: '删除失败',
              content: (err && err.message ? err.message : '网络异常') + '。账户未注销，请稍后重试或联系 info@1h-arch.com。',
              showCancel: false,
              confirmText: '知道了'
            });
          });
      }
    });
  },

  // 兼容旧入口
  promptConfigureCloud: function () {
    wx.showModal({
      title: '数据保存',
      content: '当前版本优先使用本机保存，并通过服务器备份保护数据。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  onShareAppMessage: function () {
    return {
      title: '易计算 - 工程设计收费报价系统',
      path: '/pages/index/index'
    };
  }
});
