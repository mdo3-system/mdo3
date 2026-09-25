/**
 * public/js/dt_calc.js
 * 
 * 有効基礎梁成・重心距離 dt 自動算出ツール (完全無償・実務審査対応)
 * - 建築基準法施行令第82条 / 木造住宅構造計算規準 (グレー本) 対応
 * - アーキトレンド (ARCHITREND ZERO) 基礎梁断面・dt設定連携
 * - 主筋1段・2段配筋時の重心距離 dt、有効梁成 d を瞬時に自動計算
 */

(function() {
  'use strict';

  // 鉄筋データ（呼び名: 実質径 mm, 断面積 cm²）
  const REBAR_DATA = {
    10: { name: 'D10', dia: 10, area: 0.71 },
    13: { name: 'D13', dia: 13, area: 1.27 },
    16: { name: 'D16', dia: 16, area: 1.99 },
    19: { name: 'D19', dia: 19, area: 2.87 },
    22: { name: 'D22', dia: 22, area: 3.87 },
    25: { name: 'D25', dia: 25, area: 5.07 }
  };

  document.addEventListener('DOMContentLoaded', () => {
    initDtCalc();
  });

  function initDtCalc() {
    const beamHeightInput = document.getElementById('dtBeamHeight');
    const topBar1Dia = document.getElementById('dtTopBar1Dia');
    const topBar1Count = document.getElementById('dtTopBar1Count');
    const topBar2Dia = document.getElementById('dtTopBar2Dia');
    const topBar2Count = document.getElementById('dtTopBar2Count');

    const botBar1Dia = document.getElementById('dtBotBar1Dia');
    const botBar1Count = document.getElementById('dtBotBar1Count');
    const botBar2Dia = document.getElementById('dtBotBar2Dia');
    const botBar2Count = document.getElementById('dtBotBar2Count');

    const stpDia = document.getElementById('dtStpDia');
    const coverTopInput = document.getElementById('dtCoverTop');
    const coverBotInput = document.getElementById('dtCoverBot');

    const btnCopyDtResult = document.getElementById('btnCopyDtResult');
    const btnResetDt = document.getElementById('btnResetDt');

    if (!beamHeightInput) return;

    // 全入力変更イベント監視
    const inputs = [
      beamHeightInput, topBar1Dia, topBar1Count, topBar2Dia, topBar2Count,
      botBar1Dia, botBar1Count, botBar2Dia, botBar2Count,
      stpDia, coverTopInput, coverBotInput
    ];

    inputs.forEach(el => {
      if (el) {
        el.addEventListener('input', calculate);
        el.addEventListener('change', calculate);
      }
    });

    if (btnCopyDtResult) {
      btnCopyDtResult.addEventListener('click', copyResultText);
    }

    if (btnResetDt) {
      btnResetDt.addEventListener('click', () => {
        beamHeightInput.value = 640;
        topBar1Dia.value = 13;
        topBar1Count.value = 2;
        topBar2Dia.value = 13;
        topBar2Count.value = 2;
        botBar1Dia.value = 13;
        botBar1Count.value = 1;
        botBar2Dia.value = 16;
        botBar2Count.value = 1;
        stpDia.value = 10;
        if (coverTopInput) coverTopInput.value = 40;
        if (coverBotInput) coverBotInput.value = 60;
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
    const t1N = parseInt(document.getElementById('dtTopBar1Count')?.value, 10) || 0;
    const t2D = parseFloat(document.getElementById('dtTopBar2Dia')?.value) || 13;
    const t2N = parseInt(document.getElementById('dtTopBar2Count')?.value, 10) || 0;

    const b1D = parseFloat(document.getElementById('dtBotBar1Dia')?.value) || 13;
    const b1N = parseInt(document.getElementById('dtBotBar1Count')?.value, 10) || 0;
    const b2D = parseFloat(document.getElementById('dtBotBar2Dia')?.value) || 16;
    const b2N = parseInt(document.getElementById('dtBotBar2Count')?.value, 10) || 0;

    // 上主筋の計算
    const topRes = calcLayer(coverTop, stpD, t1D, t1N, t2D, t2N, D);
    // 下主筋の計算
    const botRes = calcLayer(coverBot, stpD, b1D, b1N, b2D, b2N, D);

    // 画面への描画
    renderResults(topRes, botRes, D);
  }

  function calcLayer(cover, stpDia, bar1Dia, n1, bar2Dia, n2, D) {
    // 1段筋位置 d1 = かぶり厚 + STP呼び径 + 主筋1径 / 2
    const d1 = cover + stpDia + (bar1Dia / 2.0);

    let d2 = null;
    let gap = null;
    let dtExact = d1;

    if (n2 > 0 && (n1 + n2) > 0) {
      // 鉄筋あき(クリアランス) = MAX(25 × 1.25, 1段筋呼び径 × 1.5)
      gap = Math.max(25 * 1.25, bar1Dia * 1.5);
      // 2段筋位置 d2 = d1 + 主筋1径/2 + gap + 主筋2径/2
      d2 = d1 + (bar1Dia / 2.0) + gap + (bar2Dia / 2.0);
      // 重心距離 dt = d1 + [N2 / (N1 + N2)] * (d2 - d1)
      dtExact = d1 + (n2 / (n1 + n2)) * (d2 - d1);
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
      n1,
      n2,
      bar1Dia,
      bar2Dia
    };
  }

  function renderResults(top, bot, D) {
    // 上主筋結果
    setTxt('resTopD1', top.d1.toFixed(1) + ' mm');
    setTxt('resTopD2', top.d2 !== null ? top.d2.toFixed(1) + ' mm' : '― (1段配筋)');
    setTxt('resTopDtExact', top.dtExact.toFixed(2) + ' mm');
    setTxt('resTopDtRounded', top.dtRounded + ' mm');
    setTxt('resTopEffectiveD', top.effectiveD + ' mm');

    // 下主筋結果
    setTxt('resBotD1', bot.d1.toFixed(1) + ' mm');
    setTxt('resBotD2', bot.d2 !== null ? bot.d2.toFixed(1) + ' mm' : '― (1段配筋)');
    setTxt('resBotDtExact', bot.dtExact.toFixed(2) + ' mm');
    setTxt('resBotDtRounded', bot.dtRounded + ' mm');
    setTxt('resBotEffectiveD', bot.effectiveD + ' mm');

    // グレー本70mm規定との対比バッジ
    const grayCompTop = document.getElementById('grayCompTop');
    if (grayCompTop) {
      if (top.dtRounded > 70) {
        grayCompTop.className = 'dt-alert-badge warn';
        grayCompTop.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">warning</span> グレー本(70mm)より深いため【dt=${top.dtRounded}mm】で審査入力が必要`;
      } else {
        grayCompTop.className = 'dt-alert-badge ok';
        grayCompTop.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">check_circle</span> グレー本基準値(70mm)以内`;
      }
    }

    const grayCompBot = document.getElementById('grayCompBot');
    if (grayCompBot) {
      if (bot.dtRounded > 70) {
        grayCompBot.className = 'dt-alert-badge warn';
        grayCompBot.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">warning</span> 土に接するかぶり60mm＋2段配筋のため【dt=${bot.dtRounded}mm】で設定必須`;
      } else {
        grayCompBot.className = 'dt-alert-badge ok';
        grayCompBot.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">check_circle</span> グレー本基準値(70mm)以内`;
      }
    }
  }

  function setTxt(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function copyResultText() {
    const D = document.getElementById('dtBeamHeight')?.value || 640;
    const topDt = document.getElementById('resTopDtRounded')?.textContent || '';
    const topD = document.getElementById('resTopEffectiveD')?.textContent || '';
    const topExact = document.getElementById('resTopDtExact')?.textContent || '';
    const botDt = document.getElementById('resBotDtRounded')?.textContent || '';
    const botD = document.getElementById('resBotEffectiveD')?.textContent || '';
    const botExact = document.getElementById('resBotDtExact')?.textContent || '';

    const text = `【有効基礎梁成・重心距離dt 算定根拠書】(mdo3.com 算定ツール出力)
■ 基礎梁断面:
  - 基礎梁高さ D = ${D} mm
  - 上端かぶり厚 = 40 mm / 下端かぶり厚 = 60 mm (土に接する部分)
  - STP呼び径 = D10

■ 上主筋算定結果:
  - 重心距離 dt (計算値) = ${topExact} → 採用値 = ${topDt} (安全側丸め)
  - 有効梁成 d = ${D} - ${topDt} = ${topD}

■ 下主筋算定結果:
  - 重心距離 dt (計算値) = ${botExact} → 採用値 = ${botDt} (安全側丸め)
  - 有効梁成 d = ${D} - ${botDt} = ${botD}

■ 審査機関質疑・アーキトレンド対応方針:
  - 日本建築学会 RC規準および木造住宅構造計算規準(グレー本)に基づく厳密重心位置算定。
  - 主筋2段配筋時のクリアランス MAX(31.25mm, 呼び径×1.5) を考慮し、確認申請審査におけるdt指摘を完全クリアする安全側値として設計採用。`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('dt 算定根拠テキストをコピーしました！審査機関質疑書やARCHITRENDにそのまま貼り付け可能です。');
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
