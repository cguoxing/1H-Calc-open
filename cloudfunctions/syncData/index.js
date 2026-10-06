// 云函数：数据同步
// 同步用户历史记录到云数据库
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { action, data } = event;

  const collection = db.collection('calc_history');

  switch (action) {
    case 'upload': {
      // 上传计算记录
      const record = {
        ...data,
        _openid: wxContext.OPENID,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const res = await collection.add({ data: record });
      return { success: true, id: res._id };
    }

    case 'download': {
      // 下载用户的所有计算记录
      const { page = 1, pageSize = 20 } = data || {};
      const res = await collection
        .where({ _openid: wxContext.OPENID })
        .orderBy('createdAt', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get();
      return { success: true, records: res.data };
    }

    case 'delete': {
      // 删除单条记录
      const { recordId } = data;
      if (!recordId) {
        return { success: false, error: '缺少记录 ID' };
      }
      const existing = await collection
        .where({ _id: recordId, _openid: wxContext.OPENID })
        .limit(1)
        .get();
      if (!existing.data || existing.data.length === 0) {
        return { success: false, error: '记录不存在或无权删除' };
      }
      await collection.doc(recordId).remove();
      return { success: true };
    }

    case 'clear': {
      // 清空用户所有记录
      await collection.where({ _openid: wxContext.OPENID }).remove();
      return { success: true };
    }

    default:
      return { success: false, error: 'Unknown action: ' + action };
  }
};
