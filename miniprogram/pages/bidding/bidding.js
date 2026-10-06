const { onGoHome } = require("../../utils/goHome");
const { calculateBiddingFee } = require('../../utils/calculator.js');
const { incrementUsageCount } = require('../../utils/usage-counter.js');
const app = getApp();
const NATIONAL_SOURCE = '计价格[2002]1980号 / 发改办价格[2011]534号';

Page({
  onGoHome,
  data: {
    projectName: '',
    cost: '',
    services: [
      { value: 'eng', label: '工程招标' },
      { value: 'goods', label: '货物招标' },
      { value: 'service', label: '服务招标' }
    ],
    serviceIndex: 0,
    policies: [
      { value: 'national', label: '国家标准', desc: NATIONAL_SOURCE },
      { value: 'guangdong_other', label: '广东其他项目', desc: `${NATIONAL_SOURCE} + 粤价函[2013]1233号附件2` },
      { value: 'guangdong_gov', label: '广东政府集中采购', desc: `${NATIONAL_SOURCE} + 粤价函[2013]1233号附件1` },
      { value: 'shanghai', label: '上海口径', desc: `${NATIONAL_SOURCE} + 沪建计联[2005]834号 / 沪价费[2005]056号` },
      { value: 'zhejiang', label: '浙江口径', desc: `${NATIONAL_SOURCE} + 浙价服[2003]77号` }
    ],
    policyIndex: 0,
    serviceScopes: [
      { value: 'full', label: '全过程代理' },
      { value: 'documents_only', label: '仅编制招标文件' }
    ],
    serviceScopeIndex: 0,
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

  getRatioOptions: function (policy) {
    if (policy === 'shanghai') {
      return [
        { value: 90, label: '90 %' },
        { value: 100, label: '100 %' },
        { value: 110, label: '110 %' }
      ];
    }
    return [
      { value: 60, label: '60 %' },
      { value: 80, label: '80 %' },
      { value: 100, label: '100 %' },
      { value: 120, label: '120 %' }
    ];
  },

  onLoad: function (options) {
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
    let defaultName = `招标代理项目 - ${dateStr}`;

    let costVal = '';
    let svcIdx = 0;

    if (options.cost) costVal = options.cost;
    if (options.searchText) defaultName = options.searchText;
    if (options.specialty) {
      const specialtyMap = { 'eng': 0, 'goods': 1, 'service': 2 };
      if (specialtyMap[options.specialty] !== undefined) {
        svcIdx = specialtyMap[options.specialty];
      }
    }

    this.setData({
      projectName: defaultName,
      cost: costVal,
      serviceIndex: svcIdx
    });
  },

  onNameInput: function (e) {
    this.setData({ projectName: e.detail.value });
  },

  onCostInput: function (e) {
    this.setData({ cost: e.detail.value });
  },

  onServiceChange: function (e) {
    this.setData({ serviceIndex: parseInt(e.detail.value) });
  },

  onPolicyChange: function (e) {
    const policyIndex = parseInt(e.detail.value);
    const policy = this.data.policies[policyIndex].value;
    const ratios = this.getRatioOptions(policy);
    const ratioIndex = Math.max(0, ratios.findIndex(item => item.value === 100));
    this.setData({
      policyIndex,
      ratios,
      ratioIndex,
      serviceScopeIndex: 0
    });
  },

  onServiceScopeChange: function (e) {
    this.setData({ serviceScopeIndex: parseInt(e.detail.value) });
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
      projectName: `招标代理项目 - ${dateStr}`,
      cost: '',
      serviceIndex: 0,
      policyIndex: 0,
      serviceScopeIndex: 0,
      ratios: this.getRatioOptions('national'),
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

    const biddingType = this.data.services[this.data.serviceIndex].value;
    const policy = this.data.policies[this.data.policyIndex].value;
    const serviceScope = this.data.serviceScopes[this.data.serviceScopeIndex].value;
    const discount = this.data.ratios[this.data.ratioIndex].value;
    const taxRate = this.data.taxRates[this.data.taxRateIndex].value;

    const result = calculateBiddingFee({
      cost,
      biddingType,
      policy,
      serviceScope,
      discount,
      taxRate
    });

    // Save calculation into record storage
    const history = wx.getStorageSync(app.globalData.historyKey) || [];
    const newId = history.length > 0 ? Math.max(...history.map(h => h.id)) + 1 : 1;

    const now = new Date();
    const timeStr = `今天 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newRecord = {
      id: newId,
      name: this.data.projectName || '未命名招标代理项目',
      stage: 'bidding',
      stageName: '招标代理',
      meta: timeStr,
      amount: `${result.total.toFixed(2)}万`,
      color: '#4a148c', // Deep Purple
      calcDetail: result,
      docs: [
        { name: `${this.data.projectName || '未命名项目'}报价单.pdf`, meta: `刚刚创建 · ${(Math.random() * 2 + 1).toFixed(1)} MB`, color: '#4a148c' }
      ]
    };

    history.unshift(newRecord);
    wx.setStorageSync(app.globalData.historyKey, history);
    incrementUsageCount();

    wx.navigateTo({
      url: `/pages/result/result?id=${newId}`
    });
  },

  onSwitchToPreConsult: function () {
    wx.navigateTo({
      url: '/pages/pre-consult/pre-consult'
    });
  }
});
