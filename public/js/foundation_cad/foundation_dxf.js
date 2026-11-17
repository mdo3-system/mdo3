/**
 * foundation_dxf.js
 * 基礎梁断面詳細図 全符号DXFエクスポートモジュール
 * - ARCHITREND ZERO / AutoCAD / Jw_cad 完全互換 (AC1009 R12 DXF + Shift_JIS)
 * - 1. スラブ筋をスターラップまで延長配置
 * - 2. 符号間ピッチ(5200mm)拡大＆文字レーン分離によりFG1対比表とFG2文字の被りを完全解消
 * - 3. 腹筋(D10@300程度)の丸断面＆引出線自動作図
 * - 4. 設計GL＝一点鎖線、平均GL＝三点鎖線 (LTYPE定義＋ジオメトリ分割鎖線で100%確実表示)
 * - 5. 基礎梁コンクリート形状＝太線 (法線オフセット多重太線により縮尺1/20で0.4mm極太表示)
 */

import { calcRebarDt, getBarRadius } from './foundation_calc.js';
import { REBAR_DATA } from './foundation_constants.js';

export function generateAllBeamsDxf(beamList, avgGlConfig, slabCommon = { shortBar: 'D13@150', longBar: 'D10@300' }) {
  const numBeams = (beamList && beamList.length) ? beamList.length : 1;
  const pitchX = 5200; // 符号ごとの配置間隔 (FG1対比表とFG2左端文字が絶対に被らないよう5200mm確保)
  const minX = -1500;
  const maxX = Math.max((numBeams - 1) * pitchX + 3000, 3200);
  const minY = -1400;
  const maxY = 1100;

  let dxf = "";

  // ==========================================
  // 1. HEADER セクション (ARCHITREND ZERO 図面範囲認識用)
  // ==========================================
  dxf += "0\r\nSECTION\r\n2\r\nHEADER\r\n";
  dxf += "9\r\n$ACADVER\r\n1\r\nAC1009\r\n";
  dxf += "9\r\n$DWGCODEPAGE\r\n3\r\nANSI_932\r\n";
  dxf += "9\r\n$INSBASE\r\n10\r\n0.0\r\n20\r\n0.0\r\n30\r\n0.0\r\n";
  dxf += "9\r\n$TEXTSIZE\r\n40\r\n50.0\r\n";
  dxf += "9\r\n$LTSCALE\r\n40\r\n20.0\r\n";
  dxf += `9\r\n$EXTMIN\r\n10\r\n${minX.toFixed(1)}\r\n20\r\n${minY.toFixed(1)}\r\n30\r\n0.0\r\n`;
  dxf += `9\r\n$EXTMAX\r\n10\r\n${maxX.toFixed(1)}\r\n20\r\n${maxY.toFixed(1)}\r\n30\r\n0.0\r\n`;
  dxf += `9\r\n$LIMMIN\r\n10\r\n${minX.toFixed(1)}\r\n20\r\n${minY.toFixed(1)}\r\n`;
  dxf += `9\r\n$LIMMAX\r\n10\r\n${maxX.toFixed(1)}\r\n20\r\n${maxY.toFixed(1)}\r\n`;
  dxf += "0\r\nENDSEC\r\n";

  // ==========================================
  // 2. TABLES セクション (LTYPE / LAYER / STYLE)
  // ==========================================
  dxf += "0\r\nSECTION\r\n2\r\nTABLES\r\n";

  // 2-1. LTYPE (線種テーブル: 実線・一点鎖線・三点鎖線)
  dxf += "0\r\nTABLE\r\n2\r\nLTYPE\r\n70\r\n3\r\n";
  dxf += "0\r\nLTYPE\r\n2\r\nCONTINUOUS\r\n70\r\n0\r\n3\r\nSolid line\r\n72\r\n65\r\n73\r\n0\r\n40\r\n0.0\r\n";
  dxf += "0\r\nLTYPE\r\n2\r\nDASHDOT\r\n70\r\n0\r\n3\r\nDash dot __ . __ . __\r\n72\r\n65\r\n73\r\n4\r\n40\r\n120.0\r\n49\r\n80.0\r\n49\r\n-15.0\r\n49\r\n10.0\r\n49\r\n-15.0\r\n";
  dxf += "0\r\nLTYPE\r\n2\r\nDIVIDE3\r\n70\r\n0\r\n3\r\nTriple dot ____ . . . ____\r\n72\r\n65\r\n73\r\n8\r\n40\r\n160.0\r\n49\r\n80.0\r\n49\r\n-12.5\r\n49\r\n10.0\r\n49\r\n-12.5\r\n49\r\n10.0\r\n49\r\n-12.5\r\n49\r\n10.0\r\n49\r\n-12.5\r\n";
  dxf += "0\r\nENDTAB\r\n";

  // 2-2. LAYER (画層テーブル ※グループコード2必須)
  const layers = [
    { name: "0",          color: 7, ltype: "CONTINUOUS" }, // 標準レイヤ
    { name: "CONCRETE",   color: 7, ltype: "CONTINUOUS" }, // 躯体線 (白/黒・太線)
    { name: "GRAVEL",     color: 8, ltype: "CONTINUOUS" }, // 割栗石・砕石 (灰)
    { name: "REBAR",      color: 1, ltype: "CONTINUOUS" }, // 鉄筋 (赤)
    { name: "LEVELER",    color: 4, ltype: "CONTINUOUS" }, // レベラー (シアン)
    { name: "DIMENSION",  color: 2, ltype: "CONTINUOUS" }, // 寸法・引出線 (黄)
    { name: "CENTER",     color: 3, ltype: "CONTINUOUS" }, // 通り芯 (緑)
    { name: "GL_LINE",    color: 3, ltype: "CONTINUOUS" }, // 設計GL (緑・一点鎖線)
    { name: "AVG_GL",     color: 2, ltype: "CONTINUOUS" }, // 平均GL (黄・三点鎖線)
    { name: "TABLE_LINE", color: 4, ltype: "CONTINUOUS" }, // 表枠線 (シアン)
    { name: "TEXT",       color: 7, ltype: "CONTINUOUS" }  // 文字 (白/黒)
  ];
  dxf += `0\r\nTABLE\r\n2\r\nLAYER\r\n70\r\n${layers.length}\r\n`;
  layers.forEach(l => {
    dxf += `0\r\nLAYER\r\n2\r\n${l.name}\r\n70\r\n0\r\n62\r\n${l.color}\r\n6\r\n${l.ltype}\r\n`;
  });
  dxf += "0\r\nENDTAB\r\n";

  // 2-3. STYLE (文字スタイルテーブル)
  dxf += "0\r\nTABLE\r\n2\r\nSTYLE\r\n70\r\n1\r\n";
  dxf += "0\r\nSTYLE\r\n2\r\nSTANDARD\r\n70\r\n0\r\n40\r\n0.0\r\n41\r\n1.0\r\n50\r\n0.0\r\n71\r\n0\r\n42\r\n50.0\r\n3\r\ntxt\r\n4\r\nbigfont.shx\r\n";
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

  // 基礎梁形状用の太線ヘルパー (法線方向に平行多重線を描画し、どのCAD設定でも確実に太線として表示)
  const dThickLine = (x1, y1, x2, y2, lay = "CONCRETE") => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    let out = "";
    // -3.6mm, -1.8mm, 0.0mm, +1.8mm, +3.6mm (全幅7.2mm = 縮尺1/20で0.36mm〜0.4mm極太実線)
    const offsets = [-3.6, -1.8, 0.0, 1.8, 3.6];
    for (let i = 0; i < offsets.length; i++) {
      const off = offsets[i];
      out += dLine(x1 + nx * off, y1 + ny * off, x2 + nx * off, y2 + ny * off, lay);
    }
    return out;
  };

  // 一点鎖線ヘルパー (設計GL・通り芯用: 長線75mm + 空白14mm + 点線12mm + 空白14mm)
  const dDashDotLine = (x1, y1, x2, y2, lay = "GL_LINE") => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const totalLen = Math.hypot(dx, dy);
    if (totalLen < 1) return "";
    const ux = dx / totalLen;
    const uy = dy / totalLen;
    const segs = [
      { draw: true, len: 75 },
      { draw: false, len: 14 },
      { draw: true, len: 12 },
      { draw: false, len: 14 }
    ];
    let dist = 0;
    let step = 0;
    let out = "";
    while (dist < totalLen) {
      const s = segs[step % segs.length];
      const nextDist = Math.min(dist + s.len, totalLen);
      if (s.draw && nextDist > dist) {
        out += dLine(x1 + ux * dist, y1 + uy * dist, x1 + ux * nextDist, y1 + uy * nextDist, lay);
      }
      dist = nextDist;
      step++;
    }
    return out;
  };

  // 三点鎖線ヘルパー (平均GL用: 長線75mm + [空白12mm + 点線10mm]×3 + 空白12mm)
  const dTripleDotLine = (x1, y1, x2, y2, lay = "AVG_GL") => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const totalLen = Math.hypot(dx, dy);
    if (totalLen < 1) return "";
    const ux = dx / totalLen;
    const uy = dy / totalLen;
    const segs = [
      { draw: true, len: 75 },
      { draw: false, len: 12 },
      { draw: true, len: 10 },
      { draw: false, len: 12 },
      { draw: true, len: 10 },
      { draw: false, len: 12 },
      { draw: true, len: 10 },
      { draw: false, len: 12 }
    ];
    let dist = 0;
    let step = 0;
    let out = "";
    while (dist < totalLen) {
      const s = segs[step % segs.length];
      const nextDist = Math.min(dist + s.len, totalLen);
      if (s.draw && nextDist > dist) {
        out += dLine(x1 + ux * dist, y1 + uy * dist, x1 + ux * nextDist, y1 + uy * nextDist, lay);
      }
      dist = nextDist;
      step++;
    }
    return out;
  };

  const dCircle = (cx, cy, r, lay) =>
    `0\r\nCIRCLE\r\n8\r\n${lay}\r\n10\r\n${Number(cx).toFixed(1)}\r\n20\r\n${Number(cy).toFixed(1)}\r\n30\r\n0.0\r\n40\r\n${Number(r).toFixed(1)}\r\n`;

  const dArc = (cx, cy, r, startAng, endAng, lay) =>
    `0\r\nARC\r\n8\r\n${lay}\r\n10\r\n${Number(cx).toFixed(1)}\r\n20\r\n${Number(cy).toFixed(1)}\r\n30\r\n0.0\r\n40\r\n${Number(r).toFixed(1)}\r\n50\r\n${Number(startAng).toFixed(1)}\r\n51\r\n${Number(endAng).toFixed(1)}\r\n`;

  // 文字出力ヘルパー: 最低でも高さ45mm (縮尺1/20で2.25mm以上) を保証
  const dText = (str, x, y, lay, h = 50) => {
    const safeH = Math.max(Number(h) || 50, 45);
    return `0\r\nTEXT\r\n8\r\n${lay}\r\n10\r\n${Number(x).toFixed(1)}\r\n20\r\n${Number(y).toFixed(1)}\r\n30\r\n0.0\r\n40\r\n${safeH.toFixed(1)}\r\n1\r\n${String(str)}\r\n7\r\nSTANDARD\r\n`;
  };

  // 文字幅推定 (全角1文字≒safeH*0.95, 半角1文字≒safeH*0.55)
  const estimateTextWidth = (str, h = 50) => {
    const safeH = Math.max(Number(h) || 50, 45);
    let w = 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      w += (s.charCodeAt(i) > 255) ? (safeH * 0.95) : (safeH * 0.55);
    }
    return w;
  };

  // 寸法線ヘルパー (DXF用: 上向き+Y座標系, 最小文字高さ45mm)
  const dDim = (x1, y1, x2, y2, label, isVert = false, side = 1, h = 45) => {
    let out = "";
    out += dLine(x1, y1, x2, y2, "DIMENSION");
    // ティックマーク(斜め線)
    out += dLine(x1 - 8, y1 - 8, x1 + 8, y1 + 8, "DIMENSION");
    out += dLine(x2 - 8, y2 - 8, x2 + 8, y2 + 8, "DIMENSION");
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const tw = estimateTextWidth(label, h);
    if (isVert) {
      const tx = side > 0 ? (mx + 20) : (mx - tw - 20);
      out += dText(label, tx, my - h * 0.4, "DIMENSION", h);
    } else {
      const ty = side > 0 ? (my + 16) : (my - h - 18);
      out += dText(label, mx - tw / 2, ty, "DIMENSION", h);
    }
    return out;
  };

  // 引出線ヘルパー
  const dCallout = (targetX, targetY, elbowX, elbowY, labelX, label, alignLeft = false, h = 50) => {
    let out = "";
    out += dLine(targetX, targetY, elbowX, elbowY, "DIMENSION");
    out += dLine(elbowX, elbowY, labelX, elbowY, "DIMENSION");
    const tw = estimateTextWidth(label, h);
    const tx = alignLeft ? (labelX - tw - 15) : (labelX + 15);
    out += dText(label, tx, elbowY - h * 0.35, "TEXT", h);
    return out;
  };

  // 破断線ヘルパー
  const dBreak = (bx, yTopVal, yBotVal) => {
    const midY = (yTopVal + yBotVal) / 2;
    let out = "";
    out += dLine(bx, yTopVal, bx, midY + 18, "TABLE_LINE");
    out += dLine(bx, midY + 18, bx - 12, midY + 8, "TABLE_LINE");
    out += dLine(bx - 12, midY + 8, bx + 12, midY - 8, "TABLE_LINE");
    out += dLine(bx + 12, midY - 8, bx, midY - 18, "TABLE_LINE");
    out += dLine(bx, midY - 18, bx, yBotVal, "TABLE_LINE");
    return out;
  };

  beamList.forEach((b, idx) => {
    const ox = idx * pitchX;
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
    const xBreak = ox + 750;
    const xBreakL = xOut - 320;
    const xBreakR = xIn + 320;

    // 左端基準位置 (FG1はxOut、FG2はxBreakL)
    const leftEdgeX = isFG1 ? xOut : xBreakL;

    // タイトル (高さ70mm / 48mm)
    const toeStr = isMatchStem ? `底盤同寸${stemW}mm` : `底盤250mm`;
    const typeLabel = isFG1 ? `FG1仕様 (${toeStr})` : 'FG2仕様 (内部T型梁)';
    const stemTypeDesc = isDoubleStem ? '立上りW' : '立上りS';
    const slabTypeDesc = isDoubleSlab ? 'スラブW' : 'スラブS';

    dxf += dText(`【 符号 : ${b.title || b.id} 】 ${typeLabel}`, leftEdgeX - 200, yTop + 220, "TEXT", 70);
    dxf += dText(`仕様: ${stemTypeDesc}・${slabTypeDesc} | 幅${stemW}×梁成D${concD}mm (全高${totalH}mm)`, leftEdgeX - 200, yTop + 135, "TEXT", 48);

    // 躯体線 (太線 dThickLine) & 砕石層 & 破断線
    if (isFG1) {
      const topY = isSlabFlush ? ySlabTop : yConcTop;
      dxf += dThickLine(xOut, topY, xOut, yBot, "CONCRETE");
      dxf += dThickLine(xOut, yBot, xBaseEnd, yBot, "CONCRETE");
      dxf += dThickLine(xBaseEnd, yBot, xSlopeEnd, ySlabBot, "CONCRETE");
      dxf += dThickLine(xSlopeEnd, ySlabBot, xBreak, ySlabBot, "CONCRETE");
      if (!isSlabFlush) {
        dxf += dThickLine(xBreak, ySlabTop, xIn, ySlabTop, "CONCRETE");
        dxf += dThickLine(xIn, ySlabTop, xIn, yConcTop, "CONCRETE");
        dxf += dThickLine(xIn, yConcTop, xOut, yConcTop, "CONCRETE");
      } else {
        dxf += dThickLine(xBreak, ySlabTop, xOut, ySlabTop, "CONCRETE");
      }

      // 割栗石・砕石層
      dxf += dLine(xOut - 40, yBot, xOut - 40, yBot - subThick, "GRAVEL");
      dxf += dLine(xOut - 40, yBot - subThick, xBaseEnd + 20, yBot - subThick, "GRAVEL");
      dxf += dLine(xBaseEnd + 20, yBot - subThick, xSlopeEnd + 20, ySlabBot - subThick, "GRAVEL");
      dxf += dLine(xSlopeEnd + 20, ySlabBot - subThick, xBreak, ySlabBot - subThick, "GRAVEL");
      dxf += dLine(xOut - 40, yBot, xOut, yBot, "GRAVEL");

      dxf += dBreak(xBreak, ySlabTop + 30, ySlabBot - subThick - 30);
    } else {
      if (yBot < ySlabBot) {
        dxf += dThickLine(xOut, yConcTop, xIn, yConcTop, "CONCRETE");
        dxf += dThickLine(xIn, yConcTop, xIn, ySlabTop, "CONCRETE");
        dxf += dThickLine(xIn, ySlabTop, xBreakR, ySlabTop, "CONCRETE");
        dxf += dThickLine(xBreakR, ySlabBot, xIn, ySlabBot, "CONCRETE");
        dxf += dThickLine(xIn, ySlabBot, xIn, yBot, "CONCRETE");
        dxf += dThickLine(xIn, yBot, xOut, yBot, "CONCRETE");
        dxf += dThickLine(xOut, yBot, xOut, ySlabBot, "CONCRETE");
        dxf += dThickLine(xOut, ySlabBot, xBreakL, ySlabBot, "CONCRETE");
        dxf += dThickLine(xBreakL, ySlabTop, xOut, ySlabTop, "CONCRETE");
        dxf += dThickLine(xOut, ySlabTop, xOut, yConcTop, "CONCRETE");
      } else {
        dxf += dThickLine(xOut, yConcTop, xIn, yConcTop, "CONCRETE");
        dxf += dThickLine(xIn, yConcTop, xIn, ySlabTop, "CONCRETE");
        dxf += dThickLine(xIn, ySlabTop, xBreakR, ySlabTop, "CONCRETE");
        dxf += dThickLine(xBreakR, yBot, xBreakL, yBot, "CONCRETE");
        dxf += dThickLine(xBreakL, ySlabTop, xOut, ySlabTop, "CONCRETE");
        dxf += dThickLine(xOut, ySlabTop, xOut, yConcTop, "CONCRETE");
      }

      dxf += dLine(xBreakL, yBot - subThick, xBreakR, yBot - subThick, "GRAVEL");
      dxf += dBreak(xBreakL, ySlabTop + 30, yBot - subThick - 30);
      dxf += dBreak(xBreakR, ySlabTop + 30, yBot - subThick - 30);
    }

    // レベラー
    if (!isSlabFlush && levelerT > 0) {
      dxf += dLine(xOut, yTop, xIn, yTop, "LEVELER");
      dxf += dLine(xOut, yConcTop, xOut, yTop, "LEVELER");
      dxf += dLine(xIn, yConcTop, xIn, yTop, "LEVELER");
      dxf += dCallout(xOut, (yTop + yConcTop) / 2, xOut - 40, yTop + 45, xOut - 100, `レベラー ${levelerT}mm`, true, 45);
    }

    // 通り芯 (一点鎖線)
    dxf += dDashDotLine(xStemCenter, yTop + 40, xStemCenter, yBot - 220, "CENTER");
    dxf += dText("通り芯", xStemCenter - 65, yBot - 285, "CENTER", 45);

    // 設計GL (一点鎖線) ＆ 平均GL (三点鎖線)
    const glLeftX = leftEdgeX - 650;
    const glRightX = isFG1 ? (xBreak + 100) : (xBreakR + 100);
    dxf += dDashDotLine(glLeftX, yGl, glRightX, yGl, "GL_LINE");
    dxf += dText("▽ 設計GL", glLeftX - 270, yGl - 20, "GL_LINE", 50);

    if (avgGlConfig && avgGlConfig.show) {
      const yAvg = yGl + (avgGlConfig.diff || 0);
      dxf += dTripleDotLine(glLeftX, yAvg, glRightX, yAvg, "AVG_GL");
      const avgLabelY = (Math.abs(avgGlConfig.diff || 0) < 65) ? (yAvg - 75) : (yAvg - 20);
      dxf += dText("▽ 平均GL", glLeftX - 270, avgLabelY, "AVG_GL", 50);

      if (avgGlConfig.diff !== 0) {
        const diffVal = avgGlConfig.diff;
        const diffSign = diffVal > 0 ? `+${diffVal}` : `${diffVal}`;
        dxf += dDim(leftEdgeX - 480, yGl, leftEdgeX - 480, yAvg, `GL差 ${diffSign}`, true, -1, 45);
      }
    }

    // 配筋幾何
    const hoopCover = 35;
    const hoopL = xOut + hoopCover;
    const hoopR = xIn - hoopCover;
    const stY_top = isSlabFlush ? (ySlabTop - 35) : (yConcTop - 50);
    const stY_bot = yBot + 60;
    const bendR = 20;

    const r10 = REBAR_DATA['D10'].r;
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
    const stTargetPtX = isDoubleStem ? hoopR : (xStemCenter - 10);
    const stCalloutY = yGl - embedH * 0.55;
    dxf += dCallout(stTargetPtX, stCalloutY, xIn + 80, stCalloutY, xIn + 180, `縦筋: ${b.stirrupBar || 'D10@200'}${isDoubleStem ? ' (フープ)' : ''}`, false, 50);

    // 上主筋
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
    const topElbowY = isSlabFlush ? (ySlabTop + 150) : (stY_top + 40);
    dxf += dCallout(xStemCenter, stY_top - 12, xIn + 80, topElbowY, xIn + 180, `上主筋: ${topLabel}`, false, 50);

    // 下主筋
    const botBaseY = stY_bot + 12;
    let botLabel = b.botSpec || '1-D13';
    const botCalloutY = yBot - 60;
    if (isDoubleStem) {
      const rBot = b.botSpec.includes('D16') ? r16 : r13;
      dxf += dCircle(hoopL + 12, botBaseY, rBot, "REBAR");
      dxf += dCircle(hoopR - 12, botBaseY, rBot, "REBAR");
      if (b.botSpec.includes('2段')) {
        const r2 = b.botSpec.includes('2段2-D16') ? r16 : r13;
        dxf += dCircle(hoopL + 12, botBaseY + 38, r2, "REBAR");
        dxf += dCircle(hoopR - 12, botBaseY + 38, r2, "REBAR");
      }
      dxf += dCallout(hoopR - 12, botBaseY, xIn + 120, botCalloutY, xIn + 220, `下主筋: ${botLabel} (W)`, false, 50);
    } else if (isFG1 && !isMatchStem) {
      const rBot = b.botSpec.includes('D16') ? r16 : r13;
      const pL = xStemCenter - 10 + bendR + 8;
      const pR = Math.max(stSlopeStartX - 15, pL + 40);
      const pM = (pL + pR) / 2;
      if (b.botSpec.startsWith('3-')) {
        dxf += dCircle(pL, botBaseY, rBot, "REBAR");
        dxf += dCircle(pM, botBaseY, rBot, "REBAR");
        dxf += dCircle(pR, botBaseY, rBot, "REBAR");
        dxf += dCallout(pR, botBaseY, xBaseEnd + 80, botCalloutY, xBaseEnd + 160, `下主筋: ${botLabel} (並列3本)`, false, 50);
      } else if (b.botSpec.startsWith('2-')) {
        dxf += dCircle(pL + 4, botBaseY, rBot, "REBAR");
        dxf += dCircle(pR - 4, botBaseY, rBot, "REBAR");
        dxf += dCallout(pR, botBaseY, xBaseEnd + 80, botCalloutY, xBaseEnd + 160, `下主筋: ${botLabel} (並列2本)`, false, 50);
      } else {
        dxf += dCircle(xStemCenter, botBaseY, rBot, "REBAR");
        dxf += dCallout(xStemCenter, botBaseY, xBaseEnd + 80, botCalloutY, xBaseEnd + 160, `下主筋: ${botLabel}`, false, 50);
      }
    } else {
      if (b.botSpec && (b.botSpec.includes('2段') || b.botSpec.includes('+'))) {
        const rB1 = b.botSpec.startsWith('D16') ? r16 : r13;
        const rB2 = (b.botSpec.includes('2段D16') || b.botSpec.endsWith('D16')) ? r16 : r13;
        dxf += dCircle(xStemCenter, botBaseY, rB1, "REBAR");
        dxf += dCircle(xStemCenter, botBaseY + 36, rB2, "REBAR");
        dxf += dCallout(xStemCenter, botBaseY, xIn + 120, botCalloutY, xIn + 220, `下主筋: ${botLabel} (縦2段)`, false, 50);
      } else {
        const rBot = b.botSpec.includes('D16') ? r16 : r13;
        dxf += dCircle(xStemCenter, botBaseY, rBot, "REBAR");
        dxf += dCallout(xStemCenter, botBaseY, xIn + 120, botCalloutY, xIn + 220, `下主筋: ${botLabel}`, false, 50);
      }
    }

    // 腹筋 (D10@300程度)
    const webTopLimitY = stY_top - 12 - (b.topSpec && (b.topSpec.includes('2段') || (!isDoubleStem && b.topSpec.startsWith('2-'))) ? 38 : 0);
    const webBotLimitY = botBaseY + (b.botSpec && (b.botSpec.includes('2段') || b.botSpec.includes('+')) ? 38 : 0);
    const webSpanH = Math.max(webTopLimitY - webBotLimitY, 100);
    const webDivs = Math.max(2, Math.ceil(webSpanH / 300));
    const webStepY = webSpanH / webDivs;
    let firstWebY = null;
    for (let wi = 1; wi < webDivs; wi++) {
      const wy = webTopLimitY - webStepY * wi;
      if (isDoubleStem) {
        dxf += dCircle(hoopL + 10, wy, r10, "REBAR");
        dxf += dCircle(hoopR - 10, wy, r10, "REBAR");
      } else {
        dxf += dCircle(xStemCenter, wy, r10, "REBAR");
      }
      if (firstWebY === null) firstWebY = wy;
    }
    if (firstWebY !== null) {
      const webPtX = isDoubleStem ? (hoopR - 10) : xStemCenter;
      const webLabelY = isSlabFlush ? (yGl - embedH * 0.25) : firstWebY;
      dxf += dCallout(webPtX, firstWebY, xIn + 80, webLabelY, xIn + 180, `腹筋: D10@300`, false, 48);
    }

    // スラブ筋 (スターラップまで延長配置)
    const sPitch = shortSpecStr.includes('@100') ? 100 : (shortSpecStr.includes('@200') ? 200 : 150);
    const stRefX = isDoubleStem ? hoopL : (xStemCenter - 10);

    if (isFG1) {
      // スラブ横筋をスターラップ位置(stRefX)までしっかり伸ばす
      dxf += dLine(stRefX, yTopLong, xBreak, yTopLong, "REBAR");
      if (isDoubleSlab) {
        dxf += dLine(stRefX, yBotLong, xBreak, yBotLong, "REBAR");
      }
      // スラブ短辺点筋もスターラップ近傍から配置する
      const startShortX = isDoubleStem ? (hoopR + 25) : (stRefX + 35);
      let spx = startShortX;
      const shortPts = [];
      while (spx < xBreak - 20) {
        dxf += dCircle(spx, yTopShort, rShort, "REBAR");
        if (isDoubleSlab) dxf += dCircle(spx, yBotShort, rShort, "REBAR");
        shortPts.push(spx);
        spx += sPitch;
      }
      if (shortPts.length > 0) {
        const ptTarget = shortPts.length > 1 ? shortPts[1] : shortPts[0];
        dxf += dCallout(ptTarget, yTopShort, ptTarget + 40, ySlabTop + 70, ptTarget + 120, `スラブ短辺: ${shortSpecStr}${isDoubleSlab ? ' (W)' : ''}`, false, 50);
      }
      dxf += dCallout(xBreak - 90, yTopLong, xBreak - 40, ySlabBot - 85, xBreak + 20, `スラブ長辺: ${longSpecStr}`, false, 50);
    } else {
      dxf += dLine(xBreakL, yTopLong, xBreakR, yTopLong, "REBAR");
      if (isDoubleSlab) {
        dxf += dLine(xBreakL, yBotLong, xBreakR, yBotLong, "REBAR");
      }
      let spx = xBreakL + 25;
      let firstPt = null;
      while (spx < xBreakR - 20) {
        dxf += dCircle(spx, yTopShort, rShort, "REBAR");
        if (isDoubleSlab) dxf += dCircle(spx, yBotShort, rShort, "REBAR");
        if (!firstPt && spx > xIn + 15) firstPt = spx;
        spx += sPitch;
      }
      if (firstPt) {
        dxf += dCallout(firstPt, yTopShort, firstPt + 30, ySlabTop + 70, xBreakR + 30, `スラブ短辺: ${shortSpecStr}${isDoubleSlab ? ' (W)' : ''}`, false, 50);
      }
      dxf += dCallout(xBreakR - 60, yTopLong, xBreakR - 20, ySlabBot - 85, xBreakR + 30, `スラブ長辺: ${longSpecStr}`, false, 50);
    }

    // 寸法線 (leftEdgeX基準で配置し、FG2でもスラブやGL文字と一切被らないように整列)
    dxf += dDim(xOut, yTop + 35, xIn, yTop + 35, `${stemW}`, false, 1, 45);
    dxf += dDim(leftEdgeX - 60, yGl, leftEdgeX - 60, ySlabTop, `+${glToSlab}`, true, -1, 45);
    dxf += dDim(leftEdgeX - 220, yGl, leftEdgeX - 220, yTop, `天端 ${aboveGl}`, true, -1, 45);
    dxf += dDim(leftEdgeX - 220, yBot, leftEdgeX - 220, yGl, `H=${embedH}`, true, -1, 45);
    dxf += dDim(leftEdgeX - 550, yBot, leftEdgeX - 550, yTop, `全高 ${totalH}`, true, -1, 48);

    if (isFG1) {
      if (!isMatchStem && toeW > 0) {
        dxf += dDim(xOut, yBot - 80, xIn, yBot - 80, `${stemW}`, false, -1, 45);
        dxf += dDim(xIn, yBot - 80, xBaseEnd, yBot - 80, `${toeW}`, false, -1, 45);
        dxf += dDim(xOut, yBot - 170, xBaseEnd, yBot - 170, `底盤幅 ${totalBaseW}`, false, -1, 48);
      } else {
        dxf += dDim(xOut, yBot - 80, xBaseEnd, yBot - 80, `幅 ${totalBaseW}`, false, -1, 48);
      }
    }

    // 基準レベル対比表 & 重心距離dt・有効梁成d算定表 (大型文字対応)
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

      const tx = ox + 1180;
      const ty = yTop + 180;
      const tw = 1520;
      const th = 1060;

      // 外枠
      dxf += dLine(tx, ty, tx + tw, ty, "TABLE_LINE");
      dxf += dLine(tx + tw, ty, tx + tw, ty - th, "TABLE_LINE");
      dxf += dLine(tx + tw, ty - th, tx, ty - th, "TABLE_LINE");
      dxf += dLine(tx, ty - th, tx, ty, "TABLE_LINE");

      dxf += dText("【 基準レベル対比表 (高さ±表示) 】", tx + 35, ty - 75, "TEXT", 55);
      dxf += dLine(tx + 25, ty - 100, tx + tw - 25, ty - 100, "TABLE_LINE");

      dxf += dText("項目", tx + 40, ty - 170, "TEXT", 48);
      dxf += dText("設計GL基準(±)", tx + 420, ty - 170, "TEXT", 48);
      dxf += dText("平均GL基準(±)", tx + 980, ty - 170, "TEXT", 48);

      dxf += dText("立上り天端", tx + 40, ty - 245, "TEXT", 48);
      dxf += dText(`+${aboveGl} mm`, tx + 420, ty - 245, "TEXT", 48);
      dxf += dText(`${topAvgVal >= 0 ? '+' : ''}${topAvgVal} mm`, tx + 980, ty - 245, "TEXT", 48);

      dxf += dText("根入れ底面", tx + 40, ty - 320, "TEXT", 48);
      dxf += dText(`-${embedH} mm (H=${embedH})`, tx + 420, ty - 320, "TEXT", 48);
      dxf += dText(`${botAvgVal >= 0 ? '+' : ''}${botAvgVal} mm`, tx + 980, ty - 320, "TEXT", 48);

      dxf += dText(`スラブ天端: 設計GL +${glToSlab}mm / 平均GL ${slabAvgVal >= 0 ? '+' : ''}${slabAvgVal}mm (差:${diffStr})`, tx + 40, ty - 400, "TEXT", 45);

      dxf += dLine(tx + 25, ty - 435, tx + tw - 25, ty - 435, "TABLE_LINE");
      dxf += dText(`【 梁成D=${concD}mm (レベラー抜)・有効梁成d 算定 】`, tx + 35, ty - 510, "TEXT", 52);

      // 左ボックス (上主筋)
      const boxTopY = ty - 545;
      const boxBotY = ty - 910;
      const boxMidL = tx + tw / 2 - 15;
      dxf += dLine(tx + 30, boxTopY, boxMidL, boxTopY, "TABLE_LINE");
      dxf += dLine(boxMidL, boxTopY, boxMidL, boxBotY, "TABLE_LINE");
      dxf += dLine(boxMidL, boxBotY, tx + 30, boxBotY, "TABLE_LINE");
      dxf += dLine(tx + 30, boxBotY, tx + 30, boxTopY, "TABLE_LINE");

      dxf += dText(`▲ 上主筋 (${b.topSpec})`, tx + 50, boxTopY - 70, "TEXT", 48);
      dxf += dText(`重心距離 dt : ${dtTopStr} mm`, tx + 50, boxTopY - 150, "TEXT", 48);
      dxf += dText(`有効梁成 d  : ${dEffTopStr} mm`, tx + 50, boxTopY - 230, "TEXT", 48);
      dxf += dText(`(天端かぶり40+STP見込)`, tx + 50, boxTopY - 310, "TEXT", 45);

      // 右ボックス (下主筋)
      const boxMidR = tx + tw / 2 + 15;
      const boxRight = tx + tw - 30;
      dxf += dLine(boxMidR, boxTopY, boxRight, boxTopY, "TABLE_LINE");
      dxf += dLine(boxRight, boxTopY, boxRight, boxBotY, "TABLE_LINE");
      dxf += dLine(boxRight, boxBotY, boxMidR, boxBotY, "TABLE_LINE");
      dxf += dLine(boxMidR, boxBotY, boxMidR, boxTopY, "TABLE_LINE");

      dxf += dText(`▼ 下主筋 (${b.botSpec})`, boxMidR + 20, boxTopY - 70, "TEXT", 48);
      dxf += dText(`重心距離 dt : ${dtBotStr} mm`, boxMidR + 20, boxTopY - 150, "TEXT", 48);
      dxf += dText(`有効梁成 d  : ${dEffBotStr} mm`, boxMidR + 20, boxTopY - 230, "TEXT", 48);
      dxf += dText(`(底面かぶり60+STP見込)`, boxMidR + 20, boxTopY - 310, "TEXT", 45);

      dxf += dLine(tx + 25, ty - 945, tx + tw - 25, ty - 945, "TABLE_LINE");
      dxf += dText("※腹筋はD10＠300以下で配す。底面かぶり厚60mm。", tx + 40, ty - 1015, "TEXT", 48);
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
