const { createProject, addDraftCalcItem } = require('../../utils/project-manager.js');

const STAGE_SPECIALTIES = {
  F4b: [
    { id: 'S1', name: '室内设计', projectStage: 'S1' },
    { id: 'S3', name: '园林景观', projectStage: 'S3' },
    { id: 'S4', name: '私宅自建', projectStage: 'S4' },
    { id: 'S5', name: '导视标识', projectStage: 'S5' },
    { id: 'S6', name: '软装陈设', projectStage: 'S6' },
    { id: 'S7', name: '艺术照明', projectStage: 'S7' },
    { id: 'S8', name: '声学装修', projectStage: 'S8' }
  ],
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

function buildPresetGroups(template) {
  return [{
    code: 'ALL',
    label: '',
    specialties: []
  }];
}

// 预设项目模板
const TEMPLATES = [
  {
    id: 'project_planning',
    name: '项目策划',
    icon: '＋',
    iconImage: 'template-urban',
    desc: '用于前期策划、空间定位、设计任务梳理和专项设计准备',
    color: '#102744',
    investment: 0,
    stages: [
      { code: 'F4b', label: '专项设计' }
    ]
  },
  {
    id: 'custom',
    name: '空白项目',
    icon: '＋',
    iconImage: 'template-custom',
    desc: '不预设任何阶段，完全自定义',
    color: '#8E8E93',
    investment: 0,
    stages: []
  }
];

const { onGoHome } = require("../../utils/goHome");

Page({
  onGoHome,
  data: {
    templates: TEMPLATES,
    selectedTemplate: null,
    showConfirmModal: false,
    confirmName: '',
    confirmLocation: '',
    confirmInvestment: '',
    selectedPresetGroups: [],
    showSpecialtyPicker: false,
    pickerGroupIndex: 0,
    pickerCategories: []
  },

  onSelectTemplate: function (e) {
    const templateId = e.currentTarget.dataset.id;
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    this.setData({
      selectedTemplate: template,
      showConfirmModal: true,
      confirmName: template.name,
      confirmLocation: '',
      confirmInvestment: template.investment.toString(),
      selectedPresetGroups: buildPresetGroups(template)
    });
  },

  closeConfirmModal: function () {
    this.setData({ showConfirmModal: false });
  },

  onPreventDefault: function () {},

  onNameInput: function (e) {
    this.setData({ confirmName: e.detail.value });
  },

  onLocationInput: function (e) {
    this.setData({ confirmLocation: e.detail.value });
  },

  onInvestmentInput: function (e) {
    this.setData({ confirmInvestment: e.detail.value });
  },

  getPickerCategories: function (selectedKeys) {
    const selectedMap = {};
    (selectedKeys || []).forEach(key => { selectedMap[key] = true; });
    const makeOption = (stageCode, item, projectStage) => {
      const key = `${stageCode}:${item.id}`;
      return Object.assign({}, item, {
        key,
        quoteStage: stageCode,
        projectStage: projectStage || item.projectStage || stageCode,
        selected: !!selectedMap[key]
      });
    };
    const f4Options = STAGE_SPECIALTIES.F4 || [];
    const f4Groups = [
      { title: '工程设计 · 建筑市政', match: ['building', 'municipal', 'telecom', 'interior_deco', 'civil_defense', 'landscape'] },
      { title: '工程设计 · 矿山采选', prefix: 'mining_' },
      { title: '工程设计 · 加工冶炼', prefix: 'processing_' },
      { title: '工程设计 · 石油化工', prefix: 'petrochemical_' },
      { title: '工程设计 · 水利电力', match: ['wind_power', 'thermal_power', 'hydro_power', 'nuclear_power'] },
      { title: '工程设计 · 交通运输', match: ['airport_field', 'highway', 'airport_control', 'subway', 'ropeway'] },
      { title: '工程设计 · 农业林业', match: ['agriculture', 'forestry'] }
    ].map(group => ({
      title: group.title,
      options: f4Options
        .filter(item => group.prefix ? item.id.indexOf(group.prefix) === 0 : group.match.indexOf(item.id) !== -1)
        .map(item => makeOption('F4', item, 'F4'))
    })).filter(group => group.options.length > 0);

    return [
      { title: '前期投资决策', options: (STAGE_SPECIALTIES.F1 || []).map(item => makeOption('F1', item, 'F1')) },
      { title: '国土空间规划', options: (STAGE_SPECIALTIES.F2 || []).map(item => makeOption('F2', item, 'F2')) },
      { title: '工程勘察', options: (STAGE_SPECIALTIES.F3 || []).map(item => makeOption('F3', item, 'F3')) },
      ...f4Groups,
      { title: '专项设计', options: (STAGE_SPECIALTIES.F4b || []).map(item => makeOption('F4b', item, item.projectStage || item.id)) },
      { title: '造价咨询', options: (STAGE_SPECIALTIES.F5 || []).map(item => makeOption('F5', item, 'F5')) },
      { title: '全过程工程咨询', options: (STAGE_SPECIALTIES.F6 || []).map(item => makeOption('F6', item, 'F6')) }
    ].filter(group => group.options.length > 0);
  },

  onOpenSpecialtyPicker: function (e) {
    const groupIndex = parseInt(e.currentTarget.dataset.groupIndex);
    const group = this.data.selectedPresetGroups[groupIndex];
    if (!group) return;
    const selectedKeys = group.specialties.map(item => item.key || `${item.quoteStage || group.code}:${item.id}`);
    this.setData({
      showSpecialtyPicker: true,
      pickerGroupIndex: groupIndex,
      pickerCategories: this.getPickerCategories(selectedKeys)
    });
  },

  closeSpecialtyPicker: function () {
    this.setData({ showSpecialtyPicker: false });
  },

  onTogglePickerSpecialty: function (e) {
    const catIndex = parseInt(e.currentTarget.dataset.catIndex);
    const optionIndex = parseInt(e.currentTarget.dataset.optionIndex);
    const path = `pickerCategories[${catIndex}].options[${optionIndex}].selected`;
    const option = this.data.pickerCategories[catIndex] && this.data.pickerCategories[catIndex].options[optionIndex];
    if (!option) return;
    this.setData({ [path]: !option.selected });
  },

  onConfirmSpecialtyPicker: function () {
    const group = this.data.selectedPresetGroups[this.data.pickerGroupIndex];
    if (!group) return;
    const selected = [];
    this.data.pickerCategories.forEach(category => {
      (category.options || []).forEach(option => {
        if (option.selected) selected.push({
          id: option.id,
          key: option.key,
          name: option.name,
          quoteStage: option.quoteStage,
          projectStage: option.projectStage
        });
      });
    });
    this.setData({
      [`selectedPresetGroups[${this.data.pickerGroupIndex}].specialties`]: selected,
      showSpecialtyPicker: false
    });
  },

  onRemovePresetSpecialty: function (e) {
    const groupIndex = parseInt(e.currentTarget.dataset.groupIndex);
    const specialtyIndex = parseInt(e.currentTarget.dataset.specialtyIndex);
    const groups = this.data.selectedPresetGroups.map(group => ({
      code: group.code,
      label: group.label,
      specialties: group.specialties.map(item => Object.assign({}, item))
    }));
    if (!groups[groupIndex] || !groups[groupIndex].specialties[specialtyIndex]) return;
    groups[groupIndex].specialties.splice(specialtyIndex, 1);
    this.setData({ selectedPresetGroups: groups });
  },

  onConfirmCreate: function () {
    const template = this.data.selectedTemplate;
    if (!template) return;

    const name = this.data.confirmName.trim();
    if (!name) {
      wx.showToast({ title: '请输入项目名称', icon: 'none' });
      return;
    }

    const investment = parseFloat(this.data.confirmInvestment) || template.investment || 0;

    // 创建项目
    const project = createProject({
      name: name,
      location: this.data.confirmLocation.trim(),
      description: template.desc,
      totalInvestment: investment
    });

    // 根据模板预设专业创建独立待报价子项。
    let quoteCreated = 0;
    this.data.selectedPresetGroups.forEach(group => {
      (group.specialties || []).forEach(item => {
        const quoteStage = item.quoteStage || group.code;
        const projectStage = item.projectStage || quoteStage;
        const draft = addDraftCalcItem(project.id, projectStage, {
          name: item.name,
          specialty: item.id,
          quoteStage,
          quoteSpecialty: item.id,
          templateData: {
            cost: investment,
            projectName: name,
            templateId: template.id,
            templateName: template.name
          }
        });
        if (draft) quoteCreated++;
      });
    });

    this.setData({ showConfirmModal: false });

    wx.showToast({
      title: quoteCreated > 0 ? `已预设${quoteCreated}个报价` : '项目创建成功',
      icon: 'success',
      duration: 2000
    });

    // 跳转到项目详情
    setTimeout(() => {
      wx.navigateTo({
        url: `/pages/project-detail/project-detail?id=${project.id}`
      });
    }, 2000);
  },

  onBack: function () {
    wx.navigateBack();
  },

  // 微信分享
  onShareAppMessage: function () {
    return {
      title: '易计算 · 项目模板',
      path: '/pages/templates/templates'
    };
  }
});
