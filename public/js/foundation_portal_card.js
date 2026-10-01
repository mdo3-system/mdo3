/**
 * foundation_portal_card.js
 * mdo3.com トップページ用「木造ベタ基礎 梁断面図作図＆dt・平均GL自動算定」カード連携スクリプト
 */

import { REBAR_DATA, DEFAULT_BEAMS, DEFAULT_AVG_GL, DEFAULT_SLAB_COMMON, STORAGE_KEY } from './foundation_cad/foundation_constants.js';
import { calcRebarDt, calcBeamHeights, getBarRadius } from './foundation_cad/foundation_calc.js';
import { renderFoundationSvg } from './foundation_cad/foundation_svg.js';

class FoundationPortalCard {
  constructor() {
    this.beam = JSON.parse(JSON.stringify(DEFAULT_BEAMS[0]));
    this.avgGlConfig = JSON.parse(JSON.stringify(DEFAULT_AVG_GL));
    this.slabCommon = JSON.parse(JSON.stringify(DEFAULT_SLAB_COMMON));
  }

  init() {
    this.loadState();
    this.bindEvents();
    this.updateUI();
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.beamList && state.beamList.length) {
          const idx = state.currentBeamIndex || 0;
          this.beam = JSON.parse(JSON.stringify(state.beamList[idx] || state.beamList[0]));
        }
        if (state.avgGlConfig) this.avgGlConfig = state.avgGlConfig;
        if (state.slabCommon) this.slabCommon = state.slabCommon;
      }
    } catch (e) {
      console.warn('Failed to load state in portal card:', e);
    }
  }

  saveState() {
    try {
      let state = {
        beamList: [this.beam],
        currentBeamIndex: 0,
        avgGlConfig: this.avgGlConfig,
        slabCommon: this.slabCommon
      };
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.beamList && parsed.beamList.length) {
          const idx = Math.min(parsed.currentBeamIndex || 0, parsed.beamList.length - 1);
          parsed.beamList[idx] = JSON.parse(JSON.stringify(this.beam));
          parsed.avgGlConfig = this.avgGlConfig;
          parsed.slabCommon = this.slabCommon;
          state = parsed;
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state in portal card:', e);
    }
  }

  bindEvents() {
    // 梁成D クイックボタン
    document.querySelectorAll('.portal-dt-quick-d-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.portal-dt-quick-d-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const dVal = parseInt(btn.dataset.d, 10);
        // 梁成Dから根入れHと天端高を調整 (天端高400固定で根入れH = D - 400 + 10)
        this.beam.embedH = Math.max(dVal - (this.beam.aboveGl || 400) + (this.beam.levelerT || 10), 100);
        const inpEmbed = document.getElementById('portalBeamEmbed');
        if (inpEmbed) inpEmbed.value = this.beam.embedH;
        this.updateUI();
        this.saveState();
      });
    });

    // 平均GL差 クイックボタン
    document.querySelectorAll('.portal-avg-gl-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.portal-avg-gl-quick-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const diffVal = parseInt(btn.dataset.diff, 10);
        this.avgGlConfig.diff = diffVal;
        const inpDiff = document.getElementById('portalAvgGlDiff');
        if (inpDiff) inpDiff.value = diffVal;
        this.updateUI();
        this.saveState();
      });
    });

    // 仕様ベース
    const selSpec = document.getElementById('portalBeamSpec');
    if (selSpec) {
      selSpec.addEventListener('change', (e) => {
        this.beam.baseSpec = e.target.value;
        this.updateBotSpecOptions();
        this.updateUI();
        this.saveState();
      });
    }

    // 底盤幅形式
    const selToe = document.getElementById('portalToeType');
    if (selToe) {
      selToe.addEventListener('change', (e) => {
        this.beam.baseToeWidthType = e.target.value;
        this.updateBotSpecOptions();
        this.updateUI();
        this.saveState();
      });
    }

    // 立上り幅
    const selStemW = document.getElementById('portalStemW');
    if (selStemW) {
      selStemW.addEventListener('change', (e) => {
        this.beam.stemW = parseInt(e.target.value, 10);
        this.updateUI();
        this.saveState();
      });
    }

    // 天端高
    const inpAboveGl = document.getElementById('portalAboveGl');
    if (inpAboveGl) {
      inpAboveGl.addEventListener('input', (e) => {
        this.beam.aboveGl = parseInt(e.target.value, 10) || 0;
        this.updateUI();
        this.saveState();
      });
    }

    // 根入れ深さ
    const inpEmbed = document.getElementById('portalBeamEmbed');
    if (inpEmbed) {
      inpEmbed.addEventListener('input', (e) => {
        this.beam.embedH = parseInt(e.target.value, 10) || 0;
        this.updateUI();
        this.saveState();
      });
    }

    // 平均GL差 直接入力
    const inpDiff = document.getElementById('portalAvgGlDiff');
    if (inpDiff) {
      inpDiff.addEventListener('input', (e) => {
        this.avgGlConfig.diff = parseInt(e.target.value, 10) || 0;
        this.updateUI();
        this.saveState();
      });
    }

    // 上主筋
    const selTop = document.getElementById('portalTopSpec');
    if (selTop) {
      selTop.addEventListener('change', (e) => {
        this.beam.topSpec = e.target.value;
        this.updateUI();
        this.saveState();
      });
    }

    // 下主筋
    const selBot = document.getElementById('portalBotSpec');
    if (selBot) {
      selBot.addEventListener('change', (e) => {
        this.beam.botSpec = e.target.value;
        this.updateUI();
        this.saveState();
      });
    }

    // スターラップ
    const selStp = document.getElementById('portalStirrup');
    if (selStp) {
      selStp.addEventListener('change', (e) => {
        this.beam.stirrupBar = e.target.value;
        this.updateUI();
        this.saveState();
      });
    }

    // スターラップ見込み加算トグル
    const btnStpTop = document.getElementById('portalBtnStpTop');
    if (btnStpTop) {
      btnStpTop.addEventListener('click', () => {
        this.beam.incTopStirrup = !this.beam.incTopStirrup;
        btnStpTop.classList.toggle('active', this.beam.incTopStirrup !== false);
        this.updateUI();
        this.saveState();
      });
    }

    const btnStpBot = document.getElementById('portalBtnStpBot');
    if (btnStpBot) {
      btnStpBot.addEventListener('click', () => {
        this.beam.incBotStirrup = !this.beam.incBotStirrup;
        btnStpBot.classList.toggle('active', this.beam.incBotStirrup !== false);
        this.updateUI();
        this.saveState();
      });
    }

    // スラブ配筋方式
    const selSlabArr = document.getElementById('portalSlabArrangement');
    if (selSlabArr) {
      selSlabArr.addEventListener('change', (e) => {
        this.beam.slabArrangement = e.target.value;
        this.updateUI();
        this.saveState();
      });
    }

    // スラブ厚
    const inpSlabT = document.getElementById('portalSlabT');
    if (inpSlabT) {
      inpSlabT.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10) || 180;
        this.beam.slabT = val;
        // スラブ厚180mm未満時はシングル配筋へ自動補正
        if (val < 180 && this.beam.slabArrangement === 'double') {
          this.beam.slabArrangement = 'single';
          if (selSlabArr) selSlabArr.value = 'single';
        }
        this.updateUI();
        this.saveState();
      });
    }

    // スラブ短辺筋
    const selSlabShort = document.getElementById('portalSlabShortBar');
    if (selSlabShort) {
      selSlabShort.addEventListener('change', (e) => {
        this.slabCommon.shortBar = e.target.value;
        this.updateUI();
        this.saveState();
      });
    }

    // スラブ長辺筋
    const selSlabLong = document.getElementById('portalSlabLongBar');
    if (selSlabLong) {
      selSlabLong.addEventListener('change', (e) => {
        this.slabCommon.longBar = e.target.value;
        this.updateUI();
        this.saveState();
      });
    }

    // PROモード遷移リンククリック時に状態保存
    document.querySelectorAll('.btn-open-cad-pro, .btn-pro-cta').forEach(link => {
      link.addEventListener('click', () => {
        this.saveState();
      });
    });

    // テキストコピー
    const btnCopy = document.getElementById('portalBtnCopyDt');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => this.copyResultText());
    }

    // リセット
    const btnReset = document.getElementById('portalBtnReset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.beam = JSON.parse(JSON.stringify(DEFAULT_BEAMS[0]));
        this.avgGlConfig = JSON.parse(JSON.stringify(DEFAULT_AVG_GL));
        this.slabCommon = JSON.parse(JSON.stringify(DEFAULT_SLAB_COMMON));
        this.updateBotSpecOptions();
        this.updateUI();
        this.saveState();
      });
    }
  }

  updateBotSpecOptions() {
    const select = document.getElementById('portalBotSpec');
    if (!select) return;
    const is250mm = (this.beam.baseSpec === 'FG1') && (this.beam.baseToeWidthType === 'fixed250');
    select.innerHTML = '';

    let options = [];
    if (is250mm) {
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
        { v: 'D13+2段D13', t: '2段筋 D13 + 2段D13' },
        { v: 'D13+2段D16', t: '2段筋 D13 + 2段D16' },
        { v: 'D16+2段D13', t: '2段筋 D16 + 2段D13' },
        { v: 'D16+2段D16', t: '2段筋 D16 + 2段D16' }
      ];
    }

    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.v;
      o.textContent = opt.t;
      select.appendChild(o);
    });

    const valid = options.map(o => o.v);
    if (!valid.includes(this.beam.botSpec)) {
      this.beam.botSpec = is250mm ? '3-D13' : '1-D13';
    }
    select.value = this.beam.botSpec;
  }

  updateUI() {
    // フォーム同期
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    setVal('portalBeamSpec', this.beam.baseSpec || 'FG1');
    setVal('portalToeType', this.beam.baseToeWidthType || 'matchStem');
    setVal('portalStemW', this.beam.stemW || 150);
    setVal('portalAboveGl', this.beam.aboveGl || 400);
    setVal('portalBeamEmbed', this.beam.embedH || 500);
    setVal('portalAvgGlDiff', this.avgGlConfig.diff || 0);
    setVal('portalTopSpec', this.beam.topSpec || '1-D13');
    setVal('portalBotSpec', this.beam.botSpec || '1-D13');
    setVal('portalStirrup', this.beam.stirrupBar || 'D10@200');

    // スラブ設定同期
    setVal('portalSlabArrangement', this.beam.slabArrangement || 'single');
    setVal('portalSlabT', this.beam.slabT || 180);
    setVal('portalSlabShortBar', this.slabCommon.shortBar || 'D13@150');
    setVal('portalSlabLongBar', this.slabCommon.longBar || 'D10@300');

    // 底盤幅UI表示切替
    const wrapToe = document.getElementById('portalWrapToeType');
    if (wrapToe) wrapToe.style.display = (this.beam.baseSpec === 'FG1') ? 'block' : 'none';

    // トグル状態
    const btnStpTop = document.getElementById('portalBtnStpTop');
    if (btnStpTop) btnStpTop.classList.toggle('active', this.beam.incTopStirrup !== false);
    const btnStpBot = document.getElementById('portalBtnStpBot');
    if (btnStpBot) btnStpBot.classList.toggle('active', this.beam.incBotStirrup !== false);

    // 計算
    const heights = calcBeamHeights(this.beam, this.avgGlConfig.diff);
    const isMatchStem = (this.beam.baseToeWidthType === 'matchStem');
    const dtTopInfo = calcRebarDt(this.beam.topSpec, true, isMatchStem, this.beam.stirrupBar, this.beam.incTopStirrup, false);
    const dtBotInfo = calcRebarDt(this.beam.botSpec, false, isMatchStem, this.beam.stirrupBar, this.beam.incBotStirrup, false);

    const dEffTop = heights.concD - dtTopInfo.dt;
    const dEffBot = heights.concD - dtBotInfo.dt;

    // 数値表示更新
    const setTxt = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    setTxt('portalResConcD', `${heights.concD} mm`);
    setTxt('portalResTotalH', `${heights.totalH} mm`);
    setTxt('portalResTopDt', `${(Math.round(dtTopInfo.dt * 10) / 10).toFixed(1)} mm`);
    setTxt('portalResTopDeff', `${(Math.round(dEffTop * 10) / 10).toFixed(1)} mm`);
    setTxt('portalResBotDt', `${(Math.round(dtBotInfo.dt * 10) / 10).toFixed(1)} mm`);
    setTxt('portalResBotDeff', `${(Math.round(dEffBot * 10) / 10).toFixed(1)} mm`);

    const diff = this.avgGlConfig.diff || 0;
    const diffSign = diff >= 0 ? `+${diff}` : `${diff}`;
    setTxt('portalResAvgGlDiff', `${diffSign} mm`);
    setTxt('portalResTopAvgGl', `${heights.topAvgGl >= 0 ? '+' : ''}${heights.topAvgGl} mm`);
    setTxt('portalResBotAvgGl', `${heights.botAvgGl >= 0 ? '+' : ''}${heights.botAvgGl} mm`);

    // SVGプレビューのレンダリング (PROモードと統一された原点とスケールで全体を表示)
    const previewGroup = document.getElementById('portalSvgGroup');
    if (previewGroup) {
      previewGroup.setAttribute('transform', 'translate(-100, -30) scale(1.02)');
      renderFoundationSvg(previewGroup, this.beam, this.avgGlConfig, this.slabCommon, {
        showTable: true,
        originX: 380,
        originY: 140
      });
    }
  }

  copyResultText() {
    const heights = calcBeamHeights(this.beam, this.avgGlConfig.diff);
    const isMatchStem = (this.beam.baseToeWidthType === 'matchStem');
    const dtTop = calcRebarDt(this.beam.topSpec, true, isMatchStem, this.beam.stirrupBar, this.beam.incTopStirrup, false);
    const dtBot = calcRebarDt(this.beam.botSpec, false, isMatchStem, this.beam.stirrupBar, this.beam.incBotStirrup, false);

    const dEffTop = heights.concD - dtTop.dt;
    const dEffBot = heights.concD - dtBot.dt;

    const diff = this.avgGlConfig.diff || 0;
    const diffSign = diff >= 0 ? `+${diff}` : `${diff}`;

    const text = `【木造ベタ基礎 梁断面図作図＆dt・平均GL自動算定 根拠書】
■ 基礎梁符号: ${this.beam.title || this.beam.id} (${this.beam.baseSpec === 'FG1' ? '外周・ハンチ仕様' : '内部T型仕様'})
■ 躯体寸法:
  - 基礎梁成 D (レベラー抜): ${heights.concD} mm (全高: ${heights.totalH} mm, レベラー: ${this.beam.levelerT || 10} mm)
  - 立上り幅: ${this.beam.stemW} mm
  - GL上天端高: +${heights.aboveGl} mm / 根入れ深さ ※H: -${heights.embedH} mm
■ 平均GL連動 (設計GL基準 ${diffSign} mm):
  - 立上り天端 (平均GL基準): ${heights.topAvgGl >= 0 ? '+' : ''}${heights.topAvgGl} mm
  - 根入れ底面 (平均GL基準): ${heights.botAvgGl >= 0 ? '+' : ''}${heights.botAvgGl} mm
■ 重心距離 dt & 有効梁成 d 算定結果:
  - 上主筋 (${this.beam.topSpec}): 重心距離 dt = ${(Math.round(dtTop.dt * 10) / 10).toFixed(1)} mm / 有効梁成 d = ${(Math.round(dEffTop * 10) / 10).toFixed(1)} mm
  - 下主筋 (${this.beam.botSpec}): 重心距離 dt = ${(Math.round(dtBot.dt * 10) / 10).toFixed(1)} mm / 有効梁成 d = ${(Math.round(dEffBot * 10) / 10).toFixed(1)} mm
  - スターラップ: ${this.beam.stirrupBar} (上端加算: ${this.beam.incTopStirrup!==false?'有':'無'}, 下端加算: ${this.beam.incBotStirrup!==false?'有':'無'})
※ 算定元: mdo3.com 木造基礎梁断面作図・dt自動算定ツール (https://mdo3.com/)`;

    navigator.clipboard.writeText(text).then(() => {
      alert('dt・平均GL算定根拠テキストをクリップボードにコピーしました！');
    }).catch(err => {
      console.error('Copy failed:', err);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const card = new FoundationPortalCard();
  card.init();
});
