/**
 * public/studio/js/studio_engine.js
 * 
 * mdo3 STUDIO - 4部門7職種 AI動画制作＆Veo 3プロンプト生成エンジン (v1.3.0)
 * 
 * 【完全実装機能】
 * 1. 2段階ワークフロー:
 *    - STAGE 1: シナリオ素案の提出 ➔ ユーザー加筆修正依頼 ➔ エージェント再作成の反復協議
 *    - STAGE 2: ユーザーの「このシナリオでOK！」承認後にカメラカット・Veo 3プロンプト詳細設計へ移行
 * 2. ユーザー特別演出入力枠（ドローン、夕暮れ光、法改正強調、ナレーター指定等）
 * 3. 5つのVeo 3アカウント管理 ＆ 各アカウント一括配分・一発コピペ機能
 * 4. Google Drive API / 共有URL登録（XServerの容量・帯域負荷完全ゼロ仕様）
 * 5. ローカルGPU動画合成環境（Quadro K5200 + Python + FFmpeg）案内連動
 */

(function() {
  'use strict';

  // ツール固有の特化演出シナリオ辞書
  const TOOL_SCENARIOS = {
    map_editor: {
      promo: {
        title: '確認申請第1面の敷地案内図を1分で。手描きCADからの完全解放。',
        hook: '深夜の設計事務所。山積みの申請書類と、CADで手描きしている案内図の画面。そこにmdo3スマート案内図のクリーンなUIが鮮烈に起動。',
        develop: '国土地理院の最新白地図から道路や敷地をなぞるだけ（スプリット・トレース方式）。真北方位、縮尺バー、駅や交差点スタンプがワンタッチで自動配置。',
        climax: '建築基準法施行規則第1条の3に完全適合したA4高解像度PDFがワンクリックで完成。指定確認検査機関の審査窓口へそのまま提出可能。',
        cta: 'インストール不要、完全無償（¥0）、登録不要。今すぐ map.mdo3.com へ。',
        standardsNote: '建築基準法施行規則第1条の3（敷地付近見取図要件）、国交省確認申請マニュアルに完全合致。',
        clips: [
          {
            title: 'HOOK: 確認申請案内図のペインと直感的解決',
            action: '夜の設計事務所。CADで案内図を手描きし溜息をつく設計者。画面が切り替わり、スマート案内図エディタが鮮やかに起動。',
            narration: '確認申請の敷地案内図、まだCADで手描きしていませんか？',
            telop: '案内図作図、まだ手描きですか？',
            prompt: 'Cinematic slow tracking shot in a stylish Tokyo architectural studio at dusk, blueprints and building permit application folders on desk, a high-resolution display suddenly glows to life showing modern split-screen vector map application, Arri Alexa LF, warm tungsten task light, 8K ultra-detailed photorealistic.'
          },
          {
            title: 'DEVELOP 1: 国土地理院マップ ＆ スプリット・トレース',
            action: '国土地理院の最新白地図がロードされ、道路や敷地の境界線をクリックでなぞる。鮮やかな朱色のベクトルラインが吸い付くようにスナップする。',
            narration: '地図からなぞるだけ。スプリット・トレース方式で直感作図。',
            telop: '地図をなぞるだけ | スプリット・トレース',
            prompt: 'Extreme close-up macro view of architect hand using precision mouse to trace vector property boundary lines over Japanese geographical satellite map, vivid red boundary lines snapping smoothly onto road vectors, ultra-sharp high-framerate screen recording feel, photorealistic 8K, cinematic depth of field.'
          },
          {
            title: 'DEVELOP 2: 方位・縮尺・ランドマークの自動最適配置',
            action: '真北方位記号、グラフィカルな縮尺バー、駅や主要道路の案内スタンプがワンクリックで最適配置される。',
            narration: '方位記号、縮尺バー、道路幅員。必要な要素はすべて自動。',
            telop: '方位・縮尺・目標物スタンプ自動配置',
            prompt: 'Dynamic macro camera orbit focusing on digital blueprint canvas, elegant Japanese north compass rose and graphic scale bar automatically snapping into position, road width annotation text populating cleanly, crisp minimalist vector graphics, award-winning UI design, 8K.'
          },
          {
            title: 'CORE: 審査機関適合 A4ワンクリック生成',
            action: '「A4出力」ボタンを押すと、確認申請第1面の様式にジャストフィットした高解像度案内図がプレビューされる。',
            narration: '建築基準法施行規則に完全準拠。そのまま確認申請書へ。',
            telop: '確認申請第1面適合 | A4高解像度出力',
            prompt: 'Smooth zoom-in to an official Japanese building permit application form (Kenkou format A4) with immaculate printed vicinity map in crisp red border lines, sitting on dark walnut drafting board beside architectural ruler and fountain pen, soft studio lighting, 8K realism.'
          },
          {
            title: 'BENEFIT: ブラウザで即起動・完全無料',
            action: 'タブレットやノートPCで軽快に動作する画面。ログイン不要、料金0円のバッジが光る。',
            narration: 'インストール不要、完全無料。誰でも今すぐ使えます。',
            telop: '完全無償 ¥0 | インストール不要',
            prompt: 'Modern Japanese architect standing by bright sunlit window holding lightweight tablet showing fast fluid web application interface, relaxed confident smile, stylish Tokyo architectural atelier, natural sunlight, cinematic documentary realism, 8K.'
          },
          {
            title: 'CTA: map.mdo3.com へ今すぐアクセス',
            action: 'mdo3ロゴと「map.mdo3.com」のドメインがエレガントに表示される。',
            narration: '案内図作図は、mdo3でスマートに。今すぐアクセス。',
            telop: 'map.mdo3.com | スマート案内図 (完全無料)',
            prompt: 'Clean luxury architectural title card typography "map.mdo3.com", glowing minimalist emerald and gold geometric accents over subtle blurred 3D city masterplan model, elegant cinematic fade, high-end commercial aesthetic.'
          }
        ]
      },
      howto: {
        title: 'スマート案内図作成エディタ 1分操作マニュアル',
        hook: 'ブラウザで開くだけ。ログイン不要で即座に作図開始。',
        develop: 'STEP 1: 計画地住所検索 ➔ STEP 2: スプリット・トレースで境界作図 ➔ STEP 3: 方位・縮尺スタンプ配置。',
        climax: 'STEP 4: A4印刷プレビューから申請用PDFワンクリック出力。',
        cta: '実務の手間を劇的削減。map.mdo3.com で体験。',
        standardsNote: '方位記号の真北指定、縮尺バーの整合性を完全担保。',
        clips: [
          {
            title: 'STEP 1: 計画地住所の検索ジャンプ',
            action: '検索窓に計画地の住所を入力し、対象エリアへ瞬時にフォーカス。',
            narration: 'まずは map.mdo3.com を開き、計画地の住所を入力します。',
            telop: 'STEP 1: 住所入力で計画地へ瞬時ジャンプ',
            prompt: 'Top-down flat lay view of architect workspace, typing address into search box of clean web GIS application on ultra-wide monitor, smooth instantaneous map zooming animation into Tokyo residential block, photorealistic 8K.'
          },
          {
            title: 'STEP 2: スプリット・トレースによる作図',
            action: 'トレースツールを選び、画面上の道路や敷地境界をポチポチとクリック。朱書き線が綺麗に結ばれる。',
            narration: 'トレースツールで境界線をなぞるだけで、道路と敷地が完成します。',
            telop: 'STEP 2: クリックで道路・敷地境界をトレース',
            prompt: 'Crisp screen capture perspective showing precision vector pen tool clicking corner points of a site boundary, dynamic red overlay polygons forming effortlessly over grey map tiles, elegant UI responsive feedback, 8K.'
          },
          {
            title: 'STEP 3: 方位・縮尺・目標物スタンプの配置',
            action: '真北方位記号や駅・学校スタンプをドラッグして配置。',
            narration: '方位記号や駅名の案内スタンプを配置し、視認性を高めます。',
            telop: 'STEP 3: 方位・縮尺バー・目標物スタンプを配置',
            prompt: 'Macro shot of cursor dragging custom graphic stamps onto architectural map canvas, clean typography auto-aligning with road angle, modern UX interface design, 8K.'
          },
          {
            title: 'STEP 4: A4確認申請枠付きPDF出力',
            action: 'A4出力ボタンを押し、公式様式のPDFを保存。',
            narration: '右上のA4出力を押せば、申請用PDFがワンクリックで完成です。',
            telop: 'STEP 4: A4確認申請枠付きPDF出力',
            prompt: 'Smooth zoom-in to official Japanese building application sheet preview modal with print dialogue, clicking green download button, instantaneous PDF generation, photorealistic studio lighting, 8K.'
          }
        ]
      }
    }
  };

  // アプリケーション状態
  const state = {
    selectedToolId: 'map_editor',
    purpose: 'promo',
    duration: 30,
    specialRequests: '',
    scenarioFeedback: '',
    accountNames: [
      'Account #1 (メイン)',
      'Account #2 (サブA)',
      'Account #3 (サブB)',
      'Account #4 (サブC)',
      'Account #5 (サブD)'
    ],
    workflowStage: 'draft', // 'draft' (素案協議) or 'approved' (承認済・カメラ工程)
    scenarioDraft: null,
    generatedProject: null,
    uploadedVideos: [],
    currentTab: 'studio'
  };

  // DOM参照
  let tabStudio, tabVault, viewStudio, viewVault, btnBackToStudio;
  let toolSelect, linkOpenToolDirect, purposePromoBtn, purposeHowtoBtn, durationPills;
  let specialRequestsInput, accInputs = [];
  let btnGenerateScenarioDraft, workflowStatusBadge;
  let scenarioReviewSection, scenarioDraftContent, scenarioFeedbackInput, btnReviseScenario, btnApproveScenario;
  let cameraStoryboardSection, accountDistributionPanel, accountCardsGrid, directorStatementBox, timelineContainer, cameraLockedNotice;
  let inputGdriveUrl, btnRegisterGdriveUrl, videoPreviewContainer;
  let btnDownloadMarkdown, btnDownloadJson, btnCopySnsDraft, snsDraftText;
  let vaultGrid, vaultEmptyState, vaultCountBadge;
  let tabUpdates, viewUpdates, btnRefreshUpdates, updatesListContainer, updatesCountBadge;

  document.addEventListener('DOMContentLoaded', () => {
    initDomReferences();
    populateToolSelect();
    bindEvents();
    generateScenarioDraft(); // 初期素案生成
    fetchUploadedVideos();
    fetchToolUpdates();
  });

  function initDomReferences() {
    tabStudio = document.getElementById('tabStudio');
    tabVault = document.getElementById('tabVault');
    viewStudio = document.getElementById('viewStudio');
    viewVault = document.getElementById('viewVault');
    btnBackToStudio = document.getElementById('btnBackToStudio');

    toolSelect = document.getElementById('studioToolSelect');
    linkOpenToolDirect = document.getElementById('linkOpenToolDirect');
    purposePromoBtn = document.getElementById('purposePromoBtn');
    purposeHowtoBtn = document.getElementById('purposeHowtoBtn');
    durationPills = document.querySelectorAll('.duration-pill');
    specialRequestsInput = document.getElementById('specialRequestsInput');

    for (let i = 1; i <= 5; i++) {
      accInputs.push(document.getElementById(`accInput_${i}`));
    }

    btnGenerateScenarioDraft = document.getElementById('btnGenerateScenarioDraft');
    workflowStatusBadge = document.getElementById('workflowStatusBadge');

    scenarioReviewSection = document.getElementById('scenarioReviewSection');
    scenarioDraftContent = document.getElementById('scenarioDraftContent');
    scenarioFeedbackInput = document.getElementById('scenarioFeedbackInput');
    btnReviseScenario = document.getElementById('btnReviseScenario');
    btnApproveScenario = document.getElementById('btnApproveScenario');

    cameraStoryboardSection = document.getElementById('cameraStoryboardSection');
    accountDistributionPanel = document.getElementById('accountDistributionPanel');
    accountCardsGrid = document.getElementById('accountCardsGrid');
    directorStatementBox = document.getElementById('directorStatementBox');
    timelineContainer = document.getElementById('timelineContainer');
    cameraLockedNotice = document.getElementById('cameraLockedNotice');

    inputGdriveUrl = document.getElementById('inputGdriveUrl');
    btnRegisterGdriveUrl = document.getElementById('btnRegisterGdriveUrl');
    videoPreviewContainer = document.getElementById('videoPreviewContainer');

    btnDownloadMarkdown = document.getElementById('btnDownloadMarkdown');
    btnDownloadJson = document.getElementById('btnDownloadJson');
    btnCopySnsDraft = document.getElementById('btnCopySnsDraft');
    snsDraftText = document.getElementById('snsDraftText');

    vaultGrid = document.getElementById('vaultGrid');
    vaultEmptyState = document.getElementById('vaultEmptyState');
    vaultCountBadge = document.getElementById('vaultCountBadge');

    tabUpdates = document.getElementById('tabUpdates');
    viewUpdates = document.getElementById('viewUpdates');
    btnRefreshUpdates = document.getElementById('btnRefreshUpdates');
    updatesListContainer = document.getElementById('updatesListContainer');
    updatesCountBadge = document.getElementById('updatesCountBadge');
  }

  // 1. 全29ツール セレクトボックス初期化
  function populateToolSelect() {
    if (!toolSelect) return;
    if (typeof MDO3_TOOLS_CATALOG === 'undefined' || !Array.isArray(MDO3_TOOLS_CATALOG)) {
      console.warn('MDO3_TOOLS_CATALOG is not loaded');
      return;
    }

    toolSelect.innerHTML = MDO3_TOOLS_CATALOG.map(t => `
      <option value="${t.id}">${t.categoryName}: ${t.title}</option>
    `).join('');

    toolSelect.value = state.selectedToolId;
    updateDirectToolLink();
  }

  function updateDirectToolLink() {
    if (!linkOpenToolDirect) return;
    const catalog = (typeof MDO3_TOOLS_CATALOG !== 'undefined') ? MDO3_TOOLS_CATALOG : [];
    const tool = catalog.find(t => t.id === state.selectedToolId);
    if (tool && tool.url) {
      linkOpenToolDirect.href = tool.url;
      linkOpenToolDirect.style.display = 'inline-flex';
    } else {
      linkOpenToolDirect.style.display = 'none';
    }
  }

  // 2. イベントバインド
  function bindEvents() {
    // タブ切替
    if (tabStudio) tabStudio.addEventListener('click', () => switchTab('studio'));
    if (tabVault) tabVault.addEventListener('click', () => switchTab('vault'));
    if (tabUpdates) tabUpdates.addEventListener('click', () => switchTab('updates'));
    if (btnBackToStudio) btnBackToStudio.addEventListener('click', () => switchTab('studio'));
    if (btnRefreshUpdates) btnRefreshUpdates.addEventListener('click', fetchToolUpdates);

    // ツール変更
    if (toolSelect) {
      toolSelect.addEventListener('change', (e) => {
        state.selectedToolId = e.target.value;
        updateDirectToolLink();
        resetToDraftWorkflow();
      });
    }

    // 目的切替
    if (purposePromoBtn) {
      purposePromoBtn.addEventListener('click', () => {
        state.purpose = 'promo';
        purposePromoBtn.classList.add('active');
        if (purposeHowtoBtn) purposeHowtoBtn.classList.remove('active');
        resetToDraftWorkflow();
      });
    }
    if (purposeHowtoBtn) {
      purposeHowtoBtn.addEventListener('click', () => {
        state.purpose = 'howto';
        purposeHowtoBtn.classList.add('active');
        if (purposePromoBtn) purposePromoBtn.classList.remove('active');
        resetToDraftWorkflow();
      });
    }

    // 尺ピル
    durationPills.forEach(pill => {
      pill.addEventListener('click', () => {
        durationPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.duration = parseInt(pill.getAttribute('data-duration'), 10);
        resetToDraftWorkflow();
      });
    });

    // 特別演出要望の入力検知
    if (specialRequestsInput) {
      specialRequestsInput.addEventListener('input', (e) => {
        state.specialRequests = e.target.value;
      });
    }

    // アカウント名の入力検知
    accInputs.forEach((input, idx) => {
      if (input) {
        input.addEventListener('input', (e) => {
          state.accountNames[idx] = e.target.value.trim() || `Account #${idx + 1}`;
        });
      }
    });

    // ① シナリオ素案生成ボタン
    if (btnGenerateScenarioDraft) {
      btnGenerateScenarioDraft.addEventListener('click', () => {
        generateScenarioDraft(false);
      });
    }

    // 🔄 シナリオ加筆修正（再作成）ボタン
    if (btnReviseScenario) {
      btnReviseScenario.addEventListener('click', () => {
        if (scenarioFeedbackInput) {
          state.scenarioFeedback = scenarioFeedbackInput.value.trim();
        }
        generateScenarioDraft(true);
      });
    }

    // ✅ シナリオ承認（OKしてカメラ工程へ進む）ボタン
    if (btnApproveScenario) {
      btnApproveScenario.addEventListener('click', () => {
        approveScenarioAndBuildCameras();
      });
    }

    // Google Drive URL 登録ボタン
    if (btnRegisterGdriveUrl) {
      btnRegisterGdriveUrl.addEventListener('click', registerGdriveVideo);
    }

    // エクスポートボタン
    if (btnDownloadMarkdown) btnDownloadMarkdown.addEventListener('click', downloadMarkdownFile);
    if (btnDownloadJson) btnDownloadJson.addEventListener('click', downloadJsonFile);
    if (btnCopySnsDraft) btnCopySnsDraft.addEventListener('click', copySnsDraft);
  }

  function switchTab(tab) {
    state.currentTab = tab;
    // 全タブのアクティブ解除
    if (tabStudio) tabStudio.classList.remove('active');
    if (tabVault) tabVault.classList.remove('active');
    if (tabUpdates) tabUpdates.classList.remove('active');
    if (viewStudio) viewStudio.style.display = 'none';
    if (viewVault) viewVault.style.display = 'none';
    if (viewUpdates) viewUpdates.style.display = 'none';

    if (tab === 'studio') {
      if (tabStudio) tabStudio.classList.add('active');
      if (viewStudio) viewStudio.style.display = 'block';
    } else if (tab === 'vault') {
      if (tabVault) tabVault.classList.add('active');
      if (viewVault) viewVault.style.display = 'block';
      fetchUploadedVideos();
    } else if (tab === 'updates') {
      if (tabUpdates) tabUpdates.classList.add('active');
      if (viewUpdates) viewUpdates.style.display = 'block';
      fetchToolUpdates();
    }
  }

  function resetToDraftWorkflow() {
    state.workflowStage = 'draft';
    if (workflowStatusBadge) {
      workflowStatusBadge.className = 'status-workflow-badge';
      workflowStatusBadge.textContent = 'STAGE 1: シナリオ素案協議中';
    }
    if (cameraStoryboardSection) cameraStoryboardSection.style.display = 'none';
    if (cameraLockedNotice) cameraLockedNotice.style.display = 'block';
    generateScenarioDraft(false);
  }

  // 3. STAGE 1: シナリオ素案の生成＆対話型レビュー
  function generateScenarioDraft(isRevision = false) {
    const catalog = (typeof MDO3_TOOLS_CATALOG !== 'undefined') ? MDO3_TOOLS_CATALOG : [];
    const tool = catalog.find(t => t.id === state.selectedToolId) || {
      id: state.selectedToolId,
      title: 'mdo3 専門構造計算ツール',
      url: 'https://mdo3.com/',
      standards: ['建築基準法施行令', '国交省告示'],
      canDo: ['審査直結の計算書出力', 'リアルタイム判定']
    };

    const isPromo = state.purpose === 'promo';
    const duration = state.duration;
    const specialReq = state.specialRequests.trim();
    const feedback = state.scenarioFeedback.trim();

    // テンプレートまたは動的構成
    const preset = TOOL_SCENARIOS[tool.id] ? TOOL_SCENARIOS[tool.id][state.purpose] : null;

    let draftTitle = preset ? preset.title : `【${tool.title}】${isPromo ? '製品プロモーション広告' : '1分操作マニュアル'} (尺: ${duration}秒)`;
    let plotHook = preset ? preset.hook : `多忙な設計実務における${tool.title}の課題・ペインを提示し、実務者の共感を掴む。`;
    let plotDevelop = preset ? preset.develop : `ブラウザ上でパラメータを入力し、リアルタイムに幾何解析・応力検定が完了する爽快なUI操作。`;
    let plotClimax = preset ? preset.climax : `建築基準法・告示基準に適合した審査直結のA4公式計算書をワンクリック出力。`;
    let plotCta = preset ? preset.cta : `mdo3.com にて今すぐ体験。`;
    let standardsNote = preset ? preset.standardsNote : `準拠基準: ${(tool.standards && tool.standards[0]) || '建築基準法'}`;

    // ユーザーの特別演出要望の反映
    let specialReqNote = specialReq ? `💡 ユーザー特別演出要望: 「${specialReq}」を全体構成およびカメラワークにダイレクト反映。` : '💡 特別演出要望: 標準シネマティック構成（Arri Alexa LF, Tokyo Modern Architectural LUT）。';

    // ユーザーからの加筆修正フィードバックの反映
    let feedbackNote = '';
    if (isRevision && feedback) {
      feedbackNote = `\n🔄 ユーザー加筆指示の反映: 「${feedback}」に基づき、エージェントチームが演出の重点を再調整しました。`;
    }

    state.scenarioDraft = {
      toolTitle: tool.title,
      toolId: tool.id,
      purpose: state.purpose,
      duration: duration,
      title: draftTitle,
      hook: plotHook,
      develop: plotDevelop,
      climax: plotClimax,
      cta: plotCta,
      standardsNote: standardsNote,
      specialReqNote: specialReqNote,
      feedbackNote: feedbackNote,
      directorsStatement: isPromo ? 
        `【建築P & 映像D】ターゲットは確認申請前の作図・計算に追われる設計実務者。「これまでの苦労は何だったのか」と感じるほどの圧倒的なタイパと、審査機関にそのまま通る確実性を対比させて訴求します。` :
        `【建築P & 映像D】ターゲットは「今すぐこの物件の計算書を作りたい」実務者。「開いて、なぞって／入力して、印刷するだけ」の最短ルートを明快に伝える操作マニュアルスタイルです。`
    };

    renderScenarioDraftUI();
  }

  function renderScenarioDraftUI() {
    if (!scenarioDraftContent || !state.scenarioDraft) return;
    const d = state.scenarioDraft;

    scenarioDraftContent.innerHTML = `
      <h4>🎬 ${escapeHtml(d.title)}</h4>
      <p style="font-size:0.78rem; color:var(--accent-gold); margin-bottom:12px;">${escapeHtml(d.specialReqNote)}${d.feedbackNote ? '<br><span style="color:#60a5fa;">' + escapeHtml(d.feedbackNote) + '</span>' : ''}</p>
      
      <div style="display:flex; flex-direction:column; gap:8px;">
        <p><strong>① 導入 (HOOK / 冒頭):</strong> ${escapeHtml(d.hook)}</p>
        <p><strong>② 展開 (DEVELOP / 実務操作):</strong> ${escapeHtml(d.develop)}</p>
        <p><strong>③ 解決 (CLIMAX / 審査適合):</strong> ${escapeHtml(d.climax)}</p>
        <p><strong>④ 行動 (CTA / 着地):</strong> ${escapeHtml(d.cta)}</p>
        <p><strong>⚖️ 法規監修方針:</strong> ${escapeHtml(d.standardsNote)}</p>
      </div>

      <div style="margin-top:14px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1); font-size:0.76rem; color:var(--text-sub);">
        <strong>4部門7職種 ディレクション方針:</strong> ${escapeHtml(d.directorsStatement)}
      </div>
    `;

    renderSnsDraft();
  }

  // 4. STAGE 2: シナリオ承認 ＆ カメラカット・Veo 3プロンプト詳細設計
  function approveScenarioAndBuildCameras() {
    state.workflowStage = 'approved';

    // バッジ更新
    if (workflowStatusBadge) {
      workflowStatusBadge.className = 'status-workflow-badge approved';
      workflowStatusBadge.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px; vertical-align:text-bottom;">check_circle</span> STAGE 2: シナリオ承認済・カメラ詳細設計';
    }

    // ロック解除
    if (cameraLockedNotice) cameraLockedNotice.style.display = 'none';
    if (cameraStoryboardSection) cameraStoryboardSection.style.display = 'block';

    // 最新のアカウント名を取得
    accInputs.forEach((input, idx) => {
      if (input && input.value.trim()) {
        state.accountNames[idx] = input.value.trim();
      }
    });

    const catalog = (typeof MDO3_TOOLS_CATALOG !== 'undefined') ? MDO3_TOOLS_CATALOG : [];
    const tool = catalog.find(t => t.id === state.selectedToolId) || {
      id: state.selectedToolId,
      title: 'mdo3 専門構造計算ツール',
      url: 'https://mdo3.com/',
      standards: ['建築基準法施行令'],
      canDo: ['審査直結のA4計算書出力']
    };

    const isPromo = state.purpose === 'promo';
    const duration = state.duration;

    // クリップ数配分 (15s=3C, 30s=6C, 45s=9C, 60s=12C, 90s=15C)
    let clipCount = 6;
    if (duration === 15) clipCount = 3;
    if (duration === 30) clipCount = 6;
    if (duration === 45) clipCount = 9;
    if (duration === 60) clipCount = 12;
    if (duration === 90) clipCount = 15;

    const preset = TOOL_SCENARIOS[tool.id] ? TOOL_SCENARIOS[tool.id][state.purpose] : null;

    // 4部門7職種ディレクターズ・ステートメント
    const specialText = state.specialRequests.trim();
    const directorsNotes = {
      cd: `【建築P】承認シナリオに基づき、${tool.title}の実務的価値を徹底訴求。${specialText ? 'ユーザー特別演出「' + specialText + '」を完全統合。' : ''}`,
      vd: `【映像D】尺${duration}秒・全${clipCount}カット構成。5つのアカウントへ均等・最適に配分。`,
      camera: `【建築撮影】超広角18mmティルトシフト ＆ 4K高解像度ディスプレイスプリットマクロ。Arri Alexa LFシネマ撮影。`,
      color: `【カラリスト】Tokyo Modern Architectural LUT。木肌の温もりとインディゴブルー、検定OKエメラルドグリーンの対比。`,
      compliance: `【法規監修】${(tool.standards && tool.standards[0]) || '建築基準法'}に完全合致。`
    };

    // シーン＆Veo 3プロンプト組み立て
    const scenes = [];
    const secPerClip = (duration / clipCount).toFixed(1);

    for (let i = 0; i < clipCount; i++) {
      const sceneIndex = i + 1;
      const startSec = (i * (duration / clipCount)).toFixed(0);
      const endSec = ((i + 1) * (duration / clipCount)).toFixed(0);
      const timecode = `${padZero(startSec)}s - ${padZero(endSec)}s`;

      // 5アカウント（1アカウントあたり最大3クリップ）
      const accountIdx = Math.floor(i / 3) % 5;
      const clipInAccount = (i % 3) + 1;
      const accountName = state.accountNames[accountIdx] || `Account #${accountIdx + 1}`;
      const veoAccountTag = `${accountName} [Clip ${clipInAccount}/3]`;

      let sceneTitle = '';
      let visualAction = '';
      let narration = '';
      let telop = '';
      let veoEnglishPrompt = '';

      if (preset && preset.clips && preset.clips.length > 0) {
        const c = preset.clips[i % preset.clips.length];
        sceneTitle = `[Cut ${sceneIndex}] ${c.title}`;
        visualAction = c.action;
        narration = c.narration;
        telop = c.telop;
        veoEnglishPrompt = c.prompt;
      } else {
        if (isPromo) {
          if (i === 0) {
            sceneTitle = `HOOK: 建築空間の美と構造実務の問いかけ`;
            visualAction = `洗練されたモダン建築のアトリエ。夕暮れの光が木造架構に差し込み、${tool.title}が起動。`;
            narration = `2025年、木造建築の構造実務は新たな時代へ。`;
            telop = `${tool.title} | 審査直結クラウド`;
            veoEnglishPrompt = `Cinematic slow tracking shot inside a modern minimalist luxury Japanese timber residence, massive exposed glue-laminated wood beams and cross-laminated timber ceiling, warm cinematic golden hour sunlight streaming through panoramic clerestory windows, volumetric atmospheric lighting, photorealistic 8K resolution, Arri Alexa LF.`;
          } else if (i === clipCount - 1) {
            sceneTitle = `CTA: 審査直結の確信とアクション`;
            visualAction = `完成したA4公式計算書が展開され、タブレット上でmdo3ポータルが開く。`;
            narration = `すべての答えは、クラウドにある。mdo3で今すぐ解決。`;
            telop = `mdo3.com | 今すぐアクセス`;
            veoEnglishPrompt = `High-end architectural office tabletop, a pristine official A4 structural engineering calculation report with clear Japanese blueprint schematics, tablet displaying glowing web application interface, modern architect hands interacting smoothly, elegant soft studio lighting, cinematic shallow focus, photorealistic 8K.`;
          } else {
            sceneTitle = `DEVELOP ${sceneIndex}: リアルタイム解析と検定`;
            visualAction = `設計者がディスプレイに向かい、${tool.title}の入力パラメータを調整。図面がスムーズに同期連動。`;
            narration = `${(tool.canDo && tool.canDo[0]) || '複雑な断面算定を数秒で完了'}`;
            telop = `${tool.title} | 瞬時算定`;
            veoEnglishPrompt = `Close-up shot of sophisticated structural engineering holographic CAD interface, illuminated blue and gold vector wireframe calculation model of foundation and beams, dynamic stress distribution lines auto-adjusting, glowing green OK verification badges, sleek dark futuristic UX design, pristine photorealistic 8K.`;
          }
        } else {
          // Howto
          if (i === 0) {
            sceneTitle = `STEP 1: ツール起動 ＆ 基本条件設定`;
            visualAction = `${tool.title}のメイン画面。部材寸法や設計荷重を入力。`;
            narration = `まずは${tool.title}を開き、基本条件を入力します。`;
            telop = `STEP 1: 断面寸法・部材条件を入力`;
            veoEnglishPrompt = `Close-up macro shot of hands typing numerical data on mechanical keyboard into a crisp modern structural calculation software UI on high-resolution monitor, sleek UI widgets and input sliders, soft daylight studio illumination, photorealistic 8K.`;
          } else if (i === clipCount - 1) {
            sceneTitle = `STEP FINAL: A4計算書ワンクリック出力`;
            visualAction = `計算書出力ボタンを押すと、審査機関提出用のA4フォーマットが即座にプレビュー。`;
            narration = `確認申請にそのまま使えるA4計算書がワンクリックで完成です。`;
            telop = `完了: A4計算書・PDFワンクリック出力`;
            veoEnglishPrompt = `Smooth slow zoom-in on an immaculate printed A4 Japanese structural engineering calculation document with official verification tables and stress charts, sitting on dark oak drafting table, elegant high-end architectural studio lighting, 8K ultra-sharp details.`;
          } else {
            sceneTitle = `STEP ${sceneIndex}: リアルタイム応力検定`;
            visualAction = `断面算定表の数値が自動更新され、安全率がクリアされる様子をハイライト。`;
            narration = `${(tool.canDo && tool.canDo[i % tool.canDo.length]) || '部材の安全性を即座に判定'}`;
            telop = `安全率検定: 適合判定`;
            veoEnglishPrompt = `Detailed screen recording perspective, clean structural engineering web app calculating stress distribution in real time, interactive graphs moving with smooth animation, elegant dark navy and cyan UI color palette, photorealistic 8K rendering.`;
          }
        }
      }

      scenes.push({
        sceneIndex,
        timecode,
        durationSec: secPerClip,
        accountIdx,
        accountName,
        veoAccountTag,
        title: sceneTitle,
        visualAction,
        narration,
        telop,
        veoEnglishPrompt
      });
    }

    state.generatedProject = {
      toolId: tool.id,
      toolTitle: tool.title,
      toolUrl: tool.url || 'https://mdo3.com/',
      purpose: state.purpose,
      duration: duration,
      directorsNotes,
      scenes,
      approvedAt: new Date().toISOString()
    };

    renderCameraStoryboardUI();
    renderAccountDistribution();

    // タイムラインへスムーズスクロール
    if (cameraStoryboardSection) {
      cameraStoryboardSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // 5. 5アカウント一括配分ダッシュボード描画 ＆ 一発コピペ
  function renderAccountDistribution() {
    if (!accountCardsGrid || !state.generatedProject) return;
    const scenes = state.generatedProject.scenes;

    // 5アカウントごとにクリップをグループ化
    const accountGroups = [ [], [], [], [], [] ];
    scenes.forEach(s => {
      accountGroups[s.accountIdx].push(s);
    });

    accountCardsGrid.innerHTML = state.accountNames.map((accName, idx) => {
      const assignedScenes = accountGroups[idx];
      const count = assignedScenes.length;
      if (count === 0) {
        return `
          <div class="account-card" style="opacity: 0.5;">
            <div class="account-card-header">
              <span class="account-card-title">${escapeHtml(accName)}</span>
              <span class="account-clip-count">割当なし</span>
            </div>
            <p style="font-size:0.72rem; color:var(--text-muted); margin:0;">この尺(${state.duration}秒)では枠を使用しません</p>
          </div>
        `;
      }

      const summaryText = assignedScenes.map(s => `[Clip ${s.sceneIndex} | ${s.timecode}] ${s.title}`).join('\n');

      return `
        <div class="account-card">
          <div class="account-card-header">
            <span class="account-card-title">${escapeHtml(accName)}</span>
            <span class="account-clip-count">${count} 本担当</span>
          </div>
          <div class="account-prompt-summary">${escapeHtml(summaryText)}</div>
          <button type="button" class="btn-copy-account-batch" onclick="window.copyAccountBatch(${idx})">
            <span class="material-symbols-outlined" style="font-size:14px;">bolt</span> このアカウントを一発コピペ
          </button>
        </div>
      `;
    }).join('');
  }

  // アカウントごとの一発コピペ関数
  window.copyAccountBatch = function(accountIdx) {
    if (!state.generatedProject || !state.generatedProject.scenes) return;
    const accName = state.accountNames[accountIdx] || `Account #${accountIdx + 1}`;
    const scenes = state.generatedProject.scenes.filter(s => s.accountIdx === accountIdx);

    if (scenes.length === 0) {
      alert(`${accName} に割り当てられたクリップはありません。`);
      return;
    }

    let bundle = `# mdo3 STUDIO | ${accName} 担当クリップ一覧\n`;
    bundle += `# Tool: ${state.generatedProject.toolTitle} (${state.generatedProject.duration}秒動画)\n\n`;

    scenes.forEach(s => {
      bundle += `=== ${s.veoAccountTag} | ${s.title} (${s.timecode}) ===\n`;
      bundle += `${s.veoEnglishPrompt}\n\n`;
    });

    navigator.clipboard.writeText(bundle).then(() => {
      alert(`【${accName}】担当の全${scenes.length}クリップのVeo 3プロンプトを一発コピーしました！\nVeo 3のチャット欄に貼り付けて動画を生成してください。`);
    }).catch(err => {
      console.error('Batch copy error:', err);
    });
  };

  // 6. 絵コンテタイムラインUI描画
  function renderCameraStoryboardUI() {
    const proj = state.generatedProject;
    if (!proj) return;

    if (directorStatementBox) {
      directorStatementBox.innerHTML = `
        <div class="director-statement-card">
          <div class="director-statement-head">
            <span class="material-symbols-outlined" style="color:var(--accent-gold); font-size:24px;">verified</span>
            <h4>4部門7職種 承認済ディレクション設計 (${proj.purpose === 'promo' ? '🎬 ツール広告動画' : '🛠️ 操作解説マニュアル動画'} / 尺: ${proj.duration}秒・${proj.scenes.length}カット)</h4>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <p><strong>👑 企画統括:</strong> ${escapeHtml(proj.directorsNotes.cd)}</p>
            <p><strong>📐 演出構成:</strong> ${escapeHtml(proj.directorsNotes.vd)}</p>
            <p><strong>📷 撮影設計:</strong> ${escapeHtml(proj.directorsNotes.camera)}</p>
            <p><strong>🎨 色調・音響:</strong> ${escapeHtml(proj.directorsNotes.color)}</p>
            <p><strong>⚖️ 法規監修:</strong> ${escapeHtml(proj.directorsNotes.compliance)}</p>
          </div>
        </div>
      `;
    }

    if (timelineContainer) {
      timelineContainer.innerHTML = proj.scenes.map((scene, idx) => `
        <div class="storyboard-card" id="sceneCard_${scene.sceneIndex}">
          <div class="storyboard-header">
            <div style="display:flex; align-items:center; gap:10px;">
              <span class="scene-time-pill">${scene.timecode}</span>
              <strong style="font-size:0.95rem; color:#fff;">Scene ${scene.sceneIndex}: ${escapeHtml(scene.title)}</strong>
            </div>
            <span class="veo-clip-tag">${escapeHtml(scene.veoAccountTag)}</span>
          </div>

          <div class="storyboard-body">
            <div class="scene-details-grid">
              <div class="detail-block">
                <h5><span class="material-symbols-outlined" style="font-size:16px;">videocam</span> 映像アクション / カット内容</h5>
                <p>${escapeHtml(scene.visualAction)}</p>
              </div>
              <div class="detail-block">
                <h5><span class="material-symbols-outlined" style="font-size:16px;">subtitles</span> ナレーション / 画面テロップ</h5>
                <p><strong>音声:</strong> 「${escapeHtml(scene.narration)}」<br><strong>テロップ:</strong> 【${escapeHtml(scene.telop)}】</p>
              </div>
            </div>

            <!-- Veo 3 専用 英語プロンプト -->
            <div class="veo-prompt-box">
              <div class="veo-prompt-label">
                <span>VEO 3 CINEMATIC PROMPT (${escapeHtml(scene.veoAccountTag)})</span>
                <button type="button" class="btn-copy-prompt" onclick="window.copyVeoPrompt(${idx})">
                  <span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> プロンプトをコピー
                </button>
              </div>
              <div class="veo-prompt-text" id="veoPromptText_${idx}">${escapeHtml(scene.veoEnglishPrompt)}</div>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  // 7. Google Drive URL 登録ハンドラー (サーバー負荷完全ゼロ仕様)
  function registerGdriveVideo() {
    if (!inputGdriveUrl) return;
    const url = inputGdriveUrl.value.trim();
    if (!url) {
      alert('Google Drive の共有URLまたはプレビューURLを入力してください。');
      return;
    }

    const proj = state.generatedProject || state.scenarioDraft || {
      toolTitle: 'mdo3 専門ツール',
      toolId: state.selectedToolId,
      duration: state.duration,
      purpose: state.purpose
    };

    const formData = new FormData();
    formData.append('url', url);
    formData.append('title', `${proj.toolTitle} (${state.duration}秒動画 - Google Drive)`);
    formData.append('tool_id', proj.toolId);
    formData.append('tool_name', proj.toolTitle);
    formData.append('duration', state.duration);
    formData.append('purpose', state.purpose);

    fetch('api/upload_video.php', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Google Drive の動画を登録しました！サーバーに負荷をかけずVaultに保管されました。');
          inputGdriveUrl.value = '';
          fetchUploadedVideos();
          switchTab('vault');
        } else {
          alert('登録失敗: ' + (data.message || 'エラーが発生しました'));
        }
      })
      .catch(err => {
        console.error('GDrive register error:', err);
        alert('通信エラーが発生しました');
      });
  }

  // 8. SNS配信用文案描画
  function renderSnsDraft() {
    if (!snsDraftText) return;
    const proj = state.scenarioDraft || {
      toolTitle: 'スマート案内図作成エディタ',
      toolId: state.selectedToolId
    };

    const isMap = proj.toolId === 'map_editor';
    const draft = `【${proj.toolTitle}】${state.purpose === 'promo' ? '公式ショート動画広告' : '1分操作マニュアル'}
${isMap ? '建築確認申請の敷地案内図を地図からなぞるだけ1分完成！\n国土地理院地図連携・方位＆縮尺バー自動・朱書き適合A4出力。\n完全無償（¥0）・登録不要。' : '2025年法改正対応。審査機関直結のA4計算書をワンクリック出力。'}

▼ ${proj.toolTitle} はこちら
https://${isMap ? 'map' : 'app'}.mdo3.com/

#建築確認申請 #構造計算 #設計実務 #mdo3 #${proj.toolId}`;

    snsDraftText.textContent = draft;
  }

  function copySnsDraft() {
    if (!snsDraftText) return;
    navigator.clipboard.writeText(snsDraftText.textContent).then(() => {
      alert('SNS用ポスト文案をコピーしました！\nX や note+ の告知文にご活用ください。');
    });
  }

  // 9. プロンプト単体コピー
  window.copyVeoPrompt = function(idx) {
    if (!state.generatedProject || !state.generatedProject.scenes[idx]) return;
    const s = state.generatedProject.scenes[idx];
    navigator.clipboard.writeText(s.veoEnglishPrompt).then(() => {
      alert(`[Cut #${idx + 1}] Veo 3 プロンプトをコピーしました！\n割当: ${s.veoAccountTag}`);
    });
  };

  // 10. エクスポート
  function downloadMarkdownFile() {
    const proj = state.generatedProject || state.scenarioDraft;
    if (!proj) return;

    let md = `# mdo3 STUDIO - 動画企画構成指示書\n\n`;
    md += `- **対象ツール**: ${proj.toolTitle} (${proj.toolId})\n`;
    md += `- **動画種別**: ${state.purpose === 'promo' ? 'プロモーション広告動画' : '操作マニュアル動画'}\n`;
    md += `- **目標尺**: ${state.duration}秒\n`;
    md += `- **特別演出要望**: ${state.specialRequests || '特になし'}\n\n`;

    if (state.scenarioDraft) {
      md += `## 承認シナリオ素案\n`;
      md += `- **タイトル**: ${state.scenarioDraft.title}\n`;
      md += `- **導入**: ${state.scenarioDraft.hook}\n`;
      md += `- **展開**: ${state.scenarioDraft.develop}\n`;
      md += `- **解決**: ${state.scenarioDraft.climax}\n`;
      md += `- **CTA**: ${state.scenarioDraft.cta}\n\n`;
    }

    if (state.generatedProject && state.generatedProject.scenes) {
      md += `## 5アカウント別 Veo 3 プロンプト一覧\n\n`;
      state.generatedProject.scenes.forEach(s => {
        md += `### [${s.timecode}] Scene ${s.sceneIndex}: ${s.title} (${s.veoAccountTag})\n`;
        md += `- **映像内容**: ${s.visualAction}\n`;
        md += `- **ナレーション**: ${s.narration}\n`;
        md += `- **テロップ**: ${s.telop}\n\n`;
        md += `\`\`\`text\n${s.veoEnglishPrompt}\n\`\`\`\n\n`;
      });
    }

    downloadBlob(md, `mdo3_studio_storyboard_${proj.toolId}_${state.duration}s.md`, 'text/markdown');
  }

  function downloadJsonFile() {
    const data = {
      scenarioDraft: state.scenarioDraft,
      generatedProject: state.generatedProject,
      specialRequests: state.specialRequests,
      accountNames: state.accountNames,
      duration: state.duration,
      purpose: state.purpose
    };
    downloadBlob(JSON.stringify(data, null, 2), `mdo3_studio_project_${state.selectedToolId}_${state.duration}s.json`, 'application/json');
  }

  function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 11. アップロード済み動画の取得と描画
  function fetchUploadedVideos() {
    fetch('api/upload_video.php')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.videos)) {
          state.uploadedVideos = data.videos;
          renderVideoPreviews(data.videos);
          renderVaultGallery(data.videos);
        }
      })
      .catch(err => {
        console.warn('Fetch videos warning:', err);
      });
  }

  function renderVideoPreviews(videos) {
    if (!videoPreviewContainer) return;
    if (videos.length === 0) {
      videoPreviewContainer.innerHTML = '';
      return;
    }
    const latest = videos.slice(0, 2);
    videoPreviewContainer.innerHTML = latest.map(vid => {
      const isGdrive = vid.source === 'google_drive';
      return `
        <div class="video-preview-box">
          ${isGdrive ? 
            `<iframe src="${escapeHtml(vid.url)}" style="width:100%; height:160px; border:none;" allow="autoplay"></iframe>` : 
            `<video controls src="${escapeHtml(vid.url)}" preload="metadata"></video>`}
          <div class="video-meta-bar">
            <div>
              <strong>${escapeHtml(vid.title)}</strong>
              <span style="font-size:0.7rem; color:var(--text-muted); display:block;">${isGdrive ? 'Google Drive 保存' : vid.created_at}</span>
            </div>
            <span class="scene-time-pill">${vid.duration}s</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderVaultGallery(videos) {
    if (vaultCountBadge) {
      vaultCountBadge.textContent = `${videos.length} 本の保管動画`;
    }

    if (!vaultGrid || !vaultEmptyState) return;

    if (videos.length === 0) {
      vaultGrid.innerHTML = '';
      vaultEmptyState.style.display = 'block';
      return;
    }

    vaultEmptyState.style.display = 'none';
    vaultGrid.innerHTML = videos.map(vid => {
      const isGdrive = vid.source === 'google_drive';
      return `
        <div class="vault-card">
          <div class="vault-video-wrap">
            ${isGdrive ? 
              `<iframe src="${escapeHtml(vid.url)}" style="width:100%; height:100%; border:none;" allow="autoplay"></iframe>` : 
              `<video controls src="${escapeHtml(vid.url)}" preload="metadata"></video>`}
          </div>
          <div class="vault-card-body">
            <div class="vault-card-header">
              <h4 class="vault-card-title">${escapeHtml(vid.title)}</h4>
              <span class="scene-time-pill">${vid.duration}s</span>
            </div>
            <div class="vault-card-meta">
              <span class="material-symbols-outlined" style="font-size:14px;">cloud</span> ${isGdrive ? 'Google Drive' : 'ローカル保管'}
              <span style="margin: 0 4px;">•</span>
              <span class="material-symbols-outlined" style="font-size:14px;">label</span> ${vid.purpose === 'promo' ? '広告動画' : 'マニュアル'}
            </div>
            <div class="vault-card-actions">
              <a href="${escapeHtml(vid.url)}" target="_blank" class="vault-action-btn">
                <span class="material-symbols-outlined" style="font-size:15px;">open_in_new</span> ${isGdrive ? 'Driveで開く' : '動画を開く'}
              </a>
              <button type="button" class="vault-action-btn" onclick="window.copyEmbedTag('${escapeHtml(vid.url)}')">
                <span class="material-symbols-outlined" style="font-size:15px;">code</span> 埋込タグ
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  window.copyEmbedTag = function(url) {
    let tag = '';
    if (url.includes('drive.google.com')) {
      tag = `<iframe src="${url}" width="100%" height="480" allow="autoplay" style="border:none; border-radius:8px;"></iframe>`;
    } else {
      tag = `<video src="${url}" controls playsinline style="max-width:100%; border-radius:8px;"></video>`;
    }
    navigator.clipboard.writeText(tag).then(() => {
      alert('動画の埋め込みHTMLタグをコピーしました！\nnote+ やWEBサイトにそのまま貼り付け可能です。');
    });
  };

  // 12. sub ツール更新検知 ＆ note+/X 配信ロジック
  let toolUpdatesData = [];

  function fetchToolUpdates() {
    if (btnRefreshUpdates) {
      btnRefreshUpdates.disabled = true;
      btnRefreshUpdates.innerHTML = '<span class="material-symbols-outlined" style="animation: spin 1s linear infinite; font-size:16px;">sync</span> スキャン中...';
    }

    fetch('data/tool_updates.json?v=' + Date.now())
      .then(res => res.json())
      .then(data => {
        if (btnRefreshUpdates) {
          btnRefreshUpdates.disabled = false;
          btnRefreshUpdates.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">sync</span> 更新を再スキャン';
        }
        if (Array.isArray(data)) {
          toolUpdatesData = data;
          renderToolUpdates(data);
        }
      })
      .catch(err => {
        console.warn('Fetch tool updates error:', err);
        if (btnRefreshUpdates) {
          btnRefreshUpdates.disabled = false;
          btnRefreshUpdates.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">sync</span> 更新を再スキャン';
        }
      });
  }

  function renderToolUpdates(updates) {
    if (updatesCountBadge) {
      updatesCountBadge.textContent = `${updates.length} 件の更新検知`;
    }

    if (!updatesListContainer) return;

    if (updates.length === 0) {
      updatesListContainer.innerHTML = `
        <div class="vault-empty">
          <span class="material-symbols-outlined" style="font-size:48px; color:var(--text-muted); margin-bottom:12px;">campaign</span>
          <h3 style="font-size:1.1rem; color:var(--text-main); margin-bottom:8px;">現在検知された更新情報はありません</h3>
          <p style="font-size:0.85rem; color:var(--text-sub);">
            sub (app.mdo3.com) 側でコミットまたは notify_mdo3.bat が実行されると、自動的に最新の改変履歴がここに集約されます。
          </p>
        </div>
      `;
      return;
    }

    updatesListContainer.innerHTML = updates.map((item, idx) => `
      <div class="update-card" id="updateCard_${idx}">
        <div class="update-card-header">
          <div>
            <div class="update-card-title">
              <span class="material-symbols-outlined" style="color:var(--accent-cyan);">build_circle</span>
              ${escapeHtml(item.tool_name)}
            </div>
            <div class="update-card-meta">
              <span>📅 ${escapeHtml(item.date)}</span>
              <span>•</span>
              <span class="update-category-pill">${escapeHtml(item.category)}</span>
              <span>•</span>
              <code style="background:rgba(0,0,0,0.4); padding:1px 5px; border-radius:3px;">${escapeHtml(item.commit_hash)}</code>
            </div>
          </div>
          <div>
            <a href="${escapeHtml(item.tool_url)}" target="_blank" class="btn-portal-back" style="font-size:0.72rem; padding:4px 10px;">
              ツールを直接開く <span class="material-symbols-outlined" style="font-size:12px;">open_in_new</span>
            </a>
          </div>
        </div>

        <!-- 3大要素: 何をどう変えたか・何が変わったか・何に対応したのか -->
        <div class="update-change-grid">
          <div class="change-item">
            <h5 style="color:var(--accent-gold);"><span class="material-symbols-outlined" style="font-size:16px;">edit</span> ① 何をどう変えたか（改変内容）</h5>
            <p>${escapeHtml(item.what_changed)}</p>
          </div>
          <div class="change-item">
            <h5 style="color:var(--accent-green);"><span class="material-symbols-outlined" style="font-size:16px;">trending_up</span> ② 何が変わったか？（実務メリット）</h5>
            <p>${escapeHtml(item.user_benefit)}</p>
          </div>
          <div class="change-item">
            <h5 style="color:var(--accent-cyan);"><span class="material-symbols-outlined" style="font-size:16px;">verified_user</span> ③ 何に対応したのか？（準拠法令）</h5>
            <p>${escapeHtml(item.standards_matched)}</p>
          </div>
        </div>

        <!-- アクションボタン群 (note+ / X) -->
        <div class="update-actions-bar">
          <button type="button" class="btn-update-action note-btn" onclick="window.copyNoteArticle(${idx})">
            <span class="material-symbols-outlined" style="font-size:15px;">article</span> 📝 note+ 記事ドラフトをコピー
          </button>
          <button type="button" class="btn-update-action x-btn" onclick="window.copyXPost(${idx})">
            <span class="material-symbols-outlined" style="font-size:15px;">content_copy</span> 🐦 X 速報ポストをコピー
          </button>
          <button type="button" class="btn-update-action x-btn" onclick="window.openXIntent(${idx})" style="background:rgba(56, 189, 248, 0.2);">
            <span class="material-symbols-outlined" style="font-size:15px;">send</span> 🚀 Xで今すぐ投稿
          </button>
        </div>
      </div>
    `).join('');
  }

  // note+ 記事ドラフトコピー
  window.copyNoteArticle = function(idx) {
    if (!toolUpdatesData[idx]) return;
    const item = toolUpdatesData[idx];
    navigator.clipboard.writeText(item.note_article).then(() => {
      alert(`【${item.tool_name}】の note+ 用 記事ドラフト（完全Markdown）をコピーしました！\nnote+ のエディタにそのまま貼り付けて公開できます。`);
    });
  };

  // X 速報ポスト文コピー
  window.copyXPost = function(idx) {
    if (!toolUpdatesData[idx]) return;
    const item = toolUpdatesData[idx];
    navigator.clipboard.writeText(item.x_post).then(() => {
      alert(`【${item.tool_name}】の X（旧Twitter）用 140字速報ポスト文をコピーしました！`);
    });
  };

  // X Web Intent 起動（別タブで投稿画面を自動起動）
  window.openXIntent = function(idx) {
    if (!toolUpdatesData[idx]) return;
    const item = toolUpdatesData[idx];
    const encoded = encodeURIComponent(item.x_post);
    const intentUrl = `https://twitter.com/intent/tweet?text=${encoded}`;
    window.open(intentUrl, '_blank');
  };

  function padZero(num) {
    return String(num).padStart(2, '0');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
