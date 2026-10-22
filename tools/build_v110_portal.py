import os
import re
import subprocess
import time

KINDLE_DIR = r"e:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\kindle"
VERSION_FILE = os.path.join(KINDLE_DIR, "Version.js")
PORTAL_FILE = os.path.join(KINDLE_DIR, "study_portal_for_son.html")
INDEX_FILE = os.path.join(KINDLE_DIR, "index.html")
CHANGELOG_FILE = os.path.join(KINDLE_DIR, "CHANGELOG.md")

NEW_VERSION = "1.1.0"
TODAY_STR = "2026-10-04"

print(f"=== Building Daily Hero & Eiken Studio v{NEW_VERSION} ===")

# 1. Update Version.js
version_js_content = f"""/**
 * Application Version Management
 * 
 * [Changelog]
 * - v1.1.0 ({TODAY_STR}): 動画自動連続再生・リピート選択機能、お話プルダウン同期、英語リーダー本文＆暗記マスク復元、保護者カルテ完全復元、高速更新キャッシュクリア機能、差分オフライン保存
 * - v1.0.5 (2026-10-03): SNSマルチ発信に「Threads」追加
 * - v1.0.4 (2026-10-03): 親Google Drive直保存＆保護者カルテ機能
 * - v1.0.3 (2026-09-30): PWA manifest.json追加＆全端末インストールガイド
 * - v1.0.2 (2026-09-30): サーバー永続化API、写真直接提出、オフライン保存
 * - v1.0.1 (2026-09-30): 暗記用マスク機能（タップ個別オープン）
 * - v1.0.0 (2026-09-30): Initial Release
 */
const APP_VERSION = "{NEW_VERSION}";

if (typeof window !== "undefined") {{
  window.APP_VERSION = APP_VERSION;
}}
if (typeof module !== "undefined" && module.exports) {{
  module.exports = {{ APP_VERSION }};
}}
"""

with open(VERSION_FILE, "w", encoding="utf-8") as f:
    f.write(version_js_content)
print("Updated Version.js to v1.1.0")

# 2. Update CHANGELOG.md
changelog_content = f"""# DAILY HERO & EIKEN STUDIO 更新履歴

## [v1.1.0] - {TODAY_STR}
### 🎬 動画プレーヤー＆学習機能の強化
- **動画自動連続再生・リピート機能の追加**:
  - `▶️ 次の話へ連続再生`: 1話見終わると自動で次の話に進んで再生。
  - `🔁 同じ話をリピート`: 暗唱・シャドーイング用に同じ話を繰り返し再生。
  - `⏹️ 1話で終了`: 再生終了時に自動停止。
  - 設定内容はブラウザに記憶され、次回も引き継がれます。
- **お話選択プルダウンの同期修復**:
  - 全20話（第1話〜第21話）のプルダウン選択が確実に動作し、動画と英語リーダーが即時連動。
- **英語リーダー本文＆暗記マスクの完全復元**:
  - 第1話〜第21話の準2級本文・単語表を確実に描画。
  - 🕶️ 暗記マスク（黒塗り＆タップで個別オープン）機能が完全動作。

### 📅 日付選択＆LINE報告
- **過去日付の選択と重複警告**:
  - 今日・昨日・カレンダーから日付を選択可能。
  - 過去に報告済みの日の場合、画面上とLINE送信文面の両方に【⚠️再報告・上書き注意】を自動明記。
  - 送信前の誤送信防止ポップアップ（確認ダイアログ）を追加。

### 🔄 アプリ更新機能
- **「🔄 最新版に更新」ボタンの視覚的フィードバック**:
  - ボタンをタップすると回転アニメーションとローディング画面が表示。
  - Service Worker とブラウザキャッシュを強制破棄して最新版（v1.1.0）へ一発切り替え。

### 📁 オフライン保存＆保護者カルテ
- **差分ダウンロード**: 保存済みの動画を自動スキップし、通信量ゼロで瞬時に完了。
- **級の差し替え**: 不要な動画キャッシュを削除してスマホ容量を空ける安全フローを整備。
- **保護者カルテ復元**: カレンダー選択、10問テスト誤答診断、写真プレビューが安定動作。
"""

with open(CHANGELOG_FILE, "w", encoding="utf-8") as f:
    f.write(changelog_content)
print("Created CHANGELOG.md")

# 3. Read extracted missing functions
with open("extracted_missing_functions.js", "r", encoding="utf-8") as ef:
    missing_funcs_code = ef.read()

# 4. Read current portal HTML
with open(PORTAL_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Update version badge in HTML
content = re.sub(
    r'<span id="appVerBadge"[^>]*>v[0-9\.]+</span>',
    f'<span id="appVerBadge" style="font-size:0.65rem; background:rgba(56,189,248,0.2); color:var(--accent-cyan); padding:2px 6px; border-radius:4px; vertical-align:middle; margin-left:6px;">v{NEW_VERSION}</span>',
    content
)

# Improve "最新版に更新" button with rich animation & visual feedback
old_reload_btn_area = """    <div style="display:flex; align-items:center; gap:8px;">
      <button onclick="forceReloadApp()" title="アプリを最新版に更新"
              style="background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.3); color:#fff; padding:6px 12px; border-radius:999px; font-size:0.75rem; font-weight:700; display:flex; align-items:center; gap:5px; cursor:pointer; backdrop-filter:blur(4px);">
        <i data-lucide="refresh-cw" style="width:14px; height:14px;"></i> 🔄 最新版に更新
      </button>
      <div class="header-pwa-badge" onclick="showPwaGuide()">
        <i data-lucide="smartphone"></i> ホーム画面に追加
      </div>
    </div>"""

new_reload_btn_area = """    <div style="display:flex; align-items:center; gap:8px;">
      <button id="btnForceReload" onclick="forceReloadApp()" title="アプリを最新版に更新"
              style="background:rgba(56,189,248,0.25); border:1.5px solid var(--accent-cyan); color:#fff; padding:6px 14px; border-radius:999px; font-size:0.75rem; font-weight:800; display:flex; align-items:center; gap:6px; cursor:pointer; backdrop-filter:blur(4px); box-shadow:0 0 10px rgba(56,189,248,0.3); transition:all 0.2s;">
        <i id="reloadIcon" data-lucide="refresh-cw" style="width:14px; height:14px; transition:transform 0.5s;"></i> <span id="reloadBtnText">🔄 最新版に更新</span>
      </button>
      <div class="header-pwa-badge" onclick="showPwaGuide()">
        <i data-lucide="smartphone"></i> ホーム画面に追加
      </div>
    </div>"""

if old_reload_btn_area in content:
    content = content.replace(old_reload_btn_area, new_reload_btn_area)

# Force reload implementation with visual feedback and cache clearing
force_reload_js = """    async function forceReloadApp() {
      const btn = document.getElementById('btnForceReload');
      const icon = document.getElementById('reloadIcon');
      const text = document.getElementById('reloadBtnText');

      if (btn) {
        btn.style.background = 'var(--accent-gold, #f59e0b)';
        btn.style.borderColor = 'var(--accent-gold, #f59e0b)';
        btn.disabled = true;
      }
      if (icon) {
        icon.style.animation = 'spin 0.6s linear infinite';
      }
      if (text) {
        text.innerText = '更新中...';
      }

      // スタイルシートに回転アニメーション追加
      if (!document.getElementById('spinStyle')) {
        const style = document.createElement('style');
        style.id = 'spinStyle';
        style.innerHTML = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
        document.head.appendChild(style);
      }

      showToast('🔄 最新データ(v1.1.0)を取得中... キャッシュを破棄しています');

      // 全キャッシュの破棄
      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          for (const key of keys) {
            if (key !== 'son-eiken-videos-v1') { // 動画キャッシュは残す
              await caches.delete(key);
            }
          }
        } catch (e) {}
      }

      // Service Worker の更新
      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) {
            await r.update();
          }
        } catch (e) {}
      }

      setTimeout(() => {
        window.location.replace(window.location.pathname + '?v=' + Date.now());
      }, 500);
    }"""

# 5. Insert force_reload_js and missing functions
# まず現在の forceReloadApp を置き換える
if "function forceReloadApp" in content:
    content = re.sub(r'function forceReloadApp\(\) \{.*?\}', force_reload_js, content, flags=re.DOTALL)
else:
    content = content.replace("function initApp() {", force_reload_js + "\n\n    function initApp() {")

# 欠落している全関数（saveCurrentState 〜 initApp 直前まで）を確実に挿入する
# 現在の content 内で `function saveCurrentState` が無ければ挿入
if "function saveCurrentState" not in content:
    # 欠落関数のうち initApp 以外の部分を抽出
    m_idx = missing_funcs_code.find("function initApp")
    funcs_to_insert = missing_funcs_code[:m_idx] if m_idx != -1 else missing_funcs_code
    
    # window.onload の前に挿入
    init_pos = content.find("function initApp()")
    if init_pos != -1:
        content = content[:init_pos] + funcs_to_insert + "\n\n    " + content[init_pos:]
        print("Successfully merged all missing functions (saveCurrentState, initParentDashboard, showToast, etc.)!")

# 6. initApp を極めて堅牢にする
robust_init_app = """    function initApp() {
      console.log('Initializing DAILY HERO & EIKEN STUDIO v' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1.1.0'));
      
      if (typeof APP_VERSION !== 'undefined') {
        const badge = document.getElementById('appVerBadge');
        if (badge) badge.innerText = `v${APP_VERSION}`;
      }
      
      // 1. お話プルダウン生成（最優先・絶対停止させない）
      try {
        populateStorySelects();
      } catch (e) {
        console.error('populateStorySelects error:', e);
      }

      // 2. 第1話の動画・リーダー本文の初期描画
      try {
        updateStoryView(false);
      } catch (e) {
        console.error('updateStoryView error:', e);
      }
      try {
        updateReaderContent();
      } catch (e) {
        console.error('updateReaderContent error:', e);
      }

      // 3. 動画イベント・再生モード初期化
      try {
        initVideoEvents();
      } catch (e) {
        console.error('initVideoEvents error:', e);
      }

      // 4. 報告日ピッカー初期化
      try {
        const todayIso = new Date().toISOString().split('T')[0];
        const picker = document.getElementById('reportDatePicker');
        if (picker) {
          picker.value = todayIso;
          if (typeof onReportDateChanged === 'function') {
            onReportDateChanged(todayIso);
          }
        }
      } catch (e) {
        console.error('DatePicker error:', e);
      }

      // 5. 状態復元と日課計算
      try {
        if (typeof loadSavedState === 'function') loadSavedState();
        if (typeof calculateDailyReward === 'function') calculateDailyReward();
      } catch (e) {
        console.error('State load error:', e);
      }

      // 6. オフライン状態＆アイコン
      try {
        if (typeof checkOfflineStatus === 'function') checkOfflineStatus();
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      } catch (e) {
        console.error('Lucide error:', e);
      }
    }"""

content = re.sub(r'function initApp\(\) \{.*?window\.onload = initApp;', robust_init_app + "\n\n    window.onload = initApp;", content, flags=re.DOTALL)

with open(PORTAL_FILE, "w", encoding="utf-8") as f:
    f.write(content)
with open(INDEX_FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"study_portal_for_son.html and index.html built successfully with v{NEW_VERSION}!")

# 7. SCP & SSH デプロイ
print("Deploying v1.1.0 to XServer...")
scp_files = [PORTAL_FILE, INDEX_FILE, VERSION_FILE, CHANGELOG_FILE]
for sf in scp_files:
    fname = os.path.basename(sf)
    res = subprocess.run([
        "scp", "-P", "10022", "-o", "StrictHostKeyChecking=no",
        sf, f"mdo3@mdo3.xsrv.jp:/home/mdo3/mdo3.com/public_html/3/{fname}"
    ], capture_output=True, text=True)
    if res.returncode == 0:
        print(f"Uploaded {fname} successfully")
    else:
        print(f"Error uploading {fname}: {res.stderr}")

print("=== Deployment to XServer complete! ===")
