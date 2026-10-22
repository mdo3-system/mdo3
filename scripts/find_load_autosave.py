# -*- coding: utf-8 -*-
import os, sys, re
sys.stdout.reconfigure(encoding='utf-8')

TARGET_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\案内図作成\Antigravity"
os.chdir(TARGET_DIR)

with open("js/app.js", "r", encoding="utf-8") as f:
    text = f.read()

for m in re.finditer(r'annaizu_autosave_v3', text):
    idx = m.start()
    print(text[max(0, idx-40):min(len(text), idx+200)])
    print("="*40)
