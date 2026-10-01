/**
 * foundation_calc.js
 * 基礎梁幾何学・重心距離dt・有効梁成d算定ロジック（UI非依存）
 */

import { REBAR_DATA } from './foundation_constants.js';

export function getBarRadius(str) {
  if (!str) return 6.0;
  if (str.includes('D10')) return 4.5;
  if (str.includes('D13')) return 6.0;
  if (str.includes('D16')) return 7.5;
  if (str.includes('D19')) return 9.0;
  return 6.0;
}

export function calcRebarDt(spec, isTop, isMatchStem, stirrupStr, incStirrup, isDoubleStem) {
  try {
    const dst = (incStirrup !== false)
      ? ((stirrupStr && stirrupStr.includes('D13')) ? REBAR_DATA['D13'].d : REBAR_DATA['D10'].d)
      : 0;
    const clearGap = 30;

    if (isTop) {
      const coverNet = 40 + dst;
      const is2Row = (spec && (spec.includes('2段') || spec.includes('+')));

      if (is2Row) {
        let r1 = REBAR_DATA['D13'].r;
        let r2 = REBAR_DATA['D13'].r;
        if (spec.startsWith('2-D16') || spec.includes('D16+')) { r1 = REBAR_DATA['D16'].r; }
        if (spec.includes('2段2-D16') || spec.includes('2段D16')) { r2 = REBAR_DATA['D16'].r; }

        const y1 = coverNet + r1;
        const y2 = y1 + r1 + clearGap + r2;
        const dt = (y1 + y2) / 2;
        return { dt: dt, is2Row: true, d1: y1, d2: y2 };
      } else if (spec && spec.startsWith('2-') && !isDoubleStem) {
        const dKey = spec.includes('D16') ? 'D16' : 'D13';
        const db = REBAR_DATA[dKey] || REBAR_DATA['D13'];
        const y1 = coverNet + db.r;
        const y2 = y1 + db.r + clearGap + db.r;
        const dt = (y1 + y2) / 2;
        return { dt: dt, is2Row: true, d1: y1, d2: y2 };
      } else {
        const dKey = (spec && spec.includes('D16')) ? 'D16' : 'D13';
        const db = REBAR_DATA[dKey] || REBAR_DATA['D13'];
        const y1 = coverNet + db.r;
        return { dt: y1, is2Row: false, d1: y1, d2: null };
      }
    } else {
      const coverNet = 60 + dst;
      const is2Row = (spec && (spec.includes('2段') || spec.includes('+')));

      if (is2Row) {
        let r1 = REBAR_DATA['D13'].r;
        let r2 = REBAR_DATA['D16'].r;

        if (spec.startsWith('D16+2段D13')) {
          r1 = REBAR_DATA['D16'].r;
          r2 = REBAR_DATA['D13'].r;
        } else if (spec.startsWith('D13+2段D16') || spec.includes('2-D13+2段2-D16')) {
          r1 = REBAR_DATA['D13'].r;
          r2 = REBAR_DATA['D16'].r;
        } else if (spec.includes('D16')) {
          r1 = REBAR_DATA['D16'].r;
          r2 = REBAR_DATA['D16'].r;
        } else {
          r1 = REBAR_DATA['D13'].r;
          r2 = REBAR_DATA['D13'].r;
        }

        const y1 = coverNet + r1;
        const y2 = y1 + r1 + clearGap + r2;
        const dt = (y1 + y2) / 2;
        return { dt: dt, is2Row: true, d1: y1, d2: y2 };
      } else {
        const dKey = (spec && spec.includes('D16')) ? 'D16' : 'D13';
        const db = REBAR_DATA[dKey] || REBAR_DATA['D13'];
        const y1 = coverNet + db.r;
        return { dt: y1, is2Row: false, d1: y1, d2: null };
      }
    }
  } catch (e) {
    return { dt: isTop ? 56.5 : 76.5, is2Row: false, d1: isTop ? 56.5 : 76.5, d2: null };
  }
}

/**
 * 基礎梁の全高・梁成・各基準高さを計算して返すヘルパー
 */
export function calcBeamHeights(beam, avgGlDiff = 0) {
  const aboveGl = (typeof beam.aboveGl === 'number') ? beam.aboveGl : 400;
  const embedH = (typeof beam.embedH === 'number') ? beam.embedH : 500;
  const totalH = aboveGl + embedH;
  const concD = Math.max(totalH - (beam.levelerT || 0), 100);

  // 平均GL対比計算
  const topDesGl = aboveGl;
  const botDesGl = -embedH;
  const topAvgGl = aboveGl - avgGlDiff;
  const botAvgGl = -embedH - avgGlDiff;
  const slabAvgGl = (beam.glToSlab || 50) - avgGlDiff;

  return {
    aboveGl,
    embedH,
    totalH,
    concD,
    topDesGl,
    botDesGl,
    topAvgGl,
    botAvgGl,
    slabAvgGl
  };
}
