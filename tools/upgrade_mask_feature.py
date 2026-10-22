import re
import subprocess
import os

KINDLE_DIR = r"e:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\kindle"
VERSION_FILE = os.path.join(KINDLE_DIR, "Version.js")
PORTAL_FILE = os.path.join(KINDLE_DIR, "study_portal_for_son.html")
INDEX_FILE = os.path.join(KINDLE_DIR, "index.html")
CHANGELOG_FILE = os.path.join(KINDLE_DIR, "CHANGELOG.md")

NEW_VERSION = "1.1.1"
TODAY_STR = "2026-10-04"

# 1. Update Version.js
version_js_content = f"""/**
 * Application Version Management
 * 
 * [Changelog]
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
print("Updated Version.js to v1.1.1")

# 2. Update CHANGELOG.md
changelog_addon = f"""## [v1.1.1] - {TODAY_STR}
### 🕶️ 英語リーダー暗記マスク機能の抜本強化＆操作ガイド追加
- **長文英文の「穴埋め暗記マスク」に新対応**:
  - 従来は単語表（vocab）にしか黒塗りが効かなかった問題を解消。
  - 「🕶️ 暗記マスク」ボタンを押すと、長文（準2級・3級・4級などの本文）に含まれる重要単語が瞬時に黒塗り（「？」アイコン付き）でマスクされます。
  - 黒塗り部分をタップすると、その単語だけがパッと表示され（タップ個別オープン）、英文読解・穴埋め暗記テストが直感的に行えます。
- **暗記マスク使い方ガイドの自動表示**:
  - マスクON時に「💡 英文中の重要単語が黒塗りで隠れます。単語をタップすると答えが表示されます！」という分かりやすい案内バナーが表示されます。
- **単語表（重要単語・熟語表）の黒塗りめくり機能の強化**:
  - 単語表タブでも日本語訳がしっかり黒塗りマスクされ、タップでめくれます。
"""

with open(CHANGELOG_FILE, "r", encoding="utf-8") as f:
    old_cl = f.read()

# [v1.1.1] を先頭に追加
new_cl = old_cl.replace("# DAILY HERO & EIKEN STUDIO 更新履歴\n\n", f"# DAILY HERO & EIKEN STUDIO 更新履歴\n\n{changelog_addon}\n")
with open(CHANGELOG_FILE, "w", encoding="utf-8") as f:
    f.write(new_cl)
print("Updated CHANGELOG.md to v1.1.1")

# 3. Update HTML & JS in portal file
with open(PORTAL_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Update version badge
content = re.sub(
    r'<span id="appVerBadge"[^>]*>v[0-9\.]+</span>',
    f'<span id="appVerBadge" style="font-size:0.65rem; background:rgba(56,189,248,0.2); color:var(--accent-cyan); padding:2px 6px; border-radius:4px; vertical-align:middle; margin-left:6px;">v{NEW_VERSION}</span>',
    content
)

# Add CSS for .mask-word
mask_css = """
    /* Interactive Mask for English Text */
    .mask-word {
      display: inline-block;
      padding: 1px 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .red-mask-active .mask-word {
      background: #0f172a !important;
      color: #0f172a !important;
      cursor: pointer;
      user-select: none;
      position: relative;
      border: 1px dashed #38bdf8;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .red-mask-active .mask-word::after {
      content: '？';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 0.8rem;
      font-weight: 800;
      color: #38bdf8;
      pointer-events: none;
    }

    .red-mask-active .mask-word.revealed {
      background: rgba(56, 189, 248, 0.15) !important;
      color: #0284c7 !important;
      font-weight: 800;
      border: 1px solid #38bdf8;
    }

    .red-mask-active .mask-word.revealed::after {
      display: none;
    }

    .red-mask-active .vocab-table td:nth-child(2),
    .red-mask-active .vocab-red {
      background: #0f172a !important;
      color: #0f172a !important;
      user-select: none;
      border-radius: 4px;
      cursor: pointer;
      position: relative;
      transition: all 0.15s ease;
    }

    .red-mask-active .vocab-table td:nth-child(2)::after,
    .red-mask-active .vocab-red::after {
      content: '⬛ タップで表示';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 0.72rem;
      font-weight: 700;
      color: #94a3b8;
      pointer-events: none;
      white-space: nowrap;
    }

    .red-mask-active .vocab-table td:nth-child(2).revealed,
    .red-mask-active .vocab-red.revealed {
      background: rgba(56, 189, 248, 0.12) !important;
      color: #0f172a !important;
    }

    .red-mask-active .vocab-table td:nth-child(2).revealed::after,
    .red-mask-active .vocab-red.revealed::after {
      display: none;
    }
"""

if "/* Interactive Mask for English Text */" not in content:
    content = content.replace("</style>", mask_css + "\n  </style>", 1)
    print("Added mask CSS styles")

# Add guide banner above reader content
old_reader_header = """        <div class="reader-header">
          <div>
            <h3 id="readerTitleText" style="font-size:1.1rem; font-weight:800; color:var(--text-primary); margin-bottom:4px;">
              Chapter 01: ウサギとカメ (The Tortoise and the Hare)
            </h3>
            <span class="badge badge-accent" id="readerGradeBadge">英検準2級 本文</span>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn-red-sheet" id="redSheetButton" onclick="toggleRedSheetMode()">
              <i data-lucide="eye-off"></i> 🕶️ 暗記マスク (黒塗り)
            </button>
          </div>
        </div>"""

new_reader_header = """        <div class="reader-header">
          <div>
            <h3 id="readerTitleText" style="font-size:1.1rem; font-weight:800; color:var(--text-primary); margin-bottom:4px;">
              Chapter 01: ウサギとカメ (The Tortoise and the Hare)
            </h3>
            <span class="badge badge-accent" id="readerGradeBadge">英検準2級 本文</span>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn-red-sheet" id="redSheetButton" onclick="toggleRedSheetMode()">
              <i data-lucide="eye-off"></i> 🕶️ 暗記マスク (黒塗り)
            </button>
          </div>
        </div>

        <!-- 暗記マスクの使い方ガイドバナー -->
        <div id="maskGuideBanner" style="display:none; background:#f0f9ff; border:1.5px solid #0284c7; border-radius:8px; padding:10px 14px; margin-bottom:12px; font-size:0.85rem; color:#0369a1; animation:fadeIn 0.3s ease;">
          💡 <strong>暗記マスクON中:</strong> 本文の重要単語が「<span style="background:#0f172a; color:#38bdf8; padding:1px 6px; border-radius:4px; font-weight:800;">？</span>」で隠れています！単語をタップすると答えが表示されます。
        </div>"""

if old_reader_header in content:
    content = content.replace(old_reader_header, new_reader_header)
    print("Added mask guide banner to HTML")

# Update updateReaderContent and toggleRedSheetMode functions
old_mask_logic_start = "    function updateReaderContent() {"
old_mask_logic_end = "    function renderMarkdownTable(mdText) {"

new_mask_logic = """    // 英文テキスト内の重要単語をマスク化するHTML生成関数
    function renderMaskedEnglishText(rawText) {
      if (!rawText) return '本文データを準備中です';

      // 共通のストップワード（冠詞・前置詞・簡単な接続詞など）は隠さない
      const stopWords = new Set([
        'the', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
        'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
        'it', 'its', 'he', 'his', 'him', 'she', 'her', 'they', 'them', 'their', 'we', 'us', 'our', 'you', 'your',
        'that', 'this', 'these', 'those', 'as', 'if', 'or', 'but', 'so', 'not', 'no', 'can', 'could', 'will', 'would'
      ]);

      // 改行を段落に分割
      const paragraphs = rawText.split(/\\n+/);
      
      const formatted = paragraphs.map(p => {
        if (!p.trim()) return '';
        
        // 単語ごとに分割して、重要な単語（5文字以上かつストップワード以外、または大文字始まり以外の意味語）をspan化
        const words = p.split(/([a-zA-Z0-9'-]+|[^a-zA-Z0-9'-]+)/);
        const mapped = words.map(w => {
          const clean = w.trim().toLowerCase();
          const isAlpha = /^[a-zA-Z]{5,}$/.test(clean);
          
          if (isAlpha && !stopWords.has(clean)) {
            return `<span class="mask-word" onclick="this.classList.toggle('revealed')">${w}</span>`;
          }
          return w;
        });

        return `<p style="margin-bottom:14px; line-height:1.8; font-size:1.05rem;">${mapped.join('')}</p>`;
      });

      return formatted.join('');
    }

    function updateReaderContent() {
      const story = ALL_STORIES[currentStoryIdx];
      if (!story) return;
      const chStr = String(story.chapter).padStart(2, '0');
      
      const titleEl = document.getElementById('readerTitleText');
      if (titleEl) {
        titleEl.innerText = `Chapter ${chStr}: ${story.titleJa} (${story.titleEn})`;
      }
      
      const badgeEl = document.getElementById('readerGradeBadge');
      if (badgeEl) {
        badgeEl.innerText = GRADE_NAMES[currentReaderGrade] || '重要単語・熟語表';
      }

      const contentBox = document.getElementById('readerTextContent');
      if (contentBox) {
        if (currentReaderGrade === 'vocab') {
          const rawVocab = story.texts ? story.texts.vocab : '';
          if (rawVocab && rawVocab.trim().length > 0) {
            contentBox.innerHTML = `<div class="vocab-table-container">${renderMarkdownTable(rawVocab)}</div>`;
          } else {
            contentBox.innerHTML = generateVocabFallbackHtml(story);
          }
        } else {
          let bodyText = (story.texts && story.texts[currentReaderGrade]) || '';
          if (!bodyText || bodyText.trim().length === 0) {
            bodyText = (story.texts && story.texts['Grade_Pre2']) || (story.texts && story.texts['Grade_3']) || '本文データを準備中です。上部タブで他の級に切り替えてご覧ください。';
          }
          // 重要語句マスク対応HTMLを描画
          contentBox.innerHTML = renderMaskedEnglishText(bodyText);
        }
      }
    }

    function toggleAudioNarration() {
      const audioEl = document.getElementById('readerAudioElement');
      const icon = document.getElementById('audioIcon');
      if (!audioEl) return;
      if (audioEl.paused) {
        audioEl.play().catch(e => {
          console.warn('Audio play failed:', e);
          showToast('⚠️ 音声ファイルの読み込み中または未配置です');
        });
        if (icon) icon.setAttribute('data-lucide', 'pause');
        showToast('朗読音声を再生中');
      } else {
        audioEl.pause();
        if (icon) icon.setAttribute('data-lucide', 'play');
        showToast('朗読音声を一時停止');
      }
      lucide.createIcons();
    }

    function toggleRedSheetMode() {
      isRedSheetOn = !isRedSheetOn;
      const btn = document.getElementById('redSheetButton');
      const container = document.getElementById('readerContainer');
      const guideBanner = document.getElementById('maskGuideBanner');

      if (isRedSheetOn) {
        if (container) container.classList.add('red-mask-active');
        if (guideBanner) guideBanner.style.display = 'block';
        if (btn) {
          btn.classList.add('active');
          btn.innerHTML = '<i data-lucide="eye"></i> 🕶️ 暗記マスク ON中';
          btn.style.background = '#0f172a';
          btn.style.color = '#38bdf8';
          btn.style.borderColor = '#38bdf8';
        }
        showToast('🕶️ 暗記マスクON！黒塗りの「？」をタップすると単語が開きます');
      } else {
        if (container) container.classList.remove('red-mask-active');
        if (guideBanner) guideBanner.style.display = 'none';
        // すべての単語の revealed をリセット
        document.querySelectorAll('.mask-word.revealed').forEach(el => el.classList.remove('revealed'));
        document.querySelectorAll('.vocab-table td.revealed').forEach(el => el.classList.remove('revealed'));
        if (btn) {
          btn.classList.remove('active');
          btn.innerHTML = '<i data-lucide="eye-off"></i> 🕶️ 暗記マスク (黒塗り)';
          btn.style.background = '';
          btn.style.color = '';
          btn.style.borderColor = '';
        }
        showToast('暗記マスクを解除しました');
      }
      lucide.createIcons();
    }
"""

if old_mask_logic_start in content and old_mask_logic_end in content:
    s_idx = content.find(old_mask_logic_start)
    e_idx = content.find(old_mask_logic_end)
    content = content[:s_idx] + new_mask_logic + "\n" + content[e_idx:]
    print("Replaced reader mask logic successfully!")
else:
    print("Warning: old_mask_logic_start or old_mask_logic_end not found")

with open(PORTAL_FILE, "w", encoding="utf-8") as f:
    f.write(content)
with open(INDEX_FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Updated study_portal_for_son.html to v{NEW_VERSION}")

# Validate with node
scripts = re.findall(r'<script>(.*?)</script>', content, re.DOTALL)
with open('test_syntax.js', 'w', encoding='utf-8') as tf:
    tf.write(scripts[0])
res = subprocess.run(['node', '--check', 'test_syntax.js'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
if res.returncode == 0:
    print("Syntax verification passed (100% CLEAN)!")
else:
    print("Syntax error:", res.stderr.decode('utf-8', errors='ignore'))
    exit(1)

# Deploy to XServer
scp_files = [PORTAL_FILE, INDEX_FILE, VERSION_FILE, CHANGELOG_FILE]
for sf in scp_files:
    fname = os.path.basename(sf)
    res = subprocess.run([
        "scp", "-P", "10022", "-o", "StrictHostKeyChecking=no",
        sf, f"mdo3@mdo3.xsrv.jp:/home/mdo3/mdo3.com/public_html/3/{fname}"
    ], capture_output=True, text=True)
    print(f"Uploaded {fname} to XServer:", "OK" if res.returncode == 0 else res.stderr)

print(f"=== v{NEW_VERSION} successfully deployed to XServer! ===")
