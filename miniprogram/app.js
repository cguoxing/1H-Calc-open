const { APP_VERSION } = require('./utils/app-version.js');

App({
  onLaunch: function () {
    const ENABLE_MOCK_HISTORY_ON_FIRST_LAUNCH = false;

    // ==========================================
    // 云开发配置（默认关闭）
    // ==========================================
    // 第一步：在微信公众平台 mp.weixin.qq.com 注册小程序
    // 易计算数据量很小，默认使用本地缓存模式，避免 CloudBase 固定月费。
    // 如果以后需要恢复 CloudBase，同步填写环境 ID 并部署云函数即可。
    // ==========================================
    const CLOUD_ENV_ID = '';

    // 云环境是否已配置
    const isCloudConfigured = !!CLOUD_ENV_ID;

    if (wx.cloud && isCloudConfigured) {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true
      });
      this.globalData.cloudReady = true;
      this.globalData.cloudEnvId = CLOUD_ENV_ID;
    } else {
      this.globalData.cloudReady = false;
      this.globalData.cloudEnvId = '';
    }

    // 读取本地缓存的账户
    this.globalData.cloudAccount = wx.getStorageSync('yicalc_cloud_account') || null;

    // Demo history stays behind an explicit switch so fresh installs start clean.
    const historyKey = 'yicalc_history';
    let history = wx.getStorageSync(historyKey);
    if (!history && ENABLE_MOCK_HISTORY_ON_FIRST_LAUNCH) {
      this.resetToMockHistory();
    } else if (!history) {
      wx.setStorageSync(historyKey, []);
    }

    this.globalData.appEdition = wx.getStorageSync('yicalc_app_edition') || 'all';
    this.globalData.appVersion = APP_VERSION;

    // 非阻塞后台备份：延后执行，避免影响小程序首屏和底部栏切换。
    setTimeout(() => {
      this.runSilentBackup();
      this.startSilentBackupTimer();
    }, 1500);

    this.checkForAppUpdate({ silent: true });
  },

  onShow: function () {
    this.runSilentBackup();
    this.startSilentBackupTimer();
  },

  runSilentBackup: function () {
    try {
      const serverBackup = require('./utils/server-backup.js');
      serverBackup.autoBackupSilently();
    } catch (e) {
      // 自动备份必须无感，异常只保留在开发者控制台。
      console.warn('自动备份初始化失败:', e);
    }
  },

  startSilentBackupTimer: function () {
    if (this.globalData.backupTimer) return;
    try {
      const serverBackup = require('./utils/server-backup.js');
      const interval = serverBackup.isConfigured() ? 10 * 60 * 1000 : 0;
      if (!interval) return;
      this.globalData.backupTimer = setInterval(() => {
        this.runSilentBackup();
      }, interval);
    } catch (e) {
      console.warn('自动备份定时器初始化失败:', e);
    }
  },

  checkForAppUpdate: function (options = {}) {
    const silent = !!options.silent;
    if (!wx.getUpdateManager) {
      if (!silent) {
        wx.showToast({ title: `当前版本 v${APP_VERSION}`, icon: 'none' });
      }
      return;
    }

    if (this.globalData.updateManagerBound) {
      if (!silent) {
        if (this.globalData.updateReady && this.globalData.updateManager) {
          this.promptApplyUpdate(this.globalData.updateManager);
        } else if (this.globalData.updateCheckComplete && this.globalData.hasNewVersion) {
          wx.showToast({ title: '新版本下载中，请稍候', icon: 'none' });
        } else if (this.globalData.updateCheckComplete) {
          wx.showToast({ title: '已是最新版本', icon: 'success' });
        } else {
          wx.showToast({ title: '正在检查更新', icon: 'none' });
        }
      }
      return;
    }

    try {
      const updateManager = wx.getUpdateManager();
      this.globalData.updateManager = updateManager;
      this.globalData.updateManagerBound = true;
      updateManager.onCheckForUpdate((res) => {
        const hasUpdate = !!(res && res.hasUpdate);
        this.globalData.updateCheckComplete = true;
        this.globalData.hasNewVersion = hasUpdate;
        if (hasUpdate && !silent) {
          wx.showToast({ title: '新版本下载中，请稍候', icon: 'none' });
        } else if (!hasUpdate && !silent) {
          wx.showToast({ title: '已是最新版本', icon: 'success' });
        }
      });

      updateManager.onUpdateReady(() => {
        this.globalData.updateReady = true;
        this.promptApplyUpdate(updateManager);
      });

      updateManager.onUpdateFailed(() => {
        if (!silent) {
          wx.showModal({
            title: '更新失败',
            content: '新版本下载失败，请稍后重试或重新打开小程序。',
            showCancel: false,
            confirmText: '知道了'
          });
        }
      });
    } catch (e) {
      if (!silent) {
        wx.showToast({ title: `当前版本 v${APP_VERSION}`, icon: 'none' });
      }
    }
  },

  promptApplyUpdate: function (updateManager) {
    if (this.globalData.updatePromptOpen) return;
    this.globalData.updatePromptOpen = true;
    wx.showModal({
      title: '发现新版本',
      content: '易计算新版本已准备好，是否立即重启并更新到最新版本？',
      confirmText: '立即更新',
      cancelText: '稍后',
      complete: () => {
        this.globalData.updatePromptOpen = false;
      },
      success: (modalRes) => {
        if (modalRes.confirm && updateManager && updateManager.applyUpdate) {
          updateManager.applyUpdate();
        }
      }
    });
  },

  getMockHistory: function () {
    return [
      {
        id: 1,
        name: '某市城市更新项目 · 建筑设计',
        stage: 'F4',
        stageName: '工程设计',
        meta: '今天 14:30',
        amount: '286.50万',
        color: '#007AFF',
        docs: [
          { name: '城市更新项目报价单.pdf', meta: '今天 14:35 · 2.3 MB', color: '#007AFF' },
          { name: '城市更新计算明细表.pdf', meta: '今天 14:38 · 1.1 MB', color: '#007AFF' }
        ],
        calcDetail: {
          cost: 5000,
          basePrice: 249.6,
          specialtyCoef: 1.0,
          specialtyName: '建筑',
          complexityCoef: 1.15,
          complexityName: 'I级',
          netAdditionalCoef: 1.0,
          total: 286.50,
          extraDetails: [],
          discount: 100,
          taxRate: 0,
          interpolationDetail: {
            formula: '249.60 万元 (静态基价)',
            steps: '城市更新项目建筑设计费计算结果明细'
          }
        }
      },
      {
        id: 2,
        name: '某区老旧小区改造 · 市政设计',
        stage: 'F4',
        stageName: '工程设计',
        meta: '今天 10:15',
        amount: '158.20万',
        color: '#34C759',
        docs: [
          { name: '老旧小区改造计算书.pdf', meta: '今天 10:20 · 1.8 MB', color: '#34C759' }
        ],
        calcDetail: {
          cost: 3000,
          basePrice: 158.20,
          specialtyCoef: 1.0,
          specialtyName: '市政',
          complexityCoef: 1.0,
          complexityName: 'II级',
          netAdditionalCoef: 1.0,
          total: 158.20,
          extraDetails: [],
          discount: 100,
          taxRate: 0,
          interpolationDetail: {
            formula: '158.20 万元 (静态基价)',
            steps: '市政设计费计算结果明细'
          }
        }
      },
      {
        id: 3,
        name: '某产业园区 · 岩土勘察',
        stage: 'F3',
        stageName: '工程勘察',
        meta: '昨天 16:42',
        amount: '89.60万',
        color: '#FF9500',
        docs: [
          { name: '产业园区勘察报告.pdf', meta: '昨天 16:45 · 3.1 MB', color: '#FF9500' },
          { name: '勘察费用明细表.pdf', meta: '昨天 16:48 · 0.9 MB', color: '#FF9500' }
        ],
        calcDetail: {
          cost: 1200,
          basePrice: 89.60,
          netAdditionalCoef: 1.0,
          total: 89.60,
          discount: 100,
          taxRate: 0,
          interpolationDetail: {
            formula: '89.60 万元 (静态基价)',
            steps: '勘察费收费明细'
          }
        }
      },
      {
        id: 4,
        name: '某新区 · 全过程造价咨询',
        stage: 'F5',
        stageName: '造价咨询',
        meta: '昨天 09:20',
        amount: '320.00万',
        color: '#AF52DE',
        docs: [
          { name: '全过程造价咨询报价单.pdf', meta: '6月11日 · 2.0 MB', color: '#AF52DE' }
        ],
        calcDetail: {
          cost: 8000,
          basePrice: 320.00,
          netAdditionalCoef: 1.0,
          total: 320.00,
          discount: 100,
          taxRate: 0,
          interpolationDetail: {
            formula: '320.00 万元 (静态基价)',
            steps: '造价咨询收费明细'
          }
        }
      },
      {
        id: 5,
        name: '某水厂 · 可行性研究报告',
        stage: 'F1',
        stageName: '前期决策',
        meta: '6月12日',
        amount: '45.30万',
        color: '#5AC8FA',
        docs: [
          { name: '可研报告设计费计算书.pdf', meta: '6月10日 · 1.5 MB', color: '#5AC8FA' }
        ],
        calcDetail: {
          cost: 20000,
          basePrice: 45.30,
          netAdditionalCoef: 1.0,
          total: 45.30,
          discount: 100,
          taxRate: 0,
          interpolationDetail: {
            formula: '45.30 万元 (静态基价)',
            steps: '可行性研究报告编制收费明细'
          }
        }
      }
    ];
  },

  resetToMockHistory: function () {
    const historyKey = 'yicalc_history';
    const mock = this.getMockHistory();
    wx.setStorageSync(historyKey, mock);
    return mock;
  },

  globalData: {
    historyKey: 'yicalc_history',
    targetStage: '',
    targetSpecialty: '',
    targetCost: '',
    targetProjectName: '',
    targetArea: '',
    fromSmart: false,
    activeProjectId: 0,
    activeDraftItemId: 0,
    unit: '万元',
    precision: 2,
    appEdition: 'all',
    appVersion: APP_VERSION,
    cloudReady: false,
    backupTimer: null,
    updateManager: null,
    updateManagerBound: false,
    updateCheckComplete: false,
    hasNewVersion: false,
    updateReady: false,
    updatePromptOpen: false
  }
});
