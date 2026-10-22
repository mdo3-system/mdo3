function saveCurrentState() {
      const payload = {
        taskState: taskState,
        slackingDays: slackingDays,
        history: JSON.parse(localStorage.getItem('son_reward_history') || '[]'),
        playCounts: JSON.parse(localStorage.getItem('son_play_counts') || '{}')
      };

      // Local fallback
      localStorage.setItem('son_task_state_v2', JSON.stringify(taskState));
      localStorage.setItem('son_slacking_days', slackingDays.toString());

      try {
        await fetch('api/sync.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        console.log('Offline: state saved to localStorage only');
      }
    }

    async function loadSavedState() {
      // 1. Try Loading from Server (Xserver)
      try {
        const res = await fetch('api/sync.php');
        const json = await res.json();
        if (json && json.taskState) {
          taskState = Object.assign(taskState, json.taskState);
          if (json.slackingDays !== undefined) {
            slackingDays = json.slackingDays;
            document.getElementById('slackingDaysSelect').value = slackingDays;
            updatePenaltyMultiplier(slackingDays);
          }
          if (json.history) {
            localStorage.setItem('son_reward_history', JSON.stringify(json.history));
          }
          if (json.playCounts) {
            localStorage.setItem('son_play_counts', JSON.stringify(json.playCounts));
          }
          restoreFormUI();
          return;
        }
      } catch (err) {
        console.log('Server fetch failed, falling back to localStorage');
      }

      // 2. Fallback to LocalStorage
      const saved = localStorage.getItem('son_task_state_v2');
      if (saved) {
        try {
          taskState = JSON.parse(saved);
        } catch(e) {}
      }
      const savedSlack = localStorage.getItem('son_slacking_days');
      if (savedSlack) {
        slackingDays = parseInt(savedSlack) || 0;
        document.getElementById('slackingDaysSelect').value = slackingDays;
        updatePenaltyMultiplier(slackingDays);
      }
      restoreFormUI();
    }

    function restoreFormUI() {
      if (taskState.wake) document.getElementById('chk_wake').checked = true;
      if (taskState.swing) document.getElementById('chk_swing').checked = true;
      ['kanji', 'english', 'extra1', 'extra2'].forEach(sub => {
        if (taskState[sub]) {
          const b = document.getElementById(`badge_${sub}`);
          if (b) {
            b.className = 'status-badge-chip pass';
            b.innerText = '合格 ⭕';
          }
        }
        if (taskState[sub + '_screenshot']) {
          const prevEl = document.getElementById(`upload_preview_${sub}`);
          if (prevEl) {
            prevEl.style.display = 'block';
            prevEl.innerHTML = `✅ 写真提出済 <a href="${taskState[sub + '_screenshot']}" target="_blank" style="color:var(--accent-cyan); margin-left:6px;">[確認]</a>`;
          }
        }
      });
      calculateDailyReward();
    }

    function renderHistoryList() {
      const listEl = document.getElementById('historyLogList');
      const history = JSON.parse(localStorage.getItem('son_reward_history') || '[]');
      
      let mCash = 0;
      let mInvest = 0;
      const curM = new Date().getMonth() + 1;

      history.forEach(item => {
        const m = parseInt(item.date.split('/')[1]);
        if (m === curM) {
          mCash += (item.cash || Math.floor(item.amount / 2));
          mInvest += (item.invest || Math.ceil(item.amount / 2));
        }
      });

      document.getElementById('ledgerMonthlyCash').innerText = mCash.toLocaleString();
      document.getElementById('ledgerMonthlyInvest').innerText = mInvest.toLocaleString();

      if (history.length === 0) {
        listEl.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:16px;">まだ獲得履歴はありません</p>';
        return;
      }
      listEl.innerHTML = '';
      history.slice(0, 15).forEach(item => {
        const div = document.createElement('div');
        div.style = "background:rgba(11,17,32,0.6); border:1px solid var(--card-border); border-radius:var(--radius-md); padding:10px 14px; display:flex; justify-content:space-between; align-items:center;";
        div.innerHTML = `
          <div>
            <div style="font-weight:700; font-size:0.82rem; color:#fff;">📅 ${item.date}</div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">Suica: ￥${(item.cash || Math.floor(item.amount/2)).toLocaleString()} / 投信: ￥${(item.invest || Math.ceil(item.amount/2)).toLocaleString()}</div>
          </div>
          <div style="font-family:'Outfit', sans-serif; font-weight:900; font-size:1.1rem; color:var(--accent-gold);">+￥${item.amount.toLocaleString()}</div>
        `;
        listEl.appendChild(div);
      });
    }

    /* ============================================================
       Parent Dashboard & Monitoring System (保護者カルテ)
    ============================================================ */
    let currentParentDate = '';
    let parentRecordsCache = {};

    function initParentDashboard() {
      const todayStr = getTodayDateStr();
      currentParentDate = todayStr;
      
      const datePicker = document.getElementById('parentDatePicker');
      if (datePicker) {
        datePicker.value = todayStr;
      }
      selectQuickDateBtn('today');
      loadParentRecords(todayStr);
    }

    function getTodayDateStr() {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    function selectQuickDate(type) {
      let d = new Date();
      if (type === 'yesterday') {
        d.setDate(d.getDate() - 1);
      }
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      
      currentParentDate = dateStr;
      const datePicker = document.getElementById('parentDatePicker');
      if (datePicker) datePicker.value = dateStr;
      
      selectQuickDateBtn(type);
      loadParentRecords(dateStr);
    }

    function selectQuickDateBtn(type) {
      const btnT = document.getElementById('btnDateToday');
      const btnY = document.getElementById('btnDateYesterday');
      if (btnT && btnY) {
        btnT.classList.remove('active');
        btnY.classList.remove('active');
        if (type === 'today') btnT.classList.add('active');
        if (type === 'yesterday') btnY.classList.add('active');
      }
    }

    function onParentDateChange(val) {
      if (!val) return;
      currentParentDate = val;
      const todayStr = getTodayDateStr();
      const yest = new Date(); yest.setDate(yest.getDate() - 1);
      const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
      
      if (val === todayStr) selectQuickDateBtn('today');
      else if (val === yestStr) selectQuickDateBtn('yesterday');
      else selectQuickDateBtn('');

      loadParentRecords(val);
    }

    function refreshParentRecords() {
      showToast('🔄 最新の提出データを取得中...');
      loadParentRecords(currentParentDate || getTodayDateStr(), true);
    }

    async function loadParentRecords(dateStr, forceRefresh = false) {
      const quizContainer = document.getElementById('parentQuizContainer');
      const photoGallery = document.getElementById('parentPhotoGallery');
      const photoCountEl = document.getElementById('parentPhotoCount');

      if (!forceRefresh && parentRecordsCache[dateStr]) {
        renderParentDashboardUI(parentRecordsCache[dateStr], dateStr);
        return;
      }

      quizContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);"><i data-lucide="loader-2" class="spin"></i> データを取得中...</div>';
      photoGallery.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); grid-column:1/-1;">写真を読み込み中...</div>';
      lucide.createIcons();

      try {
        const res = await fetch(`api/parent_records.php?date=${dateStr}`);
        const data = await res.json();
        parentRecordsCache[dateStr] = data;

        // 過去日付一覧セレクトボックスの更新
        if (data.availableDates && data.availableDates.length > 0) {
          const select = document.getElementById('parentHistoryDateSelect');
          if (select) {
            select.innerHTML = '<option value="">過去の履歴から選択...</option>';
            data.availableDates.forEach(d => {
              const opt = document.createElement('option');
              opt.value = d;
              opt.innerText = `📅 ${d} ${d === getTodayDateStr() ? '(今日)' : ''}`;
              if (d === dateStr) opt.selected = true;
              select.appendChild(opt);
            });
          }
        }

        renderParentDashboardUI(data, dateStr);
      } catch (err) {
        console.error('Failed to load parent records:', err);
        quizContainer.innerHTML = '<div style="color:var(--accent-red); padding:16px;">⚠️ サーバーからデータを取得できませんでした。ローカルデータを確認中...</div>';
        // Fallback local render
        renderParentLocalFallback(dateStr);
      }
    }

    function renderParentDashboardUI(data, dateStr) {
      const quizContainer = document.getElementById('parentQuizContainer');
      const photoGallery = document.getElementById('parentPhotoGallery');
      const photoCountEl = document.getElementById('parentPhotoCount');

      // 1. テスト結果・診断カルテの描画
      const pState = (data.progress && data.progress.taskState) ? data.progress.taskState : taskState;
      const subjects = [
        { key: 'kanji', name: '漢検準2級 (見開き2P)', icon: '✍️' },
        { key: 'english', name: '英検準2級 単語帳', icon: '🎧' },
        { key: 'extra1', name: '追加教科①', icon: '📐' },
        { key: 'extra2', name: '追加教科②', icon: '🔬' }
      ];

      let quizHtml = '';
      let hasQuiz = false;

      subjects.forEach(sub => {
        const detail = pState[sub.key + '_test_detail'];
        const isPassed = pState[sub.key];
        
        if (detail || isPassed !== undefined) {
          hasQuiz = true;
          const score = detail ? detail.score : (isPassed ? 10 : 0);
          const total = detail ? detail.total : 10;
          const wrongList = (detail && detail.wrongList) ? detail.wrongList : [];
          const testedAt = detail ? ` (受検: ${detail.testedAt})` : '';

          quizHtml += `
            <div class="quiz-review-card">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div style="font-weight:800; font-size:0.95rem; color:#fff;">
                  ${sub.icon} ${sub.name} <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">${testedAt}</span>
                </div>
                <div>
                  <span class="status-badge-chip ${isPassed ? 'pass' : 'pending'}" style="font-size:0.85rem;">
                    ${isPassed ? '合格 ⭕' : '不合格 ❌'} (${score}/${total}問)
                  </span>
                </div>
              </div>
          `;

          if (wrongList.length > 0) {
            quizHtml += `<div style="margin-top:10px; font-size:0.8rem; font-weight:700; color:var(--accent-red);">🚨 間違えた問題 (${wrongList.length}問) - 復習ポイント:</div>`;
            wrongList.forEach(w => {
              quizHtml += `
                <div class="wrong-answer-item">
                  <div style="font-weight:700; color:#fff;">問 ${w.qNum}: ${w.question}</div>
                  <div style="margin-top:4px; display:flex; gap:14px; flex-wrap:wrap;">
                    <span style="color:var(--accent-red);">大樹の回答: <strong>${w.selected}</strong> ❌</span>
                    <span style="color:var(--accent-green);">正解: <strong>${w.correct}</strong> ⭕</span>
                  </div>
                </div>
              `;
            });
          } else if (isPassed) {
            quizHtml += `
              <div style="margin-top:8px; font-size:0.8rem; color:var(--accent-green); font-weight:700;">
                ✨ 全問正解または合格ラインをクリアしています！
              </div>
            `;
          }

          quizHtml += `</div>`;
        }
      });

      if (!hasQuiz) {
        quizHtml = '<div style="color:var(--text-muted); text-align:center; padding:16px;">この日の10問テストの受験記録はまだありません</div>';
      }
      quizContainer.innerHTML = quizHtml;

      // 2. 提出写真・スクショギャラリーの描画
      const photos = data.photos || [];
      photoCountEl.innerText = photos.length;

      if (photos.length === 0) {
        // Fallback: taskState の写真を確認
        let localPhotos = [];
        ['kanji', 'english', 'extra1', 'extra2'].forEach(k => {
          if (pState[k + '_screenshot']) {
            localPhotos.push({
              subject: k,
              viewUrl: pState[k + '_screenshot'],
              thumbnailUrl: pState[k + '_screenshot'],
              timestamp: '本日'
            });
          }
        });

        if (localPhotos.length > 0) {
          renderPhotoCards(localPhotos, photoGallery);
          photoCountEl.innerText = localPhotos.length;
        } else {
          photoGallery.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:24px; grid-column:1/-1;">この日に提出された写真・スクショはありません</div>';
        }
      } else {
        renderPhotoCards(photos, photoGallery);
      }

      lucide.createIcons();
    }

    function renderPhotoCards(photos, container) {
      const subjectNames = {
        kanji: '✍️ 漢検準2級',
        english: '🎧 英検準2級',
        extra1: '📐 追加教科①',
        extra2: '🔬 追加教科②',
        general: '📸 日課・提出写真'
      };

      container.innerHTML = '';
      photos.forEach(p => {
        const subName = subjectNames[p.subject] || p.subject;
        const card = document.createElement('div');
        card.className = 'photo-thumb-card';
        card.onclick = () => openPhotoLightbox(p.viewUrl, `${subName} (${p.timestamp || ''})`);
        
        card.innerHTML = `
          <img src="${p.thumbnailUrl || p.viewUrl}" class="photo-thumb-img" alt="${subName}" loading="lazy" onerror="this.src='ass_and_salt.png'">
          <div class="photo-thumb-info">
            <div style="font-size:0.85rem; font-weight:800; color:#fff; display:flex; justify-content:space-between; align-items:center;">
              <span>${subName}</span>
              ${p.gdriveSynced ? '<span style="font-size:0.68rem; color:var(--accent-cyan); background:rgba(56,189,248,0.15); padding:2px 6px; border-radius:4px;">☁️ Drive保存</span>' : ''}
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">
              🕒 ${p.timestamp || '提出済'}
            </div>
          </div>
        `;
        container.appendChild(card);
      });
    }

    function renderParentLocalFallback(dateStr) {
      renderParentDashboardUI({ progress: { taskState: taskState }, photos: [] }, dateStr);
    }

    /* Lightbox Modal */
    function openPhotoLightbox(imgUrl, caption) {
      const modal = document.getElementById('photoLightboxModal');
      const img = document.getElementById('lightboxImg');
      const cap = document.getElementById('lightboxCaption');

      img.src = imgUrl;
      cap.innerHTML = `${caption} <a href="${imgUrl}" target="_blank" style="color:var(--accent-cyan); margin-left:10px; font-size:0.85rem;">[別タブで開く]</a>`;
      modal.classList.add('active');
    }

    function closePhotoLightbox(e) {
      if (e) e.stopPropagation();
      const modal = document.getElementById('photoLightboxModal');
      modal.classList.remove('active');
    }

    function showPwaGuide() {
      alert('【📱 全端末対応：アプリ化（ホーム画面追加）方法】\n\n' +
        '■ iPhone / iPad (Safari):\n' +
        '画面下（または右上）の「共有ボタン（四角から上矢印 ⎋）」をタップ ➔「ホーム画面に追加」を選択。\n\n' +
        '■ Android / Androidタブレット (Chrome):\n' +
        '画面右上の「︙（メニュー）」をタップ ➔「アプリをインストール」または「ホーム画面に追加」を選択。\n\n' +
        '■ Amazon Fireタブレット (Silkブラウザ):\n' +
        '画面右上の「︙（メニュー）」をタップ ➔「ホーム画面に追加」または「ブックマーク」から追加。\n\n' +
        '※追加後は全画面の専用アプリとして高速起動します！');
    }

    function showToast(msg) {
      const t = document.getElementById('toastBox');
      t.innerText = msg;
      t.classList.add('show');
      setTimeout(() => { t.classList.remove('show'); }, 2500);
    }

    function initApp() {
      if (typeof APP_VERSION !== 'undefined') {
        const badge = document.getElementById('appVerBadge');
        if (badge) badge.innerText = `v${APP_VERSION}`;
      }
      loadSavedState();
      calculateDailyReward();
      checkOfflineStatus();
      lucide.createIcons();
    }

    window.onload = initApp;
  </script>
</body>
</html>
