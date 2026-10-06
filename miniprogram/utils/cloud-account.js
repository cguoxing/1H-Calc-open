/**
 * 云端账户工具
 *
 * 封装与 userAccount 云函数的交互及本地缓存。
 * 设计原则：云环境未配置（cloudReady=false）时，所有写云端操作降级为本地缓存，
 * 不阻断流程；页面层据此展示引导。
 *
 * 本地缓存键：yicalc_cloud_account
 *   {
 *     openid: string,
 *     name: string,
 *     phone: string,
 *     company: string,
 *     position: string,
 *     email: string,
 *     registeredAt: string,
 *     cachedAt: string
 *   }
 */

const STORAGE_KEY = 'yicalc_cloud_account';

function getSafeApp() {
  try {
    return typeof getApp === 'function' ? getApp() : null;
  } catch (e) {
    return null;
  }
}

function getSafePages() {
  try {
    return typeof getCurrentPages === 'function' ? getCurrentPages() : [];
  } catch (e) {
    return [];
  }
}

function hasWxApi(name) {
  return typeof wx !== 'undefined' && typeof wx[name] === 'function';
}

function hasCloudApi() {
  return typeof wx !== 'undefined' && wx.cloud && typeof wx.cloud.callFunction === 'function';
}

/**
 * 读取本地缓存的账户
 */
function getLocalAccount() {
  try {
    if (!hasWxApi('getStorageSync')) return null;
    return wx.getStorageSync(STORAGE_KEY) || null;
  } catch (e) {
    return null;
  }
}

/**
 * 写入本地缓存并同步到 globalData
 */
function setLocalAccount(account) {
  try {
    if (hasWxApi('setStorageSync')) {
      wx.setStorageSync(STORAGE_KEY, account);
    }
  } catch (e) {
    /* 静默失败 */
  }
  const app = getSafeApp();
  if (app && app.globalData) {
    app.globalData.cloudAccount = account || null;
  }
  return account;
}

/**
 * 清除本地缓存账户
 */
function clearLocalAccount() {
  try {
    if (hasWxApi('removeStorageSync')) {
      wx.removeStorageSync(STORAGE_KEY);
    }
  } catch (e) {
    /* 静默失败 */
  }
  const app = getSafeApp();
  if (app && app.globalData) {
    app.globalData.cloudAccount = null;
  }
}

/**
 * 是否已登录（云环境已配置 且 本地有 openid）
 */
function isLoggedIn() {
  const app = getSafeApp();
  const cloudReady = app && app.globalData && app.globalData.cloudReady;
  const account = getLocalAccount();
  return !!(cloudReady && account && account.openid);
}

/**
 * 仅本地有账户（不要求云环境，用于展示上次注册信息）
 */
function hasLocalAccount() {
  const account = getLocalAccount();
  return !!(account && account.openid);
}

/**
 * 调用云函数：注册 / 更新账户
 * @param {Object} profile { name, phone, company, position, email }
 * @returns {Promise<Object>} { success, openid, action }
 */
function registerAccount(profile) {
  const app = getSafeApp();
  const cloudReady = app && app.globalData && app.globalData.cloudReady;

  return new Promise((resolve, reject) => {
    if (!cloudReady || !hasCloudApi()) {
      reject(new Error('云环境未配置'));
      return;
    }

    // 获取本地缓存的项目数据以在注册时同步到云端
    let localProjects = [];
    try {
      localProjects = hasWxApi('getStorageSync') ? wx.getStorageSync('yicalc_projects') || [] : [];
    } catch (e) {
      /* 静默失败 */
    }

    const regData = Object.assign({}, profile, { projects: localProjects });

    wx.cloud.callFunction({
      name: 'userAccount',
      data: { action: 'register', data: regData },
      success(res) {
        const result = res && res.result;
        if (result && result.success) {
          // 缓存完整账户
          setLocalAccount({
            openid: result.openid,
            name: profile.name,
            phone: profile.phone,
            company: profile.company,
            position: profile.position,
            email: profile.email,
            registeredAt: new Date().toISOString(),
            privacyAgreedAt: profile.privacyAgreedAt || new Date().toISOString(),
            cachedAt: new Date().toISOString()
          });
          resolve(result);
        } else {
          reject(new Error((result && result.error) || '注册失败'));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '云函数调用失败'));
      }
    });
  });
}

/**
 * 调用云函数：获取当前用户云端档案（用于他设备登录恢复）
 * @returns {Promise<Object>} { success, registered, profile }
 */
function fetchCloudProfile() {
  const app = getSafeApp();
  const cloudReady = app && app.globalData && app.globalData.cloudReady;

  return new Promise((resolve, reject) => {
    if (!cloudReady || !hasCloudApi()) {
      reject(new Error('云环境未配置'));
      return;
    }
    wx.cloud.callFunction({
      name: 'userAccount',
      data: { action: 'getProfile' },
      success(res) {
        const result = res && res.result;
        if (result && result.success) {
          if (result.registered && result.profile) {
            setLocalAccount(Object.assign({}, result.profile, {
              cachedAt: new Date().toISOString()
            }));
            // 同步项目到本地缓存
            if (result.profile.projects) {
              try {
                if (hasWxApi('setStorageSync')) {
                  wx.setStorageSync('yicalc_projects', result.profile.projects);
                }
              } catch (e) {
                console.error('保存云端项目到本地失败:', e);
              }
            }
          }
          resolve(result);
        } else {
          reject(new Error((result && result.error) || '查询失败'));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '云函数调用失败'));
      }
    });
  });
}

/**
 * 调用云函数：判断当前 OpenID 是否已注册
 * @returns {Promise<Object>} { success, exists }
 */
function checkRegistered() {
  const app = getSafeApp();
  const cloudReady = app && app.globalData && app.globalData.cloudReady;

  return new Promise((resolve, reject) => {
    if (!cloudReady || !hasCloudApi()) {
      reject(new Error('云环境未配置'));
      return;
    }
    wx.cloud.callFunction({
      name: 'userAccount',
      data: { action: 'exists' },
      success(res) {
        const result = res && res.result;
        if (result && result.success) {
          resolve(result);
        } else {
          reject(new Error((result && result.error) || '查询失败'));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '云函数调用失败'));
      }
    });
  });
}

// ─────────────────────────────────────────────
// 校验工具
// ─────────────────────────────────────────────

/**
 * 校验手机号（中国大陆 11 位）
 */
function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || '').trim());
}

/**
 * 校验邮箱
 */
function isValidEmail(email) {
  const v = String(email || '').trim();
  if (!v) return true; // 选填，空值合法
  return /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(v);
}

/**
 * OpenID 脱敏：保留前 4 + 后 4
 */
function maskOpenid(openid) {
  if (!openid) return '';
  const s = String(openid);
  if (s.length <= 8) return s;
  return s.slice(0, 4) + '****' + s.slice(-4);
}

/**
 * 强制要求用户完成注册
 * 如果未注册，重定向到注册页面
 */
function enforceRegistration() {
  const currentPages = getSafePages();
  if (currentPages.length > 0) {
    const currentPage = currentPages[currentPages.length - 1];
    if (currentPage && currentPage.route === 'pages/register/register') {
      return;
    }
  }

  // 检查本地缓存
  if (hasLocalAccount()) {
    return;
  }

  const app = getSafeApp();
  const cloudReady = app && app.globalData && app.globalData.cloudReady;

  if (cloudReady) {
    if (hasWxApi('showLoading')) {
      wx.showLoading({ title: '检查账户...', mask: true });
    }
    checkRegistered()
      .then(res => {
        if (hasWxApi('hideLoading')) {
          wx.hideLoading();
        }
        if (res.exists) {
          // 云端存在，拉取并保存到本地
          fetchCloudProfile()
            .then(() => {
              const pages = getSafePages();
              if (pages.length > 0) {
                const activePage = pages[pages.length - 1];
                if (activePage && typeof activePage.onShow === 'function') {
                  activePage.onShow();
                }
              }
            })
            .catch(() => {
              if (hasWxApi('navigateTo')) {
                wx.navigateTo({ url: '/pages/register/register' });
              }
            });
        } else {
          // 云端不存在，强制跳转到注册页
          if (hasWxApi('navigateTo')) {
            wx.navigateTo({ url: '/pages/register/register' });
          }
        }
      })
      .catch(() => {
        if (hasWxApi('hideLoading')) {
          wx.hideLoading();
        }
        if (hasWxApi('navigateTo')) {
          wx.navigateTo({ url: '/pages/register/register' });
        }
      });
  } else {
    // 云开发未就绪，且本地无账户，强制跳转注册
    if (hasWxApi('navigateTo')) {
      wx.navigateTo({ url: '/pages/register/register' });
    }
  }
}

/**
 * 同步项目数据到云端
 * @param {Array} projects 
 */
function syncProjectsToCloud(projects) {
  const app = getSafeApp();
  const cloudReady = app && app.globalData && app.globalData.cloudReady;

  return new Promise((resolve, reject) => {
    if (!cloudReady || !hasCloudApi()) {
      reject(new Error('云环境未配置'));
      return;
    }
    wx.cloud.callFunction({
      name: 'userAccount',
      data: { action: 'syncProjects', data: projects },
      success(res) {
        const result = res && res.result;
        if (result && result.success) {
          resolve(result);
        } else {
          reject(new Error((result && result.error) || '同步项目失败'));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '云函数调用失败'));
      }
    });
  });
}

module.exports = {
  STORAGE_KEY,
  getLocalAccount,
  setLocalAccount,
  clearLocalAccount,
  isLoggedIn,
  hasLocalAccount,
  registerAccount,
  fetchCloudProfile,
  checkRegistered,
  isValidPhone,
  isValidEmail,
  maskOpenid,
  enforceRegistration,
  syncProjectsToCloud
};
