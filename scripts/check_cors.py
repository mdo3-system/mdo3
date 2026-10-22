# -*- coding: utf-8 -*-
import urllib.request

req = urllib.request.Request("https://tile.openstreetmap.org/17/116315/51624.png", headers={
    'User-Agent': 'Mozilla/5.0',
    'Origin': 'https://map.mdo3.com'
})
with urllib.request.urlopen(req) as res:
    print("OSM CORS:", res.headers.get('Access-Control-Allow-Origin'))

req2 = urllib.request.Request("https://cyberjapandata.gsi.go.jp/xyz/pale/17/116315/51624.png", headers={
    'User-Agent': 'Mozilla/5.0',
    'Origin': 'https://map.mdo3.com'
})
with urllib.request.urlopen(req2) as res2:
    print("GSI CORS:", res2.headers.get('Access-Control-Allow-Origin'))
