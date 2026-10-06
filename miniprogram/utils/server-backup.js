const config = require('./server-backup-config.js');
const { APP_VERSION } = require('./app-version.js');

const META_KEY = 'yicalc_server_backup_meta';
const CLIENT_ID_KEY = 'yicalc_backup_client_id';
const STORAGE_KEYS = [
  'yicalc_cloud_account',
  'yicalc_user_profile',
  'yicalc_projects',
  'yicalc_history',
  'yicalc_calc_drafts',
  'yicalc_app_edition',
  'yicalc_usage_count'
];
let inFlightBackup = null;

function hasWxApi(name) {
  return typeof wx !== 'undefined' && typeof wx[name] === 'function';
}

function isConfigured() {
  return !!(config && config.enabled && config.apiUrl);
}

// 仅对已注册且同意隐私政策的用户开启备份（先同意、再收集）。
// registeredAt 视为旧版本已同意的凭证：旧版注册流程强制勾选隐私政策。
function hasPrivacyConsent() {
  const account = readStorage('yicalc_cloud_account', null);
  return !!(account && (account.privacyAgreedAt || account.registeredAt));
}

function getLoginCode() {
  return new Promise((resolve, reject) => {
    if (!hasWxApi('login')) {
      reject(new Error('当前环境不支持 wx.login'));
      return;
    }
    wx.login({
      success(res) {
        if (res && res.code) {
          resolve(res.code);
        } else {
          reject(new Error('wx.login 未返回 code'));
        }
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || 'wx.login 失败'));
      }
    });
  });
}

function apiUrlForAction(action) {
  const url = String(config.apiUrl || '');
  if (url.indexOf('action=') !== -1) {
    return url.replace(/([?&]action=)[^&]*/, '$1' + encodeURIComponent(action));
  }
  return url + (url.indexOf('?') === -1 ? '?' : '&') + 'action=' + encodeURIComponent(action);
}

function readStorage(key, fallback) {
  try {
    if (!hasWxApi('getStorageSync')) return fallback;
    const value = wx.getStorageSync(key);
    return value === undefined || value === '' ? fallback : value;
  } catch (e) {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    if (hasWxApi('setStorageSync')) {
      wx.setStorageSync(key, value);
    }
  } catch (e) {
    /* ignore local meta failures */
  }
}

function getMeta() {
  return readStorage(META_KEY, {}) || {};
}

function setMeta(meta) {
  writeStorage(META_KEY, meta);
}

function createClientId() {
  const random = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
  return `${Date.now().toString(36)}${random}`;
}

function getClientId() {
  let clientId = readStorage(CLIENT_ID_KEY, '');
  if (!clientId) {
    clientId = createClientId();
    writeStorage(CLIENT_ID_KEY, clientId);
  }
  return clientId;
}

function getDeviceId() {
  const prefix = config.deviceId || 'default';
  return `${prefix}_${getClientId()}`;
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}';
}

function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function maskText(value, head, tail) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= head + tail) return text;
  return text.slice(0, head) + '****' + text.slice(-tail);
}

function buildProfileSummary(profile) {
  const source = profile || {};
  return {
    name: source.name || '',
    phone: maskText(source.phone, 3, 4),
    company: source.company || '',
    openid: maskText(source.openid, 4, 4)
  };
}

function buildDataSummary(data) {
  const projects = Array.isArray(data.yicalc_projects) ? data.yicalc_projects : [];
  const history = Array.isArray(data.yicalc_history) ? data.yicalc_history : [];
  const drafts = data.yicalc_calc_drafts && typeof data.yicalc_calc_drafts === 'object' ? data.yicalc_calc_drafts : {};
  return {
    projectCount: projects.length,
    historyCount: history.length,
    draftCount: Object.keys(drafts).length,
    appEdition: data.yicalc_app_edition || 'all',
    usageCount: data.yicalc_usage_count || 0
  };
}

function buildPayload() {
  const data = {};
  STORAGE_KEYS.forEach(key => {
    data[key] = readStorage(key, null);
  });
  const profile = data.yicalc_cloud_account || data.yicalc_user_profile || null;
  const summary = buildDataSummary(data);
  const clientTime = new Date().toISOString();

  const payload = {
    app: 'yicalc',
    version: APP_VERSION,
    deviceId: getDeviceId(),
    deviceLabel: config.deviceId || 'default',
    clientId: getClientId(),
    exportedAt: clientTime,
    clientTime,
    profile,
    profileSummary: buildProfileSummary(profile),
    summary,
    projects: data.yicalc_projects || [],
    history: data.yicalc_history || [],
    drafts: data.yicalc_calc_drafts || {},
    settings: {
      appEdition: data.yicalc_app_edition || 'all',
      usageCount: data.yicalc_usage_count || 0
    }
  };

  const fingerprint = hashString(stableStringify({
    profile: payload.profile,
    projects: payload.projects,
    history: payload.history,
    drafts: payload.drafts,
    settings: payload.settings
  }));
  payload.fingerprint = fingerprint;

  return { payload, fingerprint };
}

// 只在数据变化时上传；数据未变时按心跳间隔（默认 24 小时）确认一次
function shouldAutoBackup(fingerprint, now) {
  const meta = getMeta();
  if (!meta.lastSuccessAt || meta.lastFingerprint !== fingerprint) return true;
  const heartbeat = Number(config.heartbeatMs) || 24 * 60 * 60 * 1000;
  return now - Number(meta.lastSuccessAt || 0) >= heartbeat;
}

function requestBackup(payload) {
  if (!hasWxApi('request')) {
    return Promise.reject(new Error('当前环境不支持网络请求'));
  }
  return getLoginCode().then(code => sendBackup(payload, code));
}

function sendBackup(payload, code) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrlForAction('backup'),
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'X-Yicalc-Code': code
      },
      data: payload,
      timeout: 10000,
      success(res) {
        const body = res && res.data;
        if (res.statusCode >= 200 && res.statusCode < 300 && body && body.success) {
          resolve(body);
        } else {
          const message = body && body.error ? body.error : `备份接口返回异常(${res.statusCode})`;
          reject(new Error(message));
        }
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || '备份请求失败'));
      }
    });
  });
}

function backupNow(options) {
  const opts = options || {};
  return new Promise((resolve, reject) => {
    if (!isConfigured()) {
      reject(new Error('备份服务器未配置'));
      return;
    }
    if (!hasPrivacyConsent()) {
      reject(new Error('用户尚未注册并同意隐私政策，不进行备份'));
      return;
    }

    const now = Date.now();
    const meta = getMeta();
    meta.lastAttemptAt = now;
    meta.lastAttemptTime = new Date(now).toISOString();
    setMeta(meta);

    const built = buildPayload();
    if (!opts.force && !shouldAutoBackup(built.fingerprint, now)) {
      resolve({ skipped: true, reason: '数据未变化或距离上次备份太近' });
      return;
    }

    if (!opts.force && inFlightBackup) {
      inFlightBackup.then(resolve).catch(reject);
      return;
    }

    const request = requestBackup(built.payload);
    if (!opts.force) {
      inFlightBackup = request;
    }

    request
      .then(result => {
        if (inFlightBackup === request) {
          inFlightBackup = null;
        }
        const successMeta = {
          lastAttemptAt: now,
          lastAttemptTime: new Date(now).toISOString(),
          lastSuccessAt: now,
          lastSuccessTime: new Date(now).toISOString(),
          lastFingerprint: built.fingerprint,
          lastResult: result
        };
        setMeta(successMeta);
        resolve(Object.assign({ skipped: false }, result, successMeta));
      })
      .catch(err => {
        if (inFlightBackup === request) {
          inFlightBackup = null;
        }
        const errorMeta = getMeta();
        errorMeta.lastErrorAt = now;
        errorMeta.lastErrorTime = new Date(now).toISOString();
        errorMeta.lastError = err.message;
        setMeta(errorMeta);
        reject(err);
      });
  });
}

// 删除当前微信用户在服务器上的全部备份（用户注销 / 撤回同意时调用）
function deleteRemoteBackup() {
  if (!isConfigured()) return Promise.resolve({ success: true, removed: 0, skipped: true });
  if (!hasWxApi('request')) return Promise.reject(new Error('当前环境不支持网络请求'));
  return getLoginCode().then(code => new Promise((resolve, reject) => {
    wx.request({
      url: apiUrlForAction('delete'),
      method: 'POST',
      header: { 'Content-Type': 'application/json', 'X-Yicalc-Code': code },
      data: {},
      timeout: 10000,
      success(res) {
        const body = res && res.data;
        if (res.statusCode >= 200 && res.statusCode < 300 && body && body.success) {
          writeStorage(META_KEY, {});
          resolve(body);
        } else {
          reject(new Error((body && body.error) || `删除接口返回异常(${res.statusCode})`));
        }
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || '删除请求失败'));
      }
    });
  }));
}

function autoBackupSilently() {
  if (!isConfigured()) return Promise.resolve({ skipped: true, reason: '未配置' });
  if (!hasPrivacyConsent()) return Promise.resolve({ skipped: true, reason: '未同意隐私政策' });
  return backupNow({ force: false }).catch(err => ({ skipped: true, error: err.message }));
}

function autoBackupOnLaunch() {
  return autoBackupSilently();
}

module.exports = {
  META_KEY,
  CLIENT_ID_KEY,
  isConfigured,
  hasPrivacyConsent,
  getMeta,
  buildPayload,
  shouldAutoBackup,
  backupNow,
  deleteRemoteBackup,
  autoBackupSilently,
  autoBackupOnLaunch
};
