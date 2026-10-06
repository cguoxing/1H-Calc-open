const STORAGE_KEY = 'yicalc_calc_drafts';

function getDrafts() {
  try {
    const data = wx.getStorageSync(STORAGE_KEY);
    return data && typeof data === 'object' ? data : {};
  } catch (e) {
    return {};
  }
}

function setDrafts(drafts) {
  try {
    wx.setStorageSync(STORAGE_KEY, drafts);
    return true;
  } catch (e) {
    console.error('保存计算草稿失败:', e);
    return false;
  }
}

function getContextKey(pageKey, context) {
  const projectId = context && context.projectId ? context.projectId : 'standalone';
  const itemId = context && context.itemId ? context.itemId : 'new';
  const stage = context && context.stage ? context.stage : 'default';
  const specialty = context && context.specialty ? context.specialty : 'default';
  return `${pageKey}:${projectId}:${itemId}:${stage}:${specialty}`;
}

function saveDraft(pageKey, context, formData) {
  const key = getContextKey(pageKey, context);
  const drafts = getDrafts();
  drafts[key] = {
    pageKey,
    context: context || {},
    formData: formData || {},
    updatedAt: new Date().toISOString()
  };
  return setDrafts(drafts);
}

function getDraft(pageKey, context) {
  const drafts = getDrafts();
  return drafts[getContextKey(pageKey, context)] || null;
}

function clearDraft(pageKey, context) {
  const drafts = getDrafts();
  const key = getContextKey(pageKey, context);
  if (!drafts[key]) return true;
  delete drafts[key];
  return setDrafts(drafts);
}

module.exports = {
  getContextKey,
  saveDraft,
  getDraft,
  clearDraft
};
