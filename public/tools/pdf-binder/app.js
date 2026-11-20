/**
 * app.js
 * 構造計算書 PDF統合・製本ツール UIコントローラー
 */
(function () {
  'use strict';

  const OFFICE_PROFILE_KEY = 'mdo3_pdf_binder_office_profile_v1';

  const state = {
    currentStep: 1,
    a4File: null,      // { name, bytes, totalPages, pdfJsDoc, chapterMap }
    a3File: null,      // { name, bytes, totalPages, matches }
    preFiles: [],      // グループA: 構造計算資料
    postFiles: [],     // グループC: 別紙計算書
    groundFiles: [],   // グループD: 地盤関係資料（任意・0件時は非出力）
    ngEntries: [],     // STEP 3: NG・エラー追記リスト
    selectedNgId: null,
    previewZoom: 1.0,
    previewPageInfo: null, // { a4Page, width, height, scale }
    previewRenderTask: null,
    selectedStep2FileId: null,
    step2RenderTask: null,
    besshiDividerManual: false,
    outFileNameEdited: false,
    fileSeq: 1,
  };

  // DOMショートカット
  const $ = (id) => document.getElementById(id);

  // =========================================================
  // 1. 初期化 & イベントバインド
  // =========================================================
  function init() {
    bindStepper();
    bindDropZones();
    bindStep2PreviewControls();
    bindCoverLivePreview();
    bindNgControls();
    bindBuildControls();
    loadOfficeProfile();

    $('btnResetAll').addEventListener('click', () => {
      if (confirm('読み込み済みのPDFと設定をすべてリセットしますか？')) {
        location.reload();
      }
    });

    $('btnToStep2').addEventListener('click', () => goToStep(2));
    $('btnToStep5').addEventListener('click', () => goToStep(5));
    document.querySelectorAll('[data-goto]').forEach((btn) => {
      btn.addEventListener('click', () => goToStep(Number(btn.dataset.goto)));
    });
  }

  function bindStepper() {
    document.querySelectorAll('.step-tab').forEach((tab) => {
      tab.addEventListener('click', () => goToStep(Number(tab.dataset.step)));
    });
  }

  function goToStep(stepNum) {
    state.currentStep = stepNum;
    document.querySelectorAll('.step-tab').forEach((t) => {
      t.classList.toggle('active', Number(t.dataset.step) === stepNum);
    });
    document.querySelectorAll('.step-panel').forEach((p) => {
      p.classList.toggle('active', p.id === `stepPanel${stepNum}`);
    });
    if (stepNum === 2) renderStep2Lists();
    if (stepNum === 3) renderNgList();
    if (stepNum === 4) updateCoverPreview();
    if (stepNum === 5) renderFinalSummary();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // =========================================================
  // 2. STEP 1: ファイル投入・自動解析・分類
  // =========================================================
  function bindDropZones() {
    const setupZone = (areaEl, inputEl, handler) => {
      areaEl.addEventListener('click', () => inputEl.click());
      areaEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        areaEl.classList.add('drag-over');
      });
      areaEl.addEventListener('dragleave', () => areaEl.classList.remove('drag-over'));
      areaEl.addEventListener('drop', (e) => {
        e.preventDefault();
        areaEl.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) handler(e.dataTransfer.files);
      });
      inputEl.addEventListener('change', () => {
        if (inputEl.files.length > 0) handler(inputEl.files);
        inputEl.value = '';
      });
    };

    setupZone(
      document.querySelector('.drop-area[data-target="a4"]'),
      $('inputFileA4'),
      (files) => handleA4Upload(files[0])
    );
    setupZone(
      document.querySelector('.drop-area[data-target="a3"]'),
      $('inputFileA3'),
      (files) => handleA3Upload(files[0])
    );
    setupZone(
      document.querySelector('.drop-area[data-target="others"]'),
      $('inputFileOthers'),
      (files) => handleOthersUpload(Array.from(files))
    );
  }

  async function handleA4Upload(file) {
    const statusEl = $('statusA4');
    statusEl.classList.remove('hidden');
    statusEl.innerHTML = `⏳ <strong>${escapeHtml(file.name)}</strong> を解析中...`;

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await window.PdfBinderEngine.analyzeArchitrendA4(bytes, (msg) => {
        statusEl.innerHTML = `⏳ ${escapeHtml(msg)}`;
      });

      // 旧A4ドキュメントがあればメモリ解放
      if (state.a4File && state.a4File.pdfJsDoc) {
        try { await state.a4File.pdfJsDoc.destroy(); } catch { }
      }

      state.a4File = {
        name: file.name,
        bytes,
        totalPages: result.totalPages,
        pdfJsDoc: result.pdfJsDoc,
        chapterMap: result.chapterMap,
      };
      state.ngEntries = result.ngEntries;
      state.selectedNgId = null;
      state.previewPageInfo = null;

      // 新表紙フォームへ自動抽出値を反映
      applyExtractedCoverData(result.coverData);

      // NGバッジ更新
      updateNgBadge();

      statusEl.innerHTML = `✅ <strong>${escapeHtml(file.name)}</strong>（全 ${result.totalPages} 頁 / 章索引 ${result.chapterMap.size} 件 / NG検出 ${result.ngEntries.length} 件）`;
      $('step1Hint').textContent = '解析完了！必要に応じてA3図面・添付PDFを追加し、「次へ」を押してください。';

      // 既にA3が投入されていれば再照合
      if (state.a3File) {
        await runA3Matching();
      }
    } catch (err) {
      console.error(err);
      statusEl.innerHTML = `❌ 解析エラー: ${escapeHtml(err.message)}`;
    }
  }

  async function handleA3Upload(file) {
    const statusEl = $('statusA3');
    statusEl.classList.remove('hidden');
    statusEl.innerHTML = `⏳ <strong>${escapeHtml(file.name)}</strong> を読込中...`;

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      state.a3File = { name: file.name, bytes, totalPages: 0, matches: [] };
      if (state.a4File) {
        await runA3Matching();
      } else {
        const jsDoc = await window.PdfBinderEngine.openPdfJs(bytes);
        try {
          state.a3File.totalPages = jsDoc.numPages;
          statusEl.innerHTML = `✅ <strong>${escapeHtml(file.name)}</strong>（${jsDoc.numPages} 枚）※A4本体投入後に自動照合します`;
        } finally {
          await jsDoc.destroy();
        }
      }
    } catch (err) {
      console.error(err);
      statusEl.innerHTML = `❌ 読込エラー: ${escapeHtml(err.message)}`;
    }
  }

  async function runA3Matching() {
    if (!state.a4File || !state.a3File) return;
    const statusEl = $('statusA3');
    const res = await window.PdfBinderEngine.matchA3ToA4(
      state.a3File.bytes,
      state.a4File.chapterMap,
      (msg) => { statusEl.innerHTML = `⏳ ${escapeHtml(msg)}`; }
    );
    state.a3File.totalPages = res.totalA3;
    state.a3File.matches = res.matches;

    const matchedCount = res.matches.filter((m) => m.matched).length;
    statusEl.innerHTML = `✅ <strong>${escapeHtml(state.a3File.name)}</strong>（全 ${res.totalA3} 枚中 <strong>${matchedCount} 枚</strong> 一致）`;

    // 照合テーブル表示
    $('a3MatchSummaryCard').classList.remove('hidden');
    $('a3MatchStats').innerHTML = `
      <span class="stat-pill">A3総枚数: <strong>${res.totalA3} 枚</strong></span>
      <span class="stat-pill">差替一致: <strong style="color:#34d399;">${matchedCount} 枚</strong></span>
      <span class="stat-pill">不一致: <strong style="color:${res.totalA3 - matchedCount > 0 ? '#f87171' : '#94a3b8'};">${res.totalA3 - matchedCount} 枚</strong></span>
    `;
    const tbody = $('a3MatchTable').querySelector('tbody');
    tbody.innerHTML = res.matches
      .map(
        (m) => `
      <tr>
        <td>A3-${m.a3Page}</td>
        <td><strong>${escapeHtml(m.chapNo)}</strong></td>
        <td>${m.a4Page ? `P.${m.a4Page}` : '-'}</td>
        <td>${escapeHtml(m.title)}</td>
        <td>${m.matched ? '<span style="color:#34d399;font-weight:700;">✔ 自動差替OK</span>' : '<span style="color:#f87171;">⚠ 未一致</span>'}</td>
      </tr>`
      )
      .join('');
  }

  /**
   * 添付PDF群の自動分類ルール（4グループ構成）
   * - 耐風梁・不整形スラブ・基礎隅部 → グループC（別紙計算書）の先頭へ自動配置
   * - 地盤調査・地盤改良・改良計画・改良設計・柱状改良・杭伏・SWS・SDS → グループD（地盤関係資料）
   * - めり込み補強・人通口・大引・別紙・補強計算 → グループC（別紙計算書）
   * - その他（屋根耐風・金物認定書・土台プレート・詳細計算法屋根等） → グループA（構造計算資料）
   */
  function classifyAttachment(fileName) {
    const n = fileName;
    const isPriorityHead = /耐風梁|不整形スラブ|基礎隅部/.test(n);
    if (isPriorityHead) return { group: 'post', priorityHead: true };

    if (/地盤調査|地盤改良|改良計画|改良設計|柱状改良|ボーリング|杭伏|SWS|SDS/i.test(n)) {
      return { group: 'ground', priorityHead: false };
    }
    if (/めり込み|人通口|大引|別紙|補強計算/.test(n)) {
      return { group: 'post', priorityHead: false };
    }
    return { group: 'pre', priorityHead: false };
  }

  function getGroupList(groupKey) {
    if (groupKey === 'pre') return state.preFiles;
    if (groupKey === 'ground') return state.groundFiles;
    return state.postFiles;
  }

  async function handleOthersUpload(files) {
    const statusEl = $('statusOthers');
    statusEl.classList.remove('hidden');
    statusEl.innerHTML = `⏳ ${files.length} 件のPDFを解析・表題抽出中...`;

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.pdf')) continue;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const info = await window.PdfBinderEngine.inspectAttachmentPdf(bytes, file.name);

      const { group, priorityHead } = classifyAttachment(file.name);

      const item = {
        id: `att_${state.fileSeq++}`,
        fileName: file.name,
        title: info.suggestedTitle, // 公的表題（認定書・接合部性能試験報告書等）を自動取得
        bytes,
        totalPages: info.totalPages,
        pageRange: info.defaultRange,
        noteHint: info.noteHint,
        priorityHead,
        hasBesshiCover: info.hasBesshiCover,
      };

      if (group === 'pre') {
        state.preFiles.push(item);
      } else if (group === 'ground') {
        // 地盤調査報告書が先頭、地盤改良設計書が後続になるよう配置
        if (/地盤調査/.test(file.name)) {
          const lastSurvIdx = state.groundFiles.reduce((acc, x, idx) => (/地盤調査/.test(x.fileName) ? idx : acc), -1);
          state.groundFiles.splice(lastSurvIdx + 1, 0, item);
        } else {
          state.groundFiles.push(item);
        }
      } else if (priorityHead) {
        // 耐風梁・不整形スラブ・基礎隅部は必ず別紙計算書の先頭ブロックへ
        const lastPriorityIdx = state.postFiles.reduce((acc, x, idx) => (x.priorityHead ? idx : acc), -1);
        state.postFiles.splice(lastPriorityIdx + 1, 0, item);
      } else {
        state.postFiles.push(item);
      }
    }

    // グループCに複数のAT別紙表紙付きファイルがある場合、2つ目以降の重複表紙(P.1)を自動スキップ提案
    normalizeDuplicateBesshiCovers();
    syncBesshiDividerState();

    const totalCount = state.preFiles.length + state.postFiles.length + state.groundFiles.length;
    statusEl.innerHTML = `✅ 合計 <strong>${totalCount} ファイル</strong> 読込済（構造計算資料: ${state.preFiles.length}件 ／ 別紙計算書: ${state.postFiles.length}件 ／ 地盤関係資料: ${state.groundFiles.length}件）`;
  }

  function normalizeDuplicateBesshiCovers() {
    let foundFirstCover = false;
    for (const item of state.postFiles) {
      if (item.hasBesshiCover) {
        if (!foundFirstCover) {
          foundFirstCover = true;
        } else if (!item.pageRange && item.totalPages >= 2) {
          item.pageRange = `2-${item.totalPages}`;
          item.noteHint = '※重複「別紙計算書」表紙(P.1)自動除外';
        }
      }
    }
  }

  function syncBesshiDividerState() {
    const chk = $('chkInsertBesshiDivider');
    const note = $('besshiDividerNote');
    if (!chk || !note) return;

    if (state.postFiles.length === 0) {
      if (!state.besshiDividerManual) chk.checked = false;
      note.textContent = '';
      return;
    }

    const firstHasAtCover = Boolean(state.postFiles[0] && state.postFiles[0].hasBesshiCover);
    if (firstHasAtCover) {
      if (!state.besshiDividerManual) chk.checked = false;
      note.textContent = `✔ 先頭ファイル「${state.postFiles[0].fileName}」にARCHITRENDの「別紙計算書」表紙が含まれているため、そのまま中表紙として使用します。`;
    } else {
      if (!state.besshiDividerManual) chk.checked = true;
      note.textContent = '💡 ARCHITRENDの別紙表紙が無いため、ツール側で「別紙計算書」中表紙ページを先頭に自動追加します（チェックでOFF可）。';
    }
  }

  function bindStep2PreviewControls() {
    const chk = $('chkInsertBesshiDivider');
    if (chk) {
      chk.addEventListener('change', () => {
        state.besshiDividerManual = true;
      });
    }
    const qTitle = $('step2QuickTitle');
    const qRange = $('step2QuickRange');
    if (qTitle) {
      qTitle.addEventListener('input', () => {
        const found = findAttachmentById(state.selectedStep2FileId);
        if (!found) return;
        found.title = qTitle.value;
        const rowInp = document.querySelector(`.inp-title[data-id="${found.id}"]`);
        if (rowInp && rowInp.value !== qTitle.value) rowInp.value = qTitle.value;
      });
    }
    if (qRange) {
      qRange.addEventListener('change', () => {
        const found = findAttachmentById(state.selectedStep2FileId);
        if (!found) return;
        found.pageRange = qRange.value.trim();
        renderStep2Lists();
      });
    }
  }

  function findAttachmentById(id) {
    if (!id) return null;
    return (
      state.preFiles.find((x) => x.id === id) ||
      state.postFiles.find((x) => x.id === id) ||
      state.groundFiles.find((x) => x.id === id) ||
      null
    );
  }

  async function selectStep2PreviewFile(itemId) {
    const item = findAttachmentById(itemId);
    if (!item) return;
    state.selectedStep2FileId = item.id;

    document.querySelectorAll('.file-row').forEach((r) => {
      r.classList.toggle('selected-preview', r.dataset.id === item.id);
    });

    $('step2QuickEditBox').classList.remove('hidden');
    $('step2QuickTitle').value = item.title;
    $('step2QuickRange').value = item.pageRange || '';
    $('step2PreviewPageBadge').textContent = `${item.fileName} (全${item.totalPages}頁 / 1頁目)`;

    const canvas = $('step2PreviewCanvas');
    const placeholder = $('step2PreviewPlaceholder');
    placeholder.classList.add('hidden');
    canvas.classList.remove('hidden');

    if (state.step2RenderTask) {
      try { state.step2RenderTask.cancel(); } catch { }
      state.step2RenderTask = null;
    }

    const jsDoc = await window.PdfBinderEngine.openPdfJs(item.bytes);
    let task = null;
    try {
      if (state.selectedStep2FileId !== item.id) return;
      const page = await jsDoc.getPage(1);
      if (state.selectedStep2FileId !== item.id) return;
      const baseVp = page.getViewport({ scale: 1.0 });
      const targetWidth = 370;
      const scale = targetWidth / baseVp.width;
      const vp = page.getViewport({ scale });

      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext('2d');
      task = page.render({ canvasContext: ctx, viewport: vp });
      state.step2RenderTask = task;
      await task.promise;
    } catch (err) {
      if (!err || err.name !== 'RenderingCancelledException') console.error(err);
    } finally {
      if (task && state.step2RenderTask === task) state.step2RenderTask = null;
      await jsDoc.destroy();
    }
  }

  // =========================================================
  // 3. STEP 2: 並べ替え・1ファイル1アノテーション編集・ページ範囲指定
  // =========================================================
  function renderStep2Lists() {
    syncBesshiDividerState();
    const gNote = $('groundDividerNote');
    if (gNote) {
      gNote.textContent =
        state.groundFiles.length === 0
          ? '※地盤関係資料が0件の場合、目次にもPDFにも「地盤関係資料」は一切出力されません。'
          : `✔ ${state.groundFiles.length} 件の地盤関係資料が「地盤関係資料」として目次にまとめられます。`;
    }
    renderGroupList('pre', $('listGroupPre'), state.preFiles, $('metaGroupPre'));
    renderGroupList('post', $('listGroupPost'), state.postFiles, $('metaGroupPost'));
    renderGroupList('ground', $('listGroupGround'), state.groundFiles, $('metaGroupGround'));

    // 本体表示
    if (state.a4File) {
      const a3Enabled = $('chkEnableA3Replace').checked && state.a3File;
      const a3Matched = a3Enabled ? state.a3File.matches.filter((m) => m.matched).length : 0;
      $('metaGroupMain').textContent = `${state.a4File.totalPages} 頁`;
      $('mainDocSummary').innerHTML = `
        <strong>ARCHITREND ZERO 構造計算書</strong>（${escapeHtml(state.a4File.name)} / 全 ${state.a4File.totalPages} 頁）
        ${a3Enabled ? `<span class="tag tag-accent" style="margin-left:8px;">A3図面 ${a3Matched} 枚 自動差替ON</span>` : '<span class="tag tag-optional" style="margin-left:8px;">A4そのまま出力</span>'}
      `;
    }
  }

  function renderGroupList(groupKey, containerEl, list, metaEl) {
    let sumPages = 0;
    for (const item of list) {
      sumPages += window.PdfBinderEngine.parsePageRange(item.pageRange, item.totalPages).length;
    }
    metaEl.textContent = `${list.length} ファイル / 計 ${sumPages} 頁`;

    if (list.length === 0) {
      containerEl.innerHTML = `<div class="text-muted" style="padding:10px;text-align:center;">ファイルがありません（他グループからドラッグ移動も可能です）</div>`;
      bindContainerDrop(containerEl, groupKey);
      return;
    }

    containerEl.innerHTML = list
      .map((item, idx) => {
        const useCount = window.PdfBinderEngine.parsePageRange(item.pageRange, item.totalPages).length;
        const isSel = item.id === state.selectedStep2FileId;
        return `
        <div class="file-row ${item.priorityHead ? 'priority-head' : ''} ${isSel ? 'selected-preview' : ''}" draggable="true" data-id="${item.id}" data-group="${groupKey}" data-idx="${idx}">
          <div class="drag-handle" title="ドラッグして並べ替え"><span class="material-symbols-outlined">drag_indicator</span></div>
          <div class="file-orig-name" title="${escapeHtml(item.fileName)}（クリックで1頁プレビュー）" style="cursor:pointer;">
            ${item.priorityHead ? '<span class="tag tag-optional" style="margin-right:4px;">先頭</span>' : ''}
            ${escapeHtml(item.fileName)}
            <small>元 ${item.totalPages}頁 ${escapeHtml(item.noteHint || '')}</small>
          </div>
          <div>
            <input type="text" class="inp-title" data-id="${item.id}" data-group="${groupKey}" value="${escapeHtml(item.title)}" placeholder="目次アノテーションタイトル">
          </div>
          <div>
            <input type="text" class="inp-range" data-id="${item.id}" data-group="${groupKey}" value="${escapeHtml(item.pageRange)}" placeholder="全頁 (例: 2-7)">
          </div>
          <div style="text-align:right;font-weight:700;color:#60a5fa;">${useCount} 頁</div>
          <div class="row-actions">
            <button type="button" class="icon-btn btn-preview-p1" title="トップページ(1頁目)を確認"><span class="material-symbols-outlined">visibility</span></button>
            <button type="button" class="icon-btn btn-move-up" title="上へ"><span class="material-symbols-outlined">arrow_upward</span></button>
            <button type="button" class="icon-btn btn-move-down" title="下へ"><span class="material-symbols-outlined">arrow_downward</span></button>
            <button type="button" class="icon-btn danger btn-del" title="除外"><span class="material-symbols-outlined">delete</span></button>
          </div>
        </div>`;
      })
      .join('');

    // イベントバインド
    containerEl.querySelectorAll('.inp-title').forEach((inp) => {
      inp.addEventListener('focus', () => selectStep2PreviewFile(inp.dataset.id));
      inp.addEventListener('input', () => {
        const target = list.find((x) => x.id === inp.dataset.id);
        if (target) {
          target.title = inp.value;
          if (state.selectedStep2FileId === target.id) {
            $('step2QuickTitle').value = inp.value;
          }
        }
      });
    });
    containerEl.querySelectorAll('.inp-range').forEach((inp) => {
      inp.addEventListener('change', () => {
        const target = list.find((x) => x.id === inp.dataset.id);
        if (target) {
          target.pageRange = inp.value.trim();
          renderStep2Lists();
        }
      });
    });
    containerEl.querySelectorAll('.file-row').forEach((row) => {
      const idx = Number(row.dataset.idx);
      const itemId = row.dataset.id;
      row.querySelector('.file-orig-name').addEventListener('click', () => selectStep2PreviewFile(itemId));
      row.querySelector('.btn-preview-p1').addEventListener('click', () => selectStep2PreviewFile(itemId));
      row.querySelector('.btn-move-up').addEventListener('click', () => {
        if (idx > 0) {
          [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
          renderStep2Lists();
        }
      });
      row.querySelector('.btn-move-down').addEventListener('click', () => {
        if (idx < list.length - 1) {
          [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]];
          renderStep2Lists();
        }
      });
      row.querySelector('.btn-del').addEventListener('click', () => {
        list.splice(idx, 1);
        renderStep2Lists();
      });

      // Drag & Drop 並べ替え
      row.addEventListener('dragstart', (e) => {
        row.classList.add('dragging');
        e.dataTransfer.setData('text/plain', JSON.stringify({ id: row.dataset.id, fromGroup: groupKey }));
      });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', (e) => e.preventDefault());
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const payload = safeJsonParse(e.dataTransfer.getData('text/plain'));
        if (!payload || payload.id === row.dataset.id) return;
        moveItemBetweenGroups(payload.id, payload.fromGroup, groupKey, idx);
      });
    });

    bindContainerDrop(containerEl, groupKey);
  }

  function bindContainerDrop(containerEl, targetGroup) {
    containerEl.ondragover = (e) => {
      e.preventDefault();
      containerEl.classList.add('drag-target');
    };
    containerEl.ondragleave = () => containerEl.classList.remove('drag-target');
    containerEl.ondrop = (e) => {
      e.preventDefault();
      containerEl.classList.remove('drag-target');
      const payload = safeJsonParse(e.dataTransfer.getData('text/plain'));
      if (!payload) return;
      const destList = getGroupList(targetGroup);
      moveItemBetweenGroups(payload.id, payload.fromGroup, targetGroup, destList.length);
    };
  }

  function moveItemBetweenGroups(itemId, fromGroup, toGroup, targetIndex) {
    const srcList = getGroupList(fromGroup);
    const dstList = getGroupList(toGroup);
    const srcIdx = srcList.findIndex((x) => x.id === itemId);
    if (srcIdx === -1) return;
    let insertIdx = targetIndex;
    if (fromGroup === toGroup && srcIdx < insertIdx) {
      insertIdx = Math.max(0, insertIdx - 1);
    }
    const [moved] = srcList.splice(srcIdx, 1);
    dstList.splice(Math.min(insertIdx, dstList.length), 0, moved);
    renderStep2Lists();
  }

  // =========================================================
  // 4. STEP 3: NG・エラー箇所 対応内容追記 & プレビュー
  // =========================================================
  function updateNgBadge() {
    const badge = $('ngBadgeCount');
    if (state.ngEntries.length > 0) {
      badge.textContent = state.ngEntries.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  function bindNgControls() {
    // 定型文チップクリックで選択中NG項目へ入力
    document.querySelectorAll('.chip[data-preset]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const target = state.ngEntries.find((x) => x.id === state.selectedNgId) || state.ngEntries[0];
        if (!target) return;
        target.note = chip.dataset.preset;
        renderNgList();
        renderNgOverlayMarkers();
      });
    });

    // 任意ページへ追記追加
    $('btnAddCustomAnnot').addEventListener('click', () => {
      if (!state.a4File) {
        alert('先にSTEP 1でARCHITREND ZERO本体(A4全)を読み込んでください。');
        return;
      }
      const pStr = prompt(`追記したいA4本体のページ番号を入力してください（1〜${state.a4File.totalPages}）`, '2');
      if (!pStr) return;
      const pNum = parseInt(pStr, 10);
      if (isNaN(pNum) || pNum < 1 || pNum > state.a4File.totalPages) {
        alert('有効なページ番号を入力してください。');
        return;
      }
      const newEntry = {
        id: `ng_custom_${Date.now()}`,
        type: pNum === 2 ? 'toc' : 'body',
        a4Page: pNum,
        chapNo: pNum === 2 ? '目次' : `P.${pNum}`,
        label: `任意追記 (A4本体 P.${pNum})`,
        note: '→別紙検定参照',
        x: 360,
        y: 720,
        fontSize: 9.5,
        enabled: true,
      };
      state.ngEntries.push(newEntry);
      state.selectedNgId = newEntry.id;
      updateNgBadge();
      renderNgList();
      renderPdfPreviewPage(pNum);
    });

    // ズーム制御
    $('btnPreviewZoomIn').addEventListener('click', () => {
      state.previewZoom = Math.min(2.0, +(state.previewZoom + 0.15).toFixed(2));
      $('previewZoomLabel').textContent = `${Math.round(state.previewZoom * 100)}%`;
      if (state.previewPageInfo) renderPdfPreviewPage(state.previewPageInfo.a4Page);
    });
    $('btnPreviewZoomOut').addEventListener('click', () => {
      state.previewZoom = Math.max(0.5, +(state.previewZoom - 0.15).toFixed(2));
      $('previewZoomLabel').textContent = `${Math.round(state.previewZoom * 100)}%`;
      if (state.previewPageInfo) renderPdfPreviewPage(state.previewPageInfo.a4Page);
    });

    // キャンバスクリックで選択中NG追記の座標を移動
    $('pdfPreviewCanvas').addEventListener('click', (e) => {
      if (!state.selectedNgId || !state.previewPageInfo) return;
      const target = state.ngEntries.find((x) => x.id === state.selectedNgId);
      if (!target || target.a4Page !== state.previewPageInfo.a4Page) return;

      const rect = e.target.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const { height, scale } = state.previewPageInfo;

      // 画面座標(左上原点) → PDF座標(左下原点)
      target.x = Math.round(clickX / scale);
      target.y = Math.round(height - clickY / scale);
      renderNgList();
      renderNgOverlayMarkers();
    });
  }

  function renderNgList() {
    const wrap = $('ngItemsList');
    if (state.ngEntries.length === 0) {
      wrap.innerHTML = `<p class="text-muted">NG箇所は検出されませんでした。「任意ページへ追記追加」から手動で追記することもできます。</p>`;
      return;
    }

    if (!state.selectedNgId && state.ngEntries.length > 0) {
      state.selectedNgId = state.ngEntries[0].id;
      renderPdfPreviewPage(state.ngEntries[0].a4Page);
    }

    wrap.innerHTML = state.ngEntries
      .map((item) => {
        const isActive = item.id === state.selectedNgId;
        return `
        <div class="ng-item ${isActive ? 'active' : ''}" data-id="${item.id}">
          <div class="ng-item-head">
            <div class="flex-row">
              <input type="checkbox" class="ng-chk" ${item.enabled ? 'checked' : ''} title="印字する">
              <span class="ng-badge ${item.type === 'toc' ? 'toc' : ''}">${item.type === 'toc' ? '目次NG' : `本文 ${escapeHtml(item.chapNo)}`}</span>
              <strong style="font-size:0.8rem;">P.${item.a4Page}</strong>
            </div>
            <button type="button" class="icon-btn danger ng-del" title="削除"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="text-muted" style="font-size:0.75rem;margin-bottom:6px;">${escapeHtml(item.label)}</div>
          <input type="text" class="ng-note-inp" value="${escapeHtml(item.note)}" placeholder="対応内容を入力（例：→めり込みNG / 土台プレートⅡ設置）">
          <div class="ng-pos-btns">
            <button type="button" class="ng-pos-btn btn-pos-top" title="ページ上部余白へ配置">⬆ 上余白</button>
            <button type="button" class="ng-pos-btn btn-pos-bottom" title="ページ下部余白へ配置">⬇ 下余白</button>
            <button type="button" class="ng-pos-btn btn-pos-ngright" title="NG文字の右横へ配置">➡ NG右横</button>
            <button type="button" class="ng-pos-btn btn-sz-down" title="文字を小さく">A-</button>
            <button type="button" class="ng-pos-btn btn-sz-up" title="文字を大きく">A+</button>
          </div>
          <div class="ng-coord-row">
            <span>印字座標: X=${Math.round(item.x)}pt, Y=${Math.round(item.y)}pt</span>
            <span>文字サイズ: ${item.fontSize}pt</span>
          </div>
        </div>`;
      })
      .join('');

    wrap.querySelectorAll('.ng-item').forEach((el) => {
      const item = state.ngEntries.find((x) => x.id === el.dataset.id);
      el.addEventListener('click', (e) => {
        if (e.target.closest('.ng-del') || e.target.closest('.ng-chk') || e.target.closest('.ng-pos-btn')) return;
        state.selectedNgId = item.id;
        wrap.querySelectorAll('.ng-item').forEach((x) => x.classList.toggle('active', x.dataset.id === item.id));
        renderPdfPreviewPage(item.a4Page);
      });
      el.querySelector('.ng-chk').addEventListener('change', (e) => {
        item.enabled = e.target.checked;
        renderNgOverlayMarkers();
      });
      el.querySelector('.ng-note-inp').addEventListener('input', (e) => {
        item.note = e.target.value;
        renderNgOverlayMarkers();
      });
      el.querySelector('.btn-pos-top').addEventListener('click', () => {
        const ph = item.pageHeight || (state.previewPageInfo ? state.previewPageInfo.height : 842);
        item.x = 48;
        item.y = Math.round(ph - 38);
        state.selectedNgId = item.id;
        renderNgList();
        renderPdfPreviewPage(item.a4Page);
      });
      el.querySelector('.btn-pos-bottom').addEventListener('click', () => {
        item.x = 48;
        item.y = 52;
        state.selectedNgId = item.id;
        renderNgList();
        renderPdfPreviewPage(item.a4Page);
      });
      el.querySelector('.btn-pos-ngright').addEventListener('click', () => {
        if (typeof item.ngOriginX === 'number' && typeof item.ngOriginY === 'number') {
          item.x = item.ngOriginX;
          item.y = item.ngOriginY;
        }
        state.selectedNgId = item.id;
        renderNgList();
        renderPdfPreviewPage(item.a4Page);
      });
      el.querySelector('.btn-sz-down').addEventListener('click', () => {
        item.fontSize = Math.max(6.5, +(item.fontSize - 0.5).toFixed(1));
        renderNgList();
        renderNgOverlayMarkers();
      });
      el.querySelector('.btn-sz-up').addEventListener('click', () => {
        item.fontSize = Math.min(16, +(item.fontSize + 0.5).toFixed(1));
        renderNgList();
        renderNgOverlayMarkers();
      });
      el.querySelector('.ng-del').addEventListener('click', () => {
        state.ngEntries = state.ngEntries.filter((x) => x.id !== item.id);
        if (state.selectedNgId === item.id) state.selectedNgId = state.ngEntries[0]?.id || null;
        updateNgBadge();
        renderNgList();
        renderNgOverlayMarkers();
      });
    });
  }

  async function renderPdfPreviewPage(a4PageNum) {
    if (!state.a4File || !state.a4File.pdfJsDoc) return;
    if (state.previewRenderTask) {
      try { state.previewRenderTask.cancel(); } catch { }
      state.previewRenderTask = null;
    }
    $('previewTitle').textContent = `A4本体 P.${a4PageNum} プレビュー（クリックで赤字位置を移動）`;
    const page = await state.a4File.pdfJsDoc.getPage(a4PageNum);
    const baseVp = page.getViewport({ scale: 1.0 });
    const scale = state.previewZoom * 1.1;
    const vp = page.getViewport({ scale });

    const canvas = $('pdfPreviewCanvas');
    canvas.width = vp.width;
    canvas.height = vp.height;
    const ctx = canvas.getContext('2d');
    const renderTask = page.render({ canvasContext: ctx, viewport: vp });
    state.previewRenderTask = renderTask;
    try {
      await renderTask.promise;
    } catch (err) {
      if (err && err.name === 'RenderingCancelledException') return;
      throw err;
    } finally {
      if (state.previewRenderTask === renderTask) state.previewRenderTask = null;
    }

    state.previewPageInfo = {
      a4Page: a4PageNum,
      width: baseVp.width,
      height: baseVp.height,
      scale,
    };
    renderNgOverlayMarkers();
  }

  function renderNgOverlayMarkers() {
    const layer = $('annotOverlayLayer');
    layer.innerHTML = '';
    if (!state.previewPageInfo) return;
    const { a4Page, width, height, scale } = state.previewPageInfo;

    const items = state.ngEntries.filter((x) => x.a4Page === a4Page && x.enabled && x.note.trim());
    for (const item of items) {
      const marker = document.createElement('div');
      marker.className = 'annot-marker';
      marker.textContent = item.note.trim();
      marker.title = 'ドラッグして位置を移動できます';
      marker.style.left = `${item.x * scale}px`;
      marker.style.top = `${(height - item.y) * scale}px`;
      marker.style.fontSize = `${Math.max(9, item.fontSize * scale)}px`;

      // マウスドラッグで赤字位置を直接移動
      marker.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        state.selectedNgId = item.id;
        marker.classList.add('dragging');
        const startClientX = ev.clientX;
        const startClientY = ev.clientY;
        const origX = item.x;
        const origY = item.y;

        const onMouseMove = (moveEv) => {
          const dxPdf = (moveEv.clientX - startClientX) / scale;
          const dyPdf = -(moveEv.clientY - startClientY) / scale;
          item.x = Math.round(Math.min(Math.max(origX + dxPdf, 10), width - 30));
          item.y = Math.round(Math.min(Math.max(origY + dyPdf, 15), height - 15));
          marker.style.left = `${item.x * scale}px`;
          marker.style.top = `${(height - item.y) * scale}px`;
        };
        const onMouseUp = () => {
          marker.classList.remove('dragging');
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          renderNgList();
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });

      layer.appendChild(marker);
    }
  }

  // =========================================================
  // 5. STEP 4: 新表紙データ入力 & 事務所プロファイル保存
  // =========================================================
  const coverFieldMap = [
    ['covSubtitle', 'pvSubtitle'],
    ['covProjectName', 'pvProjectName'],
    ['covAddress', 'pvAddress'],
    ['covUsage', 'pvUsage'],
    ['covStructure', 'pvStructure'],
    ['covArea', 'pvArea'],
    ['covDate', 'pvDate'],
    ['covOfficeReg', 'pvOfficeReg'],
    ['covOfficeName', 'pvOfficeName'],
    ['covDesignerReg', 'pvDesignerReg'],
    ['covDesignerName', 'pvDesignerName'],
    ['covProgram1', 'pvProgram1'],
    ['covProgram2', 'pvProgram2'],
    ['covDocNo', 'pvDocNo'],
  ];

  function bindCoverLivePreview() {
    coverFieldMap.forEach(([inpId]) => {
      $(inpId).addEventListener('input', updateCoverPreview);
    });
    $('btnSaveOfficeProfile').addEventListener('click', () => {
      const profile = {
        officeReg: $('covOfficeReg').value,
        officeName: $('covOfficeName').value,
        designerReg: $('covDesignerReg').value,
        designerName: $('covDesignerName').value,
      };
      localStorage.setItem(OFFICE_PROFILE_KEY, JSON.stringify(profile));
      alert('設計事務所・設計者情報をブラウザに記憶しました。次回から自動入力されます。');
    });
  }

  function loadOfficeProfile() {
    const raw = localStorage.getItem(OFFICE_PROFILE_KEY);
    if (!raw) return;
    const p = safeJsonParse(raw);
    if (!p) return;
    if (p.officeReg && !$('covOfficeReg').value) $('covOfficeReg').value = p.officeReg;
    if (p.officeName && !$('covOfficeName').value) $('covOfficeName').value = p.officeName;
    if (p.designerReg && !$('covDesignerReg').value) $('covDesignerReg').value = p.designerReg;
    if (p.designerName && !$('covDesignerName').value) $('covDesignerName').value = p.designerName;
  }

  function applyExtractedCoverData(d) {
    if (d.subtitle) $('covSubtitle').value = d.subtitle;
    if (d.projectName) $('covProjectName').value = d.projectName;
    if (d.address) $('covAddress').value = d.address;
    if (d.usage) $('covUsage').value = d.usage;
    if (d.structure) $('covStructure').value = d.structure;
    if (d.area) $('covArea').value = d.area;
    if (d.date) $('covDate').value = d.date;
    if (d.program) $('covProgram1').value = d.program;
    if (d.officeName && !$('covOfficeName').value) $('covOfficeName').value = d.officeName;
    if (d.designerReg && !$('covDesignerReg').value) $('covDesignerReg').value = d.designerReg;
    if (d.designerName && !$('covDesignerName').value) $('covDesignerName').value = d.designerName;
    updateCoverPreview();
  }

  function updateCoverPreview() {
    coverFieldMap.forEach(([inpId, pvId]) => {
      const val = $(inpId).value;
      if (inpId === 'covProgram2') {
        $(pvId).textContent = val || '';
        $(pvId).style.display = val ? 'block' : 'none';
      } else {
        $(pvId).textContent = val || '―';
      }
    });
  }

  function getCoverData() {
    return {
      subtitle: $('covSubtitle').value.trim(),
      projectName: $('covProjectName').value.trim(),
      address: $('covAddress').value.trim(),
      usage: $('covUsage').value.trim(),
      structure: $('covStructure').value.trim(),
      area: $('covArea').value.trim(),
      date: $('covDate').value.trim(),
      officeReg: $('covOfficeReg').value.trim(),
      officeName: $('covOfficeName').value.trim(),
      designerReg: $('covDesignerReg').value.trim(),
      designerName: $('covDesignerName').value.trim(),
      program1: $('covProgram1').value.trim(),
      program2: $('covProgram2').value.trim(),
      docNo: $('covDocNo').value.trim(),
    };
  }

  // =========================================================
  // 6. STEP 5: 確定・目次プレビュー・統合PDFビルド
  // =========================================================
  function computeTocPlan() {
    const entries = [];
    let curPage = 1;

    // グループA: 構造計算資料
    if (state.preFiles.length > 0) {
      entries.push({ level: 0, title: '構造計算資料', startPage: curPage });
      for (const f of state.preFiles) {
        const cnt = window.PdfBinderEngine.parsePageRange(f.pageRange, f.totalPages).length;
        entries.push({ level: 1, title: f.title || f.fileName, startPage: curPage });
        curPage += cnt;
      }
    }

    // グループB: ARCHITREND ZERO 構造計算書
    if (state.a4File) {
      entries.push({ level: 0, title: 'ARCHITREND ZERO 構造計算書', startPage: curPage });
      curPage += state.a4File.totalPages;
    }

    // グループC: 別紙計算書
    if (state.postFiles.length > 0) {
      const insertDivider = $('chkInsertBesshiDivider') ? $('chkInsertBesshiDivider').checked : false;
      entries.push({ level: 0, title: '別紙計算書', startPage: curPage });
      if (insertDivider) {
        curPage += 1; // ツール自動生成の「別紙計算書」中表紙1頁分
      }
      for (let i = 0; i < state.postFiles.length; i++) {
        const f = state.postFiles[i];
        const pages = window.PdfBinderEngine.parsePageRange(f.pageRange, f.totalPages);
        const cnt = pages.length;
        // 先頭ファイルがATの「別紙計算書」表紙(P.1)を含み、自動中表紙がOFFの場合は、子項目の開始頁を次頁(+1)とする
        const startsWithAtBesshiCover = i === 0 && !insertDivider && f.hasBesshiCover && pages[0] === 1 && cnt >= 2;
        entries.push({
          level: 1,
          title: f.title || f.fileName,
          startPage: startsWithAtBesshiCover ? curPage + 1 : curPage,
        });
        curPage += cnt;
      }
    }

    // グループD: 地盤関係資料（ファイルがある場合のみ目次に出力）
    if (state.groundFiles.length > 0) {
      const insertGroundDivider = $('chkInsertGroundDivider') ? $('chkInsertGroundDivider').checked : false;
      entries.push({ level: 0, title: '地盤関係資料', startPage: curPage });
      if (insertGroundDivider) {
        curPage += 1;
      }
      for (const f of state.groundFiles) {
        const cnt = window.PdfBinderEngine.parsePageRange(f.pageRange, f.totalPages).length;
        entries.push({ level: 1, title: f.title || f.fileName, startPage: curPage });
        curPage += cnt;
      }
    }

    return { entries, bodyTotalPages: curPage - 1 };
  }

  function renderFinalSummary() {
    const { entries, bodyTotalPages } = computeTocPlan();
    const coverPages = $('chkAddCover').checked ? 1 : 0;
    const tocPages = $('chkAddToc').checked && entries.length > 0 ? Math.max(1, Math.ceil(entries.length / 30)) : 0;
    const grandTotal = coverPages + tocPages + bodyTotalPages;

    $('finalTotalPagesTag').textContent = `総ページ数: ${grandTotal} 頁（本文 ${bodyTotalPages} 頁）`;

    // 出力ファイル名の自動提案（ユーザーが手動編集していない場合のみ）
    if (!state.outFileNameEdited) {
      const proj = $('covProjectName').value.trim().replace(/[\\/:*?"<>|\s]+/g, '_');
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      $('outFileName').value = proj ? `構造計算書_${proj}_${today}.pdf` : `構造計算書_${today}.pdf`;
    }

    // 目次プレビュー描画
    $('tocPreviewBox').innerHTML = `
      <div class="toc-pv-title">目　次</div>
      ${entries
        .map(
          (e) => `
        <div class="toc-pv-row ${e.level > 0 ? 'child' : ''}">
          <span>${escapeHtml(e.title)}</span>
          <span class="toc-pv-dots"></span>
          <span class="toc-pv-page">${e.startPage}</span>
        </div>`
        )
        .join('')}
    `;

    const a3Enabled = $('chkEnableA3Replace').checked && state.a3File;
    const a3Count = a3Enabled ? state.a3File.matches.filter((m) => m.matched).length : 0;
    const activeNgCount = state.ngEntries.filter((x) => x.enabled && x.note.trim()).length;

    $('buildSummaryBox').innerHTML = `
      <div>• 構造計算資料：<strong>${state.preFiles.length} ファイル</strong></div>
      <div>• ARCHITREND ZERO 本体：<strong>${state.a4File ? `${state.a4File.totalPages} 頁` : '未投入'}</strong>${a3Count > 0 ? `（うち A3自動差替 <strong>${a3Count} 枚</strong>）` : ''}</div>
      <div>• 別紙計算書：<strong>${state.postFiles.length} ファイル</strong></div>
      ${state.groundFiles.length > 0 ? `<div>• 地盤関係資料：<strong>${state.groundFiles.length} ファイル</strong></div>` : '<div>• 地盤関係資料：なし（自動スキップ）</div>'}
      <div>• NG・エラー対応内容追記：<strong>${activeNgCount} 箇所</strong></div>
      <div>• 最終構成：表紙(${coverPages}頁) ＋ 目次(${tocPages}頁) ＋ 本文(${bodyTotalPages}頁) ＝ <strong>計 ${grandTotal} 頁</strong></div>
    `;
  }

  function bindBuildControls() {
    $('outFileName').addEventListener('input', () => {
      state.outFileNameEdited = true;
    });
    ['chkAddCover', 'chkAddToc', 'chkAddPageNum', 'chkApplyNgAnnots'].forEach((id) => {
      $(id).addEventListener('change', renderFinalSummary);
    });

    $('btnBuildPdf').addEventListener('click', async () => {
      if (!state.a4File && state.preFiles.length === 0 && state.postFiles.length === 0 && state.groundFiles.length === 0) {
        alert('結合するPDFファイルが1つも投入されていません。STEP 1からファイルを投入してください。');
        return;
      }

      const btn = $('btnBuildPdf');
      const progArea = $('buildProgressArea');
      const resultCard = $('buildResultCard');
      btn.disabled = true;
      progArea.classList.remove('hidden');
      resultCard.classList.add('hidden');

      try {
        const { entries } = computeTocPlan();
        const t0 = performance.now();

        const res = await window.PdfBinderEngine.buildIntegratedPdf(
          {
            addCover: $('chkAddCover').checked,
            addToc: $('chkAddToc').checked,
            addPageNum: $('chkAddPageNum').checked,
            applyNgAnnots: $('chkApplyNgAnnots').checked,
            enableA3Replace: $('chkEnableA3Replace').checked,
            insertBesshiDivider: $('chkInsertBesshiDivider') ? $('chkInsertBesshiDivider').checked : false,
            insertGroundDivider: $('chkInsertGroundDivider') ? $('chkInsertGroundDivider').checked : false,
            coverData: getCoverData(),
            tocEntries: entries,
            preFiles: state.preFiles,
            postFiles: state.postFiles,
            groundFiles: state.groundFiles,
            a4Bytes: state.a4File ? state.a4File.bytes : null,
            a3Bytes: state.a3File ? state.a3File.bytes : null,
            a3Matches: state.a3File ? state.a3File.matches : [],
            ngEntries: state.ngEntries,
          },
          (pct, msg) => {
            $('buildProgressFill').style.width = `${pct}%`;
            $('buildProgressPct').textContent = `${pct}%`;
            $('buildProgressMsg').textContent = msg;
          }
        );

        const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
        const sizeMb = (res.bytes.byteLength / (1024 * 1024)).toFixed(2);
        const outName = $('outFileName').value.trim() || '構造計算書_完成版.pdf';

        // ブラウザダウンロード発火
        const blob = new Blob([res.bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outName.endsWith('.pdf') ? outName : `${outName}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 15000);

        resultCard.classList.remove('hidden');
        resultCard.innerHTML = `
          <strong>✅ 統合構造計算書PDFの作成・ダウンロードが完了しました！</strong><br>
          ファイル名：<code>${escapeHtml(a.download)}</code><br>
          総ページ数：<strong>${res.totalPages} 頁</strong>（本文 ${res.bodyPages} 頁） ／ 出力サイズ：<strong>${sizeMb} MB</strong> ／ 処理時間：${elapsed} 秒
        `;
      } catch (err) {
        console.error(err);
        alert(`PDF生成中にエラーが発生しました:\n${err.message}`);
      } finally {
        btn.disabled = false;
      }
    });
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function safeJsonParse(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
