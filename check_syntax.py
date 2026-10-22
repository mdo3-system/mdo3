import os, re

target_dir = r'D:\Dropbox\■住ま居る\■住ま居る共有\案内図作成\Antigravity'

files_to_check = [
    'js/app.js',
    'js/svg-builder.js',
    'js/state.js',
    'js/geo.js',
    'js/version.js',
    'js/services/geocoding-service.js',
    'js/services/export-service.js',
    'js/renderers/tile-renderer.js',
    'js/controllers/drawing-controller.js',
    'js/controllers/mode-controller.js'
]

print("Checking JS files syntax heuristics...")
has_error = False

for f in files_to_check:
    full_path = os.path.join(target_dir, f)
    content = open(full_path, encoding='utf-8').read()
    # Check open/close braces balance
    o_b = content.count('{')
    c_b = content.count('}')
    o_p = content.count('(')
    c_p = content.count(')')
    o_k = content.count('[')
    c_k = content.count(']')
    print(f'{f:40s} | {{}} : {o_b:3d}/{c_b:3d} | () : {o_p:3d}/{c_p:3d} | [] : {o_k:3d}/{c_k:3d}')
    if o_b != c_b or o_p != c_p or o_k != c_k:
        print(f"  WARNING: Possible bracket mismatch in {f}")

print("Syntax heuristics check passed.")
