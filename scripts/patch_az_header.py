# update_az_header.py
target = '/home/mdo3/mdo3.com/public_html/az/frontend/index.html'
with open(target, 'r', encoding='utf-8') as f:
    c = f.read()

old_brand = """    <div class="topbar-brand">
      <span class="topbar-logo">AZ斜め壁補助計算Web-CAD</span>
      <span class="topbar-version" style="margin-left: 8px; font-size: 11px; color: var(--text-secondary); opacity: 0.8;">v3.2.7</span>
    </div>"""

new_brand = """    <div class="topbar-brand">
      <a href="https://mdo3.com" style="color:var(--text-secondary); text-decoration:none; display:flex; align-items:center; gap:4px; font-size:11px; margin-right:8px; padding:3px 8px; border:1px solid var(--border); border-radius:4px; background:rgba(255,255,255,0.03);" title="mdo3ポータルへ戻る">
        <span>← mdo3.com</span>
      </a>
      <span class="topbar-logo">AZ斜め壁補助計算Web-CAD</span>
      <span class="topbar-version" style="margin-left: 8px; font-size: 11px; color: var(--text-secondary); opacity: 0.8;">v3.2.7</span>
    </div>"""

old_actions = """      <div style="display:flex; gap:4px;">
        <button class="tool-btn" onclick="document.getElementById('json-upload').click()" style="padding:6px 12px; background:var(--bg-panel-alt); font-size:11px;" title="プロジェクトファイルを読み込む"><span class="tool-icon">📂</span> 読込</button>
        <button id="btn-save-json" type="button" class="tool-btn" style="padding:6px 12px; background:var(--bg-panel-alt); font-size:11px;" title="プロジェクトファイルを保存する"><span class="tool-icon">📥</span> 保存</button>
      </div>"""

new_actions = """      <div style="display:flex; gap:4px;">
        <button class="tool-btn" onclick="document.getElementById('json-upload').click()" style="padding:6px 12px; background:var(--bg-panel-alt); font-size:11px;" title="プロジェクトファイルを読み込む"><span class="tool-icon">📂</span> 読込</button>
        <button id="btn-save-json" type="button" class="tool-btn" style="padding:6px 12px; background:var(--bg-panel-alt); font-size:11px;" title="プロジェクトファイルを保存する"><span class="tool-icon">📥</span> 保存</button>
      </div>
      <div style="width:1px; height:16px; background:var(--border); margin:0 4px;"></div>
      <a href="https://mdo3.com/#pricingPlans" target="_blank" style="padding:4px 10px; background:linear-gradient(135deg, #0284c7, #38bdf8); color:#fff; text-decoration:none; font-size:11px; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:4px;" title="ライセンス契約（月額¥5,980 / 年額¥39,800）">
        <span>ライセンス契約</span>
      </a>"""

if old_brand in c and old_actions in c:
    c = c.replace(old_brand, new_brand, 1)
    c = c.replace(old_actions, new_actions, 1)
    with open(target, 'w', encoding='utf-8') as f:
        f.write(c)
    print('SUCCESS')
else:
    print('TARGET NOT FOUND')
