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
      id: 'timber_joint',
      name: '木造軸組・接合部系',
      badge: '全5ツール',
      icon: 'carpenter',
      color: '#f59e0b',
      bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)'
    },
    {
      id: 'wall_diaphragm',
      name: '水平構面・耐力壁系',
      badge: '全5ツール',
      icon: 'view_quilt',
      color: '#10b981',
      bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)'
    },
    {
      id: 'wrc_package',
      name: 'WRC造パッケージ',
      badge: '全5ツール',
      icon: 'apartment',
      color: '#ec4899',
      bgGradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)'
    },
    {
      id: 'cad_az',
      name: 'CAD連携・斜め壁Web-CAD',
      badge: '1ツール特化',
      icon: 'architecture',
      color: '#8b5cf6',
      bgGradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(15, 23, 42, 0.95) 100%)',
      isStatic: true // 1つだけなので切り替わらない
    }
  ];

  let categoryToolsMap = {};
  let currentIndices = { foundation: 0, timber_joint: 0, wall_diaphragm: 0, wrc_package: 0, cad_az: 0 };
  let autoFlipInterval = null;
  let isHovered = false;

  document.addEventListener('DOMContentLoaded', () => {
    initShowcase();
  });

  function initShowcase() {
    const container = document.getElementById('categoryShowcaseGrid');
    if (!container) return;

    if (typeof MDO3_TOOLS_CATALOG === 'undefined' || !Array.isArray(MDO3_TOOLS_CATALOG)) {
      console.warn('MDO3_TOOLS_CATALOG is not ready for showcase');
      return;
    }

    // カテゴリごとにツールを分類
    SHOWCASE_CATEGORIES.forEach(cat => {
      categoryToolsMap[cat.id] = MDO3_TOOLS_CATALOG.filter(t => t.category === cat.id);
    });

    // 5枠のHTMLを構築
    renderShowcaseGrid(container);

    // 4秒ごとのコロコロ切り替えタイマー開始
    startAutoFlip();

    // ホバー時に自動回転一時停止
    container.addEventListener('mouseenter', () => { isHovered = true; });
    container.addEventListener('mouseleave', () => { isHovered = false; });
  }

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
              ${cat.isStatic ? '常時稼働' : cat.badge}
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

    if (catId === 'cad_az' || tool.id === 'az_skew_wall') {
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
