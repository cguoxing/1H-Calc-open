// 云函数：用户账户管理
// 按 openid 唯一存储用户档案（注册 / 查询 / 判断是否已注册）
// 数据库集合：users
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const COLLECTION = 'users';

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { action, data } = event;

  if (!openid) {
    return { success: false, error: '无法获取用户 OpenID' };
  }

  const collection = db.collection(COLLECTION);

  switch (action) {
    // 注册 / 更新档案（按 openid upsert）
    case 'register': {
      const profile = data || {};
      const now = new Date();

      try {
        const existing = await collection.where({ _openid: openid }).limit(1).get();
        if (existing.data && existing.data.length > 0) {
          const docId = existing.data[0]._id;
          // 已存在：更新档案
          const updateData = {
            name: profile.name || '',
            phone: profile.phone || '',
            company: profile.company || '',
            position: profile.position || '',
            email: profile.email || '',
            updatedAt: now
          };
          if (profile.projects !== undefined) {
            updateData.projects = profile.projects;
          }
          await collection.doc(docId).update({
            data: updateData
          });
          return { success: true, openid, action: 'update' };
        }

        // 不存在：新增
        const record = {
          _openid: openid,
          name: profile.name || '',
          phone: profile.phone || '',
          company: profile.company || '',
          position: profile.position || '',
          email: profile.email || '',
          projects: profile.projects || [],
          registeredAt: now,
          updatedAt: now
        };
        const res = await collection.add({ data: record });
        return { success: true, openid, id: res._id, action: 'create' };
      } catch (err) {
        return { success: false, error: '注册失败：' + (err.errMsg || err.message) };
      }
    }

    // 查询当前用户档案（用于他设备登录恢复）
    case 'getProfile': {
      try {
        const res = await collection.where({ _openid: openid }).limit(1).get();
        if (res.data && res.data.length > 0) {
          const u = res.data[0];
          return {
            success: true,
            registered: true,
            profile: {
              openid,
              name: u.name,
              phone: u.phone,
              company: u.company,
              position: u.position,
              email: u.email,
              projects: u.projects || [],
              registeredAt: u.registeredAt
            }
          };
        }
        return { success: true, registered: false };
      } catch (err) {
        return { success: false, error: '查询失败：' + (err.errMsg || err.message) };
      }
    }

    // 判断是否已注册
    case 'exists': {
      try {
        const res = await collection.where({ _openid: openid }).count();
        return { success: true, exists: res.total > 0 };
      } catch (err) {
        return { success: false, error: '查询失败：' + (err.errMsg || err.message) };
      }
    }

    // 同步项目
    case 'syncProjects': {
      const projects = data || [];
      try {
        const existing = await collection.where({ _openid: openid }).limit(1).get();
        if (existing.data && existing.data.length > 0) {
          const docId = existing.data[0]._id;
          await collection.doc(docId).update({
            data: {
              projects: projects,
              updatedAt: new Date()
            }
          });
          return { success: true };
        } else {
          return { success: false, error: '用户未注册' };
        }
      } catch (err) {
        return { success: false, error: '同步项目失败：' + (err.errMsg || err.message) };
      }
    }

    // 注销：清除云端档案及该用户的全部计算记录
    case 'unregister': {
      try {
        await collection.where({ _openid: openid }).remove();
        await db.collection('calc_history').where({ _openid: openid }).remove();
        return { success: true };
      } catch (err) {
        return { success: false, error: '注销失败：' + (err.errMsg || err.message) };
      }
    }

    default:
      return { success: false, error: 'Unknown action: ' + action };
  }
};
