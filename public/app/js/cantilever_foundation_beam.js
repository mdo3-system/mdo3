/**
 * 片持ち基礎梁の検定（玄関ポーチ等・柱あり）
 * cantilever_foundation_beam.js
 */

const REBAR_DATA = {
    '1-D10': { at: 71, ft: 195 },
    '2-D10': { at: 142, ft: 195 },
    '1-D13': { at: 127, ft: 195 },
    '2-D13': { at: 254, ft: 195 },
    '3-D13': { at: 381, ft: 195 },
    '1-D16': { at: 199, ft: 195 },
    '2-D16': { at: 398, ft: 195 },
    '1-D13+1-D16': { at: 326, ft: 195 },
    '1-D19': { at: 287, ft: 215 },
    '2-D19': { at: 574, ft: 215 }
};

const FC_DATA = {
    '21': 0.70,
    '24': 0.73,
    '27': 0.76,
    '30': 0.79
};

// 初期データ（サンプル: X1通り Y3-Y1）
let beamRows = [
    {
        pos: 'X1Y2',
        spanName: 'Y3-Y2',
        P: 7.658,
        L: 0.9,
        b: 150,
        D: 670,
        leveler: 10,
        rebar: '1-D13',
        dt: 70,
        alpha: 2.0,
        LQa_custom: 110.25
    },
    {
        pos: 'X1Y1',
        spanName: 'Y2-Y1',
        P: 10.967,
        L: 0.9,
        b: 150,
        D: 1430,
        leveler: 10,
        rebar: '2-D13',
        dt: 70,
        alpha: 1.0,
        LQa_custom: 124.95
    }
];
window.beamRows = beamRows;

function initCantilever() {
    renderRows();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCantilever);
} else {
    initCantilever();
}

// フォールバック（window load時にも確実同期）
window.addEventListener('load', () => {
    renderRows();
});

function calculateRowsData(fcVal) {
    const fs = FC_DATA[fcVal] || 0.70;
    let sumP = 0;
    let sumL = 0;
    let cumWeights = 0;

    return beamRows.map((row, idx) => {
        const P = parseFloat(row.P) || 0;
        const L = parseFloat(row.L) || 0;
        const b = parseFloat(row.b) || 0;
        const D = parseFloat(row.D) || 0;
        const leveler = parseFloat(row.leveler !== undefined ? row.leveler : 10) || 0;

        sumP += P;
        sumL += L;

        // 基礎自重 (kN): 基礎幅 × (基礎高さ + レベラー) × 24
        const selfWeight = (b / 1000) * ((D + leveler) / 1000) * 24;
        cumWeights += selfWeight;

        // w (kN/m): 基礎自重 / 柱間
        const w = L > 0 ? (selfWeight / L) : 0;

        // La (m): （軸力×柱間 + 下の段の軸力×(柱間+下の段の柱間)） / 軸力合計
        let La = null;
        let LaStr = '-';
        if (idx > 0) {
            // 先端からの累積距離重心
            let momentSum = 0;
            let currentPsum = 0;
            let currentDist = 0;
            for (let k = 0; k <= idx; k++) {
                const pk = parseFloat(beamRows[k].P) || 0;
                const lk = parseFloat(beamRows[k].L) || 0;
                currentDist += lk;
                momentSum += pk * currentDist;
                currentPsum += pk;
            }
            if (currentPsum > 0) {
                La = momentSum / currentPsum;
                LaStr = La.toFixed(3);
            }
        }

        // 作用 M (kN・m):
        // 1段目: w * L^2 / 2 + P * L
        // 2段目以降: w * L^2 / 2 + (軸力合計 * La) [または自重影響累積]
        let M = 0;
        if (idx === 0) {
            M = (w * Math.pow(L, 2)) / 2 + P * L;
        } else {
            // 2段目以降: 等分布自重モーメント + 全軸力合力モーメント
            const selfMoment = (w * Math.pow(L, 2)) / 2;
            const axialMoment = La !== null ? (sumP * La) : (P * L);
            // 前段自重のモーメント伝達分を含める実務計算
            let prevWeightMoment = 0;
            for (let k = 0; k < idx; k++) {
                const pw = (parseFloat(beamRows[k].b) || 0) / 1000 * ((parseFloat(beamRows[k].D) || 0) + (parseFloat(beamRows[k].leveler) || 10)) / 1000 * 24;
                let arm = L;
                for (let m = k + 1; m < idx; m++) {
                    arm += (parseFloat(beamRows[m].L) || 0);
                }
                prevWeightMoment += pw * arm;
            }
            M = selfMoment + axialMoment + prevWeightMoment;
        }

        // 作用 Q (kN): 全自重 + 全軸力 (w * 柱間 + 軸力 の累積)
        const Q = cumWeights + sumP;

        // 許容耐力算定 (レベラーなしのDで算出)
        const dt = parseFloat(row.dt) || 70;
        const d = Math.max(D - dt, 0);
        const j = (7 / 8) * d;

        const rebarInfo = REBAR_DATA[row.rebar] || { at: 127, ft: 195 };
        const at = rebarInfo.at;
        const ft = rebarInfo.ft;

        const LMa = (at * ft * j) / 1000000;

        const alpha = parseFloat(row.alpha !== undefined ? row.alpha : 1.0) || 1.0;
        let LQa_calc = (b * j * fs * alpha) / 1000;
        let LQa = parseFloat(row.LQa_custom);
        if (isNaN(LQa) || LQa <= 0) {
            LQa = LQa_calc;
        }

        const mRatio = LMa > 0 ? (M / LMa) : 0;
        const qRatio = LQa > 0 ? (Q / LQa) : 0;
        const isOk = mRatio <= 1.0 && qRatio <= 1.0;

        return {
            row,
            idx,
            P,
            L,
            b,
            D,
            leveler,
            selfWeight,
            w,
            La,
            LaStr,
            M,
            Q,
            dt,
            d,
            j,
            at,
            ft,
            LMa,
            alpha,
            LQa_calc,
            LQa,
            mRatio,
            qRatio,
            isOk
        };
    });
}

function renderRows() {
    const stressTbody = document.getElementById('stressTableBody');
    const capacityTbody = document.getElementById('capacityTableBody');
    if (!stressTbody || !capacityTbody) return;

    stressTbody.innerHTML = '';
    capacityTbody.innerHTML = '';

    const fcSelect = document.getElementById('fc_select');
    const fcVal = fcSelect ? fcSelect.value : '21';
    const computedData = calculateRowsData(fcVal);

    let sumP = 0;
    let sumL = 0;

    computedData.forEach(item => {
        const { row, idx, P, L, b, D, leveler, selfWeight, w, LaStr, M, Q, dt, j, at, LMa, alpha, LQa_calc, LQa, mRatio, qRatio, isOk } = item;
        sumP += P;
        sumL += L;

        // 1. 応力算定・検定 行
        const trStress = document.createElement('tr');
        trStress.innerHTML = `
            <td><input type="text" class="cfb-input cfb-input-center" value="${row.pos || ''}" onchange="updateRow(${idx}, 'pos', this.value)"></td>
            <td><input type="number" class="cfb-input cfb-input-right" value="${P}" step="0.001" onchange="updateRow(${idx}, 'P', this.value)"></td>
            <td><input type="number" class="cfb-input cfb-input-right" value="${L}" step="0.05" onchange="updateRow(${idx}, 'L', this.value)"></td>
            <td><input type="number" class="cfb-input cfb-input-right" value="${b}" step="10" onchange="updateRow(${idx}, 'b', this.value)"></td>
            <td><input type="number" class="cfb-input cfb-input-right" value="${D}" step="10" onchange="updateRow(${idx}, 'D', this.value)"></td>
            <td><input type="number" class="cfb-input cfb-input-right" value="${leveler}" step="1" onchange="updateRow(${idx}, 'leveler', this.value)"></td>
            <td class="cfb-calc-val">${selfWeight.toFixed(3)}</td>
            <td class="cfb-calc-val">${w.toFixed(2)}</td>
            <td class="cfb-calc-val">${LaStr}</td>
            <td class="cfb-calc-val" style="font-weight:600;">${M.toFixed(3)}</td>
            <td class="cfb-calc-val" style="font-weight:600;">${Q.toFixed(3)}</td>
            <td class="cfb-calc-val" style="font-weight:bold; color:${mRatio > 1.0 ? 'var(--danger, #dc2626)' : 'inherit'}">${mRatio.toFixed(3)}</td>
            <td class="cfb-calc-val" style="font-weight:bold; color:${qRatio > 1.0 ? 'var(--danger, #dc2626)' : 'inherit'}">${qRatio.toFixed(3)}</td>
            <td><span class="cfb-badge ${isOk ? 'cfb-badge-ok' : 'cfb-badge-ng'}">${isOk ? 'OK' : 'NG'}</span></td>
            <td class="no-print">
                <button class="btn btn-secondary cfb-btn-del" onclick="removeRow(${idx})">削除</button>
            </td>
        `;
        stressTbody.appendChild(trStress);

        // 2. 許容耐力算定 行
        const trCap = document.createElement('tr');
        trCap.innerHTML = `
            <td><input type="text" class="cfb-input cfb-input-center" value="${row.spanName || (row.pos ? 'スパン ' + row.pos : '')}" onchange="updateRow(${idx}, 'spanName', this.value)"></td>
            <td>
                <select class="cfb-input" style="text-align:left;" onchange="updateRow(${idx}, 'rebar', this.value)">
                    ${Object.keys(REBAR_DATA).map(k => `<option value="${k}" ${k === row.rebar ? 'selected' : ''}>${k}</option>`).join('')}
                </select>
            </td>
            <td class="cfb-calc-val">${at}</td>
            <td><input type="number" class="cfb-input cfb-input-right" value="${dt}" step="5" onchange="updateRow(${idx}, 'dt', this.value)"></td>
            <td class="cfb-calc-val">${j.toFixed(0)}</td>
            <td class="cfb-calc-val" style="font-weight:bold; color:#0369a1;">${LMa.toFixed(3)}</td>
            <td><input type="number" class="cfb-input cfb-input-right" value="${alpha}" step="0.1" onchange="updateRow(${idx}, 'alpha', this.value)"></td>
            <td>
                <input type="number" class="cfb-input cfb-input-right" value="${row.LQa_custom !== undefined ? row.LQa_custom : LQa_calc.toFixed(2)}" step="0.01" placeholder="${LQa_calc.toFixed(2)}" title="アーキトレンドから転記可能" onchange="updateRow(${idx}, 'LQa_custom', this.value)">
            </td>
        `;
        capacityTbody.appendChild(trCap);
    });

    // 合計行
    const sumPEl = document.getElementById('sum_P');
    const sumLEl = document.getElementById('sum_L');
    if (sumPEl) sumPEl.innerText = sumP.toFixed(3);
    if (sumLEl) sumLEl.innerText = sumL.toFixed(2);

    // 印刷用帳票テーブルを常時自動同期
    syncPrintView();
}

function syncDomToBeamRows() {
    const stressRows = document.querySelectorAll('#stressTableBody tr');
    const capRows = document.querySelectorAll('#capacityTableBody tr');
    
    stressRows.forEach((tr, idx) => {
        if (!beamRows[idx]) return;
        const inputs = tr.querySelectorAll('input');
        if (inputs.length >= 6) {
            beamRows[idx].pos = inputs[0].value;
            beamRows[idx].P = parseFloat(inputs[1].value) || 0;
            beamRows[idx].L = parseFloat(inputs[2].value) || 0;
            beamRows[idx].b = parseFloat(inputs[3].value) || 0;
            beamRows[idx].D = parseFloat(inputs[4].value) || 0;
            beamRows[idx].leveler = parseFloat(inputs[5].value) || 0;
        }
    });

    capRows.forEach((tr, idx) => {
        if (!beamRows[idx]) return;
        const inputs = tr.querySelectorAll('input');
        const select = tr.querySelector('select');
        if (inputs[0]) beamRows[idx].spanName = inputs[0].value;
        if (select) beamRows[idx].rebar = select.value;
        if (inputs[1]) beamRows[idx].dt = parseFloat(inputs[1].value) || 70;
        if (inputs[2]) beamRows[idx].alpha = parseFloat(inputs[2].value) || 1.0;
        if (inputs[3]) beamRows[idx].LQa_custom = inputs[3].value !== '' ? parseFloat(inputs[3].value) : '';
    });
    window.beamRows = beamRows;
}
window.syncDomToBeamRows = syncDomToBeamRows;

function updateRow(idx, field, value) {
    if (!beamRows[idx]) return;
    beamRows[idx][field] = value;
    window.beamRows = beamRows;
    renderRows();
}

function addRow() {
    syncDomToBeamRows();
    const nextIdx = beamRows.length + 1;
    beamRows.push({
        pos: 'X1Y' + (3 - nextIdx > 0 ? (3 - nextIdx) : nextIdx),
        spanName: 'Y' + (nextIdx + 1) + '-Y' + nextIdx,
        P: 5.0,
        L: 0.9,
        b: 150,
        D: 600,
        leveler: 10,
        rebar: '1-D13',
        dt: 70,
        alpha: 1.0,
        LQa_custom: ''
    });
    window.beamRows = beamRows;
    renderRows();
}

function removeRow(idx) {
    syncDomToBeamRows();
    if (beamRows.length <= 1) {
        alert('少なくとも1行は必要です。');
        return;
    }
    beamRows.splice(idx, 1);
    window.beamRows = beamRows;
    renderRows();
}

function syncPrintView() {
    syncDomToBeamRows();

    if (typeof GlobalInfo !== 'undefined' && GlobalInfo.updatePrintHeader) {
        GlobalInfo.updatePrintHeader();
    }

    const titleEl = document.getElementById('report_span_title');
    const spanInput = document.getElementById('span_name');
    if (titleEl && spanInput) titleEl.innerText = spanInput.value;

    const fcSelect = document.getElementById('fc_select');
    const fcVal = fcSelect ? fcSelect.value : '21';
    const reportFc = document.getElementById('report_fc_val');
    if (reportFc) reportFc.innerText = `${fcVal} N/mm² (LFs=${FC_DATA[fcVal] || 0.70})`;

    const stressTbody = document.getElementById('print_stress_tbody');
    const capTbody = document.getElementById('print_capacity_tbody');
    if (!stressTbody || !capTbody) return;

    stressTbody.innerHTML = '';
    capTbody.innerHTML = '';

    const computedData = calculateRowsData(fcVal);
    let sumP = 0;
    let sumL = 0;

    computedData.forEach(item => {
        const { row, P, L, b, D, leveler, selfWeight, w, LaStr, M, Q, dt, j, at, LMa, alpha, LQa, mRatio, qRatio, isOk } = item;
        sumP += P;
        sumL += L;

        // 1. 応力算定・検定
        const trS = document.createElement('tr');
        trS.innerHTML = `
            <td>${row.pos || ''}</td>
            <td style="text-align:right;">${P.toFixed(3)}</td>
            <td style="text-align:right;">${L.toFixed(2)}</td>
            <td style="text-align:right;">${b}</td>
            <td style="text-align:right;">${D}</td>
            <td style="text-align:right;">${leveler}</td>
            <td style="text-align:right;">${selfWeight.toFixed(3)}</td>
            <td style="text-align:right;">${w.toFixed(2)}</td>
            <td style="text-align:right;">${LaStr}</td>
            <td style="text-align:right; font-weight:600;">${M.toFixed(3)}</td>
            <td style="text-align:right; font-weight:600;">${Q.toFixed(3)}</td>
            <td style="text-align:right; font-weight:bold; color:${mRatio > 1.0 ? '#dc2626' : 'inherit'}">${mRatio.toFixed(3)}</td>
            <td style="text-align:right; font-weight:bold; color:${qRatio > 1.0 ? '#dc2626' : 'inherit'}">${qRatio.toFixed(3)}</td>
            <td style="font-weight:bold; color:${isOk ? '#166534' : '#991b1b'};">${isOk ? 'OK' : 'NG'}</td>
        `;
        stressTbody.appendChild(trS);

        // 2. 許容耐力算定
        const trC = document.createElement('tr');
        trC.innerHTML = `
            <td>${row.spanName || (row.pos ? 'スパン ' + row.pos : '')}</td>
            <td>${row.rebar || ''}</td>
            <td style="text-align:right;">${at}</td>
            <td style="text-align:right;">${dt}</td>
            <td style="text-align:right;">${j.toFixed(0)}</td>
            <td style="text-align:right; font-weight:bold;">${LMa.toFixed(3)}</td>
            <td style="text-align:right;">${alpha.toFixed(2)}</td>
            <td style="text-align:right; font-weight:bold;">${LQa.toFixed(2)}</td>
        `;
        capTbody.appendChild(trC);
    });

    const printSumP = document.getElementById('print_sum_P');
    const printSumL = document.getElementById('print_sum_L');
    if (printSumP) printSumP.innerText = sumP.toFixed(3);
    if (printSumL) printSumL.innerText = sumL.toFixed(2);
}

// 印刷実行
function printReport() {
    syncPrintView();
    window.print();
}

// 印刷前イベントおよび共通ヘッダー連携
window.addEventListener('beforeprint', syncPrintView);
window.executeToolPrint = printReport;

// 汎用・過去形式・新形式すべてに対応する完全復元ハンドラ
window.restoreToolData = function(payload) {
    if (!payload || typeof payload !== 'object') return false;

    let targetRows = null;

    // 1. 多様なキー構造から配列データを網羅抽出
    if (Array.isArray(payload)) {
        targetRows = payload;
    } else if (Array.isArray(payload.beamRows)) {
        targetRows = payload.beamRows;
    } else if (Array.isArray(payload.beam_rows)) {
        targetRows = payload.beam_rows;
    } else if (Array.isArray(payload.rows)) {
        targetRows = payload.rows;
    } else if (Array.isArray(payload.data?.beamRows)) {
        targetRows = payload.data.beamRows;
    } else if (Array.isArray(payload.data?.beam_rows)) {
        targetRows = payload.data.beam_rows;
    } else if (Array.isArray(payload.data?.rows)) {
        targetRows = payload.data.rows;
    } else if (Array.isArray(payload.params?.beamRows)) {
        targetRows = payload.params.beamRows;
    } else if (Array.isArray(payload.inputs?.beamRows)) {
        targetRows = payload.inputs.beamRows;
    } else if (Array.isArray(payload.items)) {
        targetRows = payload.items;
    } else if (Array.isArray(payload.cards)) {
        targetRows = payload.cards;
    } else if (payload.data && typeof payload.data === 'object' && (payload.data.P !== undefined || payload.data.axial_force !== undefined || payload.data.b !== undefined)) {
        // 単一行オブジェクトの場合
        targetRows = [payload.data];
    }

    if (Array.isArray(targetRows) && targetRows.length > 0) {
        // 2. 各行のプロパティを安全に正規化
        beamRows = targetRows.map((r, idx) => {
            return {
                pos: r.pos || r.position || r.location || `X1Y${idx + 1}`,
                spanName: r.spanName || r.span_name || r.span || (r.pos ? `スパン ${r.pos}` : `スパン ${idx + 1}`),
                P: parseFloat(r.P !== undefined ? r.P : (r.axial_force !== undefined ? r.axial_force : (r.NL !== undefined ? r.NL : 5.0))) || 0,
                L: parseFloat(r.L !== undefined ? r.L : (r.span_length !== undefined ? r.span_length : (r.span_m !== undefined ? r.span_m : 0.9))) || 0.9,
                b: parseFloat(r.b !== undefined ? r.b : (r.width !== undefined ? r.width : 150)) || 150,
                D: parseFloat(r.D !== undefined ? r.D : (r.height !== undefined ? r.height : (r.depth !== undefined ? r.depth : 600))) || 600,
                leveler: parseFloat(r.leveler !== undefined ? r.leveler : (r.level !== undefined ? r.level : 10)) || 0,
                rebar: r.rebar || r.tekkin || r.bar || '1-D13',
                dt: parseFloat(r.dt !== undefined ? r.dt : 70) || 70,
                alpha: parseFloat(r.alpha !== undefined ? r.alpha : 1.0) || 1.0,
                LQa_custom: r.LQa_custom !== undefined ? r.LQa_custom : (r.LQa !== undefined ? r.LQa : '')
            };
        });

        window.beamRows = beamRows;

        // 3. 通り名・Fc強度の復元
        const spanNameVal = payload.span_name || payload.data?.span_name || payload.params?.span_name || payload.header?.span_name;
        if (spanNameVal && document.getElementById('span_name')) {
            document.getElementById('span_name').value = spanNameVal;
        }

        const fcVal = payload.fc_select || payload.data?.fc_select || payload.params?.fc_select || payload.header?.fc;
        if (fcVal && document.getElementById('fc_select')) {
            document.getElementById('fc_select').value = String(fcVal).replace(/[^0-9]/g, '');
        }

        renderRows();
        syncPrintView();
        return true;
    }

    return false;
};

