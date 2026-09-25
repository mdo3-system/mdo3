/**
 * public/studio/js/studio_engine.js
 * 
 * mdo3 STUDIO - 4部門7職種 AI動画広告＆操作マニュアル制作スタジオ コアエンジン
 * - 全29ツール完全連動 ＆ 案内図・四分割法・人通口・斜め壁などの特化シネマティックプロンプト
 * - 4部門7職種ディレクション（建築P、映像D、建築撮影、ドローン、カラリスト、音響、法規監修）
 * - Veo 3 英語プロンプト自動生成（1日15クリップ枠 [Account #X - Clip Y/3] 自動付与）
 * - 全プロンプト一括コピー ＆ SNS配信文案（X / note+）自動生成
 * - 完成動画ギャラリー (Vault) ＆ 埋め込み・拡散機能
 */

(function() {
  'use strict';

  // ツール固有の特化プロンプト＆演出辞書
  const TOOL_SCENARIOS = {
    // 1. スマート案内図作成エディタ
    map_editor: {
      promo: {
        theme: '確認申請第1面の敷地案内図を1分で。手描きCADからの完全解放。',
        cd: '【建築P】ターゲットは確認申請前の案内図作図に時間を奪われている設計者・アシスタント。「完全無料・登録不要・なぞるだけ1分完成」という圧倒的タイパと爽快感を打ち出す。',
        vd: '【映像D】冒頭は手作業CADの煩わしさから一転、国土地理院マップとスプリット画面での鮮烈なベクタートレース、そして朱書き適合A4案内図へのダイナミックな着地。',
        camera: '【建築撮影】4Kディスプレイへの精密マクロ、なぞった瞬間朱色の敷地境界線が発光する直感的な視覚演出、美しい建築アトリエの環境光。',
        color: '【カラリスト】Tokyo Modern Architectural LUT。深いインディゴと鮮烈な朱色（案内境界線）のハイコントラスト。',
        compliance: '【法規監修】建築基準法施行規則第1条の3（付近見取図要件）、方位記号、縮尺バー、主要目標物（駅・学校・主要交差点）の要件を完全網羅。',
        clips: [
          {
            title: 'HOOK: 確認申請案内図のペインと直感的解決',
            action: '夜の設計事務所。山積みの申請書類と、CADで手描きしている案内図の画面。そこにmdo3スマート案内図のクリーンなUIが鮮烈に起動する。',
            narration: '確認申請の敷地案内図、まだCADで手描きしていませんか？',
            telop: '案内図作図、まだ時間をかけていますか？',
            prompt: 'Cinematic slow tracking shot in a stylish architectural studio at dusk, blueprints and building permit application folders on desk, a high-resolution display suddenly glows to life showing modern split-screen vector map application, Arri Alexa LF, warm tungsten task light, 8K ultra-detailed photorealistic.'
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
        theme: 'スマート案内図作成エディタ 操作手順マニュアル（1分で完成）',
        cd: '【建築P】「開いて、なぞって、印刷するだけ」の実務3ステップを明快に伝える。',
        vd: '【映像D】実際の画面操作の手元とカーソル移動に合わせ、迷いゼロのUI解説を展開。',
        camera: '【建築撮影】UIの主要ボタン（住所検索、トレースツール、A4出力）にフォーカスするスムーズなカメラワーク。',
        color: '【カラリスト】視認性を高めたハイコントラストUIカラー。',
        compliance: '【法規監修】案内図の縮尺（1/2500等）と方位の整合性を確認。',
        clips: [
          {
            title: 'STEP 1: ツール起動と計画地の検索',
            action: 'ブラウザで map.mdo3.com を開き、検索窓に計画地の住所または郵便番号を入力。該当地域が瞬時にクローズアップされる。',
            narration: 'まずは map.mdo3.com を開き、計画地の住所を入力します。',
            telop: 'STEP 1: 住所入力で計画地へ瞬時ジャンプ',
            prompt: 'Top-down flat lay view of architect workspace, typing address into search box of a clean web GIS application on ultra-wide monitor, smooth instantaneous map zooming animation into Tokyo residential block, photorealistic 8K.'
          },
          {
            title: 'STEP 2: スプリット・トレースで敷地・道路を作図',
            action: 'トレースツールを選び、画面上の道路や敷地境界をポチポチとクリック。朱書きの枠線が美しく描画される。',
            narration: 'トレースツールで境界線をなぞるだけで、道路と敷地が完成します。',
            telop: 'STEP 2: クリックで道路・敷地境界をトレース',
            prompt: 'Crisp screen capture perspective showing precision vector pen tool clicking corner points of a site boundary, dynamic red overlay polygons forming effortlessly over grey map tiles, elegant UI responsive feedback, 8K.'
          },
          {
            title: 'STEP 3: 方位・縮尺・文字アノテーションの確認',
            action: '真北矢印の向きと縮尺バーの数値を確認し、主要交差点名や駅名スタンプをドラッグして配置。',
            narration: '方位記号や駅名の案内スタンプを配置し、視認性を高めます。',
            telop: 'STEP 3: 方位・縮尺バー・目標物スタンプを配置',
            prompt: 'Macro shot of cursor dragging custom graphic stamps (station icon, major avenue label) onto architectural map canvas, clean typography auto-aligning with road angle, modern UX interface design, 8K.'
          },
          {
            title: 'STEP 4: A4印刷プレビューとPDFワンクリック出力',
            action: '画面右上の「A4出力」をクリック。確認申請用第1面枠付きのプレビューが開き、PDFとして保存される。',
            narration: '右上のA4出力を押せば、申請用PDFがワンクリックで完成です。',
            telop: 'STEP 4: A4確認申請枠付きPDF出力',
            prompt: 'Smooth zoom-in to official Japanese building application sheet preview modal with print dialogue, clicking green download button, instantaneous PDF generation, photorealistic studio lighting, 8K.'
          }
        ]
      }
    },

    // 2. 四分割法・偏心率・壁量計算
    four_division: {
      promo: {
        theme: '2025年4月法改正対応。新壁量基準と偏心率・四分割法を完全制覇。',
        cd: '【建築P】2025年4号特例縮小・新壁量基準に直面する全国の木造実務者へ。「mdo3なら間取りを描くだけで壁量・偏心率がリアルタイム適合」という頼もしさを提示。',
        vd: '【映像D】木造軸組の3D架構と四分割法エリアが青く発光。重心・剛心のズレが安全圏へ収束する幾何学的なカタルシス。',
        camera: '【建築撮影】Arri Alexa LFによる重厚なシネマティック映像。木造模型と高精細画面のコントラスト。',
        color: '【カラリスト】Dark Slate & Neon Cyan。適合判定時のエメラルドグリーン。',
        compliance: '【法規監修】建築基準法施行令第46条第4項、国土交通省告示第1119号、四分割法告示適合。',
        clips: [
          {
            title: 'HOOK: 2025年4月、木造構造の壁が立ちはだかる',
            action: '重厚な木造架構模型の前に立つ設計者。法改正の条文と新壁量計算の膨大なチェック項目が画面に浮かび上がる。',
            narration: '2025年、木造建築基準法の大改正。壁量計算の手間は限界に。',
            telop: '2025年法改正 | 木造壁量計算の重圧',
            prompt: 'Cinematic slow tracking shot across a realistic physical wooden architectural framing model, dynamic blue holographic mathematical formulas and stress vectors floating in air, moody dramatic rim lighting, photorealistic 8K, Arri Alexa LF.'
          },
          {
            title: 'DEVELOP: 間取りから四分割法エリアを瞬時自動生成',
            action: 'mdo3四分割法エディタ上で耐力壁を配置。各側端1/4領域が自動計算され、壁量充足率がリアルタイムでバーグラフ表示される。',
            narration: 'mdo3なら、耐力壁を置くだけで四分割法エリアを自動判定。',
            telop: '四分割法エリア自動判定 | リアルタイム充足率',
            prompt: 'Ultra-clear screen recording perspective of dark modern structural CAD interface, 1/4 perimeter zoning boundaries automatically highlighting in neon cyan, real-time stress ratio bar charts filling to safe green zones, pristine 8K.'
          },
          {
            title: 'CORE: 重心・剛心・偏心率のリアルタイム連動',
            action: '耐力壁の配置変更に伴い、重心（G）と剛心（S）の位置がリアルタイムに追随。偏心率0.15以下の安全判定が点灯。',
            narration: '重心と剛心のズレを可視化。偏心率0.15以下を確実にキープ。',
            telop: '偏心率 0.15以下 | 安全判定 OK',
            prompt: 'Futuristic architectural calculation UI showing center of mass and center of rigidity crosshairs dynamically converging, eccentric ratio digital readout displaying "0.08 < 0.15 PASS", glowing emerald verification seal, 8K.'
          },
          {
            title: 'CTA: 審査直結A4計算書出力',
            action: '審査機関提出用のA4計算書フォーマットが印刷され、確認申請の図面袋に収められる。',
            narration: '審査機関直結の計算書を即座に出力。構造をもっと、確実に。',
            telop: 'app.mdo3.com | 月額980円〜 今すぐ体験',
            prompt: 'Architectural desk scene, perfectly printed Japanese structural verification certificate with official calculation tables, tablet beside showing mdo3 logo, warm premium studio lighting, photorealistic 8K cinematic finish.'
          }
        ]
      },
      howto: {
        theme: '四分割法・偏心率計算 実務操作フロー',
        cd: '【建築P】通り芯・壁配置から判定までの最短ルートをガイド。',
        vd: '【映像D】グリッド指定→耐力壁入力→偏心率チェック→出力の4ステップ。',
        camera: '【建築撮影】入力フォームと伏図画面のスムーズなパン＆ズーム。',
        color: '【カラリスト】ハイコントラスト・ダークモード。',
        compliance: '【法規監修】側端1/4計算の充足率と壁率比0.5以上の判定ロジックを提示。',
        clips: [
          {
            title: 'STEP 1: 階層およびX・Y通り芯グリッドの設定',
            action: 'グリッド寸法を入力し、建物の外形矩形を定義。',
            narration: 'まずは建物階数と通り芯グリッドの寸法を設定します。',
            telop: 'STEP 1: 通り芯グリッド＆建物外形を設定',
            prompt: 'Engineer fingers entering grid dimensions on keyboard, crisp CAD grid expanding dynamically across dark monitor, 8K.'
          },
          {
            title: 'STEP 2: 耐力壁の配置と倍率の選択',
            action: '筋かいや構造用合板などの壁倍率を選択し、壁線上に配置。',
            narration: '耐力壁の種類を選び、壁線上にドラッグして配置します。',
            telop: 'STEP 2: 耐力壁の倍率選択＆配置',
            prompt: 'Cursor placing shear wall icons along timber framing grid lines, wall multiplier tags (2.5x, 4.5x) snapping crisply, 8K.'
          },
          {
            title: 'STEP 3: 四分割法および偏心率の自動判定確認',
            action: '1/4充足率および偏心率が自動計算され、基準クリアを確認。',
            narration: '四分割法の壁量充足率と偏心率が自動で即座に判定されます。',
            telop: 'STEP 3: 充足率＆偏心率の自動判定チェック',
            prompt: 'Screen interface updating with green "CONFORMS" badges across all 4 quadrants, safe rigidity distribution graph, 8K.'
          },
          {
            title: 'STEP 4: A4計算書出力と確認申請提出',
            action: '計算書出力ボタンを押し、公式A4フォーマットのPDFを取得。',
            narration: 'そのまま審査機関に提出できるA4計算書を書き出して完了です。',
            telop: 'STEP 4: 審査直結A4計算書を出力',
            prompt: 'Hands holding crisp freshly printed official structural calculation booklet, checking summary table with pen, 8K studio.'
          }
        ]
      }
    }
  };

  // アプリケーション状態
  const state = {
    selectedToolId: 'map_editor', // デフォルトを案内図エディタに設定
    purpose: 'promo',
    duration: 30,
    generatedProject: null,
    uploadedVideos: [],
    currentTab: 'studio' // 'studio' or 'vault'
  };

  // DOM参照
  let tabStudio, tabVault, viewStudio, viewVault, btnBackToStudio;
  let toolSelect, linkOpenToolDirect, purposePromoBtn, purposeHowtoBtn, durationPills;
  let btnGenerate, btnCopyAllPrompts, btnCopySnsDraft, snsDraftText;
  let teamBadgesContainer, directorStatementBox, timelineContainer;
  let btnDownloadMarkdown, btnDownloadJson, dropzone, videoFileInput, videoPreviewContainer;
  let vaultGrid, vaultEmptyState, vaultCountBadge;

  document.addEventListener('DOMContentLoaded', () => {
    initDomReferences();
    populateToolSelect();
    bindEvents();
    generateStudioPlan(); // 初期自動生成
    fetchUploadedVideos();
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
    btnGenerate = document.getElementById('btnGenerateProject');
    btnCopyAllPrompts = document.getElementById('btnCopyAllPrompts');
    btnCopySnsDraft = document.getElementById('btnCopySnsDraft');
    snsDraftText = document.getElementById('snsDraftText');

    teamBadgesContainer = document.getElementById('teamBadgesContainer');
    directorStatementBox = document.getElementById('directorStatementBox');
    timelineContainer = document.getElementById('timelineContainer');
    btnDownloadMarkdown = document.getElementById('btnDownloadMarkdown');
    btnDownloadJson = document.getElementById('btnDownloadJson');
    dropzone = document.getElementById('uploadDropzone');
    videoFileInput = document.getElementById('videoFileInput');
    videoPreviewContainer = document.getElementById('videoPreviewContainer');

    vaultGrid = document.getElementById('vaultGrid');
    vaultEmptyState = document.getElementById('vaultEmptyState');
    vaultCountBadge = document.getElementById('vaultCountBadge');
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

    // 初期値をスマート案内図に
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
    if (tabStudio) {
      tabStudio.addEventListener('click', () => switchTab('studio'));
    }
    if (tabVault) {
      tabVault.addEventListener('click', () => switchTab('vault'));
    }
    if (btnBackToStudio) {
      btnBackToStudio.addEventListener('click', () => switchTab('studio'));
    }

    // ツール選択変更
    if (toolSelect) {
      toolSelect.addEventListener('change', (e) => {
        state.selectedToolId = e.target.value;
        updateDirectToolLink();
      });
    }

    // 目的切替
    if (purposePromoBtn) {
      purposePromoBtn.addEventListener('click', () => {
        state.purpose = 'promo';
        purposePromoBtn.classList.add('active');
        if (purposeHowtoBtn) purposeHowtoBtn.classList.remove('active');
      });
    }
    if (purposeHowtoBtn) {
      purposeHowtoBtn.addEventListener('click', () => {
        state.purpose = 'howto';
        purposeHowtoBtn.classList.add('active');
        if (purposePromoBtn) purposePromoBtn.classList.remove('active');
      });
    }

    // 尺ピル
    durationPills.forEach(pill => {
      pill.addEventListener('click', () => {
        durationPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.duration = parseInt(pill.getAttribute('data-duration'), 10);
      });
    });

    // 企画生成ボタン
    if (btnGenerate) {
      btnGenerate.addEventListener('click', () => {
        btnGenerate.disabled = true;
        btnGenerate.innerHTML = '<span class="material-symbols-outlined" style="animation: spin 1s linear infinite;">sync</span> 4部門AIがシナリオ＆Veo3プロンプトを構築中...';
        setTimeout(() => {
          generateStudioPlan();
          btnGenerate.disabled = false;
          btnGenerate.innerHTML = '<span class="material-symbols-outlined">auto_awesome</span> AI制作チームに指示・企画生成を開始';
        }, 350);
      });
    }

    // 全Veo3プロンプト一括コピー
    if (btnCopyAllPrompts) {
      btnCopyAllPrompts.addEventListener('click', copyAllVeoPrompts);
    }

    // SNS文案コピー
    if (btnCopySnsDraft) {
      btnCopySnsDraft.addEventListener('click', copySnsDraft);
    }

    // エクスポート
    if (btnDownloadMarkdown) {
      btnDownloadMarkdown.addEventListener('click', downloadMarkdownFile);
    }
    if (btnDownloadJson) {
      btnDownloadJson.addEventListener('click', downloadJsonFile);
    }

    // ドラッグ＆ドロップ アップローダー
    if (dropzone && videoFileInput) {
      dropzone.addEventListener('click', () => videoFileInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          uploadVideoFile(e.dataTransfer.files[0]);
        }
      });
      videoFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          uploadVideoFile(e.target.files[0]);
        }
      });
    }
  }

  function switchTab(tab) {
    state.currentTab = tab;
    if (tab === 'studio') {
      if (tabStudio) tabStudio.classList.add('active');
      if (tabVault) tabVault.classList.remove('active');
      if (viewStudio) viewStudio.style.display = 'block';
      if (viewVault) viewVault.style.display = 'none';
    } else {
      if (tabVault) tabVault.classList.add('active');
      if (tabStudio) tabStudio.classList.remove('active');
      if (viewStudio) viewStudio.style.display = 'none';
      if (viewVault) viewVault.style.display = 'block';
      fetchUploadedVideos();
    }
  }

  // 3. 4部門7職種 AI動画企画 ＆ Veo3英語プロンプト生成コア
  function generateStudioPlan() {
    const catalog = (typeof MDO3_TOOLS_CATALOG !== 'undefined') ? MDO3_TOOLS_CATALOG : [];
    const tool = catalog.find(t => t.id === state.selectedToolId) || {
      id: state.selectedToolId,
      title: 'mdo3 専門構造計算ツール',
      url: 'https://mdo3.com/',
      summary: '木造・RC造の構造計算・確認申請実務を瞬時に解く専門ツール群',
      standards: ['建築基準法施行令', '住宅金融支援機構 木造住宅工事仕様書'],
      canDo: ['審査直結のA4計算書出力', 'リアルタイム断面算定']
    };

    const isPromo = state.purpose === 'promo';
    const duration = state.duration;

    // クリップ数配分
    let clipCount = 6;
    if (duration === 15) clipCount = 3;
    if (duration === 30) clipCount = 6;
    if (duration === 45) clipCount = 9;
    if (duration === 60) clipCount = 12;
    if (duration === 90) clipCount = 15;

    // ツール特化シナリオ辞書が存在するかチェック
    const specificScenario = TOOL_SCENARIOS[tool.id] ? TOOL_SCENARIOS[tool.id][state.purpose] : null;

    let directorsNotes = {};
    if (specificScenario) {
      directorsNotes = {
        cd: specificScenario.cd,
        vd: specificScenario.vd,
        camera: specificScenario.camera,
        color: specificScenario.color,
        compliance: specificScenario.compliance
      };
    } else {
      directorsNotes = isPromo ? {
        cd: `【建築P/クリエイティブディレクター】ターゲットは多忙な設計事務所・工務店設計部。2025年法改正のプレッシャーに対し、「構造のブラックボックスを美しく、確実に突破する」という圧倒的な安心感と先進性を訴求するトーン＆マナーに統一します。`,
        vd: `【映像ディレクター】尺${duration}秒構成。冒頭2秒で図面と架構の美しさでスクロールを止めさせ、中盤でリアルタイム検定の爽快感、ラストに「A4審査適合計算書」への着地を見せる完璧なアークを描きます。`,
        camera: `【建築カメラマン】超広角18mmティルトシフトで木造架構の直線美を歪みなく捉え、夕景のゴールデンアワー光が梁材に差し込むドラマチックなライティングを指定します。`,
        color: `【カラリスト】木肌の温もり（ナチュラルオーク）とコンクリートの静けさを引き立てる「Modern Nordic Architectural LUT」をベースに、OK検定時のエメラルドグリーンをアクセントカラーに設定。`,
        compliance: `【法規監修】準拠法令「${tool.standards ? tool.standards[0] : '建築基準法'}」に完全合致。実務設計者がそのまま審査機関に提出できる信頼性の高い表現であることを確認済み。`
      } : {
        cd: `【建築P/クリエイティブディレクター】ターゲットは「今すぐこの物件の計算書を作りたい」実務設計者。「何を入力し、何が出るのか」が10秒で直感的にわかる、無駄のないハウツースタイルを構築します。`,
        vd: `【映像ディレクター】尺${duration}秒構成。STEP 1「条件入力」→ STEP 2「リアルタイム算定」→ STEP 3「A4ワンクリック出力」の3拍子で、実務のスピード感を強調します。`,
        camera: `【建築カメラマン】UI操作画面と構造伏図のクローズアップを組み合わせ、注視すべき入力ボックスと判定ゲージにスムーズにフォーカスを送るラックフォーカスを指定。`,
        color: `【カラリスト】視認性を最優先にした「Clean High-Tech Dark LUT」。入力数値と検定結果のコントラストを際立たせ、長時間の視聴でも疲れない配色とします。`,
        compliance: `【法規監修】入力パラメータ（荷重・寸法・鉄筋径）の許容値が審査機関の取扱要領に適合している旨を明記。`
      };
    }

    // シーン＆Veo 3プロンプト組み立て
    const scenes = [];
    const secPerClip = (duration / clipCount).toFixed(1);

    for (let i = 0; i < clipCount; i++) {
      const sceneIndex = i + 1;
      const startSec = (i * (duration / clipCount)).toFixed(0);
      const endSec = ((i + 1) * (duration / clipCount)).toFixed(0);
      const timecode = `${padZero(startSec)}s - ${padZero(endSec)}s`;

      // 5アカウント × 3クリップ = 15クリップ のアカウント番号
      const accountNum = Math.floor(i / 3) + 1;
      const clipInAccount = (i % 3) + 1;
      const veoAccountTag = `Account #${accountNum} (Clip ${clipInAccount}/3)`;

      let sceneTitle = '';
      let visualAction = '';
      let narration = '';
      let telop = '';
      let veoEnglishPrompt = '';

      if (specificScenario && specificScenario.clips && specificScenario.clips.length > 0) {
        // 特化クリップから選択（ループまたは端数調整）
        const templateClip = specificScenario.clips[i % specificScenario.clips.length];
        sceneTitle = `[Cut ${sceneIndex}] ${templateClip.title}`;
        visualAction = templateClip.action;
        narration = templateClip.narration;
        telop = templateClip.telop;
        veoEnglishPrompt = templateClip.prompt;
      } else {
        // 汎用高精度フォールバック
        if (isPromo) {
          if (i === 0) {
            sceneTitle = `HOOK: 建築空間の美と構造の問いかけ`;
            visualAction = `洗練された現代木造住宅の内観。天窓から夕暮れの光が差し込み、力強い化粧梁がダイナミックに浮き上がる。`;
            narration = `2025年、木造建築の構造実務は新たな時代へ。`;
            telop = `${tool.title} | 審査直結クラウド`;
            veoEnglishPrompt = `Cinematic slow tracking shot inside a modern minimalist luxury Japanese timber residence, massive exposed glue-laminated wood beams and cross-laminated timber ceiling, warm cinematic golden hour sunlight streaming through panoramic clerestory windows, volumetric atmospheric lighting, photorealistic 8K resolution, Arri Alexa LF, subtle realistic depth of field.`;
          } else if (i === clipCount - 1) {
            sceneTitle = `CTA: 審査直結の確信とアクション`;
            visualAction = `完成したA4構造計算書がデスク上に滑らかに展開され、タブレット端末上でmdo3ポータルが開く。画面に「月額980円から」のバッジ。`;
            narration = `すべての答えは、クラウドにある。mdo3で今すぐ解決。`;
            telop = `mdo3.com | 月額980円〜 今すぐ試す`;
            veoEnglishPrompt = `High-end architectural office tabletop, a pristine official A4 structural engineering calculation report with clear Japanese blueprint schematics, tablet displaying glowing web application interface, modern architect hands interacting smoothly, elegant soft studio lighting, cinematic shallow focus, photorealistic 8K.`;
          } else if (i === Math.floor(clipCount / 2)) {
            sceneTitle = `CORE: リアルタイム幾何解析と応力検定`;
            visualAction = `3D構造ワイヤーフレームと変形スラブの荷重分割線が青く発光しながら展開。断面算定ゲージが安全圏（OK）へ瞬時に移行。`;
            narration = `手計算の不安を解消。${tool.standards ? tool.standards[0] : '告示基準'}に完全準拠。`;
            telop = `リアルタイム応力検定 | 安全判定 OK`;
            veoEnglishPrompt = `Close-up shot of sophisticated structural engineering holographic CAD interface, illuminated blue and gold vector wireframe calculation model of foundation and beams, dynamic stress distribution lines auto-adjusting, glowing green OK verification badges, sleek dark futuristic UX design, pristine photorealistic 8K, smooth camera orbit.`;
          } else {
            sceneTitle = `DEVELOP ${sceneIndex}: 実務設計の急所を解く`;
            visualAction = `設計者がディスプレイに向かい、${tool.title}の入力パラメータを調整。図面がスムーズに同期連動する。`;
            narration = `${tool.canDo ? tool.canDo[0] : '複雑な断面算定を数秒で完了'}`;
            telop = `${tool.title} | 瞬時算定`;
            veoEnglishPrompt = `Over-the-shoulder medium shot of professional structural engineer working at ultra-wide curved monitor in stylish dimly lit architectural studio, displaying clean architectural CAD calculations and beam stress graphs, soft warm ambient backlighting, photorealistic 8K, documentary cinematic realism.`;
          }
        } else {
          // Howto
          if (i === 0) {
            sceneTitle = `STEP 1: ツール起動 ＆ 基本パラメータ設定`;
            visualAction = `${tool.title}のメイン画面。部材寸法や荷重条件を入力。`;
            narration = `まずは${tool.title}を開き、基本条件を入力します。`;
            telop = `STEP 1: 断面寸法・部材条件を入力`;
            veoEnglishPrompt = `Close-up macro shot of hands typing numerical data on mechanical keyboard into a crisp modern structural calculation software UI on high-resolution monitor, sleek UI widgets and input sliders, soft daylight studio illumination, photorealistic 8K, crystal clear screen typography.`;
          } else if (i === clipCount - 1) {
            sceneTitle = `STEP FINAL: A4計算書ワンクリック出力 ＆ 審査提出`;
            visualAction = `「印刷 / PDF出力」ボタンを押すと、審査機関提出用のA4計算書フォーマットが即座に生成されプレビューされる。`;
            narration = `確認申請にそのまま使えるA4計算書がワンクリックで完成です。`;
            telop = `完了: A4計算書・PDFワンクリック出力`;
            veoEnglishPrompt = `Smooth slow zoom-in on an immaculate printed A4 Japanese structural engineering calculation document with official verification tables and stress charts, sitting on dark oak drafting table, elegant high-end architectural studio lighting, 8K ultra-sharp details.`;
          } else {
            sceneTitle = `STEP ${sceneIndex}: 応力検定 ＆ 配筋自動最適化`;
            visualAction = `断面算定表の数値が自動更新され、安全率がクリアされる様子をハイライト。`;
            narration = `${(tool.canDo && tool.canDo[i % tool.canDo.length]) || '部材の安全性を即座に判定'}`;
            telop = `安全率・配筋検定: 適合判定`;
            veoEnglishPrompt = `Detailed screen recording perspective, clean structural engineering web app calculating stress distribution in real time, interactive graphs moving with smooth animation, elegant dark navy and cyan UI color palette, photorealistic 8K rendering.`;
          }
        }
      }

      scenes.push({
        sceneIndex,
        timecode,
        durationSec: secPerClip,
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
      isFree: tool.isFree || false,
      priceText: tool.priceText || '月額980円〜',
      purpose: state.purpose,
      duration: state.duration,
      directorsNotes,
      scenes,
      createdAt: new Date().toISOString()
    };

    renderStudioUI();
    renderSnsDraft();
  }

  // 4. UIレンダリング
  function renderStudioUI() {
    const proj = state.generatedProject;
    if (!proj) return;

    // ディレクターズ・ステートメント
    if (directorStatementBox) {
      directorStatementBox.innerHTML = `
        <div class="director-statement-card">
          <div class="director-statement-head">
            <span class="material-symbols-outlined" style="color:var(--accent-gold); font-size:24px;">psychology</span>
            <h4>4部門7職種 AIディレクション方針 (${proj.purpose === 'promo' ? '🎬 ツール広告動画' : '🛠️ 操作解説マニュアル動画'} / 尺: ${proj.duration}秒・${proj.scenes.length}カット)</h4>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <p><strong>👑 企画統括:</strong> ${proj.directorsNotes.cd}</p>
            <p><strong>📐 演出構成:</strong> ${proj.directorsNotes.vd}</p>
            <p><strong>📷 撮影設計:</strong> ${proj.directorsNotes.camera}</p>
            <p><strong>🎨 色調・音響:</strong> ${proj.directorsNotes.color}</p>
            <p><strong>⚖️ 法規監修:</strong> ${proj.directorsNotes.compliance}</p>
          </div>
        </div>
      `;
    }

    // タイムラインカード描画
    if (timelineContainer) {
      timelineContainer.innerHTML = proj.scenes.map((scene, idx) => `
        <div class="storyboard-card" id="sceneCard_${scene.sceneIndex}">
          <div class="storyboard-header">
            <div style="display:flex; align-items:center; gap:10px;">
              <span class="scene-time-pill">${scene.timecode}</span>
              <strong style="font-size:0.95rem; color:#fff;">Scene ${scene.sceneIndex}: ${scene.title}</strong>
            </div>
            <span class="veo-clip-tag">${scene.veoAccountTag}</span>
          </div>

          <div class="storyboard-body">
            <div class="scene-details-grid">
              <div class="detail-block">
                <h5><span class="material-symbols-outlined" style="font-size:16px;">videocam</span> 映像アクション / カット内容</h5>
                <p>${scene.visualAction}</p>
              </div>
              <div class="detail-block">
                <h5><span class="material-symbols-outlined" style="font-size:16px;">subtitles</span> ナレーション / 画面テロップ</h5>
                <p><strong>音声:</strong> 「${scene.narration}」<br><strong>テロップ:</strong> 【${scene.telop}】</p>
              </div>
            </div>

            <!-- Veo 3 専用 英語プロンプト -->
            <div class="veo-prompt-box">
              <div class="veo-prompt-label">
                <span>VEO 3 CINEMATIC PROMPT (${scene.veoAccountTag})</span>
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

  // 5. SNS配信用文案の自動生成
  function renderSnsDraft() {
    if (!snsDraftText || !state.generatedProject) return;
    const p = state.generatedProject;
    const isFree = p.isFree;

    const draft = `【${p.toolTitle}】${p.purpose === 'promo' ? '公式ショート動画公開' : '1分操作マニュアル'}
${p.toolId === 'map_editor' ? '確認申請第1面の敷地案内図を地図からなぞるだけ1分完成！完全無料・登録不要。' : '2025年法改正対応・審査機関直結のA4計算書をワンクリック出力。'}

▼ ${p.toolTitle} はこちら
${p.toolUrl}

#建築確認申請 #構造計算 #設計実務 #mdo3 #${p.toolId}`;

    snsDraftText.textContent = draft;
  }

  function copySnsDraft() {
    if (!snsDraftText) return;
    const text = snsDraftText.textContent;
    navigator.clipboard.writeText(text).then(() => {
      alert('SNS用ポスト文案をコピーしました！\nX や note+ の告知文にご活用ください。');
    }).catch(err => {
      console.error('Copy failed:', err);
    });
  }

  // 6. プロンプトコピー関数
  window.copyVeoPrompt = function(idx) {
    if (!state.generatedProject || !state.generatedProject.scenes[idx]) return;
    const promptText = state.generatedProject.scenes[idx].veoEnglishPrompt;
    navigator.clipboard.writeText(promptText).then(() => {
      alert(`[Clip #${idx + 1}] Veo 3 英語プロンプトをクリップボードにコピーしました！\nVeo 3 に貼り付けて動画生成を実行してください。`);
    }).catch(err => {
      console.error('Copy failed:', err);
    });
  };

  function copyAllVeoPrompts() {
    if (!state.generatedProject || !state.generatedProject.scenes) return;
    const scenes = state.generatedProject.scenes;
    let fullText = `# mdo3 STUDIO | Veo 3 Cinematic Prompts Bundle\n`;
    fullText += `# Tool: ${state.generatedProject.toolTitle} (${state.generatedProject.duration}s)\n\n`;

    scenes.forEach(s => {
      fullText += `=== [Scene ${s.sceneIndex} | ${s.timecode}] ${s.veoAccountTag} ===\n`;
      fullText += `${s.veoEnglishPrompt}\n\n`;
    });

    navigator.clipboard.writeText(fullText).then(() => {
      alert(`全${scenes.length}カットのVeo 3プロンプトを一括コピーしました！\nアカウントごとにVeo 3へ順次投入してください。`);
    }).catch(err => {
      console.error('Batch copy failed:', err);
    });
  }

  // 7. Markdownエクスポート
  function downloadMarkdownFile() {
    if (!state.generatedProject) return;
    const p = state.generatedProject;
    let md = `# mdo3 STUDIO - 動画企画構成指示書\n\n`;
    md += `- **対象ツール**: ${p.toolTitle} (${p.toolId})\n`;
    md += `- **ツールURL**: ${p.toolUrl}\n`;
    md += `- **動画種別**: ${p.purpose === 'promo' ? 'プロモーション広告動画' : '操作説明マニュアル動画'}\n`;
    md += `- **目標尺**: ${p.duration}秒 (${p.scenes.length}クリップ構成)\n`;
    md += `- **生成日時**: ${p.createdAt}\n\n`;
    md += `---\n\n## 4部門7職種 ディレクション方針\n\n`;
    md += `- **企画統括**: ${p.directorsNotes.cd}\n`;
    md += `- **演出構成**: ${p.directorsNotes.vd}\n`;
    md += `- **撮影設計**: ${p.directorsNotes.camera}\n`;
    md += `- **色調・音響**: ${p.directorsNotes.color}\n`;
    md += `- **法規監修**: ${p.directorsNotes.compliance}\n\n`;
    md += `---\n\n## カット割り絵コンテ ＆ Veo 3 英語プロンプト一覧\n\n`;

    p.scenes.forEach(s => {
      md += `### [${s.timecode}] Scene ${s.sceneIndex}: ${s.title}\n`;
      md += `- **Veo割当**: ${s.veoAccountTag}\n`;
      md += `- **映像内容**: ${s.visualAction}\n`;
      md += `- **ナレーション**: ${s.narration}\n`;
      md += `- **テロップ**: ${s.telop}\n\n`;
      md += `\`\`\`text\n${s.veoEnglishPrompt}\n\`\`\`\n\n`;
    });

    downloadBlob(md, `mdo3_studio_storyboard_${p.toolId}_${p.duration}s.md`, 'text/markdown');
  }

  // 8. JSONエクスポート
  function downloadJsonFile() {
    if (!state.generatedProject) return;
    const jsonStr = JSON.stringify(state.generatedProject, null, 2);
    downloadBlob(jsonStr, `mdo3_studio_project_${state.generatedProject.toolId}_${state.generatedProject.duration}s.json`, 'application/json');
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

  // 9. 動画ファイルアップロード
  function uploadVideoFile(file) {
    if (!file) return;
    if (!dropzone) return;

    dropzone.innerHTML = `
      <span class="material-symbols-outlined dropzone-icon" style="animation: spin 1s linear infinite;">sync</span>
      <div class="dropzone-title">動画ファイルをアップロード中...</div>
      <div class="dropzone-sub">${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)</div>
    `;

    const formData = new FormData();
    formData.append('video_file', file);
    formData.append('title', (state.generatedProject ? state.generatedProject.toolTitle : 'mdo3') + ` (${state.duration}秒動画)`);
    formData.append('tool_id', state.selectedToolId);
    formData.append('tool_name', state.generatedProject ? state.generatedProject.toolTitle : '');
    formData.append('duration', state.duration);
    formData.append('purpose', state.purpose);

    fetch('api/upload_video.php', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.video) {
          alert('動画のアップロードが完了しました！完成動画ギャラリーに追加されました。');
          fetchUploadedVideos();
          resetDropzoneUI();
        } else {
          alert('アップロード失敗: ' + (data.message || '不明なエラー'));
          resetDropzoneUI();
        }
      })
      .catch(err => {
        console.error('Upload error:', err);
        alert('通信エラーが発生しました');
        resetDropzoneUI();
      });
  }

  function resetDropzoneUI() {
    if (!dropzone) return;
    dropzone.innerHTML = `
      <span class="material-symbols-outlined dropzone-icon">cloud_upload</span>
      <div class="dropzone-title">完成動画 (mp4) をアップロード</div>
      <div class="dropzone-sub">ドラッグ＆ドロップ または クリックして選択</div>
    `;
  }

  // 10. アップロード済み動画の取得と描画
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

  // 右カラムのミニプレビュー
  function renderVideoPreviews(videos) {
    if (!videoPreviewContainer) return;
    if (videos.length === 0) {
      videoPreviewContainer.innerHTML = '';
      return;
    }
    const latest = videos.slice(0, 2);
    videoPreviewContainer.innerHTML = latest.map(vid => `
      <div class="video-preview-box">
        <video controls src="${vid.url}" preload="metadata"></video>
        <div class="video-meta-bar">
          <div>
            <strong>${escapeHtml(vid.title)}</strong>
            <span style="font-size:0.7rem; color:var(--text-muted); display:block;">${vid.created_at}</span>
          </div>
          <span class="scene-time-pill">${vid.duration}s</span>
        </div>
      </div>
    `).join('');
  }

  // Vault (完成動画ギャラリー) 描画
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
    vaultGrid.innerHTML = videos.map(vid => `
      <div class="vault-card">
        <div class="vault-video-wrap">
          <video controls src="${vid.url}" preload="metadata"></video>
        </div>
        <div class="vault-card-body">
          <div class="vault-card-header">
            <h4 class="vault-card-title">${escapeHtml(vid.title)}</h4>
            <span class="scene-time-pill">${vid.duration}s</span>
          </div>
          <div class="vault-card-meta">
            <span class="material-symbols-outlined" style="font-size:14px;">calendar_today</span> ${vid.created_at}
            <span style="margin: 0 4px;">•</span>
            <span class="material-symbols-outlined" style="font-size:14px;">label</span> ${vid.purpose === 'promo' ? '広告動画' : 'マニュアル'}
          </div>
          <div class="vault-card-actions">
            <a href="${vid.url}" download class="vault-action-btn">
              <span class="material-symbols-outlined" style="font-size:15px;">download</span> MP4保存
            </a>
            <button type="button" class="vault-action-btn" onclick="window.copyEmbedTag('${vid.url}')">
              <span class="material-symbols-outlined" style="font-size:15px;">code</span> 埋込タグ
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  window.copyEmbedTag = function(url) {
    const tag = `<video src="${url}" controls playsinline style="max-width:100%; border-radius:8px;"></video>`;
    navigator.clipboard.writeText(tag).then(() => {
      alert('動画の埋め込みHTMLタグをコピーしました！\nnote+ やWEBサイトにそのまま貼り付け可能です。');
    });
  };

  function padZero(num) {
    return String(num).padStart(2, '0');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
