# -*- coding: utf-8 -*-
import os, sys, re
sys.stdout.reconfigure(encoding='utf-8')

TARGET_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\案内図作成\Antigravity"
os.chdir(TARGET_DIR)

for f in ["js/app.js", "js/state.js"]:
    with open(f, "r", encoding="utf-8") as fp:
        txt = fp.read()
    for m in re.finditer(r'restoreAutoSave', txt):
        print(f"In {f}: {txt[max(0, m.start()-40):min(len(txt), m.start()+80)]}")
