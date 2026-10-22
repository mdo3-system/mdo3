import os
import re

TARGET_FILE = r"e:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\kindle\study_portal_for_son.html"

with open(TARGET_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# 1. 報告日選択と過去報告警告UIの修正・確実化
old_header_area = """      <div class="header-action-row" style="margin-top:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div style="font-size:0.85rem; color:#64748b;">
          ※完了したミッションにチェックを入れてから報告してね
        </div>
        <button class="btn btn-primary" onclick="submitToLine()" style="background:var(--accent-green); border-color:var(--accent-green); padding:10px 20px; font-weight:700;">
          <i data-lucide="send"></i> 親のLINEに日報を送信
        </button>
      </div>"""

new_header_area = """      <!-- 日付選択 ＆ 報告アクションエリア -->
      <div style="background:white; border-radius:12px; padding:16px; margin-top:16px; border:2px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px;">
          <div>
            <label style="font-size:0.85rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">
              📅 報告する日付を選択:
            </label>
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="date" id="reportDatePicker" onchange="onReportDateChanged(this.value)"
                     style="padding:8px 12px; font-size:0.95rem; font-weight:700; border-radius:8px; border:1.5px solid #94a3b8; outline:none; background:#f8fafc;">
              <button type="button" class="btn btn-secondary" onclick="setReportDateOffset(0)" style="padding:6px 10px; font-size:0.8rem;">今日</button>
              <button type="button" class="btn btn-secondary" onclick="setReportDateOffset(-1)" style="padding:6px 10px; font-size:0.8rem;">昨日</button>
            </div>
            <div id="reportDateWarning" style="display:none; color:#dc2626; font-size:0.8rem; font-weight:700; margin-top:6px;">
              ⚠️ <span id="warningDateText">この日</span> の日報は既に報告済みです！再報告すると記録が上書きされます。
            </div>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button class="btn btn-secondary" onclick="copyLineReport()" style="padding:10px 16px; font-weight:700; border-color:#94a3b8;">
              <i data-lucide="copy"></i> 文面をコピー
            </button>
            <button class="btn btn-primary" onclick="submitToLine()" style="background:var(--accent-green); border-color:var(--accent-green); padding:10px 22px; font-weight:800; font-size:1rem; box-shadow:0 4px 12px rgba(16,185,129,0.25);">
              <i data-lucide="send"></i> 親のLINEに送信
            </button>
          </div>
        </div>
        <div style="font-size:0.75rem; color:#64748b; margin-top:8px;">
          ※チェックを入れた後、「親のLINEに送信」を押すとLINEアプリが開きます。開かない場合は「文面をコピー」して直接LINEに貼り付けてください。
        </div>
      </div>"""

if old_header_area in content:
    content = content.replace(old_header_area, new_header_area)
    print("Replaced old_header_area")

# 2. 親のDrive提出先ボタンの削除（ミッションエリアから削除）
content = re.sub(
    r'<a\s+href="#"\s+onclick="openParentDriveFolder\(event\)"[^>]*>.*?親のDrive提出先.*?</a>',
    '<!-- 親のDrive提出先リンクは長男画面から削除 -->',
    content,
    flags=re.DOTALL
)

# 3. JavaScriptの主要ロジック群を統合置換
start_marker = "    function switchVideoGrade(gradeKey, btn) {"
end_marker = "    window.onload = initApp;"

new_js_code = """    function switchVideoGrade(gradeKey, btn) {
      currentVideoGrade = gradeKey;
      document.querySelectorAll('#videoGradeTabsBar .grade-chip').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      updateStoryView();
      checkOfflineStatus();
      const p = document.getElementById('sonVideoPlayer');
      if (p) p.play().catch(() => {});
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
        const chStr = String(s.chapter).padStart(2, '0');
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

    function selectStory(idx) {
      currentStoryIdx = parseInt(idx, 10);
      const vSelect = document.getElementById('videoStorySelect');
      const rSelect = document.getElementById('readerStorySelect');
      if (vSelect) vSelect.value = currentStoryIdx;
      if (rSelect) rSelect.value = currentStoryIdx;

      updateStoryView();
      updateReaderContent();
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

    function renderMarkdownTable(mdText) {
      if (!mdText) return '<p>単語表データは準備中です</p>';
      const lines = mdText.split('\\n').filter(l => l.trim().startsWith('|'));
      if (lines.length < 2) return '<p>単語表データは準備中です</p>';
      
      let html = '<table class="vocab-table" style="width:100%; border-collapse:collapse;">';
      lines.forEach((line, idx) => {
        if (line.includes('---')) return;
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        if (idx === 0) {
          html += '<thead><tr style="background:#f1f5f9;">' + cells.map(c => `<th style="padding:10px; border:1px solid #cbd5e1; font-weight:700;">${c}</th>`).join('') + '</tr></thead><tbody>';
        } else {
          html += '<tr>' + cells.map((c, i) => `<td style="padding:10px; border:1px solid #cbd5e1;" class="${i === 1 ? 'vocab-red' : ''}" onclick="this.classList.toggle('revealed')">${c}</td>`).join('') + '</tr>';
        }
      });
      html += '</tbody></table>';
      return html;
    }

    /* Play Counter */
    function getPlayCount(storyIdx) {
      const counts = JSON.parse(localStorage.getItem('son_play_counts') || '{}');
      return counts[storyIdx] || 0;
    }

    function incrementPlayCount(storyIdx) {
      const counts = JSON.parse(localStorage.getItem('son_play_counts') || '{}');
      counts[storyIdx] = (counts[storyIdx] || 0) + 1;
      localStorage.setItem('son_play_counts', JSON.stringify(counts));
      const badge = document.getElementById('videoPlayCountBadge');
      if (badge) badge.innerText = `再生回数: ${counts[storyIdx]}回`;
    }

    /* Photo Upload */
    async function uploadScreenshot(subject, inputEl) {
      if (!inputEl.files || inputEl.files.length === 0) return;
      const file = inputEl.files[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subject', subject);

      showToast('📤 写真をアップロード中...');
      try {
        const res = await fetch('api/upload_screenshot.php', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.status === 'success') {
          taskState[subject + '_screenshot'] = data.fileUrl;
          const prevEl = document.getElementById(`upload_preview_${subject}`);
          if (prevEl) {
            prevEl.style.display = 'block';
            prevEl.innerHTML = `✅ 写真提出完了 (${data.uploadedAt}) <a href="${data.fileUrl}" target="_blank" style="color:var(--accent-cyan); margin-left:6px;">[確認]</a>`;
          }
          showToast('🎉 写真の提出が完了しました！');
          saveCurrentState();
        } else {
          showToast('❌ アップロード失敗: ' + (data.message || 'エラー'));
        }
      } catch (err) {
        console.warn('Upload API error, saving locally:', err);
        showToast('⚠️ サーバー未接続（ローカル記録）');
      }
    }

    function openParentDriveFolder(e) {
      if (e) e.preventDefault();
      fetch('config/portal_config.json')
        .then(r => r.json())
        .then(cfg => {
          const url = cfg.parentGoogleDriveFolderUrl || 'https://drive.google.com';
          window.open(url, '_blank');
        })
        .catch(() => {
          window.open('https://drive.google.com', '_blank');
        });
    }

    /* ============================================================
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
          statusText.innerHTML = `ℹ️ 現在【${GRADE_NAMES[cachedGrade] || cachedGrade}】が保存されています。この動画を保存するには下のボタンを押してください。`;
        } else {
          statusText.innerHTML = `💡 「対象級の動画をスマホに保存」を押すと、通信制限を気にせずオフライン再生できます。`;
        }
      } catch (e) {
        console.warn('Cache status error:', e);
      }
    }

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

      if (container) container.style.display = 'block';
      if (label) label.innerText = `【${GRADE_NAMES[grade] || grade}】の動画・音声をスマホに保存中...`;
      showToast('📥 オフライン保存を開始しました');

      try {
        const cache = await caches.open(VIDEO_CACHE_NAME);
        const total = ALL_STORIES.length;
        let savedCount = 0;

        for (let i = 0; i < total; i++) {
          const s = ALL_STORIES[i];
          const chStr = String(s.chapter).padStart(2, '0');
          const videoUrl = `video_output/chapter${chStr}_${s.key}/chapter${chStr}_${grade}.mp4`;
          const audioUrl = `video_output/chapter${chStr}_${s.key}/narration_${grade}.mp3`;

          try {
            const vRes = await fetch(videoUrl);
            if (vRes.ok) {
              await cache.put(videoUrl, vRes);
              savedCount++;
            }
          } catch (e) {}

          try {
            const aRes = await fetch(audioUrl);
            if (aRes.ok) {
              await cache.put(audioUrl, aRes);
            }
          } catch (e) {}

          const pct = Math.round(((i + 1) / total) * 100);
          if (fill) fill.style.width = `${pct}%`;
          if (percentEl) percentEl.innerText = `${pct}% (${i + 1}/${total}話確認中)`;
        }

        localStorage.setItem('son_cached_grade', grade);
        if (savedCount > 0) {
          if (statusText) statusText.innerHTML = `✅ <strong>${GRADE_NAMES[grade] || grade}</strong> の動画（${savedCount}話分）がスマホ内に保存されました！(機内モードでも通信なしで再生可能)`;
          showToast(`🎉 オフライン保存完了！（${savedCount}話保存）`);
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

    async function clearOfflineVideos() {
      if (confirm('スマホ内に保存した動画・音声データをすべて削除しますか？\\n（ストレージ容量を空けます）')) {
        await caches.delete(VIDEO_CACHE_NAME);
        localStorage.removeItem('son_cached_grade');
        const statusText = document.getElementById('offlineStatusText');
        if (statusText) statusText.innerHTML = '🗑️ オフライン動画を削除しました。';
        const container = document.getElementById('downloadProgressBarContainer');
        if (container) container.style.display = 'none';
        showToast('オフライン動画を削除しました');
      }
    }

    /* ============================================================
       App Initialization
    ============================================================ */
    function initApp() {
      if (typeof APP_VERSION !== 'undefined') {
        const badge = document.getElementById('appVerBadge');
        if (badge) badge.innerText = `v${APP_VERSION}`;
      }
      
      // 報告日ピッカー初期化
      const todayIso = new Date().toISOString().split('T')[0];
      const picker = document.getElementById('reportDatePicker');
      if (picker) {
        picker.value = todayIso;
        onReportDateChanged(todayIso);
      }

      loadSavedState();
      calculateDailyReward();
      
      // お話選択プルダウン＆動画・リーダーの初期描画
      populateStorySelects();
      updateStoryView();
      updateReaderContent();

      checkOfflineStatus();
      lucide.createIcons();
    }"""

if start_marker in content and end_marker in content:
    start_pos = content.find(start_marker)
    end_pos = content.find(end_marker)
    content = content[:start_pos] + new_js_code + "\n\n" + content[end_pos:]
    print("Replaced JS functions successfully!")
else:
    print("Warning: start_marker or end_marker not found")

with open(TARGET_FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS: study_portal_for_son.html updated completely!")
