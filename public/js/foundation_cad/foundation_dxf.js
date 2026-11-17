/**
 * foundation_dxf.js
 * 基礎梁断面詳細図 全符号DXFエクスポートモジュール
 * - ARCHITREND ZERO / AutoCAD / Jw_cad 完全互換 (AC1009 R12 DXF + Shift_JIS)
 * - HEADER ($EXTMIN/$EXTMAX/$LIMMIN/$LIMMAX), TABLES (LTYPE/LAYER/STYLE), BLOCKS, ENTITIES 完備
 */

import { calcRebarDt, getBarRadius } from './foundation_calc.js';
import { REBAR_DATA } from './foundation_constants.js';

export function generateAllBeamsDxf(beamList, avgGlConfig, slabCommon = { shortBar: 'D13@150', longBar: 'D10@300' }) {
  const numBeams = (beamList && beamList.length) ? beamList.length : 1;
  const minX = -500;
  const maxX = Math.max((numBeams - 1) * 2100 + 1600, 1800);
  const minY = -1000;
  const maxY = 900;

  let dxf = "";

  // ==========================================
  // 1. HEADER セクション (ARCHITREND ZERO 図面範囲認識用)
  // ==========================================
  dxf += "0\r\nSECTION\r\n2\r\nHEADER\r\n";
  dxf += "9\r\n$ACADVER\r\n1\r\nAC1009\r\n";
  dxf += "9\r\n$DWGCODEPAGE\r\n3\r\nANSI_932\r\n";
  dxf += "9\r\n$INSBASE\r\n10\r\n0.0\r\n20\r\n0.0\r\n30\r\n0.0\r\n";
  dxf += `9\r\n$EXTMIN\r\n10\r\n${minX.toFixed(1)}\r\n20\r\n${minY.toFixed(1)}\r\n30\r\n0.0\r\n`;
  dxf += `9\r\n$EXTMAX\r\n10\r\n${maxX.toFixed(1)}\r\n20\r\n${maxY.toFixed(1)}\r\n30\r\n0.0\r\n`;
  dxf += `9\r\n$LIMMIN\r\n10\r\n${minX.toFixed(1)}\r\n20\r\n${minY.toFixed(1)}\r\n`;
  dxf += `9\r\n$LIMMAX\r\n10\r\n${maxX.toFixed(1)}\r\n20\r\n${maxY.toFixed(1)}\r\n`;
  dxf += "0\r\nENDSEC\r\n";

  // ==========================================
  // 2. TABLES セクション (LTYPE / LAYER / STYLE)
  // ==========================================
  dxf += "0\r\nSECTION\r\n2\r\nTABLES\r\n";

  // 2-1. LTYPE (線種テーブル)
  dxf += "0\r\nTABLE\r\n2\r\nLTYPE\r\n70\r\n1\r\n";
  dxf += "0\r\nLTYPE\r\n2\r\nCONTINUOUS\r\n70\r\n0\r\n3\r\nSolid line\r\n72\r\n65\r\n73\r\n0\r\n40\r\n0.0\r\n";
  dxf += "0\r\nENDTAB\r\n";

  // 2-2. LAYER (画層テーブル ※グループコード2必須)
  const layers = [
    { name: "0",          color: 7 }, // 標準レイヤ
    { name: "CONCRETE",   color: 7 }, // 躯体線 (白/黒)
    { name: "GRAVEL",     color: 8 }, // 割栗石・砕石 (灰)
    { name: "REBAR",      color: 1 }, // 鉄筋 (赤)
    { name: "LEVELER",    color: 4 }, // レベラー (シアン)
    { name: "DIMENSION",  color: 2 }, // 寸法・引出線 (黄)
    { name: "CENTER",     color: 3 }, // 通り芯 (緑)
    { name: "GL_LINE",    color: 3 }, // 設計GL (緑)
    { name: "AVG_GL",     color: 2 }, // 平均GL (黄)
    { name: "TABLE_LINE", color: 4 }, // 表枠線 (シアン)
    { name: "TEXT",       color: 7 }  // 文字 (白/黒)
  ];
  dxf += `0\r\nTABLE\r\n2\r\nLAYER\r\n70\r\n${layers.length}\r\n`;
  layers.forEach(l => {
    dxf += `0\r\nLAYER\r\n2\r\n${l.name}\r\n70\r\n0\r\n62\r\n${l.color}\r\n6\r\nCONTINUOUS\r\n`;
  });
  dxf += "0\r\nENDTAB\r\n";

  // 2-3. STYLE (文字スタイルテーブル)
  dxf += "0\r\nTABLE\r\n2\r\nSTYLE\r\n70\r\n1\r\n";
  dxf += "0\r\nSTYLE\r\n2\r\nSTANDARD\r\n70\r\n0\r\n40\r\n0.0\r\n41\r\n1.0\r\n50\r\n0.0\r\n71\r\n0\r\n42\r\n2.5\r\n3\r\ntxt\r\n4\r\nbigfont.shx\r\n";
  dxf += "0\r\nENDTAB\r\n";

  dxf += "0\r\nENDSEC\r\n";

  // ==========================================
  // 3. BLOCKS セクション (空定義・CAD互換性保証)
  // ==========================================
  dxf += "0\r\nSECTION\r\n2\r\nBLOCKS\r\n0\r\nENDSEC\r\n";

  // ==========================================
  // 4. ENTITIES セクション
  // ==========================================
  dxf += "0\r\nSECTION\r\n2\r\nENTITIES\r\n";

  const dLine = (x1, y1, x2, y2, lay) =>
    `0\r\nLINE\r\n8\r\n${lay}\r\n10\r\n${Number(x1).toFixed(1)}\r\n20\r\n${Number(y1).toFixed(1)}\r\n30\r\n0.0\r\n11\r\n${Number(x2).toFixed(1)}\r\n21\r\n${Number(y2).toFixed(1)}\r\n31\r\n0.0\r\n`;

  const dCircle = (cx, cy, r, lay) =>
    `0\r\nCIRCLE\r\n8\r\n${lay}\r\n10\r\n${Number(cx).toFixed(1)}\r\n20\r\n${Number(cy).toFixed(1)}\r\n30\r\n0.0\r\n40\r\n${Number(r).toFixed(1)}\r\n`;

  const dArc = (cx, cy, r, startAng, endAng, lay) =>
    `0\r\nARC\r\n8\r\n${lay}\r\n10\r\n${Number(cx).toFixed(1)}\r\n20\r\n${Number(cy).toFixed(1)}\r\n30\r\n0.0\r\n40\r\n${Number(r).toFixed(1)}\r\n50\r\n${Number(startAng).toFixed(1)}\r\n51\r\n${Number(endAng).toFixed(1)}\r\n`;

  const dText = (str, x, y, lay, h = 18) =>
    `0\r\nTEXT\r\n8\r\n${lay}\r\n10\r\n${Number(x).toFixed(1)}\r\n20\r\n${Number(y).toFixed(1)}\r\n30\r\n0.0\r\n40\r\n${Number(h).toFixed(1)}\r\n1\r\n${String(str)}\r\n7\r\nSTANDARD\r\n`;

  // 寸法線ヘルパー (DXF用: 上向き+Y座標系)
  const dDim = (x1, y1, x2, y2, label, isVert = false, side = 1) => {
    let out = "";
    out += dLine(x1, y1, x2, y2, "DIMENSION");
    // ティックマーク(斜め線)
    out += dLine(x1 - 4, y1 - 4, x1 + 4, y1 + 4, "DIMENSION");
    out += dLine(x2 - 4, y2 - 4, x2 + 4, y2 + 4, "DIMENSION");
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    if (isVert) {
      const tx = side > 0 ? (mx + 10) : (mx - 115);
      out += dText(label, tx, my - 6, "DIMENSION", 14);
    } else {
      out += dText(label, mx - (String(label).length * 4.5), my + (side > 0 ? 10 : -22), "DIMENSION", 14);
    }
    return out;
  };

  // 引出線ヘルパー
  const dCallout = (targetX, targetY, elbowX, elbowY, labelX, label, alignLeft = false) => {
    let out = "";
    out += dLine(targetX, targetY, elbowX, elbowY, "DIMENSION");
    out += dLine(elbowX, elbowY, labelX, elbowY, "DIMENSION");
    const tx = alignLeft ? (labelX - String(label).length * 10 - 8) : (labelX + 8);
    out += dText(label, tx, elbowY - 6, "TEXT", 15);
    return out;
  };

  // 破断線ヘルパー
  const dBreak = (bx, yTopVal, yBotVal) => {
    const midY = (yTopVal + yBotVal) / 2;
    let out = "";
    out += dLine(bx, yTopVal, bx, midY + 15, "TABLE_LINE");
    out += dLine(bx, midY + 15, bx - 8, midY + 7, "TABLE_LINE");
    out += dLine(bx - 8, midY + 7, bx + 8, midY - 7, "TABLE_LINE");
    out += dLine(bx + 8, midY - 7, bx, midY - 15, "TABLE_LINE");
    out += dLine(bx, midY - 15, bx, yBotVal, "TABLE_LINE");
    return out;
  };

  beamList.forEach((b, idx) => {
    const ox = idx * 2100;
    const isFG1 = (b.baseSpec === 'FG1');
    const isDoubleStem = (b.stemArrangement === 'double');
    const isDoubleSlab = (b.slabArrangement === 'double');

    const aboveGl = (typeof b.aboveGl === 'number') ? b.aboveGl : 400;
    const embedH = (typeof b.embedH === 'number') ? b.embedH : 500;
    const totalH = aboveGl + embedH;
    const levelerT = (typeof b.levelerT === 'number') ? b.levelerT : 10;
    const concD = Math.max(totalH - levelerT, 100);
    const stemW = b.stemW || 150;
    const isMatchStem = (b.baseToeWidthType === 'matchStem');
    const totalBaseW = isFG1 ? (isMatchStem ? stemW : 250) : stemW;
    const toeW = Math.max(totalBaseW - stemW, 0);

    // DXF座標系 (上向き +Y, 設計GL = 0)
    const yGl = 0;
    const yTop = aboveGl;
    const yConcTop = yTop - levelerT;
    const yBot = -embedH;
    const glToSlab = (typeof b.glToSlab === 'number') ? b.glToSlab : 50;
    const slabT = b.slabT || 180;
    const ySlabTop = glToSlab;
    const ySlabBot = ySlabTop - slabT;
    const subThick = 60;
    const deltaH = Math.max(ySlabBot - yBot, 0);
    const dxHaunch = Math.min(deltaH, 100);

    const isSlabFlush = (aboveGl <= glToSlab);

    const xOut = ox;
    const xIn = ox + stemW;
    const xStemCenter = (xOut + xIn) / 2;
    const xBaseEnd = ox + totalBaseW;
    const xSlopeEnd = xBaseEnd + dxHaunch;
    const xBreak = ox + 700;
    const xBreakL = xOut - 300;
    const xBreakR = xIn + 300;

    // タイトル
    const toeStr = isMatchStem ? `底盤同寸${stemW}mm` : `底盤250mm`;
    const typeLabel = isFG1 ? `FG1仕様 (外周/ポーチ・${toeStr})` : 'FG2仕様 (内部T型梁)';
    const stemTypeDesc = isDoubleStem ? '立上りW' : '立上りS';
    const slabTypeDesc = isDoubleSlab ? 'スラブW' : 'スラブS';

    dxf += dText(`【 符号 : ${b.title || b.id} 】 ${typeLabel}`, ox - 40, yTop + 85, "TEXT", 24);
    dxf += dText(`仕様: ${stemTypeDesc}・${slabTypeDesc} | 幅${stemW}×梁成D${concD}mm (全高${totalH}mm)`, ox - 40, yTop + 55, "TEXT", 15);

    // 躯体線 & 砕石層 & 破断線
    if (isFG1) {
      const topY = isSlabFlush ? ySlabTop : yConcTop;
      dxf += dLine(xOut, topY, xOut, yBot, "CONCRETE");
      dxf += dLine(xOut, yBot, xBaseEnd, yBot, "CONCRETE");
      dxf += dLine(xBaseEnd, yBot, xSlopeEnd, ySlabBot, "CONCRETE");
      dxf += dLine(xSlopeEnd, ySlabBot, xBreak, ySlabBot, "CONCRETE");
      dxf += dLine(xBreak, ySlabBot, xBreak, ySlabTop, "CONCRETE");
      if (!isSlabFlush) {
        dxf += dLine(xBreak, ySlabTop, xIn, ySlabTop, "CONCRETE");
        dxf += dLine(xIn, ySlabTop, xIn, yConcTop, "CONCRETE");
        dxf += dLine(xIn, yConcTop, xOut, yConcTop, "CONCRETE");
      } else {
        dxf += dLine(xBreak, ySlabTop, xOut, ySlabTop, "CONCRETE");
      }

      // 割栗石・砕石層
      dxf += dLine(xOut - 40, yBot, xOut - 40, yBot - subThick, "GRAVEL");
      dxf += dLine(xOut - 40, yBot - subThick, xBaseEnd + 20, yBot - subThick, "GRAVEL");
      dxf += dLine(xBaseEnd + 20, yBot - subThick, xSlopeEnd + 20, ySlabBot - subThick, "GRAVEL");
      dxf += dLine(xSlopeEnd + 20, ySlabBot - subThick, xBreak, ySlabBot - subThick, "GRAVEL");
      dxf += dLine(xOut - 40, yBot, xOut, yBot, "GRAVEL");

      dxf += dBreak(xBreak, ySlabTop + 25, ySlabBot - subThick - 25);
    } else {
      if (yBot < ySlabBot) {
        dxf += dLine(xOut, yConcTop, xIn, yConcTop, "CONCRETE");
        dxf += dLine(xIn, yConcTop, xIn, ySlabTop, "CONCRETE");
        dxf += dLine(xIn, ySlabTop, xBreakR, ySlabTop, "CONCRETE");
        dxf += dLine(xBreakR, ySlabTop, xBreakR, ySlabBot, "CONCRETE");
        dxf += dLine(xBreakR, ySlabBot, xIn, ySlabBot, "CONCRETE");
        dxf += dLine(xIn, ySlabBot, xIn, yBot, "CONCRETE");
        dxf += dLine(xIn, yBot, xOut, yBot, "CONCRETE");
        dxf += dLine(xOut, yBot, xOut, ySlabBot, "CONCRETE");
        dxf += dLine(xOut, ySlabBot, xBreakL, ySlabBot, "CONCRETE");
        dxf += dLine(xBreakL, ySlabBot, xBreakL, ySlabTop, "CONCRETE");
        dxf += dLine(xBreakL, ySlabTop, xOut, ySlabTop, "CONCRETE");
        dxf += dLine(xOut, ySlabTop, xOut, yConcTop, "CONCRETE");
      } else {
        dxf += dLine(xOut, yConcTop, xIn, yConcTop, "CONCRETE");
        dxf += dLine(xIn, yConcTop, xIn, ySlabTop, "CONCRETE");
        dxf += dLine(xIn, ySlabTop, xBreakR, ySlabTop, "CONCRETE");
        dxf += dLine(xBreakR, ySlabTop, xBreakR, yBot, "CONCRETE");
        dxf += dLine(xBreakR, yBot, xBreakL, yBot, "CONCRETE");
        dxf += dLine(xBreakL, yBot, xBreakL, ySlabTop, "CONCRETE");
        dxf += dLine(xBreakL, ySlabTop, xOut, ySlabTop, "CONCRETE");
        dxf += dLine(xOut, ySlabTop, xOut, yConcTop, "CONCRETE");
      }

      dxf += dLine(xBreakL, yBot - subThick, xBreakR, yBot - subThick, "GRAVEL");
      dxf += dBreak(xBreakL, ySlabTop + 25, yBot - subThick - 25);
      dxf += dBreak(xBreakR, ySlabTop + 25, yBot - subThick - 25);
    }

    // レベラー
    if (!isSlabFlush && levelerT > 0) {
      dxf += dLine(xOut, yTop, xIn, yTop, "LEVELER");
      dxf += dLine(xOut, yConcTop, xOut, yTop, "LEVELER");
      dxf += dLine(xIn, yConcTop, xIn, yTop, "LEVELER");
      dxf += dText(`レベラー ${levelerT}mm`, xOut - 125, yConcTop + 2, "LEVELER", 12);
    }

    // 通り芯 & GL
    dxf += dLine(xStemCenter, yTop + 30, xStemCenter, yBot - 90, "CENTER");
    dxf += dText("通り芯", xStemCenter - 24, yBot - 115, "CENTER", 14);

    dxf += dLine(ox - 340, yGl, ox + 750, yGl, "GL_LINE");
    dxf += dText("▽ 設計GL", ox - 440, yGl - 6, "GL_LINE", 16);

    if (avgGlConfig && avgGlConfig.show) {
      const yAvg = yGl + (avgGlConfig.diff || 0);
      dxf += dLine(ox - 340, yAvg, ox + 750, yAvg, "AVG_GL");
      dxf += dText("▽ 平均GL", ox - 440, yAvg - 6, "AVG_GL", 16);

      if (avgGlConfig.diff !== 0) {
        const diffVal = avgGlConfig.diff;
        const diffSign = diffVal > 0 ? `+${diffVal}` : `${diffVal}`;
        dxf += dDim(ox - 200, yGl, ox - 200, yAvg, `GL差 ${diffSign}mm`, true, -1);
      }
    }

    // 配筋幾何
    const hoopCover = 35;
    const hoopL = xOut + hoopCover;
    const hoopR = xIn - hoopCover;
    const stY_top = isSlabFlush ? (ySlabTop - 35) : (yConcTop - 50);
    const stY_bot = yBot + 60;
    const bendR = 20;

    const r13 = REBAR_DATA['D13'].r;
    const r16 = REBAR_DATA['D16'].r;

    const shortSpecStr = (slabCommon && slabCommon.shortBar) ? slabCommon.shortBar : (b.slabShortBar || 'D13@150');
    const longSpecStr = (slabCommon && slabCommon.longBar) ? slabCommon.longBar : (b.slabLongBar || 'D10@300');
    const rShort = getBarRadius(shortSpecStr);
    const rLong = getBarRadius(longSpecStr);

    const yTopShort = ySlabTop - 35 - rShort;
    const yTopLong = yTopShort - (rShort + rLong + 3);
    const yBotShort = ySlabBot + 60 - rShort;
    const yBotLong = yBotShort + (rShort + rLong + 3);

    const hyp = Math.hypot(dxHaunch, deltaH) || 1;
    const sinTheta = deltaH / hyp;
    const cosTheta = dxHaunch / hyp;

    const shiftX = (sinTheta > 0.02) ? (60 * (1 - cosTheta) / sinTheta) : 0;
    const stSlopeStartX = Math.max(xBaseEnd - shiftX, xStemCenter + 10);

    const stTargetTopY = yTopLong;
    const dyRebar = stTargetTopY - stY_bot;
    const stSlopeEndX = stSlopeStartX + dyRebar * (dxHaunch / (deltaH || 1));

    // スターラップ
    if (isDoubleStem) {
      const rH = 10;
      dxf += dLine(hoopL + rH, stY_top, hoopR - rH, stY_top, "REBAR");
      dxf += dArc(hoopR - rH, stY_top - rH, rH, 0, 90, "REBAR");
      dxf += dLine(hoopR, stY_top - rH, hoopR, stY_bot + rH, "REBAR");
      dxf += dArc(hoopR - rH, stY_bot + rH, rH, 270, 360, "REBAR");
      dxf += dLine(hoopR - rH, stY_bot, hoopL + rH, stY_bot, "REBAR");
      dxf += dArc(hoopL + rH, stY_bot + rH, rH, 180, 270, "REBAR");
      dxf += dLine(hoopL, stY_bot + rH, hoopL, stY_top - rH, "REBAR");
      dxf += dArc(hoopL + rH, stY_top - rH, rH, 90, 180, "REBAR");

      if (isFG1) {
        dxf += dLine(hoopR, stY_bot, stSlopeStartX, stY_bot, "REBAR");
        dxf += dLine(stSlopeStartX, stY_bot, stSlopeEndX, stTargetTopY, "REBAR");
      }
    } else {
      const stX = xStemCenter - 10;
      if (isFG1) {
        dxf += dLine(stX + 20, stY_top - 10, stX + 15, stY_top, "REBAR");
        dxf += dArc(stX + 15, stY_top - 15, 15, 90, 180, "REBAR");
        dxf += dLine(stX, stY_top - 15, stX, stY_bot + bendR, "REBAR");
        dxf += dArc(stX + bendR, stY_bot + bendR, bendR, 180, 270, "REBAR");

        const filletDist = Math.min(18, Math.max(5, (stSlopeStartX - (stX + bendR)) / 2));
        const p1x = stSlopeStartX - filletDist;
        dxf += dLine(stX + bendR, stY_bot, p1x, stY_bot, "REBAR");

        const p2x = stSlopeStartX + filletDist * cosTheta;
        const p2y = stY_bot + filletDist * sinTheta;
        dxf += dLine(p1x, stY_bot, p2x, p2y, "REBAR");

        const p3x = stSlopeEndX - filletDist * cosTheta;
        const p3y = stTargetTopY - filletDist * sinTheta;
        dxf += dLine(p2x, p2y, p3x, p3y, "REBAR");

        dxf += dLine(p3x, p3y, stSlopeEndX + filletDist, stTargetTopY, "REBAR");
        dxf += dLine(stSlopeEndX + filletDist, stTargetTopY, stSlopeEndX + filletDist + 120, stTargetTopY, "REBAR");
      } else {
        dxf += dLine(stX + 20, stY_top - 10, stX + 15, stY_top, "REBAR");
        dxf += dArc(stX + 15, stY_top - 15, 15, 90, 180, "REBAR");
        dxf += dLine(stX, stY_top - 15, stX, stY_bot + bendR, "REBAR");
        dxf += dArc(stX + bendR, stY_bot + bendR, bendR, 180, 270, "REBAR");
        dxf += dLine(stX + bendR, stY_bot, stX + 85, stY_bot, "REBAR");
      }
    }

    // 縦筋引出線
    const stTargetPtX = isDoubleStem ? hoopL : (xStemCenter - 10);
    const stCalloutY = isSlabFlush ? (yGl - embedH * 0.4) : Math.max(yGl + 30, stY_top - 120);
    dxf += dCallout(stTargetPtX, stCalloutY, xOut - 40, stCalloutY, xOut - 100, `縦筋: ${b.stirrupBar || 'D10@200'}${isDoubleStem ? ' (フープ)' : ''}`, true);

    // 主筋
    let topLabel = b.topSpec || '2-D13';
    if (isDoubleStem) {
      const rTop = b.topSpec.includes('D16') ? r16 : r13;
      dxf += dCircle(hoopL + 12, stY_top - 12, rTop, "REBAR");
      dxf += dCircle(hoopR - 12, stY_top - 12, rTop, "REBAR");
      if (b.topSpec.includes('2段')) {
        const r2 = b.topSpec.includes('2段2-D16') ? r16 : r13;
        dxf += dCircle(hoopL + 12, stY_top - 12 - 38, r2, "REBAR");
        dxf += dCircle(hoopR - 12, stY_top - 12 - 38, r2, "REBAR");
      }
    } else {
      const rTop = b.topSpec.includes('D16') ? r16 : r13;
      dxf += dCircle(xStemCenter, stY_top - 12, rTop, "REBAR");
      if (b.topSpec.includes('2段') || b.topSpec.startsWith('2-')) {
        const rTop2 = b.topSpec.includes('2段D16') ? r16 : rTop;
        dxf += dCircle(xStemCenter, stY_top - 12 - 38, rTop2, "REBAR");
      }
    }
    const topElbowY = isSlabFlush ? (stY_top + 30) : (stY_top + 20);
    dxf += dCallout(xStemCenter, stY_top - 12, xIn + 60, topElbowY, xIn + 160, `上主筋: ${topLabel}`, false);

    // 下主筋
    const botBaseY = stY_bot + 12;
    let botLabel = b.botSpec || '1-D13';
    if (isDoubleStem) {
      const rBot = b.botSpec.includes('D16') ? r16 : r13;
      dxf += dCircle(hoopL + 12, botBaseY, rBot, "REBAR");
      dxf += dCircle(hoopR - 12, botBaseY, rBot, "REBAR");
      if (b.botSpec.includes('2段')) {
        const r2 = b.botSpec.includes('2段2-D16') ? r16 : r13;
        dxf += dCircle(hoopL + 12, botBaseY + 38, r2, "REBAR");
        dxf += dCircle(hoopR - 12, botBaseY + 38, r2, "REBAR");
      }
      dxf += dCallout(hoopR - 12, botBaseY, xIn + 60, botBaseY - 30, xIn + 160, `下主筋: ${botLabel} (W配筋)`, false);
    } else if (isFG1 && !isMatchStem) {
      const rBot = b.botSpec.includes('D16') ? r16 : r13;
      const pL = xStemCenter - 10 + bendR + 8;
      const pR = Math.max(stSlopeStartX - 15, pL + 40);
      const pM = (pL + pR) / 2;
      if (b.botSpec.startsWith('3-')) {
        dxf += dCircle(pL, botBaseY, rBot, "REBAR");
        dxf += dCircle(pM, botBaseY, rBot, "REBAR");
        dxf += dCircle(pR, botBaseY, rBot, "REBAR");
        dxf += dCallout(pR, botBaseY, xIn + 60, botBaseY - 30, xIn + 160, `下主筋: ${botLabel} (並列3本)`, false);
      } else if (b.botSpec.startsWith('2-')) {
        dxf += dCircle(pL + 4, botBaseY, rBot, "REBAR");
        dxf += dCircle(pR - 4, botBaseY, rBot, "REBAR");
        dxf += dCallout(pR, botBaseY, xIn + 60, botBaseY - 30, xIn + 160, `下主筋: ${botLabel} (並列2本)`, false);
      } else {
        dxf += dCircle(xStemCenter, botBaseY, rBot, "REBAR");
        dxf += dCallout(xStemCenter, botBaseY, xIn + 60, botBaseY - 30, xIn + 160, `下主筋: ${botLabel}`, false);
      }
    } else {
      if (b.botSpec && (b.botSpec.includes('2段') || b.botSpec.includes('+'))) {
        const rB1 = b.botSpec.startsWith('D16') ? r16 : r13;
        const rB2 = (b.botSpec.includes('2段D16') || b.botSpec.endsWith('D16')) ? r16 : r13;
        dxf += dCircle(xStemCenter, botBaseY, rB1, "REBAR");
        dxf += dCircle(xStemCenter, botBaseY + 36, rB2, "REBAR");
        dxf += dCallout(xStemCenter, botBaseY, xIn + 60, botBaseY - 30, xIn + 160, `下主筋: ${botLabel} (縦2段)`, false);
      } else {
        const rBot = b.botSpec.includes('D16') ? r16 : r13;
        dxf += dCircle(xStemCenter, botBaseY, rBot, "REBAR");
        dxf += dCallout(xStemCenter, botBaseY, xIn + 60, botBaseY - 30, xIn + 160, `下主筋: ${botLabel}`, false);
      }
    }

    // スラブ筋
    const sPitch = shortSpecStr.includes('@100') ? 100 : (shortSpecStr.includes('@200') ? 200 : 150);
    if (isFG1) {
      dxf += dLine(xStemCenter - 10, yTopLong, xBreak, yTopLong, "REBAR");
      if (isDoubleSlab) {
        dxf += dLine(xStemCenter - 10, yBotLong, xBreak, yBotLong, "REBAR");
      }
      const startShortX = Math.max(stSlopeEndX + 35, xIn + 70);
      let spx = startShortX;
      let firstPt = null;
      while (spx < xBreak - 25) {
        dxf += dCircle(spx, yTopShort, rShort, "REBAR");
        if (isDoubleSlab) dxf += dCircle(spx, yBotShort, rShort, "REBAR");
        if (!firstPt) firstPt = spx;
        spx += sPitch;
      }
      if (firstPt) {
        dxf += dCallout(firstPt, yTopShort, firstPt + 35, ySlabTop + 40, firstPt + 110, `スラブ短辺: ${shortSpecStr}${isDoubleSlab ? ' (W)' : ''}`, false);
      }
      dxf += dCallout(xBreak - 80, yTopLong, xBreak - 40, ySlabTop - 70, xBreak + 30, `スラブ長辺: ${longSpecStr}`, false);
    } else {
      dxf += dLine(xBreakL, yTopLong, xBreakR, yTopLong, "REBAR");
      if (isDoubleSlab) {
        dxf += dLine(xBreakL, yBotLong, xBreakR, yBotLong, "REBAR");
      }
      let spx = xBreakL + 25;
      let firstPt = null;
      while (spx < xBreakR - 20) {
        if (spx < (xOut - 20) || spx > (xIn + 20)) {
          dxf += dCircle(spx, yTopShort, rShort, "REBAR");
          if (isDoubleSlab) dxf += dCircle(spx, yBotShort, rShort, "REBAR");
          if (!firstPt && spx > xIn + 15) firstPt = spx;
        }
        spx += sPitch;
      }
      if (firstPt) {
        dxf += dCallout(firstPt, yTopShort, firstPt + 30, ySlabTop + 40, xBreakR + 20, `スラブ短辺: ${shortSpecStr}${isDoubleSlab ? ' (W)' : ''}`, false);
      }
      dxf += dCallout(xBreakR - 60, yTopLong, xBreakR - 20, ySlabTop - 70, xBreakR + 20, `スラブ長辺: ${longSpecStr}`, false);
    }

    // 寸法線
    dxf += dDim(xOut, yTop + 25, xIn, yTop + 25, `${stemW}mm`, false, 1);
    dxf += dDim(xOut - 25, yGl, xOut - 25, ySlabTop, `+${glToSlab}`, true, -1);
    dxf += dDim(xOut - 80, yGl, xOut - 80, yTop, `天端高 ${aboveGl}mm`, true, -1);
    dxf += dDim(xOut - 80, yBot, xOut - 80, yGl, `※H=${embedH}mm`, true, -1);
    dxf += dDim(xOut - 150, yBot, xOut - 150, yTop, `全高 ${totalH}mm`, true, -1);
    dxf += dDim(xIn + 60, yBot, xIn + 60, stY_bot, `かぶり 60mm`, true, 1);

    if (isFG1) {
      if (!isMatchStem && toeW > 0) {
        dxf += dDim(xOut, yBot - 35, xIn, yBot - 35, `${stemW}mm`, false, -1);
        dxf += dDim(xIn, yBot - 35, xBaseEnd, yBot - 35, `${toeW}mm`, false, -1);
        dxf += dDim(xOut, yBot - 70, xBaseEnd, yBot - 70, `底盤幅 ${totalBaseW}mm`, false, -1);
      } else {
        dxf += dDim(xOut, yBot - 35, xBaseEnd, yBot - 35, `${totalBaseW}mm`, false, -1);
      }
    }

    // 基準レベル対比表 & 重心距離dt・有効梁成d算定表
    if (!avgGlConfig || avgGlConfig.show !== false) {
      const dtTop = calcRebarDt(b.topSpec, true, isMatchStem, b.stirrupBar, b.incTopStirrup, isDoubleStem);
      const dtBot = calcRebarDt(b.botSpec, false, isMatchStem, b.stirrupBar, b.incBotStirrup, isDoubleStem);

      const diff = (avgGlConfig && avgGlConfig.diff) ? avgGlConfig.diff : 0;
      const diffStr = (diff >= 0 ? `+${diff}` : `${diff}`) + "mm";

      const topAvgVal = aboveGl - diff;
      const botAvgVal = -embedH - diff;
      const slabAvgVal = glToSlab - diff;

      const dEffTop = concD - dtTop.dt;
      const dEffBot = concD - dtBot.dt;

      const dtTopStr = (Math.round(dtTop.dt * 10) / 10).toFixed(1);
      const dEffTopStr = (Math.round(dEffTop * 10) / 10).toFixed(1);
      const dtBotStr = (Math.round(dtBot.dt * 10) / 10).toFixed(1);
      const dEffBotStr = (Math.round(dEffBot * 10) / 10).toFixed(1);

      const tx = ox + 820;
      const ty = yTop + 60;
      const tw = 620;
      const th = 460;

      dxf += dLine(tx, ty, tx + tw, ty, "TABLE_LINE");
      dxf += dLine(tx + tw, ty, tx + tw, ty - th, "TABLE_LINE");
      dxf += dLine(tx + tw, ty - th, tx, ty - th, "TABLE_LINE");
      dxf += dLine(tx, ty - th, tx, ty, "TABLE_LINE");

      dxf += dText("【 基準レベル対比表 (高さ±表示) 】", tx + 20, ty - 35, "TEXT", 20);
      dxf += dLine(tx + 15, ty - 50, tx + tw - 15, ty - 50, "TABLE_LINE");

      dxf += dText("項目", tx + 25, ty - 80, "TEXT", 16);
      dxf += dText("設計GL基準(±)", tx + 220, ty - 80, "TEXT", 16);
      dxf += dText("平均GL基準(±)", tx + 420, ty - 80, "TEXT", 16);

      dxf += dText("立上り天端", tx + 25, ty - 115, "TEXT", 16);
      dxf += dText(`+${aboveGl} mm`, tx + 220, ty - 115, "TEXT", 16);
      dxf += dText(`${topAvgVal >= 0 ? '+' : ''}${topAvgVal} mm`, tx + 420, ty - 115, "TEXT", 16);

      dxf += dText("根入れ底面", tx + 25, ty - 150, "TEXT", 16);
      dxf += dText(`-${embedH} mm (※H=${embedH})`, tx + 220, ty - 150, "TEXT", 16);
      dxf += dText(`${botAvgVal >= 0 ? '+' : ''}${botAvgVal} mm`, tx + 420, ty - 150, "TEXT", 16);

      dxf += dText(`スラブ天端: 設計GL +${glToSlab}mm ／ 平均GL ${slabAvgVal >= 0 ? '+' : ''}${slabAvgVal}mm (差: ${diffStr})`, tx + 25, ty - 185, "TEXT", 15);

      dxf += dLine(tx + 15, ty - 205, tx + tw - 15, ty - 205, "TABLE_LINE");
      dxf += dText(`【 梁成D=${concD}mm (レベラー抜) ・ 有効梁成d 自動算定 】`, tx + 20, ty - 235, "TEXT", 19);

      dxf += dLine(tx + 20, ty - 255, tx + tw / 2 - 10, ty - 255, "TABLE_LINE");
      dxf += dLine(tx + tw / 2 - 10, ty - 255, tx + tw / 2 - 10, ty - 380, "TABLE_LINE");
      dxf += dLine(tx + tw / 2 - 10, ty - 380, tx + 20, ty - 380, "TABLE_LINE");
      dxf += dLine(tx + 20, ty - 380, tx + 20, ty - 255, "TABLE_LINE");

      dxf += dText(`▲ 上主筋 (${b.topSpec})`, tx + 30, ty - 280, "TEXT", 16);
      dxf += dText(`重心距離 dt :  ${dtTopStr} mm`, tx + 30, ty - 315, "TEXT", 16);
      dxf += dText(`有効梁成 d  :  ${dEffTopStr} mm`, tx + 30, ty - 345, "TEXT", 16);
      dxf += dText(`(天端かぶり40+STP見込み)`, tx + 30, ty - 370, "TEXT", 13);

      dxf += dLine(tx + tw / 2 + 10, ty - 255, tx + tw - 20, ty - 255, "TABLE_LINE");
      dxf += dLine(tx + tw - 20, ty - 255, tx + tw - 20, ty - 380, "TABLE_LINE");
      dxf += dLine(tx + tw - 20, ty - 380, tx + tw / 2 + 10, ty - 380, "TABLE_LINE");
      dxf += dLine(tx + tw / 2 + 10, ty - 380, tx + tw / 2 + 10, ty - 255, "TABLE_LINE");

      dxf += dText(`▼ 下主筋 (${b.botSpec})`, tx + tw / 2 + 20, ty - 280, "TEXT", 16);
      dxf += dText(`重心距離 dt :  ${dtBotStr} mm`, tx + tw / 2 + 20, ty - 315, "TEXT", 16);
      dxf += dText(`有効梁成 d  :  ${dEffBotStr} mm`, tx + tw / 2 + 20, ty - 345, "TEXT", 16);
      dxf += dText(`(底面かぶり60+STP見込み)`, tx + tw / 2 + 20, ty - 370, "TEXT", 13);

      dxf += dLine(tx + 15, ty - 400, tx + tw - 15, ty - 400, "TABLE_LINE");
      dxf += dText("※腹筋はD10＠300以下で配す。", tx + 25, ty - 435, "TEXT", 18);
    }
  });

  dxf += "0\r\nENDSEC\r\n0\r\nEOF\r\n";

  // Shift_JIS エンコード & ダウンロード実行
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    let blob;
    if (typeof window.Encoding !== 'undefined') {
      const unicodeArray = window.Encoding.stringToCode(dxf);
      const sjisArray = window.Encoding.convert(unicodeArray, { to: 'SJIS', from: 'UNICODE' });
      const u8 = new Uint8Array(sjisArray);
      blob = new Blob([u8], { type: 'application/dxf' });
    } else {
      blob = new Blob([dxf], { type: 'application/dxf;charset=shift_jis' });
    }

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Foundation_Beam_Schedule_All_FG.dxf`;
    a.click();
  }

  return dxf;
}
