# -*- coding: utf-8 -*-
import os, sys, re
sys.stdout.reconfigure(encoding='utf-8')

TARGET_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\案内図作成\Antigravity"
os.chdir(TARGET_DIR)

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

m = re.search(r'<select id="permitPaperSize".*?</select>', html, re.DOTALL)
if m:
    print("index.html permitPaperSize:\n", m.group(0))

with open("js/app.js", "r", encoding="utf-8") as f:
    app_text = f.read()

m2 = re.search(r'permitPaperSize\.addEventListener\(.*?\n  \}', app_text, re.DOTALL)
if m2:
    print("\napp.js permitPaperSize listener:\n", m2.group(0))
