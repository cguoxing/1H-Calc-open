const { onGoHome } = require("../../utils/goHome");
const { policies } = require("../../data/policies.js");

Page({
  onGoHome,
  data: {
    activeTab: 'national',
    searchText: '',
    policies: [],
    filteredPolicies: []
  },

  onLoad: function () {
    this.setData({ policies: this.getPolicyData() });
    this.filterPolicies('national', '');
  },

  getPolicyData: function () {
    return policies;
  },

  onTabChange: function (e) {
    const tab = e.currentTarget.dataset.tab;
    this.filterPolicies(tab, this.data.searchText);
  },

  filterPolicies: function (category, keyword) {
    const query = (keyword || '').trim().toLowerCase();
    const filtered = this.data.policies.filter(policy => {
      if (policy.category !== category) return false;
      if (!query) return true;
      return [
        policy.title,
        policy.docNo,
        policy.dept,
        policy.date,
        policy.summary
      ].some(value => String(value || '').toLowerCase().includes(query));
    });
    this.setData({
      activeTab: category,
      filteredPolicies: filtered
    });
  },

  onSearchInput: function (e) {
    const searchText = e.detail.value;
    this.setData({ searchText });
    this.filterPolicies(this.data.activeTab, searchText);
  },

  onClearSearch: function () {
    this.setData({ searchText: '' });
    this.filterPolicies(this.data.activeTab, '');
  },

  onTapPolicy: function (e) {
    const id = e.currentTarget.dataset.id;
    const policy = this.data.policies.find(p => p.id === id);
    if (!policy) return;

    if (policy.url) {
      wx.showModal({
        title: policy.title,
        content: `文号：${policy.docNo}\n发布部门：${policy.dept}\n日期：${policy.date}\n\n${policy.summary}\n\n点击"查看原文"跳转官方链接`,
        confirmText: '查看原文',
        cancelText: '关闭',
        success: (res) => {
          if (res.confirm) {
            // 复制文号便于搜索
            wx.setClipboardData({
              data: policy.docNo,
              success: () => {
                wx.showToast({ title: '文号已复制，可搜索查看', icon: 'none' });
              }
            });
          }
        }
      });
    } else {
      wx.showModal({
        title: policy.title,
        content: `文号：${policy.docNo}\n发布部门：${policy.dept}\n日期：${policy.date}\n\n${policy.summary}\n\n提示：可复制文号在搜索引擎中查看原文。`,
        confirmText: '复制文号',
        cancelText: '关闭',
        success: (res) => {
          if (res.confirm) {
            wx.setClipboardData({
              data: policy.docNo,
              success: () => {
                wx.showToast({ title: '文号已复制', icon: 'success' });
              }
            });
          }
        }
      });
    }
  },

  onSearch: function () {
    this.filterPolicies(this.data.activeTab, this.data.searchText);
  }
});
