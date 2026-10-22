# -*- coding: utf-8 -*-
import math

def svgToGeo(x, y, wPx, hPx, frameCenter, effectiveRadiusM, widthMm, heightMm):
    aspect = heightMm / widthMm
    rangeX = effectiveRadiusM
    rangeY = effectiveRadiusM * aspect

    mPerLat = 111132.0
    mPerLon = 111319.5 * math.cos(frameCenter['lat'] * math.pi / 180.0)

    dxM = ((x - wPx / 2.0) / (wPx / 2.0)) * rangeX
    dyM = -((y - hPx / 2.0) / (hPx / 2.0)) * rangeY

    lon = frameCenter['lon'] + dxM / mPerLon
    lat = frameCenter['lat'] + dyM / mPerLat
    return [lon, lat]

def lonLatToTile(lon, lat, zoom):
    n = math.pow(2, zoom)
    x = math.floor((lon + 180.0) / 360.0 * n)
    latRad = lat * math.pi / 180.0
    y = math.floor((1.0 - math.asinh(math.tan(latRad)) / math.pi) / 2.0 * n)
    return {'x': int(x), 'y': int(y)}

def scaleToEffectiveRadius(scale, widthMm, marginMm = 0):
    innerWidthMm = max(widthMm - (marginMm * 2), 10)
    metersPerMm = scale / 1000.0
    totalWidthMeters = innerWidthMm * metersPerMm
    return totalWidthMeters / 2.0

center = {'lat': 35.668, 'lon': 139.471}

# Test for A4 Landscape
scale = 2500
wMm, hMm = 297, 210
marginMm = 10
plotWMm = wMm - marginMm * 2
plotHMm = hMm - marginMm * 2
plotW = plotWMm * 10
plotH = plotHMm * 10
effR = scaleToEffectiveRadius(scale, wMm, marginMm)
zoom = 17

nw = svgToGeo(0, 0, plotW, plotH, center, effR, plotWMm, plotHMm)
se = svgToGeo(plotW, plotH, plotW, plotH, center, effR, plotWMm, plotHMm)
t_nw = lonLatToTile(min(nw[0], se[0]), max(nw[1], se[1]), zoom)
t_se = lonLatToTile(max(nw[0], se[0]), min(nw[1], se[1]), zoom)
num_x = (t_se['x'] + 1) - (t_nw['x'] - 1) + 1
num_y = (t_se['y'] + 1) - (t_nw['y'] - 1) + 1
print(f"A4 Landscape: tiles count = {num_x} x {num_y} = {num_x * num_y}")

# Test for B5 Portrait
wMm, hMm = 182, 257
plotWMm = wMm - marginMm * 2
plotHMm = hMm - marginMm * 2
plotW = plotWMm * 10
plotH = plotHMm * 10
effR = scaleToEffectiveRadius(scale, wMm, marginMm)
nw = svgToGeo(0, 0, plotW, plotH, center, effR, plotWMm, plotHMm)
se = svgToGeo(plotW, plotH, plotW, plotH, center, effR, plotWMm, plotHMm)
t_nw = lonLatToTile(min(nw[0], se[0]), max(nw[1], se[1]), zoom)
t_se = lonLatToTile(max(nw[0], se[0]), min(nw[1], se[1]), zoom)
num_x = (t_se['x'] + 1) - (t_nw['x'] - 1) + 1
num_y = (t_se['y'] + 1) - (t_nw['y'] - 1) + 1
print(f"B5 Portrait: tiles count = {num_x} x {num_y} = {num_x * num_y}")
