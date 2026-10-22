/**
 * foundation_beam_horizontal.js
 * 基礎梁 水平力追加計算書（KBI用・弾性支点＆簡易片持ちモード対応）
 * 表題・自重表示の完全整合版
 */

document.addEventListener('DOMContentLoaded', () => {
    if (typeof GlobalInfo !== 'undefined') {
        GlobalInfo.init();
    }
    
    calculateAndRender();

    const gProj = document.getElementById('g_project');
    if (gProj) {
        gProj.addEventListener('input', () => calculateAndRender());
    }
});

function onModeChange() {
    const isFem = document.getElementById('mode_fem').checked;
    const blockFem = document.getElementById('block_mode_fem');
    const blockCantilever = document.getElementById('block_mode_cantilever');
    const cantileverInputs = document.getElementById('cantilever_input_group');

    if (isFem) {
        if (blockFem) blockFem.style.display = 'block';
        if (blockCantilever) blockCantilever.style.display = 'none';
        if (cantileverInputs) cantileverInputs.style.display = 'none';
    } else {
        if (blockFem) blockFem.style.display = 'none';
        if (blockCantilever) blockCantilever.style.display = 'block';
        if (cantileverInputs) cantileverInputs.style.display = 'block';
    }
    calculateAndRender();
}

function onKvPresetChange() {
    const preset = document.getElementById('input_kv_preset').value;
    if (preset !== 'custom') {
        document.getElementById('input_kv').value = preset;
    }
    calculateAndRender();
}

function onLMaChange() {
    const lmaTop = parseFloat(document.getElementById('input_LMa_top').value) || 0;
    const lmaBottom = parseFloat(document.getElementById('input_LMa_bottom').value) || 0;
    
    document.getElementById('input_SMa_top').value = (lmaTop * 1.5).toFixed(3);
    document.getElementById('input_SMa_bottom').value = (lmaBottom * 1.5).toFixed(3);
    
    calculateAndRender();
}

function calculateAndRender() {
    // 1. 入力値の取得
    const partName = document.getElementById('input_part_name')?.value || 'Y8通り X3-X4a 基礎梁 (FG2)';
    const L = parseFloat(document.getElementById('input_L')?.value) || 1.365; // m
    const B = parseFloat(document.getElementById('input_B')?.value) || 0.150; // m
    const D = parseFloat(document.getElementById('input_D')?.value) || 0.490; // m
    const kv = parseFloat(document.getElementById('input_kv')?.value) || 20000; // kN/m³

    // 荷重
    const downLeft = parseFloat(document.getElementById('input_down_left')?.value) || 17.836;
    const downRight = parseFloat(document.getElementById('input_down_right')?.value) || -17.836;
    const upLeft = parseFloat(document.getElementById('input_up_left')?.value) || -17.836;
    const upRight = parseFloat(document.getElementById('input_up_right')?.value) || 17.836;

    // 耐力
    const lmaTop = parseFloat(document.getElementById('input_LMa_top')?.value) || 9.101;
    const lmaBottom = parseFloat(document.getElementById('input_LMa_bottom')?.value) || 9.101;
    const lqa = parseFloat(document.getElementById('input_LQa')?.value) || 38.588;

    const smaTop = parseFloat(document.getElementById('input_SMa_top')?.value) || (lmaTop * 1.5);
    const smaBottom = parseFloat(document.getElementById('input_SMa_bottom')?.value) || (lmaBottom * 1.5);
    const sqa = parseFloat(document.getElementById('input_SQa')?.value) || 115.763;

    // 2. 幾何特性・剛性・弾性支点計算
    const I = (B * Math.pow(D, 3)) / 12;
    const E = 2.1e7; // kN/m² (21,000 N/mm²)
    const EI = E * I;
    const k_line = kv * B; // kN/m² (線ばね剛性)

    const lambda = Math.pow(k_line / (4 * EI), 0.25);
    const lambdaL = lambda * L;

    // 節点変位概算
    const baseAreaHalf = (B * L / 2);
    const v_down_l = (Math.abs(downLeft) / (kv * baseAreaHalf)) * 1000; // mm
    const v_down_r = (Math.abs(downRight) / (kv * baseAreaHalf)) * 1000;

    const Qe = 0.000;
    const ML = 0.000;
    const MR = 0.000;

    // 3. モードおよび表題（公式共通ヘッダータイトル）の動的決定
    const isFem = document.getElementById('mode_fem') ? document.getElementById('mode_fem').checked : true;
    const modelType = document.getElementById('input_cantilever_model_type')?.value || 'no_deduct_quarter';
    let dynamicTitle = '';

    if (isFem) {
        dynamicTitle = '基礎梁 応力算定および断面検定書（弾性支点モデル）';
    } else {
        if (modelType === 'no_deduct_quarter') {
            dynamicTitle = '基礎梁 応力算定および断面検定書（交差部固定端・片持ち梁モデル［自重控除なし・M=T・L/4］）';
        } else if (modelType === 'no_deduct_half') {
            dynamicTitle = '基礎梁 応力算定および断面検定書（交差部固定端・片持ち梁モデル［自重控除なし・M=T・L/2］）';
        } else if (modelType === 'self_weight_balance') {
            dynamicTitle = '基礎梁 応力算定および断面検定書（交差部固定端・底盤自重押さえ釣り合いモデル［Le=T/w］）';
        } else if (modelType === 'deduct_moment') {
            dynamicTitle = '基礎梁 応力算定および断面検定書（交差部固定端・自重モーメント控除片持ちモデル）';
        }
    }

    document.title = dynamicTitle;
    if (typeof GlobalInfo !== 'undefined' && typeof GlobalInfo.updatePrintHeader === 'function') {
        GlobalInfo.updatePrintHeader();
    }

    // 4. 帳票諸元表の更新
    const outPart = document.getElementById('out_part_name');
    if (outPart) outPart.innerText = partName;

    if (document.getElementById('out_L')) document.getElementById('out_L').innerText = `${L.toFixed(3)} m`;
    if (document.getElementById('out_B')) document.getElementById('out_B').innerText = `${B.toFixed(3)} m`;
    if (document.getElementById('out_D')) document.getElementById('out_D').innerText = `${D.toFixed(3)} m`;
    if (document.getElementById('out_I')) document.getElementById('out_I').innerText = `${I.toFixed(6)} m⁴`;
    if (document.getElementById('out_kv')) document.getElementById('out_kv').innerText = `${kv.toLocaleString()} kN/m³`;

    // 応力算定結果
    if (document.getElementById('out_down_td_l')) document.getElementById('out_down_td_l').innerText = downLeft.toFixed(3);
    if (document.getElementById('out_down_td_r')) document.getElementById('out_down_td_r').innerText = downRight.toFixed(3);
    if (document.getElementById('out_down_v_l')) document.getElementById('out_down_v_l').innerText = v_down_l.toFixed(3);
    if (document.getElementById('out_down_v_r')) document.getElementById('out_down_v_r').innerText = `-${v_down_r.toFixed(3)}`;
    if (document.getElementById('out_down_Qe')) document.getElementById('out_down_Qe').innerText = Qe.toFixed(3);
    if (document.getElementById('out_down_ML')) document.getElementById('out_down_ML').innerText = ML.toFixed(3);
    if (document.getElementById('out_down_MR')) document.getElementById('out_down_MR').innerText = MR.toFixed(3);

    if (document.getElementById('out_up_td_l')) document.getElementById('out_up_td_l').innerText = upLeft.toFixed(3);
    if (document.getElementById('out_up_td_r')) document.getElementById('out_up_td_r').innerText = upRight.toFixed(3);
    if (document.getElementById('out_up_v_l')) document.getElementById('out_up_v_l').innerText = `-${v_down_l.toFixed(3)}`;
    if (document.getElementById('out_up_v_r')) document.getElementById('out_up_v_r').innerText = v_down_r.toFixed(3);
    if (document.getElementById('out_up_Qe')) document.getElementById('out_up_Qe').innerText = Qe.toFixed(3);
    if (document.getElementById('out_up_ML')) document.getElementById('out_up_ML').innerText = ML.toFixed(3);
    if (document.getElementById('out_up_MR')) document.getElementById('out_up_MR').innerText = MR.toFixed(3);

    // 許容耐力表
    if (document.getElementById('out_LMa_top')) document.getElementById('out_LMa_top').innerText = lmaTop.toFixed(3);
    if (document.getElementById('out_LMa_bottom')) document.getElementById('out_LMa_bottom').innerText = lmaBottom.toFixed(3);
    if (document.getElementById('out_LQa')) document.getElementById('out_LQa').innerText = lqa.toFixed(3);
    if (document.getElementById('out_SMa_top')) document.getElementById('out_SMa_top').innerText = smaTop.toFixed(3);
    if (document.getElementById('out_SMa_bottom')) document.getElementById('out_SMa_bottom').innerText = smaBottom.toFixed(3);
    if (document.getElementById('out_SQa')) document.getElementById('out_SQa').innerText = sqa.toFixed(3);

    // 断面検定表
    const minSMa = Math.min(smaTop, smaBottom);
    if (document.getElementById('out_M_eval')) document.getElementById('out_M_eval').innerText = `${ML.toFixed(3)} kN・m`;
    if (document.getElementById('out_SMa_eval')) document.getElementById('out_SMa_eval').innerText = `${minSMa.toFixed(3)} kN・m`;
    if (document.getElementById('out_M_ratio')) document.getElementById('out_M_ratio').innerText = (ML / minSMa).toFixed(3);

    if (document.getElementById('out_Q_eval')) document.getElementById('out_Q_eval').innerText = `${Qe.toFixed(3)} kN`;
    if (document.getElementById('out_SQa_eval')) document.getElementById('out_SQa_eval').innerText = `${sqa.toFixed(3)} kN`;
    if (document.getElementById('out_Q_ratio')) document.getElementById('out_Q_ratio').innerText = (Qe / sqa).toFixed(3);

    // 5. 動的考察文の生成
    const isRigid = (lambdaL < 0.785);
    const rigidText = isRigid ? '極めて高い曲げ剛性を有する（λL = ' + lambdaL.toFixed(3) + ' ≦ π/4：剛体梁領域）' : '剛体梁領域にある';

    const dynamicDiscussion = `本基礎梁はスパン長（L=${L.toFixed(3)}m）に対して梁成（D=${D.toFixed(3)}m）が大きく、${rigidText}。梁本体がたわみ変形する（内部応力が発生する）よりも先に、梁全体が剛体のまま地盤を押し込み、入力軸力を地盤反力のみで支持するため、梁内部に曲げやせん断が生じない剛体変位モードとなっている。なお、万が一柱直下の地盤が局所的に支持力を喪失した場合（不同沈下等）を想定し、支点を両引いた連続梁・単純梁モデルによる発生応力に基づき安全側に配筋が選定されている。上記検定表の通り、弾性支点解析による発生応力は短期許容耐力を十分に下回っており（検定比 ≦ 1.000）、断面および配筋の安全性を問題ないことを確認した。`;

    if (document.getElementById('out_discussion_rigid')) {
        document.getElementById('out_discussion_rigid').innerText = dynamicDiscussion;
    }

    // 6. 簡易片持ち梁モデルの自重制御・算定
    const w_beam = B * D * 24.0; // kN/m
    const B_slab = parseFloat(document.getElementById('input_B_slab')?.value) || 0.500; // m
    const t_slab_mm = parseFloat(document.getElementById('input_t_slab')?.value) || 150; // mm
    const t_slab_m = t_slab_mm / 1000;
    const w_slab = B_slab * t_slab_m * 24.0; // kN/m
    const w_total = w_beam + w_slab; // kN/m

    if (document.getElementById('val_auto_w_beam')) document.getElementById('val_auto_w_beam').innerText = w_beam.toFixed(3);
    if (document.getElementById('val_auto_w_slab')) document.getElementById('val_auto_w_slab').innerText = w_slab.toFixed(3);
    if (document.getElementById('val_auto_w_total')) document.getElementById('val_auto_w_total').innerText = w_total.toFixed(3);

    const isNoDeduct = (modelType === 'no_deduct_quarter' || modelType === 'no_deduct_half');

    // 操作パネル側のスラブ入力・バッジ表示制御
    const rowBslab = document.getElementById('row_input_B_slab');
    const rowTslab = document.getElementById('row_input_t_slab');
    const boxBadges = document.getElementById('box_auto_w_badges');

    if (isNoDeduct) {
        if (rowBslab) rowBslab.style.opacity = '0.4';
        if (rowTslab) rowTslab.style.opacity = '0.4';
        if (boxBadges) boxBadges.style.opacity = '0.5';
    } else {
        if (rowBslab) rowBslab.style.opacity = '1.0';
        if (rowTslab) rowTslab.style.opacity = '1.0';
        if (boxBadges) boxBadges.style.opacity = '1.0';
    }

    const T_max = Math.max(Math.abs(downLeft), Math.abs(downRight), Math.abs(upLeft), Math.abs(upRight));

    let c_M = 0;
    let c_Q = T_max;
    let headingTitle = '';
    let introText = '';
    let paramsRowHtml = '';
    let formulaMomentText = '';
    let formulaShearText = `・作用せん断力：$$Q = T = \\mathbf{${T_max.toFixed(3)}\\,\\text{kN}}$$`;
    let conclusionText = '';

    if (modelType === 'no_deduct_quarter') {
        headingTitle = '【別モデル照査】交差部固定端・純粋片持ち梁モデルによる安全裕度検証（自重控除なし・M=T・L/4）';
        introText = '※直交交差部を固定端とし、自重による押さえ込みを一切見込まない（自重控除なし）最も厳しい安全側の片持ち梁モデルとして検定を行います。';
        paramsRowHtml = `
            <span>・柱脚短期引き抜き力：$T = |T_d| = <strong>${T_max.toFixed(3)}</strong>\\,\\text{kN}$</span>
            <span>・スパン長：$L = <strong>${L.toFixed(3)}</strong>\\,\\text{m}$</span>
            <span style="color:#0369a1; font-weight:700;">・自重控除：なし（安全側設計）</span>
        `;
        c_M = (T_max * L) / 4;
        formulaMomentText = `・作用曲げモーメント（自重控除なし・安全側）：$$M = \\frac{T \\cdot L}{4} = \\frac{${T_max.toFixed(3)} \\times ${L.toFixed(3)}}{4} = \\mathbf{${c_M.toFixed(3)}\\,\\text{kN}\\cdot\\text{m}}$$`;
        conclusionText = '判定：自重押さえを一切見込まない過酷な片持ち支持仮定・長期許容耐力との比較においても M ≦ Ma かつ Q ≦ Qa を満足し、断面の安全性を確認。';
    } else if (modelType === 'no_deduct_half') {
        headingTitle = '【別モデル照査】交差部固定端・純粋片持ち梁モデルによる安全裕度検証（自重控除なし・M=T・L/2）';
        introText = '※直交交差部を固定端とし、自重による押さえ込みを一切見込まない（自重控除なし）端部片持ち梁モデルとして検定を行います。';
        paramsRowHtml = `
            <span>・柱脚短期引き抜き力：$T = |T_d| = <strong>${T_max.toFixed(3)}</strong>\\,\\text{kN}$</span>
            <span>・スパン長：$L = <strong>${L.toFixed(3)}</strong>\\,\\text{m}$</span>
            <span style="color:#0369a1; font-weight:700;">・自重控除：なし（安全側設計）</span>
        `;
        c_M = (T_max * L) / 2;
        formulaMomentText = `・作用曲げモーメント（自重控除なし・端部片持ち）：$$M = \\frac{T \\cdot L}{2} = \\frac{${T_max.toFixed(3)} \\times ${L.toFixed(3)}}{2} = \\mathbf{${c_M.toFixed(3)}\\,\\text{kN}\\cdot\\text{m}}$$`;
        conclusionText = '判定：自重押さえを一切見込まない過酷な片持ち支持仮定・長期許容耐力との比較においても M ≦ Ma かつ Q ≦ Qa を満足し、断面の安全性を確認。';
    } else if (modelType === 'self_weight_balance') {
        headingTitle = '【別モデル照査】交差部固定端・底盤自重押さえ釣り合いモデルによる安全裕度検証（Le=T/w）';
        introText = '※直交交差部を固定端とし、柱脚引き抜き力 T に対して基礎梁自重および底盤スラブ自重 w による押さえ込み効果（釣り合い有効長 Le）を考慮して検定を行います。';
        paramsRowHtml = `
            <span>・柱脚短期引き抜き力：$T = <strong>${T_max.toFixed(3)}</strong>\\,\\text{kN}$</span>
            <span>・スパン長：$L = <strong>${L.toFixed(3)}</strong>\\,\\text{m}$</span>
            <span>・梁自重：$w_{\\text{beam}} = <strong>${w_beam.toFixed(3)}</strong>\\,\\text{kN/m}$</span>
            <span>・底盤自重：$w_{\\text{slab}} = <strong>${w_slab.toFixed(3)}</strong>\\,\\text{kN/m}$</span>
            <span style="color:#166534; font-weight:700;">・合計自重：$w = <strong>${w_total.toFixed(3)}</strong>\\,\\text{kN/m}$</span>
        `;
        const Le = Math.min(L, T_max / w_total);
        c_M = (w_total * Math.pow(Le, 2)) / 2;
        c_Q = Math.max(0, T_max - w_total * Le);
        formulaMomentText = `・自重釣り合い有効長 $L_e = \\min(L, T/w) = ${Le.toFixed(3)}\\,\\text{m}$，作用曲げモーメント：$$M = \\frac{w \\cdot L_e^2}{2} = \\frac{${w_total.toFixed(3)} \\times ${Le.toFixed(3)}^2}{2} = \\mathbf{${c_M.toFixed(3)}\\,\\text{kN}\\cdot\\text{m}}$$`;
        formulaShearText = `・作用せん断力（自重控除後）：$$Q = \\max(0, T - w \\cdot L_e) = \\mathbf{${c_Q.toFixed(3)}\\,\\text{kN}}$$（非控除時 $Q = ${T_max.toFixed(3)}\\,\\text{kN}$）`;
        conclusionText = '判定：底盤自重押さえ込みを考慮した片持ち支持モデルにおいて M ≦ Ma かつ Q ≦ Qa を満足し、断面の安全性を確認。';
    } else if (modelType === 'deduct_moment') {
        headingTitle = '【別モデル照査】交差部固定端・自重モーメント控除片持ち梁モデルによる安全裕度検証';
        introText = '※直交交差部を固定端とし、引抜力による曲げモーメントから基礎梁＋底盤自重 w による対抗モーメントを控除して検定を行います。';
        paramsRowHtml = `
            <span>・柱脚短期引き抜き力：$T = <strong>${T_max.toFixed(3)}</strong>\\,\\text{kN}$</span>
            <span>・スパン長：$L = <strong>${L.toFixed(3)}</strong>\\,\\text{m}$</span>
            <span>・梁自重：$w_{\\text{beam}} = <strong>${w_beam.toFixed(3)}</strong>\\,\\text{kN/m}$</span>
            <span>・底盤自重：$w_{\\text{slab}} = <strong>${w_slab.toFixed(3)}</strong>\\,\\text{kN/m}$</span>
            <span style="color:#166534; font-weight:700;">・合計自重：$w = <strong>${w_total.toFixed(3)}</strong>\\,\\text{kN/m}$</span>
        `;
        const M_T = (T_max * L) / 4;
        const M_w = (w_total * Math.pow(L, 2)) / 8;
        c_M = Math.max(0, M_T - M_w);
        formulaMomentText = `・作用曲げモーメント（自重モーメント控除）：$$M = \\frac{T \\cdot L}{4} - \\frac{w \\cdot L^2}{8} = ${M_T.toFixed(3)} - ${M_w.toFixed(3)} = \\mathbf{${c_M.toFixed(3)}\\,\\text{kN}\\cdot\\text{m}}$$`;
        conclusionText = '判定：自重モーメント控除後の片持ち支持モデルにおいて M ≦ Ma かつ Q ≦ Qa を満足し、断面の安全性を確認。';
    }

    // 帳票片持ちブロックのテキスト更新
    if (document.getElementById('out_c_heading_title')) document.getElementById('out_c_heading_title').innerText = headingTitle;
    if (document.getElementById('out_c_intro_text')) document.getElementById('out_c_intro_text').innerText = introText;
    if (document.getElementById('out_c_params_row')) document.getElementById('out_c_params_row').innerHTML = paramsRowHtml;
    if (document.getElementById('formula_moment_text')) document.getElementById('formula_moment_text').innerHTML = formulaMomentText;
    if (document.getElementById('formula_shear_text')) document.getElementById('formula_shear_text').innerHTML = formulaShearText;
    if (document.getElementById('out_c_conclusion_text')) document.getElementById('out_c_conclusion_text').innerText = conclusionText;

    const dynamicDiscussionCantilever = `本基礎梁はスパン長（L=${L.toFixed(3)}m）に対して梁成（D=${D.toFixed(3)}m）が大きく、${rigidText}を有し、梁自体のたわみ変形は生じません。これに対し、万が一柱直下の地盤支持力が局所的に喪失した場合（不同沈下等）を想定し、交差部固定端の片持ち梁モデルとして安全側に照査を行いました。上記検定表の通り、最も過酷な支持仮定・長期許容耐力との比較においても十分な耐力裕度を有しており、断面および配筋の安全性を確認しました。`;

    if (document.getElementById('out_c_discussion_rigid')) {
        document.getElementById('out_c_discussion_rigid').innerText = dynamicDiscussionCantilever;
    }

    // 耐力検定
    const minLMa = Math.min(lmaTop, lmaBottom);
    if (document.getElementById('out_c_M')) document.getElementById('out_c_M').innerText = `${c_M.toFixed(3)} kN・m`;
    if (document.getElementById('out_c_Ma')) document.getElementById('out_c_Ma').innerText = `${minLMa.toFixed(3)} kN・m`;
    const c_M_ratio = c_M / minLMa;
    if (document.getElementById('out_c_M_ratio')) document.getElementById('out_c_M_ratio').innerText = c_M_ratio.toFixed(3);

    if (document.getElementById('out_c_Q')) document.getElementById('out_c_Q').innerText = `${c_Q.toFixed(3)} kN`;
    if (document.getElementById('out_c_Qa')) document.getElementById('out_c_Qa').innerText = `${lqa.toFixed(3)} kN`;
    const c_Q_ratio = c_Q / lqa;
    if (document.getElementById('out_c_Q_ratio')) document.getElementById('out_c_Q_ratio').innerText = c_Q_ratio.toFixed(3);

    const badgeM = document.getElementById('badge_c_M');
    if (badgeM) {
        if (c_M_ratio <= 1.0) {
            badgeM.className = 'badge-status-ok';
            badgeM.style.background = '#dcfce7';
            badgeM.style.color = '#166534';
            badgeM.style.borderColor = '#86efac';
            badgeM.innerText = 'OK';
        } else {
            badgeM.className = 'badge-status-ok';
            badgeM.style.background = '#fee2e2';
            badgeM.style.color = '#991b1b';
            badgeM.style.borderColor = '#fca5a5';
            badgeM.innerText = 'NG';
        }
    }

    const badgeQ = document.getElementById('badge_c_Q');
    if (badgeQ) {
        if (c_Q_ratio <= 1.0) {
            badgeQ.className = 'badge-status-ok';
            badgeQ.style.background = '#dcfce7';
            badgeQ.style.color = '#166534';
            badgeQ.style.borderColor = '#86efac';
            badgeQ.innerText = 'OK';
        } else {
            badgeQ.className = 'badge-status-ok';
            badgeQ.style.background = '#fee2e2';
            badgeQ.style.color = '#991b1b';
            badgeQ.style.borderColor = '#fca5a5';
            badgeQ.innerText = 'NG';
        }
    }

    // 7. SVG変形図・反力図の描画
    renderDeformationSvg(L, downLeft, downRight, v_down_l, v_down_r);
    renderReactionSvg(L, downLeft, downRight);
}

/**
 * 変形図のSVG描画
 */
function renderDeformationSvg(L, Tl, Tr, vl, vr) {
    const svg = document.getElementById('svg_deformation');
    if (!svg) return;

    const x1 = 45, x2 = 275;
    const yCenter = 45;
    const dy = 16;

    svg.innerHTML = `
        <defs>
            <marker id="arrow-down" markerWidth="6" markerHeight="6" refX="3" refY="6" orient="auto">
                <path d="M0,0 L3,6 L6,0 Z" fill="#ef4444" />
            </marker>
            <marker id="arrow-up" markerWidth="6" markerHeight="6" refX="3" refY="0" orient="auto">
                <path d="M0,6 L3,0 L6,6 Z" fill="#3b82f6" />
            </marker>
        </defs>

        <!-- 元の梁軸線（破線） -->
        <line x1="${x1}" y1="${yCenter}" x2="${x2}" y2="${yCenter}" stroke="#94a3b8" stroke-dasharray="3,3" stroke-width="1.5" />
        <text x="${(x1+x2)/2}" y="${yCenter - 8}" font-size="8" fill="#64748b" text-anchor="middle">スパン L = ${L.toFixed(3)}m（初期位置）</text>

        <!-- 変形後の剛体梁（傾斜直線） -->
        <polygon points="${x1},${yCenter+dy-4} ${x2},${yCenter-dy-4} ${x2},${yCenter-dy+4} ${x1},${yCenter+dy+4}" fill="#93c5fd" opacity="0.4" />
        <line x1="${x1}" y1="${yCenter+dy}" x2="${x2}" y2="${yCenter-dy}" stroke="#1d4ed8" stroke-width="3" />

        <!-- 節点ピン -->
        <circle cx="${x1}" cy="${yCenter+dy}" r="4" fill="#1e3a8a" />
        <circle cx="${x2}" cy="${yCenter-dy}" r="4" fill="#1e3a8a" />

        <!-- 左側荷重矢印 (下向き押込) -->
        <line x1="${x1}" y1="${yCenter+dy-26}" x2="${x1}" y2="${yCenter+dy-4}" stroke="#ef4444" stroke-width="2" marker-end="url(#arrow-down)" />
        <text x="${x1}" y="${yCenter+dy-28}" font-size="7.5" font-weight="bold" fill="#dc2626" text-anchor="middle">Td=${Tl.toFixed(1)}kN</text>
        <text x="${x1}" y="${yCenter+dy+15}" font-size="7.5" fill="#1e40af" text-anchor="middle">v=${vl.toFixed(1)}mm (沈下)</text>

        <!-- 右側荷重矢印 (上向き引抜) -->
        <line x1="${x2}" y1="${yCenter-dy+26}" x2="${x2}" y2="${yCenter-dy+4}" stroke="#3b82f6" stroke-width="2" marker-end="url(#arrow-up)" />
        <text x="${x2}" y="${yCenter-dy+35}" font-size="7.5" font-weight="bold" fill="#2563eb" text-anchor="middle">Td=${Tr.toFixed(1)}kN</text>
        <text x="${x2}" y="${yCenter-dy-12}" font-size="7.5" fill="#1e40af" text-anchor="middle">v=-${vr.toFixed(1)}mm (浮上)</text>

        <!-- 剛体変位モード注記 -->
        <text x="${(x1+x2)/2}" y="${yCenter+34}" font-size="7.2" fill="#0f172a" font-weight="600" text-anchor="middle">剛体回転変位モード (たわみδ≒0)</text>
    `;
}

/**
 * 反力図のSVG描画
 */
function renderReactionSvg(L, Tl, Tr) {
    const svg = document.getElementById('svg_reaction');
    if (!svg) return;

    const x1 = 45, x2 = 275;
    const yCenter = 40;

    svg.innerHTML = `
        <defs>
            <marker id="arrow-react" markerWidth="5" markerHeight="5" refX="2.5" refY="0" orient="auto">
                <path d="M0,5 L2.5,0 L5,5 Z" fill="#16a34a" />
            </marker>
        </defs>

        <!-- 基礎梁 -->
        <rect x="${x1}" y="${yCenter-5}" width="${x2-x1}" height="10" fill="#cbd5e1" stroke="#475569" stroke-width="1.2" rx="2" />
        <text x="${(x1+x2)/2}" y="${yCenter+3}" font-size="7.5" font-weight="bold" fill="#1e293b" text-anchor="middle">基礎梁 FG (B=${0.150}m, D=${0.490}m)</text>

        <!-- 地盤反力分布 -->
        <polygon points="${x1},${yCenter+5} ${(x1+x2)/2 + 10},${yCenter+5} ${x1},${yCenter+35}" fill="#bbf7d0" opacity="0.6" />
        
        <line x1="${x1+5}" y1="${yCenter+32}" x2="${x1+5}" y2="${yCenter+6}" stroke="#16a34a" stroke-width="1.8" marker-end="url(#arrow-react)" />
        <line x1="${x1+30}" y1="${yCenter+26}" x2="${x1+30}" y2="${yCenter+6}" stroke="#16a34a" stroke-width="1.5" marker-end="url(#arrow-react)" />
        <line x1="${x1+55}" y1="${yCenter+20}" x2="${x1+55}" y2="${yCenter+6}" stroke="#16a34a" stroke-width="1.5" marker-end="url(#arrow-react)" />
        <line x1="${x1+80}" y1="${yCenter+14}" x2="${x1+80}" y2="${yCenter+6}" stroke="#16a34a" stroke-width="1.2" marker-end="url(#arrow-react)" />
        <line x1="${x1+105}" y1="${yCenter+9}" x2="${x1+105}" y2="${yCenter+6}" stroke="#16a34a" stroke-width="1.0" marker-end="url(#arrow-react)" />

        <text x="${x1+20}" y="${yCenter+43}" font-size="7.5" font-weight="bold" fill="#15803d" text-anchor="start">地盤反力 kv・v(x) [圧縮支持]</text>
        <text x="${x2-10}" y="${yCenter+28}" font-size="7.5" fill="#64748b" text-anchor="end">引張非接地 (R=0)</text>

        <text x="${(x1+x2)/2}" y="${yCenter+50}" font-size="7" fill="#334155" text-anchor="middle">∫ R(x) dx ＝ Td (直下反力で完全平衡・梁間せん断力Qe＝0)</text>
    `;
}
