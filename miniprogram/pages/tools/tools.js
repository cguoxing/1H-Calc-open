const { onGoHome } = require("../../utils/goHome");
const STORAGE_KEY_RECENT = 'tools_recent_uses';
const account = require('../../utils/cloud-account.js');
const app = getApp();

const DEFAULT_CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'calc', label: '取费计算' },
  { key: 'ref', label: '参考查询' },
  { key: 'utils', label: '实用工具' }
];

const INTERIOR_CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'calc', label: '专项设计' },
  { key: 'ref', label: '参考查询' },
  { key: 'utils', label: '实用工具' }
];

const INTERIOR_VISUAL_CALC_TOOLS = [
  {
    id: 'interior-design',
    title: '室内设计',
    desc: '办公室、商业、酒店、展陈、文体、餐饮、娱乐、交通、医疗、住宅、会所、工业',
    category: 'calc',
    icon: 'tool-interior',
    textIcon: '＋',
    url: '/pages/specialty-design/specialty-design',
    stage: 'F4b',
    specialty: 'S1'
  },
  {
    id: 'landscape-design',
    title: '园林景观',
    desc: '私家庭园、别墅庭院、叠院、露台等户外空间设计',
    category: 'calc',
    icon: 'tool-landscape',
    textIcon: '＋',
    url: '/pages/specialty-design/specialty-design',
    stage: 'F4b',
    specialty: 'S3'
  },
  {
    id: 'self-build-design',
    title: '私宅自建',
    desc: '建筑、户型、室内、庭院一体化设计',
    category: 'calc',
    icon: 'tool-home-design',
    textIcon: '＋',
    url: '/pages/specialty-design/specialty-design',
    stage: 'F4b',
    specialty: 'S4'
  },
  {
    id: 'signage-design',
    title: '导视标识',
    desc: '导视牌、门牌、警示标识、形象墙、精神堡垒',
    category: 'calc',
    icon: 'tool-signage',
    textIcon: '＋',
    url: '/pages/specialty-design/specialty-design',
    stage: 'F4b',
    specialty: 'S5'
  },
  {
    id: 'soft-furnishing',
    title: '软装陈设',
    desc: '家具、布艺、饰品、挂画、绿植整体搭配',
    category: 'calc',
    icon: 'tool-furnishing',
    textIcon: '＋',
    url: '/pages/specialty-design/specialty-design',
    stage: 'F4b',
    specialty: 'S6'
  },
  {
    id: 'art-lighting',
    title: '艺术照明',
    desc: '功能、氛围、造型灯光，覆盖室内、展陈、景观、建筑',
    category: 'calc',
    icon: 'tool-lighting',
    textIcon: '＋',
    url: '/pages/specialty-design/specialty-design',
    stage: 'F4b',
    specialty: 'S7'
  },
  {
    id: 'acoustic-design',
    title: '声学装修',
    desc: '隔音吸音处理，适配影音、娱乐、办公、文体、酒店',
    category: 'calc',
    icon: 'tool-acoustic',
    textIcon: '＋',
    url: '/pages/specialty-design/specialty-design',
    stage: 'F4b',
    specialty: 'S8'
  }
];

const SHARED_CALC_TOOLS = [
  {
    id: 'compare',
    title: '方案比选',
    desc: '多方案比选 · 项目计算结果横向对比分析',
    category: 'calc',
    icon: 'tool-compare',
    textIcon: '⚖️',
    url: '/pages/compare/compare'
  }
];

Page({
  onGoHome,
  data: {
    searchText: '',
    activeCategory: 'all',
    toolCount: 0,
    recentTools: [],

    categories: DEFAULT_CATEGORIES,

    allTools: [
      // ── 取费计算类 ──
      {
        id: 'pre-consult',
        title: '前期投资决策 (F1)',
        desc: '项目建议书 · 可研报告 · 评估咨询 · 资金申请',
        category: 'calc',
        icon: 'tool-preconsult',
        textIcon: '📋',
        url: '/pages/pre-consult/pre-consult',
        stage: 'F1'
      },
      {
        id: 'planning',
        title: '国土空间规划 (F2)',
        desc: '城镇体系规划 · 总体规划 · 控制性详细规划',
        category: 'calc',
        icon: 'tool-planning',
        textIcon: '🗺️',
        url: '/pages/calc/calc?stage=F2',
        stage: 'F2'
      },
      {
        id: 'survey',
        title: '工程勘察 (F3)',
        desc: '岩土工程勘察 · 岩土设计 · 工程测量 · 旁站监理',
        category: 'calc',
        icon: 'tool-survey',
        textIcon: '🧭',
        url: '/pages/calc/calc?stage=F3',
        stage: 'F3'
      },
      {
        id: 'design',
        title: '工程设计 (F4)',
        desc: '建筑工程设计 · 市政设计 · 人防设计 · 电信设计',
        category: 'calc',
        icon: 'tool-design',
        textIcon: '📐',
        url: '/pages/calc/calc?stage=F4',
        stage: 'F4'
      },
      {
        id: 'specialty-design',
        title: '专项设计取费',
        desc: '室内设计 · 园林景观 · 导视标识 · 幕墙照明',
        category: 'calc',
        icon: 'tool-specialty',
        textIcon: '🎨',
        url: '/pages/specialty-design/specialty-design'
      },
      {
        id: 'cost',
        title: '造价咨询 (F5)',
        desc: '投资估算 · 概预算编制 · 清单控制价 · 结算审核',
        category: 'calc',
        icon: 'tool-cost',
        textIcon: '🧮',
        url: '/pages/calc/calc?stage=F5',
        stage: 'F5'
      },
      {
        id: 'consult',
        title: '全过程工程咨询 (F6)',
        desc: '项目策划 · 规划前期 · 勘察设计造价全链条咨询',
        category: 'calc',
        icon: 'tool-consult',
        textIcon: '💼',
        url: '/pages/calc/calc?stage=F6',
        stage: 'F6'
      },
      {
        id: 'land-consolidation',
        title: '全域土地整治',
        desc: '农用地整理 · 建设用地整理 · 生态保护修复',
        category: 'calc',
        icon: 'tool-land',
        textIcon: '🌾',
        url: '/pages/land-consolidation/land-consolidation'
      },
      {
        id: 'condition-consulting',
        title: '建设条件咨询',
        desc: '环评 · 水保 · 节能评估 · 社会稳定风险评估',
        category: 'calc',
        icon: 'tool-condition',
        textIcon: '🔍',
        url: '/pages/condition-consulting/condition-consulting'
      },
      {
        id: 'six-networks',
        title: '"六张网"工程设计',
        desc: '水网 · 电网 · 算力网 · 通信网 · 管网 · 物流网',
        category: 'calc',
        icon: 'tool-sixnet',
        textIcon: '🌐',
        url: '/pages/six-networks/six-networks'
      },
      {
        id: 'supervision',
        title: '工程监理取费',
        desc: '发改价格[2007]670号 · 施工/设计阶段监理取费',
        category: 'calc',
        icon: 'tool-supervision',
        textIcon: '👁️',
        url: '/pages/supervision/supervision'
      },
      {
        id: 'bidding',
        title: '招标代理取费',
        desc: '国家标准 + 广东/上海/浙江地方口径',
        category: 'calc',
        icon: 'tool-bidding',
        textIcon: '📑',
        url: '/pages/bidding/bidding'
      },
      {
        id: 'construction-management',
        title: '代建管理取费',
        desc: '财建[2016]504号 · 建设单位管理费及代建管理费',
        category: 'calc',
        icon: 'tool-constmgmt',
        textIcon: '🏗️',
        url: '/pages/construction-management/construction-management'
      },
      {
        id: 'village-revitalization',
        title: '乡村振兴取费',
        desc: '村庄规划 · 人居环境整治 · 农村住宅设计',
        category: 'calc',
        icon: 'tool-village',
        textIcon: '🏡',
        url: '/pages/village-revitalization/village-revitalization'
      },
      {
        id: 'city-renewal',
        title: '城市更新取费',
        desc: '老旧小区改造 · 综合整治 · 历史风貌保护取费',
        category: 'calc',
        icon: 'tool-renewal',
        textIcon: '🏙️',
        url: '/pages/city-renewal/city-renewal'
      },
      {
        id: 'energy-saving',
        title: '能源工程取费',
        desc: '绿色建筑咨询 · 节能评估 · 新能源电力工程',
        category: 'calc',
        icon: 'tool-energy',
        textIcon: '⚡',
        url: '/pages/energy-saving/energy-saving'
      },
      {
        id: 'compare',
        title: '方案比选',
        desc: '多方案比选 · 项目计算结果横向对比分析',
        category: 'calc',
        icon: 'tool-compare',
        textIcon: '⚖️',
        url: '/pages/compare/compare'
      },
      // ── 参考查询类 ──
      {
        id: 'standard',
        title: '取费标准查询',
        desc: '2002版 · 基价表 · 专业系数 · 附表一至三',
        category: 'ref',
        icon: 'tool-standard',
        textIcon: '📊',
        url: '/pages/standard/standard'
      },
      {
        id: 'policy',
        title: '政策法规库',
        desc: '国家 · 地方 · 行业标准 · 18条核心法规',
        category: 'ref',
        icon: 'tool-policy',
        textIcon: '📜',
        url: '/pages/policy/policy'
      },
      {
        id: 'manual',
        title: '使用手册',
        desc: '2005版工程勘察设计收费使用手册说明',
        category: 'ref',
        icon: 'tool-manual',
        textIcon: '📖',
        url: '/pages/manual/manual'
      },
      {
        id: 'faq',
        title: '常见问题',
        desc: '计费规则 · 系数选择 · 特殊情形 · 15条问答',
        category: 'ref',
        icon: 'tool-faq',
        textIcon: '💬',
        url: '/pages/faq/faq'
      },
      // ── 实用工具类 ──
      {
        id: 'converter',
        title: '单位换算器',
        desc: '长度 · 面积 · 体积 · 角度 · 功率 · 进制',
        category: 'utils',
        icon: 'tool-converter',
        textIcon: '🔄',
        url: '/pages/converter/converter'
      },
      {
        id: 'templates-lib',
        title: '项目模板',
        desc: '项目策划 · 空白项目',
        category: 'utils',
        icon: 'tool-templates',
        textIcon: '📄',
        url: '/pages/templates/templates'
      }
    ],

    filteredTools: []
  },

  onLoad: function () {
    this.defaultAllTools = this.defaultAllTools || this.data.allTools.slice();
    this.applyEditionTools();
    this.loadRecentTools();
  },

  onShow: function () {
    account.enforceRegistration();
    try {
      const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
      if (tabBar) {
        if (typeof tabBar.refreshEdition === 'function') {
          tabBar.refreshEdition();
        }
        tabBar.setData({ selected: 3 });
      }
    } catch (err) {
      console.warn('[tools] tabBar refresh failed:', err);
    }
    if (app.globalData && app.globalData.toolsActiveCategory) {
      this.setData({
        activeCategory: app.globalData.toolsActiveCategory
      });
      app.globalData.toolsActiveCategory = '';
    }
    this.defaultAllTools = this.defaultAllTools || this.data.allTools.slice();
    this.applyEditionTools();
    this.loadRecentTools();
  },

  applyEditionTools: function () {
    const edition = wx.getStorageSync('yicalc_app_edition') || (app.globalData && app.globalData.appEdition) || 'all';
    const isInterior = edition === 'interior';
    const baseTools = (this.defaultAllTools || this.data.allTools).slice();
    const refAndUtils = baseTools.filter(tool => tool.category !== 'calc');
    const allTools = isInterior ? INTERIOR_VISUAL_CALC_TOOLS.concat(SHARED_CALC_TOOLS, refAndUtils) : baseTools;

    this.setData({
      appEdition: edition,
      categories: isInterior ? INTERIOR_CATEGORIES : DEFAULT_CATEGORIES,
      allTools
    });
    this.applyFilter();
  },

  // ── 搜索 ──
  onSearchInput: function (e) {
    this.setData({ searchText: e.detail.value });
    this.applyFilter();
  },

  onClearSearch: function (e) {
    // 支持从空状态"查看全部工具"按钮触发（重置分类+搜索）
    const clearAll = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.clearAll;
    if (clearAll) {
      this.setData({ searchText: '', activeCategory: 'all' });
    } else {
      this.setData({ searchText: '' });
    }
    this.applyFilter();
  },

  // ── 分类切换 ──
  onCategoryChange: function (e) {
    const cat = e.currentTarget.dataset.category;
    this.setData({ activeCategory: cat });
    this.applyFilter();
  },

  // ── 过滤逻辑 ──
  applyFilter: function () {
    const { allTools, activeCategory, searchText } = this.data;
    let filtered = allTools;

    // 分类过滤
    if (activeCategory !== 'all') {
      filtered = filtered.filter(t => t.category === activeCategory);
    }

    // 搜索过滤
    if (searchText.trim()) {
      const kw = searchText.trim().toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(kw) ||
        t.desc.toLowerCase().includes(kw)
      );
    }

    this.setData({
      filteredTools: filtered,
      toolCount: filtered.length
    });
  },

  // ── 工具点击 ──
  onTapTool: function (e) {
    const id = e.currentTarget.dataset.id;
    const tool = this.data.allTools.find(t => t.id === id);
    if (!tool) return;

    // 记录最近使用
    this.recordRecent(tool);

    const tabBarPages = ['pages/calc/calc', 'pages/history/history', 'pages/index/index', 'pages/tools/tools', 'pages/settings/settings'];
    const qIndex = tool.url.indexOf('?');
    const path = qIndex >= 0 ? tool.url.substring(0, qIndex) : tool.url;
    const queryStr = qIndex >= 0 ? tool.url.substring(qIndex + 1) : '';
    const isTabBar = tabBarPages.some(t => path === '/' + t);

    if (tool.stage === 'F4b') {
      app.globalData.activeProjectId = 0;
      app.globalData.targetStage = 'F4b';
      app.globalData.targetSpecialty = tool.specialty || 'S1';
      app.globalData.targetCost = '';
      app.globalData.targetArea = '';
      app.globalData.targetProjectName = '';
      app.globalData.fromSmart = false;
      wx.navigateTo({
        url: '/pages/specialty-design/specialty-design',
        fail: function (err) {
          console.error('[tools] navigateTo 失败:', tool.url, err);
          wx.showToast({ title: '页面加载失败，请重试', icon: 'none' });
        }
      });
      return;
    }

    if (isTabBar) {
      // tabBar 页面必须用 switchTab，不支持 URL 参数，通过 globalData 传递
      if (queryStr) {
        const params = {};
        queryStr.split('&').forEach(p => {
          const eq = p.indexOf('=');
          if (eq >= 0) {
            params[p.substring(0, eq)] = decodeURIComponent(p.substring(eq + 1));
          }
        });
        if (params.stage) {
          app.globalData.targetStage = params.stage;
          app.globalData.targetCost = params.cost || '';
          app.globalData.targetSpecialty = params.specialty || '';
        }
      }
      wx.switchTab({
        url: path,
        fail: function (err) {
          console.error('[tools] switchTab 失败:', path, err);
          wx.showToast({ title: '页面跳转失败', icon: 'none' });
        }
      });
    } else {
      wx.navigateTo({
        url: tool.url,
        fail: function (err) {
          console.error('[tools] navigateTo 失败:', tool.url, err);
          // 部分情况下 navigateTo 失败是因为页面栈满了（>10层），尝试 redirectTo
          if (err.errMsg && err.errMsg.indexOf('limit') >= 0) {
            wx.redirectTo({
              url: tool.url,
              fail: function (err2) {
                console.error('[tools] redirectTo 也失败:', tool.url, err2);
                wx.showToast({ title: '页面跳转失败，请重试', icon: 'none' });
              }
            });
          } else {
            wx.showToast({ title: '页面加载失败，请重试', icon: 'none' });
          }
        }
      });
    }
  },

  // ── 最近使用 ──
  recordRecent: function (tool) {
    let recent = [];
    try {
      const stored = wx.getStorageSync(STORAGE_KEY_RECENT);
      if (stored) recent = JSON.parse(stored);
    } catch (_) {}

    // 去重并移到最前
    recent = recent.filter(r => r.id !== tool.id);
    recent.unshift({ id: tool.id, title: tool.title, desc: tool.desc, icon: tool.icon, useTextIcon: tool.useTextIcon || false, textIcon: tool.textIcon || '', url: tool.url, time: Date.now() });
    // 最多保留 6 条
    recent = recent.slice(0, 6);

    wx.setStorageSync(STORAGE_KEY_RECENT, JSON.stringify(recent));
    this.setData({ recentTools: recent });
  },

  loadRecentTools: function () {
    try {
      const stored = wx.getStorageSync(STORAGE_KEY_RECENT);
      if (stored) {
        const validIds = this.data.allTools.map(tool => tool.id);
        const recent = JSON.parse(stored).filter(tool => validIds.includes(tool.id));
        this.setData({ recentTools: recent });
      }
    } catch (_) {}
  },

  onClearRecent: function () {
    wx.showModal({
      title: '清除记录',
      content: '确定清除最近使用记录？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync(STORAGE_KEY_RECENT);
          this.setData({ recentTools: [] });
          wx.showToast({ title: '已清除', icon: 'success' });
        }
      }
    });
  },

  // ── 图片加载失败回退 ──
  onImageError: function (e) {
    const index = e.currentTarget.dataset.index;
    const tool = this.data.filteredTools[index];
    if (tool && tool.textIcon) {
      // 标记使用文本图标
      const key = 'filteredTools[' + index + '].useTextIcon';
      this.setData({ [key]: true });
    }
  },

  // ── 分享 ──
  onShareAppMessage: function () {
    return {
      title: '易计算工具箱 — 工程勘察设计全生命周期取费计算',
      path: '/pages/tools/tools'
    };
  }
});
