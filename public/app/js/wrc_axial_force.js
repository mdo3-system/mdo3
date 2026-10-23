// =========================================
// WRC造 長期軸力分割ツール (wrc_axial_force.js)
// マスタ連動・集計分離版 / Excel直接読取・PDF直接読取・Gemini AIフォールバック対応
// =========================================

// PDF.js worker の設定
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
}

// --- 初期化 ---
window.addEventListener('DOMContentLoaded', () => {
    // 共通キーからGemini APIキーを読み込み
    const savedApiKey = localStorage.getItem('struct_gemini_api_key') || localStorage.getItem('gemini_api_key_wrc');
    if (savedApiKey) {
        localStorage.setItem('struct_gemini_api_key', savedApiKey);
        const keyInput = document.getElementById('apiKey');
        if (keyInput) {
            keyInput.value = savedApiKey;
            fetchModels();
        }
    }

    // 初期状態で空の生データ行を1行追加
    const tbody = document.getElementById('rawTableBody');
    if (tbody && tbody.children.length === 0) {
        addRawRow();
    }

    // ドラッグ＆ドロップ対応
    initDropZone();

    // APIキー入力監視
    const keyInput = document.getElementById('apiKey');
    if (keyInput) {
        keyInput.addEventListener('change', () => {
            const key = keyInput.value.trim();
            if (key) {
                localStorage.setItem('struct_gemini_api_key', key);
            }
        });
    }
});

// --- ドラッグ＆ドロップ機能 ---
function initDropZone() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('imageInput');
    if (!dropZone || !fileInput) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.style.borderColor = '#2563eb';
            dropZone.style.backgroundColor = '#eff6ff';
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.style.borderColor = '#cbd5e1';
            dropZone.style.backgroundColor = '#fff';
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            fileInput.files = files;
            handleFileSelect(fileInput);
        }
    }, false);
}

// --- ファイル選択時の自動実行ハンドラ ---
function handleFileSelect(input) {
    if (input.files && input.files.length > 0) {
        const file = input.files[0];
        const status = document.getElementById('statusMessage');
        if (status) {
            status.style.color = '#2563eb';
            status.innerText = `ファイル選択: ${file.name} を読み込み中...`;
        }
        // 即座に自動処理を実行
        processImage();
    }
}

// --- APIモデル取得 (オプション) ---
async function fetchModels() {
    const keyInput = document.getElementById('apiKey');
    if (!keyInput) return;
    const apiKey = keyInput.value.trim();
    const status = document.getElementById('modelStatus');
    const select = document.getElementById('modelSelect');

    if (!apiKey) {
        alert('Google AI Studio APIキーを入力してください。');
        return;
    }

    localStorage.setItem('struct_gemini_api_key', apiKey);
    if (status) status.innerText = 'モデル取得中...';
    const btnFetch = document.getElementById('btn-fetch');
    if (btnFetch) btnFetch.disabled = true;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) throw new Error('API通信エラー。キーを確認してください。');

        const data = await response.json();
        select.innerHTML = '';

        let modelCount = 0;
        let defaultSelected = false;

        data.models.forEach(model => {
            const n = model.name.toLowerCase();
            const dn = (model.displayName || '').toLowerCase();
            if (n.includes('tts') || n.includes('transcribe') || n.includes('banana') || n.includes('imagen')) return;

            if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes('generateContent')) {
                const option = document.createElement('option');
                option.value = model.name;
                option.text = `${model.displayName || model.name} (${model.name.replace('models/', '')})`;

                if (!defaultSelected && (n.includes('2.0-flash') || n.includes('1.5-flash'))) {
                    option.selected = true;
                    defaultSelected = true;
                }
                select.appendChild(option);
                modelCount++;
            }
        });

        if (status) {
            status.innerText = modelCount > 0 ? '読込完了。' : '利用可能なモデルがありません。';
        }
    } catch (error) {
        if (status) status.innerText = '';
        console.warn('モデル取得失敗:', error.message);
    } finally {
        if (btnFetch) btnFetch.disabled = false;
    }
}

// --- Excel/CSV 解析処理 (SheetJS使用・APIキー完全不要) ---
async function processExcelFile(file) {
    if (typeof XLSX === 'undefined') {
        throw new Error('Excel解析ライブラリ(SheetJS)の読込に失敗しました。ネットワーク接続をご確認ください。');
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                let allExtracted = [];

                // 全シート（階別シートなど）を全て走査してデータを統合
                for (let sIdx = 0; sIdx < workbook.SheetNames.length; sIdx++) {
                    const sheetName = workbook.SheetNames[sIdx];
                    const worksheet = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                    if (!rows || rows.length === 0) continue;

                    // ヘッダー判定
                    let headerRowIdx = -1;
                    let colMap = { symbol: -1, floor: -1, item: -1, unitLoad: -1, area: -1, directLoad: -1, subtotal: -1, accumTotal: -1 };

                    for (let i = 0; i < Math.min(rows.length, 30); i++) {
                        const row = rows[i].map(c => String(c).trim().toLowerCase());
                        let matchedCols = 0;

                        row.forEach((cell, idx) => {
                            if (cell.includes('符号') || cell.includes('部材') || cell.includes('壁') || cell.includes('柱') || cell.includes('記号') || cell.includes('symbol')) {
                                if (colMap.symbol === -1) { colMap.symbol = idx; matchedCols++; }
                            } else if (cell.includes('階') || cell.includes('層') || cell.includes('floor') || cell.includes('fl')) {
                                if (colMap.floor === -1) { colMap.floor = idx; matchedCols++; }
                            } else if (cell.includes('項目') || cell.includes('部位') || cell.includes('仕様') || cell.includes('種別') || cell.includes('item')) {
                                if (colMap.item === -1) { colMap.item = idx; matchedCols++; }
                            } else if (cell.includes('単位荷重') || cell.includes('単重') || (cell.includes('荷重') && cell.includes('㎡')) || cell.includes('unitload')) {
                                if (colMap.unitLoad === -1) { colMap.unitLoad = idx; matchedCols++; }
                            } else if (cell.includes('面積') || cell.includes('㎡') || cell.includes('m2') || cell.includes('area') || cell.includes('負担')) {
                                if (colMap.area === -1) { colMap.area = idx; matchedCols++; }
                            } else if (cell === 'po(kn)' || cell === 'po' || (cell.includes('po') && cell.includes('kn'))) {
                                // アーキトレンドの F列: 各部位の算出済み長期軸力 Po(kN)
                                if (colMap.directLoad === -1) { colMap.directLoad = idx; }
                            } else if (cell === 'p(kn)' || cell.includes('小計')) {
                                if (colMap.subtotal === -1) { colMap.subtotal = idx; }
                            } else if (cell.includes('σp') || cell.includes('合計') || cell.includes('累計')) {
                                if (colMap.accumTotal === -1) { colMap.accumTotal = idx; }
                            }
                        });

                        if (matchedCols >= 2) {
                            headerRowIdx = i;
                            break;
                        }
                    }

                    // ヘッダー未検出時はアーキトレンド標準配置（0:符号, 1:階, 2:項目, 3:単位荷重, 4:面積, 5:Po(kN)）
                    if (colMap.item === -1 && colMap.area === -1 && colMap.unitLoad === -1) {
                        colMap = { symbol: 0, floor: 1, item: 2, unitLoad: 3, area: 4, directLoad: 5, subtotal: 6, accumTotal: 7 };
                    }

                    const startRow = (headerRowIdx >= 0) ? headerRowIdx + 1 : 0;
                    let lastSymbol = '';
                    let lastFloor = '';

                    // シート名が階名（例: "2F", "1F", "R" 等）の場合のフォールバック
                    const sheetFloorGuess = sheetName.match(/([0-9]+[fF]|ph|rf?|r階|[0-9]+階)/i) ? sheetName : '';

                    for (let i = startRow; i < rows.length; i++) {
                        const r = rows[i];
                        if (!r || r.length === 0) continue;

                        let symbol = colMap.symbol >= 0 && r[colMap.symbol] !== undefined ? String(r[colMap.symbol]).trim() : '';
                        let floor = colMap.floor >= 0 && r[colMap.floor] !== undefined ? String(r[colMap.floor]).trim() : '';
                        const item = colMap.item >= 0 && r[colMap.item] !== undefined ? String(r[colMap.item]).trim() : '';
                        let unitLoad = colMap.unitLoad >= 0 && r[colMap.unitLoad] !== undefined ? String(r[colMap.unitLoad]).trim() : '';
                        let area = colMap.area >= 0 && r[colMap.area] !== undefined ? String(r[colMap.area]).trim() : '';
                        let directLoad = colMap.directLoad >= 0 && r[colMap.directLoad] !== undefined ? String(r[colMap.directLoad]).trim() : '';

                        // 数値クリーンアップ
                        unitLoad = unitLoad.replace(/[^0-9.-]/g, '');
                        area = area.replace(/[^0-9.-]/g, '');
                        directLoad = directLoad.replace(/[^0-9.-]/g, '');

                        // セル結合（Merged Cells）による符号・階の自動補完
                        if (symbol !== '') {
                            lastSymbol = symbol;
                        } else if (item || unitLoad || area || directLoad) {
                            symbol = lastSymbol;
                        }

                        if (floor !== '') {
                            lastFloor = floor;
                        } else if (item || unitLoad || area || directLoad) {
                            floor = lastFloor || sheetFloorGuess;
                        }

                        // 【最重要】アーキトレンドの直接荷重判定と二重乗算防止
                        // 外壁・妻壁等、面積がなくF列に Po(kN) が直接記載されている場合は、Po(kN) を単位荷重に代入し面積を 1.000 とする
                        const hasArea = area !== '' && parseFloat(area) > 0;
                        const hasDirectPo = directLoad !== '' && parseFloat(directLoad) > 0;

                        if (!hasArea && hasDirectPo) {
                            unitLoad = directLoad;
                            area = '1.000';
                        } else if (hasArea && (!unitLoad || parseFloat(unitLoad) === 0) && hasDirectPo) {
                            // 面積はあるが単位荷重が空でPoがある場合
                            unitLoad = (parseFloat(directLoad) / parseFloat(area)).toFixed(3);
                        }

                        if (symbol || floor || item || unitLoad || area) {
                            // タイトル行や合計・小計等のノイズを除外
                            if (item.includes('合計') || item.includes('小計') || item.includes('算定表') || item.includes('軸力表') || item.includes('長期常時軸力')) continue;
                            // 数値が一切ない行を除外
                            if ((!unitLoad || parseFloat(unitLoad) === 0) && (!area || parseFloat(area) === 0)) continue;
                            allExtracted.push({ symbol, floor, item, unitLoad, area });
                        }
                    }
                }

                if (allExtracted.length === 0) {
                    throw new Error('Excel内に有効なデータ行（符号・項目・面積など）が見つかりませんでした。列構成をご確認ください。');
                }

                resolve(allExtracted);
            } catch (err) {
                reject(new Error('Excel解析エラー: ' + err.message));
            }
        };
        reader.onerror = function(err) {
            reject(new Error('Excelファイルの読込に失敗しました: ' + (err.message || '不明なエラー')));
        };
        reader.readAsArrayBuffer(file);
    });
}

// --- PDF直接テキスト抽出 (PDF.js使用・テキストPDFならAPIキー不要) ---
async function processPdfDirect(file) {
    if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.jsライブラリが読み込まれていません。');
    }

    const arrayBuffer = await file.arrayBuffer();
    const typedarray = new Uint8Array(arrayBuffer);

    let pdf = null;
    try {
        const loadingTask = pdfjsLib.getDocument({
            data: typedarray,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/cmaps/',
            cMapPacked: true
        });
        pdf = await loadingTask.promise;
    } catch (err) {
        // Worker fallback
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
        const fallbackTask = pdfjsLib.getDocument({
            data: typedarray,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/cmaps/',
            cMapPacked: true
        });
        pdf = await fallbackTask.promise;
    }

    let extractedLines = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // 簡易Y座標グルーピングによる行再構築
        const items = textContent.items;
        if (!items || items.length === 0) continue;

        let linesByY = {};
        items.forEach(item => {
            const y = Math.round(item.transform[5]);
            if (!linesByY[y]) linesByY[y] = [];
            linesByY[y].push({ x: item.transform[4], str: item.str.trim() });
        });

        const sortedYs = Object.keys(linesByY).map(Number).sort((a, b) => b - a);
        sortedYs.forEach(y => {
            const lineItems = linesByY[y].sort((a, b) => a.x - b.x);
            const lineStr = lineItems.map(it => it.str).filter(s => s).join(' ');
            if (lineStr) extractedLines.push(lineStr);
        });
    }

    if (extractedLines.length === 0) {
        throw new Error('PDFからテキストを取得できませんでした（画像スキャンPDFの可能性があります）。');
    }

    // 行テキストからデータを抽出
    const extractedRows = [];
    let curSymbol = '';
    let curFloor = '';

    extractedLines.forEach(line => {
        // アーキトレンド等の行パターン例: "W1 2F 屋根一般 0.300 12.50"
        const tokens = line.split(/\s+/);
        if (tokens.length >= 3) {
            // 数値トークン（単位荷重・面積）を探す
            let numTokens = [];
            let textTokens = [];

            tokens.forEach(tok => {
                const cleaned = tok.replace(/,/g, '');
                if (!isNaN(cleaned) && cleaned !== '') {
                    numTokens.push(cleaned);
                } else {
                    textTokens.push(tok);
                }
            });

            if (numTokens.length >= 1) {
                let unitLoad = numTokens.length >= 2 ? numTokens[0] : '';
                let area = numTokens.length >= 2 ? numTokens[1] : numTokens[0];
                let item = textTokens.join(' ');

                // 符号や階の推測
                if (textTokens.length > 0 && /^[A-Za-z0-9_-]+$/.test(textTokens[0])) {
                    curSymbol = textTokens[0];
                    item = textTokens.slice(1).join(' ');
                }

                if (item) {
                    extractedRows.push({
                        symbol: curSymbol,
                        floor: curFloor,
                        item: item,
                        unitLoad: unitLoad,
                        area: area
                    });
                }
            }
        }
    });

    if (extractedRows.length === 0) {
        throw new Error('PDFのテキスト解析でデータ行を特定できませんでした。');
    }

    return extractedRows;
}

// --- PDFをBase64に変換 (Gemini AI用) ---
function readPdfAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const base64 = e.target.result.split(',')[1];
                resolve({ mimeType: 'application/pdf', base64: base64 });
            } catch (err) {
                reject(new Error('PDFのBase64エンコード失敗: ' + err.message));
            }
        };
        reader.onerror = function(err) {
            reject(new Error('PDF読込失敗: ' + (err.message || '不明なエラー')));
        };
        reader.readAsDataURL(file);
    });
}

// --- 画像リサイズ処理 (Promise安全版) ---
function resizeImage(file, maxWidth) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve({
                        mimeType: 'image/jpeg',
                        base64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
                    });
                } catch (err) {
                    reject(new Error('Canvas変換エラー: ' + err.message));
                }
            };
            img.onerror = function() {
                reject(new Error('画像ファイルとして読み込めませんでした。'));
            };
            img.src = e.target.result;
        };
        reader.onerror = function(err) {
            reject(new Error('ファイル読込失敗: ' + (err.message || '不明なエラー')));
        };
        reader.readAsDataURL(file);
    });
}

// --- 【統合ディスパッチャー】ファイル読込実行 ---
async function processImage() {
    const fileInput = document.getElementById('imageInput');
    const status = document.getElementById('statusMessage');
    const btnProcess = document.getElementById('btn-process');

    if (!fileInput.files || !fileInput.files.length) {
        alert('読み込むファイル（Excel / PDF / 画像）を選択してください。');
        return;
    }

    const file = fileInput.files[0];
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv');
    const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/') || fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp');

    if (btnProcess) btnProcess.disabled = true;

    try {
        // ==========================================
        // 1. Excel / CSV の場合（APIキー不要・直接解析）
        // ==========================================
        if (isExcel) {
            status.style.color = '#2563eb';
            status.innerText = `Excel「${file.name}」を直接読込中...`;

            const rows = await processExcelFile(file);
            cleanInitialEmptyRow();

            rows.forEach(r => {
                addRawRow(r.symbol, r.floor, r.item, r.unitLoad, r.area);
            });

            status.style.color = '#10b981';
            status.innerText = `✅ Excelから ${rows.length} 件のデータを追記しました（APIキー不要）。`;
            return;
        }

        // ==========================================
        // 2. PDF の場合（まず直接テキスト抽出を試行、ダメならGemini）
        // ==========================================
        if (isPdf) {
            status.style.color = '#2563eb';
            status.innerText = `PDF「${file.name}」を解析中...`;

            try {
                // まずPDF.jsで直接テキスト抽出を試みる（APIキー不要）
                const directRows = await processPdfDirect(file);
                cleanInitialEmptyRow();
                directRows.forEach(r => {
                    addRawRow(r.symbol, r.floor, r.item, r.unitLoad, r.area);
                });
                status.style.color = '#10b981';
                status.innerText = `✅ PDFから ${directRows.length} 件のデータを直接抽出しました。`;
                return;
            } catch (directErr) {
                console.log('PDF直接テキスト抽出不可、Gemini AIマルチモーダルへ移行:', directErr.message);
                // Gemini APIへフォールバック
            }
        }

        // ==========================================
        // 3. 画像 または スキャンPDF の場合（Gemini AI解析）
        // ==========================================
        const keyInput = document.getElementById('apiKey');
        const apiKey = keyInput ? keyInput.value.trim() : '';
        let modelName = document.getElementById('modelSelect') ? document.getElementById('modelSelect').value : '';

        if (!apiKey) {
            throw new Error(`画像またはスキャンPDFの読取には Google Gemini APIキー が必要です。\n画面内の「⚙️ Google Gemini API設定」を開き、APIキーを入力してください。\n※Excel（.xlsx / .xls / .csv）はAPIキー不要で即座に読み込めます。`);
        }

        if (!modelName) modelName = 'models/gemini-2.0-flash';
        if (!modelName.startsWith('models/')) modelName = 'models/' + modelName;

        const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;

        let inlinePayload = null;
        if (isPdf) {
            status.style.color = '#2563eb';
            status.innerText = `Gemini AIがPDF「${file.name}」を高精度解析中...`;
            inlinePayload = await readPdfAsBase64(file);
        } else if (isImage) {
            status.style.color = '#2563eb';
            status.innerText = `Gemini AIが画像「${file.name}」を解析中...`;
            inlinePayload = await resizeImage(file, 1600);
        } else {
            throw new Error(`未対応のファイル形式です: ${file.name}`);
        }

        const promptText = `
提供された資料は建築構造計算書（アーキトレンドZERO等の出力）または長期常時軸力・荷重拾い算定表です。
資料内の表から各行のデータを正確に抽出し、以下のキーを持つJSON配列（Array）として出力してください。
Markdownコードブロックは含めず、純粋なJSON文字列のみを出力してください。

【厳格な抽出・換算ルール】
1. アーキトレンド等の軸力表では、外壁・妻壁などの行は「面積」がなく、直接「Po(kN)」列に算出荷重が記載されています。この場合、"unitLoad" にその「Po(kN)」の数値を格納し、"area" には必ず "1.000" をセットしてください。決して「Po(kN)」の数値をareaに入れて二重乗算しないでください。
2. 屋根や床のように「単位荷重(kN/㎡)」と「面積(㎡)」の両方が存在する行は、それぞれの数値をそのまま "unitLoad" と "area" に格納してください。
3. 符号（例: "X1Y1", "X1Y2"）や階（例: "PH", "3", "2"）が縦にセル結合・省略されている行は、直前の行の符号・階を引き継いで必ず補完してください。「階」列の数字（3や2など）をunitLoadに誤認識してはいけません。
4. 各階の小計行「P(kN)」や最下階累加行「ΣP(kN)」は二重計上となるため除外してください。

JSONキー仕様:
- "symbol": 符号（例: "X1Y1", "X1Y2" など）。
- "floor": 階（例: "PH", "3", "2", "1" など）。
- "item": 項目・部位名称（例: "屋根一般", "屋根軒先", "外壁", "床" など）。
- "unitLoad": 単位荷重の数値（外壁など面積なし行は直接Po(kN)の数値）。
- "area": 面積の数値（外壁など面積なし行は "1.000"）。
`;

        const requestBody = {
            contents: [{
                parts: [
                    { text: promptText },
                    { inlineData: { mimeType: inlinePayload.mimeType, data: inlinePayload.base64 } }
                ]
            }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
        };

        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Gemini APIエラー (HTTP ${response.status}): ${errBody.slice(0, 150)}`);
        }

        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
            throw new Error('Gemini APIから応答が得られませんでした。');
        }

        let jsonText = data.candidates[0].content.parts[0].text;
        jsonText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const extractedData = JSON.parse(jsonText);

        if (!Array.isArray(extractedData)) {
            throw new Error('抽出されたデータが配列形式ではありませんでした。');
        }

        cleanInitialEmptyRow();

        extractedData.forEach(row => {
            addRawRow(row.symbol || '', row.floor || '', row.item || '', row.unitLoad || '', row.area || '');
        });

        status.style.color = '#10b981';
        status.innerText = `✅ AI解析完了！ ${extractedData.length} 件のデータを生データに追記しました。`;

    } catch (error) {
        status.style.color = '#ef4444';
        const errorMsg = (error && error.message) ? error.message : String(error);
        status.innerText = '解析エラーが発生しました。';
        console.error('WRC抽出エラー詳細:', error);
        alert(`読込失敗:\n${errorMsg}`);
    } finally {
        if (btnProcess) btnProcess.disabled = false;
    }
}

// --- 初期空行のクリーンアップ ---
function cleanInitialEmptyRow() {
    const tbody = document.getElementById('rawTableBody');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    if (rows.length === 1) {
        const tr = rows[0];
        const sym = tr.querySelector('.r_symbol')?.value.trim() || '';
        const flr = tr.querySelector('.r_floor')?.value.trim() || '';
        const itm = tr.querySelector('.r_item')?.value.trim() || '';
        const ul = tr.querySelector('.r_unitLoad')?.value.trim() || '';
        const ar = tr.querySelector('.r_area')?.value.trim() || '';
        if (!sym && !flr && !itm && !ul && !ar) {
            tr.remove();
        }
    }
}

// --- UIの行追加関数 ---
function addMasterRow() {
    const tbody = document.getElementById('masterBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="wrc-cell-input m_kw" value=""></td>
        <td><input type="number" class="wrc-cell-input m_ll" value="0.000" step="0.001"></td>
        <td><input type="number" class="wrc-cell-input m_eq" value="0.000" step="0.001"></td>
        <td><button class="btn btn-secondary" style="padding:3px 8px; font-size:0.75rem;" onclick="this.closest('tr').remove()">削除</button></td>
    `;
    tbody.appendChild(tr);
}

function addRawRow(symbol = '', floor = '', item = '', unitLoad = '', area = '') {
    const tbody = document.getElementById('rawTableBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="wrc-cell-input r_symbol" value="${symbol}"></td>
        <td><input type="text" class="wrc-cell-input r_floor" value="${floor}"></td>
        <td><input type="text" class="wrc-cell-input r_item" value="${item}"></td>
        <td><input type="number" class="wrc-cell-input r_unitLoad" value="${unitLoad}" step="0.001"></td>
        <td><input type="number" class="wrc-cell-input r_area" value="${area}" step="0.001"></td>
        <td><button class="btn btn-secondary" style="padding:3px 8px; font-size:0.75rem;" onclick="this.closest('tr').remove()">削除</button></td>
    `;
    tbody.appendChild(tr);
}

// --- 【メインロジック】集計・グループ化実行 ---
function runAggregation() {
    const rawRows = document.querySelectorAll('#rawTableBody tr');
    if (rawRows.length === 0) {
        alert('集計する生データがありません。');
        return;
    }

    const resultBody = document.getElementById('resultTableBody');
    resultBody.innerHTML = '';

    copyMasterToPDF();

    let currentSymbol = '';
    let currentFloor = '';
    let activeSymbol = '';
    let activeFloor = '';

    let floorSubtotals = { dl: 0, ll: 0, eq: 0 };
    let symbolTotals = { dl: 0, ll: 0, eq: 0 };
    let isFirst = true;

    rawRows.forEach(tr => {
        const sym = tr.querySelector('.r_symbol').value.trim();
        const flr = tr.querySelector('.r_floor').value.trim();
        const item = tr.querySelector('.r_item').value.trim();
        const unitLoad = parseFloat(tr.querySelector('.r_unitLoad').value) || 0;
        const area = parseFloat(tr.querySelector('.r_area').value) || 0;

        if (sym !== '') activeSymbol = sym;
        if (flr !== '') activeFloor = flr;

        if (!isFirst) {
            if (activeSymbol !== currentSymbol || activeFloor !== currentFloor) {
                addResultSubtotal(currentFloor + ' 小計', floorSubtotals, '#f1f5f9');
                floorSubtotals = { dl: 0, ll: 0, eq: 0 };
            }
            if (activeSymbol !== currentSymbol) {
                addResultSubtotal('【' + currentSymbol + '】最下階 基礎荷重合計', symbolTotals, '#fef3c7');
                symbolTotals = { dl: 0, ll: 0, eq: 0 };
            }
        }

        isFirst = false;
        currentSymbol = activeSymbol;
        currentFloor = activeFloor;

        const { dl_po, ll_po, eq_po } = calculatePo(item, unitLoad, area);
        addResultRow(activeSymbol, activeFloor, item, unitLoad, area, dl_po, ll_po, eq_po);

        floorSubtotals.dl += dl_po;
        floorSubtotals.ll += ll_po;
        floorSubtotals.eq += eq_po;
        symbolTotals.dl += dl_po;
        symbolTotals.ll += ll_po;
        symbolTotals.eq += eq_po;
    });

    if (!isFirst) {
        addResultSubtotal(currentFloor + ' 小計', floorSubtotals, '#f1f5f9');
        addResultSubtotal('【' + currentSymbol + '】最下階 基礎荷重合計', symbolTotals, '#fef3c7');
    }

    const wrapper = document.getElementById('pdf-wrapper');
    wrapper.style.display = 'block';
    wrapper.scrollIntoView({ behavior: 'smooth' });
}

function calculatePo(item, unitLoad, area) {
    const masterRows = document.querySelectorAll('#masterTable tbody tr');
    let ll = 0;
    let eq = 0;

    for (let tr of masterRows) {
        let kw = tr.querySelector('.m_kw').value.trim();
        let m_ll = parseFloat(tr.querySelector('.m_ll').value) || 0;
        let m_eq = parseFloat(tr.querySelector('.m_eq').value) || 0;

        if (kw !== '' && item.includes(kw)) {
            ll = m_ll;
            eq = m_eq;
            break;
        }
    }

    let dl_unit = unitLoad > 0 ? (unitLoad - ll) : 0;
    if (dl_unit < 0) dl_unit = 0;

    return {
        dl_po: dl_unit * area,
        ll_po: ll * area,
        eq_po: eq * area
    };
}

function copyMasterToPDF() {
    const pdfMasterBody = document.getElementById('pdfMasterBody');
    if (!pdfMasterBody) return;
    pdfMasterBody.innerHTML = '';
    document.querySelectorAll('#masterTable tbody tr').forEach(tr => {
        let kw = tr.querySelector('.m_kw').value.trim();
        let ll = tr.querySelector('.m_ll').value;
        let eq = tr.querySelector('.m_eq').value;
        if (kw) {
            const newTr = document.createElement('tr');
            newTr.innerHTML = `<td style="text-align:left; padding-left:12px;">${kw}</td><td>${ll}</td><td>${eq}</td>`;
            pdfMasterBody.appendChild(newTr);
        }
    });
}

function addResultRow(symbol, floor, item, unitLoad, area, dl, ll, eq) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="font-weight:600;">${symbol}</td>
        <td>${floor}</td>
        <td style="text-align:left; padding-left:10px;">${item}</td>
        <td>${unitLoad === 0 ? '' : unitLoad.toFixed(3)}</td>
        <td>${area === 0 ? '' : area.toFixed(3)}</td>
        <td>${dl.toFixed(3)}</td>
        <td>${ll.toFixed(3)}</td>
        <td>${eq.toFixed(3)}</td>
    `;
    document.getElementById('resultTableBody').appendChild(tr);
}

function addResultSubtotal(label, totals, bgColor) {
    const tr = document.createElement('tr');
    tr.style.backgroundColor = bgColor;
    tr.style.fontWeight = 'bold';
    tr.innerHTML = `
        <td colspan="5" style="text-align:right; padding-right:15px;">${label}</td>
        <td>${totals.dl.toFixed(3)}</td>
        <td>${totals.ll.toFixed(3)}</td>
        <td>${totals.eq.toFixed(3)}</td>
    `;
    document.getElementById('resultTableBody').appendChild(tr);
}

function downloadPDF() {
    if (typeof GlobalInfo !== 'undefined' && GlobalInfo.updatePrintHeader) {
        GlobalInfo.updatePrintHeader();
    }
    window.print();
}
