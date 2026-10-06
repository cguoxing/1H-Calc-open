const { onGoHome } = require("../../utils/goHome");
const {
  calculateLandConsolidation,
  calculateHighStandardFarmland,
  calculateSpecialService,
  CONSOLIDATION_TYPES,
  TERRAIN_COEFFICIENTS,
  TOWNSHIP_COEFFICIENTS,
  ADDITIONAL_COEFFICIENTS,
  SPECIAL_SERVICES,
  HIGH_STANDARD_FARMLAND_FEES
} = require('../../utils/land-consolidation-calc.js');
const { incrementUsageCount } = require('../../utils/usage-counter.js');
const { toNumber, validateRates } = require('../../utils/number.js');

const app = getApp();

Page({
  onGoHome,
  data: {
    // 项目信息
    projectName: '',
    cost: '',

    // 整治类型
    typeIndex: 0,
    types: [
      { id: 'farmland', name: '农用地整理', icon: '🌾' },
      { id: 'construction', name: '建设用地整理', icon: '🏗️' },
      { id: 'ecological', name: '乡村生态保护修复', icon: '🌿' },
      { id: 'landscape', name: '乡村风貌提升与保护', icon: '🏘️' }
    ],
    currentType: 'farmland',

    // 子类型
    subTypeIndex: 0,
    subTypes: [],
    currentSubType: '',

    // 地貌
    terrainIndex: 0,
    terrainOptions: TERRAIN_COEFFICIENTS,

    // 乡镇数量
    townshipIndex: 0,
    townshipOptions: TOWNSHIP_COEFFICIENTS,

    // 复杂程度
    complexityIndex: 1,
    complexityOptions: [
      { id: 'simple', name: '简单（平原/单一类型）' },
      { id: 'medium', name: '中等' },
      { id: 'complex', name: '复杂（山区/多类型综合）' }
    ],

    // 附加系数（已从 ADDITIONAL_COEFFICIENTS 合并 selected 字段）

    // 收费
    discount: '100',
    taxRate: '6',

    // 专项服务（可选叠加）
    specialServices: [],
    showSpecialModal: false,
    allSpecialServices: Object.keys(SPECIAL_SERVICES).map(k => ({ id: k, name: SPECIAL_SERVICES[k].name })),

    // 附加系数选项（初始化 selected 字段）
    additionalOptions: ADDITIONAL_COEFFICIENTS.map(o => ({ ...o, selected: false })),

    // 结果
    result: null,
    resultVisible: false
  },

  onLoad: function () {
    this.updateSubTypes();
  },

  // 整治类型切换
  onTypeChange: function (e) {
    const index = parseInt(e.detail.value);
    const type = this.data.types[index];
    this.setData({
      typeIndex: index,
      currentType: type.id,
      subTypeIndex: 0,
      result: null,
      resultVisible: false
    });
    this.updateSubTypes();
  },

  updateSubTypes: function () {
    const typeConfig = CONSOLIDATION_TYPES[this.data.currentType];
    const subTypes = (typeConfig && typeConfig.subTypes) ? typeConfig.subTypes : [];
    this.setData({
      subTypes: subTypes,
      currentSubType: subTypes.length > 0 ? subTypes[0].id : ''
    });
  },

  onSubTypeChange: function (e) {
    const index = parseInt(e.detail.value);
    const subType = this.data.subTypes[index];
    this.setData({
      subTypeIndex: index,
      currentSubType: subType ? subType.id : '',
      result: null,
      resultVisible: false
    });
  },

  onTerrainChange: function (e) {
    this.setData({
      terrainIndex: parseInt(e.detail.value),
      result: null,
      resultVisible: false
    });
  },

  onTownshipChange: function (e) {
    this.setData({
      townshipIndex: parseInt(e.detail.value),
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

  // 附加系数切换
  toggleAdditional: function (e) {
    const addId = e.currentTarget.dataset.id;
    const options = [...this.data.additionalOptions];
    const item = options.find(o => o.id === addId);
    if (item) {
      item.selected = !item.selected;
    }
    this.setData({ additionalOptions: options, result: null, resultVisible: false });
  },

  // 专项服务弹窗
  onOpenSpecialModal: function () {
    this.setData({ showSpecialModal: true });
  },

  onCloseSpecialModal: function () {
    this.setData({ showSpecialModal: false });
  },

  toggleSpecialService: function (e) {
    const serviceId = e.currentTarget.dataset.id;
    let services = [...this.data.specialServices];
    const idx = services.findIndex(s => s.id === serviceId);
    if (idx >= 0) {
      services[idx].selected = true;
    } else {
      const svcConfig = SPECIAL_SERVICES[serviceId] || {};
      services.push({
        id: serviceId,
        serviceName: svcConfig.name || serviceId,
        area: '',
        villageCount: '',
        investment: '',
        selected: true
      });
    }
    this.setData({ 
      specialServices: services,
      showSpecialModal: false
    });
  },

  onToggleSpecialActive: function (e) {
    const serviceId = e.currentTarget.dataset.id;
    let services = [...this.data.specialServices];
    const idx = services.findIndex(s => s.id === serviceId);
    if (idx >= 0) {
      services[idx].selected = !services[idx].selected;
    }
    this.setData({ specialServices: services });
  },

  onRemoveSpecialService: function (e) {
    const serviceId = e.currentTarget.dataset.id;
    let services = [...this.data.specialServices];
    const idx = services.findIndex(s => s.id === serviceId);
    if (idx >= 0) {
      services.splice(idx, 1);
    }
    this.setData({ specialServices: services });
  },

  onSpecialParamInput: function (e) {
    const serviceId = e.currentTarget.dataset.id;
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    let services = [...this.data.specialServices];
    const svc = services.find(s => s.id === serviceId);
    if (svc) {
      svc[field] = value;
    }
    this.setData({ specialServices: services });
  },

  // 计算
  onCalculate: function () {
    const cost = parseFloat(this.data.cost);
    if (!Number.isFinite(cost) || cost <= 0) {
      wx.showToast({ title: '请输入有效的工程施工费', icon: 'none' });
      return;
    }

    const terrain = this.data.terrainOptions[this.data.terrainIndex];
    const township = this.data.townshipOptions[this.data.townshipIndex];
    const complexity = this.data.complexityOptions[this.data.complexityIndex];

    const discount = toNumber(this.data.discount, 100);
    const taxRate = toNumber(this.data.taxRate, 0);
    const rateError = validateRates(discount, taxRate);
    if (rateError) {
      wx.showToast({ title: rateError, icon: 'none' });
      return;
    }

    const result = calculateLandConsolidation({
      cost,
      type: this.data.currentType,
      subType: this.data.currentSubType,
      terrain: terrain.id,
      townshipCount: township.id,
      additionals: this.data.additionalOptions.filter(o => o.selected).map(o => o.id),
      complexity: complexity.id,
      discount,
      taxRate
    });

    // 计算叠加的专项服务
    let specialFees = [];
    let specialTotal = 0;
    this.data.specialServices.forEach(svc => {
      if (!svc.selected) return;
      const svcResult = calculateSpecialService(svc.id, {
        area: parseFloat(svc.area) || 0,
        villageCount: parseInt(svc.villageCount) || 0,
        investment: parseFloat(svc.investment) || 0,
        engineeringCost: cost,
        calcMode: 'rate'
      });
      if (svcResult.fee > 0) {
        specialFees.push(svcResult);
        specialTotal += svcResult.fee;
      }
    });

    result.specialFees = specialFees;
    result.specialTotal = round2(specialTotal);
    result.grandTotal = round2(result.total + specialTotal);

    this.setData({
      result,
      resultVisible: true
    });

    // 保存到历史记录
    this.saveToHistory(result);
  },

  // 保存到历史
  saveToHistory: function (result) {
    const record = {
      id: Math.floor(Date.now() * Math.random()),
      name: this.data.projectName || '全域土地综合整治取费',
      stage: 'F2b',
      color: '#2E7D32',
      createdAt: new Date().toISOString().split('T')[0],
      calcDetail: {
        cost: result.cost,
        type: result.type,
        subType: result.subType,
        basePrice: result.subtotal,
        specialtyCoef: result.adjustmentCoef,
        specialtyName: '土地整治综合调整',
        complexityCoef: result.terrainCoef,
        complexityName: result.terrainName,
        netAdditionalCoef: result.additionalCoef,
        total: result.grandTotal,
        taxRate: result.taxRate,
        tax: result.tax,
        discount: result.discount,
        extraDetails: [
          { name: '项目勘测费', ratio: (result.surveyRate * 100).toFixed(2) + '%', amount: result.surveyFee },
          { name: '项目设计与预算编制费', ratio: (result.designRate * 100).toFixed(2) + '%', amount: result.designFee }
        ],
        interpolationDetail: result.interpolationDetail,
        // F2b 特有字段
        landType: result.type,
        landSubType: result.subType,
        terrainCoef: result.terrainCoef,
        townshipCoef: result.townshipCoef,
        scaleCoef: result.scaleCoef,
        additionalDetails: result.additionalDetails,
        specialFees: result.specialFees,
        specialTotal: result.specialTotal
      }
    };

    const history = wx.getStorageSync(app.globalData.historyKey) || [];
    history.unshift(record);
    if (history.length > 100) history.pop();
    wx.setStorageSync(app.globalData.historyKey, history);
    incrementUsageCount();

    // 如果有活跃项目，也添加到项目
    if (app.globalData.activeProjectId) {
      try {
        const { addCalcItem } = require('../../utils/project-manager.js');
        addCalcItem(app.globalData.activeProjectId, 'F2b', record.calcDetail, record.name);
      } catch (e) { /* 静默失败 */ }
    }

    // 导航到结果页
    wx.navigateTo({
      url: `/pages/result/result?id=${record.id}`
    });
  },

  // 导航
  onGoHome: function () {
    wx.switchTab({ url: '/pages/index/index' });
  }
});

function round2(n) { return Math.round(n * 100) / 100; }
