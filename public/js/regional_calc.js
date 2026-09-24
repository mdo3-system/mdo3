/**
 * public/js/regional_calc.js
 * 
 * 構造設計用 地域定数 自動検索エンジン (mdo3.com)
 * - 地震地域係数 Z (昭和55年建設省告示第1793号)
 * - 基準風速 V0 (平成12年建設省告示第1454号)
 * - 垂直積雪量 S (平成19年国交省告示第594号 / 特定行政庁規則)
 * - 凍結深度 (特定行政庁基準・凍結指数簡易計算法)
 * - 国土地理院 ジオコーディングAPI & 標高API連携
 */

const REGIONAL_DATABASE = {
  // 省エネ地域区分ごとの断熱等性能等級 (UA値 / ηAC値) 基準マスター
  // 国土交通省告示・住宅性能表示・品確法基準準拠
  insulationGrades: {
    1: { grade4: 0.46, grade5: 0.40, grade6: 0.28, grade7: 0.20, etaAC: "—", label: "1地域 (極寒冷地・北海道北東部)" },
    2: { grade4: 0.46, grade5: 0.40, grade6: 0.28, grade7: 0.20, etaAC: "—", label: "2地域 (寒冷地・北海道中南部)" },
    3: { grade4: 0.56, grade5: 0.50, grade6: 0.38, grade7: 0.27, etaAC: "—", label: "3地域 (北東北・寒冷高地)" },
    4: { grade4: 0.75, grade5: 0.60, grade6: 0.34, grade7: 0.23, etaAC: "—", label: "4地域 (南東北・甲信・北関東高冷地)" },
    5: { grade4: 0.87, grade5: 0.60, grade6: 0.34, grade7: 0.23, etaAC: 3.0, label: "5地域 (北陸・関東北部・山間部)" },
    6: { grade4: 0.87, grade5: 0.60, grade6: 0.46, grade7: 0.26, etaAC: 2.8, label: "6地域 (関東・東海・近畿・山陽・九州の主要平野部)" },
    7: { grade4: 0.87, grade5: 0.60, grade6: 0.46, grade7: 0.26, etaAC: 2.7, label: "7地域 (南国温暖地・太平洋沿岸)" },
    8: { grade4: "—",  grade5: "—",  grade6: "—",  grade7: "—",  etaAC: 3.2, label: "8地域 (沖縄・奄美・小笠原など亜熱帯)" }
  },

  // 都道府県デフォルト値 (構造地域定数 ＆ 省エネ地域区分 ＆ 代表座標)
  prefectures: {
    "北海道": { z: 0.9, v0: 32, sDefault: 100, isSnowHeavy: true, freezeDepth: "60〜100cm (市町村基準)", energyRegion: 2, solarRegion: "A1", lat: 43.0642, lon: 141.3469 },
    "青森県": { z: 0.8, v0: 32, sDefault: 120, isSnowHeavy: true, freezeDepth: "60cm", energyRegion: 3, solarRegion: "A1", lat: 40.8244, lon: 140.7400 },
    "岩手県": { z: 0.8, v0: 30, sDefault: 80, isSnowHeavy: true, freezeDepth: "50〜70cm", energyRegion: 3, solarRegion: "A2", lat: 39.7036, lon: 141.1527 },
    "宮城県": { z: 0.8, v0: 30, sDefault: 40, isSnowHeavy: false, freezeDepth: "30〜45cm", energyRegion: 4, solarRegion: "A3", lat: 38.2682, lon: 140.8694 },
    "秋田県": { z: 0.85, v0: 32, sDefault: 120, isSnowHeavy: true, freezeDepth: "45〜60cm", energyRegion: 3, solarRegion: "A1", lat: 39.7186, lon: 140.1024 },
    "山形県": { z: 0.85, v0: 32, sDefault: 100, isSnowHeavy: true, freezeDepth: "45〜60cm", energyRegion: 4, solarRegion: "A2", lat: 38.2404, lon: 140.3633 },
    "福島県": { z: 0.85, v0: 30, sDefault: 50, isSnowHeavy: false, freezeDepth: "30〜50cm", energyRegion: 4, solarRegion: "A3", lat: 37.7503, lon: 140.4678 },
    "茨城県": { z: 1.0, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 5, solarRegion: "A3", lat: 36.3418, lon: 140.4468 },
    "栃木県": { z: 1.0, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "平野部指定外 / 北部30〜50cm", energyRegion: 5, solarRegion: "A3", lat: 36.5657, lon: 139.8836 },
    "群馬県": { z: 1.0, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "平野部指定外 / 北部30〜45cm", energyRegion: 5, solarRegion: "A3", lat: 36.3907, lon: 139.0604 },
    "埼玉県": { z: 1.0, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 35.8569, lon: 139.6489 },
    "千葉県": { z: 1.0, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 35.6051, lon: 140.1233 },
    "東京都": { z: 1.0, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 35.6895, lon: 139.6917 },
    "神奈川県": { z: 1.0, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 35.4478, lon: 139.6425 },
    "新潟県": { z: 0.9, v0: 32, sDefault: 150, isSnowHeavy: true, freezeDepth: "30〜45cm (地域による)", energyRegion: 5, solarRegion: "A2", lat: 37.9026, lon: 139.0232 },
    "富山県": { z: 0.9, v0: 30, sDefault: 120, isSnowHeavy: true, freezeDepth: "指定なし / 寒冷地30cm", energyRegion: 5, solarRegion: "A2", lat: 36.6953, lon: 137.2113 },
    "石川県": { z: 0.9, v0: 32, sDefault: 100, isSnowHeavy: true, freezeDepth: "指定なし / 能登30cm", energyRegion: 5, solarRegion: "A3", lat: 36.5947, lon: 136.6256 },
    "福井県": { z: 0.9, v0: 32, sDefault: 100, isSnowHeavy: true, freezeDepth: "指定なし / 山間部30cm", energyRegion: 5, solarRegion: "A3", lat: 36.0652, lon: 136.2216 },
    "山梨県": { z: 1.0, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "甲府盆地30cm / 富士北麓・八ヶ岳50〜70cm", energyRegion: 5, solarRegion: "A3", lat: 35.6639, lon: 138.5684 },
    "長野県": { z: 1.0, v0: 30, sDefault: 60, isSnowHeavy: false, freezeDepth: "45〜80cm (松本60cm, 諏訪60cm, 北部80cm)", energyRegion: 4, solarRegion: "A3", lat: 36.2381, lon: 137.9720 },
    "岐阜県": { z: 1.0, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "美濃: 指定なし / 飛騨: 45〜60cm", energyRegion: 6, solarRegion: "A4", lat: 35.3912, lon: 136.7223 },
    "静岡県": { z: 1.0, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (※静岡県条例により基準時Z=1.2割増あり)", energyRegion: 6, solarRegion: "A4", lat: 34.9756, lon: 138.3828 },
    "愛知県": { z: 1.0, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 35.1802, lon: 136.9066 },
    "三重県": { z: 1.0, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (沿岸36m/s, 南部38m/s)", energyRegion: 6, solarRegion: "A4", lat: 34.7303, lon: 136.5086 },
    "滋賀県": { z: 1.0, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "南部指定なし / 湖北豪雪・30cm", energyRegion: 6, solarRegion: "A3", lat: 35.0045, lon: 135.8686 },
    "京都府": { z: 1.0, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "南部指定なし / 丹後30cm", energyRegion: 6, solarRegion: "A3", lat: 35.0212, lon: 135.7556 },
    "大阪府": { z: 1.0, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 34.6863, lon: 135.5200 },
    "兵庫県": { z: 1.0, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "南部指定なし / 但馬30cm", energyRegion: 6, solarRegion: "A4", lat: 34.6913, lon: 135.1830 },
    "奈良県": { z: 1.0, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 34.6853, lon: 135.8327 },
    "和歌山県": { z: 1.0, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (潮岬・沿岸36〜38m/s)", energyRegion: 6, solarRegion: "A4", lat: 34.2260, lon: 135.1675 },
    "鳥取県": { z: 0.9, v0: 30, sDefault: 80, isSnowHeavy: true, freezeDepth: "平野部指定外 / 大山山麓30cm", energyRegion: 5, solarRegion: "A3", lat: 35.5039, lon: 134.2377 },
    "島根県": { z: 0.9, v0: 30, sDefault: 60, isSnowHeavy: false, freezeDepth: "平野部指定外 / 山間部30cm", energyRegion: 6, solarRegion: "A3", lat: 35.4723, lon: 133.0505 },
    "岡山県": { z: 0.9, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "南部指定なし / 北部30cm", energyRegion: 6, solarRegion: "A4", lat: 34.6618, lon: 133.9350 },
    "広島県": { z: 0.9, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "南部指定なし / 北部30cm", energyRegion: 6, solarRegion: "A4", lat: 34.3963, lon: 132.4596 },
    "山口県": { z: 0.9, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 34.1861, lon: 131.4705 },
    "徳島県": { z: 0.9, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (南部沿岸36m/s)", energyRegion: 6, solarRegion: "A4", lat: 34.0657, lon: 134.5594 },
    "香川県": { z: 0.9, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 34.3401, lon: 134.0434 },
    "愛媛県": { z: 0.9, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 33.8416, lon: 132.7661 },
    "高知県": { z: 0.9, v0: 36, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (室戸・足摺38m/s)", energyRegion: 6, solarRegion: "A5", lat: 33.5597, lon: 133.5311 },
    "福岡県": { z: 0.9, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 33.6064, lon: 130.4183 },
    "佐賀県": { z: 0.9, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 33.2494, lon: 130.2988 },
    "長崎県": { z: 0.9, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (離島部36〜38m/s)", energyRegion: 6, solarRegion: "A4", lat: 32.7448, lon: 129.8737 },
    "熊本県": { z: 0.9, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし / 阿蘇山間部30cm", energyRegion: 6, solarRegion: "A4", lat: 32.7898, lon: 130.7417 },
    "大分県": { z: 0.9, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)", energyRegion: 6, solarRegion: "A4", lat: 33.2382, lon: 131.6126 },
    "宮崎県": { z: 0.9, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (沿岸南部36〜38m/s)", energyRegion: 6, solarRegion: "A5", lat: 31.9111, lon: 131.4239 },
    "鹿児島県": { z: 0.9, v0: 36, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (薩摩半島38m/s, 奄美40〜42m/s)", energyRegion: 6, solarRegion: "A5", lat: 31.5602, lon: 130.5581 },
    "沖縄県": { z: 0.7, v0: 42, sDefault: 0, isSnowHeavy: false, freezeDepth: "指定なし (本島42m/s, 先島46m/s)", energyRegion: 8, solarRegion: "A5", lat: 26.2124, lon: 127.6809 }
  },

  // 主要市区町村ピンポイント詳細（告示1454号V0・積雪S・凍結深度の特記）
  cities: [
    // 北海道
    { pref: "北海道", match: "札幌市", z: 0.9, v0: 32, sBase: 140, isSnowHeavy: true, freeze: "60cm", energyRegion: 2, solarRegion: "A1" },
    { pref: "北海道", match: "旭川市", z: 0.9, v0: 32, sBase: 120, isSnowHeavy: true, freeze: "80cm", energyRegion: 1, solarRegion: "A1" },
    { pref: "北海道", match: "函館市", z: 0.9, v0: 34, sBase: 80, isSnowHeavy: true, freeze: "50cm", energyRegion: 2, solarRegion: "A1" },
    { pref: "北海道", match: "釧路市", z: 0.9, v0: 32, sBase: 60, isSnowHeavy: true, freeze: "100cm", energyRegion: 1, solarRegion: "A1" },
    { pref: "北海道", match: "帯広市", z: 0.9, v0: 32, sBase: 80, isSnowHeavy: true, freeze: "90cm", energyRegion: 2, solarRegion: "A1" },
    { pref: "北海道", match: "北見市", z: 0.9, v0: 32, sBase: 90, isSnowHeavy: true, freeze: "90cm", energyRegion: 1, solarRegion: "A1" },
    // 東北
    { pref: "青森県", match: "青森市", z: 0.8, v0: 32, sBase: 180, isSnowHeavy: true, freeze: "60cm", energyRegion: 3, solarRegion: "A1" },
    { pref: "青森県", match: "弘前市", z: 0.8, v0: 30, sBase: 130, isSnowHeavy: true, freeze: "60cm", energyRegion: 3, solarRegion: "A1" },
    { pref: "青森県", match: "八戸市", z: 0.8, v0: 34, sBase: 50, isSnowHeavy: false, freeze: "60cm", energyRegion: 3, solarRegion: "A2" },
    { pref: "岩手県", match: "盛岡市", z: 0.8, v0: 30, sBase: 60, isSnowHeavy: true, freeze: "60cm", energyRegion: 3, solarRegion: "A2" },
    { pref: "岩手県", match: "宮古市", z: 0.8, v0: 34, sBase: 40, isSnowHeavy: false, freeze: "45cm", energyRegion: 3, solarRegion: "A2" },
    { pref: "秋田県", match: "秋田市", z: 0.85, v0: 34, sBase: 80, isSnowHeavy: true, freeze: "45cm", energyRegion: 3, solarRegion: "A1" },
    { pref: "秋田県", match: "横手市", z: 0.85, v0: 30, sBase: 180, isSnowHeavy: true, freeze: "50cm", energyRegion: 3, solarRegion: "A1" },
    { pref: "山形県", match: "山形市", z: 0.85, v0: 30, sBase: 80, isSnowHeavy: true, freeze: "45cm", energyRegion: 4, solarRegion: "A2" },
    { pref: "山形県", match: "酒田市", z: 0.85, v0: 34, sBase: 70, isSnowHeavy: true, freeze: "30cm", energyRegion: 4, solarRegion: "A2" },
    { pref: "山形県", match: "米沢市", z: 0.85, v0: 30, sBase: 140, isSnowHeavy: true, freeze: "50cm", energyRegion: 4, solarRegion: "A2" },
    { pref: "宮城県", match: "仙台市", z: 0.8, v0: 30, sBase: 35, isSnowHeavy: false, freeze: "30cm", energyRegion: 4, solarRegion: "A3" },
    { pref: "宮城県", match: "石巻市", z: 0.8, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "30cm", energyRegion: 4, solarRegion: "A3" },
    { pref: "福島県", match: "福島市", z: 0.85, v0: 30, sBase: 50, isSnowHeavy: false, freeze: "35cm", energyRegion: 4, solarRegion: "A3" },
    { pref: "福島県", match: "郡山市", z: 0.85, v0: 30, sBase: 40, isSnowHeavy: false, freeze: "40cm", energyRegion: 4, solarRegion: "A3" },
    { pref: "福島県", match: "会津若松市", z: 0.85, v0: 30, sBase: 110, isSnowHeavy: true, freeze: "45cm", energyRegion: 3, solarRegion: "A2" },
    { pref: "福島県", match: "いわき市", z: 0.85, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 5, solarRegion: "A3" },

    // 関東
    { pref: "東京都", match: "千代田区", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし (≧240mm)", energyRegion: 6, solarRegion: "A4" },
    { pref: "東京都", match: "新宿区", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし (≧240mm)", energyRegion: 6, solarRegion: "A4" },
    { pref: "東京都", match: "八王子市", z: 1.0, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし (≧240mm)", energyRegion: 6, solarRegion: "A4" },
    { pref: "東京都", match: "大島町", z: 1.0, v0: 38, sBase: 0, isSnowHeavy: false, freeze: "指定なし", energyRegion: 7, solarRegion: "A4" },
    { pref: "東京都", match: "八丈町", z: 0.9, v0: 40, sBase: 0, isSnowHeavy: false, freeze: "指定なし", energyRegion: 7, solarRegion: "A4" },
    { pref: "東京都", match: "小笠原村", z: 0.8, v0: 40, sBase: 0, isSnowHeavy: false, freeze: "指定なし", energyRegion: 8, solarRegion: "A5" },
    { pref: "神奈川県", match: "横浜市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "神奈川県", match: "川崎市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "神奈川県", match: "相模原市", z: 1.0, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "神奈川県", match: "三浦市", z: 1.0, v0: 36, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "千葉県", match: "千葉市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "千葉県", match: "銚子市", z: 1.0, v0: 36, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "千葉県", match: "館山市", z: 1.0, v0: 38, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "埼玉県", match: "さいたま市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "埼玉県", match: "熊谷市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "埼玉県", match: "秩父市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 5, solarRegion: "A3" },
    { pref: "茨城県", match: "水戸市", z: 1.0, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 5, solarRegion: "A3" },
    { pref: "茨城県", match: "日立市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 5, solarRegion: "A3" },
    { pref: "茨城県", match: "鹿嶋市", z: 1.0, v0: 36, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 5, solarRegion: "A3" },
    { pref: "栃木県", match: "宇都宮市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 5, solarRegion: "A3" },
    { pref: "栃木県", match: "日光市", z: 1.0, v0: 30, sBase: 60, isSnowHeavy: false, freeze: "35〜50cm", energyRegion: 3, solarRegion: "A2" },
    { pref: "群馬県", match: "前橋市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 5, solarRegion: "A3" },
    { pref: "群馬県", match: "高崎市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 5, solarRegion: "A3" },
    { pref: "群馬県", match: "沼田市", z: 1.0, v0: 30, sBase: 70, isSnowHeavy: true, freeze: "35〜45cm", energyRegion: 4, solarRegion: "A3" },
    { pref: "群馬県", match: "みなかみ町", z: 1.0, v0: 30, sBase: 150, isSnowHeavy: true, freeze: "45cm", energyRegion: 3, solarRegion: "A2" },

    // 北陸・甲信越
    { pref: "新潟県", match: "新潟市", z: 0.9, v0: 34, sBase: 80, isSnowHeavy: true, freeze: "30cm", energyRegion: 5, solarRegion: "A2" },
    { pref: "新潟県", match: "長岡市", z: 0.9, v0: 32, sBase: 180, isSnowHeavy: true, freeze: "35cm", energyRegion: 4, solarRegion: "A2" },
    { pref: "新潟県", match: "上越市", z: 0.9, v0: 32, sBase: 180, isSnowHeavy: true, freeze: "35cm", energyRegion: 5, solarRegion: "A2" },
    { pref: "新潟県", match: "南魚沼市", z: 0.9, v0: 30, sBase: 250, isSnowHeavy: true, freeze: "40cm", energyRegion: 4, solarRegion: "A2" },
    { pref: "富山県", match: "富山市", z: 0.9, v0: 30, sBase: 120, isSnowHeavy: true, freeze: "指定なし", energyRegion: 5, solarRegion: "A2" },
    { pref: "富山県", match: "高岡市", z: 0.9, v0: 30, sBase: 100, isSnowHeavy: true, freeze: "指定なし", energyRegion: 5, solarRegion: "A2" },
    { pref: "石川県", match: "金沢市", z: 0.9, v0: 32, sBase: 100, isSnowHeavy: true, freeze: "指定なし", energyRegion: 5, solarRegion: "A3" },
    { pref: "石川県", match: "輪島市", z: 0.9, v0: 34, sBase: 60, isSnowHeavy: true, freeze: "30cm", energyRegion: 5, solarRegion: "A3" },
    { pref: "福井県", match: "福井市", z: 0.9, v0: 32, sBase: 100, isSnowHeavy: true, freeze: "指定なし", energyRegion: 5, solarRegion: "A3" },
    { pref: "福井県", match: "敦賀市", z: 0.9, v0: 34, sBase: 80, isSnowHeavy: true, freeze: "指定なし", energyRegion: 5, solarRegion: "A3" },
    { pref: "福井県", match: "大野市", z: 0.9, v0: 30, sBase: 150, isSnowHeavy: true, freeze: "30cm", energyRegion: 4, solarRegion: "A3" },
    { pref: "山梨県", match: "甲府市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "30cm", energyRegion: 5, solarRegion: "A3" },
    { pref: "山梨県", match: "富士吉田市", z: 1.0, v0: 30, sBase: 60, isSnowHeavy: false, freeze: "60cm", energyRegion: 3, solarRegion: "A3" },
    { pref: "山梨県", match: "北杜市", z: 1.0, v0: 30, sBase: 40, isSnowHeavy: false, freeze: "60〜70cm", energyRegion: 3, solarRegion: "A3" },
    { pref: "長野県", match: "長野市", z: 1.0, v0: 30, sBase: 80, isSnowHeavy: true, freeze: "50cm", energyRegion: 4, solarRegion: "A3" },
    { pref: "長野県", match: "松本市", z: 1.0, v0: 30, sBase: 40, isSnowHeavy: false, freeze: "60cm", energyRegion: 4, solarRegion: "A3" },
    { pref: "長野県", match: "上田市", z: 1.0, v0: 30, sBase: 35, isSnowHeavy: false, freeze: "50cm", energyRegion: 4, solarRegion: "A3" },
    { pref: "長野県", match: "諏訪市", z: 1.0, v0: 30, sBase: 35, isSnowHeavy: false, freeze: "60cm", energyRegion: 3, solarRegion: "A3" },
    { pref: "長野県", match: "伊那市", z: 1.0, v0: 30, sBase: 35, isSnowHeavy: false, freeze: "50cm", energyRegion: 4, solarRegion: "A3" },
    { pref: "長野県", match: "飯田市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "45cm", energyRegion: 5, solarRegion: "A4" },
    { pref: "長野県", match: "軽井沢町", z: 1.0, v0: 30, sBase: 45, isSnowHeavy: false, freeze: "70〜80cm", energyRegion: 3, solarRegion: "A3" },
    { pref: "長野県", match: "白馬村", z: 1.0, v0: 30, sBase: 200, isSnowHeavy: true, freeze: "80cm", energyRegion: 2, solarRegion: "A2" },

    // 東海
    { pref: "静岡県", match: "静岡市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし (※条例によりZ=1.2推奨)", energyRegion: 6, solarRegion: "A4" },
    { pref: "静岡県", match: "浜松市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし (※条例によりZ=1.2推奨)", energyRegion: 6, solarRegion: "A4" },
    { pref: "静岡県", match: "御前崎市", z: 1.0, v0: 38, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "静岡県", match: "熱海市", z: 1.0, v0: 36, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "愛知県", match: "名古屋市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "愛知県", match: "豊橋市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "愛知県", match: "田原市", z: 1.0, v0: 36, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "岐阜県", match: "岐阜市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "岐阜県", match: "高山市", z: 1.0, v0: 30, sBase: 120, isSnowHeavy: true, freeze: "50〜60cm", energyRegion: 4, solarRegion: "A3" },
    { pref: "岐阜県", match: "白川村", z: 1.0, v0: 30, sBase: 250, isSnowHeavy: true, freeze: "60cm", energyRegion: 3, solarRegion: "A2" },
    { pref: "三重県", match: "津市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "三重県", match: "四日市市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "三重県", match: "尾鷲市", z: 1.0, v0: 36, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "三重県", match: "熊野市", z: 1.0, v0: 38, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },

    // 近畿
    { pref: "大阪府", match: "大阪市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "大阪府", match: "堺市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "京都府", match: "京都市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "京都府", match: "舞鶴市", z: 1.0, v0: 34, sBase: 80, isSnowHeavy: true, freeze: "30cm", energyRegion: 5, solarRegion: "A3" },
    { pref: "兵庫県", match: "神戸市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "兵庫県", match: "姫路市", z: 1.0, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "兵庫県", match: "豊岡市", z: 1.0, v0: 32, sBase: 120, isSnowHeavy: true, freeze: "30cm", energyRegion: 5, solarRegion: "A3" },
    { pref: "滋賀県", match: "大津市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "滋賀県", match: "長浜市", z: 1.0, v0: 30, sBase: 100, isSnowHeavy: true, freeze: "30cm", energyRegion: 5, solarRegion: "A3" },
    { pref: "奈良県", match: "奈良市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "和歌山県", match: "和歌山市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "和歌山県", match: "串本町", z: 1.0, v0: 38, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 7, solarRegion: "A5" },

    // 中国・四国
    { pref: "鳥取県", match: "鳥取市", z: 0.9, v0: 32, sBase: 80, isSnowHeavy: true, freeze: "指定なし", energyRegion: 5, solarRegion: "A3" },
    { pref: "鳥取県", match: "米子市", z: 0.9, v0: 32, sBase: 60, isSnowHeavy: true, freeze: "指定なし", energyRegion: 5, solarRegion: "A3" },
    { pref: "島根県", match: "松江市", z: 0.9, v0: 32, sBase: 50, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A3" },
    { pref: "島根県", match: "出雲市", z: 0.9, v0: 32, sBase: 50, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A3" },
    { pref: "岡山県", match: "岡山市", z: 0.9, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "岡山県", match: "倉敷市", z: 0.9, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "広島県", match: "広島市", z: 0.9, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "広島県", match: "福山市", z: 0.9, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "山口県", match: "山口市", z: 0.9, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "山口県", match: "下関市", z: 0.9, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "徳島県", match: "徳島市", z: 0.9, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "香川県", match: "高松市", z: 0.9, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "愛媛県", match: "松山市", z: 0.9, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "高知県", match: "高知市", z: 0.9, v0: 36, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A5" },
    { pref: "高知県", match: "室戸市", z: 0.9, v0: 38, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 7, solarRegion: "A5" },

    // 九州・沖縄
    { pref: "福岡県", match: "福岡市", z: 0.9, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "福岡県", match: "北九州市", z: 0.9, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "佐賀県", match: "佐賀市", z: 0.9, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "長崎県", match: "長崎市", z: 0.9, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "長崎県", match: "佐世保市", z: 0.9, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "熊本県", match: "熊本市", z: 0.9, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "大分県", match: "大分市", z: 0.9, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A4" },
    { pref: "宮崎県", match: "宮崎市", z: 0.9, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A5" },
    { pref: "鹿児島県", match: "鹿児島市", z: 0.9, v0: 36, sBase: 30, isSnowHeavy: false, freeze: "指定なし", energyRegion: 6, solarRegion: "A5" },
    { pref: "鹿児島県", match: "奄美市", z: 0.9, v0: 42, sBase: 0, isSnowHeavy: false, freeze: "指定なし", energyRegion: 8, solarRegion: "A5" },
    { pref: "沖縄県", match: "那覇市", z: 0.7, v0: 42, sBase: 0, isSnowHeavy: false, freeze: "指定なし", energyRegion: 8, solarRegion: "A5" },
    { pref: "沖縄県", match: "石垣市", z: 0.7, v0: 46, sBase: 0, isSnowHeavy: false, freeze: "指定なし", energyRegion: 8, solarRegion: "A5" },
    { pref: "沖縄県", match: "宮古島市", z: 0.7, v0: 46, sBase: 0, isSnowHeavy: false, freeze: "指定なし", energyRegion: 8, solarRegion: "A5" }
  ],

  // 1〜8地域のマスター解説・主要都市・推奨仕様
  energyRegionMaster: {
    1: { name: "1地域", desc: "北海道北東部・極寒冷地域 (旭川・稚内・北見・釧路など)", color: "#38bdf8", repCity: "北海道旭川市", lat: 43.7706, lon: 142.3650 },
    2: { name: "2地域", desc: "北海道中南部・寒冷高地 (札幌・函館・帯広・白馬村など)", color: "#0ea5e9", repCity: "北海道札幌市", lat: 43.0642, lon: 141.3469 },
    3: { name: "3地域", desc: "北東北・寒冷高地 (盛岡・青森・秋田山間・日光・軽井沢・富士吉田など)", color: "#2dd4bf", repCity: "岩手県盛岡市", lat: 39.7036, lon: 141.1527 },
    4: { name: "4地域", desc: "南東北・甲信・北関東高冷地 (仙台・山形・福島・松本・長野など)", color: "#10b981", repCity: "長野県松本市", lat: 36.2381, lon: 137.9720 },
    5: { name: "5地域", desc: "北陸・関東北部・山間部 (新潟・金沢・富山・福井・水戸・宇都宮・前橋など)", color: "#eab308", repCity: "石川県金沢市", lat: 36.5613, lon: 136.6562 },
    6: { name: "6地域", desc: "主要平野部・温暖地 (東京・横浜・名古屋・大阪・京都・広島・福岡など)", color: "#f97316", repCity: "東京都千代田区", lat: 35.6895, lon: 139.6917 },
    7: { name: "7地域", desc: "南国温暖地・太平洋沿岸 (宮崎沿岸・鹿児島南部・高知室戸・伊豆諸島など)", color: "#ef4444", repCity: "高知県室戸市", lat: 33.2895, lon: 134.1578 },
    8: { name: "8地域", desc: "亜熱帯地域 (沖縄本島・石垣・宮古・奄美・小笠原など)", color: "#ec4899", repCity: "沖縄県那覇市", lat: 26.2124, lon: 127.6809 }
  }
};

/**
 * 住所文字列・標高から地域定数を導出
 */
function calculateRegionalConstants(address, elevation = 0) {
  let matchedPref = null;
  let matchedCity = null;

  // 1. 都道府県判定
  for (const prefName of Object.keys(REGIONAL_DATABASE.prefectures)) {
    if (address.includes(prefName)) {
      matchedPref = prefName;
      break;
    }
  }

  // 2. 市区町村マッチング
  if (matchedPref) {
    for (const city of REGIONAL_DATABASE.cities) {
      if (city.pref === matchedPref && address.includes(city.match)) {
        matchedCity = city;
        break;
      }
    }
  } else {
    // 都道府県名が省略されている場合の市区町村検索
    for (const city of REGIONAL_DATABASE.cities) {
      if (address.includes(city.match)) {
        matchedCity = city;
        matchedPref = city.pref;
        break;
      }
    }
  }

  // デフォルトフォールバック (判定不能時は東京都基準)
  if (!matchedPref) matchedPref = "東京都";
  const prefData = REGIONAL_DATABASE.prefectures[matchedPref] || REGIONAL_DATABASE.prefectures["東京都"];

  const z = matchedCity ? matchedCity.z : prefData.z;
  const v0 = matchedCity ? matchedCity.v0 : prefData.v0;
  const isSnowHeavy = matchedCity ? matchedCity.isSnowHeavy : prefData.isSnowHeavy;
  const freezeDepth = matchedCity ? matchedCity.freeze : prefData.freezeDepth;

  // 積雪量 S (標高補正: 多雪地域は標高100mにつき+10〜20cm、一般地域は平野部規定)
  let baseSnow = matchedCity ? matchedCity.sBase : prefData.sDefault;
  let snowDepth = baseSnow;
  if (isSnowHeavy && elevation > 100) {
    // 豪雪地帯の標高補正式簡易概算: S = S0 + α * (H - 100)
    snowDepth = Math.round(baseSnow + ((elevation - 100) * 0.12));
  } else if (!isSnowHeavy && elevation > 400) {
    // 一般区域高地
    snowDepth = Math.round(baseSnow + ((elevation - 400) * 0.08));
  }

  // 省エネ地域区分 ＆ 日射地域区分
  const energyRegion = (matchedCity && matchedCity.energyRegion !== undefined) 
    ? matchedCity.energyRegion 
    : (prefData.energyRegion || 6);
  const solarRegion = (matchedCity && matchedCity.solarRegion !== undefined)
    ? matchedCity.solarRegion
    : (prefData.solarRegion || "A4");
  const insulation = REGIONAL_DATABASE.insulationGrades[energyRegion] || REGIONAL_DATABASE.insulationGrades[6];
  const regionMeta = REGIONAL_DATABASE.energyRegionMaster[energyRegion] || REGIONAL_DATABASE.energyRegionMaster[6];

  let note = "";
  if (matchedPref === "静岡県") {
    note = "【静岡県特記】静岡県地震対策指針・細則により、基準時Z=1.2割増が推奨されます。";
  } else if (matchedPref === "沖縄県") {
    note = "【沖縄県特記】台風常襲地域のため風力割増、基準風速42〜46m/sに留意してください。";
  }

  return {
    address: address,
    pref: matchedPref,
    cityName: matchedCity ? matchedCity.match : null,
    elevation: Math.round(elevation),
    z: z,
    v0: v0,
    snowDepth: Math.max(snowDepth, 0),
    isSnowHeavy: isSnowHeavy,
    freezeDepth: freezeDepth,
    energyRegion: energyRegion,
    solarRegion: solarRegion,
    insulation: insulation,
    regionMeta: regionMeta,
    note: note
  };
}

/**
 * 国土地理院 ジオコーディング (住所 → 緯度・経度)
 * 1. 国土地理院 AddressSearch API (公式エンドポイント: /address-search/AddressSearch?q=)
 * 2. 番地・枝番・詳細除去による再検索
 * 3. OpenStreetMap Nominatim ジオコーディング API フォールバック
 * 4. データベース代表座標フォールバック (100%座標返却保証)
 */
async function geocodeAddress(query) {
  if (!query || typeof query !== 'string') {
    return { lat: 35.6895, lon: 139.6917, title: '東京都千代田区' };
  }
  const trimmed = query.trim();
  if (!trimmed) {
    return { lat: 35.6895, lon: 139.6917, title: '東京都千代田区' };
  }

  // 1. 国土地理院 AddressSearch API (公式URL)
  try {
    const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].geometry && data[0].geometry.coordinates) {
        const [lon, lat] = data[0].geometry.coordinates;
        return {
          lat: lat,
          lon: lon,
          title: data[0].properties && data[0].properties.title ? data[0].properties.title : trimmed,
          source: 'gsi'
        };
      }
    }
  } catch (e) {
    console.warn('GSI geocode primary failed:', e);
  }

  // 2. 番地・号・丁目枝番・建物名を除去して国土地理院APIを再試行
  try {
    const simplified = trimmed.replace(/[0-9０-９\-−丁目番地号ビル階F].*$/, '').trim();
    if (simplified && simplified.length >= 2 && simplified !== trimmed) {
      const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(simplified)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && data[0].geometry && data[0].geometry.coordinates) {
          const [lon, lat] = data[0].geometry.coordinates;
          return {
            lat: lat,
            lon: lon,
            title: trimmed,
            source: 'gsi_simplified'
          };
        }
      }
    }
  } catch (e) {
    console.warn('GSI geocode simplified failed:', e);
  }

  // 3. OpenStreetMap Nominatim API (フォールバック)
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&countrycodes=jp&limit=1`;
    const res = await fetch(osmUrl, { headers: { 'Accept-Language': 'ja' } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          title: data[0].display_name || trimmed,
          source: 'osm'
        };
      }
    }
  } catch (e) {
    console.warn('OSM geocode failed:', e);
  }

  // 4. データベース代表座標フォールバック (100%保証)
  try {
    if (typeof REGIONAL_DATABASE !== 'undefined') {
      // 市区町村マッチング
      if (REGIONAL_DATABASE.cities) {
        for (const city of REGIONAL_DATABASE.cities) {
          if (trimmed.includes(city.match)) {
            const pref = REGIONAL_DATABASE.prefectures[city.pref];
            if (pref && pref.lat && pref.lon) {
              return {
                lat: pref.lat,
                lon: pref.lon,
                title: `${city.pref}${city.match}`,
                source: 'db_city'
              };
            }
          }
        }
      }

      // 都道府県マッチング
      if (REGIONAL_DATABASE.prefectures) {
        for (const prefName of Object.keys(REGIONAL_DATABASE.prefectures)) {
          if (trimmed.includes(prefName)) {
            const pref = REGIONAL_DATABASE.prefectures[prefName];
            if (pref && pref.lat && pref.lon) {
              return {
                lat: pref.lat,
                lon: pref.lon,
                title: prefName,
                source: 'db_pref'
              };
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('DB coordinate fallback error:', e);
  }

  // 最終安全フォールバック: 東京都
  return {
    lat: 35.6895,
    lon: 139.6917,
    title: trimmed,
    source: 'default_fallback'
  };
}

/**
 * 国土地理院 標高API (経度・緯度 → 標高m)
 */
async function fetchElevation(lon, lat) {
  try {
    const url = `https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon=${lon}&lat=${lat}&outtype=JSON`;
    const res = await fetch(url);
    if (!res.ok) return 0;
    const data = await res.json();
    if (data && data.elevation !== undefined && data.elevation !== "----") {
      return parseFloat(data.elevation);
    }
    return 0;
  } catch (e) {
    console.warn('Elevation fetch failed, fallback to 0:', e);
    return 0;
  }
}

/**
 * 凍結指数 F からの凍結深度簡易計算 (D = C * sqrt(F))
 */
function calculateFreezeFromIndex(freezeIndex, coeff = 7.0) {
  if (!freezeIndex || freezeIndex <= 0) return 0;
  return Math.round(coeff * Math.sqrt(freezeIndex));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    REGIONAL_DATABASE,
    calculateRegionalConstants,
    geocodeAddress,
    fetchElevation,
    calculateFreezeFromIndex
  };
}
