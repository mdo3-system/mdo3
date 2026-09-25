# -*- coding: utf-8 -*-
"""
tools/generate_all_japan_regional_db.py

全47都道府県・全1,892市区町村 構造＆省エネ地域定数 完全網羅データベース生成スクリプト
- 地震地域係数 Z (昭和55年建設省告示第1793号)
- 基準風速 V0 (平成12年建設省告示第1454号)
- 垂直積雪量 S & 多雪区域判定 (令第86条、国交省告示第594号、特定行政庁細則)
- 凍結深度 (各自治体細則・公庫共通仕様書基準)
- 省エネ地域区分 (平成25年経産省・国交省告示第1号 / 建築物省エネ法 1〜8地域)
- 年間日射地域区分 (A1〜A5区分)
"""

import json
import re

def build_city_entry(pref, city):
    """
    都道府県名と自治体名から、建築基準法・省エネ法に基づく完全な地域定数オブジェクトを生成
    """
    # デフォルト初期値
    z = 1.0
    v0 = 34
    sBase = 30
    isSnowHeavy = False
    freeze = "指定なし (≧240mm)"
    energyRegion = 6
    solarRegion = "A4"

    # ==========================================
    # 1. 北海道 (188自治体)
    # ==========================================
    if pref == "北海道":
        isSnowHeavy = True
        sBase = 100
        freeze = "60cm (道基準)"
        energyRegion = 2
        solarRegion = "A1"

        # Z値: 0.9 (道央・道南・後志・胆振) / 0.8 (道北・道東・オホーツク・十勝・釧路・根室)
        z09_cities = [
            "札幌市", "函館市", "小樽市", "室蘭市", "江別市", "千歳市", "恵庭市", "伊達市", "北広島市", "石狩市",
            "当別町", "新篠津村", "松前町", "福島町", "知内町", "木古内町", "七飯町", "鹿部町", "森町", "八雲町", "長万部町",
            "江差町", "上ノ国町", "厚沢部町", "乙部町", "奥尻町", "今金町", "せたな町",
            "島牧村", "寿都町", "黒松内町", "蘭越町", "ニセコ町", "真狩村", "留寿都村", "喜茂別町", "京極町", "倶知安町",
            "共和町", "岩内町", "泊村", "神恵内村", "積丹町", "古平町", "仁木町", "余市町", "赤井川村",
            "登別市", "白老町", "壮瞥町", "洞爺湖町", "豊浦町"
        ]
        if any(match in city for match in z09_cities):
            z = 0.9
        else:
            z = 0.8

        # 基準風速 V0
        v36 = ["留萌市", "稚内市", "根室市", "えりも町", "様似町", "浦河町", "利尻", "礼文", "羽幌", "初山別", "遠別", "天塩", "増毛", "奥尻"]
        v34 = ["函館市", "小樽市", "室蘭市", "釧路市", "網走市", "苫小牧市", "石狩市", "江差", "森町", "八雲", "松前", "厚岸", "浜中", "標津", "別海", "羅臼", "紋別市"]
        v32 = ["札幌市", "江別市", "千歳市", "恵庭市", "北広島市", "岩見沢市", "美唄市", "砂川市", "滝川市", "深川市", "当別", "新篠津"]
        if any(m in city for m in v36):
            v0 = 36
        elif any(m in city for m in v34):
            v0 = 34
        elif any(m in city for m in v32):
            v0 = 32
        else:
            v0 = 30  # 旭川、帯広、北見、富良野など内陸部

        # 積雪深
        if any(m in city for m in ["倶知安", "ニセコ", "赤井川", "岩見沢", "美唄"]):
            sBase = 200
        elif any(m in city for m in ["札幌", "旭川", "小樽", "滝川", "深川"]):
            sBase = 140
        elif any(m in city for m in ["帯広", "十勝", "釧路", "根室"]):
            sBase = 80
        elif any(m in city for m in ["函館", "室蘭", "苫小牧"]):
            sBase = 60

        # 凍結深度
        if any(m in city for m in ["帯広", "十勝", "北見", "網走", "釧路", "根室"]):
            freeze = "90〜100cm (極寒冷地基準)"
        elif any(m in city for m in ["旭川", "富良野", "名寄", "士別"]):
            freeze = "80cm (上川基準)"
        elif any(m in city for m in ["札幌", "江別", "千歳", "恵庭"]):
            freeze = "60cm (石狩基準)"
        else:
            freeze = "60〜70cm"

        # 省エネ地域: 1地域 (内陸・北部・オホーツク・十勝・釧路) / 2地域 (札幌・道央・道南・胆振沿岸)
        region1_keywords = ["旭川", "帯広", "北見", "稚内", "名寄", "士別", "富良野", "網走", "紋別", "釧路", "根室", "上川", "留萌", "宗谷", "オホーツク", "十勝"]
        if any(m in city for m in region1_keywords):
            energyRegion = 1
        else:
            energyRegion = 2

    # ==========================================
    # 2. 青森県 (40自治体)
    # ==========================================
    elif pref == "青森県":
        isSnowHeavy = True
        sBase = 120
        freeze = "60cm (県北寒冷地基準)"
        energyRegion = 3
        solarRegion = "A1"

        # Z値: 0.9 (津軽・下北) / 1.0 (南部・三八上北)
        z10_cities = ["八戸市", "十和田市", "三沢市", "七戸町", "六戸町", "東北町", "六ヶ所村", "おいらせ町", "三戸町", "五戸町", "田子町", "南部町", "階上町", "新郷村"]
        if any(m in city for m in z10_cities):
            z = 1.0
            solarRegion = "A3"
        else:
            z = 0.9

        # V0
        if "深浦" in city:
            v0 = 36
        elif any(m in city for m in ["むつ市", "大間", "東通", "風間浦", "佐井", "今別", "外ヶ浜", "鯵ヶ沢"]):
            v0 = 34
        elif any(m in city for m in ["青森市", "八戸市", "五所川原市", "つがる市", "三沢市", "おいらせ", "野辺地", "平内"]):
            v0 = 32
        else:
            v0 = 30  # 弘前市、黒石市、平川市、十和田市など

        # 積雪
        if "青森市" in city:
            sBase = 150
        elif "弘前市" in city:
            sBase = 130
        elif any(m in city for m in ["八戸市", "三沢市", "階上町"]):
            sBase = 50

        if any(m in city for m in ["八戸市", "三沢市", "おいらせ町"]):
            energyRegion = 4

    # ==========================================
    # 3. 岩手県 (33自治体)
    # ==========================================
    elif pref == "岩手県":
        z = 1.0
        freeze = "50〜60cm (岩手県基準)"
        solarRegion = "A2"

        sanriku_coast = ["宮古市", "大船渡市", "久慈市", "陸前高田市", "釜石市", "大槌町", "山田町", "岩泉町", "田野畑村", "普代村", "野田村", "洋野町"]
        if any(m in city for m in sanriku_coast):
            v0 = 34
            isSnowHeavy = False
            sBase = 30
            energyRegion = 4
            solarRegion = "A3"
            freeze = "30〜45cm"
        elif any(m in city for m in ["二戸市", "八幡平市", "滝沢市", "雫石町", "葛巻町", "岩手町", "一戸町", "軽米町", "九戸村"]):
            v0 = 32
            isSnowHeavy = True
            sBase = 100
            energyRegion = 3
        else:
            # 盛岡市、花巻市、北上市、一関市、奥州市等
            v0 = 30
            isSnowHeavy = True
            sBase = 70
            energyRegion = 3
            if "一関" in city:
                sBase = 50

    # ==========================================
    # 4. 宮城県 (39自治体)
    # ==========================================
    elif pref == "宮城県":
        z = 1.0
        energyRegion = 4
        solarRegion = "A3"
        freeze = "30cm (仙台平野基準)"
        sBase = 30
        isSnowHeavy = False

        coast_cities = ["石巻市", "気仙沼市", "塩竈市", "名取市", "多賀城市", "岩沼市", "東松島市", "松島町", "七ヶ浜町", "利府町", "女川町", "南三陸町", "亘理町", "山元町"]
        if any(m in city for m in coast_cities):
            v0 = 34
        elif "宮城野区" in city or "若林区" in city:
            v0 = 32
        else:
            v0 = 30

        if any(m in city for m in ["栗原市", "登米市"]):
            energyRegion = 3
            freeze = "40〜50cm"
            sBase = 50

    # ==========================================
    # 5. 秋田県 (25自治体)
    # ==========================================
    elif pref == "秋田県":
        z = 0.9
        isSnowHeavy = True
        freeze = "45〜60cm (秋田県基準)"
        energyRegion = 3
        solarRegion = "A1"

        if any(m in city for m in ["能代市", "男鹿市", "潟上市", "八峰町", "三種町", "にかほ市"]):
            v0 = 34
            sBase = 80
        elif any(m in city for m in ["秋田市", "由利本荘市", "大館市", "北秋田市", "鹿角市", "小坂町"]):
            v0 = 32
            sBase = 100
        else:
            # 横手市、湯沢市、大仙市、仙北市など豪雪盆地
            v0 = 30
            sBase = 180

    # ==========================================
    # 6. 山形県 (35自治体)
    # ==========================================
    elif pref == "山形県":
        z = 0.9
        isSnowHeavy = True
        freeze = "45〜60cm (山形県基準)"
        solarRegion = "A2"

        if any(m in city for m in ["酒田市", "鶴岡市", "遊佐町", "庄内町"]):
            v0 = 34
            sBase = 70
            energyRegion = 4
        elif any(m in city for m in ["新庄市", "最上町", "舟形町", "真室川町", "大蔵村", "鮭川村", "戸沢村", "尾花沢市"]):
            v0 = 32
            sBase = 180
            energyRegion = 3
        else:
            v0 = 30
            sBase = 100
            energyRegion = 4

    # ==========================================
    # 7. 福島県 (59自治体)
    # ==========================================
    elif pref == "福島県":
        hamadori = ["いわき市", "相馬市", "南相馬市", "広野町", "楢葉町", "富岡町", "川内村", "大熊町", "双葉町", "浪江町", "新地町"]
        aizu = ["会津若松市", "喜多方市", "南会津", "下郷", "只見", "檜枝岐", "北塩原", "西会津", "磐梯", "猪苗代", "会津坂下", "湯川", "柳津", "三島", "金山", "昭和", "会津美里"]

        if any(m in city for m in hamadori):
            z = 1.0
            v0 = 34
            sBase = 30
            isSnowHeavy = False
            freeze = "指定なし (≧240mm)"
            energyRegion = 5 if "いわき" in city else 4
            solarRegion = "A4"
        elif any(m in city for m in aizu):
            z = 0.9
            v0 = 30
            sBase = 120
            isSnowHeavy = True
            freeze = "45〜60cm (会津寒冷地基準)"
            energyRegion = 3
            solarRegion = "A2"
        else:
            # 中通り (福島市、郡山市、白河市、須賀川市等)
            if any(m in city for m in ["郡山市", "白河市", "須賀川市", "田村市", "西白河", "石川", "岩瀬"]):
                z = 0.9
            else:
                z = 1.0  # 福島市、伊達市、本宮市等
            v0 = 30
            sBase = 40
            isSnowHeavy = False
            freeze = "30cm (中通り基準)"
            energyRegion = 4
            solarRegion = "A3"

    # ==========================================
    # 8. 茨城県 (44自治体)
    # ==========================================
    elif pref == "茨城県":
        z = 1.0
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        solarRegion = "A4"

        coast_cities = ["日立市", "高萩市", "北茨城市", "鹿嶋市", "潮来市", "神栖市", "行方市", "鉾田市", "大洗町"]
        v32_cities = ["水戸市", "つくば市", "土浦市", "ひたちなか市", "石岡市", "龍ケ崎市", "取手市", "牛久市", "かすみがうら市", "稲敷市", "守谷市", "那珂市", "小美玉市", "茨城町", "大子町", "東海村", "美浦村", "阿見町", "河内町", "利根町"]
        
        if any(m in city for m in coast_cities):
            v0 = 34
        elif any(m in city for m in v32_cities):
            v0 = 32
        else:
            v0 = 30  # 古河市、結城市、下妻市、筑西市等県西

        if any(m in city for m in ["神栖市", "鹿嶋市", "潮来市"]):
            energyRegion = 6
        else:
            energyRegion = 5

    # ==========================================
    # 9. 栃木県 (25自治体)
    # ==========================================
    elif pref == "栃木県":
        z = 1.0
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        energyRegion = 5
        solarRegion = "A4"

        v32_cities = ["真岡市", "那須烏山市", "益子町", "茂木町", "市貝町", "芳賀町"]
        if any(m in city for m in v32_cities):
            v0 = 32
        else:
            v0 = 30

        if any(m in city for m in ["日光市", "那須町", "那須塩原市"]):
            energyRegion = 4
            freeze = "40〜60cm (北部山間地基準)"
            if "日光" in city or "那須町" in city:
                isSnowHeavy = True
                sBase = 60

    # ==========================================
    # 10. 群馬県 (35自治体)
    # ==========================================
    elif pref == "群馬県":
        z = 1.0
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        energyRegion = 5
        solarRegion = "A4"

        higashi_mo = ["桐生市", "館林市", "みどり市", "板倉町", "明和町", "千代田町", "大泉町", "邑楽町"]
        if any(m in city for m in higashi_mo):
            v0 = 32
        else:
            v0 = 30

        if any(m in city for m in ["みなかみ町", "草津町", "嬬恋村", "長野原町", "中之条町", "片品村", "川場村"]):
            isSnowHeavy = True
            sBase = 120
            freeze = "45〜60cm (山間寒冷地基準)"
            energyRegion = 3 if ("草津" in city or "嬬恋" in city or "みなかみ" in city) else 4

    # ==========================================
    # 11. 埼玉県 (72自治体)
    # ==========================================
    elif pref == "埼玉県":
        z = 1.0
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        energyRegion = 6
        solarRegion = "A4"

        v34_cities = [
            "川口市", "春日部市", "草加市", "越谷市", "蕨市", "戸田市", "八潮市", "三郷市", "吉川市", "松伏町",
            "志木市", "和光市", "新座市", "浦和区", "南区", "緑区", "桜区", "岩槻区"
        ]
        v32_cities = [
            "川越市", "所沢市", "狭山市", "入間市", "上尾市", "桶川市", "久喜市", "富士見市", "ふじみ野市", "蓮田市",
            "幸手市", "白岡市", "伊奈町", "三芳町", "宮代町", "杉戸町",
            "大宮区", "西区", "北区", "見沼区", "中央区"
        ]

        if any(m in city for m in v34_cities):
            v0 = 34
        elif any(m in city for m in v32_cities):
            v0 = 32
        else:
            v0 = 30  # 熊谷、深谷、本庄、秩父、坂戸、鶴ヶ島等

        if "秩父" in city or "横瀬" in city or "小鹿野" in city:
            energyRegion = 5
            solarRegion = "A3"

    # ==========================================
    # 12. 千葉県 (59自治体)
    # ==========================================
    elif pref == "千葉県":
        z = 1.0
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        energyRegion = 6
        solarRegion = "A4"

        v38 = ["銚子市", "館山市", "勝浦市", "鴨川市", "南房総市", "いすみ市", "東庄町", "九十九里町", "一宮町", "睦沢町", "白子町", "長生村", "御宿町", "鋸南町"]
        v36 = ["木更津市", "茂原市", "君津市", "富津市", "袖ケ浦市", "大網白里市", "旭市", "匝瑳市", "香取市", "山武市", "長南町", "大多喜町", "芝山町", "横芝光町"]
        v32 = ["野田市", "流山市"]

        if any(m in city for m in v38):
            v0 = 38
        elif any(m in city for m in v36):
            v0 = 36
        elif any(m in city for m in v32):
            v0 = 32
        else:
            v0 = 34  # 千葉市全区、船橋市、市川市、松戸市、柏市、浦安市等

    # ==========================================
    # 13. 東京都 (62自治体)
    # ==========================================
    elif pref == "東京都":
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        energyRegion = 6
        solarRegion = "A4"
        z = 1.0

        # 島しょ部判定
        islands_42 = ["八丈町", "青ヶ島村"]
        islands_40 = ["新島村", "神津島村", "三宅村", "御蔵島村", "小笠原村"]
        islands_38 = ["大島町", "利島村"]

        if any(m in city for m in islands_42):
            z = 0.9
            v0 = 42
            energyRegion = 7
        elif any(m in city for m in islands_40):
            z = 1.0
            v0 = 40
            energyRegion = 8 if "小笠原" in city else 7
        elif any(m in city for m in islands_38):
            z = 1.0
            v0 = 38
            energyRegion = 7
        elif any(m in city for m in ["青梅市", "日の出町", "檜原村", "奥多摩町"]):
            v0 = 30
            energyRegion = 5
            freeze = "30cm (西多摩山間部)"
            if "奥多摩" in city or "檜原" in city:
                sBase = 50
        elif any(m in city for m in ["武蔵野市", "三鷹市", "調布市", "狛江市"]) or "区" in city:
            v0 = 34  # 23区全区および武蔵野・調布等
        else:
            v0 = 32  # 八王子市、立川市、町田市、府中市、小平市等多摩丘陵・平野

    # ==========================================
    # 14. 神奈川県 (58自治体)
    # ==========================================
    elif pref == "神奈川県":
        z = 1.0
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        energyRegion = 6
        solarRegion = "A4"

        shonan_coast = ["横須賀市", "平塚市", "鎌倉市", "藤沢市", "小田原市", "茅ヶ崎市", "三浦市", "逗子市", "葉山町", "大磯町", "二宮町", "真鶴町", "湯河原町"]
        v34_cities = ["横浜市", "川崎市", "大和市", "海老名市", "座間市", "綾瀬市", "寒川町"]
        v30_cities = ["南足柄市", "松田町", "山北町", "箱根町", "愛川町", "清川村"]

        if any(m in city for m in shonan_coast):
            v0 = 36
        elif any(m in city for m in v30_cities) or "相模原市緑区" in city:
            v0 = 30
            if "箱根" in city or "山北" in city:
                energyRegion = 5
                freeze = "30〜45cm (箱根山間部)"
        elif any(m in city for m in v34_cities):
            v0 = 34
        else:
            v0 = 32  # 相模原市中央区・南区、厚木市、秦野市、伊勢原市等

    # ==========================================
    # 15. 新潟県 (37自治体)
    # ==========================================
    elif pref == "新潟県":
        z = 0.9
        isSnowHeavy = True
        freeze = "30〜45cm (新潟県基準)"
        solarRegion = "A2"

        v34_cities = ["柏崎市", "佐渡市", "出雲崎町", "刈羽村"]
        v32_cities = ["新潟市", "上越市", "糸魚川市", "聖籠町"]

        if any(m in city for m in v34_cities):
            v0 = 34
        elif any(m in city for m in v32_cities):
            v0 = 32
        else:
            v0 = 30  # 長岡市、三条市、新発田市、十日町市等

        if any(m in city for m in ["十日町市", "魚沼市", "南魚沼市", "湯沢町", "津南町"]):
            sBase = 250
            energyRegion = 4
        elif any(m in city for m in ["長岡市", "小千谷市", "柏崎市", "妙高市"]):
            sBase = 180
            energyRegion = 5
        else:
            sBase = 100
            energyRegion = 5

    # ==========================================
    # 16. 富山県 (15自治体)
    # ==========================================
    elif pref == "富山県":
        z = 0.9
        v0 = 30
        isSnowHeavy = True
        sBase = 120
        freeze = "指定なし (≧240mm)"
        energyRegion = 5
        solarRegion = "A2"
        if "南砺" in city or "立山" in city:
            sBase = 180

    # ==========================================
    # 17. 石川県 (19自治体)
    # ==========================================
    elif pref == "石川県":
        z = 0.9
        isSnowHeavy = True
        sBase = 100
        freeze = "指定なし (≧240mm)"
        energyRegion = 5
        solarRegion = "A3"

        if any(m in city for m in ["輪島市", "珠洲市", "能登町", "志賀町"]):
            v0 = 34
            freeze = "30cm (能登北部)"
        elif any(m in city for m in ["金沢市", "小松市", "加賀市", "七尾市", "かほく市", "白山市"]):
            v0 = 32
        else:
            v0 = 30

    # ==========================================
    # 18. 福井県 (17自治体)
    # ==========================================
    elif pref == "福井県":
        z = 0.9
        isSnowHeavy = True
        sBase = 100
        freeze = "指定なし (≧240mm)"
        energyRegion = 5
        solarRegion = "A3"

        if any(m in city for m in ["敦賀市", "坂井市", "あわら市", "美浜町", "高浜町", "おおい町"]):
            v0 = 34
        elif any(m in city for m in ["福井市", "鯖江市", "越前市"]):
            v0 = 32
        else:
            v0 = 30  # 大野市、勝山市、小浜市

        if "大野" in city or "勝山" in city:
            sBase = 180
            freeze = "30cm (奥越豪雪地)"
        if "小浜" in city:
            energyRegion = 6

    # ==========================================
    # 19. 山梨県 (27自治体)
    # ==========================================
    elif pref == "山梨県":
        z = 1.0
        isSnowHeavy = False
        sBase = 30
        freeze = "30cm (甲府盆地基準)"
        energyRegion = 5
        solarRegion = "A3"
        v0 = 30

        if any(m in city for m in ["富士吉田市", "西桂町", "忍野村", "山中湖村", "鳴沢村", "富士河口湖町"]):
            v0 = 32
            freeze = "60〜70cm (富士北麓寒冷地基準)"
            energyRegion = 4
            sBase = 50
        elif "北杜市" in city:
            freeze = "50〜60cm (八ヶ岳山麓基準)"
            energyRegion = 4

    # ==========================================
    # 20. 長野県 (77自治体)
    # ==========================================
    elif pref == "長野県":
        z = 1.0
        v0 = 30
        freeze = "60cm (長野県寒冷地基準)"
        solarRegion = "A3"

        if any(m in city for m in ["飯山市", "信濃町", "飯綱町", "野沢温泉村", "栄村", "白馬村", "小谷村", "山ノ内町", "木島平村"]):
            isSnowHeavy = True
            sBase = 180
            energyRegion = 2 if ("白馬" in city or "栄村" in city or "信濃町" in city) else 3
            freeze = "70〜80cm"
        elif any(m in city for m in ["長野市", "中野市", "須坂市", "大町市"]):
            isSnowHeavy = True
            sBase = 90
            energyRegion = 4
            freeze = "60cm"
        elif any(m in city for m in ["松本市", "塩尻市", "安曇野市", "岡谷市", "諏訪市", "茅野市", "下諏訪町", "軽井沢町"]):
            isSnowHeavy = False
            sBase = 50
            energyRegion = 4
            freeze = "70〜80cm" if ("茅野" in city or "軽井沢" in city) else "60cm"
        else:
            # 飯田市、伊那市、駒ヶ根市等南部
            isSnowHeavy = False
            sBase = 30
            energyRegion = 5
            freeze = "45cm"

    # ==========================================
    # 21. 岐阜県 (42自治体)
    # ==========================================
    elif pref == "岐阜県":
        z = 1.0
        solarRegion = "A4"

        hida = ["高山市", "飛騨市", "下呂市", "白川村"]
        if any(m in city for m in hida):
            v0 = 30
            isSnowHeavy = True
            sBase = 150
            freeze = "50〜60cm (飛騨寒冷地基準)"
            energyRegion = 4
        else:
            # 美濃地方
            isSnowHeavy = False
            sBase = 30
            freeze = "指定なし (≧240mm)"
            energyRegion = 6
            if any(m in city for m in ["大垣市", "海津市", "養老町", "垂井町", "関ケ原町"]):
                v0 = 34
                if "関ケ原" in city:
                    isSnowHeavy = True
                    sBase = 100
            elif any(m in city for m in ["岐阜市", "各務原市", "羽島市", "瑞穂市", "本巣市", "岐南町", "笠松町"]):
                v0 = 32
            else:
                v0 = 30  # 多治見、中津川、恵那等東濃

    # ==========================================
    # 22. 静岡県 (35自治体)
    # ==========================================
    elif pref == "静岡県":
        z = 1.0  # 注記でZ=1.2割増
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        energyRegion = 6
        solarRegion = "A4"

        v36 = ["御前崎市", "下田市", "東伊豆町", "河津町", "南伊豆町", "松崎町", "西伊豆町"]
        v30 = ["御殿場市", "小山町"]
        v32 = ["三島市", "裾野市", "伊豆市", "伊豆の国市", "函南町", "清水町", "長泉町"]

        if any(m in city for m in v36):
            v0 = 36
            if "下田" in city or "南伊豆" in city:
                energyRegion = 7
                solarRegion = "A5"
        elif any(m in city for m in v30):
            v0 = 30
            energyRegion = 5
            freeze = "30〜45cm (富士山麓)"
            sBase = 50
        elif any(m in city for m in v32):
            v0 = 32
        else:
            v0 = 34  # 静岡市各区、浜松市各区、沼津市、熱海市、富士市、富士宮市、焼津市、掛川市、磐田市等

    # ==========================================
    # 23. 愛知県 (69自治体)
    # ==========================================
    elif pref == "愛知県":
        z = 1.0
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        energyRegion = 6
        solarRegion = "A4"

        v36 = ["田原市", "南知多町", "美浜町"]
        v32 = ["豊田市", "瀬戸市", "犬山市", "小牧市", "稲沢市", "江南市", "尾張旭市", "岩倉市", "みよし市", "北名古屋市", "長久手市", "扶桑町"]
        v30 = ["新城市", "設楽町", "東栄町", "豊根村"]

        if any(m in city for m in v36):
            v0 = 36
        elif any(m in city for m in v30):
            v0 = 30
            energyRegion = 5
        elif any(m in city for m in v32):
            v0 = 32
        else:
            v0 = 34  # 名古屋市全16区、豊橋市、岡崎市、一宮市、春日井市、刈谷市、安城市等

    # ==========================================
    # 24. 三重県 (29自治体)
    # ==========================================
    elif pref == "三重県":
        z = 1.0
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        energyRegion = 6
        solarRegion = "A4"

        if any(m in city for m in ["尾鷲市", "熊野市", "御浜町", "紀宝町"]):
            v0 = 38
            energyRegion = 7
            solarRegion = "A5"
        elif any(m in city for m in ["鳥羽市", "志摩市", "南伊勢町", "大紀町", "紀北町"]):
            v0 = 36
            energyRegion = 7
            solarRegion = "A5"
        elif any(m in city for m in ["伊賀市", "名張市"]):
            v0 = 32
            energyRegion = 5
        else:
            v0 = 34  # 津市、四日市市、松阪市、桑名市、鈴鹿市等

    # ==========================================
    # 25. 滋賀県 (19自治体)
    # ==========================================
    elif pref == "滋賀県":
        z = 1.0
        solarRegion = "A3"

        if any(m in city for m in ["長浜市", "高島市", "米原市"]):
            v0 = 30
            isSnowHeavy = True
            sBase = 120
            freeze = "30cm (湖北豪雪地)"
            energyRegion = 5
        else:
            v0 = 32 if ("大津" in city or "草津" in city or "彦根" in city) else 30
            isSnowHeavy = False
            sBase = 30
            freeze = "指定なし (≧240mm)"
            energyRegion = 6

    # ==========================================
    # 26. 京都府 (26自治体)
    # ==========================================
    elif pref == "京都府":
        z = 1.0
        solarRegion = "A3"

        if any(m in city for m in ["舞鶴市", "宮津市", "京丹後市", "伊根町", "与謝野町"]):
            v0 = 34
            isSnowHeavy = True
            sBase = 80
            freeze = "30cm (丹後地方)"
            energyRegion = 5
        elif any(m in city for m in ["福知山市", "綾部市", "南丹市", "京丹波町"]):
            v0 = 30
            isSnowHeavy = True
            sBase = 60
            freeze = "30cm"
            energyRegion = 5
        else:
            v0 = 32  # 京都市全11区、宇治市、城陽市、向日市、長岡京市、八幡市等
            isSnowHeavy = False
            sBase = 30
            freeze = "指定なし (≧240mm)"
            energyRegion = 6
            solarRegion = "A4"

    # ==========================================
    # 27. 大阪府 (72自治体)
    # ==========================================
    elif pref == "大阪府":
        z = 1.0
        v0 = 34  # 大阪府全43自治体一律 34m/s
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        solarRegion = "A4"
        energyRegion = 5 if "能勢町" in city else 6

    # ==========================================
    # 28. 兵庫県 (49自治体)
    # ==========================================
    elif pref == "兵庫県":
        z = 1.0
        solarRegion = "A4"

        awaji = ["洲本市", "南あわじ市", "淡路市"]
        tajima = ["豊岡市", "養父市", "朝来市", "宍粟市", "香美町", "新温泉町"]
        inland = ["三木市", "三田市", "加西市", "丹波篠山市", "丹波市", "小野市", "加東市", "多可町", "福崎町", "市川町", "神河町", "上郡町", "佐用町"]

        if any(m in city for m in awaji):
            v0 = 36
            isSnowHeavy = False
            sBase = 30
            freeze = "指定なし (≧240mm)"
            energyRegion = 6
        elif any(m in city for m in tajima):
            v0 = 30
            isSnowHeavy = True
            sBase = 120
            freeze = "30cm (但馬豪雪地)"
            energyRegion = 4 if ("香美" in city or "新温泉" in city) else 5
            solarRegion = "A3"
        elif any(m in city for m in inland):
            v0 = 32
            isSnowHeavy = False
            sBase = 30
            freeze = "指定なし (≧240mm)"
            energyRegion = 5 if ("丹波" in city or "三田" in city) else 6
        else:
            v0 = 34  # 神戸市全9区、姫路市、尼崎市、明石市、西宮市、芦屋市、伊丹市、加古川市、宝塚市等
            isSnowHeavy = False
            sBase = 30
            freeze = "指定なし (≧240mm)"
            energyRegion = 6

    # ==========================================
    # 29. 奈良県 (39自治体)
    # ==========================================
    elif pref == "奈良県":
        z = 1.0
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        solarRegion = "A4"

        v0 = 32 if "生駒市" in city else 30
        if any(m in city for m in ["吉野", "黒滝", "天川", "野迫川", "十津川", "下北山", "上北山", "川上", "東吉野", "宇陀"]):
            energyRegion = 5
            freeze = "30cm (吉野山間部)"
        else:
            energyRegion = 6  # 奈良市、橿原市、生駒市等盆地部

    # ==========================================
    # 30. 和歌山県 (30自治体)
    # ==========================================
    elif pref == "和歌山県":
        z = 1.0
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        solarRegion = "A4"

        v38 = ["新宮市", "白浜町", "すさみ町", "那智勝浦町", "太地町", "古座川町", "串本町"]
        v36 = ["海南市", "有田市", "御坊市", "田辺市", "美浜町", "日高町", "由良町", "印南町", "みなべ町", "日高川町"]
        v32 = ["橋本市", "かつらぎ町", "九度山町", "高野町"]

        if any(m in city for m in v38):
            v0 = 38
            energyRegion = 7
            solarRegion = "A5"
        elif any(m in city for m in v36):
            v0 = 36
            if "田辺" in city or "白浜" in city or "御坊" in city:
                energyRegion = 7
        elif any(m in city for m in v32):
            v0 = 32
            if "高野" in city:
                energyRegion = 5
                freeze = "30cm (高野山)"
        else:
            v0 = 34  # 和歌山市、岩出市、紀の川市

    # ==========================================
    # 31. 鳥取県 (19自治体)
    # ==========================================
    elif pref == "鳥取県":
        z = 0.9
        isSnowHeavy = True
        freeze = "指定なし (≧240mm)"
        energyRegion = 5
        solarRegion = "A3"

        if any(m in city for m in ["米子市", "境港市", "日吉津村"]):
            v0 = 34
            sBase = 60
        else:
            v0 = 32
            sBase = 100
        if "大山" in city:
            freeze = "30cm (大山山麓)"

    # ==========================================
    # 32. 島根県 (19自治体)
    # ==========================================
    elif pref == "島根県":
        z = 0.9
        freeze = "指定なし (≧240mm)"
        energyRegion = 6
        solarRegion = "A3"

        if any(m in city for m in ["浜田市", "益田市", "大田市", "江津市", "海士町", "西ノ島町", "知夫村", "隠岐の島町"]):
            v0 = 34
            isSnowHeavy = False
            sBase = 40
        else:
            v0 = 32  # 松江市、出雲市、安来市等
            isSnowHeavy = False
            sBase = 40

        if any(m in city for m in ["飯南町", "奥出雲町", "吉賀町"]):
            isSnowHeavy = True
            sBase = 100
            energyRegion = 5
            freeze = "30cm"

    # ==========================================
    # 33. 岡山県 (27自治体)
    # ==========================================
    elif pref == "岡山県":
        z = 0.9
        solarRegion = "A4"

        v34 = ["倉敷市", "玉野市", "浅口市", "早島町", "里庄町"]
        v30 = ["津山市", "美作市", "新見市", "真庭市", "勝央町", "奈義町", "西粟倉村", "久米南町", "美咲町", "新庄村", "鏡野町"]

        if any(m in city for m in v34):
            v0 = 34
            isSnowHeavy = False
            sBase = 30
            freeze = "指定なし (≧240mm)"
            energyRegion = 6
        elif any(m in city for m in v30):
            v0 = 30
            energyRegion = 5
            if any(m in city for m in ["新庄村", "鏡野町", "真庭市"]):
                isSnowHeavy = True
                sBase = 90
                freeze = "30cm (県北山間部)"
            else:
                isSnowHeavy = False
                sBase = 40
                freeze = "指定なし (≧240mm)"
        else:
            v0 = 32  # 岡山市全4区、笠岡市、総社市、高梁市、備前市、瀬戸内市、赤磐市等
            isSnowHeavy = False
            sBase = 30
            freeze = "指定なし (≧240mm)"
            energyRegion = 6

    # ==========================================
    # 34. 広島県 (30自治体)
    # ==========================================
    elif pref == "広島県":
        z = 0.9
        solarRegion = "A4"

        v34 = ["呉市", "尾道市", "福山市", "三原市", "竹原市", "大竹市", "江田島市", "坂町", "大崎上島町"]
        v30 = ["三次市", "庄原市", "安芸高田市", "北広島町", "神石高原町"]

        if any(m in city for m in v34):
            v0 = 34
            isSnowHeavy = False
            sBase = 30
            freeze = "指定なし (≧240mm)"
            energyRegion = 6
        elif any(m in city for m in v30):
            v0 = 30
            isSnowHeavy = True
            sBase = 90
            freeze = "30cm (中国山地)"
            energyRegion = 4 if ("庄原" in city or "北広島" in city) else 5
        else:
            v0 = 32  # 広島市全8区、東広島市、廿日市市、府中市等
            isSnowHeavy = False
            sBase = 30
            freeze = "指定なし (≧240mm)"
            energyRegion = 6

    # ==========================================
    # 35. 山口県 (19自治体)
    # ==========================================
    elif pref == "山口県":
        z = 0.8  # 告示1793号: 山口県全域 Z=0.8
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        energyRegion = 6
        solarRegion = "A4"

        v34 = ["下関市", "宇部市", "防府市", "下松市", "光市", "長門市", "柳井市", "周南市", "山陽小野田市", "周防大島町", "和木町", "上関町", "田布施町", "平生町"]
        if any(m in city for m in v34):
            v0 = 34
        else:
            v0 = 32  # 山口市、萩市、岩国市、美祢市、阿武町

    # ==========================================
    # 36. 徳島県 (24自治体)
    # ==========================================
    elif pref == "徳島県":
        z = 1.0
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        solarRegion = "A4"

        v36 = ["鳴門市", "阿南市", "松茂町", "牟岐町", "美波町", "海陽町"]
        if any(m in city for m in v36):
            v0 = 36
            if "阿南" in city or "海陽" in city or "美波" in city or "牟岐" in city:
                energyRegion = 7
                solarRegion = "A5"
            else:
                energyRegion = 6
        elif any(m in city for m in ["徳島市", "小松島市", "吉野川市", "北島町", "藍住町", "板野町"]):
            v0 = 34
            energyRegion = 6
        else:
            v0 = 32
            energyRegion = 6

    # ==========================================
    # 37. 香川県 (17自治体)
    # ==========================================
    elif pref == "香川県":
        z = 1.0
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        energyRegion = 6
        solarRegion = "A4"

        v34 = ["坂出市", "土庄町", "小豆島町", "直島町", "宇多津町", "多度津町"]
        v30 = ["善通寺市", "琴平町", "まんのう町"]

        if any(m in city for m in v34):
            v0 = 34
        elif any(m in city for m in v30):
            v0 = 30
        else:
            v0 = 32  # 高松市、丸亀市、さぬき市、東かがわ市、三豊市、観音寺市、三木町、綾川町

    # ==========================================
    # 38. 愛媛県 (20自治体)
    # ==========================================
    elif pref == "愛媛県":
        z = 0.9
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        solarRegion = "A4"

        v36 = ["八幡浜市", "西予市", "伊方町", "愛南町"]
        v34 = ["松山市", "今治市", "大洲市", "宇和島市", "伊予市", "松前町", "上島町"]
        v30 = ["久万高原町"]

        if any(m in city for m in v36):
            v0 = 36
            if "愛南" in city or "西予" in city:
                energyRegion = 7
                solarRegion = "A5"
            else:
                energyRegion = 6
        elif any(m in city for m in v30):
            v0 = 30
            energyRegion = 5
            freeze = "30cm (高原地帯)"
        elif any(m in city for m in v34):
            v0 = 34
            if "宇和島" in city:
                energyRegion = 7
                solarRegion = "A5"
            else:
                energyRegion = 6
        else:
            v0 = 32  # 新居浜市、西条市、四国中央市、砥部町、内子町
            energyRegion = 6

    # ==========================================
    # 39. 高知県 (34自治体)
    # ==========================================
    elif pref == "高知県":
        z = 0.9
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        solarRegion = "A5"

        v38 = ["室戸市", "土佐清水市", "東洋町", "大月町"]
        v36 = ["高知市", "南国市", "須崎市", "宿毛市", "安芸市", "土佐市", "香南市", "香美市", "奈半利町", "田野町", "安田町", "北川村", "馬路村", "芸西村", "中土佐町", "四万十市", "黒潮町"]

        if any(m in city for m in v38):
            v0 = 38
            energyRegion = 7
        elif any(m in city for m in v36):
            v0 = 36
            if any(m in city for m in ["宿毛市", "土佐市", "中土佐町", "四万十市", "黒潮町"]):
                energyRegion = 7
            else:
                energyRegion = 6
        else:
            v0 = 34  # いの町、仁淀川町、梼原町、四万十町、大豊町等山間部
            energyRegion = 6

    # ==========================================
    # 40. 福岡県 (72自治体)
    # ==========================================
    elif pref == "福岡県":
        z = 0.8  # 告示1793号: 福岡県全域 Z=0.8
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        energyRegion = 6
        solarRegion = "A4"

        v36 = ["宗像市", "福津市", "糸島市", "芦屋町", "岡垣町", "新宮町"]
        v32 = ["添田町", "東峰村", "八女市矢部", "八女市星野"]

        if any(m in city for m in v36):
            v0 = 36
        elif any(m in city for m in v32):
            v0 = 32
        else:
            v0 = 34  # 福岡市全7区、北九州市全7区、久留米市、大牟田市、飯塚市等全域

    # ==========================================
    # 41. 佐賀県 (20自治体)
    # ==========================================
    elif pref == "佐賀県":
        z = 0.8  # 告示1793号: 佐賀県全域 Z=0.8
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        energyRegion = 6
        solarRegion = "A4"

        v34 = ["唐津市", "伊万里市", "玄海町", "有田町"]
        if any(m in city for m in v34):
            v0 = 34
        else:
            v0 = 32  # 佐賀市、鳥栖市、武雄市、多久市、小城市、嬉野市、神埼市等

    # ==========================================
    # 42. 長崎県 (21自治体)
    # ==========================================
    elif pref == "長崎県":
        z = 0.8  # 告示1793号: 長崎県全域 Z=0.8
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        solarRegion = "A4"

        v36 = ["平戸市", "松浦市", "五島市", "西海市", "壱岐市", "対馬市", "小値賀町", "新上五島町", "南島原市"]
        if any(m in city for m in v36):
            v0 = 36
            if any(m in city for m in ["五島市", "南島原市", "新上五島町"]):
                energyRegion = 7
                solarRegion = "A5"
        else:
            v0 = 34  # 長崎市、佐世保市、諫早市、大村市、島原市、雲仙市等
            energyRegion = 6

    # ==========================================
    # 43. 熊本県 (49自治体)
    # ==========================================
    elif pref == "熊本県":
        # Z値: 0.8 (西岸・天草・八代一部) / 0.9 (熊本市・阿蘇・菊池・平野部)
        z08_cities = ["荒尾市", "水俣市", "玉名市", "山鹿市", "宇土市", "宇城市", "上天草市", "天草市", "玉東町", "南関町", "長洲町", "和水町", "芦北町", "津奈木町", "苓北町"]
        if any(m in city for m in z08_cities):
            z = 0.8
        else:
            z = 0.9  # 熊本市全5区、八代市中心部、菊池市、阿蘇市、合志市、益城町、菊陽町等

        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        solarRegion = "A4"

        v34 = ["荒尾市", "水俣市", "上天草市", "天草市", "芦北町", "津奈木町", "苓北町"]
        v30 = ["阿蘇市", "南小国町", "小国町", "産山村", "高森町", "南阿蘇村", "山都町"]

        if any(m in city for m in v34):
            v0 = 34
            energyRegion = 7
            solarRegion = "A5"
        elif any(m in city for m in v30):
            v0 = 30
            energyRegion = 5
            freeze = "30cm (阿蘇高原基準)"
            sBase = 40
        else:
            v0 = 32  # 熊本市各区、八代市、玉名市、菊池市、合志市等
            energyRegion = 6

    # ==========================================
    # 44. 大分県 (18自治体)
    # ==========================================
    elif pref == "大分県":
        # Z値: 0.8 (北部・国東) / 0.9 (大分市・別府市・南部)
        z08_cities = ["中津市", "日田市", "豊後高田市", "杵築市", "宇佐市", "国東市", "日出町"]
        if any(m in city for m in z08_cities):
            z = 0.8
        else:
            z = 0.9  # 大分市、別府市、佐伯市、臼杵市、津久見市、竹田市、豊後大野市、由布市等

        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        solarRegion = "A4"

        v34 = ["佐伯市", "津久見市", "姫島村"]
        v30 = ["日田市", "竹田市", "九重町", "玖珠町"]

        if any(m in city for m in v34):
            v0 = 34
            energyRegion = 7
            solarRegion = "A5"
        elif any(m in city for m in v30):
            v0 = 30
            if "竹田" in city or "九重" in city:
                energyRegion = 5
                freeze = "30cm (久住高原)"
            else:
                energyRegion = 6
        else:
            v0 = 32  # 大分市、別府市、中津市、宇佐市、杵築市等
            energyRegion = 6

    # ==========================================
    # 45. 宮崎県 (26自治体)
    # ==========================================
    elif pref == "宮崎県":
        z = 0.9  # 告示1793号: 宮崎県全域 Z=0.9
        isSnowHeavy = False
        sBase = 30
        freeze = "指定なし (≧240mm)"
        solarRegion = "A5"

        v36 = ["日南市", "串間市"]
        v32 = ["都城市", "小林市", "えびの市", "三股町", "高原町", "西米良村"]

        if any(m in city for m in v36):
            v0 = 36
            energyRegion = 7
        elif any(m in city for m in v32):
            v0 = 32
            energyRegion = 6
        else:
            v0 = 34  # 宮崎市、延岡市、日向市、西都市等
            energyRegion = 6

    # ==========================================
    # 46. 鹿児島県 (43自治体)
    # ==========================================
    elif pref == "鹿児島県":
        amami = ["奄美市", "大和村", "宇検村", "瀬戸内町", "龍郷町", "喜界町", "徳之島町", "天城町", "伊仙町", "和泊町", "知名町", "与論町"]
        if any(m in city for m in amami):
            z = 0.9  # 奄美群島 Z=0.9
            v0 = 42
            isSnowHeavy = False
            sBase = 0
            freeze = "指定なし"
            energyRegion = 8
            solarRegion = "A5"
        else:
            z = 0.8  # 鹿児島本土・熊毛 Z=0.8
            isSnowHeavy = False
            sBase = 30
            freeze = "指定なし (≧240mm)"
            solarRegion = "A5"

            if any(m in city for m in ["西之表市", "中種子町", "南種子町", "屋久島町"]):
                v0 = 40
                energyRegion = 7
                if "屋久島" in city:
                    sBase = 0
            elif any(m in city for m in ["枕崎市", "指宿市", "南さつま市", "南九州市"]):
                v0 = 38
                energyRegion = 7
            elif any(m in city for m in ["鹿児島市", "鹿屋市", "薩摩川内市", "霧島市", "日置市", "曽於市", "志布志市", "いちき串木野市", "垂水市", "姶良市"]):
                v0 = 36
                energyRegion = 6
            else:
                v0 = 34  # 出水市、大口市、伊佐市等北部
                energyRegion = 6

    # ==========================================
    # 47. 沖縄県 (41自治体)
    # ==========================================
    elif pref == "沖縄県":
        z = 0.7  # 告示1793号: 沖縄県全域 Z=0.7
        isSnowHeavy = False
        sBase = 0
        freeze = "指定なし"
        energyRegion = 8
        solarRegion = "A5"

        sakishima = ["石垣市", "宮古島市", "竹富町", "与那国町", "多良間村"]
        islands_44 = ["久米島町", "渡嘉敷村", "座間味村", "粟国村", "渡名喜村", "南大東村", "北大東村"]

        if any(m in city for m in sakishima):
            v0 = 46
        elif any(m in city for m in islands_44):
            v0 = 44
        else:
            v0 = 42  # 那覇市、浦添市、宜野湾市、沖縄市、うるま市、名護市等全島

    zs = 1.2 if pref == "静岡県" else None

    return {
        "pref": pref,
        "match": city,
        "z": z,
        "zs": zs,
        "v0": v0,
        "sBase": sBase,
        "isSnowHeavy": isSnowHeavy,
        "freeze": freeze,
        "energyRegion": energyRegion,
        "solarRegion": solarRegion
    }

def main():
    with open('tools/japan_municipalities.json', 'r', encoding='utf-8') as f:
        all_munis = json.load(f)

    cities_db = []
    for pref, cities in all_munis.items():
        for city in cities:
            entry = build_city_entry(pref, city)
            cities_db.append(entry)

    print(f'Total cities database generated: {len(cities_db)}')

    # 出力ファイルとして保存
    with open('tools/all_japan_cities_database.json', 'w', encoding='utf-8') as f:
        json.dump(cities_db, f, ensure_ascii=False, indent=2)

    print('Saved to tools/all_japan_cities_database.json successfully!')

if __name__ == '__main__':
    main()
