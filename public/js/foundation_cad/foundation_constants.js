/**
 * foundation_constants.js
 * 基礎梁断面詳細図＆dt算定 共通定数・規格データ
 */

export const REBAR_DATA = {
  'D10': { d: 9.53, r: 4.765, a: 71.33 },
  'D13': { d: 12.7,  r: 6.35,  a: 126.7 },
  'D16': { d: 15.9,  r: 7.95,  a: 198.6 },
  'D19': { d: 19.1,  r: 9.55,  a: 286.5 }
};

export const DEFAULT_BEAMS = [
  {
    id: 'FG1',
    title: 'FG1',
    baseSpec: 'FG1',
    baseToeWidthType: 'matchStem',
    stemArrangement: 'single',
    slabArrangement: 'double',
    stemW: 150,
    slabT: 180,
    aboveGl: 400,
    embedH: 500,
    glToSlab: 50,
    levelerT: 10,
    topSpec: '1-D13',
    botSpec: '1-D13',
    stirrupBar: 'D10@200',
    incTopStirrup: true,
    incBotStirrup: true
  },
  {
    id: 'FG2',
    title: 'FG2',
    baseSpec: 'FG2',
    baseToeWidthType: 'matchStem',
    stemArrangement: 'single',
    slabArrangement: 'double',
    stemW: 150,
    slabT: 180,
    aboveGl: 400,
    embedH: 100,
    glToSlab: 50,
    levelerT: 10,
    topSpec: '2-D13',
    botSpec: '1-D13',
    stirrupBar: 'D10@200',
    incTopStirrup: true,
    incBotStirrup: true
  }
];

export const DEFAULT_AVG_GL = {
  show: true,
  diff: -100
};

export const DEFAULT_SLAB_COMMON = {
  shortBar: 'D13@150',
  longBar: 'D10@300'
};

export const STORAGE_KEY = 'FOUNDATION_CAD_PRO_STATE_V5';
