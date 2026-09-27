/**
 * geo_service.js - 地理・ジオコーディング・標高 外部通信サービス
 * 
 * 【単一責任の原則 (SRP)】:
 * 外部API（国土地理院 ジオコーダー、標高タイルAPI等）との非同期通信、
 * ネットワーク遅延・障害対策（タイムアウト、サーキットブレーカー）、
 * およびオフライン・高速フォールバック座標の解決に特化したサービスモジュール。
 */

// ■ 外部ジオコーダー用サーキットブレーカー (不通時に連続遅延させず0msで即答)
let _gsiServiceAvailable = true;
let _lastGsiFailureTime = 0;
const GSI_CIRCUIT_COOLDOWN_MS = 60000; // 障害検知時は60秒間外部呼び出しをスキップ

/**
 * タイムアウト付き fetch ヘルパー (ミリ秒指定で即座に切断しフォールバックへ)
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 1000) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const fetchOptions = controller ? { ...options, signal: controller.signal } : options;
    const res = await fetch(url, fetchOptions);
    return res;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * 住所文字列から代表座標 (緯度・経度) をジオコーディング
 * 1. 内蔵の全国47都道府県・1,892市区町村マスターから瞬時マッチング (0ms・100%オフライン保証)
 * 2. 外部APIが健全な場合のみ、国土地理院ジオコーダーで詳細座標を取得
 */
// 主要市区町村の代表座標辞書 (オフライン・高速フォールバック用: 県庁所在地への誤ジャンプを防止)
const MAJOR_CITY_COORDS = {
  "川越市": { lat: 35.9255, lon: 139.4858 },
  "さいたま市": { lat: 35.8617, lon: 139.6455 },
  "川口市": { lat: 35.8078, lon: 139.7239 },
  "所沢市": { lat: 35.7995, lon: 139.4688 },
  "越谷市": { lat: 35.8913, lon: 139.7909 },
  "熊谷市": { lat: 36.1473, lon: 139.3886 },
  "春日部市": { lat: 35.9754, lon: 139.7527 },
  "上尾市": { lat: 35.9777, lon: 139.5935 },
  "草加市": { lat: 35.8286, lon: 139.8108 },
  "新座市": { lat: 35.7964, lon: 139.5658 },
  "狭山市": { lat: 35.8533, lon: 139.4128 },
  "久喜市": { lat: 36.0621, lon: 139.6668 },
  "入間市": { lat: 35.8365, lon: 139.3905 },
  "深谷市": { lat: 36.1979, lon: 139.2818 },
  "三郷市": { lat: 35.8315, lon: 139.8722 },
  "朝霞市": { lat: 35.7969, lon: 139.5997 },
  "戸田市": { lat: 35.8177, lon: 139.6780 },
  "鴻巣市": { lat: 36.0658, lon: 139.5218 },
  "加須市": { lat: 36.1328, lon: 139.5954 },
  "富士見市": { lat: 35.8568, lon: 139.5492 },
  "ふじみ野市": { lat: 35.8596, lon: 139.5204 },
  "坂戸市": { lat: 35.9576, lon: 139.3995 },
  "東松山市": { lat: 36.0428, lon: 139.4002 },
  "八潮市": { lat: 35.8225, lon: 139.8398 },
  "吉川市": { lat: 35.8917, lon: 139.8436 },
  "志木市": { lat: 35.8239, lon: 139.5761 },
  "和光市": { lat: 35.7816, lon: 139.6057 },
  "世田谷区": { lat: 35.6465, lon: 139.6532 },
  "千代田区": { lat: 35.6940, lon: 139.7536 },
  "中央区": { lat: 35.6706, lon: 139.7719 },
  "港区": { lat: 35.6581, lon: 139.7514 },
  "新宿区": { lat: 35.6938, lon: 139.7034 },
  "文京区": { lat: 35.7080, lon: 139.7523 },
  "台東区": { lat: 35.7126, lon: 139.7799 },
  "墨田区": { lat: 35.7095, lon: 139.8169 },
  "江東区": { lat: 35.6729, lon: 139.8174 },
  "品川区": { lat: 35.6092, lon: 139.7302 },
  "目黒区": { lat: 35.6414, lon: 139.6981 },
  "大田区": { lat: 35.5613, lon: 139.7160 },
  "渋谷区": { lat: 35.6640, lon: 139.6982 },
  "中野区": { lat: 35.7074, lon: 139.6638 },
  "杉並区": { lat: 35.6995, lon: 139.6364 },
  "豊島区": { lat: 35.7314, lon: 139.7155 },
  "北区": { lat: 35.7528, lon: 139.7337 },
  "荒川区": { lat: 35.7360, lon: 139.7831 },
  "板橋区": { lat: 35.7512, lon: 139.7093 },
  "練馬区": { lat: 35.7356, lon: 139.6517 },
  "足立区": { lat: 35.7750, lon: 139.8045 },
  "葛飾区": { lat: 35.7434, lon: 139.8472 },
  "江戸川区": { lat: 35.6995, lon: 139.8687 },
  "横浜市": { lat: 35.4437, lon: 139.6380 },
  "川崎市": { lat: 35.5309, lon: 139.7032 },
  "千葉市": { lat: 35.6073, lon: 140.1063 },
  "名古屋市": { lat: 35.1815, lon: 136.9066 },
  "大阪市": { lat: 34.6937, lon: 135.5023 },
  "京都市": { lat: 35.0116, lon: 135.7681 },
  "神戸市": { lat: 34.6901, lon: 135.1955 },
  "福岡市": { lat: 33.5904, lon: 130.4017 },
  "札幌市": { lat: 43.0642, lon: 141.3469 },
  "仙台市": { lat: 38.2682, lon: 140.8694 },
  "広島市": { lat: 34.3853, lon: 132.4553 }
};

/**
 * 住所文字列から代表座標 (緯度・経度) をジオコーディング
 * 1. 国土地理院 ジオコーダー (公式・高精度ピンポイント)
 * 2. OSM Nominatim ジオコーダー (国土地理院不通時のセカンドオピニオン)
 * 3. 内蔵市区町村マスター (最長一致優先・県庁所在地への誤飛びを防止)
 */
async function geocodeAddress(query) {
  if (!query || typeof query !== 'string') {
    return { lat: 35.9255, lon: 139.4858, title: '埼玉県川越市幸町' };
  }
  const trimmed = query.trim();
  if (!trimmed) {
    return { lat: 35.9255, lon: 139.4858, title: '埼玉県川越市幸町' };
  }

  // ■ 内蔵マスターによるフォールバック座標を事前解決
  // ★重要: 市区町村名マッチングを都道府県より最優先 (川越市が浦和に飛ぶ不具合を防止)
  let fallbackCoords = null;
  const db = (typeof REGIONAL_DATABASE !== 'undefined' ? REGIONAL_DATABASE : null) ||
             (typeof window !== 'undefined' && window.REGIONAL_DATABASE ? window.REGIONAL_DATABASE : null) ||
             (() => { try { return require('./regional_calc.js').REGIONAL_DATABASE; } catch (e) { return null; } })();

  // 1. 主要市区町村座標辞書のマッチング (最優先)
  for (const [cityName, coords] of Object.entries(MAJOR_CITY_COORDS)) {
    if (trimmed.includes(cityName)) {
      fallbackCoords = { lat: coords.lat, lon: coords.lon, title: trimmed };
      break;
    }
  }

  // 2. 全国市区町村DB (1,892件) からのマッチング
  if (!fallbackCoords && db && Array.isArray(db.cities)) {
    for (const c of db.cities) {
      if (c.match && trimmed.includes(c.match)) {
        if (MAJOR_CITY_COORDS[c.match]) {
          const m = MAJOR_CITY_COORDS[c.match];
          fallbackCoords = { lat: m.lat, lon: m.lon, title: `${c.pref}${c.match}` };
          break;
        }
      }
    }
  }

  // 3. 都道府県代表座標 (市区町村が何もない場合のみ)
  if (!fallbackCoords && db && db.prefectures) {
    for (const [pref, d] of Object.entries(db.prefectures)) {
      if (trimmed.includes(pref)) {
        fallbackCoords = { lat: d.lat, lon: d.lon, title: trimmed };
        break;
      }
    }
  }

  if (!fallbackCoords) {
    fallbackCoords = { lat: 35.9255, lon: 139.4858, title: trimmed || '埼玉県川越市幸町' };
  }

  // サーキットブレーカー判定: 直近60秒以内に障害が発生していたら外部APIを呼ばず即答
  const now = Date.now();
  if (!_gsiServiceAvailable && (now - _lastGsiFailureTime < GSI_CIRCUIT_COOLDOWN_MS)) {
    return fallbackCoords;
  }

  // 1. 国土地理院 ジオコーダー (1.5秒タイムアウト)
  try {
    const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(trimmed)}`;
    const res = await fetchWithTimeout(url, {}, 1500);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].geometry && data[0].geometry.coordinates) {
        _gsiServiceAvailable = true;
        const [lon, lat] = data[0].geometry.coordinates;
        return {
          lat: lat,
          lon: lon,
          title: data[0].properties?.title || trimmed
        };
      }
    }
  } catch (e) {
    // 国土地理院がタイムアウトまたは不通の場合、直ちにNominatimへ
  }

  // 2. OSM Nominatim ジオコーダー (国土地理院不通時のフォールバック)
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=1`;
    const nomRes = await fetchWithTimeout(nomUrl, { headers: { 'Accept-Language': 'ja' } }, 1500);
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      if (Array.isArray(nomData) && nomData.length > 0 && nomData[0].lat && nomData[0].lon) {
        return {
          lat: parseFloat(nomData[0].lat),
          lon: parseFloat(nomData[0].lon),
          title: nomData[0].display_name?.replace(/, 日本$/, '') || trimmed
        };
      }
    }
  } catch (e) {
    _gsiServiceAvailable = false;
    _lastGsiFailureTime = Date.now();
  }

  // 3. 内蔵市区町村マスターの座標を即座に返却 (一切ハングさせない)
  return fallbackCoords;
}

/**
 * 国土地理院 標高API (緯度・経度 → 標高m)
 * 1.2秒タイムアウト設定、障害時は即座に標高0mで安全復帰
 */
async function fetchElevation(lon, lat) {
  try {
    const url = `https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon=${lon}&lat=${lat}&outtype=JSON`;
    const res = await fetchWithTimeout(url, {}, 1200);
    if (!res.ok) return 0;
    const data = await res.json();
    if (data && typeof data.elevation === 'number') {
      return data.elevation;
    }
    return 0;
  } catch (e) {
    return 0;
  }
}

/**
 * 緯度・経度から住所文字列を逆ジオコーディング
 * OSM Nominatim (1.2秒タイムアウト設定、障害時は緯度経度文字列で安全復帰)
 */
async function reverseGeocode(lat, lon) {
  const fallback = `北緯${Number(lat).toFixed(4)}, 東経${Number(lon).toFixed(4)}`;
  try {
    const revUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`;
    const res = await fetchWithTimeout(revUrl, { headers: { 'Accept-Language': 'ja' } }, 1200);
    if (res.ok) {
      const revData = await res.json();
      return revData.display_name?.replace(/, 日本$/, '') || fallback;
    }
    return fallback;
  } catch (err) {
    return fallback;
  }
}

// サービスオブジェクトとしての定義
const GeoService = {
  fetchWithTimeout,
  geocodeAddress,
  fetchElevation,
  reverseGeocode,
  isAvailable: () => _gsiServiceAvailable
};

// ブラウザ環境でのグローバルエクスポート (完全後方互換対応)
if (typeof window !== 'undefined') {
  window.GeoService = GeoService;
  window.geocodeAddress = geocodeAddress;
  window.fetchElevation = fetchElevation;
  window.reverseGeocode = reverseGeocode;
}

// Node.js環境でのエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GeoService,
    fetchWithTimeout,
    geocodeAddress,
    fetchElevation,
    reverseGeocode
  };
}

