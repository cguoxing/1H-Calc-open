const { onGoHome } = require("../../utils/goHome");
const { getProjectList, addCalcItem } = require('../../utils/project-manager.js');
const account = require('../../utils/cloud-account.js');
const app = getApp();

Page({
  onGoHome,
  data: {
    historyRecords: [],
    filteredRecords: []
  },

  onShow: function () {
    account.enforceRegistration();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.loadHistory();
  },

  loadHistory: function () {
    const history = wx.getStorageSync(app.globalData.historyKey) || [];
    this.setData({
      historyRecords: history,
      filteredRecords: history
    });
  },

  getDefaultSaveStage: function (stage) {
    const record = arguments.length > 1 ? arguments[1] : null;
    const edition = record && (record.appEdition || record.edition);
    if (edition === 'interior' || (!edition && stage === 'F4b')) {
      const detail = (record && record.calcDetail) || {};
      const specialty = detail.specialty || detail.specialtyId || detail.stageType || '';
      const map = { S1: 'S1', S3: 'S3', S4: 'S4', S5: 'S5', S6: 'S6', S7: 'S7', S8: 'S8' };
      return map[specialty] || 'S1';
    }
    const map = {
      F1: 'F1',
      'F1.4': 'F1',
      F1_4: 'F1',
      bidding: 'F1',
      F2: 'F2',
      F2b: 'F2',
      village: 'F2',
      F3: 'F3',
      F4: 'F4',
      F4b: 'F4',
      F5b: 'F4',
      F5: 'F5',
      F6: 'F6',
      supervision: 'F6',
      management: 'F6'
    };
    return map[stage] || 'F4';
  },

  onViewRecord: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/result/result?id=${id}`
    });
  },

  onArchive: function (e) {
    const id = e.currentTarget.dataset.id;
    const projects = getProjectList();

    if (projects.length === 0) {
      wx.showModal({
        title: '暂无项目',
        content: '您还没有创建项目，是否先去创建一个项目？',
        confirmText: '去创建',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/projects/projects' });
          }
        }
      });
      return;
    }

    wx.showActionSheet({
      itemList: projects.map(p => p.name),
      success: (res) => {
        const project = projects[res.tapIndex];
        const history = wx.getStorageSync(app.globalData.historyKey) || [];
        const record = history.find(h => h.id === id);
        if (!record) {
          wx.showToast({ title: '记录不存在', icon: 'none' });
          return;
        }

        // Add calc item to selected project by home-stage category
        const saveStage = this.getDefaultSaveStage(record.stage, record);
        addCalcItem(project.id, saveStage, record.calcDetail, record.name);

        // Mark as archived in history
        record.isArchived = true;
        record.projectId = project.id;
        record.projectName = project.name;
        record.projectStage = saveStage;
        wx.setStorageSync(app.globalData.historyKey, history);

        this.loadHistory();
        wx.showToast({ title: `已归档至「${project.name}」`, icon: 'success' });
      }
    });
  },

  onDeleteRecord: function (e) {
    const id = e.currentTarget.dataset.id;
    const history = wx.getStorageSync(app.globalData.historyKey) || [];
    const record = history.find(h => h.id === id);
    if (!record) return;

    wx.showModal({
      title: '删除记录',
      content: `确定要删除「${record.name}」的计算历史记录吗？`,
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          const newHistory = history.filter(h => h.id !== id);
          wx.setStorageSync(app.globalData.historyKey, newHistory);
          this.loadHistory();
          wx.showToast({
            title: '已删除',
            icon: 'success'
          });
        }
      }
    });
  }
});
