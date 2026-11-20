/**
 * cover-renderer.js
 * 構造計算書 新表紙テンプレート（A4縦）および「別紙計算書」中表紙を pdf-lib でベクター描画するモジュール
 */
window.CoverRenderer = (function () {
  'use strict';

  function drawCenteredText(page, text, y, size, font, color, pageWidth) {
    if (!text) return;
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (pageWidth - width) / 2,
      y,
      size,
      font,
      color,
    });
  }

  function fitFontSize(text, maxWidth, baseSize, font, minSize = 7.5) {
    if (!text) return baseSize;
    let sz = baseSize;
    while (sz > minSize && font.widthOfTextAtSize(text, sz) > maxWidth) {
      sz -= 0.5;
    }
    return sz;
  }

  /**
   * 新表紙ページ (A4縦 595.28 x 841.89 pt)
   * - ヘッダー左文言・英字タイトル・基礎形式行を削除したスッキリ仕様
   * - 使用プログラムは混構造等に対応した2段構成
   */
  async function renderCoverPage(pdfDoc, data, fontRegular, fontBold) {
    const { rgb } = window.PDFLib;
    const W = 595.28;
    const H = 841.89;
    const page = pdfDoc.addPage([W, H]);

    const navy = rgb(0.118, 0.227, 0.373);
    const dark = rgb(0.059, 0.090, 0.165);
    const slate = rgb(0.278, 0.333, 0.412);
    const muted = rgb(0.45, 0.51, 0.58);
    const lineLight = rgb(0.82, 0.86, 0.90);
    const boxBg = rgb(0.973, 0.980, 0.988);

    // 1. 外枠（ネイビー二重枠）
    const mOut = 48;
    const mIn = 54;
    page.drawRectangle({
      x: mOut, y: mOut, width: W - mOut * 2, height: H - mOut * 2,
      borderColor: navy, borderWidth: 1.6,
    });
    page.drawRectangle({
      x: mIn, y: mIn, width: W - mIn * 2, height: H - mIn * 2,
      borderColor: lineLight, borderWidth: 0.6,
    });

    const contentL = 78;
    const contentR = W - 78;
    const contentW = contentR - contentL;

    // 2. 上部ヘッダー（作成年月のみ右寄せ）
    const dateStr = data.date || '';
    if (dateStr) {
      const dw = fontRegular.widthOfTextAtSize(dateStr, 10.5);
      page.drawText(dateStr, {
        x: contentR - dw, y: H - 92, size: 10.5, font: fontRegular, color: dark,
      });
    }
    page.drawLine({
      start: { x: contentL, y: H - 106 },
      end: { x: contentR, y: H - 106 },
      thickness: 0.7, color: lineLight,
    });

    // 3. タイトルブロック（英字タイトル削除）
    drawCenteredText(page, '構 造 計 算 書', H - 196, 33, fontBold, dark, W);
    page.drawLine({
      start: { x: W / 2 - 58, y: H - 216 },
      end: { x: W / 2 + 58, y: H - 216 },
      thickness: 2.0, color: navy,
    });
    drawCenteredText(
      page,
      data.subtitle || '〔 許容応力度計算（ルート1） 〕',
      H - 246, 12.5, fontRegular, slate, W
    );

    // 4. 工事名称ボックス
    const boxTop = H - 292;
    const boxH = 84;
    page.drawRectangle({
      x: contentL, y: boxTop - boxH, width: contentW, height: boxH,
      color: boxBg,
    });
    page.drawLine({
      start: { x: contentL, y: boxTop }, end: { x: contentR, y: boxTop },
      thickness: 1.5, color: navy,
    });
    page.drawLine({
      start: { x: contentL, y: boxTop - boxH }, end: { x: contentR, y: boxTop - boxH },
      thickness: 1.5, color: navy,
    });
    drawCenteredText(page, '工 事 名 称', boxTop - 26, 9.5, fontRegular, slate, W);
    const projName = data.projectName || '（仮称）〇〇〇〇 新築工事';
    const projSz = fitFontSize(projName, contentW - 24, 19, fontBold, 11);
    drawCenteredText(page, projName, boxTop - 58, projSz, fontBold, dark, W);

    // 5. 建物概要テーブル（4行：基礎形式を削除）
    const rows = [
      ['建 設 場 所', data.address || ''],
      ['主 要 用 途', data.usage || ''],
      ['構 造 ・ 規 模', data.structure || ''],
      ['延 べ 面 積', data.area || ''],
    ];
    let curY = boxTop - boxH - 32;
    const rowH = 38;
    const labelColW = 112;

    page.drawLine({
      start: { x: contentL, y: curY }, end: { x: contentR, y: curY },
      thickness: 0.7, color: lineLight,
    });

    for (const [lbl, val] of rows) {
      page.drawRectangle({
        x: contentL, y: curY - rowH, width: labelColW, height: rowH,
        color: boxBg,
      });
      page.drawText(lbl, {
        x: contentL + 14, y: curY - 23, size: 10, font: fontBold, color: navy,
      });
      const valSz = fitFontSize(val, contentW - labelColW - 22, 10.5, fontRegular, 8);
      page.drawText(val, {
        x: contentL + labelColW + 14, y: curY - 23, size: valSz, font: fontRegular, color: dark,
      });
      curY -= rowH;
      page.drawLine({
        start: { x: contentL, y: curY }, end: { x: contentR, y: curY },
        thickness: 0.7, color: lineLight,
      });
    }

    // 6. 設計事務所・設計者ブロック
    const offTop = 236;
    page.drawLine({
      start: { x: contentL, y: offTop }, end: { x: contentR, y: offTop },
      thickness: 1.5, color: navy,
    });

    page.drawText('設計事務所名', {
      x: contentL + 8, y: offTop - 36, size: 10, font: fontBold, color: navy,
    });
    if (data.officeReg) {
      const sz = fitFontSize(data.officeReg, contentW - 120, 9, fontRegular, 7.5);
      page.drawText(data.officeReg, {
        x: contentL + 112, y: offTop - 28, size: sz, font: fontRegular, color: slate,
      });
    }
    if (data.officeName) {
      const sz = fitFontSize(data.officeName, contentW - 120, 14, fontBold, 10);
      page.drawText(data.officeName, {
        x: contentL + 112, y: offTop - 48, size: sz, font: fontBold, color: dark,
      });
    }

    page.drawText('設 計 者 名', {
      x: contentL + 8, y: offTop - 88, size: 10, font: fontBold, color: navy,
    });
    if (data.designerReg) {
      const sz = fitFontSize(data.designerReg, contentW - 120, 9, fontRegular, 7.5);
      page.drawText(data.designerReg, {
        x: contentL + 112, y: offTop - 80, size: sz, font: fontRegular, color: slate,
      });
    }
    if (data.designerName) {
      const sz = fitFontSize(data.designerName, contentW - 120, 14, fontBold, 10);
      page.drawText(data.designerName, {
        x: contentL + 112, y: offTop - 100, size: sz, font: fontBold, color: dark,
      });
    }

    // 7. フッター（使用プログラム 2段構成対応）
    page.drawLine({
      start: { x: contentL, y: 112 }, end: { x: contentR, y: 112 },
      thickness: 0.5, color: lineLight, dashArray: [2, 2],
    });

    const prog1 = data.program1 || data.program || '使用プログラム：ARCHITREND ZERO Ver12 木造構造計算';
    const prog2 = (data.program2 || '').trim();
    const docNo = data.docNo || 'Document No. 01';
    const dnw = fontRegular.widthOfTextAtSize(docNo, 8.5);
    const maxProgW = contentW - dnw - 16;

    if (prog2) {
      const sz1 = fitFontSize(prog1, maxProgW, 8.5, fontRegular, 7);
      const sz2 = fitFontSize(prog2, maxProgW, 8.5, fontRegular, 7);
      page.drawText(prog1, { x: contentL, y: 94, size: sz1, font: fontRegular, color: muted });
      page.drawText(prog2, { x: contentL, y: 80, size: sz2, font: fontRegular, color: muted });
    } else {
      const sz1 = fitFontSize(prog1, maxProgW, 8.5, fontRegular, 7);
      page.drawText(prog1, { x: contentL, y: 86, size: sz1, font: fontRegular, color: muted });
    }

    page.drawText(docNo, {
      x: contentR - dnw, y: 86, size: 8.5, font: fontRegular, color: muted,
    });

    return page;
  }

  /**
   * セクション中表紙（扉ページ）を A4縦 で描画する汎用関数
   */
  async function renderDividerPage(pdfDoc, data, fontRegular, fontBold, dividerTitle) {
    const { rgb } = window.PDFLib;
    const W = 595.28;
    const H = 841.89;
    const page = pdfDoc.addPage([W, H]);

    const navy = rgb(0.118, 0.227, 0.373);
    const dark = rgb(0.059, 0.090, 0.165);
    const slate = rgb(0.278, 0.333, 0.412);
    const lineLight = rgb(0.82, 0.86, 0.90);

    // 外枠
    const mOut = 54;
    page.drawRectangle({
      x: mOut, y: mOut, width: W - mOut * 2, height: H - mOut * 2,
      borderColor: navy, borderWidth: 1.2,
    });

    // 中央タイトル
    drawCenteredText(page, dividerTitle || '別 紙 計 算 書', H / 2 + 54, 28, fontBold, dark, W);
    page.drawLine({
      start: { x: W / 2 - 70, y: H / 2 + 32 },
      end: { x: W / 2 + 70, y: H / 2 + 32 },
      thickness: 1.6, color: navy,
    });

    if (data && data.projectName) {
      const sz = fitFontSize(data.projectName, W - 160, 14, fontBold, 10);
      drawCenteredText(page, data.projectName, H / 2 - 12, sz, fontBold, slate, W);
    }
    if (data && data.address) {
      const sz = fitFontSize(data.address, W - 160, 10, fontRegular, 8);
      drawCenteredText(page, data.address, H / 2 - 38, sz, fontRegular, slate, W);
    }

    // 下部に作成年月・事務所名
    page.drawLine({
      start: { x: 100, y: 165 }, end: { x: W - 100, y: 165 },
      thickness: 0.7, color: lineLight,
    });
    if (data && data.officeName) {
      drawCenteredText(page, data.officeName, 134, 11.5, fontBold, dark, W);
    }
    if (data && data.designerName) {
      drawCenteredText(page, data.designerName, 112, 10, fontRegular, slate, W);
    }
    if (data && data.date) {
      drawCenteredText(page, data.date, 88, 9.5, fontRegular, slate, W);
    }

    return page;
  }

  async function renderBesshiDividerPage(pdfDoc, data, fontRegular, fontBold) {
    return renderDividerPage(pdfDoc, data, fontRegular, fontBold, '別 紙 計 算 書');
  }

  async function renderGroundDividerPage(pdfDoc, data, fontRegular, fontBold) {
    return renderDividerPage(pdfDoc, data, fontRegular, fontBold, '地 盤 関 係 資 料');
  }

  return { renderCoverPage, renderDividerPage, renderBesshiDividerPage, renderGroundDividerPage };
})();
