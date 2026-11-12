/**
 * scripts/sync_tool_counts.js
 * 
 * Single Source of Truth (public/js/tools_data.js の MDO3_TOOLS_CATALOG) から
 * 最新の登録ツール総数を自動算出し、サイト内の全HTML・メタタグ・JSON-LD・llms.txt 等の
 * ツール数表記を一括同期して更新漏れを防止するビルド/メンテナンススクリプト。
 * 
 * 使用方法: node scripts/sync_tool_counts.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const toolsDataPath = path.join(rootDir, 'public', 'js', 'tools_data.js');

// 1. tools_data.js から正確なツール総数を取得
const toolsCode = fs.readFileSync(toolsDataPath, 'utf8');
const sandbox = {};
vm.runInNewContext(toolsCode + '\nthis.CATALOG = MDO3_TOOLS_CATALOG;', sandbox);
const catalog = sandbox.CATALOG;

if (!Array.isArray(catalog) || catalog.length === 0) {
  console.error('❌ Error: MDO3_TOOLS_CATALOG could not be loaded from tools_data.js');
  process.exit(1);
}

const TOTAL_COUNT = catalog.length;
console.log(`✅ Single Source of Truth (tools_data.js): ${TOTAL_COUNT} ツールを検出`);

// 2. 同期対象ファイルの収集
const targetFiles = [];

function collectFiles(dir, exts) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['assets', 'app', 'css', 'node_modules'].includes(entry.name)) continue;
      collectFiles(fullPath, exts);
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      targetFiles.push(fullPath);
    }
  }
}

// public 直下の html/txt/js
for (const entry of fs.readdirSync(path.join(rootDir, 'public'), { withFileTypes: true })) {
  const fullPath = path.join(rootDir, 'public', entry.name);
  if (entry.isFile() && /\.(html|txt)$/.test(entry.name)) {
    targetFiles.push(fullPath);
  }
}
// public/tools/*.html
collectFiles(path.join(rootDir, 'public', 'tools'), ['.html']);
// site_metrics.js & stripe script & tools_data.js
const siteMetricsPath = path.join(rootDir, 'public', 'js', 'site_metrics.js');
if (fs.existsSync(siteMetricsPath)) targetFiles.push(siteMetricsPath);
targetFiles.push(toolsDataPath);
const stripeRegPath = path.join(rootDir, 'scripts', 'register_master_program_stripe.php');
if (fs.existsSync(stripeRegPath)) targetFiles.push(stripeRegPath);

// 3. 安全かつ確実な置換ルール（全体総数のみを対象とし、カテゴリ別件数や「基本⑥ツールパック」には触れない）
const replacePatterns = [
  // 「全30ツール」「全31ツール」「全32ツール」などの総数表記
  { regex: /全\d{2}ツール/g, replacement: `全${TOTAL_COUNT}ツール` },
  // 「構造ツール (29)」などの総数表記
  { regex: /構造ツール\s*\(\d+\)/g, replacement: `構造ツール (${TOTAL_COUNT})` },
  // 「全29構造計算ツール」など
  { regex: /全\d{2}構造計算ツール/g, replacement: `全${TOTAL_COUNT}構造計算ツール` },
  // 「全31計算ツール」など
  { regex: /全\d{2}計算ツール/g, replacement: `全${TOTAL_COUNT}計算ツール` },
  // 「全29の計算エンジン」「全29の構造計算・実務ツール」など
  { regex: /全\d{2}の(計算|構造)/g, replacement: `全${TOTAL_COUNT}の$1` },
  // 「data-mdo3-tool-count>XX<」タグ内の数値
  { regex: /(<span[^>]*data-mdo3-tool-count[^>]*>)\d+(<\/span>)/g, replacement: `$1${TOTAL_COUNT}$2` },
  // site_metrics.js の SYNCED_TOOL_COUNT
  { regex: /(var SYNCED_TOOL_COUNT\s*=\s*)\d+;/g, replacement: `$1${TOTAL_COUNT};` }
];

let updatedFileCount = 0;
let totalReplacements = 0;

for (const filePath of targetFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let fileHits = 0;

  for (const rule of replacePatterns) {
    content = content.replace(rule.regex, (...args) => {
      const match = args[0];
      let replaced = rule.replacement;
      if (typeof replaced === 'string' && replaced.includes('$1')) {
        replaced = match.replace(rule.regex, rule.replacement);
      }
      if (match !== replaced) {
        fileHits++;
      }
      return replaced;
    });
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    const rel = path.relative(rootDir, filePath);
    console.log(`  🔄 Updated [${rel}] (${fileHits} 箇所を ${TOTAL_COUNT} に統一)`);
    updatedFileCount++;
    totalReplacements += fileHits;
  }
}

console.log(`\n🎉 完了: ${updatedFileCount} ファイル / 計 ${totalReplacements} 箇所を「${TOTAL_COUNT}ツール」に自動同期しました。`);
