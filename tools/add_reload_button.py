import re
import subprocess

TARGET_FILE = r"e:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\kindle\study_portal_for_son.html"

with open(TARGET_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# 1. ヘッダーに「🔄 更新」ボタンを追加
old_header_badge = """    <div class="header-pwa-badge" onclick="showPwaGuide()">
      <i data-lucide="smartphone"></i> ホーム画面に追加
    </div>"""

new_header_badge = """    <div style="display:flex; align-items:center; gap:8px;">
      <button onclick="forceReloadApp()" title="アプリを最新版に更新"
              style="background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.3); color:#fff; padding:6px 12px; border-radius:999px; font-size:0.75rem; font-weight:700; display:flex; align-items:center; gap:5px; cursor:pointer; backdrop-filter:blur(4px);">
        <i data-lucide="refresh-cw" style="width:14px; height:14px;"></i> 🔄 最新版に更新
      </button>
      <div class="header-pwa-badge" onclick="showPwaGuide()">
        <i data-lucide="smartphone"></i> ホーム画面に追加
      </div>
    </div>"""

if old_header_badge in content:
    content = content.replace(old_header_badge, new_header_badge)
    print("Replaced header badge with reload button")

# 2. forceReloadApp 関数の定義を追加
old_init = "    function initApp() {"
new_init = """    function forceReloadApp() {
      showToast('🔄 最新版のアプリを読み込み直しています...');
      setTimeout(() => {
        // キャッシュを強制バイパスして最新状態にリロード
        window.location.href = window.location.pathname + '?reload=' + new Date().getTime();
      }, 300);
    }

    function initApp() {"""

if "function forceReloadApp" not in content:
    content = content.replace(old_init, new_init, 1)
    print("Added forceReloadApp function")

with open(TARGET_FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("study_portal_for_son.html updated successfully!")

# 3. サーバーへ同期
res1 = subprocess.run([
    "scp", "-P", "10022", "-o", "StrictHostKeyChecking=no",
    TARGET_FILE, "mdo3@mdo3.xsrv.jp:/home/mdo3/mdo3.com/public_html/3/study_portal_for_son.html"
], capture_output=True, text=True)

res2 = subprocess.run([
    "ssh", "-p", "10022", "-o", "StrictHostKeyChecking=no",
    "mdo3@mdo3.xsrv.jp",
    "cp /home/mdo3/mdo3.com/public_html/3/study_portal_for_son.html /home/mdo3/mdo3.com/public_html/3/index.html"
], capture_output=True, text=True)

if res1.returncode == 0 and res2.returncode == 0:
    print("Deployed reload button to XServer!")
else:
    print("Deploy error:", res1.stderr, res2.stderr)
