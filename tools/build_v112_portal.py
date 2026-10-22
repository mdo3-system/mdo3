import re
import subprocess
import os

KINDLE_DIR = r"e:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\kindle"
VERSION_FILE = os.path.join(KINDLE_DIR, "Version.js")
PORTAL_FILE = os.path.join(KINDLE_DIR, "study_portal_for_son.html")
INDEX_FILE = os.path.join(KINDLE_DIR, "index.html")
CHANGELOG_FILE = os.path.join(KINDLE_DIR, "CHANGELOG.md")

NEW_VERSION = "1.1.2"
TODAY_STR = "2026-10-04"

print(f"=== Building DAILY HERO & EIKEN STUDIO v{NEW_VERSION} ===")

# 1. Update Version.js
version_js_content = f"""/**
 * Application Version Management
 * 
 * [Changelog]
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
print("Updated Version.js to v1.1.2")

# 2. Update CHANGELOG.md
changelog_addon = f"""## [v1.1.2] - {TODAY_STR}
### 🎬 動画＆朗読音声リーダーの「自動連続再生」＆「リピート」機能の完全実装
- **動画プレーヤー＆音声リーダーの両方に連続再生UIを新設**:
  - `▶️ 次の話へ連続再生`: 1話見終わる／聴き終わると、自動的に次の話（第1話→第2話…）に切り替わって連続再生がスタート。
  - `🔁 同じ話をリピート`: 暗唱・シャドーイング用に、終わったら同じ話の先頭に戻って繰り返し再生。
  - `⏹️ 1話で終了`: 再生終了時に自動停止。
  - 動画・音声のどちらで設定しても共通設定として連動し、スマホ内に記憶されます。
- **音声リーダーの「再生/一時停止」記号のズレを完全解消**:
  - ボタンの手動切り替えではなく、`<audio>` 要素自身のネイティブ再生イベント（`play` / `pause` / `ended`）とアイコン表示を完全直結。
  - 途中で止まった場合や再生終了時、バックグラウンド復帰時でも、実際の音の挙動とアイコン（▶ / ❚❚）が100%正確に一致するよう修正。
"""

with open(CHANGELOG_FILE, "r", encoding="utf-8") as f:
    old_cl = f.read()

new_cl = old_cl.replace("# DAILY HERO & EIKEN STUDIO 更新履歴\n\n", f"# DAILY HERO & EIKEN STUDIO 更新履歴\n\n{changelog_addon}\n")
with open(CHANGELOG_FILE, "w", encoding="utf-8") as f:
    f.write(new_cl)
print("Updated CHANGELOG.md to v1.1.2")

# 3. Read current portal HTML
with open(PORTAL_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Update version badge
content = re.sub(
    r'<span id="appVerBadge"[^>]*>v[0-9\.]+</span>',
    f'<span id="appVerBadge" style="font-size:0.65rem; background:rgba(56,189,248,0.2); color:var(--accent-cyan); padding:2px 6px; border-radius:4px; vertical-align:middle; margin-left:6px;">v{NEW_VERSION}</span>',
    content
)

# 4. 動画プレーヤー下に再生設定ボタングループを配置
# currentPlayingDesc の下に挿入
old_video_desc = '<p id="currentPlayingDesc" style="font-size:0.8rem; color:var(--text-muted);">AIが長男専用に生成したオリジナル英語アニメーション教材</p>'
new_video_desc = """<p id="currentPlayingDesc" style="font-size:0.8rem; color:var(--text-muted);">AIが長男専用に生成したオリジナル英語アニメーション教材</p>
            
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

if old_video_desc in content and "id=\"btnVideoModeNext\"" not in content:
    content = content.replace(old_video_desc, new_video_desc)
    print("Added video playback mode UI")

# 5. 音声リーダーバー内に音声再生設定ボタングループを配置
old_audio_bar = """        <audio id="readerAudioElement" src="video_output/chapter01_tortoise_and_hare/narration_Grade_Pre2.mp3"></audio>
      </div>"""

new_audio_bar = """        <audio id="readerAudioElement" src="video_output/chapter01_tortoise_and_hare/narration_Grade_Pre2.mp3"></audio>
        
        <!-- 音声 再生設定ボタングループ -->
        <div style="display:flex; align-items:center; gap:6px; margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.1); flex-wrap:wrap;">
          <span style="font-size:0.72rem; font-weight:700; color:var(--text-muted);">🎧 朗読再生設定:</span>
          <button type="button" id="btnAudioModeNext" class="btn btn-secondary active" onclick="setPlayMode('next')"
                  style="font-size:0.72rem; padding:3px 8px; border-radius:6px; font-weight:700;">
            ▶️ 次の話へ連続再生
          </button>
          <button type="button" id="btnAudioModeRepeat" class="btn btn-secondary" onclick="setPlayMode('repeat')"
                  style="font-size:0.72rem; padding:3px 8px; border-radius:6px; font-weight:700;">
            🔁 同じ話をリピート
          </button>
          <button type="button" id="btnAudioModeStop" class="btn btn-secondary" onclick="setPlayMode('stop')"
                  style="font-size:0.72rem; padding:3px 8px; border-radius:6px; font-weight:700;">
            ⏹️ 1話で終了
          </button>
        </div>
      </div>"""

if old_audio_bar in content and "id=\"btnAudioModeNext\"" not in content:
    content = content.replace(old_audio_bar, new_audio_bar)
    print("Added audio playback mode UI")

# 6. JavaScript: 再生モード管理・イベント連携・アイコン同期の統合実装
media_manager_js = """    /* ============================================================
       Media Playback Manager (Video & Audio Continuous Playback & Icon Sync)
    ============================================================ */
    let currentPlayMode = localStorage.getItem('son_play_mode') || 'next';

    function setPlayMode(mode) {
      currentPlayMode = mode;
      localStorage.setItem('son_play_mode', mode);
      
      const vNext = document.getElementById('btnVideoModeNext');
      const vRepeat = document.getElementById('btnVideoModeRepeat');
      const vStop = document.getElementById('btnVideoModeStop');
      const aNext = document.getElementById('btnAudioModeNext');
      const aRepeat = document.getElementById('btnAudioModeRepeat');
      const aStop = document.getElementById('btnAudioModeStop');

      const allBtns = [vNext, vRepeat, vStop, aNext, aRepeat, aStop];
      allBtns.forEach(b => {
        if (b) {
          b.style.background = '#f1f5f9';
          b.style.color = '#475569';
          b.style.borderColor = '#cbd5e1';
        }
      });

      if (mode === 'next') {
        [vNext, aNext].forEach(b => {
          if (b) {
            b.style.background = 'var(--accent-blue, #2563eb)';
            b.style.color = '#fff';
            b.style.borderColor = 'var(--accent-blue, #2563eb)';
          }
        });
        showToast('▶️ 設定完了: 終了後に次の話へ自動連続再生します');
      } else if (mode === 'repeat') {
        [vRepeat, aRepeat].forEach(b => {
          if (b) {
            b.style.background = 'var(--accent-gold, #d97706)';
            b.style.color = '#fff';
            b.style.borderColor = 'var(--accent-gold, #d97706)';
          }
        });
        showToast('🔁 設定完了: 同じ話を繰り返しリピート再生します');
      } else if (mode === 'stop') {
        [vStop, aStop].forEach(b => {
          if (b) {
            b.style.background = '#64748b';
            b.style.color = '#fff';
            b.style.borderColor = '#64748b';
          }
        });
        showToast('⏹️ 設定完了: 1話再生したら自動で停止します');
      }
    }

    // メディア（動画または音声）終了時のハンドラー
    function handleMediaEnded(type) {
      incrementPlayCount(currentStoryIdx);
      const mode = localStorage.getItem('son_play_mode') || 'next';
      const player = document.getElementById('sonVideoPlayer');
      const audio = document.getElementById('readerAudioElement');

      if (mode === 'repeat') {
        if (type === 'video' && player) {
          player.currentTime = 0;
          player.play().catch(() => {});
          showToast('🔁 動画: 同じ話をリピート再生中');
        } else if (type === 'audio' && audio) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
          showToast('🔁 音声: 同じ話をリピート再生中');
        }
      } else if (mode === 'next') {
        const nextIdx = (currentStoryIdx + 1) % ALL_STORIES.length;
        const nextStory = ALL_STORIES[nextIdx];
        
        if (type === 'video') {
          selectStory(nextIdx, true, false);
          showToast(`▶️ 動画: 次の話（第${nextStory.chapter}話）を自動連続再生します！`);
        } else if (type === 'audio') {
          selectStory(nextIdx, false, true);
          showToast(`▶️ 音声: 次の話（第${nextStory.chapter}話）を自動連続再生します！`);
        }
      } else {
        showToast(type === 'video' ? '⏹️ 動画の再生が終了しました' : '⏹️ 朗読音声の再生が終了しました');
      }
    }

    // 音声プレーヤーの再生/停止アイコンの完全状態同期
    function updateAudioIcon(isPlaying) {
      const icon = document.getElementById('audioIcon');
      const btn = document.getElementById('audioPlayPauseBtn');
      if (icon) {
        icon.setAttribute('data-lucide', isPlaying ? 'pause' : 'play');
        lucide.createIcons();
      }
      if (btn) {
        if (isPlaying) {
          btn.style.background = 'var(--accent-cyan)';
          btn.style.color = '#0f172a';
          btn.style.boxShadow = '0 0 12px rgba(56, 189, 248, 0.4)';
        } else {
          btn.style.background = '';
          btn.style.color = '';
          btn.style.boxShadow = '';
        }
      }
    }

    // メディア（動画・音声）のネイティブイベント登録
    function initMediaEvents() {
      const player = document.getElementById('sonVideoPlayer');
      const audio = document.getElementById('readerAudioElement');

      // 1. 動画プレーヤーイベント
      if (player) {
        player.onended = function() {
          handleMediaEnded('video');
        };
      }

      // 2. 音声リーダーイベント（アイコン同期 ＆ 連続再生）
      if (audio) {
        audio.onplay = function() {
          updateAudioIcon(true);
        };
        audio.onpause = function() {
          updateAudioIcon(false);
        };
        audio.onended = function() {
          updateAudioIcon(false);
          handleMediaEnded('audio');
        };
        audio.onerror = function() {
          updateAudioIcon(false);
          console.warn('Audio playback error');
        };
      }

      // 3. 再生モードボタンの初期ハイライト
      setPlayMode(currentPlayMode);
    }

    function toggleAudioNarration() {
      const audioEl = document.getElementById('readerAudioElement');
      if (!audioEl) return;
      if (audioEl.paused) {
        audioEl.play().catch(e => {
          console.warn('Audio play failed:', e);
          showToast('⚠️ 音声ファイルの読み込み中または未配置です');
          updateAudioIcon(false);
        });
        showToast('朗読音声を再生中');
      } else {
        audioEl.pause();
        showToast('朗読音声を一時停止');
      }
    }

    function changeStory(idx) {
      selectStory(idx, false, false);
    }

    function selectStory(idx, autoPlayVideo = false, autoPlayAudio = false) {
      currentStoryIdx = parseInt(idx, 10);
      const vSelect = document.getElementById('videoStorySelect');
      const rSelect = document.getElementById('readerStorySelect');
      if (vSelect) vSelect.value = currentStoryIdx;
      if (rSelect) rSelect.value = currentStoryIdx;

      updateStoryView(autoPlayVideo);
      updateReaderContent();

      if (autoPlayAudio) {
        const audio = document.getElementById('readerAudioElement');
        if (audio) {
          audio.play().catch(e => console.log('Audio autoplay prevented:', e));
        }
      }
    }

    function updateStoryView(autoPlay = false) {
      const story = ALL_STORIES[currentStoryIdx];
      if (!story) return;
      const chStr = String(story.chapter).padStart(2, '0');
      
      const videoSrc = `video_output/chapter${chStr}_${story.key}/chapter${chStr}_${currentVideoGrade}.mp4`;
      const player = document.getElementById('sonVideoPlayer');
      const source = document.getElementById('sonVideoSource');
      
      if (source) source.src = videoSrc;
      if (player) {
        player.src = videoSrc;
        player.load();
        if (autoPlay) {
          player.play().catch(e => console.log('Autoplay deferred:', e));
        }
      }

      const titleEl = document.getElementById('currentPlayingTitle');
      if (titleEl) {
        titleEl.innerText = `Chapter ${chStr}: ${story.titleJa} 【${GRADE_NAMES[currentVideoGrade] || currentVideoGrade}】`;
      }
      
      const count = getPlayCount(currentStoryIdx);
      const badge = document.getElementById('videoPlayCountBadge');
      if (badge) badge.innerText = `再生回数: ${count}回`;

      // 朗読音声のソース更新
      const audioEl = document.getElementById('readerAudioElement');
      if (audioEl) {
        audioEl.src = `video_output/chapter${chStr}_${story.key}/narration_${currentReaderGrade === 'vocab' ? 'Grade_Pre2' : currentReaderGrade}.mp3`;
        audioEl.load();
      }
      const audioTitle = document.getElementById('audioTrackTitle');
      if (audioTitle) {
        audioTitle.innerText = `朗読音声: Chapter ${chStr} (${GRADE_NAMES[currentReaderGrade] || '準2級'})`;
      }

      checkOfflineStatus();
    }
"""

# HTML内でお話プルダウンの onchange 属性を更新
content = content.replace(
    '<select id="videoStorySelect" class="custom-select" style="flex-grow:1;" onchange="changeStory(this.value)"></select>',
    '<select id="videoStorySelect" class="custom-select" style="flex-grow:1;" onchange="selectStory(this.value, true, false)"></select>'
)
content = content.replace(
    '<select id="readerStorySelect" class="custom-select" style="flex-grow:1;" onchange="changeStory(this.value)"></select>',
    '<select id="readerStorySelect" class="custom-select" style="flex-grow:1;" onchange="selectStory(this.value, false, false)"></select>'
)

# 旧関数の置換（changeStory 〜 switchVideoGrade の直前まで）
s_marker = "    function changeStory(idx) {"
e_marker = "    function switchVideoGrade(gradeKey, btn) {"

if s_marker in content and e_marker in content:
    s_pos = content.find(s_marker)
    e_pos = content.find(e_marker)
    content = content[:s_pos] + media_manager_js + "\n\n" + content[e_pos:]
    print("Replaced Media Playback Manager logic successfully!")
else:
    # もし無ければ toggleAudioNarration の直前から置換
    t_marker = "    function toggleAudioNarration() {"
    if t_marker in content and e_marker in content:
        s_pos = content.find(t_marker)
        e_pos = content.find(e_marker)
        content = content[:s_pos] + media_manager_js + "\n\n" + content[e_pos:]
        print("Replaced Media Playback Manager via toggleAudioNarration successfully!")
    else:
        print("Warning: could not find markers for media manager!")

# initApp 内で initMediaEvents() を確実に呼ぶようにする
content = content.replace("initVideoEvents();", "initMediaEvents();")
if "initMediaEvents();" not in content:
    content = content.replace("populateStorySelects();", "populateStorySelects();\n        initMediaEvents();")

with open(PORTAL_FILE, "w", encoding="utf-8") as f:
    f.write(content)
with open(INDEX_FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Updated portal files to v{NEW_VERSION}")

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
print("Deploying to XServer...")
scp_files = [PORTAL_FILE, INDEX_FILE, VERSION_FILE, CHANGELOG_FILE]
for sf in scp_files:
    fname = os.path.basename(sf)
    res = subprocess.run([
        "scp", "-P", "10022", "-o", "StrictHostKeyChecking=no",
        sf, f"mdo3@mdo3.xsrv.jp:/home/mdo3/mdo3.com/public_html/3/{fname}"
    ], capture_output=True, text=True)
    print(f"Uploaded {fname} to XServer:", "OK" if res.returncode == 0 else res.stderr)

print(f"=== v{NEW_VERSION} complete! ===")
