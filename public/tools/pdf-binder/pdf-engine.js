/**
 * pdf-engine.js
 * ARCHITREND ZERO 構造計算書 解析・A3自動差替・NG自動検出・軽量結合エンジン
 * - PDF.js: テキスト・座標抽出、プレビュー描画
 * - pdf-lib + fontkit: 無劣化コピー(copyPages)、サブセット日本語フォント埋め込み
 */
window.PdfBinderEngine = (function () {
  'use strict';

  // PDF.js Worker & CMap 設定（日本語PDFテキストの正確な抽出に必須）
  const PDFJS_BASE = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174';
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/build/pdf.worker.min.js`;
  }

  let cachedFontRegular = null;
  let cachedFontBold = null;

  /**
   * 日本語TTF/OTFフォントをCDNから取得（ブラウザメモリキャッシュ）
   */
  async function loadJapaneseFonts(onProgress) {
    if (cachedFontRegular && cachedFontBold) {
      return { regular: cachedFontRegular, bold: cachedFontBold };
    }
    const regularUrls = [
      'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/SubsetOTF/JP/NotoSansJP-Regular.otf',
      'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.1/files/noto-sans-jp-japanese-400-normal.woff',
      'https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.ttf',
    ];
    const boldUrls = [
      'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/SubsetOTF/JP/NotoSansJP-Bold.otf',
      'https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFE8k75s.ttf',
    ];

    async function fetchFirstAvailable(urls, label) {
      for (const url of urls) {
        try {
          if (onProgress) onProgress(`日本語フォント読込中 (${label})...`);
          const res = await fetch(url);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            if (buf.byteLength > 100000) return buf;
          }
        } catch (e) {
          console.warn('Font fetch fallback:', url, e);
        }
      }
      throw new Error(`日本語フォント(${label})の取得に失敗しました。ネットワーク接続をご確認ください。`);
    }

    if (!cachedFontRegular) {
      cachedFontRegular = await fetchFirstAvailable(regularUrls, '標準');
    }
    if (!cachedFontBold) {
      try {
        cachedFontBold = await fetchFirstAvailable(boldUrls, '太字');
      } catch (e) {
        cachedFontBold = cachedFontRegular;
      }
    }
    return { regular: cachedFontRegular, bold: cachedFontBold };
  }

  /**
   * PDF.js ドキュメントを開く共通ヘルパー
   */
  async function openPdfJs(uint8Array) {
    const copy = new Uint8Array(uint8Array); // PDF.jsがバッファをdetachするためコピー
    return await window.pdfjsLib.getDocument({
      data: copy,
      cMapUrl: `${PDFJS_BASE}/cmaps/`,
      cMapPacked: true,
    }).promise;
  }

  /**
   * ページ内のテキストアイテムを行単位に整理して取得
   */
  async function extractPageLines(pdfJsDoc, pageNum) {
    const page = await pdfJsDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const content = await page.getTextContent();
    const items = content.items
      .filter((it) => it.str && it.str.trim() !== '')
      .map((it) => {
        const tx = it.transform;
        return {
          str: it.str,
          x: tx[4],
          y: tx[5], // PDF左下原点座標
          width: it.width || 0,
          height: Math.abs(tx[3]) || 10,
        };
      });

    // Y降順（上から下）、同じ行(Y差4pt以内)はX昇順
    items.sort((a, b) => {
      if (Math.abs(a.y - b.y) <= 4.0) return a.x - b.x;
      return b.y - a.y;
    });

    const lines = [];
    for (const it of items) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.y - it.y) <= 4.0) {
        last.text += (last.text ? ' ' : '') + it.str.trim();
        last.items.push(it);
      } else {
        lines.push({ y: it.y, x: it.x, text: it.str.trim(), items: [it] });
      }
    }
    return { lines, items, width: viewport.width, height: viewport.height };
  }

  /**
   * ページの章別ページ番号（例: "3-1", "4-257", "5-111", "6-198", "7-1"）を抽出
   * ※ ARCHITREND ZERO はページ最下部フッター（ARCHITREND ZERO 同一行付近）に印字されるため、
   *    フッター（末尾行）を最優先で検索し、次にヘッダー（先頭行）を検索する。
   */
  function detectChapterPageNo(lines) {
    if (!lines || lines.length === 0) return null;
    const regex = /(?:^|[\s\u3000])([1-9][0-9]?\s*[-－ー]\s*[1-9][0-9]{0,3})(?:$|[\s\u3000])/;
    const normalize = (s) =>
      s
        .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
        .replace(/[－ー]/g, '-')
        .replace(/\s+/g, '');

    // 1. 最優先: ARCHITREND ZERO のフッター行および最下部5行
    const bottomLines = lines.slice(-6).reverse();
    for (const ln of bottomLines) {
      if (ln.text.includes('ARCHITREND')) {
        const m = ln.text.match(regex);
        if (m) return normalize(m[1]);
      }
    }
    for (const ln of bottomLines) {
      const m = ln.text.match(regex);
      if (m) return normalize(m[1]);
    }

    // 2. フォールバック: 最上部6行（ヘッダー配置のバージョン・別書式対応）
    const topLines = lines.slice(0, 6);
    for (const ln of topLines) {
      const m = ln.text.match(regex);
      if (m) return normalize(m[1]);
    }
    return null;
  }

  /**
   * アーキトレンド本体 (A4全) の総合解析
   * - 建物概要（新表紙用データ）抽出
   * - 章別ページ番号マップ構築
   * - 目次および本文のNG箇所自動検出
   */
  async function analyzeArchitrendA4(uint8Array, onProgress) {
    const pdfJsDoc = await openPdfJs(uint8Array);
    const totalPages = pdfJsDoc.numPages;

    // 1. P.1〜P.4 から表紙データを抽出
    const coverData = {
      subtitle: '〔 許容応力度計算（ルート1） 〕',
      projectName: '',
      address: '',
      usage: '',
      structure: '',
      area: '',
      foundation: '直接基礎（べた基礎）',
      date: '',
      officeReg: '',
      officeName: '',
      designerReg: '',
      designerName: '',
      program: '使用プログラム：ARCHITREND ZERO Ver12 木造構造計算',
      docNo: 'Document No. 01',
    };

    const p1 = totalPages >= 1 ? await extractPageLines(pdfJsDoc, 1) : { lines: [] };
    const p2 = totalPages >= 2 ? await extractPageLines(pdfJsDoc, 2) : { lines: [] };
    const p3 = totalPages >= 3 ? await extractPageLines(pdfJsDoc, 3) : { lines: [] };
    const p4 = totalPages >= 4 ? await extractPageLines(pdfJsDoc, 4) : { lines: [] };

    const p1Text = p1.lines.map((l) => l.text).join('\n');
    const p3Text = p3.lines.map((l) => l.text).join('\n');
    const p4Text = p4.lines.map((l) => l.text).join('\n');

    // プログラム名
    const progMatch = p1Text.match(/ARCHITREND\s+ZERO[^\n]*/i);
    if (progMatch) coverData.program = `使用プログラム：${progMatch[0].trim()}`;

    // 作成年月
    const dateMatch = p1Text.match(/(20\d{2}\s*年\s*\d{1,2}\s*月)/);
    if (dateMatch) coverData.date = `${dateMatch[1].replace(/\s+/g, ' ')} 作成`;

    // 建物概要(P.3)から物件名・建設場所・用途・規模・面積・基礎形式を抽出
    const getAfterLabel = (lines, label) => {
      for (const ln of lines) {
        const idx = ln.text.indexOf(label);
        if (idx !== -1) {
          const rest = ln.text.slice(idx + label.length).trim();
          if (rest) return rest;
        }
      }
      return '';
    };

    coverData.projectName = getAfterLabel(p3.lines, '物件名') || '';
    coverData.address = getAfterLabel(p3.lines, '建設場所') || '';
    coverData.usage = getAfterLabel(p3.lines, '用途') || '';

    const kibo = getAfterLabel(p3.lines, '規模');
    if (kibo) {
      const floorM = kibo.match(/([0-9０-９])\s*階/);
      const floorNum = floorM
        ? floorM[1].replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
        : '2';
      coverData.structure = `木造軸組工法　地上 ${floorNum} 階建て`;
    }

    // 1階・2階・3階・合計床面積の抽出
    const floorAreas = [];
    let totalArea = '';
    for (const ln of p3.lines) {
      const mFloor = ln.text.match(/^([1-3１-３])階\s+木造.*?\s(\d+\.\d{1,2})$/);
      if (mFloor) {
        const f = mFloor[1].replace(/[１-３]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
        floorAreas.push({ floor: Number(f), area: mFloor[2] });
      }
      const mTotal = ln.text.match(/^合計\s+(\d+\.\d{1,2})$/);
      if (mTotal) totalArea = mTotal[1];
    }
    if (totalArea) {
      floorAreas.sort((a, b) => a.floor - b.floor);
      const breakdown = floorAreas.map((f) => `${f.floor}階 ${f.area} ㎡`).join(' ／ ');
      coverData.area = breakdown ? `${totalArea} ㎡（${breakdown}）` : `${totalArea} ㎡`;
    }

    // 地業（基礎形式）
    if (p3Text.includes('べた基礎') || p3Text.includes('ベタ基礎')) {
      coverData.foundation = '直接基礎（べた基礎）';
    } else if (p3Text.includes('布基礎')) {
      coverData.foundation = '直接基礎（布基礎）';
    }

    // 計算ルート表記（P.4 設計方針から判定）
    if (p4Text.includes('ルート1') || p4Text.includes('許容応力度計算')) {
      coverData.subtitle = '〔 許容応力度計算（ルート1） 〕';
    }

    // P.1から設計事務所・設計者（行構成ベース）
    for (let i = 0; i < p1.lines.length; i++) {
      const t = p1.lines[i].text;
      if (t.includes('一級建築士') || t.includes('二級建築士')) {
        const mDes = t.match(/((?:一級|二級)建築士\s*(?:大臣|国土交通大臣|[^\s]+知事)?\s*第[\d]+号)\s*(.*)/);
        if (mDes) {
          coverData.designerReg = mDes[1].trim();
          if (mDes[2]) coverData.designerName = mDes[2].trim();
        }
      }
      if (t.includes('設計事務所') && !t.includes('物件名')) {
        // 同じ行か次行に事務所名がある場合
        const rest = t.replace('設計事務所', '').trim();
        if (rest) coverData.officeName = rest;
      }
    }
    // P.1で「中央設計」のように独立行で書かれているケースを補完
    if (!coverData.officeName) {
      const cand = p1.lines.find((l) => /(設計|建築|工務店|事務所)$/.test(l.text) && !l.text.includes('物件') && !l.text.includes('設計事務所'));
      if (cand) coverData.officeName = cand.text;
    }

    // 2. 目次(P.2)のNG検出（部分結合テキストにも対応するよう正規表現で統一）
    const ngEntries = [];
    let ngIdSeq = 1;
    let tocNgIndex = 0;
    for (const ln of p2.lines) {
      const ngItem = ln.items.find((it) => /\bNG\b/.test(it.str.trim()) || it.str.trim() === 'NG');
      if (ngItem) {
        const cleanTitle = ln.text.replace(/\bNG\b/g, '').replace(/[・\.]+/g, ' ').trim();
        // NG文字に絶対に被らないよう、初期配置は「NGの右横」または「下部余白」に設定
        // （幅が狭い場合は下部余白に自動整列し、ユーザーがドラッグまたはボタンで自在に移動可能）
        const rightX = ngItem.x + Math.max(ngItem.width, 16) + 6;
        const hasRightSpace = rightX <= p2.width - 95;
        ngEntries.push({
          id: `ng_${ngIdSeq++}`,
          type: 'toc',
          a4Page: 2,
          chapNo: '目次',
          label: cleanTitle || '目次 NG項目',
          note: '',
          x: hasRightSpace ? Math.round(rightX) : 60,
          y: hasRightSpace ? Math.round(ngItem.y) : Math.max(46, 92 - tocNgIndex * 14),
          ngOriginX: Math.round(ngItem.x + Math.max(ngItem.width, 16) + 6),
          ngOriginY: Math.round(ngItem.y),
          pageWidth: p2.width,
          pageHeight: p2.height,
          fontSize: hasRightSpace ? 8.0 : 9.0,
          enabled: true,
        });
        tocNgIndex++;
      }
    }

    // 3. 全ページスキャン（章別ページ番号マップ & 本文NG検出）
    const chapterMap = new Map(); // "3-1" -> { a4Page, title }
    for (let pNum = 1; pNum <= totalPages; pNum++) {
      if (onProgress && (pNum % 40 === 0 || pNum === totalPages)) {
        onProgress(`A4本体解析中... (${pNum} / ${totalPages}頁)`);
      }
      const info = pNum === 1 ? p1 : pNum === 2 ? p2 : pNum === 3 ? p3 : pNum === 4 ? p4 : await extractPageLines(pdfJsDoc, pNum);
      const chapNo = detectChapterPageNo(info.lines);
      if (chapNo && !chapterMap.has(chapNo)) {
        const titleCand = info.lines
          .slice(0, 5)
          .map((l) => l.text)
          .filter((t) => t !== chapNo && !t.includes('ARCHITREND ZERO'))
          .join(' / ');
        chapterMap.set(chapNo, { a4Page: pNum, title: titleCand.slice(0, 50) });
      }

      // 本文のNG検出（P.3以降、チェックリスト1-3は除外）
      // ※図表・NG文字に被らないよう、初期配置はページ上部余白（x=48, y=height-38）に配置
      if (pNum >= 3) {
        const ngItem = info.items.find((it) => /\bNG\b/.test(it.str.trim()) || it.str.trim() === 'NG');
        if (ngItem && chapNo !== '1-3') {
          const titleLine = info.lines
            .slice(0, 5)
            .map((l) => l.text)
            .filter((t) => t !== chapNo && !t.includes('ARCHITREND ZERO'))
            .join(' ');
          ngEntries.push({
            id: `ng_${ngIdSeq++}`,
            type: 'body',
            a4Page: pNum,
            chapNo: chapNo || `P.${pNum}`,
            label: titleLine.slice(0, 42) || `本文 P.${pNum}`,
            note: '',
            x: 48,
            y: Math.round(info.height - 38),
            ngOriginX: Math.round(ngItem.x + Math.max(ngItem.width, 16) + 6),
            ngOriginY: Math.round(ngItem.y),
            pageWidth: info.width,
            pageHeight: info.height,
            fontSize: 9.5,
            enabled: true,
          });
        }
      }
    }

    return {
      pdfJsDoc,
      totalPages,
      coverData,
      chapterMap,
      ngEntries,
    };
  }

  /**
   * A3図面PDFの各ページを解析し、A4本体の章別ページ番号と照合する
   */
  async function matchA3ToA4(a3Uint8Array, a4ChapterMap, onProgress) {
    const a3JsDoc = await openPdfJs(a3Uint8Array);
    try {
      const totalA3 = a3JsDoc.numPages;
      const matches = [];

      for (let i = 1; i <= totalA3; i++) {
        if (onProgress && (i % 10 === 0 || i === totalA3)) {
          onProgress(`A3図面照合中... (${i} / ${totalA3}枚)`);
        }
        const info = await extractPageLines(a3JsDoc, i);
        const chapNo = detectChapterPageNo(info.lines);
        const target = chapNo ? a4ChapterMap.get(chapNo) : null;
        const titleLine = info.lines
          .slice(0, 5)
          .map((l) => l.text)
          .filter((t) => t !== chapNo && !t.includes('ARCHITREND ZERO'))
          .join(' / ');

        matches.push({
          a3Page: i,
          chapNo: chapNo || '(未検出)',
          a4Page: target ? target.a4Page : null,
          title: titleLine.slice(0, 48) || (target ? target.title : ''),
          matched: Boolean(target),
        });
      }
      return { totalA3, matches };
    } finally {
      await a3JsDoc.destroy();
    }
  }

  /**
   * 添付PDFの1ページ目を解析し、以下を自動抽出・判定する:
   * - 総ページ数
   * - 公的表題（認定書、接合部性能試験報告書、接合部性能試験成績証、性能証明書 等）の自動抽出
   * - アーキトレンド「別紙計算書」中表紙の有無 (hasBesshiCover)
   * - P.1のみA3でP.2以降A4の杭伏図混入パターン検知 (defaultRange)
   */
  async function inspectAttachmentPdf(uint8Array, fileName) {
    const jsDoc = await openPdfJs(uint8Array);
    try {
      const totalPages = jsDoc.numPages;
      const cleanName = fileName.replace(/\.pdf$/i, '');

      // 1ページ目テキスト解析
      const p1Info = await extractPageLines(jsDoc, 1);
      const p1Lines = p1Info.lines.map((l) => l.text);
      const p1AllText = p1Lines.join(' ');
      const isScannedImage = p1AllText.replace(/\s+/g, '').length < 8;

      // 「別紙計算書」中表紙判定（アーキトレンド出力の耐風梁・不整形スラブ・基礎隅部等）
      const hasBesshiCover =
        p1Lines.some((t) => /^別\s*紙\s*計\s*算\s*書/.test(t.trim())) ||
        (p1AllText.includes('別紙計算書') && p1AllText.includes('物件名'));

      // 公的表題キーワード抽出（大臣認定・耐力壁・制振/制震施工マニュアル・認定書・試験成績証・性能証明書 等）
      const docTypePatterns = [
        /国土交通大臣認定書/,
        /大臣認定[^\s　]{0,16}/,
        /耐力壁[^\s　]{0,16}(?:認定書|マニュアル|仕様書)/,
        /(?:制振|制震)[^\s　]{0,18}(?:マニュアル|仕様書|認定書|評定書)/,
        /設計[・／/]?施工マニュアル/,
        /施工マニュアル/,
        /接合部性能試験報告書/,
        /接合部性能試験成績証書?/,
        /接合部金物試験証明書/,
        /性能評価書/,
        /構造評定書/,
        /性能認定書/,
        /性能証明書/,
        /試験成績証書?/,
        /認定書/,
        /耐風性能[^\s　]{0,10}/,
        /めり込み耐力(?:計算書|検討書)/,
        /人通口補強計算書/,
        /大引の構造計算書/,
        /地盤調査報告書/,
        /湿式柱状改良工法支持力計算書/,
        /地盤改良[^\s　]{0,12}計算書/,
      ];

      let detectedDocType = '';
      if (!isScannedImage) {
        // 1) 公的表題キーワードにマッチするフレーズを抽出
        for (const pat of docTypePatterns) {
          const m = p1AllText.match(pat);
          if (m) {
            detectedDocType = m[0].trim();
            break;
          }
        }
        // 2) マッチしなかった場合、1頁目の最大フォントサイズ見出し行（日本語を含む意味のある行）を抽出
        if (!detectedDocType && p1Info.lines.length > 0 && !hasBesshiCover) {
          const scored = p1Info.lines
            .map((ln) => {
              const maxH = Math.max(...ln.items.map((it) => it.height || 10));
              const txt = ln.text.replace(/\s+/g, ' ').trim();
              return { txt, maxH };
            })
            .filter(
              (x) =>
                x.txt.length >= 4 &&
                x.txt.length <= 42 &&
                /[一-龥ぁ-んァ-ヶ]/.test(x.txt) &&
                !/^(株式会社|有限会社|工事名称|物件名|建設場所|20\d{2}|令和|平成|ページ|Page)/i.test(x.txt)
            )
            .sort((a, b) => b.maxH - a.maxH);
          if (scored.length > 0 && scored[0].maxH >= 12) {
            detectedDocType = scored[0].txt;
          }
        }
      }

      // 認定番号（FRM-xxxx, MCON-xxxx, HPxx-KTxxx 等）の抽出
      const certNoMatch = !isScannedImage
        ? p1AllText.match(/\b((?:FRM|MCON|MSTR|HP\d{2}-KT|T-?\d{2})[-A-Z0-9]{3,14})\b/i)
        : null;

      // テキストが空（スキャン画像PDF）の場合もファイル名から公的表題を補完
      if (!detectedDocType) {
        if (/ｽﾓｰﾙ|スモール/.test(cleanName)) detectedDocType = '接合部性能試験成績証';
        else if (/リトル|ﾘﾄﾙ/.test(cleanName)) detectedDocType = '性能認定書/接合部性能試験成績証';
        else if (/シナー|ｼﾅｰ/.test(cleanName)) detectedDocType = '接合部金物試験証明書/接合部性能試験成績証書';
        else if (/ホールダウン|ﾎｰﾙﾀﾞｳﾝ|羽子板|金物/.test(cleanName)) detectedDocType = '接合部金物性能認定書';
        else if (/大臣認定/.test(cleanName)) detectedDocType = '国土交通大臣認定書';
        else if (/制振|制震|ダンパー/.test(cleanName)) detectedDocType = '制振装置 設計・施工マニュアル';
        else if (/耐力壁/.test(cleanName)) detectedDocType = '耐力壁 大臣認定書・施工マニュアル';
        else if (/施工マニュアル|マニュアル/.test(cleanName)) detectedDocType = '施工マニュアル';
        else if (/鋼板.*屋根|立平/.test(cleanName)) detectedDocType = '鋼板葺き屋根耐風性能';
        else if (/土台プレート/.test(cleanName)) detectedDocType = '土台プレートⅡめり込み耐力計算書';
      }

      let suggestedTitle = cleanName;
      if (detectedDocType && !cleanName.includes(detectedDocType)) {
        if (
          detectedDocType === '鋼板葺き屋根耐風性能' ||
          detectedDocType === '土台プレートⅡめり込み耐力計算書' ||
          detectedDocType.length >= 18
        ) {
          suggestedTitle = detectedDocType;
        } else {
          suggestedTitle = `${detectedDocType}ー${cleanName}`;
        }
      }
      if (certNoMatch && !suggestedTitle.includes(certNoMatch[1])) {
        suggestedTitle = `${suggestedTitle}（${certNoMatch[1]}）`;
      }

      // P.1のみA3でP.2以降A4（地盤改良工事計算書の杭伏図混入）を検知
      let defaultRange = '';
      let noteHint = isScannedImage ? '画像PDF(自動推測)' : 'PDF表題抽出済';
      if (totalPages >= 2) {
        const p1 = await jsDoc.getPage(1);
        const p2 = await jsDoc.getPage(2);
        const vp1 = p1.getViewport({ scale: 1 });
        const vp2 = p2.getViewport({ scale: 1 });
        if (Math.max(vp1.width, vp1.height) > 1000 && Math.max(vp2.width, vp2.height) < 950) {
          defaultRange = `2-${totalPages}`;
          noteHint = '※P.1(A3)自動除外提案';
        }
      }

      return {
        totalPages,
        suggestedTitle,
        hasBesshiCover,
        isScannedImage,
        defaultRange,
        noteHint,
      };
    } finally {
      await jsDoc.destroy();
    }
  }

  /**
   * ページ範囲文字列 ("2-7", "1-19, 22", "") を 1-based ページ番号配列に変換
   */
  function parsePageRange(rangeStr, maxPages) {
    const cleaned = (rangeStr || '').trim();
    if (!cleaned || cleaned.toLowerCase() === 'all') {
      return Array.from({ length: maxPages }, (_, idx) => idx + 1);
    }
    const result = [];
    const seen = new Set();
    const parts = cleaned.split(/[,、\s]+/);
    for (const part of parts) {
      if (!part) continue;
      const mRange = part.match(/^(\d+)\s*[-〜~]\s*(\d+)$/);
      if (mRange) {
        let s = Math.max(1, parseInt(mRange[1], 10));
        let e = Math.min(maxPages, parseInt(mRange[2], 10));
        if (s > e) [s, e] = [e, s];
        for (let p = s; p <= e; p++) {
          if (!seen.has(p)) {
            seen.add(p);
            result.push(p);
          }
        }
      } else if (/^\d+$/.test(part)) {
        const p = parseInt(part, 10);
        if (p >= 1 && p <= maxPages && !seen.has(p)) {
          seen.add(p);
          result.push(p);
        }
      }
    }
    return result.length > 0 ? result : Array.from({ length: maxPages }, (_, idx) => idx + 1);
  }

  /**
   * 自動目次ページ（複数ページ対応）を pdfDoc に描画する
   */
  function renderTocPages(pdfDoc, tocEntries, fontRegular, fontBold) {
    const { rgb } = window.PDFLib;
    const W = 595.28;
    const H = 841.89;
    const marginL = 72;
    const marginR = W - 72;
    const startY = H - 120;
    const bottomY = 72;
    const lineH = 22;

    const dark = rgb(0.08, 0.1, 0.14);
    const muted = rgb(0.45, 0.5, 0.56);

    let page = pdfDoc.addPage([W, H]);
    // タイトル「目次」
    const title = '目　次';
    const tw = fontBold.widthOfTextAtSize(title, 18);
    page.drawText(title, { x: (W - tw) / 2, y: H - 78, size: 18, font: fontBold, color: dark });

    let curY = startY;
    for (const entry of tocEntries) {
      if (curY < bottomY) {
        page = pdfDoc.addPage([W, H]);
        curY = H - 78;
      }
      const isChild = entry.level > 0;
      const indent = isChild ? 20 : 0;
      const font = isChild ? fontRegular : fontBold;
      const fontSize = isChild ? 10 : 10.5;
      const xStart = marginL + indent;

      // ページ番号を右揃え
      const pageStr = String(entry.startPage);
      const pw = fontRegular.widthOfTextAtSize(pageStr, fontSize);
      const xPage = marginR - pw;

      // タイトル（長すぎる場合は省略）
      let label = entry.title || '(無題)';
      const maxLabelW = xPage - xStart - 28;
      while (label.length > 4 && font.widthOfTextAtSize(label, fontSize) > maxLabelW) {
        label = label.slice(0, -2) + '…';
      }
      const lw = font.widthOfTextAtSize(label, fontSize);

      page.drawText(label, { x: xStart, y: curY, size: fontSize, font, color: dark });
      page.drawText(pageStr, { x: xPage, y: curY, size: fontSize, font: fontRegular, color: dark });

      // リーダー点線
      const dotStart = xStart + lw + 6;
      const dotEnd = xPage - 8;
      if (dotEnd > dotStart + 8) {
        page.drawLine({
          start: { x: dotStart, y: curY + 2.5 },
          end: { x: dotEnd, y: curY + 2.5 },
          thickness: 0.7,
          color: muted,
          dashArray: [1.2, 3.2],
        });
      }
      curY -= lineH;
    }
  }

  /**
   * 統合構造計算書PDFを生成するメイン処理
   */
  async function buildIntegratedPdf(config, onProgress) {
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const progress = (pct, msg) => onProgress && onProgress(pct, msg);

    progress(5, '日本語フォントを準備中...');
    const fontBuffers = await loadJapaneseFonts((m) => progress(8, m));

    const outDoc = await PDFDocument.create();
    outDoc.registerFontkit(window.fontkit);

    // サブセット埋め込みにより容量肥大化を完全防止
    const jpRegular = await outDoc.embedFont(fontBuffers.regular, { subset: true });
    const jpBold = await outDoc.embedFont(fontBuffers.bold, { subset: true });
    const stdHelvetica = await outDoc.embedFont(StandardFonts.Helvetica);

    // 1. 新表紙
    if (config.addCover) {
      progress(15, '新表紙を生成中...');
      await window.CoverRenderer.renderCoverPage(outDoc, config.coverData, jpRegular, jpBold);
    }

    // 2. 目次ページ（先に通しページ構成を確定して描画）
    if (config.addToc && config.tocEntries.length > 0) {
      progress(20, '自動目次を生成中...');
      renderTocPages(outDoc, config.tocEntries, jpRegular, jpBold);
    }

    const bodyStartIndexInOut = outDoc.getPageCount();
    let logicalPageNo = 1;

    // ページ右上へ通しページ番号 < N > を軽量印字するヘルパー（/Rotate 0/90/180/270 補正対応）
    const { degrees } = window.PDFLib;
    const stampPageNumber = (page, num) => {
      if (!config.addPageNum) return;
      const { width, height } = page.getSize();
      const rawAngle = (page.getRotation && page.getRotation().angle) || 0;
      const angle = ((rawAngle % 360) + 360) % 360;
      const text = `< ${num} >`;
      const size = 10.5;
      const tw = stdHelvetica.widthOfTextAtSize(text, size);
      const marginX = 16;
      const marginY = 22;

      let x, y, rotate;
      if (angle === 90) {
        // 時計回り90度回転: 未回転の左上(0, height)が表示上の右上。文字は+Y方向へ進む
        x = marginY;
        y = height - marginX - tw;
        rotate = degrees(90);
      } else if (angle === 180) {
        x = marginX + tw;
        y = marginY;
        rotate = degrees(180);
      } else if (angle === 270) {
        // 時計回り270度(反時計回り90度)回転: 未回転の右下(width, 0)が表示上の右上。文字は-Y方向へ進む
        x = width - marginY;
        y = marginX + tw;
        rotate = degrees(270);
      } else {
        x = width - tw - marginX;
        y = height - marginY;
        rotate = degrees(0);
      }

      page.drawText(text, {
        x,
        y,
        size,
        font: stdHelvetica,
        color: rgb(0.15, 0.15, 0.15),
        rotate,
      });
    };

    // 3. グループA（構造計算資料）を結合
    const preFiles = config.preFiles || [];
    for (let i = 0; i < preFiles.length; i++) {
      const f = preFiles[i];
      progress(22 + Math.round((i / Math.max(preFiles.length, 1)) * 12), `構造計算資料を結合中: ${f.title}`);
      const srcDoc = await PDFDocument.load(f.bytes, { ignoreEncryption: true });
      const indices = parsePageRange(f.pageRange, srcDoc.getPageCount()).map((p) => p - 1);
      const copied = await outDoc.copyPages(srcDoc, indices);
      for (const cp of copied) {
        outDoc.addPage(cp);
        stampPageNumber(cp, logicalPageNo++);
      }
    }

    // 4. グループB（ARCHITREND ZERO 構造計算書本体 ＋ A3自動差替 ＋ NG対応赤字追記）
    if (config.a4Bytes) {
      progress(36, 'ARCHITREND ZERO 本体を読込中...');
      const a4Doc = await PDFDocument.load(config.a4Bytes, { ignoreEncryption: true });
      const a4Count = a4Doc.getPageCount();

      let a3Doc = null;
      const a3ReplaceByA4Page = new Map();
      if (config.enableA3Replace && config.a3Bytes && config.a3Matches) {
        progress(40, 'A3図面PDFを読込中...');
        a3Doc = await PDFDocument.load(config.a3Bytes, { ignoreEncryption: true });
        for (const m of config.a3Matches) {
          if (m.matched && m.a4Page) {
            a3ReplaceByA4Page.set(m.a4Page, m.a3Page - 1); // 0-based
          }
        }
      }

      // NG追記をページ番号ごとにグループ化
      const ngByA4Page = new Map();
      if (config.applyNgAnnots && config.ngEntries) {
        for (const ng of config.ngEntries) {
          if (ng.enabled && ng.note && ng.note.trim()) {
            if (!ngByA4Page.has(ng.a4Page)) ngByA4Page.set(ng.a4Page, []);
            ngByA4Page.get(ng.a4Page).push(ng);
          }
        }
      }

      // ★ 共有フォント・リソース重複による容量肥大化を完全防止するため、
      //    A4採用分・A3差替分それぞれのインデックス配列を一括で copyPages する
      const a4IndicesToCopy = [];
      const a3IndicesToCopy = [];
      const pagePlan = []; // { source: 'a4' | 'a3', slotIdx, pNum }

      for (let pIdx = 0; pIdx < a4Count; pIdx++) {
        const pNum = pIdx + 1;
        if (a3Doc && a3ReplaceByA4Page.has(pNum)) {
          pagePlan.push({ source: 'a3', slotIdx: a3IndicesToCopy.length, pNum });
          a3IndicesToCopy.push(a3ReplaceByA4Page.get(pNum));
        } else {
          pagePlan.push({ source: 'a4', slotIdx: a4IndicesToCopy.length, pNum });
          a4IndicesToCopy.push(pIdx);
        }
      }

      progress(45, `A4本体 (${a4IndicesToCopy.length}頁) を一括無劣化コピー中...`);
      const copiedA4Pages = a4IndicesToCopy.length > 0 ? await outDoc.copyPages(a4Doc, a4IndicesToCopy) : [];

      progress(62, `A3差替図面 (${a3IndicesToCopy.length}枚) を一括無劣化コピー中...`);
      const copiedA3Pages = a3Doc && a3IndicesToCopy.length > 0 ? await outDoc.copyPages(a3Doc, a3IndicesToCopy) : [];

      for (let i = 0; i < pagePlan.length; i++) {
        const { source, slotIdx, pNum } = pagePlan[i];
        if (pNum % 100 === 0 || pNum === a4Count) {
          progress(68 + Math.round((pNum / a4Count) * 12), `本体ページ配置・注記適用中... (${pNum} / ${a4Count}頁)`);
        }

        const copiedPage = source === 'a3' ? copiedA3Pages[slotIdx] : copiedA4Pages[slotIdx];

        // NG対応内容の軽量赤字追記
        if (ngByA4Page.has(pNum)) {
          const red = rgb(0.82, 0.08, 0.08);
          for (const ann of ngByA4Page.get(pNum)) {
            copiedPage.drawText(ann.note.trim(), {
              x: ann.x,
              y: ann.y,
              size: ann.fontSize || 9,
              font: jpBold,
              color: red,
            });
          }
        }

        outDoc.addPage(copiedPage);
        stampPageNumber(copiedPage, logicalPageNo++);
      }
    }

    // 5. グループC（別紙計算書）を結合
    const postFiles = config.postFiles || [];
    if (postFiles.length > 0 && config.insertBesshiDivider) {
      progress(80, '「別紙計算書」中表紙を生成中...');
      const dividerPage = await window.CoverRenderer.renderBesshiDividerPage(
        outDoc,
        config.coverData,
        jpRegular,
        jpBold
      );
      stampPageNumber(dividerPage, logicalPageNo++);
    }
    for (let i = 0; i < postFiles.length; i++) {
      const f = postFiles[i];
      progress(81 + Math.round((i / Math.max(postFiles.length, 1)) * 7), `別紙計算書を結合中: ${f.title}`);
      const srcDoc = await PDFDocument.load(f.bytes, { ignoreEncryption: true });
      const indices = parsePageRange(f.pageRange, srcDoc.getPageCount()).map((p) => p - 1);
      const copied = await outDoc.copyPages(srcDoc, indices);
      for (const cp of copied) {
        outDoc.addPage(cp);
        stampPageNumber(cp, logicalPageNo++);
      }
    }

    // 6. グループD（地盤関係資料：ファイルがある場合のみ結合）
    const groundFiles = config.groundFiles || [];
    if (groundFiles.length > 0) {
      if (config.insertGroundDivider) {
        progress(89, '「地盤関係資料」中表紙を生成中...');
        const gDivider = await window.CoverRenderer.renderGroundDividerPage(
          outDoc,
          config.coverData,
          jpRegular,
          jpBold
        );
        stampPageNumber(gDivider, logicalPageNo++);
      }
      for (let i = 0; i < groundFiles.length; i++) {
        const f = groundFiles[i];
        progress(90 + Math.round((i / Math.max(groundFiles.length, 1)) * 5), `地盤関係資料を結合中: ${f.title}`);
        const srcDoc = await PDFDocument.load(f.bytes, { ignoreEncryption: true });
        const indices = parsePageRange(f.pageRange, srcDoc.getPageCount()).map((p) => p - 1);
        const copied = await outDoc.copyPages(srcDoc, indices);
        for (const cp of copied) {
          outDoc.addPage(cp);
          stampPageNumber(cp, logicalPageNo++);
        }
      }
    }

    progress(96, '軽量化PDFを最終出力中...');
    const finalBytes = await outDoc.save({ useObjectStreams: true });
    progress(100, '完了しました！');

    return {
      bytes: finalBytes,
      totalPages: outDoc.getPageCount(),
      bodyPages: logicalPageNo - 1,
      coverAndTocPages: bodyStartIndexInOut,
    };
  }

  return {
    openPdfJs,
    inspectAttachmentPdf,
    analyzeArchitrendA4,
    matchA3ToA4,
    parsePageRange,
    buildIntegratedPdf,
  };
})();
