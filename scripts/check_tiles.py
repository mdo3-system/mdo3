# -*- coding: utf-8 -*-
import urllib.request, json

def check_url(url, ref=None):
    headers = {'User-Agent': 'Mozilla/5.0'}
    if ref:
        headers['Referer'] = ref
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            print(f"Status for {url}: {res.status}, content-type: {res.headers.get('content-type')}")
    except Exception as e:
        print(f"FAILED {url}: {e}")

# Check OSM tile
check_url("https://tile.openstreetmap.org/17/116315/51624.png", "https://map.mdo3.com/")
# Check GSI pale tile
check_url("https://cyberjapandata.gsi.go.jp/xyz/pale/17/116315/51624.png", "https://map.mdo3.com/")
# Check GSI std tile
check_url("https://cyberjapandata.gsi.go.jp/xyz/std/17/116315/51624.png", "https://map.mdo3.com/")
