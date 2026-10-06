const { onGoHome } = require("../../utils/goHome");
const { calculateSupervisionFee } = require('../../utils/calculator.js');
const { addCalcItem, getProject } = require('../../utils/project-manager.js');
const { incrementUsageCount } = require('../../utils/usage-counter.js');
const app = getApp();

Page({
  onGoHome,
  data: {
    projectName: '',
    cost: '',
    professions: [
      { value: 'building', label: '建筑 (1.0)' },
      { value: 'municipal', label: '市政 (1.0)' },
      { value: 'highway', label: '公路 (0.9)' },
      { value: 'waterway', label: '水运/地铁 (1.1)' },
      { value: 'metro', label: '地铁/轻轨 (1.1)' },
      { value: 'water', label: '水利/水电 (1.2)' },
      { value: 'electric', label: '电力/新能源 (1.2)' }
    ],
    professionIndex: 0,
    elevations: [
      { label: '≤2000m (1.0)' },
      { label: '2001~3000m (1.1)' },
      { label: '3001~3500m (1.2)' },
      { label: '3501~4000m (1.3)' },
      { label: '>4000m (1.4)' }
    ],
    elevationIndex: 0,
    ratios: [
      { value: 60, label: '60 %' },
      { value: 80, label: '80 %' },
      { value: 100, label: '100 %' },
      { value: 120, label: '120 %' }
    ],
    ratioIndex: 2,
    taxRates: [
      { value: 0, label: '0.0 % (不计税)' },
      { value: 3, label: '3.0 % (小规模纳税人)' },
      { value: 6, label: '6.0 % (现代服务业税率)' }
    ],
    taxRateIndex: 2
  },

  onLoad: function (options) {
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
    let defaultName = `工程监理项目 - ${dateStr}`;
    let costVal = '';

    if (options.cost) costVal = options.cost;
    if (options.searchText) defaultName = options.searchText;

    this.setData({
      projectName: defaultName,
      cost: costVal
    });
  },

  onNameInput: function (e) {
    this.setData({ projectName: e.detail.value });
  },

  onCostInput: function (e) {
    this.setData({ cost: e.detail.value });
  },

  onProfessionChange: function (e) {
    this.setData({ professionIndex: parseInt(e.detail.value) });
  },

  onElevationChange: function (e) {
    this.setData({ elevationIndex: parseInt(e.detail.value) });
  },

  onRatioChange: function (e) {
    this.setData({ ratioIndex: parseInt(e.detail.value) });
  },

  onTaxRateChange: function (e) {
    this.setData({ taxRateIndex: parseInt(e.detail.value) });
  },

  onReset: function () {
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
    this.setData({
      projectName: `工程监理项目 - ${dateStr}`,
      cost: '',
      professionIndex: 0,
      elevationIndex: 0,
      ratioIndex: 2,
      taxRateIndex: 2
    });
    wx.showToast({ title: '参数已重置', icon: 'success' });
  },

  onCalculate: function () {
    const cost = parseFloat(this.data.cost);
    if (!Number.isFinite(cost) || cost <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }

    const professionType = this.data.professions[this.data.professionIndex].value;
    const elevationIndex = this.data.elevationIndex;
    const discount = this.data.ratios[this.data.ratioIndex].value;
    const taxRate = this.data.taxRates[this.data.taxRateIndex].value;

    const result = calculateSupervisionFee({
      cost,
      professionType,
      elevationIndex,
      discount,
      taxRate
    });

    // 存入项目层级
    const activeProjectId = app.globalData.activeProjectId;
    let itemName = '工程监理服务费';
    let itemId = null;
    let projectName = '';

    if (activeProjectId && getProject(activeProjectId)) {
      const project = getProject(activeProjectId);
      projectName = project.name;
      const item = addCalcItem(activeProjectId, 'supervision', result, itemName);
      if (item) itemId = item.id;
    }

    // 存入历史记录
    const history = wx.getStorageSync(app.globalData.historyKey) || [];
    const newId = itemId || (history.length > 0 ? Math.max(...history.map(h => h.id)) + 1 : 1);
    const now = new Date();
    const timeStr = `今天 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    result.professionName = this.data.professions[this.data.professionIndex].label;
    result.elevationName = this.data.elevations[this.data.elevationIndex].label;
    result.basis = '发改价格[2007]670号';

    const newRecord = {
      id: newId,
      name: projectName ? `${projectName} · ${itemName}` : (this.data.projectName || '未命名监理项目'),
      stage: 'supervision',
      stageName: '工程监理',
      meta: timeStr,
      amount: `${result.total.toFixed(2)}万`,
      color: '#00695c',
      calcDetail: result,
      projectId: activeProjectId || null,
      projectName: projectName,
      docs: [
        { name: `工程监理报价单.pdf`, meta: `刚刚创建 · ${(Math.random() * 2 + 1).toFixed(1)} MB`, color: '#00695c' }
      ]
    };

    history.unshift(newRecord);
    wx.setStorageSync(app.globalData.historyKey, history);
    incrementUsageCount();

    wx.navigateTo({
      url: `/pages/result/result?id=${newId}`
    });
  }
});
