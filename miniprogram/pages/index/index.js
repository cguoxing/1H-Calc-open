const { onGoHome } = require("../../utils/goHome");
const account = require('../../utils/cloud-account.js');
const app = getApp();

const ENGINEERING_STAGES = [
  {
    id: 'pre-consult',
    title: '前期投资决策（谋划）',
    desc: '项目建议书 · 可研报告 · 投资估算',
    icon: 'tool-compass',
    url: '/pages/pre-consult/pre-consult',
    stage: 'F1'
  },
  {
    id: 'planning',
    title: '国土空间规划 / 城市更新',
    desc: '总体规划 · 城市设计 · 城市更新专项',
    icon: 'tool-planning',
    url: '/pages/calc/calc?stage=F2',
    stage: 'F2'
  },
  {
    id: 'survey',
    title: '工程勘察',
    desc: '岩土勘察 · 工程测量 · 水文地质',
    icon: 'tool-survey',
    url: '/pages/calc/calc?stage=F3',
    stage: 'F3'
  },
  {
    id: 'design',
    title: '工程设计',
    desc: '建筑 · 市政 · 园林 · 室内 · 机电 · 能源 · 景观',
    icon: 'tool-design',
    url: '/pages/calc/calc?stage=F4',
    stage: 'F4'
  },
  {
    id: 'cost',
    title: '造价咨询',
    desc: '概算 · 预算 · 结算 · 全过程造价',
    icon: 'tool-cost',
    url: '/pages/calc/calc?stage=F5',
    stage: 'F5'
  },
  {
    id: 'consult',
    title: '全过程工程咨询',
    desc: '谋划 → 规划 → 勘察 → 设计 → 造价全链条',
    icon: 'tool-consult',
    url: '/pages/calc/calc?stage=F6',
    stage: 'F6'
  }
];

const INTERIOR_VISUAL_STAGES = [
  {
    id: 'interior-design',
    title: '室内设计',
    desc: '办公室、商业、酒店、展陈、文体、餐饮、娱乐、交通、医疗、住宅、会所、工业',
    icon: 'tool-interior',
    stage: 'F4b',
    specialty: 'S1'
  },
  {
    id: 'landscape-design',
    title: '园林景观',
    desc: '私家庭园、别墅庭院、叠院、露台等户外空间设计，兼具休闲、观景、会客、园艺功能',
    icon: 'tool-landscape',
    stage: 'F4b',
    specialty: 'S3'
  },
  {
    id: 'self-build-design',
    title: '私宅自建',
    desc: '建筑、户型、室内、庭院一体化设计，一站式打造乡村及城郊自建房',
    icon: 'tool-home-design',
    stage: 'F4b',
    specialty: 'S4'
  },
  {
    id: 'signage-design',
    title: '导视标识',
    desc: '各类导视牌、门牌、警示标识、形象墙、精神堡垒，适配全场景空间使用',
    icon: 'tool-signage',
    stage: 'F4b',
    specialty: 'S5'
  },
  {
    id: 'soft-furnishing',
    title: '软装陈设',
    desc: '家具、布艺、饰品、挂画、绿植整体搭配，支持家装、公装、庭院空间升级',
    icon: 'tool-furnishing',
    stage: 'F4b',
    specialty: 'S6'
  },
  {
    id: 'art-lighting',
    title: '艺术照明',
    desc: '分层打造功能、氛围、造型灯光，涵盖室内、展陈、景观、建筑全场景照明',
    icon: 'tool-lighting',
    stage: 'F4b',
    specialty: 'S7'
  },
  {
    id: 'acoustic-design',
    title: '声学装修',
    desc: '专业隔音吸音处理，适配影音、娱乐、办公、文体、酒店等各类空间',
    icon: 'tool-acoustic',
    stage: 'F4b',
    specialty: 'S8'
  }
];

Page({
  onGoHome,
  data: {
    searchText: '',
    recentRecords: [],
    showStageModal: false,
    modalTitle: '选择专业方向',
    currentSelectedSpecialty: '',
    currentSpecialties: [],
    activeStage: '',
    appEdition: 'all',
    searchPlaceholder: '描述项目自动匹配取费，如：深圳某区光储充项目5000万 / 某市市政道路设计3000万 / 某园区勘察1200万...',
    stageHeaderTitle: '工程阶段',
    quickCalcStage: 'F4',
    quickCalcTitle: '快速计算',
    quickCalcDesc: '直接开始取费',
    stagesList: ENGINEERING_STAGES
  },

  onShow: function () {
    try {
      const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
      if (tabBar) {
        if (typeof tabBar.refreshEdition === 'function') {
          tabBar.refreshEdition();
        }
        tabBar.setData({ selected: 2 });
      }
    } catch (err) {
      console.warn('[index] tabBar refresh failed:', err);
    }
    this.applyEditionLayout();
    this.loadRecentRecords();

    // 未注册用户的静默后台恢复校验
    if (app.globalData.cloudReady && !account.hasLocalAccount()) {
      account.checkRegistered()
        .then(res => {
          if (res.exists) {
            account.fetchCloudProfile()
              .then(() => {
                this.loadRecentRecords();
              })
              .catch(err => console.error('Fetch cloud profile failed:', err));
          }
        })
        .catch(err => console.error('Check registered failed:', err));
    }
  },

  applyEditionLayout: function () {
    const edition = wx.getStorageSync('yicalc_app_edition') || (app.globalData && app.globalData.appEdition) || 'all';
    const isInterior = edition === 'interior';
    this.setData({
      appEdition: edition,
      searchPlaceholder: isInterior
        ? "描述空间设计需求，如：深圳创投大厦办公室装修680万 / 广州庭院景观设计120万 / 酒店导视标识与软装照明..."
        : "描述项目自动匹配取费，如：深圳某区光储充项目5000万 / 某市市政道路设计3000万 / 某园区勘察1200万...",
      stageHeaderTitle: isInterior ? '专项设计' : '工程阶段',
      quickCalcStage: isInterior ? 'F4b' : 'F4',
      quickCalcTitle: isInterior ? '专项计算' : '快速计算',
      quickCalcDesc: isInterior ? '空间快速计算' : '直接开始取费',
      stagesList: isInterior ? INTERIOR_VISUAL_STAGES : ENGINEERING_STAGES
    });
  },

  loadRecentRecords: function () {
    const history = wx.getStorageSync(app.globalData.historyKey) || [];
    // Only display top 3 recent records on home screen
    this.setData({
      recentRecords: history.slice(0, 3)
    });
  },

  checkRegBeforeNav: function (callback) {
    if (account.hasLocalAccount()) {
      callback();
    } else if (typeof wx === 'undefined' || typeof wx.showModal !== 'function') {
      if (typeof callback === 'function') callback();
    } else {
      wx.showModal({
        title: '提示',
        content: '使用该功能或开始收费计算，请先填写本地用户信息。至少需填写姓名与联系电话。',
        confirmText: '去注册',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/register/register' });
          }
        }
      });
    }
  },

  onSearchInput: function (e) {
    this.setData({
      searchText: e.detail.value
    });
  },

  includesAny: function (text, words) {
    return words.some(word => text.includes(word));
  },

  parseSmartProject: function (text) {
    const normalized = text.replace(/[，,；;。]/g, ' ').replace(/\s+/g, ' ').trim();
    const costMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(亿元|亿|万元|万|w|W)/);
    const cost = costMatch ? parseFloat(costMatch[1]) * (costMatch[2].includes('亿') ? 10000 : 1) : '';
    const areaMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(㎡|平米|平方米|m²|m2)/i);
    const area = areaMatch ? parseFloat(areaMatch[1]) : '';
    let projectName = normalized;

    if (costMatch) {
      projectName = normalized.slice(0, costMatch.index).trim();
    }
    projectName = projectName
      .replace(/[，,；;。:：、\s]+$/g, '')
      .replace(/^(项目名称|项目|工程)[:：\s]*/g, '')
      .trim();

    if (!projectName) {
      projectName = normalized.replace(costMatch ? costMatch[0] : '', '').replace(areaMatch ? areaMatch[0] : '', '').trim();
    }

    let stage = 'F4';
    let specialty = 'building';
    let matchDesc = '工程设计 · 建筑工程设计';
    let url = '/pages/calc/calc';
    let navType = 'switchTab';
    let isDesignMatch = false;

    const isSelfBuild = this.includesAny(text, ['私人自建', '私宅自建', '自建房', '自建住宅', '农村自建', '乡村自建', '别墅自建']);
    const isInterior = this.includesAny(text, ['办公室', '办公', '写字楼', '室内', '装饰', '装修', '精装', '商业空间', '酒店', '餐饮', '展厅', '展陈', '会所']);
    const isLandscape = this.includesAny(text, ['景观', '园林', '绿化', '公园', '广场', '庭院', '花园']);
    const isMunicipal = this.includesAny(text, ['市政', '道路', '给排水', '管线', '桥梁']);

    if (isSelfBuild) {
      stage = 'F4b';
      specialty = 'S4';
      matchDesc = '专项设计 · 私宅自建';
      url = '/pages/specialty-design/specialty-design';
      navType = 'navigateTo';
      isDesignMatch = true;
    } else if (isInterior) {
      stage = 'F4';
      specialty = 'interior_deco';
      matchDesc = '工程设计 · 室内装饰工程设计';
      isDesignMatch = true;
    } else if (isLandscape) {
      stage = 'F4';
      specialty = 'landscape';
      matchDesc = '工程设计 · 园林景观设计';
      isDesignMatch = true;
    } else if (isMunicipal) {
      stage = 'F4';
      specialty = 'municipal';
      matchDesc = '工程设计 · 市政道路/给排水设计';
      isDesignMatch = true;
    } else if (this.includesAny(text, ['人防'])) {
      stage = 'F4';
      specialty = 'civil_defense';
      matchDesc = '工程设计 · 人防工程设计';
      isDesignMatch = true;
    } else if (this.includesAny(text, ['电信', '通信'])) {
      stage = 'F4';
      specialty = 'telecom';
      matchDesc = '工程设计 · 电信/通信工程设计';
      isDesignMatch = true;
    } else if (this.includesAny(text, ['导视', '标识'])) {
      stage = 'F4b';
      specialty = 'S5';
      matchDesc = '专项设计 · 导视标识';
      url = '/pages/specialty-design/specialty-design';
      navType = 'navigateTo';
      isDesignMatch = true;
    } else if (this.includesAny(text, ['软装', '陈设'])) {
      stage = 'F4b';
      specialty = 'S6';
      matchDesc = '专项设计 · 软装陈设';
      url = '/pages/specialty-design/specialty-design';
      navType = 'navigateTo';
      isDesignMatch = true;
    } else if (this.includesAny(text, ['艺术照明', '夜景照明', '照明设计'])) {
      stage = 'F4b';
      specialty = 'S7';
      matchDesc = '专项设计 · 艺术照明';
      url = '/pages/specialty-design/specialty-design';
      navType = 'navigateTo';
      isDesignMatch = true;
    }

    return { projectName, cost, area, stage, specialty, matchDesc, url, navType, isDesignMatch };
  },

  applySmartTarget: function (parsed) {
    app.globalData.activeProjectId = 0;
    app.globalData.targetStage = parsed.stage;
    app.globalData.targetSpecialty = parsed.specialty;
    app.globalData.targetCost = parsed.cost;
    app.globalData.targetArea = parsed.area;
    app.globalData.targetProjectName = parsed.projectName;
    app.globalData.fromSmart = true;
    app.globalData.smartMatchDesc = parsed.matchDesc;
  },

  navigateSmartResult: function (parsed) {
    this.applySmartTarget(parsed);
    wx.showToast({
      title: `识别: ${parsed.matchDesc}`,
      icon: 'none',
      duration: 1000
    });

    if (parsed.navType === 'navigateTo') {
      wx.navigateTo({ url: parsed.url });
    } else {
      wx.switchTab({ url: parsed.url });
    }
  },

  onSmartCalc: function () {
    this.checkRegBeforeNav(() => {
      const text = this.data.searchText.trim();
      if (!text) {
        wx.showToast({
          title: '请输入项目描述',
          icon: 'none'
        });
        return;
      }

      const parsed = this.parseSmartProject(text);

      if (parsed.isDesignMatch) {
        this.navigateSmartResult(parsed);
        return;
      }

      // 1. Regex to parse cost (e.g. 5000万, 5000万元, 5000w)
      const costMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:万|万元|w)/);
      const cost = costMatch ? parseFloat(costMatch[1]) : '';

      // 面积匹配（用于专项设计等）
      const areaMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:㎡|平米|平方米|m²|m2)/i);
      const area = areaMatch ? parseFloat(areaMatch[1]) : '';

      // 2. Keyword matching for stage and specialty
      let stage = 'F4';
      let specialty = 'building';
      let matchDesc = '工程设计 · 建筑工程';

      // F1 前期谋划
      if (text.includes('建议') || text.includes('前期') || text.includes('可研') || text.includes('谋划') || text.includes('申请报告') || text.includes('资金申请')) {
        stage = 'F1';
        if (text.includes('可研') || text.includes('可行性')) {
          specialty = 'feasibility_study';
          matchDesc = '前期决策 · 可研报告';
        } else if (text.includes('申请报告') && !text.includes('资金')) {
          specialty = 'project_application';
          matchDesc = '前期决策 · 申请报告';
        } else if (text.includes('资金申请')) {
          specialty = 'funding_application';
          matchDesc = '前期决策 · 资金申请';
        } else {
          specialty = 'project_proposal';
          matchDesc = '前期决策 · 项目建议书';
        }
      }
      // F1.4 建设条件单项咨询
      else if (text.includes('环评') || text.includes('水保') || text.includes('社稳') || text.includes('文物') || text.includes('树木') || text.includes('水资源') || text.includes('PPP') || text.includes('节能评估') || text.includes('防洪') || text.includes('地震') || text.includes('交通影响') || text.includes('日照')) {
        stage = 'F1.4';
        specialty = '';
        matchDesc = '建设条件单项咨询';
        // 跳转到 condition-consulting 页面
        app.globalData.targetStage = stage;
        app.globalData.targetSpecialty = specialty;
        app.globalData.targetCost = cost;
        app.globalData.fromSmart = true;
        wx.navigateTo({
          url: '/pages/condition-consulting/condition-consulting'
        });
        return;
      }
      // F2 空间规划/城市更新
      else if (text.includes('更新') || text.includes('城市更新') || text.includes('国土空间') || text.includes('控规') || text.includes('详规') || text.includes('总规') || text.includes('修建性')) {
        stage = 'F2';
        specialty = '';
        if (text.includes('修建性')) { specialty = 'constructive'; matchDesc = '空间规划 · 修建性详规'; }
        else if (text.includes('控规') || text.includes('控制性')) { specialty = 'regulatory'; matchDesc = '空间规划 · 控制性详规'; }
        else if (text.includes('总规') || text.includes('国土空间') || text.includes('总体')) { specialty = 'overall'; matchDesc = '空间规划 · 总体规划'; }
        else { matchDesc = '空间规划 / 城市更新'; }
      }
      // F2b 土地整治
      else if (text.includes('土地整治') || text.includes('全域土地') || text.includes('农用地') || text.includes('建设用地整理') || text.includes('生态保护修复') || text.includes('土地复垦')) {
        app.globalData.targetStage = 'F2b';
        app.globalData.targetSpecialty = '';
        app.globalData.targetCost = cost;
        app.globalData.fromSmart = true;
        matchDesc = '全域土地综合整治';
        wx.navigateTo({
          url: '/pages/land-consolidation/land-consolidation'
        });
        return;
      }
      // F3 勘察
      else if (text.includes('勘察') || text.includes('岩土') || text.includes('测量') || text.includes('地质') || text.includes('水文')) {
        stage = 'F3';
        specialty = '';
        matchDesc = '工程勘察';
      }
      // F4b 专项设计
      else if (text.includes('室内') || text.includes('装饰') || text.includes('装修') || text.includes('导视') || text.includes('标识') || text.includes('软装') || text.includes('照明') || text.includes('住宅装修')) {
        app.globalData.targetStage = 'F4b';
        app.globalData.targetSpecialty = '';
        app.globalData.targetCost = cost || area;
        app.globalData.fromSmart = true;
        matchDesc = '专项设计';
        wx.navigateTo({
          url: '/pages/specialty-design/specialty-design'
        });
        return;
      }
      // F5 造价
      else if (text.includes('造价') || text.includes('预算') || text.includes('结算') || text.includes('概算') || text.includes('工程量清单') || text.includes('估算')) {
        stage = 'F5';
        specialty = '';
        if (text.includes('结算审核')) { specialty = 'settlement_audit'; matchDesc = '造价 · 结算审核'; }
        else if (text.includes('结算编制')) { specialty = 'settlement_prep'; matchDesc = '造价 · 结算编制'; }
        else if (text.includes('概算')) { specialty = 'budget_outline'; matchDesc = '造价 · 概算'; }
        else if (text.includes('工程量清单')) { specialty = 'bill_quantity'; matchDesc = '造价 · 清单编制'; }
        else if (text.includes('预算')) { specialty = 'budget_bill'; matchDesc = '造价 · 预算'; }
        wx.navigateTo({
          url: '/pages/bidding/bidding'
        });
        return;
      }
      // F6 全过程咨询
      else if (text.includes('全过程') || text.includes('全过程咨询') || text.includes('统筹')) {
        stage = 'F6';
        specialty = 'F6a';
        matchDesc = '全过程工程咨询';
      }
      // 乡村
      else if (text.includes('乡村') || text.includes('村庄') || text.includes('整村') || text.includes('农村') || text.includes('振兴')) {
        app.globalData.targetStage = 'village';
        app.globalData.targetSpecialty = '';
        app.globalData.targetCost = cost;
        app.globalData.fromSmart = true;
        matchDesc = '乡村振兴规划';
        wx.navigateTo({
          url: '/pages/village-revitalization/village-revitalization'
        });
        return;
      }
      // F4 工程设计（默认）
      else if (text.includes('设计') || text.includes('建筑') || text.includes('市政') || text.includes('园林') || text.includes('景观') || text.includes('人防') || text.includes('机电')) {
        stage = 'F4';
        if (text.includes('市政') || text.includes('道路') || text.includes('给排水')) {
          specialty = 'municipal';
          matchDesc = '工程设计 · 市政';
        } else if (text.includes('园林') || text.includes('景观') || text.includes('绿化')) {
          specialty = 'landscape';
          matchDesc = '工程设计 · 园林景观';
        } else if (text.includes('电信') || text.includes('通信')) {
          specialty = 'telecom';
          matchDesc = '工程设计 · 通信';
        } else if (text.includes('人防')) {
          specialty = 'civil_defense';
          matchDesc = '工程设计 · 人防';
        } else {
          specialty = 'building';
          matchDesc = '工程设计 · 建筑';
        }
      }

      // 存储匹配结果，显示在 toast 中
      app.globalData.smartMatchDesc = matchDesc;

      // 判断是否需要跳转到独立页面
      if (stage === 'F1') {
        app.globalData.targetStage = stage;
        app.globalData.targetSpecialty = specialty;
        app.globalData.targetCost = cost;
        app.globalData.fromSmart = true;
        wx.showToast({
          title: `智能识别: ${matchDesc}`,
          icon: 'none',
          duration: 1200
        });
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/pre-consult/pre-consult'
          });
        }, 1200);
        return;
      }

      // Redirect to calculator page with parameters
      wx.showToast({
        title: `智能识别: ${matchDesc}`,
        icon: 'none',
        duration: 1200
      });

      setTimeout(() => {
        app.globalData.targetStage = stage;
        app.globalData.targetSpecialty = specialty;
        app.globalData.targetCost = cost;
        app.globalData.fromSmart = true;
        wx.switchTab({
          url: '/pages/calc/calc'
        });
      }, 1200);
    });
  },

  onTapProjects: function () {
    this.checkRegBeforeNav(() => {
      wx.navigateTo({
        url: '/pages/projects/projects'
      });
    });
  },

  onTapSpecialtyDesign: function () {
    this.checkRegBeforeNav(() => {
      app.globalData.activeProjectId = 0;
      wx.navigateTo({
        url: '/pages/specialty-design/specialty-design'
      });
    });
  },

  onTapLandConsolidation: function () {
    this.checkRegBeforeNav(() => {
      app.globalData.activeProjectId = 0;
      wx.navigateTo({
        url: '/pages/land-consolidation/land-consolidation'
      });
    });
  },

  onTapSixNetworks: function () {
    this.checkRegBeforeNav(() => {
      app.globalData.activeProjectId = 0;
      wx.navigateTo({
        url: '/pages/six-networks/six-networks'
      });
    });
  },

  onTapConditionConsulting: function () {
    this.checkRegBeforeNav(() => {
      app.globalData.activeProjectId = 0;
      wx.navigateTo({
        url: '/pages/condition-consulting/condition-consulting'
      });
    });
  },

  onTapSupervision: function () {
    this.checkRegBeforeNav(() => {
      app.globalData.activeProjectId = 0;
      wx.navigateTo({
        url: '/pages/supervision/supervision'
      });
    });
  },

  onTapConstructionManagement: function () {
    this.checkRegBeforeNav(() => {
      app.globalData.activeProjectId = 0;
      wx.navigateTo({
        url: '/pages/construction-management/construction-management'
      });
    });
  },

  onTapBidding: function () {
    this.checkRegBeforeNav(() => {
      app.globalData.activeProjectId = 0;
      wx.navigateTo({
        url: '/pages/bidding/bidding'
      });
    });
  },

  onTapStage: function (e) {
    this.checkRegBeforeNav(() => {
      const index = e.currentTarget.dataset.index;
      const item = this.data.stagesList[index];
      if (!item) return;

      // Reset active project for quick calculation
      app.globalData.activeProjectId = 0;

      if (item.stage === 'F1') {
        wx.navigateTo({
          url: item.url
        });
      } else if (item.stage === 'F4b') {
        app.globalData.targetStage = 'F4b';
        app.globalData.targetSpecialty = item.specialty || '';
        app.globalData.targetCost = '';
        app.globalData.targetArea = '';
        app.globalData.targetProjectName = '';
        app.globalData.fromSmart = false;
        wx.navigateTo({
          url: '/pages/specialty-design/specialty-design'
        });
      } else if (item.stage) {
        app.globalData.targetStage = item.stage;
        app.globalData.targetSpecialty = '';
        app.globalData.targetCost = '';
        app.globalData.fromSmart = false;
        wx.switchTab({
          url: '/pages/calc/calc'
        });
      } else {
        wx.navigateTo({
          url: item.url
        });
      }
    });
  },

  onTapAllTools: function () {
    this.checkRegBeforeNav(() => {
      app.globalData.toolsActiveCategory = 'calc';
      wx.switchTab({
        url: '/pages/tools/tools'
      });
    });
  },

  onTapStandard: function () {
    this.checkRegBeforeNav(() => {
      wx.navigateTo({
        url: '/pages/standard/standard'
      });
    });
  },

  onTapPolicy: function () {
    this.checkRegBeforeNav(() => {
      wx.navigateTo({
        url: '/pages/policy/policy'
      });
    });
  },

  onSelectStage: function (e) {
    const stage = (e && typeof e === 'object' && e.currentTarget) ? e.currentTarget.dataset.stage : e;
    // 快速计算模式：不归属到项目
    app.globalData.activeProjectId = 0;
    const stageNames = {
      F1: '前期投资决策（谋划）',
      F2: '国土空间规划 / 城市更新',
      F3: '工程勘察',
      F4: '工程设计',
      F5: '造价咨询',
      F6: '全过程工程咨询'
    };
    const stageSpecialties = {
      F4b: INTERIOR_VISUAL_STAGES.map(item => ({
        id: item.specialty,
        name: item.title,
        desc: item.desc
      })),
      F1: [
        { id: 'project_proposal', name: '编制项目建议书' },
        { id: 'feasibility_study', name: '编制可行性研究报告' },
        { id: 'project_application', name: '编制项目申请报告' },
        { id: 'funding_application', name: '编制资金申请报告' },
        { id: 'pre_feasibility', name: '编制预可行性研究报告' }
      ],
      F2: [
        { id: 'constructive', name: '修建性详细规划' },
        { id: 'regulatory', name: '控制性详细规划' },
        { id: 'overall', name: '城市总体国土空间规划' }
      ],
      F3: [
        { id: 'survey', name: '岩土工程勘察基本服务' },
        { id: 'consult', name: '岩土工程勘察技术咨询' },
        { id: 'supervision', name: '岩土工程勘察旁站监理' }
      ],
      F4: [
        { id: 'building', name: '建筑工程设计' },
        { id: 'landscape', name: '园林景观/绿化设计' },
        { id: 'interior_deco', name: '办公商业/酒店室内设计' },
        { id: 'municipal', name: '市政道路/给排水设计' },
        { id: 'telecom', name: '电信/通信工程设计' },
        { id: 'civil_defense', name: '人防工程设计' },
      ],
      F5: [
        { id: 'estimate', name: '投资估算编制/审核' },
        { id: 'budget_outline', name: '工程概算编制/审核' },
        { id: 'bill_quantity', name: '工程量清单编制/审核' },
        { id: 'budget_bill', name: '预算编制/审核(清单)' },
        { id: 'budget_quota', name: '预算编制/审核(定额)' },
        { id: 'settlement_prep', name: '工程结算编制' },
        { id: 'settlement_audit', name: '工程结算审核' },
        { id: 'whole_process', name: '全过程造价控制' },
        { id: 'dispute_appraisal', name: '工程造价纠纷鉴证' },
        { id: 'steel_calc', name: '钢筋及预埋件计算' }
      ],
      F6: [
        { id: 'F6a', name: '全过程工程咨询（建筑）' },
        { id: 'F6b', name: '全过程工程咨询（市政）' },
        { id: 'F6c', name: '全过程工程咨询（工业）' }
      ]
    };

    const specialties = stageSpecialties[stage] || [];
    this.setData({
      showStageModal: true,
      modalTitle: stage === 'F4b' ? '专项计算' : (stageNames[stage] || '选择专业方向'),
      currentSpecialties: specialties,
      currentSelectedSpecialty: specialties[0] ? specialties[0].id : '',
      activeStage: stage
    });
  },

  closeStageModal: function () {
    this.setData({
      showStageModal: false
    });
  },

  onPreventDefault: function () {
    // Prevent default tap bubble
  },

  onSelectSpecialty: function (e) {
    this.checkRegBeforeNav(() => {
      const specialty = e.currentTarget.dataset.specialty;
      const stage = this.data.activeStage;
      
      this.setData({
        currentSelectedSpecialty: specialty,
        showStageModal: false
      });

      app.globalData.targetStage = stage;
      app.globalData.targetSpecialty = specialty;
      app.globalData.targetCost = '';
      app.globalData.targetArea = '';
      app.globalData.targetProjectName = '';
      app.globalData.fromSmart = false;

      if (stage === 'F1') {
        wx.navigateTo({
          url: '/pages/pre-consult/pre-consult'
        });
      } else if (stage === 'F4b') {
        wx.navigateTo({
          url: '/pages/specialty-design/specialty-design'
        });
      } else if (stage === 'F4') {
        wx.switchTab({
          url: '/pages/calc/calc'
        });
      } else {
        wx.switchTab({
          url: '/pages/calc/calc'
        });
      }
    });
  },

  onViewRecord: function (e) {
    this.checkRegBeforeNav(() => {
      const id = e.currentTarget.dataset.id;
      wx.navigateTo({
        url: `/pages/result/result?id=${id}&fromHistory=true`
      });
    });
  },

  onViewHistory: function () {
    this.checkRegBeforeNav(() => {
      wx.switchTab({
        url: '/pages/history/history'
      });
    });
  },

  onTapConverter: function () {
    this.checkRegBeforeNav(() => {
      wx.navigateTo({
        url: '/pages/converter/converter'
      });
    });
  },

  // 微信分享
  onShareAppMessage: function () {
    return {
      title: '易计算 - 工程设计收费报价系统',
      desc: '覆盖工程全阶段取费计算：前期谋划、规划设计、勘察、造价、全过程咨询',
      path: '/pages/index/index'
    };
  }
});
