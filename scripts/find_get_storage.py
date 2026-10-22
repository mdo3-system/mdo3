# -*- coding: utf-8 -*-
import os, sys, re
sys.stdout.reconfigure(encoding='utf-8')

TARGET_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\案内図作成\Antigravity"
os.chdir(TARGET_DIR)

for f in os.listdir("js"):
    if f.endswith(".js"):
        with open(os.path.join("js", f), "r", encoding="utf-8") as fp:
            txt = fp.read()
        for m in re.finditer(r'localStorage\.getItem', txt):
            print(f"In {f}: {txt[m.start():m.start()+80]}")
