/**
 * katadatsu_kisohari.js
 * 片土圧基礎梁の計算書 (mdo3 構造計算補助ツール v2.2.27)
 * 準拠基準: 「第5章 基礎ただし書計算基準」
 * 機能: 
 *  1. 基礎梁スパン長期曲げ検定 (下主筋負担)
 *  2. 立ち上がり面外曲げ検定 (縦筋・スターラップ負担: シングル/ダブル配筋)
 *  3. スラブ定着飲み込み長 ＆ 底盤根元曲げ検定
 *  4. ねじり一次検定 (無補強コンクリート基準)
 *  5. ねじり二次検定 (補強筋寄与終局耐力基準)
 *  6. 基礎全体の滑動検定 (F/P ≧ 1.50)
 *  7. 動的可変SVG断面図 (シングル/ダブル配筋・定着足・土圧反転)
 *  8. A4帳票2枚出力・JSONデータ保存復元
 */

const REBAR_AREAS = {
    'none': 0,
    'D10': 71.3,
    'D13': 126.7,
    'D16': 198.6
};

const REBAR_DIAMETERS = {
    'none': 0,
    'D10': 10,
    'D13': 13,
    'D16': 16
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
    const partName = document.getElementById('input_part_name')?.value || '片土圧基礎梁 FG1 (X1通り Y1-Y3)';
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

    // 立ち上がり配筋 ＆ せん断補強筋(STP / 縦筋兼用)
    const stemRebarType = document.getElementById('input_stem_rebar_type')?.value || 'single';
    const stpDia = document.getElementById('input_stp_dia')?.value || document.getElementById('input_vert_dia')?.value || 'D10';
    const stpPitch = parseFloat(document.getElementById('input_stp_pitch')?.value) || parseFloat(document.getElementById('input_vert_pitch')?.value) || 200;
    const vertDia = stpDia;
    const vertPitch = stpPitch;
    const stemMomentModel = document.getElementById('input_stem_moment_model')?.value || 'cantilever';

    // スラブ飲み込み定着
    const anchorHook = document.getElementById('input_anchor_hook')?.value || 'hook';
    const L_bend = parseFloat(document.getElementById('input_L_bend')?.value) || 250;

    // 基礎梁主筋
    const topDia1 = document.getElementById('input_top_dia1')?.value || 'D13';
    const topCount1 = parseInt(document.getElementById('input_top_count1')?.value, 10) || 1;
    const topDia2 = document.getElementById('input_top_dia2')?.value || 'none';
    const topCount2 = parseInt(document.getElementById('input_top_count2')?.value, 10) || 0;
    const As_top = calcRebarArea(topDia1, topCount1, topDia2, topCount2);

    const botDia1 = document.getElementById('input_bot_dia1')?.value || 'D13';
    const botCount1 = parseInt(document.getElementById('input_bot_count1')?.value, 10) || 1;
    const botDia2 = document.getElementById('input_bot_dia2')?.value || 'none';
    const botCount2 = parseInt(document.getElementById('input_bot_count2')?.value, 10) || 0;
    const As_bot = calcRebarArea(botDia1, botCount1, botDia2, botCount2);

    // スターラップ断面積 (STP)
    const aw1 = REBAR_AREAS[stpDia] || 71.3;
    // 立ち上がりがダブル配筋の場合はスターラップもダブル（2組または複スターラップ）
    const aw = (stemRebarType === 'double') ? aw1 * 4 : aw1 * 2;

    // 側面筋 (ねじり補強軸筋)
    const sideDia = document.getElementById('input_side_dia')?.value || 'D10';
    const sideCount = parseInt(document.getElementById('input_side_count')?.value, 10) || 4;
    const As_side = (REBAR_AREAS[sideDia] || 71.3) * sideCount;
    const Asw = As_top + As_bot + As_side;

    // 底盤配筋
    const baseDia = document.getElementById('input_base_dia')?.value || 'D13';
    const basePitch = parseFloat(document.getElementById('input_base_pitch')?.value) || 150;
    const baseType = document.getElementById('input_base_type')?.value || 'single';

    // 2. 土圧の算定 (PDF P.201)
    const H_soil = deltaH + Df; // m (全土被り深さ)
    const Pq = q2 * Ko * H_soil; // kN/m (載荷による横土圧)
    const Tq = Pq * (H_soil / 2); // kN・m/m (載荷土圧による転倒モーメント)
    const Py = 0.5 * gammaSoil * Math.pow(H_soil, 2) * Ko; // kN/m (背面土横土圧)
    const Ty = Py * (H_soil / 3); // kN・m/m (土圧による転倒モーメント)
    const T2 = Tq + Ty; // kN・m/m (合計土圧モーメント)

    // 3. 抵抗モーメント T1 の算定 (PDF P.200-202)
    const gammaConcrete = 24.0; // kN/m3
    const W1 = gammaConcrete * (B_total / 1000) * (dtb / 1000); // kN/m
    const e1 = ((LB - a) / 2) / 1000; // m

    let a_soil = a;
    let lb_soil = LB;
    if (earthDirection === 'building_to_site') {
        a_soil = LB;
        lb_soil = a;
    }

    const W2 = gammaSoil * (a_soil / 1000) * deltaH; // kN/m
    const e2 = (b / 2 + a_soil / 2) / 1000; // m
    const W3 = q2 * (a_soil / 1000); // kN/m
    const e3 = e2;
    const WF = gammaConcrete * (b / 1000) * (Deff / 1000);
    const e4 = 0;
    const W5 = q1 * (lb_soil / 1000);
    const e5 = -(b / 2 + lb_soil / 2) / 1000;

    const T1_raw = (W1 * e1 + W2 * e2 + W3 * e3 + WF * e4 + W5 * e5);
    const T1 = Math.max(0, T1_raw);

    // 4. 設計用断面力の算定
    const T_net = Math.max(0, T2 - resMomentFactor * T1);
    const LT = T_net * (Lo / 2); // kN・m
    const LQ = Wb * (Lw / 2); // kN
    const LM = (1 / 8) * Wb * Math.pow(Lw, 2); // kN・m (梁スパン方向の曲げモーメント)

    // 5. 各種許容耐力・検定の計算

    // 【検定1】基礎梁スパン長期曲げ検定 (下主筋負担) (PDF P.198)
    const d = Deff - 70; // mm
    const j = (7 / 8) * d; // mm
    const LMa = As_bot * Lft * j * 1e-6; // kN・m
    const bendRatio = LMa > 0 ? (LM / LMa) : 999;
    const isBendOk = bendRatio <= 1.0;

    // 【検定2】立ち上がり面外曲げ検定 (縦筋・スターラップ負担)
    // モーメント算定: 片持ち梁モデル vs 3辺固定スラブモデル
    const M_stem_cant = T2; // kN・m/m (安全側片持ちモデル: 全土圧モーメント)
    // 3辺固定スラブモデル (PDF P.208-209 式)
    const ho = H_soil;
    const Wq = q2 * 0.5;
    const Wy = gammaSoil * ho * 0.5;
    const spanRatio = Lo / ho;
    let C_Mx11 = 0.085;
    let C_Mx12 = 0.008;
    if (spanRatio < 1.0) {
        C_Mx11 = 0.085;
        C_Mx12 = 0.008 + 0.014 * (spanRatio - 0.5);
    } else if (spanRatio < 2.7) {
        C_Mx11 = 0.085 + 0.209 * (spanRatio - 1.0);
        C_Mx12 = 0.036 + 0.049 * (spanRatio - 1.0);
    } else if (spanRatio < 4.0) {
        C_Mx11 = 0.44;
        C_Mx12 = 0.144;
    } else {
        C_Mx11 = 0.50;
        C_Mx12 = 0.333;
    }
    const Mx11 = C_Mx11 * Wq * Math.pow(ho, 2);
    const Mx12 = C_Mx12 * Wy * Math.pow(ho, 2);
    const M_stem_slab = Mx11 + Mx12;

    const M_stem = (stemMomentModel === 'cantilever') ? M_stem_cant : M_stem_slab;

    // 縦筋の耐力算定 (単位幅 1m あたり)
    const vertAt = REBAR_AREAS[vertDia] || 71.3;
    const As_vert_1m = vertAt * (1000 / vertPitch); // mm2/m
    let d_stem = (b / 2); // シングル配筋時の有効せい (中心配筋: b/2)
    let As_stem = As_vert_1m;

    if (stemRebarType === 'double') {
        // ダブル配筋: 土圧引張側の縦筋有効せいは b - 40mm
        d_stem = Math.max(50, b - 40);
        As_stem = As_vert_1m; // 土圧引張側1列の断面積
    }

    const j_stem = (7 / 8) * d_stem;
    const M_stema = As_stem * Lft * j_stem * 1e-6; // kN・m/m
    const stemRatio = M_stema > 0 ? (M_stem / M_stema) : 999;
    const isStemBendOk = stemRatio <= 1.0;

    // 【検定3】縦筋のスラブ内定着（飲み込み）および底盤根元曲げ検定
    const vertDb = REBAR_DIAMETERS[vertDia] || 10;
    // 必要定着長: フック付き 25d, ストレート 35d
    const L_req = (anchorHook === 'hook') ? (25 * vertDb) : (35 * vertDb);
    // 確保定着長: 底盤への垂直飲み込み深さ(dtb - 50) + 水平曲げ出し長(L_bend)
    const L_vert = Math.max(50, dtb - 50);
    const L_act = L_vert + L_bend;
    const isAnchorOk = L_act >= L_req;

    // 底盤スラブ根元曲げ検定
    // 立ち上がりからの伝達モーメントおよび底面接地圧によるスラブ根元曲げ
    const q_ground = (Wb / (B_total / 1000)); // 概略等分布接地圧 kN/m2
    const overhangMax = Math.max(LB, a) / 1000; // m
    const M_slab_toe = 0.5 * q_ground * Math.pow(overhangMax, 2);
    const M_slab_trans = M_stem * 0.85;
    const M_slab = Math.max(M_slab_toe, M_slab_trans);

    const baseAt = REBAR_AREAS[baseDia] || 126.7;
    const baseMult = (baseType === 'double') ? 2 : 1;
    const As_base_1m = baseAt * (1000 / basePitch) * baseMult;
    const d_slab = Math.max(50, dtb - 50);
    const j_slab = (7 / 8) * d_slab;
    const M_slaba = As_base_1m * Lft * j_slab * 1e-6; // kN・m/m
    const slabRatio = M_slaba > 0 ? (M_slab / M_slaba) : 999;
    const isSlabBendOk = slabRatio <= 1.0;
    const isAnchorTotalOk = isAnchorOk && isSlabBendOk;

    // 【検定4】ねじり一次検定 (PDF P.201)
    const LTa1 = (1.15 / 3) * Math.pow(b, 2) * Deff * Lfs * 1e-6;
    const LQa1 = b * j * Lfs * 1e-3;
    const check1_T_term = LTa1 > 0 ? Math.pow(LT / LTa1, 2) : 999;
    const check1_Q_term = LQa1 > 0 ? Math.pow(LQ / LQa1, 2) : 999;
    const check1 = check1_T_term + check1_Q_term;
    const isCheck1Ok = check1 <= 1.0;

    // せん断補強筋（STP）間隔規定
    const x_limit1 = aw / (0.002 * b);
    const x_limit2 = Deff / 2;
    const x_limit = Math.min(x_limit1, x_limit2);
    const isStpSpacingOk = stpPitch <= x_limit;

    // 【検定5】ねじり二次検定 (PDF P.202-203)
    const D_core = Math.max(50, Deff - 100);
    const b_core = Math.max(30, b - 90);
    const Ao = D_core * b_core;
    const psi_o = (D_core * 2) + (b_core * 2);

    const LTo1 = (Asw * 2 * Lft * Ao * 1e-6) / psi_o;
    const LTo2 = (aw1 * 2 * Lfwt * Ao * 1e-6) / stpPitch;
    const LTa2 = Math.min(LTo1, LTo2);

    const d_m = d / 1000;
    const m_qd = (LQ * d_m > 0) ? (LM / (LQ * d_m)) : 1.0;
    let alpha = 4 / (m_qd + 1);
    if (alpha < 1.0) alpha = 1.0;
    if (alpha > 2.0) alpha = 2.0;

    const pw = aw / (b * stpPitch);
    const pw_diff = Math.max(0, pw - 0.002);
    const LQa2 = b * j * (alpha * Lfs + 0.5 * Lfwt * pw_diff) * 1e-3;

    const check2_T_term = LTa2 > 0 ? Math.pow(LT / LTa2, 2) : 999;
    const check2_Q_term = LQa2 > 0 ? Math.pow(LQ / LQa2, 2) : 999;
    const check2 = check2_T_term + check2_Q_term;
    const isCheck2Ok = check2 <= 1.0;

    // 【検定6】滑動検定 (PDF P.210)
    const P_total = (Pq + Py) * L;
    const F_fric = mu * sigmaW;
    const slidingSafetyFactor = P_total > 0 ? (F_fric / P_total) : 999;
    const isSlidingOk = slidingSafetyFactor >= 1.50;

    // 画面および印刷エリアへの結果反映
    renderUIResults({
        partName, b, D: Deff, LB, a, dtb, B_total, Lw, Lo, L,
        earthDirection, deltaH, Df, gammaSoil, Ko, q2, q1, mu,
        Wb, sigmaW, resMomentFactor, fc, Lfs, Lft, Lfwt,
        stemRebarType, vertDia, vertPitch, stemMomentModel, anchorHook, L_bend,
        topDia1, topCount1, topDia2, topCount2, As_top,
        botDia1, botCount1, botDia2, botCount2, As_bot,
        stpDia, stpPitch, aw1, aw, x_limit, isStpSpacingOk,
        sideDia, sideCount, As_side, Asw,
        baseDia, basePitch, baseType,
        Pq, Py, Tq, Ty, T2, W1, e1, W2, e2, W3, e3, WF, e4, W5, e5, T1, LT, LQ, LM,
        d, j, LMa, bendRatio, isBendOk,
        M_stem, d_stem, j_stem, As_stem, M_stema, stemRatio, isStemBendOk,
        vertDb, L_req, L_vert, L_act, isAnchorOk,
        M_slab, As_base_1m, d_slab, j_slab, M_slaba, slabRatio, isSlabBendOk, isAnchorTotalOk,
        LTa1, LQa1, check1_T_term, check1_Q_term, check1, isCheck1Ok,
        D_core, b_core, Ao, psi_o, LTo1, LTo2, LTa2, alpha, pw, pw_diff, LQa2, check2_T_term, check2_Q_term, check2, isCheck2Ok,
        P_total, F_fric, slidingSafetyFactor, isSlidingOk
    });

    // 動的SVG断面図の描画 (画面プレビュー用 & 印刷用)
    const svgOpts = {
        b, D: Deff, LB, a, dtb, B_total, deltaH, Df, earthDirection,
        stemRebarType, vertDia, vertPitch, L_bend,
        topDia1, topCount1, topDia2, topCount2,
        botDia1, botCount1, botDia2, botCount2,
        stpDia, stpPitch, sideDia, sideCount,
        baseDia, basePitch, baseType
    };

    renderDynamicSVG(Object.assign({}, svgOpts, { containerId: 'preview_svg_container' }));
    renderDynamicSVG(Object.assign({}, svgOpts, { containerId: 'print_svg_container' }));
}

/**
 * 画面テキストおよび判定結果の更新
 */
function renderUIResults(res) {
    // 総括判定バッジ (6大検定)
    updateBadge('badge_bend', res.isBendOk, `検定比 ${res.bendRatio.toFixed(3)}`);
    updateBadge('badge_stem_bend', res.isStemBendOk, `検定比 ${res.stemRatio.toFixed(3)}`);
    updateBadge('badge_anchor', res.isAnchorTotalOk, res.isAnchorOk ? `定着長 ${res.L_act}mm ≧ ${res.L_req}mm` : `定着長不足 (${res.L_act}<${res.L_req})`);
    updateBadge('badge_torsion1', res.isCheck1Ok, `検定値 ${res.check1.toFixed(3)}`);
    updateBadge('badge_torsion2', res.isCheck2Ok, `検定値 ${res.check2.toFixed(3)}`);
    updateBadge('badge_sliding', res.isSlidingOk, `安全率 ${res.slidingSafetyFactor.toFixed(2)}`);

    // 配筋形式バッジ
    setElemText('disp_stem_type_badge', res.stemRebarType === 'double' ? 'ダブル配筋 (高耐力)' : 'シングル配筋');
    setElemText('disp_svg_stem_badge', res.stemRebarType === 'double' ? 'ダブル配筋 ＆ 定着足' : 'シングル配筋 ＆ 定着足');

    // 鉄筋合計断面積のリアルタイム表示
    setElemText('disp_as_top', `${res.As_top.toFixed(1)} mm²`);
    setElemText('disp_as_bot', `${res.As_bot.toFixed(1)} mm²`);

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

    // 検定1: 梁スパン曲げ
    setElemText('res_LMa', res.LMa.toFixed(2));
    setElemText('res_bend_ratio', res.bendRatio.toFixed(3));
    setElemText('res_bend_judge', res.isBendOk ? 'OK' : 'NG');
    styleJudge('res_bend_judge', res.isBendOk);

    // 検定2: 立ち上がり面外曲げ
    setElemText('res_M_stem', res.M_stem.toFixed(2));
    setElemText('res_M_stema', res.M_stema.toFixed(2));
    setElemText('res_stem_ratio', res.stemRatio.toFixed(3));
    setElemText('res_stem_judge', res.isStemBendOk ? 'OK' : 'NG');
    styleJudge('res_stem_judge', res.isStemBendOk);

    // 検定3: スラブ定着飲み込み ＆ 根元曲げ
    setElemText('res_L_act', res.L_act.toString());
    setElemText('res_L_req', res.L_req.toString());
    setElemText('res_anchor_judge', res.isAnchorOk ? 'OK (定着長十分)' : 'NG (定着長不足)');
    styleJudge('res_anchor_judge', res.isAnchorOk);

    setElemText('res_M_slab', res.M_slab.toFixed(2));
    setElemText('res_M_slaba', res.M_slaba.toFixed(2));
    setElemText('res_slab_ratio', res.slabRatio.toFixed(3));
    setElemText('res_slab_judge', res.isSlabBendOk ? 'OK' : 'NG');
    styleJudge('res_slab_judge', res.isSlabBendOk);

    // 検定4: ねじり一次
    setElemText('res_LTa1', res.LTa1.toFixed(2));
    setElemText('res_LQa1', res.LQa1.toFixed(2));
    setElemText('res_check1', res.check1.toFixed(3));
    setElemText('res_check1_judge', res.isCheck1Ok ? 'OK' : 'NG');
    styleJudge('res_check1_judge', res.isCheck1Ok);
    setElemText('res_stp_limit', res.x_limit.toFixed(1));
    setElemText('res_stp_judge', res.isStpSpacingOk ? 'OK (@規定合致)' : 'NG (ピッチ超過)');
    styleJudge('res_stp_judge', res.isStpSpacingOk);

    // 検定5: ねじり二次
    setElemText('res_Ao', res.Ao.toLocaleString());
    setElemText('res_psi_o', res.psi_o.toLocaleString());
    setElemText('res_LTo1', res.LTo1.toFixed(2));
    setElemText('res_LTo2', res.LTo2.toFixed(2));
    setElemText('res_LTa2', res.LTa2.toFixed(2));
    setElemText('res_LQa2', res.LQa2.toFixed(2));
    setElemText('res_check2', res.check2.toFixed(3));
    setElemText('res_check2_judge', res.isCheck2Ok ? 'OK' : 'NG');
    styleJudge('res_check2_judge', res.isCheck2Ok);

    // 検定6: 滑動
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
    const proj = document.getElementById('g_project')?.value || '片土圧基礎梁検討工事';
    const date = document.getElementById('g_date')?.value || new Date().toISOString().split('T')[0];
    const eng = document.getElementById('g_engineer')?.value || '-';

    setElemText('print_g_project', proj);
    setElemText('print_g_project_p2', proj);
    setElemText('print_g_date', date);
    setElemText('print_g_engineer', eng);
    setElemText('print_part_name', res.partName);
    setElemText('print_part_name_p2', res.partName);

    // 総括判定バッジ (Page 1)
    setPillJudge('p_bend_badge', res.isBendOk);
    setPillJudge('p_stem_badge', res.isStemBendOk);
    setPillJudge('p_anchor_badge', res.isAnchorTotalOk);
    setPillJudge('p_check1_badge', res.isCheck1Ok);
    setPillJudge('p_check2_badge', res.isCheck2Ok);
    setPillJudge('p_sliding_badge', res.isSlidingOk);

    // 諸元テーブル
    setElemText('p_dim', `幅 b=${res.b}mm, せい D=${res.D}mm, スラブ幅 B=${res.B_total}mm (つま先 LB=${res.LB}mm, かかと a=${res.a}mm, 厚=${res.dtb}mm)`);
    setElemText('p_soil', `地盤差 Δh=${res.deltaH}m, 根入れ Df=${res.Df}m, 土圧方向: ${res.earthDirection === 'site_to_building' ? '敷地側→建物側' : '建物側→敷地側'}, γ=${res.gammaSoil}kN/m³, Ko=${res.Ko}, q2=${res.q2}kN/m²`);
    setElemText('p_stem_spec', `立ち上がり: ${res.stemRebarType === 'double' ? 'ダブル配筋' : 'シングル配筋'}, 縦筋: ${res.vertDia}@${res.vertPitch} (定着: ${res.anchorHook === 'hook' ? 'フック25d' : 'ストレート35d'}, 水平Lbend=${res.L_bend}mm)`);
    setElemText('p_rebar_top', `${formatRebarDesc(res.topDia1, res.topCount1, res.topDia2, res.topCount2)} (As=${res.As_top.toFixed(1)}mm²)`);
    setElemText('p_rebar_bot', `${formatRebarDesc(res.botDia1, res.botCount1, res.botDia2, res.botCount2)} (As=${res.As_bot.toFixed(1)}mm²)`);
    setElemText('p_rebar_stp', `${res.stpDia}@${res.stpPitch} (${res.stemRebarType === 'double' ? 'ダブル組' : '標準組'} aw=${res.aw.toFixed(1)}mm²)`);
    setElemText('p_rebar_side', `${res.sideCount}-${res.sideDia} (Asw合計=${res.Asw.toFixed(1)}mm²)`);
    setElemText('p_rebar_base', `${res.baseDia}@${res.basePitch} (${res.baseType === 'single' ? 'シングル' : 'ダブル'})`);
    setElemText('p_material', `Fc=${res.fc}N/mm² (Lfs=${res.Lfs}N/mm²), 鉄筋 SD295A (Lft=Lfwt=${res.Lft}N/mm²)`);

    // 断面力
    setElemText('p_T2', `${res.T2.toFixed(2)} kN·m/m (Pq=${res.Pq.toFixed(2)}, Py=${res.Py.toFixed(2)})`);
    setElemText('p_T1', `${res.T1.toFixed(2)} kN·m/m (考慮係数: ${res.resMomentFactor})`);
    setElemText('p_M_stem', `${res.M_stem.toFixed(2)} kN·m/m`);
    setElemText('p_M_stem_formula', res.stemMomentModel === 'cantilever' ? '片持ち梁モデル (土圧全量T2)' : '3辺固定スラブモデル (Mx11+Mx12)');
    setElemText('p_LT', `${res.LT.toFixed(2)} kN·m`);
    setElemText('p_LQ', `${res.LQ.toFixed(2)} kN`);
    setElemText('p_LM', `${res.LM.toFixed(2)} kN·m`);

    // Page 2 各検定詳細
    // (1) 梁スパン曲げ
    setElemText('p_beam_d', res.d.toString());
    setElemText('p_beam_j', res.j.toFixed(1));
    setElemText('p_LMa', `${res.LMa.toFixed(2)} kN·m`);
    setElemText('p_bend_ratio', `${res.bendRatio.toFixed(3)}`);
    setElemText('p_bend_judge', res.isBendOk ? '適合 OK' : '不適合 NG');

    // (2) 立ち上がり面外曲げ
    setElemText('p_stem_type_text', res.stemRebarType === 'double' ? 'ダブル配筋' : 'シングル配筋');
    setElemText('p_stem_d', res.d_stem.toFixed(1));
    setElemText('p_M_stema', `${res.M_stema.toFixed(2)} kN·m/m`);
    setElemText('p_stem_ratio', `${res.stemRatio.toFixed(3)}`);
    setElemText('p_stem_judge', res.isStemBendOk ? '適合 OK' : '不適合 NG');

    // (3) スラブ定着 ＆ 根元曲げ
    setElemText('p_L_req', res.L_req.toString());
    setElemText('p_L_act', res.L_act.toString());
    setElemText('p_anchor_judge', res.isAnchorOk ? '適合 OK' : '不足 NG');
    setElemText('p_M_slab', `${res.M_slab.toFixed(2)} kN·m/m`);
    setElemText('p_M_slaba', `${res.M_slaba.toFixed(2)} kN·m/m`);
    setElemText('p_slab_judge', res.isSlabBendOk ? '適合 OK' : '不適合 NG');

    // (4) ねじり一次
    setElemText('p_LTa1', `${res.LTa1.toFixed(2)} kN·m`);
    setElemText('p_LQa1', `${res.LQa1.toFixed(2)} kN`);
    setElemText('p_check1', `${res.check1.toFixed(3)}`);
    setElemText('p_check1_judge', res.isCheck1Ok ? '適合 OK' : '不適合 NG');

    // (5) ねじり二次
    setElemText('p_Ao', `${res.Ao.toLocaleString()} mm²`);
    setElemText('p_psi_o', `${res.psi_o.toLocaleString()} mm`);
    setElemText('p_LTo1', `${res.LTo1.toFixed(2)} kN·m`);
    setElemText('p_LTo2', `${res.LTo2.toFixed(2)} kN·m`);
    setElemText('p_LTa2', `${res.LTa2.toFixed(2)} kN·m`);
    setElemText('p_LQa2', `${res.LQa2.toFixed(2)} kN`);
    setElemText('p_check2', `${res.check2.toFixed(3)}`);
    setElemText('p_check2_judge', res.isCheck2Ok ? '適合 OK' : '不適合 NG');

    // 滑動
    setElemText('p_P_total', `${res.P_total.toFixed(2)} kN`);
    setElemText('p_F_fric', `${res.F_fric.toFixed(2)} kN`);
    setElemText('p_sliding_sf', `${res.slidingSafetyFactor.toFixed(2)}`);
    setElemText('p_sliding_judge', res.isSlidingOk ? '適合 OK' : '不適合 NG');
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
 * 動的SVG断面図の描画 (可変形状・シングル/ダブル配筋・定着足・寸法線)
 */
function renderDynamicSVG(opt) {
    const container = document.getElementById(opt.containerId);
    if (!container) return;

    const b = opt.b;
    const D = opt.D;
    const LB = opt.LB;
    const a = opt.a;
    const dtb = opt.dtb;
    const B_total = opt.B_total;
    const deltaH = opt.deltaH * 1000;
    const Df = opt.Df * 1000;
    const isSiteToBldg = opt.earthDirection === 'site_to_building';
    const isDouble = opt.stemRebarType === 'double';
    const L_bend = opt.L_bend || 200;

    const svgWidth = 600;
    const svgHeight = 440;
    const paddingX = 70;
    const paddingY = 50;

    const totalContentWidth = B_total + 800;
    const totalContentHeight = Math.max(D, deltaH + Df) + dtb + 400;
    const scaleX = (svgWidth - paddingX * 2) / totalContentWidth;
    const scaleY = (svgHeight - paddingY * 2) / totalContentHeight;
    const scale = Math.min(scaleX, scaleY, 0.22);

    const originX = svgWidth / 2 + (isSiteToBldg ? 40 : -40);
    const originY = svgHeight - paddingY - 40;

    let leftOverhang, rightOverhang;
    let highGroundIsRight = true;

    if (isSiteToBldg) {
        leftOverhang = LB;
        rightOverhang = a;
        highGroundIsRight = true;
    } else {
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

    // 1. 地盤・土圧ハッチング
    if (highGroundIsRight) {
        svg += `<polygon points="${xBeamR},${ySlabTop} ${xSlabR},${ySlabTop} ${xSlabR},${yBase} ${svgWidth - 20},${yBase} ${svgWidth - 20},${yHighGL} ${xBeamR},${yHighGL}" fill="url(#hatch_soil)" opacity="0.6" />`;
        svg += `<line x1="${xBeamR}" y1="${yHighGL}" x2="${svgWidth - 10}" y2="${yHighGL}" stroke="#15803d" stroke-width="2.5" />`;
        svg += `<text x="${svgWidth - 95}" y="${yHighGL - 6}" font-size="10.5" font-weight="bold" fill="#15803d">▽ GL(上) 敷地側</text>`;

        svg += `<line x1="${xBeamL}" y1="${yLowGL}" x2="20" y2="${yLowGL}" stroke="#15803d" stroke-width="2" stroke-dasharray="4,3" />`;
        svg += `<text x="25" y="${yLowGL - 6}" font-size="10.5" font-weight="bold" fill="#15803d">▽ GL(下) 建物側</text>`;
    } else {
        svg += `<polygon points="${xBeamL},${ySlabTop} ${xSlabL},${ySlabTop} ${xSlabL},${yBase} 20,${yBase} 20,${yHighGL} ${xBeamL},${yHighGL}" fill="url(#hatch_soil)" opacity="0.6" />`;
        svg += `<line x1="${xBeamL}" y1="${yHighGL}" x2="20" y2="${yHighGL}" stroke="#15803d" stroke-width="2.5" />`;
        svg += `<text x="25" y="${yHighGL - 6}" font-size="10.5" font-weight="bold" fill="#15803d">▽ GL(上) 建物側</text>`;

        svg += `<line x1="${xBeamR}" y1="${yLowGL}" x2="${svgWidth - 10}" y2="${yLowGL}" stroke="#15803d" stroke-width="2" stroke-dasharray="4,3" />`;
        svg += `<text x="${svgWidth - 120}" y="${yLowGL - 6}" font-size="10.5" font-weight="bold" fill="#15803d">▽ GL(下) 敷地側</text>`;
    }

    // 2. コンクリート基礎断面ポリゴン
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

    svg += `<polygon points="${pointsConcrete}" fill="#f1f5f9" stroke="#0f172a" stroke-width="2.5" />`;

    // 3. 土圧荷重矢印
    if (highGroundIsRight) {
        const arrowCount = 4;
        for (let i = 0; i <= arrowCount; i++) {
            const frac = i / arrowCount;
            const yArrow = yHighGL + (yBase - yHighGL) * (0.2 + frac * 0.75);
            const arrowLen = 30 + frac * 45;
            const xStart = xBeamR + arrowLen;
            svg += `<line x1="${xStart}" y1="${yArrow}" x2="${xBeamR + 3}" y2="${yArrow}" stroke="#dc2626" stroke-width="2" marker-end="url(#arrow)" />`;
        }
        svg += `<text x="${xBeamR + 35}" y="${yHighGL + 28}" font-size="10.5" font-weight="bold" fill="#dc2626">片土圧 (Pq+Py)</text>`;
    } else {
        const arrowCount = 4;
        for (let i = 0; i <= arrowCount; i++) {
            const frac = i / arrowCount;
            const yArrow = yHighGL + (yBase - yHighGL) * (0.2 + frac * 0.75);
            const arrowLen = 30 + frac * 45;
            const xStart = xBeamL - arrowLen;
            svg += `<line x1="${xStart}" y1="${yArrow}" x2="${xBeamL - 3}" y2="${yArrow}" stroke="#dc2626" stroke-width="2" marker-end="url(#arrow)" />`;
        }
        svg += `<text x="${xBeamL - 110}" y="${yHighGL + 28}" font-size="10.5" font-weight="bold" fill="#dc2626">片土圧 (Pq+Py)</text>`;
    }

    // 4. 配筋の描画 (シングル / ダブル配筋 ＆ 定着足)
    const coverSide = 35 * scale;
    const coverTop = 40 * scale;
    const coverBot = 50 * scale;

    const xStpL = xBeamL + coverSide;
    const xStpR = xBeamR - coverSide;
    const yStpTop = yBeamTop + coverTop;
    const yStpBot = yBase - coverBot;

    // スラブ内定着足 (水平折り曲げ)
    const bendPx = L_bend * scale;
    const yAnchorFoot = yBase - coverBot;

    if (isDouble) {
        // ダブル配筋 (両側2列の縦筋ライン ＆ 定着足)
        // 左側縦筋
        svg += `<line x1="${xStpL}" y1="${yStpTop}" x2="${xStpL}" y2="${yAnchorFoot}" stroke="#b91c1c" stroke-width="2.5" />`;
        svg += `<line x1="${xStpL}" y1="${yAnchorFoot}" x2="${xStpL - bendPx}" y2="${yAnchorFoot}" stroke="#b91c1c" stroke-width="2.5" />`;
        // 右側縦筋
        svg += `<line x1="${xStpR}" y1="${yStpTop}" x2="${xStpR}" y2="${yAnchorFoot}" stroke="#b91c1c" stroke-width="2.5" />`;
        svg += `<line x1="${xStpR}" y1="${yAnchorFoot}" x2="${xStpR + (rightOverhang > 0 ? bendPx : -bendPx)}" y2="${yAnchorFoot}" stroke="#b91c1c" stroke-width="2.5" />`;

        // 外周スターラップ枠 (破線)
        if (xStpR > xStpL && yStpBot > yStpTop) {
            svg += `<rect x="${xStpL}" y="${yStpTop}" width="${xStpR - xStpL}" height="${yStpBot - yStpTop}" fill="none" stroke="#2563eb" stroke-width="1.8" stroke-dasharray="3,2" />`;
        }
    } else {
        // シングル配筋 (中央1列配筋 ＆ 定着足)
        const xCenter = (xBeamL + xBeamR) / 2;
        // 定着足は土圧に対抗する側（つま先版方向）へ曲げ出し
        const footDir = isSiteToBldg ? -1 : 1;
        svg += `<line x1="${xCenter}" y1="${yStpTop}" x2="${xCenter}" y2="${yAnchorFoot}" stroke="#b91c1c" stroke-width="2.5" />`;
        svg += `<line x1="${xCenter}" y1="${yAnchorFoot}" x2="${xCenter + footDir * bendPx}" y2="${yAnchorFoot}" stroke="#b91c1c" stroke-width="2.5" />`;

        // 中央スターラップ枠
        if (xStpR > xStpL && yStpBot > yStpTop) {
            svg += `<rect x="${xStpL}" y="${yStpTop}" width="${xStpR - xStpL}" height="${yStpBot - yStpTop}" fill="none" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="3,2" />`;
        }
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

    // 底盤筋 (緑丸およびライン)
    const yBaseRebar = yBase - (dtb / 2) * scale;
    const slabRebarSpan = xSlabR - xSlabL - 20;
    const slabDotCount = Math.max(3, Math.min(8, Math.floor((B_total / opt.basePitch) * 0.8)));
    const slabSpacing = slabRebarSpan / (slabDotCount - 1);
    for (let i = 0; i < slabDotCount; i++) {
        const sx = xSlabL + 10 + i * slabSpacing;
        svg += `<circle cx="${sx}" cy="${yBaseRebar}" r="3" fill="#15803d" />`;
    }
    svg += `<line x1="${xSlabL + 10}" y1="${yBaseRebar + 4}" x2="${xSlabR - 10}" y2="${yBaseRebar + 4}" stroke="#15803d" stroke-width="1.8" />`;

    // 5. 寸法線の描画
    const yDimTop = yBeamTop - 18;
    svg += drawDimension(xBeamL, xBeamR, yDimTop, `b=${b}`, true);

    const xDimD = (highGroundIsRight ? xBeamL - leftOverhang : xBeamR + rightOverhang) - 25;
    svg += drawDimension(yBeamTop, yBase, xDimD, `D=${D}`, false);

    const yDimBottom = yBase + 24;
    svg += drawDimension(xSlabL, xSlabR, yDimBottom, `B=${B_total} (LB=${LB}${a > 0 ? `, a=${a}` : ''})`, true);

    const xDimDtb = xSlabR + 18;
    if (rightOverhang > 0) {
        svg += drawDimension(ySlabTop, yBase, xDimDtb, `dtb=${dtb}`, false);
    }

    const xDimDeltaH = (highGroundIsRight ? svgWidth - 30 : 25);
    svg += drawDimension(yHighGL, yLowGL, xDimDeltaH, `Δh=${deltaH}`, false);

    // 6. 配筋ラベル
    svg += `<g font-size="9.5" fill="#1e293b" font-weight="bold">
        <text x="${xBeamR + 12}" y="${yBeamTop + 14}">上主筋: ${formatRebarDesc(opt.topDia1, opt.topCount1, opt.topDia2, opt.topCount2)}</text>
        <text x="${xBeamR + 12}" y="${yBeamTop + 30}">縦筋: ${opt.vertDia}@${opt.vertPitch} (${isDouble ? 'ダブル配筋' : 'シングル配筋'})</text>
        <text x="${xBeamR + 12}" y="${yBeamTop + 46}">STP: ${opt.stpDia}@${opt.stpPitch}</text>
        <text x="${xBeamR + 12}" y="${yBeamTop + 62}">側面筋: ${opt.sideCount}-${opt.sideDia}</text>
        <text x="${xBeamR + 12}" y="${yRebarBot + 4}">下主筋: ${formatRebarDesc(opt.botDia1, opt.botCount1, opt.botDia2, opt.botCount2)}</text>
        <text x="${xSlabL}" y="${yBase - 8}" font-size="9.5" fill="#15803d">底盤: ${opt.baseDia}@${opt.basePitch} / 定着足 Lbend=${L_bend}mm</text>
    </g>`;

    svg += `</svg>`;
    container.innerHTML = svg;
}

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
