const assert = require('assert');

const storage = {};
global.wx = {
  getStorageSync(key) {
    return storage[key];
  },
  setStorageSync(key, value) {
    storage[key] = value;
  }
};

const {
  calculateDesignFee,
  calculateSurveyFee
} = require('./miniprogram/utils/calculator.js');
const {
  createProject,
  addCalcItem,
  addDraftCalcItem,
  updateCalcItemResult,
  findProjectItem,
  getProject,
  getProjectList,
  calculateProjectTotal
} = require('./miniprogram/utils/project-manager.js');
const { generatePDF } = require('./miniprogram/utils/pdf-generator.js');
const { incrementUsageCount, getUsageCount } = require('./miniprogram/utils/usage-counter.js');
const draftStore = require('./miniprogram/utils/calc-draft.js');

async function run() {
  storage.yicalc_history = [
    { id: 7, name: '旧记录', stage: 'F4', calcDetail: { total: 1 } }
  ];

  const design = calculateDesignFee({
    cost: 5000,
    specialty: 'building',
    complexity: 'II',
    additionalCoefficients: [{ coef: 1.2, name: '对象系数兼容' }],
    taxRate: 6
  });
  assert.strictEqual(design.netAdditionalCoef, 1.2);
  assert.strictEqual(design.basicFee, 196.68);
  assert.strictEqual(design.total, 208.4808);

  const project = createProject({ name: '测试项目', totalInvestment: 5000 });
  const item = addCalcItem(project.id, 'F1.4', { total: 12.34, cost: 5000 }, '环评报告表');
  assert(item.id > 7, '新增项目子项 ID 应避开历史记录 ID');

  const saved = getProject(project.id);
  assert.strictEqual(saved.stages.length, 1);
  assert.strictEqual(saved.stages[0].id, 'F1.4');
  assert.strictEqual(saved.stages[0].items[0].name, '环评报告表');

  const total = calculateProjectTotal(project.id);
  assert.strictEqual(total.total, 12.34);
  const dirtyProject = createProject({ name: '脏数据项目', totalInvestment: 0 });
  addCalcItem(dirtyProject.id, 'F4', { total: '9.99', cost: 10 }, '字符串金额');
  addCalcItem(dirtyProject.id, 'F4', { total: 'bad', cost: 10 }, '异常金额');
  assert.strictEqual(calculateProjectTotal(dirtyProject.id).total, 9.99, '项目统计应兼容字符串和异常金额');

  const draftProject = createProject({ name: '模板预设项目', totalInvestment: 0 });
  const draft = addDraftCalcItem(draftProject.id, 'S1', {
    name: '室内设计',
    specialty: 'S1',
    quoteStage: 'F4b',
    quoteSpecialty: 'S1',
    templateData: { cost: 680, projectName: '模板预设项目' }
  });
  assert(draft.id > item.id, '待报价子项应生成独立 ID');
  assert.strictEqual(draft.quoteStatus, 'pending');
  assert.strictEqual(draft.templateData.cost, 680, '模板子项应保留总投资等模板上下文');
  assert.strictEqual(calculateProjectTotal(draftProject.id).total, 0, '待报价子项不应计入项目合计');
  const completedDraft = updateCalcItemResult(draftProject.id, draft.id, { total: 8.88, cost: 100 }, '室内设计报价');
  assert(completedDraft, '待报价子项应可更新为正式报价');
  assert.strictEqual(completedDraft.quoteStatus, 'done');
  assert.strictEqual(calculateProjectTotal(draftProject.id).total, 8.88, '待报价完成后应计入项目合计');
  const locatedDraft = findProjectItem(draftProject.id, draft.id);
  assert.strictEqual(locatedDraft.item.calcResult.total, 8.88, '已完成模板子项应可重新定位以便修改');

  const draftContext = { projectId: draftProject.id, itemId: draft.id, stage: 'F4b', specialty: 'S1' };
  draftStore.saveDraft('specialty-design', draftContext, { projectName: '模板预设项目', s1: { cost: '680' } });
  const restoredDraft = draftStore.getDraft('specialty-design', draftContext);
  assert.strictEqual(restoredDraft.formData.s1.cost, '680', '计算输入应可自动暂存并恢复');
  draftStore.clearDraft('specialty-design', draftContext);
  assert.strictEqual(draftStore.getDraft('specialty-design', draftContext), null, '正式保存后应可清除暂存草稿');

  const survey = calculateSurveyFee({
    cost: 1000,
    surveyType: 'survey',
    complexity: 'II',
    siteComplexity: 'II',
    additionalCoefficients: [1.3]
  });
  assert.strictEqual(survey.siteComplexityCoef, 1);
  assert.strictEqual(survey.basicFee, 40.82);

  const pdfBuffer = await generatePDF({
    id: 101,
    name: 'PDF测试',
    stage: 'F1.4',
    color: '#708198',
    calcDetail: {
      cost: 5000,
      total: 12.34,
      basePrice: 10,
      consultTypeName: '环境影响评价',
      subTypeName: '报告表',
      discount: 100,
      taxRate: 6,
      tax: 0.7
    }
  });
  assert(pdfBuffer instanceof ArrayBuffer);
  assert(pdfBuffer.byteLength > 1000);

  let backupRequests = 0;
  global.wx = Object.assign(global.wx, {
    login(obj) { obj.success({ code: 'login-code-' + Date.now() }); },
    request(options) {
      backupRequests += 1;
      assert(options.header['X-Yicalc-Code'], '备份请求应携带 wx.login code');
      assert(!options.header['X-Yicalc-Token'], '备份请求不应再携带共享 token');
      assert(!options.data.raw, '备份 payload 不应重复携带 raw 数据');
      assert(options.data.deviceId.indexOf('1h-arch_') === 0, '备份 payload 应包含本机设备 ID');
      assert(options.data.profileSummary, '备份 payload 应包含账户摘要');
      assert(options.data.summary, '备份 payload 应包含数据摘要');
      assert(options.data.fingerprint, '备份 payload 应包含数据指纹');
      options.success({
        statusCode: 200,
        data: { success: true, file: 'backup_test.json', bytes: 123 }
      });
    }
  });
  storage.yicalc_projects = [{ id: 1, stages: [] }];
  storage.yicalc_history = [{ id: 1, calcDetail: { total: 1 } }];
  storage.yicalc_calc_drafts = { a: { formData: {} } };
  delete storage.yicalc_cloud_account;
  delete require.cache[require.resolve('./miniprogram/utils/server-backup.js')];
  const serverBackup = require('./miniprogram/utils/server-backup.js');
  const noConsent = await serverBackup.autoBackupSilently();
  assert.strictEqual(noConsent.skipped, true, '未注册/未同意隐私政策时不应备份');
  assert.strictEqual(backupRequests, 0, '未同意隐私政策时不应发出备份请求');
  storage.yicalc_cloud_account = { openid: 'openid-test-001', name: '张三', phone: '13800138000', company: '测试公司', privacyAgreedAt: '2026-10-02T00:00:00.000Z' };
  await serverBackup.backupNow({ force: false });
  const skippedBackup = await serverBackup.backupNow({ force: false });
  assert.strictEqual(backupRequests, 1, '同一指纹在 10 分钟间隔内不应重复上传');
  assert.strictEqual(skippedBackup.skipped, true);
  storage.yicalc_server_backup_meta.lastSuccessAt -= 11 * 60 * 1000;
  await serverBackup.backupNow({ force: false });
  assert.strictEqual(backupRequests, 1, '数据未变化时，超过 10 分钟也不应重复上传');
  storage.yicalc_server_backup_meta.lastSuccessAt -= 25 * 60 * 60 * 1000;
  await serverBackup.backupNow({ force: false });
  assert.strictEqual(backupRequests, 2, '数据未变化时，超过 24 小时应发一次心跳');
  storage.yicalc_history.push({ id: 2, calcDetail: { total: 2 } });
  await serverBackup.backupNow({ force: false });
  assert.strictEqual(backupRequests, 3, '数据变化后应允许无感备份');

  delete storage.yicalc_server_backup_meta;
  delete require.cache[require.resolve('./miniprogram/utils/server-backup.js')];
  const serverBackupWithInflight = require('./miniprogram/utils/server-backup.js');
  let pendingSuccess = null;
  let inflightRequests = 0;
  global.wx.request = function (options) {
    inflightRequests += 1;
    pendingSuccess = options.success;
  };
  const firstInflight = serverBackupWithInflight.backupNow({ force: false });
  const secondInflight = serverBackupWithInflight.backupNow({ force: false });
  await new Promise(resolve => setImmediate(resolve));
  assert.strictEqual(inflightRequests, 1, '并发静默备份应复用同一个请求');
  pendingSuccess({ statusCode: 200, data: { success: true, file: 'backup_inflight.json', bytes: 123 } });
  await Promise.all([firstInflight, secondInflight]);

  const app = {
    globalData: {
      historyKey: 'yicalc_history',
      targetStage: '',
      targetSpecialty: '',
      targetCost: '',
      targetProjectName: '',
      targetArea: '',
      fromSmart: false,
      activeProjectId: 0
    }
  };
  global.getApp = () => app;
  const nav = [];
  global.wx = Object.assign(global.wx, {
    switchTab(obj) { nav.push({ type: 'switchTab', url: obj.url }); },
    navigateTo(obj) { nav.push({ type: 'navigateTo', url: obj.url }); },
    showToast() {}
  });
  global.Page = config => { global.__pageConfig = config; };
  let silentBackupCalls = 0;
  const serverBackupForApp = require('./miniprogram/utils/server-backup.js');
  serverBackupForApp.autoBackupSilently = function () {
    silentBackupCalls += 1;
    return Promise.resolve({ skipped: true });
  };
  serverBackupForApp.isConfigured = function () { return true; };
  const originalSetTimeout = global.setTimeout;
  const originalSetInterval = global.setInterval;
  global.setTimeout = fn => { fn(); return 1; };
  global.setInterval = fn => { fn(); return 2; };
  global.App = config => { global.__appConfig = config; };
  global.wx.cloud = null;
  delete require.cache[require.resolve('./miniprogram/app.js')];
  require('./miniprogram/app.js');
  global.__appConfig.onLaunch.call(global.__appConfig);
  global.__appConfig.onShow.call(global.__appConfig);
  assert(silentBackupCalls >= 2, '启动和再次打开应触发静默备份');
  global.setTimeout = originalSetTimeout;
  global.setInterval = originalSetInterval;

  global.Page = config => { global.__pageConfig = config; };
  delete require.cache[require.resolve('./miniprogram/pages/index/index.js')];
  require('./miniprogram/pages/index/index.js');
  const indexPage = {
    data: Object.assign({}, global.__pageConfig.data),
    setData(data) { Object.assign(this.data, data); }
  };
  Object.keys(global.__pageConfig).forEach(key => {
    if (typeof global.__pageConfig[key] === 'function') {
      indexPage[key] = global.__pageConfig[key].bind(indexPage);
    }
  });

  indexPage.setData({ searchText: '深圳创投大厦16层办公室装饰装修项目，680万，简约风格' });
  indexPage.onSmartCalc();
  assert.strictEqual(app.globalData.targetProjectName, '深圳创投大厦16层办公室装饰装修项目');
  assert.strictEqual(app.globalData.targetCost, 680);
  assert.strictEqual(app.globalData.targetStage, 'F4');
  assert.strictEqual(app.globalData.targetSpecialty, 'interior_deco');
  assert.deepStrictEqual(nav.pop(), { type: 'switchTab', url: '/pages/calc/calc' });

  indexPage.setData({ searchText: '广州黄埔区跑马大厦景观设计项目，120万' });
  indexPage.onSmartCalc();
  assert.strictEqual(app.globalData.targetProjectName, '广州黄埔区跑马大厦景观设计项目');
  assert.strictEqual(app.globalData.targetCost, 120);
  assert.strictEqual(app.globalData.targetStage, 'F4');
  assert.strictEqual(app.globalData.targetSpecialty, 'landscape');
  assert.deepStrictEqual(nav.pop(), { type: 'switchTab', url: '/pages/calc/calc' });

  global.Page = config => { global.__resultConfig = config; };
  delete require.cache[require.resolve('./miniprogram/pages/result/result.js')];
  require('./miniprogram/pages/result/result.js');
  const archiveProject = createProject({ name: '归档测试项目', totalInvestment: 100 });
  const resultPage = {
    data: {
      record: {
        id: 501,
        name: '专项设计测试',
        stage: 'F4b',
        calcDetail: { total: 3.21, cost: 100 }
      },
      projectList: getProjectList(),
      selectedProjectId: archiveProject.id,
      selectedSaveStage: 'F4',
      saveStageCategories: global.__resultConfig.data.saveStageCategories
    },
    setData(data) {
      Object.assign(this.data, data);
    }
  };
  Object.keys(global.__resultConfig).forEach(key => {
    if (typeof global.__resultConfig[key] === 'function') {
      resultPage[key] = global.__resultConfig[key].bind(resultPage);
    }
  });
  storage.yicalc_history = [resultPage.data.record];
  resultPage.onConfirmSaveToProject();
  const archived = getProject(archiveProject.id);
  assert(archived.stages.some(stage => stage.id === 'F4'), '专项设计应按首页工程设计大类归档');
  const archivedF4 = archived.stages.find(stage => stage.id === 'F4');
  const itemCountAfterFirstSave = archivedF4.items.length;
  resultPage.onConfirmSaveToProject();
  const archivedAgain = getProject(archiveProject.id);
  const archivedAgainF4 = archivedAgain.stages.find(stage => stage.id === 'F4');
  assert.strictEqual(archivedAgainF4.items.length, itemCountAfterFirstSave, '重复保存到同一项目不应重复创建子项');

  const beforeUsage = getUsageCount();
  incrementUsageCount();
  incrementUsageCount();
  assert.strictEqual(getUsageCount(), beforeUsage + 2);
  storage.yicalc_history = [];
  storage.yicalc_projects = [];
  assert.strictEqual(getUsageCount(), beforeUsage + 2, '计算服务次数不应随历史或项目删除而减少');

  // 数值输入：用户填 0 应保留 0，未填写才用默认值；Infinity/非数字视为无效
  const { toNumber, validateRates } = require('./miniprogram/utils/number.js');
  assert.strictEqual(toNumber('0', 100), 0, '填 0 不应被替换为默认值');
  assert.strictEqual(toNumber('', 100), 100);
  assert.strictEqual(toNumber(undefined, 6), 6);
  assert.strictEqual(toNumber('abc', 100), 100);
  assert.strictEqual(toNumber('Infinity', 100), 100);
  assert.strictEqual(toNumber('8.5', 100), 8.5);
  assert.strictEqual(validateRates(100, 0), '');
  assert.strictEqual(validateRates(90, 6), '');
  assert(validateRates(0, 6), '收费比例为 0 应提示');
  assert(validateRates(100, -1), '负税率应提示');
  assert(validateRates(100, 100), '税率 100% 应提示');

  console.log('integrity tests passed');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
