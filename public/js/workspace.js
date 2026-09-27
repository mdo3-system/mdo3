/**
 * public/js/workspace.js
 * 
 * mdo3.com 案件統合コンソール (Project Workspace) エンジン
 * - 元のツール構成・画面・計算書印刷を100%保持したままiframe統合
 * - 上部ヘッダー: 建設地 & 地域定数 (Z, V0, S, 凍結, 省エネ) を常時表示
 * - 最頻出ツール (Z係数, めり込み, 人通口, 基本屋根) は常時ダイレクトボタン
 * - その他全ツールは「カテゴリ別プルタブ (ドロップダウン形式)」でスマートに集約
 * - 釘配列諸定数 & 任意配列詳細構面ツール (2in1) の完全動作対応
 */

(function() {
  'use strict';

  // 全ツール体系定義
  const WORKSPACE_TOOLS = [
    // --- 最頻出ツール ---
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

    // --- 基礎・擁壁系 ---
    {
      id: "cantilever_foundation_beam",
      name: "片持ち基礎梁 (柱あり)",
      category: "foundation",
      frequent: false,
      icon: "account_tree",
      url: "/app/tools/cantilever_foundation_beam.html",
      desc: "べた基礎ポーチ部等の片持ち梁・長期短期上主筋検定",
      planGroup: ["all"]
    },
    {
      id: "cantilever_beam_no_column",
      name: "片持ち基礎梁 (柱なし/片土圧)",
      category: "foundation",
      frequent: false,
      icon: "foundation",
      url: "/app/tools/cantilever_beam_no_column.html",
      desc: "柱なし片持ち基礎梁の下主筋検定 & 片土圧検定",
      planGroup: ["all"]
    },
    {
      id: "foundation_beam_horizontal",
      name: "基礎梁水平力追加計算書 (KBI)",
      category: "foundation",
      frequent: false,
      icon: "straighten",
      url: "/app/tools/foundation_beam_horizontal.html",
      desc: "基礎梁水平力追加計算書 (KBI審査対応)",
      planGroup: ["all"]
    },
    {
      id: "youheki_calculator",
      name: "逆L型・逆T型擁壁の計算",
      category: "foundation",
      frequent: false,
      icon: "terrain",
      url: "/app/tools/youheki_calculator.html",
      desc: "逆L型・逆T型擁壁の転倒・滑動・支持力検定",
      planGroup: ["all"]
    },
    {
      id: "youheki_L_calculator",
      name: "L型擁壁の計算 (2.0m未満)",
      category: "foundation",
      frequent: false,
      icon: "terrain",
      url: "/app/tools/youheki_L_calculator.html",
      desc: "L型擁壁の構造計算",
      planGroup: ["all"]
    },
    {
      id: "dosha_saigai",
      name: "土砂災害特別警戒区域の外壁等",
      category: "foundation",
      frequent: false,
      icon: "warning",
      url: "/app/tools/dosha_saigai.html",
      desc: "土砂災害警戒区域における木造外壁・RC基礎構造計算",
      planGroup: ["all"]
    },
    {
      id: "balanced_rebar_ratio",
      name: "スラブ釣り合い鉄筋比の計算",
      category: "foundation",
      frequent: false,
      icon: "grid_on",
      url: "/app/tools/balanced_rebar_ratio.html",
      desc: "耐圧盤・スラブの釣り合い鉄筋比算定",
      planGroup: ["all"]
    },

    // --- 木造軸組・接合部系 ---
    {
      id: "hasira_mage",
      name: "柱の曲げ計算 (V0連動)",
      category: "wood",
      frequent: false,
      icon: "view_column",
      url: "/app/tools/hasira-mage.html",
      desc: "外壁柱・吹抜通し柱の風圧力曲げ応力検定",
      planGroup: ["all"]
    },
    {
      id: "hariue",
      name: "梁上耐力壁の剛性低減",
      category: "wood",
      frequent: false,
      icon: "call_split",
      url: "/app/tools/hariue.html",
      desc: "梁上に配置された耐力壁の剛性低減係数算定",
      planGroup: ["all"]
    },
    {
      id: "hashigo",
      name: "はしご垂木 計算",
      category: "wood",
      frequent: false,
      icon: "reorder",
      url: "/app/tools/hashigo.html",
      desc: "けらばはしご垂木の曲げ・たわみ検定",
      planGroup: ["all"]
    },
    {
      id: "rigid_frame_R",
      name: "片持ち庇の検討",
      category: "wood",
      frequent: false,
      icon: "balcony",
      url: "/app/tools/rigid_frame_R.html",
      desc: "木造片持ち庇・バルコニーの曲げモーメント算定",
      planGroup: ["all"]
    },
    {
      id: "roof_calc",
      name: "屋根葺き材等の検討",
      category: "wood",
      frequent: false,
      icon: "roofing",
      url: "/app/tools/roof_calc.html",
      desc: "屋根ふき材の風圧力・固定釘の引抜耐力検討",
      planGroup: ["all"]
    },

    // --- 水平構面・耐力壁 (任意配列・2in1連動セット) ---
    {
      id: "kugi",
      name: "⑧ 釘配列諸定数 (共通コアエンジン)",
      category: "horizontal",
      frequent: false,
      icon: "hub",
      url: "/app/tools/kugihairetsushoteisu.html",
      desc: "任意配列構面の前提となる外周・中通り釘ピッチ・釘耐力諸定数算定",
      planGroup: ["all"]
    },
    {
      id: "shosai_tarukiyane",
      name: "垂木・屋根構面 (任意配列)",
      category: "horizontal",
      frequent: false,
      icon: "sync_alt",
      url: "/app/tools/shosai-tarukiyane.html",
      desc: "⑧釘配列連動: 垂木留め釘の任意ピッチ・倍率算定",
      planGroup: ["all"]
    },
    {
      id: "shosai_yanejikabari",
      name: "屋根直貼り構面 (任意配列)",
      category: "horizontal",
      frequent: false,
      icon: "sync_alt",
      url: "/app/tools/shosai-yanejikabari.html",
      desc: "⑧釘配列連動: 野地板直貼りの任意ピッチ倍率算定",
      planGroup: ["all"]
    },
    {
      id: "shosai_yuka",
      name: "床構面 (任意配列)",
      category: "horizontal",
      frequent: false,
      icon: "sync_alt",
      url: "/app/tools/shosai-yuka.html",
      desc: "⑧釘配列連動: 床合板の任意ピッチ剛床倍率算定",
      planGroup: ["all"]
    },
    {
      id: "shosai_okabe",
      name: "面材張り大壁 (任意配列)",
      category: "horizontal",
      frequent: false,
      icon: "sync_alt",
      url: "/app/tools/shosai-okabe.html",
      desc: "⑧釘配列連動: 大壁耐力壁の許容せん断耐力・壁倍率算定",
      planGroup: ["all"]
    },
    {
      id: "shosai_shinkabe",
      name: "面材張り真壁 (任意配列)",
      category: "horizontal",
      frequent: false,
      icon: "sync_alt",
      url: "/app/tools/shosai-shinkabe.html",
      desc: "⑧釘配列連動: 真壁耐力壁の許容せん断耐力・壁倍率算定",
      planGroup: ["all"]
    },
    {
      id: "yuka_kihon",
      name: "基本の床構面 (合板床・告示)",
      category: "horizontal",
      frequent: false,
      icon: "grid_view",
      url: "/app/tools/shosai-yuka-kihon.html",
      desc: "根太レス剛床・合板床構面の床倍率算定 (告示1541号)",
      planGroup: ["all"]
    },
    {
      id: "neta",
      name: "根太床構面の検討",
      category: "horizontal",
      frequent: false,
      icon: "table_rows",
      url: "/app/tools/neta.html",
      desc: "根太あり床構面の許容せん断耐力検定",
      planGroup: ["all"]
    },

    // --- RC・WRC造 ---
    {
      id: "wrc_simulator",
      name: "WRC造 壁量解析シミュレーター",
      category: "wrc",
      frequent: false,
      icon: "apartment",
      url: "/app/tools/wrc_simulator.html",
      desc: "壁式RC造の必要壁量・壁厚・偏心率解析",
      planGroup: ["all"]
    },
    {
      id: "wrc_axial_force",
      name: "WRC造 柱・壁の長期軸力算定",
      category: "wrc",
      frequent: false,
      icon: "density_medium",
      url: "/app/tools/wrc_axial_force.html",
      desc: "壁式RC造の各階壁軸力・長期応力算定",
      planGroup: ["all"]
    }
  ];

  // 案件状態
  let currentProject = {
    address: "埼玉県川越市幸町",
    z: 1.0,
    zs: null,
    v0: 32,
    snowDepth: 30,
    freezeDepth: "指定なし",
    energyRegion: 6,
    solarRegion: "A4",
    // ★ ユーザー登録型 都市計画・法令指定情報
    urbanPlanning: {
      zone: "第一種住居地域",
      fire: "準防火地域",
      kenpei: "60%",
      youseki: "200%",
      heightControl: "第2種高度地区",
      districtPlan: ""
    }
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
    renderNavBar();
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

  // ★ 上部ナビゲーションバーのレンダリング (最頻出ボタン ＋ カテゴリ別プルタブ形式)
  function renderNavBar() {
    const navbar = document.getElementById('wsToolsNavbar');
    if (!navbar) return;

    // 1. 最頻出ツール (独立クイックボタン群)
    const frequentTools = WORKSPACE_TOOLS.filter(t => t.frequent);
    const frequentHtml = `
      <div class="ws-frequent-group">
        ${frequentTools.map(tool => {
          const isSubscribed = checkSubscription(tool.id);
          const isActive = tool.id === activeToolId;
          const classes = [
            'ws-tool-tab-btn',
            isActive ? 'active' : '',
            isSubscribed ? 'subscribed' : 'locked'
          ].filter(Boolean).join(' ');

          return `
            <button type="button" class="${classes}" data-tool="${tool.id}" onclick="window.onSelectToolTab('${tool.id}')">
              <span class="material-symbols-outlined tab-status-icon">${isSubscribed ? tool.icon : 'lock'}</span>
              <span>${tool.name}</span>
              ${!isSubscribed ? '<span class="material-symbols-outlined tab-lock-badge">lock</span>' : ''}
            </button>
          `;
        }).join('')}
      </div>
    `;

    // 2. カテゴリ別プルタブ (ドロップダウン)
    const categories = [
      { id: 'foundation', name: '基礎・擁壁系', icon: 'foundation' },
      { id: 'wood', name: '木造軸組系', icon: 'view_column' },
      { id: 'horizontal', name: '水平構面・2in1任意配列', icon: 'sync_alt' },
      { id: 'wrc', name: 'RC・WRC造', icon: 'apartment' }
    ];

    const dropdownsHtml = categories.map(cat => {
      const catTools = WORKSPACE_TOOLS.filter(t => !t.frequent && t.category === cat.id);
      if (catTools.length === 0) return '';

      const isCurrentCatActive = catTools.some(t => t.id === activeToolId);
      const activeToolInCat = catTools.find(t => t.id === activeToolId);
      const labelText = activeToolInCat ? `${cat.name}: ${activeToolInCat.name}` : `${cat.name} (${catTools.length})`;

      return `
        <div class="ws-dropdown ${isCurrentCatActive ? 'has-active' : ''}" id="dropdown_${cat.id}">
          <button type="button" class="ws-dropdown-btn ${isCurrentCatActive ? 'active' : ''}" onclick="window.toggleDropdown('${cat.id}')">
            <span class="material-symbols-outlined" style="font-size:15px; color:var(--ws-cyan);">${cat.icon}</span>
            <span>${labelText}</span>
            <span class="material-symbols-outlined" style="font-size:14px;">arrow_drop_down</span>
          </button>
          <div class="ws-dropdown-menu">
            ${catTools.map(tool => {
              const isSubscribed = checkSubscription(tool.id);
              const isActive = tool.id === activeToolId;
              const classes = [
                'ws-dropdown-item',
                isActive ? 'active' : '',
                isSubscribed ? 'subscribed' : 'locked'
              ].filter(Boolean).join(' ');

              return `
                <button type="button" class="${classes}" onclick="window.onSelectToolTab('${tool.id}'); window.closeAllDropdowns();">
                  <span style="display:flex; align-items:center; gap:6px;">
                    <span class="material-symbols-outlined" style="font-size:14px;">${isSubscribed ? tool.icon : 'lock'}</span>
                    <span>${tool.name}</span>
                  </span>
                  ${!isSubscribed ? '<span class="material-symbols-outlined" style="font-size:13px; color:#f59e0b;">lock</span>' : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    navbar.innerHTML = frequentHtml + dropdownsHtml;
  }

  // ドロップダウン開閉制御
  window.toggleDropdown = function(catId) {
    const target = document.getElementById(`dropdown_${catId}`);
    const wasActive = target ? target.classList.contains('active') : false;
    window.closeAllDropdowns();
    if (target && !wasActive) {
      target.classList.add('active');
    }
  };

  window.closeAllDropdowns = function() {
    document.querySelectorAll('.ws-dropdown').forEach(d => d.classList.remove('active'));
  };

  // ドロップダウン外クリックで閉じる
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.ws-dropdown')) {
      window.closeAllDropdowns();
    }
  });

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
    renderNavBar();

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
      showLoading(true);

      iframe = document.createElement('iframe');
      iframe.className = 'ws-tool-iframe active';
      iframe.id = `iframe_${toolId}`;
      iframe.src = tool.url;

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

  // 建設地・地域定数をiframe内部の入力欄に自動転記
  function injectProjectDataIntoIframe(iframe) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

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
    renderNavBar();
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
    const inputAddr = document.getElementById('inputProjAddress');
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

    // ★ 都市計画バッジの反映
    const sumUrban = document.getElementById('sumValUrban');
    if (sumUrban) {
      if (currentProject.urbanPlanning) {
        const u = currentProject.urbanPlanning;
        const shortZone = u.zone ? u.zone.replace('専用地域', '').replace('地域', '') : '未登録';
        const shortFire = u.fire ? u.fire.replace('地域', '').replace('区域', '') : '';
        const kp = u.kenpei ? u.kenpei.replace('%', '') : '';
        const yk = u.youseki ? u.youseki.replace('%', '') : '';
        sumUrban.textContent = `${shortZone}・${shortFire} (${kp}/${yk})`;
      } else {
        sumUrban.textContent = '未登録 (クリック登録)';
      }
    }

    const currentIframe = loadedIframes[activeToolId];
    if (currentIframe) {
      injectProjectDataIntoIframe(currentIframe);
    }
  }

  // ★ 都市計画モーダルの制御
  function openUrbanModal() {
    const modal = document.getElementById('wsUrbanModal');
    if (!modal) return;

    // 現在のプロジェクトデータをフォームにセット
    const u = currentProject.urbanPlanning || {};
    const selZone = document.getElementById('selUrbanZone');
    const selFire = document.getElementById('selUrbanFire');
    const selKenpei = document.getElementById('selUrbanKenpei');
    const selYouseki = document.getElementById('selUrbanYouseki');
    const inputHeight = document.getElementById('inputUrbanHeight');
    const inputDistrict = document.getElementById('inputUrbanDistrict');

    if (selZone && u.zone) selZone.value = u.zone;
    if (selFire && u.fire) selFire.value = u.fire;
    if (selKenpei && u.kenpei) selKenpei.value = u.kenpei;
    if (selYouseki && u.youseki) selYouseki.value = u.youseki;
    if (inputHeight && typeof u.heightControl !== 'undefined') inputHeight.value = u.heightControl;
    if (inputDistrict && typeof u.districtPlan !== 'undefined') inputDistrict.value = u.districtPlan;

    // 建設地住所に応じた公式WebGISリンクの自動更新
    const btnUrbanOpenGis = document.getElementById('btnUrbanOpenGis');
    const urbanGisGuideTitle = document.getElementById('urbanGisGuideTitle');
    const urbanGisGuideSub = document.getElementById('urbanGisGuideSub');
    const addr = currentProject.address || '';

    let gisInfo = null;
    if (typeof getCityPlanningInfo === 'function') {
      gisInfo = getCityPlanningInfo(null, null, addr, null, null);
    }

    if (gisInfo && gisInfo.localGis && btnUrbanOpenGis) {
      btnUrbanOpenGis.href = gisInfo.localGis.url;
      if (urbanGisGuideTitle) {
        urbanGisGuideTitle.textContent = `🏛️ ${gisInfo.localGis.name}`;
      }
      if (urbanGisGuideSub) {
        urbanGisGuideSub.textContent = gisInfo.localGis.isOfficial 
          ? '公式WebGISを開いて用途地域・防火・高度地区をピンポイント確認'
          : '公開都市計画マップ検索を開いて指定状況を確認';
      }
    } else if (btnUrbanOpenGis) {
      btnUrbanOpenGis.href = `https://www.google.com/search?q=${encodeURIComponent(addr + ' 都市計画情報 用途地域 WebGIS')}`;
      if (urbanGisGuideTitle) urbanGisGuideTitle.textContent = '🏛️ 自治体公開都市計画マップ検索';
    }

    modal.style.display = 'flex';
  }

  function closeUrbanModal() {
    const modal = document.getElementById('wsUrbanModal');
    if (modal) modal.style.display = 'none';
  }

  function saveUrbanModal() {
    const selZone = document.getElementById('selUrbanZone');
    const selFire = document.getElementById('selUrbanFire');
    const selKenpei = document.getElementById('selUrbanKenpei');
    const selYouseki = document.getElementById('selUrbanYouseki');
    const inputHeight = document.getElementById('inputUrbanHeight');
    const inputDistrict = document.getElementById('inputUrbanDistrict');

    currentProject.urbanPlanning = {
      zone: selZone ? selZone.value : '第一種住居地域',
      fire: selFire ? selFire.value : '準防火地域',
      kenpei: selKenpei ? selKenpei.value : '60%',
      youseki: selYouseki ? selYouseki.value : '200%',
      heightControl: inputHeight ? inputHeight.value.trim() : '',
      districtPlan: inputDistrict ? inputDistrict.value.trim() : ''
    };

    saveProjectToStorage();
    updateProjectHeaderUI();
    closeUrbanModal();

    const shortZone = currentProject.urbanPlanning.zone.replace('専用地域', '').replace('地域', '');
    const shortFire = currentProject.urbanPlanning.fire.replace('地域', '').replace('区域', '');
    showWsToast(`都市計画情報（${shortZone}・${shortFire}）を登録・案件に反映しました！`);
  }

  function setupEventListeners() {
    // 都市計画モーダル開閉・保存
    const btnOpenUrbanModal = document.getElementById('btnOpenUrbanModal');
    const btnCloseUrbanModal = document.getElementById('btnCloseUrbanModal');
    const btnCancelUrbanModal = document.getElementById('btnCancelUrbanModal');
    const btnSaveUrbanModal = document.getElementById('btnSaveUrbanModal');

    if (btnOpenUrbanModal) btnOpenUrbanModal.addEventListener('click', openUrbanModal);
    if (btnCloseUrbanModal) btnCloseUrbanModal.addEventListener('click', closeUrbanModal);
    if (btnCancelUrbanModal) btnCancelUrbanModal.addEventListener('click', closeUrbanModal);
    if (btnSaveUrbanModal) btnSaveUrbanModal.addEventListener('click', saveUrbanModal);

    // 建設地住所の変更 (地域定数の自動同期)
    const inputAddr = document.getElementById('inputProjAddress');
    const btnSyncRegional = document.getElementById('btnSyncRegional');
    if (btnSyncRegional && inputAddr) {
      btnSyncRegional.addEventListener('click', async () => {
        const addr = inputAddr.value.trim();
        if (!addr) return;
        btnSyncRegional.disabled = true;
        btnSyncRegional.innerHTML = `<span class="material-symbols-outlined" style="font-size:12px; animation:spin 1s infinite;">sync</span>`;
        
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
            
            const gisNote = (res.cityPlanning && res.cityPlanning.localGis) 
              ? `【都市計画: ${res.cityPlanning.localGis.name}】` 
              : '';
            showWsToast(`建設地「${addr}」の地域定数を同期しました！${gisNote}`);
          }
        } catch (err) {
          console.error(err);
        } finally {
          btnSyncRegional.disabled = false;
          btnSyncRegional.innerHTML = `<span class="material-symbols-outlined" style="font-size:12px;">sync</span> 同期`;
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
        padding: 10px 18px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 0.82rem;
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
