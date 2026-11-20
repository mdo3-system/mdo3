/**
 * policy-generator.js
 * 構造上の特徴・構造設計方針 自動作成ツール（ARCHITREND ZERO 設計方針欄コピペ用・テキスト専用）
 * - 2025年4月施行 改正建築基準法 / グレー本2025 / ARCHITREND ZERO 説明書 第23版 完全準拠
 * - 規模による矛盾を排除した「高さ16m以下、◯階建て」表記
 * - 令第46条第4項省略、耐震等級(Co=0.20/0.25/0.30)、静岡県Zs=1.2、詳細計算法、金物工法(Tec-One P3)対応
 */
(function () {
  'use strict';

  const POLICY_STORAGE_KEY = 'mdo3_design_policy_saved_v1';
  const $ = (id) => document.getElementById(id);

  function initPolicyTool() {
    bindModeTabs();
    if (!$('policyFormRoot')) return;

    bindPolicyEvents();
    loadSavedPolicyIfAny();
    renderPolicyText();
  }

  /**
   * ヘッダー直下の2大モード切替タブ（計算書PDF統合・製本 ⇔ 構造上の特徴・設計方針 作成）
   */
  function bindModeTabs() {
    const modeTabs = document.querySelectorAll('.mode-switch-btn');
    const pdfPane = $('modePanePdfBinder');
    const policyPane = $('modePaneDesignPolicy');
    if (!modeTabs.length || !pdfPane || !policyPane) return;

    modeTabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        modeTabs.forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
        pdfPane.classList.toggle('hidden', mode !== 'pdf');
        policyPane.classList.toggle('hidden', mode !== 'policy');
        if (mode === 'policy') {
          renderPolicyText();
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function bindPolicyEvents() {
    const root = $('policyFormRoot');
    root.querySelectorAll('input, select, textarea').forEach((el) => {
      el.addEventListener('input', () => {
        syncConditionalVisibility();
        renderPolicyText();
      });
      el.addEventListener('change', () => {
        syncConditionalVisibility();
        renderPolicyText();
      });
    });

    // クイックプリセットボタン
    document.querySelectorAll('.policy-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyQuickPreset(btn.dataset.preset);
        syncConditionalVisibility();
        renderPolicyText();
      });
    });

    // クリップボードへコピー
    $('btnCopyPolicyText').addEventListener('click', async () => {
      const txt = $('policyOutputTextarea').value;
      if (!txt) return;
      try {
        await navigator.clipboard.writeText(txt);
        showPolicyToast('クリップボードにコピーしました！ARCHITREND ZEROの「設計方針」欄へ貼り付けてください。');
      } catch {
        $('policyOutputTextarea').select();
        document.execCommand('copy');
        showPolicyToast('テキストをコピーしました！');
      }
    });

    // .txt ファイルダウンロード
    $('btnDownloadPolicyTxt').addEventListener('click', () => {
      const txt = $('policyOutputTextarea').value;
      if (!txt) return;
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.href = url;
      a.download = `構造上の特徴・設計方針_${today}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });

    // 自社標準として保存
    $('btnSavePolicyPreset').addEventListener('click', () => {
      const state = collectFormState();
      localStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(state));
      showPolicyToast('現在の回答内容を「自社標準テンプレート」としてブラウザに記憶しました。');
    });

    // 初期状態へ戻す
    $('btnResetPolicyForm').addEventListener('click', () => {
      if (!confirm('設計方針の入力内容を初期値へ戻しますか？')) return;
      localStorage.removeItem(POLICY_STORAGE_KEY);
      applyQuickPreset('std_2f');
      syncConditionalVisibility();
      renderPolicyText();
    });

    syncConditionalVisibility();
  }

  function showPolicyToast(msg) {
    const el = $('policyToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.add('hidden'), 3500);
  }

  function syncConditionalVisibility() {
    const stories = $('polStories').value;
    const isHiraya = stories === '1';
    const rigWrap = $('polRigidityWrap');
    if (rigWrap) rigWrap.classList.toggle('hidden', isHiraya);

    const isMetal = $('polJointMethod').value === 'tecone';
    const metalNote = $('polMetalNoteWrap');
    if (metalNote) metalNote.classList.toggle('hidden', !isMetal);
  }

  function applyQuickPreset(presetKey) {
    // 共通初期化
    $('polDetailLevel').value = 'detailed';
    $('polStories').value = '2';
    $('polUsage').value = '一戸建ての住宅（専用住宅）';
    $('polPlanShape').value = 'regular';
    $('polPlanNote').value = '';
    $('polElevShape').value = 'regular';
    $('polElevNote').value = '';
    $('polJointMethod').value = 'conventional';
    $('polMetalMaker').value = '株式会社タツミ製「Tec-One P3（ピン接合プレカット金物工法）」';
    $('polWallBrace').checked = true;
    $('polWallPlywood').checked = true;
    $('polWallCert').checked = false;
    $('polWallCertName').value = '';
    $('polWallQuasi').checked = true;
    $('polWallQuasiName').value = 'せっこうボード';
    $('polWallDamper').checked = false;
    $('polWallDamperName').value = '';
    $('polFloorSpec').value = 'rigid';
    $('polRoofSpec').value = 'rafter_plywood';
    $('polHorizDetailCalc').checked = false;
    $('polHorizDetailNote').value = '勾配屋根構面';
    $('polQuakeGrade').value = '1';
    $('polZoneZ').value = '1.0';
    $('polShizuokaZs').checked = false;
    $('polSnowArea').value = 'general';
    $('polSoilType').value = '2';
    $('polFoundationType').value = 'mat';
    $('polBearingCap').value = '30.0';
    $('polSoilSurvey').value = 'sws';
    $('polGroundImprove').value = 'none';
    $('polHighFound').value = 'none';
    $('polHighFoundNote').value = '';
    $('polDriftLimit').value = '150';
    $('polEccLimit').value = '0.30';
    $('polPulloutMethod').value = 'n_value';
    $('polBeamDeficit300').checked = true;
    $('polOmitSillBending').checked = true;
    $('polGraybookVer').value = '2025';
    $('polBesshiMerikomi').checked = true;
    $('polBesshiWindBeam').checked = false;
    $('polBesshiJintsuko').checked = true;
    $('polBesshiIrregSlab').checked = false;
    $('polBesshiCornerFound').checked = false;
    $('polBesshiCantilever').checked = false;
    $('polBesshiOhbiki').checked = false;
    $('polBesshiOther').value = '';

    if (presetKey === 'std_3f') {
      $('polStories').value = '3';
      $('polDriftLimit').value = '120';
    } else if (presetKey === 'hiraya') {
      $('polStories').value = '1';
      $('polBesshiWindBeam').checked = false;
    } else if (presetKey === 'tecone') {
      $('polJointMethod').value = 'tecone';
      $('polWallCert').checked = true;
      $('polWallCertName').value = 'ダイライトMS 9mm';
    } else if (presetKey === 'grade3') {
      $('polQuakeGrade').value = '3';
      $('polHorizDetailCalc').checked = true;
    } else if (presetKey === 'shizuoka') {
      $('polZoneZ').value = '1.0';
      $('polShizuokaZs').checked = true;
    }
  }

  function collectFormState() {
    return {
      detailLevel: $('polDetailLevel').value,
      stories: $('polStories').value,
      usage: $('polUsage').value.trim(),
      planShape: $('polPlanShape').value,
      planNote: $('polPlanNote').value.trim(),
      elevShape: $('polElevShape').value,
      elevNote: $('polElevNote').value.trim(),
      jointMethod: $('polJointMethod').value,
      metalMaker: $('polMetalMaker').value.trim(),
      wallBrace: $('polWallBrace').checked,
      wallPlywood: $('polWallPlywood').checked,
      wallCert: $('polWallCert').checked,
      wallCertName: $('polWallCertName').value.trim(),
      wallQuasi: $('polWallQuasi').checked,
      wallQuasiName: $('polWallQuasiName').value.trim(),
      wallDamper: $('polWallDamper').checked,
      wallDamperName: $('polWallDamperName').value.trim(),
      floorSpec: $('polFloorSpec').value,
      roofSpec: $('polRoofSpec').value,
      horizDetailCalc: $('polHorizDetailCalc').checked,
      horizDetailNote: $('polHorizDetailNote').value.trim(),
      quakeGrade: $('polQuakeGrade').value,
      zoneZ: $('polZoneZ').value,
      shizuokaZs: $('polShizuokaZs').checked,
      snowArea: $('polSnowArea').value,
      soilType: $('polSoilType').value,
      foundationType: $('polFoundationType').value,
      bearingCap: $('polBearingCap').value.trim(),
      soilSurvey: $('polSoilSurvey').value,
      groundImprove: $('polGroundImprove').value,
      highFound: $('polHighFound').value,
      highFoundNote: $('polHighFoundNote').value.trim(),
      driftLimit: $('polDriftLimit').value,
      eccLimit: $('polEccLimit').value,
      pulloutMethod: $('polPulloutMethod').value,
      beamDeficit300: $('polBeamDeficit300').checked,
      omitSillBending: $('polOmitSillBending').checked,
      graybookVer: $('polGraybookVer').value,
      besshiMerikomi: $('polBesshiMerikomi').checked,
      besshiWindBeam: $('polBesshiWindBeam').checked,
      besshiJintsuko: $('polBesshiJintsuko').checked,
      besshiIrregSlab: $('polBesshiIrregSlab').checked,
      besshiCornerFound: $('polBesshiCornerFound').checked,
      besshiCantilever: $('polBesshiCantilever').checked,
      besshiOhbiki: $('polBesshiOhbiki').checked,
      besshiOther: $('polBesshiOther').value.trim(),
    };
  }

  function loadSavedPolicyIfAny() {
    const raw = localStorage.getItem(POLICY_STORAGE_KEY);
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      const setVal = (id, val) => { if ($(id) && val !== undefined) $(id).value = val; };
      const setChk = (id, val) => { if ($(id) && typeof val === 'boolean') $(id).checked = val; };
      setVal('polDetailLevel', s.detailLevel);
      setVal('polStories', s.stories);
      setVal('polUsage', s.usage);
      setVal('polPlanShape', s.planShape);
      setVal('polPlanNote', s.planNote);
      setVal('polElevShape', s.elevShape);
      setVal('polElevNote', s.elevNote);
      setVal('polJointMethod', s.jointMethod);
      setVal('polMetalMaker', s.metalMaker);
      setChk('polWallBrace', s.wallBrace);
      setChk('polWallPlywood', s.wallPlywood);
      setChk('polWallCert', s.wallCert);
      setVal('polWallCertName', s.wallCertName);
      setChk('polWallQuasi', s.wallQuasi);
      setVal('polWallQuasiName', s.wallQuasiName);
      setChk('polWallDamper', s.wallDamper);
      setVal('polWallDamperName', s.wallDamperName);
      setVal('polFloorSpec', s.floorSpec);
      setVal('polRoofSpec', s.roofSpec);
      setChk('polHorizDetailCalc', s.horizDetailCalc);
      setVal('polHorizDetailNote', s.horizDetailNote);
      setVal('polQuakeGrade', s.quakeGrade);
      setVal('polZoneZ', s.zoneZ);
      setChk('polShizuokaZs', s.shizuokaZs);
      setVal('polSnowArea', s.snowArea);
      setVal('polSoilType', s.soilType);
      setVal('polFoundationType', s.foundationType);
      setVal('polBearingCap', s.bearingCap);
      setVal('polSoilSurvey', s.soilSurvey);
      setVal('polGroundImprove', s.groundImprove);
      setVal('polHighFound', s.highFound);
      setVal('polHighFoundNote', s.highFoundNote);
      setVal('polDriftLimit', s.driftLimit);
      setVal('polEccLimit', s.eccLimit);
      setVal('polPulloutMethod', s.pulloutMethod);
      setChk('polBeamDeficit300', s.beamDeficit300);
      setChk('polOmitSillBending', s.omitSillBending);
      setVal('polGraybookVer', s.graybookVer);
      setChk('polBesshiMerikomi', s.besshiMerikomi);
      setChk('polBesshiWindBeam', s.besshiWindBeam);
      setChk('polBesshiJintsuko', s.besshiJintsuko);
      setChk('polBesshiIrregSlab', s.besshiIrregSlab);
      setChk('polBesshiCornerFound', s.besshiCornerFound);
      setChk('polBesshiCantilever', s.besshiCantilever);
      setChk('polBesshiOhbiki', s.besshiOhbiki);
      setVal('polBesshiOther', s.besshiOther);
      syncConditionalVisibility();
    } catch {
      // ignore corrupted storage
    }
  }

  /**
   * 質問回答から ARCHITREND ZERO 設計方針欄コピペ用の純粋プレーンテキストを生成
   */
  function buildPolicyPlainText(s) {
    const isDetailed = s.detailLevel === 'detailed';
    const isHiraya = s.stories === '1';
    const isMixedRc = s.stories === 'mixed_rc';
    const graybookTitle =
      s.graybookVer === '2017'
        ? '「木造軸組工法住宅の許容応力度設計（2017年版）」（公益財団法人 日本住宅・木材技術センター）'
        : '「木造軸組工法住宅の許容応力度設計（2025年版）」（公益財団法人 日本住宅・木材技術センター）';

    const storyLabelMap = {
      '1': '平屋建て（1階建て）',
      '2': '地上2階建て',
      '3': '地上3階建て',
      mixed_rc: '地上3階建て（1階RC造・2〜3階木造の混構造）',
    };
    const storyText = storyLabelMap[s.stories] || '地上2階建て';
    const usageText = s.usage || '一戸建ての住宅（専用住宅）';

    // 平面形状文
    const planTextMap = {
      regular: '平面形状はほぼ長方形（整形）であり、不整形によりゾーン分け等の構造計算上の特別な配慮を要する形状ではない。',
      slight_indent: '平面形状は一部に凹凸があるものの、ゾーンを分けて検討が必要なほどの不整形ではなく、整形建築物として取り扱う。',
      narrow: '平面形状は間口が狭く細長い形状であるため、水平構面の剛性・許容せん断耐力および偏心に十分配慮して構造計画を行う。',
      irregular: '平面形状はL字型・コの字型等の不整形に該当するため、入隅部等の水平構面の剛性・耐力および横架材接合部の引張耐力に配慮して検討を行う。',
    };
    let planSentence = planTextMap[s.planShape] || planTextMap.regular;
    if (s.planNote) planSentence += `（${s.planNote}）`;

    // 立面形状文
    const elevTextMap = {
      regular: isHiraya
        ? '立面形状は平屋建ての整形な形状であり、構造計算上の特別な配慮を要する形状ではない。'
        : '立面形状は上下階の耐力壁線が概ね揃っており、不整形により構造計算上の特別な配慮を要する形状ではない。',
      setback: '立面形状は下屋・セットバックを有するが、上下階の耐力壁線は概ね揃っており、構造計算上の特別な配慮を要する不整形ではない。',
      irregular: '立面形状は急勾配の母屋下がり・吹抜け・スキップフロア等を有するため、耐力壁の剛性・納まりおよび荷重伝達経路に配慮して検討を行う。',
    };
    let elevSentence = elevTextMap[s.elevShape] || elevTextMap.regular;
    if (s.elevNote) elevSentence += `（${s.elevNote}）`;

    // 使用耐力壁文
    const walls = [];
    if (s.wallBrace) walls.push('筋かい耐力壁');
    if (s.wallPlywood) walls.push('構造用合板張り耐力壁');
    if (s.wallCert) {
      walls.push(s.wallCertName ? `大臣認定面材耐力壁（${s.wallCertName}）` : '大臣認定面材耐力壁');
    }
    const wallMainStr = walls.length > 0 ? walls.join('および') : '筋かい耐力壁および構造用合板張り耐力壁';
    let wallSentence = `鉛直構面は、X方向・Y方向ともに${wallMainStr}で構成する。`;
    if (s.wallQuasi) {
      wallSentence += `また、${s.wallQuasiName || 'せっこうボード'}等を準耐力壁として適切に評価・算入する。`;
    }
    if (s.wallDamper) {
      wallSentence += `なお、${s.wallDamperName || '制振装置・高倍率耐力壁'}を併用し、各認定・評価条件に基づき仕様を遵守する。`;
    }

    // 水平構面文
    const floorText =
      s.floorSpec === 'rigid'
        ? '床組は横架材に構造用合板（厚さ24mm以上）を直接釘打ちする剛床構面'
        : '床組は根太床および隅角部の火打材を設けた構面';
    const roofText =
      s.roofSpec === 'rafter_plywood'
        ? '屋根・小屋組は構造用合板張り勾配屋根構面（転び止め設置）および火打構面'
        : '小屋組は隅角部に火打材を設けた小屋水平構面';
    let horizSentence = isHiraya
      ? `水平構面は、${roofText}で構成する。`
      : `水平構面は、${floorText}とし、${roofText}で構成する。`;
    if (s.horizDetailCalc) {
      const targetPart = s.horizDetailNote || '勾配屋根構面・床構面';
      horizSentence += `なお、${targetPart}については、詳細計算法（釘ピッチ増打ち等を考慮）により許容せん断耐力を算定し、別紙計算書を添付の上で検定に用いる。`;
    }

    // 軸組接合方法文
    let jointSentence = '';
    if (s.jointMethod === 'tecone') {
      const maker = s.metalMaker || '株式会社タツミ製「Tec-One P3（ピン接合プレカット金物工法）」';
      jointSentence =
        `軸組の主要な接合部（柱脚・柱頭、梁受部、梁相互継手等）には、${maker}を採用する。` +
        '接合部の耐力・剛性評価は公的試験評価書およびメーカー技術基準・許容耐力表に基づき、梁受接合部はピン接合としてモデル化し、スリット・ピン穴による断面欠損を考慮した有効断面にて部材検定を行う。';
    } else if (s.jointMethod === 'other_metal') {
      jointSentence =
        '軸組の主要な接合部にはプレカット金物工法を採用し、公的試験評価書およびメーカー技術資料に基づき耐力・断面欠損を評価する。';
    } else {
      jointSentence =
        '軸組の接合方法は、在来軸組工法によるほぞ・蟻掛け・鎌継ぎ等の継手・仕口を接合金物で補強する方式とし、耐力壁の柱頭・柱脚接合部は短期許容耐力時の応力を有効に伝達できる接合仕様とする。';
    }

    // 基礎・地盤・高基礎/深基礎文
    const foundTypeName = s.foundationType === 'strip' ? '鉄筋コンクリート造の布基礎' : '鉄筋コンクリート造のべた基礎';
    const surveyMap = {
      sws: 'スクリューウエイト貫入試験（SWS試験）',
      sws_sds: 'スクリューウエイト貫入試験（SWS試験）およびSDS試験',
      boring: '標準貫入試験（ボーリング調査）',
    };
    const improveMap = {
      none: '直接基礎として計画する。',
      column: '湿式柱状改良工法による地盤補強を実施した上で基礎を支持する。',
      surface: '表層改良工法による地盤補強を実施した上で基礎を支持する。',
      pile: '鋼管杭工法による地盤補強を実施した上で基礎を支持する。',
    };
    const highFoundMap = {
      none: '敷地は平坦であり、高基礎・深基礎・擁壁および地下室はない。',
      high: `敷地高低差等に対応するため一部を高基礎とする${s.highFoundNote ? `（${s.highFoundNote}）` : ''}。`,
      deep: `敷地高低差・根入れ確保のため一部を深基礎とする${s.highFoundNote ? `（${s.highFoundNote}）` : ''}。`,
      retaining: `片土圧を受ける基礎梁（高基礎・深基礎）を有する${s.highFoundNote ? `（${s.highFoundNote}）` : ''}ため、土圧による面外曲げ・ねじり・滑動について別途安全性を確認する。`,
    };
    const soilTypeLabel = `第${s.soilType}種地盤`;
    const bearingCap = s.bearingCap || '30.0';

    // 地震力 Co・Z・Zs
    const coMap = {
      '1': { val: '0.20', note: '標準せん断力係数 Co = 0.20（耐震等級1相当）' },
      '2': { val: '0.25', note: '標準せん断力係数 Co = 0.20 × 1.25 = 0.25（耐震等級2相当）' },
      '3': { val: '0.30', note: '標準せん断力係数 Co = 0.20 × 1.50 = 0.30（耐震等級3相当）' },
    };
    const coInfo = coMap[s.quakeGrade] || coMap['1'];
    let seismicLine =
      `地盤調査報告書より${soilTypeLabel}と判定し、設計用地震層せん断力は、昭和55年建設省告示第1793号に規定する略算式により一次固有周期 T、振動特性係数 Rt および高さ方向分布係数 Ai を求め、` +
      `地震地域係数 Z = ${s.zoneZ}、${coInfo.note}として算定する。`;
    if (s.shizuokaZs) {
      seismicLine +=
        '\n　また、静岡県における地震対策基準（静岡県建築基準条例・ガイドライン等）に基づき、地震地域係数の割増し（Zs = 1.2）を適用して設計用地震力を算定する。';
    }
    if (s.snowArea === 'heavy') {
      seismicLine +=
        '\n　なお、多雪区域に該当するため、長期積雪時および短期積雪・地震／風圧組合せ時の積雪荷重を適切に考慮する。';
    }

    // 層間変形角・偏心率・剛性率
    const driftStr = `層間変形角は 1/${s.driftLimit} 以下`;
    const eccStr = `偏心率は ${s.eccLimit} 以下`;
    const rigStr = isHiraya ? '' : '、剛性率は 0.60 以上';

    // 柱頭柱脚引張算定法
    const pulloutStr =
      s.pulloutMethod === 'detail'
        ? '柱頭・柱脚接合部の必要引張耐力は、詳細計算法（許容応力度設計）により算定し、使用する接合金物の短期許容引張耐力以下であることを確認する（検定比 1.0以下）。'
        : '柱頭・柱脚接合部の必要引張耐力は、N値計算法に準拠した算定法（標準計算法）により算定し、使用する接合金物の短期許容引張耐力以下であることを確認する（検定比 1.0以下）。';

    // 別紙計算書リスト
    const besshiList = [];
    if (s.besshiMerikomi) {
      besshiList.push('柱のめり込み補強検討：一貫構造計算（柱の設計）にてめり込み応力度が許容値を超える柱脚・柱頭部について、土台プレートⅡ等の高耐力座金設置や受材補強等により別紙計算書にて検定比1.0以下を確認する。');
    }
    if (s.besshiWindBeam) {
      besshiList.push('耐風梁の検定：吹抜け・高天井等で中間階床の水平支持を受けない独立柱・間柱およびそれを受ける耐風梁について、面外風圧力による曲げ・せん断・たわみの安全性を別紙計算書にて検証する。');
    }
    if (s.besshiJintsuko) {
      besshiList.push('基礎人通口（立上り開口部）の補強検討：基礎立ち上がり開口部の欠損に対し、開口下部の有効躯体断面およびスラブ内補強筋による長期・短期応力（曲げ・せん断）の安全性を別紙計算書にて検証する。');
    }
    if (s.besshiIrregSlab) {
      besshiList.push('不整形スラブの検定：矩形以外の多角形・不整形なべた基礎耐圧盤スラブについて、別紙計算書にて曲げモーメントおよび配筋の安全性を検証する。');
    }
    if (s.besshiCornerFound) {
      besshiList.push('基礎隅部の検定：入隅・出隅等の局部応力が集中する基礎隅部について、別紙計算書にて断面および配筋の安全性を検証する。');
    }
    if (s.besshiCantilever) {
      besshiList.push('片持ち基礎梁・片土圧基礎梁の検定：ポーチ部等の片持ち基礎梁や片土圧を受ける基礎梁について、別紙計算書にて長期・短期応力およびねじり・滑動の安全性を検証する。');
    }
    if (s.besshiOhbiki) {
      besshiList.push('大引の検定：1階床組の大引について、長期曲げ・せん断およびクリープ考慮たわみの安全性を別紙計算書にて検証する。');
    }
    if (s.horizDetailCalc) {
      besshiList.push(`水平構面の詳細計算：${s.horizDetailNote || '勾配屋根構面・床構面'}の許容せん断耐力算定書を別紙添付する。`);
    }
    if (s.besshiOther) {
      besshiList.push(s.besshiOther);
    }

    // ==================== テキスト組み立て ====================
    const out = [];

    out.push('【構造上の特徴】');
    out.push(`1. 本建築物は、高さ16m以下の${isMixedRc ? '混構造（1階RC造・上部木造軸組工法）' : '木造軸組工法'}による${storyText}の${usageText}である。`);
    out.push(`2. ${planSentence}`);
    out.push(`3. ${elevSentence}`);
    out.push(`4. ${jointSentence}`);
    out.push(`5. ${wallSentence}`);
    out.push(`6. ${horizSentence}`);
    out.push(`7. 基礎は${foundTypeName}とし、設計地耐力は長期 ${bearingCap} kN/㎡ とする。${improveMap[s.groundImprove] || ''}`);
    out.push(`8. ${highFoundMap[s.highFound] || highFoundMap.none}`);
    out.push('');

    out.push('【構造設計方針】');
    out.push('1. 適用する構造計算ルートおよび令第46条の省略について');
    out.push('　(1) X方向・Y方向ともに、建築基準法施行令第82条各号および令第82条の4に定める許容応力度計算（ルート1）により構造安全性を確認する。');
    out.push('　(2) 建築基準法施行令第46条第2項および昭和62年建設省告示第1899号（改正後）に基づき、許容応力度計算（ならびに層間変形角・偏心率・剛性率の確認）により構造耐力上の安全性を直接検証するため、令第46条第4項に規定する壁量計算（存在壁量・必要壁量の比較）および四分割法等の仕様規定の検討は省略する。');
    out.push(`　(3) 構造計算および各部の検定手法は、${graybookTitle}に準拠する。`);
    out.push('');

    out.push('2. 地盤および外力（地震力・風圧力・積雪荷重）の算定');
    out.push(`　(1) 地盤は、${surveyMap[s.soilSurvey] || surveyMap.sws}による地盤調査結果に基づき、平成13年国土交通省告示第1113号に規定する告示式等により地盤の許容応力度を算定する。`);
    out.push(`　(2) ${seismicLine}`);
    out.push('　(3) 風圧力は、建築基準法施行令第87条および平成12年建設省告示第1454号に基づき、建設地の基準風速 Vo および地表面粗度区分から速度圧 q および各部風圧力を算定する。');
    out.push('');

    if (isDetailed) {
      out.push('3. 各部構造計算および部材検定の具体的方法');
      out.push('　(1) 鉛直構面および水平構面の検定');
      out.push(`　　・鉛直構面は、各階・各方向（X・Y、正負加力）の地震力および風圧力に対し、剛性比例配分およびねじれ補正係数（Ce、Cw）を考慮した負担水平力が各通りの許容せん断耐力以下であることを確認する（検定比 1.0以下）。また、${driftStr}、${eccStr}${rigStr}であることを確認する。`);
      if (!isHiraya) {
        out.push('　　・梁上に載る耐力壁については、下部横架材の曲げたわみ（断面欠損低減後の有効断面二次モーメント Ie を考慮）に応じた有効せん断剛性および梁上低減係数を算定し反映する。');
      }
      out.push('　　・床組・小屋組の水平構面は検討を省略せず、連続梁モデルによる地震時・風圧時の許容せん断耐力検定、および水平構面外周部の横架材接合部の引張耐力検定を行う。');
      out.push('　(2) 柱の設計（座屈・風圧面外曲げ・めり込み）');
      out.push('　　・すべての柱について、有効細長比に応じた座屈基準強度 Fk を算定し、長期常時・短期積雪時および短期水平力作用時の圧縮座屈検定を行う。');
      out.push('　　・外周部の柱のうち検定方向に耐力壁が連続しない柱については、短期風圧時の面外曲げモーメントと長期軸力の組合せ応力検定を行う。');
      out.push('　　・通し柱を除く柱脚・柱頭部について、ほぞ欠損を控除した有効断面積により土台および横架材へのめり込み検定を行う。');
      out.push('　(3) 横架材（梁・桁）および二次部材の設計');
      out.push('　　・すべての梁・桁は単純梁モデルとし、長期常時・短期積雪時の曲げ・せん断および変形増大係数（長期2.0）を考慮したたわみ検定を行う。なお、算定断面は最小断面であり、施工上・振動等の配慮によりこれを下回らない範囲で断面寸法を調整する場合がある。');
      if (s.beamDeficit300) {
        out.push('　　・梁成300mm未満の横架材は標準的な一律断面欠損率を見込み、梁成300mm以上の横架材についてはプレカット加工および設備貫通孔等の実情に応じた個別の断面欠損率（Z・I低減率）を算出し実断面性能として反映させる。');
      }
      out.push('　　・垂木・母屋・棟木・根太等の二次部材について、長期・短期積雪時および軒先垂木の短期風圧時（吹き上げ・接合部引抜き）の検定を行う。');
      out.push('　(4) 接合部および基礎・地盤の設計');
      out.push(`　　・${pulloutStr}`);
      out.push('　　・基礎の検討は、長期接地圧に対する地盤の許容応力度検定、必要に応じた転倒モーメントによる短期接地圧検定、ならびにスラブ（べた基礎）および基礎梁に生じる長期・短期の曲げモーメント・せん断力に対する断面・配筋検定を行う。');
      if (s.omitSillBending) {
        out.push(`　　・土台の曲げおよびアンカーボルトの引張耐力については、${graybookTitle}に規定される省略適用条件をすべて満たすことを確認した上で詳細計算を省略し、アンカーボルトのせん断耐力検定を行う。`);
      } else {
        out.push('　　・アンカーボルトのせん断耐力・引張耐力および土台の曲げ耐力について所要の検定を行う。');
      }
    } else {
      // 標準版（簡潔版）
      out.push('3. 部材および基礎の断面検定');
      out.push(`　(1) 鉛直構面は剛性比例配分およびねじれ補正係数を考慮して地震力・風圧力に対する許容せん断耐力検定を行い、${driftStr}、${eccStr}${rigStr}を確認する。`);
      out.push('　(2) 水平構面は地震時・風圧時のせん断耐力検定および外周部横架材接合部の引張耐力検定を行う。');
      out.push('　(3) 柱は座屈・外周面外風圧曲げ・めり込み検定を行い、横架材・二次部材は単純梁モデルによる曲げ・せん断・たわみ検定を行う。');
      out.push(`　(4) ${pulloutStr}`);
      out.push('　(5) 基礎は地盤の許容応力度検定、スラブおよび基礎梁の長期・短期の曲げ・せん断検定を行う。');
      if (s.omitSillBending) {
        out.push('　(6) 土台の曲げおよびアンカーボルトの引張検討はグレー本に定める省略条件を満足することを確認し省略する（アンカーボルトせん断検定は実施）。');
      }
    }
    out.push('');

    if (besshiList.length > 0) {
      out.push('4. 別紙計算書（個別検討）による検定項目');
      besshiList.forEach((item, idx) => {
        out.push(`　(${idx + 1}) ${item}`);
      });
      out.push('');
    }

    out.push('【準拠法令・基準および参考文献】');
    out.push('1. 建築基準法（法第20条）・同法施行令（第3章 第1節〜第3節、第8節：令第82条各号・令第82条の4・令第82条の6ほか）および関係告示（令和7年4月施行 改正版）');
    out.push(`2. ${graybookTitle}`);
    out.push('3. 「2025年版 建築物の構造関係技術基準解説書」（国土交通省住宅局建築指導課 ほか監修）');
    out.push('4. 「木質構造設計規準・同解説」（一般社団法人 日本建築学会）');
    out.push('5. 「鉄筋コンクリート構造計算規準・同解説」（一般社団法人 日本建築学会）');
    out.push('6. 「小規模建築物基礎設計指針」（一般社団法人 日本建築学会）');
    if (s.jointMethod === 'tecone') {
      out.push('7. 「Tec-One P3 工法 技術資料／設計マニュアル・許容耐力表」（株式会社タツミ）および第三者性能評価書');
    }
    out.push('');
    out.push('【構造計算ルート】');
    out.push('■ 令第82条各号及び令第82条の4に定める構造計算（ルート1）');
    out.push('□ 許容応力度等計算（ルート2）');
    out.push('□ 保有水平耐力計算（ルート3）');

    return out.join('\n');
  }

  function renderPolicyText() {
    const state = collectFormState();
    const text = buildPolicyPlainText(state);
    const ta = $('policyOutputTextarea');
    if (ta) {
      ta.value = text;
    }
    const meta = $('policyOutputMeta');
    if (meta) {
      const lines = text.split('\n').length;
      meta.textContent = `${text.length} 文字 ／ ${lines} 行（プレーンテキスト）`;
    }
  }

  document.addEventListener('DOMContentLoaded', initPolicyTool);
})();
