const { onGoHome } = require("../../utils/goHome");
const {
  calculateEnvAssessment,
  calculateEnergyAssessment,
  calculateWaterSoil,
  calculateFloodImpact,
  calculateWaterResource,
  calculateSocialStability,
  calculateCulturalRelic,
  calculateTreeProtection,
  calculatePPP,
  calculatePostEvaluation,
  CONSULT_TYPES,
  ENV_INDUSTRY_COEF,
  ENV_SENSITIVE_COEF,
  WATER_RESOURCE_INDUSTRY_COEF
} = require('../../utils/condition-consulting-calc.js');
const { incrementUsageCount } = require('../../utils/usage-counter.js');
const { toNumber, validateRates } = require('../../utils/number.js');

const app = getApp();

const TYPE_KEYS = Object.keys(CONSULT_TYPES);

Page({
  onGoHome,
  data: {
    projectName: '',
    investment: '',

    // 咨询类型
    typeIndex: 0,
    typeOptions: TYPE_KEYS.map(k => CONSULT_TYPES[k]),

    // 子类型
    subTypeIndex: 0,
    subTypes: [],

    // 费率偏向
    rateIndex: 1,
    rateOptions: [
      { id: 'low', name: '低值（简单项目）', value: 0 },
      { id: 'mid', name: '中值（一般项目）', value: 0.5 },
      { id: 'high', name: '高值（复杂项目）', value: 1 }
    ],

    // 环评特有
    envIndustryIndex: 4,
    envIndustryOptions: Object.values(ENV_INDUSTRY_COEF),
    envSensitiveIndex: 1,
    envSensitiveOptions: Object.values(ENV_SENSITIVE_COEF),

    // 水资源特有
    waterVolume: '',
    waterIndustryIndex: 2,
    waterIndustryOptions: Object.values(WATER_RESOURCE_INDUSTRY_COEF),

    // 文物/树木特有
    relicArea: '',
    treeCount: '',

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

  onTypeChange: function (e) {
    this.setData({
      typeIndex: parseInt(e.detail.value),
      subTypeIndex: 0,
      result: null,
      resultVisible: false
    });
    this.updateSubTypes();
  },

  updateSubTypes: function () {
    const typeInfo = this.data.typeOptions[this.data.typeIndex];
    this.setData({
      subTypes: typeInfo.subTypes || []
    });
  },

  onSubTypeChange: function (e) {
    this.setData({
      subTypeIndex: parseInt(e.detail.value),
      result: null,
      resultVisible: false
    });
  },

  onInvestmentInput: function (e) {
    this.setData({ investment: e.detail.value, result: null, resultVisible: false });
  },

  onNameInput: function (e) {
    this.setData({ projectName: e.detail.value });
  },

  onRateChange: function (e) {
    this.setData({ rateIndex: parseInt(e.detail.value), result: null, resultVisible: false });
  },

  onDiscountInput: function (e) {
    this.setData({ discount: e.detail.value || '100', result: null, resultVisible: false });
  },

  onTaxRateInput: function (e) {
    this.setData({ taxRate: e.detail.value || '6', result: null, resultVisible: false });
  },

  // 环评特有输入
  onEnvIndustryChange: function (e) {
    this.setData({ envIndustryIndex: parseInt(e.detail.value), result: null, resultVisible: false });
  },
  onEnvSensitiveChange: function (e) {
    this.setData({ envSensitiveIndex: parseInt(e.detail.value), result: null, resultVisible: false });
  },

  // 水资源特有输入
  onWaterVolumeInput: function (e) {
    this.setData({ waterVolume: e.detail.value, result: null, resultVisible: false });
  },
  onWaterIndustryChange: function (e) {
    this.setData({ waterIndustryIndex: parseInt(e.detail.value), result: null, resultVisible: false });
  },

  // 文物/树木特有输入
  onRelicAreaInput: function (e) {
    this.setData({ relicArea: e.detail.value, result: null, resultVisible: false });
  },
  onTreeCountInput: function (e) {
    this.setData({ treeCount: e.detail.value, result: null, resultVisible: false });
  },

  onCalculate: function () {
    const investment = parseFloat(this.data.investment);
    if (!Number.isFinite(investment) || investment <= 0) {
      wx.showToast({ title: '请输入有效投资额', icon: 'none' });
      return;
    }

    const typeKey = TYPE_KEYS[this.data.typeIndex];
    const subType = this.data.subTypes[this.data.subTypeIndex];
    const rate = this.data.rateOptions[this.data.rateIndex].value;

    let result;
    switch (typeKey) {
      case 'env_assessment':
        result = calculateEnvAssessment({
          investment,
          subType: subType.id,
          industry: this.data.envIndustryOptions[this.data.envIndustryIndex]?.id || 'general',
          sensitiveType: this.data.envSensitiveOptions[this.data.envSensitiveIndex]?.id || 'type2',
          rate
        });
        break;
      case 'energy_assessment':
        result = calculateEnergyAssessment({ investment, subType: subType.id, rate });
        break;
      case 'water_soil':
        result = calculateWaterSoil({ investment, subType: subType.id, rate });
        break;
      case 'flood_impact':
        result = calculateFloodImpact({ investment, rate });
        break;
      case 'water_resource':
        result = calculateWaterResource({
          waterVolume: parseFloat(this.data.waterVolume) || 0,
          subType: subType.id,
          industry: this.data.waterIndustryOptions[this.data.waterIndustryIndex]?.id || 'general',
          rate
        });
        break;
      case 'social_stability':
        result = calculateSocialStability({ investment, subType: subType.id });
        break;
      case 'cultural_relic':
        result = calculateCulturalRelic({
          investment,
          subType: subType.id,
          area: parseFloat(this.data.relicArea) || 0,
          rate
        });
        break;
      case 'tree_protection':
        result = calculateTreeProtection({
          treeCount: parseInt(this.data.treeCount) || 0,
          subType: subType.id
        });
        break;
      case 'ppp_consult':
        result = calculatePPP({ investment, subType: subType.id, rate });
        break;
      case 'post_evaluation':
        result = calculatePostEvaluation({ investment, rate });
        break;
      default:
        result = { error: '未知咨询类型' };
    }

    // 应用折扣和税率
    const discount = toNumber(this.data.discount, 100);
    const taxRate = toNumber(this.data.taxRate, 0);
    const rateError = validateRates(discount, taxRate);
    if (rateError) {
      wx.showToast({ title: rateError, icon: 'none' });
      return;
    }
    const baseTotal = result.totalFee || result.fee || 0;
    const discounted = baseTotal * (discount / 100);
    const tax = discounted * (taxRate / 100);
    result.grandTotal = round2(discounted + tax);
    result.discount = discount;
    result.taxRate = taxRate;
    result.tax = round2(tax);

    this.setData({ result, resultVisible: true });
    this.saveToHistory(result);
  },

  saveToHistory: function (result) {
    const typeInfo = this.data.typeOptions[this.data.typeIndex];
    const record = {
      id: Math.floor(Date.now() * Math.random()),
      name: this.data.projectName || (typeInfo.name + '取费'),
      stage: 'F1.4',
      color: typeInfo.color || '#708198',
      createdAt: new Date().toISOString().split('T')[0],
      calcDetail: {
        cost: parseFloat(this.data.investment),
        basePrice: result.totalFee || result.baseFee || 0,
        total: result.grandTotal || result.totalFee || 0,
        taxRate: result.taxRate || 0,
        tax: result.tax || 0,
        discount: result.discount || 100,
        formula: result.formula || '',
        // F1.4 特有
        consultType: result.type,
        consultTypeName: result.typeName,
        subTypeName: result.subTypeName,
        industryCoef: result.industryCoef,
        sensitiveCoef: result.sensitiveCoef
      }
    };

    const history = wx.getStorageSync(app.globalData.historyKey) || [];
    history.unshift(record);
    if (history.length > 100) history.pop();
    wx.setStorageSync(app.globalData.historyKey, history);
    incrementUsageCount();

    // 导航到结果页
    wx.navigateTo({
      url: `/pages/result/result?id=${record.id}`
    });
  }
});

function round2(n) { return Math.round(n * 100) / 100; }
