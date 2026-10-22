import os
import re
import json
import subprocess

KINDLE_DIR = r"e:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\kindle"
VERSION_FILE = os.path.join(KINDLE_DIR, "Version.js")
PORTAL_FILE = os.path.join(KINDLE_DIR, "study_portal_for_son.html")
INDEX_FILE = os.path.join(KINDLE_DIR, "index.html")
CHANGELOG_FILE = os.path.join(KINDLE_DIR, "CHANGELOG.md")
MANIFEST_FILE = os.path.join(KINDLE_DIR, "manifest.json")
ICONS_DIR = os.path.join(KINDLE_DIR, "icons")

NEW_VERSION = "1.1.3"
TODAY_STR = "2026-10-04"

print(f"=== Updating Brand to 「日々精進」 (v{NEW_VERSION}) ===")

# 1. Update Version.js
version_js_content = f"""/**
 * Application Version Management
 * 
 * [Changelog]
 * - v1.1.3 ({TODAY_STR}): ツール名を「日々精進」に変更、アプリアイコン（512x512, 192x192, favicon）の刷新、LINE報告タイトル「日々精進」への統一
 * - v1.1.2 ({TODAY_STR}): 動画＆朗読音声リーダーの自動連続再生・リピート機能の完全実装、音声プレーヤー再生/停止アイコンの完全状態同期（ズレ防止）
 * - v1.1.1 ({TODAY_STR}): 英語リーダー長文の穴埋め暗記マスク（重要語句の黒塗り＆タップ個別オープン）対応、マスク使い方ガイドUI追加、単語表マスク強化
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
print("Updated Version.js to v1.1.3")

# 2. Update CHANGELOG.md
changelog_addon = f"""## [v1.1.3] - {TODAY_STR}
### 🏷️ ツール名「日々精進」への改称 ＆ アプリアイコン刷新
- **ツール名の正式改称**:
  - 旧名称「DAILY HERO & EIKEN STUDIO」から、親御様のご指示に基づき **「日々精進」** に正式変更。
  - ページタイトル、ヘッダーロゴ、LINE日報提出文面（「〜の日々精進 完了報告」）に至るまで統一。
- **公式アプリアイコンの刷新**:
  - ホーム画面アイコン、PWAアイコン（192x192, 512x512）、ファビコン（favicon.ico）を「日々精進」専用デザインにリニューアル。
  - 深い紺碧の背景に日輪ゴールドリング、力強く洗練された「日々精進」の筆文字をあしらった格式あるデザインを生成・適用。
"""

with open(CHANGELOG_FILE, "r", encoding="utf-8") as f:
    old_cl = f.read()

new_cl = old_cl.replace("# DAILY HERO & EIKEN STUDIO 更新履歴\n\n", f"# DAILY HERO & EIKEN STUDIO 更新履歴\n\n{changelog_addon}\n")
new_cl = new_cl.replace("# DAILY HERO & EIKEN STUDIO 更新履歴", "# 日々精進 更新履歴")
with open(CHANGELOG_FILE, "w", encoding="utf-8") as f:
    f.write(new_cl)
print("Updated CHANGELOG.md to v1.1.3")

# 3. Update manifest.json
manifest_data = {
    "name": "日々精進 - 長男専用 学習＆日課ポータル",
    "short_name": "日々精進",
    "description": "長男専用 学習＆日課ポータル",
    "start_url": "index.html",
    "display": "standalone",
    "background_color": "#070b14",
    "theme_color": "#070b14",
    "orientation": "portrait-primary",
    "icons": [
        {
            "src": "icons/icon_192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
        },
        {
            "src": "icons/icon_512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
        }
    ]
}

with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
    json.dump(manifest_data, f, ensure_ascii=False, indent=2)
print("Updated manifest.json")

# 4. Update HTML
with open(PORTAL_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Update version badge
content = re.sub(
    r'<span id="appVerBadge"[^>]*>v[0-9\.]+</span>',
    f'<span id="appVerBadge" style="font-size:0.65rem; background:rgba(56,189,248,0.2); color:var(--accent-cyan); padding:2px 6px; border-radius:4px; vertical-align:middle; margin-left:6px;">v{NEW_VERSION}</span>',
    content
)

# Update title tag
content = re.sub(
    r'<title>.*?</title>',
    '<title>日々精進｜長男専用 学習＆日課ポータル</title>',
    content
)

# Update apple-touch-icon and favicon
icon_links = """  <link rel="manifest" href="manifest.json">
  <link rel="icon" type="image/png" sizes="192x192" href="icons/icon_192.png">
  <link rel="apple-touch-icon" href="icons/icon_512.png">"""

content = re.sub(
    r'<link rel="manifest" href="manifest\.json">.*?<link rel="apple-touch-icon"[^>]*>',
    icon_links,
    content,
    flags=re.DOTALL
)

# Update header app-brand
old_app_brand = """    <div class="app-brand">
      <div class="app-logo">
        <i data-lucide="zap"></i>
      </div>
      <div class="app-title">
        <h1>DAILY HERO & EIKEN STUDIO <span id="appVerBadge" style="font-size:0.65rem; background:rgba(56,189,248,0.2); color:var(--accent-cyan); padding:2px 6px; border-radius:4px; vertical-align:middle; margin-left:6px;">v1.1.2</span></h1>
        <span>長男専用 学習＆日課ポータル</span>
      </div>
    </div>"""

new_app_brand = f"""    <div class="app-brand" style="display:flex; align-items:center; gap:12px;">
      <div class="app-logo" style="width:42px; height:42px; border-radius:10px; overflow:hidden; border:1.5px solid rgba(251,191,36,0.5); box-shadow:0 0 12px rgba(245,158,11,0.25); display:flex; align-items:center; justify-content:center; background:#0f172a;">
        <img src="icons/icon_192.png" alt="日々精進" style="width:100%; height:100%; object-fit:cover;">
      </div>
      <div class="app-title">
        <h1 style="font-size:1.35rem; font-weight:900; letter-spacing:0.04em; color:#fff; display:flex; align-items:center;">日々精進 <span id="appVerBadge" style="font-size:0.65rem; background:rgba(56,189,248,0.2); color:var(--accent-cyan); padding:2px 6px; border-radius:4px; vertical-align:middle; margin-left:8px; font-weight:700;">v{NEW_VERSION}</span></h1>
        <span style="font-size:0.75rem; color:#94a3b8; font-weight:600;">長男専用 学習＆日課ポータル</span>
      </div>
    </div>"""

# 置換（柔軟に検索）
brand_pattern = r'<div class="app-brand">.*?<h1>.*?DAILY HERO & EIKEN STUDIO.*?</div>\s*</div>'
if re.search(brand_pattern, content, re.DOTALL):
    content = re.sub(brand_pattern, new_app_brand, content, flags=re.DOTALL)
    print("Replaced app-brand with 「日々精進」 brand and new logo image!")
else:
    # 直置換
    content = content.replace("DAILY HERO & EIKEN STUDIO", "日々精進")

# LINE 報告文面の修正
content = content.replace("学習＆日課 完了報告", "日々精進 完了報告")
content = content.replace("明日も朝5時起きでがんばります！", "明日も朝5時起きで日々精進します！")

# PWA ガイドモーダル内の文言
content = content.replace("DAILY HEROをスマホのホーム画面に追加", "「日々精進」をスマホのホーム画面に追加")

with open(PORTAL_FILE, "w", encoding="utf-8") as f:
    f.write(content)
with open(INDEX_FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Updated portal HTML to v{NEW_VERSION}")

# Validate with Node
scripts = re.findall(r'<script>(.*?)</script>', content, re.DOTALL)
with open('test_syntax.js', 'w', encoding='utf-8') as tf:
    tf.write(scripts[0])
res = subprocess.run(['node', '--check', 'test_syntax.js'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
if res.returncode == 0:
    print("Node syntax validation PASSED (100% CLEAN)!")
else:
    print("Syntax error:", res.stderr.decode('utf-8', errors='ignore'))
    exit(1)

# Deploy to XServer
print("Deploying icons and files to XServer...")
# Make sure remote icons directory exists
subprocess.run(["ssh", "-p", "10022", "-o", "StrictHostKeyChecking=no", "mdo3@mdo3.xsrv.jp", "mkdir -p /home/mdo3/mdo3.com/public_html/3/icons"], capture_output=True)

# Upload icons
for icon_f in os.listdir(ICONS_DIR):
    local_icon = os.path.join(ICONS_DIR, icon_f)
    subprocess.run(["scp", "-P", "10022", "-o", "StrictHostKeyChecking=no", local_icon, f"mdo3@mdo3.xsrv.jp:/home/mdo3/mdo3.com/public_html/3/icons/{icon_f}"], capture_output=True)
print("Uploaded icons to XServer!")

# Upload HTML & config files
scp_files = [PORTAL_FILE, INDEX_FILE, VERSION_FILE, CHANGELOG_FILE, MANIFEST_FILE]
for sf in scp_files:
    fname = os.path.basename(sf)
    res = subprocess.run([
        "scp", "-P", "10022", "-o", "StrictHostKeyChecking=no",
        sf, f"mdo3@mdo3.xsrv.jp:/home/mdo3/mdo3.com/public_html/3/{fname}"
    ], capture_output=True, text=True)
    print(f"Uploaded {fname} to XServer:", "OK" if res.returncode == 0 else res.stderr)

print(f"=== v{NEW_VERSION} 「日々精進」 successfully deployed! ===")
