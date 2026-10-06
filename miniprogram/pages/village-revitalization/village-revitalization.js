const { onGoHome } = require("../../utils/goHome");
const {
  TOWN_PLAN_RATES,
  VILLAGE_PLAN_RATES,
  WHOLE_VILLAGE_RATES,
  VILLAGE_MIN_FEES,
  VILLAGE_ADD_COEFS
} = require('../../data/village-fees.js');
const { incrementUsageCount } = require('../../utils/usage-counter.js');
const { toNumber, validateRates } = require('../../utils/number.js');

const app = getApp();

Page({
  onGoHome,
  data: {
    projectName: '',

    // 规划类型
    planTypeIndex: 0,
    planTypes: [
      { id: 'township', name: '乡域国土空间规划', icon: '🏘️' },
      { id: 'village_single', name: '单个行政村规划', icon: '🏡' },
      { id: 'village_bundle', name: '多个行政村打包', icon: '🏘️' },
      { id: 'beautiful_village', name: '美丽乡村规划', icon: '🌻' },
      { id: 'whole_village', name: '整村规划设计', icon: '🏗️' }
    ],

    // 输入参数
    area: '',
    villageCount: '',

    // 整村规划设计子类型
    wholeTypeIndex: 0,
    wholeTypes: Object.keys(WHOLE_VILLAGE_RATES).map(k => ({
      id: k,
      name: WHOLE_VILLAGE_RATES[k].name,
      ...WHOLE_VILLAGE_RATES[k]
    })),

    // 附加调整系数
    addOptions: Object.values(VILLAGE_ADD_COEFS).map(o => ({ ...o, selected: false })),

    // 收费
    discount: '100',
    taxRate: '6',

    // 结果
    result: null,
    resultVisible: false
  },

  onLoad() {},

  onPlanTypeChange(e) {
    this.setData({
      planTypeIndex: parseInt(e.detail.value),
      result: null,
      resultVisible: false
    });
  },

  onWholeTypeChange(e) {
    this.setData({
      wholeTypeIndex: parseInt(e.detail.value),
      result: null,
      resultVisible: false
    });
  },

  onAreaInput(e) {
    this.setData({ area: e.detail.value, result: null, resultVisible: false });
  },

  onVillageCountInput(e) {
    this.setData({ villageCount: e.detail.value, result: null, resultVisible: false });
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
    const { planTypeIndex, planTypes, area, villageCount, discount, taxRate } = this.data;
    const planType = planTypes[planTypeIndex];
    const discountVal = toNumber(discount, 100);
    const taxRateVal = toNumber(taxRate, 0);
    const rateError = validateRates(discountVal, taxRateVal);
    if (rateError) {
      wx.showToast({ title: rateError, icon: 'none' });
      return;
    }

    // 计算附加系数
    let addCoef = 1.0;
    const addDetails = [];
    this.data.addOptions.forEach(o => {
      if (o.selected) {
        addCoef *= o.coef;
        addDetails.push({ name: o.name, coef: o.coef });
      }
    });

    let result = {};
    let stageName = '';

    try {
      if (['township', 'village_single', 'village_bundle', 'beautiful_village'].includes(planType.id)) {
        const areaVal = parseFloat(area);
        if (!Number.isFinite(areaVal) || areaVal <= 0) {
          wx.showToast({ title: '请输入有效面积', icon: 'none' });
          return;
        }

        const rates = VILLAGE_PLAN_RATES[planType.id];
        const avgRate = (rates.rate[0] + rates.rate[1]) / 2;
        let basicFee = areaVal * avgRate;

        // 保底
        const minFee = VILLAGE_MIN_FEES[planType.id === 'beautiful_village' ? 'village' : (planType.id === 'township' ? 'township' : 'village')] || 0;
        if (basicFee < minFee) basicFee = minFee;

        const total = basicFee * addCoef * (discountVal / 100) * (1 + taxRateVal / 100);

        result = {
          cost: areaVal + ' km²',
          basePrice: basicFee.toFixed(2),
          specialtyCoef: addCoef,
          specialtyName: rates.name,
          total: total.toFixed(2),
          discount: discountVal,
          taxRate: taxRateVal,
          tax: (total - basicFee * addCoef * discountVal / 100).toFixed(2),
          stageName: rates.name,
          addDetails,
          minFeeApplied: basicFee === minFee
        };
        stageName = rates.name;
      } else if (planType.id === 'whole_village') {
        const wholeType = this.data.wholeTypes[this.data.wholeTypeIndex];
        const countVal = parseInt(villageCount) || 1;
        const avgRate = (wholeType.low + wholeType.high) / 2;
        let basicFee = avgRate;

        // 按村庄数量调整
        if (countVal > 1) basicFee *= (1 + (countVal - 1) * 0.3);

        const minFee = VILLAGE_MIN_FEES.detailed || 0;
        if (basicFee < minFee) basicFee = minFee;

        const total = basicFee * addCoef * (discountVal / 100) * (1 + taxRateVal / 100);

        result = {
          cost: (countVal || 1) + ' 个村',
          basePrice: basicFee.toFixed(2),
          specialtyCoef: addCoef,
          specialtyName: wholeType.name,
          total: total.toFixed(2),
          discount: discountVal,
          taxRate: taxRateVal,
          tax: (total - basicFee * addCoef * discountVal / 100).toFixed(2),
          stageName: wholeType.name,
          addDetails,
          minFeeApplied: basicFee === minFee
        };
        stageName = wholeType.name;
      }
    } catch (err) {
      wx.showToast({ title: err.message || '计算失败', icon: 'none' });
      return;
    }

    this.setData({ result, resultVisible: true });
    this.saveToHistory(result, stageName);
  },

  saveToHistory(result, stageName) {
    const record = {
      id: Math.floor(Date.now() * Math.random()),
      name: this.data.projectName || (stageName || '乡村规划取费'),
      stage: 'F2',
      color: '#2E7D32',
      createdAt: new Date().toISOString().split('T')[0],
      calcDetail: {
        cost: result.cost,
        basePrice: result.basePrice,
        specialtyCoef: result.specialtyCoef || 1.0,
        specialtyName: result.specialtyName || stageName,
        total: parseFloat(result.total) || 0,
        discount: result.discount || 100,
        taxRate: result.taxRate || 0,
        tax: result.tax || 0,
        extraDetails: result.addDetails || [],
        planType: stageName
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
