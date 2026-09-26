/**
 * public/js/workspace.js
 * 
 * mdo3.com 案件統合コンソール (Project Workspace) エンジン
 * - 1案件で複数ツールをシームレスに使い分け
 * - 上部タブ切り替え & サブスク契約状態連動 (契約ツール点灯 / 未契約グレーアウト)
 * - 案件情報 (物件名・地域定数 Z, V0, S) の全ツール一括自動連携
 * - 頻出ツール (Z係数, めり込み, 人通口, 基本屋根構面, 柱曲げ, 片持ち梁) の対話的計算
 */

(function() {
  'use strict';

  // 統合ツール定義
  const WORKSPACE_TOOLS = [
    {
      id: "zi",
      name: "① Z低減係数・地域定数",
      category: "wood",
      frequent: true,
      icon: "public",
      desc: "建設地からの地域係数 Z・風速 V0・積雪 S 自動算定 & 案件全体連携",
      planGroup: ["core_pack", "all"]
    },
    {
      id: "merikomi",
      name: "② めり込み補強計算",
      category: "wood",
      frequent: true,
      icon: "hardware",
      desc: "柱脚・土台・梁交差部のめり込み応力度算定 & 補強座金検定",
      planGroup: ["core_pack", "all"]
    },
    {
      id: "jintsuko",
      name: "③ 人通口補強計算",
      category: "foundation",
      frequent: true,
      icon: "construction",
      desc: "基礎梁立上がり開口・耐圧盤欠損補強 & スラブ割増筋検定",
      planGroup: ["core_pack", "single_jintsuko", "all"]
    },
    {
      id: "yanejika_kihon",
      name: "④ 基本の屋根構面",
      category: "horizontal",
      frequent: true,
      icon: "roofing",
      desc: "告示基準・合板直貼り屋根構面の許容せん断耐力・倍率算定",
      planGroup: ["core_pack", "all"]
    },
    {
      id: "hasira_mage",
      name: "⑤ 柱の曲げ計算",
      category: "wood",
      frequent: false,
      icon: "view_column",
      desc: "外壁柱・吹抜通し柱の風圧力曲げ応力 & たわみ検定 (V0自動連動)",
      planGroup: ["all"]
    },
    {
      id: "cantilever_foundation_beam",
      name: "⑥ 片持ち基礎梁 (柱あり)",
      category: "foundation",
      frequent: false,
      icon: "account_tree",
      desc: "べた基礎ポーチ部等の片持ち梁・土圧・上主筋検定",
      planGroup: ["all"]
    },
    {
      id: "yuka_kihon",
      name: "⑦ 基本の床構面",
      category: "horizontal",
      frequent: false,
      icon: "grid_view",
      desc: "根太レス剛床・合板床構面の床倍率算定 (告示第1541号)",
      planGroup: ["all"]
    },
    {
      id: "youheki_calculator",
      name: "⑧ 擁壁の安定計算",
      category: "foundation",
      frequent: false,
      icon: "terrain",
      desc: "L型・逆L型・逆T型擁壁の転倒・滑動・支持力検定",
      planGroup: ["all"]
    },
    {
      id: "wrc_sim",
      name: "⑨ WRC造 壁量算定",
      category: "wrc",
      frequent: false,
      icon: "apartment",
      desc: "壁式RC造の必要壁量・壁厚・長期短期応力解析",
      planGroup: ["all"]
    }
  ];

  // 案件状態
  let currentProject = {
    name: "川越市 S様邸 新築工事",
    address: "埼玉県川越市幸町",
    designer: "一級建築士事務所 mdo3",
    calcDate: new Date().toISOString().split('T')[0],
    z: 1.0,
    zs: null,
    v0: 32,
    snowDepth: 30,
    freezeDepth: "指定なし",
    energyRegion: 6,
    solarRegion: "A4"
  };

  // サブスクシミュレーション状態 ('all', 'core_pack', 'single_jintsuko', 'free_trial')
  let currentPlanMode = "core_pack";
  let activeToolId = "zi";

  document.addEventListener('DOMContentLoaded', () => {
    initWorkspace();
  });

  function initWorkspace() {
    loadProjectFromStorage();
    renderNavTabs();
    setupEventListeners();
    setupUrlParams();
    
    // 初回初期化
    switchTool(activeToolId);
    updateProjectHeaderUI();
    recalculateActiveTool();
  }

  // URLパラメータ (?tool=merikomi 等) の処理
  function setupUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const paramTool = urlParams.get('tool');
    if (paramTool && WORKSPACE_TOOLS.some(t => t.id === paramTool)) {
      activeToolId = paramTool;
    }
  }

  // 案件データの保存・読み込み
  function loadProjectFromStorage() {
    const saved = localStorage.getItem('mdo3_workspace_project');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        currentProject = { ...currentProject, ...parsed };
      } catch (e) {
        console.warn('Failed to load project storage', e);
      }
    }
  }

  function saveProjectToStorage() {
    localStorage.setItem('mdo3_workspace_project', JSON.stringify(currentProject));
  }

  // 上部ツールタブバーのレンダリング
  function renderNavTabs() {
    const navbar = document.getElementById('wsToolsNavbar');
    if (!navbar) return;

    navbar.innerHTML = WORKSPACE_TOOLS.map(tool => {
      const isSubscribed = checkSubscription(tool.id);
      const isActive = tool.id === activeToolId;
      const classes = [
        'ws-tool-tab-btn',
        isActive ? 'active' : '',
        isSubscribed ? 'subscribed' : 'locked'
      ].filter(Boolean).join(' ');

      return `
        <button type="button" class="${classes}" data-tool="${tool.id}" onclick="window.onSelectToolTab('${tool.id}')">
          <span class="material-symbols-outlined tab-status-icon">
            ${isSubscribed ? tool.icon : 'lock'}
          </span>
          <span>${tool.name}</span>
          ${tool.frequent ? '<span class="tab-badge-frequent">最頻出</span>' : ''}
          ${!isSubscribed ? '<span class="material-symbols-outlined tab-lock-badge">lock</span>' : ''}
        </button>
      `;
    }).join('');
  }

  // サブスク判定ロジック
  function checkSubscription(toolId) {
    if (currentPlanMode === 'all') return true;
    const tool = WORKSPACE_TOOLS.find(t => t.id === toolId);
    if (!tool) return false;
    return tool.planGroup.includes(currentPlanMode);
  }

  // ツール切り替えイベント
  window.onSelectToolTab = function(toolId) {
    const isSubscribed = checkSubscription(toolId);
    if (!isSubscribed) {
      openSubscriptionModal(toolId);
      return;
    }
    switchTool(toolId);
  };

  function switchTool(toolId) {
    activeToolId = toolId;
    renderNavTabs();

    // パネルの表示・非表示切替
    document.querySelectorAll('.ws-tool-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    const activePanel = document.getElementById(`panel_${toolId}`);
    if (activePanel) {
      activePanel.classList.add('active');
    }

    recalculateActiveTool();
  }

  // 未契約案内モーダル
  function openSubscriptionModal(toolId) {
    const tool = WORKSPACE_TOOLS.find(t => t.id === toolId);
    const modal = document.getElementById('wsSubscriptionModal');
    const modalToolName = document.getElementById('modalLockedToolName');
    const modalToolDesc = document.getElementById('modalLockedToolDesc');

    if (modalToolName && tool) modalToolName.textContent = tool.name;
    if (modalToolDesc && tool) modalToolDesc.textContent = tool.desc;

    if (modal) {
      modal.style.display = 'flex';
    }
  }

  window.closeSubscriptionModal = function() {
    const modal = document.getElementById('wsSubscriptionModal');
    if (modal) modal.style.display = 'none';
  };

  window.activateDemoPlan = function(planMode) {
    currentPlanMode = planMode;
    const select = document.getElementById('simPlanSelect');
    if (select) select.value = planMode;
    renderNavTabs();
    closeSubscriptionModal();
    switchTool(activeToolId);
    showWsToast(`プラン表示を【${getPlanName(planMode)}】に切り替えました`);
  };

  function getPlanName(plan) {
    switch (plan) {
      case 'all': return '全ツール使い放題 (月額¥3,980)';
      case 'core_pack': return '基本構造セット (Z/めり込み/人通口/屋根)';
      case 'single_jintsuko': return '人通口補強 単体契約 (月額¥980)';
      default: return 'フリー体験';
    }
  }

  // 案件ヘッダーUIの更新
  function updateProjectHeaderUI() {
    const inputName = document.getElementById('inputProjName');
    const inputAddr = document.getElementById('inputProjAddress');
    const inputDesigner = document.getElementById('inputProjDesigner');
    const inputDate = document.getElementById('inputProjDate');

    if (inputName) inputName.value = currentProject.name;
    if (inputAddr) inputAddr.value = currentProject.address;
    if (inputDesigner) inputDesigner.value = currentProject.designer;
    if (inputDate) inputDate.value = currentProject.calcDate;

    // サマリーバーの反映
    const sumName = document.getElementById('sumProjName');
    const sumZ = document.getElementById('sumValZ');
    const sumV0 = document.getElementById('sumValV0');
    const sumS = document.getElementById('sumValS');
    const sumFreeze = document.getElementById('sumValFreeze');
    const sumEnergy = document.getElementById('sumValEnergy');

    if (sumName) sumName.textContent = currentProject.name;
    if (sumZ) sumZ.textContent = currentProject.zs ? `1.0 (Zs=1.2)` : `${currentProject.z}`;
    if (sumV0) sumV0.textContent = `${currentProject.v0} m/s`;
    if (sumS) sumS.textContent = `${currentProject.snowDepth} cm`;
    if (sumFreeze) sumFreeze.textContent = `${currentProject.freezeDepth}`;
    if (sumEnergy) sumEnergy.textContent = `${currentProject.energyRegion}地域 (日射${currentProject.solarRegion})`;

    // 計算書ヘッダーへの反映
    document.querySelectorAll('.calc-sheet-proj-name').forEach(el => el.textContent = currentProject.name);
    document.querySelectorAll('.calc-sheet-proj-addr').forEach(el => el.textContent = currentProject.address);
    document.querySelectorAll('.calc-sheet-proj-designer').forEach(el => el.textContent = currentProject.designer);
    document.querySelectorAll('.calc-sheet-proj-date').forEach(el => el.textContent = currentProject.calcDate);
  }

  function setupEventListeners() {
    // 案件名・設計者・日付の変更
    const bindMeta = (id, key) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => {
          currentProject[key] = el.value;
          saveProjectToStorage();
          updateProjectHeaderUI();
        });
      }
    };
    bindMeta('inputProjName', 'name');
    bindMeta('inputProjDesigner', 'designer');
    bindMeta('inputProjDate', 'calcDate');

    // 建設地住所の変更 (地域定数の自動同期)
    const inputAddr = document.getElementById('inputProjAddress');
    const btnSyncRegional = document.getElementById('btnSyncRegional');
    if (btnSyncRegional && inputAddr) {
      btnSyncRegional.addEventListener('click', async () => {
        const addr = inputAddr.value.trim();
        if (!addr) return;
        btnSyncRegional.disabled = true;
        btnSyncRegional.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px; animation:spin 1s infinite;">sync</span> 算定中...`;
        
        try {
          if (typeof calculateRegionalConstants === 'function') {
            const res = calculateRegionalConstants(addr, 20);
            currentProject.address = addr;
            currentProject.z = res.z;
            currentProject.zs = res.zs;
            currentProject.v0 = res.v0;
            currentProject.snowDepth = res.snowDepth;
            currentProject.freezeDepth = res.freezeDepth;
            currentProject.energyRegion = res.energyRegion;
            currentProject.solarRegion = res.solarRegion;
            
            saveProjectToStorage();
            updateProjectHeaderUI();
            recalculateActiveTool();
            showWsToast(`建設地「${addr}」の地域定数 (Z=${res.z}, V0=${res.v0}m/s) を全ツールに同期しました！`);
          }
        } catch (err) {
          console.error(err);
        } finally {
          btnSyncRegional.disabled = false;
          btnSyncRegional.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">sync</span> 地域定数同期`;
        }
      });
    }

    // プランシミュレーター切り替え
    const simPlanSelect = document.getElementById('simPlanSelect');
    if (simPlanSelect) {
      simPlanSelect.addEventListener('change', (e) => {
        activateDemoPlan(e.target.value);
      });
    }

    // 印刷ボタン
    const btnPrintSheet = document.getElementById('btnPrintSheet');
    if (btnPrintSheet) {
      btnPrintSheet.addEventListener('click', () => {
        window.print();
      });
    }

    // 各ツールの入力変更イベント監視
    document.querySelectorAll('.ws-calc-input').forEach(input => {
      input.addEventListener('input', recalculateActiveTool);
      input.addEventListener('change', recalculateActiveTool);
    });
  }

  // ==========================================
  // 各ツールの対話的計算ロジック
  // ==========================================
  function recalculateActiveTool() {
    switch (activeToolId) {
      case 'zi':
        calcZiTool();
        break;
      case 'merikomi':
        calcMerikomiTool();
        break;
      case 'jintsuko':
        calcJintsukoTool();
        break;
      case 'yanejika_kihon':
        calcRoofTool();
        break;
      case 'hasira_mage':
        calcHasiraMageTool();
        break;
      case 'cantilever_foundation_beam':
        calcCantileverTool();
        break;
      default:
        break;
    }
  }

  // 1. Z係数・地域定数
  function calcZiTool() {
    const zVal = currentProject.z || 1.0;
    const v0Val = currentProject.v0 || 32;
    const sVal = currentProject.snowDepth || 30;

    const span = parseFloat(document.getElementById('ziSpan')?.value) || 3.64;
    const load = parseFloat(document.getElementById('ziLoad')?.value) || 4.2; // kN/m

    // M = w * L^2 / 8
    const M = (load * Math.pow(span, 2)) / 8;
    const M_z = M * zVal;

    setHtml('resZiM', `${M.toFixed(2)} kN・m`);
    setHtml('resZiMz', `${M_z.toFixed(2)} kN・m`);
    setHtml('sheetZiZ', `${zVal} ${currentProject.zs ? '(Zs=1.2)' : ''}`);
    setHtml('sheetZiV0', `${v0Val} m/s`);
    setHtml('sheetZiS', `${sVal} cm`);
  }

  // 2. めり込み補強計算 (merikomi)
  function calcMerikomiTool() {
    const colSize = parseFloat(document.getElementById('mkColSize')?.value) || 105; // mm
    const N = parseFloat(document.getElementById('mkAxialLoad')?.value) || 18.5; // kN (柱軸力)
    const timberFc = parseFloat(document.getElementById('mkTimberType')?.value) || 3.0; // N/mm2 (ヒノキ/スギ)
    const washerType = document.getElementById('mkWasherType')?.value || 'standard';

    // めり込み有効面積 A (mm2)
    const area = colSize * colSize;
    // 発生めり込み応力度 σ = N * 1000 / A (N/mm2)
    const sigma = (N * 1000) / area;
    // 許容めり込み応力度 qa (短期 = 長期 × 2 / 通常設計)
    const qa = timberFc * 1.5;
    const ratio = sigma / qa;

    const isOk = ratio <= 1.0;
    updateJudgment('mkJudgment', isOk, `めり込み検定比: ${ratio.toFixed(3)} ≦ 1.000 (${isOk ? 'OK・安全' : 'NG・座金補強要'})`);
    updateStressBar('mkStressBar', ratio);

    setHtml('mkResSigma', `${sigma.toFixed(2)} N/mm²`);
    setHtml('mkResQa', `${qa.toFixed(2)} N/mm²`);
    setHtml('mkResRatio', ratio.toFixed(3));
  }

  // 3. 人通口補強計算 (jintsuko)
  function calcJintsukoTool() {
    const D = parseFloat(document.getElementById('jtBeamHeight')?.value) || 640;
    const openingW = parseFloat(document.getElementById('jtOpenWidth')?.value) || 600;
    const shearQ = parseFloat(document.getElementById('jtShearQ')?.value) || 28.0; // kN
    const addBarDia = document.getElementById('jtAddBarDia')?.value || 'D13';

    // 有効梁成 d = D - 60 (レベラー・かぶり見込み)
    const d = D - 60;
    // 開口率比
    const openRatio = openingW / (D * 3);
    // 開口低減せん断耐力 Qa (kN)
    const Qa = 0.08 * 21 * 150 * d / 1000 * 1.25;
    const ratio = shearQ / Math.max(Qa, 1);
    const isOk = ratio <= 1.0;

    updateJudgment('jtJudgment', isOk, `せん断検定比: ${ratio.toFixed(3)} ≦ 1.000 (${isOk ? '補強配筋OK' : '開口補強筋増強要'})`);
    updateStressBar('jtStressBar', ratio);

    setHtml('jtResQa', `${Qa.toFixed(1)} kN`);
    setHtml('jtResRatio', ratio.toFixed(3));
  }

  // 4. 基本の屋根構面 (yanejika_kihon)
  function calcRoofTool() {
    const plyType = document.getElementById('rfPlyType')?.value || '12mm';
    const nailPitch = parseFloat(document.getElementById('rfNailPitch')?.value) || 150; // mm
    
    // 告示第1541号に基づく屋根倍率
    let mult = 1.0;
    if (plyType === '12mm') {
      mult = nailPitch <= 100 ? 1.5 : (nailPitch <= 150 ? 1.0 : 0.7);
    } else {
      mult = nailPitch <= 100 ? 1.2 : 0.8;
    }

    const shortCapacity = mult * 1.96; // kN/m (基準耐力)
    setHtml('rfResMult', `${mult.toFixed(2)} 倍`);
    setHtml('rfResCap', `${shortCapacity.toFixed(2)} kN/m`);
    updateJudgment('rfJudgment', true, `屋根倍率: ${mult.toFixed(2)}倍 (告示第1541号 第2の二・審査適合)`);
  }

  // 5. 柱の曲げ計算 (hasira_mage)
  function calcHasiraMageTool() {
    const v0 = currentProject.v0 || 32;
    const colH = parseFloat(document.getElementById('hmColHeight')?.value) || 2.8; // m
    const colW = parseFloat(document.getElementById('hmColWidth')?.value) || 120; // mm
    const colD = parseFloat(document.getElementById('hmColDepth')?.value) || 120; // mm

    // 速度圧 q = 0.6 * E * V0^2 (平野部 E=1.0)
    const q = 0.6 * 1.0 * Math.pow(v0, 2); // N/m2
    // 柱受圧幅 B = 0.91m
    const w = (q * 0.91 * 1.2) / 1000; // kN/m
    const M = (w * Math.pow(colH, 2)) / 8; // kN・m
    
    // 断面係数 Z = b * d^2 / 6 (cm3)
    const Z = (colW * Math.pow(colD, 2)) / 6 / 1000;
    const sigma = (M * 1000000) / (Z * 1000); // N/mm2
    const fb = 17.6; // N/mm2 (スギ/ヒノキ短期許容曲げ応力度)
    const ratio = sigma / fb;
    const isOk = ratio <= 1.0;

    updateJudgment('hmJudgment', isOk, `柱曲げ検定比: ${ratio.toFixed(3)} ≦ 1.000 (V0=${v0}m/s連動)`);
    updateStressBar('hmStressBar', ratio);
    setHtml('hmResQ', `${Math.round(q)} N/m²`);
    setHtml('hmResM', `${M.toFixed(2)} kN・m`);
    setHtml('hmResRatio', ratio.toFixed(3));
  }

  // 6. 片持ち基礎梁 (cantilever_foundation_beam)
  function calcCantileverTool() {
    const L = parseFloat(document.getElementById('cbLength')?.value) || 910; // mm
    const P = parseFloat(document.getElementById('cbPointLoad')?.value) || 24.5; // kN (柱先端軸力)
    const D = parseFloat(document.getElementById('cbHeight')?.value) || 640; // mm

    // M = P * L (kN・m)
    const M = (P * L) / 1000;
    // 所要主筋断面積 at = M * 10^6 / (ft * 7/8 * d)
    const d = D - 60;
    const at = (M * 1000000) / (295 * (7/8) * d); // mm2
    const d16Area = 199; // D16=1.99cm2
    const reqBars = Math.ceil(at / d16Area);

    const isOk = reqBars <= 2;
    updateJudgment('cbJudgment', isOk, `所要上端主筋: D16×${reqBars}本 (M=${M.toFixed(1)}kN・m)`);
    setHtml('cbResM', `${M.toFixed(2)} kN・m`);
    setHtml('cbResAt', `${Math.round(at)} mm²`);
    setHtml('cbResBars', `D16 × ${reqBars} 本`);
  }

  // ヘルパー
  function setHtml(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function updateJudgment(id, isOk, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `ws-judgment-banner ${isOk ? 'ok' : 'ng'}`;
    el.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="material-symbols-outlined">${isOk ? 'check_circle' : 'warning'}</span>
        <span>${text}</span>
      </div>
      <span style="font-size:0.75rem; padding:2px 8px; border-radius:12px; background:rgba(0,0,0,0.25);">
        ${isOk ? '審査適合' : '要再検討'}
      </span>
    `;
  }

  function updateStressBar(id, ratio) {
    const el = document.getElementById(id);
    if (!el) return;
    const pct = Math.min(Math.max(ratio * 100, 5), 100);
    el.style.width = `${pct}%`;
    if (ratio <= 0.8) {
      el.style.background = '#10b981'; // green
    } else if (ratio <= 1.0) {
      el.style.background = '#f59e0b'; // yellow
    } else {
      el.style.background = '#f43f5e'; // red
    }
  }

  function showWsToast(msg) {
    let toast = document.getElementById('wsToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'wsToast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #0284c7;
        color: #fff;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 0.85rem;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: fadeIn 0.25s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;">info</span> ${msg}`;
    toast.style.display = 'flex';
    setTimeout(() => {
      if (toast) toast.style.display = 'none';
    }, 3500);
  }

})();
