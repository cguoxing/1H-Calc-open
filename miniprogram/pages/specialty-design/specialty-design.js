const { onGoHome } = require("../../utils/goHome");
const {
  calcInteriorByCost, calcInteriorByArea,
  calcResidenceDecoByArea, calcResidenceDecoByCost, calcSelfBuildResidence,
  calcLandscapeByCost, calcLandscapeByArea,
  calcSelfBuildDesign,
  calcSignageByInvestment, calcSignageByArea, calcSignageProduction,
  calcSoftFurnishing,
  calcLighting,
  calcAcoustic,
  interiorAreaRates,
  landscapeAreaRates,
  selfBuildDesignRates,
  lightingAreaRates,
  acousticRates
} = require('../../utils/specialty-calc.js');
const { addCalcItem, updateCalcItemResult, getProject } = require('../../utils/project-manager.js');
const { incrementUsageCount } = require('../../utils/usage-counter.js');
const draftStore = require('../../utils/calc-draft.js');
const { toNumber, validateRates } = require('../../utils/number.js');
const app = getApp();

Page({
  onGoHome,
  data: {
    projectName: '',
    activeTab: 'S1',
    tabIndex: 0,
    tabs: [
      { value: 'S1', label: '室内设计' },
      { value: 'S3', label: '园林景观' },
      { value: 'S4', label: '私宅自建' },
      { value: 'S5', label: '导视标识' },
      { value: 'S6', label: '软装陈设' },
      { value: 'S7', label: '艺术照明' },
      { value: 'S8', label: '声学装修' }
    ],
    s1Methods: [
      { value: 'cost', label: '工程费法' },
      { value: 'area', label: '面积指标法' }
    ],
    s1MethodIndex: 0,
    s3Methods: [
      { value: 'cost', label: '工程费法' },
      { value: 'area', label: '面积指标法' }
    ],
    s3MethodIndex: 0,
    s5Methods: [
      { value: 'investment', label: '总投资%法' },
      { value: 'area', label: '面积指标法' },
      { value: 'production', label: '制作安装费清单' }
    ],
    s5MethodIndex: 0,
    s6Methods: [
      { value: 'area', label: '按套内面积' },
      { value: 'budget', label: '按软装预算' },
      { value: 'days', label: '按摆场天数' }
    ],
    s6MethodIndex: 0,
    s7Methods: [
      { value: 'area', label: '面积法' },
      { value: 'cost', label: '工程费法' }
    ],
    s7MethodIndex: 0,
    s8Methods: [
      { value: 'rate', label: '工程费法' },
      { value: 'area', label: '面积法' }
    ],
    s8MethodIndex: 0,
    discount: '100',
    taxRate: '6',
    extraServices: {
      overall: false,
      coordination: false,
      nonStdDevBase: '',
      nonStdDevRate: '10'
    },

    // S1 室内设计
    s1: {
      method: 'cost',
      cost: '',
      area: '',
      complexity: 'II',
      complexityCoefVal: 1.0,
      specialtyCoef: '1.0',
      baseDecoCoef: '1.0',
      baseDecoCoefIndex: 0,
      baseDecoCoefOptions: [
        { value: '1.0', label: '1.0' },
        { value: '1.1', label: '1.1' },
        { value: '1.2', label: '1.2' },
        { value: '1.3', label: '1.3' },
        { value: '1.4', label: '1.4' },
        { value: '1.5', label: '1.5' }
      ],
      unitPrice: '',
      unitPricePlaceholder: '200-500',
      categoryIndex: 0,
      categories: [
        { value: 'hotel', label: '酒店', suggest: '200-500' },
        { value: 'retail', label: '商业', suggest: '150-350' },
        { value: 'office', label: '办公', suggest: '200-400' },
        { value: 'museum', label: '展陈', suggest: '150-450' },
        { value: 'culture', label: '文体', suggest: '100-280' },
        { value: 'dining', label: '餐饮', suggest: '500-800' },
        { value: 'leisure', label: '娱乐', suggest: '500-800' },
        { value: 'transit', label: '交通', suggest: '50-100' },
        { value: 'medical', label: '医疗', suggest: '100-180' },
        { value: 'residential', label: '住宅', suggest: '300-1000' },
        { value: 'club', label: '会所', suggest: '500-1000' },
        { value: 'industrial', label: '工业', suggest: '100-150' }
      ],
      designerPremium: false,
      addCoefOptions: [
        { key: 'mep_secondary', label: '机电设备二次深化 (×1.3)', value: 1.3, checked: false },
        { key: 'furniture_art', label: '室内家具/陈设艺术 (×1.25)', value: 1.25, checked: false },
        { key: 'lighting_art', label: '建筑环境艺术照明 (×1.3)', value: 1.3, checked: false },
        { key: 'signage', label: '建筑标识系统 (×1.1)', value: 1.1, checked: false },
        { key: 'renovation_light', label: '既有建筑改造(轻) (×1.2)', value: 1.2, checked: false },
        { key: 'renovation_heavy', label: '既有建筑改造(重) (×1.5)', value: 1.5, checked: false }
      ],
      designRate: 80,
      combo: false
    },

    // S3 园林景观
    s3: {
      method: 'cost',
      cost: '',
      area: '',
      complexity: 'II',
      complexityCoefVal: 1.0,
      specialtyCoef: '1.1',
      baseLandscapeCoef: '1.0',
      baseLandscapeCoefIndex: 0,
      baseLandscapeCoefOptions: [
        { value: '1.0', label: '无附加系数（1.0）' },
        { value: '1.1', label: '轻微改扩建（1.1）' },
        { value: '1.25', label: '中度改扩建（1.25）' }
      ],
      unitPrice: '37.5',
      landscapeTypeIndex: 0,
      landscapeTypes: [
        { value: 'residential', label: '居住区景观' },
        { value: 'public_bldg', label: '公共建筑景观' },
        { value: 'park', label: '公园/广场' },
        { value: 'roadside', label: '道路景观' },
        { value: 'courtyard', label: '庭院/私家花园' }
      ],
      addCoefOptions: [
        { key: 'heritage', label: '古建筑/保护性建筑 (×1.3~1.6)', value: 1.45, checked: false },
        { key: 'roof_garden', label: '屋顶花园/室内花园 (×1.2~1.5)', value: 1.35, checked: false },
        { key: 'golf', label: '高尔夫球场 (×1.5)', value: 1.5, checked: false },
        { key: 'wetland', label: '湿地公园/生态修复 (×1.3)', value: 1.3, checked: false },
        { key: 'night_light', label: '夜景照明专项 (×1.3)', value: 1.3, checked: false }
      ]
    },

    // S4 私宅自建
    s4: {
      area: '',
      complexity: 'II',
      includeDeco: false,
      includeLandscape: false,
      designUnitPrice: '65',
      decoUnitPrice: '165',
      landscapeUnitPrice: '80'
    },

    // S5 导视标识
    s5: {
      method: 'investment',
      cost: '',
      area: '',
      unitPrice: '9',
      signageTypeIndex: 0,
      signageTypes: [
        { value: 'indoor', label: '建筑内部标识' },
        { value: 'outdoor_campus', label: '园区导视' }
      ],
      installRate: '20',
      productionItems: [
        { type: 'door_plate', name: '室内门牌/房间牌', unitPrice: 125, qty: 0, unit: '块', displayValue: '0.00' },
        { type: 'indoor_small', name: '小型导向牌', unitPrice: 500, qty: 0, unit: '块', displayValue: '0.00' },
        { type: 'indoor_medium', name: '中型导向牌', unitPrice: 1900, qty: 0, unit: '块', displayValue: '0.00' },
        { type: 'floor_index', name: '楼层索引牌', unitPrice: 1250, qty: 0, unit: '块', displayValue: '0.00' },
        { type: 'outdoor', name: '户外导向牌', unitPrice: 3000, qty: 0, unit: '块', displayValue: '0.00' },
        { type: 'monument', name: '精神堡垒/主标识', unitPrice: 55000, qty: 0, unit: '座', displayValue: '0.00' },
        { type: 'road_sign', name: '道路交通标志', unitPrice: 1750, qty: 0, unit: '块', displayValue: '0.00' },
        { type: 'parking', name: '停车场标识系统', unitPrice: 9000, qty: 0, unit: '套', displayValue: '0.00' },
        { type: 'scenic', name: '景区解说牌', unitPrice: 2900, qty: 0, unit: '块', displayValue: '0.00' },
        { type: 'led', name: '电子显示屏导视', unitPrice: 27500, qty: 0, unit: '套', displayValue: '0.00' },
        { type: 'letter', name: '发光字/立体字', unitPrice: 900, qty: 0, unit: '字', displayValue: '0.00' }
      ]
    },

    // S6 软装陈设
    s6: {
      method: 'area',
      area: '',
      budget: '',
      days: '',
      unitPrice: '55',
      dayUnitPrice: '3500'
    },

    // S7 艺术照明
    s7: {
      method: 'area',
      cost: '',
      rate: '3',
      area: '',
      unitPrice: '20',
      lightingTypeIndex: 0,
      lightingTypes: [
        { value: 'facade', label: '外立面照明 (5~35元/m²)' },
        { value: 'landscape', label: '景观照明 (3~55元/m²)' },
        { value: 'interior', label: '室内艺术照明 (5~200元/m²)' },
        { value: 'city', label: '城市夜景照明规划 (1~9元/m²)' }
      ]
    },

    // S8 声学装修
    s8: {
      method: 'rate',
      cost: '',
      area: '',
      unitPrice: '35',
      acousticTypeIndex: 0,
      acousticTypes: [
        { value: 'studio', label: '录音棚/演播厅 (8%~15%)' },
        { value: 'concert', label: '音乐厅/剧院 (10%~20%)' },
        { value: 'cinema', label: '影院/多功能厅 (6%~12%)' }
      ]
    },
    draftNotice: '输入内容会自动暂存；确认计算后保存到历史，项目内计算会同步写入项目。'
  },

  getDraftContext: function () {
    return {
      projectId: app.globalData.activeProjectId || 0,
      itemId: app.globalData.activeDraftItemId || 0,
      stage: 'F4b',
      specialty: this.data.activeTab || app.globalData.targetSpecialty || ''
    };
  },

  getDraftFormData: function () {
    return {
      projectName: this.data.projectName,
      tabIndex: this.data.tabIndex,
      activeTab: this.data.activeTab,
      s1MethodIndex: this.data.s1MethodIndex,
      s3MethodIndex: this.data.s3MethodIndex,
      s5MethodIndex: this.data.s5MethodIndex,
      s6MethodIndex: this.data.s6MethodIndex,
      s7MethodIndex: this.data.s7MethodIndex,
      s8MethodIndex: this.data.s8MethodIndex,
      s1: this.data.s1,
      s3: this.data.s3,
      s4: this.data.s4,
      s5: this.data.s5,
      s6: this.data.s6,
      s7: this.data.s7,
      s8: this.data.s8,
      extraServices: this.data.extraServices,
      discount: this.data.discount,
      taxRate: this.data.taxRate
    };
  },

  saveDraft: function () {
    if (this.hasCompletedCalculation) return;
    draftStore.saveDraft('specialty-design', this.getDraftContext(), this.getDraftFormData());
    this.setData({ draftNotice: '已自动暂存，退出后可继续编辑；确认计算后会正式保存。' });
  },

  restoreDraftIfAny: function () {
    const draft = draftStore.getDraft('specialty-design', this.getDraftContext());
    if (draft && draft.formData) {
      this.setData(Object.assign({}, draft.formData, {
        draftNotice: '已恢复上次未完成的暂存内容。'
      }));
    }
  },

  markDraftDirty: function () {
    this.saveDraft();
  },

  onHide: function () {
    this.saveDraft();
  },

  onUnload: function () {
    this.saveDraft();
  },

  onLoad: function () {
    this.updateS1DefaultUnitPrice();
    this.updateS3DefaultUnitPrice();
    this.updateS4DefaultUnitPrices();
    this.updateS5DefaultUnitPrice();
    this.updateS7DefaultUnitPrice();
    this.applySmartParams();
    this.restoreDraftIfAny();
  },

  onShow: function () {
    if (app.globalData.targetStage === 'F4b') {
      this.applySmartParams();
    }
  },

  applySmartParams: function () {
    if (app.globalData.targetStage !== 'F4b') return;

    const specialty = app.globalData.targetSpecialty || 'S1';
    const cost = app.globalData.targetCost || '';
    const area = app.globalData.targetArea || '';
    const projectName = app.globalData.targetProjectName || '';
    const tabMap = { S1: 0, S3: 1, S4: 2, S5: 3, S6: 4, S7: 5, S8: 6 };
    const tabIndex = tabMap[specialty] !== undefined ? tabMap[specialty] : 0;
    const activeTab = this.data.tabs[tabIndex].value;
    const updates = {
      tabIndex,
      activeTab
    };
    if (projectName) updates.projectName = projectName;

    if (activeTab === 'S1') {
      if (cost) updates['s1.cost'] = cost;
      if (area) updates['s1.area'] = area;
    } else if (activeTab === 'S3') {
      if (cost) updates['s3.cost'] = cost;
      if (area) updates['s3.area'] = area;
    } else if (activeTab === 'S4') {
      if (area) updates['s4.area'] = area;
    } else if (activeTab === 'S5') {
      if (cost) updates['s5.cost'] = cost;
      if (area) updates['s5.area'] = area;
    } else if (activeTab === 'S6') {
      if (area) updates['s6.area'] = area;
      if (cost) updates['s6.budget'] = cost;
    } else if (activeTab === 'S7') {
      if (area) updates['s7.area'] = area;
    } else if (activeTab === 'S8') {
      if (cost) updates['s8.cost'] = cost;
      if (area) updates['s8.area'] = area;
    }

    this.setData(updates);

    app.globalData.targetStage = '';
    app.globalData.targetSpecialty = '';
    app.globalData.targetCost = '';
    app.globalData.targetArea = '';
    app.globalData.targetProjectName = '';
    app.globalData.fromSmart = false;
  },

  onTabChange: function (e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      tabIndex: idx,
      activeTab: this.data.tabs[idx].value
    }, () => {
      this.restoreDraftIfAny();
      this.saveDraft();
    });
  },

  // === S1 Helpers ===
  onS1MethodChange: function (e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      s1MethodIndex: idx,
      's1.method': this.data.s1Methods[idx].value
    });
  },
  onNameInput: function (e) { this.setData({ projectName: e.detail.value }, () => this.saveDraft()); },
  onS1CostInput: function (e) { this.setData({ 's1.cost': e.detail.value }, () => this.saveDraft()); },
  onS1AreaInput: function (e) { this.setData({ 's1.area': e.detail.value }, () => this.saveDraft()); },
  onTapS1Complexity: function () {
    const items = ['I级 (简单 0.85)', 'II级 (较复杂 1.0)', 'III级 (复杂 1.15)'];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const complexity = ['I', 'II', 'III'][res.tapIndex];
        const coefs = [0.85, 1.0, 1.15];
        this.setData({
          's1.complexity': complexity,
          's1.complexityCoefVal': coefs[res.tapIndex]
        }, () => {
          this.updateS1DefaultUnitPrice();
        });
      }
    });
  },
  onS1CategoryChange: function (e) {
    this.setData({
      's1.categoryIndex': parseInt(e.detail.value),
      's1.unitPrice': ''
    }, () => {
      this.updateS1DefaultUnitPrice();
    });
  },
  toggleS1Designer: function () {
    this.setData({ 's1.designerPremium': !this.data.s1.designerPremium });
  },
  toggleS1AddCoef: function (e) {
    const key = e.currentTarget.dataset.key;
    const options = this.data.s1.addCoefOptions;
    const idx = options.findIndex(o => o.key === key);
    if (idx === -1) return;
    options[idx].checked = !options[idx].checked;
    this.setData({ 's1.addCoefOptions': options });
  },
  updateS1DefaultUnitPrice: function () {
    const s1 = this.data.s1;
    const category = s1.categories[s1.categoryIndex];
    if (!category) return;
    this.setData({ 's1.unitPricePlaceholder': category.suggest || '请输入单价' });
  },
  onS1UnitPriceInput: function (e) { this.setData({ 's1.unitPrice': e.detail.value }); },
  onS1BaseDecoCoefChange: function (e) {
    const idx = parseInt(e.detail.value);
    const option = this.data.s1.baseDecoCoefOptions[idx];
    if (!option) return;
    this.setData({
      's1.baseDecoCoefIndex': idx,
      's1.baseDecoCoef': option.value
    });
  },

  onS1BaseDecoCoefInput: function (e) {
    this.setData({ 's1.baseDecoCoef': e.detail.value });
  },

  // === S3 Helpers ===
  onS3MethodChange: function (e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      s3MethodIndex: idx,
      's3.method': this.data.s3Methods[idx].value
    });
  },
  onS3CostInput: function (e) { this.setData({ 's3.cost': e.detail.value }, () => this.saveDraft()); },
  onS3AreaInput: function (e) { this.setData({ 's3.area': e.detail.value }, () => this.saveDraft()); },
  onTapS3Complexity: function () {
    const items = ['I级 (一般道路/片林)', 'II级 (标准景区/公建)', 'III级 (公园/高标准)'];
    const coefs = [0.85, 1.0, 1.15];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const complexity = ['I', 'II', 'III'][res.tapIndex];
        this.setData({
          's3.complexity': complexity,
          's3.complexityCoefVal': coefs[res.tapIndex]
        }, () => {
          this.updateS3DefaultUnitPrice();
        });
      }
    });
  },
  onS3BaseLandscapeCoefChange: function (e) {
    const idx = parseInt(e.detail.value);
    const option = this.data.s3.baseLandscapeCoefOptions[idx];
    if (!option) return;
    this.setData({
      's3.baseLandscapeCoefIndex': idx,
      's3.baseLandscapeCoef': option.value
    });
  },
  onS3LandscapeTypeChange: function (e) {
    this.setData({ 's3.landscapeTypeIndex': parseInt(e.detail.value) }, () => {
      this.updateS3DefaultUnitPrice();
    });
  },
  toggleS3AddCoef: function (e) {
    const key = e.currentTarget.dataset.key;
    const options = this.data.s3.addCoefOptions;
    const idx = options.findIndex(o => o.key === key);
    if (idx === -1) return;
    options[idx].checked = !options[idx].checked;
    this.setData({ 's3.addCoefOptions': options });
  },
  updateS3DefaultUnitPrice: function () {
    const s3 = this.data.s3;
    const landscapeType = s3.landscapeTypes[s3.landscapeTypeIndex].value;
    const complexity = s3.complexity;
    const range = landscapeAreaRates[landscapeType];
    if (range) {
      const [low, high] = range[complexity] || range['II'];
      const price = (low + high) / 2;
      this.setData({ 's3.unitPrice': String(price) });
    }
  },
  onS3UnitPriceInput: function (e) { this.setData({ 's3.unitPrice': e.detail.value }); },

  // === S4 Helpers ===
  onS4AreaInput: function (e) {
    this.setData({ 's4.area': e.detail.value }, () => {
      this.updateS4DefaultUnitPrices();
      this.saveDraft();
    });
  },
  onTapS4Complexity: function () {
    const items = ['I级 (简单)', 'II级 (中等)', 'III级 (复杂)'];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const complexity = ['I', 'II', 'III'][res.tapIndex];
        this.setData({ 's4.complexity': complexity }, () => {
          this.updateS4DefaultUnitPrices();
        });
      }
    });
  },
  toggleS4Deco: function () {
    this.setData({ 's4.includeDeco': !this.data.s4.includeDeco });
  },
  toggleS4Landscape: function () {
    this.setData({ 's4.includeLandscape': !this.data.s4.includeLandscape });
  },
  updateS4DefaultUnitPrices: function () {
    const areaVal = parseFloat(this.data.s4.area) || 0;
    let rateRange = [25, 80];
    let decoRange = [50, 180];
    for (const bracket of selfBuildDesignRates) {
      if (areaVal <= bracket.limit) {
        rateRange = bracket.rate;
        decoRange = bracket.decoRate;
        break;
      }
    }
    const complexityIdx = { I: 0, II: 0.5, III: 1 };
    const idx = complexityIdx[this.data.s4.complexity] || 0.5;
    const designRate = rateRange[0] + (rateRange[1] - rateRange[0]) * idx;
    const decoRate = decoRange[0] + (decoRange[1] - decoRange[0]) * idx;
    const landscapeRate = 40 + (120 - 40) * idx;
    this.setData({
      's4.designUnitPrice': String(designRate),
      's4.decoUnitPrice': String(decoRate),
      's4.landscapeUnitPrice': String(landscapeRate)
    });
  },
  onS4DesignUnitPriceInput: function (e) { this.setData({ 's4.designUnitPrice': e.detail.value }); },
  onS4DecoUnitPriceInput: function (e) { this.setData({ 's4.decoUnitPrice': e.detail.value }); },
  onS4LandscapeUnitPriceInput: function (e) { this.setData({ 's4.landscapeUnitPrice': e.detail.value }); },

  // === S5 Helpers ===
  onS5MethodChange: function (e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      s5MethodIndex: idx,
      's5.method': this.data.s5Methods[idx].value
    });
  },
  onS5CostInput: function (e) { this.setData({ 's5.cost': e.detail.value }, () => this.saveDraft()); },
  onS5AreaInput: function (e) { this.setData({ 's5.area': e.detail.value }, () => this.saveDraft()); },
  onS5SignageTypeChange: function (e) {
    this.setData({ 's5.signageTypeIndex': parseInt(e.detail.value) }, () => {
      this.updateS5DefaultUnitPrice();
    });
  },
  onS5InstallRateInput: function (e) { this.setData({ 's5.installRate': e.detail.value }); },
  getS5ProductionDisplayValue: function (item) {
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const qty = parseFloat(item.qty) || 0;
    return ((unitPrice * qty) / 10000).toFixed(2);
  },
  onS5ProdQtyInput: function (e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const qty = parseFloat(e.detail.value) || 0;
    const item = this.data.s5.productionItems[index];
    const displayValue = this.getS5ProductionDisplayValue({ ...item, qty });
    this.setData({
      [`s5.productionItems[${index}].qty`]: qty,
      [`s5.productionItems[${index}].displayValue`]: displayValue
    });
  },
  onS5ProdNameInput: function (e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({ [`s5.productionItems[${index}].name`]: e.detail.value });
  },
  onS5ProdUnitPriceInput: function (e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const item = this.data.s5.productionItems[index];
    const unitPrice = parseFloat(e.detail.value) || 0;
    const displayValue = this.getS5ProductionDisplayValue({ ...item, unitPrice });
    this.setData({
      [`s5.productionItems[${index}].unitPrice`]: unitPrice,
      [`s5.productionItems[${index}].displayValue`]: displayValue
    });
  },
  onS5ProdUnitInput: function (e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({ [`s5.productionItems[${index}].unit`]: e.detail.value || '项' });
  },
  onS5AddProductionItem: function () {
    const items = this.data.s5.productionItems.slice();
    items.push({
      type: `custom_${Date.now()}`,
      name: '自定义项目',
      unitPrice: 0,
      qty: 0,
      unit: '项',
      displayValue: '0.00',
      custom: true
    });
    this.setData({ 's5.productionItems': items });
  },
  onS5RemoveProductionItem: function (e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const items = this.data.s5.productionItems.slice();
    items.splice(index, 1);
    this.setData({ 's5.productionItems': items });
  },
  updateS5DefaultUnitPrice: function () {
    const s5 = this.data.s5;
    const signageType = s5.signageTypes[s5.signageTypeIndex].value;
    const rates = {
      indoor: [3, 15],
      outdoor_campus: [0.5, 3]
    };
    const range = rates[signageType] || rates['indoor'];
    const price = (range[0] + range[1]) / 2;
    this.setData({ 's5.unitPrice': String(price) });
  },
  onS5UnitPriceInput: function (e) { this.setData({ 's5.unitPrice': e.detail.value }); },

  // === S6 Helpers ===
  onS6MethodChange: function (e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      s6MethodIndex: idx,
      's6.method': this.data.s6Methods[idx].value
    });
  },
  onS6AreaInput: function (e) { this.setData({ 's6.area': e.detail.value }, () => this.saveDraft()); },
  onS6BudgetInput: function (e) { this.setData({ 's6.budget': e.detail.value }, () => this.saveDraft()); },
  onS6DaysInput: function (e) { this.setData({ 's6.days': e.detail.value }, () => this.saveDraft()); },
  onS6UnitPriceInput: function (e) { this.setData({ 's6.unitPrice': e.detail.value }); },
  onS6DayUnitPriceInput: function (e) { this.setData({ 's6.dayUnitPrice': e.detail.value }); },

  // === S7 Helpers ===
  onS7MethodChange: function (e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      s7MethodIndex: idx,
      's7.method': this.data.s7Methods[idx].value
    });
  },
  onS7CostInput: function (e) { this.setData({ 's7.cost': e.detail.value }, () => this.saveDraft()); },
  onS7RateInput: function (e) { this.setData({ 's7.rate': e.detail.value }, () => this.saveDraft()); },
  onS7AreaInput: function (e) { this.setData({ 's7.area': e.detail.value }, () => this.saveDraft()); },
  onS7LightingTypeChange: function (e) {
    this.setData({ 's7.lightingTypeIndex': parseInt(e.detail.value) }, () => {
      this.updateS7DefaultUnitPrice();
    });
  },
  updateS7DefaultUnitPrice: function () {
    const s7 = this.data.s7;
    const lightingType = s7.lightingTypes[s7.lightingTypeIndex].value;
    const rates = lightingAreaRates[lightingType];
    if (rates) {
      const price = (rates.low + rates.high) / 2;
      this.setData({ 's7.unitPrice': String(price) });
    }
  },
  onS7UnitPriceInput: function (e) { this.setData({ 's7.unitPrice': e.detail.value }); },

  // === S8 Helpers ===
  onS8MethodChange: function (e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      s8MethodIndex: idx,
      's8.method': this.data.s8Methods[idx].value
    });
  },
  onS8CostInput: function (e) { this.setData({ 's8.cost': e.detail.value }, () => this.saveDraft()); },
  onS8AreaInput: function (e) { this.setData({ 's8.area': e.detail.value }, () => this.saveDraft()); },
  onS8AcousticTypeChange: function (e) {
    this.setData({ 's8.acousticTypeIndex': parseInt(e.detail.value) });
  },
  onS8UnitPriceInput: function (e) { this.setData({ 's8.unitPrice': e.detail.value }); },

  // === Common ===
  onDiscountInput: function (e) { this.setData({ discount: e.detail.value }, () => this.saveDraft()); },
  onTaxRateInput: function (e) { this.setData({ taxRate: e.detail.value }, () => this.saveDraft()); },
  toggleExtraOverall: function () {
    this.setData({ 'extraServices.overall': !this.data.extraServices.overall });
  },
  toggleExtraCoordination: function () {
    this.setData({ 'extraServices.coordination': !this.data.extraServices.coordination });
  },
  onNonStdDevBaseInput: function (e) {
    this.setData({ 'extraServices.nonStdDevBase': e.detail.value });
  },
  onNonStdDevRateInput: function (e) {
    this.setData({ 'extraServices.nonStdDevRate': e.detail.value });
  },
  applyExtraServices: function (result) {
    const extra = this.data.extraServices || {};
    const baseFee = parseFloat(result.basicFee || result.discountedTotal || result.total || 0);
    const extraDetails = [];
    let extraSum = 0;

    if (extra.overall) {
      const fee = baseFee * 0.05;
      extraSum += fee;
      extraDetails.push({ name: '总体设计费', ratio: '5%', amount: parseFloat(fee.toFixed(4)) });
    }
    if (extra.coordination) {
      const fee = baseFee * 0.05;
      extraSum += fee;
      extraDetails.push({ name: '主体设计协调费', ratio: '5%', amount: parseFloat(fee.toFixed(4)) });
    }

    const nonStdDevBase = parseFloat(extra.nonStdDevBase) || 0;
    const nonStdDevRate = parseFloat(extra.nonStdDevRate) || 0;
    if (nonStdDevBase > 0 && nonStdDevRate > 0) {
      const fee = nonStdDevBase * (nonStdDevRate / 100);
      extraSum += fee;
      extraDetails.push({
        name: '非标准设备设计费',
        ratio: `${nonStdDevRate}%`,
        amount: parseFloat(fee.toFixed(4)),
        desc: `计费额 ${nonStdDevBase} 万元`
      });
    }

    if (extraSum <= 0) return result;

    const taxRate = parseFloat(result.taxRate) || 0;
    const extraTax = extraSum * (taxRate / 100);
    return Object.assign({}, result, {
      extraDetails: (result.extraDetails || []).concat(extraDetails),
      extraServiceFee: parseFloat(extraSum.toFixed(4)),
      discountedTotal: parseFloat(((parseFloat(result.discountedTotal) || 0) + extraSum).toFixed(4)),
      tax: parseFloat(((parseFloat(result.tax) || 0) + extraTax).toFixed(4)),
      total: parseFloat(((parseFloat(result.total) || 0) + extraSum + extraTax).toFixed(4))
    });
  },

  onReset: function () {
    const tab = this.data.activeTab;
    const resetData = {};
    if (tab === 'S1') resetData.s1 = { ...this.data.s1, cost: '', area: '' };
    else if (tab === 'S3') resetData.s3 = { ...this.data.s3, cost: '', area: '' };
    else if (tab === 'S4') resetData.s4 = { ...this.data.s4, area: '' };
    else if (tab === 'S5') resetData.s5 = { ...this.data.s5, cost: '', area: '' };
    else if (tab === 'S6') resetData.s6 = { ...this.data.s6, area: '', budget: '', days: '' };
    else if (tab === 'S7') resetData.s7 = { ...this.data.s7, cost: '', area: '' };
    else if (tab === 'S8') resetData.s8 = { ...this.data.s8, cost: '', area: '' };
    this.setData(resetData);
    wx.showToast({ title: '参数已重置', icon: 'success' });
  },

  onCalculate: function () {
    const tab = this.data.activeTab;
    const discount = toNumber(this.data.discount, 100);
    const taxRate = toNumber(this.data.taxRate, 0);
    const rateError = validateRates(discount, taxRate);
    if (rateError) {
      wx.showToast({ title: rateError, icon: 'none' });
      return;
    }
    let result = null;
    let itemName = '';

    try {
      if (tab === 'S1') {
        const s1 = this.data.s1;
        if (s1.method === 'cost') {
          const cost = parseFloat(s1.cost);
          if (!Number.isFinite(cost) || cost <= 0) { wx.showToast({ title: '请输入有效工程费', icon: 'none' }); return; }
          const specialtyCoef = parseFloat(s1.specialtyCoef) || 1.0;
          const baseDecoCoef = parseFloat(s1.baseDecoCoef) || 1.0;
          const addCoefs = s1.addCoefOptions.filter(o => o.checked).map(o => o.value);
          result = calcInteriorByCost({ cost, complexity: s1.complexity, specialtyCoef, baseDecoCoef, additionalCoefs: addCoefs, discount, taxRate });
          itemName = '室内设计(工程费法)';
        } else if (s1.method === 'area') {
          const area = parseFloat(s1.area);
          if (!Number.isFinite(area) || area <= 0) { wx.showToast({ title: '请输入有效面积', icon: 'none' }); return; }
          const category = s1.categories[s1.categoryIndex].value;
          const unitPrice = parseFloat(s1.unitPrice);
          if (!Number.isFinite(unitPrice) || unitPrice <= 0) { wx.showToast({ title: '请输入有效单价', icon: 'none' }); return; }
          result = calcInteriorByArea({ area, category, complexity: s1.complexity, designerPremium: s1.designerPremium, unitPrice, discount, taxRate });
          itemName = '室内设计(面积法)';
        }
      } else if (tab === 'S3') {
        const s3 = this.data.s3;
        if (s3.method === 'cost') {
          const cost = parseFloat(s3.cost);
          if (!Number.isFinite(cost) || cost <= 0) { wx.showToast({ title: '请输入有效工程费', icon: 'none' }); return; }
          const addCoefs = s3.addCoefOptions.filter(o => o.checked).map(o => o.value);
          const specialtyCoef = parseFloat(s3.specialtyCoef) || 1.1;
          const baseLandscapeCoef = parseFloat(s3.baseLandscapeCoef) || 1.0;
          result = calcLandscapeByCost({ cost, complexity: s3.complexity, specialtyCoef, baseLandscapeCoef, additionalCoefs: addCoefs, discount, taxRate });
          itemName = '园林景观设计(工程费法)';
        } else {
          const area = parseFloat(s3.area);
          if (!Number.isFinite(area) || area <= 0) { wx.showToast({ title: '请输入有效面积', icon: 'none' }); return; }
          const landscapeType = s3.landscapeTypes[s3.landscapeTypeIndex].value;
          const unitPrice = parseFloat(s3.unitPrice);
          if (!Number.isFinite(unitPrice) || unitPrice <= 0) { wx.showToast({ title: '请输入有效单价', icon: 'none' }); return; }
          result = calcLandscapeByArea({ area, landscapeType, complexity: s3.complexity, unitPrice, discount, taxRate });
          itemName = '园林景观设计(面积法)';
        }
      } else if (tab === 'S4') {
        const area = parseFloat(this.data.s4.area);
        if (!Number.isFinite(area) || area <= 0) { wx.showToast({ title: '请输入有效面积', icon: 'none' }); return; }
        const designUnitPrice = parseFloat(this.data.s4.designUnitPrice);
        if (!Number.isFinite(designUnitPrice) || designUnitPrice <= 0) { wx.showToast({ title: '请输入有效建筑设计单价', icon: 'none' }); return; }
        const decoUnitPrice = parseFloat(this.data.s4.decoUnitPrice);
        if (this.data.s4.includeDeco && (!Number.isFinite(decoUnitPrice) || decoUnitPrice <= 0)) { wx.showToast({ title: '请输入有效装修设计单价', icon: 'none' }); return; }
        const landscapeUnitPrice = parseFloat(this.data.s4.landscapeUnitPrice);
        if (this.data.s4.includeLandscape && (!Number.isFinite(landscapeUnitPrice) || landscapeUnitPrice <= 0)) { wx.showToast({ title: '请输入有效园林设计单价', icon: 'none' }); return; }
        result = calcSelfBuildDesign({
          area,
          complexity: this.data.s4.complexity,
          includeDeco: this.data.s4.includeDeco,
          includeLandscape: this.data.s4.includeLandscape,
          designUnitPrice,
          decoUnitPrice,
          landscapeUnitPrice,
          discount,
          taxRate
        });
        itemName = '私宅自建设计';
      } else if (tab === 'S5') {
        const s5 = this.data.s5;
        if (s5.method === 'investment') {
          const cost = parseFloat(s5.cost);
          if (!Number.isFinite(cost) || cost <= 0) { wx.showToast({ title: '请输入有效投资额', icon: 'none' }); return; }
          result = calcSignageByInvestment({ cost, discount, taxRate });
          itemName = '导视标识设计(总投资%)';
        } else if (s5.method === 'area') {
          const area = parseFloat(s5.area);
          if (!Number.isFinite(area) || area <= 0) { wx.showToast({ title: '请输入有效面积', icon: 'none' }); return; }
          const signageType = s5.signageTypes[s5.signageTypeIndex].value;
          const unitPrice = parseFloat(s5.unitPrice);
          if (!Number.isFinite(unitPrice) || unitPrice <= 0) { wx.showToast({ title: '请输入有效单价', icon: 'none' }); return; }
          result = calcSignageByArea({ area, signageType, unitPrice, discount, taxRate });
          itemName = '导视标识设计(面积法)';
        } else {
          const items = s5.productionItems.filter(i => i.qty > 0);
          if (items.length === 0) { wx.showToast({ title: '请至少输入一项数量', icon: 'none' }); return; }
          const invalidCustom = items.find(i => i.custom && (!(i.name || '').trim() || !(parseFloat(i.unitPrice) > 0)));
          if (invalidCustom) { wx.showToast({ title: '请完善自定义项目名称和单价', icon: 'none' }); return; }
          const installRate = toNumber(s5.installRate, 20);
          result = calcSignageProduction({ items, installRate, discount, taxRate });
          itemName = '导视标识制作安装';
        }
      } else if (tab === 'S6') {
        const s6 = this.data.s6;
        if (s6.method === 'area') {
          const area = parseFloat(s6.area);
          if (!Number.isFinite(area) || area <= 0) { wx.showToast({ title: '请输入有效面积', icon: 'none' }); return; }
          const unitPrice = parseFloat(s6.unitPrice);
          if (!Number.isFinite(unitPrice) || unitPrice <= 0) { wx.showToast({ title: '请输入有效单价', icon: 'none' }); return; }
          result = calcSoftFurnishing({ method: 'area', area, unitPrice, discount, taxRate });
          itemName = '软装陈设(面积法)';
        } else if (s6.method === 'budget') {
          const budget = parseFloat(s6.budget);
          if (!Number.isFinite(budget) || budget <= 0) { wx.showToast({ title: '请输入有效预算', icon: 'none' }); return; }
          result = calcSoftFurnishing({ method: 'budget', budget, discount, taxRate });
          itemName = '软装陈设(预算%)';
        } else {
          const days = parseInt(s6.days);
          if (!Number.isFinite(days) || days <= 0) { wx.showToast({ title: '请输入有效天数', icon: 'none' }); return; }
          const dayUnitPrice = parseFloat(s6.dayUnitPrice);
          if (!Number.isFinite(dayUnitPrice) || dayUnitPrice <= 0) { wx.showToast({ title: '请输入有效日单价', icon: 'none' }); return; }
          result = calcSoftFurnishing({ method: 'days', days, dayUnitPrice, discount, taxRate });
          itemName = '软装陈设(天数)';
        }
      } else if (tab === 'S7') {
        const s7 = this.data.s7;
        const lightingType = s7.lightingTypes[s7.lightingTypeIndex].value;
        if (s7.method === 'cost') {
          const cost = parseFloat(s7.cost);
          if (!Number.isFinite(cost) || cost <= 0) { wx.showToast({ title: '请输入有效工程费', icon: 'none' }); return; }
          const rate = parseFloat(s7.rate);
          if (!Number.isFinite(rate) || rate <= 0) { wx.showToast({ title: '请输入有效比例', icon: 'none' }); return; }
          result = calcLighting({ method: 'cost', cost, lightingType, rate, discount, taxRate });
          itemName = '艺术照明设计(工程费法)';
        } else {
          const area = parseFloat(s7.area);
          if (!Number.isFinite(area) || area <= 0) { wx.showToast({ title: '请输入有效面积', icon: 'none' }); return; }
          const unitPrice = parseFloat(s7.unitPrice);
          if (!Number.isFinite(unitPrice) || unitPrice <= 0) { wx.showToast({ title: '请输入有效单价', icon: 'none' }); return; }
          result = calcLighting({ method: 'area', area, lightingType, unitPrice, discount, taxRate });
          itemName = '艺术照明设计(面积法)';
        }
      } else if (tab === 'S8') {
        const s8 = this.data.s8;
        if (s8.method === 'rate') {
          const cost = parseFloat(s8.cost);
          if (!Number.isFinite(cost) || cost <= 0) { wx.showToast({ title: '请输入有效工程费', icon: 'none' }); return; }
          const acousticType = s8.acousticTypes[s8.acousticTypeIndex].value;
          result = calcAcoustic({ method: 'rate', cost, acousticType, discount, taxRate });
          itemName = '声学装修设计(工程费法)';
        } else {
          const area = parseFloat(s8.area);
          if (!Number.isFinite(area) || area <= 0) { wx.showToast({ title: '请输入有效面积', icon: 'none' }); return; }
          const unitPrice = parseFloat(s8.unitPrice);
          if (!Number.isFinite(unitPrice) || unitPrice <= 0) { wx.showToast({ title: '请输入有效单价', icon: 'none' }); return; }
          result = calcAcoustic({ method: 'area', area, unitPrice, discount, taxRate });
          itemName = '声学装修设计(面积法)';
        }
      }
    } catch (err) {
      wx.showToast({ title: err.message || '计算失败', icon: 'none' });
      return;
    }

    if (!result) return;
    result = this.applyExtraServices(result);
    result.specialty = tab;
    result.specialtyName = this.data.tabs.find(item => item.value === tab).label;

    // 存入项目层级
    const activeProjectId = app.globalData.activeProjectId;
    const activeDraftItemId = app.globalData.activeDraftItemId;
    let projectName = this.data.projectName || '';
    let itemId = null;
    if (activeProjectId && getProject(activeProjectId)) {
      const project = getProject(activeProjectId);
      projectName = project.name;
      const item = activeDraftItemId
        ? updateCalcItemResult(activeProjectId, activeDraftItemId, result, itemName)
        : addCalcItem(activeProjectId, 'F4b', result, itemName);
      const savedItem = item || (activeDraftItemId ? addCalcItem(activeProjectId, 'F4b', result, itemName) : null);
      if (savedItem) itemId = savedItem.id;
    }
    app.globalData.activeDraftItemId = 0;

    // 保存到历史
    const history = wx.getStorageSync(app.globalData.historyKey) || [];
    const newId = itemId || (history.length > 0 ? Math.max(...history.map(h => h.id)) + 1 : 1);
    const now = new Date();
    const timeStr = `今天 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newRecord = {
      id: newId,
      name: projectName ? `${projectName} · ${itemName}` : `专项设计 · ${itemName}`,
      stage: 'F4b',
      stageName: '专项设计',
      meta: timeStr,
      amount: `${result.total.toFixed(2)}万`,
      color: '#00695C',
      appEdition: wx.getStorageSync('yicalc_app_edition') || (app.globalData && app.globalData.appEdition) || 'interior',
      calcDetail: result,
      projectId: activeProjectId || null,
      projectName,
      docs: [{ name: `${itemName}报价单.pdf`, meta: `刚刚创建 · ${(Math.random() * 2 + 1).toFixed(1)} MB`, color: '#00695C' }]
    };

    history.unshift(newRecord);
    wx.setStorageSync(app.globalData.historyKey, history);
    this.hasCompletedCalculation = true;
    draftStore.clearDraft('specialty-design', {
      projectId: activeProjectId || 0,
      itemId: activeDraftItemId || 0,
      stage: 'F4b',
      specialty: tab
    });
    incrementUsageCount();

    wx.navigateTo({
      url: `/pages/result/result?id=${newId}`
    });
  }
});
