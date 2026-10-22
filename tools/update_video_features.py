import re
import subprocess

TARGET_FILE = r"e:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\kindle\study_portal_for_son.html"

with open(TARGET_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# 1. お話プルダウンの onchange を selectStory(this.value) に統一
content = content.replace(
    '<select id="videoStorySelect" class="custom-select" style="flex-grow:1;" onchange="changeStory(this.value)"></select>',
    '<select id="videoStorySelect" class="custom-select" style="flex-grow:1;" onchange="selectStory(this.value, true)"></select>'
)
content = content.replace(
    '<select id="readerStorySelect" class="custom-select" style="flex-grow:1;" onchange="changeStory(this.value)"></select>',
    '<select id="readerStorySelect" class="custom-select" style="flex-grow:1;" onchange="selectStory(this.value, false)"></select>'
)

# 2. 動画プレーヤー下に「再生モード（連続再生/リピート/1話停止）」UIを追加
old_player_title_row = """        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <h3 id="currentPlayingTitle" style="font-size:1.05rem; font-weight:800;">Chapter 01: ウサギとカメ 【英検準2級】</h3>
            <p id="currentPlayingDesc" style="font-size:0.8rem; color:var(--text-muted);">AIが長男専用に生成したオリジナル英語アニメーション教材</p>
          </div>"""

new_player_title_row = """        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <h3 id="currentPlayingTitle" style="font-size:1.05rem; font-weight:800;">Chapter 01: ウサギとカメ 【英検準2級】</h3>
            <p id="currentPlayingDesc" style="font-size:0.8rem; color:var(--text-muted);">AIが長男専用に生成したオリジナル英語アニメーション教材</p>
            
            <!-- 再生モード切替ボタングループ -->
            <div style="display:flex; align-items:center; gap:6px; margin-top:8px; flex-wrap:wrap;">
              <span style="font-size:0.75rem; font-weight:700; color:#64748b;">🎬 再生設定:</span>
              <button type="button" id="btnModeNext" class="btn btn-secondary active" onclick="setPlayMode('next')"
                      style="font-size:0.75rem; padding:4px 10px; border-radius:6px; font-weight:700;">
                ▶️ 次の話へ連続再生
              </button>
              <button type="button" id="btnModeRepeat" class="btn btn-secondary" onclick="setPlayMode('repeat')"
                      style="font-size:0.75rem; padding:4px 10px; border-radius:6px; font-weight:700;">
                🔁 同じ話をリピート
              </button>
              <button type="button" id="btnModeStop" class="btn btn-secondary" onclick="setPlayMode('stop')"
                      style="font-size:0.75rem; padding:4px 10px; border-radius:6px; font-weight:700;">
                ⏹️ 1話で終了
              </button>
            </div>
          </div>"""

if old_player_title_row in content:
    content = content.replace(old_player_title_row, new_player_title_row)
    print("Added play mode UI buttons")

# 3. JavaScript ロジックの置換
# start: 'function changeStory' から
# end: 'function renderMarkdownTable' の前まで
start_marker = "    function changeStory(idx) {"
end_marker = "    function renderMarkdownTable(mdText) {"

new_js_code = """    // 再生モード管理 (next / repeat / stop)
    let currentPlayMode = localStorage.getItem('son_play_mode') || 'next';

    function setPlayMode(mode) {
      currentPlayMode = mode;
      localStorage.setItem('son_play_mode', mode);
      
      const btnNext = document.getElementById('btnModeNext');
      const btnRepeat = document.getElementById('btnModeRepeat');
      const btnStop = document.getElementById('btnModeStop');

      [btnNext, btnRepeat, btnStop].forEach(b => {
        if (b) {
          b.style.background = '#f1f5f9';
          b.style.color = '#475569';
          b.style.borderColor = '#cbd5e1';
        }
      });

      if (mode === 'next' && btnNext) {
        btnNext.style.background = 'var(--accent-blue, #2563eb)';
        btnNext.style.color = '#fff';
        btnNext.style.borderColor = 'var(--accent-blue, #2563eb)';
        showToast('▶️ 設定完了: 動画終了後に次の話へ自動連続再生します');
      } else if (mode === 'repeat' && btnRepeat) {
        btnRepeat.style.background = 'var(--accent-gold, #d97706)';
        btnRepeat.style.color = '#fff';
        btnRepeat.style.borderColor = 'var(--accent-gold, #d97706)';
        showToast('🔁 設定完了: 同じ話を繰り返しリピート再生します');
      } else if (mode === 'stop' && btnStop) {
        btnStop.style.background = '#64748b';
        btnStop.style.color = '#fff';
        btnStop.style.borderColor = '#64748b';
        showToast('⏹️ 設定完了: 1話再生したら自動で停止します');
      }
    }

    function initVideoEvents() {
      const player = document.getElementById('sonVideoPlayer');
      if (!player) return;

      // 動画再生終了時の自動連続再生・リピート処理
      player.onended = function() {
        incrementPlayCount(currentStoryIdx);
        const mode = localStorage.getItem('son_play_mode') || 'next';
        
        if (mode === 'repeat') {
          player.currentTime = 0;
          player.play().catch(() => {});
          showToast('🔁 同じ話をリピート再生中');
        } else if (mode === 'next') {
          const nextIdx = (currentStoryIdx + 1) % ALL_STORIES.length;
          selectStory(nextIdx, true);
          showToast(`▶️ 次の話（第${ALL_STORIES[nextIdx].chapter}話）を自動連続再生します！`);
        } else {
          showToast('⏹️ 再生が終了しました');
        }
      };

      // 再生モードボタンの初期ハイライト
      setPlayMode(currentPlayMode);
    }

    function changeStory(idx) {
      selectStory(idx, false);
    }

    function selectStory(idx, autoPlay = false) {
      currentStoryIdx = parseInt(idx, 10);
      const vSelect = document.getElementById('videoStorySelect');
      const rSelect = document.getElementById('readerStorySelect');
      if (vSelect) vSelect.value = currentStoryIdx;
      if (rSelect) rSelect.value = currentStoryIdx;

      updateStoryView(autoPlay);
      updateReaderContent();
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
        // 重要: モバイルやPWAで確実に更新するためvideo要素のsrcを直接更新
        player.src = videoSrc;
        player.load();
        if (autoPlay) {
          player.play().catch(e => {
            console.log('Autoplay deferred until user interaction:', e);
          });
        }
      }

      const titleEl = document.getElementById('currentPlayingTitle');
      if (titleEl) {
        titleEl.innerText = `Chapter ${chStr}: ${story.titleJa} 【${GRADE_NAMES[currentVideoGrade] || currentVideoGrade}】`;
      }
      
      // Play Count
      const count = getPlayCount(currentStoryIdx);
      const badge = document.getElementById('videoPlayCountBadge');
      if (badge) badge.innerText = `再生回数: ${count}回`;

      // Audio in Reader
      const audioEl = document.getElementById('readerAudioElement');
      if (audioEl) {
        audioEl.src = `video_output/chapter${chStr}_${story.key}/narration_${currentReaderGrade === 'vocab' ? 'Grade_Pre2' : currentReaderGrade}.mp3`;
      }
      const audioTitle = document.getElementById('audioTrackTitle');
      if (audioTitle) {
        audioTitle.innerText = `朗読音声: Chapter ${chStr} (${GRADE_NAMES[currentReaderGrade] || '準2級'})`;
      }

      checkOfflineStatus();
    }

    function switchVideoGrade(gradeKey, btn) {
      currentVideoGrade = gradeKey;
      document.querySelectorAll('#videoGradeTabsBar .grade-chip').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      
      // 準2級以外がサーバーにまだ無い場合への配慮
      if (gradeKey !== 'Grade_Pre2') {
        showToast(`💡 現在サーバー同期済みなのは【準2級】です。${GRADE_NAMES[gradeKey] || gradeKey}は順次配信予定です。`);
      }
      
      updateStoryView(true);
      checkOfflineStatus();
    }

    function switchReaderGrade(gradeKey, btn) {
      currentReaderGrade = gradeKey;
      document.querySelectorAll('#readerGradeTabsBar .grade-chip').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');

      const story = ALL_STORIES[currentStoryIdx];
      if (story) {
        const chStr = String(story.chapter).padStart(2, '0');
        const audioEl = document.getElementById('readerAudioElement');
        if (audioEl) {
          audioEl.src = `video_output/chapter${chStr}_${story.key}/narration_${gradeKey === 'vocab' ? 'Grade_Pre2' : gradeKey}.mp3`;
        }
        const audioTitle = document.getElementById('audioTrackTitle');
        if (audioTitle) {
          audioTitle.innerText = `朗読音声: Chapter ${chStr} (${GRADE_NAMES[gradeKey] || '準2級'})`;
        }
      }

      updateReaderContent();
    }

    function populateStorySelects() {
      const vSelect = document.getElementById('videoStorySelect');
      const rSelect = document.getElementById('readerStorySelect');
      if (!vSelect && !rSelect) return;

      if (vSelect) vSelect.innerHTML = '';
      if (rSelect) rSelect.innerHTML = '';

      ALL_STORIES.forEach((s, idx) => {
        const optText = `第${s.chapter}話: ${s.titleJa} (${s.titleEn})`;
        
        if (vSelect) {
          const opt1 = document.createElement('option');
          opt1.value = idx;
          opt1.innerText = optText;
          if (idx === currentStoryIdx) opt1.selected = true;
          vSelect.appendChild(opt1);
        }

        if (rSelect) {
          const opt2 = document.createElement('option');
          opt2.value = idx;
          opt2.innerText = optText;
          if (idx === currentStoryIdx) opt2.selected = true;
          rSelect.appendChild(opt2);
        }
      });
    }

    function generateVocabFallbackHtml(story) {
      const moral = story.moral || (story.texts && story.texts.moral) || '';
      return `<div style="padding:16px; background:#f8fafc; border-radius:10px; border:1.5px solid #e2e8f0; line-height:1.7;">
        <h4 style="color:#0f172a; margin-bottom:8px; font-size:1.05rem;">📌 本話の重要教訓 (Moral)</h4>
        <p style="font-weight:700; color:#0369a1; margin-bottom:14px; font-size:1.05rem;">${moral || 'Slow and steady wins the race.（着実な歩みが最後に勝利をもたらす）'}</p>
        <h4 style="color:#0f172a; margin-bottom:8px; font-size:1rem;">📚 英検準2級・3級 必須語句・構文</h4>
        <ul style="padding-left:22px; color:#334155; font-size:0.95rem; line-height:1.8;">
          <li><strong>perseverance</strong> [名] 忍耐、不屈の努力</li>
          <li><strong>triumph</strong> [名/動] 勝利、大成功を収める</li>
          <li><strong>arrogant</strong> [形] 傲慢な、思い上がった</li>
          <li><strong>composure</strong> [名] 落ち着き、沈着</li>
          <li><strong>slumber</strong> [名/動] まどろみ、眠る</li>
        </ul>
        <p style="font-size:0.8rem; color:#64748b; margin-top:12px;">※上部タブで「準2級本文」または「3級」「4級」に切り替えると、英文全文および暗記マスク（黒塗り）が利用できます。</p>
      </div>`;
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
          contentBox.innerText = bodyText;
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
      if (isRedSheetOn) {
        if (container) container.classList.add('red-mask-active');
        if (btn) {
          btn.classList.add('active');
          btn.innerHTML = '<i data-lucide="eye"></i> 🕶️ 暗記マスク ON中';
        }
        showToast('🕶️ 暗記マスクON！タップで個別確認できます');
      } else {
        if (container) container.classList.remove('red-mask-active');
        if (btn) {
          btn.classList.remove('active');
          btn.innerHTML = '<i data-lucide="eye-off"></i> 🕶️ 暗記マスク (黒塗り)';
        }
        showToast('暗記マスクを解除しました');
      }
      lucide.createIcons();
    }
"""

if start_marker in content and end_marker in content:
    start_pos = content.find(start_marker)
    end_pos = content.find(end_marker)
    content = content[:start_pos] + new_js_code + "\n\n" + content[end_pos:]
    print("Replaced video and reader JS functions!")
else:
    print("Warning: start_marker or end_marker not found")

# 4. オフライン一括保存の差分化 ＆ 級差し替え関数の完全実装
old_cache_section_start = "    /* ============================================================\n       Offline Video Cache Manager (Cache API)\n    ============================================================ */"
end_cache_section = "    /* ============================================================\n       App Initialization\n    ============================================================ */"

new_cache_section = """    /* ============================================================
       Offline Video Cache Manager (Cache API)
    ============================================================ */
    const VIDEO_CACHE_NAME = 'son-eiken-videos-v1';

    async function checkOfflineStatus() {
      const statusText = document.getElementById('offlineStatusText');
      if (!statusText) return;
      if (!('caches' in window)) {
        statusText.innerHTML = '⚠️ お使いのブラウザはオフライン保存に対応していません。';
        return;
      }
      try {
        const cache = await caches.open(VIDEO_CACHE_NAME);
        const story = ALL_STORIES[currentStoryIdx];
        const chStr = String(story.chapter).padStart(2, '0');
        const currentUrl = `video_output/chapter${chStr}_${story.key}/chapter${chStr}_${currentVideoGrade}.mp4`;
        const matched = await cache.match(currentUrl);

        const cachedGrade = localStorage.getItem('son_cached_grade');
        if (matched) {
          statusText.innerHTML = `✅ この動画はスマホ内に保存済みです！(機内モード・通信なしで再生可能)`;
        } else if (cachedGrade) {
          statusText.innerHTML = `ℹ️ 現在スマホ内には【<strong>${GRADE_NAMES[cachedGrade] || cachedGrade}</strong>】が保存されています。この級を保存するには下の「一括保存」を押してください。`;
        } else {
          statusText.innerHTML = `💡 「現在の級を一括保存」を押すと、通信制限を気にせずオフライン再生できます。`;
        }
      } catch (e) {
        console.warn('Cache status error:', e);
      }
    }

    // 現在の級を一括保存（差分チェック・スキップ機能付き）
    async function downloadTargetGradeVideos() {
      const grade = currentVideoGrade || 'Grade_Pre2';
      const container = document.getElementById('downloadProgressBarContainer');
      const fill = document.getElementById('downloadProgressBarFill');
      const label = document.getElementById('downloadProgressLabel');
      const percentEl = document.getElementById('downloadProgressPercent');
      const statusText = document.getElementById('offlineStatusText');

      if (!('caches' in window)) {
        alert('お使いのブラウザはオフライン保存（Cache API）に対応していません。\\nSafariまたはChromeの最新版をご利用ください。');
        return;
      }

      // 既存の別級が保存されている場合の差し替え確認
      const oldGrade = localStorage.getItem('son_cached_grade');
      if (oldGrade && oldGrade !== grade) {
        const ok = confirm(`【級の差し替え確認】\\n\\n現在スマホ内には【${GRADE_NAMES[oldGrade] || oldGrade}】が保存されています。\\n古い級の動画を削除して、新しく【${GRADE_NAMES[grade] || grade}】の動画に差し替えますか？\\n（ストレージ容量を節約できます）`);
        if (ok) {
          await caches.delete(VIDEO_CACHE_NAME);
          showToast(`古い【${GRADE_NAMES[oldGrade] || oldGrade}】を削除しました`);
        }
      }

      if (container) container.style.display = 'block';
      if (label) label.innerText = `【${GRADE_NAMES[grade] || grade}】の動画・音声をスマホに保存中...`;
      showToast('📥 オフライン保存を開始しました（保存済みは自動スキップ）');

      try {
        const cache = await caches.open(VIDEO_CACHE_NAME);
        const total = ALL_STORIES.length;
        let newlySaved = 0;
        let alreadySaved = 0;

        for (let i = 0; i < total; i++) {
          const s = ALL_STORIES[i];
          const chStr = String(s.chapter).padStart(2, '0');
          const videoUrl = `video_output/chapter${chStr}_${s.key}/chapter${chStr}_${grade}.mp4`;
          const audioUrl = `video_output/chapter${chStr}_${s.key}/narration_${grade}.mp3`;

          // 差分チェック: すでにキャッシュにあれば通信をスキップ！
          const vExists = await cache.match(videoUrl);
          if (vExists) {
            alreadySaved++;
          } else {
            try {
              const vRes = await fetch(videoUrl);
              if (vRes.ok) {
                await cache.put(videoUrl, vRes);
                newlySaved++;
              }
            } catch (e) {}
          }

          const aExists = await cache.match(audioUrl);
          if (!aExists) {
            try {
              const aRes = await fetch(audioUrl);
              if (aRes.ok) {
                await cache.put(audioUrl, aRes);
              }
            } catch (e) {}
          }

          const pct = Math.round(((i + 1) / total) * 100);
          if (fill) fill.style.width = `${pct}%`;
          if (percentEl) percentEl.innerText = `${pct}% (${i + 1}/${total}話 確認完了)`;
        }

        localStorage.setItem('son_cached_grade', grade);
        const totalSaved = newlySaved + alreadySaved;
        if (totalSaved > 0) {
          if (statusText) statusText.innerHTML = `✅ <strong>${GRADE_NAMES[grade] || grade}</strong> の動画（全${totalSaved}話）がスマホ内に保存済みです！(機内モードでも通信なしで再生可能)`;
          showToast(`🎉 オフライン保存完了！（新規:${newlySaved}話、既存:${alreadySaved}話）`);
        } else {
          if (statusText) statusText.innerHTML = `ℹ️ 配信中の動画を保存しました。`;
          showToast('オフライン保存処理が完了しました');
        }
        checkOfflineStatus();
      } catch (err) {
        console.error('Cache error:', err);
        showToast('保存中にエラーが発生しました');
      }
    }

    // 級の差し替え・キャッシュ全削除関数（両方の名前で呼べるように定義）
    async function clearTargetGradeVideos() {
      const cachedGrade = localStorage.getItem('son_cached_grade');
      const gradeName = cachedGrade ? (GRADE_NAMES[cachedGrade] || cachedGrade) : '保存済み';
      if (confirm(`【スマホ容量の整理・級の差し替え】\\n\\n現在スマホに保存されている【${gradeName}】の動画・音声データをすべて削除し、空き容量を戻しますか？\\n（削除後、別の級を一括保存できます）`)) {
        await caches.delete(VIDEO_CACHE_NAME);
        localStorage.removeItem('son_cached_grade');
        const statusText = document.getElementById('offlineStatusText');
        if (statusText) statusText.innerHTML = '🗑️ 保存済み動画データを削除しました。';
        const container = document.getElementById('downloadProgressBarContainer');
        if (container) container.style.display = 'none';
        showToast('🗑️ 保存データを削除しました！');
        checkOfflineStatus();
      }
    }

    const clearOfflineVideos = clearTargetGradeVideos;
"""

if old_cache_section_start in content and end_cache_section in content:
    c_start = content.find(old_cache_section_start)
    c_end = content.find(end_cache_section)
    content = content[:c_start] + new_cache_section + "\n" + content[c_end:]
    print("Replaced cache management functions!")
else:
    print("Warning: old_cache_section_start or end_cache_section not found")

# 5. initApp 内で initVideoEvents() を呼ぶようにする
content = content.replace(
    'populateStorySelects();\n      updateStoryView();',
    'populateStorySelects();\n      updateStoryView();\n      initVideoEvents();'
)

with open(TARGET_FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated study_portal_for_son.html completely!")

# 6. SCPでXServerへ同期
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
    print("Successfully deployed video features to XServer!")
else:
    print("Deploy error:", res1.stderr, res2.stderr)
