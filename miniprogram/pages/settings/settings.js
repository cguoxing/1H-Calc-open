const { onGoHome } = require("../../utils/goHome");
const { USAGE_KEY, getUsageCount } = require('../../utils/usage-counter.js');
const { getProjectList } = require('../../utils/project-manager.js');
const { generateProjectListPDF } = require('../../utils/project-list-pdf.js');
const { APP_VERSION } = require('../../utils/app-version.js');
const account = require('../../utils/cloud-account.js');
const serverBackup = require('../../utils/server-backup.js');
const app = getApp();

// 默认用户信息
const DEFAULT_PROFILE = {
  name: '',
  phone: ''
};

const EDITION_KEY = 'yicalc_app_edition';
const EDITIONS = [
  { value: 'all', label: '工程全能专家版' },
  { value: 'interior', label: '旗舰版(室内|庭园|视觉|声学)' }
];

Page({
  onGoHome,
  data: {
    edition: 'all',
    editionName: '工程全能专家版',
    unit: '万元',
    precision: 2,
    historyCount: 0,
    projectCount: 0,
    storageSize: '',
    version: APP_VERSION,
    cloudReady: false,
    backupConfigured: false,
    // 文档服务等级（钻石后数字，Lv1~Lv9 代表使用积极性）
    // 阈值：新用户=1，≥10=2，≥50=3，≥100=4，≥200=5，≥500=6，≥1000=7，≥2000=8，≥5000=9
    usageCount: 0,
    serviceLevel: 1,
    serviceActive: false,
    // 用户信息
    profileName: DEFAULT_PROFILE.name,
    profilePhone: DEFAULT_PROFILE.phone,
    profileInitial: '易',
    // 编辑面板
    showProfileEdit: false,
    editName: '',
    editPhone: '',
    editInitial: '易'
  },

  getProfileInitial: function (name) {
    const text = (name || '').trim();
    if (!text) return '易';
    return text.slice(0, 1).toUpperCase();
  },

  // 根据使用次数计算等级 Lv1~Lv9
  calcServiceLevel: function (count) {
    const thresholds = [0, 10, 50, 100, 200, 500, 1000, 2000, 5000];
    let level = 1;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (count >= thresholds[i]) { level = i + 1; break; }
    }
    return Math.min(level, 9);
  },

  // 点击等级标签：说明等级规则；未注册时引导注册
  onTapChip: function () {
    const thresholds = [0, 10, 50, 100, 200, 500, 1000, 2000, 5000];
    const level = this.data.serviceLevel || 1;
    const next = level < 9 ? thresholds[level] : 0;
    const progress = next
      ? `再计算 ${Math.max(next - (this.data.usageCount || 0), 0)} 次可升至 Lv.${level + 1}。`
      : '已达到最高等级。';
    const registered = !!this.data.serviceActive;
    wx.showModal({
      title: `服务等级 Lv.${level}`,
      content: `累计计算 ${this.data.usageCount || 0} 次，${progress}${registered ? '' : '\n注册账户后可开启数据备份。'}`,
      confirmText: registered ? '知道了' : '去注册',
      showCancel: !registered,
      cancelText: '稍后',
      success: (res) => {
        if (!registered && res.confirm) {
          wx.navigateTo({ url: '/pages/register/register' });
        }
      }
    });
  },

  onShow: function () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
    }
    const history = wx.getStorageSync(app.globalData.historyKey) || [];
    const projects = wx.getStorageSync('yicalc_projects') || [];
    
    // 优先读取云账户，兼容旧版本地缓存
    const local = account.getLocalAccount();
    const legacyProfile = wx.getStorageSync('yicalc_user_profile') || null;
    const profile = local ? {
      name: local.name || '',
      phone: local.phone || ''
    } : (legacyProfile || DEFAULT_PROFILE);
    
    const edition = wx.getStorageSync(EDITION_KEY) || 'all';
    const editionItem = EDITIONS.find(item => item.value === edition) || EDITIONS[0];
    let usage = getUsageCount();
    if (!wx.getStorageSync(USAGE_KEY) && history.length > 0) {
      usage = history.length;
      wx.setStorageSync(USAGE_KEY, usage);
    }
    const level = this.calcServiceLevel(usage);
    const phone = profile.phone || '';

    this.setData({
      edition: editionItem.value,
      editionName: editionItem.label,
      unit: app.globalData.unit || '万元',
      precision: app.globalData.precision !== undefined ? app.globalData.precision : 2,
      historyCount: history.length,
      projectCount: projects.length,
      cloudReady: app.globalData.cloudReady || false,
      backupConfigured: serverBackup.isConfigured(),
      version: app.globalData.appVersion || APP_VERSION,
      profileName: profile.name || '',
      profilePhone: phone,
      profileInitial: this.getProfileInitial(profile.name),
      usageCount: usage,
      serviceLevel: level,
      serviceActive: !!phone
    });

    this.calcStorageSize();
  },

  formatDateTime: function (iso) {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch (e) {
      return '';
    }
  },

  // 计算存储占用
  calcStorageSize: function () {
    try {
      const info = wx.getStorageInfoSync();
      const kb = (info.currentSize || 0).toFixed(1);
      const limit = (info.limitSize || 10240);
      this.setData({
        storageSize: `${kb} KB / ${(limit / 1024).toFixed(0)} MB`
      });
    } catch (e) {
      this.setData({ storageSize: '未知' });
    }
  },

  // 版本设置
  onTapEditionSettings: function () {
    wx.showActionSheet({
      itemList: EDITIONS.map(item => item.label),
      success: (res) => {
        const edition = EDITIONS[res.tapIndex] || EDITIONS[0];
        wx.setStorageSync(EDITION_KEY, edition.value);
        app.globalData.appEdition = edition.value;
        app.globalData.targetStage = '';
        app.globalData.targetSpecialty = '';
        app.globalData.targetCost = '';
        app.globalData.targetArea = '';
        app.globalData.targetProjectName = '';
        app.globalData.fromSmart = false;
        app.globalData.toolsActiveCategory = '';
        this.setData({
          edition: edition.value,
          editionName: edition.label
        });
        const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
        if (tabBar && typeof tabBar.refreshEdition === 'function') {
          tabBar.refreshEdition();
        }
        wx.showToast({ title: '版本已切换', icon: 'success' });
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index',
            fail: () => wx.reLaunch({ url: '/pages/index/index' })
          });
        }, 350);
      }
    });
  },

  // 用户中心 → 打开编辑面板
  onTapUserCenter: function () {
    this.setData({
      showProfileEdit: true,
      editName: this.data.profileName,
      editPhone: this.data.profilePhone,
      editInitial: this.getProfileInitial(this.data.profileName)
    });
  },

  // 关闭编辑面板
  onCloseProfileEdit: function () {
    this.setData({ showProfileEdit: false });
  },

  // 姓名输入
  onNameInput: function (e) {
    const name = e.detail.value;
    this.setData({
      editName: name,
      editInitial: this.getProfileInitial(name)
    });
  },

  // 电话输入
  onPhoneInput: function (e) {
    this.setData({ editPhone: e.detail.value });
  },

  // 保存用户信息
  onSaveProfile: function () {
    const name = (this.data.editName || '').trim();
    const phone = (this.data.editPhone || '').trim();

    if (!name) {
      wx.showToast({ title: '请输入用户名', icon: 'none' });
      return;
    }
    if (phone && !account.isValidPhone(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }

    const saveAction = () => {
      this.setData({
        profileName: name,
        profilePhone: phone,
        profileInitial: this.getProfileInitial(name),
        showProfileEdit: false,
        serviceActive: !!phone
      });
      wx.showToast({ title: '信息已保存', icon: 'success' });
    };

    if (app.globalData.cloudReady) {
      wx.showLoading({ title: '保存中...', mask: true });
      account.registerAccount({ name, phone })
        .then(() => {
          wx.hideLoading();
          wx.setStorageSync('yicalc_user_profile', { name, phone });
          saveAction();
        })
        .catch(err => {
          wx.hideLoading();
          console.error('云端资料保存失败，已降级本地保存:', err);
          account.setLocalAccount({
            openid: 'local',
            name,
            phone,
            registeredAt: new Date().toISOString(),
            cachedAt: new Date().toISOString()
          });
          wx.setStorageSync('yicalc_user_profile', { name, phone });
          saveAction();
          wx.showModal({
            title: '已保存到本地',
            content: '云端同步暂时失败，个人资料已保存在本机。',
            showCancel: false
          });
        });
    } else {
      // 本地缓存降级
      account.setLocalAccount({
        openid: 'local',
        name,
        phone,
        registeredAt: new Date().toISOString(),
        cachedAt: new Date().toISOString()
      });
      wx.setStorageSync('yicalc_user_profile', { name, phone });
      saveAction();
    }
  },

  // 订单历史
  onTapOrders: function () {
    wx.showModal({
      title: '订单历史',
      content: '支付功能正在三期规划中，敬请期待。',
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 单位设置
  onTapUnitSettings: function () {
    const items = [
      '万元 / 精确到2位（推荐）',
      '万元 / 精确到3位',
      '元 / 精确到2位',
      '元 / 精确到0位'
    ];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        let unit = '万元';
        let precision = 2;
        if (res.tapIndex === 0) { unit = '万元'; precision = 2; }
        else if (res.tapIndex === 1) { unit = '万元'; precision = 3; }
        else if (res.tapIndex === 2) { unit = '元'; precision = 2; }
        else if (res.tapIndex === 3) { unit = '元'; precision = 0; }

        app.globalData.unit = unit;
        app.globalData.precision = precision;
        this.setData({ unit, precision });

        wx.showToast({ title: '设置已保存', icon: 'success' });
      }
    });
  },

  // 账户与数据备份：注册信息、退出登录、注销并删除云端备份
  onTapAccountSettings: function () {
    wx.navigateTo({ url: '/pages/cloud-settings/cloud-settings' });
  },

  // 清除缓存
  onTapClearCache: function () {
    wx.showActionSheet({
      itemList: ['清除计算历史', '清除所有项目', '清除全部数据'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '清除计算历史',
            content: '确认清除所有计算历史记录吗？项目数据不受影响。',
            confirmColor: '#FF3B30',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.removeStorageSync(app.globalData.historyKey);
                this.setData({ historyCount: 0 });
                wx.showToast({ title: '历史已清除', icon: 'success' });
              }
            }
          });
        } else if (res.tapIndex === 1) {
          wx.showModal({
            title: '清除所有项目',
            content: '确认清除所有项目及子项数据吗？此操作不可恢复。',
            confirmColor: '#FF3B30',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.removeStorageSync('yicalc_projects');
                this.setData({ projectCount: 0 });
                wx.showToast({ title: '项目已清除', icon: 'success' });
              }
            }
          });
        } else if (res.tapIndex === 2) {
          wx.showModal({
            title: '清除全部数据',
            content: '将清除所有本地数据（计算历史 + 项目），不可恢复。确定继续？',
            confirmColor: '#FF3B30',
            success: (modalRes) => {
              if (modalRes.confirm) {
                const usageCount = getUsageCount();
                wx.clearStorageSync();
                wx.setStorageSync(USAGE_KEY, usageCount);
                this.setData({ historyCount: 0, projectCount: 0, usageCount, serviceLevel: this.calcServiceLevel(usageCount), storageSize: '0 KB' });
                wx.showToast({ title: '全部数据已清除', icon: 'success' });
              }
            }
          });
        }
      }
    });
  },

  // 导出项目列表 PDF
  onTapExportData: function () {
    wx.showLoading({ title: '正在生成PDF...' });

    try {
      const history = wx.getStorageSync(app.globalData.historyKey) || [];
      const projects = getProjectList();
      const usageCount = getUsageCount();
      const itemCount = projects.reduce((sum, item) => sum + Number(item.itemCount || 0), 0);
      const totalFee = projects.reduce((sum, item) => sum + Number(item.totalFee || 0), 0);

      generateProjectListPDF(projects, {
        summary: {
          projectCount: projects.length,
          itemCount,
          totalFee,
          usageCount
        }
      }).then((arrayBuffer) => {
        const fs = wx.getFileSystemManager();
        const date = new Date();
        const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
        const filePath = `${wx.env.USER_DATA_PATH}/yicalc_project_list_${dateStr}_${Date.now()}.pdf`;
        fs.writeFileSync(filePath, arrayBuffer);

        const readBack = fs.readFileSync ? fs.readFileSync(filePath) : arrayBuffer;
        const byteLength = readBack && readBack.byteLength ? readBack.byteLength : 0;
        if (byteLength < 1000) {
          throw new Error('PDF文件为空');
        }

        wx.hideLoading();
        wx.openDocument({
          filePath,
          fileType: 'pdf',
          showMenu: true,
          success: () => {},
          fail: () => {
            wx.showModal({
              title: 'PDF已生成',
              content: `已生成项目列表PDF，包含 ${history.length} 条历史记录和 ${projects.length} 个项目。可通过文件菜单保存或转发。`,
              showCancel: false,
              confirmText: '知道了'
            });
          }
        });
      }).catch((err) => {
        wx.hideLoading();
        console.error('导出项目列表PDF失败:', err);
        wx.showToast({ title: '导出失败，请重试', icon: 'none' });
      });
    } catch (err) {
      wx.hideLoading();
      console.error('导出项目列表PDF失败:', err);
      wx.showToast({ title: '导出失败，请重试', icon: 'none' });
    }
  },

  // 数据导入
  onTapImportData: function () {
    wx.showModal({
      title: '数据导入',
      content: '请通过微信聊天发送之前导出的 JSON 备份文件到小程序，或从聊天记录中选择文件打开。\n\n当前版本支持通过"用其他应用打开"方式导入。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 检查更新
  onTapCheckUpdate: function () {
    if (app && typeof app.checkForAppUpdate === 'function') {
      app.checkForAppUpdate({ silent: false });
    } else {
      wx.showToast({ title: `当前版本 v${APP_VERSION}`, icon: 'none' });
    }
  },

  // 联系我们
  onTapContactUs: function () {
    wx.showModal({
      title: '联系我们',
      content: '客服电话：13601968021\n微信支持：Arch1H\n邮箱：info@1h-arch.com',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  // 问题反馈
  onTapFeedback: function () {
    wx.showModal({
      title: '问题反馈',
      content: '请描述您遇到的问题，我们将尽快处理。\n\n邮箱：info@1h-arch.com\n微信：Arch1H',
      showCancel: false,
      confirmText: '好的'
    });
  },

  // 关于我们
  onTapAbout: function () {
    wx.showModal({
      title: '关于易计算',
      content: `版本：v${app.globalData.appVersion || APP_VERSION}\n\n易计算 · 工程设计收费报价系统\n覆盖工程全生命周期取费计算\n\n© 2026 1+H ARCH\n保留所有权利`,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 更多工具
  onTapArchTools: function () {
    wx.showModal({
      title: '1+H ARCH 工具箱',
      content: '更多建筑行业工具正在开发中，敬请期待。',
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 社交媒体点击复制
  onTapSocial: function (e) {
    const platform = e.currentTarget.dataset.platform;
    const handles = {
      wechat: { name: '微信公众号', handle: 'ARCH_1H', desc: '微信搜索并关注官方公众号' },
      xiaohongshu: { name: '小红书', handle: 'Arch1H', desc: '小红书搜索并关注官方账号' },
      weibo: { name: '新浪微博', handle: 'ARCH_1H', desc: '微博搜索并关注官方账号' },
      instagram: { name: 'Instagram', handle: 'Arch1H', desc: '在 Instagram 搜索并关注官方账号' },
      facebook: { name: 'Facebook', handle: 'Arch1H', desc: '在 Facebook 搜索并关注官方账号' }
    };

    const info = handles[platform];
    if (!info) return;

    wx.setClipboardData({
      data: info.handle,
      success: function () {
        wx.showModal({
          title: `已复制${info.name}官方账号`,
          content: `官方账号：“${info.handle}”已成功复制到剪贴板。\n\n${info.desc}。`,
          showCancel: false,
          confirmText: '好的'
        });
      }
    });
  },

  // 分享
  onShareAppMessage: function () {
    return {
      title: '易计算 - 工程设计收费报价系统',
      path: '/pages/index/index'
    };
  }
});
