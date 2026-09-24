# update_standards.py
import re

STANDARDS_MAP = {
    "jintsuko": [
        "建築基準法施行令 第82条 (許容応力度計算)",
        "住宅金融支援機構 木造住宅工事仕様書 (開口補強)",
        "日本建築学会 鉄筋コンクリート構造計算規準 (開口補強指針)"
    ],
    "cantilever_foundation_beam": [
        "建築基準法施行令 第82条 (許容応力度計算)",
        "住宅金融支援機構 木造住宅工事仕様書 基礎構造編",
        "日本建築学会 RC基礎構造設計規準"
    ],
    "cantilever_beam_no_column": [
        "建築基準法施行令 第82条 (許容応力度計算)",
        "建築物の構造関係技術基準解説書 (黄色本 / 片土圧・地耐力検討)",
        "日本建築学会 鉄筋コンクリート構造計算規準"
    ],
    "youheki_L_calculator": [
        "建築基準法施行令 第142条 (擁壁技術基準)",
        "宅地造成等規制法施行令 第7条〜第10条",
        "国土交通省 宅地擁壁設計マニュアル"
    ],
    "youheki_calculator": [
        "建築基準法施行令 第142条 (擁壁技術基準)",
        "宅地造成等規制法施行令",
        "日本道路協会 擁壁工指針"
    ],
    "dosha_saigai": [
        "土砂災害防止法 第24条 (特別警戒区域建築物構造基準)",
        "建築基準法施行令 第80条の3",
        "平成13年国土交通省告示 第332号・第383号"
    ],
    "balanced_rebar_ratio": [
        "建築基準法施行令 第77条 (RC造部材構造規定)",
        "日本建築学会 鉄筋コンクリート構造計算規準 (AIJ-RC)"
    ],
    "foundation_beam_horizontal": [
        "建築基準法施行令 第82条 (許容応力度等計算)",
        "確認検査機関 (KBI等) 木造べた基礎梁の水平力取扱基準"
    ],
    "zi": [
        "建築基準法告示 第1347号 (木材の許容応力度)",
        "日本建築防災協会 木造軸組工法住宅の許容応力度設計 (グレー本)"
    ],
    "merikomi": [
        "建築基準法告示 第1452号 (木材の許容めり込み応力度)",
        "日本建築防災協会 木造軸組工法住宅の許容応力度設計 (グレー本)"
    ],
    "roof_calc": [
        "建築基準法施行令 第82条の4 (風圧に対する構造耐力)",
        "平成12年建設省告示 第1458号 (屋根ふき材の構造計算)"
    ],
    "hasira_mage": [
        "建築基準法施行令 第82条 (柱の長期・短期応力検定)",
        "日本建築防災協会 木造軸組工法住宅の許容応力度設計 (グレー本)"
    ],
    "hashigo": [
        "平成12年建設省告示 第1458号 (強風地域・庇検討)",
        "日本建築学会 木質構造設計規準・同解説"
    ],
    "rigid_frame_R": [
        "建築基準法施行令 第82条 (片持ち梁断面算定)",
        "日本建築防災協会 木造軸組工法住宅の許容応力度設計 (グレー本)"
    ],
    "hariue": [
        "日本建築防災協会 木造軸組工法住宅の許容応力度設計 (グレー本 / 梁上耐力壁)",
        "日本建築学会 木質構造計算規準"
    ],
    "shosai_tarukiyane_kihon": [
        "平成19年国土交通省告示 第1541号 (水平構面基本仕様)",
        "住宅金融支援機構 木造住宅工事仕様書"
    ],
    "shosai_yanejikabari_kihon": [
        "平成19年国土交通省告示 第1541号 (面材直張り屋根基本仕様)",
        "住宅金融支援機構 木造住宅工事仕様書"
    ],
    "shosai_yuka_kihon": [
        "平成19年国土交通省告示 第1541号 (面材張り床基本仕様)",
        "住宅金融支援機構 木造住宅工事仕様書"
    ],
    "neta": [
        "平成19年国土交通省告示 第1541号 (根太工法水平構面)",
        "住宅金融支援機構 木造住宅工事仕様書"
    ],
    "shosai_tarukiyane": [
        "日本建築防災協会 木造軸組工法住宅の許容応力度設計 (グレー本 / 水平構面詳細算定)",
        "平成19年国土交通省告示 第1541号"
    ],
    "shosai_yanejikabari": [
        "日本建築防災協会 木造軸組工法住宅の許容応力度設計 (グレー本 / 水平構面編)",
        "平成19年国土交通省告示 第1541号"
    ],
    "shosai_yuka": [
        "日本建築防災協会 木造軸組工法住宅の許容応力度設計 (グレー本 / 高倍率床算定)",
        "平成19年国土交通省告示 第1541号"
    ],
    "kugihairetsushoteisu": [
        "日本建築防災協会 木造軸組工法住宅の許容応力度設計 (グレー本 / 接合部編)",
        "日本建築学会 木質構造接合部規準"
    ],
    "shosai_okabe": [
        "日本建築防災協会 木造軸組工法住宅の許容応力度設計 (グレー本 / 大壁耐力壁算定)",
        "平成12年建設省告示 第1460号"
    ],
    "shosai_shinkabe": [
        "日本建築防災協会 木造軸組工法住宅の許容応力度設計 (グレー本 / 伝統真壁仕様)",
        "平成12年建設省告示 第1100号"
    ],
    "wrc_simulator": [
        "日本建築学会 壁式鉄筋コンクリート造設計規準・同解説 (AIJ-WRC)",
        "建築物の構造関係技術基準解説書 (黄色本)"
    ],
    "wrc_axial_force": [
        "日本建築学会 壁式鉄筋コンクリート造設計規準・同解説",
        "建築基準法施行令 第82条"
    ],
    "az_skew_wall": [
        "日本建築防災協会 木造軸組工法住宅の許容応力度設計 (グレー本 / 非直交軸組)",
        "建築基準法施行令 第82条の3 (偏心率算定)"
    ],
    "map_editor": [
        "建築基準法施行規則 第1条の3 (建築確認申請書第1面 敷地付近見取図要件)",
        "国土交通省 建築確認申請・審査マニュアル"
    ]
}

target_file = r'd:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\mdo3\public\js\tools_data.js'

with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 各ツールブロックに standards 配列を挿入
for tool_id, standards in STANDARDS_MAP.items():
    # id: "xxx" を探す
    pattern = rf'(id:\s*"{tool_id}",(?:.|\n)*?canDo:\s*\[)'
    match = re.search(pattern, content)
    if match:
        st_json = ',\n      '.join([f'"{s}"' for s in standards])
        st_block = f'standards: [\n      {st_json}\n    ],\n    canDo: ['
        content = content[:match.start()] + match.group(0).replace('canDo: [', st_block) + content[match.end():]
        print(f"Added standards to {tool_id}")
    else:
        print(f"FAILED to match: {tool_id}")

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done updating tools_data.js")
