/**
 * public/js/workspace.js
 * 
 * mdo3.com 案件統合コンソール (Project Workspace) エンジン
 * - 元のツール構成・画面・計算書印刷を100%保持したままiframe統合
 * - 上部ヘッダーに大きく案件名・設計者名、地域定数 (Z, V0, S) を常時表示
 * - ツール切り替えタブバーで即座に下部iframeを切り替え
 * - 上部で入力された案件名・設計者名を各ツールに自動転記連動
 */

(function() {
  'use strict';

  // 統合ツール定義 (元のツールHTMLパスを完全連携)
  const WORKSPACE_TOOLS = [
    {
      id: "zi",
      name: "① Z低減係数",
      category: "wood",
      frequent: true,
      icon: "public",
      url: "/app/tools/zi.html",
      desc: "横架材のZ低減係数算定 (告示1793号)",
      planGroup: ["core_pack", "all"]
    },
    {
      id: "merikomi",
      name: "② めり込み補強",
      category: "wood",
      frequent: true,
      icon: "hardware",
      url: "/app/tools/merikomi.html",
      desc: "柱脚・土台・梁交差部のめり込み応力度算定 & 補強金物検定",
      planGroup: ["core_pack", "all"]
    },
    {
      id: "jintsuko",
      name: "③ 人通口補強計算",
      category: "foundation",
      frequent: true,
      icon: "construction",
      url: "/app/tools/jintsuko.html",
      desc: "基礎梁立上がり開口・耐圧盤欠損補強 & スラブ内割増筋検定",
      planGroup: ["core_pack", "single_jintsuko", "all"]
    },
    {
      id: "yanejika_kihon",
      name: "④ 基本の屋根構面 (直貼り)",
      category: "horizontal",
      frequent: true,
      icon: "roofing",
      url: "/app/tools/shosai-yanejikabari-kihon.html",
      desc: "野地板合板直貼りの屋根倍率・許容せん断耐力算定 (告示1541号)",
      planGroup: ["core_pack", "all"]
    },
    {
      id: "taruki_kihon",
      name: "⑤ 基本の屋根構面 (垂木)",
      category: "horizontal",
      frequent: true,
      icon: "roofing",
      url: "/app/tools/shosai-tarukiyane-kihon.html",
      desc: "垂木＋構造用合板屋根の倍率算定 (告示1541号)",
      planGroup: ["core_pack", "all"]
    },
    {
      id: "hasira_mage",
      name: "⑥ 柱の曲げ計算",
      category: "wood",
      frequent: true,
      icon: "view_column",
      url: "/app/tools/hasira-mage.html",
      desc: "外壁柱・吹抜通し柱の風圧力曲げ応力検定 (V0自動連動)",
      planGroup: ["all"]
    },
    {
      id: "cantilever_foundation_beam",
      name: "⑦ 片持ち基礎梁 (柱あり)",
      category: "foundation",
      frequent: true,
      icon: "account_tree",
      url: "/app/tools/cantilever_foundation_beam.html",
      desc: "べた基礎ポーチ部等の片持ち梁・長期短期上主筋検定",
      planGroup: ["all"]
    },
    {
      id: "cantilever_beam_no_column",
      name: "⑧ 片持ち基礎梁 (柱なし/片土圧)",
      category: "foundation",
      frequent: false,
      icon: "foundation",
      url: "/app/tools/cantilever_beam_no_column.html",
      desc: "柱なし片持ち基礎梁の下主筋検定 & 片土圧検定",
      planGroup: ["all"]
    },
    {
      id: "yuka_kihon",
      name: "⑨ 基本の床構面",
      category: "horizontal",
      frequent: false,
      icon: "grid_view",
      url: "/app/tools/shosai-yuka-kihon.html",
      desc: "根太レス剛床・合板床構面の床倍率算定 (告示1541号)",
      planGroup: ["all"]
    },
    {
      id: "foundation_beam_horizontal",
      name: "⑩ 基礎梁水平力 (KBI)",
      category: "foundation",
      frequent: false,
      icon: "straighten",
      url: "/app/tools/foundation_beam_horizontal.html",
      desc: "基礎梁水平力追加計算書 (KBI審査対応)",
      planGroup: ["all"]
    },
    {
      id: "youheki_calculator",
      name: "⑪ 擁壁計算 (逆L/逆T)",
      category: "foundation",
      frequent: false,
      icon: "terrain",
      url: "/app/tools/youheki_calculator.html",
      desc: "逆L型・逆T型擁壁の転倒・滑動・支持力検定",
      planGroup: ["all"]
    },
    {
      id: "youheki_L_calculator",
      name: "⑫ L型擁壁 (2m未満)",
      category: "foundation",
      frequent: false,
      icon: "terrain",
      url: "/app/tools/youheki_L_calculator.html",
      desc: "L型擁壁の構造計算",
      planGroup: ["all"]
    },
    {
      id: "wrc_simulator",
      name: "⑬ WRC造 壁量解析",
      category: "wrc",
      frequent: false,
      icon: "apartment",
      url: "/app/tools/wrc_simulator.html",
      desc: "壁式RC造の必要壁量・壁厚・長期短期応力解析",
      planGroup: ["all"]
    },
    {
      id: "dosha_saigai",
      name: "⑭ 土砂災害特別警戒区域",
      category: "foundation",
      frequent: false,
      icon: "warning",
      url: "/app/tools/dosha_saigai.html",
      desc: "土砂災害警戒区域における木造外壁・RC基礎構造計算",
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

  // iframe インスタンスキャッシュ
  const loadedIframes = {};

  document.addEventListener('DOMContentLoaded', () => {
    initWorkspace();
  });

  function initWorkspace() {
    loadProjectFromStorage();
    setupUrlParams();
    renderNavTabs();
    setupEventListeners();
    updateProjectHeaderUI();
    
    // 初回ツールをiframeで表示
    switchTool(activeToolId);
  }

  // URLパラメータ (?tool=jintsuko 等) の処理
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

  // iframeによる元ツールの完全表示切り替え
  function switchTool(toolId) {
    activeToolId = toolId;
    renderNavTabs();

    const tool = WORKSPACE_TOOLS.find(t => t.id === toolId);
    if (!tool) return;

    const viewport = document.getElementById('wsToolViewport');
    if (!viewport) return;

    // 全iframeを一旦非表示
    document.querySelectorAll('.ws-tool-iframe').forEach(iframe => {
      iframe.classList.remove('active');
    });

    let iframe = loadedIframes[toolId];
    if (!iframe) {
      // ローディングインジケーター表示
      showLoading(true);

      // iframeを新設
      iframe = document.createElement('iframe');
      iframe.className = 'ws-tool-iframe active';
      iframe.id = `iframe_${toolId}`;
      iframe.src = tool.url;

      // ロード完了時に案件データをiframe内に自動注入
      iframe.addEventListener('load', () => {
        showLoading(false);
        injectProjectDataIntoIframe(iframe);
      });

      viewport.appendChild(iframe);
      loadedIframes[toolId] = iframe;
    } else {
      iframe.classList.add('active');
      injectProjectDataIntoIframe(iframe);
    }
  }

  // 案件名・設計者名・地域定数をiframe内部の入力欄に自動転記
  function injectProjectDataIntoIframe(iframe) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      // 物件名入力欄の探索と反映
      const nameInputs = doc.querySelectorAll('input[name*="project"], input[id*="project"], input[placeholder*="物件名"], input[name*="bukken"], input[id*="bukken"]');
      nameInputs.forEach(inp => {
        if (!inp.value || inp.value === '川越市 S様邸 新築工事') {
          inp.value = currentProject.name;
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // 設計者名入力欄の探索と反映
      const designerInputs = doc.querySelectorAll('input[name*="designer"], input[id*="designer"], input[placeholder*="設計"], input[name*="author"], input[id*="author"]');
      designerInputs.forEach(inp => {
        if (!inp.value || inp.value === '一級建築士事務所 mdo3') {
          inp.value = currentProject.designer;
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // Z係数入力欄
      const zInputs = doc.querySelectorAll('input[name*="z_coeff"], input[id*="z_coeff"], input[name="Z"], input[id="valZ"]');
      zInputs.forEach(inp => {
        inp.value = currentProject.z;
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // 基準風速 V0 入力欄
      const v0Inputs = doc.querySelectorAll('input[name*="v0"], input[id*="v0"], input[name="V0"], input[id="valV0"]');
      v0Inputs.forEach(inp => {
        inp.value = currentProject.v0;
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      });

    } catch (e) {
      // 同一オリジンでない場合などはスキップ
      console.warn('Iframe injection note:', e);
    }
  }

  function showLoading(show) {
    const el = document.getElementById('wsIframeLoading');
    if (el) {
      el.style.display = show ? 'flex' : 'none';
    }
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
    const inputName = document.getElementById('inputProjNameLarge');
    const inputDesigner = document.getElementById('inputProjDesignerLarge');
    const inputAddr = document.getElementById('inputProjAddress');

    if (inputName) inputName.value = currentProject.name;
    if (inputDesigner) inputDesigner.value = currentProject.designer;
    if (inputAddr) inputAddr.value = currentProject.address;

    // 常時表示バッジバーの反映
    const sumZ = document.getElementById('sumValZ');
    const sumV0 = document.getElementById('sumValV0');
    const sumS = document.getElementById('sumValS');
    const sumFreeze = document.getElementById('sumValFreeze');
    const sumEnergy = document.getElementById('sumValEnergy');

    if (sumZ) sumZ.textContent = currentProject.zs ? `1.0 (Zs=1.2)` : `${currentProject.z}`;
    if (sumV0) sumV0.textContent = `${currentProject.v0} m/s`;
    if (sumS) sumS.textContent = `${currentProject.snowDepth} cm`;
    if (sumFreeze) sumFreeze.textContent = `${currentProject.freezeDepth}`;
    if (sumEnergy) sumEnergy.textContent = `${currentProject.energyRegion}地域 (${currentProject.solarRegion})`;

    // 現在表示中のiframe内にも再注入
    const currentIframe = loadedIframes[activeToolId];
    if (currentIframe) {
      injectProjectDataIntoIframe(currentIframe);
    }
  }

  function setupEventListeners() {
    // 案件名（大きく）・設計者名（大きく）の変更イベント
    const inputName = document.getElementById('inputProjNameLarge');
    if (inputName) {
      inputName.addEventListener('input', () => {
        currentProject.name = inputName.value;
        saveProjectToStorage();
        updateProjectHeaderUI();
      });
    }

    const inputDesigner = document.getElementById('inputProjDesignerLarge');
    if (inputDesigner) {
      inputDesigner.addEventListener('input', () => {
        currentProject.designer = inputDesigner.value;
        saveProjectToStorage();
        updateProjectHeaderUI();
      });
    }

    // 建設地住所の変更 (地域定数の自動同期)
    const inputAddr = document.getElementById('inputProjAddress');
    const btnSyncRegional = document.getElementById('btnSyncRegional');
    if (btnSyncRegional && inputAddr) {
      btnSyncRegional.addEventListener('click', async () => {
        const addr = inputAddr.value.trim();
        if (!addr) return;
        btnSyncRegional.disabled = true;
        btnSyncRegional.innerHTML = `<span class="material-symbols-outlined" style="font-size:13px; animation:spin 1s infinite;">sync</span> 算定中...`;
        
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
            showWsToast(`建設地「${addr}」の地域定数 (Z=${res.z}, V0=${res.v0}m/s) を全ツールに同期しました！`);
          }
        } catch (err) {
          console.error(err);
        } finally {
          btnSyncRegional.disabled = false;
          btnSyncRegional.innerHTML = `<span class="material-symbols-outlined" style="font-size:13px;">sync</span> 同期`;
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
