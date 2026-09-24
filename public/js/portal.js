/**
 * public/js/portal.js
 * 
 * mdo3.com 基幹ポータル インタラクティブUIロジック
 * - ツール一覧動的レンダリング
 * - カテゴリフィルタ & キーワード検索
 * - 判断基準モーダル (何ができて何ができないか)
 * - SSOセッションチェック & ログインステータス表示
 * - Stripe Checkout 決済連携
 */

document.addEventListener('DOMContentLoaded', () => {
  const toolsContainer = document.getElementById('toolsContainer');
  const searchInput = document.getElementById('toolSearchInput');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const modalOverlay = document.getElementById('criteriaModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalBody = document.getElementById('modalBody');

  let currentCategory = 'all';
  let searchQuery = '';

  // 1. ツールカード描画関数
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

    toolsContainer.innerHTML = filtered.map(tool => `
      <div class="tool-card" data-id="${tool.id}">
        <div class="card-top">
          <div class="card-icon">
            <span class="material-symbols-outlined">${tool.icon || 'construction'}</span>
          </div>
          <span class="card-category">${tool.categoryName}</span>
        </div>
        
        <h3 class="card-title">${tool.title}</h3>
        <p class="card-desc">${tool.summary}</p>

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
          <span class="card-price-badge">月額 ¥980 (税込)</span>
          <div class="card-actions">
            <button type="button" class="btn btn-ghost btn-sm" onclick="openCriteriaModal('${tool.id}')">
              <span class="material-symbols-outlined" style="font-size:16px;">info</span> 判断基準
            </button>
            <a href="${tool.url}" target="_blank" class="btn btn-primary btn-sm">
              開く <span class="material-symbols-outlined" style="font-size:16px;">launch</span>
            </a>
          </div>
        </div>
      </div>
    `).join('');
  }

  // 2. モーダル展開ロジック (何ができて何ができないか)
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

  // 3. カテゴリタブ切り替えイベント
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-category');
      renderTools();
    });
  });

  // 4. 検索入力イベント
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderTools();
    });
  }

  // 5. 初期描画
  renderTools();

  // 6. 共通SSOクッキー判定 (Domain=.mdo3.com)
  const hasSSOCookie = document.cookie.split(';').some(item => item.trim().startsWith('mdo3_session_token='));
  const authNav = document.getElementById('authNavContainer');
  if (hasSSOCookie && authNav) {
    authNav.innerHTML = `
      <a href="https://app.mdo3.com/index.html" class="btn btn-primary">
        <span class="material-symbols-outlined">dashboard</span> マイツールへ直行
      </a>
    `;
  }

  // 7. Stripe Checkout 決済開始フロー
  window.startCheckout = function(planKey, toolId = 'all') {
    if (!hasSSOCookie) {
      // 未ログインならログイン画面へ誘導
      alert('お申込みにはログインが必要です。ログイン画面へ移動します。');
      window.location.href = 'https://app.mdo3.com/login';
      return;
    }

    const apiUrl = `https://app.mdo3.com/api/create_checkout_session.php?plan=${encodeURIComponent(planKey)}&tool=${encodeURIComponent(toolId)}`;
    
    // ボタンのフィードバック
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
});
