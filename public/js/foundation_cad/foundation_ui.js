/**
 * foundation_ui.js
 * 基礎梁CAD プロモード UIコントローラー＆イベントバインディング
 */

import { foundationState } from './foundation_state.js';
import { renderFoundationSvg } from './foundation_svg.js';
import { generateAllBeamsDxf } from './foundation_dxf.js';

export class FoundationCadUI {
  constructor() {
    this.view = {
      zoom: 0.82,
      panX: -10,
      panY: 30,
      isPanning: false,
      startX: 0,
      startY: 0
    };
  }

  init() {
    foundationState.autoLoad();
    this.initPanZoom();
    this.bindEvents();
    this.renderTabs();
    this.loadCurrentBeamToInputs();
    this.draw();

    // 状態変更通知の購読
    foundationState.subscribe((eventType) => {
      if (eventType === 'changeBeam' || eventType === 'addBeam' || eventType === 'cloneBeam' || eventType === 'deleteBeam' || eventType === 'loadState') {
        this.renderTabs();
        this.loadCurrentBeamToInputs();
      }
      this.draw();
    });
  }

  setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  bindEvents() {
    // 符号追加
    const btnAdd = document.getElementById('btnAddNewBeam');
    if (btnAdd) btnAdd.onclick = () => foundationState.addNewBeam();

    const btnClone = document.getElementById('btnCloneBeam');
    if (btnClone) btnClone.onclick = () => foundationState.cloneCurrentBeam();

    const btnDel = document.getElementById('btnDeleteBeam');
    if (btnDel) {
      btnDel.onclick = () => {
        const cur = foundationState.getCurrentBeam();
        if (!confirm(`${cur.title || cur.id} を削除しますか？`)) return;
        foundationState.deleteCurrentBeam();
      };
    }

    // JSON保存・復元
    const btnSave = document.getElementById('btnSaveProjectJSON');
    if (btnSave) btnSave.onclick = () => foundationState.exportJSON();

    const fileImport = document.getElementById('fileImportJson');
    if (fileImport) {
      fileImport.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (foundationState.importJSON(evt.target.result)) {
            alert('プロジェクト設定を正常に復元しました。');
          } else {
            alert('有効な基礎梁設定データが含まれていません。');
          }
        };
        reader.readAsText(file);
        e.target.value = '';
      };
    }

    // DXFエクスポート
    const btnDxf = document.getElementById('btnExportAllDXF');
    if (btnDxf) {
      btnDxf.onclick = () => {
        generateAllBeamsDxf(foundationState.beamList, foundationState.avgGlConfig);
      };
    }

    // SVGエクスポート
    const btnSvg = document.getElementById('btnExportSVG');
    if (btnSvg) {
      btnSvg.onclick = () => this.exportCurrentSvg();
    }

    // ズームリセット
    const btnResetView = document.getElementById('btnResetView');
    if (btnResetView) {
      btnResetView.onclick = () => this.resetView();
    }

    // 入力項目変更バインド
    this.bindInputs();
  }

  bindInputs() {
    const onInput = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', (e) => fn(e.target.value, e.target));
    };
    const onChange = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', (e) => fn(e.target.value, e.target));
    };

    // 1. 仕様ベース
    onChange('beamBaseSpec', (val) => {
      const b = foundationState.getCurrentBeam();
      b.baseSpec = val;
      const is250mm = (val === 'FG1') && (b.baseToeWidthType === 'fixed250');
      b.botSpec = this.updateBotSpecOptions(is250mm, b.stemArrangement === 'double', b.botSpec);
      foundationState.updateCurrentBeamParam('baseSpec', val);
      this.renderTabs();
      this.loadCurrentBeamToInputs();
    });

    onChange('stemArrangement', (val) => {
      const b = foundationState.getCurrentBeam();
      b.stemArrangement = val;
      const is250mm = (b.baseSpec === 'FG1') && (b.baseToeWidthType === 'fixed250');
      b.topSpec = this.updateTopSpecOptions(val === 'double', b.topSpec);
      b.botSpec = this.updateBotSpecOptions(is250mm, val === 'double', b.botSpec);
      foundationState.updateCurrentBeamParam('stemArrangement', val);
      this.draw();
    });

    onChange('baseToeWidthType', (val) => {
      const b = foundationState.getCurrentBeam();
      b.baseToeWidthType = val;
      const is250mm = (b.baseSpec === 'FG1') && (val === 'fixed250');
      b.botSpec = this.updateBotSpecOptions(is250mm, b.stemArrangement === 'double', b.botSpec);
      foundationState.updateCurrentBeamParam('baseToeWidthType', val);
      this.renderTabs();
      this.draw();
    });

    // 2. 平均GL
    const chkAvgGl = document.getElementById('chkShowAvgGl');
    if (chkAvgGl) {
      chkAvgGl.onchange = (e) => {
        foundationState.updateAvgGlParam('show', e.target.checked);
      };
    }
    onInput('avgGlDiff', (val) => {
      const num = parseInt(val, 10);
      const txt = document.getElementById('txtAvgGlDiff');
      if (txt) txt.textContent = (num >= 0 ? '+' : '') + num + ' mm';
      foundationState.updateAvgGlParam('diff', num);
    });

    // 3. 躯体寸法
    onInput('aboveGl', (val) => {
      const num = parseInt(val, 10);
      const txt = document.getElementById('txtAboveGl');
      if (txt) txt.textContent = num + ' mm';
      foundationState.updateCurrentBeamParam('aboveGl', num);
    });

    onInput('embedH', (val) => {
      const num = parseInt(val, 10);
      const txt = document.getElementById('txtEmbed');
      if (txt) txt.textContent = num + ' mm';
      foundationState.updateCurrentBeamParam('embedH', num);
    });

    onInput('glToSlab', (val) => {
      const num = parseInt(val, 10);
      const txt = document.getElementById('txtGlToSlab');
      if (txt) txt.textContent = '+' + num + ' mm';
      foundationState.updateCurrentBeamParam('glToSlab', num);
    });

    onChange('stemW', (val) => {
      const num = parseInt(val, 10);
      this.onDimensionChange('stemW', num);
    });

    onInput('slabT', (val) => {
      const num = parseInt(val, 10);
      const txt = document.getElementById('txtSlabT');
      if (txt) txt.textContent = num + ' mm';
      this.onDimensionChange('slabT', num);
    });

    onInput('levelerT', (val) => {
      const num = parseInt(val, 10);
      const txt = document.getElementById('txtLeveler');
      if (txt) txt.textContent = num + ' mm';
      foundationState.updateCurrentBeamParam('levelerT', num);
    });

    // 4. 主筋・スターラップ
    onChange('topSpec', (val) => {
      foundationState.updateCurrentBeamParam('topSpec', val);
    });
    onChange('botSpec', (val) => {
      foundationState.updateCurrentBeamParam('botSpec', val);
    });
    onChange('stirrupBar', (val) => {
      foundationState.updateCurrentBeamParam('stirrupBar', val);
    });
    onChange('incTopStirrup', (val) => {
      foundationState.updateCurrentBeamParam('incTopStirrup', val === 'true');
    });
    onChange('incBotStirrup', (val) => {
      foundationState.updateCurrentBeamParam('incBotStirrup', val === 'true');
    });

    // 5. スラブ配筋
    onChange('slabArrangement', (val) => {
      foundationState.updateCurrentBeamParam('slabArrangement', val);
    });
    onChange('slabShortBar', (val) => {
      foundationState.updateSlabParam(val, null);
    });
    onChange('slabLongBar', (val) => {
      foundationState.updateSlabParam(null, val);
    });
  }

  onDimensionChange(key, val) {
    const b = foundationState.getCurrentBeam();
    if (!b) return;
    b[key] = val;

    b.stemArrangement = this.updateStemArrangementUI(b.stemW, b.stemArrangement);
    b.slabArrangement = this.updateSlabArrangementUI(b.slabT, b.slabArrangement);

    const is250mm = (b.baseSpec === 'FG1') && (b.baseToeWidthType === 'fixed250');
    b.topSpec = this.updateTopSpecOptions(b.stemArrangement === 'double', b.topSpec);
    b.botSpec = this.updateBotSpecOptions(is250mm, b.stemArrangement === 'double', b.botSpec);

    foundationState.autoSave();
    this.renderTabs();
    this.draw();
  }

  updateStemArrangementUI(stemW, currentVal) {
    const isAllowed = (stemW >= 180);
    const opt = document.getElementById('optDoubleStem');
    const notice = document.getElementById('txtDoubleStemDisabled');
    const sel = document.getElementById('stemArrangement');

    if (opt) opt.disabled = !isAllowed;
    if (notice) {
      if (!isAllowed) notice.classList.remove('hidden');
      else notice.classList.add('hidden');
    }

    if (!isAllowed && currentVal === 'double') {
      if (sel) sel.value = 'single';
      return 'single';
    }
    if (sel) sel.value = currentVal || 'single';
    return currentVal || 'single';
  }

  updateSlabArrangementUI(slabT, currentVal) {
    const isAllowed = (slabT >= 180);
    const opt = document.getElementById('optDoubleSlab');
    const notice = document.getElementById('txtDoubleSlabDisabled');
    const sel = document.getElementById('slabArrangement');

    if (opt) opt.disabled = !isAllowed;
    if (notice) {
      if (!isAllowed) notice.classList.remove('hidden');
      else notice.classList.add('hidden');
    }

    if (!isAllowed && currentVal === 'double') {
      if (sel) sel.value = 'single';
      return 'single';
    }
    if (sel) sel.value = currentVal || 'single';
    return currentVal || 'single';
  }

  updateTopSpecOptions(isDoubleStem, currentVal) {
    const select = document.getElementById('topSpec');
    if (!select) return currentVal;
    select.innerHTML = '';

    let options = [];
    if (isDoubleStem) {
      options = [
        { v: '2-D13', t: '2-D13 (W配筋各1本)' },
        { v: '2-D16', t: '2-D16 (W配筋各1本)' },
        { v: '2-D13+2段2-D13', t: '2段筋 2-D13 + 2段2-D13' },
        { v: '2-D13+2段2-D16', t: '2段筋 2-D13 + 2段2-D16' },
        { v: '2-D16+2段2-D16', t: '2段筋 2-D16 + 2段2-D16' }
      ];
    } else {
      options = [
        { v: '1-D13', t: '1-D13 (1本)' },
        { v: '2-D13', t: '2-D13 (縦2段)' },
        { v: '1-D16', t: '1-D16 (1本)' },
        { v: '2-D16', t: '2-D16 (縦2段)' },
        { v: 'D13+D16', t: 'D13 + 2段D16' }
      ];
    }

    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.v;
      o.textContent = opt.t;
      select.appendChild(o);
    });

    let targetVal = currentVal;
    const validValues = options.map(o => o.v);
    if (!validValues.includes(targetVal)) {
      targetVal = isDoubleStem ? '2-D13' : '1-D13';
    }
    select.value = targetVal;
    return targetVal;
  }

  updateBotSpecOptions(is250mm, isDoubleStem, currentVal) {
    const select = document.getElementById('botSpec');
    if (!select) return currentVal;
    select.innerHTML = '';

    let options = [];
    if (isDoubleStem) {
      options = [
        { v: '2-D13', t: '2-D13 (W配筋各1本)' },
        { v: '2-D16', t: '2-D16 (W配筋各1本)' },
        { v: '2-D13+2段2-D13', t: '2段筋 2-D13 + 2段2-D13' },
        { v: '2-D13+2段2-D16', t: '2段筋 2-D13 + 2段2-D16' },
        { v: '2-D16+2段2-D16', t: '2段筋 2-D16 + 2段2-D16' }
      ];
    } else if (is250mm) {
      options = [
        { v: '1-D13', t: '1-D13 (並列1本)' },
        { v: '2-D13', t: '2-D13 (並列2本)' },
        { v: '3-D13', t: '3-D13 (並列3本)' },
        { v: '1-D16', t: '1-D16 (並列1本)' },
        { v: '2-D16', t: '2-D16 (並列2本)' },
        { v: '3-D16', t: '3-D16 (並列3本)' }
      ];
    } else {
      options = [
        { v: '1-D13', t: '1-D13 (1段・1本)' },
        { v: '1-D16', t: '1-D16 (1段・1本)' },
        { v: 'D13+2段D13', t: '2段筋 D13 + 2段D13 (上下各1本)' },
        { v: 'D13+2段D16', t: '2段筋 D13 + 2段D16 (1段D13+2段D16)' },
        { v: 'D16+2段D13', t: '2段筋 D16 + 2段D13 (1段D16+2段D13)' },
        { v: 'D16+2段D16', t: '2段筋 D16 + 2段D16 (上下各1本)' }
      ];
    }

    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.v;
      o.textContent = opt.t;
      select.appendChild(o);
    });

    let targetVal = currentVal;
    const validValues = options.map(o => o.v);
    if (!validValues.includes(targetVal)) {
      if (isDoubleStem) targetVal = '2-D13';
      else if (is250mm) targetVal = '3-D13';
      else targetVal = '1-D13';
    }
    select.value = targetVal;
    return targetVal;
  }

  renderTabs() {
    const container = document.getElementById('beamTabsContainer');
    if (!container) return;
    container.innerHTML = '';
    foundationState.beamList.forEach((beam, index) => {
      const btn = document.createElement('button');
      const isActive = index === foundationState.currentBeamIndex;
      btn.className = `px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
        isActive 
          ? 'bg-blue-600 text-white shadow' 
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`;
      const typeStr = beam.baseSpec === 'FG1' ? (beam.baseToeWidthType === 'matchStem' ? '底盤同寸' : '底盤250') : '内部';
      btn.innerHTML = `<span>${beam.title || beam.id}</span><span class="text-[10px] font-normal opacity-75">(${typeStr})</span>`;
      btn.onclick = () => foundationState.setCurrentBeamIndex(index);
      container.appendChild(btn);
    });

    const btnDel = document.getElementById('btnDeleteBeam');
    if (btnDel) {
      if (foundationState.beamList.length > 1) {
        btnDel.classList.remove('hidden');
      } else {
        btnDel.classList.add('hidden');
      }
    }
  }

  loadCurrentBeamToInputs() {
    const b = foundationState.getCurrentBeam();
    if (!b) return;

    const typeStr = b.baseSpec === 'FG1' ? 'FG1仕様' : 'FG2仕様';
    const lbl = document.getElementById('lblCurrentSign');
    if (lbl) lbl.textContent = `${b.title || b.id} (${typeStr})`;

    this.setVal('beamBaseSpec', b.baseSpec || 'FG1');
    this.setVal('baseToeWidthType', b.baseToeWidthType || 'matchStem');
    this.setVal('stemW', b.stemW || 150);
    this.setVal('slabT', b.slabT || 180);
    const txtSlab = document.getElementById('txtSlabT');
    if (txtSlab) txtSlab.textContent = (b.slabT || 180) + ' mm';

    b.stemArrangement = this.updateStemArrangementUI(b.stemW, b.stemArrangement || 'single');
    b.slabArrangement = this.updateSlabArrangementUI(b.slabT, b.slabArrangement || 'double');

    this.setVal('aboveGl', b.aboveGl !== undefined ? b.aboveGl : 400);
    this.setVal('embedH', b.embedH !== undefined ? b.embedH : 500);
    this.setVal('glToSlab', b.glToSlab !== undefined ? b.glToSlab : 50);
    this.setVal('levelerT', b.levelerT !== undefined ? b.levelerT : 10);
    this.setVal('stirrupBar', b.stirrupBar || 'D10@200');
    this.setVal('incTopStirrup', (b.incTopStirrup !== false).toString());
    this.setVal('incBotStirrup', (b.incBotStirrup !== false).toString());

    const is250mm = (b.baseSpec === 'FG1') && (b.baseToeWidthType === 'fixed250');
    b.topSpec = this.updateTopSpecOptions(b.stemArrangement === 'double', b.topSpec);
    b.botSpec = this.updateBotSpecOptions(is250mm, b.stemArrangement === 'double', b.botSpec);

    this.setVal('slabShortBar', foundationState.slabCommon.shortBar);
    this.setVal('slabLongBar', foundationState.slabCommon.longBar);

    const chk = document.getElementById('chkShowAvgGl');
    if (chk) chk.checked = foundationState.avgGlConfig.show;
    this.setVal('avgGlDiff', foundationState.avgGlConfig.diff);
    const txtDiff = document.getElementById('txtAvgGlDiff');
    if (txtDiff) txtDiff.textContent = (foundationState.avgGlConfig.diff >= 0 ? '+' : '') + foundationState.avgGlConfig.diff + ' mm';

    const wrapToe = document.getElementById('wrapBaseToeWidth');
    if (wrapToe) wrapToe.style.display = (b.baseSpec === 'FG1') ? 'block' : 'none';
  }

  draw() {
    const b = foundationState.getCurrentBeam();
    if (!b) return;

    const aboveGl = (typeof b.aboveGl === 'number') ? b.aboveGl : 400;
    const embedH = (typeof b.embedH === 'number') ? b.embedH : 500;
    const totalH = aboveGl + embedH;
    const concD = Math.max(totalH - (b.levelerT || 0), 100);

    const setTxt = (id, str) => {
      const el = document.getElementById(id);
      if (el) el.textContent = str;
    };
    setTxt('lblConcD', concD);
    setTxt('txtAboveGl', aboveGl + ' mm');
    setTxt('txtEmbed', embedH + ' mm');
    setTxt('txtGlToSlab', '+' + (b.glToSlab || 50) + ' mm');
    setTxt('txtLeveler', (b.levelerT || 10) + ' mm');
    setTxt('txtSlabT', (b.slabT || 180) + ' mm');

    renderFoundationSvg('viewportGroup', b, foundationState.avgGlConfig, foundationState.slabCommon, {
      showTable: true
    });
    this.applyTransform();
  }

  // パン・ズーム操作
  resetView() {
    this.view.zoom = 0.82;
    this.view.panX = -10;
    this.view.panY = 30;
    this.applyTransform();
  }

  applyTransform() {
    const g = document.getElementById('viewportGroup');
    if (g) {
      g.setAttribute('transform', `translate(${this.view.panX}, ${this.view.panY}) scale(${this.view.zoom})`);
    }
  }

  initPanZoom() {
    const el = document.getElementById('viewerMain');
    if (!el) return;
    el.addEventListener('mousedown', (e) => {
      this.view.isPanning = true;
      this.view.startX = e.clientX - this.view.panX;
      this.view.startY = e.clientY - this.view.panY;
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.view.isPanning) return;
      this.view.panX = e.clientX - this.view.startX;
      this.view.panY = e.clientY - this.view.startY;
      this.applyTransform();
    });
    window.addEventListener('mouseup', () => { this.view.isPanning = false; });
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.88;
      this.view.zoom = Math.min(Math.max(this.view.zoom * factor, 0.3), 3.0);
      this.applyTransform();
    }, { passive: false });
  }

  exportCurrentSvg() {
    const svg = document.getElementById('cadSvg');
    const b = foundationState.getCurrentBeam();

    const cloneSvg = svg.cloneNode(true);
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("width", "100%");
    bgRect.setAttribute("height", "100%");
    bgRect.setAttribute("fill", "#080c14");
    cloneSvg.insertBefore(bgRect, cloneSvg.firstChild);

    const blob = new Blob([cloneSvg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Foundation_Beam_${b.title || b.id}_Section.svg`;
    a.click();
  }
}
