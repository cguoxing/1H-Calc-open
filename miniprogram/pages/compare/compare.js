const { getProject, getProjectList, calculateProjectTotal, STAGE_NAMES, STAGE_COLORS } = require('../../utils/project-manager.js');
const { onGoHome } = require("../../utils/goHome");

Page({
  onGoHome,
  data: {
    project: null,
    items: [],
    compareFields: [
      { key: 'total', label: '费用总计', unit: '万元', isMain: true },
      { key: 'cost', label: '计费额', unit: '万元' },
      { key: 'basePrice', label: '基价', unit: '万元' }
    ],
    selectedItems: [],
    chartData: [],
    maxTotal: 0,
    showProjectSelector: false,
    projectList: []
  },

  onLoad: function (options) {
    const projectId = options.projectId ? parseInt(options.projectId) : NaN;
    if (!isNaN(projectId)) {
      this.loadProjectCompare(projectId);
    } else {
      this.showSelector();
    }
  },

  showSelector: function () {
    const projectList = getProjectList();
    this.setData({
      showProjectSelector: true,
      projectList,
      project: null,
      items: [],
      selectedItems: [],
      chartData: [],
      stats: null
    });
  },

  onSelectProject: function (e) {
    const id = e.currentTarget.dataset.id;
    this.loadProjectCompare(id);
  },

  onSwitchProject: function () {
    this.showSelector();
  },

  loadProjectCompare: function (projectId) {
    const project = getProject(projectId);
    if (!project) {
      wx.showToast({ title: '项目不存在', icon: 'none' });
      this.showSelector();
      return;
    }

    // 收集所有子项
    const items = [];
    (project.stages || []).forEach(stage => {
      (stage.items || []).forEach(item => {
        items.push({
          id: item.id,
          name: item.name,
          stage: stage.id,
          stageName: stage.name || STAGE_NAMES[stage.id] || stage.id,
          stageColor: STAGE_COLORS[stage.id] || '#102744',
          total: item.calcResult ? item.calcResult.total : 0,
          cost: item.calcResult ? (item.calcResult.cost || 0) : 0,
          basePrice: item.calcResult ? (item.calcResult.basePrice || 0) : 0,
          selected: true
        });
      });
    });

    if (items.length === 0) {
      wx.showToast({ title: '项目暂无计算子项', icon: 'none' });
      this.setData({
        project,
        items: [],
        showProjectSelector: true,
        projectList: getProjectList()
      });
      return;
    }

    // 计算最大值用于图表比例
    const maxTotal = Math.max(...items.map(i => i.total), 1);

    this.setData({
      project,
      items,
      maxTotal,
      selectedItems: items.filter(i => i.selected).map(i => i.id),
      showProjectSelector: false
    });

    this.updateChart();
  },

  onBack: function () {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  // 切换选中/取消
  onToggleItem: function (e) {
    const itemId = e.currentTarget.dataset.id;
    const items = this.data.items;
    const idx = items.findIndex(i => i.id === itemId);
    if (idx !== -1) {
      items[idx].selected = !items[idx].selected;
      const selectedItems = items.filter(i => i.selected).map(i => i.id);
      this.setData({ items, selectedItems });
      this.updateChart();
    }
  },

  // 全选/取消全选
  onToggleAll: function () {
    const allSelected = this.data.selectedItems.length === this.data.items.length;
    const items = this.data.items.map(i => ({ ...i, selected: !allSelected }));
    const selectedItems = items.filter(i => i.selected).map(i => i.id);
    this.setData({ items, selectedItems });
    this.updateChart();
  },

  // 更新对比图表数据
  updateChart: function () {
    const selectedItems = this.data.items.filter(i => i.selected);
    const chartData = selectedItems.map(item => ({
      id: item.id,
      name: item.name,
      stageName: item.stageName,
      stageColor: item.stageColor,
      total: item.total,
      cost: item.cost,
      basePrice: item.basePrice,
      barWidth: Math.max((item.total / this.data.maxTotal) * 100, 5) // 最少5%
    }));

    // 计算对比统计
    let stats = { count: chartData.length, min: 0, max: 0, avg: 0, diff: 0 };
    if (chartData.length > 0) {
      const totals = chartData.map(d => d.total);
      stats.min = Math.min(...totals);
      stats.max = Math.max(...totals);
      stats.avg = (totals.reduce((a, b) => a + b, 0) / totals.length);
      stats.diff = stats.max - stats.min;
    }

    this.setData({ chartData, stats });
  },

  // 微信分享
  onShareAppMessage: function () {
    if (this.data.project) {
      return {
        title: `${this.data.project.name} · 多方案对比`,
        path: `/pages/compare/compare?projectId=${this.data.project.id}`
      };
    }
    return {
      title: '方案比选 · 1+H ARCH工具箱',
      path: '/pages/compare/compare'
    };
  }
});
