# -*- coding: utf-8 -*-
import os, sys, re
sys.stdout.reconfigure(encoding='utf-8')

TARGET_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\案内図作成\Antigravity"
os.chdir(TARGET_DIR)

with open("js/app.js", "r", encoding="utf-8") as f:
    text = f.read()

m = re.search(r'function renderSvg\(\)\s*\{.*?^\s{2}\}', text, re.MULTILINE | re.DOTALL)
if m:
    print(m.group(0))
