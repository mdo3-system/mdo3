# -*- coding: utf-8 -*-
import os, sys, re
sys.stdout.reconfigure(encoding='utf-8')

TARGET_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\案内図作成\Antigravity"
os.chdir(TARGET_DIR)

with open("js/app.js", "r", encoding="utf-8") as f:
    app_text = f.read()

print("=== 1. checkPermitSiteMarker in app.js ===")
for m in re.finditer(r'checkPermitSiteMarker', app_text):
    idx = m.start()
    print(app_text[max(0, idx-40):min(len(app_text), idx+120)])
    print("-" * 30)

print("=== 2. permitPaperSize in app.js ===")
for m in re.finditer(r'permitPaperSize', app_text):
    idx = m.start()
    print(app_text[max(0, idx-40):min(len(app_text), idx+150)])
    print("-" * 30)

print("=== 3. finishCurrentDrawing in app.js ===")
m_fin = re.search(r'function finishCurrentDrawing\(\)\s*\{.*?^\s{2}\}', app_text, re.MULTILINE | re.DOTALL)
if m_fin:
    print(m_fin.group(0))
