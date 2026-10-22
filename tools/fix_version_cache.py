import subprocess

PORTAL_FILE = r"e:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\kindle\study_portal_for_son.html"
INDEX_FILE = r"e:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\kindle\index.html"

with open(PORTAL_FILE, "r", encoding="utf-8") as f:
    text = f.read()

target = '<script src="Version.js"></script>'
replacement = '<script src="Version.js?v=1.1.3"></script>\n  <script>window.APP_VERSION = "1.1.3";</script>'

if target in text:
    text = text.replace(target, replacement)
    print("Replaced Version.js script tag with cache-busted tag and explicit fallback!")
else:
    print("Version.js target not found!")

with open(PORTAL_FILE, "w", encoding="utf-8") as f:
    f.write(text)
with open(INDEX_FILE, "w", encoding="utf-8") as f:
    f.write(text)

# Deploy to XServer
for f in ["study_portal_for_son.html", "index.html"]:
    fp = rf"e:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\kindle\{f}"
    res = subprocess.run(["scp", "-P", "10022", "-o", "StrictHostKeyChecking=no", fp, f"mdo3@mdo3.xsrv.jp:/home/mdo3/mdo3.com/public_html/3/{f}"], capture_output=True, text=True)
    print(f"Uploaded {f}:", "OK" if res.returncode == 0 else res.stderr)

print("Deployment complete!")
