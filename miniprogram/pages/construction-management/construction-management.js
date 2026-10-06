const { onGoHome } = require("../../utils/goHome");
const { calculateConstructionManagementFee } = require('../../utils/calculator.js');
const { addCalcItem, getProject } = require('../../utils/project-manager.js');
const { incrementUsageCount } = require('../../utils/usage-counter.js');
const app = getApp();

Page({
  onGoHome,
  data: {
    projectName: '',
    cost: '',
    agentCoefs: [
      { value: 0.8, label: '0.8 (代建最低)' },
      { value: 0.85, label: '0.85' },
      { value: 0.9, label: '0.90' },
      { value: 0.95, label: '0.95' },
      { value: 1.0, label: '1.0 (标准建设单位管理费)' }
    ],
    agentCoefIndex: 4,
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
    let defaultName = `建设管理费项目 - ${dateStr}`;
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

  onAgentCoefChange: function (e) {
    this.setData({ agentCoefIndex: parseInt(e.detail.value) });
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
      projectName: `建设管理费项目 - ${dateStr}`,
      cost: '',
      agentCoefIndex: 4,
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

    const agentCoef = this.data.agentCoefs[this.data.agentCoefIndex].value;
    const discount = this.data.ratios[this.data.ratioIndex].value;
    const taxRate = this.data.taxRates[this.data.taxRateIndex].value;

    const result = calculateConstructionManagementFee({
      cost,
      agentCoef,
      discount,
      taxRate
    });

    // 存入项目层级
    const activeProjectId = app.globalData.activeProjectId;
    let itemName = agentCoef < 1.0 ? '代建管理费' : '建设单位管理费';
    let itemId = null;
    let projectName = '';

    if (activeProjectId && getProject(activeProjectId)) {
      const project = getProject(activeProjectId);
      projectName = project.name;
      const item = addCalcItem(activeProjectId, 'management', result, itemName);
      if (item) itemId = item.id;
    }

    // 存入历史记录
    const history = wx.getStorageSync(app.globalData.historyKey) || [];
    const newId = itemId || (history.length > 0 ? Math.max(...history.map(h => h.id)) + 1 : 1);
    const now = new Date();
    const timeStr = `今天 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    result.agentCoefLabel = this.data.agentCoefs[this.data.agentCoefIndex].label;
    result.itemName = itemName;
    result.basis = '财建[2016]504号';

    const newRecord = {
      id: newId,
      name: projectName ? `${projectName} · ${itemName}` : (this.data.projectName || '未命名建设管理费项目'),
      stage: 'management',
      stageName: '建设单位管理费',
      meta: timeStr,
      amount: `${result.total.toFixed(2)}万`,
      color: '#bf360c',
      calcDetail: result,
      projectId: activeProjectId || null,
      projectName: projectName,
      docs: [
        { name: `建设单位管理费报价单.pdf`, meta: `刚刚创建 · ${(Math.random() * 2 + 1).toFixed(1)} MB`, color: '#bf360c' }
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
