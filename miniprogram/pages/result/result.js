const { onGoHome } = require("../../utils/goHome");
const app = getApp();
const { generatePDF } = require('../../utils/pdf-generator.js');
const { createProject, addCalcItem, updateProject, updateHistoryProjectName, findProjectItem } = require('../../utils/project-manager.js');

const ALL_EDITION_SAVE_CATEGORIES = [
  { value: 'F1', label: '前期投资决策' },
  { value: 'F2', label: '国土空间规划 / 城市更新' },
  { value: 'F3', label: '工程勘察' },
  { value: 'F4', label: '工程设计' },
  { value: 'F5', label: '造价咨询' },
  { value: 'F6', label: '全过程工程咨询' }
];

const INTERIOR_EDITION_SAVE_CATEGORIES = [
  { value: 'S1', label: '室内设计' },
  { value: 'S3', label: '园林景观' },
  { value: 'S4', label: '私宅自建' },
  { value: 'S5', label: '导视标识' },
  { value: 'S6', label: '软装陈设' },
  { value: 'S7', label: '艺术照明' },
  { value: 'S8', label: '声学装修' }
];

Page({
  onGoHome,
  data: {
    record: null,
    pdfImagePath: '',
    showSaveModal: false,
    showNameModal: false,
    editingProjectName: '',
    selectedSaveStage: 'F4',
    saveStageCategories: ALL_EDITION_SAVE_CATEGORIES,
    canCreateNew: true
  },

  getAppEdition: function () {
    return wx.getStorageSync('yicalc_app_edition') || (app.globalData && app.globalData.appEdition) || 'all';
  },

  getRecordEdition: function () {
    const record = this.data.record || {};
    if (record.appEdition) return record.appEdition;
    if (record.edition) return record.edition;
    return record.stage === 'F4b' ? 'interior' : 'all';
  },

  getSaveStageCategories: function () {
    return this.getRecordEdition() === 'interior' ? INTERIOR_EDITION_SAVE_CATEGORIES : ALL_EDITION_SAVE_CATEGORIES;
  },

  getDefaultSaveStage: function (stage) {
    if (this.getRecordEdition() === 'interior') {
      const calcDetail = (this.data.record && this.data.record.calcDetail) || {};
      const specialty = calcDetail.specialty || calcDetail.specialtyId || calcDetail.stageType || '';
      const interiorMap = {
        S1: 'S1',
        S3: 'S3',
        S4: 'S4',
        S5: 'S5',
        S6: 'S6',
        S7: 'S7',
        S8: 'S8'
      };
      return interiorMap[specialty] || (stage === 'F4b' ? 'S1' : 'S1');
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

  onLoad: function (options) {
    const id = parseInt(options.id);
    if (isNaN(id)) {
      wx.showToast({
        title: '记录加载错误',
        icon: 'none'
      });
      return;
    }

    const history = wx.getStorageSync(app.globalData.historyKey) || [];
    const record = history.find(h => h.id === id);

    if (!record) {
      wx.showToast({
        title: '未找到该计算记录',
        icon: 'none'
      });
      return;
    }

    this.setData({
      record: record
    });

    if (record.color) {
      wx.setNavigationBarColor({
        frontColor: '#000000',
        backgroundColor: '#F2F2F7',
        animation: {
          duration: 300,
          curve: 'easeIn'
        }
      });
    }
  },

  // 保存到项目
  onSaveToProject: function () {
    const categories = this.getSaveStageCategories();
    const defaultStage = this.getDefaultSaveStage(this.data.record && this.data.record.stage);
    this.setData({
      showSaveModal: true,
      selectedSaveStage: categories.some(item => item.value === defaultStage) ? defaultStage : categories[0].value,
      saveStageCategories: categories,
      canCreateNew: true
    });
  },

  closeSaveModal: function () {
    this.setData({ showSaveModal: false });
  },

  onPreventDefault: function () {},

  getRecordProjectName: function (record) {
    if (!record) return '';
    if (record.projectName) return record.projectName;
    const name = record.name || '';
    if (name.includes(' · ')) return name.split(' · ')[0];
    return name || '未命名项目';
  },

  onEditProjectName: function () {
    this.setData({
      showNameModal: true,
      editingProjectName: this.getRecordProjectName(this.data.record)
    });
  },

  closeNameModal: function () {
    this.setData({ showNameModal: false });
  },

  onProjectNameInput: function (e) {
    this.setData({ editingProjectName: e.detail.value });
  },

  onConfirmProjectName: function () {
    const record = this.data.record;
    const name = (this.data.editingProjectName || '').trim();
    if (!record || !name) {
      wx.showToast({ title: '请输入项目名称', icon: 'none' });
      return;
    }

    if (record.projectId) {
      updateProject(record.projectId, { name });
      updateHistoryProjectName(record.projectId, name);
    }

    const history = wx.getStorageSync(app.globalData.historyKey) || [];
    const idx = history.findIndex(h => h.id === record.id);
    if (idx !== -1) {
      history[idx].projectName = name;
      wx.setStorageSync(app.globalData.historyKey, history);
    }

    this.setData({
      showNameModal: false,
      record: Object.assign({}, record, { projectName: name })
    });
    wx.showToast({ title: '已修改', icon: 'success' });
  },

  onSelectSaveStage: function (e) {
    const stage = e.currentTarget.dataset.stage;
    this.setData({ selectedSaveStage: stage });
  },

  onConfirmSaveToProject: function () {
    const record = this.data.record;
    if (!record) return;

    let targetProjectId = record.projectId || this.data.selectedProjectId || 0;

    // 弹窗不再展示项目列表：无所属项目时自动创建新项目，避免误归入其他项目。
    if (!targetProjectId) {
      const project = createProject({
        name: record.projectName || record.name || '未命名项目',
        description: '',
        location: '',
        totalInvestment: record.calcDetail ? record.calcDetail.cost : 0
      });
      targetProjectId = project.id;
    }

    // 添加计算子项到项目，按首页大类归档
    const itemName = record.name || '计算子项';
    const saveStage = this.data.selectedSaveStage || this.getDefaultSaveStage(record.stage);
    const existingItem = record.projectItemId ? findProjectItem(targetProjectId, record.projectItemId) : null;
    if (record.projectId === targetProjectId && record.projectStage === saveStage && existingItem) {
      this.setData({ showSaveModal: false });
      wx.showToast({ title: '已保存到项目', icon: 'success' });
      return;
    }
    const savedItem = addCalcItem(targetProjectId, saveStage, record.calcDetail, itemName);

    // 更新记录的项目关联
    const history = wx.getStorageSync(app.globalData.historyKey) || [];
    const idx = history.findIndex(h => h.id === record.id);
    if (idx !== -1) {
      history[idx].projectId = targetProjectId;
      history[idx].projectStage = saveStage;
      history[idx].projectItemId = savedItem ? savedItem.id : 0;
      wx.setStorageSync(app.globalData.historyKey, history);
    }

    this.setData({
      showSaveModal: false,
      record: Object.assign({}, record, {
        projectId: targetProjectId,
        projectStage: saveStage,
        projectItemId: savedItem ? savedItem.id : 0
      })
    });

    wx.showToast({ title: '已保存到项目', icon: 'success' });
  },

  // 查看所属项目
  onViewProject: function () {
    const projectId = this.data.record.projectId;
    if (!projectId) return;
    wx.navigateTo({
      url: `/pages/project-detail/project-detail?id=${projectId}`
    });
  },

  onExportPDF: function () {
    const record = this.data.record;
    if (!record) return;

    wx.showLoading({
      title: '正在生成计算书...',
      mask: true
    });

    generatePDF(record, '')
      .then((arrayBuffer) => {
        const fs = wx.getFileSystemManager();
        const fileName = `${record.name || '计算书'}_报价单.pdf`;
        // Filter special characters to prevent invalid filenames
        const safeFileName = fileName.replace(/[\\\/:\*\?"<>\|]/g, '_').slice(0, 80);
        const filePath = `${wx.env.USER_DATA_PATH}/${safeFileName}`;

        fs.writeFile({
          filePath: filePath,
          data: arrayBuffer,
          success: () => {
            fs.readFile({
              filePath,
              success: (readRes) => {
                const bytes = readRes.data ? readRes.data.byteLength : 0;
                if (bytes < 1000) {
                  wx.hideLoading();
                  wx.showModal({
                    title: '生成失败',
                    content: 'PDF 文件写入不完整，请重试。',
                    showCancel: false
                  });
                  return;
                }

                wx.hideLoading();

                // Update storage record
                const history = wx.getStorageSync(app.globalData.historyKey) || [];
                const idx = history.findIndex(h => h.id === record.id);
                if (idx !== -1) {
                  history[idx].isExported = true;
                  wx.setStorageSync(app.globalData.historyKey, history);
                }

                // Update local state
                this.setData({
                  'record.isExported': true
                });

                wx.openDocument({
                  filePath: filePath,
                  fileType: 'pdf',
                  showMenu: true,
                  success: () => {},
                  fail: (err) => {
                    console.error('打开 PDF 失败:', err);
                    wx.showModal({
                      title: '预览失败',
                      content: 'PDF 已生成，但微信预览打开失败。请稍后重试或在真机环境打开。',
                      showCancel: false
                    });
                  }
                });
              },
              fail: (err) => {
                wx.hideLoading();
                console.error('读取 PDF 文件失败:', err);
                wx.showModal({
                  title: '生成失败',
                  content: 'PDF 文件校验失败：' + (err.errMsg || ''),
                  showCancel: false
                });
              }
            });
          },
          fail: (err) => {
            wx.hideLoading();
            console.error('写入 PDF 文件失败:', err);
            wx.showModal({
              title: '保存失败',
              content: '计算书文件保存失败：' + (err.errMsg || ''),
              showCancel: false
            });
          }
        });
      })
      .catch((err) => {
        wx.hideLoading();
        console.error('PDF 生成失败:', err);
        wx.showModal({
          title: '生成失败',
          content: '计算书生成失败，请重试。' + (err.message || ''),
          showCancel: false,
          confirmText: '确定'
        });
      });
  },

  onBack: function () {
    wx.navigateBack();
  },

  // 微信分享
  onShareAppMessage: function () {
    const record = this.data.record;
    if (!record) {
      return {
        title: '易计算 - 工程设计收费报价系统',
        path: '/pages/index/index'
      };
    }

    const stageNames = {
      F1: '前期决策', F2: '空间规划', F3: '工程勘察',
      F4: '工程设计', F5: '造价咨询', F6: '全过程咨询',
      F4b: '专项设计', 'F1.4': '单项咨询', F1_4: '单项咨询', F2b: '土地整治', F5b: '六张网设计',
      bidding: '招标代理', supervision: '工程监理', management: '建设管理'
    };
    const stageLabel = stageNames[record.stage] || '工程取费';

    return {
      title: `${record.name} · ${stageLabel}费 ¥${record.calcDetail.total}万`,
      path: `/pages/result/result?id=${record.id}`,
      imageUrl: record.pdfImagePath || ''
    };
  }
});
