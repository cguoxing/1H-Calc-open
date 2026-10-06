// 云函数：生成 PDF
// 基于计算结果生成 PDF 报价单
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { calcResult, projectName, template } = event;

  if (!calcResult) {
    return { success: false, error: '缺少计算结果' };
  }

  // PDF 生成逻辑（基于 html-pdf 或 puppeteer）
  // 微信云开发环境限制，实际部署时需使用第三方 PDF 服务
  // 此处返回结构化数据，由前端 pdf-generator.js 完成客户端 PDF 生成

  const pdfData = {
    title: projectName || '工程设计费报价单',
    date: new Date().toISOString().split('T')[0],
    template: template || 'default',
    sections: [
      {
        title: '项目信息',
        items: [
          { label: '项目名称', value: projectName || '—' },
          { label: '计费阶段', value: calcResult.stageName || '—' },
          { label: '计算日期', value: new Date().toLocaleDateString('zh-CN') }
        ]
      },
      {
        title: '费用明细',
        items: [
          { label: '工程计费额', value: (calcResult.cost || 0) + ' 万元' },
          { label: '工程设计基价', value: (calcResult.basePrice || 0) + ' 万元' },
          { label: '专业调整系数', value: (calcResult.specialtyCoef || 1.0) + '（' + (calcResult.specialtyName || '—') + '）' },
          { label: '复杂程度系数', value: (calcResult.complexityCoef || 1.0) + '（' + (calcResult.complexityName || '—') + '）' },
          { label: '附加调整系数', value: calcResult.netAdditionalCoef || 1.0 },
          { label: '总收费比例', value: (calcResult.discount || 100) + '%' }
        ]
      },
      {
        title: '合计',
        items: [
          { label: '设计费合计', value: (calcResult.total || 0) + ' 万元' }
        ]
      }
    ]
  };

  return { success: true, pdfData };
};
