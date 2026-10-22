import subprocess
import os

PORTAL_FILE = r"e:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\kindle\study_portal_for_son.html"
INDEX_FILE = r"e:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\kindle\index.html"

with open(PORTAL_FILE, "r", encoding="utf-8") as f:
    text = f.read()

target = '高校初級・分詞構文・フォーマル構文 × 光るカラオケ字幕</p>'
buttons_html = """高校初級・分詞構文・フォーマル構文 × 光るカラオケ字幕</p>
            
            <!-- 動画 再生設定ボタングループ -->
            <div style="display:flex; align-items:center; gap:6px; margin-top:8px; flex-wrap:wrap;">
              <span style="font-size:0.75rem; font-weight:700; color:#64748b;">🎬 動画再生設定:</span>
              <button type="button" id="btnVideoModeNext" class="btn btn-secondary active" onclick="setPlayMode('next')"
                      style="font-size:0.75rem; padding:4px 10px; border-radius:6px; font-weight:700;">
                ▶️ 次の話へ連続再生
              </button>
              <button type="button" id="btnVideoModeRepeat" class="btn btn-secondary" onclick="setPlayMode('repeat')"
                      style="font-size:0.75rem; padding:4px 10px; border-radius:6px; font-weight:700;">
                🔁 同じ話をリピート
              </button>
              <button type="button" id="btnVideoModeStop" class="btn btn-secondary" onclick="setPlayMode('stop')"
                      style="font-size:0.75rem; padding:4px 10px; border-radius:6px; font-weight:700;">
                ⏹️ 1話で終了
              </button>
            </div>"""

if target in text and 'id="btnVideoModeNext"' not in text:
    text = text.replace(target, buttons_html, 1)
    print("Inserted video playback buttons!")
else:
    print("Already inserted or target not found")

with open(PORTAL_FILE, "w", encoding="utf-8") as f:
    f.write(text)
with open(INDEX_FILE, "w", encoding="utf-8") as f:
    f.write(text)

# Deploy to XServer
for f in ["study_portal_for_son.html", "index.html"]:
    fp = rf"e:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\kindle\{f}"
    res = subprocess.run(["scp", "-P", "10022", "-o", "StrictHostKeyChecking=no", fp, f"mdo3@mdo3.xsrv.jp:/home/mdo3/mdo3.com/public_html/3/{f}"], capture_output=True, text=True)
    print(f"Uploaded {f}:", "OK" if res.returncode == 0 else res.stderr)

print("Video buttons deployment finished!")
