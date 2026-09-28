/**
 * public/js/avg_gl_calc.js
 * 
 * 平均GL連動 構造設計用 基礎寸法・根入れ自動換算ツール (完全無償・実務審査対応)
 * - 建築基準法施行令第38条（基礎立上り高さ 300mm以上 / 400mm推奨）
 * - 建築基準法告示第1347号（べた基礎根入れ 120mm以上 / 布基礎 240mm以上 / 凍結深度以上）
 * - 設計GL基準の各基礎部材（FG1, FG2, FG3, 車庫等）から、平均GL基準の構造設計寸法を自動算出
 * - アーキトレンド (ARCHITREND ZERO) / 許容応力度計算ソフト 基礎属性設定連携
 * - 断面レベル図（設計GL vs 平均GL）リアルタイムSVG図解
 */

(function() {
  'use strict';

  // 基本仕様の初期プリセット (FG1, FG2, FG3)
  const DEFAULT_SPECS = [
    {
      id: 'fg1',
      name: 'FG1',
      role: '外周部',
      stand: 390,      // 設計GLからの立上り (mm)
      embed: 250,      // 設計GLからの根入れ (mm)
      width: 150,      // 基礎立上り幅 (mm)
      slab: 50,        // べた基礎スラブ天端高 (設計GLから mm)
      isCustom: false
    },
    {
      id: 'fg2',
      name: 'FG2',
      role: '内部間仕切',
      stand: 390,
      embed: 100,
      width: 150,
      slab: 50,
      isCustom: false
    },
    {
      id: 'fg3',
      name: 'FG3',
      role: 'ポーチ・玄関下がり',
      stand: 50,
      embed: 250,
      width: 150,
      slab: 50,
      isCustom: false
    }
  ];

  // 追加用プリセット
  const ADD_PRESETS = {
    garage: {
      name: 'FG-G',
      role: '車庫・ガレージ',
      stand: 150,
      embed: 250,
      width: 150,
      slab: -100
    },
    deep: {
      name: 'FG-D',
      role: '深基礎・高低差部',
      stand: 390,
      embed: 600,
      width: 150,
      slab: 50
    },
    entrance: {
      name: 'FG-E',
      role: '玄関土間',
      stand: 200,
      embed: 250,
      width: 150,
      slab: -50
    },
    custom: {
      name: 'FG4',
      role: '任意部材',
      stand: 390,
      embed: 250,
      width: 150,
      slab: 50
    }
  };

  const STORAGE_KEY = 'mdo3_avg_gl_calc_data';

  // アプリケーション状態
  let state = {
    avgGlDiff: -100, // 設計GLに対する平均GLのレベル差 (mm) 例: -100mm (平均GLが100mm低い)
    commonSlab: 50,  // 共通べた基礎天端高 (mm)
    selectedId: 'fg1', // 断面図表示中の部材ID
    specs: JSON.parse(JSON.stringify(DEFAULT_SPECS))
  };

  document.addEventListener('DOMContentLoaded', () => {
    loadSavedState();
    initAvgGlCalc();
  });

  function loadSavedState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.avgGlDiff === 'number') state.avgGlDiff = parsed.avgGlDiff;
        if (typeof parsed.commonSlab === 'number') state.commonSlab = parsed.commonSlab;
        if (Array.isArray(parsed.specs) && parsed.specs.length > 0) state.specs = parsed.specs;
      }
    } catch (e) {
      console.warn('[avg_gl_calc] Failed to load state from localStorage:', e);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        avgGlDiff: state.avgGlDiff,
        commonSlab: state.commonSlab,
        specs: state.specs
      }));
    } catch (e) {
      console.warn('[avg_gl_calc] Failed to save state to localStorage:', e);
    }
  }

  function initAvgGlCalc() {
    const inputAvgGl = document.getElementById('inputAvgGlDiff');
    const inputCommonSlab = document.getElementById('inputCommonSlabHeight');
    const btnReset = document.getElementById('btnResetAvgGl');
    const btnCopy = document.getElementById('btnCopyAvgGlResult');
    const btnAddSpec = document.getElementById('btnAddSpecBtn');
    const addPresetSelect = document.getElementById('selAddPresetType');

    if (!inputAvgGl) return; // 要素が存在しない場合は何もしない

    // 初期値反映
    inputAvgGl.value = state.avgGlDiff;
    if (inputCommonSlab) inputCommonSlab.value = state.commonSlab;

    // クイック選択ボタン
    const quickBtns = document.querySelectorAll('.avg-gl-quick-btn');
    quickBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.getAttribute('data-val'), 10);
        inputAvgGl.value = val;
        state.avgGlDiff = val;
        updateQuickBtnActive(val);
        render();
        saveState();
      });
    });

    // 平均GL入力イベント
    inputAvgGl.addEventListener('input', () => {
      const val = parseInt(inputAvgGl.value, 10) || 0;
      state.avgGlDiff = val;
      updateQuickBtnActive(val);
      render();
      saveState();
    });

    // 共通スラブ天端高入力イベント
    if (inputCommonSlab) {
      inputCommonSlab.addEventListener('input', () => {
        const val = parseInt(inputCommonSlab.value, 10) || 0;
        state.commonSlab = val;
        render();
        saveState();
      });
    }

    // 部材追加ボタン
    if (btnAddSpec && addPresetSelect) {
      btnAddSpec.addEventListener('click', () => {
        const presetKey = addPresetSelect.value || 'custom';
        const preset = ADD_PRESETS[presetKey] || ADD_PRESETS.custom;
        const newId = 'spec_' + Date.now();
        const nextNum = state.specs.length + 1;
        const newName = presetKey === 'custom' ? `FG${nextNum}` : preset.name;

        state.specs.push({
          id: newId,
          name: newName,
          role: preset.role,
          stand: preset.stand,
          embed: preset.embed,
          width: preset.width,
          slab: preset.slab,
          isCustom: true
        });
        state.selectedId = newId;
        render();
        saveState();
      });
    }

    // リセットボタン
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('基本仕様（FG1, FG2, FG3）を標準値にリセットしますか？')) {
          state.avgGlDiff = -100;
          state.commonSlab = 50;
          state.specs = JSON.parse(JSON.stringify(DEFAULT_SPECS));
          state.selectedId = 'fg1';
          inputAvgGl.value = -100;
          if (inputCommonSlab) inputCommonSlab.value = 50;
          updateQuickBtnActive(-100);
          render();
          saveState();
        }
      });
    }

    // コピーボタン
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        copyResultsToClipboard();
      });
    }

    updateQuickBtnActive(state.avgGlDiff);
    render();
  }

  function updateQuickBtnActive(val) {
    const quickBtns = document.querySelectorAll('.avg-gl-quick-btn');
    quickBtns.forEach(btn => {
      const btnVal = parseInt(btn.getAttribute('data-val'), 10);
      if (btnVal === val) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // 計算実行＆全UIレンダリング
  function render() {
    renderGlDiffNote();
    renderInputTable();
    renderOutputCards();
    renderSvgSection();
  }

  // 平均GL状態解説バッジ
  function renderGlDiffNote() {
    const noteEl = document.getElementById('avgGlDiffNote');
    if (!noteEl) return;

    const diff = state.avgGlDiff;
    if (diff < 0) {
      noteEl.innerHTML = `<span style="color:#f59e0b; font-weight:800;">地盤下がり (平均GL &lt; 設計GL):</span> 平均地盤面が設計GLより <strong>${Math.abs(diff)} mm</strong> 低いため、構造立上りは <strong>+${Math.abs(diff)} mm</strong> 高くなり、根入れは <strong>-${Math.abs(diff)} mm</strong> 浅くなります（根入れ不足に要注意）。`;
      noteEl.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      noteEl.style.background = 'rgba(245, 158, 11, 0.08)';
    } else if (diff > 0) {
      noteEl.innerHTML = `<span style="color:#38bdf8; font-weight:800;">地盤上がり (平均GL &gt; 設計GL):</span> 平均地盤面が設計GLより <strong>+${diff} mm</strong> 高いため、構造立上りは <strong>-${diff} mm</strong> 低くなり（令38条300mm確保に注意）、根入れは <strong>+${diff} mm</strong> 深くなります。`;
      noteEl.style.borderColor = 'rgba(56, 189, 248, 0.4)';
      noteEl.style.background = 'rgba(56, 189, 248, 0.08)';
    } else {
      noteEl.innerHTML = `<span style="color:#34d399; font-weight:800;">平坦地 (平均GL ＝ 設計GL):</span> 設計GLと平均GLが一致しているため、設計寸法がそのまま構造設計設定値となります。`;
      noteEl.style.borderColor = 'rgba(52, 211, 153, 0.4)';
      noteEl.style.background = 'rgba(52, 211, 153, 0.08)';
    }
  }

  // 左カラム: 基本仕様入力テーブルの描画
  function renderInputTable() {
    const tbody = document.getElementById('tbodyAvgGlSpecs');
    if (!tbody) return;

    tbody.innerHTML = '';

    state.specs.forEach((spec, idx) => {
      const tr = document.createElement('tr');
      const isSelected = spec.id === state.selectedId;
      if (isSelected) tr.classList.add('selected-row');

      const totalD = (parseInt(spec.stand, 10) || 0) + (parseInt(spec.embed, 10) || 0);

      tr.innerHTML = `
        <td style="text-align:center;">
          <input type="radio" name="radSelectedSpec" value="${spec.id}" ${isSelected ? 'checked' : ''} style="cursor:pointer;" title="断面図を選択">
        </td>
        <td>
          <input type="text" class="table-input spec-name" data-id="${spec.id}" value="${escapeHtml(spec.name)}" style="width:70px; font-weight:800; color:var(--accent-gold);">
        </td>
        <td>
          <input type="text" class="table-input spec-role" data-id="${spec.id}" value="${escapeHtml(spec.role)}" style="width:105px; font-size:0.75rem;">
        </td>
        <td>
          <div class="input-with-unit">
            <input type="number" class="table-input spec-stand" data-id="${spec.id}" value="${spec.stand}" step="10" style="width:65px;">
            <span class="unit">mm</span>
          </div>
        </td>
        <td>
          <div class="input-with-unit">
            <input type="number" class="table-input spec-embed" data-id="${spec.id}" value="${spec.embed}" step="10" style="width:65px;">
            <span class="unit">mm</span>
          </div>
        </td>
        <td>
          <div class="input-with-unit">
            <input type="number" class="table-input spec-width" data-id="${spec.id}" value="${spec.width || 150}" step="10" style="width:60px;">
            <span class="unit">mm</span>
          </div>
        </td>
        <td>
          <div class="input-with-unit">
            <input type="number" class="table-input spec-slab" data-id="${spec.id}" value="${spec.slab !== undefined ? spec.slab : 50}" step="5" style="width:60px;">
            <span class="unit">mm</span>
          </div>
        </td>
        <td style="text-align:right; font-weight:700; color:var(--accent-cyan); font-size:0.8rem;">
          ${totalD} mm
        </td>
        <td style="text-align:center;">
          ${state.specs.length > 1 ? `
            <button type="button" class="btn-del-spec" data-id="${spec.id}" title="この部材を削除" style="background:none; border:none; color:var(--text-muted); cursor:pointer; padding:2px;">
              <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
            </button>
          ` : '<span style="color:var(--text-muted); font-size:0.7rem;">-</span>'}
        </td>
      `;

      tbody.appendChild(tr);
    });

    // イベント付与
    tbody.querySelectorAll('input[name="radSelectedSpec"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        state.selectedId = e.target.value;
        render();
      });
    });

    tbody.querySelectorAll('.spec-name').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const spec = state.specs.find(s => s.id === e.target.getAttribute('data-id'));
        if (spec) {
          spec.name = e.target.value;
          renderOutputCards();
          renderSvgSection();
          saveState();
        }
      });
    });

    tbody.querySelectorAll('.spec-role').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const spec = state.specs.find(s => s.id === e.target.getAttribute('data-id'));
        if (spec) {
          spec.role = e.target.value;
          renderOutputCards();
          saveState();
        }
      });
    });

    tbody.querySelectorAll('.spec-stand').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const spec = state.specs.find(s => s.id === e.target.getAttribute('data-id'));
        if (spec) {
          spec.stand = parseInt(e.target.value, 10) || 0;
          render();
          saveState();
        }
      });
    });

    tbody.querySelectorAll('.spec-embed').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const spec = state.specs.find(s => s.id === e.target.getAttribute('data-id'));
        if (spec) {
          spec.embed = parseInt(e.target.value, 10) || 0;
          render();
          saveState();
        }
      });
    });

    tbody.querySelectorAll('.spec-width').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const spec = state.specs.find(s => s.id === e.target.getAttribute('data-id'));
        if (spec) {
          spec.width = parseInt(e.target.value, 10) || 150;
          render();
          saveState();
        }
      });
    });

    tbody.querySelectorAll('.spec-slab').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const spec = state.specs.find(s => s.id === e.target.getAttribute('data-id'));
        if (spec) {
          spec.slab = parseInt(e.target.value, 10) || 0;
          render();
          saveState();
        }
      });
    });

    tbody.querySelectorAll('.btn-del-spec').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        if (confirm('この部材を削除しますか？')) {
          state.specs = state.specs.filter(s => s.id !== id);
          if (state.selectedId === id) {
            state.selectedId = state.specs[0]?.id || '';
          }
          render();
          saveState();
        }
      });
    });
  }

  // 右カラム: 構造設計設定用 換算結果の描画
  function renderOutputCards() {
    const container = document.getElementById('avgGlResultsContainer');
    if (!container) return;

    container.innerHTML = '';
    const diff = state.avgGlDiff;

    // 現在ポータルで表示されている凍結深度を取得
    let freezeDepth = 0;
    const freezeText = document.getElementById('resFreezingDepth')?.textContent || '';
    const freezeMatch = freezeText.match(/(\d+)\s*mm/);
    if (freezeMatch) {
      freezeDepth = parseInt(freezeMatch[1], 10);
    }

    state.specs.forEach(spec => {
      const standGl = parseInt(spec.stand, 10) || 0;
      const embedGl = parseInt(spec.embed, 10) || 0;
      const slabGl = spec.slab !== undefined ? (parseInt(spec.slab, 10) || 0) : 50;

      // 構造設計用寸法 (平均GL基準)
      // H_struct = standGl - diff
      // Df_struct = embedGl + diff
      // Slab_struct = slabGl - diff
      const hStruct = standGl - diff;
      const dfStruct = embedGl + diff;
      const slabStruct = slabGl - diff;
      const totalD = standGl + embedGl; // 部材全成 (不変)

      // 法令判定チェック
      // 1. 令38条: 基礎立上り高さ (地盤面から300mm以上 / 400mm推奨)
      let standStatus = 'ok';
      let standBadgeText = '令38条 300mm以上 適合';
      if (hStruct < 300) {
        standStatus = 'ng';
        standBadgeText = `⚠️ 令38条 300mm未満 (${hStruct}mm)！土台水切・増打要確認`;
      } else if (hStruct >= 400) {
        standStatus = 'great';
        standBadgeText = '令38条 適合 ＆ 400mm以上 (土台腐食防止推奨)';
      }

      // 2. 告示1347号: 根入れ深さ (べた基礎120mm以上 / 布基礎240mm以上 / 凍結深度以上)
      let embedStatus = 'ok';
      let embedBadgeText = '告示1347号 べた基礎120mm以上 適合';
      if (dfStruct < 120) {
        embedStatus = 'ng';
        embedBadgeText = `⚠️ 告示1347号 根入れ不足 (${dfStruct}mm &lt; 120mm)！深基礎検討`;
      } else if (freezeDepth > 0 && dfStruct < freezeDepth) {
        embedStatus = 'warn';
        embedBadgeText = `⚠️ 地域凍結深度(${freezeDepth}mm)未満 (${dfStruct}mm)！`;
      }

      const isSelected = spec.id === state.selectedId;

      const card = document.createElement('div');
      card.className = `avg-gl-res-card ${isSelected ? 'active-card' : ''}`;
      card.setAttribute('data-id', spec.id);

      card.innerHTML = `
        <div class="avg-res-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="avg-res-tag">${escapeHtml(spec.name)}</span>
            <span class="avg-res-role">${escapeHtml(spec.role)}</span>
          </div>
          <div class="avg-res-d">全成 D = <strong>${totalD}</strong> mm</div>
        </div>

        <div class="avg-res-grid">
          <!-- 構造 基礎立上り高 -->
          <div class="avg-res-col">
            <div class="avg-stat-label">構造 基礎立上り高 (平均GL基準)</div>
            <div class="avg-stat-val ${standStatus === 'ng' ? 'val-ng' : ''}">
              ${hStruct} <span class="unit">mm</span>
            </div>
            <div class="avg-stat-formula">設計GL ${standGl} - (${diff >= 0 ? '+' : ''}${diff})</div>
            <div class="avg-pill ${standStatus}">${standBadgeText}</div>
          </div>

          <!-- 構造 根入れ深さ -->
          <div class="avg-res-col">
            <div class="avg-stat-label">構造 根入れ深さ (平均GL基準)</div>
            <div class="avg-stat-val ${embedStatus === 'ng' ? 'val-ng' : (embedStatus === 'warn' ? 'val-warn' : '')}">
              ${dfStruct} <span class="unit">mm</span>
            </div>
            <div class="avg-stat-formula">設計GL ${embedGl} + (${diff >= 0 ? '+' : ''}${diff})</div>
            <div class="avg-pill ${embedStatus}">${embedBadgeText}</div>
          </div>

          <!-- 構造 スラブ天端高 -->
          <div class="avg-res-col">
            <div class="avg-stat-label">構造 べた基礎天端高 (平均GL基準)</div>
            <div class="avg-stat-val" style="color:#67e8f9;">
              ${slabStruct >= 0 ? '+' : ''}${slabStruct} <span class="unit">mm</span>
            </div>
            <div class="avg-stat-formula">設計GL ${slabGl >= 0 ? '+' : ''}${slabGl} - (${diff >= 0 ? '+' : ''}${diff})</div>
            <div class="avg-pill ok">幅: ${spec.width || 150}mm</div>
          </div>
        </div>
      `;

      // クリックでプレビュー部材切り替え
      card.addEventListener('click', () => {
        state.selectedId = spec.id;
        render();
      });

      container.appendChild(card);
    });
  }

  // リアルタイム断面SVG図解の描画
  function renderSvgSection() {
    const svgWrap = document.getElementById('avgGlSvgContainer');
    const labelWrap = document.getElementById('avgGlSvgLabel');
    if (!svgWrap) return;

    const spec = state.specs.find(s => s.id === state.selectedId) || state.specs[0];
    if (!spec) return;

    if (labelWrap) {
      labelWrap.textContent = `【${spec.name}（${spec.role}）】断面レベル図（設計GL vs 平均GL）`;
    }

    const diff = state.avgGlDiff;
    const standGl = parseInt(spec.stand, 10) || 390;
    const embedGl = parseInt(spec.embed, 10) || 250;
    const slabGl = spec.slab !== undefined ? (parseInt(spec.slab, 10) || 50) : 50;

    const hStruct = standGl - diff;
    const dfStruct = embedGl + diff;
    const slabStruct = slabGl - diff;
    const totalD = standGl + embedGl;

    // SVG寸法とスケーリング
    // 基準線: 設計GL = Y: 120
    const W = 460;
    const H = 280;
    const glY = 120; // ▽設計GLのY座標

    // スケール: 1px = 約4mm
    // 基礎天端 Y: glY - standGl * scale
    // 基礎底面 Y: glY + embedGl * scale
    // 平均GL Y: glY - diff * scale (diffがマイナスなら平均GLは下がるのでY座標は大きくなる)
    const scale = 0.22;

    const topY = glY - standGl * scale;
    const botY = glY + embedGl * scale;
    const slabY = glY - slabGl * scale;
    const avgGlY = glY - diff * scale;

    const beamLeft = 140;
    const beamW = 40; // 立上り幅ビジュアル
    const footingW = 100; // 底盤幅
    const footingH = 30; // スラブ厚

    // SVG HTML組み立て
    svgWrap.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="220" style="display:block; overflow:visible; font-family:'Plus Jakarta Sans',sans-serif;">
        <defs>
          <linearGradient id="concGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#334155"/>
            <stop offset="100%" stop-color="#1e293b"/>
          </linearGradient>
          <pattern id="soilPattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <line x1="0" y1="10" x2="10" y2="0" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
          </pattern>
        </defs>

        <!-- 地盤土壌ハッチング -->
        <rect x="0" y="${Math.min(glY, avgGlY)}" width="${W}" height="${H - Math.min(glY, avgGlY)}" fill="url(#soilPattern)" opacity="0.7"/>

        <!-- 基礎コンクリート断面 -->
        <!-- 立上り -->
        <rect x="${beamLeft}" y="${topY}" width="${beamW}" height="${botY - topY}" fill="url(#concGrad)" stroke="#64748b" stroke-width="1.5" rx="1"/>
        <!-- べた基礎スラブ -->
        <polygon points="${beamLeft + beamW},${slabY} ${W - 30},${slabY} ${W - 30},${slabY + footingH} ${beamLeft + beamW},${slabY + footingH}" fill="url(#concGrad)" stroke="#64748b" stroke-width="1.5"/>
        <!-- 底盤ベース (外周フーチング風) -->
        <rect x="${beamLeft - 20}" y="${botY - 25}" width="${beamW + 40}" height="25" fill="url(#concGrad)" stroke="#64748b" stroke-width="1.5" rx="1"/>

        <!-- ▽ 設計GL ライン (水色実線) -->
        <line x1="10" y1="${glY}" x2="${W - 10}" y2="${glY}" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4,2"/>
        <text x="14" y="${glY - 5}" fill="#38bdf8" font-size="11" font-weight="700">▽ 設計GL ±0</text>

        <!-- ▽ 平均GL ライン (ゴールド破線) -->
        <line x1="10" y1="${avgGlY}" x2="${W - 10}" y2="${avgGlY}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6,3"/>
        <text x="14" y="${avgGlY + (diff < 0 ? 14 : -6)}" fill="#f59e0b" font-size="11" font-weight="800">
          ▽ 平均GL (${diff >= 0 ? '+' : ''}${diff}mm)
        </text>

        <!-- 平均GLと設計GLの高低差矢印 (diff != 0 の場合) -->
        ${diff !== 0 ? `
          <line x1="100" y1="${glY}" x2="100" y2="${avgGlY}" stroke="#f59e0b" stroke-width="1.2"/>
          <text x="105" y="${(glY + avgGlY) / 2 + 4}" fill="#f59e0b" font-size="10" font-weight="700">
            ΔGL: ${diff}mm
          </text>
        ` : ''}

        <!-- 構造 基礎立上り高 H_struct (平均GL 〜 基礎天端) -->
        <line x1="${beamLeft - 35}" y1="${avgGlY}" x2="${beamLeft - 35}" y2="${topY}" stroke="#34d399" stroke-width="1.5"/>
        <!-- 矢印先端 -->
        <polyline points="${beamLeft - 38},${topY + 5} ${beamLeft - 35},${topY} ${beamLeft - 32},${topY + 5}" fill="none" stroke="#34d399" stroke-width="1.5"/>
        <polyline points="${beamLeft - 38},${avgGlY - 5} ${beamLeft - 35},${avgGlY} ${beamLeft - 32},${avgGlY - 5}" fill="none" stroke="#34d399" stroke-width="1.5"/>
        <text x="${beamLeft - 40}" y="${(topY + avgGlY) / 2 + 4}" fill="#34d399" font-size="11" font-weight="800" text-anchor="end">
          構造H: ${hStruct}
        </text>

        <!-- 構造 根入れ深さ Df_struct (平均GL 〜 底面) -->
        <line x1="${beamLeft - 35}" y1="${avgGlY}" x2="${beamLeft - 35}" y2="${botY}" stroke="#f43f5e" stroke-width="1.5"/>
        <polyline points="${beamLeft - 38},${botY - 5} ${beamLeft - 35},${botY} ${beamLeft - 32},${botY - 5}" fill="none" stroke="#f43f5e" stroke-width="1.5"/>
        <text x="${beamLeft - 40}" y="${(botY + avgGlY) / 2 + 4}" fill="#f43f5e" font-size="11" font-weight="800" text-anchor="end">
          根入れ: ${dfStruct}
        </text>

        <!-- 基礎全成 D (右側矢印) -->
        <line x1="${W - 60}" y1="${topY}" x2="${W - 60}" y2="${botY}" stroke="#94a3b8" stroke-width="1.2"/>
        <polyline points="${W - 63},${topY + 5} ${W - 60},${topY} ${W - 57},${topY + 5}" fill="none" stroke="#94a3b8" stroke-width="1.2"/>
        <polyline points="${W - 63},${botY - 5} ${W - 60},${botY} ${W - 57},${botY - 5}" fill="none" stroke="#94a3b8" stroke-width="1.2"/>
        <text x="${W - 50}" y="${(topY + botY) / 2 + 4}" fill="#94a3b8" font-size="11" font-weight="700">
          全成 D: ${totalD}mm
        </text>

        <!-- スラブ天端レベル -->
        <text x="${beamLeft + beamW + 15}" y="${slabY - 4}" fill="#67e8f9" font-size="10" font-weight="700">
          スラブ天端 (平均GL ${slabStruct >= 0 ? '+' : ''}${slabStruct}mm)
        </text>
      </svg>
    `;
  }

  // クリップボードへ結果コピー
  function copyResultsToClipboard() {
    const diff = state.avgGlDiff;
    const diffStr = diff >= 0 ? `+${diff}` : `${diff}`;

    let text = `【mdo3】平均GL連動 構造設計用 基礎寸法・根入れ算定書\n`;
    text += `========================================================\n`;
    text += `■ 平均GLレベル差 (設計GL基準): ${diffStr} mm\n`;
    if (diff < 0) {
      text += `  ※平均地盤面が設計GLより ${Math.abs(diff)}mm 低い（地盤下がり）\n`;
    } else if (diff > 0) {
      text += `  ※平均地盤面が設計GLより +${diff}mm 高い（地盤上がり）\n`;
    } else {
      text += `  ※設計GLと平均GLが一致（平坦地）\n`;
    }
    text += `--------------------------------------------------------\n`;
    text += `部材記号 | 用途部位       | 全成D  | 構造立上りH(平均GL) | 構造根入れDf(平均GL) | スラブ天端(平均GL) | 適合判定\n`;
    text += `--------------------------------------------------------\n`;

    state.specs.forEach(s => {
      const standGl = parseInt(s.stand, 10) || 0;
      const embedGl = parseInt(s.embed, 10) || 0;
      const slabGl = s.slab !== undefined ? (parseInt(s.slab, 10) || 0) : 50;

      const hStruct = standGl - diff;
      const dfStruct = embedGl + diff;
      const slabStruct = slabGl - diff;
      const totalD = standGl + embedGl;

      const judge = (hStruct >= 300 && dfStruct >= 120) ? '令38条・告示適合' : '要確認(寸法不足)';

      text += `${s.name.padEnd(8)} | ${s.role.padEnd(12)} | ${String(totalD).padStart(4)}mm | ${String(hStruct).padStart(4)}mm (設計${standGl}) | ${String(dfStruct).padStart(4)}mm (設計${embedGl}) | ${String(slabStruct).padStart(4)}mm | ${judge}\n`;
    });

    text += `========================================================\n`;
    text += `【準拠法令・算定根拠】\n`;
    text += `・建築基準法施行令第38条（基礎立上り高さ: 平均地盤面から300mm以上 / 400mm推奨）\n`;
    text += `・建築基準法告示第1347号（根入れ深さ: べた基礎120mm以上 / 布基礎240mm以上 / 凍結深度以上）\n`;
    text += `・ARCHITREND ZERO / 各種許容応力度計算 基礎属性直接入力対応\n`;
    text += `算定ツール: https://mdo3.com/#freeToolsZone\n`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showCopyToast('📋 構造設計用 基礎寸法（平均GL基準）をコピーしました！');
      }).catch(err => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showCopyToast('📋 構造設計用 基礎寸法（平均GL基準）をコピーしました！');
  }

  function showCopyToast(msg) {
    let toast = document.getElementById('avgGlToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'avgGlToast';
      toast.style.cssText = 'position:fixed; bottom:24px; right:24px; z-index:99999; background:rgba(15,23,42,0.95); border:1px solid #10b981; color:#fff; padding:12px 20px; border-radius:8px; font-size:0.85rem; font-weight:700; box-shadow:0 10px 30px rgba(0,0,0,0.5); display:flex; align-items:center; gap:8px; transform:translateY(100px); opacity:0; transition:all 0.3s ease;';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="material-symbols-outlined" style="color:#10b981;">check_circle</span><span>${msg}</span>`;
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';

    setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 外部公開
  window.AvgGlCalc = {
    render: render,
    getState: () => state,
    setAvgGlDiff: (val) => {
      state.avgGlDiff = val;
      render();
    }
  };

})();
