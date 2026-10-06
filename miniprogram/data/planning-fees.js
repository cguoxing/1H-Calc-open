// 前期工作咨询收费标准 (单位: 万元)
// 依据: 计价格[1999]1283号
const planningFees = {
  // 项目建议书
  'project_proposal': [
    { value: 3000, price: 6 },
    { value: 10000, price: 14 },
    { value: 50000, price: 37 },
    { value: 100000, price: 55 },
    { value: 500000, price: 100 },
    { value: 5000000, price: 125 }
  ],
  // 评估项目建议书
  'project_proposal_eval': [
    { value: 3000, price: 4 },
    { value: 10000, price: 8 },
    { value: 50000, price: 22 },
    { value: 100000, price: 35 },
    { value: 500000, price: 65 },
    { value: 5000000, price: 80 }
  ],
  // 可行性研究报告
  'feasibility_study': [
    { value: 3000, price: 12 },
    { value: 10000, price: 28 },
    { value: 50000, price: 75 },
    { value: 100000, price: 110 },
    { value: 500000, price: 200 },
    { value: 5000000, price: 250 }
  ],
  // 评估可行性研究报告
  'feasibility_study_eval': [
    { value: 3000, price: 8 },
    { value: 10000, price: 15 },
    { value: 50000, price: 45 },
    { value: 100000, price: 68 },
    { value: 500000, price: 115 },
    { value: 5000000, price: 140 }
  ],
  // 项目申请报告
  'project_application': [
    { value: 3000, price: 7 },
    { value: 10000, price: 16 },
    { value: 50000, price: 40 },
    { value: 100000, price: 60 },
    { value: 500000, price: 110 },
    { value: 5000000, price: 140 }
  ],
  // 资金申请报告
  'funding_application': [
    { value: 3000, price: 5 },
    { value: 10000, price: 10 },
    { value: 50000, price: 24 },
    { value: 100000, price: 35 },
    { value: 500000, price: 70 },
    { value: 5000000, price: 85 }
  ],
  // 预可行性研究报告
  'pre_feasibility': [
    { value: 3000, price: 10 },
    { value: 10000, price: 20 },
    { value: 50000, price: 60 },
    { value: 100000, price: 85 },
    { value: 500000, price: 150 },
    { value: 5000000, price: 200 }
  ]
};

module.exports = {
  planningFees
};
