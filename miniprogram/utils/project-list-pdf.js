/**
 * 项目列表 PDF 导出工具
 * 生成设置页的项目总览清单，便于预览、分享和归档。
 */

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN_L = 42;
const MARGIN_R = 42;
const TOP_Y = 46;
const BOTTOM_Y = 780;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

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
    else { len += 4; i++; }
  }
  return len;
}

function stringToArrayBuffer(str) {
  if (typeof TextEncoder !== 'undefined') {
    const bytes = new TextEncoder().encode(str);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) {
      bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
    } else if (code < 0xD800 || code >= 0xE000) {
      bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
    } else {
      i++;
      const code2 = str.charCodeAt(i);
      const cp = 0x10000 + ((code - 0xD800) << 10) + (code2 - 0xDC00);
      bytes.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
    }
  }
  const buf = new ArrayBuffer(bytes.length);
  const view = new Uint8Array(buf);
  bytes.forEach((byte, index) => { view[index] = byte; });
  return buf;
}

function fmtDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}年${m}月${d}日`;
}

function fmtDateTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${fmtDate(date)} ${h}:${min}`;
}

function fmtNumber(num) {
  const n = Number(num || 0);
  const parts = n.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

function shortText(text, maxUnits) {
  const str = String(text || '');
  let units = 0;
  let output = '';
  for (let i = 0; i < str.length; i++) {
    const weight = str.charCodeAt(i) > 255 ? 1 : 0.55;
    if (units + weight > maxUnits) return output + '...';
    output += str[i];
    units += weight;
  }
  return output || '-';
}

function pdfTextWidth(str, size) {
  let w = 0;
  const text = String(str || '');
  for (let i = 0; i < text.length; i++) {
    w += size * (text.charCodeAt(i) > 255 ? 1 : 0.55);
  }
  return w;
}

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
    return `<<\n${String(content || '').trim()}\n>>`;
  }

  toPdfHexString(str) {
    let hex = '';
    const text = String(str === undefined || str === null ? '' : str);
    for (let i = 0; i < text.length; i++) {
      hex += text.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase();
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
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += 'trailer\n<<\n';
    pdf += `  /Size ${this.objects.length + 1}\n`;
    pdf += '  /Root 1 0 R\n';
    pdf += '>>\nstartxref\n';
    pdf += `${startxref}\n%%EOF\n`;
    return pdf;
  }
}

class ContentStream {
  constructor(doc) {
    this.doc = doc;
    this.ops = [];
  }

  rect(x, y, w, h, fillColor, strokeColor, lineWidth) {
    const py = PAGE_H - y - h;
    this.ops.push('q');
    if (fillColor) this.ops.push(`${fillColor} rg`);
    if (strokeColor) this.ops.push(`${strokeColor} RG`);
    if (lineWidth) this.ops.push(`${lineWidth} w`);
    this.ops.push(`${x.toFixed(1)} ${py.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re`);
    if (fillColor && strokeColor) this.ops.push('B');
    else if (fillColor) this.ops.push('f');
    else this.ops.push('S');
    this.ops.push('Q');
  }

  line(x1, y1, x2, y2, color, width) {
    this.ops.push('q');
    this.ops.push(`${color || '0 0 0'} RG`);
    this.ops.push(`${width || 0.5} w`);
    this.ops.push(`${x1.toFixed(1)} ${(PAGE_H - y1).toFixed(1)} m`);
    this.ops.push(`${x2.toFixed(1)} ${(PAGE_H - y2).toFixed(1)} l`);
    this.ops.push('S');
    this.ops.push('Q');
  }

  text(str, x, y, font, size, color) {
    const text = String(str === undefined || str === null ? '' : str);
    const hasNonAscii = /[^\x00-\x7F]/.test(text);
    const activeFont = hasNonAscii ? '/F1' : (font || '/F1');
    this.ops.push('BT');
    this.ops.push(`${color || '0 0 0'} rg`);
    this.ops.push(`${activeFont} ${size || 10} Tf`);
    this.ops.push(`${x.toFixed(1)} ${(PAGE_H - y).toFixed(1)} Td`);
    if (activeFont === '/F1') {
      this.ops.push(`${this.doc.toPdfHexString(text)} Tj`);
    } else {
      this.ops.push(`(${text.replace(/[()\\]/g, '\\$&')}) Tj`);
    }
    this.ops.push('ET');
  }

  textRight(str, xRight, y, font, size, color) {
    const text = String(str === undefined || str === null ? '' : str);
    this.text(text, xRight - pdfTextWidth(text, size || 10), y, font, size, color);
  }

  textCentered(str, x, width, y, font, size, color) {
    const text = String(str === undefined || str === null ? '' : str);
    this.text(text, x + (width - pdfTextWidth(text, size || 10)) / 2, y, font, size, color);
  }

  getContent() {
    return this.ops.join('\n');
  }
}

function buildFooter(stream, pageNum) {
  stream.line(MARGIN_L, 800, PAGE_W - MARGIN_R, 800, '0.88 0.90 0.93', 0.5);
  stream.text(`第 ${pageNum} 页`, MARGIN_L, 818, '/F1', 7.5, '0.55 0.61 0.68');
  stream.text('由「易计算」生成 · 1+H ARCH', 232, 818, '/F1', 7.5, '0.55 0.61 0.68');
}

function drawHeader(stream, exportTime, pageNum) {
  stream.rect(0, 0, PAGE_W, 7, '0.06 0.15 0.27');
  stream.text('1+H ARCH · 易计算', MARGIN_L, TOP_Y, '/F1', 10, '0.06 0.15 0.27');
  stream.textRight(fmtDateTime(exportTime), PAGE_W - MARGIN_R, TOP_Y, '/F1', 8.5, '0.45 0.50 0.56');
  stream.text('项目列表', MARGIN_L, TOP_Y + 34, '/F1', 21, '0.05 0.11 0.21');
  stream.text('Project Portfolio Export', MARGIN_L, TOP_Y + 54, '/F2', 8.5, '0.45 0.50 0.56');
  stream.line(MARGIN_L, TOP_Y + 72, PAGE_W - MARGIN_R, TOP_Y + 72, '0.87 0.90 0.93', 0.6);
  buildFooter(stream, pageNum);
  return TOP_Y + 92;
}

function drawSummary(stream, y, summary) {
  const gap = 10;
  const cardW = (CONTENT_W - gap * 3) / 4;
  const cards = [
    { label: '项目总数', value: `${summary.projectCount}` },
    { label: '计算子项', value: `${summary.itemCount}` },
    { label: '取费合计', value: `${fmtNumber(summary.totalFee)} 万元` },
    { label: '服务次数', value: `${summary.usageCount}` }
  ];

  cards.forEach((card, index) => {
    const x = MARGIN_L + index * (cardW + gap);
    stream.rect(x, y, cardW, 54, '0.96 0.98 1.00', '0.86 0.90 0.95', 0.5);
    stream.text(card.label, x + 12, y + 18, '/F1', 8.5, '0.42 0.48 0.55');
    stream.text(shortText(card.value, 11), x + 12, y + 40, '/F1', 12, '0.05 0.11 0.21');
  });
  return y + 76;
}

function drawTableHeader(stream, y) {
  stream.rect(MARGIN_L, y, CONTENT_W, 24, '0.08 0.18 0.31');
  const cols = [
    { text: '序号', x: MARGIN_L + 10 },
    { text: '项目名称', x: MARGIN_L + 44 },
    { text: '阶段', x: MARGIN_L + 270 },
    { text: '子项', x: MARGIN_L + 322 },
    { text: '取费合计（万元）', x: MARGIN_L + 380 },
    { text: '更新时间', x: MARGIN_L + 470 }
  ];
  cols.forEach(col => {
    stream.text(col.text, col.x, y + 16, '/F1', 8.5, '1 1 1');
  });
  return y + 24;
}

function drawProjectRow(stream, y, project, index, alt) {
  const rowH = 30;
  if (alt) stream.rect(MARGIN_L, y, CONTENT_W, rowH, '0.98 0.99 1.00');
  stream.line(MARGIN_L, y + rowH, PAGE_W - MARGIN_R, y + rowH, '0.91 0.93 0.95', 0.45);
  stream.text(String(index + 1), MARGIN_L + 12, y + 19, '/F2', 8.5, '0.18 0.24 0.31');
  stream.text(shortText(project.name || '未命名项目', 22), MARGIN_L + 44, y + 19, '/F1', 9, '0.05 0.11 0.21');
  stream.textCentered(String(project.stageCount || 0), MARGIN_L + 260, 48, y + 19, '/F2', 8.5, '0.18 0.24 0.31');
  stream.textCentered(String(project.itemCount || 0), MARGIN_L + 314, 42, y + 19, '/F2', 8.5, '0.18 0.24 0.31');
  stream.textRight(fmtNumber(project.totalFee || 0), MARGIN_L + 454, y + 19, '/F2', 8.5, '0.05 0.11 0.21');
  stream.text(shortText(project.updatedAt ? fmtDate(new Date(project.updatedAt)) : '-', 10), MARGIN_L + 470, y + 19, '/F1', 8.5, '0.32 0.38 0.45');
  return y + rowH;
}

function buildProjectListPdf(projects, options) {
  const doc = new PDFDocument();
  const exportTime = new Date();
  const list = Array.isArray(projects) ? projects : [];
  const summary = Object.assign({
    projectCount: list.length,
    itemCount: list.reduce((sum, p) => sum + Number(p.itemCount || 0), 0),
    totalFee: list.reduce((sum, p) => sum + Number(p.totalFee || 0), 0),
    usageCount: 0
  }, options && options.summary ? options.summary : {});

  const pages = [];
  let stream = new ContentStream(doc);
  let pageNum = 1;
  let y = drawHeader(stream, exportTime, pageNum);
  y = drawSummary(stream, y, summary);

  stream.text('项目明细', MARGIN_L, y, '/F1', 12, '0.05 0.11 0.21');
  y += 16;
  y = drawTableHeader(stream, y);

  if (list.length === 0) {
    stream.rect(MARGIN_L, y, CONTENT_W, 90, '0.98 0.99 1.00', '0.90 0.92 0.95', 0.5);
    stream.textCentered('暂无项目数据', MARGIN_L, CONTENT_W, y + 42, '/F1', 12, '0.45 0.50 0.56');
    stream.textCentered('完成计算并保存到项目后，将在此处生成项目列表。', MARGIN_L, CONTENT_W, y + 64, '/F1', 8.5, '0.55 0.61 0.68');
  } else {
    list.forEach((project, index) => {
      if (y + 38 > BOTTOM_Y) {
        pages.push(stream);
        stream = new ContentStream(doc);
        pageNum += 1;
        y = drawHeader(stream, exportTime, pageNum);
        y = drawTableHeader(stream, y);
      }
      y = drawProjectRow(stream, y, project, index, index % 2 === 1);
    });
  }
  pages.push(stream);

  doc.addObject(doc.dict('/Type /Catalog\n/Pages 2 0 R'));
  const pageObjIds = pages.map((_, i) => 10 + i * 2);
  doc.addObject(doc.dict(`/Type /Pages\n/Kids [${pageObjIds.map(id => `${id} 0 R`).join(' ')}]\n/Count ${pages.length}`));
  doc.addObject(doc.dict('/Font <<\n  /F1 4 0 R\n  /F2 5 0 R\n>>'));
  doc.addObject(doc.dict('/Type /Font\n/Subtype /Type0\n/BaseFont /STSong-Light\n/Encoding /UniGB-UCS2-H\n/DescendantFonts [6 0 R]'));
  doc.addObject(doc.dict('/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica'));
  doc.addObject(doc.dict('/Type /Font\n/Subtype /CIDFontType2\n/BaseFont /STSong-Light\n/CIDSystemInfo <<\n  /Registry (Adobe)\n  /Ordering (GB1)\n  /Supplement 4\n>>\n/FontDescriptor 7 0 R'));
  doc.addObject(doc.dict('/Type /FontDescriptor\n/FontName /STSong-Light\n/Flags 32\n/FontBBox [-100 -300 1000 900]\n/ItalicAngle 0\n/Ascent 800\n/Descent -200\n/CapHeight 700\n/StemV 80'));
  doc.addObject(doc.dict('/Producer (YiCalc)\n/Creator (YiCalc Mini Program)'));

  pages.forEach(pageStream => {
    const content = pageStream.getContent();
    const contentObjId = doc.objects.length + 1;
    doc.addObject(`<<\n  /Length ${utf8ByteLength(content)}\n>>\nstream\n${content}\nendstream`);
    doc.addObject(doc.dict(`/Type /Page\n/Parent 2 0 R\n/Resources 3 0 R\n/MediaBox [0 0 ${PAGE_W} ${PAGE_H}]\n/Contents ${contentObjId} 0 R`));
  });

  return doc.build();
}

function generateProjectListPDF(projects, options) {
  return new Promise((resolve, reject) => {
    try {
      resolve(stringToArrayBuffer(buildProjectListPdf(projects, options || {})));
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateProjectListPDF
};
