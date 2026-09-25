/**
 * public/js/dt_calc.js
 * 
 * 木造基礎用 有効基礎梁成・重心距離 dt 自動算出ツール (完全無償・実務審査対応)
 * - 木造住宅構造計算規準 (グレー本) / 建築基準法施行令第82条 対応
 * - 木造基礎専用: 主筋上下各1本・2段筋各1本 (または無し) の超短縮ワンクリック算定
 * - アーキトレンド (ARCHITREND ZERO) 基礎梁断面・dt設定連携
 */

(function() {
  'use strict';

  // 鉄筋データ（木造基礎梁実務: D13 / D16 / D19）
  const REBAR_DATA = {
    13: { name: 'D13', dia: 13, area: 1.27 },
    16: { name: 'D16', dia: 16, area: 1.99 },
    19: { name: 'D19', dia: 19, area: 2.87 }
  };

  document.addEventListener('DOMContentLoaded', () => {
    initDtCalc();
  });

  function initDtCalc() {
    const beamHeightInput = document.getElementById('dtBeamHeight');
    const topBar1Dia = document.getElementById('dtTopBar1Dia');
    const topBar2Dia = document.getElementById('dtTopBar2Dia');
    const botBar1Dia = document.getElementById('dtBotBar1Dia');
    const botBar2Dia = document.getElementById('dtBotBar2Dia');

    const coverTopInput = document.getElementById('dtCoverTop');
    const coverBotInput = document.getElementById('dtCoverBot');
    const stpDiaInput = document.getElementById('dtStpDia');

    const btnCopyDtResult = document.getElementById('btnCopyDtResult');
    const btnResetDt = document.getElementById('btnResetDt');

    // クイック梁成選択ボタン
    const quickDButtons = document.querySelectorAll('.dt-quick-d-btn');

    if (!beamHeightInput) return;

    // 全入力変更イベント監視
    const inputs = [
      beamHeightInput, topBar1Dia, topBar2Dia,
      botBar1Dia, botBar2Dia,
      coverTopInput, coverBotInput, stpDiaInput
    ];

    inputs.forEach(el => {
      if (el) {
        el.addEventListener('input', calculate);
        el.addEventListener('change', calculate);
      }
    });

    if (quickDButtons) {
      quickDButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const dVal = btn.getAttribute('data-d');
          if (dVal && beamHeightInput) {
            beamHeightInput.value = dVal;
            quickDButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            calculate();
          }
        });
      });
    }

    if (btnCopyDtResult) {
      btnCopyDtResult.addEventListener('click', copyResultText);
    }

    if (btnResetDt) {
      btnResetDt.addEventListener('click', () => {
        beamHeightInput.value = 640;
        if (topBar1Dia) topBar1Dia.value = "13";
        if (topBar2Dia) topBar2Dia.value = "0"; // 2段筋なし
        if (botBar1Dia) botBar1Dia.value = "13";
        if (botBar2Dia) botBar2Dia.value = "16"; // 2段筋D16
        if (stpDiaInput) stpDiaInput.value = "10";
        if (coverTopInput) coverTopInput.value = "40";
        if (coverBotInput) coverBotInput.value = "60";
        quickDButtons.forEach(b => {
          if (b.getAttribute('data-d') === '640') b.classList.add('active');
          else b.classList.remove('active');
        });
        calculate();
      });
    }

    // 初回計算
    calculate();
  }

  function calculate() {
    const D = parseFloat(document.getElementById('dtBeamHeight')?.value) || 640;
    const coverTop = parseFloat(document.getElementById('dtCoverTop')?.value) || 40;
    const coverBot = parseFloat(document.getElementById('dtCoverBot')?.value) || 60;
    const stpD = parseFloat(document.getElementById('dtStpDia')?.value) || 10;

    const t1D = parseFloat(document.getElementById('dtTopBar1Dia')?.value) || 13;
    const t2D = parseFloat(document.getElementById('dtTopBar2Dia')?.value) || 0; // 0なら2段筋なし

    const b1D = parseFloat(document.getElementById('dtBotBar1Dia')?.value) || 13;
    const b2D = parseFloat(document.getElementById('dtBotBar2Dia')?.value) || 0; // 0なら2段筋なし

    // 上主筋の計算 (木造基礎: 1段目1本、2段目1本または0本)
    const topRes = calcLayer(coverTop, stpD, t1D, t2D, D);
    // 下主筋の計算 (木造基礎: 1段目1本、2段目1本または0本)
    const botRes = calcLayer(coverBot, stpD, b1D, b2D, D);

    // 画面への描画
    renderResults(topRes, botRes, D);
  }

  /**
   * 木造基礎梁 1層/2層配筋 dt算定
   * @param {number} cover かぶり厚さ (上端40mm / 下端60mm)
   * @param {number} stpDia あばら筋径 (D10: 10mm)
   * @param {number} bar1Dia 1段筋径 (D13/D16/D19)
   * @param {number} bar2Dia 2段筋径 (0: なし, 13/16/19: 1本)
   * @param {number} D 基礎梁成 (mm)
   */
  function calcLayer(cover, stpDia, bar1Dia, bar2Dia, D) {
    // 1段筋中心位置 d1 = かぶり厚 + STP呼び径 + 主筋1径 / 2
    const d1 = cover + stpDia + (bar1Dia / 2.0);

    let d2 = null;
    let gap = null;
    let dtExact = d1;
    const hasSecondLayer = (bar2Dia > 0);

    if (hasSecondLayer) {
      // 鉄筋あき(クリアランス) = MAX(25 × 1.25, 1段筋呼び径 × 1.5)
      gap = Math.max(25 * 1.25, bar1Dia * 1.5);
      // 2段筋中心位置 d2 = d1 + 主筋1径/2 + gap + 主筋2径/2
      d2 = d1 + (bar1Dia / 2.0) + gap + (bar2Dia / 2.0);
      
      // 鉄筋断面積比による重心位置算定 (各1本)
      const a1 = REBAR_DATA[bar1Dia]?.area || (Math.PI * Math.pow(bar1Dia / 2, 2) / 100);
      const a2 = REBAR_DATA[bar2Dia]?.area || (Math.PI * Math.pow(bar2Dia / 2, 2) / 100);
      dtExact = (d1 * a1 + d2 * a2) / (a1 + a2);
    } else {
      // 2段筋なし（1段筋のみ）: 重心距離は1段筋中心
      dtExact = d1;
    }

    // 安全側切り上げ (10mm単位)
    const dtRounded = Math.ceil(dtExact / 10.0) * 10;
    // 有効梁成 d = D - dt
    const effectiveD = Math.max(0, D - dtRounded);
    const effectiveDExact = Math.max(0, D - dtExact);

    return {
      d1,
      d2,
      gap,
      dtExact,
      dtRounded,
      effectiveD,
      effectiveDExact,
      hasSecondLayer,
      bar1Dia,
      bar2Dia
    };
  }

  function renderResults(top, bot, D) {
    // 上主筋結果
    setTxt('resTopD1', top.d1.toFixed(1) + ' mm');
    setTxt('resTopD2', top.hasSecondLayer ? (top.d2.toFixed(1) + ' mm') : 'なし (1段筋)');
    setTxt('resTopDtExact', top.dtExact.toFixed(1) + ' mm');
    setTxt('resTopDtRounded', top.dtRounded + ' mm');
    setTxt('resTopEffectiveD', top.effectiveD + ' mm');

    // 下主筋結果
    setTxt('resBotD1', bot.d1.toFixed(1) + ' mm');
    setTxt('resBotD2', bot.hasSecondLayer ? (bot.d2.toFixed(1) + ' mm') : 'なし (1段筋)');
    setTxt('resBotDtExact', bot.dtExact.toFixed(1) + ' mm');
    setTxt('resBotDtRounded', bot.dtRounded + ' mm');
    setTxt('resBotEffectiveD', bot.effectiveD + ' mm');

    // グレー本70mm規定との対比バッジ
    const grayCompTop = document.getElementById('grayCompTop');
    if (grayCompTop) {
      if (top.dtRounded > 70) {
        grayCompTop.className = 'dt-alert-badge warn';
        grayCompTop.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">warning</span> グレー本(70mm)超えのため【dt=${top.dtRounded}mm】で入力`;
      } else {
        grayCompTop.className = 'dt-alert-badge ok';
        grayCompTop.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">check_circle</span> グレー本基準(70mm)以内 (dt=${top.dtRounded}mm)`;
      }
    }

    const grayCompBot = document.getElementById('grayCompBot');
    if (grayCompBot) {
      if (bot.dtRounded > 70) {
        grayCompBot.className = 'dt-alert-badge warn';
        grayCompBot.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">warning</span> 下端かぶり60mmのため【dt=${bot.dtRounded}mm】で設定必須`;
      } else {
        grayCompBot.className = 'dt-alert-badge ok';
        grayCompBot.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">check_circle</span> グレー本基準(70mm)以内 (dt=${bot.dtRounded}mm)`;
      }
    }
  }

  function setTxt(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function copyResultText() {
    const D = document.getElementById('dtBeamHeight')?.value || 640;
    const topBar1 = document.getElementById('dtTopBar1Dia')?.value || '13';
    const topBar2 = document.getElementById('dtTopBar2Dia')?.value || '0';
    const botBar1 = document.getElementById('dtBotBar1Dia')?.value || '13';
    const botBar2 = document.getElementById('dtBotBar2Dia')?.value || '16';

    const topDt = document.getElementById('resTopDtRounded')?.textContent || '';
    const topD = document.getElementById('resTopEffectiveD')?.textContent || '';
    const topExact = document.getElementById('resTopDtExact')?.textContent || '';
    const botDt = document.getElementById('resBotDtRounded')?.textContent || '';
    const botD = document.getElementById('resBotEffectiveD')?.textContent || '';
    const botExact = document.getElementById('resBotDtExact')?.textContent || '';

    const topBarText = topBar2 === '0' ? `D${topBar1}×1本 (1段配筋)` : `D${topBar1}×1本 ＋ D${topBar2}×1本 (2段配筋)`;
    const botBarText = botBar2 === '0' ? `D${botBar1}×1本 (1段配筋)` : `D${botBar1}×1本 ＋ D${botBar2}×1本 (2段配筋)`;

    const text = `【木造基礎梁 有効梁成・重心距離dt 算定根拠書】(mdo3.com 算定ツール)
■ 基礎梁断面・条件:
  - 基礎梁高さ D = ${D} mm
  - 上端主筋: ${topBarText} (かぶり 40mm, STP: D10)
  - 下端主筋: ${botBarText} (かぶり 60mm[土に接する部分], STP: D10)

■ 上主筋 算定結果:
  - 重心距離 dt: 計算値 = ${topExact} → 採用値 = ${topDt} (安全側10mm丸め)
  - 有効梁成 d: ${D} - ${topDt} = ${topD}

■ 下主筋 算定結果:
  - 重心距離 dt: 計算値 = ${botExact} → 採用値 = ${botDt} (安全側10mm丸め)
  - 有効梁成 d: ${D} - ${botDt} = ${botD}

■ ARCHITREND ZERO / 確認申請審査 対応:
  - 木造住宅構造計算規準(グレー本)およびRC規準に準拠。
  - 2段筋クリアランス MAX(31.25mm, 呼び径×1.5) を考慮した厳密重心位置を安全側丸めした採用値です。`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('木造基礎 dt算定根拠テキストをコピーしました！確認申請質疑書やARCHITRENDにそのまま貼り付け可能です。');
    }).catch(err => {
      console.warn('Copy failed:', err);
    });
  }

  function showToast(msg) {
    let toast = document.getElementById('dtToastNotice');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'dtToastNotice';
      toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: #0ea5e9;
        color: #fff;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 0.88rem;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: fadeIn 0.3s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;">check_circle</span> ${msg}`;
    toast.style.display = 'flex';
    setTimeout(() => {
      if (toast) toast.style.display = 'none';
    }, 4000);
  }

})();
