/**
 * pdf-generator.js — 「易计算」真实 PDF 计算书/报价单生成器
 * 纯 JS 在客户端构建标准 PDF-1.4 格式二进制文件，支持中文字体与多页布局
 * 排版参考：工程设计收费报价清单模板
 *
 * @module pdf-generator
 * @version 3.0.0
 */

const { PDF_LOGO_IMAGE, PDF_SEARCH_IMAGE } = require('./pdf-template-assets.js');

// ─── 常量 ────────────────────────────────────────────
const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN_L = 50;
const MARGIN_R = 50;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const TOP_Y = 50;
const BOTTOM_Y = 792; // 页脚区域起点
const TEMPLATE_L = 72;
const TEMPLATE_R = 72;
const TEMPLATE_W = PAGE_W - TEMPLATE_L - TEMPLATE_R;

const STAGE_NAMES = {
  F1: '前期投资决策（谋划）',
  F2: '国土空间规划 / 城市更新',
  F3: '工程勘察',
  F4: '工程设计',
  F4b: '专项设计',
  F5: '造价咨询',
  F6: '全过程工程咨询',
  bidding: '招标代理服务',
  supervision: '工程监理',
  management: '建设管理',
  'F1.4': '单项咨询',
  F1_4: '单项咨询',
  F2b: '土地整治',
  F5b: '六张网设计'
};

const STAGE_COLORS = {
  F1: '#708198', F2: '#2E7D32', F3: '#EF6C00',
  F4: '#102744', F4b: '#00695C', F5: '#6A1B9A',
  F6: '#3f51b5', bidding: '#c62828', supervision: '#1565C0',
  management: '#4E342E', 'F1.4': '#708198', F1_4: '#708198', F2b: '#2E7D32', F5b: '#6A1B9A'
};

// 工程设计收费基价表（计价格[2002]10号 附表一）
const ENGINEERING_BASE_PRICE_TABLE = [
  { value: 200, price: 9.0 }, { value: 500, price: 20.9 },
  { value: 1000, price: 38.8 }, { value: 3000, price: 103.8 },
  { value: 5000, price: 163.9 }, { value: 8000, price: 249.6 },
  { value: 10000, price: 304.8 }, { value: 20000, price: 566.8 },
  { value: 40000, price: 1054.0 }, { value: 60000, price: 1515.2 },
  { value: 80000, price: 1960.1 }, { value: 100000, price: 2393.4 },
  { value: 200000, price: 4450.8 }, { value: 400000, price: 8276.7 },
  { value: 600000, price: 11897.5 }, { value: 800000, price: 15391.4 },
  { value: 1000000, price: 18793.8 }, { value: 2000000, price: 34948.9 }
];

// ─── 工具函数 ────────────────────────────────────────
function hexToPdfRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r = parseInt(hex.substring(0,2),16)/255;
  const g = parseInt(hex.substring(2,4),16)/255;
  const b = parseInt(hex.substring(4,6),16)/255;
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

function fmt(num) {
  if (num === undefined || num === null) return '0.00';
  const n = Number(num);
  // 使用确定性格式化，避免 toLocaleString 在不同设备上的兼容性问题
  const parts = n.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return intPart + '.' + parts[1];
}

function fmtInt(num) {
  if (num === undefined || num === null) return '0';
  const n = Math.round(Number(num));
  // 使用确定性格式化，避免 toLocaleString 在不同设备上的兼容性问题
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}年${m}月${d}日`;
}

function stringToArrayBuffer(str) {
  // 优先使用 TextEncoder（真机标准实现），确保非 ASCII 字符正确编码为二进制
  if (typeof TextEncoder !== 'undefined') {
    const encoder = new TextEncoder();
    // 使用 UTF-8 编码后再解码为 Latin-1 兼容字节，保持 xref offset 正确
    const utf8Bytes = encoder.encode(str);
    // 对于纯 ASCII 的 PDF 内容，UTF-8 编码就是直接的字节映射
    return utf8Bytes.buffer.slice(utf8Bytes.byteOffset, utf8Bytes.byteOffset + utf8Bytes.byteLength);
  }

  // 降级方案：Latin-1 兼容的逐字节转换
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      // 2-byte UTF-8
      bytes.push(0xC0 | (code >> 6));
      bytes.push(0x80 | (code & 0x3F));
    } else if (code < 0xD800 || code >= 0xE000) {
      // 3-byte UTF-8 (BMP)
      bytes.push(0xE0 | (code >> 12));
      bytes.push(0x80 | ((code >> 6) & 0x3F));
      bytes.push(0x80 | (code & 0x3F));
    } else {
      // Surrogate pair → 4-byte UTF-8
      i++;
      if (i < str.length) {
        const code2 = str.charCodeAt(i);
        const cp = 0x10000 + ((code - 0xD800) << 10) + (code2 - 0xDC00);
        bytes.push(0xF0 | (cp >> 18));
        bytes.push(0x80 | ((cp >> 12) & 0x3F));
        bytes.push(0x80 | ((cp >> 6) & 0x3F));
        bytes.push(0x80 | (cp & 0x3F));
      }
    }
  }
  const buf = new ArrayBuffer(bytes.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bufView[i] = bytes[i];
  return buf;
}

// 数字转中文大写
function toChineseUpper(num) {
  if (num === undefined || num === null || num === 0) return '零元整';
  const digits = '零壹贰叁肆伍陆柒捌玖';
  const units = ['', '拾', '佰', '仟', '万', '拾', '佰', '仟', '亿', '拾', '佰', '仟', '万'];
  const radices = ['', '拾', '佰', '仟'];
  let result = '';
  let n = Math.round(num * 100); // 精确到分
  if (n === 0) return '零元整';
  
  const jiao = Math.floor((num * 10) % 10);
  const fen = Math.round((num * 100) % 10);
  
  let strN = String(Math.floor(num));
  let len = strN.length;
  
  for (let i = 0; i < len; i++) {
    const d = parseInt(strN[i]);
    const pos = len - 1 - i;
    if (d === 0) {
      if (pos % 4 !== 0 && i < len - 1 && parseInt(strN[i+1]) !== 0) {
        result += '零';
      }
      if (pos % 4 === 0 && pos > 0) {
        result += units[pos];
      }
    } else {
      result += digits[d] + units[pos];
    }
  }
  result += '元';
  
  if (jiao === 0 && fen === 0) {
    result += '整';
  } else {
    if (jiao > 0) result += digits[jiao] + '角';
    if (fen > 0) result += digits[fen] + '分';
  }
  return result;
}

// ─── PDFDocument (底层 PDF-1.4 构建) ──────────────
class PDFDocument {
  constructor() {
    this.objects = [];
  }
  addObject(content) {
    const id = this.objects.length + 1;
    this.objects.push({ id, content });
    return `${id} 0 R`;
  }
  dict(content) {
    const trimmed = String(content || '').trim();
    if (trimmed.startsWith('<<')) return trimmed;
    return `<<\n${trimmed}\n>>`;
  }
  toPdfHexString(str) {
    let hex = '';
    for (let i = 0; i < str.length; i++) {
      hex += str.charCodeAt(i).toString(16).padStart(4,'0').toUpperCase();
    }
    return `<${hex}>`;
  }
  build() {
    let pdf = '%PDF-1.4\n';
    const offsets = {};
    this.objects.forEach(obj => {
      offsets[obj.id] = utf8ByteLength(pdf);
      pdf += `${obj.id} 0 obj\n${obj.content}\nendobj\n`;
    });
    const startxref = utf8ByteLength(pdf);
    pdf += 'xref\n';
    pdf += `0 ${this.objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= this.objects.length; i++) {
      pdf += `${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
    }
    pdf += 'trailer\n<<\n';
    pdf += `  /Size ${this.objects.length + 1}\n`;
    pdf += '  /Root 1 0 R\n>>\n';
    pdf += 'startxref\n';
    pdf += `${startxref}\n%%EOF\n`;
    return pdf;
  }
}

function utf8ByteLength(str) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  }
  let len = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) len += 1;
    else if (code < 0x800) len += 2;
    else if (code < 0xD800 || code >= 0xE000) len += 3;
    else {
      len += 4;
      i++;
    }
  }
  return len;
}

// ─── ContentStream (单页内容流) ───────────────────
class ContentStream {
  constructor(doc) {
    this.doc = doc;
    this.ops = [];
  }
  line(x1, y1, x2, y2, strokeColor = '0 0 0', lineWidth = 1) {
    const py1 = PAGE_H - y1, py2 = PAGE_H - y2;
    this.ops.push('q');
    this.ops.push(`${lineWidth} w`);
    this.ops.push(`${strokeColor} RG`);
    this.ops.push(`${x1.toFixed(1)} ${py1.toFixed(1)} m`);
    this.ops.push(`${x2.toFixed(1)} ${py2.toFixed(1)} l`);
    this.ops.push('S');
    this.ops.push('Q');
  }
  rect(x, y, w, h, fillColor, strokeColor, lineWidth = 0.5) {
    const py = PAGE_H - y - h;
    this.ops.push('q');
    this.ops.push(`${lineWidth} w`);
    if (strokeColor) this.ops.push(`${strokeColor} RG`);
    if (fillColor) this.ops.push(`${fillColor} rg`);
    this.ops.push(`${x.toFixed(1)} ${py.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re`);
    if (fillColor && strokeColor) this.ops.push('B');
    else if (fillColor) this.ops.push('f');
    else if (strokeColor) this.ops.push('S');
    this.ops.push('Q');
  }
  text(str, x, y, font = '/F1', size = 12, color = '0 0 0') {
    str = String(str === undefined || str === null ? '' : str);
    const hasNonAscii = /[^\x00-\x7F]/.test(str);
    if (hasNonAscii && font !== '/F1') {
      font = '/F1';
    }
    const py = PAGE_H - y;
    this.ops.push('BT');
    this.ops.push(`${color} rg`);
    this.ops.push(`${font} ${size} Tf`);
    this.ops.push(`${x.toFixed(1)} ${py.toFixed(1)} Td`);
    if (font === '/F1') {
      this.ops.push(`${this.doc.toPdfHexString(str)} Tj`);
    } else {
      this.ops.push(`(${str.replace(/[()]/g,'\\$&')}) Tj`);
    }
    this.ops.push('ET');
  }
  textCentered(str, y, font = '/F1', size = 12, color = '0 0 0') {
    let w = 0;
    for (let i = 0; i < str.length; i++) {
      w += size * (str.charCodeAt(i) > 255 ? 1 : 0.55);
    }
    const x = (PAGE_W - w) / 2;
    this.text(str, x, y, font, size, color);
  }
  textRight(str, xRight, y, font = '/F1', size = 12, color = '0 0 0') {
    let w = 0;
    for (let i = 0; i < str.length; i++) {
      w += size * (str.charCodeAt(i) > 255 ? 1 : 0.55);
    }
    this.text(str, xRight - w, y, font, size, color);
  }
  image(name, x, y, w, h) {
    const py = PAGE_H - y - h;
    this.ops.push('q');
    this.ops.push(`${w.toFixed(1)} 0 0 ${h.toFixed(1)} ${x.toFixed(1)} ${py.toFixed(1)} cm`);
    this.ops.push(`/${name} Do`);
    this.ops.push('Q');
  }
  getContent() {
    return this.ops.join('\n');
  }
}

// ─── PageBuilder (管理多页构建) ──────────────────
class PageBuilder {
  constructor(doc) {
    this.doc = doc;
    this.pages = [];
    this.newPage();
  }
  newPage() {
    const cs = new ContentStream(this.doc);
    const page = { stream: cs, y: TOP_Y, pageNum: this.pages.length + 1 };
    this.pages.push(page);
    return page;
  }
  get current() { return this.pages[this.pages.length - 1]; }
  
  // 确保有足够空间，不够则换页。传入 y 以使用调用者的真实位置
  ensureSpace(needed, y) {
    const checkY = (y !== undefined) ? y : this.current.y;
    if (checkY + needed > BOTTOM_Y) {
      this.newPage();
      return true; // 换页了
    }
    return false;
  }
  
  // 在每页底部画页脚
  drawFooters() {
    this.pages.forEach((p, i) => {
      const s = p.stream;
      const pageLabel = `第 ${i + 1} 页`;
      s.line(MARGIN_L, 800, PAGE_W - MARGIN_R, 800, '0.88 0.88 0.88', 0.5);
      s.text(pageLabel, MARGIN_L, 818, '/F1', 7.5, '0.70 0.75 0.80');
      s.text('由「易计算」1Hcalc 生成 · 1+H ARCH', PAGE_W / 2 - 75, 818, '/F1', 7.5, '0.70 0.75 0.80');
      s.text('本计算书仅供报价参考，最终以合同约定为准', MARGIN_L, 832, '/F1', 7, '0.70 0.75 0.80');
    });
  }
}

// ─── 绘制辅助函数 ──────────────────────────────────
function drawTopBar(s, color) {
  s.rect(0, 0, PAGE_W, 6, hexToPdfRgb(color));
}

function drawSectionTitle(s, y, title, color) {
  s.rect(MARGIN_L, y + 2, 4, 14, hexToPdfRgb(color));
  s.text(title, MARGIN_L + 12, y + 14, '/F1', 12, '0.05 0.11 0.21');
}

function drawSeparator(s, y) {
  s.line(MARGIN_L, y, PAGE_W - MARGIN_R, y, '0.88 0.88 0.88', 0.5);
}

function drawLabelValueRow(s, y, label, value, labelW = 170, fontSize = 10, labelColor = '0.35 0.41 0.48', valueColor = '0.05 0.11 0.21') {
  s.text(label, MARGIN_L + 8, y + 12, '/F1', fontSize, labelColor);
  s.text(value, MARGIN_L + labelW, y + 12, '/F1', fontSize, valueColor);
  return y + 22;
}

function estimateTextWidth(str, size) {
  str = String(str === undefined || str === null ? '' : str);
  let w = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    w += size * (code > 255 ? 1 : 0.55);
  }
  return w;
}

function drawTemplateLogo(s) {
  s.image('ImLogo', PAGE_W - TEMPLATE_R - 92, 53, 92, 32);
}

function drawTemplateFooter(s, pageNum, prefix) {
  const footer = prefix || '报告文件由易计算自动生成，计算结果仅供参考，不承担任何法律效应。';
  s.text(footer, TEMPLATE_L, 824, '/F1', 10, '0.05 0.05 0.05');
  s.textRight(String(pageNum), PAGE_W - TEMPLATE_R, 824, '/F2', 10, '0.05 0.05 0.05');
}

function drawTemplatePageChrome(s, pageNum, footerPrefix) {
  drawTemplateLogo(s);
  drawTemplateFooter(s, pageNum, footerPrefix);
}

function drawTemplateHeading(s, text, y, size) {
  s.text(text, TEMPLATE_L, y, '/F1', size || 17, '0 0 0');
}

function drawTemplateWrappedText(s, text, x, y, maxW, size, lineH, font, color) {
  text = String(text === undefined || text === null ? '' : text);
  const paragraphs = text.split('\n');
  paragraphs.forEach(paragraph => {
    let line = '';
    for (let i = 0; i < paragraph.length; i++) {
      const next = line + paragraph[i];
      if (line && estimateTextWidth(next, size) > maxW) {
        s.text(line, x, y, font || '/F1', size, color || '0 0 0');
        y += lineH;
        line = paragraph[i];
      } else {
        line = next;
      }
    }
    if (line) {
      s.text(line, x, y, font || '/F1', size, color || '0 0 0');
      y += lineH;
    }
  });
  return y;
}

function getTemplateBaseFee(detail) {
  return Number(detail.basicFee || detail.basicFeeNoStage || detail.feeBaseTotal || detail.total || 0);
}

function getTemplateFeeBase(detail) {
  return Number(detail.feeBaseTotal || (getTemplateBaseFee(detail) + Number(detail.extraSum || 0)));
}

function getTemplateDiscount(detail) {
  return Number(detail.discount !== undefined ? detail.discount : 100);
}

function getTemplateTaxRate(detail) {
  return Number(detail.taxRate || 0);
}

function getTemplateTax(detail) {
  return Number(detail.tax || 0);
}

function getTemplateFinalFee(detail) {
  return Number(detail.total || 0);
}

function getTemplateBasePrice(detail) {
  return Number(detail.basePrice || detail.basicFee || detail.total || 0);
}

function buildTemplateTitlePage(pb, record, detail, stage) {
  const s = pb.current.stream;
  drawTemplatePageChrome(s, 1, '注：报告文件由易计算自动生成，计算结果仅供参考，不承担任何法律效应。');
  let y = 112;
  s.textCentered(getStageTitle(stage), y, '/F1', 22, '0 0 0');

  y = 176;
  drawTemplateHeading(s, '计算依据', y, 18);
  y += 46;
  const basis = getBasisLines(stage)[0] || getBasisText(stage, record);
  y = drawTemplateWrappedText(s, basis, TEMPLATE_L, y, TEMPLATE_W, 15, 28);

  y += 28;
  drawTemplateHeading(s, '计算公式', y, 18);
  y += 44;
  getFormulaLines(stage, detail).forEach(line => {
    y = drawTemplateWrappedText(s, line, TEMPLATE_L, y, TEMPLATE_W, 15, 28);
  });

  y += 24;
  drawTemplateHeading(s, getConditionTitle(stage), y, 18);
  y += 44;
  getConditions(stage, detail).forEach(item => {
    s.text(`${item.label} ${item.value}`, TEMPLATE_L, y, '/F1', 15, '0 0 0');
    y += 42;
  });

  pb.current.y = y;
}

function buildTemplateBasicFeePage(pb, record, detail, stage) {
  pb.newPage();
  const s = pb.current.stream;
  drawTemplatePageChrome(s, 2);
  let y = 92;

  drawTemplateHeading(s, getDetailTitle(stage), y, 18);
  y += 48;

  if (stage === 'F4' || stage === 'F6') {
    s.text('计算工程设计收费基价：', TEMPLATE_L, y, '/F1', 15, '0 0 0');
    y += 44;
    y = drawTemplateWrappedText(
      s,
      '工程设计收费基价在《工程设计收费基价表》(附表一)中查找确定，计费额处于两个数值区间的，采用直线内插法确定工程设计收费基价：',
      TEMPLATE_L,
      y,
      TEMPLATE_W,
      15,
      28
    );
    y += 8;
    s.text(`${fmt(getTemplateBasePrice(detail))} = ${fmt(getTemplateBasePrice(detail))}万元`, TEMPLATE_L, y, '/F1', 15, '0 0 0');
    y += 34;
    s.text('计算基本设计收费：', TEMPLATE_L, y, '/F1', 15, '0 0 0');
    y += 34;
    const coefParts = [
      fmt(getTemplateBasePrice(detail)),
      detail.specialtyCoef !== undefined ? String(detail.specialtyCoef) : null,
      detail.complexityCoef !== undefined ? String(detail.complexityCoef) : null,
      detail.netAdditionalCoef !== undefined ? String(detail.netAdditionalCoef) : null
    ].filter(Boolean);
    s.text(`${coefParts.join(' × ')} = ${fmt(getTemplateBaseFee(detail))}万元`, TEMPLATE_L, y, '/F1', 15, '0 0 0');
    y += 58;
  } else {
    y = drawTemplateWrappedText(s, `${getDetailTitle(stage)}：`, TEMPLATE_L, y, TEMPLATE_W, 15, 28);
    const conditions = getConditions(stage, detail);
    conditions.forEach(item => {
      s.text(`${item.label} ${item.value}`, TEMPLATE_L, y, '/F1', 14, '0 0 0');
      y += 30;
    });
    s.text(`计算结果：${fmt(getTemplateFinalFee(detail))}万元`, TEMPLATE_L, y, '/F1', 15, '0 0 0');
    y += 58;
  }

  drawTemplateHeading(s, '其他设计收费', y, 18);
  y += 48;
  if (detail.extraDetails && detail.extraDetails.length > 0) {
    detail.extraDetails.forEach(item => {
      s.text(`${item.name || '其他收费'}：${fmt(item.amount || 0)}万元`, TEMPLATE_L, y, '/F1', 15, '0 0 0');
      y += 30;
    });
  } else {
    s.text('无', TEMPLATE_L, y, '/F1', 15, '0 0 0');
    y += 44;
  }

  drawTemplateHeading(s, stage === 'F4' || stage === 'F6' ? '设计收费基准价' : '收费基准价', y, 18);
  y += 48;
  const extraSum = Number(detail.extraSum || 0);
  s.text(`${fmt(getTemplateBaseFee(detail))} + ${fmt(extraSum)} = ${fmt(getTemplateFeeBase(detail))}万元`, TEMPLATE_L, y, '/F1', 15, '0 0 0');

  pb.current.y = y + 30;
}

function buildTemplateFinalFeePage(pb, record, detail, stage) {
  pb.newPage();
  const s = pb.current.stream;
  drawTemplatePageChrome(s, 3);
  let y = 92;

  drawTemplateHeading(s, '比例调整', y, 18);
  y += 48;
  const discount = getTemplateDiscount(detail);
  const feeBase = getTemplateFeeBase(detail);
  s.text(`总收费比例：${discount}%`, TEMPLATE_L, y, '/F1', 15, '0 0 0');
  y += 30;
  s.text(`${getFeeNameShort(stage)}：${fmt(feeBase)}万元×${discount}% = ${fmt(feeBase * discount / 100)}万元`, TEMPLATE_L, y, '/F1', 15, '0 0 0');
  y += 30;
  const stageRatio = Number(detail.stageRatio !== undefined ? detail.stageRatio : 100);
  s.text(`阶段工作量收费比例：${stageRatio}%`, TEMPLATE_L, y, '/F1', 15, '0 0 0');
  y += 30;
  s.text(`阶段工作量${getFeeNameShort(stage)}：${fmt(feeBase * discount / 100)}万元×${stageRatio}% = ${fmt(getTemplateFinalFee(detail))}万元`, TEMPLATE_L, y, '/F1', 15, '0 0 0');

  y += 50;
  drawTemplateHeading(s, `本项目${getFeeNameShort(stage)}`, y, 18);
  y += 52;
  s.text(`${fmt(getTemplateFinalFee(detail))}万元`, TEMPLATE_L, y, '/F1', 16, '0 0 0');

  y += 58;
  drawTemplateHeading(s, '增值税', y, 18);
  y += 48;
  const taxRate = getTemplateTaxRate(detail);
  const tax = getTemplateTax(detail);
  const totalWithTaxYuan = (getTemplateFinalFee(detail) + tax) * 10000;
  s.text(`增值税税率：${taxRate.toFixed(1)}%`, TEMPLATE_L, y, '/F1', 15, '0 0 0');
  y += 30;
  s.text(`增值税：${fmt(tax * 10000)}元`, TEMPLATE_L, y, '/F1', 15, '0 0 0');
  y += 30;
  s.text(`价税合计：${fmt(totalWithTaxYuan)}元`, TEMPLATE_L, y, '/F1', 15, '0 0 0');
  y += 30;
  s.text(`价税合计人民币大写：${toChineseUpper(totalWithTaxYuan)}`, TEMPLATE_L, y, '/F1', 15, '0 0 0');

  y += 78;
  s.image('ImSearch', TEMPLATE_L + 34, y - 28, 365, 144);

  y += 128;
  y = drawTemplateWrappedText(
    s,
    '特别声明：本报告文件由易计算微信小程序自动生成，易计算小程序由1+H ARCH开发并提供给用户免费使用，计算结果仅供参考，不承担任何法律效应。',
    TEMPLATE_L,
    y,
    TEMPLATE_W,
    12,
    22
  );

  pb.current.y = y;
}

function buildTemplateAppendixPage(pb, record, detail, stage) {
  const hasBaseTable = ['F4', 'F6', 'F4b', 'F5b', 'F3'].includes(stage);
  if (!hasBaseTable) return;
  pb.newPage();
  const s = pb.current.stream;
  drawTemplatePageChrome(s, 4, '报告文件由设计费计算器自动生成，计算结果仅供参考，不承担任何法律效应。');
  let y = 90;

  s.textCentered(getAppendixTitle(stage), y, '/F1', 18, '0 0 0');
  y += 44;

  const colX = [TEMPLATE_L, TEMPLATE_L + 150, TEMPLATE_L + 300];
  s.text('序号', colX[0], y, '/F1', 13, '0 0 0');
  s.text('计  费  额', colX[1], y, '/F1', 13, '0 0 0');
  s.text('收  费  基  价', colX[2], y, '/F1', 13, '0 0 0');
  y += 12;
  s.line(TEMPLATE_L, y, PAGE_W - TEMPLATE_R, y, '0 0 0', 1.2);
  y += 28;

  getBasePriceTableForStage(stage).forEach(row => {
    s.text(String(row.seq), colX[0], y, '/F2', 12, '0 0 0');
    s.text(String(row.value), colX[1], y, '/F2', 12, '0 0 0');
    s.text(String(row.price), colX[2], y, '/F2', 12, '0 0 0');
    y += 17;
    s.line(TEMPLATE_L, y, PAGE_W - TEMPLATE_R, y, '0 0 0', row.seq % 3 === 0 ? 0.8 : 0.35);
    y += 14;
  });

  y += 18;
  s.text('注：计费额>2000000万元的，以计费额乘以1.6%的收费率计算收费基价。', TEMPLATE_L, y, '/F1', 12, '0 0 0');
  pb.current.y = y + 20;
}

function drawTableHeader(s, y, cols, widths) {
  // cols: [{text, align: 'left'|'center'|'right'}]
  // widths: array of widths
  s.rect(MARGIN_L, y, CONTENT_W, 22, '0.94 0.96 0.98');
  let x = MARGIN_L + 8;
  cols.forEach((col, i) => {
    const w = widths[i] || 80;
    if (col.align === 'right') {
      // approximate right alignment
      let tw = 0;
      const txt = col.text;
      for (let j = 0; j < txt.length; j++) tw += 9 * (txt.charCodeAt(j) > 255 ? 1 : 0.55);
      s.text(txt, x + w - tw - 8, y + 14, '/F3', 9, '0.05 0.11 0.21');
    } else if (col.align === 'center') {
      let tw = 0;
      const txt = col.text;
      for (let j = 0; j < txt.length; j++) tw += 9 * (txt.charCodeAt(j) > 255 ? 1 : 0.55);
      s.text(txt, x + (w - tw) / 2, y + 14, '/F3', 9, '0.05 0.11 0.21');
    } else {
      s.text(col.text, x, y + 14, '/F3', 9, '0.05 0.11 0.21');
    }
    x += w;
  });
  return y + 22;
}

function drawTableRow(s, y, cols, widths, isAlt = false) {
  if (isAlt) s.rect(MARGIN_L, y, CONTENT_W, 22, '0.98 0.98 0.98');
  s.line(MARGIN_L, y + 22, PAGE_W - MARGIN_R, y + 22, '0.95 0.95 0.95', 0.5);
  let x = MARGIN_L + 8;
  cols.forEach((col, i) => {
    const w = widths[i] || 80;
    if (col.align === 'right') {
      let tw = 0;
      const txt = col.text;
      for (let j = 0; j < txt.length; j++) tw += 9 * (txt.charCodeAt(j) > 255 ? 1 : 0.55);
      s.text(txt, x + w - tw - 8, y + 14, '/F1', 9, '0.11 0.19 0.27');
    } else if (col.align === 'center') {
      let tw = 0;
      const txt = col.text;
      for (let j = 0; j < txt.length; j++) tw += 9 * (txt.charCodeAt(j) > 255 ? 1 : 0.55);
      s.text(txt, x + (w - tw) / 2, y + 14, '/F1', 9, '0.11 0.19 0.27');
    } else {
      s.text(col.text, x, y + 14, '/F1', 9, '0.11 0.19 0.27');
    }
    x += w;
  });
  return y + 22;
}

// ─── 第1页：标题页（计算依据 + 计算公式 + 收费条件）──
function buildTitlePage(pb, record, detail, stage, color, rgbColor) {
  const s = pb.current.stream;
  drawTopBar(s, color);
  let y = pb.current.y;

  // 品牌
  s.text('1+H  ARCH  ·  易计算', MARGIN_L, y, '/F1', 10, rgbColor);
  y += 20;

  // 标题
  const title = getStageTitle(stage);
  s.textCentered(title, y + 20, '/F1', 18, '0.05 0.11 0.21');
  y += 44;

  // 分隔线
  drawSeparator(s, y); y += 6;

  // 项目信息
  const projName = record.projectName || record.name || '未命名项目';
  s.text(`项目名称：${projName}`, MARGIN_L, y + 12, '/F1', 9, '0.35 0.41 0.48');
  s.text(`子项名称：${record.name || '未命名'}`, MARGIN_L + 260, y + 12, '/F1', 9, '0.35 0.41 0.48');
  y += 20;
  s.text(`计算时间：${fmtDate(new Date())}`, MARGIN_L, y + 12, '/F1', 9, '0.35 0.41 0.48');
  const basisText = getBasisText(stage, record);
  s.text(`计算依据：${basisText}`, MARGIN_L + 260, y + 12, '/F1', 9, '0.35 0.41 0.48');
  y += 30;

  if (pb.ensureSpace(24, y)) y = TOP_Y;

  // 计算依据
  drawSectionTitle(s, y, '计算依据', color);
  y += 28;

  const basisLines = getBasisLines(stage);
  basisLines.forEach(line => {
    if (pb.ensureSpace(18, y)) y = TOP_Y;
    s.text(line, MARGIN_L + 12, y + 10, '/F1', 9, '0.43 0.50 0.57');
    y += 18;
  });
  y += 6;

  if (pb.ensureSpace(24, y)) y = TOP_Y;

  // 计算公式
  drawSectionTitle(s, y, '计算公式', color);
  y += 28;

  const formulaLines = getFormulaLines(stage, detail);
  formulaLines.forEach(line => {
    if (pb.ensureSpace(18, y)) y = TOP_Y;
    s.text(line, MARGIN_L + 12, y + 10, '/F1', 9, '0.43 0.50 0.57');
    y += 18;
  });
  y += 12;

  if (pb.ensureSpace(30, y)) y = TOP_Y;

  // 收费条件
  drawSectionTitle(s, y, getConditionTitle(stage), color);
  y += 28;

  const conditions = getConditions(stage, detail);
  conditions.forEach(({ label, value }) => {
    if (pb.ensureSpace(24, y)) y = TOP_Y;
    y = drawLabelValueRow(s, y, label, value);
  });
  y += 20;

  // 注
  s.text('注：报告文件由「易计算」自动生成，计算结果仅供参考，不承担任何法律效应。', MARGIN_L, y + 10, '/F1', 7.5, '0.70 0.75 0.80');

  pb.current.y = y + 20;
}

// ─── 第2页：计算明细页 ─────────────────────────────
function buildCalcDetailPage(pb, record, detail, stage, color, rgbColor) {
  pb.newPage();
  const s = pb.current.stream;
  drawTopBar(s, color);
  let y = TOP_Y + 14;

  const detailTitle = getDetailTitle(stage);
  s.textCentered(detailTitle, y, '/F1', 14, '0.05 0.11 0.21');
  y += 32;

  drawSeparator(s, y); y += 6;

  switch (stage) {
    case 'F4': case 'F6':
      y = buildF4CalcDetail(pb, s, y, detail, color, stage);
      break;
    case 'F4b':
      y = buildF4bCalcDetail(pb, s, y, detail, color);
      break;
    case 'F1':
      y = buildF1CalcDetail(pb, s, y, detail, color);
      break;
    case 'F3':
      y = buildF3CalcDetail(pb, s, y, detail, color);
      break;
    case 'F5':
      y = buildF5CalcDetail(pb, s, y, detail, color);
      break;
    case 'F2':
      y = buildF2CalcDetail(pb, s, y, detail, color);
      break;
    case 'bidding':
      y = buildBiddingCalcDetail(pb, s, y, detail, color);
      break;
    case 'supervision':
      y = buildSupervisionCalcDetail(pb, s, y, detail, color);
      break;
    default:
      y = buildGenericCalcDetail(pb, s, y, detail, color);
  }

  pb.current.y = y;
}

// ─── F4/F6 计算明细 ──────────────────────────────
function buildF4CalcDetail(pb, s, y, detail, color, stage) {
  // 计算工程设计收费基价
  drawSectionTitle(s, y, '计算工程设计收费基价', color);
  y += 28;

  s.text('工程设计收费基价在《工程设计收费基价表》(附表一)中查找确定，', MARGIN_L + 12, y + 10, '/F1', 9, '0.43 0.50 0.57');
  y += 17;
  s.text('计费额处于两个数值区间的，采用直线内插法确定工程设计收费基价：', MARGIN_L + 12, y + 10, '/F1', 9, '0.43 0.50 0.57');
  y += 22;

  s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 26, '0.97 0.98 1.00', '0.85 0.88 0.92', 0.5);
  let bpText = `${fmt(detail.basePrice)} = ${fmt(detail.basePrice)}万元`;
  s.text(bpText, MARGIN_L + 22, y + 16, '/F2', 10, '0.05 0.11 0.21');
  y += 34;

  // 计算基本设计收费
  y += 6; if (pb.ensureSpace(50, y)) y = TOP_Y;
  drawSectionTitle(s, y, '计算基本设计收费', color);
  y += 28;

  const stageLabel = stage === 'F6' ? '统筹调整系数' : '专业调整系数';
  let formulaParts = [];
  formulaParts.push(`${fmt(detail.basePrice)}`);
  if (detail.specialtyCoef !== undefined) formulaParts.push(`× ${detail.specialtyCoef}`);
  if (detail.complexityCoef !== undefined) formulaParts.push(`× ${detail.complexityCoef}`);
  if (detail.netAdditionalCoef !== undefined && detail.netAdditionalCoef !== 1) formulaParts.push(`× ${detail.netAdditionalCoef}`);

  const formulaStr = formulaParts.join(' ');
  const basicFee = detail.basicFee || detail.basicFeeNoStage || 0;

  s.text('基本设计收费 = 工程设计收费基价 × 专业调整系数 × 工程复杂程度调整系数 × 附加调整系数', MARGIN_L + 12, y + 10, '/F1', 9, '0.43 0.50 0.57');
  y += 18;

  s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 26, '0.97 0.98 1.00', '0.85 0.88 0.92', 0.5);
  s.text(`${formulaStr} = ${fmt(basicFee)}万元`, MARGIN_L + 22, y + 16, '/F2', 10, '0.05 0.11 0.21');
  y += 34;

  // 各系数明细
  y += 4;
  const coefRows = [];
  coefRows.push({ label: '工程设计收费基价', value: `${fmt(detail.basePrice)} 万元` });
  if (detail.specialtyCoef !== undefined) coefRows.push({ label: stageLabel, value: `${detail.specialtyCoef}（${detail.specialtyName || ''}）` });
  if (detail.complexityCoef !== undefined) coefRows.push({ label: '复杂程度调整系数', value: `${detail.complexityCoef}（${detail.complexityName || ''}）` });
  if (detail.netAdditionalCoef !== undefined && detail.netAdditionalCoef !== 1) coefRows.push({ label: '附加调整系数', value: String(detail.netAdditionalCoef) });
  coefRows.push({ label: '基本设计收费', value: `${fmt(basicFee)} 万元`, highlight: true });

  coefRows.forEach((row, i) => {
    if (pb.ensureSpace(24, y)) y = TOP_Y;
    if (row.highlight) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.94 0.96 0.98');
    else if (i % 2 === 1) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.99 0.99 0.99');
    s.line(MARGIN_L + 12, y + 24, PAGE_W - MARGIN_R - 12, y + 24, '0.95 0.95 0.95', 0.3);
    s.text(row.label, MARGIN_L + 20, y + 15, '/F1', 9, row.highlight ? '0.05 0.11 0.21' : '0.35 0.41 0.48');
    s.textRight(row.value, PAGE_W - MARGIN_R - 20, y + 15, row.highlight ? '/F3' : '/F2', 9, row.highlight ? '0.05 0.11 0.21' : '0.11 0.19 0.27');
    y += 24;
  });
  y += 10;

  // 额外服务
  if (detail.extraDetails && detail.extraDetails.length > 0) {
    if (pb.ensureSpace(30, y)) y = TOP_Y;
    drawSectionTitle(s, y, '其他设计收费', color);
    y += 28;

    detail.extraDetails.forEach((ed, i) => {
      if (pb.ensureSpace(22, y)) y = TOP_Y;
      if (i % 2 === 1) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 22, '0.99 0.99 0.99');
      s.line(MARGIN_L + 12, y + 22, PAGE_W - MARGIN_R - 12, y + 22, '0.95 0.95 0.95', 0.3);
      s.text(`${ed.name}（${ed.ratio}）`, MARGIN_L + 20, y + 14, '/F1', 9, '0.35 0.41 0.48');
      s.textRight(`${fmt(ed.amount)} 万元`, PAGE_W - MARGIN_R - 20, y + 14, '/F2', 9, '0.11 0.19 0.27');
      y += 22;
    });
    y += 10;

    if (pb.ensureSpace(24, y)) y = TOP_Y;
    s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.94 0.96 0.98');
    s.text('其他设计收费合计', MARGIN_L + 20, y + 15, '/F1', 9, '0.05 0.11 0.21');
    s.textRight(`${fmt(detail.extraSum || 0)} 万元`, PAGE_W - MARGIN_R - 20, y + 15, '/F3', 9, '0.05 0.11 0.21');
    y += 28;
  } else {
    y += 4; if (pb.ensureSpace(20, y)) y = TOP_Y;
    s.text('其他设计收费：无', MARGIN_L + 12, y + 10, '/F1', 9, '0.43 0.50 0.57');
    y += 24;
  }

  // 设计收费基准价
  if (pb.ensureSpace(28, y)) y = TOP_Y;
  drawSectionTitle(s, y, '设计收费基准价', color);
  y += 28;

  const feeBaseTotal = detail.feeBaseTotal || (basicFee + (detail.extraSum || 0));
  const extraSum = detail.extraSum || 0;
  s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 26, '0.94 0.96 0.98', '0.85 0.88 0.92', 0.5);
  s.text(`设计收费基准价 = ${fmt(basicFee)} + ${fmt(extraSum)} = ${fmt(feeBaseTotal)} 万元`, MARGIN_L + 22, y + 16, '/F3', 10, '0.05 0.11 0.21');
  y += 40;

  return y;
}

// ─── F4b 计算明细 ─────────────────────────────────
function buildF4bCalcDetail(pb, s, y, detail, color) {
  drawSectionTitle(s, y, '计算设计费', color);
  y += 28;

  const rows = [];
  if (detail.area && detail.unitPrice) {
    rows.push({ label: '计费方法', value: '面积指标法' });
    rows.push({ label: '计费面积', value: `${fmtInt(detail.area)} m²` });
    rows.push({ label: '取费标准', value: `${fmt(detail.unitPrice)} 元/m²` });
    if (detail.designerCoef && detail.designerCoef > 1) rows.push({ label: '名家设计师系数', value: `×${detail.designerCoef}` });
    rows.push({ label: '基本费计算公式', value: `${fmtInt(detail.area)}m² × ${fmt(detail.unitPrice)}元/m²${detail.designerCoef > 1 ? ' × ' + detail.designerCoef : ''} = ${fmt(detail.basicFee)}万元` });
  } else if (detail.area && detail.designRate) {
    rows.push({ label: '建筑设计面积', value: `${fmtInt(detail.area)} m²` });
    rows.push({ label: '建筑设计单价', value: `${fmt(detail.designRate)} 元/m²` });
    const bdf = detail.area * detail.designRate / 10000;
    rows.push({ label: '建筑设计费', value: `${fmt(bdf)} 万元` });
    if (detail.includeDeco) {
      rows.push({ label: '室内设计单价', value: `${fmt(detail.decoDesignRate)} 元/m²` });
      rows.push({ label: '室内设计费', value: `${fmt(detail.decoFee)} 万元` });
    }
    rows.push({ label: '基本费合计', value: `${fmt(detail.basicFee)} 万元` });
  } else if (detail.cost) {
    rows.push({ label: '计费基数', value: `${fmt(detail.cost)} 万元` });
    rows.push({ label: '设计基价', value: `${fmt(detail.basePrice)} 万元` });
    if (detail.specialtyCoef) rows.push({ label: '专业调整系数', value: `×${detail.specialtyCoef}` });
    if (detail.complexityCoef) rows.push({ label: '复杂程度系数', value: `×${detail.complexityCoef}` });
    if (detail.baseDecoCoef) rows.push({ label: '附加调整系数', value: `×${detail.baseDecoCoef}` });
    if (detail.otherServiceCoef) rows.push({ label: '附加其他服务系数', value: `×${detail.otherServiceCoef}` });
    if (detail.netAddCoef) rows.push({ label: '综合附加系数', value: `×${detail.netAddCoef}` });
    const formula = `${fmt(detail.basePrice)} × ${detail.specialtyCoef || 1} × ${detail.complexityCoef} × ${detail.netAddCoef || 1}`;
    rows.push({ label: '计算公式', value: `${formula} = ${fmt(detail.basicFee)}万元` });
  } else if (detail.productionFee) {
    rows.push({ label: '标识制作费', value: `${fmt(detail.productionFee)} 万元` });
    rows.push({ label: '安装工程费率', value: `${detail.installRate}%` });
    rows.push({ label: '安装费合计', value: `${fmt(detail.installFee)} 万元` });
    rows.push({ label: '基本费合计', value: `${fmt(detail.basicFee)} 万元` });
  }
  rows.push({ label: '合计', value: `${fmt(detail.total)} 万元`, highlight: true });

  rows.forEach((row, i) => {
    if (pb.ensureSpace(24, y)) y = TOP_Y;
    if (row.highlight) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.94 0.96 0.98');
    else if (i % 2 === 1) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.99 0.99 0.99');
    s.line(MARGIN_L + 12, y + 24, PAGE_W - MARGIN_R - 12, y + 24, '0.95 0.95 0.95', 0.3);
    s.text(row.label, MARGIN_L + 20, y + 15, '/F1', 9, row.highlight ? '0.05 0.11 0.21' : '0.35 0.41 0.48');
    s.textRight(row.value, PAGE_W - MARGIN_R - 20, y + 15, row.highlight ? '/F3' : '/F2', 9, row.highlight ? '0.05 0.11 0.21' : '0.11 0.19 0.27');
    y += 24;
  });
  return y + 10;
}

// ─── F1 计算明细 ──────────────────────────────────
function buildF1CalcDetail(pb, s, y, detail, color) {
  drawSectionTitle(s, y, '计算咨询费用', color);
  y += 28;
  const rows = [];
  rows.push({ label: '估算投资额', value: `${fmt(detail.cost)} 万元` });
  rows.push({ label: '咨询基价', value: `${fmt(detail.basePrice)} 万元` });
  if (detail.industryCoef !== undefined) rows.push({ label: '行业调整系数', value: String(detail.industryCoef) });
  if (detail.complexCoef !== undefined) rows.push({ label: '复杂程度系数', value: String(detail.complexCoef) });
  if (detail.industryCoef === undefined && detail.netAdditionalCoef !== undefined) rows.push({ label: '行业调整系数', value: String(detail.netAdditionalCoef) });
  if (detail.discount < 100) rows.push({ label: '收费比例', value: `${detail.discount}%` });
  rows.push({ label: '合计', value: `${fmt(detail.total)} 万元`, highlight: true });
  rows.forEach((row, i) => {
    if (pb.ensureSpace(24, y)) y = TOP_Y;
    if (row.highlight) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.94 0.96 0.98');
    else if (i % 2 === 1) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.99 0.99 0.99');
    s.line(MARGIN_L + 12, y + 24, PAGE_W - MARGIN_R - 12, y + 24, '0.95 0.95 0.95', 0.3);
    s.text(row.label, MARGIN_L + 20, y + 15, '/F1', 9, row.highlight ? '0.05 0.11 0.21' : '0.35 0.41 0.48');
    s.textRight(row.value, PAGE_W - MARGIN_R - 20, y + 15, row.highlight ? '/F3' : '/F2', 9, row.highlight ? '0.05 0.11 0.21' : '0.11 0.19 0.27');
    y += 24;
  });
  return y + 10;
}

// ─── F3 计算明细 ──────────────────────────────────
function buildF3CalcDetail(pb, s, y, detail, color) {
  drawSectionTitle(s, y, '计算勘察费用', color);
  y += 28;
  const rows = [];
  rows.push({ label: '工程费', value: `${fmt(detail.cost)} 万元` });
  rows.push({ label: '勘察基价', value: `${fmt(detail.basePrice)} 万元` });
  rows.push({ label: '工程复杂程度系数', value: String(detail.complexityCoef) });
  rows.push({ label: '场地复杂程度系数', value: String(detail.siteCoef || detail.siteComplexityCoef || 1) });
  rows.push({ label: '附加调整系数', value: String(detail.netAdditionalCoef || 1) });
  if (detail.discount < 100) rows.push({ label: '收费比例', value: `${detail.discount}%` });
  rows.push({ label: '合计', value: `${fmt(detail.total)} 万元`, highlight: true });
  rows.forEach((row, i) => {
    if (pb.ensureSpace(24, y)) y = TOP_Y;
    if (row.highlight) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.94 0.96 0.98');
    else if (i % 2 === 1) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.99 0.99 0.99');
    s.line(MARGIN_L + 12, y + 24, PAGE_W - MARGIN_R - 12, y + 24, '0.95 0.95 0.95', 0.3);
    s.text(row.label, MARGIN_L + 20, y + 15, '/F1', 9, row.highlight ? '0.05 0.11 0.21' : '0.35 0.41 0.48');
    s.textRight(row.value, PAGE_W - MARGIN_R - 20, y + 15, row.highlight ? '/F3' : '/F2', 9, row.highlight ? '0.05 0.11 0.21' : '0.11 0.19 0.27');
    y += 24;
  });
  return y + 10;
}

// ─── F5 计算明细 ──────────────────────────────────
function buildF5CalcDetail(pb, s, y, detail, color) {
  drawSectionTitle(s, y, '计算造价咨询费用', color);
  y += 28;

  if (detail.diffBreakdown && detail.diffBreakdown.length > 0) {
    // 差额定率分档累进明细
    s.text('采用差额定率分档累进法计算：', MARGIN_L + 12, y + 10, '/F1', 9, '0.43 0.50 0.57');
    y += 22;

    const widths = [180, 100, 100, 115];
    y = drawTableHeader(s, y, [
      { text: '计费分段', align: 'left' },
      { text: '计费基数', align: 'right' },
      { text: '费率', align: 'center' },
      { text: '分段费用', align: 'right' }
    ], widths);

    detail.diffBreakdown.forEach((item, i) => {
      if (pb.ensureSpace(22, y)) y = TOP_Y;
      y = drawTableRow(s, y, [
        { text: item.range ? `${item.range}万元` : '—', align: 'left' },
        { text: item.base ? `${formatNumForPdf(item.base)}万元` : '—', align: 'right' },
        { text: item.rateText || '—', align: 'center' },
        { text: item.charge ? `${formatNumForPdf(item.charge)}万元` : '—', align: 'right' }
      ], widths, i % 2 === 1);
    });
    y += 6;
  }

  const rows = [];
  rows.push({ label: '计费基数金额', value: `${fmt(detail.cost)} 万元` });
  rows.push({ label: '咨询项目基本费', value: `${fmt(detail.basicFee)} 万元` });
  if (detail.costType === 'settlement_audit' && detail.benefitFee) {
    rows.push({ label: '送审核减额', value: `${fmt(detail.deduction)} 万元` });
    rows.push({ label: '核减效益费 (5%)', value: `${fmt(detail.benefitFee)} 万元` });
  }
  if (detail.discount < 100) rows.push({ label: '收费比例', value: `${detail.discount}%` });
  rows.push({ label: '合计', value: `${fmt(detail.total)} 万元`, highlight: true });

  rows.forEach((row, i) => {
    if (pb.ensureSpace(24, y)) y = TOP_Y;
    if (row.highlight) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.94 0.96 0.98');
    else if (i % 2 === 1) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.99 0.99 0.99');
    s.line(MARGIN_L + 12, y + 24, PAGE_W - MARGIN_R - 12, y + 24, '0.95 0.95 0.95', 0.3);
    s.text(row.label, MARGIN_L + 20, y + 15, '/F1', 9, row.highlight ? '0.05 0.11 0.21' : '0.35 0.41 0.48');
    s.textRight(row.value, PAGE_W - MARGIN_R - 20, y + 15, row.highlight ? '/F3' : '/F2', 9, row.highlight ? '0.05 0.11 0.21' : '0.11 0.19 0.27');
    y += 24;
  });
  return y + 10;
}

function formatNumForPdf(n) {
  if (n === undefined || n === null) return '0.00';
  const n2 = Number(n).toFixed(2);
  const parts = n2.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${intPart}.${parts[1]}`;
}

// ─── F2 计算明细 ──────────────────────────────────
function buildF2CalcDetail(pb, s, y, detail, color) {
  drawSectionTitle(s, y, '计算规划费用', color);
  y += 28;
  const unit = detail.planningType === 'overall' ? 'km²' : '万㎡';
  const rows = [];
  rows.push({ label: '规划规模面积', value: `${detail.cost} ${unit}` });
  rows.push({ label: '规划基本服务费', value: `${fmt(detail.basicFee)} 万元` });
  if (detail.minFeeApplied) rows.push({ label: '保底服务成本', value: '已触发保底限额' });
  if (detail.discount < 100) rows.push({ label: '收费比例', value: `${detail.discount}%` });
  rows.push({ label: '合计', value: `${fmt(detail.total)} 万元`, highlight: true });
  rows.forEach((row, i) => {
    if (pb.ensureSpace(24, y)) y = TOP_Y;
    if (row.highlight) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.94 0.96 0.98');
    else if (i % 2 === 1) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.99 0.99 0.99');
    s.line(MARGIN_L + 12, y + 24, PAGE_W - MARGIN_R - 12, y + 24, '0.95 0.95 0.95', 0.3);
    s.text(row.label, MARGIN_L + 20, y + 15, '/F1', 9, row.highlight ? '0.05 0.11 0.21' : '0.35 0.41 0.48');
    s.textRight(row.value, PAGE_W - MARGIN_R - 20, y + 15, row.highlight ? '/F3' : '/F2', 9, row.highlight ? '0.05 0.11 0.21' : '0.11 0.19 0.27');
    y += 24;
  });
  return y + 10;
}

// ─── bidding 计算明细 ─────────────────────────────
function buildBiddingCalcDetail(pb, s, y, detail, color) {
  drawSectionTitle(s, y, '计算招标代理费用', color);
  y += 28;

  if (detail.diffBreakdown && detail.diffBreakdown.length > 0) {
    s.text('采用差额定率分档累进法计算：', MARGIN_L + 12, y + 10, '/F1', 9, '0.43 0.50 0.57');
    y += 22;
    const widths = [180, 100, 100, 115];
    y = drawTableHeader(s, y, [
      { text: '计费分段', align: 'left' },
      { text: '计费基数', align: 'right' },
      { text: '费率', align: 'center' },
      { text: '分段费用', align: 'right' }
    ], widths);
    detail.diffBreakdown.forEach((item, i) => {
      if (pb.ensureSpace(22, y)) y = TOP_Y;
      y = drawTableRow(s, y, [
        { text: item.range ? `${item.range}万元` : '—', align: 'left' },
        { text: item.base ? `${formatNumForPdf(item.base)}万元` : '—', align: 'right' },
        { text: item.rateText || '—', align: 'center' },
        { text: item.charge ? `${formatNumForPdf(item.charge)}万元` : '—', align: 'right' }
      ], widths, i % 2 === 1);
    });
    y += 6;
  }

  const rows = [];
  rows.push({ label: '中标金额', value: `${fmt(detail.cost)} 万元` });
  rows.push({ label: '招标类型', value: detail.biddingTypeName || '—' });
  rows.push({ label: '政策口径', value: detail.policyName || '国家标准' });
  rows.push({ label: '服务内容', value: detail.serviceScopeName || '全过程代理' });
  rows.push({ label: '代理费基价', value: `${fmt(detail.basePrice)} 万元` });
  if (detail.serviceCoef !== undefined && Number(detail.serviceCoef) !== 1) rows.push({ label: '服务内容系数', value: String(detail.serviceCoef) });
  if (detail.discount < 100) rows.push({ label: '收费比例', value: `${detail.discount}%` });
  rows.push({ label: '合计', value: `${fmt(detail.total)} 万元`, highlight: true });
  rows.forEach((row, i) => {
    if (pb.ensureSpace(24, y)) y = TOP_Y;
    if (row.highlight) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.94 0.96 0.98');
    else if (i % 2 === 1) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.99 0.99 0.99');
    s.line(MARGIN_L + 12, y + 24, PAGE_W - MARGIN_R - 12, y + 24, '0.95 0.95 0.95', 0.3);
    s.text(row.label, MARGIN_L + 20, y + 15, '/F1', 9, row.highlight ? '0.05 0.11 0.21' : '0.35 0.41 0.48');
    s.textRight(row.value, PAGE_W - MARGIN_R - 20, y + 15, row.highlight ? '/F3' : '/F2', 9, row.highlight ? '0.05 0.11 0.21' : '0.11 0.19 0.27');
    y += 24;
  });
  return y + 10;
}

// ─── supervision 计算明细 ─────────────────────────
function buildSupervisionCalcDetail(pb, s, y, detail, color) {
  drawSectionTitle(s, y, '计算监理费用', color);
  y += 28;
  const rows = [];
  rows.push({ label: '计费额', value: `${fmt(detail.cost)} 万元` });
  rows.push({ label: '监理服务基价', value: `${fmt(detail.basePrice)} 万元` });
  rows.push({ label: '专业调整系数', value: `${detail.professionCoef}（${detail.professionName || ''}）` });
  if (detail.elevationCoef) rows.push({ label: '高程调整系数', value: `${detail.elevationCoef}（${detail.elevationName || ''}）` });
  if (detail.discount < 100) rows.push({ label: '收费比例', value: `${detail.discount}%` });
  rows.push({ label: '合计', value: `${fmt(detail.total)} 万元`, highlight: true });
  rows.forEach((row, i) => {
    if (pb.ensureSpace(24, y)) y = TOP_Y;
    if (row.highlight) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.94 0.96 0.98');
    else if (i % 2 === 1) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.99 0.99 0.99');
    s.line(MARGIN_L + 12, y + 24, PAGE_W - MARGIN_R - 12, y + 24, '0.95 0.95 0.95', 0.3);
    s.text(row.label, MARGIN_L + 20, y + 15, '/F1', 9, row.highlight ? '0.05 0.11 0.21' : '0.35 0.41 0.48');
    s.textRight(row.value, PAGE_W - MARGIN_R - 20, y + 15, row.highlight ? '/F3' : '/F2', 9, row.highlight ? '0.05 0.11 0.21' : '0.11 0.19 0.27');
    y += 24;
  });
  return y + 10;
}

// ─── 通用计算明细 ─────────────────────────────────
function buildGenericCalcDetail(pb, s, y, detail, color) {
  drawSectionTitle(s, y, '计算费用明细', color);
  y += 28;
  const rows = [];
  if (detail.cost !== undefined) rows.push({ label: '计费基数', value: `${fmt(detail.cost)} 万元` });
  rows.push({ label: '计算费用', value: `${fmt(detail.total)} 万元`, highlight: true });
  rows.forEach((row, i) => {
    if (pb.ensureSpace(24, y)) y = TOP_Y;
    if (row.highlight) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.94 0.96 0.98');
    else if (i % 2 === 1) s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 24, '0.99 0.99 0.99');
    s.line(MARGIN_L + 12, y + 24, PAGE_W - MARGIN_R - 12, y + 24, '0.95 0.95 0.95', 0.3);
    s.text(row.label, MARGIN_L + 20, y + 15, '/F1', 9, row.highlight ? '0.05 0.11 0.21' : '0.35 0.41 0.48');
    s.textRight(row.value, PAGE_W - MARGIN_R - 20, y + 15, row.highlight ? '/F3' : '/F2', 9, row.highlight ? '0.05 0.11 0.21' : '0.11 0.19 0.27');
    y += 24;
  });
  return y + 10;
}

// ─── 第3页：最终费用 & 增值税 ─────────────────────
function buildFinalFeePage(pb, record, detail, stage, color, rgbColor) {
  pb.newPage();
  const s = pb.current.stream;
  drawTopBar(s, color);
  let y = TOP_Y + 14;

  s.textCentered('费用汇总', y, '/F1', 14, '0.05 0.11 0.21');
  y += 32;
  drawSeparator(s, y); y += 6;

  // 比例调整
  drawSectionTitle(s, y, '比例调整', color);
  y += 28;

  const discount = detail.discount !== undefined ? detail.discount : 100;
  const discountedTotal = detail.discountedTotal || detail.total;
  const basicFeeVal = detail.basicFee || detail.basicFeeNoStage || detail.feeBaseTotal || detail.total;

  if (discount < 100) {
    s.text(`总收费比例：${discount}%`, MARGIN_L + 12, y + 10, '/F1', 10, '0.05 0.11 0.21');
    y += 20;
    s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 26, '0.97 0.98 1.00', '0.85 0.88 0.92', 0.5);
    s.text(`${fmt(basicFeeVal)}万元 × ${discount}% = ${fmt(discountedTotal)}万元`, MARGIN_L + 22, y + 16, '/F2', 10, '0.05 0.11 0.21');
    y += 34;
  } else {
    s.text('总收费比例：100%', MARGIN_L + 12, y + 10, '/F1', 10, '0.05 0.11 0.21');
    y += 20;
  }

  // 阶段工作量（仅 F4/F6 有 stageRatio）
  if (detail.stageRatio !== undefined && detail.stageRatio < 100) {
    y += 6; if (pb.ensureSpace(50, y)) y = TOP_Y;
    s.text(`阶段工作量收费比例：${detail.stageRatio}%`, MARGIN_L + 12, y + 10, '/F1', 10, '0.05 0.11 0.21');
    y += 20;
    const stageAmount = discountedTotal * detail.stageRatio / 100;
    s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 26, '0.97 0.98 1.00', '0.85 0.88 0.92', 0.5);
    s.text(`${fmt(discountedTotal)}万元 × ${detail.stageRatio}% = ${fmt(stageAmount)}万元`, MARGIN_L + 22, y + 16, '/F2', 10, '0.05 0.11 0.21');
    y += 34;
  }

  y += 10;

  // 本项目收费
  if (pb.ensureSpace(40, y)) y = TOP_Y;
  drawSectionTitle(s, y, `本项目${getFeeNameShort(stage)}`, color);
  y += 28;

  const finalAmount = detail.total;
  s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 34, '0.94 0.96 0.98', hexToPdfRgb(color), 1.5);
  s.textCentered(`${fmt(finalAmount)} 万元`, y + 18, '/F3', 16, '0.05 0.11 0.21');
  y += 46;

  // 增值税（如适用）
  if (detail.taxRate > 0 && detail.tax > 0) {
    y += 6; if (pb.ensureSpace(90, y)) y = TOP_Y;
    drawSectionTitle(s, y, '增值税', color);
    y += 28;

    const taxAmountYuan = (detail.tax || 0) * 10000; // 万元 → 元
    const totalWithTaxYuan = (parseFloat(finalAmount) + parseFloat(detail.tax || 0)) * 10000;

    s.text(`增值税税率：${detail.taxRate}%`, MARGIN_L + 12, y + 10, '/F1', 10, '0.05 0.11 0.21');
    y += 20;
    s.text(`增值税：${fmtInt(taxAmountYuan)} 元`, MARGIN_L + 12, y + 10, '/F1', 10, '0.05 0.11 0.21');
    y += 22;

    s.rect(MARGIN_L + 12, y, CONTENT_W - 24, 34, hexToPdfRgb(color), null, 1.5);
    s.text('价税合计', MARGIN_L + 22, y + 18, '/F3', 14, '1.00 1.00 1.00');

    const taxTotalText = `${fmtInt(totalWithTaxYuan)} 元`;
    let tw = 0;
    for (let j = 0; j < taxTotalText.length; j++) tw += 14 * (taxTotalText.charCodeAt(j) > 255 ? 1 : 0.55);
    s.text(taxTotalText, PAGE_W - MARGIN_R - tw - 16, y + 18, '/F3', 14, '1.00 1.00 1.00');
    y += 40;

    const chineseUpper = toChineseUpper(totalWithTaxYuan);
    s.text(`价税合计人民币大写：${chineseUpper}`, MARGIN_L + 12, y + 10, '/F1', 9, '0.43 0.50 0.57');
    y += 24;
  }

  y += 16;

  // 特别声明
  s.text('特别声明：本报告文件由「易计算」微信小程序自动生成，', MARGIN_L, y + 10, '/F1', 7.5, '0.70 0.75 0.80');
  y += 14;
  s.text('「易计算」小程序由 1+H ARCH 开发并提供给用户免费使用，计算结果仅供参考，不承担任何法律效应。', MARGIN_L, y + 10, '/F1', 7.5, '0.70 0.75 0.80');

  pb.current.y = y + 20;
}

// ─── 第4页：基价表附录 ────────────────────────────
function buildAppendixPage(pb, record, detail, stage, color, rgbColor) {
  // 仅对使用工程设计基价表的 stage 展示附录
  const hasBaseTable = ['F4', 'F6', 'F4b', 'F5b', 'F3'].includes(stage);
  if (!hasBaseTable) return;

  pb.newPage();
  const s = pb.current.stream;
  drawTopBar(s, color);
  let y = TOP_Y + 14;

  const appendixTitle = getAppendixTitle(stage);
  s.textCentered(appendixTitle, y, '/F1', 14, '0.05 0.11 0.21');
  y += 32;
  drawSeparator(s, y); y += 6;

  // 基价表来源注释
  s.text(getAppendixSource(stage), MARGIN_L, y + 10, '/F1', 8, '0.43 0.50 0.57');
  y += 22;

  // 绘制基价表
  const colWidths = [60, 140, 140, 155];

  // 表头背景
  s.rect(MARGIN_L, y, CONTENT_W, 22, '0.94 0.96 0.98');
  s.text('序号', MARGIN_L + 8, y + 14, '/F1', 9, '0.05 0.11 0.21');
  s.text('计 费 额', MARGIN_L + colWidths[0] + 30, y + 14, '/F1', 9, '0.05 0.11 0.21');
  s.text('收 费 基 价', MARGIN_L + colWidths[0] + colWidths[1] + 30, y + 14, '/F1', 9, '0.05 0.11 0.21');
  y += 22;

  const tableData = getBasePriceTableForStage(stage);

  tableData.forEach((row, i) => {
    if (pb.ensureSpace(22, y)) y = TOP_Y;
    if (i % 2 === 1) s.rect(MARGIN_L, y, CONTENT_W, 22, '0.98 0.98 0.98');
    s.line(MARGIN_L, y + 22, PAGE_W - MARGIN_R, y + 22, '0.95 0.95 0.95', 0.3);

    // 高亮匹配行
    const costMatch = detail.cost && row.value > 0 &&
      ((i > 0 && detail.cost > tableData[i-1].value && detail.cost <= row.value) ||
       (i === 0 && detail.cost <= row.value));
    const textColor = costMatch ? hexToPdfRgb(color) : '0.11 0.19 0.27';
    const font = costMatch ? '/F3' : '/F1';

    s.text(String(row.seq || (i + 1)), MARGIN_L + 8, y + 14, font, 9, textColor);
    s.text(formatNumForPdf(row.value), MARGIN_L + colWidths[0] + 30, y + 14, font, 9, textColor);
    s.text(formatNumForPdf(row.price), MARGIN_L + colWidths[0] + colWidths[1] + 30, y + 14, font, 9, textColor);
    y += 22;
  });

  // 注
  y += 8; if (pb.ensureSpace(20, y)) y = TOP_Y;
  s.text('注：计费额 > 2000000 万元的，以计费额乘以 1.6% 的收费率计算收费基价。', MARGIN_L, y + 10, '/F1', 7.5, '0.70 0.75 0.80');
  y += 18;
  s.text('注：带颜色高亮行为当前计费额所在区间。', MARGIN_L, y + 10, '/F1', 7.5, '0.70 0.75 0.80');

  pb.current.y = y + 20;
}

// ─── 内容生成辅助函数 ────────────────────────────
function getStageTitle(stage) {
  const map = {
    F4: '设计费计算书', F6: '设计费计算书',
    F4b: '专项设计取费计算书', F1: '前期咨询取费计算书',
    F3: '工程勘察取费计算书', F5: '造价咨询取费计算书',
    F2: '规划取费计算书', bidding: '招标代理取费计算书',
    supervision: '工程监理取费计算书', management: '建设管理取费计算书',
    F1_4: '单项咨询取费计算书', F2b: '土地整治取费计算书',
    F5b: '六张网设计取费计算书'
  };
  return map[stage] || '取费计算书';
}

function getBasisText(stage, record) {
  if (record.basis) return record.basis;
  const map = {
    F4: '计价格[2002]10号', F6: '计价格[2002]10号 / 粤勘设协字[2024]12号', F4b: '计价格[2002]10号',
    F3: '计价格[2002]10号', F5b: '计价格[2002]10号',
    F1: '计价格[1999]1283号', F5: '粤价函[2011]742号',
    F2: '中规协[2004]022号', bidding: '计价格[2002]1980号',
    supervision: '发改价格[2007]670号', management: '财建[2016]504号'
  };
  return map[stage] || '计价格[2002]10号';
}

function getBasisLines(stage) {
  const lines = {
    F4: ['《工程勘察设计收费标准》（计价格[2002]10号）'],
    F6: ['《工程勘察设计收费标准》（计价格[2002]10号）', '广东地区可参考《广东省工程勘察设计服务成本取费导则》（粤勘设协字[2024]12号）及粤建科[2019]12号等补充依据'],
    F4b: ['《工程勘察设计收费标准》（计价格[2002]10号）'],
    F1: ['《建设项目前期工作咨询收费暂行规定》（计价格[1999]1283号）'],
    F3: ['《工程勘察设计收费标准》（计价格[2002]10号）'],
    F5: ['《广东省建设工程造价咨询服务收费标准》（粤价函[2011]742号）'],
    F2: ['《城市规划设计计费指导意见》（2004中规协）'],
    bidding: ['《招标代理服务收费管理暂行办法》（计价格[2002]1980号）'],
    supervision: ['《建设工程监理与相关服务收费管理规定》（发改价格[2007]670号）'],
    management: ['《基本建设项目建设成本管理规定》（财建[2016]504号）']
  };
  return lines[stage] || ['计价格[2002]10号《工程勘察设计收费标准》'];
}

function getFormulaLines(stage, detail) {
  switch (stage) {
    case 'F4': case 'F6':
      return [
        '工程设计收费 = 工程设计收费基准价 ×（1 ± 浮动幅度值）',
        '工程设计收费基准价 = 基本设计收费 + 其他设计收费',
        '基本设计收费 = 工程设计收费基价 × 专业调整系数 × 工程复杂程度调整系数 × 附加调整系数',
        '其他设计收费 = 基本设计收费 × 其他收费系数'
      ];
    case 'F4b':
      return ['根据所选计费方法与《工程设计收费基价表》计算'];
    case 'F1':
      return ['咨询收费 = 咨询基价 × 行业调整系数 × 复杂程度系数'];
    case 'F3':
      return ['勘察收费 = 勘察基价 × 工程复杂程度系数 × 场地复杂程度系数 × 附加调整系数'];
    case 'F5':
      return ['采用差额定率分档累进法计算', '咨询费 = 各分段基数 × 对应费率之和'];
    case 'F2':
      return ['按规划类型（总体规划/控制性详细规划/修建性详细规划）对应取费标准计算'];
    case 'bidding':
      return ['采用差额定率分档累进法计算招标代理费'];
    case 'supervision':
      return ['监理收费 = 监理基价 × 专业调整系数 × 高程调整系数'];
    default:
      return ['依据相关收费标准计算'];
  }
}

function getConditionTitle(stage) {
  const map = {
    F4: '工程设计收费条件', F6: '工程设计收费条件',
    F3: '工程勘察收费条件', supervision: '工程监理收费条件'
  };
  return map[stage] || '收费条件';
}

function getConditions(stage, detail) {
  const items = [];

  if (stage === 'F4' || stage === 'F6') {
    if (detail.cost !== undefined) items.push({ label: '工程设计收费计费额：', value: `${fmt(detail.cost)} 万元` });
    if (detail.specialtyCoef !== undefined) items.push({ label: '专业调整系数：', value: String(detail.specialtyCoef) });
    if (detail.complexityCoef !== undefined) items.push({ label: '复杂程度调整系数：', value: String(detail.complexityCoef) });
    if (detail.netAdditionalCoef !== undefined) items.push({ label: '附加调整系数：', value: String(detail.netAdditionalCoef) });
    items.push({ label: '是否价税分离计算：', value: detail.taxRate > 0 ? '是' : '否' });
    items.push({ label: '结果单位与有效数位：', value: '万元/精确到2位' });
  } else if (stage === 'F3') {
    if (detail.cost !== undefined) items.push({ label: '工程费计费额：', value: `${fmt(detail.cost)} 万元` });
    items.push({ label: '工程复杂程度系数：', value: String(detail.complexityCoef || 1) });
    items.push({ label: '场地复杂程度系数：', value: String(detail.siteCoef || detail.siteComplexityCoef || 1) });
  } else if (stage === 'F4b') {
    if (detail.area) items.push({ label: '计费面积：', value: `${fmtInt(detail.area)} m²` });
    if (detail.cost) items.push({ label: '计费额：', value: `${fmt(detail.cost)} 万元` });
    if (detail.method) items.push({ label: '计费方法：', value: detail.method });
  } else if (stage === 'F1') {
    if (detail.cost !== undefined) items.push({ label: '估算投资额：', value: `${fmt(detail.cost)} 万元` });
    if (detail.industryCoef !== undefined) items.push({ label: '行业调整系数：', value: String(detail.industryCoef) });
  } else if (stage === 'F5') {
    if (detail.cost !== undefined) items.push({ label: '计费基数：', value: `${fmt(detail.cost)} 万元` });
  } else if (stage === 'bidding') {
    if (detail.cost !== undefined) items.push({ label: '中标金额：', value: `${fmt(detail.cost)} 万元` });
  } else if (stage === 'supervision') {
    if (detail.cost !== undefined) items.push({ label: '计费额：', value: `${fmt(detail.cost)} 万元` });
  }

  if (items.length === 0) {
    if (detail.cost !== undefined) items.push({ label: '计费额：', value: `${fmt(detail.cost)} 万元` });
    items.push({ label: '结果单位与有效数位：', value: '万元/精确到2位' });
  }
  return items;
}

function getDetailTitle(stage) {
  const map = {
    F4: '基本设计收费', F6: '基本设计收费',
    F4b: '专项设计取费明细', F1: '咨询取费明细',
    F3: '勘察取费明细', F5: '造价咨询取费明细',
    F2: '规划取费明细', bidding: '招标代理取费明细',
    supervision: '监理取费明细', management: '建设管理取费明细'
  };
  return map[stage] || '取费明细';
}

function getFeeNameShort(stage) {
  const map = {
    F4: '工程设计收费', F6: '工程设计收费', F4b: '专项设计收费',
    F1: '咨询收费', F3: '工程勘察收费', F5: '造价咨询收费',
    F2: '规划收费', bidding: '招标代理收费',
    supervision: '工程监理收费', management: '建设管理收费'
  };
  return map[stage] || '设计收费';
}

function getAppendixTitle(stage) {
  if (stage === 'F3') return '附：岩土工程勘察收费基价表';
  return '附：工程设计收费基价表';
}

function getAppendixSource(stage) {
  if (stage === 'F3') return '来源：计价格[2002]10号《工程勘察设计收费标准》—— 岩土工程勘察收费基价表';
  return '来源：计价格[2002]10号《工程勘察设计收费标准》—— 工程设计收费基价表（附表一）';
}

function getBasePriceTableForStage(stage) {
  // 目前所有使用基价表的 stage 均使用工程设计收费基价表
  return ENGINEERING_BASE_PRICE_TABLE.map((row, i) => ({
    seq: i + 1,
    ...row
  }));
}

// ─── 主构建函数 ──────────────────────────────────
function buildPdfData(record, projectName = '') {
  const doc = new PDFDocument();
  const pb = new PageBuilder(doc);

  const detail = record.calcDetail || {};
  const stage = record.stage || 'F4';
  const color = STAGE_COLORS[stage] || '#102744';
  const rgbColor = hexToPdfRgb(color);

  // 填充项目名
  if (projectName) record.projectName = projectName;

  // 按上传模板输出：白底、右上角标识、四页结构、页脚声明。
  buildTemplateTitlePage(pb, record, detail, stage);
  buildTemplateBasicFeePage(pb, record, detail, stage);
  buildTemplateFinalFeePage(pb, record, detail, stage);
  buildTemplateAppendixPage(pb, record, detail, stage);

  // 1: Catalog → /Pages 2 0 R
  doc.addObject(doc.dict('/Type /Catalog\n/Pages 2 0 R'));

  // 2: Pages → /Kids [...pages...]
  // Static resources occupy objects 1-10; page objects are 12, 14, 16...
  const pageObjIds = pb.pages.map((_, i) => 12 + i * 2);
  const kidsRefs2 = pageObjIds.map(id => `${id} 0 R`).join(' ');
  doc.addObject(doc.dict(`/Type /Pages\n/Kids [${kidsRefs2}]\n/Count ${pb.pages.length}`));

  // 3: Font Resource → /F1 4 0 R  /F2 5 0 R  /F3 6 0 R
  doc.addObject(doc.dict('/Font <<\n  /F1 4 0 R\n  /F2 5 0 R\n  /F3 6 0 R\n>>'));

  // 4: F1 = STSong-Light Type0 (built-in CJK font)
  doc.addObject(doc.dict('/Type /Font\n/Subtype /Type0\n/BaseFont /STSong-Light\n/Encoding /UniGB-UCS2-H\n/DescendantFonts [7 0 R]'));

  // 5: F2 = Helvetica
  doc.addObject(doc.dict('/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica'));

  // 6: F3 = Helvetica-Bold
  doc.addObject(doc.dict('/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica-Bold'));

  // 7: CIDFont for F1 → FontDescriptor 8 0 R
  doc.addObject(doc.dict('/Type /Font\n/Subtype /CIDFontType0\n/BaseFont /STSong-Light\n/CIDSystemInfo <<\n  /Registry (Adobe)\n  /Ordering (GB1)\n  /Supplement 2\n>>\n/FontDescriptor 8 0 R'));

  // 8: FontDescriptor
  doc.addObject(doc.dict('/Type /FontDescriptor\n/FontName /STSong-Light\n/Flags 32\n/FontBBox [-100 -300 1000 900]\n/ItalicAngle 0\n/Ascent 800\n/Descent -200\n/CapHeight 700\n/StemV 80'));

  // 9-10: Template image XObjects (logo + search graphic)
  doc.addObject(`<<
  /Type /XObject
  /Subtype /Image
  /Width ${PDF_LOGO_IMAGE.width}
  /Height ${PDF_LOGO_IMAGE.height}
  /ColorSpace /DeviceRGB
  /BitsPerComponent 8
  /Filter [/ASCIIHexDecode /FlateDecode]
  /Length ${PDF_LOGO_IMAGE.hex.length + 1}
>>
stream
${PDF_LOGO_IMAGE.hex}>
endstream`);

  doc.addObject(`<<
  /Type /XObject
  /Subtype /Image
  /Width ${PDF_SEARCH_IMAGE.width}
  /Height ${PDF_SEARCH_IMAGE.height}
  /ColorSpace /DeviceRGB
  /BitsPerComponent 8
  /Filter [/ASCIIHexDecode /FlateDecode]
  /Length ${PDF_SEARCH_IMAGE.hex.length + 1}
>>
stream
${PDF_SEARCH_IMAGE.hex}>
endstream`);

  // 11+: Content streams + Page objects (pair per page)
  pb.pages.forEach((p, i) => {
    const contentOps = p.stream.getContent();
    const contentObjId = doc.objects.length + 1;

    // Content stream
    doc.addObject(`<<\n  /Length ${utf8ByteLength(contentOps)}\n>>\nstream\n${contentOps}\nendstream`);

    // Page → Font resources + template images
    doc.addObject(doc.dict(`/Type /Page\n/Parent 2 0 R\n/Resources <<\n  /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >>\n  /XObject << /ImLogo 9 0 R /ImSearch 10 0 R >>\n>>\n/MediaBox [0 0 ${PAGE_W} ${PAGE_H}]\n/Contents ${contentObjId} 0 R`));
  });

  return doc.build();
}

function generatePDF(record, projectName = '') {
  return new Promise((resolve, reject) => {
    try {
      const pdfText = buildPdfData(record, projectName);
      const arrayBuffer = stringToArrayBuffer(pdfText);
      resolve(arrayBuffer);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generatePDF: generatePDF,
  STAGE_NAMES: STAGE_NAMES,
  STAGE_COLORS: STAGE_COLORS
};
