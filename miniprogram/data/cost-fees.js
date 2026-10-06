// 工程造价咨询收费标准数据
// 依据: 《广东省建设工程造价咨询服务收费项目和收费标准表》（粤价函[2011]742号）

// 差额定率累进费率表 (单位: 万元/费率)
// 限额区间: 0-100万, 100-500万, 500-1000万, 1000-5000万, 5000万-1亿, 1亿以上
const costBrackets = {
  // 1. 投资估算编制/审核
  'estimate': [
    { limit: 100, rate: 0.0013 },
    { limit: 500, rate: 0.0011 },
    { limit: 1000, rate: 0.0009 },
    { limit: 5000, rate: 0.0007 },
    { limit: 10000, rate: 0.0005 },
    { limit: Infinity, rate: 0.0004 }
  ],
  // 2. 工程概算编制/审核
  'budget_outline': [
    { limit: 100, rate: 0.0020 },
    { limit: 500, rate: 0.0018 },
    { limit: 1000, rate: 0.0016 },
    { limit: 5000, rate: 0.0013 },
    { limit: 10000, rate: 0.0012 },
    { limit: Infinity, rate: 0.0011 }
  ],
  // 3a. 工程量清单编制/审核
  'bill_quantity': [
    { limit: 100, rate: 0.0030 },
    { limit: 500, rate: 0.0025 },
    { limit: 1000, rate: 0.0024 },
    { limit: 5000, rate: 0.0022 },
    { limit: 10000, rate: 0.0020 },
    { limit: Infinity, rate: 0.0018 }
  ],
  // 3b. 预算编制/审核(清单)
  'budget_bill': [
    { limit: 100, rate: 0.0018 },
    { limit: 500, rate: 0.0016 },
    { limit: 1000, rate: 0.0014 },
    { limit: 5000, rate: 0.0012 },
    { limit: 10000, rate: 0.0009 },
    { limit: Infinity, rate: 0.0008 }
  ],
  // 3c. 预算编制/审核(定额)
  'budget_quota': [
    { limit: 100, rate: 0.0035 },
    { limit: 500, rate: 0.0030 },
    { limit: 1000, rate: 0.0028 },
    { limit: 5000, rate: 0.0027 },
    { limit: 10000, rate: 0.0024 },
    { limit: Infinity, rate: 0.0020 }
  ],
  // 4. 工程结算编制
  'settlement_prep': [
    { limit: 100, rate: 0.0045 },
    { limit: 500, rate: 0.0040 },
    { limit: 1000, rate: 0.0035 },
    { limit: 5000, rate: 0.0033 },
    { limit: 10000, rate: 0.0030 },
    { limit: Infinity, rate: 0.0025 }
  ],
  // 6. 全过程造价控制
  'whole_process': [
    { limit: 100, rate: 0.0120 },
    { limit: 500, rate: 0.0110 },
    { limit: 1000, rate: 0.0100 },
    { limit: 5000, rate: 0.0090 },
    { limit: 10000, rate: 0.0080 },
    { limit: Infinity, rate: 0.007 } // 7‰ = 0.007
  ],
  // 7. 工程造价纠纷鉴证
  'dispute_appraisal': [
    { limit: 100, rate: 0.0120 },
    { limit: 500, rate: 0.0100 },
    { limit: 1000, rate: 0.0080 },
    { limit: 5000, rate: 0.0070 },
    { limit: 10000, rate: 0.0060 },
    { limit: Infinity, rate: 0.005 } // 5‰ = 0.005
  ]
};

// 5. 工程结算审核特殊收费率 (粤价函[2011]742号：2.8‰基本费率 + 5%效益费率)
const settlementAuditFees = {
  basicRate: 0.0028, // 2.8‰ 基本费率
  benefitRate: 0.05  // 5% 核减效益费率
};

// 8. 钢筋及预埋件计算费率 (12元/吨)
const steelCalcRate = 12.0; // 元/吨

module.exports = {
  costBrackets,
  settlementAuditFees,
  steelCalcRate
};
