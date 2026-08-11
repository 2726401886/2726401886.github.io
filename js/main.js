/* ===========================
   效率盒子 - 共享脚本
   =========================== */

// 工具列表数据（用于首页和相关工具渲染）
const TOOLS = [
  { id: "word-counter", name: "字数统计", icon: "W", desc: "统计字符、单词、行数", path: "tools/word-counter.html" },
  { id: "qr-generator", name: "二维码生成", icon: "Q", desc: "生成自定义二维码", path: "tools/qr-generator.html" },
  { id: "password-generator", name: "密码生成器", icon: "P", desc: "生成安全随机密码", path: "tools/password-generator.html" },
  { id: "json-formatter", name: "JSON格式化", icon: "J", desc: "美化、压缩、验证JSON", path: "tools/json-formatter.html" },
  { id: "timestamp-converter", name: "时间戳转换", icon: "T", desc: "Unix时间戳与日期互转", path: "tools/timestamp-converter.html" },
  { id: "base64", name: "Base64编解码", icon: "B", desc: "Base64编码与解码", path: "tools/base64.html" },
  { id: "color-converter", name: "颜色转换器", icon: "C", desc: "HEX/RGB/HSL互转", path: "tools/color-converter.html" },
  { id: "url-encoder", name: "URL编解码", icon: "U", desc: "URL编码与解码", path: "tools/url-encoder.html" },
  { id: "calculator", name: "在线计算器", icon: "C", desc: "科学计算器，支持复杂表达式", path: "tools/calculator.html" },
  { id: "number-converter", name: "进制转换", icon: "N", desc: "二进制/八进制/十进制/十六进制互转", path: "tools/number-converter.html" },
  { id: "unit-converter", name: "单位换算", icon: "U2", desc: "长度/重量/温度/面积等单位换算", path: "tools/unit-converter.html" },
  { id: "image-compressor", name: "图片压缩", icon: "I", desc: "在线压缩图片，支持JPG/PNG", path: "tools/image-compressor.html" },
  { id: "text-diff", name: "文本对比", icon: "D", desc: "对比两段文本的差异", path: "tools/text-diff.html" },
  { id: "bmi-calculator", name: "BMI计算器", icon: "BM", desc: "计算身体质量指数，判断体重是否健康", path: "tools/bmi-calculator.html" },
  { id: "date-calculator", name: "日期计算器", icon: "DT", desc: "计算日期差值、日期加减天数", path: "tools/date-calculator.html" },
  { id: "regex-tester", name: "正则表达式测试", icon: "R", desc: "在线测试正则，实时高亮匹配", path: "tools/regex-tester.html" },
  { id: "uuid-generator", name: "UUID生成器", icon: "UI", desc: "批量生成UUID v4唯一标识符", path: "tools/uuid-generator.html" },
  { id: "markdown-editor", name: "Markdown编辑器", icon: "MD", desc: "在线编写Markdown，实时预览", path: "tools/markdown-editor.html" },
  { id: "vehicle-age", name: "机动车年限计算", icon: "V", desc: "车辆报废年限查询、已使用年限计算", path: "tools/vehicle-age.html" },
  { id: "bazi", name: "八字排盘", icon: "八字", desc: "四柱八字排盘、大运流年、十神神煞、刑冲合害", path: "tools/bazi.html" },
  { id: "zeri", name: "红白喜事择日", icon: "择", desc: "婚嫁安葬吉日查询、十二建星、三娘煞重丧日检测", path: "tools/zeri.html" },
  { id: "mortgage-calculator", name: "房贷计算器", icon: "贷", desc: "等额本息/等额本金月供计算、还款明细", path: "tools/mortgage-calculator.html" },
  { id: "tax-calculator", name: "个税计算器", icon: "税", desc: "2024个税累进税率、税后工资计算", path: "tools/tax-calculator.html" },
  { id: "age-calculator", name: "年龄计算器", icon: "龄", desc: "精确计算年龄到天、星座生肖查询", path: "tools/age-calculator.html" },
  { id: "id-card-validator", name: "身份证校验", icon: "证", desc: "身份证验证、归属地生日性别提取", path: "tools/id-card-validator.html" },
  { id: "pinyin-converter", name: "汉字转拼音", icon: "拼", desc: "汉字转带声调拼音、多音字支持", path: "tools/pinyin-converter.html" },
  { id: "simplified-traditional", name: "繁简转换", icon: "繁", desc: "简体繁体中文在线互转", path: "tools/simplified-traditional.html" },
  { id: "hash-generator", name: "Hash加密", icon: "密", desc: "MD5/SHA1/SHA256/SHA512在线加密", path: "tools/hash-generator.html" },
  { id: "http-status", name: "HTTP状态码", icon: "码", desc: "HTTP状态码含义速查表", path: "tools/http-status.html" },
  { id: "price-assessment", name: "价格鉴证评估", icon: "鉴", desc: "市场法/成本法/收益法计算、报告清单", path: "tools/price-assessment.html" },
  { id: "used-car-eval", name: "二手车鉴定评估", icon: "车", desc: "GB/T 30323 技术状况鉴定、评分与价值评估", path: "tools/used-car-eval.html" },
  { id: "name-generator", name: "起名工具", icon: "名", desc: "八字五行·五格数理·三才，人名/公司起名与测名", path: "tools/name-generator.html" },
];

// 渲染首页工具网格
function renderToolGrid(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = TOOLS.map(tool => `
    <a href="${tool.path}" class="tool-card">
      <div class="tool-card-icon">${tool.icon}</div>
      <h3>${tool.name}</h3>
      <p>${tool.desc}</p>
    </a>
  `).join("");
}

// 渲染相关工具（排除当前工具）
function renderRelatedTools(containerId, currentToolId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const related = TOOLS.filter(t => t.id !== currentToolId);
  container.innerHTML = related.map(tool => `
    <a href="../${tool.path}">${tool.name}</a>
  `).join("");
}

// Toast 提示
function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

// 复制到剪贴板
function copyToClipboard(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    showToast("已复制到剪贴板");
    if (button) {
      const originalText = button.textContent;
      button.textContent = "已复制";
      setTimeout(() => button.textContent = originalText, 1500);
    }
  }).catch(() => {
    // 降级方案
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      showToast("已复制到剪贴板");
    } catch (e) {
      showToast("复制失败，请手动复制");
    }
    document.body.removeChild(textarea);
  });
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", () => {
  renderToolGrid("tool-grid");
});
