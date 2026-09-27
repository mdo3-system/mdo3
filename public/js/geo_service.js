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
async function geocodeAddress(query) {
  if (!query || typeof query !== 'string') {
    return { lat: 35.9247, lon: 139.4842, title: '埼玉県川越市幸町' };
  }
  const trimmed = query.trim();
  if (!trimmed) {
    return { lat: 35.9247, lon: 139.4842, title: '埼玉県川越市幸町' };
  }

  // ■ 内蔵マスターによるフォールバック座標を事前解決 (0msで確実に取得可能)
  let fallbackCoords = null;
  const db = (typeof REGIONAL_DATABASE !== 'undefined' ? REGIONAL_DATABASE : null) ||
             (typeof window !== 'undefined' && window.REGIONAL_DATABASE ? window.REGIONAL_DATABASE : null) ||
             (() => { try { return require('./regional_calc.js').REGIONAL_DATABASE; } catch (e) { return null; } })();

  if (db && db.prefectures) {
    for (const [pref, d] of Object.entries(db.prefectures)) {
      if (trimmed.includes(pref)) {
        fallbackCoords = { lat: d.lat, lon: d.lon, title: trimmed };
        break;
      }
    }
  }
  if (!fallbackCoords && db && Array.isArray(db.cities)) {
    for (const c of db.cities) {
      if (c.match && trimmed.includes(c.match)) {
        const prefData = db.prefectures && db.prefectures[c.pref];
        if (prefData) {
          fallbackCoords = { lat: prefData.lat, lon: prefData.lon, title: `${c.pref}${c.match}` };
          break;
        }
      }
    }
  }
  if (!fallbackCoords) {
    fallbackCoords = { lat: 35.9247, lon: 139.4842, title: trimmed || '埼玉県川越市幸町' };
  }

  // サーキットブレーカー判定: 直近60秒以内に障害が発生していたら外部APIを呼ばず即答
  const now = Date.now();
  if (!_gsiServiceAvailable && (now - _lastGsiFailureTime < GSI_CIRCUIT_COOLDOWN_MS)) {
    return fallbackCoords;
  }

  // 1. 国土地理院 ジオコーダー (1秒タイムアウト)
  try {
    const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(trimmed)}`;
    const res = await fetchWithTimeout(url, {}, 1000);
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
    _gsiServiceAvailable = false;
    _lastGsiFailureTime = Date.now();
  }

  // 2. 内蔵マスターの座標を即座に返却 (一切ハングさせない)
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

