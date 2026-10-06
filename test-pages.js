const path = require('path');
const fs = require('fs');

console.log('=== 开始全面测试微信小程序界面与逻辑代码 ===\n');

// 1. 初始化 Mock 微信环境
const storage = {
  yicalc_cloud_account: {
    openid: 'test_openid',
    name: '测试用户',
    phone: '13800138000'
  }
};
const navigationHistory = [];
const toastLog = [];

global.wx = {
  getStorageSync: (key) => {
    return storage[key];
  },
  setStorageSync: (key, val) => {
    storage[key] = val;
  },
  navigateTo: (obj) => {
    navigationHistory.push({ type: 'navigateTo', url: obj.url });
  },
  switchTab: (obj) => {
    navigationHistory.push({ type: 'switchTab', url: obj.url });
  },
  reLaunch: (obj) => {
    navigationHistory.push({ type: 'reLaunch', url: obj.url });
  },
  showToast: (obj) => {
    toastLog.push(obj.title);
  },
  showModal: (obj) => {
    if (obj.success) obj.success({ confirm: true });
  },
  setNavigationBarColor: (obj) => {},
  showLoading: (obj) => {},
  hideLoading: () => {}
};

const mockAppInstance = {
  globalData: {
    historyKey: 'yicalc_history',
    targetStage: '',
    targetSpecialty: '',
    targetCost: '',
    fromSmart: false,
    activeProjectId: 0,
    unit: '万元',
    precision: 2
  },
  getMockHistory: () => [
    { id: 1, name: '项目一', stage: 'F4', total: 100, color: '#007AFF' }
  ]
};

global.getApp = () => mockAppInstance;
global.getCurrentPages = () => [{ route: 'pages/index/index' }];

let lastRegisteredConfig = null;
global.Page = (config) => {
  lastRegisteredConfig = config;
};

// 辅助函数：实例化已注册的页面
function instantiatePage(filePath) {
  lastRegisteredConfig = null;
  // 清除 Node.js 缓存以重新加载页面
  const resolvedPath = require.resolve(filePath);
  delete require.cache[resolvedPath];
  
  require(filePath);
  
  const config = lastRegisteredConfig;
  if (!config) {
    throw new Error(`无法加载页面: ${filePath} (未调用 Page Constructor)`);
  }
  
  const page = {
    data: { ...config.data },
    getTabBar() {
      return {
        refreshEdition() {},
        setData() {}
      };
    },
    setData(newData, callback) {
      const setDeep = (obj, path, value) => {
        const cleanPath = path.replace(/\[(\w+)\]/g, '.$1');
        const parts = cleanPath.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!(part in current)) {
            current[part] = {};
          }
          current = current[part];
        }
        current[parts[parts.length - 1]] = value;
      };
      for (let key in newData) {
        setDeep(this.data, key, newData[key]);
      }
      if (callback) callback();
    }
  };
  
  // 复制方法并绑定到实例
  for (let key in config) {
    if (typeof config[key] === 'function') {
      page[key] = config[key].bind(page);
    }
  }
  
  return page;
}

// ================= TEST CASE 1: 首页 (index.js) =================
console.log('[测试页面 1: 首页 (pages/index/index.js)]');
try {
  const indexPage = instantiatePage('./miniprogram/pages/index/index.js');
  console.log('✅ 首页控制器初始化成功');

  storage.yicalc_app_edition = 'interior';
  indexPage.onShow();
  if (indexPage.data.stageHeaderTitle === '专项设计' && indexPage.data.stagesList.length === 7) {
    console.log('✅ 首页 onShow 按室内版本刷新成功');
  } else {
    console.log('❌ 首页 onShow 版本刷新失败:', indexPage.data.stageHeaderTitle, indexPage.data.stagesList.length);
  }
  storage.yicalc_app_edition = 'all';
  indexPage.onShow();
  if (indexPage.data.stageHeaderTitle === '工程阶段' && indexPage.data.stagesList.length === 6) {
    console.log('✅ 首页 onShow 按全能版本刷新成功');
  } else {
    console.log('❌ 首页 onShow 全能版本刷新失败:', indexPage.data.stageHeaderTitle, indexPage.data.stagesList.length);
  }
  
  // 测试点击 F1 前期决策卡片
  navigationHistory.length = 0;
  indexPage.setData({ activeStage: 'F1' });
  indexPage.onSelectSpecialty({ currentTarget: { dataset: { specialty: 'project_proposal' } } });
  
  if (navigationHistory.length > 0 && navigationHistory[0].url === '/pages/pre-consult/pre-consult') {
    console.log('✅ 前期决策 (F1) specialty 路由跳转测试成功 (预期: /pages/pre-consult/pre-consult)');
  } else {
    console.log('❌ 前期决策路由跳转测试失败:', navigationHistory);
  }
  
  // 测试点击 F4 设计卡片
  navigationHistory.length = 0;
  indexPage.setData({ activeStage: 'F4' });
  indexPage.onSelectSpecialty({ currentTarget: { dataset: { specialty: 'building' } } });
  
  if (navigationHistory.length > 0 && navigationHistory[0].url === '/pages/calc/calc' && mockAppInstance.globalData.targetStage === 'F4') {
    console.log('✅ 通用计算 (F4) tab 切换路由跳转测试成功 (预期: /pages/calc/calc)');
  } else {
    console.log('❌ 通用计算路由跳转测试失败:', navigationHistory);
  }
} catch (e) {
  console.error('❌ 首页测试运行出错:', e);
}
console.log('');

// ================= TEST CASE 2: 前期决策计算器 (pre-consult.js) =================
console.log('[测试页面 2: 前期决策计算器 (pages/pre-consult/pre-consult.js)]');
try {
  const prePage = instantiatePage('./miniprogram/pages/pre-consult/pre-consult.js');
  console.log('✅ 前期决策计算器初始化成功');
  
  // 模拟输入 1.2 亿元 (12000万元) 可研报告编制
  prePage.onLoad({ specialty: 'feasibility_study' });
  prePage.onCostInput({ detail: { value: '12000' } });
  prePage.onIndustryChange({ detail: { value: '2' } }); // 1.0 (建筑/市政)
  prePage.onComplexityChange({ detail: { value: '2' } }); // 1.0 (II级)
  
  // 模拟计算
  navigationHistory.length = 0;
  prePage.onCalculate();
  
  const history = storage['yicalc_history'] || [];
  if (history.length > 0) {
    const record = history[0];
    console.log(`✅ 计算成功，历史记录已保存。`);
    console.log(`   计算项: ${record.name}`);
    console.log(`   估算总价: ${record.amount}`);
    if (navigationHistory.length > 0 && navigationHistory[0].url.startsWith('/pages/result/result')) {
      console.log('   ✅ 成功路由至结果页:', navigationHistory[0].url);
    } else {
      console.log('   ❌ 路由至结果页失败');
    }
  } else {
    console.log('❌ 计算失败，无历史记录');
  }
} catch (e) {
  console.error('❌ 前期决策测试运行出错:', e);
}
console.log('');

// ================= TEST CASE 3: 招标代理计算器 (bidding.js) =================
console.log('[测试页面 3: 招标代理计算器 (pages/bidding/bidding.js)]');
try {
  const bidPage = instantiatePage('./miniprogram/pages/bidding/bidding.js');
  console.log('✅ 招标代理计算器初始化成功');
  
  // 模拟工程招标，5000万元中标额
  bidPage.onLoad({ specialty: 'eng' });
  bidPage.onCostInput({ detail: { value: '5000' } });
  bidPage.onRatioChange({ detail: { value: '2' } }); // 100%
  bidPage.onTaxRateChange({ detail: { value: '0' } }); // 0% (不计税)
  
  // 模拟计算
  navigationHistory.length = 0;
  bidPage.onCalculate();
  
  const history = storage['yicalc_history'] || [];
  if (history.length > 0) {
    const record = history[0];
    console.log(`✅ 招标代理计算成功，已存入缓存。`);
    console.log(`   项目名: ${record.name}`);
    console.log(`   折后合计费用: ${record.amount} (预期: 20.55万)`);
    if (record.calcDetail.total === 20.55) {
      console.log('   ✅ 费率累进准确无误');
    } else {
      console.log('   ❌ 费用计算有偏差:', record.calcDetail.total);
    }
  } else {
    console.log('❌ 招标代理计算失败，无缓存记录');
  }
} catch (e) {
  console.error('❌ 招标代理测试运行出错:', e);
}
console.log('');

// ================= TEST CASE 4: 单位换算器 (converter.js) =================
console.log('[测试页面 4: 单位换算器 (pages/converter/converter.js)]');
try {
  const convPage = instantiatePage('./miniprogram/pages/converter/converter.js');
  console.log('✅ 单位换算器初始化成功');
  
  // 模拟加载
  convPage.onLoad();
  
  // 模拟切换到长度
  convPage.onCategoryChange({ currentTarget: { dataset: { cat: 'length' } } });
  // 模拟选择输入单位为“米” (index 3)
  convPage.onInputUnitChange({ detail: { value: '3' } });
  console.log(`✅ 切换类别: ${convPage.data.currentCategory} (当前输入值: ${convPage.data.inputValue})`);
  
  // 模拟输入 "10" 米
  convPage.onValueInput({ detail: { value: '10' } });
  
  // 验证换算是否更新
  const kmItem = convPage.data.results.find(u => u.symbol === 'km');
  if (kmItem) {
    console.log(`✅ 长度换算成功: 10 m = ${kmItem.value} km`);
  } else {
    console.log('❌ 长度换算错误 (未找到千米单位)');
  }
} catch (e) {
  console.error('❌ 单位换算测试运行出错:', e);
}
console.log('');

// ================= TEST CASE 5: 专项设计与工程设计 F4 新专业验证 =================
console.log('[测试页面 5: 专项设计与 F4 室内设计专业验证]');
try {
  // 1. 验证 S4 私宅自建设计（含室内设计）计算
  const specPage = instantiatePage('./miniprogram/pages/specialty-design/specialty-design.js');
  console.log('✅ 专项设计计算器初始化成功');
  
  // 模拟选择 S4 (私宅自建) tab (index 2)
  specPage.onTabChange({ detail: { value: '2' } });
  if (specPage.data.activeTab === 'S4' && specPage.data.tabIndex === 2) {
    console.log('   ✅ 成功选择 S4 私宅自建类型');
  } else {
    console.log('   ❌ 选择 S4 私宅自建类型失败:', specPage.data.activeTab);
  }
  
  // 模拟输入建筑面积与勾选一体化装修
  specPage.onS4AreaInput({ detail: { value: '200' } }); // 200 m²
  specPage.toggleS4Deco(); // 启用装修设计
  
  navigationHistory.length = 0;
  specPage.onCalculate();
  
  const history = storage['yicalc_history'] || [];
  if (history.length > 0) {
    const record = history[0];
    console.log(`   ✅ S4 私宅自建设计计算成功，费用: ${record.amount}`);
  } else {
    console.log('   ❌ S4 私宅自建设计计算失败');
  }

  // 2. 验证 F4 工程设计“室内装饰工程设计”专业和 1.0 默认专业系数
  const calcPage = instantiatePage('./miniprogram/pages/calc/calc.js');
  console.log('✅ F4 工程设计控制器初始化成功');
  
  // 模拟选择“建筑市政工程设计”大类下的“室内装饰工程设计”专业调整系数子项
  const buildingMunicipalIndex = calcPage.data.specialties.findIndex(item => item.value === 'building_municipal');
  calcPage.setData({
    specialtyIndex: buildingMunicipalIndex,
    specialtyCoefIndex: 1,
    selectedSpecialtyValue: 'interior_deco',
    specialtyCoefVal: 1.0,
    specialtyCoefText: '1（室内装饰工程设计）'
  });
  if (calcPage.data.selectedSpecialtyValue === 'interior_deco') {
    console.log('   ✅ 成功选择“室内装饰工程设计”专业');
  } else {
    console.log('   ❌ 选择“室内装饰工程设计”专业失败');
  }

  // 输入 5000 万计费额，复杂程度 II (1.0)，无其他附加系数，不计税
  calcPage.onCostInput({ detail: { value: '5000' } });
  calcPage.onTaxRateInput({ detail: { value: '0' } }); // 0%
  
  navigationHistory.length = 0;
  calcPage.onCalculate();
  
  const f4History = storage['yicalc_history'] || [];
  if (f4History.length > 0) {
    const record = f4History[0];
    console.log(`   ✅ F4 室内设计专业计算成功，基本服务费: ${record.calcDetail.basicFee}万 (基价: ${record.calcDetail.basePrice}万, 专业系数: ${record.calcDetail.specialtyCoef})`);
    if (record.calcDetail.specialtyCoef === 1.0) {
      console.log('   ✅ F4 室内设计专业调整系数 1.0 应用成功！');
    } else {
      console.log('   ❌ F4 室内设计专业调整系数应用错误:', record.calcDetail.specialtyCoef);
    }
  } else {
    console.log('   ❌ F4 室内设计专业计算失败');
  }
} catch (e) {
  console.error('❌ 专项设计与 F4 室内设计测试出错:', e);
}
console.log('');

// ================= TEST CASE 6: 工具箱版本工具完整性 =================
console.log('[测试页面 6: 工具箱版本工具完整性]');
try {
  storage.yicalc_app_edition = 'interior';
  const toolsPage = instantiatePage('./miniprogram/pages/tools/tools.js');
  toolsPage.onLoad();

  const hasCompareInInterior = toolsPage.data.allTools.some(tool => tool.id === 'compare' && tool.url === '/pages/compare/compare');
  if (hasCompareInInterior) {
    console.log('✅ 旗舰版工具箱保留“方案比选”入口');
  } else {
    console.log('❌ 旗舰版工具箱缺少“方案比选”入口');
    process.exit(1);
  }

  toolsPage.setData({ searchText: '方案比选', activeCategory: 'all' });
  toolsPage.applyFilter();
  const searchFindsCompare = toolsPage.data.filteredTools.some(tool => tool.id === 'compare');
  if (searchFindsCompare) {
    console.log('✅ 旗舰版工具箱可搜索到“方案比选”');
  } else {
    console.log('❌ 旗舰版工具箱搜索不到“方案比选”');
    process.exit(1);
  }
} catch (e) {
  console.error('❌ 工具箱版本工具完整性测试出错:', e);
  process.exit(1);
} finally {
  storage.yicalc_app_edition = 'all';
}
console.log('');

console.log('=== 所有界面与页面逻辑测试验证完毕 ===');
