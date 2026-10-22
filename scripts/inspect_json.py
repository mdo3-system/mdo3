# -*- coding: utf-8 -*-
import os, sys, re
sys.stdout.reconfigure(encoding='utf-8')

TARGET_DIR = r"d:\Dropbox\■住ま居る\■住ま居る共有\案内図作成\Antigravity"
os.chdir(TARGET_DIR)

with open("js/state.js", "r", encoding="utf-8") as f:
    text = f.read()

m = re.search(r'exportJson\s*\(.*?\n  \}', text, re.DOTALL)
if m:
    print("exportJson:\n", m.group(0)[:600])

m2 = re.search(r'importJson\s*\(.*?\n  \}', text, re.DOTALL)
if m2:
    print("\nimportJson:\n", m2.group(0)[:600])
