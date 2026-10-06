const { onGoHome } = require("../../utils/goHome");
const {
  ENERGY_NEW_COEFS,
  ENERGY_HYDRO_COMPLEXITY,
  ENERGY_SAVING_RATES,
  ENERGY_SAVING_ADD_COEFS
} = require('../../data/energy-fees.js');
const { incrementUsageCount } = require('../../utils/usage-counter.js');
const { toNumber, validateRates } = require('../../utils/number.js');

const app = getApp();

Page({
  onGoHome,
  data: {
    // 项目信息
    projectName: '',
    cost: '',
    area: '',

    // 能源类型
    energyTypeIndex: 0,
    energyTypes: [
      { id: 'wind', name: '风力发电', icon: '🌬️' },
      { id: 'solar', name: '光伏发电', icon: '☀️' },
      { id: 'storage', name: '储能电站', icon: '🔋' },
      { id: 'integrated', name: '综合能源', icon: '⚡' },
      { id: 'biomass', name: '生物质发电', icon: '🌿' },
      { id: 'hydrogen', name: '氢能工程', icon: '💧' },
      { id: 'smart_grid', name: '智能电网', icon: '🔌' },
      { id: 'saving', name: '建筑节能改造', icon: '🏢' }
    ],

    // 节能改造子类型
    savingTypeIndex: 0,
    savingTypes: [
      { id: 'envelope', name: '围护结构改造' },
      { id: 'hvac', name: '暖通空调改造' },
      { id: 'lighting', name: '照明系统改造' },
      { id: 'renewable', name: '可再生能源系统' },
      { id: 'smart_control', name: '智能控制系统' }
    ],

    // 附加系数（节能改造）
    savingAddOptions: Object.values(ENERGY_SAVING_ADD_COEFS).map(o => ({ ...o, selected: false })),

    // 收费
    discount: '100',
    taxRate: '6',

    // 结果
    result: null,
    resultVisible: false
  },

  onLoad() {},

  onEnergyTypeChange(e) {
    this.setData({
      energyTypeIndex: parseInt(e.detail.value),
      result: null,
      resultVisible: false
    });
  },

  onSavingTypeChange(e) {
    this.setData({
      savingTypeIndex: parseInt(e.detail.value),
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

  toggleSavingAdd(e) {
    const addId = e.currentTarget.dataset.id;
    const options = [...this.data.savingAddOptions];
    const item = options.find(o => o.id === addId);
    if (item) item.selected = !item.selected;
    this.setData({ savingAddOptions: options, result: null, resultVisible: false });
  },

  onCalculate() {
    const { energyTypeIndex, energyTypes, cost, area, discount, taxRate } = this.data;
    const type = energyTypes[energyTypeIndex];
    const discountVal = toNumber(discount, 100);
    const taxRateVal = toNumber(taxRate, 0);
    const rateError = validateRates(discountVal, taxRateVal);
    if (rateError) {
      wx.showToast({ title: rateError, icon: 'none' });
      return;
    }
    let result = {};

    try {
      if (type.id === 'saving') {
        // 建筑节能改造
        const areaVal = parseFloat(area);
        if (!Number.isFinite(areaVal) || areaVal <= 0) {
          wx.showToast({ title: '请输入有效面积', icon: 'none' });
          return;
        }

        const savingType = this.data.savingTypes[this.data.savingTypeIndex];
        const rates = ENERGY_SAVING_RATES[savingType.id];
        const baseRate = (rates.low + rates.high) / 2;
        let addCoef = 1.0;
        const addDetails = [];
        this.data.savingAddOptions.forEach(o => {
          if (o.selected) {
            addCoef *= o.coef;
            addDetails.push({ name: o.name, coef: o.coef });
          }
        });

        const basicFee = areaVal * baseRate / 10000; // 转为万元
        const total = basicFee * addCoef * (discountVal / 100) * (1 + taxRateVal / 100);

        result = {
          cost: areaVal + ' m²',
          basePrice: basicFee.toFixed(2),
          specialtyCoef: addCoef,
          specialtyName: rates.name,
          total: total.toFixed(2),
          discount: discountVal,
          taxRate: taxRateVal,
          tax: (total - basicFee * addCoef * discountVal / 100).toFixed(2),
          stageName: '建筑节能改造',
          savingType: rates.name,
          addDetails
        };
      } else {
        // 新能源工程
        const costVal = parseFloat(cost);
        if (!Number.isFinite(costVal) || costVal <= 0) {
          wx.showToast({ title: '请输入有效计费额', icon: 'none' });
          return;
        }

        const energyCoef = ENERGY_NEW_COEFS[type.id];
        const { calculateDesignFee } = require('../../utils/calculator.js');
        result = calculateDesignFee({
          cost: costVal,
          specialty: 'building',
          complexity: 'II',
          additionalCoefficients: [energyCoef ? energyCoef.coef : 1.0],
          discount: discountVal,
          taxRate: taxRateVal
        });
        result.stageName = type.name;
      }
    } catch (err) {
      wx.showToast({ title: err.message || '计算失败', icon: 'none' });
      return;
    }

    this.setData({ result, resultVisible: true });
    this.saveToHistory(result, type);
  },

  saveToHistory(result, type) {
    const record = {
      id: Math.floor(Date.now() * Math.random()),
      name: this.data.projectName || (type.name + '取费'),
      stage: 'F5',
      color: type.id === 'saving' ? '#2E7D32' : '#FF9500',
      createdAt: new Date().toISOString().split('T')[0],
      calcDetail: {
        cost: result.cost,
        basePrice: result.basePrice,
        specialtyCoef: result.specialtyCoef || 1.0,
        specialtyName: result.specialtyName || type.name,
        total: parseFloat(result.total) || 0,
        discount: result.discount || 100,
        taxRate: result.taxRate || 0,
        tax: result.tax || 0,
        extraDetails: result.addDetails || [],
        netAdditionalCoef: result.netAdditionalCoef || 1.0,
        interpolationDetail: result.interpolationDetail,
        energyType: type.id,
        energyTypeName: type.name
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
