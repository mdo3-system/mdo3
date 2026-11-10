/**
 * katadatsu_kisohari.js
 * 片土圧基礎梁の計算書 (mdo3 構造計算補助ツール)
 * 準拠基準: 「第5章 基礎ただし書計算基準」
 * 機能: 長期曲げ検定、ねじり一次検定、ねじり二次検定、滑動検定、可変SVG断面図、A4印刷、データ保存復元
 */

const REBAR_AREAS = {
    'none': 0,
    'D10': 71.3,
    'D13': 126.7,
    'D16': 198.6
};

document.addEventListener('DOMContentLoaded', () => {
    if (typeof GlobalInfo !== 'undefined') {
        GlobalInfo.init();
    }
    
    bindInputEvents();
    calculateAndRender();

    const gProj = document.getElementById('g_project');
    if (gProj) {
        gProj.addEventListener('input', () => calculateAndRender());
    }
});

function bindInputEvents() {
    const inputs = document.querySelectorAll('.tool-container input, .tool-container select');
    inputs.forEach(input => {
        input.addEventListener('input', () => calculateAndRender());
        input.addEventListener('change', () => calculateAndRender());
    });
}

/**
 * 鉄筋断面積の合計算定 (2種併用対応)
 */
function calcRebarArea(dia1, count1, dia2, count2) {
    const a1 = (REBAR_AREAS[dia1] || 0) * (parseInt(count1, 10) || 0);
    const a2 = (REBAR_AREAS[dia2] || 0) * (parseInt(count2, 10) || 0);
    return a1 + a2;
}

/**
 * メイン計算およびレンダリング
 */
function calculateAndRender() {
    // 1. 諸元取得
    const partName = document.getElementById('input_part_name')?.value || '片土圧基礎梁 FG1 (X1通り)';
    const b = parseFloat(document.getElementById('input_b')?.value) || 150; // mm (幅)
    const D = parseFloat(document.getElementById('input_D')?.value) || 1500; // mm (せい)
    const dh = parseFloat(document.getElementById('input_dh')?.value) || 0; // mm (人通口欠損)
    const Deff = Math.max(100, D - dh); // 有効せい

    // 底盤
    const LB = parseFloat(document.getElementById('input_LB')?.value) || 450; // mm (つま先)
    const a = parseFloat(document.getElementById('input_a')?.value) || 0; // mm (かかと: デフォルト0)
    const dtb = parseFloat(document.getElementById('input_dtb')?.value) || 200; // mm (底盤厚)
    const B_total = LB + b + a; // mm (底盤全幅)

    // スパン
    const Lw = parseFloat(document.getElementById('input_Lw')?.value) || 3.64; // m (梁スパン)
    const Lo = parseFloat(document.getElementById('input_Lo')?.value) || 3.64; // m (ねじり抵抗梁間内法)
    const L = parseFloat(document.getElementById('input_L')?.value) || 3.64; // m (桁行スパン: 滑動用)

    // 地盤・土圧
    const earthDirection = document.getElementById('input_earth_direction')?.value || 'site_to_building'; // site_to_building or building_to_site
    const deltaH = parseFloat(document.getElementById('input_delta_h')?.value) || 0.800; // m (地盤差)
    const Df = parseFloat(document.getElementById('input_Df')?.value) || 0.400; // m (根入れ)
    const gammaSoil = parseFloat(document.getElementById('input_gamma_soil')?.value) || 16.0; // kN/m3
    const Ko = parseFloat(document.getElementById('input_Ko')?.value) || 0.50; // 静止土圧係数
    const q2 = parseFloat(document.getElementById('input_q2')?.value) || 2.0; // 上側表面載荷 kN/m2
    const q1 = parseFloat(document.getElementById('input_q1')?.value) || 0.0; // 下側表面載荷 kN/m2
    const mu = parseFloat(document.getElementById('input_mu')?.value) || 0.40; // 摩擦係数

    // 荷重
    const Wb = parseFloat(document.getElementById('input_Wb')?.value) || 12.50; // kN/m (基礎梁検討用長期荷重)
    const sigmaW = parseFloat(document.getElementById('input_sigma_w')?.value) || 220.0; // kN (建物全自重)
    const resMomentFactor = parseFloat(document.getElementById('input_res_moment_factor')?.value) || 1.0; // 抵抗モーメント考慮係数 (1.0, 0.9, 0.0)

    // 材料・許容応力度
    const fc = parseInt(document.getElementById('input_fc')?.value, 10) || 21;
    let Lfs = 0.70;
    if (fc >= 24) Lfs = 0.73;
    if (fc >= 27) Lfs = 0.76;
    if (fc >= 30) Lfs = 0.79;

    const Lft = 196; // N/mm2 (SD295A)
    const Lfwt = 196; // N/mm2

    // 配筋
    // 上主筋
    const topDia1 = document.getElementById('input_top_dia1')?.value || 'D13';
    const topCount1 = parseInt(document.getElementById('input_top_count1')?.value, 10) || 1;
    const topDia2 = document.getElementById('input_top_dia2')?.value || 'none';
    const topCount2 = parseInt(document.getElementById('input_top_count2')?.value, 10) || 0;
    const As_top = calcRebarArea(topDia1, topCount1, topDia2, topCount2);

    // 下主筋
    const botDia1 = document.getElementById('input_bot_dia1')?.value || 'D13';
    const botCount1 = parseInt(document.getElementById('input_bot_count1')?.value, 10) || 1;
    const botDia2 = document.getElementById('input_bot_dia2')?.value || 'none';
    const botCount2 = parseInt(document.getElementById('input_bot_count2')?.value, 10) || 0;
    const As_bot = calcRebarArea(botDia1, botCount1, botDia2, botCount2);

    // スターラップ (STP)
    const stpDia = document.getElementById('input_stp_dia')?.value || 'D10';
    const stpPitch = parseFloat(document.getElementById('input_stp_pitch')?.value) || 200; // mm
    const aw1 = REBAR_AREAS[stpDia] || 71.3;
    const aw = aw1 * 2; // 2本1組

    // 側面筋 (ねじり補強軸筋)
    const sideDia = document.getElementById('input_side_dia')?.value || 'D10';
    const sideCount = parseInt(document.getElementById('input_side_count')?.value, 10) || 4;
    const As_side = (REBAR_AREAS[sideDia] || 71.3) * sideCount;
    // ねじり二次検定用の追加軸方向鉄筋断面積の総和 Asw (上下主筋 + 側面筋)
    const Asw = As_top + As_bot + As_side;

    // 底盤配筋
    const baseDia = document.getElementById('input_base_dia')?.value || 'D13';
    const basePitch = parseFloat(document.getElementById('input_base_pitch')?.value) || 150; // mm
    const baseType = document.getElementById('input_base_type')?.value || 'single';

    // 2. 土圧の算定 (PDF P.201)
    const H_soil = deltaH + Df; // m (全土被り深さ)
    const Pq = q2 * Ko * H_soil; // kN/m (載荷による横土圧)
    const Tq = Pq * (H_soil / 2); // kN・m/m (載荷土圧による転倒モーメント)
    const Py = 0.5 * gammaSoil * Math.pow(H_soil, 2) * Ko; // kN/m (背面土横土圧)
    const Ty = Py * (H_soil / 3); // kN・m/m (土圧による転倒モーメント)
    const T2 = Tq + Ty; // kN・m/m (合計土圧モーメント)

    // 3. 抵抗モーメント T1 の算定 (PDF P.200-202)
    // 梁中心軸を原点とする抵抗モーメント
    // W1: 底盤スラブ自重
    const gammaConcrete = 24.0; // kN/m3
    const W1 = gammaConcrete * (B_total / 1000) * (dtb / 1000); // kN/m
    // 底盤中心の偏心 e1 (梁中心から見た底盤重心位置)
    // 敷地側土圧の場合、かかと版 a は土圧側、つま先版 LB は反対側
    const e1 = ((LB - a) / 2) / 1000; // m (正のとき土圧に対抗する方向)
    
    // 土圧側のかかと出幅 a_soil, 反対側出幅 LB_soil
    let a_soil = a;
    let lb_soil = LB;
    if (earthDirection === 'building_to_site') {
        a_soil = LB;
        lb_soil = a;
    }

    // W2: 土圧側の底盤上の土重
    const W2 = gammaSoil * (a_soil / 1000) * deltaH; // kN/m
    const e2 = (b / 2 + a_soil / 2) / 1000; // m (土圧側偏心距離)

    // W3: 土圧側の載荷重
    const W3 = q2 * (a_soil / 1000); // kN/m
    const e3 = e2;

    // W4: 梁自重 (偏心 e4 = 0)
    const WF = gammaConcrete * (b / 1000) * (Deff / 1000);
    const e4 = 0;

    // W5: 反対側の載荷重
    const W5 = q1 * (lb_soil / 1000);
    const e5 = -(b / 2 + lb_soil / 2) / 1000;

    // 抵抗モーメント T1 (kN・m/m)
    // 土圧に対抗する方向を正とする
    const T1_raw = (W1 * e1 + W2 * e2 + W3 * e3 + WF * e4 + W5 * e5);
    const T1 = Math.max(0, T1_raw);

    // 4. 設計用断面力の算定
    // 設計用ねじりモーメント LT (PDF P.202: LT = (T2 - T1) * Lo / 2)
    const T_net = Math.max(0, T2 - resMomentFactor * T1);
    const LT = T_net * (Lo / 2); // kN・m

    // 設計用長期せん断力 LQ (PDF P.201: LQ = Wb * Lw / 2)
    const LQ = Wb * (Lw / 2); // kN

    // 設計用長期曲げモーメント LM (PDF P.198)
    const LM = (1 / 8) * Wb * Math.pow(Lw, 2); // kN・m

    // 5. 各種許容耐力・検定の計算

    // 【検定1】長期曲げ検定 (PDF P.198)
    // d = D - 70 mm, j = 7/8 * d
    const d = Deff - 70; // mm
    const j = (7 / 8) * d; // mm
    // LMa = As * Lft * j * 10^-6 (kN・m)
    const LMa = As_bot * Lft * j * 1e-6;
    const bendRatio = LMa > 0 ? (LM / LMa) : 999;
    const isBendOk = bendRatio <= 1.0;

    // 【検定2】ねじり一次検定 (PDF P.201)
    // LTa1 = (1.15 / 3) * b^2 * D * Lfs * 10^-6 (kN・m)
    const LTa1 = (1.15 / 3) * Math.pow(b, 2) * Deff * Lfs * 1e-6;
    // LQa1 = b * j * Lfs * 10^-3 (kN)
    const LQa1 = b * j * Lfs * 1e-3;
    const check1_T_term = LTa1 > 0 ? Math.pow(LT / LTa1, 2) : 999;
    const check1_Q_term = LQa1 > 0 ? Math.pow(LQ / LQa1, 2) : 999;
    const check1 = check1_T_term + check1_Q_term;
    const isCheck1Ok = check1 <= 1.0;

    // せん断補強筋（STP）間隔規定 (PDF P.201)
    // x <= aw / (0.002 * b) かつ x <= D / 2
    const x_limit1 = aw / (0.002 * b);
    const x_limit2 = Deff / 2;
    const x_limit = Math.min(x_limit1, x_limit2);
    const isStpSpacingOk = stpPitch <= x_limit;

    // 【検定3】ねじり二次検定 (PDF P.202-203)
    // 肋筋芯で囲まれたコンクリート核 (PDF: D - 35 - 65 = D - 100, b - 45 - 45 = b - 90)
    const D_core = Math.max(50, Deff - 100);
    const b_core = Math.max(30, b - 90);
    const Ao = D_core * b_core; // mm2
    const psi_o = (D_core * 2) + (b_core * 2); // mm

    // LTo1: 追加軸筋寄与
    // LTo1 = Asw * 2 * Lft * Ao * 10^-6 / psi_o (kN・m)
    const LTo1 = (Asw * 2 * Lft * Ao * 1e-6) / psi_o;

    // LTo2: 肋筋寄与
    // LTo2 = aw1 * 2 * Lfwt * Ao * 10^-6 / x (kN・m)
    const LTo2 = (aw1 * 2 * Lfwt * Ao * 1e-6) / stpPitch;

    // 鉄筋による長期許容ねじり耐力 LTa2 = min(LTo1, LTo2)
    const LTa2 = Math.min(LTo1, LTo2);

    // 偏心布基礎許容せん断力 LQa2 (PDF P.203)
    // alpha = 4 / (LM / (LQ * d) + 1) (1 <= alpha <= 2)
    // d in mm, LM in kN・m, LQ in kN -> LM / (LQ * (d / 1000))
    const d_m = d / 1000;
    const m_qd = (LQ * d_m > 0) ? (LM / (LQ * d_m)) : 1.0;
    let alpha = 4 / (m_qd + 1);
    if (alpha < 1.0) alpha = 1.0;
    if (alpha > 2.0) alpha = 2.0;

    // 肋筋比 pw = aw / (b * x)
    const pw = aw / (b * stpPitch);
    const pw_diff = Math.max(0, pw - 0.002);
    const LQa2 = b * j * (alpha * Lfs + 0.5 * Lfwt * pw_diff) * 1e-3; // kN

    const check2_T_term = LTa2 > 0 ? Math.pow(LT / LTa2, 2) : 999;
    const check2_Q_term = LQa2 > 0 ? Math.pow(LQ / LQa2, 2) : 999;
    const check2 = check2_T_term + check2_Q_term;
    const isCheck2Ok = check2 <= 1.0;

    // 【検定4】滑動検定 (PDF P.210)
    // P = (Pq + Py) * L
    const P_total = (Pq + Py) * L; // kN (水平滑動力)
    const F_fric = mu * sigmaW; // kN (抵抗摩擦力)
    const slidingSafetyFactor = P_total > 0 ? (F_fric / P_total) : 999;
    const isSlidingOk = slidingSafetyFactor >= 1.50;

    // 画面および印刷エリアへの結果反映
    renderUIResults({
        partName, b, D: Deff, LB, a, dtb, B_total, Lw, Lo, L,
        earthDirection, deltaH, Df, gammaSoil, Ko, q2, q1, mu,
        Wb, sigmaW, resMomentFactor, fc, Lfs, Lft, Lfwt,
        topDia1, topCount1, topDia2, topCount2, As_top,
        botDia1, botCount1, botDia2, botCount2, As_bot,
        stpDia, stpPitch, aw1, aw, x_limit, isStpSpacingOk,
        sideDia, sideCount, As_side, Asw,
        baseDia, basePitch, baseType,
        Pq, Py, Tq, Ty, T2, W1, e1, W2, e2, W3, e3, WF, e4, W5, e5, T1, LT, LQ, LM,
        d, j, LMa, bendRatio, isBendOk,
        LTa1, LQa1, check1_T_term, check1_Q_term, check1, isCheck1Ok,
        D_core, b_core, Ao, psi_o, LTo1, LTo2, LTa2, alpha, pw, pw_diff, LQa2, check2_T_term, check2_Q_term, check2, isCheck2Ok,
        P_total, F_fric, slidingSafetyFactor, isSlidingOk
    });

    // 動的SVG断面図の描画 (画面プレビュー用 & 印刷用)
    renderDynamicSVG({
        b, D: Deff, LB, a, dtb, B_total, deltaH, Df, earthDirection,
        topDia1, topCount1, topDia2, topCount2,
        botDia1, botCount1, botDia2, botCount2,
        stpDia, stpPitch, sideDia, sideCount,
        baseDia, basePitch, baseType,
        containerId: 'preview_svg_container'
    });

    renderDynamicSVG({
        b, D: Deff, LB, a, dtb, B_total, deltaH, Df, earthDirection,
        topDia1, topCount1, topDia2, topCount2,
        botDia1, botCount1, botDia2, botCount2,
        stpDia, stpPitch, sideDia, sideCount,
        baseDia, basePitch, baseType,
        containerId: 'print_svg_container'
    });
}

/**
 * 画面テキストおよび判定結果の更新
 */
function renderUIResults(res) {
    // 総括判定バッジ
    updateBadge('badge_bend', res.isBendOk, `検定比 ${res.bendRatio.toFixed(3)}`);
    updateBadge('badge_torsion1', res.isCheck1Ok, `検定値 ${res.check1.toFixed(3)}`);
    updateBadge('badge_torsion2', res.isCheck2Ok, `検定値 ${res.check2.toFixed(3)}`);
    updateBadge('badge_sliding', res.isSlidingOk, `安全率 ${res.slidingSafetyFactor.toFixed(2)}`);

    // 鉄筋合計断面積のリアルタイム表示
    setElemText('disp_as_top', `${res.As_top.toFixed(1)} mm²`);
    setElemText('disp_as_bot', `${res.As_bot.toFixed(1)} mm²`);
    setElemText('disp_as_side', `${res.As_side.toFixed(1)} mm² (Asw計: ${res.Asw.toFixed(1)} mm²)`);

    // モーメント・断面力表示
    setElemText('res_Pq', res.Pq.toFixed(2));
    setElemText('res_Py', res.Py.toFixed(2));
    setElemText('res_Tq', res.Tq.toFixed(2));
    setElemText('res_Ty', res.Ty.toFixed(2));
    setElemText('res_T2', res.T2.toFixed(2));
    setElemText('res_T1', res.T1.toFixed(2));
    setElemText('res_LT', res.LT.toFixed(2));
    setElemText('res_LT_2', res.LT.toFixed(2));
    setElemText('res_LQ', res.LQ.toFixed(2));
    setElemText('res_LQ_2', res.LQ.toFixed(2));
    setElemText('res_LM', res.LM.toFixed(2));
    setElemText('input_stp_pitch_disp', res.stpPitch.toString());

    // 検定1: 長期曲げ
    setElemText('res_j', res.j.toFixed(1));
    setElemText('res_LMa', res.LMa.toFixed(2));
    setElemText('res_bend_ratio', res.bendRatio.toFixed(3));
    setElemText('res_bend_judge', res.isBendOk ? 'OK' : 'NG');
    styleJudge('res_bend_judge', res.isBendOk);

    // 検定2: ねじり一次
    setElemText('res_LTa1', res.LTa1.toFixed(2));
    setElemText('res_LQa1', res.LQa1.toFixed(2));
    setElemText('res_check1', res.check1.toFixed(3));
    setElemText('res_check1_judge', res.isCheck1Ok ? 'OK' : 'NG');
    styleJudge('res_check1_judge', res.isCheck1Ok);
    setElemText('res_stp_limit', res.x_limit.toFixed(1));
    setElemText('res_stp_judge', res.isStpSpacingOk ? 'OK (@200以下規定合致)' : 'NG (ピッチ超過)');
    styleJudge('res_stp_judge', res.isStpSpacingOk);

    // 検定3: ねじり二次
    setElemText('res_Ao', res.Ao.toLocaleString());
    setElemText('res_psi_o', res.psi_o.toLocaleString());
    setElemText('res_LTo1', res.LTo1.toFixed(2));
    setElemText('res_LTo2', res.LTo2.toFixed(2));
    setElemText('res_LTa2', res.LTa2.toFixed(2));
    setElemText('res_alpha', res.alpha.toFixed(2));
    setElemText('res_pw', (res.pw * 100).toFixed(3) + '%');
    setElemText('res_LQa2', res.LQa2.toFixed(2));
    setElemText('res_check2', res.check2.toFixed(3));
    setElemText('res_check2_judge', res.isCheck2Ok ? 'OK' : 'NG');
    styleJudge('res_check2_judge', res.isCheck2Ok);

    // 検定4: 滑動
    setElemText('res_P_total', res.P_total.toFixed(2));
    setElemText('res_F_fric', res.F_fric.toFixed(2));
    setElemText('res_sliding_sf', res.slidingSafetyFactor.toFixed(2));
    setElemText('res_sliding_judge', res.isSlidingOk ? 'OK (≧1.50)' : 'NG (<1.50)');
    styleJudge('res_sliding_judge', res.isSlidingOk);

    // 印刷エリアへのバインド
    renderPrintArea(res);
}

function updateBadge(id, isOk, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `kth-status-badge ${isOk ? 'ok' : 'ng'}`;
    const pill = el.querySelector('.kth-status-pill');
    if (pill) {
        pill.className = `kth-status-pill ${isOk ? 'ok' : 'ng'}`;
        pill.innerText = isOk ? '適合 OK' : '不適合 NG';
    }
    const val = el.querySelector('.kth-status-val-text');
    if (val) {
        val.innerText = text;
    }
}

function setElemText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function styleJudge(id, isOk) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.color = isOk ? '#16a34a' : '#dc2626';
    el.style.fontWeight = 'bold';
}

/**
 * A4印刷エリアのレンダリング
 */
function renderPrintArea(res) {
    // 物件情報
    const proj = document.getElementById('g_project')?.value || '片土圧基礎梁検討工事';
    const date = document.getElementById('g_date')?.value || new Date().toISOString().split('T')[0];
    const eng = document.getElementById('g_engineer')?.value || '-';

    setElemText('print_g_project', proj);
    setElemText('print_g_project_p2', proj);
    setElemText('print_g_date', date);
    setElemText('print_g_engineer', eng);
    setElemText('print_part_name', res.partName);
    setElemText('print_part_name_p2', res.partName);

    // 諸元テーブル
    setElemText('p_dim', `幅 b=${res.b}mm, せい D=${res.D}mm, スラブ幅 B=${res.B_total}mm (つま先 LB=${res.LB}mm, かかと a=${res.a}mm, 厚=${res.dtb}mm)`);
    setElemText('p_soil', `地盤差 Δh=${res.deltaH}m, 根入れ Df=${res.Df}m, 土圧方向: ${res.earthDirection === 'site_to_building' ? '敷地側→建物側' : '建物側→敷地側'}, γ=${res.gammaSoil}kN/m³, Ko=${res.Ko}, q2=${res.q2}kN/m²`);
    setElemText('p_rebar_top', `${formatRebarDesc(res.topDia1, res.topCount1, res.topDia2, res.topCount2)} (As=${res.As_top.toFixed(1)}mm²)`);
    setElemText('p_rebar_bot', `${formatRebarDesc(res.botDia1, res.botCount1, res.botDia2, res.botCount2)} (As=${res.As_bot.toFixed(1)}mm²)`);
    setElemText('p_rebar_stp', `${res.stpDia}@${res.stpPitch} (aw=${res.aw.toFixed(1)}mm², 規定間隔限度: ${res.x_limit.toFixed(0)}mm)`);
    setElemText('p_rebar_side', `${res.sideCount}-${res.sideDia} (Asw合計=${res.Asw.toFixed(1)}mm²)`);
    setElemText('p_rebar_base', `${res.baseDia}@${res.basePitch} (${res.baseType === 'single' ? 'シングル' : 'ダブル'})`);
    setElemText('p_material', `Fc=${res.fc}N/mm² (Lfs=${res.Lfs}N/mm²), 鉄筋 SD295A (Lft=Lfwt=${res.Lft}N/mm²)`);

    // 断面力
    setElemText('p_T2', `${res.T2.toFixed(2)} kN·m/m (Pq=${res.Pq.toFixed(2)}, Py=${res.Py.toFixed(2)})`);
    setElemText('p_T1', `${res.T1.toFixed(2)} kN·m/m (考慮係数: ${res.resMomentFactor})`);
    setElemText('p_LT', `${res.LT.toFixed(2)} kN·m`);
    setElemText('p_LQ', `${res.LQ.toFixed(2)} kN`);
    setElemText('p_LM', `${res.LM.toFixed(2)} kN·m`);

    // 検定1
    setElemText('p_LMa', `${res.LMa.toFixed(2)} kN·m`);
    setElemText('p_bend_ratio', `${res.bendRatio.toFixed(3)}`);
    setElemText('p_bend_judge', res.isBendOk ? 'OK' : 'NG');
    setPillJudge('p_bend_badge', res.isBendOk);

    // 検定2
    setElemText('p_LTa1', `${res.LTa1.toFixed(2)} kN·m`);
    setElemText('p_LQa1', `${res.LQa1.toFixed(2)} kN`);
    setElemText('p_check1', `${res.check1.toFixed(3)}`);
    setElemText('p_check1_judge', res.isCheck1Ok ? 'OK' : 'NG');
    setPillJudge('p_check1_badge', res.isCheck1Ok);

    // 検定3
    setElemText('p_Ao', `${res.Ao.toLocaleString()} mm²`);
    setElemText('p_psi_o', `${res.psi_o.toLocaleString()} mm`);
    setElemText('p_LTo1', `${res.LTo1.toFixed(2)} kN·m`);
    setElemText('p_LTo2', `${res.LTo2.toFixed(2)} kN·m`);
    setElemText('p_LTa2', `${res.LTa2.toFixed(2)} kN·m`);
    setElemText('p_LQa2', `${res.LQa2.toFixed(2)} kN`);
    setElemText('p_check2', `${res.check2.toFixed(3)}`);
    setElemText('p_check2_judge', res.isCheck2Ok ? 'OK' : 'NG');
    setPillJudge('p_check2_badge', res.isCheck2Ok);

    // 検定4
    setElemText('p_P_total', `${res.P_total.toFixed(2)} kN`);
    setElemText('p_F_fric', `${res.F_fric.toFixed(2)} kN`);
    setElemText('p_sliding_sf', `${res.slidingSafetyFactor.toFixed(2)}`);
    setElemText('p_sliding_judge', res.isSlidingOk ? 'OK (≧1.50)' : 'NG (<1.50)');
    setPillJudge('p_sliding_badge', res.isSlidingOk);
}

function formatRebarDesc(dia1, cnt1, dia2, cnt2) {
    let desc = `${cnt1}-${dia1}`;
    if (dia2 !== 'none' && cnt2 > 0) {
        desc += ` + ${cnt2}-${dia2}`;
    }
    return desc;
}

function setPillJudge(id, isOk) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerText = isOk ? '適合 OK' : '不適合 NG';
    el.className = `print-judgment-badge ${isOk ? 'ok' : 'ng'}`;
}

/**
 * 動的SVG断面図の描画 (可変形状・寸法線・配筋マーク)
 */
function renderDynamicSVG(opt) {
    const container = document.getElementById(opt.containerId);
    if (!container) return;

    const b = opt.b; // 梁幅 mm
    const D = opt.D; // 梁せい mm
    const LB = opt.LB; // つま先出幅 mm
    const a = opt.a; // かかと出幅 mm
    const dtb = opt.dtb; // 底盤厚 mm
    const B_total = opt.B_total; // 全幅 mm
    const deltaH = opt.deltaH * 1000; // mm
    const Df = opt.Df * 1000; // mm
    const isSiteToBldg = opt.earthDirection === 'site_to_building';

    // SVG描画座標系の設定 (幅 600, 高さ 440)
    const svgWidth = 600;
    const svgHeight = 440;
    const paddingX = 70;
    const paddingY = 50;

    // 縮尺 scale (mm -> px)
    // 描画対象の全幅: つま先 + 梁幅 + かかと + 土圧矢印スペース
    const totalContentWidth = B_total + 800;
    const totalContentHeight = Math.max(D, deltaH + Df) + dtb + 400;
    const scaleX = (svgWidth - paddingX * 2) / totalContentWidth;
    const scaleY = (svgHeight - paddingY * 2) / totalContentHeight;
    const scale = Math.min(scaleX, scaleY, 0.22);

    // 基準原点: 基礎梁の底面中心を (originX, originY) とする
    const originX = svgWidth / 2 + (isSiteToBldg ? 40 : -40);
    const originY = svgHeight - paddingY - 40;

    // 梁および底盤の各点座標 (mm単位での相対値からpxへ変換)
    // 梁中心 x = 0, 底面 y = 0
    // 底盤底面: y = 0, 天端: y = -dtb
    // 梁天端: y = -D
    // かかと側 (土圧側):
    // 敷地側土圧の場合: 右側がかかと a (外側・高地盤), 左側がつま先 LB (建物側・低地盤)
    // 建物側土圧の場合: 左側がかかと a (建物側・高地盤), 右側がつま先 LB (敷地側・低地盤)
    let leftOverhang, rightOverhang;
    let highGroundIsRight = true;

    if (isSiteToBldg) {
        // 敷地側(右)から建物側(左)
        leftOverhang = LB;
        rightOverhang = a;
        highGroundIsRight = true;
    } else {
        // 建物側(左)から敷地側(右)
        leftOverhang = a;
        rightOverhang = LB;
        highGroundIsRight = false;
    }

    const xBeamL = originX - (b / 2) * scale;
    const xBeamR = originX + (b / 2) * scale;
    const xSlabL = originX - (b / 2 + leftOverhang) * scale;
    const xSlabR = originX + (b / 2 + rightOverhang) * scale;

    const yBase = originY;
    const ySlabTop = originY - dtb * scale;
    const yBeamTop = originY - D * scale;

    // 地盤高低差
    // 高地盤面: 底面から Df + deltaH の高さ
    // 低地盤面: 底面から Df の高さ
    const yHighGL = originY - (Df + deltaH) * scale;
    const yLowGL = originY - Df * scale;

    let svg = `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:sans-serif;">
        <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#dc2626" />
            </marker>
            <marker id="dim_arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 2 L 10 5 L 0 8 z" fill="#475569" />
            </marker>
            <pattern id="hatch_soil" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="10" stroke="#cbd5e1" stroke-width="1" />
            </pattern>
        </defs>`;

    // 1. 地盤・土圧背面ハッチング
    if (highGroundIsRight) {
        // 高地盤(右側)
        svg += `<polygon points="${xBeamR},${ySlabTop} ${xSlabR},${ySlabTop} ${xSlabR},${yBase} ${svgWidth - 20},${yBase} ${svgWidth - 20},${yHighGL} ${xBeamR},${yHighGL}" fill="url(#hatch_soil)" opacity="0.6" />`;
        // GL線(右・高地盤)
        svg += `<line x1="${xBeamR}" y1="${yHighGL}" x2="${svgWidth - 10}" y2="${yHighGL}" stroke="#15803d" stroke-width="2.5" />`;
        svg += `<text x="${svgWidth - 85}" y="${yHighGL - 6}" font-size="11" font-weight="bold" fill="#15803d">▽ GL(上) 敷地側</text>`;

        // 低地盤(左側)
        svg += `<line x1="${xBeamL}" y1="${yLowGL}" x2="20" y2="${yLowGL}" stroke="#15803d" stroke-width="2" stroke-dasharray="4,3" />`;
        svg += `<text x="25" y="${yLowGL - 6}" font-size="11" font-weight="bold" fill="#15803d">▽ GL(下) 建物側</text>`;
    } else {
        // 高地盤(左側)
        svg += `<polygon points="${xBeamL},${ySlabTop} ${xSlabL},${ySlabTop} ${xSlabL},${yBase} 20,${yBase} 20,${yHighGL} ${xBeamL},${yHighGL}" fill="url(#hatch_soil)" opacity="0.6" />`;
        svg += `<line x1="${xBeamL}" y1="${yHighGL}" x2="20" y2="${yHighGL}" stroke="#15803d" stroke-width="2.5" />`;
        svg += `<text x="25" y="${yHighGL - 6}" font-size="11" font-weight="bold" fill="#15803d">▽ GL(上) 建物側</text>`;

        // 低地盤(右側)
        svg += `<line x1="${xBeamR}" y1="${yLowGL}" x2="${svgWidth - 10}" y2="${yLowGL}" stroke="#15803d" stroke-width="2" stroke-dasharray="4,3" />`;
        svg += `<text x="${svgWidth - 120}" y="${yLowGL - 6}" font-size="11" font-weight="bold" fill="#15803d">▽ GL(下) 敷地側</text>`;
    }

    // 2. コンクリート基礎断面ポリゴン
    // 形状: L型 (左突出 または 右突出 または 逆T型)
    const pointsConcrete = [
        `${xSlabL},${yBase}`,
        `${xSlabR},${yBase}`,
        `${xSlabR},${ySlabTop}`,
        `${xBeamR},${ySlabTop}`,
        `${xBeamR},${yBeamTop}`,
        `${xBeamL},${yBeamTop}`,
        `${xBeamL},${ySlabTop}`,
        `${xSlabL},${ySlabTop}`
    ].join(' ');

    svg += `<polygon points="${pointsConcrete}" fill="#e2e8f0" stroke="#0f172a" stroke-width="2.5" />`;

    // 3. 土圧荷重矢印 (作用方向)
    if (highGroundIsRight) {
        // 右から左への矢印群 (三角形分布)
        const arrowCount = 4;
        for (let i = 0; i <= arrowCount; i++) {
            const frac = i / arrowCount;
            const yArrow = yHighGL + (yBase - yHighGL) * (0.2 + frac * 0.75);
            const arrowLen = 30 + frac * 45;
            const xStart = xBeamR + arrowLen;
            svg += `<line x1="${xStart}" y1="${yArrow}" x2="${xBeamR + 3}" y2="${yArrow}" stroke="#dc2626" stroke-width="2" marker-end="url(#arrow)" />`;
        }
        svg += `<text x="${xBeamR + 45}" y="${yHighGL + 35}" font-size="10.5" font-weight="bold" fill="#dc2626">片土圧 (Pq+Py)</text>`;
    } else {
        // 左から右への矢印群
        const arrowCount = 4;
        for (let i = 0; i <= arrowCount; i++) {
            const frac = i / arrowCount;
            const yArrow = yHighGL + (yBase - yHighGL) * (0.2 + frac * 0.75);
            const arrowLen = 30 + frac * 45;
            const xStart = xBeamL - arrowLen;
            svg += `<line x1="${xStart}" y1="${yArrow}" x2="${xBeamL - 3}" y2="${yArrow}" stroke="#dc2626" stroke-width="2" marker-end="url(#arrow)" />`;
        }
        svg += `<text x="${xBeamL - 110}" y="${yHighGL + 35}" font-size="10.5" font-weight="bold" fill="#dc2626">片土圧 (Pq+Py)</text>`;
    }

    // 4. 配筋の描画
    // スターラップ (矩形枠線、かぶり厚さ約40mm考慮)
    const coverSide = 40 * scale;
    const coverTop = 40 * scale;
    const coverBot = 50 * scale;
    const xStpL = xBeamL + coverSide;
    const xStpR = xBeamR - coverSide;
    const yStpTop = yBeamTop + coverTop;
    const yStpBot = yBase - coverBot;

    if (xStpR > xStpL && yStpBot > yStpTop) {
        svg += `<rect x="${xStpL}" y="${yStpTop}" width="${xStpR - xStpL}" height="${yStpBot - yStpTop}" fill="none" stroke="#2563eb" stroke-width="2" stroke-dasharray="3,2" />`;
    }

    // 上主筋 (赤丸)
    const yRebarTop = yBeamTop + 45 * scale;
    const topRebarCount = (parseInt(opt.topCount1, 10) || 1) + (opt.topDia2 !== 'none' ? (parseInt(opt.topCount2, 10) || 0) : 0);
    const topSpacing = topRebarCount > 1 ? (xStpR - xStpL) / (topRebarCount - 1) : 0;
    for (let i = 0; i < topRebarCount; i++) {
        const rx = topRebarCount === 1 ? (xStpL + xStpR) / 2 : xStpL + i * topSpacing;
        svg += `<circle cx="${rx}" cy="${yRebarTop}" r="4.5" fill="#dc2626" stroke="#ffffff" stroke-width="1.2" />`;
    }

    // 下主筋 (赤丸)
    const yRebarBot = yBase - 55 * scale;
    const botRebarCount = (parseInt(opt.botCount1, 10) || 1) + (opt.botDia2 !== 'none' ? (parseInt(opt.botCount2, 10) || 0) : 0);
    const botSpacing = botRebarCount > 1 ? (xStpR - xStpL) / (botRebarCount - 1) : 0;
    for (let i = 0; i < botRebarCount; i++) {
        const rx = botRebarCount === 1 ? (xStpL + xStpR) / 2 : xStpL + i * botSpacing;
        svg += `<circle cx="${rx}" cy="${yRebarBot}" r="4.5" fill="#dc2626" stroke="#ffffff" stroke-width="1.2" />`;
    }

    // 側面筋 (ねじり補強軸筋: 青丸)
    const sideCount = parseInt(opt.sideCount, 10) || 4;
    const pairs = Math.floor(sideCount / 2);
    if (pairs > 0 && yStpBot > yStpTop + 50) {
        const sideSpacingY = (yStpBot - yStpTop) / (pairs + 1);
        for (let p = 1; p <= pairs; p++) {
            const sy = yStpTop + p * sideSpacingY;
            svg += `<circle cx="${xStpL + 2}" cy="${sy}" r="3.5" fill="#2563eb" />`;
            svg += `<circle cx="${xStpR - 2}" cy="${sy}" r="3.5" fill="#2563eb" />`;
        }
    }

    // 底盤筋 (緑丸またはライン)
    const yBaseRebar = yBase - (dtb / 2) * scale;
    const slabRebarSpan = xSlabR - xSlabL - 20;
    const slabDotCount = Math.max(3, Math.min(8, Math.floor((B_total / opt.basePitch) * 0.8)));
    const slabSpacing = slabRebarSpan / (slabDotCount - 1);
    for (let i = 0; i < slabDotCount; i++) {
        const sx = xSlabL + 10 + i * slabSpacing;
        svg += `<circle cx="${sx}" cy="${yBaseRebar}" r="3" fill="#15803d" />`;
    }
    // 底盤横筋ライン
    svg += `<line x1="${xSlabL + 10}" y1="${yBaseRebar + 4}" x2="${xSlabR - 10}" y2="${yBaseRebar + 4}" stroke="#15803d" stroke-width="1.5" />`;

    // 5. 寸法線の描画
    // 幅 b (梁上端)
    const yDimTop = yBeamTop - 18;
    svg += drawDimension(xBeamL, xBeamR, yDimTop, `b=${b}`, true);

    // せい D (梁側面)
    const xDimD = (highGroundIsRight ? xBeamL - leftOverhang : xBeamR + rightOverhang) - 25;
    svg += drawDimension(yBeamTop, yBase, xDimD, `D=${D}`, false);

    // 底盤全幅 B (底盤下)
    const yDimBottom = yBase + 24;
    svg += drawDimension(xSlabL, xSlabR, yDimBottom, `B=${B_total} (LB=${LB}${a > 0 ? `, a=${a}` : ''})`, true);

    // 底盤厚 dtb
    const xDimDtb = xSlabR + 18;
    if (rightOverhang > 0) {
        svg += drawDimension(ySlabTop, yBase, xDimDtb, `dtb=${dtb}`, false);
    }

    // 地盤差 Δh
    const xDimDeltaH = (highGroundIsRight ? svgWidth - 30 : 25);
    svg += drawDimension(yHighGL, yLowGL, xDimDeltaH, `Δh=${deltaH}`, false);

    // 6. 配筋ラベル
    svg += `<g font-size="10" fill="#1e293b" font-weight="bold">
        <text x="${xBeamR + 12}" y="${yBeamTop + 14}">上主筋: ${formatRebarDesc(opt.topDia1, opt.topCount1, opt.topDia2, opt.topCount2)}</text>
        <text x="${xBeamR + 12}" y="${yBeamTop + 32}">STP: ${opt.stpDia}@${opt.stpPitch}</text>
        <text x="${xBeamR + 12}" y="${yBeamTop + 50}">側面筋: ${opt.sideCount}-${opt.sideDia}</text>
        <text x="${xBeamR + 12}" y="${yRebarBot + 4}">下主筋: ${formatRebarDesc(opt.botDia1, opt.botCount1, opt.botDia2, opt.botCount2)}</text>
        <text x="${xSlabL}" y="${yBase - 8}" font-size="9.5" fill="#15803d">底盤: ${opt.baseDia}@${opt.basePitch}</text>
    </g>`;

    svg += `</svg>`;
    container.innerHTML = svg;
}

/**
 * 寸法線のSVGタグ生成ヘルパー
 */
function drawDimension(start, end, pos, label, isHorizontal) {
    if (isHorizontal) {
        const x1 = start;
        const x2 = end;
        const y = pos;
        return `<g stroke="#475569" stroke-width="1.2">
            <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" marker-start="url(#dim_arrow)" marker-end="url(#dim_arrow)" />
            <line x1="${x1}" y1="${y - 4}" x2="${x1}" y2="${y + 4}" />
            <line x1="${x2}" y1="${y - 4}" x2="${x2}" y2="${y + 4}" />
            <text x="${(x1 + x2) / 2}" y="${y - 4}" font-size="9.5" font-weight="bold" fill="#334155" text-anchor="middle" stroke="none">${label}</text>
        </g>`;
    } else {
        const y1 = start;
        const y2 = end;
        const x = pos;
        return `<g stroke="#475569" stroke-width="1.2">
            <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" marker-start="url(#dim_arrow)" marker-end="url(#dim_arrow)" />
            <line x1="${x - 4}" y1="${y1}" x2="${x + 4}" y2="${y1}" />
            <line x1="${x - 4}" y1="${y2}" x2="${x + 4}" y2="${y2}" />
            <text x="${x - 6}" y="${(y1 + y2) / 2 + 3}" font-size="9" font-weight="bold" fill="#334155" text-anchor="end" stroke="none">${label}</text>
        </g>`;
    }
}
