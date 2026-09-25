# -*- coding: utf-8 -*-
"""
tools/update_regional_calc_js.py

public/js/regional_calc.js を更新するスクリプト
- 省エネ地域区分 (1〜8地域) energyRegionMaster 完全実装 (早見表復旧)
- 告示日射地域区分 (A1〜A5区分) solarRegionProfiles 完全実装
- 選択地域ごとの気象庁平年値 (年平均気温、最寒月・最暖月、日照、降水量)
- 近年の気候傾向 (猛暑日・線状降水帯豪雨・冬期大雪)
- 標高差による設計参考 (気温逓減率 -0.6℃/100m, 結露・凍結リスク)
- 静岡県地震地域係数 Zs=1.2 並記対応
"""

import json

def main():
    with open('tools/all_japan_cities_database.json', 'r', encoding='utf-8') as f:
        cities = json.load(f)

    # cities 配列を最長一致（文字数の長い順）優先で安定ソート
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

    # 47都道府県のデフォルト定義
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
 * - 年間日射地域区分 (A1〜A5区分 & パッシブ設計指針)
 * - 気象庁平年値 (気温・日照・降水・積雪) & 近年の気候傾向 & 標高差設計参考
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

  // 省エネ地域区分マスター (早見表・気候平年値・近年の気候傾向・標高連動ガイダンス)
  energyRegionMaster: {{
    1: {{
      name: "1地域",
      categoryName: "極寒冷地 (北海道北東部・内陸部)",
      repCity: "北海道旭川市6条通9丁目",
      lat: 43.7706,
      lon: 142.3650,
      color: "#38bdf8",
      solarDefault: "A1",
      desc: "旭川・北見・帯広・稚内など。厳冬期に氷点下20℃以下に達する日本最強の寒冷気候。高気密・超高断熱（等級6/7）、第一種熱交換換気および基礎・外皮の凍結破断対策が必須。",
      climateNormals: {{
        tempYear: "6.9℃",
        tempColdest: "-7.5℃ (最低極値 -25℃以下)",
        tempWarmest: "21.1℃ (最高 33℃超)",
        annualSun: "1,640時間",
        annualRain: "1,040mm",
        snowDepth: "120〜150cm (最深)"
      }},
      climateTrends: "冬期の局地的大雪・ホワイトアウトと急激な寒暖差。夏期の局地的真夏日・猛暑日増加に伴う冷房需要の発生。",
      elevationGuidance: "標高100m上昇で約0.6℃低下。山間部は凍結深度100cm超、D18暖房度日（デグリーデー）が大幅増大。"
    }},
    2: {{
      name: "2地域",
      categoryName: "寒冷地 (北海道中南部・札幌・道南)",
      repCity: "北海道札幌市中央区北1条西2丁目",
      lat: 43.0621,
      lon: 141.3544,
      color: "#0ea5e9",
      solarDefault: "A1",
      desc: "札幌・函館・小樽・室蘭・釧路など。冬の寒冷期間が長く多雪を伴う地域。外皮付加断熱や樹脂トリプルサッシ、基礎根入れ深さ60cm以上が標準設計要件。",
      climateNormals: {{
        tempYear: "9.2℃",
        tempColdest: "-3.2℃ (最低極値 -12℃)",
        tempWarmest: "22.3℃",
        annualSun: "1,740時間",
        annualRain: "1,150mm",
        snowDepth: "100〜140cm"
      }},
      climateTrends: "暖冬年の急激なドカ雪・湿雪による屋根雪荷重増加、夏季の30℃超え日数の継続化。",
      elevationGuidance: "丘陵・山麓部では標高による積雪荷重急増、基礎凍結深度70〜80cmへの拡張検討。"
    }},
    3: {{
      name: "3地域",
      categoryName: "北東北・寒冷高冷地",
      repCity: "岩手県盛岡市内丸",
      lat: 39.7036,
      lon: 141.1527,
      color: "#2dd4bf",
      solarDefault: "A2",
      desc: "盛岡・青森・秋田・会津地方など。冬期の寒風と日照の少なさ、豪雪対策が重要。等級6（UA≦0.38）推奨、日射取得と給排気換気口の凍結・雪埋没防止設計。",
      climateNormals: {{
        tempYear: "10.4℃",
        tempColdest: "-1.5℃ (朝方 -10℃前後)",
        tempWarmest: "24.1℃",
        annualSun: "1,600時間",
        annualRain: "1,280mm",
        snowDepth: "70〜150cm"
      }},
      climateTrends: "短時間大雪や雨雪混在による屋根荷重増大、秋〜初冬の集中豪雨リスク。",
      elevationGuidance: "標高200m超の盆地・山間部では冷気湖（放射冷却）による朝の極低温と基礎凍結深度50〜60cm確保。"
    }},
    4: {{
      name: "4地域",
      categoryName: "南東北・甲信・北関東高冷地",
      repCity: "長野県松本市中央1丁目",
      lat: 36.2381,
      lon: 137.9720,
      color: "#10b981",
      solarDefault: "A3",
      desc: "仙台・山形・福島・松本・長野・日光・軽井沢など。朝晩の冷え込みと日射の寒暖差が大きい。等級6（UA≦0.34）でHEAT20 G2レベル、日射遮蔽と蓄熱のバランス設計。",
      climateNormals: {{
        tempYear: "12.1℃",
        tempColdest: "-0.5℃ (朝方 -8℃)",
        tempWarmest: "25.0℃ (昼間 35℃超)",
        annualSun: "2,050時間 (日照豊富)",
        annualRain: "1,020mm",
        snowDepth: "30〜60cm"
      }},
      climateTrends: "内陸特有の猛暑日増加（夏期35℃以上）と冬期放射冷却の二重負荷。昼夜気温差20℃超への追従。",
      elevationGuidance: "標高500〜1,000mでは平野部比で3〜6℃低温。凍結深度60〜80cm、給排水管の凍結防止帯施工。"
    }},
    5: {{
      name: "5地域",
      categoryName: "北陸・関東北部・中部山間部",
      repCity: "栃木県宇都宮市旭1丁目",
      lat: 36.5551,
      lon: 139.8828,
      color: "#eab308",
      solarDefault: "A3",
      desc: "宇都宮・前橋・水戸・富山・金沢・福井・岐阜山間など。冬の乾燥寒風（からっ風）または日本海側の湿雪。等級6（UA≦0.34）冷房期ηAC≦3.0、夏冬の季節風対策。",
      climateNormals: {{
        tempYear: "14.2℃",
        tempColdest: "2.8℃",
        tempWarmest: "26.3℃ (猛暑日多発)",
        annualSun: "2,080時間",
        annualRain: "1,450mm (夏期雷雨多)",
        snowDepth: "30cm (平野部) / 100cm超(日本海側)"
      }},
      climateTrends: "夏期のゲリラ豪雨・落雷・線状降水帯、40℃に迫るフェーン現象型猛暑の常態化。",
      elevationGuidance: "山麓・丘陵地では土砂災害警戒および敷地地表面排水勾配の徹底（GL+400mm以上推奨）。"
    }},
    6: {{
      name: "6地域",
      categoryName: "関東・東海・近畿・山陽・九州主要平野部",
      repCity: "埼玉県川越市幸町",
      lat: 35.9247,
      lon: 139.4842,
      color: "#f97316",
      solarDefault: "A4",
      desc: "東京・さいたま・川越・横浜・名古屋・大阪・神戸・広島・福岡など日本の人口・住宅の過半を占める標準地域。夏の猛暑（冷房遮熱ηAC≦2.8）と冬の快適暖房（等級6 UA≦0.46 / 等級7 UA≦0.26）の両立が最重要。",
      climateNormals: {{
        tempYear: "15.8℃",
        tempColdest: "4.5℃",
        tempWarmest: "27.8℃ (最高38℃超)",
        annualSun: "2,000時間",
        annualRain: "1,530mm",
        snowDepth: "30cm (一般平野部)"
      }},
      climateTrends: "都市熱環境（ヒートアイランド）の深刻化、猛暑日・熱帯夜の連続日数の更新、時間100mm級豪雨への対応。",
      elevationGuidance: "平野部〜丘陵地（標高10〜150m）。ゲリラ豪雨対策として基礎立上り天端高（GL+400mm以上）と通気層水切りの確保。"
    }},
    7: {{
      name: "7地域",
      categoryName: "南国温暖地・太平洋沿岸",
      repCity: "宮崎県宮崎市橘通東",
      lat: 31.9111,
      lon: 131.4239,
      color: "#ef4444",
      solarDefault: "A5",
      desc: "静岡沿岸・和歌山南部・高知・宮崎・鹿児島など。強い日射と温暖多雨、台風常襲。等級6（UA≦0.46）、冷房期遮熱（ηAC≦2.7）および庇・通風・屋根遮熱構造が生命線。",
      climateNormals: {{
        tempYear: "17.6℃",
        tempColdest: "7.8℃",
        tempWarmest: "28.3℃",
        annualSun: "2,150時間",
        annualRain: "2,500mm (極めて多雨)",
        snowDepth: "0〜30cm"
      }},
      climateTrends: "超大型台風の接近頻度増加、台風時の暴風雨・吹き込み防止サッシ仕様の選定。",
      elevationGuidance: "沿岸低地では高潮・津波ハザード確認、急傾斜地では大雨による法面崩壊配慮。"
    }},
    8: {{
      name: "8地域",
      categoryName: "亜熱帯地域 (沖縄・奄美・小笠原)",
      repCity: "沖縄県那覇市泉崎",
      lat: 26.2124,
      lon: 127.6809,
      color: "#ec4899",
      solarDefault: "A5",
      desc: "沖縄本島・先島諸島・奄美・小笠原など。年間を通じて温暖多湿、冬期暖房需要は極小で冷房遮熱（ηAC≦3.2）が主体。最大瞬間風速60m/s超の猛烈な台風対策・塩害対策が必須。",
      climateNormals: {{
        tempYear: "23.3℃",
        tempColdest: "17.3℃",
        tempWarmest: "29.1℃",
        annualSun: "1,770時間",
        annualRain: "2,100mm",
        snowDepth: "0cm (降雪なし)"
      }},
      climateTrends: "海水温上昇に伴う猛烈な台風の勢力維持上陸、スコール状集中豪雨の激甚化。",
      elevationGuidance: "強風による風圧荷重割増（V0=42〜46m/s）、瓦留め・雨戸シャッター等の耐風設計徹底。"
    }}
  }},

  // 年間日射地域区分 (A1〜A5) ガイダンスマスター
  solarRegionProfiles: {{
    "A1": {{
      name: "A1区分",
      sunshine: "極寡照 (日本海側北部・北海道)",
      guide: "冬期の日射取得は極めて稀。付加断熱および熱交換換気による保温を最優先とし、窓からの逃げる熱を最小化。"
    }},
    "A2": {{
      name: "A2区分",
      sunshine: "寡照 (東北日本海側・北陸)",
      guide: "冬期の降雪・曇天が多い。開口部の日射取得よりも高断熱化（樹脂サッシ・Low-Eペア/トリプル）が熱収支上有効。"
    }},
    "A3": {{
      name: "A3区分",
      sunshine: "中位 (内陸盆地・北日本太平洋側)",
      guide: "冬期の晴天と曇天が混在。南面開口からの日射取得と、夜間の熱損失防止（断熱ハニカムスクリーン等）の併用が急所。"
    }},
    "A4": {{
      name: "A4区分",
      sunshine: "多照 (太平洋側主要平野部・瀬戸内)",
      guide: "冬期は晴天率が高く豊富な日射取得が可能。南面大開口＋適切な庇（夏の日射遮蔽）によるパッシブソーラー効果大。"
    }},
    "A5": {{
      name: "A5区分",
      sunshine: "極多照 (南岸太平洋沿岸・沖縄)",
      guide: "年間を通じて極めて強い日照。冷房期の遮熱対策（深い軒、外付けルーバー、アウターシェード）が消費エネルギー削減の決定打。"
    }}
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

  // 断熱等級基準 & 省エネ地域マスター
  const insulation = REGIONAL_DATABASE.insulationGrades[energyRegion] || REGIONAL_DATABASE.insulationGrades[6];
  const regionMeta = REGIONAL_DATABASE.energyRegionMaster[energyRegion] || REGIONAL_DATABASE.energyRegionMaster[6];
  const solarProfile = REGIONAL_DATABASE.solarRegionProfiles[solarRegion] || REGIONAL_DATABASE.solarRegionProfiles["A4"];

  // 標高差による設計参考 (気温逓減率: -0.6℃ / 100m)
  const tempDiff = (elevation * 0.006).toFixed(1);
  let elevationDesignNote = "";
  if (elevation < 100) {{
    elevationDesignNote = `標高${{Math.round(elevation)}}m (平野部)。ゲリラ豪雨・内水氾濫に備え、基礎立上り天端高（GL+400mm以上）および外壁水切りの確実な排水勾配を推奨。`;
  }} else if (elevation < 300) {{
    elevationDesignNote = `標高${{Math.round(elevation)}}m (丘陵地)。平野部比で約 -${{tempDiff}}℃ 低温。朝晩の外皮結露リスクに留意し、壁体内通気層および防湿気密層の施工精度を確保。`;
  }} else if (elevation < 600) {{
    elevationDesignNote = `標高${{Math.round(elevation)}}m (準高原)。平野部比で約 -${{tempDiff}}℃ 低温。暖房負荷（D18度日）が増大。基礎根入れ深さの再確認と屋外給排水管の凍結防止施工。`;
  }} else {{
    elevationDesignNote = `標高${{Math.round(elevation)}}m (高冷地・山間部)。平野部比で約 -${{tempDiff}}℃ 大幅低温。外皮断熱等級6以上推奨、凍結深度の厳格確保、屋根雪・氷柱落下の安全離隔。`;
  }}

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
    solarProfile: solarProfile,
    climateNormals: regionMeta.climateNormals,
    climateTrends: regionMeta.climateTrends,
    elevationDesignNote: elevationDesignNote,
    tempDiff: tempDiff,
    note: note
  }};
}}

/**
 * 国土地理院 ジオコーディング (住所 → 緯度・経度)
 */
async function geocodeAddress(query) {{
  if (!query || typeof query !== 'string') {{
    return {{ lat: 35.9247, lon: 139.4842, title: '埼玉県川越市幸町' }};
  }}
  const trimmed = query.trim();
  if (!trimmed) {{
    return {{ lat: 35.9247, lon: 139.4842, title: '埼玉県川越市幸町' }};
  }}

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

  for (const [pref, d] of Object.entries(REGIONAL_DATABASE.prefectures)) {{
    if (trimmed.includes(pref)) {{
      return {{ lat: d.lat, lon: d.lon, title: pref }};
    }}
  }}

  return {{ lat: 35.9247, lon: 139.4842, title: '埼玉県川越市幸町' }};
}}

/**
 * 国土地理院 標高API (緯度・経度 → 標高m)
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

if (typeof module !== 'undefined' && module.exports) {{
  module.exports = {{
    REGIONAL_DATABASE,
    calculateRegionalConstants,
    geocodeAddress,
    fetchElevation
  }};
}}
"""

    with open('public/js/regional_calc.js', 'w', encoding='utf-8') as f:
        f.write(js_content)

    print('Updated public/js/regional_calc.js successfully with energyRegionMaster and climate details!')

if __name__ == '__main__':
    main()
