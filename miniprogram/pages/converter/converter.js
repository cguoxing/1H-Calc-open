const { onGoHome } = require("../../utils/goHome");
// 各分类的单位定义（以 baseUnit 为基准，rate 表示 1 baseUnit = rate 目标单位）
const CATEGORY_DEFS = {
  length: {
    units: [
      { name: '毫米', symbol: 'mm', rate: 1000 },
      { name: '厘米', symbol: 'cm', rate: 100 },
      { name: '分米', symbol: 'dm', rate: 10 },
      { name: '米', symbol: 'm', rate: 1 },
      { name: '千米 (公里)', symbol: 'km', rate: 0.001 },
      { name: '英寸', symbol: 'in', rate: 39.3701 },
      { name: '英尺', symbol: 'ft', rate: 3.28084 }
    ],
    fractionDigits: 4
  },
  area: {
    units: [
      { name: '平方厘米', symbol: 'cm²', rate: 10000 },
      { name: '平方分米', symbol: 'dm²', rate: 100 },
      { name: '平方米', symbol: 'm²', rate: 1 },
      { name: '公顷', symbol: 'ha', rate: 0.0001 },
      { name: '市亩', symbol: '亩', rate: 0.0015 },
      { name: '平方公里', symbol: 'km²', rate: 0.000001 }
    ],
    fractionDigits: 6
  },
  volume: {
    units: [
      { name: '立方厘米', symbol: 'cm³', rate: 1000000 },
      { name: '毫升', symbol: 'ml', rate: 1000000 },
      { name: '升', symbol: 'L', rate: 1000 },
      { name: '立方米', symbol: 'm³', rate: 1 },
      { name: '立方英尺', symbol: 'ft³', rate: 35.3147 }
    ],
    fractionDigits: 4
  },
  angle: {
    units: [
      { name: '度', symbol: '°', rate: 1 },
      { name: '弧度', symbol: 'rad', rate: 0.0174533 },
      { name: '梯度', symbol: 'grad', rate: 1.11111 },
      { name: '角分', symbol: '′', rate: 60 },
      { name: '角秒', symbol: '″', rate: 3600 },
      { name: '毫弧度', symbol: 'mrad', rate: 17.4533 }
    ],
    fractionDigits: 6
  },
  power: {
    units: [
      { name: '瓦特', symbol: 'W', rate: 1 },
      { name: '千瓦', symbol: 'kW', rate: 0.001 },
      { name: '兆瓦', symbol: 'MW', rate: 1e-6 },
      { name: '公制马力', symbol: 'hp', rate: 0.0013596 },
      { name: '英制马力', symbol: 'bhp', rate: 0.001341 },
      { name: '公斤力·米/秒', symbol: 'kgf·m/s', rate: 0.10197 },
      { name: '千卡/小时', symbol: 'kcal/h', rate: 0.8598 },
      { name: '英热单位/时', symbol: 'BTU/h', rate: 3.412 }
    ],
    fractionDigits: 6
  },
  radix: {
    units: [
      { name: '二进制', symbol: 'BIN' },
      { name: '八进制', symbol: 'OCT' },
      { name: '十进制', symbol: 'DEC' },
      { name: '十六进制', symbol: 'HEX' }
    ],
    fractionDigits: 0
  }
};

Page({
  onGoHome,
  data: {
    inputValue: '1',
    currentCategory: 'length',
    inputUnitIndex: 0,   // 当前选中的输入单位索引
    inputUnits: [],       // 当前分类的单位列表（用于picker）
    results: []
  },

  onLoad: function () {
    this.initCategory();
    this.recalc();
  },

  // 初始化/切换分类时更新输入单位列表
  initCategory: function () {
    const cat = this.data.currentCategory;
    const def = CATEGORY_DEFS[cat];
    if (!def) return;
    this.setData({
      inputUnitIndex: 0,
      inputUnits: def.units
    });
  },

  onValueInput: function (e) {
    this.setData({ inputValue: e.detail.value }, () => this.recalc());
  },

  // 输入单位选择器变化
  onInputUnitChange: function (e) {
    const idx = parseInt(e.detail.value);
    this.setData({ inputUnitIndex: idx }, () => this.recalc());
  },

  onCategoryChange: function (e) {
    const cat = e.currentTarget.dataset.cat;
    this.setData({ currentCategory: cat }, () => {
      this.initCategory();
      this.recalc();
    });
  },

  recalc: function () {
    const val = parseFloat(this.data.inputValue);
    if (isNaN(val)) {
      this.setData({ results: [] });
      return;
    }

    const cat = this.data.currentCategory;
    const def = CATEGORY_DEFS[cat];
    if (!def) return;

    const units = def.units;
    const fracDigits = def.fractionDigits;
    const inputIdx = this.data.inputUnitIndex;

    // 进制特殊处理
    if (cat === 'radix') {
      const intVal = isNaN(val) ? 0 : Math.round(val);
      let decVal = intVal;
      const inputSymbol = units[inputIdx].symbol;
      if (inputSymbol === 'BIN') decVal = parseInt(String(intVal), 2) || 0;
      else if (inputSymbol === 'OCT') decVal = parseInt(String(intVal), 8) || 0;
      else if (inputSymbol === 'HEX') decVal = parseInt(String(intVal), 16) || 0;

      const list = units
        .filter((_, i) => i !== inputIdx)
        .map((u) => {
          let displayVal;
          if (u.symbol === 'BIN') displayVal = decVal.toString(2);
          else if (u.symbol === 'OCT') displayVal = decVal.toString(8);
          else if (u.symbol === 'DEC') displayVal = decVal.toString(10);
          else if (u.symbol === 'HEX') displayVal = decVal.toString(16).toUpperCase();
          return { name: u.name, symbol: u.symbol, value: displayVal };
        });

      this.setData({ results: list });
      return;
    }

    const inputRate = units[inputIdx].rate;

    const list = units
      .filter((_, i) => i !== inputIdx)
      .map((u) => ({
        name: u.name,
        symbol: u.symbol,
        value: ((val / inputRate) * u.rate).toLocaleString('zh-CN', { maximumFractionDigits: fracDigits })
      }));

    this.setData({ results: list });
  }
});
