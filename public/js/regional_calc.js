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
  // 都道府県デフォルト値
  prefectures: {
    "北海道": { z: 0.9, v0: 32, sDefault: 100, isSnowHeavy: true, freezeDepth: "60〜100cm (市町村基準)" },
    "青森県": { z: 0.8, v0: 32, sDefault: 120, isSnowHeavy: true, freezeDepth: "60cm" },
    "岩手県": { z: 0.8, v0: 30, sDefault: 80, isSnowHeavy: true, freezeDepth: "50〜70cm" },
    "宮城県": { z: 0.8, v0: 30, sDefault: 40, isSnowHeavy: false, freezeDepth: "30〜45cm" },
    "秋田県": { z: 0.85, v0: 32, sDefault: 120, isSnowHeavy: true, freezeDepth: "45〜60cm" },
    "山形県": { z: 0.85, v0: 32, sDefault: 100, isSnowHeavy: true, freezeDepth: "45〜60cm" },
    "福島県": { z: 0.85, v0: 30, sDefault: 50, isSnowHeavy: false, freezeDepth: "30〜50cm" },
    "茨城県": { z: 1.0, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)" },
    "栃木県": { z: 1.0, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "平野部指定外 / 北部30〜50cm" },
    "群馬県": { z: 1.0, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "平野部指定外 / 北部30〜45cm" },
    "埼玉県": { z: 1.0, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)" },
    "千葉県": { z: 1.0, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)" },
    "東京都": { z: 1.0, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)" },
    "神奈川県": { z: 1.0, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)" },
    "新潟県": { z: 0.9, v0: 32, sDefault: 150, isSnowHeavy: true, freezeDepth: "30〜45cm (地域による)" },
    "富山県": { z: 0.9, v0: 30, sDefault: 120, isSnowHeavy: true, freezeDepth: "指定なし / 寒冷地30cm" },
    "石川県": { z: 0.9, v0: 32, sDefault: 100, isSnowHeavy: true, freezeDepth: "指定なし / 能登30cm" },
    "福井県": { z: 0.9, v0: 32, sDefault: 100, isSnowHeavy: true, freezeDepth: "指定なし / 山間部30cm" },
    "山梨県": { z: 1.0, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "甲府盆地30cm / 富士北麓・八ヶ岳50〜70cm" },
    "長野県": { z: 1.0, v0: 30, sDefault: 60, isSnowHeavy: false, freezeDepth: "45〜80cm (松本60cm, 諏訪60cm, 北部80cm)" },
    "岐阜県": { z: 1.0, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "美濃: 指定なし / 飛騨: 45〜60cm" },
    "静岡県": { z: 1.0, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (※静岡県条例により基準時Z=1.2割増あり)" },
    "愛知県": { z: 1.0, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)" },
    "三重県": { z: 1.0, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (沿岸36m/s, 南部38m/s)" },
    "滋賀県": { z: 1.0, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "南部指定なし / 湖北豪雪・30cm" },
    "京都府": { z: 1.0, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "南部指定なし / 丹後30cm" },
    "大阪府": { z: 1.0, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)" },
    "兵庫県": { z: 1.0, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "南部指定なし / 但馬30cm" },
    "奈良県": { z: 1.0, v0: 30, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)" },
    "和歌山県": { z: 1.0, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (潮岬・沿岸36〜38m/s)" },
    "鳥取県": { z: 0.9, v0: 30, sDefault: 80, isSnowHeavy: true, freezeDepth: "平野部指定外 / 大山山麓30cm" },
    "島根県": { z: 0.9, v0: 30, sDefault: 60, isSnowHeavy: false, freezeDepth: "平野部指定外 / 山間部30cm" },
    "岡山県": { z: 0.9, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "南部指定なし / 北部30cm" },
    "広島県": { z: 0.9, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "南部指定なし / 北部30cm" },
    "山口県": { z: 0.9, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)" },
    "徳島県": { z: 0.9, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (南部沿岸36m/s)" },
    "香川県": { z: 0.9, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)" },
    "愛媛県": { z: 0.9, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)" },
    "高知県": { z: 0.9, v0: 36, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (室戸・足摺38m/s)" },
    "福岡県": { z: 0.9, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)" },
    "佐賀県": { z: 0.9, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)" },
    "長崎県": { z: 0.9, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (離島部36〜38m/s)" },
    "熊本県": { z: 0.9, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし / 阿蘇山間部30cm" },
    "大分県": { z: 0.9, v0: 32, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (根入れ≧240mm)" },
    "宮崎県": { z: 0.9, v0: 34, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (沿岸南部36〜38m/s)" },
    "鹿児島県": { z: 0.9, v0: 36, sDefault: 30, isSnowHeavy: false, freezeDepth: "指定なし (薩摩半島38m/s, 奄美40〜42m/s)" },
    "沖縄県": { z: 0.7, v0: 42, sDefault: 0, isSnowHeavy: false, freezeDepth: "指定なし (本島42m/s, 先島46m/s)" }
  },

  // 主要市区町村ピンポイント詳細（告示1454号V0・積雪S・凍結深度の特記）
  cities: [
    // 北海道
    { pref: "北海道", match: "札幌市", z: 0.9, v0: 32, sBase: 140, isSnowHeavy: true, freeze: "60cm" },
    { pref: "北海道", match: "旭川市", z: 0.9, v0: 32, sBase: 120, isSnowHeavy: true, freeze: "80cm" },
    { pref: "北海道", match: "函館市", z: 0.9, v0: 34, sBase: 80, isSnowHeavy: true, freeze: "50cm" },
    { pref: "北海道", match: "釧路市", z: 0.9, v0: 32, sBase: 60, isSnowHeavy: true, freeze: "100cm" },
    { pref: "北海道", match: "帯広市", z: 0.9, v0: 32, sBase: 80, isSnowHeavy: true, freeze: "90cm" },
    { pref: "北海道", match: "北見市", z: 0.9, v0: 32, sBase: 90, isSnowHeavy: true, freeze: "90cm" },
    // 東北
    { pref: "青森県", match: "青森市", z: 0.8, v0: 32, sBase: 180, isSnowHeavy: true, freeze: "60cm" },
    { pref: "青森県", match: "弘前市", z: 0.8, v0: 30, sBase: 130, isSnowHeavy: true, freeze: "60cm" },
    { pref: "青森県", match: "八戸市", z: 0.8, v0: 34, sBase: 50, isSnowHeavy: false, freeze: "60cm" },
    { pref: "岩手県", match: "盛岡市", z: 0.8, v0: 30, sBase: 60, isSnowHeavy: true, freeze: "60cm" },
    { pref: "岩手県", match: "宮古市", z: 0.8, v0: 34, sBase: 40, isSnowHeavy: false, freeze: "45cm" },
    { pref: "秋田県", match: "秋田市", z: 0.85, v0: 34, sBase: 80, isSnowHeavy: true, freeze: "45cm" },
    { pref: "秋田県", match: "横手市", z: 0.85, v0: 30, sBase: 180, isSnowHeavy: true, freeze: "50cm" },
    { pref: "山形県", match: "山形市", z: 0.85, v0: 30, sBase: 80, isSnowHeavy: true, freeze: "45cm" },
    { pref: "山形県", match: "酒田市", z: 0.85, v0: 34, sBase: 70, isSnowHeavy: true, freeze: "30cm" },
    { pref: "山形県", match: "米沢市", z: 0.85, v0: 30, sBase: 140, isSnowHeavy: true, freeze: "50cm" },
    { pref: "宮城県", match: "仙台市", z: 0.8, v0: 30, sBase: 35, isSnowHeavy: false, freeze: "30cm" },
    { pref: "宮城県", match: "石巻市", z: 0.8, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "30cm" },
    { pref: "福島県", match: "福島市", z: 0.85, v0: 30, sBase: 50, isSnowHeavy: false, freeze: "35cm" },
    { pref: "福島県", match: "郡山市", z: 0.85, v0: 30, sBase: 40, isSnowHeavy: false, freeze: "40cm" },
    { pref: "福島県", match: "会津若松市", z: 0.85, v0: 30, sBase: 110, isSnowHeavy: true, freeze: "45cm" },
    { pref: "福島県", match: "いわき市", z: 0.85, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },

    // 関東
    { pref: "東京都", match: "千代田区", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし (≧240mm)" },
    { pref: "東京都", match: "新宿区", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし (≧240mm)" },
    { pref: "東京都", match: "八王子市", z: 1.0, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし (≧240mm)" },
    { pref: "東京都", match: "大島町", z: 1.0, v0: 38, sBase: 0, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "東京都", match: "八丈町", z: 0.9, v0: 40, sBase: 0, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "東京都", match: "小笠原村", z: 0.8, v0: 40, sBase: 0, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "神奈川県", match: "横浜市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "神奈川県", match: "川崎市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "神奈川県", match: "相模原市", z: 1.0, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "神奈川県", match: "三浦市", z: 1.0, v0: 36, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "千葉県", match: "千葉市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "千葉県", match: "銚子市", z: 1.0, v0: 36, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "千葉県", match: "館山市", z: 1.0, v0: 38, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "埼玉県", match: "さいたま市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "埼玉県", match: "熊谷市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "埼玉県", match: "秩父市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "茨城県", match: "水戸市", z: 1.0, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "茨城県", match: "日立市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "茨城県", match: "鹿嶋市", z: 1.0, v0: 36, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "栃木県", match: "宇都宮市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "栃木県", match: "日光市", z: 1.0, v0: 30, sBase: 60, isSnowHeavy: false, freeze: "35〜50cm" },
    { pref: "群馬県", match: "前橋市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "群馬県", match: "高崎市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "群馬県", match: "沼田市", z: 1.0, v0: 30, sBase: 70, isSnowHeavy: true, freeze: "35〜45cm" },
    { pref: "群馬県", match: "みなかみ町", z: 1.0, v0: 30, sBase: 150, isSnowHeavy: true, freeze: "45cm" },

    // 北陸・甲信越
    { pref: "新潟県", match: "新潟市", z: 0.9, v0: 34, sBase: 80, isSnowHeavy: true, freeze: "30cm" },
    { pref: "新潟県", match: "長岡市", z: 0.9, v0: 32, sBase: 180, isSnowHeavy: true, freeze: "35cm" },
    { pref: "新潟県", match: "上越市", z: 0.9, v0: 32, sBase: 180, isSnowHeavy: true, freeze: "35cm" },
    { pref: "新潟県", match: "南魚沼市", z: 0.9, v0: 30, sBase: 250, isSnowHeavy: true, freeze: "40cm" },
    { pref: "富山県", match: "富山市", z: 0.9, v0: 30, sBase: 120, isSnowHeavy: true, freeze: "指定なし" },
    { pref: "富山県", match: "高岡市", z: 0.9, v0: 30, sBase: 100, isSnowHeavy: true, freeze: "指定なし" },
    { pref: "石川県", match: "金沢市", z: 0.9, v0: 32, sBase: 100, isSnowHeavy: true, freeze: "指定なし" },
    { pref: "石川県", match: "輪島市", z: 0.9, v0: 34, sBase: 60, isSnowHeavy: true, freeze: "30cm" },
    { pref: "福井県", match: "福井市", z: 0.9, v0: 32, sBase: 100, isSnowHeavy: true, freeze: "指定なし" },
    { pref: "福井県", match: "敦賀市", z: 0.9, v0: 34, sBase: 80, isSnowHeavy: true, freeze: "指定なし" },
    { pref: "福井県", match: "大野市", z: 0.9, v0: 30, sBase: 150, isSnowHeavy: true, freeze: "30cm" },
    { pref: "山梨県", match: "甲府市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "30cm" },
    { pref: "山梨県", match: "富士吉田市", z: 1.0, v0: 30, sBase: 60, isSnowHeavy: false, freeze: "60cm" },
    { pref: "山梨県", match: "北杜市", z: 1.0, v0: 30, sBase: 40, isSnowHeavy: false, freeze: "60〜70cm" },
    { pref: "長野県", match: "長野市", z: 1.0, v0: 30, sBase: 80, isSnowHeavy: true, freeze: "50cm" },
    { pref: "長野県", match: "松本市", z: 1.0, v0: 30, sBase: 40, isSnowHeavy: false, freeze: "60cm" },
    { pref: "長野県", match: "上田市", z: 1.0, v0: 30, sBase: 35, isSnowHeavy: false, freeze: "50cm" },
    { pref: "長野県", match: "諏訪市", z: 1.0, v0: 30, sBase: 35, isSnowHeavy: false, freeze: "60cm" },
    { pref: "長野県", match: "伊那市", z: 1.0, v0: 30, sBase: 35, isSnowHeavy: false, freeze: "50cm" },
    { pref: "長野県", match: "飯田市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "45cm" },
    { pref: "長野県", match: "軽井沢町", z: 1.0, v0: 30, sBase: 45, isSnowHeavy: false, freeze: "70〜80cm" },
    { pref: "長野県", match: "白馬村", z: 1.0, v0: 30, sBase: 200, isSnowHeavy: true, freeze: "80cm" },

    // 東海
    { pref: "静岡県", match: "静岡市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし (※条例によりZ=1.2推奨)" },
    { pref: "静岡県", match: "浜松市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし (※条例によりZ=1.2推奨)" },
    { pref: "静岡県", match: "御前崎市", z: 1.0, v0: 38, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "静岡県", match: "熱海市", z: 1.0, v0: 36, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "愛知県", match: "名古屋市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "愛知県", match: "豊橋市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "愛知県", match: "田原市", z: 1.0, v0: 36, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "岐阜県", match: "岐阜市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "岐阜県", match: "高山市", z: 1.0, v0: 30, sBase: 120, isSnowHeavy: true, freeze: "50〜60cm" },
    { pref: "岐阜県", match: "白川村", z: 1.0, v0: 30, sBase: 250, isSnowHeavy: true, freeze: "60cm" },
    { pref: "三重県", match: "津市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "三重県", match: "四日市市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "三重県", match: "尾鷲市", z: 1.0, v0: 36, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "三重県", match: "熊野市", z: 1.0, v0: 38, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },

    // 近畿
    { pref: "大阪府", match: "大阪市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "大阪府", match: "堺市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "京都府", match: "京都市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "京都府", match: "舞鶴市", z: 1.0, v0: 34, sBase: 80, isSnowHeavy: true, freeze: "30cm" },
    { pref: "兵庫県", match: "神戸市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "兵庫県", match: "姫路市", z: 1.0, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "兵庫県", match: "豊岡市", z: 1.0, v0: 32, sBase: 120, isSnowHeavy: true, freeze: "30cm" },
    { pref: "滋賀県", match: "大津市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "滋賀県", match: "長浜市", z: 1.0, v0: 30, sBase: 100, isSnowHeavy: true, freeze: "30cm" },
    { pref: "奈良県", match: "奈良市", z: 1.0, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "和歌山県", match: "和歌山市", z: 1.0, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "和歌山県", match: "串本町", z: 1.0, v0: 38, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },

    // 中国・四国
    { pref: "鳥取県", match: "鳥取市", z: 0.9, v0: 32, sBase: 80, isSnowHeavy: true, freeze: "指定なし" },
    { pref: "鳥取県", match: "米子市", z: 0.9, v0: 32, sBase: 60, isSnowHeavy: true, freeze: "指定なし" },
    { pref: "島根県", match: "松江市", z: 0.9, v0: 32, sBase: 50, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "島根県", match: "出雲市", z: 0.9, v0: 32, sBase: 50, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "岡山県", match: "岡山市", z: 0.9, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "岡山県", match: "倉敷市", z: 0.9, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "広島県", match: "広島市", z: 0.9, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "広島県", match: "福山市", z: 0.9, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "山口県", match: "山口市", z: 0.9, v0: 30, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "山口県", match: "下関市", z: 0.9, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "徳島県", match: "徳島市", z: 0.9, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "香川県", match: "高松市", z: 0.9, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "愛媛県", match: "松山市", z: 0.9, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "高知県", match: "高知市", z: 0.9, v0: 36, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "高知県", match: "室戸市", z: 0.9, v0: 38, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },

    // 九州・沖縄
    { pref: "福岡県", match: "福岡市", z: 0.9, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "福岡県", match: "北九州市", z: 0.9, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "佐賀県", match: "佐賀市", z: 0.9, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "長崎県", match: "長崎市", z: 0.9, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "長崎県", match: "佐世保市", z: 0.9, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "熊本県", match: "熊本市", z: 0.9, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "大分県", match: "大分市", z: 0.9, v0: 32, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "宮崎県", match: "宮崎市", z: 0.9, v0: 34, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "鹿児島県", match: "鹿児島市", z: 0.9, v0: 36, sBase: 30, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "鹿児島県", match: "奄美市", z: 0.9, v0: 42, sBase: 0, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "沖縄県", match: "那覇市", z: 0.7, v0: 42, sBase: 0, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "沖縄県", match: "石垣市", z: 0.7, v0: 46, sBase: 0, isSnowHeavy: false, freeze: "指定なし" },
    { pref: "沖縄県", match: "宮古島市", z: 0.7, v0: 46, sBase: 0, isSnowHeavy: false, freeze: "指定なし" }
  ]
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

  let note = "";
  if (matchedPref === "静岡県") {
    note = "【静岡県特記】静岡県地震対策指針・細則により、基準時Z=1.2割増が推奨されます。";
  } else if (matchedPref === "沖縄県") {
    note = "【沖縄県特記】台風常襲地域のため風力割増、基準風速42〜46m/sに留意してください。";
  }

  return {
    address: address,
    pref: matchedPref,
    elevation: Math.round(elevation),
    z: z,
    v0: v0,
    snowDepth: Math.max(snowDepth, 0),
    isSnowHeavy: isSnowHeavy,
    freezeDepth: freezeDepth,
    note: note
  };
}

/**
 * 国土地理院 ジオコーディング (住所 → 緯度・経度)
 */
async function geocodeAddress(query) {
  try {
    const url = `https://msearch.gsi.go.jp/msearch/api/search/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('ジオコーディング通信エラー');
    const data = await res.json();
    if (data && data.length > 0) {
      const first = data[0];
      const [lon, lat] = first.geometry.coordinates;
      return {
        lat: lat,
        lon: lon,
        title: first.properties.title
      };
    }
    return null;
  } catch (e) {
    console.error('Geocode failed:', e);
    return null;
  }
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
