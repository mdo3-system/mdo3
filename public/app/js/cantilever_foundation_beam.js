/**
 * =========================================================================
 * 片持ち基礎梁の検定計算（玄関ポーチ等・柱あり）
 * cantilever_foundation_beam.js (v2.2.10 Universal Edition)
 * 
 * 単一責任の原則（SRP: Single Responsibility Principle）に基づく5層設計：
 * 1. CFB_CONFIG: 規格・定数マスター (鉄筋断面積・許容引張応力度・Fc許容せん断応力度)
 * 2. CFB_DataNormalizer: 全形式JSONデータ正規化エンジン (旧形式refBeams/フォーム形式/新形式beamRows完全互換)
 * 3. CFB_PhysicsEngine: 構造力学計算エンジン (基礎自重/等分布w/合力La/作用M/作用Q/耐力LMa/耐力LQa/検定比)
 * 4. CFB_Renderer: 画面・A4印刷帳票レンダラー (リアルタイムDOM更新・フォーカス保護・印刷完全同期)
 * 5. CFB_Controller: 状態同期・イベントコントローラー (ToolStorage連携・双方向バインディング・印刷トリガー)
 * =========================================================================
 */

// 1. 規格・定数マスター (CFB_CONFIG)
const CFB_CONFIG = {
    REBAR_DATA: {
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
    },
    FC_DATA: {
        '21': 0.70,
        '24': 0.73,
        '27': 0.76,
        '30': 0.79
    },
    DEFAULT_ROWS: [
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
    ]
};

// 内部グローバルステート
let beamRows = JSON.parse(JSON.stringify(CFB_CONFIG.DEFAULT_ROWS));
window.beamRows = beamRows;

// 2. 全形式JSONデータ正規化エンジン (CFB_DataNormalizer)
const CFB_DataNormalizer = {
    normalize: function(payload) {
        if (!payload) return null;

        // 文字列として渡された場合の安全パース
        if (typeof payload === 'string') {
            try {
                payload = JSON.parse(payload);
            } catch (e) {
                console.warn('Payload JSON parse error:', e);
                return null;
            }
        }
        if (typeof payload !== 'object') return null;

        let rows = null;
        let spanName = '';
        let fc = '21';

        // (1) 新形式・配列形式の抽出 (beamRows, beam_rows, rows, items, cards 等)
        const candidates = [
            payload.beamRows,
            payload.beam_rows,
            payload.rows,
            payload.data?.beamRows,
            payload.data?.beam_rows,
            payload.data?.rows,
            payload.params?.beamRows,
            payload.inputs?.beamRows,
            payload.items,
            payload.cards,
            Array.isArray(payload) ? payload : null
        ];

        for (const cand of candidates) {
            if (Array.isArray(cand) && cand.length > 0) {
                rows = cand;
                break;
            }
        }

        // (2) 旧バージョン形式（refBeams 参照梁リスト + フォームパラメータ）の相互変換
        const oldRefBeams = payload.refBeams || payload.data?.refBeams || payload.params?.refBeams;
        if (Array.isArray(oldRefBeams) && oldRefBeams.length > 0 && (!rows || rows.length === 0)) {
            const d = payload.data || payload.params || payload;
            const defaultL = parseFloat(d.span_L || d.L || d.span) || 0.9;
            const defaultD = parseFloat(d.beam_D || d.D || d.height) || 700;
            const defaultB = parseFloat(d.beam_b || d.b || d.width) || 150;
            const defaultLeveler = parseFloat(d.leveler || d.level) || 10;
            const defaultRebar = d.beam_rebar || d.rebar || d.tekkin || '1-D13';
            const defaultDt = parseFloat(d.beam_dt || d.dt) || 70;
            const defaultLQa = parseFloat(d.beam_LQa || d.LQa) || '';

            rows = oldRefBeams.map((b, idx) => ({
                pos: b.name || b.pos || `梁${idx + 1}`,
                spanName: b.name || b.spanName || `スパン${idx + 1}`,
                P: parseFloat(b.QL || b.P || b.axial_force || b.NL) || 5.0,
                L: parseFloat(b.L || b.span) || defaultL,
                b: parseFloat(b.b || b.width) || defaultB,
                D: parseFloat(b.D || b.height) || defaultD,
                leveler: parseFloat(b.leveler) || defaultLeveler,
                rebar: b.rebar || defaultRebar,
                dt: parseFloat(b.dt) || defaultDt,
                alpha: parseFloat(b.alpha) || 1.0,
                LQa_custom: b.LQa_custom !== undefined ? b.LQa_custom : defaultLQa
            }));
        }

        // (3) 単一オブジェクト形式（1行フォームデータ）の場合のフォールバック
        if (!rows && payload.data && typeof payload.data === 'object') {
            const d = payload.data;
            if (d.P !== undefined || d.axial_force !== undefined || d.beam_D !== undefined || d.D !== undefined || d.b !== undefined || d.span_L !== undefined || d.NL !== undefined) {
                rows = [{
                    pos: d.pos || d.beam_name || 'X1Y1',
                    spanName: d.spanName || d.span_name || 'スパン1',
                    P: parseFloat(d.P || d.axial_force || d.NL || d.sum_P) || 5.0,
                    L: parseFloat(d.L || d.span_L || d.span) || 0.9,
                    b: parseFloat(d.b || d.beam_b || d.width) || 150,
                    D: parseFloat(d.D || d.beam_D || d.height) || 600,
                    leveler: parseFloat(d.leveler || d.level) || 10,
                    rebar: d.rebar || d.beam_rebar || '1-D13',
                    dt: parseFloat(d.dt || d.beam_dt) || 70,
                    alpha: parseFloat(d.alpha) || 1.0,
                    LQa_custom: d.LQa_custom !== undefined ? d.LQa_custom : (d.beam_LQa || d.LQa || '')
                }];
            }
        }

        // (4) 通り名・コンクリート強度の抽出
        spanName = payload.span_name || payload.data?.span_name || payload.data?.beam_name || payload.params?.span_name || payload.header?.span_name || '';
        fc = payload.fc_select || payload.data?.fc_select || payload.params?.fc_select || payload.header?.fc || '21';
        fc = String(fc).replace(/[^0-9]/g, '') || '21';

        // 行データが見つからない場合でも、既存の行データまたは標準行をフォールバックとして保持
        if (!Array.isArray(rows) || rows.length === 0) {
            rows = window.beamRows && window.beamRows.length > 0 ? window.beamRows : JSON.parse(JSON.stringify(CFB_CONFIG.DEFAULT_ROWS));
        }

        // 各行データの正規化
        const normalizedRows = rows.map((r, idx) => ({
            pos: r.pos || r.position || r.location || `X1Y${idx + 1}`,
            spanName: r.spanName || r.span_name || r.span || (r.pos ? `スパン ${r.pos}` : `スパン ${idx + 1}`),
            P: parseFloat(r.P !== undefined ? r.P : (r.axial_force !== undefined ? r.axial_force : (r.QL !== undefined ? r.QL : (r.NL !== undefined ? r.NL : 5.0)))) || 0,
            L: parseFloat(r.L !== undefined ? r.L : (r.span_L !== undefined ? r.span_L : (r.span_length !== undefined ? r.span_length : 0.9))) || 0.9,
            b: parseFloat(r.b !== undefined ? r.b : (r.beam_b !== undefined ? r.beam_b : (r.width !== undefined ? r.width : 150))) || 150,
            D: parseFloat(r.D !== undefined ? r.D : (r.beam_D !== undefined ? r.beam_D : (r.height !== undefined ? r.height : 600))) || 600,
            leveler: parseFloat(r.leveler !== undefined ? r.leveler : (r.level !== undefined ? r.level : 10)) || 0,
            rebar: r.rebar || r.beam_rebar || r.tekkin || '1-D13',
            dt: parseFloat(r.dt !== undefined ? r.dt : (r.beam_dt !== undefined ? r.beam_dt : 70)) || 70,
            alpha: parseFloat(r.alpha !== undefined ? r.alpha : 1.0) || 1.0,
            LQa_custom: r.LQa_custom !== undefined ? r.LQa_custom : (r.beam_LQa !== undefined ? r.beam_LQa : (r.LQa !== undefined ? r.LQa : ''))
        }));

        return {
            rows: normalizedRows,
            spanName: spanName,
            fc: fc
        };
    }
};

// 3. 構造力学計算エンジン (CFB_PhysicsEngine)
const CFB_PhysicsEngine = {
    calculate: function(rows, fcVal) {
        const fs = CFB_CONFIG.FC_DATA[fcVal] || 0.70;
        let sumP = 0;
        let sumL = 0;
        let cumWeights = 0;

        const results = rows.map((row, idx) => {
            const P = parseFloat(row.P) || 0;
            const L = parseFloat(row.L) || 0;
            const b = parseFloat(row.b) || 0;
            const D = parseFloat(row.D) || 0;
            const leveler = parseFloat(row.leveler !== undefined ? row.leveler : 10) || 0;

            sumP += P;
            sumL += L;

            // 基礎自重 (kN): 基礎幅(m) × (基礎高さ + レベラー)(m) × 24.0 kN/m³
            const selfWeight = (b / 1000) * ((D + leveler) / 1000) * 24.0;
            cumWeights += selfWeight;

            // 等分布荷重 w (kN/m): 基礎自重 / 柱間
            const w = L > 0 ? (selfWeight / L) : 0;

            // 合力重心距離 La (m)
            let La = null;
            let LaStr = '-';
            if (idx > 0) {
                let momentSum = 0;
                let currentPsum = 0;
                let currentDist = 0;
                for (let k = 0; k <= idx; k++) {
                    const pk = parseFloat(rows[k].P) || 0;
                    const lk = parseFloat(rows[k].L) || 0;
                    currentDist += lk;
                    momentSum += pk * currentDist;
                    currentPsum += pk;
                }
                if (currentPsum > 0) {
                    La = momentSum / currentPsum;
                    LaStr = La.toFixed(3);
                }
            }

            // 作用曲げモーメント M (kN・m)
            let M = 0;
            if (idx === 0) {
                M = (w * Math.pow(L, 2)) / 2 + P * L;
            } else {
                const selfMoment = (w * Math.pow(L, 2)) / 2;
                const axialMoment = La !== null ? (sumP * La) : (P * L);
                let prevWeightMoment = 0;
                for (let k = 0; k < idx; k++) {
                    const pw = (parseFloat(rows[k].b) || 0) / 1000 * ((parseFloat(rows[k].D) || 0) + (parseFloat(rows[k].leveler) || 10)) / 1000 * 24.0;
                    let arm = L;
                    for (let m = k + 1; m < idx; m++) {
                        arm += (parseFloat(rows[m].L) || 0);
                    }
                    prevWeightMoment += pw * arm;
                }
                M = selfMoment + axialMoment + prevWeightMoment;
            }

            // 作用せん断力 Q (kN): 全自重 + 全軸力
            const Q = cumWeights + sumP;

            // 断面諸元・許容耐力算定 (レベラー厚は耐力算定成に不算入)
            const dt = parseFloat(row.dt) || 70;
            const d = Math.max(D - dt, 0);
            const j = (7 / 8) * d;

            const rebarInfo = CFB_CONFIG.REBAR_DATA[row.rebar] || { at: 127, ft: 195 };
            const at = rebarInfo.at;
            const ft = rebarInfo.ft;

            // 許容曲げモーメント LMa (kN・m) = at × ft × j / 10^6
            const LMa = (at * ft * j) / 1000000;

            // 許容せん断耐力 LQa (kN) = b × j × Fs × α / 10^3
            const alpha = parseFloat(row.alpha !== undefined ? row.alpha : 1.0) || 1.0;
            const LQa_calc = (b * j * fs * alpha) / 1000;
            let LQa = parseFloat(row.LQa_custom);
            if (isNaN(LQa) || LQa <= 0) {
                LQa = LQa_calc;
            }

            // 検定比
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

        return {
            results,
            sumP,
            sumL
        };
    }
};

// 4. 画面・A4印刷帳票レンダラー (CFB_Renderer)
const CFB_Renderer = {
    render: function() {
        const stressTbody = document.getElementById('stressTableBody');
        const capacityTbody = document.getElementById('capacityTableBody');
        if (!stressTbody || !capacityTbody) return;

        const fcSelect = document.getElementById('fc_select');
        const fcVal = fcSelect ? fcSelect.value : '21';
        const { results, sumP, sumL } = CFB_PhysicsEngine.calculate(beamRows, fcVal);

        stressTbody.innerHTML = '';
        capacityTbody.innerHTML = '';

        results.forEach(item => {
            const { row, idx, P, L, b, D, leveler, selfWeight, w, LaStr, M, Q, dt, j, at, LMa, alpha, LQa_calc, LQa, mRatio, qRatio, isOk } = item;

            // 1. 応力算定・検定 行 (画面用)
            const trStress = document.createElement('tr');
            trStress.dataset.idx = idx;
            trStress.innerHTML = `
                <td><input type="text" class="cfb-input cfb-input-center" value="${row.pos || ''}" oninput="CFB_Controller.updateField(${idx}, 'pos', this.value)"></td>
                <td><input type="number" class="cfb-input cfb-input-right" value="${P}" step="0.001" oninput="CFB_Controller.updateField(${idx}, 'P', this.value)"></td>
                <td><input type="number" class="cfb-input cfb-input-right" value="${L}" step="0.05" oninput="CFB_Controller.updateField(${idx}, 'L', this.value)"></td>
                <td><input type="number" class="cfb-input cfb-input-right" value="${b}" step="10" oninput="CFB_Controller.updateField(${idx}, 'b', this.value)"></td>
                <td><input type="number" class="cfb-input cfb-input-right" value="${D}" step="10" oninput="CFB_Controller.updateField(${idx}, 'D', this.value)"></td>
                <td><input type="number" class="cfb-input cfb-input-right" value="${leveler}" step="1" oninput="CFB_Controller.updateField(${idx}, 'leveler', this.value)"></td>
                <td class="cfb-calc-val val-selfweight">${selfWeight.toFixed(3)}</td>
                <td class="cfb-calc-val val-w">${w.toFixed(2)}</td>
                <td class="cfb-calc-val val-la">${LaStr}</td>
                <td class="cfb-calc-val val-m" style="font-weight:600;">${M.toFixed(3)}</td>
                <td class="cfb-calc-val val-q" style="font-weight:600;">${Q.toFixed(3)}</td>
                <td class="cfb-calc-val val-mratio" style="font-weight:bold; color:${mRatio > 1.0 ? 'var(--danger, #dc2626)' : 'inherit'}">${mRatio.toFixed(3)}</td>
                <td class="cfb-calc-val val-qratio" style="font-weight:bold; color:${qRatio > 1.0 ? 'var(--danger, #dc2626)' : 'inherit'}">${qRatio.toFixed(3)}</td>
                <td class="val-badge"><span class="cfb-badge ${isOk ? 'cfb-badge-ok' : 'cfb-badge-ng'}">${isOk ? 'OK' : 'NG'}</span></td>
                <td class="no-print">
                    <button type="button" class="btn btn-secondary cfb-btn-del" onclick="CFB_Controller.removeRow(${idx})">削除</button>
                </td>
            `;
            stressTbody.appendChild(trStress);

            // 2. 許容耐力算定 行 (画面用)
            const trCap = document.createElement('tr');
            trCap.dataset.idx = idx;
            trCap.innerHTML = `
                <td><input type="text" class="cfb-input cfb-input-center" value="${row.spanName || (row.pos ? 'スパン ' + row.pos : '')}" oninput="CFB_Controller.updateField(${idx}, 'spanName', this.value)"></td>
                <td>
                    <select class="cfb-input" style="text-align:left;" onchange="CFB_Controller.updateField(${idx}, 'rebar', this.value); CFB_Renderer.render();">
                        ${Object.keys(CFB_CONFIG.REBAR_DATA).map(k => `<option value="${k}" ${k === row.rebar ? 'selected' : ''}>${k}</option>`).join('')}
                    </select>
                </td>
                <td class="cfb-calc-val val-at">${at}</td>
                <td><input type="number" class="cfb-input cfb-input-right" value="${dt}" step="5" oninput="CFB_Controller.updateField(${idx}, 'dt', this.value)"></td>
                <td class="cfb-calc-val val-j">${j.toFixed(0)}</td>
                <td class="cfb-calc-val val-lma" style="font-weight:bold; color:#0369a1;">${LMa.toFixed(3)}</td>
                <td><input type="number" class="cfb-input cfb-input-right" value="${alpha}" step="0.1" oninput="CFB_Controller.updateField(${idx}, 'alpha', this.value)"></td>
                <td>
                    <input type="number" class="cfb-input cfb-input-right" value="${row.LQa_custom !== undefined ? row.LQa_custom : LQa_calc.toFixed(2)}" step="0.01" placeholder="${LQa_calc.toFixed(2)}" title="アーキトレンドから転記可能" oninput="CFB_Controller.updateField(${idx}, 'LQa_custom', this.value)">
                </td>
            `;
            capacityTbody.appendChild(trCap);
        });

        // 合計表示
        const sumPEl = document.getElementById('sum_P');
        const sumLEl = document.getElementById('sum_L');
        if (sumPEl) sumPEl.innerText = sumP.toFixed(3);
        if (sumLEl) sumLEl.innerText = sumL.toFixed(2);

        // A4印刷帳票を100%同期
        this.syncPrint();
    },

    syncPrint: function() {
        if (typeof GlobalInfo !== 'undefined' && GlobalInfo.updatePrintHeader) {
            GlobalInfo.updatePrintHeader();
        }

        const titleEl = document.getElementById('report_span_title');
        const spanInput = document.getElementById('span_name');
        if (titleEl && spanInput) titleEl.innerText = spanInput.value || 'X1 通り Y3 - Y1';

        const fcSelect = document.getElementById('fc_select');
        const fcVal = fcSelect ? fcSelect.value : '21';
        const reportFc = document.getElementById('report_fc_val');
        if (reportFc) reportFc.innerText = `${fcVal} N/mm² (LFs=${CFB_CONFIG.FC_DATA[fcVal] || 0.70})`;

        const stressTbody = document.getElementById('print_stress_tbody');
        const capTbody = document.getElementById('print_capacity_tbody');
        if (!stressTbody || !capTbody) return;

        stressTbody.innerHTML = '';
        capTbody.innerHTML = '';

        const { results, sumP, sumL } = CFB_PhysicsEngine.calculate(beamRows, fcVal);

        results.forEach(item => {
            const { row, P, L, b, D, leveler, selfWeight, w, LaStr, M, Q, dt, j, at, LMa, alpha, LQa, mRatio, qRatio, isOk } = item;

            // 1. 応力算定・検定 行 (印刷用)
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

            // 2. 許容耐力算定 行 (印刷用)
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
};

// 5. 状態同期・イベントコントローラー (CFB_Controller)
const CFB_Controller = {
    syncDomToState: function() {
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
    },

    updateField: function(idx, field, value) {
        if (!beamRows[idx]) return;
        beamRows[idx][field] = value;
        window.beamRows = beamRows;

        // 計算結果と印刷ビューを即座に同期（フォーカス外れを防ぐ直接DOM更新）
        const fcSelect = document.getElementById('fc_select');
        const fcVal = fcSelect ? fcSelect.value : '21';
        const { results, sumP, sumL } = CFB_PhysicsEngine.calculate(beamRows, fcVal);

        const stressTr = document.querySelector(`#stressTableBody tr[data-idx="${idx}"]`);
        const capTr = document.querySelector(`#capacityTableBody tr[data-idx="${idx}"]`);
        const item = results[idx];

        if (stressTr && item) {
            const selfWeightEl = stressTr.querySelector('.val-selfweight');
            const wEl = stressTr.querySelector('.val-w');
            const laEl = stressTr.querySelector('.val-la');
            const mEl = stressTr.querySelector('.val-m');
            const qEl = stressTr.querySelector('.val-q');
            const mRatioEl = stressTr.querySelector('.val-mratio');
            const qRatioEl = stressTr.querySelector('.val-qratio');
            const badgeEl = stressTr.querySelector('.val-badge');

            if (selfWeightEl) selfWeightEl.innerText = item.selfWeight.toFixed(3);
            if (wEl) wEl.innerText = item.w.toFixed(2);
            if (laEl) laEl.innerText = item.LaStr;
            if (mEl) mEl.innerText = item.M.toFixed(3);
            if (qEl) qEl.innerText = item.Q.toFixed(3);
            if (mRatioEl) {
                mRatioEl.innerText = item.mRatio.toFixed(3);
                mRatioEl.style.color = item.mRatio > 1.0 ? 'var(--danger, #dc2626)' : 'inherit';
            }
            if (qRatioEl) {
                qRatioEl.innerText = item.qRatio.toFixed(3);
                qRatioEl.style.color = item.qRatio > 1.0 ? 'var(--danger, #dc2626)' : 'inherit';
            }
            if (badgeEl) {
                badgeEl.innerHTML = `<span class="cfb-badge ${item.isOk ? 'cfb-badge-ok' : 'cfb-badge-ng'}">${item.isOk ? 'OK' : 'NG'}</span>`;
            }
        }

        if (capTr && item) {
            const atEl = capTr.querySelector('.val-at');
            const jEl = capTr.querySelector('.val-j');
            const lmaEl = capTr.querySelector('.val-lma');
            if (atEl) atEl.innerText = item.at;
            if (jEl) jEl.innerText = item.j.toFixed(0);
            if (lmaEl) lmaEl.innerText = item.LMa.toFixed(3);
        }

        const sumPEl = document.getElementById('sum_P');
        const sumLEl = document.getElementById('sum_L');
        if (sumPEl) sumPEl.innerText = sumP.toFixed(3);
        if (sumLEl) sumLEl.innerText = sumL.toFixed(2);

        CFB_Renderer.syncPrint();
    },

    addRow: function() {
        this.syncDomToState();
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
        CFB_Renderer.render();
    },

    removeRow: function(idx) {
        this.syncDomToState();
        if (beamRows.length <= 1) {
            alert('少なくとも1行は必要です。');
            return;
        }
        beamRows.splice(idx, 1);
        window.beamRows = beamRows;
        CFB_Renderer.render();
    },

    restore: function(payload) {
        const normalized = CFB_DataNormalizer.normalize(payload);
        if (!normalized) return false;

        beamRows = normalized.rows;
        window.beamRows = beamRows;

        if (normalized.spanName && document.getElementById('span_name')) {
            document.getElementById('span_name').value = normalized.spanName;
        }
        if (normalized.fc && document.getElementById('fc_select')) {
            document.getElementById('fc_select').value = normalized.fc;
        }

        CFB_Renderer.render();
        return true;
    },

    print: function() {
        this.syncDomToState();
        CFB_Renderer.syncPrint();
        window.print();
    }
};

// グローバル公開インターフェース (旧互換 & ToolStorage連携)
window.renderRows = function() { CFB_Renderer.render(); };
window.syncPrintView = function() { CFB_Renderer.syncPrint(); };
window.syncDomToBeamRows = function() { CFB_Controller.syncDomToState(); };
window.updateRowField = function(idx, f, v) { CFB_Controller.updateField(idx, f, v); };
window.updateRow = function(idx, f, v) { CFB_Controller.updateField(idx, f, v); };
window.addRow = function() { CFB_Controller.addRow(); };
window.removeRow = function(idx) { CFB_Controller.removeRow(idx); };
window.printReport = function() { CFB_Controller.print(); };
window.executeToolPrint = function() { CFB_Controller.print(); };
window.restoreToolData = function(payload) { return CFB_Controller.restore(payload); };

// 印刷前イベントバインド
window.addEventListener('beforeprint', () => {
    CFB_Controller.syncDomToState();
    CFB_Renderer.syncPrint();
});

// 初期化（DOM読み込み状態に依存せず即座に安全実行）
function initCantileverApp() {
    CFB_Renderer.render();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCantileverApp);
} else {
    initCantileverApp();
}

window.addEventListener('load', () => {
    CFB_Renderer.render();
});
