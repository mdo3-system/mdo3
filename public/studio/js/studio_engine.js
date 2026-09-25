/**
 * public/studio/js/studio_engine.js
 * 
 * mdo3 STUDIO - 4部門7職種 AI動画制作＆Veo3プロンプト生成エンジン
 */

(function() {
  'use strict';

  // 状態管理
  const state = {
    selectedToolId: 'jintsuko',
    purpose: 'promo', // 'promo' (広告動画) or 'howto' (操作説明動画)
    duration: 30, // 15, 30, 45, 60, 90
    generatedProject: null,
    uploadedVideos: []
  };

  // DOM要素
  let toolSelect, purposePromoBtn, purposeHowtoBtn, durationPills;
  let btnGenerate, teamBadgesContainer, directorStatementBox, timelineContainer;
  let btnDownloadMarkdown, btnDownloadJson, dropzone, videoFileInput, videoPreviewContainer;

  document.addEventListener('DOMContentLoaded', () => {
    initDomReferences();
    populateToolSelect();
    bindEvents();
    generateStudioPlan(); // 初期ロード時にデフォルト生成
    fetchUploadedVideos();
  });

  function initDomReferences() {
    toolSelect = document.getElementById('studioToolSelect');
    purposePromoBtn = document.getElementById('purposePromoBtn');
    purposeHowtoBtn = document.getElementById('purposeHowtoBtn');
    durationPills = document.querySelectorAll('.duration-pill');
    btnGenerate = document.getElementById('btnGenerateProject');
    teamBadgesContainer = document.getElementById('teamBadgesContainer');
    directorStatementBox = document.getElementById('directorStatementBox');
    timelineContainer = document.getElementById('timelineContainer');
    btnDownloadMarkdown = document.getElementById('btnDownloadMarkdown');
    btnDownloadJson = document.getElementById('btnDownloadJson');
    dropzone = document.getElementById('uploadDropzone');
    videoFileInput = document.getElementById('videoFileInput');
    videoPreviewContainer = document.getElementById('videoPreviewContainer');
  }

  // 1. 全29ツールのセレクトボックス初期化
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
  }

  // 2. イベントバインド
  function bindEvents() {
    if (toolSelect) {
      toolSelect.addEventListener('change', (e) => {
        state.selectedToolId = e.target.value;
      });
    }

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

    durationPills.forEach(pill => {
      pill.addEventListener('click', () => {
        durationPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.duration = parseInt(pill.getAttribute('data-duration'), 10);
      });
    });

    if (btnGenerate) {
      btnGenerate.addEventListener('click', () => {
        btnGenerate.disabled = true;
        btnGenerate.innerHTML = '<span class="material-symbols-outlined" style="animation: spin 1s linear infinite;">sync</span> 4部門AIがシナリオ＆Veo3プロンプトを構築中...';
        setTimeout(() => {
          generateStudioPlan();
          btnGenerate.disabled = false;
          btnGenerate.innerHTML = '<span class="material-symbols-outlined">auto_awesome</span> AI制作チームに指示・企画生成を開始';
        }, 400);
      });
    }

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

  // 3. 4部門7職種 AI動画企画 ＆ Veo3英語プロンプト生成コア
  function generateStudioPlan() {
    const catalog = (typeof MDO3_TOOLS_CATALOG !== 'undefined') ? MDO3_TOOLS_CATALOG : [];
    const tool = catalog.find(t => t.id === state.selectedToolId) || {
      id: 'general',
      title: 'mdo3 専門構造計算クラウド',
      summary: '木造・RC造の構造計算・確認申請実務を瞬時に解く専門ツール群',
      standards: ['建築基準法施行令第82条', '木造軸組工法住宅の許容応力度設計'],
      canDo: ['審査直結のA4計算書出力', 'リアルタイム断面算定']
    };

    const isPromo = state.purpose === 'promo';
    const duration = state.duration;

    // クリップ数配分 (1クリップあたり約3〜6秒)
    let clipCount = 6;
    if (duration === 15) clipCount = 3;
    if (duration === 30) clipCount = 6;
    if (duration === 45) clipCount = 9;
    if (duration === 60) clipCount = 12;
    if (duration === 90) clipCount = 15;

    // 4部門7職種ディレクターズ・ステートメント
    const directorsNotes = isPromo ? {
      cd: `【建築P/クリエイティブディレクター】ターゲットは多忙な設計事務所・工務店設計部。2025年法改正のプレッシャーに対し、「構造のブラックボックスを美しく、確実に突破する」という圧倒的な安心感と先進性を訴求するトーン＆マナーに統一します。`,
      vd: `【映像ディレクター】尺${duration}秒構成。冒頭2秒で構造図面と梁の美しさでスクロールを止めさせ、中盤でリアルタイム検定の爽快感、ラストに「A4審査適合計算書」への着地を見せる完璧なアークを描きます。`,
      camera: `【建築カメラマン】超広角18mmティルトシフトで木造架構の直線美を歪みなく捉え、夕景のゴールデンアワー光が梁材に差し込むドラマチックなライティングを指定します。`,
      color: `【カラリスト】木肌の温もり（ナチュラルオーク）とコンクリートの静けさを引き立てる「Modern Nordic Architectural LUT」をベースに、OK検定時のエメラルドグリーンをアクセントカラーに設定。`,
      compliance: `【法規監修】準拠法令「${tool.standards ? tool.standards[0] : '建築基準法'}」に完全合致。過大広告にならず、実務設計者がそのまま審査機関に提出できる信頼性の高い表現であることを確認済み。`
    } : {
      cd: `【建築P/クリエイティブディレクター】ターゲットは「今すぐこの物件の計算書を作りたい」実務設計者。「何を入力し、何が出るのか」が10秒で直感的にわかる、無駄のないハウツースタイルを構築します。`,
      vd: `【映像ディレクター】尺${duration}秒構成。STEP 1「条件入力」→ STEP 2「リアルタイム応力算定」→ STEP 3「A4ワンクリック出力」の3拍子で、実務のスピード感を強調します。`,
      camera: `【建築カメラマン】UI操作画面と構造伏図のクローズアップを組み合わせ、注視すべき入力ボックスと判定ゲージにスムーズにフォーカスを送るラックフォーカス（被写界深度送り）を指定。`,
      color: `【カラリスト】視認性を最優先にした「Clean High-Tech Dark LUT」。入力数値と検定結果のコントラストを際立たせ、長時間の視聴でも疲れない配色とします。`,
      compliance: `【法規監修】入力パラメータ（荷重・寸法・鉄筋径）の許容値が審査機関（KBI等）の取扱要領に適合している旨をテロップで明記。`
    };

    // シーン＆Veo3プロンプトの組み立て
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

      if (isPromo) {
        if (i === 0) {
          sceneTitle = 'HOOK: 建築空間の美と構造の問いかけ';
          visualAction = '洗練された現代木造・RCハイブリッド住宅の内観。天窓から夕暮れの光が差し込み、力強い化粧梁がダイナミックに浮き上がる。';
          narration = '2025年、木造建築の構造実務は新たな時代へ。';
          telop = `${tool.title} | 審査直結クラウド`;
          veoEnglishPrompt = `Cinematic slow tracking shot inside a modern minimalist luxury Japanese timber residence, massive exposed glue-laminated wood beams and cross-laminated timber ceiling, warm cinematic golden hour sunlight streaming through panoramic clerestory windows, volumetric atmospheric lighting, photorealistic 8K resolution, architectural digest award-winning cinematography, Arri Alexa LF, subtle realistic depth of field.`;
        } else if (i === clipCount - 1) {
          sceneTitle = 'CTA: 審査直結の確信とアクション';
          visualAction = '完成したA4構造計算書がデスク上に滑らかに展開され、タブレット端末上でmdo3ポータルが開く。画面に「月額980円から」のバッジ。';
          narration = 'すべての答えは、クラウドにある。mdo3で今すぐ解決。';
          telop = `mdo3.com | 月額980円〜 今すぐ試す`;
          veoEnglishPrompt = `High-end architectural office tabletop, a pristine official A4 structural engineering calculation report with clear Japanese blueprint schematics, tablet displaying glowing web application interface, modern architect hands interacting smoothly, elegant soft studio lighting, cinematic shallow focus, photorealistic 8K, crisp architectural presentation aesthetic.`;
        } else if (i === Math.floor(clipCount / 2)) {
          sceneTitle = 'CORE: リアルタイム幾何解析と応力検定';
          visualAction = '3D構造ワイヤーフレームと変形スラブの荷重分割線が青く発光しながら展開。断面算定ゲージが安全圏（OK）へ瞬時に移行。';
          narration = `手計算の不安を解消。${tool.standards ? tool.standards[0] : '告示基準'}に完全準拠。`;
          telop = `リアルタイム応力検定 | 安全判定 OK`;
          veoEnglishPrompt = `Close-up shot of sophisticated structural engineering holographic CAD interface, illuminated blue and gold vector wireframe calculation model of foundation and beams, dynamic stress distribution lines auto-adjusting, glowing green OK verification badges, sleek dark futuristic UX design, pristine photorealistic 8K, smooth camera orbit.`;
        } else {
          sceneTitle = `DEVELOPMENT ${sceneIndex}: 実務設計の急所を解く`;
          visualAction = `設計者がディスプレイに向かい、${tool.title}の入力パラメータを調整。図面がスムーズに同期連動する。`;
          narration = `${tool.canDo[0] || '複雑な断面算定を数秒で完了'}`;
          telop = `${tool.title} | 瞬時算定`;
          veoEnglishPrompt = `Over-the-shoulder medium shot of professional structural engineer working at ultra-wide curved monitor in stylish dimly lit architectural studio, displaying clean architectural CAD calculations and beam stress graphs, soft warm ambient backlighting, photorealistic 8K, documentary cinematic realism.`;
        }
      } else {
        // Howto (操作説明)
        if (i === 0) {
          sceneTitle = 'STEP 1: ツール起動 ＆ 基本パラメータ設定';
          visualAction = `${tool.title}のメイン画面。建設地や部材寸法（梁せい、スラブ厚、鉄筋径）をテンキーで入力。`;
          narration = `まずは${tool.title}を開き、基本条件を入力します。`;
          telop = `STEP 1: 断面寸法・部材条件を入力`;
          veoEnglishPrompt = `Close-up macro shot of hands typing numerical data on mechanical keyboard into a crisp modern structural calculation software UI on high-resolution monitor, sleek UI widgets and input sliders, soft daylight studio illumination, photorealistic 8K, crystal clear screen typography.`;
        } else if (i === clipCount - 1) {
          sceneTitle = 'STEP FINAL: A4計算書ワンクリック出力 ＆ 審査提出';
          visualAction = '「印刷 / PDF出力」ボタンを押すと、審査機関提出用のA4計算書フォーマットが即座に生成されプレビューされる。';
          narration = '確認申請にそのまま使えるA4計算書がワンクリックで完成です。';
          telop = `完了: A4計算書・PDFワンクリック出力`;
          veoEnglishPrompt = `Smooth slow zoom-in on an immaculate printed A4 Japanese structural engineering calculation document with official verification tables and stress charts, sitting on dark oak drafting table, elegant high-end architectural studio lighting, 8K ultra-sharp details.`;
        } else {
          sceneTitle = `STEP ${sceneIndex}: 応力検定 ＆ 配筋自動最適化`;
          visualAction = `断面算定表の数値が自動更新され、配筋比や許容応力度比が安全（1.0未満）に収まる様子をハイライト。`;
          narration = `${tool.canDo[i % tool.canDo.length] || '部材の安全性を即座に判定'}`;
          telop = `安全率・配筋検定: 適合判定`;
          veoEnglishPrompt = `Detailed screen recording perspective, clean structural engineering web app calculating rebar ratios and shear force distribution in real time, interactive graphs moving with smooth animation, elegant dark navy and cyan UI color palette, photorealistic 8K rendering.`;
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
      purpose: state.purpose,
      duration: state.duration,
      directorsNotes,
      scenes,
      createdAt: new Date().toISOString()
    };

    renderStudioUI();
  }

  // 4. UIレンダリング
  function renderStudioUI() {
    const proj = state.generatedProject;
    if (!proj) return;

    // ディレクターズ・ステートメント描画
    if (directorStatementBox) {
      directorStatementBox.innerHTML = `
        <div class="director-statement-card">
          <div class="director-statement-head">
            <span class="material-symbols-outlined" style="color:var(--accent-gold); font-size:24px;">psychology</span>
            <h4>4部門7職種 AIディレクション方針 (${proj.purpose === 'promo' ? '🎬 ツール広告動画' : '🛠️ 操作解説マニュアル動画'} / 尺: ${proj.duration}秒)</h4>
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

    // 絵コンテ ＆ Veo3 プロンプトタイムライン描画
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
                <span>VEO 3 CINEMATIC PROMPT (英語プロンプト)</span>
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

  // 5. プロンプトコピー関数 (グローバル公開)
  window.copyVeoPrompt = function(idx) {
    if (!state.generatedProject || !state.generatedProject.scenes[idx]) return;
    const promptText = state.generatedProject.scenes[idx].veoEnglishPrompt;
    navigator.clipboard.writeText(promptText).then(() => {
      alert(`[Clip #${idx + 1}] Veo 3 英語プロンプトをクリップボードにコピーしました！\nVeo 3 に貼り付けて動画生成を実行してください。`);
    }).catch(err => {
      console.error('Copy failed:', err);
    });
  };

  // 6. Markdownエクスポート
  function downloadMarkdownFile() {
    if (!state.generatedProject) return;
    const p = state.generatedProject;
    let md = `# mdo3 STUDIO - 動画企画構成指示書\n\n`;
    md += `- **対象ツール**: ${p.toolTitle} (${p.toolId})\n`;
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

  // 7. JSONエクスポート
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

  // 8. 動画ファイルアップロード
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
          alert('動画のアップロードが完了しました！プレビューを表示します。');
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
      <div class="dropzone-sub">ドラッグ＆ドロップ または クリックしてファイルを選択</div>
    `;
  }

  // 9. アップロード済み動画の取得と表示
  function fetchUploadedVideos() {
    fetch('api/upload_video.php')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.videos) && data.videos.length > 0) {
          renderVideoPreviews(data.videos);
        }
      })
      .catch(err => {
        console.warn('Fetch videos warning:', err);
      });
  }

  function renderVideoPreviews(videos) {
    if (!videoPreviewContainer) return;
    videoPreviewContainer.innerHTML = videos.map(vid => `
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

  function padZero(num) {
    return String(num).padStart(2, '0');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
