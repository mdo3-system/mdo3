import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUTPUT_DIR = r"e:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\kindle\icons"
os.makedirs(OUTPUT_DIR, exist_ok=True)
ICON_PATH = os.path.join(OUTPUT_DIR, "icon_hibi_shojin.png")
ICON_192 = os.path.join(OUTPUT_DIR, "icon_192.png")
ICON_512 = os.path.join(OUTPUT_DIR, "icon_512.png")
FAVICON = os.path.join(OUTPUT_DIR, "favicon.ico")

SIZE = 512
img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# 1. Background Rounded Rectangle / Gradient
# 深い紺碧〜黒紺の洗練されたグラデーション
bg = Image.new("RGBA", (SIZE, SIZE))
for y in range(SIZE):
    ratio = y / SIZE
    # 深いインディゴ (#0c1322) から 紫紺 (#1e1b4b) へ
    r = int(12 + ratio * 20)
    g = int(19 + ratio * 15)
    b = int(38 + ratio * 45)
    for x in range(SIZE):
        bg.putpixel((x, y), (r, g, b, 255))

# 角丸マスク
mask = Image.new("L", (SIZE, SIZE), 0)
mask_draw = ImageDraw.Draw(mask)
mask_draw.rounded_rectangle([(0, 0), (SIZE, SIZE)], radius=110, fill=255)
img.paste(bg, (0, 0), mask)

draw = ImageDraw.Draw(img)

# 2. Golden Accent Ring (日輪・精進のエンブレム環)
center = (SIZE // 2, SIZE // 2)
outer_r = 210
inner_r = 202

# グロー効果（金色の光彩）
glow_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow_layer)
glow_draw.ellipse([center[0]-outer_r-6, center[1]-outer_r-6, center[0]+outer_r+6, center[1]+outer_r+6], outline=(245, 158, 11, 100), width=10)
glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(8))
img.alpha_composite(glow_layer)

draw = ImageDraw.Draw(img)
# 繊細な金色のダブルリング
draw.ellipse([center[0]-outer_r, center[1]-outer_r, center[0]+outer_r, center[1]+outer_r], outline=(251, 191, 36, 220), width=4)
draw.ellipse([center[0]-inner_r, center[1]-inner_r, center[0]+inner_r, center[1]+inner_r], outline=(217, 119, 6, 160), width=2)

# 四方の装飾ダイヤモンド
diamonds = [
    (center[0], center[1] - outer_r),
    (center[0], center[1] + outer_r),
    (center[0] - outer_r, center[1]),
    (center[0] + outer_r, center[1])
]
for dx, dy in diamonds:
    s = 6
    draw.polygon([(dx, dy-s), (dx+s, dy), (dx, dy+s), (dx-s, dy)], fill=(253, 224, 71, 255))

# 3. Typography: 「日々精進」
# フォント読み込み (BIZ-UDMincho または Meiryo Bold)
font_path_mincho = "C:/Windows/Fonts/BIZ-UDMinchoM.ttc"
font_path_meiryo = "C:/Windows/Fonts/meiryob.ttc"

try:
    font_main = ImageFont.truetype(font_path_mincho, 148)
    font_sub = ImageFont.truetype(font_path_meiryo, 32)
    font_hibi = ImageFont.truetype(font_path_mincho, 54)
except:
    font_main = ImageFont.load_default()
    font_sub = ImageFont.load_default()
    font_hibi = ImageFont.load_default()

# 「日々」上部
text_hibi = "日  々"
bbox_hibi = draw.textbbox((0, 0), text_hibi, font=font_hibi)
hibi_w = bbox_hibi[2] - bbox_hibi[0]
draw.text((center[0] - hibi_w // 2, 105), text_hibi, fill=(254, 240, 138, 255), font=font_hibi)

# 小さなゴールドライン
line_w = 90
draw.line([(center[0] - line_w, 175), (center[0] + line_w, 175)], fill=(245, 158, 11, 200), width=2)
# 中央の小さな星
draw.polygon([(center[0], 170), (center[0]+4, 175), (center[0], 180), (center[0]-4, 175)], fill=(253, 224, 71, 255))

# 「精進」中央大きく
text_main = "精進"
bbox_main = draw.textbbox((0, 0), text_main, font=font_main)
main_w = bbox_main[2] - bbox_main[0]
main_h = bbox_main[3] - bbox_main[1]
text_x = center[0] - main_w // 2
text_y = 195

# テキストのシャドウ（立体感）
draw.text((text_x + 3, text_y + 4), text_main, fill=(5, 8, 18, 220), font=font_main)
draw.text((text_x, text_y), text_main, fill=(255, 255, 255, 255), font=font_main)

# 下部サブタイトル: HIBI SHOJIN
text_sub = "H I B I  S H O J I N"
bbox_sub = draw.textbbox((0, 0), text_sub, font=font_sub)
sub_w = bbox_sub[2] - bbox_sub[0]
draw.text((center[0] - sub_w // 2, 385), text_sub, fill=(56, 189, 248, 240), font=font_sub)

# 下部の小さなアクセント
draw.text((center[0] - 30, 428), "★ ★ ★", fill=(245, 158, 11, 180), font=ImageFont.truetype(font_path_meiryo, 18))

# 4. Save PNGs
img.save(ICON_PATH, "PNG")
img.save(ICON_512, "PNG")

img_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
img_192.save(ICON_192, "PNG")

img_64 = img.resize((64, 64), Image.Resampling.LANCZOS)
img_64.save(FAVICON, "ICO")

print(f"Generated icons in {OUTPUT_DIR}:")
print(f"- {ICON_PATH} ({os.path.getsize(ICON_PATH)} bytes)")
print(f"- {ICON_512} ({os.path.getsize(ICON_512)} bytes)")
print(f"- {ICON_192} ({os.path.getsize(ICON_192)} bytes)")
print(f"- {FAVICON} ({os.path.getsize(FAVICON)} bytes)")
