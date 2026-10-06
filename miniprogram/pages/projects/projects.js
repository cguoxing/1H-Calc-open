const { onGoHome } = require("../../utils/goHome");
const { getProjectList, createProject, migrateLegacyData } = require('../../utils/project-manager.js');

Page({
  onGoHome,
  data: {
    projects: [],
    showCreateModal: false,
    formName: '',
    formLocation: '',
    formDesc: '',
    formInvestment: ''
  },

  onShow: function () {
    this.loadProjects();
  },

  onLoad: function () {
    // 首次加载时尝试迁移旧数据
    const result = migrateLegacyData();
    if (result.migrated > 0) {
      wx.showToast({
        title: `已迁移${result.migrated}个项目`,
        icon: 'success',
        duration: 1500
      });
    }
    this.loadProjects();
  },

  loadProjects: function () {
    const projects = getProjectList();
    this.setData({ projects });
  },

  onTemplateCreate: function () {
    wx.navigateTo({
      url: '/pages/templates/templates'
    });
  },

  onCreateProject: function () {
    this.setData({
      showCreateModal: true,
      formName: '',
      formLocation: '',
      formDesc: '',
      formInvestment: ''
    });
  },

  closeCreateModal: function () {
    this.setData({ showCreateModal: false });
  },

  onPreventDefault: function () {},

  onFormNameInput: function (e) { this.setData({ formName: e.detail.value }); },
  onFormLocationInput: function (e) { this.setData({ formLocation: e.detail.value }); },
  onFormDescInput: function (e) { this.setData({ formDesc: e.detail.value }); },
  onFormInvestmentInput: function (e) { this.setData({ formInvestment: e.detail.value }); },

  onConfirmCreate: function () {
    const name = this.data.formName.trim();
    if (!name) {
      wx.showToast({ title: '请输入项目名称', icon: 'none' });
      return;
    }

    const project = createProject({
      name: name,
      location: this.data.formLocation.trim(),
      description: this.data.formDesc.trim(),
      totalInvestment: parseFloat(this.data.formInvestment) || 0
    });

    this.setData({ showCreateModal: false });
    this.loadProjects();

    wx.showToast({ title: '项目创建成功', icon: 'success' });

    // 自动跳转到项目详情页
    setTimeout(() => {
      wx.navigateTo({
        url: `/pages/project-detail/project-detail?id=${project.id}`
      });
    }, 500);
  },

  onViewProject: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/project-detail/project-detail?id=${id}`
    });
  },

  // 微信分享
  onShareAppMessage: function () {
    return {
      title: '我的工程取费项目 - 易计算',
      path: '/pages/projects/projects'
    };
  }
});
