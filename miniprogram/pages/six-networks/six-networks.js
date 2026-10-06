const { onGoHome } = require("../../utils/goHome");
const {
  calculateSixNetworksFee,
  getNetworkTypes,
  getNetworkSpecialServices,
  NETWORKS
} = require('../../utils/six-networks-calc.js');
const { incrementUsageCount } = require('../../utils/usage-counter.js');
const { toNumber, validateRates } = require('../../utils/number.js');

const app = getApp();

Page({
  onGoHome,
  data: {
    projectName: '',
    cost: '',

    // 网络选择
    networkIndex: 0,
    networks: Object.values(NETWORKS),

    // 子类型
    subTypeIndex: 0,
    subTypes: [],

    // 复杂程度
    complexityIndex: 1,
    complexityOptions: [
      { id: 'I', name: 'I级（简单）' },
      { id: 'II', name: 'II级（中等）' },
      { id: 'III', name: 'III级（复杂）' }
    ],

    // 附加调整
    additionalOptions: [],

    // 收费
    discount: '100',
    taxRate: '6',

    // 结果
    result: null,
    resultVisible: false
  },

  onLoad: function () {
    this.updateSubTypes();
  },

  onNetworkChange: function (e) {
    this.setData({
      networkIndex: parseInt(e.detail.value),
      subTypeIndex: 0,
      additionalOptions: [],
      result: null,
      resultVisible: false
    });
    this.updateSubTypes();
  },

  updateSubTypes: function () {
    const networkId = this.data.networks[this.data.networkIndex].id;
    const types = getNetworkTypes(networkId);

    // N6 物流网有特殊附加项
    let additionalOptions = [];
    if (networkId === 'N6') {
      const { LOGISTICS_ENGINEERING } = require('../../data/six-networks.js');
      additionalOptions = (LOGISTICS_ENGINEERING.specialFactors || []).map(o => ({ ...o, selected: false }));
    }

    this.setData({
      subTypes: types,
      additionalOptions
    });
  },

  onSubTypeChange: function (e) {
    this.setData({
      subTypeIndex: parseInt(e.detail.value),
      result: null,
      resultVisible: false
    });
  },

  onComplexityChange: function (e) {
    this.setData({
      complexityIndex: parseInt(e.detail.value),
      result: null,
      resultVisible: false
    });
  },

  onCostInput: function (e) {
    this.setData({ cost: e.detail.value, result: null, resultVisible: false });
  },

  onNameInput: function (e) {
    this.setData({ projectName: e.detail.value });
  },

  onDiscountInput: function (e) {
    this.setData({ discount: e.detail.value || '100', result: null, resultVisible: false });
  },

  onTaxRateInput: function (e) {
    this.setData({ taxRate: e.detail.value || '6', result: null, resultVisible: false });
  },

  toggleAdditional: function (e) {
    const addId = e.currentTarget.dataset.id;
    const options = [...this.data.additionalOptions];
    const item = options.find(o => o.id === addId);
    if (item) {
      item.selected = !item.selected;
    }
    this.setData({ additionalOptions: options, result: null, resultVisible: false });
  },

  onCalculate: function () {
    const cost = parseFloat(this.data.cost);
    if (!Number.isFinite(cost) || cost <= 0) {
      wx.showToast({ title: '请输入有效的工程计费额', icon: 'none' });
      return;
    }

    const network = this.data.networks[this.data.networkIndex];
    const subType = this.data.subTypes[this.data.subTypeIndex];
    const complexity = this.data.complexityOptions[this.data.complexityIndex];

    if (!subType) {
      wx.showToast({ title: '请选择工程类型', icon: 'none' });
      return;
    }

    const discount = toNumber(this.data.discount, 100);
    const taxRate = toNumber(this.data.taxRate, 0);
    const rateError = validateRates(discount, taxRate);
    if (rateError) {
      wx.showToast({ title: rateError, icon: 'none' });
      return;
    }

    const result = calculateSixNetworksFee({
      networkId: network.id,
      cost,
      subType: subType.id,
      complexity: complexity.id,
      additionals: this.data.additionalOptions.filter(o => o.selected).map(o => o.id),
      discount,
      taxRate
    });

    this.setData({ result, resultVisible: true });
    this.saveToHistory(result, network);
  },

  saveToHistory: function (result, network) {
    const record = {
      id: Math.floor(Date.now() * Math.random()),
      name: this.data.projectName || (network.name + '取费'),
      stage: 'F5b',
      color: network.color || '#102744',
      createdAt: new Date().toISOString().split('T')[0],
      calcDetail: {
        cost: result.cost,
        basePrice: result.basePrice,
        specialtyCoef: result.specialtyCoef,
        specialtyName: result.subType,
        complexityCoef: result.complexityCoef,
        complexityName: result.complexityName,
        netAdditionalCoef: result.additionalCoef,
        total: result.total,
        taxRate: result.taxRate,
        tax: result.tax,
        discount: result.discount,
        interpolationDetail: result.interpolationDetail,
        extraDetails: result.additionalDetails.map(a => ({
          name: a.name,
          ratio: '×' + a.coef,
          amount: 0
        })),
        // 六张网特有
        networkId: result.networkId,
        networkName: result.networkName,
        designFee: result.designFee
      }
    };

    const history = wx.getStorageSync(app.globalData.historyKey) || [];
    history.unshift(record);
    if (history.length > 100) history.pop();
    wx.setStorageSync(app.globalData.historyKey, history);
    incrementUsageCount();

    if (app.globalData.activeProjectId) {
      try {
        const { addCalcItem } = require('../../utils/project-manager.js');
        addCalcItem(app.globalData.activeProjectId, 'F5b', record.calcDetail, record.name);
      } catch (e) {}
    }

    // 导航到结果页
    wx.navigateTo({
      url: `/pages/result/result?id=${record.id}`
    });
  },

  onGoHome: function () {
    wx.switchTab({ url: '/pages/index/index' });
  }
});
