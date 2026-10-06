const fs = require('fs');
const path = require('path');
const { generatePDF } = require('./miniprogram/utils/pdf-generator.js');

const mockRecord = {
  id: '12345',
  name: '室内装修设计报价',
  stage: 'F4',
  basis: '计价格[2002]10号',
  calcDetail: {
    total: 188.485,
    cost: 5000.0,
    basePrice: 163.9,
    specialtyCoef: 1.15,
    specialtyName: '室内装饰工程设计',
    complexityCoef: 1.0,
    complexityName: 'II级',
    netAdditionalCoef: 1.0,
    discount: 100,
    taxRate: 6,
    tax: 10.669,
    extraDetails: []
  }
};

generatePDF(mockRecord, '测试住宅项目')
  .then(buffer => {
    console.log('=== 开始 PDF 自动化格式校验 ===');
    
    // Check type
    if (!(buffer instanceof ArrayBuffer)) {
      throw new Error('测试失败: 返回值不是 ArrayBuffer');
    }
    console.log('✅ 返回类型为 ArrayBuffer');

    // Convert to String to check contents
    const view = new Uint8Array(buffer);
    let pdfString = '';
    for (let i = 0; i < view.length; i++) {
      pdfString += String.fromCharCode(view[i]);
    }

    // Check PDF header
    if (!pdfString.startsWith('%PDF-1.4')) {
      throw new Error('测试失败: PDF 头格式不正确');
    }
    console.log('✅ PDF 头部 %PDF-1.4 校验通过');

    // Check PDF footer
    if (!pdfString.trim().endsWith('%%EOF')) {
      throw new Error('测试失败: PDF 尾部缺少 %%EOF');
    }
    console.log('✅ PDF 尾部 %%EOF 校验通过');

    // Check essential objects
    const checks = [
      { name: 'Catalog', query: '/Type /Catalog' },
      { name: 'Pages', query: '/Type /Pages' },
      { name: 'Page', query: '/Type /Page' },
      { name: 'Font F1 (STSong-Light)', query: '/BaseFont /STSong-Light' },
      { name: 'Font F2 (Helvetica)', query: '/BaseFont /Helvetica' },
      { name: 'Font F3 (Helvetica-Bold)', query: '/BaseFont /Helvetica-Bold' },
      { name: 'Xref Table', query: 'xref' },
      { name: 'Trailer', query: 'trailer' },
      { name: 'Startxref offset pointer', query: 'startxref' }
    ];

    checks.forEach(c => {
      if (!pdfString.includes(c.query)) {
        throw new Error(`测试失败: 缺少 ${c.name} (${c.query})`);
      }
      console.log(`✅ 结构项 ${c.name} 存在于 PDF 中`);
    });

    const strictObjectChecks = [
      { name: 'Catalog 字典', query: /1 0 obj\s*<<[\s\S]*?\/Type \/Catalog[\s\S]*?>>\s*endobj/ },
      { name: 'Pages 字典', query: /2 0 obj\s*<<[\s\S]*?\/Type \/Pages[\s\S]*?>>\s*endobj/ },
      { name: 'Font Resources 字典', query: /3 0 obj\s*<<[\s\S]*?\/Font <<[\s\S]*?>>\s*>>\s*endobj/ },
      { name: 'Page 字典', query: /\d+ 0 obj\s*<<[\s\S]*?\/Type \/Page[\s\S]*?\/Contents \d+ 0 R[\s\S]*?>>\s*endobj/ }
    ];

    strictObjectChecks.forEach(c => {
      if (!c.query.test(pdfString)) {
        throw new Error(`测试失败: ${c.name} 未使用标准 PDF 字典结构 << >>`);
      }
      console.log(`✅ ${c.name} 标准结构校验通过`);
    });

    const startxrefMatch = pdfString.match(/startxref\s+(\d+)/);
    if (!startxrefMatch) {
      throw new Error('测试失败: startxref 指针缺失');
    }
    const xrefOffset = parseInt(startxrefMatch[1], 10);
    const actualXrefOffset = pdfString.indexOf('xref');
    if (xrefOffset !== actualXrefOffset) {
      throw new Error(`测试失败: startxref 偏移错误，声明 ${xrefOffset}，实际 ${actualXrefOffset}`);
    }
    console.log('✅ startxref 字节偏移校验通过');

    // Write to a local test file
    const outputPath = path.join(__dirname, 'test_output.pdf');
    fs.writeFileSync(outputPath, Buffer.from(view));
    console.log(`✅ 已成功输出测试 PDF 文件: ${outputPath}`);
    
    console.log('\n🎉 所有 PDF 格式和结构自动化校验全部通过！');
  })
  .catch(err => {
    console.error('❌ PDF 测试运行失败:', err);
    process.exit(1);
  });
