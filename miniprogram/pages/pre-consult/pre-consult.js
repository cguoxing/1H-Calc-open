const { onGoHome } = require("../../utils/goHome");
const { calculatePlanningFee } = require('../../utils/calculator.js');
const { addCalcItem, updateCalcItemResult, getProject } = require('../../utils/project-manager.js');
const { incrementUsageCount } = require('../../utils/usage-counter.js');
const draftStore = require('../../utils/calc-draft.js');
const app = getApp();

Page({
  onGoHome,
  data: {
    projectName: '',
    cost: '',
    services: [
      { value: 'project_proposal', label: '编制项目建议书' },
      { value: 'feasibility_study', label: '编制可行性研究报告' },
      { value: 'project_proposal_eval', label: '评估项目建议书' },
      { value: 'feasibility_study_eval', label: '评估可行性研究报告' }
    ],
    serviceIndex: 0,
    industries: [
      { value: 0.8, label: '0.8 (传统工业: 化工/石化/冶金等)' },
      { value: 0.9, label: '0.9 (一般制造业: 机械/轻工/医药等)' },
      { value: 1.0, label: '1.0 (一般项目: 建筑/市政/公路等)' },
      { value: 1.1, label: '1.1 (新兴行业: 高科技/新能源/环保等)' },
      { value: 1.2, label: '1.2 (高精尖领域: 核电/航天/深海工程)' }
    ],
    industryIndex: 2,
    complexities: [
      { value: 0.7, label: '0.7 (简单规划研究)' },
      { value: 0.85, label: '0.85 (I级: 条件较明确)' },
      { value: 1.0, label: '1.0 (II级: 较复杂, 需专项论证)' },
      { value: 1.15, label: '1.15 (III级: 复杂, 多专业交叉)' }
    ],
    complexityIndex: 2,
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
    taxRateIndex: 2,
    draftNotice: '输入内容会自动暂存；确认计算后保存到历史，项目内计算会同步写入项目。'
  },

  getDraftContext: function () {
    return {
      projectId: app.globalData.activeProjectId || 0,
      itemId: app.globalData.activeDraftItemId || 0,
      stage: 'F1',
      specialty: this.data.services[this.data.serviceIndex] ? this.data.services[this.data.serviceIndex].value : ''
    };
  },

  getDraftFormData: function () {
    return {
      projectName: this.data.projectName,
      cost: this.data.cost,
      serviceIndex: this.data.serviceIndex,
      industryIndex: this.data.industryIndex,
      complexityIndex: this.data.complexityIndex,
      ratioIndex: this.data.ratioIndex,
      taxRateIndex: this.data.taxRateIndex
    };
  },

  saveDraft: function () {
    if (this.hasCompletedCalculation) return;
    draftStore.saveDraft('pre-consult', this.getDraftContext(), this.getDraftFormData());
    this.setData({ draftNotice: '已自动暂存，退出后可继续编辑；确认计算后会正式保存。' });
  },

  restoreDraftIfAny: function () {
    const draft = draftStore.getDraft('pre-consult', this.getDraftContext());
    if (draft && draft.formData) {
      this.setData(Object.assign({}, draft.formData, {
        draftNotice: '已恢复上次未完成的暂存内容。'
      }));
    }
  },

  onHide: function () {
    this.saveDraft();
  },

  onUnload: function () {
    this.saveDraft();
  },

  onLoad: function (options) {
    options = options || {};
    if (app.globalData.targetStage === 'F1') {
      options = Object.assign({}, options, {
        specialty: app.globalData.targetSpecialty || options.specialty,
        cost: app.globalData.targetCost || options.cost,
        searchText: app.globalData.targetProjectName || options.searchText
      });
      app.globalData.targetStage = '';
      app.globalData.targetSpecialty = '';
      app.globalData.targetCost = '';
      app.globalData.targetProjectName = '';
      app.globalData.fromSmart = false;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
    let defaultName = `前期咨询项目 - ${dateStr}`;

    let costVal = '';
    let svcIdx = 0;

    if (options.cost) costVal = options.cost;
    if (options.searchText) defaultName = options.searchText;
    if (options.specialty) {
      // Map specialty from index page
      const specialtyMap = {
        'project_proposal': 0, 'feasibility_study': 1, 'project_proposal_eval': 2, 'feasibility_study_eval': 3,
        // Fallbacks
        'F1a': 0, 'F1b': 1, 'F1c': 2
      };
      if (specialtyMap[options.specialty] !== undefined) {
        svcIdx = specialtyMap[options.specialty];
      }
    }

    this.setData({
      projectName: defaultName,
      cost: costVal,
      serviceIndex: svcIdx
    }, () => this.restoreDraftIfAny());
  },

  onNameInput: function (e) {
    this.setData({ projectName: e.detail.value }, () => this.saveDraft());
  },

  onCostInput: function (e) {
    this.setData({ cost: e.detail.value }, () => this.saveDraft());
  },

  onServiceChange: function (e) {
    this.setData({ serviceIndex: parseInt(e.detail.value) }, () => this.saveDraft());
  },

  onIndustryChange: function (e) {
    this.setData({ industryIndex: parseInt(e.detail.value) }, () => this.saveDraft());
  },

  onComplexityChange: function (e) {
    this.setData({ complexityIndex: parseInt(e.detail.value) }, () => this.saveDraft());
  },

  onRatioChange: function (e) {
    this.setData({ ratioIndex: parseInt(e.detail.value) }, () => this.saveDraft());
  },

  onTaxRateChange: function (e) {
    this.setData({ taxRateIndex: parseInt(e.detail.value) }, () => this.saveDraft());
  },

  onReset: function () {
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
    this.setData({
      projectName: `前期咨询项目 - ${dateStr}`,
      cost: '',
      serviceIndex: 0,
      industryIndex: 2,
      complexityIndex: 2,
      ratioIndex: 2,
      taxRateIndex: 2
    });
    wx.showToast({
      title: '参数已重置',
      icon: 'success'
    });
  },

  onCalculate: function () {
    const cost = parseFloat(this.data.cost);
    if (!Number.isFinite(cost) || cost <= 0) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'none'
      });
      return;
    }

    const reportType = this.data.services[this.data.serviceIndex].value;
    const industryCoef = this.data.industries[this.data.industryIndex].value;
    const complexCoef = this.data.complexities[this.data.complexityIndex].value;
    const discount = this.data.ratios[this.data.ratioIndex].value;
    const taxRate = this.data.taxRates[this.data.taxRateIndex].value;

    const result = calculatePlanningFee({
      cost,
      reportType,
      additionalCoefficients: [industryCoef, complexCoef],
      discount,
      taxRate
    });
    result.industryCoef = industryCoef;
    result.complexCoef = complexCoef;
    result.reportTypeName = this.data.services[this.data.serviceIndex].label;
    result.basis = '计价格[1999]1283号';

    // Save calculation into record storage
    const activeProjectId = app.globalData.activeProjectId;
    const activeDraftItemId = app.globalData.activeDraftItemId;
    let itemName = this.data.services[this.data.serviceIndex].label;
    let itemId = null;
    let projectName = '';

    // 存入项目层级
    if (activeProjectId && getProject(activeProjectId)) {
      const project = getProject(activeProjectId);
      projectName = project.name;
      const item = activeDraftItemId
        ? updateCalcItemResult(activeProjectId, activeDraftItemId, result, itemName)
        : addCalcItem(activeProjectId, 'F1', result, itemName);
      const savedItem = item || (activeDraftItemId ? addCalcItem(activeProjectId, 'F1', result, itemName) : null);
      if (savedItem) itemId = savedItem.id;
    }
    app.globalData.activeDraftItemId = 0;

    const history = wx.getStorageSync(app.globalData.historyKey) || [];
    const newId = itemId || (history.length > 0 ? Math.max(...history.map(h => h.id)) + 1 : 1);

    const now = new Date();
    const timeStr = `今天 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newRecord = {
      id: newId,
      name: projectName ? `${projectName} · ${itemName}` : (this.data.projectName || '未命名前期咨询项目'),
      stage: 'F1',
      stageName: '前期决策',
      meta: timeStr,
      amount: `${result.total.toFixed(2)}万`,
      color: '#708198',
      calcDetail: result,
      projectId: activeProjectId || null,
      projectName: projectName,
      docs: [
        { name: `${itemName}报价单.pdf`, meta: `刚刚创建 · ${(Math.random() * 2 + 1).toFixed(1)} MB`, color: '#708198' }
      ]
    };

    history.unshift(newRecord);
    wx.setStorageSync(app.globalData.historyKey, history);
    this.hasCompletedCalculation = true;
    draftStore.clearDraft('pre-consult', {
      projectId: activeProjectId || 0,
      itemId: activeDraftItemId || 0,
      stage: 'F1',
      specialty: reportType
    });
    incrementUsageCount();

    wx.navigateTo({
      url: `/pages/result/result?id=${newId}`
    });
  },

  onSwitchToBidding: function () {
    wx.navigateTo({
      url: '/pages/bidding/bidding'
    });
  }
});
