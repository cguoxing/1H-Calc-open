const { getProject, getOrCreateStage, addCalcItem, removeCalcItem, calculateProjectTotal, STAGE_NAMES, STAGE_COLORS, updateProject, updateHistoryProjectName } = require('../../utils/project-manager.js');
const app = getApp();

// 阶段对应的专业列表（与首页 index.js 一致）
const STAGE_SPECIALTIES = {
  S1: [{ id: 'S1', name: '室内设计' }],
  S3: [{ id: 'S3', name: '园林景观' }],
  S4: [{ id: 'S4', name: '私宅自建' }],
  S5: [{ id: 'S5', name: '导视标识' }],
  S6: [{ id: 'S6', name: '软装陈设' }],
  S7: [{ id: 'S7', name: '艺术照明' }],
  S8: [{ id: 'S8', name: '声学装修' }],
  F1: [
    { id: 'project_proposal', name: '编制项目建议书' },
    { id: 'feasibility_study', name: '编制可行性研究报告' },
    { id: 'project_application', name: '编制项目申请报告' },
    { id: 'funding_application', name: '编制资金申请报告' },
    { id: 'pre_feasibility', name: '编制预可行性研究报告' }
  ],
  F2: [
    { id: 'constructive', name: '修建性详细规划' },
    { id: 'regulatory', name: '控制性详细规划' },
    { id: 'overall', name: '城市总体国土空间规划' }
  ],
  F3: [
    { id: 'survey', name: '岩土工程勘察基本服务' },
    { id: 'consult', name: '岩土工程勘察技术咨询' },
    { id: 'supervision', name: '岩土工程勘察旁站监理' }
  ],
  F4: [
    { id: 'building', name: '建筑工程设计' },
    { id: 'municipal', name: '市政道路/给排水工程设计' },
    { id: 'telecom', name: '电信/通信工程设计' },
    { id: 'interior_deco', name: '室内装饰工程设计' },
    { id: 'civil_defense', name: '人防工程设计' },
    { id: 'landscape', name: '园林绿化工程设计' },
    { id: 'mining_black_gold_chemical_nonmetal', name: '矿山采选：黑色/黄金/化学/非金属/其他' },
    { id: 'mining_coal_nonferrous_uranium', name: '矿山采选：采煤/有色/铀矿' },
    { id: 'mining_coal_processing_other', name: '矿山采选：选煤/其他煤炭' },
    { id: 'processing_cold', name: '加工冶炼：各类冷加工工程' },
    { id: 'processing_ship_hydraulic', name: '加工冶炼：船舶水工工程' },
    { id: 'processing_smelting_heat_pressure', name: '加工冶炼：冶炼/热加工/压力加工' },
    { id: 'processing_nuclear', name: '加工冶炼：核加工工程' },
    { id: 'petrochemical_general', name: '石油化工：石油/化工/石化/化纤/医药' },
    { id: 'petrochemical_nuclear', name: '石油化工：核化工工程' },
    { id: 'wind_power', name: '水利电力：风力发电/其他水利工程' },
    { id: 'thermal_power', name: '水利电力：火电工程' },
    { id: 'hydro_power', name: '水利电力：水电/水库/送变电工程' },
    { id: 'nuclear_power', name: '水利电力：核能工程' },
    { id: 'airport_field', name: '交通运输：机场场道工程' },
    { id: 'highway', name: '交通运输：公路/城市道路工程' },
    { id: 'airport_control', name: '交通运输：机场空管/助航灯光/轻轨工程' },
    { id: 'subway', name: '交通运输：水运/地铁/桥梁/隧道工程' },
    { id: 'ropeway', name: '交通运输：索道工程' },
    { id: 'agriculture', name: '农业工程设计' },
    { id: 'forestry', name: '林业工程设计' }
  ],
  F4b: [
    { id: 'S1', name: '室内设计' },
    { id: 'S3', name: '园林景观' },
    { id: 'S4', name: '私宅自建' },
    { id: 'S5', name: '导视标识' },
    { id: 'S6', name: '软装陈设' },
    { id: 'S7', name: '艺术照明' },
    { id: 'S8', name: '声学装修' }
  ],
  F5: [
    { id: 'estimate', name: '投资估算编制/审核' },
    { id: 'budget_outline', name: '工程概算编制/审核' },
    { id: 'bill_quantity', name: '工程量清单编制/审核' },
    { id: 'budget_bill', name: '预算编制/审核(清单)' },
    { id: 'budget_quota', name: '预算编制/审核(定额)' },
    { id: 'settlement_prep', name: '工程结算编制' },
    { id: 'settlement_audit', name: '工程结算审核' },
    { id: 'whole_process', name: '全过程造价控制' },
    { id: 'dispute_appraisal', name: '工程造价纠纷鉴证' },
    { id: 'steel_calc', name: '钢筋及预埋件计算' }
  ],
  F6: [
    { id: 'F6a', name: '全过程工程咨询（建筑）' },
    { id: 'F6b', name: '全过程工程咨询（市政）' },
    { id: 'F6c', name: '全过程工程咨询（工业）' }
  ]
};

const { onGoHome } = require("../../utils/goHome");

Page({
  onGoHome,
  data: {
    project: { id: 0, name: '', location: '', totalInvestment: 0, stages: [] },
    totalFee: 0,
    stageCount: 0,
    itemCount: 0,
    stageColors: STAGE_COLORS,
    showAddModal: false,
    showEditModal: false,
    editFormName: '',
    editFormLocation: '',
    editFormDesc: '',
    editFormInvestment: '',
    currentAddStage: '',
    currentSpecialties: [],
    isDirty: false // 标记是否需要刷新
  },

  onLoad: function (options) {
    this.projectId = parseInt(options.id);
    if (isNaN(this.projectId)) {
      wx.showToast({ title: '项目不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }
    this.refreshProject();
  },

  onShow: function () {
    // 从计算页返回时刷新
    if (this.data.isDirty) {
      this.refreshProject();
      this.setData({ isDirty: false });
    }
  },

  refreshProject: function () {
    const project = getProject(this.projectId);
    if (!project) {
      wx.showToast({ title: '项目不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }

    const { total, breakdown } = calculateProjectTotal(this.projectId);
    const stageCount = (project.stages || []).length;
    const itemCount = (project.stages || []).reduce((s, st) => s + (st.items || []).length, 0);

    // 确保每个阶段都有 name
    (project.stages || []).forEach(stage => {
      if (!stage.name) stage.name = STAGE_NAMES[stage.id] || stage.id;
    });

    this.setData({
      project,
      totalFee: total,
      stageCount,
      itemCount
    });

    wx.setNavigationBarTitle({ title: project.name || '项目详情' });
  },

  onBack: function () {
    wx.navigateBack();
  },

  onEditProjectDetails: function () {
    const p = this.data.project;
    this.setData({
      showEditModal: true,
      editFormName: p.name || '',
      editFormLocation: p.location || '',
      editFormDesc: p.description || '',
      editFormInvestment: p.totalInvestment || ''
    });
  },

  closeEditModal: function () {
    this.setData({ showEditModal: false });
  },

  onEditFormNameInput: function (e) { this.setData({ editFormName: e.detail.value }); },
  onEditFormLocationInput: function (e) { this.setData({ editFormLocation: e.detail.value }); },
  onEditFormDescInput: function (e) { this.setData({ editFormDesc: e.detail.value }); },
  onEditFormInvestmentInput: function (e) { this.setData({ editFormInvestment: e.detail.value }); },

  onConfirmEditProject: function () {
    const name = (this.data.editFormName || '').trim();
    if (!name) {
      wx.showToast({ title: '请输入项目名称', icon: 'none' });
      return;
    }

    const location = (this.data.editFormLocation || '').trim();
    const description = (this.data.editFormDesc || '').trim();
    const totalInvestment = parseFloat(this.data.editFormInvestment) || 0;

    const project = updateProject(this.projectId, {
      name,
      location,
      description,
      totalInvestment
    });

    if (!project) {
      wx.showToast({ title: '项目不存在', icon: 'none' });
      return;
    }

    updateHistoryProjectName(this.projectId, name);
    this.setData({ showEditModal: false });
    this.refreshProject();
    wx.showToast({ title: '修改已保存', icon: 'success' });
  },

  onDeleteProject: function () {
    wx.showModal({
      title: '确认删除项目',
      content: '删除该项目将清空其下所有的计算子项且不可恢复。确定要删除吗？',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          const { deleteProject } = require('../../utils/project-manager.js');
          deleteProject(this.projectId);
          wx.showToast({ title: '项目已删除', icon: 'success' });
          setTimeout(() => {
            wx.navigateBack({
              fail: () => wx.switchTab({ url: '/pages/projects/projects' })
            });
          }, 800);
        }
      }
    });
  },

  // 添加计算子项
  onAddCalcItem: function (e) {
    const stage = e.currentTarget.dataset.stage;
    if (stage && stage.charAt(0) === 'S') {
      this.openDraftQuote({
        id: 0,
        stage,
        quoteStage: 'F4b',
        quoteSpecialty: stage,
        specialty: stage
      });
      return;
    }
    const specialties = STAGE_SPECIALTIES[stage] || [];
    this.setData({
      showAddModal: true,
      currentAddStage: stage,
      currentSpecialties: specialties
    });
  },

  closeAddModal: function () {
    this.setData({ showAddModal: false });
  },

  onPreventDefault: function () {},

  onSelectSpecialty: function (e) {
    const specialty = e.currentTarget.dataset.specialty;
    const stage = this.data.currentAddStage;

    this.setData({ showAddModal: false, isDirty: true });

    // 确保阶段存在
    getOrCreateStage(this.projectId, stage);

    // 跳转到计算页面
    app.globalData.targetStage = stage;
    app.globalData.targetSpecialty = specialty;
    app.globalData.targetCost = '';
    app.globalData.fromSmart = false;
    app.globalData.activeProjectId = this.projectId; // 标记当前项目

    if (stage === 'F1') {
      wx.navigateTo({
        url: '/pages/pre-consult/pre-consult'
      });
    } else if (stage === 'F4b') {
      wx.navigateTo({
        url: '/pages/specialty-design/specialty-design'
      });
    } else {
      wx.switchTab({
        url: '/pages/calc/calc'
      });
    }
  },

  openDraftQuote: function (item) {
    const quoteStage = item.quoteStage || item.stage;
    const quoteSpecialty = item.quoteSpecialty || item.specialty || '';
    const templateData = item.templateData || {};
    app.globalData.targetStage = quoteStage;
    app.globalData.targetSpecialty = quoteSpecialty;
    app.globalData.targetCost = templateData.cost !== undefined ? templateData.cost : (this.data.project.totalInvestment || '');
    app.globalData.targetArea = templateData.area || '';
    app.globalData.targetProjectName = this.data.project.name || '';
    app.globalData.fromSmart = false;
    app.globalData.activeProjectId = this.projectId;
    app.globalData.activeDraftItemId = item.id || 0;

    if (quoteStage === 'F1') {
      wx.navigateTo({ url: '/pages/pre-consult/pre-consult' });
    } else if (quoteStage === 'F4b') {
      wx.navigateTo({ url: '/pages/specialty-design/specialty-design' });
    } else {
      wx.switchTab({ url: '/pages/calc/calc' });
    }
  },

  // 查看子项结果
  onViewItem: function (e) {
    const itemId = parseInt(e.currentTarget.dataset.itemId);
    let currentItem = null;
    (this.data.project.stages || []).some(stage => {
      currentItem = (stage.items || []).find(item => item.id === itemId);
      return !!currentItem;
    });
    if (currentItem && currentItem.quoteStatus === 'pending') {
      this.openDraftQuote(currentItem);
      return;
    }
    // 使用旧版 result 页面（兼容 history 格式）
    wx.navigateTo({
      url: `/pages/result/result?id=${itemId}&fromHistory=true`
    });
  },

  onEditItem: function (e) {
    const itemId = parseInt(e.currentTarget.dataset.itemId);
    let currentItem = null;
    (this.data.project.stages || []).some(stage => {
      currentItem = (stage.items || []).find(item => item.id === itemId);
      return !!currentItem;
    });
    if (currentItem) this.openDraftQuote(currentItem);
  },

  // 方案对比
  onCompare: function () {
    wx.navigateTo({
      url: `/pages/compare/compare?projectId=${this.projectId}`
    });
  },

  // 删除子项
  onDeleteItem: function (e) {
    const itemId = parseInt(e.currentTarget.dataset.itemId);
    const stage = e.currentTarget.dataset.stage;

    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除此计算子项吗？',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          removeCalcItem(this.projectId, stage, itemId);
          this.refreshProject();
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  // 微信分享
  onShareAppMessage: function () {
    return {
      title: `${this.data.project.name} · 取费合计 ${this.data.totalFee} 万元`,
      path: `/pages/project-detail/project-detail?id=${this.projectId}`
    };
  }
});
