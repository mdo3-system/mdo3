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

  // 1. ツールカードHTML生成ヘルパー
  function createToolCardHtml(tool, isLinked = false) {
    return `
      <div class="tool-card ${isLinked ? 'tool-card-linked' : ''}" data-id="${tool.id}">
        <div class="card-top">
          <div class="card-icon">
            <span class="material-symbols-outlined">${tool.icon || 'construction'}</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            ${isLinked ? '<span class="badge-linked-set"><span class="material-symbols-outlined" style="font-size:12px;">sync</span> 連動セット</span>' : ''}
            <span class="card-category">${tool.categoryName}</span>
          </div>
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
    `;
  }

  // 2. ツールカタログ描画関数 (水平構面の2ブロック化 ＆ ⑧〜⑩連動セット対応)
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
                水平構面における「基本仕様」と「任意配列・詳細算定」の違い
              </h3>
              <p style="font-size:0.9rem; color:var(--text-sub); margin-bottom:0; line-height:1.6;">
                用途や要求耐力に応じて最適なアプローチを選択できます。
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
            <div class="explain-col">
              <h4 style="color:var(--accent-gold); display:flex; align-items:center; gap:6px;">
                <span class="material-symbols-outlined" style="font-size:18px;">auto_awesome</span> ⑤〜⑩ 【任意配列・高倍率・詳細算定】
              </h4>
              <p>現場の変則ピッチや高倍率（床倍率3.0以上など）に対応。特に「⑧釘配列諸定数」「⑨大壁」「⑩真壁」は相互に連動し、任意釘ピッチに応じた精緻な許容応力度設計を実現します。</p>
            </div>
          </div>
        </div>

        <!-- ブロック1: 基本仕様 -->
        <div class="subgroup-divider" style="grid-column: 1/-1;">
          <span class="badge-subgroup" style="background:rgba(59, 130, 246, 0.15); color:#60a5fa; border:1px solid rgba(59, 130, 246, 0.3);">
            ブロック1: 基本仕様 (告示基準・定型)
          </span>
          <span style="font-size:0.85rem; color:var(--text-muted);">標準規格仕様による迅速な倍率・剛性算定</span>
        </div>
        ${basicTools.map(t => createToolCardHtml(t, false)).join('')}

        <!-- ブロック2: 任意配列・高倍率・詳細 -->
        <div class="subgroup-divider" style="grid-column: 1/-1; margin-top:24px;">
          <span class="badge-subgroup" style="background:rgba(245, 158, 11, 0.15); color:var(--accent-gold); border:1px solid rgba(245, 158, 11, 0.3);">
            ブロック2: 任意配列・高倍率・詳細 (⑧〜⑩は連動セット)
          </span>
          <span style="font-size:0.85rem; color:var(--text-muted);">自由な釘ピッチ・高倍率床、および釘配列・大壁・真壁の連動設計</span>
        </div>
        ${customTools.map(t => createToolCardHtml(t, t.linkedGroup === 'wall_nail_set')).join('')}
      `;
      return;
    }

    // 全体または他カテゴリ表示
    toolsContainer.innerHTML = filtered.map(tool => {
      const isLinked = tool.linkedGroup === 'wall_nail_set';
      return createToolCardHtml(tool, isLinked);
    }).join('');
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

  // 地域定数UI反映
  function updateConstantsUI(results) {
    currentConstants = results;
    if (resTargetAddress) resTargetAddress.textContent = results.address;
    if (resElevation) resElevation.textContent = `${results.elevation} m`;
    if (resSnowCategory) {
      resSnowCategory.textContent = results.isSnowHeavy ? '多雪区域' : '一般区域';
      resSnowCategory.style.background = results.isSnowHeavy ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)';
      resSnowCategory.style.color = results.isSnowHeavy ? '#ef4444' : '#60a5fa';
    }

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
      currentMarker.bindPopup(`<strong>${calcResult.pref}</strong><br>標高: ${elevation}m<br>Z=${calcResult.z}, V0=${calcResult.v0}m/s`).openPopup();
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

  // 住所検索ボタン
  if (btnRegSearch && regAddressInput) {
    btnRegSearch.addEventListener('click', async () => {
      const query = regAddressInput.value.trim();
      if (!query) return;

      btnRegSearch.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 1s linear infinite;">sync</span> 検索中...';
      const geo = await geocodeAddress(query);
      btnRegSearch.innerHTML = '<span class="material-symbols-outlined">search</span> 検索・算定';

      if (geo) {
        if (leafletMap) {
          leafletMap.setView([geo.lat, geo.lon], 14);
        }
        evaluateLocation(geo.lat, geo.lon, query);
      } else {
        // ジオコーディングできない場合でも文字列から計算
        const calcResult = calculateRegionalConstants(query, 0);
        updateConstantsUI(calcResult);
      }
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
          if (leafletMap) leafletMap.setView([lat, lon], 14);
          evaluateLocation(lat, lon);
        },
        err => {
          alert('現在地の取得に失敗しました。位置情報の利用を許可してください。');
        }
      );
    });
  }

  // 計算条件コピー
  if (btnCopyConditions) {
    btnCopyConditions.addEventListener('click', () => {
      if (!currentConstants) return;
      const text = `【設計用地域定数 算定結果（mdo3.com）】
■ 建設地住所: ${currentConstants.address}
■ 標高: ${currentConstants.elevation} m (国土地理院API)
■ 地震地域係数 Z: ${currentConstants.z} (昭和55年建設省告示第1793号)
■ 基準風速 V0: ${currentConstants.v0} m/s (平成12年建設省告示第1454号)
■ 垂直積雪量 S: ${currentConstants.snowDepth} cm (平成19年国土交通省告示第594号 / ${currentConstants.isSnowHeavy ? '多雪区域' : '一般区域'})
■ 設計凍結深度: ${currentConstants.freezeDepth} (特定行政庁細則・公庫基準)
※ ${currentConstants.note || '特定行政庁・所管審査機関の最新基準をご確認ください。'}`;

      navigator.clipboard.writeText(text).then(() => {
        const originalHtml = btnCopyConditions.innerHTML;
        btnCopyConditions.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px; color:var(--accent-green);">done</span> コピー完了!';
        setTimeout(() => {
          btnCopyConditions.innerHTML = originalHtml;
        }, 2200);
      });
    });
  }

  // 地図初期化実行
  setTimeout(initRegionalMap, 100);
});
