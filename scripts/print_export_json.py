# -*- coding: utf-8 -*-
import os, sys
sys.stdout.reconfigure(encoding='utf-8')

TARGET_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\案内図作成\Antigravity"
os.chdir(TARGET_DIR)

with open("js/state.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for j in range(395, min(len(lines), 450)):
    print(f"{j+1}: {lines[j]}", end="")
