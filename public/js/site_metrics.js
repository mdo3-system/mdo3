/**
 * public/js/site_metrics.js
 * 
 * mdo3 ツール数・サイトメトリクス自動同期スクリプト
 * - tools_data.js (MDO3_TOOLS_CATALOG) が読み込まれている場合はその実数を動的に取得
 * - 未読込のページ（404.html / master-program.html 等）でも sync_tool_counts.js で自動更新された定数を適用
 * - [data-mdo3-tool-count] 属性要素およびタイトル・ラベル等を自動書き換え
 */
(function () {
  var SYNCED_TOOL_COUNT = 32;

  function getToolCount() {
    if (typeof MDO3_TOOLS_CATALOG !== 'undefined' && Array.isArray(MDO3_TOOLS_CATALOG) && MDO3_TOOLS_CATALOG.length > 0) {
      return MDO3_TOOLS_CATALOG.length;
    }
    return SYNCED_TOOL_COUNT;
  }

  window.MDO3_TOOL_COUNT = getToolCount();

  function applyDynamicCounts() {
    var count = getToolCount();
    window.MDO3_TOOL_COUNT = count;

    // data-mdo3-tool-count 属性の動的更新
    var els = document.querySelectorAll('[data-mdo3-tool-count]');
    for (var i = 0; i < els.length; i++) {
      els[i].textContent = count;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyDynamicCounts);
  } else {
    applyDynamicCounts();
  }
})();
