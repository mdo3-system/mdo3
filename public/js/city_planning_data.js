/**
 * public/js/city_planning_data.js
 * 
 * 全国自治体 都市計画公開WebGIS ＆ 国土交通省 不動産情報ライブラリ 連携マスター辞書
 * (単一責任の原則 SRP に基づくデータ層モジュール)
 */

(function(root) {
  'use strict';

  // 全国47都道府県コードマスター (国土交通省 不動産情報ライブラリ kCode パラメータ対応)
  const PREFECTURE_CODES = {
    "北海道": "01", "青森県": "02", "岩手県": "03", "宮城県": "04", "秋田県": "05",
    "山形県": "06", "福島県": "07", "茨城県": "08", "栃木県": "09", "群馬県": "10",
    "埼玉県": "11", "千葉県": "12", "東京都": "13", "神奈川県": "14", "新潟県": "15",
    "富山県": "16", "石川県": "17", "福井県": "18", "山梨県": "19", "長野県": "20",
    "岐阜県": "21", "静岡県": "22", "愛知県": "23", "三重県": "24", "滋賀県": "25",
    "京都府": "26", "大阪府": "27", "兵庫県": "28", "奈良県": "29", "和歌山県": "30",
    "鳥取県": "31", "島根県": "32", "岡山県": "33", "広島県": "34", "山口県": "35",
    "徳島県": "36", "香川県": "37", "愛媛県": "38", "高知県": "39", "福岡県": "40",
    "佐賀県": "41", "長崎県": "42", "熊本県": "43", "大分県": "44", "宮崎県": "45",
    "鹿児島県": "46", "沖縄県": "47"
  };

  // 東京23区 都市計画公開WebGISマスター（全23区 100%網羅）
  const TOKYO_23_WARDS_GIS = {
    "千代田区": { name: "千代田区都市計画情報提供サービス", url: "https://www.chiyodatoshikei.jp/", note: "用途地域、防火・準防火、高度地区、日影規制、地区計画" },
    "中央区": { name: "中央区都市計画情報等閲覧システム", url: "https://www2.wagmap.jp/chuo/", note: "用途地域、防火・準防火、臨港地区、地区計画" },
    "港区": { name: "港区都市計画情報提供サービス", url: "https://minato-city.sonicweb-asp.jp/map/", note: "用途地域、特別用途地区、防火指定、高度地区、景観計画" },
    "新宿区": { name: "新宿区都市計画情報提供サービス", url: "https://www.city.shinjuku.lg.jp/seikatsu/file13_01_00001.html", note: "用途地域、都市計画道路、高度地区、防火地域" },
    "文京区": { name: "文京区都市計画図検索システム", url: "https://www2.wagmap.jp/bunkyo/", note: "用途地域、高度地区、防火・準防火地域、日影規制" },
    "台東区": { name: "台東区都市計画情報等閲覧システム", url: "https://www2.wagmap.jp/taito/", note: "用途地域、防火指定、高度地区、地区計画" },
    "墨田区": { name: "墨田区都市計画情報提供サービス", url: "https://www.city.sumida.lg.jp/matizukuri/matidukuri_keikaku/toshikeikaku/toshikeikakujouhou.html", note: "用途地域、防火・準防火地域、高度地区、新防火地域" },
    "江東区": { name: "江東区都市計画情報「ことまっぷ」", url: "https://koto.geocloud.jp/webgis/", note: "用途地域、臨港地区、防火指定、高度地区、地区計画" },
    "品川区": { name: "しながわWebマップ (都市計画情報)", url: "https://shinagawa.geocloud.jp/webgis/", note: "用途地域、特別用途地区、防火地域、日影規制" },
    "目黒区": { name: "目黒区都市計画情報閲覧システム", url: "https://meguro.geocloud.jp/webgis/", note: "用途地域、高度地区、防火・準防火地域、風致地区" },
    "大田区": { name: "大田区都市計画情報等閲覧システム", url: "https://ota.geocloud.jp/webgis/", note: "用途地域、高度地区、防火指定、航空法制限、地区計画" },
    "世田谷区": { name: "世田谷区「まっぷdeせたがや」", url: "https://setagaya.geocloud.jp/webgis/", note: "用途地域、高度地区、防火指定、風致地区、地区計画" },
    "渋谷区": { name: "渋谷区都市計画情報提供システム", url: "https://shibuya.geocloud.jp/webgis/", note: "用途地域、高度地区、防火・準防火地域、地区計画" },
    "中野区": { name: "中野区都市計画情報提供システム", url: "https://nakano.geocloud.jp/webgis/", note: "用途地域、高度地区、防火指定、地区計画、日影規制" },
    "杉並区": { name: "杉並区都市計画図「すぎナビ」", url: "https://suginami.geocloud.jp/webgis/", note: "用途地域、高度地区、防火・準防火地域、地区計画" },
    "豊島区": { name: "豊島区都市計画情報「としまマップ」", url: "https://toshima.geocloud.jp/webgis/", note: "用途地域、高度地区、防火地域、日影規制" },
    "北区": { name: "北区都市計画情報提供サービス", url: "https://kita.geocloud.jp/webgis/", note: "用途地域、高度地区、防火・準防火地域、地区計画" },
    "荒川区": { name: "荒川区都市計画情報閲覧システム", url: "https://arakawa.geocloud.jp/webgis/", note: "用途地域、高度地区、防火地域、新防火地域、地区計画" },
    "板橋区": { name: "板橋区都市計画「いたばしまっぷ」", url: "https://itabashi.geocloud.jp/webgis/", note: "用途地域、高度地区、防火・準防火、日影規制、地区計画" },
    "練馬区": { name: "練馬区都市計画情報提供サービス", url: "https://nerima.geocloud.jp/webgis/", note: "用途地域、高度地区、防火指定、風致地区、地区計画" },
    "足立区": { name: "足立区都市計画情報提供サービス", url: "https://adachi.geocloud.jp/webgis/", note: "用途地域、高度地区、防火地域、地区計画、日影規制" },
    "葛飾区": { name: "葛飾区都市計画情報提供サービス", url: "https://katsushika.geocloud.jp/webgis/", note: "用途地域、高度地区、防火・準防火、水害ハザード" },
    "江戸川区": { name: "江戸川区都市計画情報提供サービス", url: "https://edogawa.geocloud.jp/webgis/", note: "用途地域、高度地区、防火地域、地区計画、日影規制" }
  };

  // 政令指定都市 ＆ 主要市町村 都市計画WebGISマスター
  const MAJOR_CITIES_GIS = {
    "横浜市": { name: "横浜市行政地図情報システム (マッピー)", url: "https://wwwm.city.yokohama.lg.jp/" },
    "川崎市": { name: "川崎市ガイドマップ (都市計画情報)", url: "https://kawasaki.geocloud.jp/webgis/" },
    "相模原市": { name: "相模原市わが街ガイド (都市計画情報)", url: "https://sagamihara.geocloud.jp/webgis/" },
    "さいたま市": { name: "さいたま市地図情報 (都市計画図)", url: "https://saitama.geocloud.jp/webgis/" },
    "川越市": { name: "川越市都市計画図閲覧システム", url: "https://www.city.kawagoe.saitama.jp/shisei/toshikeikaku/toshikeikaku/toshikeikakuzu.html" },
    "千葉市": { name: "千葉市都市計画情報検索サービス", url: "https://www.city.chiba.jp/toshi/keikaku/tokei/toshikeikakujouhou.html" },
    "船橋市": { name: "ふなばし生き生きマップ (都市計画情報)", url: "https://funabashi.geocloud.jp/webgis/" },
    "名古屋市": { name: "名古屋市都市計画情報提供サービス", url: "https://www.toshikeikaku.city.nagoya.jp/" },
    "静岡市": { name: "静岡市都市計画情報マップ (しずみちinfo)", url: "https://shizuoka.geocloud.jp/webgis/" },
    "浜松市": { name: "浜松市地図情報サイト (都市計画情報)", url: "https://hamamatsu.geocloud.jp/webgis/" },
    "京都市": { name: "京都市都市計画情報等閲覧ポータル", url: "https://www.city.kyoto.lg.jp/tokei/page/0000003058.html" },
    "大阪市": { name: "マップナビおおさか (都市計画情報)", url: "https://mapnavi.city.osaka.lg.jp/" },
    "堺市": { name: "堺市電子地図サービス (都市計画情報)", url: "https://sakai.geocloud.jp/webgis/" },
    "神戸市": { name: "神戸市都市計画情報 (まちづくり地図)", url: "https://kobe.geocloud.jp/webgis/" },
    "西宮市": { name: "にしのみやWebマップ (都市計画情報)", url: "https://nishinomiya.geocloud.jp/webgis/" },
    "広島市": { name: "ひろしま地図ナビ (都市計画情報)", url: "https://www.gis.city.hiroshima.lg.jp/" },
    "福岡市": { name: "福岡市Webまっぷ (都市計画情報)", url: "https://www.city.fukuoka.lg.jp/jutaku-toshi/toshikeikaku/tokeizu.html" },
    "北九州市": { name: "北九州市G-motty (都市計画情報)", url: "https://www.city.kitakyushu.lg.jp/ken-to/file_0070.html" },
    "札幌市": { name: "札幌市地図情報サービス (都市計画情報)", url: "https://sapporo.geocloud.jp/webgis/" },
    "仙台市": { name: "せんだいくらしのマップ (都市計画情報)", url: "https://sendai.geocloud.jp/webgis/" }
  };

  // グローバルエクスポート
  root.PREFECTURE_CODES = PREFECTURE_CODES;
  root.TOKYO_23_WARDS_GIS = TOKYO_23_WARDS_GIS;
  root.MAJOR_CITIES_GIS = MAJOR_CITIES_GIS;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      PREFECTURE_CODES,
      TOKYO_23_WARDS_GIS,
      MAJOR_CITIES_GIS
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
