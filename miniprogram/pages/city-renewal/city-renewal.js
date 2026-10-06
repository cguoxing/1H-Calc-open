const { onGoHome } = require("../../utils/goHome");
const { incrementUsageCount } = require('../../utils/usage-counter.js');
const { toNumber, validateRates } = require('../../utils/number.js');
const app = getApp();

Page({
  onGoHome,
  data: {
    projectName: '',
    cost: '',
    area: '',

    // 更新类型
    renewalTypeIndex: 0,
    renewalTypes: [
      { id: 'old_district', name: '老旧小区改造', icon: '🏘️' },
      { id: 'shantytown', name: '棚户区改造', icon: '🏚️' },
      { id: 'historic', name: '历史街区保护更新', icon: '🏛️' },
      { id: 'industrial', name: '旧工业区改造', icon: '🏭' },
      { id: 'commercial', name: '商业街区更新', icon: '🏬' },
      { id: 'infrastructure', name: '基础设施更新', icon: '🔧' },
      { id: 'ecological', name: '生态修复/海绵城市', icon: '🌿' }
    ],

    // 复杂程度
    complexityIndex: 1,
    complexityOptions: [
      { id: 'I', name: 'I级（简单）', coef: 0.85 },
      { id: 'II', name: 'II级（中等）', coef: 1.0 },
      { id: 'III', name: 'III级（复杂）', coef: 1.15 }
    ],

    // 附加系数
    addOptions: [
      { id: 'occupied', name: '边运营边改造', coef: 1.3, selected: false },
      { id: 'heritage', name: '涉及文物保护', coef: 1.4, selected: false },
      { id: 'underground', name: '含地下空间开发', coef: 1.25, selected: false },
      { id: 'high_density', name: '高密度建成区', coef: 1.2, selected: false },
      { id: 'comprehensive', name: '综合整治（多类型）', coef: 1.35, selected: false },
      { id: 'smart', name: '智慧社区/智慧设施', coef: 1.15, selected: false }
    ],

    // 收费
    discount: '100',
    taxRate: '6',

    // 结果
    result: null,
    resultVisible: false
  },

  onLoad() {},

  onRenewalTypeChange(e) {
    this.setData({
      renewalTypeIndex: parseInt(e.detail.value),
      result: null,
      resultVisible: false
    });
  },

  onComplexityChange(e) {
    this.setData({
      complexityIndex: parseInt(e.detail.value),
      result: null,
      resultVisible: false
    });
  },

  onCostInput(e) {
    this.setData({ cost: e.detail.value, result: null, resultVisible: false });
  },

  onAreaInput(e) {
    this.setData({ area: e.detail.value, result: null, resultVisible: false });
  },

  onNameInput(e) {
    this.setData({ projectName: e.detail.value });
  },

  onDiscountInput(e) {
    this.setData({ discount: e.detail.value || '100', result: null, resultVisible: false });
  },

  onTaxRateInput(e) {
    this.setData({ taxRate: e.detail.value || '6', result: null, resultVisible: false });
  },

  toggleAdd(e) {
    const addId = e.currentTarget.dataset.id;
    const options = [...this.data.addOptions];
    const item = options.find(o => o.id === addId);
    if (item) item.selected = !item.selected;
    this.setData({ addOptions: options, result: null, resultVisible: false });
  },

  onCalculate() {
    const costVal = parseFloat(this.data.cost);
    if (!Number.isFinite(costVal) || costVal <= 0) {
      wx.showToast({ title: '请输入有效的工程计费额', icon: 'none' });
      return;
    }

    const renewalType = this.data.renewalTypes[this.data.renewalTypeIndex];
    const complexity = this.data.complexityOptions[this.data.complexityIndex];
    const discountVal = toNumber(this.data.discount, 100);
    const taxRateVal = toNumber(this.data.taxRate, 0);
    const rateError = validateRates(discountVal, taxRateVal);
    if (rateError) {
      wx.showToast({ title: rateError, icon: 'none' });
      return;
    }

    // 城市更新附加调整系数
    let addCoef = 1.0;
    const addDetails = [];
    this.data.addOptions.forEach(o => {
      if (o.selected) {
        addCoef *= o.coef;
        addDetails.push({ name: o.name, coef: o.coef });
      }
    });

    // 城市更新工程专业系数（不同改造类型）
    const typeCoefficients = {
      old_district: 1.0,
      shantytown: 1.1,
      historic: 1.3,
      industrial: 1.15,
      commercial: 1.05,
      infrastructure: 0.9,
      ecological: 1.0
    };
    const typeCoef = typeCoefficients[renewalType.id] || 1.0;
    const totalCoef = typeCoef * complexity.coef * addCoef;

    let result = {};
    try {
      const { calculateDesignFee } = require('../../utils/calculator.js');
      result = calculateDesignFee({
        cost: costVal,
        specialty: 'building',
        complexity: complexity.id,
        additionalCoefficients: [typeCoef * addCoef],
        discount: discountVal,
        taxRate: taxRateVal
      });

      result.stageName = renewalType.name;
      result.specialtyName = '城市更新 · ' + renewalType.name;
      result.addDetails = addDetails;
      result.typeCoef = typeCoef;
    } catch (err) {
      wx.showToast({ title: err.message || '计算失败', icon: 'none' });
      return;
    }

    this.setData({ result, resultVisible: true });
    this.saveToHistory(result, renewalType);
  },

  saveToHistory(result, renewalType) {
    const record = {
      id: Math.floor(Date.now() * Math.random()),
      name: this.data.projectName || (renewalType.name + '设计取费'),
      stage: 'F2',
      color: '#007AFF',
      createdAt: new Date().toISOString().split('T')[0],
      calcDetail: {
        cost: result.cost,
        basePrice: result.basePrice,
        specialtyCoef: result.specialtyCoef || 1.0,
        specialtyName: result.specialtyName || renewalType.name,
        complexityCoef: result.complexityCoef || 1.0,
        complexityName: result.complexityName || '',
        total: parseFloat(result.total) || 0,
        discount: result.discount || 100,
        taxRate: result.taxRate || 0,
        tax: result.tax || 0,
        extraDetails: result.addDetails || [],
        netAdditionalCoef: result.netAdditionalCoef || 1.0,
        interpolationDetail: result.interpolationDetail,
        renewalType: renewalType.id,
        renewalTypeName: renewalType.name
      }
    };

    const history = wx.getStorageSync(app.globalData.historyKey) || [];
    history.unshift(record);
    if (history.length > 100) history.pop();
    wx.setStorageSync(app.globalData.historyKey, history);
    incrementUsageCount();

    wx.navigateTo({
      url: `/pages/result/result?id=${record.id}`
    });
  },

  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' });
  }
});
