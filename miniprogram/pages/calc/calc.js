const { onGoHome } = require("../../utils/goHome");
const { 
  calculateDesignFee, 
  calculatePlanningFee,
  calculateSurveyFee,
  calculateCostFee,
  calculatePlanningF2Fee
} = require('../../utils/calculator.js');
const { addCalcItem, updateCalcItemResult, getProject, STAGE_NAMES } = require('../../utils/project-manager.js');
const { incrementUsageCount } = require('../../utils/usage-counter.js');
const draftStore = require('../../utils/calc-draft.js');
const account = require('../../utils/cloud-account.js');
const { toNumber, validateRates } = require('../../utils/number.js');
const app = getApp();

const GENERAL_RENOVATION_OPTIONS = [
  { label: '无附加系数 (1.0)', value: null, text: '1.00 (无)' },
  { label: '轻微改扩建/技术改造 (1.1)', value: 1.1, text: '1.10 (轻微改扩建)' },
  { label: '一般改扩建/技术改造 (1.2)', value: 1.2, text: '1.20 (一般改扩建)' },
  { label: '较复杂改扩建/技术改造 (1.3)', value: 1.3, text: '1.30 (较复杂改扩建)' },
  { label: '复杂改扩建/技术改造 (1.4)', value: 1.4, text: '1.40 (复杂改扩建)' }
];

const F4_DESIGN_ADDITIONAL_OPTIONS = {
  building: [
    ...GENERAL_RENOVATION_OPTIONS,
    { label: '古建筑/保护性建筑 (1.3)', value: 1.3, text: '1.30 (古建保护)' },
    { label: '仿古建筑/高保护要求 (1.6)', value: 1.6, text: '1.60 (仿古/高保护)' },
    { label: '智能弱电系统设计 (1.3)', value: 1.3, text: '1.30 (智能弱电)' },
    { label: '室内装修工程 (1.5)', value: 1.5, text: '1.50 (室内装修)' },
    { label: '特殊声学装修工程 (2.0)', value: 2.0, text: '2.00 (特殊声学)' }
  ],
  interior_deco: [
    { label: '简单/常规装修，工作量不大 (1.0)', value: null, text: '1.00 (简单/常规)' },
    { label: '中档装修，设计工作量较多 (1.3)', value: 1.3, text: '1.30 (中档装修)' },
    { label: '高档复杂装修，设计工作量很大 (1.5)', value: 1.5, text: '1.50 (高档复杂)' }
  ],
  municipal: GENERAL_RENOVATION_OPTIONS,
  landscape: GENERAL_RENOVATION_OPTIONS,
  telecom: GENERAL_RENOVATION_OPTIONS,
  civil_defense: [
    ...GENERAL_RENOVATION_OPTIONS,
    { label: '古建筑/保护性建筑 (1.3)', value: 1.3, text: '1.30 (古建保护)' },
    { label: '仿古建筑/高保护要求 (1.6)', value: 1.6, text: '1.60 (仿古/高保护)' },
    { label: '人防智能弱电系统 (1.3)', value: 1.3, text: '1.30 (智能弱电)' }
  ],
  mining_black_gold_chemical_nonmetal: GENERAL_RENOVATION_OPTIONS,
  mining_coal_nonferrous_uranium: GENERAL_RENOVATION_OPTIONS,
  mining_coal_processing_other: GENERAL_RENOVATION_OPTIONS,
  processing_cold: GENERAL_RENOVATION_OPTIONS,
  processing_ship_hydraulic: GENERAL_RENOVATION_OPTIONS,
  processing_smelting_heat_pressure: GENERAL_RENOVATION_OPTIONS,
  processing_nuclear: GENERAL_RENOVATION_OPTIONS,
  petrochemical_general: GENERAL_RENOVATION_OPTIONS,
  petrochemical_nuclear: GENERAL_RENOVATION_OPTIONS,
  airport_field: GENERAL_RENOVATION_OPTIONS,
  highway: GENERAL_RENOVATION_OPTIONS,
  urban_road: GENERAL_RENOVATION_OPTIONS,
  light_rail: GENERAL_RENOVATION_OPTIONS,
  airport_runway: GENERAL_RENOVATION_OPTIONS,
  airport_control: GENERAL_RENOVATION_OPTIONS,
  subway: GENERAL_RENOVATION_OPTIONS,
  bridge: GENERAL_RENOVATION_OPTIONS,
  tunnel: GENERAL_RENOVATION_OPTIONS,
  waterway: GENERAL_RENOVATION_OPTIONS,
  ropeway: GENERAL_RENOVATION_OPTIONS,
  wind_power: GENERAL_RENOVATION_OPTIONS,
  water_conservancy_other: GENERAL_RENOVATION_OPTIONS,
  thermal_power: GENERAL_RENOVATION_OPTIONS,
  hydro_power: GENERAL_RENOVATION_OPTIONS,
  transmission: GENERAL_RENOVATION_OPTIONS,
  nuclear_power: GENERAL_RENOVATION_OPTIONS,
  agriculture: GENERAL_RENOVATION_OPTIONS,
  forestry: GENERAL_RENOVATION_OPTIONS
};

const F4_DESIGN_ADDITIONAL_GROUPS = {
  building: [
    { label: '无附加系数 (1.0)', options: [F4_DESIGN_ADDITIONAL_OPTIONS.building[0]] },
    { label: '通用改扩建/技术改造', options: GENERAL_RENOVATION_OPTIONS.slice(1) },
    { label: '建筑专项附加', options: F4_DESIGN_ADDITIONAL_OPTIONS.building.slice(5) }
  ],
  civil_defense: [
    { label: '无附加系数 (1.0)', options: [F4_DESIGN_ADDITIONAL_OPTIONS.civil_defense[0]] },
    { label: '通用改扩建/技术改造', options: GENERAL_RENOVATION_OPTIONS.slice(1) },
    { label: '人防/建筑专项附加', options: F4_DESIGN_ADDITIONAL_OPTIONS.civil_defense.slice(5) }
  ]
};

const F4_SPECIALTY_COEF_GROUPS = {
  mining: [
    { value: 'mining_black_gold_chemical_nonmetal', label: '黑色/黄金/化学/非金属/其他', coef: 1.1 },
    { value: 'mining_coal_nonferrous_uranium', label: '采煤/有色/铀矿', coef: 1.2 },
    { value: 'mining_coal_processing_other', label: '选煤/其他煤炭', coef: 1.3 }
  ],
  processing: [
    { value: 'processing_cold', label: '各类冷加工工程', coef: 1.0 },
    { value: 'processing_ship_hydraulic', label: '船舶水工工程', coef: 1.1 },
    { value: 'processing_smelting_heat_pressure', label: '冶炼/热加工/压力加工', coef: 1.2 },
    { value: 'processing_nuclear', label: '核加工工程', coef: 1.3 }
  ],
  petrochemical: [
    { value: 'petrochemical_general', label: '石油/化工/石化/化纤/医药', coef: 1.2 },
    { value: 'petrochemical_nuclear', label: '核化工工程', coef: 1.6 }
  ],
  water_power: [
    { value: 'wind_power', label: '风力发电/其他水利工程', coef: 0.8 },
    { value: 'thermal_power', label: '火电工程', coef: 1.0 },
    { value: 'hydro_power', label: '水电/水库/送变电工程', coef: 1.2 },
    { value: 'nuclear_power', label: '核能工程', coef: 1.6 }
  ],
  traffic: [
    { value: 'airport_field', label: '机场场道工程', coef: 0.8 },
    { value: 'highway', label: '公路/城市道路工程', coef: 0.9 },
    { value: 'airport_control', label: '机场空管/助航灯光/轻轨工程', coef: 1.0 },
    { value: 'subway', label: '水运/地铁/桥梁/隧道工程', coef: 1.1 },
    { value: 'ropeway', label: '索道工程', coef: 1.3 }
  ],
  building_municipal: [
    { value: 'building', label: '建筑工程', coef: 1.0 },
    { value: 'municipal', label: '市政道路/给排水工程', coef: 1.0 },
    { value: 'telecom', label: '电信/通信工程', coef: 1.0 },
    { value: 'interior_deco', label: '室内装饰工程', coef: 1.0 },
    { value: 'civil_defense', label: '人防工程', coef: 1.1 },
    { value: 'landscape', label: '园林绿化工程', coef: 1.1 }
  ],
  agriculture_forestry: [
    { value: 'agriculture', label: '农业工程', coef: 0.9 },
    { value: 'forestry', label: '林业工程', coef: 0.8 }
  ]
};

function shortCoefText(coef, label) {
  const text = String(label || '').replace(/[（）()]/g, '').trim();
  const short = text.length > 8 ? `${text.slice(0, 8)}...` : text;
  return short ? `${coef}（${short}）` : String(coef);
}

Page({
  onGoHome,
  data: {
    projectName: '',
    stages: [
      { value: 'F4', label: '工程设计 (F4)' },
      { value: 'F4b', label: '专项设计 (F4b)' },
      { value: 'F1', label: '前期投资决策 (F1)' },
      { value: 'F2', label: '国土空间规划 (F2)' },
      { value: 'F3', label: '工程勘察 (F3)' },
      { value: 'F5', label: '造价咨询 (F5)' },
      { value: 'F6', label: '全过程工程咨询 (F6)' }
    ],
    stageIndex: 0,
    F6Specialties: [
      { value: 'F6a', label: '全过程工程咨询（建筑）', coef: 1.15 },
      { value: 'F6b', label: '全过程工程咨询（市政）', coef: 1.10 },
      { value: 'F6c', label: '全过程工程咨询（工业）', coef: 1.20 }
    ],
    F6SpecialtyIndex: 0,
    currentStage: 'F4',
    cost: '',

    // F4 Design fields
    specialties: [
      { value: 'mining', label: '矿山采选工程设计' },
      { value: 'processing', label: '加工冶炼工程设计' },
      { value: 'petrochemical', label: '石油化工工程设计' },
      { value: 'water_power', label: '水利电力工程设计' },
      { value: 'traffic', label: '交通运输工程设计' },
      { value: 'building_municipal', label: '建筑市政工程设计' },
      { value: 'agriculture_forestry', label: '农业林业工程设计' }
    ],
    specialtyIndex: 5,
    specialtyCoefIndex: 0,
    selectedSpecialtyValue: 'building',
    specialtyCoefVal: 1.0,
    specialtyCoefText: shortCoefText(1.0, '建筑/市政/电信工程'),
    showCoefSheet: false,
    coefSheetOptions: [],
    complexity: 'II', // Default II
    complexityCoefVal: 1.0,
    complexityCoefText: shortCoefText(1.0, 'II级 较复杂'),
    
    // We store selected additional coefficients as an array
    selectedAddCoefs: [],
    designAddCoefText: '1.00 (无)',

    // F4 Extra services
    extraServices: {
      budget: false,
      asbuilt: false,
      overall: false,
      coordination: false,
      nonStdDevBase: '',
      nonStdDevRate: ''
    },

    // F1 Planning fields
    reportTypes: [
      { value: 'project_proposal', label: '编制项目建议书' },
      { value: 'feasibility_study', label: '编制可行性研究报告' },
      { value: 'project_application', label: '编制项目申请报告' },
      { value: 'funding_application', label: '编制资金申请报告' },
      { value: 'pre_feasibility', label: '编制预可行性研究报告' }
    ],
    reportIndex: 0,
    selectedPlanningAddCoefs: [],
    planningAddCoefText: '1.00 (无)',

    // F3 Survey fields
    surveyTypes: [
      { value: 'survey', label: '岩土工程勘察基本服务' },
      { value: 'consult', label: '岩土工程勘察技术咨询' },
      { value: 'supervision', label: '岩土工程勘察旁站监理' }
    ],
    surveyTypeIndex: 0,
    surveyComplexity: 'II',
    surveyComplexityVal: 1.0,
    surveySiteComplexity: 'II',
    surveySiteComplexityVal: 1.0,
    selectedSurveyAddCoefs: [],
    surveyAddCoefText: '1.00 (无)',

    // F5 Cost Consulting fields
    costTypes: [
      { value: 'estimate', label: '投资估算编制/审核' },
      { value: 'budget_outline', label: '工程概算编制/审核' },
      { value: 'bill_quantity', label: '工程量清单编制/审核' },
      { value: 'budget_bill', label: '预算编制/审核(清单)' },
      { value: 'budget_quota', label: '预算编制/审核(定额)' },
      { value: 'settlement_prep', label: '工程结算编制' },
      { value: 'settlement_audit', label: '工程结算审核' },
      { value: 'whole_process', label: '全过程造价控制' },
      { value: 'dispute_appraisal', label: '工程造价纠纷鉴证' },
      { value: 'steel_calc', label: '钢筋及预埋件计算' }
    ],
    costTypeIndex: 2,
    costDeduction: '',
    steelWeight: '',

    // F2 Land Planning fields
    planningTypes: [
      { value: 'constructive', label: '修建性详细规划' },
      { value: 'regulatory', label: '控制性详细规划' },
      { value: 'overall', label: '城市总体国土空间规划' }
    ],
    planningTypeIndex: 0,
    constructiveType: 'residential', // 'residential', 'public'
    constructiveScheme: 'general', // 'general', 'scheme', 'design'
    constructiveVertical: false,
    regulatoryType: 'general_zone', // 'new_zone', 'general_zone', 'key_zone'
    regulatoryExtra: false,
    regulatoryLevel: 'one_level', // 'one_level', 'two_levels'
    regulatoryAmendment: false,
    overallPopulation: '50', // 万人
    overallApproval: 'province', // 'council', 'province', 'none'
    overallType: 'normal', // 'normal', 'recent', 'assessment'

    // Common
    discount: '100',
    taxRate: '6',
    draftNotice: '输入内容会自动暂存；确认计算后保存到历史，项目内计算会同步写入项目。'
  },

  getDraftContext: function () {
    return {
      projectId: app.globalData.activeProjectId || 0,
      itemId: app.globalData.activeDraftItemId || 0,
      stage: this.data.currentStage,
      specialty: this.data.selectedSpecialtyValue || app.globalData.targetSpecialty || ''
    };
  },

  getDraftFormData: function () {
    return {
      projectName: this.data.projectName,
      currentStage: this.data.currentStage,
      stageIndex: this.data.stageIndex,
      cost: this.data.cost,
      specialtyIndex: this.data.specialtyIndex,
      specialtyCoefIndex: this.data.specialtyCoefIndex,
      selectedSpecialtyValue: this.data.selectedSpecialtyValue,
      specialtyCoefVal: this.data.specialtyCoefVal,
      specialtyCoefText: this.data.specialtyCoefText,
      reportIndex: this.data.reportIndex,
      surveyTypeIndex: this.data.surveyTypeIndex,
      costTypeIndex: this.data.costTypeIndex,
      planningTypeIndex: this.data.planningTypeIndex,
      F6SpecialtyIndex: this.data.F6SpecialtyIndex,
      complexity: this.data.complexity,
      complexityCoefVal: this.data.complexityCoefVal,
      complexityCoefText: this.data.complexityCoefText,
      selectedAddCoefs: this.data.selectedAddCoefs,
      designAddCoefText: this.data.designAddCoefText,
      extraServices: this.data.extraServices,
      selectedPlanningAddCoefs: this.data.selectedPlanningAddCoefs,
      planningAddCoefText: this.data.planningAddCoefText,
      surveyComplexity: this.data.surveyComplexity,
      surveyComplexityVal: this.data.surveyComplexityVal,
      surveySiteComplexity: this.data.surveySiteComplexity,
      surveySiteComplexityVal: this.data.surveySiteComplexityVal,
      selectedSurveyAddCoefs: this.data.selectedSurveyAddCoefs,
      surveyAddCoefText: this.data.surveyAddCoefText,
      costDeduction: this.data.costDeduction,
      steelWeight: this.data.steelWeight,
      constructiveType: this.data.constructiveType,
      constructiveScheme: this.data.constructiveScheme,
      constructiveVertical: this.data.constructiveVertical,
      regulatoryType: this.data.regulatoryType,
      regulatoryExtra: this.data.regulatoryExtra,
      regulatoryLevel: this.data.regulatoryLevel,
      regulatoryAmendment: this.data.regulatoryAmendment,
      overallPopulation: this.data.overallPopulation,
      overallApproval: this.data.overallApproval,
      overallType: this.data.overallType,
      discount: this.data.discount,
      taxRate: this.data.taxRate
    };
  },

  saveDraft: function () {
    if (this.hasCompletedCalculation) return;
    draftStore.saveDraft('calc', this.getDraftContext(), this.getDraftFormData());
    this.setData({ draftNotice: '已自动暂存，退出后可继续编辑；确认计算后会正式保存。' });
  },

  restoreDraftIfAny: function () {
    const draft = draftStore.getDraft('calc', this.getDraftContext());
    if (draft && draft.formData) {
      this.setData(Object.assign({}, draft.formData, {
        draftNotice: '已恢复上次未完成的暂存内容。'
      }));
    }
  },

  onHide: function () {
    this.saveDraft();
  },

  onUnload: function () {
    this.saveDraft();
  },

  updateNavTitle: function (stage) {
    const titles = {
      'F1': '前期决策计算器',
      'F2': '空间规划计算器',
      'F3': '工程勘察计算器',
      'F4': '设计费计算器',
      'F4b': '设计费计算器',
      'F5': '造价咨询计算器',
      'F6': '全过程咨询计算器',
      'F6a': '全过程咨询计算器',
      'F6b': '全过程咨询计算器',
      'F6c': '全过程咨询计算器'
    };
    wx.setNavigationBarTitle({ title: titles[stage] || '取费计算器' });
  },

  onLoad: function (options) {
    this.applyFormParams(options);
    this.restoreDraftIfAny();
    this.updateNavTitle(this.data.currentStage);
  },

  onShow: function () {
    account.enforceRegistration();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    if (app.globalData.targetStage) {
      this.applyFormParams({
        stage: app.globalData.targetStage,
        cost: app.globalData.targetCost,
        specialty: app.globalData.targetSpecialty,
        projectName: app.globalData.targetProjectName,
        fromSmart: app.globalData.fromSmart
      });

      // Clear global parameters
      app.globalData.targetStage = '';
      app.globalData.targetSpecialty = '';
      app.globalData.targetCost = '';
      app.globalData.targetProjectName = '';
      app.globalData.fromSmart = false;

      this.updateNavTitle(this.data.currentStage);
      this.restoreDraftIfAny();
    }
  },

  applyFormParams: function (params) {
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;

    let stageVal = params.stage || 'F4';
    let costVal = params.cost !== undefined ? params.cost : '';
    let specialtyVal = params.specialty || '';
    let projectNameVal = params.projectName || '';
    let fromSmart = params.fromSmart === 'true' || params.fromSmart === true;

    let defaultName = projectNameVal || (fromSmart ? `智能解析项目 - ${dateStr}` : `新建取费项目 - ${dateStr}`);

    let stageIdx = this.data.stages.findIndex(s => s.value === stageVal);
    if (stageIdx === -1) {
      stageIdx = 0;
      stageVal = 'F4';
    }

    let specIdx = 5;
    let reportIdx = 0;
    let surveyTypeIdx = 0;
    let costTypeIdx = 2; // Default to bill_quantity
    let planningTypeIdx = 0;
    let F6SpecIdx = 0;

    let specCoefIdx = 0;
    let selectedSpecialtyValue = 'building';
    let specialtyCoefVal = 1.0;
    let specialtyCoefText = shortCoefText(1.0, '建筑/市政/电信工程');

    if (specialtyVal) {
      if (stageVal === 'F4') {
        const groupIdx = this.data.specialties.findIndex(group => (F4_SPECIALTY_COEF_GROUPS[group.value] || []).some(item => item.value === specialtyVal));
        if (groupIdx !== -1) {
          specIdx = groupIdx;
          const group = this.data.specialties[groupIdx];
          const coefOptions = F4_SPECIALTY_COEF_GROUPS[group.value] || [];
          const foundCoefIdx = coefOptions.findIndex(item => item.value === specialtyVal);
          specCoefIdx = foundCoefIdx === -1 ? 0 : foundCoefIdx;
          const selected = coefOptions[specCoefIdx];
          selectedSpecialtyValue = selected.value;
          specialtyCoefVal = selected.coef;
          specialtyCoefText = shortCoefText(selected.coef, selected.label);
        }
      } else if (stageVal === 'F1') {
        const foundIdx = this.data.reportTypes.findIndex(r => r.value === specialtyVal);
        if (foundIdx !== -1) reportIdx = foundIdx;
      } else if (stageVal === 'F3') {
        const foundIdx = this.data.surveyTypes.findIndex(s => s.value === specialtyVal);
        if (foundIdx !== -1) surveyTypeIdx = foundIdx;
      } else if (stageVal === 'F5') {
        const foundIdx = this.data.costTypes.findIndex(c => c.value === specialtyVal);
        if (foundIdx !== -1) costTypeIdx = foundIdx;
      } else if (stageVal === 'F2') {
        const foundIdx = this.data.planningTypes.findIndex(p => p.value === specialtyVal);
        if (foundIdx !== -1) planningTypeIdx = foundIdx;
      } else if (stageVal === 'F6') {
        const foundIdx = this.data.F6Specialties.findIndex(f => f.value === specialtyVal);
        if (foundIdx !== -1) F6SpecIdx = foundIdx;
      }
    }

    this.setData({
      projectName: defaultName,
      currentStage: stageVal,
      stageIndex: stageIdx,
      cost: costVal,
      specialtyIndex: specIdx,
      specialtyCoefIndex: specCoefIdx,
      selectedSpecialtyValue,
      specialtyCoefVal,
      specialtyCoefText,
      reportIndex: reportIdx,
      surveyTypeIndex: surveyTypeIdx,
      costTypeIndex: costTypeIdx,
      planningTypeIndex: planningTypeIdx,
      F6SpecialtyIndex: F6SpecIdx,
      
      // Reset dynamic input choices for new parameter flows
      complexity: 'II',
      complexityCoefVal: 1.0,
      complexityCoefText: shortCoefText(1.0, 'II级 较复杂'),
      selectedAddCoefs: [],
      designAddCoefText: '1.00 (无)',
      extraServices: {
        budget: false,
        asbuilt: false,
        overall: false,
        coordination: false,
        nonStdDevBase: '',
        nonStdDevRate: ''
      },
      selectedPlanningAddCoefs: [],
      planningAddCoefText: '1.00 (无)',

      surveyComplexity: 'II',
      surveyComplexityVal: 1.0,
      surveySiteComplexity: 'II',
      surveySiteComplexityVal: 1.0,
      selectedSurveyAddCoefs: [],
      surveyAddCoefText: '1.00 (无)',

      costDeduction: '',
      steelWeight: '',

      constructiveType: 'residential',
      constructiveScheme: 'general',
      constructiveVertical: false,
      regulatoryType: 'general_zone',
      regulatoryExtra: false,
      regulatoryLevel: 'one_level',
      regulatoryAmendment: false,
      overallPopulation: '50',
      overallApproval: 'province',
      overallType: 'normal',

      discount: '100',
      taxRate: '6'
    });
  },

  onNameInput: function (e) {
    this.setData({ projectName: e.detail.value }, () => this.saveDraft());
  },

  onCostInput: function (e) {
    this.setData({ cost: e.detail.value }, () => this.saveDraft());
  },

  onStageChange: function (e) {
    const idx = parseInt(e.detail.value);
    const stage = this.data.stages[idx].value;
    if (stage === 'F1') {
      wx.navigateTo({
        url: '/pages/pre-consult/pre-consult'
      });
      return;
    }
    if (stage === 'F4b') {
      wx.navigateTo({
        url: '/pages/specialty-design/specialty-design'
      });
      return;
    }
    this.setData({
      stageIndex: idx,
      currentStage: stage
    }, () => this.saveDraft());
    this.updateNavTitle(stage);
  },

  onSpecialtyChange: function (e) {
    const specialtyIndex = parseInt(e.detail.value);
    const specialtyGroup = this.data.specialties[specialtyIndex] || this.data.specialties[0];
    const coefOptions = F4_SPECIALTY_COEF_GROUPS[specialtyGroup.value] || F4_SPECIALTY_COEF_GROUPS.mining;
    const firstCoef = coefOptions[0];
    this.setData({
      specialtyIndex,
      specialtyCoefIndex: 0,
      selectedSpecialtyValue: firstCoef.value,
      specialtyCoefVal: firstCoef.coef,
      specialtyCoefText: shortCoefText(firstCoef.coef, firstCoef.label),
      selectedAddCoefs: [],
      designAddCoefText: '1.00 (无)'
    }, () => this.saveDraft());
  },

  onTapSpecialtyCoefOption: function () {
    const specialtyGroup = this.data.specialties[this.data.specialtyIndex] || this.data.specialties[0];
    const coefOptions = F4_SPECIALTY_COEF_GROUPS[specialtyGroup.value] || F4_SPECIALTY_COEF_GROUPS.mining;
    if (coefOptions.length > 6) {
      this.setData({
        showCoefSheet: true,
        coefSheetOptions: coefOptions
      });
      return;
    }
    this.showSpecialtyCoefOptions(coefOptions);
  },

  onCloseCoefSheet: function () {
    this.setData({ showCoefSheet: false, coefSheetOptions: [] });
  },

  onSelectCoefSheetOption: function (e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const option = this.data.coefSheetOptions[index];
    if (!option) return;
    this.applySpecialtyCoefOption(option, index);
    this.onCloseCoefSheet();
  },

  showSpecialtyCoefOptions: function (coefOptions) {
    wx.showActionSheet({
      itemList: coefOptions.map(item => `${item.label}（${item.coef}）`),
      success: (res) => {
        const option = coefOptions[res.tapIndex] || coefOptions[0];
        this.applySpecialtyCoefOption(option, res.tapIndex);
      }
    });
  },

  applySpecialtyCoefOption: function (option, index) {
    this.setData({
      specialtyCoefIndex: index,
      selectedSpecialtyValue: option.value,
      specialtyCoefVal: option.coef,
      specialtyCoefText: shortCoefText(option.coef, option.label),
      selectedAddCoefs: [],
      designAddCoefText: '1.00 (无)'
    });
  },

  onReportTypeChange: function (e) {
    this.setData({ reportIndex: parseInt(e.detail.value) });
  },

  onF6SpecialtyChange: function (e) {
    this.setData({ F6SpecialtyIndex: parseInt(e.detail.value) });
  },

  // F4 Design helpers
  onTapComplexityOption: function () {
    const items = ['I级 (简单 0.85)', 'II级 (较复杂 1.0)', 'III级 (复杂 1.15)'];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const keys = ['I', 'II', 'III'];
        const coefs = [0.85, 1.0, 1.15];
        this.setData({
          complexity: keys[res.tapIndex],
          complexityCoefVal: coefs[res.tapIndex],
          complexityCoefText: shortCoefText(coefs[res.tapIndex], items[res.tapIndex])
        });
      }
    });
  },

  onTapAdditionalOption: function () {
    const specialty = this.data.selectedSpecialtyValue || (this.data.specialties[this.data.specialtyIndex] || {}).value;
    const groups = F4_DESIGN_ADDITIONAL_GROUPS[specialty];
    if (groups) {
      wx.showActionSheet({
        itemList: groups.map(group => group.label),
        success: (groupRes) => {
          const group = groups[groupRes.tapIndex];
          if (!group) return;
          if (group.options.length === 1) {
            this.applyDesignAdditionalOption(group.options[0]);
            return;
          }
          this.showDesignAdditionalOptions(group.options);
        }
      });
      return;
    }

    this.showDesignAdditionalOptions(F4_DESIGN_ADDITIONAL_OPTIONS[specialty] || GENERAL_RENOVATION_OPTIONS);
  },

  showDesignAdditionalOptions: function (options) {
    wx.showActionSheet({
      itemList: options.map(option => option.label),
      success: (res) => {
        const option = options[res.tapIndex] || options[0];
        this.applyDesignAdditionalOption(option);
      }
    });
  },

  applyDesignAdditionalOption: function (option) {
    this.setData({
      selectedAddCoefs: option.value ? [option.value] : [],
      designAddCoefText: shortCoefText(option.value || 1.0, option.text)
    });
  },

  // F1 Planning helpers
  onTapPlanningAdditionalOption: function () {
    const items = [
      '无附加系数 (1.0)',
      '复杂项目调整 (1.2)',
      '跨区域协调项目 (1.15)'
    ];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        let coefs = [];
        let text = '1.00 (无)';

        if (res.tapIndex === 0) {
          coefs = [];
          text = '1.00 (无)';
        } else if (res.tapIndex === 1) {
          coefs = [1.2];
          text = '1.20 (复杂项目)';
        } else if (res.tapIndex === 2) {
          coefs = [1.15];
          text = '1.15 (跨区协调)';
        }

        this.setData({
          selectedPlanningAddCoefs: coefs,
          planningAddCoefText: text
        });
      }
    });
  },

  // F3 Survey helpers
  onSurveyTypeChange: function (e) {
    this.setData({ surveyTypeIndex: parseInt(e.detail.value) });
  },

  onTapSurveyComplexityOption: function () {
    const items = ['I级 (简单 0.85)', 'II级 (中等 1.0)', 'III级 (复杂 1.15)', 'IV级 (特别复杂 1.3)'];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const keys = ['I', 'II', 'III', 'IV'];
        const coefs = [0.85, 1.0, 1.15, 1.3];
        this.setData({
          surveyComplexity: keys[res.tapIndex],
          surveyComplexityVal: coefs[res.tapIndex]
        });
      }
    });
  },

  onTapSurveySiteOption: function () {
    const items = ['I级 (简单 0.8)', 'II级 (中等 1.0)', 'III级 (复杂 1.2)', 'IV级 (特别复杂 1.3)'];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const keys = ['I', 'II', 'III', 'IV'];
        const coefs = [0.8, 1.0, 1.2, 1.3];
        this.setData({
          surveySiteComplexity: keys[res.tapIndex],
          surveySiteComplexityVal: coefs[res.tapIndex]
        });
      }
    });
  },

  onTapSurveyAdditionalOption: function () {
    const items = [
      '无附加系数 (1.0)',
      '分阶段完成 (+10%)',
      '主体协调 (+15%)',
      '市政工程 (+30%)',
      '夜间作业 (+20%)'
    ];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        let coefs = [];
        let text = '1.00 (无)';
        if (res.tapIndex === 0) {
          coefs = [];
          text = '1.00 (无)';
        } else if (res.tapIndex === 1) {
          coefs = [1.1];
          text = '1.10 (分阶段)';
        } else if (res.tapIndex === 2) {
          coefs = [1.15];
          text = '1.15 (主体协调)';
        } else if (res.tapIndex === 3) {
          coefs = [1.3];
          text = '1.30 (市政工程)';
        } else if (res.tapIndex === 4) {
          coefs = [1.2];
          text = '1.20 (夜间作业)';
        }
        this.setData({
          selectedSurveyAddCoefs: coefs,
          surveyAddCoefText: text
        });
      }
    });
  },

  // F5 Cost Consulting helpers
  onCostTypeChange: function (e) {
    this.setData({ costTypeIndex: parseInt(e.detail.value) });
  },

  onCostDeductionInput: function (e) {
    this.setData({ costDeduction: e.detail.value });
  },

  onSteelWeightInput: function (e) {
    this.setData({ steelWeight: e.detail.value });
  },

  // F2 Land Planning helpers
  onPlanningTypeChange: function (e) {
    this.setData({ planningTypeIndex: parseInt(e.detail.value) });
  },

  onTapConstructiveTypeOption: function () {
    const items = ['居住区规划', '公建规划'];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const keys = ['residential', 'public'];
        this.setData({ constructiveType: keys[res.tapIndex] });
      }
    });
  },

  onTapConstructiveSchemeOption: function () {
    const items = ['常规修建性详细规划', '增加总平面方案 (+30%)', '增加总平面设计 (+50%)'];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const keys = ['general', 'scheme', 'design'];
        this.setData({ constructiveScheme: keys[res.tapIndex] });
      }
    });
  },

  toggleConstructiveVertical: function () {
    this.setData({ constructiveVertical: !this.data.constructiveVertical });
  },

  onTapRegulatoryTypeOption: function () {
    const items = ['城市新区/开发区/自贸区', '城市一般地段', '城市重点地段'];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const keys = ['new_zone', 'general_zone', 'key_zone'];
        this.setData({ regulatoryType: keys[res.tapIndex] });
      }
    });
  },

  toggleRegulatoryExtra: function () {
    this.setData({ regulatoryExtra: !this.data.regulatoryExtra });
  },

  onTapRegulatoryLevelOption: function () {
    const items = ['一个层面 (最低保底30万)', '两个层面 (最低保底35万)'];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const keys = ['one_level', 'two_levels'];
        this.setData({ regulatoryLevel: keys[res.tapIndex] });
      }
    });
  },

  toggleRegulatoryAmendment: function () {
    this.setData({ regulatoryAmendment: !this.data.regulatoryAmendment });
  },

  onOverallPopulationInput: function (e) {
    this.setData({ overallPopulation: e.detail.value });
  },

  onTapOverallApprovalOption: function () {
    const items = ['国务院审批 (x1.3)', '省政府审批 (x1.1)', '其他部门审批 (x1.0)'];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const keys = ['council', 'province', 'none'];
        this.setData({ overallApproval: keys[res.tapIndex] });
      }
    });
  },

  onTapOverallTypeOption: function () {
    const items = ['总体规划 (100%计取)', '近期建设规划 (40%计取)', '实施评估/前期研究 (30%计取)'];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const keys = ['normal', 'recent', 'assessment'];
        this.setData({ overallType: keys[res.tapIndex] });
      }
    });
  },

  toggleExtra: function (e) {
    const key = e.currentTarget.dataset.key;
    const value = !this.data.extraServices[key];
    this.setData({
      [`extraServices.${key}`]: value
    });
  },

  onNonStdBaseInput: function (e) {
    this.setData({
      'extraServices.nonStdDevBase': e.detail.value
    });
  },

  onNonStdRateInput: function (e) {
    this.setData({
      'extraServices.nonStdDevRate': e.detail.value
    });
  },

  onDiscountInput: function (e) {
    this.setData({ discount: e.detail.value });
  },

  onTaxRateInput: function (e) {
    this.setData({ taxRate: e.detail.value });
  },

  onReset: function () {
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
    const defaultName = `新建取费项目 - ${dateStr}`;

    this.setData({
      projectName: defaultName,
      cost: '',
      specialtyIndex: 5,
      specialtyCoefIndex: 0,
      selectedSpecialtyValue: 'building',
      specialtyCoefVal: 1.0,
      specialtyCoefText: shortCoefText(1.0, '建筑/市政/电信工程'),
      complexity: 'II',
      complexityCoefVal: 1.0,
      complexityCoefText: shortCoefText(1.0, 'II级 较复杂'),
      selectedAddCoefs: [],
      designAddCoefText: '1.00 (无)',
      extraServices: {
        budget: false,
        asbuilt: false,
        overall: false,
        coordination: false,
        nonStdDevBase: '',
        nonStdDevRate: ''
      },
      reportIndex: 0,
      selectedPlanningAddCoefs: [],
      planningAddCoefText: '1.00 (无)',

      surveyTypeIndex: 0,
      surveyComplexity: 'II',
      surveyComplexityVal: 1.0,
      surveySiteComplexity: 'II',
      surveySiteComplexityVal: 1.0,
      selectedSurveyAddCoefs: [],
      surveyAddCoefText: '1.00 (无)',

      costTypeIndex: 2,
      costDeduction: '',
      steelWeight: '',

      planningTypeIndex: 0,
      constructiveType: 'residential',
      constructiveScheme: 'general',
      constructiveVertical: false,
      regulatoryType: 'general_zone',
      regulatoryExtra: false,
      regulatoryLevel: 'one_level',
      regulatoryAmendment: false,
      overallPopulation: '50',
      overallApproval: 'province',
      overallType: 'normal',

      F6SpecialtyIndex: 0,

      discount: '100',
      taxRate: '6'
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

    const discount = toNumber(this.data.discount, 100);
    const taxRate = toNumber(this.data.taxRate, 0);
    const rateError = validateRates(discount, taxRate);
    if (rateError) {
      wx.showToast({ title: rateError, icon: 'none' });
      return;
    }
    let result = null;

    if (this.data.currentStage === 'F4') {
      const specialty = this.data.selectedSpecialtyValue;
      const complexity = this.data.complexity;
      const extraServices = {
        budget: this.data.extraServices.budget,
        asbuilt: this.data.extraServices.asbuilt,
        overall: this.data.extraServices.overall,
        coordination: this.data.extraServices.coordination,
        nonStdDevBase: parseFloat(this.data.extraServices.nonStdDevBase) || 0,
        nonStdDevRate: parseFloat(this.data.extraServices.nonStdDevRate) || 0
      };

      result = calculateDesignFee({
        cost,
        specialty,
        specialtyCoef: this.data.specialtyCoefVal,
        complexity,
        additionalCoefficients: this.data.selectedAddCoefs,
        discount,
        extraServices,
        taxRate
      });
      result.specialtyName = `${this.data.specialties[this.data.specialtyIndex].label.replace('设计', '')} · ${this.data.specialtyCoefText}`;
      result.complexityName = this.data.complexity === 'I' ? 'I级' : (this.data.complexity === 'II' ? 'II级' : 'III级');
    } else if (this.data.currentStage === 'F1') {
      const reportType = this.data.reportTypes[this.data.reportIndex].value;

      result = calculatePlanningFee({
        cost,
        reportType,
        additionalCoefficients: this.data.selectedPlanningAddCoefs,
        discount,
        taxRate
      });
      result.reportTypeName = this.data.reportTypes[this.data.reportIndex].label;
    } else if (this.data.currentStage === 'F3') {
      const surveyType = this.data.surveyTypes[this.data.surveyTypeIndex].value;
      
      result = calculateSurveyFee({
        cost,
        surveyType,
        complexity: this.data.surveyComplexity,
        siteComplexity: this.data.surveySiteComplexity,
        additionalCoefficients: this.data.selectedSurveyAddCoefs,
        discount,
        taxRate
      });
      result.surveyTypeName = this.data.surveyTypes[this.data.surveyTypeIndex].label;
    } else if (this.data.currentStage === 'F5') {
      const costType = this.data.costTypes[this.data.costTypeIndex].value;
      const deduction = parseFloat(this.data.costDeduction) || 0;
      const steelWeight = parseFloat(this.data.steelWeight) || 0;

      result = calculateCostFee({
        cost,
        costType,
        deduction,
        steelWeight,
        discount,
        taxRate
      });
      result.costTypeName = this.data.costTypes[this.data.costTypeIndex].label;
    } else if (this.data.currentStage === 'F2') {
      const planningType = this.data.planningTypes[this.data.planningTypeIndex].value;

      result = calculatePlanningF2Fee({
        cost,
        planningType,
        constructiveType: this.data.constructiveType,
        constructiveScheme: this.data.constructiveScheme,
        constructiveVertical: this.data.constructiveVertical,
        regulatoryType: this.data.regulatoryType,
        regulatoryExtra: this.data.regulatoryExtra,
        regulatoryLevel: this.data.regulatoryLevel,
        regulatoryAmendment: this.data.regulatoryAmendment,
        overallPopulation: parseFloat(this.data.overallPopulation) || 50,
        overallApproval: this.data.overallApproval,
        overallType: this.data.overallType,
        discount,
        taxRate
      });
      result.planningTypeName = this.data.planningTypes[this.data.planningTypeIndex].label;
    } else if (this.data.currentStage === 'F6') {
      const specialty = this.data.F6Specialties[this.data.F6SpecialtyIndex].value;
      const complexity = this.data.complexity;
      const extraServices = {
        budget: this.data.extraServices.budget,
        asbuilt: this.data.extraServices.asbuilt,
        overall: this.data.extraServices.overall,
        coordination: this.data.extraServices.coordination,
        nonStdDevBase: parseFloat(this.data.extraServices.nonStdDevBase) || 0,
        nonStdDevRate: parseFloat(this.data.extraServices.nonStdDevRate) || 0
      };

      result = calculateDesignFee({
        cost,
        specialty,
        complexity,
        additionalCoefficients: this.data.selectedAddCoefs,
        discount,
        extraServices,
        taxRate
      });
      result.specialtyName = this.data.F6Specialties[this.data.F6SpecialtyIndex].label;
      result.complexityName = this.data.complexity === 'I' ? 'I级' : (this.data.complexity === 'II' ? 'II级' : 'III级');
      result.basis = '计价格[2002]10号；广东地区参考粤勘设协字[2024]12号、粤建科[2019]12号等';
    }

    if (!result) return;

    let stageName = '工程设计';
    let color = '#102744';
    
    if (this.data.currentStage === 'F1') {
      stageName = '前期决策';
      color = '#708198';
    } else if (this.data.currentStage === 'F2') {
      stageName = '空间规划';
      color = '#2E7D32';
    } else if (this.data.currentStage === 'F3') {
      stageName = '工程勘察';
      color = '#EF6C00';
    } else if (this.data.currentStage === 'F5') {
      stageName = '造价咨询';
      color = '#6A1B9A';
    } else if (this.data.currentStage === 'F6') {
      stageName = '全过程咨询';
      color = '#3f51b5';
    }

    // 确定子项名称
    let itemName = this.data.projectName || '未命名子项';
    
    // 如果归属到项目，检查项目是否存在
    const activeProjectId = app.globalData.activeProjectId;
    const activeDraftItemId = app.globalData.activeDraftItemId;
    let projectName = '';
    if (activeProjectId) {
      const project = getProject(activeProjectId);
      if (project) {
        projectName = project.name;
        // 子项名称使用当前选择的具体类型
        if (this.data.currentStage === 'F4') {
          itemName = this.data.specialties[this.data.specialtyIndex].label;
        } else if (this.data.currentStage === 'F1') {
          itemName = this.data.reportTypes[this.data.reportIndex].label;
        } else if (this.data.currentStage === 'F3') {
          itemName = this.data.surveyTypes[this.data.surveyTypeIndex].label;
        } else if (this.data.currentStage === 'F5') {
          itemName = this.data.costTypes[this.data.costTypeIndex].label;
        } else if (this.data.currentStage === 'F2') {
          itemName = this.data.planningTypes[this.data.planningTypeIndex].label;
        } else if (this.data.currentStage === 'F6') {
          itemName = this.data.F6Specialties[this.data.F6SpecialtyIndex].label;
        }
      }
    }

    // 存入项目层级（如果有关联项目）
    let itemId = null;
    if (activeProjectId && getProject(activeProjectId)) {
      const item = activeDraftItemId
        ? updateCalcItemResult(activeProjectId, activeDraftItemId, result, itemName)
        : addCalcItem(activeProjectId, this.data.currentStage, result, itemName);
      const savedItem = item || (activeDraftItemId ? addCalcItem(activeProjectId, this.data.currentStage, result, itemName) : null);
      if (savedItem) {
        itemId = savedItem.id;
      }
    }
    app.globalData.activeDraftItemId = 0;

    // 同时保存到旧版 history（兼容）
    const history = wx.getStorageSync(app.globalData.historyKey) || [];
    const newId = itemId || (history.length > 0 ? Math.max(...history.map(h => h.id)) + 1 : 1);

    const now = new Date();
    const timeStr = `今天 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newRecord = {
      id: newId,
      name: projectName ? `${projectName} · ${itemName}` : (this.data.projectName || '未命名项目'),
      stage: this.data.currentStage,
      stageName: stageName,
      meta: timeStr,
      amount: `${result.total.toFixed(2)}万`,
      color: color,
      appEdition: wx.getStorageSync('yicalc_app_edition') || (app.globalData && app.globalData.appEdition) || 'all',
      calcDetail: result,
      projectId: activeProjectId || null,
      projectName: projectName,
      docs: [
        { name: `${itemName}报价单.pdf`, meta: `刚刚创建 · ${(Math.random() * 2 + 1).toFixed(1)} MB`, color: color }
      ]
    };

    history.unshift(newRecord);
    wx.setStorageSync(app.globalData.historyKey, history);
    this.hasCompletedCalculation = true;
    draftStore.clearDraft('calc', {
      projectId: activeProjectId || 0,
      itemId: activeDraftItemId || 0,
      stage: this.data.currentStage,
      specialty: this.data.selectedSpecialtyValue || ''
    });
    incrementUsageCount();

    wx.navigateTo({
      url: `/pages/result/result?id=${newId}`
    });
  },

  // 微信分享
  onShareAppMessage: function () {
    return {
      title: '易计算 - 工程设计收费报价系统',
      desc: '快速计算工程设计费、造价咨询费、勘察费等工程取费',
      path: '/pages/calc/calc'
    };
  }
});
