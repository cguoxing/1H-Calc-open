const fs = require('fs');
const path = require('path');

const root = __dirname;
const mini = path.join(root, 'miniprogram');
const app = JSON.parse(fs.readFileSync(path.join(mini, 'app.json'), 'utf8'));
const errors = [];
const warnings = [];

function exists(filePath) {
  return fs.existsSync(filePath);
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const filePath = path.join(dir, name);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath, out);
    } else {
      out.push(filePath);
    }
  }
  return out;
}

for (const page of app.pages) {
  for (const ext of ['.js', '.json', '.wxml', '.wxss']) {
    const filePath = path.join(mini, page + ext);
    if (!exists(filePath)) {
      errors.push(`Missing page file: ${page}${ext}`);
    }
  }
}

const pageSet = new Set(app.pages.map(page => '/' + page));
const tabSet = new Set((app.tabBar && app.tabBar.list || []).map(item => '/' + item.pagePath));

for (const item of app.tabBar && app.tabBar.list || []) {
  for (const key of ['iconPath', 'selectedIconPath']) {
    const filePath = path.join(mini, item[key]);
    if (!exists(filePath)) {
      errors.push(`Missing tab icon: ${item[key]}`);
    }
  }
}

const jsFiles = walk(mini).filter(filePath => filePath.endsWith('.js'));
for (const filePath of jsFiles) {
  const text = fs.readFileSync(filePath, 'utf8');
  for (const match of text.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
    const spec = match[1];
    if (!spec.startsWith('.')) continue;
    const base = path.resolve(path.dirname(filePath), spec);
    const candidates = [base, base + '.js', base + '.json', path.join(base, 'index.js')];
    if (!candidates.some(exists)) {
      errors.push(`Unresolved require in ${path.relative(root, filePath)}: ${spec}`);
    }
  }

  for (const match of text.matchAll(/url:\s*['"]([^'"]+)['"]/g)) {
    const raw = match[1];
    if (!raw.startsWith('/pages/')) continue;
    const page = raw.split('?')[0];
    if (!pageSet.has(page)) {
      errors.push(`Navigation target not in app.json from ${path.relative(root, filePath)}: ${raw}`);
    }
    const context = text.slice(Math.max(0, match.index - 80), match.index);
    if (tabSet.has(page) && context.includes('navigateTo')) {
      warnings.push(`navigateTo used for tab page near ${path.relative(root, filePath)}: ${raw}`);
    }
  }
}

const assetRefs = [];
for (const filePath of walk(mini).filter(file => /\.(wxml|wxss|js|json)$/.test(file))) {
  const text = fs.readFileSync(filePath, 'utf8');
  for (const match of text.matchAll(/['"]([^'"]*(?:images|\.\.\/\.\.\/images|\/images)\/[^'"\s)]+)['"]/g)) {
    assetRefs.push([filePath, match[1]]);
  }
}

for (const [filePath, ref] of assetRefs) {
  if (ref.includes('{{')) continue;
  let resolved;
  if (ref.startsWith('/')) {
    resolved = path.join(mini, ref.slice(1));
  } else if (ref.startsWith('images/')) {
    resolved = path.join(mini, ref);
  } else {
    resolved = path.resolve(path.dirname(filePath), ref);
  }
  if (!exists(resolved)) {
    errors.push(`Missing asset from ${path.relative(root, filePath)}: ${ref}`);
  }
}

// WXML 事件绑定必须在对应 JS 中有同名方法（含从 utils 引入后挂载的方法，如 onGoHome）
for (const page of app.pages.concat(['custom-tab-bar/index'])) {
  const wxmlPath = path.join(mini, page + '.wxml');
  const jsPath = path.join(mini, page + '.js');
  if (!exists(wxmlPath) || !exists(jsPath)) continue;
  const wxml = fs.readFileSync(wxmlPath, 'utf8');
  const js = fs.readFileSync(jsPath, 'utf8');
  const handlers = new Set();
  const re = /(?:bind|catch|capture-bind|capture-catch|mut-bind):?[a-z]+="([A-Za-z_$][\w$]*)"/g;
  let m;
  while ((m = re.exec(wxml))) handlers.add(m[1]);
  for (const h of handlers) {
    const defined = new RegExp('(^|[\\s{,])' + h + '\\s*(:|\\(|,|\\n|\\})', 'm').test(js);
    if (!defined) errors.push(`Missing event handler ${h} in ${page}.js (bound in ${page}.wxml)`);
  }
}

console.log(`Checked ${app.pages.length} app pages, ${jsFiles.length} JS files, ${assetRefs.length} asset refs.`);

if (warnings.length) {
  console.log('Warnings:');
  for (const warning of warnings) {
    console.log('- ' + warning);
  }
}

if (errors.length) {
  console.error('Errors:');
  for (const error of errors) {
    console.error('- ' + error);
  }
  process.exit(1);
}

console.log('Project consistency checks passed.');
