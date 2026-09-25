/**
 * public/js/category_showcase.js
 * 
 * 有償ツール 5大カテゴリ横一列・コロコロ切り替えアニメーション ショーケース
 * - 枠1: 基礎・擁壁・地盤系 (8ツール) -> 4秒ごとにコロコロ切り替え
 * - 枠2: 木造軸組・接合部系 (5ツール) -> 4秒ごとにコロコロ切り替え
 * - 枠3: 水平構面・耐力壁系 (5ツール) -> 4秒ごとにコロコロ切り替え
 * - 枠4: WRC造パッケージ (5ツール) -> 4秒ごとにコロコロ切り替え
 * - 枠5: CAD連携・斜め壁Web-CAD (AZツール 1ツール) -> 切り替わらず固定ハイライト表示
 */

(function() {
  'use strict';

  // 5大カテゴリ定義
  const SHOWCASE_CATEGORIES = [
    {
      id: 'foundation',
      name: '基礎・擁壁・地盤系',
      badge: '全8ツール',
      icon: 'foundation',
      color: '#06b6d4',
      bgGradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)'
    },
    {
      id: 'timber',
      name: '木造軸組・接合部系',
      badge: '全7ツール',
      icon: 'carpenter',
      color: '#f59e0b',
      bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)'
    },
    {
      id: 'detail',
      name: '水平構面・耐力壁系',
      badge: '全10ツール',
      icon: 'view_quilt',
      color: '#10b981',
      bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)'
    },
    {
      id: 'wrc',
      name: 'WRC造パッケージ',
      badge: '全2ツール',
      icon: 'apartment',
      color: '#ec4899',
      bgGradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)'
    },
    {
      id: 'cad',
      name: 'CAD連携・斜め壁Web-CAD',
      badge: '1ツール特化',
      icon: 'architecture',
      color: '#8b5cf6',
      bgGradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(15, 23, 42, 0.95) 100%)',
      isStatic: true // 1つだけなので切り替わらない
    }
  ];

  // 各カテゴリの初期ツール・フォールバックデータ（ロード遅延時も即座にリッチ表示）
  const DEFAULT_CATEGORY_TOOLS = {
    foundation: [
      { id: 'jintsuko', title: '人通口補強計算', summary: 'スラブ内割増筋およびせん断力の検定。PDF計算書からの応力抽出に対応。', icon: 'construction' },
      { id: 'cantilever_foundation_beam', title: '片持ち基礎梁の検定 (柱あり)', summary: 'べた基礎ポーチ部など一部スラブ無しの片持ち基礎梁検定。上主筋・せん断耐力を算定。', icon: 'account_tree' },
      { id: 'cantilever_beam_no_column', title: '片持ち基礎梁 (柱なし) ＆ 片土圧検定', summary: 'バルコニー部等支点なし片持ち基礎梁の下主筋検定、および片土圧検定。', icon: 'foundation' },
      { id: 'youheki_L_calculator', title: 'L型擁壁 安定・断面計算', summary: '宅地造成・高低差のある敷地のL型RC擁壁計算。転倒・滑動・地耐力検定。', icon: 'fence' }
    ],
    timber: [
      { id: 'post_joint_calc', title: '柱頭柱脚金物算定 (N値計算)', summary: '告示1460号第2号・性能表示基準対応のN値・引き抜き力自動算定。金物選定。', icon: 'carpenter' },
      { id: 'timber_column_check', title: '柱座屈・長期短期許容応力度検定', summary: '通し柱・管柱の軸力・曲げ・座屈検討およびめり込み検定。', icon: 'view_column' },
      { id: 'cross_beam_calc', title: '梁受金物・横架材端部せん断検定', summary: '大梁・小梁の接合部せん断耐力およびボルト・ドリフトピン耐力検定。', icon: 'grid_view' }
    ],
    detail: [
      { id: 'horizontal_diaphragm_calc', title: '水平構面許容せん断耐力算定', summary: '合板・火打・床構面の倍率算定および存在応力に対する検定比チェック。', icon: 'view_quilt' },
      { id: 'shear_wall_calc', title: '耐力壁壁量・倍率・偏心率算定', summary: '耐力壁配置の充足率および剛心・重心・偏心率（0.15以下）の自動判定。', icon: 'domain' },
      { id: 'purlin_cantilever_calc', title: '登り梁・片持ち母屋断面算定', summary: '勾配屋根の曲げ・たわみ検定および軒先はね出し母屋の強度算定。', icon: 'roofing' }
    ],
    wrc: [
      { id: 'wrc_wall_quantity', title: 'WRC造 壁量・壁率自動算定', summary: '壁式鉄筋コンクリート造基準（令第49条）の壁厚・壁率・耐力壁判定。', icon: 'apartment' },
      { id: 'wrc_opening_reinforce', title: 'WRC造 開口部補強筋算定', summary: '壁開口周囲のスリット・斜め補強筋・縦横割増筋の自動断面算定。', icon: 'aspect_ratio' }
    ],
    cad: [
      { id: 'az_skew_wall', title: 'AZ斜め壁 Web-CAD', summary: 'アーキトレンド等で算定困難な斜め耐力壁・異形グリッドの壁量・剛心・偏心率をWeb-CAD上でリアルタイム自動算定。', icon: 'architecture', url: 'https://az.mdo3.com' }
    ]
  };

  let categoryToolsMap = {};
  let currentIndices = { foundation: 0, timber: 0, detail: 0, wrc: 0, cad: 0 };
  let autoFlipInterval = null;
  let isHovered = false;
  let isInitialized = false;

  function initShowcase() {
    const container = document.getElementById('categoryShowcaseGrid');
    if (!container) return;
    if (isInitialized) return;

    // 1. まずマスターデータから抽出を試みる
    const hasCatalog = typeof MDO3_TOOLS_CATALOG !== 'undefined' && Array.isArray(MDO3_TOOLS_CATALOG);

    SHOWCASE_CATEGORIES.forEach(cat => {
      if (cat.id === 'cad') {
        // AZツール単独特化
        let list = hasCatalog ? MDO3_TOOLS_CATALOG.filter(t => t.id === 'az_skew_wall') : [];
        if (list.length === 0) {
          list = DEFAULT_CATEGORY_TOOLS.cad;
        }
        categoryToolsMap[cat.id] = list;
      } else {
        let list = hasCatalog ? MDO3_TOOLS_CATALOG.filter(t => t.category === cat.id) : [];
        if (list.length === 0 && DEFAULT_CATEGORY_TOOLS[cat.id]) {
          list = DEFAULT_CATEGORY_TOOLS[cat.id];
        }
        categoryToolsMap[cat.id] = list;
      }
    });

    isInitialized = true;

    // 5枠のHTMLを構築
    renderShowcaseGrid(container);

    // 4秒ごとのコロコロ切り替えタイマー開始
    startAutoFlip();

    // ホバー時に自動回転一時停止
    container.addEventListener('mouseenter', () => { isHovered = true; });
    container.addEventListener('mouseleave', () => { isHovered = false; });
  }

  // 複数のライフサイクルで発火（万一の遅延ロードにも対応）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShowcase);
  } else {
    initShowcase();
  }
  window.addEventListener('load', () => {
    if (!isInitialized) initShowcase();
  });

  function renderShowcaseGrid(container) {
    container.innerHTML = SHOWCASE_CATEGORIES.map(cat => {
      const tools = categoryToolsMap[cat.id] || [];
      const toolCount = tools.length;
      const initialTool = tools[0] || { title: '準備中', summary: 'まもなく公開', icon: 'pending' };

      return `
        <div class="showcase-column" id="showcaseCol_${cat.id}" style="border-top: 3px solid ${cat.color};">
          <div class="showcase-col-header">
            <div class="showcase-cat-info">
              <span class="material-symbols-outlined" style="color: ${cat.color}; font-size: 20px;">${cat.icon}</span>
              <span class="showcase-cat-title">${cat.name}</span>
            </div>
            <span class="showcase-cat-badge" style="background: ${cat.color}22; color: ${cat.color}; border: 1px solid ${cat.color}44;">
              ${cat.isStatic ? '単独稼働' : `全${toolCount}ツール`}
            </span>
          </div>

          <!-- コロコロ切り替わるカード本体 -->
          <div class="showcase-card-wrapper" id="cardWrapper_${cat.id}">
            <div class="showcase-card-inner" id="cardInner_${cat.id}" onclick="window.openToolDetailFromShowcase('${cat.id}')">
              ${renderCardContent(initialTool, cat, 0, toolCount)}
            </div>
          </div>

          <!-- 下部コントローラー/インジケーター -->
          <div class="showcase-footer">
            ${cat.isStatic ? `
              <span class="showcase-static-pill">
                <span class="status-dot-pulse"></span> 単体独立稼働CAD
              </span>
              <a href="https://az.mdo3.com" target="_blank" class="showcase-btn-open" onclick="event.stopPropagation();">
                CAD起動 <span class="material-symbols-outlined" style="font-size:12px;">open_in_new</span>
              </a>
            ` : `
              <div class="showcase-indicators">
                <span class="showcase-counter" id="counter_${cat.id}">1 / ${toolCount}</span>
                <span class="showcase-auto-label">自動切替中</span>
              </div>
              <button type="button" class="showcase-next-btn" onclick="window.flipNextTool('${cat.id}'); event.stopPropagation();" title="次のツールへ">
                <span class="material-symbols-outlined" style="font-size:14px;">arrow_forward</span>
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderCardContent(tool, cat, idx, total) {
    return `
      <div class="showcase-tool-header">
        <div class="showcase-icon-box" style="background: ${cat.color}20; color: ${cat.color};">
          <span class="material-symbols-outlined">${tool.icon || 'calculate'}</span>
        </div>
        <div class="showcase-tool-meta">
          <span class="showcase-seq-tag">Tool #${idx + 1}</span>
          <span class="showcase-spec-tag">A4 1枚提出</span>
        </div>
      </div>

      <h4 class="showcase-tool-name">${tool.title}</h4>
      <p class="showcase-tool-desc">${tool.summary || '実務計算と判断基準の判定に対応。'}</p>

      <div class="showcase-action-row">
        <span class="showcase-view-link">
          判断基準を見る <span class="material-symbols-outlined" style="font-size:14px;">arrow_forward</span>
        </span>
        <span class="showcase-price-tag">月額¥980〜</span>
      </div>
    `;
  }

  function flipNext(catId) {
    const cat = SHOWCASE_CATEGORIES.find(c => c.id === catId);
    if (!cat || cat.isStatic) return;

    const tools = categoryToolsMap[catId] || [];
    if (tools.length <= 1) return;

    currentIndices[catId] = (currentIndices[catId] + 1) % tools.length;
    const nextTool = tools[currentIndices[catId]];

    const wrapper = document.getElementById(`cardWrapper_${catId}`);
    const inner = document.getElementById(`cardInner_${catId}`);
    const counter = document.getElementById(`counter_${catId}`);

    if (wrapper && inner) {
      // 3D フリップアニメーション
      inner.classList.add('flipping');
      setTimeout(() => {
        inner.innerHTML = renderCardContent(nextTool, cat, currentIndices[catId], tools.length);
        if (counter) counter.textContent = `${currentIndices[catId] + 1} / ${tools.length}`;
        inner.classList.remove('flipping');
      }, 300);
    }
  }

  function startAutoFlip() {
    if (autoFlipInterval) clearInterval(autoFlipInterval);

    // 4秒ごとに各列を少しずつ時間をずらしてコロコロ切り替え
    let step = 0;
    autoFlipInterval = setInterval(() => {
      if (isHovered) return;

      const dynamicCats = SHOWCASE_CATEGORIES.filter(c => !c.isStatic);
      const targetCat = dynamicCats[step % dynamicCats.length];
      if (targetCat) {
        flipNext(targetCat.id);
      }
      step++;
    }, 2200); // 2.2秒ごとにいずれかの列がコロッと回転（全体としてリズム良く動く）
  }

  // グローバル関数公開
  window.flipNextTool = function(catId) {
    flipNext(catId);
  };

  window.openToolDetailFromShowcase = function(catId) {
    const tools = categoryToolsMap[catId] || [];
    const currentIdx = currentIndices[catId] || 0;
    const tool = tools[currentIdx];

    if (!tool) return;

    if (catId === 'cad' || tool.id === 'az_skew_wall') {
      window.open('https://az.mdo3.com', '_blank');
      return;
    }

    // 既存の portal.js の openToolDetailModal を呼び出し
    if (typeof window.openToolDetailModal === 'function') {
      window.openToolDetailModal(tool.id);
    } else {
      // 下のカタログまでスムーズスクロール
      const targetCard = document.getElementById(`toolCard_${tool.id}`);
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetCard.classList.add('highlight-pulse');
        setTimeout(() => targetCard.classList.remove('highlight-pulse'), 2000);
      } else {
        const catSection = document.getElementById('toolsCatalog');
        if (catSection) catSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

})();
