# -*- coding: utf-8 -*-
"""
tools/update_regional_calc_js.py

public/js/regional_calc.js を全国47都道府県・全1,892市区町村の完全網羅データベースで更新するスクリプト
- 静岡県地震地域係数 Zs=1.2 (静岡県建築基準条例・建築構造設計指針) の並記対応
"""

import json
import re

def main():
    with open('tools/all_japan_cities_database.json', 'r', encoding='utf-8') as f:
        cities = json.load(f)

    # cities 配列を最長一致（文字数の長い順）優先で安定ソートしておく
    cities.sort(key=lambda x: (x['pref'], -len(x['match'])))

    cities_lines = []
    for c in cities:
        p_str = json.dumps(c['pref'], ensure_ascii=False)
        m_str = json.dumps(c['match'], ensure_ascii=False)
        f_str = json.dumps(c['freeze'], ensure_ascii=False)
        s_str = json.dumps(c['solarRegion'], ensure_ascii=False)
        snow_str = "true" if c['isSnowHeavy'] else "false"
        zs_val = "1.2" if c.get('zs') else "null"
        line = f"    {{ pref: {p_str}, match: {m_str}, z: {c['z']}, zs: {zs_val}, v0: {c['v0']}, sBase: {c['sBase']}, isSnowHeavy: {snow_str}, freeze: {f_str}, energyRegion: {c['energyRegion']}, solarRegion: {s_str} }},"
        cities_lines.append(line)

    cities_block = "\n".join(cities_lines)

    # 47都道府県のデフォルト定義（告示1793号・1454号・静岡県条例準拠）
    prefectures_block = """    "北海道": { z: 0.9, zs: null, v0: 32, sDefault: 100, isSnowHeavy: true, freezeDepth: "60〜100cm (道基準)", energyRegion: 2, solarRegion: "A1", lat: 43.0642, lon: 141.3469 },
    "青森県": { z: 0.9, zs: null, v0: 32, sDefault: 120, isSnowHeavy: true, freezeDepth: "60cm (県北寒冷地基準)", energyRegion: 3, solarRegion: "A1", lat: 40.8244, lon: 140.7400 },
    "岩手県": { z: 1.0, zs: null, v0: 30, sDefault: 70, isSnowHeavy: true, freezeDepth: "50〜60cm (岩手県基準)", energyRegion: 3, solarRegion: "A2", lat: 39.7036, lon: 141.1527 },
    "宮城県": { z: 1.0, zs: null, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "30cm (仙台平野基準)", energyRegion: 4, solarRegion: "A3", lat: 38.2682, lon: 140.8694 },
    "秋田県": { z: 0.9, zs: null, v0: 32, sDefault: 100, isSnowHeavy: true, freezeDepth: "45〜60cm (秋田県基準)", energyRegion: 3, solarRegion: "A1", lat: 39.7186, lon: 140.1024 },
    "山形県": { z: 0.9, zs: null, v0: 30, sDefault: 100, isSnowHeavy: true, freezeDepth: "45〜60cm (山形県基準)", energyRegion: 4, solarRegion: "A2", lat: 38.2404, lon: 140.3633 },
    "福島県": { z: 1.0, zs: null, v0: 30, sDefault: 40, isSnowHeavy: false, freezeDepth: "30cm (中通り基準)", energyRegion: 4, solarRegion: "A3", lat: 37.7503, lon: 140.4678 },
    "茨城県": { z: 1.0, zs: null, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 5, solarRegion: "A4", lat: 36.3418, lon: 140.4468 },
    "栃木県": { z: 1.0, zs: null, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 5, solarRegion: "A4", lat: 36.5657, lon: 139.8836 },
    "群馬県": { z: 1.0, zs: null, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 5, solarRegion: "A4", lat: 36.3907, lon: 139.0604 },
    "埼玉県": { z: 1.0, zs: null, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 35.8569, lon: 139.6489 },
    "千葉県": { z: 1.0, zs: null, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 35.6051, lon: 140.1233 },
    "東京都": { z: 1.0, zs: null, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 35.6895, lon: 139.6917 },
    "神奈川県": { z: 1.0, zs: null, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 35.4478, lon: 139.6425 },
    "新潟県": { z: 0.9, zs: null, v0: 32, sDefault: 120, isSnowHeavy: true, freezeDepth: "30〜45cm (新潟県基準)", energyRegion: 5, solarRegion: "A2", lat: 37.9026, lon: 139.0232 },
    "富山県": { z: 0.9, zs: null, v0: 30, sDefault: 120, isSnowHeavy: true, freezeDepth: "指定なし (≧240mm)", energyRegion: 5, solarRegion: "A2", lat: 36.6953, lon: 137.2113 },
    "石川県": { z: 0.9, zs: null, v0: 32, sDefault: 100, isSnowHeavy: true, freezeDepth: "指定なし (≧240mm)", energyRegion: 5, solarRegion: "A3", lat: 36.5947, lon: 136.6256 },
    "福井県": { z: 0.9, zs: null, v0: 32, sDefault: 100, isSnowHeavy: true, freezeDepth: "指定なし (≧240mm)", energyRegion: 5, solarRegion: "A3", lat: 36.0652, lon: 136.2216 },
    "山梨県": { z: 1.0, zs: null, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "30cm (甲府盆地基準)", energyRegion: 5, solarRegion: "A3", lat: 35.6639, lon: 138.5684 },
    "長野県": { z: 1.0, zs: null, v0: 30, sDefault: 50, isSnowHeavy: false, freezeDepth: "60cm (長野県寒冷地基準)", energyRegion: 4, solarRegion: "A3", lat: 36.2381, lon: 137.9720 },
    "岐阜県": { z: 1.0, zs: null, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 35.3912, lon: 136.7223 },
    "静岡県": { z: 1.0, zs: 1.2, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (※静岡県条例によりZs=1.2割増義務)", energyRegion: 6, solarRegion: "A4", lat: 34.9756, lon: 138.3828 },
    "愛知県": { z: 1.0, zs: null, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 35.1802, lon: 136.9066 },
    "三重県": { z: 1.0, zs: null, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (沿岸36〜38m/s)", energyRegion: 6, solarRegion: "A4", lat: 34.7303, lon: 136.5086 },
    "滋賀県": { z: 1.0, zs: null, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "南部指定なし / 湖北豪雪30cm", energyRegion: 6, solarRegion: "A3", lat: 35.0045, lon: 135.8686 },
    "京都府": { z: 1.0, zs: null, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "南部指定なし / 丹後30cm", energyRegion: 6, solarRegion: "A4", lat: 35.0212, lon: 135.7556 },
    "大阪府": { z: 1.0, zs: null, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 34.6863, lon: 135.5200 },
    "兵庫県": { z: 1.0, zs: null, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "南部指定なし / 但馬30cm", energyRegion: 6, solarRegion: "A4", lat: 34.6913, lon: 135.1830 },
    "奈良県": { z: 1.0, zs: null, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 34.6853, lon: 135.8327 },
    "和歌山県": { z: 1.0, zs: null, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (潮岬・沿岸36〜38m/s)", energyRegion: 6, solarRegion: "A4", lat: 34.2260, lon: 135.1675 },
    "鳥取県": { z: 0.9, zs: null, v0: 32, sDefault: 80, isSnowHeavy: true, freezeDepth: "指定なし (≧240mm)", energyRegion: 5, solarRegion: "A3", lat: 35.5039, lon: 134.2377 },
    "島根県": { z: 0.9, zs: null, v0: 32, sDefault: 40, isSnowHeavy: false, freezeDepth: "指定なし (≧240mm)", energyRegion: 6, solarRegion: "A3", lat: 35.4723, lon: 133.0505 },
    "岡山県": { z: 0.9, zs: null, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "南部指定なし / 北部30cm", energyRegion: 6, solarRegion: "A4", lat: 34.6618, lon: 133.9350 },
    "広島県": { z: 0.9, zs: null, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "南部指定なし / 北部30cm", energyRegion: 6, solarRegion: "A4", lat: 34.3963, lon: 132.4594 },
    "山口県": { z: 0.8, zs: null, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 34.1858, lon: 131.4705 },
    "徳島県": { z: 1.0, zs: null, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (沿岸36m/s)", energyRegion: 6, solarRegion: "A4", lat: 34.0658, lon: 134.5594 },
    "香川県": { z: 1.0, zs: null, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 34.3402, lon: 134.0433 },
    "愛媛県": { z: 0.9, zs: null, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (沿岸36m/s)", energyRegion: 6, solarRegion: "A4", lat: 33.8417, lon: 132.7661 },
    "高知県": { z: 0.9, zs: null, v0: 36, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (室戸・土佐清水38m/s)", energyRegion: 6, solarRegion: "A5", lat: 33.5597, lon: 133.5311 },
    "福岡県": { z: 0.8, zs: null, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 33.6064, lon: 130.4183 },
    "佐賀県": { z: 0.8, zs: null, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (唐津34m/s)", energyRegion: 6, solarRegion: "A4", lat: 33.2494, lon: 130.2988 },
    "長崎県": { z: 0.8, zs: null, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (離島・沿岸36m/s)", energyRegion: 6, solarRegion: "A4", lat: 32.7448, lon: 129.8737 },
    "熊本県": { z: 0.9, zs: null, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし / 阿蘇30cm", energyRegion: 6, solarRegion: "A4", lat: 32.7898, lon: 130.7417 },
    "大分県": { z: 0.9, zs: null, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし / 久住30cm", energyRegion: 6, solarRegion: "A4", lat: 33.2382, lon: 131.6126 },
    "宮崎県": { z: 0.9, zs: null, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (日南36m/s)", energyRegion: 6, solarRegion: "A5", lat: 31.9111, lon: 131.4239 },
    "鹿児島県": { z: 0.8, zs: null, v0: 36, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (奄美Z=0.9, 枕崎38, 奄美42m/s)", energyRegion: 6, solarRegion: "A5", lat: 31.5602, lon: 130.5581 },
    "沖縄県": { z: 0.7, zs: null, v0: 42, sDefault: 0, isSnowHeavy: false, freezeDepth: "指定なし (宮古・石垣46m/s, 台風常襲)", energyRegion: 8, solarRegion: "A5", lat: 26.2124, lon: 127.6809 }"""

    # 新しい regional_calc.js の内容を組み立てる
    js_content = f"""/**
 * public/js/regional_calc.js
 * 
 * 構造設計用 地域定数 自動検索エンジン (mdo3.com)
 * - 全47都道府県・全1,892市区町村 完全網羅マスター
 * - 地震地域係数 Z (昭和55年建設省告示第1793号)
 * - 静岡県地震地域係数 Zs=1.2 (静岡県建築基準条例・建築構造設計指針 並記対応)
 * - 基準風速 V0 (平成12年建設省告示第1454号)
 * - 垂直積雪量 S (平成19年国交省告示第594号 / 特定行政庁規則)
 * - 凍結深度 (各自治体施行細則・公庫共通仕様書基準)
 * - 省エネ地域区分 (平成25年経産省・国交省告示第1号 / 建築物省エネ法 1〜8地域)
 * - 年間日射地域区分 (A1〜A5区分)
 * - 国土地理院 ジオコーディングAPI & 標高API連携
 */

const REGIONAL_DATABASE = {{
  // 省エネ地域区分ごとの断熱等性能等級 (UA値 / ηAC値) 基準マスター
  insulationGrades: {{
    1: {{ grade4: 0.46, grade5: 0.40, grade6: 0.28, grade7: 0.20, etaAC: "—", label: "1地域 (極寒冷地・北海道北東部)" }},
    2: {{ grade4: 0.46, grade5: 0.40, grade6: 0.28, grade7: 0.20, etaAC: "—", label: "2地域 (寒冷地・北海道中南部)" }},
    3: {{ grade4: 0.56, grade5: 0.50, grade6: 0.38, grade7: 0.27, etaAC: "—", label: "3地域 (北東北・寒冷高地)" }},
    4: {{ grade4: 0.75, grade5: 0.60, grade6: 0.34, grade7: 0.23, etaAC: "—", label: "4地域 (南東北・甲信・北関東高冷地)" }},
    5: {{ grade4: 0.87, grade5: 0.60, grade6: 0.34, grade7: 0.23, etaAC: 3.0, label: "5地域 (北陸・関東北部・山間部)" }},
    6: {{ grade4: 0.87, grade5: 0.60, grade6: 0.46, grade7: 0.26, etaAC: 2.8, label: "6地域 (関東・東海・近畿・山陽・九州の主要平野部)" }},
    7: {{ grade4: 0.87, grade5: 0.60, grade6: 0.46, grade7: 0.26, etaAC: 2.7, label: "7地域 (南国温暖地・太平洋沿岸)" }},
    8: {{ grade4: "—",  grade5: "—",  grade6: "—",  grade7: "—",  etaAC: 3.2, label: "8地域 (沖縄・奄美・小笠原など亜熱帯)" }}
  }},

  // 都道府県デフォルト値 (47都道府県 告示1793号・告示1454号・静岡県条例完全準拠)
  prefectures: {{
{prefectures_block}
  }},

  // 全47都道府県・全1,892市区町村 完全網羅データベース (最長一致優先ソート済)
  cities: [
{cities_block}
  ]
}};

/**
 * 住所文字列・標高から地域定数を導出 (最長一致判定アルゴリズム)
 */
function calculateRegionalConstants(address, elevation = 0) {{
  let matchedPref = null;
  let matchedCity = null;

  // 1. 都道府県判定
  for (const prefName of Object.keys(REGIONAL_DATABASE.prefectures)) {{
    if (address.includes(prefName)) {{
      matchedPref = prefName;
      break;
    }}
  }}

  // 2. 市区町村マッチング (都道府県一致優先 ＋ 最長一致優先)
  const candidateCities = (REGIONAL_DATABASE.cities || [])
    .filter(c => !matchedPref || c.pref === matchedPref)
    .slice()
    .sort((a, b) => b.match.length - a.match.length);

  for (const city of candidateCities) {{
    // 完全一致または前方一致判定
    if (address.includes(city.match)) {{
      matchedCity = city;
      if (!matchedPref) matchedPref = city.pref;
      break;
    }}
    // 郡名省略入力への対応 (例: "長野県北安曇郡白馬村" に対して "長野県白馬村" と入力された場合)
    const strippedName = city.match.replace(/^[^郡]+郡/, '');
    if (strippedName && strippedName.length >= 3 && address.includes(strippedName)) {{
      matchedCity = city;
      if (!matchedPref) matchedPref = city.pref;
      break;
    }}
  }}

  // 3. 定数決定 (市区町村データベース優先、未特定時は都道府県デフォルトにフォールバック)
  const prefData = matchedPref ? REGIONAL_DATABASE.prefectures[matchedPref] : REGIONAL_DATABASE.prefectures["埼玉県"];

  const z = matchedCity ? matchedCity.z : prefData.z;
  const zs = (matchedCity && matchedCity.zs) ? matchedCity.zs : (prefData.zs || null);
  const v0 = matchedCity ? matchedCity.v0 : prefData.v0;
  const isSnowHeavy = matchedCity ? matchedCity.isSnowHeavy : prefData.isSnowHeavy;
  const baseSnow = matchedCity ? matchedCity.sBase : prefData.sDefault;
  const freezeDepth = matchedCity ? matchedCity.freeze : prefData.freezeDepth;
  const energyRegion = matchedCity ? matchedCity.energyRegion : (prefData.energyRegion || 6);
  const solarRegion = matchedCity ? matchedCity.solarRegion : (prefData.solarRegion || "A4");

  // 積雪深算定 (標高補正: 多雪区域かつ標高>100m時は標高100m毎に+10cmの安全側補正)
  let snowDepth = baseSnow;
  if (isSnowHeavy && elevation > 100) {{
    snowDepth = Math.round(baseSnow + ((elevation - 100) / 100) * 10);
  }}

  // 断熱等級基準
  const insulation = REGIONAL_DATABASE.insulationGrades[energyRegion] || REGIONAL_DATABASE.insulationGrades[6];
  const regionMeta = {{
    name: matchedPref || "全国標準",
    color: energyRegion <= 2 ? "#3b82f6" : (energyRegion <= 4 ? "#06b6d4" : (energyRegion <= 6 ? "#10b981" : "#f59e0b"))
  }};

  let note = "";
  if (matchedPref === "静岡県") {{
    note = "【静岡県特記】静岡県建築基準条例および建築構造設計指針により、静岡県地震地域係数 Zs=1.2 の割増適用が義務付けられています（国告示 Z=1.0）。";
  }} else if (matchedPref === "沖縄県") {{
    note = "【沖縄県特記】台風常襲地域のため風力割増、基準風速42〜46m/sに留意してください。";
  }} else if (isSnowHeavy) {{
    note = "【多雪区域特記】特定行政庁の施行細則により垂直積雪量の算定式が定められています。確認申請前に所管課の基準をご確認ください。";
  }}

  return {{
    address: address,
    pref: matchedPref,
    cityName: matchedCity ? matchedCity.match : null,
    elevation: Math.round(elevation),
    z: z,
    zs: zs,
    zDisplay: zs ? `Z=${{z}} (Zs=${{zs}})` : `Z=${{z}}`,
    v0: v0,
    snowDepth: Math.max(snowDepth, 0),
    isSnowHeavy: isSnowHeavy,
    freezeDepth: freezeDepth,
    energyRegion: energyRegion,
    solarRegion: solarRegion,
    insulation: insulation,
    regionMeta: regionMeta,
    note: note
  }};
}}

/**
 * 国土地理院 ジオコーディング (住所 → 緯度・経度)
 * 1. 国土地理院 AddressSearch API (公式エンドポイント: /address-search/AddressSearch?q=)
 * 2. 番地・枝番・詳細除去による再検索
 * 3. OpenStreetMap Nominatim ジオコーディング API フォールバック
 * 4. データベース代表座標フォールバック (100%座標返却保証)
 */
async function geocodeAddress(query) {{
  if (!query || typeof query !== 'string') {{
    return {{ lat: 35.9247, lon: 139.4842, title: '埼玉県川越市幸町' }};
  }}
  const trimmed = query.trim();
  if (!trimmed) {{
    return {{ lat: 35.9247, lon: 139.4842, title: '埼玉県川越市幸町' }};
  }}

  // 1. 国土地理院 AddressSearch API (公式URL)
  try {{
    const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${{encodeURIComponent(trimmed)}}`;
    const res = await fetch(url);
    if (res.ok) {{
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].geometry && data[0].geometry.coordinates) {{
        const [lon, lat] = data[0].geometry.coordinates;
        return {{
          lat: lat,
          lon: lon,
          title: data[0].properties?.title || trimmed
        }};
      }}
    }}
  }} catch (e) {{
    console.warn('GSI Geocoding query failed, trying stripped query:', e);
  }}

  // 2. 枝番・番地等を除去して再試行 (例: "埼玉県川越市幸町1-2-3" -> "埼玉県川越市幸町")
  const stripped = trimmed.replace(/[0-9０-９一二三四五六七八九十]+[-丁目番号番地].*$/, '').trim();
  if (stripped && stripped !== trimmed) {{
    try {{
      const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${{encodeURIComponent(stripped)}}`;
      const res = await fetch(url);
      if (res.ok) {{
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && data[0].geometry && data[0].geometry.coordinates) {{
          const [lon, lat] = data[0].geometry.coordinates;
          return {{
            lat: lat,
            lon: lon,
            title: data[0].properties?.title || stripped
          }};
        }}
      }}
    }} catch (e) {{
      console.warn('GSI Stripped Geocoding failed:', e);
    }}
  }}

  // 3. OpenStreetMap Nominatim フォールバック
  try {{
    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${{encodeURIComponent(trimmed)}}&limit=1`;
    const res = await fetch(osmUrl, {{ headers: {{ 'Accept-Language': 'ja' }} }});
    if (res.ok) {{
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {{
        return {{
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          title: data[0].display_name
        }};
      }}
    }}
  }} catch (e) {{
    console.warn('Nominatim Geocoding failed:', e);
  }}

  // 4. 都道府県代表座標フォールバック (100%返却保証)
  for (const [pref, d] of Object.entries(REGIONAL_DATABASE.prefectures)) {{
    if (trimmed.includes(pref)) {{
      return {{ lat: d.lat, lon: d.lon, title: pref }};
    }}
  }}

  // 最終デフォルト: 埼玉県川越市
  return {{ lat: 35.9247, lon: 139.4842, title: '埼玉県川越市幸町' }};
}}

/**
 * 国土地理院 標高API (緯度・経度 → 標高m)
 * https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php
 */
async function fetchElevation(lon, lat) {{
  try {{
    const url = `https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon=${{lon}}&lat=${{lat}}&outtype=JSON`;
    const res = await fetch(url);
    if (!res.ok) return 0;
    const data = await res.json();
    if (data && typeof data.elevation === 'number') {{
      return data.elevation;
    }}
    return 0;
  }} catch (e) {{
    console.warn('Elevation fetch failed:', e);
    return 0;
  }}
}}
"""

    with open('public/js/regional_calc.js', 'w', encoding='utf-8') as f:
        f.write(js_content)

    print('Updated public/js/regional_calc.js successfully with Shizuoka Zs=1.2!')

if __name__ == '__main__':
    main()
