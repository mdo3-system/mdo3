/**
 * city_planning_service.js - 都市計画・WebGIS・国交省不動産情報ライブラリ連携サービス
 * 
 * 【単一責任の原則 (SRP)】:
 * 自治体公式都市計画WebGIS（東京23区・政令市・主要都市）、
 * 国土交通省「不動産情報ライブラリ（kCode連動）」、国土地理院「重ねるハザードマップ」、
 * および全国地価マップとの連携メタデータ生成に特化したサービスモジュール。
 */

// マスターデータの安全解決 (city_planning_data.js より参照・フォールバック対応)
const _getPrefectureCodes = () => {
  if (typeof PREFECTURE_CODES !== 'undefined') return PREFECTURE_CODES;
  if (typeof window !== 'undefined' && window.PREFECTURE_CODES) return window.PREFECTURE_CODES;
  if (typeof globalThis !== 'undefined' && globalThis.PREFECTURE_CODES) return globalThis.PREFECTURE_CODES;
  try { return require('./city_planning_data.js').PREFECTURE_CODES; } catch (e) { return {}; }
};

const _getTokyoWardsGis = () => {
  if (typeof TOKYO_23_WARDS_GIS !== 'undefined') return TOKYO_23_WARDS_GIS;
  if (typeof window !== 'undefined' && window.TOKYO_23_WARDS_GIS) return window.TOKYO_23_WARDS_GIS;
  if (typeof globalThis !== 'undefined' && globalThis.TOKYO_23_WARDS_GIS) return globalThis.TOKYO_23_WARDS_GIS;
  try { return require('./city_planning_data.js').TOKYO_23_WARDS_GIS; } catch (e) { return {}; }
};

const _getMajorCitiesGis = () => {
  if (typeof MAJOR_CITIES_GIS !== 'undefined') return MAJOR_CITIES_GIS;
  if (typeof window !== 'undefined' && window.MAJOR_CITIES_GIS) return window.MAJOR_CITIES_GIS;
  if (typeof globalThis !== 'undefined' && globalThis.MAJOR_CITIES_GIS) return globalThis.MAJOR_CITIES_GIS;
  try { return require('./city_planning_data.js').MAJOR_CITIES_GIS; } catch (e) { return {}; }
};

/**
 * 建設地情報（都道府県・市区町村・住所・緯度経度）から、
 * 各種都市計画WebGIS、国土交通省 不動産情報ライブラリ、重ねるハザードマップの連携メタデータを自動生成
 */
function getCityPlanningInfo(pref, cityName, address, lat, lon) {
  const safePref = pref || "";
  const safeCity = cityName || "";
  const safeAddr = address || "";

  const prefCodes = _getPrefectureCodes();
  const tokyoWards = _getTokyoWardsGis();
  const majorCities = _getMajorCitiesGis();

  const kCode = prefCodes[safePref] || "13"; // デフォルト東京都

  // 1. 自治体公式都市計画WebGISの判定
  let localGis = null;
  let isTokyoWard = false;

  // 23区判定
  if (safePref === "東京都" || safeAddr.includes("東京都")) {
    for (const [ward, info] of Object.entries(tokyoWards)) {
      if ((safeCity && safeCity.includes(ward)) || safeAddr.includes(ward)) {
        localGis = {
          wardName: ward,
          name: info.name,
          url: info.url,
          note: info.note,
          isOfficial: true,
          isWard: true
        };
        isTokyoWard = true;
        break;
      }
    }
  }

  // 主要都市判定
  if (!localGis) {
    for (const [cityKey, info] of Object.entries(majorCities)) {
      if ((safeCity && safeCity.includes(cityKey)) || safeAddr.includes(cityKey)) {
        localGis = {
          wardName: cityKey,
          name: info.name,
          url: info.url,
          note: "用途地域、防火・準防火、高度地区、地区計画等",
          isOfficial: true,
          isWard: false
        };
        break;
      }
    }
  }

  // 未登録自治体向けスマート検索フォールバック
  if (!localGis) {
    const searchTarget = `${safePref} ${safeCity || ''}`.trim() || '自治体';
    const googleQuery = `${searchTarget} 都市計画情報 用途地域 WebGIS`;
    localGis = {
      wardName: safeCity || safePref || "所管自治体",
      name: `${searchTarget} 都市計画情報マップ`,
      url: `https://www.google.com/search?q=${encodeURIComponent(googleQuery)}`,
      note: "自治体公開都市計画WebGIS・用途地域閲覧ページを検索",
      isOfficial: false,
      isSmartSearch: true
    };
  }

  // 東京都広域 wagmap リンク
  const tokyoWagmap = (safePref === "東京都" || safeAddr.includes("東京都")) ? {
    name: "東京都 都市計画情報等提供サービス (wagmap)",
    url: "https://www2.wagmap.jp/tokyo_tokeizu/"
  } : null;

  // 国土交通省 不動産情報ライブラリ (旧土地情報システム) リンク
  // 都道府県 kCode を指定して地域検索初期状態で開く
  const reinfolibMapUrl = `https://www.reinfolib.mlit.go.jp/map/?initialState=areaOpen&areaOption=address&kCode=${kCode}&sCode=0`;
  const reinfolibLandPriceUrl = "https://www.reinfolib.mlit.go.jp/landPrices/";

  // 国土地理院 重ねるハザードマップ (該当座標ピンポイント表示)
  let hazardMapUrl = "https://disaportal.gsi.go.jp/maps/";
  if (lat && lon && typeof lat === 'number' && typeof lon === 'number') {
    hazardMapUrl = `https://disaportal.gsi.go.jp/maps/?ll=${lat.toFixed(6)},${lon.toFixed(6)}&z=16&base=pale&vs=c1j0l0u0t0h0z0`;
  }

  // 全国地価マップ (固定資産税・相続税路線価・地価公示)
  const chikamapUrl = "https://www.chikamap.jp/";

  return {
    kCode: kCode,
    pref: safePref,
    cityName: safeCity,
    isTokyoWard: isTokyoWard,
    localGis: localGis,
    tokyoWagmap: tokyoWagmap,
    reinfolibMapUrl: reinfolibMapUrl,
    reinfolibLandPriceUrl: reinfolibLandPriceUrl,
    hazardMapUrl: hazardMapUrl,
    chikamapUrl: chikamapUrl
  };
}

// サービスオブジェクトとしての定義
const CityPlanningService = {
  getCityPlanningInfo
};

// ブラウザ環境でのグローバルエクスポート (完全後方互換対応)
if (typeof window !== 'undefined') {
  window.CityPlanningService = CityPlanningService;
  window.getCityPlanningInfo = getCityPlanningInfo;
}

// Node.js環境でのエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CityPlanningService,
    getCityPlanningInfo
  };
}
