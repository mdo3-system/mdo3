/**
 * public/js/portal.js
 * 
 * mdo3.com 基幹ポータル インタラクティブUIロジック
 * - ツール一覧動的レンダリング
 * - カテゴリフィルタ & キーワード検索
 * - 判断基準モーダル (何ができて何ができないか)
 * - SSOセッションチェック & ログインステータス表示
 * - Stripe Checkout 決済連携
 * - WRC造 Google APIキーモーダル制御
 * - 地域定数＆省エネ基準 自動検索・地図連動
 */

// ==========================================
// Google APIキー保存ヘルパー & グローバルモーダル制御
// (インラインonclickや外部からの即時呼出しを100%保証するため最上位で定義)
// ==========================================
const API_KEY_STORAGE_KEY = 'mdo3_google_api_key';

function getStoredApiKey() {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  } catch (e) {
    return '';
  }
}

function setStoredApiKey(key) {
  try {
    if (!key) {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    } else {
      localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
    }
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }
}

window.openApiKeyModal = function() {
  const modal = document.getElementById('googleApiKeyModal');
  if (modal) {
    modal.style.setProperty('display', 'flex', 'important');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  if (typeof updateApiKeyStatusUI === 'function') {
    updateApiKeyStatusUI();
  } else {
    const key = getStoredApiKey();
    const input = document.getElementById('inputGoogleApiKey');
    if (input && key) input.value = key;
  }
};

window.closeApiKeyModal = function() {
  const modal = document.getElementById('googleApiKeyModal');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
};

// グローバルイベント委任: どんな動的HTMLからでも確実にモーダルを開く
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-open-api-modal], .badge-api-key, .btn-open-api-modal, .open-wrc-api-modal');
  if (trigger) {
    e.preventDefault();
    e.stopPropagation();
    window.openApiKeyModal();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const toolsContainer = document.getElementById('toolsContainer');
  const searchInput = document.getElementById('toolSearchInput');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const modalOverlay = document.getElementById('criteriaModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalBody = document.getElementById('modalBody');

  let currentCategory = 'all';
  let searchQuery = '';

  // 1. ツールカードHTML生成ヘルパー
  function createToolCardHtml(tool) {
    const isNailSet = tool.linkedNailSet === true;
    const isCoreEngine = tool.isCoreNailEngine === true;
    const isWrc = tool.category === 'wrc';
    const hasApiKey = isWrc && Boolean(getStoredApiKey());
    const isAz = tool.id === 'az_skew_wall';
    const isFreeTool = tool.isFree === true;

    let cardExtraClass = '';
    if (isNailSet) cardExtraClass = 'tool-card-nail-set';
    if (isCoreEngine) cardExtraClass = 'tool-card-core-engine';
    if (isAz) cardExtraClass = 'tool-card-az-pro';
    if (isFreeTool) cardExtraClass = 'tool-card-free-tool';

    let priceBadgeText = '月額 ¥980 (税込)';
    if (tool.priceText) {
      priceBadgeText = tool.priceText;
    } else if (isNailSet) {
      priceBadgeText = 'セット利用: 月額 ¥980';
    }

    return `
      <div class="tool-card ${cardExtraClass}" data-id="${tool.id}">
        <div class="card-top">
          <div class="card-icon" style="${isAz ? 'background:rgba(91,138,254,0.15); color:#60a5fa;' : (isFreeTool ? 'background:rgba(16,185,129,0.15); color:var(--accent-green);' : '')}">
            <span class="material-symbols-outlined">${tool.icon || 'construction'}</span>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
            ${tool.badgeLabel ? `
              <span class="badge-custom-tag" style="background:${isFreeTool ? 'rgba(16,185,129,0.15)' : 'rgba(91,138,254,0.15)'}; color:${isFreeTool ? 'var(--accent-green)' : '#60a5fa'}; border:1px solid ${isFreeTool ? 'rgba(16,185,129,0.35)' : 'rgba(91,138,254,0.35)'}; font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:12px;">
                ${isFreeTool ? '🎁 完全無償' : '📐 CAD連携'}
              </span>
            ` : ''}
            ${isNailSet ? `
              <span class="badge-nail-sync" title="任意配列の前提となる⑧釘配列諸定数との連動セット">
                <span class="material-symbols-outlined" style="font-size:12px;">sync_alt</span> ⑧釘配列 連携セット (2in1)
              </span>
            ` : ''}
            ${isCoreEngine ? `
              <span class="badge-core-engine" title="任意配列の全構面計算の基盤となる計算エンジン">
                <span class="material-symbols-outlined" style="font-size:12px;">hub</span> 任意配列 共通コアエンジン
              </span>
            ` : ''}
            ${isWrc ? `
              <button type="button" class="badge-api-key ${hasApiKey ? 'set' : 'unset'} btn-open-api-modal" onclick="openApiKeyModal()" title="Google APIキーの設定状態">
                <span class="material-symbols-outlined" style="font-size:12px;">${hasApiKey ? 'check_circle' : 'key'}</span>
                ${hasApiKey ? 'Google APIキー設定済' : 'APIキー設定が必要'}
              </button>
            ` : ''}
            <span class="card-category">${tool.categoryName}</span>
          </div>
        </div>
        
        <h3 class="card-title">${tool.title}</h3>
        <p class="card-desc">${tool.summary}</p>

        <!-- 釘配列連動セット（2in1）のワークフローステップ表示 -->
        ${isNailSet ? `
          <div class="nail-set-flow-box">
            <div class="flow-header">
              <span class="material-symbols-outlined" style="font-size:14px; color:var(--accent-gold);">schema</span>
              <span>連動セット ワークフロー (2in1):</span>
            </div>
            <div class="flow-steps">
              <div class="flow-step">
                <span class="step-badge">STEP 1</span>
                <span>⑧ 釘配列諸定数（外周・中通り釘ピッチ・釘耐力）</span>
              </div>
              <span class="material-symbols-outlined flow-arrow">arrow_downward</span>
              <div class="flow-step highlight">
                <span class="step-badge">STEP 2</span>
                <span>対象構面（許容せん断耐力・剛性・倍率算定）</span>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- 判断基準プレビュー枠 -->
        <div class="card-criteria-box">
          <div class="criteria-item">
            <span class="material-symbols-outlined criteria-icon-ok">check_circle</span>
            <span><strong>できること:</strong> ${tool.canDo[0]}</span>
          </div>
          <div class="criteria-item">
            <span class="material-symbols-outlined criteria-icon-ng">cancel</span>
            <span><strong>対象外:</strong> ${tool.cannotDo[0]}</span>
          </div>
        </div>

        <div class="card-footer">
          <span class="card-price-badge" style="${isAz ? 'border-color:rgba(245,158,11,0.4); color:var(--accent-gold); font-weight:700;' : (isFreeTool ? 'border-color:rgba(16,185,129,0.4); color:var(--accent-green); font-weight:700;' : '')}">${priceBadgeText}</span>
          <div class="card-actions">
            ${isFreeTool ? `
              <a href="${tool.manualUrl}" target="_blank" class="btn btn-ghost btn-sm">
                <span class="material-symbols-outlined" style="font-size:16px;">menu_book</span> マニュアル
              </a>
              <a href="${tool.url}" target="_blank" class="btn btn-primary btn-sm" style="background:var(--accent-green); border-color:var(--accent-green); color:#06140e; font-weight:700;">
                今すぐ作成 (無料) <span class="material-symbols-outlined" style="font-size:16px;">launch</span>
              </a>
            ` : isAz ? `
              <button type="button" class="btn btn-ghost btn-sm" onclick="openCriteriaModal('${tool.id}')">
                <span class="material-symbols-outlined" style="font-size:16px;">info</span> 判断基準
              </button>
              <button type="button" class="btn btn-gold btn-sm" onclick="startCheckout('az_monthly', 'az')">
                契約 (¥5,980/月)
              </button>
              <a href="${tool.url}" target="_blank" class="btn btn-primary btn-sm">
                CAD起動 <span class="material-symbols-outlined" style="font-size:16px;">launch</span>
              </a>
            ` : `
              <button type="button" class="btn btn-ghost btn-sm" onclick="openCriteriaModal('${tool.id}')">
                <span class="material-symbols-outlined" style="font-size:16px;">info</span> 判断基準
              </button>
              ${isWrc ? `
                <button type="button" class="btn btn-ghost btn-sm btn-open-api-modal" onclick="openApiKeyModal()" title="Google APIキー設定 ＆ 取得ガイド">
                  <span class="material-symbols-outlined" style="font-size:16px; color:var(--accent-gold);">key</span> API設定
                </button>
              ` : ''}
              ${isWrc && !hasApiKey ? `
                <button type="button" class="btn btn-primary btn-sm btn-open-api-modal" onclick="openApiKeyModal()">
                  起動 (要キー設定) <span class="material-symbols-outlined" style="font-size:16px;">key</span>
                </button>
              ` : `
                <a href="${tool.url}" target="_blank" class="btn btn-primary btn-sm">
                  ${isNailSet ? 'セット起動' : '開く'} <span class="material-symbols-outlined" style="font-size:16px;">launch</span>
                </a>
              `}
            `}
          </div>
        </div>
      </div>
    `;
  }

  // 2. ツールカタログ描画関数 (水平構面の2ブロック化 ＆ ⑧釘配列＋*セット対応)
  function renderTools() {
    if (!toolsContainer) return;

    const filtered = MDO3_TOOLS_CATALOG.filter(tool => {
      const matchCategory = currentCategory === 'all' || tool.category === currentCategory;
      const matchSearch = searchQuery === '' || 
        tool.title.toLowerCase().includes(searchQuery) ||
        tool.summary.toLowerCase().includes(searchQuery) ||
        tool.canDo.some(c => c.toLowerCase().includes(searchQuery));
      return matchCategory && matchSearch;
    });

    if (filtered.length === 0) {
      toolsContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-sub);">
          <span class="material-symbols-outlined" style="font-size: 48px; color: var(--text-muted); margin-bottom: 12px;">search_off</span>
          <p style="font-size: 1.1rem; font-weight: 600;">該当するツールが見つかりませんでした。</p>
          <p style="font-size: 0.9rem; color: var(--text-muted);">検索キーワードを変更するか、別のカテゴリを選択してください。</p>
        </div>
      `;
      return;
    }

    // 水平構面カテゴリのみ選択されている場合、2つのブロックに分けて説明バナーを表示
    if (currentCategory === 'detail' && searchQuery === '') {
      const basicTools = filtered.filter(t => t.subGroup === 'basic');
      const customTools = filtered.filter(t => t.subGroup === 'custom');

      toolsContainer.innerHTML = `
        <!-- 基本仕様 vs 任意配列の違いの解説バナー -->
        <div class="block-explain-card" style="grid-column: 1/-1;">
          <div class="explain-head">
            <span class="material-symbols-outlined" style="color:var(--accent-cyan); font-size:28px;">compare_arrows</span>
            <div>
              <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-main); margin-bottom:4px;">
                水平構面における「基本仕様」と「任意配列・詳細算定（⑧釘配列連動セット）」の違い
              </h3>
              <p style="font-size:0.9rem; color:var(--text-sub); margin-bottom:0; line-height:1.6;">
                告示基準の定型計算から、任意釘ピッチ・高倍率・伝統真壁まで用途に応じて使い分けいただけます。
              </p>
            </div>
          </div>
          <div class="explain-grid">
            <div class="explain-col">
              <h4 style="color:#60a5fa; display:flex; align-items:center; gap:6px;">
                <span class="material-symbols-outlined" style="font-size:18px;">task_alt</span> ①〜④ 【基本仕様 (告示基準・標準定型)】
              </h4>
              <p>建築基準法告示・住宅金融支援機構の標準仕様に準拠した定型ピッチ。標準的な釘種・間隔で即座に水平構面倍率や剛性を手軽に算定できるスピード実務向け。</p>
            </div>
            <div class="explain-col highlight-gold">
              <h4 style="color:var(--accent-gold); display:flex; align-items:center; gap:6px;">
                <span class="material-symbols-outlined" style="font-size:18px;">auto_awesome</span> ⑤〜⑩ 【任意配列・高倍率・詳細算定（⑧諸定数セット）】
              </h4>
              <p>現場の変則ピッチや高倍率（床倍率3.0以上など）に対応。<strong>任意配列の計算にはすべて「⑧ 釘配列諸定数」の計算が必要です。</strong>そのため各ツールは【⑧釘配列 ＋ 各構面】の1つの連携セット（2in1）としてワンストップでご利用いただけます。</p>
            </div>
          </div>
        </div>

        <!-- ブロック1: 基本仕様 -->
        <div class="subgroup-divider" style="grid-column: 1/-1;">
          <span class="badge-subgroup" style="background:rgba(59, 130, 246, 0.15); color:#60a5fa; border:1px solid rgba(59, 130, 246, 0.3);">
            ブロック1: 基本仕様 (告示基準・定型) [4ツール]
          </span>
          <span style="font-size:0.85rem; color:var(--text-muted);">標準規格仕様による迅速な倍率・剛性算定</span>
        </div>
        ${basicTools.map(t => createToolCardHtml(t)).join('')}

        <!-- ブロック2: 任意配列・高倍率・詳細 -->
        <div class="subgroup-divider" style="grid-column: 1/-1; margin-top:24px;">
          <span class="badge-subgroup" style="background:rgba(245, 158, 11, 0.15); color:var(--accent-gold); border:1px solid rgba(245, 158, 11, 0.3);">
            ブロック2: 任意配列・高倍率・詳細 (⑧釘配列諸定数 連携セット) [6ツール]
          </span>
          <span style="font-size:0.85rem; color:var(--text-muted);">⑧諸定数＋構面計算の2in1統合設計。自由な釘ピッチ・高倍率床・大壁・真壁に対応</span>
        </div>
        ${customTools.map(t => createToolCardHtml(t)).join('')}
      `;
      return;
    }

    // WRC造パッケージカテゴリが選択されている場合、Google APIキー案内バナーを表示
    if (currentCategory === 'wrc' && searchQuery === '') {
      const hasKey = Boolean(getStoredApiKey());
      toolsContainer.innerHTML = `
        <div class="block-explain-card" style="grid-column: 1/-1; border-color: rgba(245, 158, 11, 0.4); background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.95) 100%);">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
            <div style="display:flex; align-items:center; gap:16px;">
              <div style="width:48px; height:48px; border-radius:50%; background:rgba(245,158,11,0.2); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <span class="material-symbols-outlined" style="font-size:28px; color:var(--accent-gold);">key</span>
              </div>
              <div>
                <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-main); margin-bottom:4px;">
                  WRC造パッケージ ご利用前のGoogle APIキー設定
                </h3>
                <p style="font-size:0.9rem; color:var(--text-sub); margin-bottom:0; line-height:1.5;">
                  WRC一括検定シミュレータ等の計算・スプレッドシート連携機能の利用には、無料枠で取得可能なGoogle APIキーが必要です。<br>
                  現在の保存状態: <strong style="color: ${hasKey ? 'var(--accent-green)' : 'var(--accent-gold)'};">${hasKey ? '✅ 設定済み（ブラウザに安全保存中）' : '⚠️ 未設定（初回利用時に設定が必要です）'}</strong>
                </p>
              </div>
            </div>
            <button type="button" class="btn btn-gold btn-open-api-modal" onclick="openApiKeyModal()" style="display:inline-flex; align-items:center; gap:8px;">
              <span class="material-symbols-outlined">settings_suggest</span> Google APIキー設定 ＆ 取得ガイドを開く
            </button>
          </div>
        </div>
        ${filtered.map(tool => createToolCardHtml(tool)).join('')}
      `;
      return;
    }

    // CAD連携・無償ツール カテゴリが選択されている場合
    if (currentCategory === 'cad' && searchQuery === '') {
      toolsContainer.innerHTML = `
        <div class="block-explain-card" style="grid-column: 1/-1; border-color: rgba(56, 189, 248, 0.4); background: linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(15, 23, 42, 0.95) 100%);">
          <div style="display:flex; align-items:center; gap:16px;">
            <div style="width:48px; height:48px; border-radius:50%; background:rgba(56, 189, 248, 0.2); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span class="material-symbols-outlined" style="font-size:28px; color:var(--accent-cyan);">architecture</span>
            </div>
            <div>
              <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-main); margin-bottom:4px;">
                CADデータ連携 ＆ 建築実務支援ツール
              </h3>
              <p style="font-size:0.9rem; color:var(--text-sub); margin-bottom:0; line-height:1.5;">
                ARCHITREND ZEROと連動した斜め壁・耐力壁自動抽出Web-CADツール（月額¥5,980 / 年額¥39,800）と、どなたでも無償でご利用いただけるスマート案内図作成ツール（完全無償提供 ¥0）です。
              </p>
            </div>
          </div>
        </div>
        ${filtered.map(tool => createToolCardHtml(tool)).join('')}
      `;
      return;
    }

    // 全体または他カテゴリ表示
    toolsContainer.innerHTML = filtered.map(tool => createToolCardHtml(tool)).join('');
  }

  // 3. モーダル展開ロジック (何ができて何ができないか)
  window.openCriteriaModal = function(toolId) {
    const tool = MDO3_TOOLS_CATALOG.find(t => t.id === toolId);
    if (!tool || !modalBody || !modalOverlay) return;

    modalBody.innerHTML = `
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px;">
        <div class="card-icon" style="width:54px; height:54px; font-size:32px;">
          <span class="material-symbols-outlined">${tool.icon || 'construction'}</span>
        </div>
        <div>
          <span class="card-category">${tool.categoryName}</span>
          <h2 style="font-size:1.4rem; font-weight:800; margin-top:4px; color:var(--text-main);">${tool.title}</h2>
        </div>
      </div>

      <p style="color:var(--text-sub); margin-bottom:24px; font-size:0.95rem; line-height:1.6;">${tool.summary}</p>

      <div style="background:rgba(16, 185, 129, 0.08); border:1px solid rgba(16, 185, 129, 0.25); border-radius:var(--radius-sm); padding:18px; margin-bottom:18px;">
        <h4 style="color:var(--accent-green); font-size:1rem; font-weight:700; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
          <span class="material-symbols-outlined">check_circle</span> このツールでできること (対応範囲)
        </h4>
        <ul style="list-style:none; padding-left:4px;">
          ${tool.canDo.map(item => `
            <li style="display:flex; align-items:flex-start; gap:8px; font-size:0.9rem; color:var(--text-main); margin-bottom:8px;">
              <span class="material-symbols-outlined" style="color:var(--accent-green); font-size:18px; flex-shrink:0;">done</span>
              <span>${item}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <div style="background:rgba(239, 68, 68, 0.08); border:1px solid rgba(239, 68, 68, 0.25); border-radius:var(--radius-sm); padding:18px; margin-bottom:24px;">
        <h4 style="color:#ef4444; font-size:1rem; font-weight:700; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
          <span class="material-symbols-outlined">cancel</span> できないこと・留意点 (判断基準)
        </h4>
        <ul style="list-style:none; padding-left:4px;">
          ${tool.cannotDo.map(item => `
            <li style="display:flex; align-items:flex-start; gap:8px; font-size:0.9rem; color:var(--text-sub); margin-bottom:8px;">
              <span class="material-symbols-outlined" style="color:#ef4444; font-size:18px; flex-shrink:0;">close</span>
              <span>${item}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; padding-top:20px; border-top:1px solid var(--border-card);">
        ${tool.isFree ? `
          <div>
            <span style="font-size:0.8rem; color:var(--text-muted); display:block;">ご利用料金</span>
            <strong style="font-size:1.2rem; color:var(--accent-green);">完全無償提供 (¥0 / 登録不要)</strong>
          </div>
          <div style="display:flex; gap:12px;">
            <a href="${tool.manualUrl}" target="_blank" class="btn btn-ghost">
              <span class="material-symbols-outlined">menu_book</span> マニュアル
            </a>
            <a href="${tool.url}" target="_blank" class="btn btn-primary" style="background:var(--accent-green); border-color:var(--accent-green); color:#06140e; font-weight:700;">
              エディタを開く <span class="material-symbols-outlined">launch</span>
            </a>
          </div>
        ` : tool.id === 'az_skew_wall' ? `
          <div>
            <span style="font-size:0.8rem; color:var(--text-muted); display:block;">ご利用料金</span>
            <strong style="font-size:1.2rem; color:var(--accent-gold);">月額 ¥5,980 / 年額 ¥39,800</strong>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:10px;">
            <button type="button" class="btn btn-gold" onclick="startCheckout('az_monthly', 'az')">
              月額¥5,980で契約
            </button>
            <button type="button" class="btn btn-gold" onclick="startCheckout('az_annual', 'az')" style="background:linear-gradient(135deg,#f59e0b,#d97706);">
              年額¥39,800で契約 (お得)
            </button>
            <a href="${tool.url}" target="_blank" class="btn btn-primary">
              CAD起動 <span class="material-symbols-outlined">launch</span>
            </a>
          </div>
        ` : `
          <div>
            <span style="font-size:0.8rem; color:var(--text-muted); display:block;">ご利用料金</span>
            <strong style="font-size:1.2rem; color:var(--accent-gold);">単体: 月額 ¥980 / 使い放題: 月額 ¥3,980</strong>
          </div>
          <div style="display:flex; gap:12px;">
            <button type="button" class="btn btn-gold" onclick="startCheckout('individual_monthly', '${tool.id}')">
              月額¥980で契約する
            </button>
            <a href="${tool.url}" target="_blank" class="btn btn-primary">
              ツールを開く <span class="material-symbols-outlined">launch</span>
            </a>
          </div>
        `}
      </div>
    `;

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  function closeModal() {
    if (modalOverlay) {
      modalOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // 4. カテゴリタブ切り替えイベント
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-category');
      renderTools();
    });
  });

  // 5. 検索入力イベント
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderTools();
    });
  }

  // 6. 初期描画
  renderTools();

  // 7. 共通SSOクッキー判定 (Domain=.mdo3.com)
  const hasSSOCookie = document.cookie.split(';').some(item => item.trim().startsWith('mdo3_session_token='));
  const authNav = document.getElementById('authNavContainer');
  if (hasSSOCookie && authNav) {
    authNav.innerHTML = `
      <a href="https://app.mdo3.com/index.html" class="btn btn-primary">
        <span class="material-symbols-outlined">dashboard</span> マイツールへ直行
      </a>
    `;
  }

  // 8. Stripe Checkout 決済開始フロー
  window.startCheckout = function(planKey, toolId = 'all') {
    if (!hasSSOCookie) {
      alert('お申込みにはログインが必要です。ログイン画面へ移動します。');
      window.location.href = 'https://app.mdo3.com/login';
      return;
    }

    const apiUrl = `https://app.mdo3.com/api/create_checkout_session.php?plan=${encodeURIComponent(planKey)}&tool=${encodeURIComponent(toolId)}`;
    document.body.style.cursor = 'wait';

    fetch(apiUrl, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        document.body.style.cursor = 'default';
        if (data.success && data.url) {
          window.location.href = data.url;
        } else if (data.redirect_url) {
          window.location.href = data.redirect_url;
        } else {
          alert('決済の開始に失敗しました: ' + (data.message || '不明なエラー'));
        }
      })
      .catch(err => {
        document.body.style.cursor = 'default';
        console.error('Checkout error:', err);
        alert('通信エラーが発生しました。時間をおいて再度お試しください。');
      });
  };

  // ==========================================
  // 9. 設計用 地域定数 自動検索エンジン (Z, S, V0, 凍結深度)
  // ==========================================
  const regAddressInput = document.getElementById('regAddressInput');
  const btnRegSearch = document.getElementById('btnRegSearch');
  const btnCurrentLocation = document.getElementById('btnCurrentLocation');
  const btnCopyConditions = document.getElementById('btnCopyConditions');

  const resTargetAddress = document.getElementById('resTargetAddress');
  const resElevation = document.getElementById('resElevation');
  const resSnowCategory = document.getElementById('resSnowCategory');
  const valZ = document.getElementById('valZ');
  const valV0 = document.getElementById('valV0');
  const valS = document.getElementById('valS');
  const valFreeze = document.getElementById('valFreeze');
  const descZ = document.getElementById('descZ');
  const descV0 = document.getElementById('descV0');
  const descS = document.getElementById('descS');
  const descFreeze = document.getElementById('descFreeze');
  const regionalSpecialNote = document.getElementById('regionalSpecialNote');

  let currentConstants = null;
  let leafletMap = null;
  let currentMarker = null;

  // 初期座標: 長野県松本市中央 [36.238, 137.971]
  const DEFAULT_LAT = 36.238;
  const DEFAULT_LON = 137.971;

  // 省エネ・断熱関連UIエレメント
  const resEnergyBadge = document.getElementById('resEnergyBadge');
  const resSolarBadge = document.getElementById('resSolarBadge');
  const insRegionSummary = document.getElementById('insRegionSummary');
  const valUaGrade4 = document.getElementById('valUaGrade4');
  const valUaGrade5 = document.getElementById('valUaGrade5');
  const valUaGrade6 = document.getElementById('valUaGrade6');
  const valUaGrade7 = document.getElementById('valUaGrade7');
  const valEtaAc = document.getElementById('valEtaAc');
  const descEtaAc = document.getElementById('descEtaAc');

  // 地域定数 & 省エネ基準UI反映
  function updateConstantsUI(results) {
    currentConstants = results;
    if (resTargetAddress) resTargetAddress.textContent = results.address;
    if (resElevation) resElevation.textContent = `${results.elevation} m`;
    if (resSnowCategory) {
      resSnowCategory.textContent = results.isSnowHeavy ? '多雪区域' : '一般区域';
      resSnowCategory.style.background = results.isSnowHeavy ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)';
      resSnowCategory.style.color = results.isSnowHeavy ? '#ef4444' : '#60a5fa';
    }

    // 4大構造定数
    if (valZ) valZ.textContent = results.z.toFixed(results.z % 1 === 0 ? 1 : 2);
    if (valV0) valV0.textContent = results.v0;
    if (valS) valS.textContent = results.snowDepth;
    if (valFreeze) valFreeze.textContent = results.freezeDepth;

    if (descZ) {
      descZ.textContent = results.z >= 1.0 ? '標準地域 (割増規定確認)' : `地域係数低減 (Z=${results.z})`;
    }
    if (descV0) {
      descV0.textContent = `${results.pref}市町村告示値 (H12建告1454号)`;
    }
    if (descS) {
      descS.textContent = results.isSnowHeavy 
        ? `多雪区域 (標高${results.elevation}m補正済)` 
        : `一般区域 (平野部規定値)`;
    }
    if (descFreeze) {
      descFreeze.textContent = `${results.pref}特定行政庁細則・公庫基準`;
    }

    // 省エネ地域区分 ＆ 断熱等級基準反映
    const energyReg = results.energyRegion || 6;
    const ins = results.insulation || REGIONAL_DATABASE.insulationGrades[6];
    const meta = results.regionMeta || REGIONAL_DATABASE.energyRegionMaster[6];

    if (resEnergyBadge) {
      resEnergyBadge.textContent = `${energyReg}地域 (${results.pref || meta.name})`;
      resEnergyBadge.style.borderColor = meta.color || '#10b981';
      resEnergyBadge.style.color = meta.color || '#34d399';
    }
    if (resSolarBadge) {
      resSolarBadge.textContent = `日射 ${results.solarRegion || 'A4'}`;
    }
    if (insRegionSummary) {
      insRegionSummary.textContent = `${ins.label} [暖房期日射量: ${results.solarRegion}区分]`;
    }

    if (valUaGrade4) valUaGrade4.textContent = ins.grade4 !== undefined ? ins.grade4 : '—';
    if (valUaGrade5) valUaGrade5.textContent = ins.grade5 !== undefined ? ins.grade5 : '—';
    if (valUaGrade6) valUaGrade6.textContent = ins.grade6 !== undefined ? ins.grade6 : '—';
    if (valUaGrade7) valUaGrade7.textContent = ins.grade7 !== undefined ? ins.grade7 : '—';
    if (valEtaAc) valEtaAc.textContent = ins.etaAC !== undefined ? ins.etaAC : '—';
    if (descEtaAc) {
      descEtaAc.textContent = (energyReg >= 5 && ins.etaAC !== '—') 
        ? `${energyReg}地域 基準値 (冷房期遮熱)` 
        : '1〜4地域は基準値規定なし';
    }

    // クイックセレクターバーのアクティブ表示切替
    document.querySelectorAll('#energyChips .chip-btn').forEach(btn => {
      const btnReg = parseInt(btn.getAttribute('data-region'), 10);
      if (btnReg === energyReg) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (regionalSpecialNote) {
      regionalSpecialNote.textContent = results.note || 
        "特定行政庁・確認審査機関により細則が異なる場合があります。申請前に所管自治体の建築指導課基準をご確認ください。";
    }
  }

  // 緯度・経度から住所＆標高＆定数を一括再計算
  async function evaluateLocation(lat, lon, knownAddress = '') {
    let elevation = 0;
    try {
      elevation = await fetchElevation(lon, lat);
    } catch (e) {
      console.warn(e);
    }

    let address = knownAddress;
    if (!address) {
      // 逆ジオコーディング (国土地理院またはOSM)
      try {
        const revUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`;
        const res = await fetch(revUrl, { headers: { 'Accept-Language': 'ja' } });
        if (res.ok) {
          const revData = await res.json();
          address = revData.display_name.replace(/, 日本$/, '') || `北緯${lat.toFixed(4)}, 東経${lon.toFixed(4)}`;
        }
      } catch (err) {
        address = `北緯${lat.toFixed(4)}, 東経${lon.toFixed(4)}`;
      }
    }

    const calcResult = calculateRegionalConstants(address, elevation);
    updateConstantsUI(calcResult);

    // マーカー移動
    if (leafletMap && currentMarker) {
      currentMarker.setLatLng([lat, lon]);
      currentMarker.bindPopup(`
        <strong>${calcResult.pref} (${calcResult.energyRegion}地域)</strong><br>
        標高: ${elevation}m<br>
        Z=${calcResult.z}, V0=${calcResult.v0}m/s<br>
        <span style="color:#10b981;">等級6 UA≦${calcResult.insulation.grade6}</span>
      `).openPopup();
    }
  }

  // Leaflet 地図初期化
  function initRegionalMap() {
    const mapEl = document.getElementById('regionalMap');
    if (!mapEl || typeof L === 'undefined') return;

    leafletMap = L.map('regionalMap').setView([DEFAULT_LAT, DEFAULT_LON], 11);

    // 地理院地図タイル (国土地理院 標準地図)
    L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>'
    }).addTo(leafletMap);

    currentMarker = L.marker([DEFAULT_LAT, DEFAULT_LON], { draggable: true }).addTo(leafletMap);

    // 初期値計算
    evaluateLocation(DEFAULT_LAT, DEFAULT_LON, '長野県松本市中央1丁目');

    // 地図クリックで地点再判定
    leafletMap.on('click', (e) => {
      const { lat, lng } = e.latlng;
      evaluateLocation(lat, lng);
    });

    // マーカー移動完了時
    currentMarker.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      evaluateLocation(lat, lng);
    });
  }

  // 全国省エネ地域区分 (1〜8地域) クイック選択チップ
  document.querySelectorAll('#energyChips .chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const region = parseInt(btn.getAttribute('data-region'), 10);
      const meta = REGIONAL_DATABASE.energyRegionMaster[region];
      if (!meta) return;

      if (regAddressInput) regAddressInput.value = meta.repCity;
      if (leafletMap) {
        leafletMap.flyTo([meta.lat, meta.lon], 11, { duration: 1.2 });
      }
      evaluateLocation(meta.lat, meta.lon, meta.repCity);
    });
  });

  // 住所検索ボタン (国土地理院・OSM・代表座標フォールバックで100%地図連動移動)
  if (btnRegSearch && regAddressInput) {
    btnRegSearch.addEventListener('click', async () => {
      const query = regAddressInput.value.trim();
      if (!query) return;

      btnRegSearch.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 1s linear infinite;">sync</span> 検索中...';
      const geo = await geocodeAddress(query);
      btnRegSearch.innerHTML = '<span class="material-symbols-outlined">search</span> 検索・算定';

      const targetLat = geo ? geo.lat : DEFAULT_LAT;
      const targetLon = geo ? geo.lon : DEFAULT_LON;
      const targetAddress = (geo && geo.title) ? geo.title : query;

      if (leafletMap) {
        leafletMap.invalidateSize();
        leafletMap.flyTo([targetLat, targetLon], 14, { duration: 1.2 });
      }
      if (currentMarker) {
        currentMarker.setLatLng([targetLat, targetLon]);
      }
      evaluateLocation(targetLat, targetLon, targetAddress);
    });

    regAddressInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        btnRegSearch.click();
      }
    });
  }

  // 現在地取得
  if (btnCurrentLocation && navigator.geolocation) {
    btnCurrentLocation.addEventListener('click', () => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          if (leafletMap) leafletMap.flyTo([lat, lon], 14, { duration: 1.2 });
          evaluateLocation(lat, lon);
        },
        err => {
          alert('現在地の取得に失敗しました。位置情報の利用を許可してください。');
        }
      );
    });
  }

  // 計算条件コピー (構造定数 ＋ 省エネ断熱基準を一括出力)
  if (btnCopyConditions) {
    btnCopyConditions.addEventListener('click', () => {
      if (!currentConstants) return;
      const ins = currentConstants.insulation;
      const text = `【構造地域定数 ＆ 省エネ・断熱基準 算定結果（mdo3.com）】
■ 建設地住所: ${currentConstants.address}
■ 標高: ${currentConstants.elevation} m (国土地理院API)
----------------------------------------
【1. 構造設計用 地域定数】
・地震地域係数 Z: ${currentConstants.z} (昭和55年建設省告示第1793号)
・基準風速 V0: ${currentConstants.v0} m/s (平成12年建設省告示第1454号)
・垂直積雪量 S: ${currentConstants.snowDepth} cm (平成19年国交省告示第594号 / ${currentConstants.isSnowHeavy ? '多雪区域' : '一般区域'})
・設計凍結深度: ${currentConstants.freezeDepth} (特定行政庁細則・公庫基準)
----------------------------------------
【2. 省エネ地域区分 ＆ 断熱等性能等級基準】
・地域区分: ${currentConstants.energyRegion}地域 (${currentConstants.regionMeta.name})
・暖房期日射量区分: ${currentConstants.solarRegion}区分
・等級4 (省エネ基準 / 義務化): UA ≦ ${ins.grade4} W/(㎡・K)
・等級5 (ZEH水準 / 長期優良): UA ≦ ${ins.grade5} W/(㎡・K)
・等級6 (HEAT20 G2水準): UA ≦ ${ins.grade6} W/(㎡・K)
・等級7 (HEAT20 G3水準): UA ≦ ${ins.grade7} W/(㎡・K)
・冷房期日射取得率 ηAC: ${ins.etaAC !== '—' ? `ηAC ≦ ${ins.etaAC}` : '基準値なし'}
----------------------------------------
※ ${currentConstants.note || '特定行政庁・所管審査機関の最新基準をご確認ください。'}`;

      navigator.clipboard.writeText(text).then(() => {
        const originalHtml = btnCopyConditions.innerHTML;
        btnCopyConditions.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px; color:var(--accent-green);">done</span> 条件コピー完了!';
        setTimeout(() => {
          btnCopyConditions.innerHTML = originalHtml;
        }, 2200);
      });
    });
  }

  // ==========================================
  // 10. 全国省エネ地域区分・断熱等級基準 総合早見表モーダル
  // ==========================================
  const energyMapModal = document.getElementById('energyMapModal');
  const btnOpenEnergyModal = document.getElementById('btnOpenEnergyModal');
  const btnCloseEnergyModal = document.getElementById('btnCloseEnergyModal');
  const btnCloseEnergyModalFooter = document.getElementById('btnCloseEnergyModalFooter');
  const energyMasterTableBody = document.getElementById('energyMasterTableBody');

  function renderEnergyMasterTable() {
    if (!energyMasterTableBody) return;
    const grades = REGIONAL_DATABASE.insulationGrades;
    const masters = REGIONAL_DATABASE.energyRegionMaster;

    energyMasterTableBody.innerHTML = Object.keys(grades).map(regKey => {
      const reg = parseInt(regKey, 10);
      const g = grades[reg];
      const m = masters[reg];

      return `
        <tr>
          <td>
            <span class="region-pill" style="background:${m.color}22; color:${m.color}; border:1px solid ${m.color}55;">
              ${m.name}
            </span>
          </td>
          <td><strong>${m.repCity}</strong></td>
          <td>${g.grade4}</td>
          <td>${g.grade5}</td>
          <td style="font-weight:700; color:var(--accent-emerald);">${g.grade6}</td>
          <td style="font-weight:700; color:#38bdf8;">${g.grade7}</td>
          <td>${g.etaAC}</td>
          <td style="font-size:0.85rem; color:var(--text-sub);">${m.desc}</td>
          <td>
            <button type="button" class="btn btn-ghost btn-sm" onclick="selectEnergyRegionAndFly(${reg})">
              選択
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.selectEnergyRegionAndFly = function(region) {
    const meta = REGIONAL_DATABASE.energyRegionMaster[region];
    if (!meta) return;

    if (energyMapModal) {
      energyMapModal.style.display = 'none';
      energyMapModal.classList.remove('active');
    }
    document.body.style.overflow = '';

    if (regAddressInput) regAddressInput.value = meta.repCity;
    if (leafletMap) {
      leafletMap.flyTo([meta.lat, meta.lon], 11, { duration: 1.2 });
    }
    evaluateLocation(meta.lat, meta.lon, meta.repCity);

    // スムーズスクロール
    const targetSection = document.getElementById('regionalSearch');
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (btnOpenEnergyModal) {
    btnOpenEnergyModal.addEventListener('click', () => {
      renderEnergyMasterTable();
      if (energyMapModal) {
        energyMapModal.style.display = 'flex';
        energyMapModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  }

  function closeEnergyModal() {
    if (energyMapModal) {
      energyMapModal.style.display = 'none';
      energyMapModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
  if (btnCloseEnergyModal) btnCloseEnergyModal.addEventListener('click', closeEnergyModal);
  if (btnCloseEnergyModalFooter) btnCloseEnergyModalFooter.addEventListener('click', closeEnergyModal);
  if (energyMapModal) {
    energyMapModal.addEventListener('click', (e) => {
      if (e.target === energyMapModal) closeEnergyModal();
    });
  }

  // ==========================================
  // 11. Google APIキー設定 & 取得ガイド モーダル (WRC造用)
  // ==========================================
  const googleApiKeyModal = document.getElementById('googleApiKeyModal');
  const btnCloseApiKeyModal = document.getElementById('btnCloseApiKeyModal');
  const btnCloseApiKeyModalFooter = document.getElementById('btnCloseApiKeyModalFooter');
  const inputGoogleApiKey = document.getElementById('inputGoogleApiKey');
  const btnToggleApiKeyEye = document.getElementById('btnToggleApiKeyEye');
  const eyeIcon = document.getElementById('eyeIcon');
  const btnPasteApiKey = document.getElementById('btnPasteApiKey');
  const btnSaveApiKey = document.getElementById('btnSaveApiKey');
  const btnDeleteApiKey = document.getElementById('btnDeleteApiKey');
  const apiKeyStatusIndicator = document.getElementById('apiKeyStatusIndicator');
  const apiKeyStatusText = document.getElementById('apiKeyStatusText');

  // APIキーモーダル状態更新
  function updateApiKeyStatusUI() {
    const key = getStoredApiKey();
    if (key) {
      if (inputGoogleApiKey) inputGoogleApiKey.value = key;
      if (apiKeyStatusIndicator) apiKeyStatusIndicator.className = 'status-indicator active';
      if (apiKeyStatusText) {
        const masked = key.length > 8 ? `${key.substring(0, 6)}...${key.substring(key.length - 4)}` : '設定済み';
        apiKeyStatusText.innerHTML = `ブラウザに安全に保存されています: <code style="color:var(--accent-emerald);">${masked}</code>`;
      }
      if (btnDeleteApiKey) btnDeleteApiKey.style.display = 'inline-flex';
    } else {
      if (inputGoogleApiKey) inputGoogleApiKey.value = '';
      if (apiKeyStatusIndicator) apiKeyStatusIndicator.className = 'status-indicator inactive';
      if (apiKeyStatusText) apiKeyStatusText.textContent = 'ブラウザに保存されたAPIキーはありません';
      if (btnDeleteApiKey) btnDeleteApiKey.style.display = 'none';
    }
  }

  window.openApiKeyModal = function() {
    updateApiKeyStatusUI();
    const modal = document.getElementById('googleApiKeyModal');
    if (modal) {
      modal.style.setProperty('display', 'flex', 'important');
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };

  function closeApiKeyModal() {
    const modal = document.getElementById('googleApiKeyModal');
    if (modal) {
      modal.style.setProperty('display', 'none', 'important');
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
  window.closeApiKeyModal = closeApiKeyModal;

  if (btnCloseApiKeyModal) btnCloseApiKeyModal.addEventListener('click', closeApiKeyModal);
  if (btnCloseApiKeyModalFooter) btnCloseApiKeyModalFooter.addEventListener('click', closeApiKeyModal);
  if (googleApiKeyModal) {
    googleApiKeyModal.addEventListener('click', (e) => {
      if (e.target === googleApiKeyModal) closeApiKeyModal();
    });
  }

  // 目玉アイコン切替
  if (btnToggleApiKeyEye && inputGoogleApiKey && eyeIcon) {
    btnToggleApiKeyEye.addEventListener('click', () => {
      const isPassword = inputGoogleApiKey.type === 'password';
      inputGoogleApiKey.type = isPassword ? 'text' : 'password';
      eyeIcon.textContent = isPassword ? 'visibility_off' : 'visibility';
    });
  }

  // クリップボードから貼り付け
  if (btnPasteApiKey && inputGoogleApiKey) {
    btnPasteApiKey.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          inputGoogleApiKey.value = text.trim();
        }
      } catch (err) {
        alert('クリップボードの読み取りが拒否されました。入力欄に直接ペーストしてください。');
      }
    });
  }

  // キー保存
  if (btnSaveApiKey && inputGoogleApiKey) {
    btnSaveApiKey.addEventListener('click', () => {
      const key = inputGoogleApiKey.value.trim();
      if (!key) {
        alert('APIキーを入力してください。');
        return;
      }
      if (!key.startsWith('AIzaSy') && key.length < 20) {
        if (!confirm('一般的なGoogle APIキーの形式（AIzaSy...）と異なるようですが、このまま保存しますか？')) {
          return;
        }
      }
      setStoredApiKey(key);
      updateApiKeyStatusUI();
      renderTools(); // WRCツールのバッジを即時更新
      alert('Google APIキーをブラウザに安全に保存しました！WRC造の各ツールをご利用いただけます。');
      closeApiKeyModal();
    });
  }

  // キー消去
  if (btnDeleteApiKey) {
    btnDeleteApiKey.addEventListener('click', () => {
      if (confirm('保存されているGoogle APIキーを削除しますか？')) {
        setStoredApiKey('');
        updateApiKeyStatusUI();
        renderTools();
      }
    });
  }

  // 地図初期化実行
  setTimeout(initRegionalMap, 100);
});
