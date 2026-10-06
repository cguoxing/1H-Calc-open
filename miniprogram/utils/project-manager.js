/**
 * 项目层级管理工具 (F0)
 * 
 * 数据模型：
 *   projects: [
 *     {
 *       id: number,
 *       name: string,
 *       description: string,
 *       location: string,
 *       totalInvestment: number,    // 总投资额（万元）
 *       createdAt: string,          // ISO date
 *       updatedAt: string,
 *       stages: [
 *         {
 *           id: string,             // 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6'
 *           name: string,           // 阶段显示名称
 *           items: [
 *             {
 *               id: number,         // 全局唯一 ID（即原 history 中的 id）
 *               name: string,       // 子项名称
 *               stage: string,
 *               specialty: string,  // 专业/类型
 *               calcResult: object, // 计算结果（原 calcDetail）
 *               createdAt: string,
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 */

const STORAGE_KEY = 'yicalc_projects';
const HISTORY_KEY = 'yicalc_history'; // 兼容旧数据

const STAGE_NAMES = {
  F1: '前期投资决策（谋划）',
  'F1.4': '建设条件单项咨询',
  F2: '国土空间规划 / 城市更新',
  F2b: '全域土地综合整治',
  F3: '工程勘察',
  F4: '工程设计',
  F4b: '专项设计',
  F5: '造价咨询',
  F5b: '六张网新基建',
  F6: '全过程工程咨询',
  S1: '室内设计',
  S3: '园林景观',
  S4: '私宅自建',
  S5: '导视标识',
  S6: '软装陈设',
  S7: '艺术照明',
  S8: '声学装修',
  bidding: '招标代理服务',
  supervision: '工程监理',
  management: '建设管理'
};

const STAGE_COLORS = {
  F1: '#708198',
  'F1.4': '#708198',
  F2: '#2E7D32',
  F2b: '#2E7D32',
  F3: '#EF6C00',
  F4: '#102744',
  F4b: '#E91E63',
  F5: '#6A1B9A',
  F5b: '#FF9800',
  F6: '#3f51b5',
  S1: '#102744',
  S3: '#2E7D32',
  S4: '#8E5A2B',
  S5: '#007AFF',
  S6: '#C05A8A',
  S7: '#FF9800',
  S8: '#5E6AD2',
  bidding: '#4a148c',
  supervision: '#00695c',
  management: '#bf360c'
};

let _itemIdCounter = 0;

/**
 * 生成唯一 ID
 */
function generateId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

/**
 * 生成子项 ID（使用递增计数器 + 时间戳）
 */
function generateItemId() {
  if (_itemIdCounter === 0) {
    // 初始化计数器：从项目和旧版历史中找到最大 ID，避免结果页按 id 读取时撞车
    const projects = loadProjects();
    let maxId = 0;
    projects.forEach(p => {
      (p.stages || []).forEach(s => {
        (s.items || []).forEach(item => {
          if (item.id > maxId) maxId = item.id;
        });
      });
    });
    try {
      const history = wx.getStorageSync(HISTORY_KEY) || [];
      history.forEach(record => {
        if (record.id > maxId) maxId = record.id;
      });
    } catch (e) { /* silent */ }
    _itemIdCounter = maxId;
  }
  return ++_itemIdCounter;
}

function toFiniteAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

/**
 * 加载所有项目
 */
function loadProjects() {
  try {
    const data = wx.getStorageSync(STORAGE_KEY);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

/**
 * 保存所有项目
 */
function saveProjects(projects) {
  try {
    wx.setStorageSync(STORAGE_KEY, projects);
    // Background sync to cloud if registered
    const account = require('./cloud-account.js');
    if (account.isLoggedIn()) {
      account.syncProjectsToCloud(projects).catch(err => {
        console.error('Background sync projects to cloud failed:', err);
      });
    }
    return true;
  } catch (e) {
    console.error('保存项目失败:', e);
    return false;
  }
}

/**
 * 创建新项目
 */
function createProject({ name, description, location, totalInvestment }) {
  const projects = loadProjects();
  const now = new Date().toISOString();

  const project = {
    id: generateId(),
    name: name || '未命名项目',
    description: description || '',
    location: location || '',
    totalInvestment: totalInvestment || 0,
    createdAt: now,
    updatedAt: now,
    stages: []
  };

  projects.unshift(project);
  saveProjects(projects);
  return project;
}

/**
 * 更新项目信息
 */
function updateProject(projectId, updates) {
  const projects = loadProjects();
  const idx = projects.findIndex(p => p.id === projectId);
  if (idx === -1) return null;

  Object.assign(projects[idx], updates, { updatedAt: new Date().toISOString() });
  saveProjects(projects);
  return projects[idx];
}

/**
 * 同步更新历史记录中的项目名称
 */
function updateHistoryProjectName(projectId, projectName) {
  if (!projectId || !projectName) return false;
  try {
    const history = wx.getStorageSync(HISTORY_KEY) || [];
    let changed = false;
    history.forEach(record => {
      if (record.projectId === projectId) {
        record.projectName = projectName;
        changed = true;
      }
    });
    if (changed) wx.setStorageSync(HISTORY_KEY, history);
    return changed;
  } catch (e) {
    console.error('同步历史项目名称失败:', e);
    return false;
  }
}

/**
 * 删除项目
 */
function deleteProject(projectId) {
  const projects = loadProjects();
  const filtered = projects.filter(p => p.id !== projectId);
  saveProjects(filtered);
  return filtered;
}

/**
 * 获取单个项目
 */
function getProject(projectId) {
  const projects = loadProjects();
  return projects.find(p => p.id === projectId) || null;
}

/**
 * 获取或创建项目中的某个阶段
 */
function getOrCreateStage(projectId, stageCode) {
  const projects = loadProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) return null;

  let stage = project.stages.find(s => s.id === stageCode);
  if (!stage) {
    stage = {
      id: stageCode,
      name: STAGE_NAMES[stageCode] || stageCode,
      items: []
    };
    project.stages.push(stage);
  }
  saveProjects(projects);
  return stage;
}

/**
 * 向项目添加计算子项
 */
function addCalcItem(projectId, stageCode, calcResult, itemName) {
  const projects = loadProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) return null;

  let stage = project.stages.find(s => s.id === stageCode);
  if (!stage) {
    stage = {
      id: stageCode,
      name: STAGE_NAMES[stageCode] || stageCode,
      items: []
    };
    project.stages.push(stage);
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

  const item = {
    id: generateItemId(),
    name: itemName || dateStr,
    stage: stageCode,
    calcResult: calcResult,
    createdAt: dateStr
  };

  stage.items.unshift(item);
  project.updatedAt = new Date().toISOString();
  saveProjects(projects);

  return item;
}

/**
 * 添加待报价子项：用于模板预设专业，后续点击进入计算器补全报价。
 */
function addDraftCalcItem(projectId, stageCode, draft) {
  const projects = loadProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) return null;

  let stage = project.stages.find(s => s.id === stageCode);
  if (!stage) {
    stage = {
      id: stageCode,
      name: STAGE_NAMES[stageCode] || stageCode,
      items: []
    };
    project.stages.push(stage);
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  const item = {
    id: generateItemId(),
    name: draft.name || '待报价',
    stage: stageCode,
    specialty: draft.specialty || '',
    quoteStage: draft.quoteStage || stageCode,
    quoteSpecialty: draft.quoteSpecialty || draft.specialty || '',
    quoteStatus: 'pending',
    calcResult: null,
    templateData: draft.templateData || {},
    createdAt: dateStr
  };

  stage.items.push(item);
  project.updatedAt = new Date().toISOString();
  saveProjects(projects);
  return item;
}

/**
 * 更新待报价子项为正式计算结果。
 */
function updateCalcItemResult(projectId, itemId, calcResult, itemName) {
  const projects = loadProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) return null;

  let targetItem = null;
  (project.stages || []).some(stage => {
    const item = (stage.items || []).find(i => i.id === itemId);
    if (item) {
      targetItem = item;
      item.name = itemName || item.name;
      item.calcResult = calcResult;
      item.quoteStatus = 'done';
      item.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  });

  if (!targetItem) return null;
  project.updatedAt = new Date().toISOString();
  saveProjects(projects);
  return targetItem;
}

function findProjectItem(projectId, itemId) {
  const project = getProject(projectId);
  if (!project) return null;

  let result = null;
  (project.stages || []).some(stage => {
    const item = (stage.items || []).find(i => i.id === itemId);
    if (item) {
      result = { project, stage, item };
      return true;
    }
    return false;
  });
  return result;
}

/**
 * 兼容：同步到旧版 history 存储
 */
function syncToLegacyHistory(project, stage, item) {
  try {
    let history = wx.getStorageSync(HISTORY_KEY) || [];
    const record = {
      id: item.id,
      name: item.createdAt,
      stage: item.stage,
      stageName: STAGE_NAMES[item.stage] || item.stage,
      meta: item.createdAt,
      amount: `${item.calcResult.total.toFixed(2)}万`,
      color: STAGE_COLORS[item.stage] || '#102744',
      projectId: project.id,
      projectName: project.name,
      calcDetail: item.calcResult,
      docs: []
    };
    history.unshift(record);
    wx.setStorageSync(HISTORY_KEY, history);
  } catch (e) {
    // 静默失败，不影响主流程
  }
}

/**
 * 删除子项
 */
function removeCalcItem(projectId, stageCode, itemId) {
  const projects = loadProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) return false;

  const stage = project.stages.find(s => s.id === stageCode);
  if (!stage) return false;

  stage.items = stage.items.filter(item => item.id !== itemId);
  project.updatedAt = new Date().toISOString();

  // 如果阶段为空，删除阶段
  if (stage.items.length === 0) {
    project.stages = project.stages.filter(s => s.id !== stageCode);
  }

  saveProjects(projects);

  // 同步删除旧版记录
  try {
    let history = wx.getStorageSync(HISTORY_KEY) || [];
    history = history.filter(h => h.id !== itemId);
    wx.setStorageSync(HISTORY_KEY, history);
  } catch (e) { /* silent */ }

  return true;
}

/**
 * 计算项目总费用（所有子项费用之和）
 */
function calculateProjectTotal(projectId) {
  const project = getProject(projectId);
  if (!project) return { total: 0, breakdown: [] };

  const breakdown = [];
  let grandTotal = 0;

  (project.stages || []).forEach(stage => {
    let stageTotal = 0;
    (stage.items || []).forEach(item => {
      const amount = toFiniteAmount(item.calcResult && item.calcResult.total);
      stageTotal += amount;
      breakdown.push({
        stageId: stage.id,
        stageName: stage.name,
        itemId: item.id,
        itemName: item.name,
        amount: parseFloat(amount.toFixed(2))
      });
    });
    grandTotal += stageTotal;
  });

  return {
    total: parseFloat(grandTotal.toFixed(2)),
    breakdown
  };
}

/**
 * 统计项目概览
 */
function getProjectSummary(project) {
  const p = project || {};
  const stages = p.stages || [];
  const totalItems = stages.reduce((sum, s) => sum + (s.items || []).length, 0);
  const { total } = calculateProjectTotal(p.id);

  return {
    id: p.id,
    name: p.name,
    location: p.location || '',
    totalInvestment: p.totalInvestment || 0,
    stageCount: stages.length,
    itemCount: totalItems,
    totalFee: total,
    updatedAt: p.updatedAt || p.createdAt || ''
  };
}

/**
 * 获取所有项目摘要列表
 */
function getProjectList() {
  const projects = loadProjects();
  return projects.map(p => getProjectSummary(p));
}

/**
 * 迁移旧版 history 数据到新项目模型
 * 将旧记录按项目名分组，自动创建项目
 */
function migrateLegacyData() {
  try {
    const history = wx.getStorageSync(HISTORY_KEY) || [];
    if (history.length === 0) return { migrated: 0 };

    const projects = loadProjects();
    if (projects.length > 0) return { migrated: 0, skipped: true }; // 已有项目，不重复迁移

    // 按项目名分组（提取 "·" 前的项目名）
    const projectGroups = {};
    history.forEach(record => {
      const parts = record.name.split(' · ');
      const projectName = parts[0] || record.name;
      if (!projectGroups[projectName]) {
        projectGroups[projectName] = [];
      }
      projectGroups[projectName].push(record);
    });

    const migratedProjects = [];
    Object.entries(projectGroups).forEach(([projectName, records]) => {
      const now = new Date().toISOString();
      const project = {
        id: generateId(),
        name: projectName,
        description: '',
        location: '',
        totalInvestment: records[0].calcDetail ? records[0].calcDetail.cost : 0,
        createdAt: now,
        updatedAt: now,
        stages: []
      };

      records.forEach(record => {
        const stageCode = record.stage || 'F4';
        let stage = project.stages.find(s => s.id === stageCode);
        if (!stage) {
          stage = {
            id: stageCode,
            name: STAGE_NAMES[stageCode] || stageCode,
            items: []
          };
          project.stages.push(stage);
        }

        const itemName = record.name.split(' · ')[1] || record.name;
        stage.items.push({
          id: record.id,
          name: itemName,
          stage: stageCode,
          calcResult: record.calcDetail || {},
          createdAt: record.meta || ''
        });
      });

      migratedProjects.push(project);
    });

    saveProjects(migratedProjects);
    return { migrated: migratedProjects.length, projects: migratedProjects };
  } catch (e) {
    console.error('迁移失败:', e);
    return { migrated: 0, error: e.message };
  }
}

module.exports = {
  STAGE_NAMES,
  STAGE_COLORS,
  loadProjects,
  saveProjects,
  createProject,
  updateProject,
  updateHistoryProjectName,
  deleteProject,
  getProject,
  getOrCreateStage,
  addCalcItem,
  addDraftCalcItem,
  updateCalcItemResult,
  findProjectItem,
  removeCalcItem,
  calculateProjectTotal,
  getProjectSummary,
  getProjectList,
  migrateLegacyData,
  generateId
};
