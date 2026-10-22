# -*- coding: utf-8 -*-
import os, sys, re
sys.stdout.reconfigure(encoding='utf-8')

TARGET_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\案内図作成\Antigravity"
os.chdir(TARGET_DIR)

with open("js/app.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "permitPaperSize" in line and "=" in line:
        for j in range(max(0, i-3), min(len(lines), i + 8)):
            print(f"{j+1}: {lines[j]}", end="")
        print("="*40)
