const DEFAULT_LIST = [
  {
    pagePath: '/pages/calc/calc',
    text: '取费计算',
    iconPath: '/images/tab-calc.png',
    selectedIconPath: '/images/tab-calc-active.png'
  },
  {
    pagePath: '/pages/history/history',
    text: '取费历史',
    iconPath: '/images/tab-history.png',
    selectedIconPath: '/images/tab-history-active.png'
  },
  {
    pagePath: '/pages/index/index',
    text: '首页',
    iconPath: '/images/tab-home.png',
    selectedIconPath: '/images/tab-home-active.png'
  },
  {
    pagePath: '/pages/tools/tools',
    text: '工具箱',
    iconPath: '/images/tab-tools.png',
    selectedIconPath: '/images/tab-tools-active.png'
  },
  {
    pagePath: '/pages/settings/settings',
    text: '用户设置',
    iconPath: '/images/tab-settings.png',
    selectedIconPath: '/images/tab-settings-active.png'
  }
];

const INTERIOR_LIST = DEFAULT_LIST.map((item) =>
  item.pagePath === '/pages/calc/calc' ? {
    ...item,
    pagePath: '/pages/specialty-design/specialty-design',
    text: '专项计算'
  } : item
);

function getSafeApp() {
  try {
    return typeof getApp === 'function' ? getApp() : null;
  } catch (error) {
    return null;
  }
}

function getSafeStorage(key, fallback) {
  try {
    if (typeof wx === 'undefined' || typeof wx.getStorageSync !== 'function') {
      return fallback;
    }
    const value = wx.getStorageSync(key);
    return value || fallback;
  } catch (error) {
    return fallback;
  }
}

function getSafePages() {
  try {
    return typeof getCurrentPages === 'function' ? getCurrentPages() : [];
  } catch (error) {
    return [];
  }
}

function callWxApi(name, options) {
  try {
    if (typeof wx !== 'undefined' && typeof wx[name] === 'function') {
      wx[name](options);
    }
  } catch (error) {
    // Component tests can run without navigation APIs.
  }
}

Component({
  data: {
    selected: 0,
    list: DEFAULT_LIST
  },
  lifetimes: {
    attached() {
      this.applyEdition();
    }
  },
  pageLifetimes: {
    show() {
      this.applyEdition();
      this.updateSelected();
    }
  },
  methods: {
    applyEdition() {
      const app = getSafeApp();
      const appEdition = app && app.globalData ? app.globalData.appEdition : 'all';
      const edition = getSafeStorage('yicalc_app_edition', appEdition || 'all');
      this.setData({
        list: edition === 'interior' ? INTERIOR_LIST : DEFAULT_LIST
      });
    },
    refreshEdition() {
      this.applyEdition();
    },
    updateSelected() {
      const pages = getSafePages();
      const currentPage = pages[pages.length - 1];
      if (!currentPage) return;
      const currentPath = '/' + currentPage.route;
      const list = this.data.list;
      const idx = list.findIndex(item => item.pagePath === currentPath);
      if (idx >= 0 && idx !== this.data.selected) {
        this.setData({ selected: idx });
      }
    },
    switchTab(e) {
      const dataset = e && e.currentTarget ? e.currentTarget.dataset : {};
      const { path } = dataset;
      if (!path) return;
      if (path === '/pages/specialty-design/specialty-design') {
        const app = getSafeApp();
        if (app && app.globalData) {
          app.globalData.activeProjectId = 0;
          app.globalData.targetStage = 'F4b';
          app.globalData.targetSpecialty = app.globalData.targetSpecialty || 'S1';
          app.globalData.targetCost = '';
          app.globalData.targetArea = '';
          app.globalData.targetProjectName = '';
          app.globalData.fromSmart = false;
        }
      callWxApi('navigateTo', { url: path });
      return;
    }
      callWxApi('switchTab', {
        url: path,
        fail: () => {
          callWxApi('reLaunch', { url: path });
        }
      });
    }
  }
});
