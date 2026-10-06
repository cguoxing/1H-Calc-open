const { onGoHome } = require("../../utils/goHome");
const account = require('../../utils/cloud-account.js');
const app = getApp();

Page({
  onGoHome,
  data: {
    cloudReady: false,
    submitting: false,
    formName: '',
    formPhone: '',
    formCompany: '',
    formPosition: '',
    formEmail: '',
    agreed: false
  },

  onLoad: function () {
    // 预填：若本地已有账户，带入旧值便于更新
    const local = account.getLocalAccount();
    this.setData({
      cloudReady: app.globalData.cloudReady || false,
      formName: local ? local.name || '' : '',
      formPhone: local ? local.phone || '' : '',
      formCompany: local ? local.company || '' : '',
      formPosition: local ? local.position || '' : '',
      formEmail: local ? local.email || '' : ''
    });
  },

  onNameInput: function (e) { this.setData({ formName: e.detail.value }); },
  onPhoneInput: function (e) { this.setData({ formPhone: e.detail.value }); },
  onCompanyInput: function (e) { this.setData({ formCompany: e.detail.value }); },
  onPositionInput: function (e) { this.setData({ formPosition: e.detail.value }); },
  onEmailInput: function (e) { this.setData({ formEmail: e.detail.value }); },
  onAgreementChange: function (e) {
    const values = e.detail.value || [];
    this.setData({ agreed: values.indexOf('agreed') !== -1 });
  },

  onTapUserAgreement: function () {
    wx.showModal({
      title: '用户服务协议',
      content: '易计算用于工程设计收费测算、记录管理和项目资料整理。您应保证填写的信息真实、合法，并自行核对计算结果后使用。我们会按您主动保存、导入或备份的操作处理本机数据，不会将您的账户信息公开展示。',
      showCancel: false,
      confirmText: '已阅读'
    });
  },

  onTapPrivacyPolicy: function () {
    if (wx.openPrivacyContract) {
      wx.openPrivacyContract({
        fail: () => {
          this.showPrivacyPolicyModal();
        }
      });
      return;
    }
    this.showPrivacyPolicyModal();
  },

  showPrivacyPolicyModal: function () {
    wx.showModal({
      title: '隐私政策',
      content: '1. 收集内容：姓名、手机号（必填），公司、职位、邮箱（选填），以及您的项目与计算记录。\n2. 使用目的：账户识别、项目资料显示，以及数据备份与恢复。\n3. 存储方式：数据默认保存在本机；注册并同意本政策后，会自动备份到运营方服务器（www.1h-arch.com），以微信用户标识区分账户，不出售、不向第三方提供。未注册时不上传任何数据。\n4. 您的权利：可在「账户设置」修改信息、退出登录（停止备份），或「注销并删除云端备份」删除服务器上的全部数据。\n5. 联系我们：info@1h-arch.com',
      showCancel: false,
      confirmText: '已阅读'
    });
  },

  // 提交注册
  onSubmit: function () {
    const name = (this.data.formName || '').trim();
    const phone = (this.data.formPhone || '').trim();
    const company = (this.data.formCompany || '').trim();
    const position = (this.data.formPosition || '').trim();
    const email = (this.data.formEmail || '').trim();

    if (!this.data.agreed) {
      wx.showToast({ title: '请先阅读并同意用户服务协议和隐私政策', icon: 'none' });
      return;
    }

    // 校验
    if (!name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    if (!account.isValidPhone(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    if (!account.isValidEmail(email)) {
      wx.showToast({ title: '邮箱格式不正确', icon: 'none' });
      return;
    }

    // 本地存储模式：不连接 CloudBase，直接保存到本机。
    if (!this.data.cloudReady) {
      this.saveLocalOnly({ name, phone, company, position, email });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '注册中...', mask: true });

    account.registerAccount({ name, phone, company, position, email })
      .then(() => {
        wx.hideLoading();
        this.setData({ submitting: false });
        wx.showToast({ title: '注册成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack({
            fail: () => wx.switchTab({ url: '/pages/settings/settings' })
          });
        }, 800);
      })
      .catch((err) => {
        wx.hideLoading();
        this.setData({ submitting: false });
        wx.showModal({
          title: '注册失败',
          content: err.message || '请稍后重试',
          showCancel: false,
          confirmText: '知道了'
        });
      });
  },

  // 本地存储模式：仅保存到本机
  saveLocalOnly: function (profile) {
    account.setLocalAccount({
      openid: 'local',
      name: profile.name,
      phone: profile.phone,
      company: profile.company,
      position: profile.position,
      email: profile.email,
      registeredAt: new Date().toISOString(),
      privacyAgreedAt: new Date().toISOString(),
      cachedAt: new Date().toISOString()
    });
    wx.showModal({
      title: '已保存',
      content: '账户信息已保存在本机。后续如需跨设备备份，可在主机备份功能中导出或同步数据。',
      showCancel: false,
      confirmText: '知道了',
      success: () => {
        wx.navigateBack({
          fail: () => wx.switchTab({ url: '/pages/settings/settings' })
        });
      }
    });
  },

  onShareAppMessage: function () {
    return {
      title: '易计算 - 工程设计收费报价系统',
      path: '/pages/index/index'
    };
  }
});
