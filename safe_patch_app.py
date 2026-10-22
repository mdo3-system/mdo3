import os

target_dir = r'D:\Dropbox\■住ま居る\■住ま居る共有\案内図作成\Antigravity'

def safe_replace(content, old_str, new_str, label):
    count = content.count(old_str)
    assert count == 1, f"Failed for '{label}': expected 1 occurrence, found {count}"
    return content.replace(old_str, new_str)

def patch_app_js(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Imports
    old_imports = 'import { EditorInteractionController } from "./editor-interaction.js";'
    new_imports = '''import { EditorInteractionController } from "./editor-interaction.js";
import { GeocodingService } from "./services/geocoding-service.js";
import { ExportService } from "./services/export-service.js";
import { DrawingController } from "./controllers/drawing-controller.js";
import { ModeController } from "./controllers/mode-controller.js";'''
    content = safe_replace(content, old_imports, new_imports, "Imports")

    # 2. Controllers init
    old_init = 'const editorInteraction = new EditorInteractionController(svgContainer, state, callbacks);'
    new_init = '''const editorInteraction = new EditorInteractionController(svgContainer, state, callbacks);

  // SRPコントローラーの生成
  const drawingController = new DrawingController(state, mapTrace, {
    setMode: (m) => setMode(m),
    showToast: (msg, isErr) => showToast(msg, isErr),
    syncAll: () => syncAll(),
    updateInspector: () => updateInspectorPanel()
  });

  const modeController = new ModeController(state, mapTrace, {
    setMode: (m) => setMode(m),
    showToast: (msg, isErr) => showToast(msg, isErr),
    syncAll: () => syncAll(),
    renderSvg: () => renderSvg()
  });'''
    content = safe_replace(content, old_init, new_init, "Controllers Init")

    # 3. Drawing Controller (updateDrawingActionBar, cancelCurrentDrawing, finishCurrentDrawing)
    old_drawing_block = '''  function updateDrawingActionBar() {
    const bar = inspectorDrawing;
    const countEl = drawingPointCount;
    const pts = state.drawingPoints || [];
    const isDrawingMode = ["lot", "major_road", "medium_road", "minor_road", "railway", "route"].includes(state.mode);

    if (bar && countEl) {
      if (isDrawingMode && pts.length > 0) {
        bar.style.display = "flex";
        countEl.textContent = pts.length;
      } else {
        bar.style.display = "none";
      }
    }
  }

  function cancelCurrentDrawing() {
    state.drawingPoints = [];
    if (state.activePolyline) {
      mapTrace.map.removeLayer(state.activePolyline);
      state.activePolyline = null;
    }
    updateDrawingActionBar();
    setMode("select");
    showToast("作図を取り消しました（選択モードに戻りました）");
  }

  if (btnFinishDrawing) btnFinishDrawing.addEventListener("click", () => finishCurrentDrawing());
  if (btnCancelDrawing) btnCancelDrawing.addEventListener("click", () => cancelCurrentDrawing());

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if ((state.drawingPoints || []).length > 0) {
        cancelCurrentDrawing();
      }
    } else if (e.key === "Enter") {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) return;
      if ((state.drawingPoints || []).length >= (state.mode === "lot" ? 3 : 2)) {
        finishCurrentDrawing();
      }
    }
  });

  function finishCurrentDrawing() {
    let createdLotId = null;
    if (state.mode === "lot" && state.drawingPoints.length >= 3) {
      state.saveToHistory();
      const lotId = `lot_${Date.now()}`;
      const pts = state.drawingPoints.map(p => ({ lat: p[0], lon: p[1] }));
      const lotCount = (state.lots || []).length + 1;
      const isFirst = (state.lots.length === 0);
      state.lots.push({
        id: lotId,
        points: pts,
        isSite: isFirst,
        label: isFirst ? "申請地" : `${lotCount}号地`,
        hasFill: true,
        fillColor: isFirst ? "#ef4444" : "#3b82f6",
        fillOpacity: isFirst ? 0.35 : 0.25,
        hasStroke: true,
        strokeColor: isFirst ? "#dc2626" : "#2563eb",
        strokeWidth: isFirst ? 4.0 : 2.5,
        strokeDash: "solid"
      });

      // 敷地を作図した場合は、既存の現地ピン・丸印を自動非表示にして二重表示を解消
      if (state.appMode === "permit" || isFirst) {
        state.dest.hidePin = true;
        if (state.permitScene && state.permitScene.dest) {
          state.permitScene.dest.hidePin = true;
        }
        if (checkPermitSiteMarker) {
          checkPermitSiteMarker.checked = false;
        }
      }

      createdLotId = lotId;
      showToast(`📐 敷地「${isFirst ? '申請地' : lotCount + '号地'}」を作図しました（選択・編集モードに切り替えました）`);
    } else if (state.drawingPoints.length >= 2) {
      state.saveToHistory();
      if (["major_road", "medium_road", "minor_road"].includes(state.mode)) {
        const roadType = state.mode === "major_road" ? "major" : state.mode === "medium_road" ? "medium" : "minor";
        state.roads.push({
          id: `road_${Date.now()}`,
          type: roadType,
          points: [...state.drawingPoints],
          casingColor: state.roadCasingColor,
          innerColor: state.roadInnerColor,
          filled: state.roadFilled,
          fillColor: state.roadFillColor
        });
      } else if (state.mode === "railway") {
        state.rails.push({
          id: `rail_${Date.now()}`,
          points: [...state.drawingPoints]
        });
      } else if (state.mode === "route") {
        state.routes.push({
          id: `route_${Date.now()}`,
          points: [...state.drawingPoints]
        });
      }
    }
    state.drawingPoints = [];
    if (state.activePolyline) {
      mapTrace.map.removeLayer(state.activePolyline);
      state.activePolyline = null;
    }
    updateDrawingActionBar();

    // 作図完了後は必ず選択モード（select）に切り替え！
    setMode("select");
    if (createdLotId) {
      state.selectedId = createdLotId;
      state.selectedType = "lot";
      updateInspectorPanel();
    }
    syncAll();
  }'''

    new_drawing_block = '''  function updateDrawingActionBar() {
    drawingController.updateActionBar();
  }

  function cancelCurrentDrawing() {
    drawingController.cancel();
  }

  function finishCurrentDrawing() {
    drawingController.finish();
  }

  if (btnFinishDrawing) btnFinishDrawing.addEventListener("click", () => finishCurrentDrawing());
  if (btnCancelDrawing) btnCancelDrawing.addEventListener("click", () => cancelCurrentDrawing());

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if ((state.drawingPoints || []).length > 0) {
        cancelCurrentDrawing();
      }
    } else if (e.key === "Enter") {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) return;
      if ((state.drawingPoints || []).length >= (state.mode === "lot" ? 3 : 2)) {
        finishCurrentDrawing();
      }
    }
  });'''
    content = safe_replace(content, old_drawing_block, new_drawing_block, "Drawing Functions")

    # 4. Mode Controller (setAppMode and syncPermitUI)
    old_mode_block = '''  function setAppMode(mode) {
    if (state.appMode === mode) return;

    // 1. state側の作図データ完全分離スワップ
    state.switchAppMode(mode);

    if (btnModeAd) btnModeAd.classList.toggle("active", mode === "ad");
    if (btnModePermit) {
      btnModePermit.classList.toggle("permit-active", mode === "permit");
      btnModePermit.classList.toggle("active", mode === "permit");
    }

    // 2. ツールバーの表示切り替え（案内図専用ツール vs 各種申請専用ツール）
    document.querySelectorAll(".tool-ad-only").forEach(el => {
      el.style.display = (mode === "ad") ? "flex" : "none";
    });
    document.querySelectorAll(".tool-permit-only").forEach(el => {
      el.style.display = (mode === "permit") ? "flex" : "none";
    });

    if (mode === "permit") {
      if (inspectorPermit) inspectorPermit.style.display = "flex";
      const scale = (state.permitInfo && state.permitInfo.scale) || 2500;
      state.effectiveRadiusM = GeoUtil.scaleToEffectiveRadius(scale, state.widthMm, 10);
      if (badgeScale) badgeScale.textContent = `${state.widthMm} × ${state.heightMm} mm (1/${scale} 余白10mm)`;
      syncPermitUI();
      showToast("📑 【各種申請モード】1/2500 国土地理院白図・見取図モードに切り替えました");
    } else {
      if (inspectorPermit) inspectorPermit.style.display = "none";
      if (badgeScale) badgeScale.textContent = `${state.widthMm} × ${state.heightMm} mm`;
      if (inputWidthMm) inputWidthMm.value = state.widthMm;
      if (inputHeightMm) inputHeightMm.value = state.heightMm;
      if (inputDestName) inputDestName.value = state.dest.name || "現地";
      showToast("🏢 【案内図モード】チラシ・Web用案内図モードに切り替えました");
    }

    setMode("select");
    // 左画面地図および作図枠マーカーを中心へ完全同期
    if (mapTrace && mapTrace.map) {
      mapTrace.map.setView([state.frameCenter.lat, state.frameCenter.lon]);
      mapTrace.destMarker.setLatLng([state.dest.lat, state.dest.lon]);
      mapTrace.frameCenterMarker.setLatLng([state.frameCenter.lat, state.frameCenter.lon]);
      mapTrace.updateFramingRectangle();
      mapTrace.updateDestPinIcon();
    }
    syncAll();
  }

  function syncPermitUI() {
    const isPermit = (state.appMode === "permit");
    if (btnModeAd) btnModeAd.classList.toggle("active", !isPermit);
    if (btnModePermit) {
      btnModePermit.classList.toggle("permit-active", isPermit);
      btnModePermit.classList.toggle("active", isPermit);
    }
    if (inspectorPermit) inspectorPermit.style.display = isPermit ? "flex" : "none";

    const info = state.permitInfo || {};
    if (permitTitle) permitTitle.value = info.title || "付近見取図";
    if (permitLotNumber) permitLotNumber.value = info.lotNumber || "";
    if (permitAddress) permitAddress.value = info.address || "";
    if (permitArchitectNo) permitArchitectNo.value = info.architectNo || "";
    if (permitArchitectName) permitArchitectName.value = info.architectName || "";
    if (permitBaseMap) permitBaseMap.value = info.baseMapType || "osm";
    if (permitScale) permitScale.value = String(info.scale || 2500);
    if (permitPaperSize) permitPaperSize.value = info.paperSize || "A4_landscape";
    if (permitBoxPosition) permitBoxPosition.value = info.boxPosition || "bottom-right";
    if (permitTileZoom) permitTileZoom.value = info.tileZoom || "17";

    if (checkPermitSiteMarker) {
      checkPermitSiteMarker.checked = !(state.dest && state.dest.hidePin === true);
    }

    if (inputWidthMm) inputWidthMm.value = state.widthMm;
    if (inputHeightMm) inputHeightMm.value = state.heightMm;
    if (inputDestName) inputDestName.value = state.dest.name !== undefined ? state.dest.name : (isPermit ? "申請地" : "現地");

    if (isPermit) {
      const s = info.scale || 2500;
      if (badgeScale) badgeScale.textContent = `${state.widthMm} × ${state.heightMm} mm (1/${s} 余白10mm)`;
    } else {
      if (badgeScale) badgeScale.textContent = `${state.widthMm} × ${state.heightMm} mm`;
    }
  }'''

    new_mode_block = '''  function setAppMode(mode) {
    modeController.setAppMode(mode);
  }

  function syncPermitUI() {
    modeController.syncUI();
  }'''
    content = safe_replace(content, old_mode_block, new_mode_block, "Mode Functions")

    # 5. Paper Size Listener
    old_paper_block = '''  if (permitPaperSize) {
    permitPaperSize.addEventListener("change", (e) => {
      state.saveToHistory();
      const val = e.target.value;
      if (!state.permitInfo) state.permitInfo = {};
      state.permitInfo.paperSize = val;
      if (val === "A4_landscape") {
        state.widthMm = 297;
        state.heightMm = 210;
      } else if (val === "A4_portrait") {
        state.widthMm = 210;
        state.heightMm = 297;
      } else if (val === "B5_landscape") {
        state.widthMm = 257;
        state.heightMm = 182;
      } else if (val === "B5_portrait") {
        state.widthMm = 182;
        state.heightMm = 257;
      }
      if (state.permitScene) {
        state.permitScene.widthMm = state.widthMm;
        state.permitScene.heightMm = state.heightMm;
        if (!state.permitScene.permitInfo) state.permitScene.permitInfo = {};
        state.permitScene.permitInfo.paperSize = val;
      }
      if (inputWidthMm) inputWidthMm.value = state.widthMm;
      if (inputHeightMm) inputHeightMm.value = state.heightMm;
      const s = (state.permitInfo && state.permitInfo.scale) || 2500;
      state.effectiveRadiusM = GeoUtil.scaleToEffectiveRadius(s, state.widthMm, 10);
      if (badgeScale) badgeScale.textContent = `${state.widthMm} × ${state.heightMm} mm (1/${s} 余白10mm)`;
      mapTrace.updateFramingRectangle();
      renderSvg();
      showToast(`用紙を「${e.target.options[e.target.selectedIndex].text}」に変更しました`);
    });
  }'''

    new_paper_block = '''  if (permitPaperSize) {
    permitPaperSize.addEventListener("change", (e) => {
      modeController.handlePaperSizeChange(e.target.value, e.target.options[e.target.selectedIndex].text);
    });
  }'''
    content = safe_replace(content, old_paper_block, new_paper_block, "Paper Size Listener")

    # 6. Export SVG
    old_svg_export = '''  btnExportSvg.addEventListener("click", () => {
    const svgEl = svgContainer.querySelector("svg");
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgString = '<?xml version="1.0" encoding="UTF-8"?>\\n' + serializer.serializeToString(svgEl);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `案内図_${state.dest.name}_${state.widthMm}x${state.heightMm}mm.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("SVGファイルを出力しました");
  });'''

    new_svg_export = '''  btnExportSvg.addEventListener("click", () => {
    const svgEl = svgContainer.querySelector("svg");
    if (!svgEl) return;
    ExportService.exportSvg(svgEl, state);
    showToast("SVGファイルを出力しました");
  });'''
    content = safe_replace(content, old_svg_export, new_svg_export, "Export SVG")

    # 7. Export PNG
    old_png_export = '''  btnExportPng.addEventListener("click", () => {
    const svgEl = svgContainer.querySelector("svg");
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const scale = 3.5; // 350dpi 高解像度
      const canvas = document.createElement("canvas");
      canvas.width = svgEl.viewBox.baseVal.width * scale;
      canvas.height = svgEl.viewBox.baseVal.height * scale;
      const ctx = canvas.getContext("2d");

      if (!state.transparentBg) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `案内図_${state.dest.name}_高解像度.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("PNG画像を出力しました");
    };
    img.src = url;
  });'''

    new_png_export = '''  btnExportPng.addEventListener("click", async () => {
    const svgEl = svgContainer.querySelector("svg");
    if (!svgEl) return;
    try {
      await ExportService.exportPng(svgEl, state);
      showToast("PNG画像を出力しました");
    } catch (err) {
      showToast("PNG出力に失敗しました", true);
    }
  });'''
    content = safe_replace(content, old_png_export, new_png_export, "Export PNG")

    # 8. Export PDF
    old_pdf_export = '''  // PDF出力ボタンハンドラ (jsPDF 高精細ダイレクト保存 ＆ 印刷フォールバック)
  const btnExportPdf = document.getElementById("btnExportPdf");
  if (btnExportPdf) {
    btnExportPdf.addEventListener("click", async () => {
      showToast("📄 PDF出力を準備中...");
      try {
        const svgEl = svgContainer.querySelector("svg");
        if (!svgEl) throw new Error("図面SVGが見つかりません");

        if (window.jspdf && window.jspdf.jsPDF) {
          const { jsPDF } = window.jspdf;
          const isLandscape = state.widthMm >= state.heightMm;
          const orientation = isLandscape ? "landscape" : "portrait";
          const paperFormat = [state.widthMm, state.heightMm];

          const doc = new jsPDF({
            orientation: orientation,
            unit: "mm",
            format: paperFormat,
            compress: true
          });

          const serializer = new XMLSerializer();
          const svgString = serializer.serializeToString(svgEl);
          const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(svgBlob);

          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error("SVG画像の読み込みに失敗しました"));
            img.src = url;
          });

          const scale = 3.5;
          const canvas = document.createElement("canvas");
          canvas.width = svgEl.viewBox.baseVal.width * scale;
          canvas.height = svgEl.viewBox.baseVal.height * scale;
          const ctx = canvas.getContext("2d");

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);

          const imgData = canvas.toDataURL("image/jpeg", 0.95);
          doc.addImage(imgData, "JPEG", 0, 0, state.widthMm, state.heightMm);

          const fileTitle = state.appMode === "permit"
            ? `付近見取図_${(state.permitInfo?.title || "申請図")}_${(state.permitInfo?.lotNumber || state.dest.name || "A4")}.pdf`
            : `案内図_${state.dest.name || "物件"}.pdf`;

          doc.save(fileTitle);
          showToast(`📄 PDFファイル「${fileTitle}」を出力しました`);
          return;
        }

        // jsPDF未読込時は印刷ダイアログを起動
        window.print();
      } catch (err) {
        console.warn("Direct PDF export warning, falling back to window.print:", err);
        window.print();
      }
    });
  }'''

    new_pdf_export = '''  // PDF出力ボタンハンドラ (ExportService ＆ 印刷フォールバック)
  const btnExportPdf = document.getElementById("btnExportPdf");
  if (btnExportPdf) {
    btnExportPdf.addEventListener("click", async () => {
      showToast("📄 PDF出力を準備中...");
      try {
        const svgEl = svgContainer.querySelector("svg");
        const fileTitle = await ExportService.exportPdf(svgEl, state);
        if (fileTitle) {
          showToast(`📄 PDFファイル「${fileTitle}」を出力しました`);
        }
      } catch (err) {
        console.warn("Direct PDF export warning, falling back to window.print:", err);
        window.print();
      }
    });
  }'''
    content = safe_replace(content, old_pdf_export, new_pdf_export, "Export PDF")

    # 9. Geocoding in searchAddress
    old_geocoding_block = '''    try {
      let lat = null;
      let lon = null;

      // 1. バックエンドAPI経由
      try {
        const res = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: q })
        });
        if (res.ok) {
          const d = await res.json();
          if (d.lat && d.lon) {
            lat = d.lat;
            lon = d.lon;
          }
        }
      } catch (backendErr) {
        console.log("Backend geocode unavailable, falling back:", backendErr);
      }

      // 2. 国土地理院 API (完全一致)
      if (lat === null || lon === null) {
        try {
          const gsiRes = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(q)}`);
          if (gsiRes.ok) {
            const gsiData = await gsiRes.json();
            if (gsiData && gsiData.length > 0 && gsiData[0].geometry) {
              lon = gsiData[0].geometry.coordinates[0];
              lat = gsiData[0].geometry.coordinates[1];
            }
          }
        } catch (e) {
          console.warn("GSI exact geocode failed:", e);
        }
      }

      // 3. 国土地理院 API (番地・号除去による段階的フォールバック)
      if (lat === null || lon === null) {
        const simplified = q.replace(/[0-9０-９]+番.*$|[0-9０-９]+-[0-9０-９].*$|[0-9０-９]+号.*$/g, "").trim();
        if (simplified && simplified !== q) {
          try {
            const gsiRes2 = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(simplified)}`);
            if (gsiRes2.ok) {
              const gsiData2 = await gsiRes2.json();
              if (gsiData2 && gsiData2.length > 0 && gsiData2[0].geometry) {
                lon = gsiData2[0].geometry.coordinates[0];
                lat = gsiData2[0].geometry.coordinates[1];
              }
            }
          } catch (e) {
            console.warn("GSI simplified geocode failed:", e);
          }
        }
      }

      // 4. OpenStreetMap Nominatim フォールバック
      if (lat === null || lon === null) {
        try {
          const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=jp&limit=1`, {
            headers: { "Accept-Language": "ja" }
          });
          if (nomRes.ok) {
            const nomData = await nomRes.json();
            if (nomData && nomData.length > 0) {
              lat = parseFloat(nomData[0].lat);
              lon = parseFloat(nomData[0].lon);
            }
          }
        } catch (e) {
          console.warn("Nominatim geocode failed:", e);
        }
      }

      if (lat === null || lon === null) {
        throw new Error(`該当の住所「${q}」が見つかりませんでした。番地までで検索するか、地図上で目的の場所をクリック・ドラッグしてください。`);
      }'''

    new_geocoding_block = '''    try {
      const { lat, lon } = await GeocodingService.search(q);'''
    content = safe_replace(content, old_geocoding_block, new_geocoding_block, "Geocoding in searchAddress")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Successfully and safely patched {file_path}')

patch_app_js(os.path.join(target_dir, 'js', 'app.js'))
patch_app_js(os.path.join(target_dir, 'frontend', 'js', 'app.js'))
