/**
 * public/js/timber_db.js
 * 
 * 木造構造計算用 樹種・木材基準強度マスターデータベース (TIMBER_DATABASE)
 * - 構造用製材 (無等級材 21樹種)
 * - 構造用集成材 (同一等級構成 11等級、対称異等級構成 11等級)
 * - 樹種別せん断強度・めり込み基準強度
 * - 許容応力度自動算定ヘルパー (長期: F/3, 短期: 2F/3)
 * 
 * 準拠: 平成12年建設省告示第1452号、グレー本 (木造軸組工法住宅の許容応力度設計)
 */

(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.TIMBER_DB = factory();
        root.TIMBER_DATABASE = root.TIMBER_DB;
    }
}(typeof self !== 'undefined' ? self : this, function() {

    // ========================================================
    // 1. 構造用製材（無等級材 21樹種）
    // 単位: 基準強度 N/mm2, ヤング係数 E kN/mm2 (x10^3 N/mm2)
    // ========================================================
    const SAWN_TIMBER_UNGRADED = [
        { id: "akamatsu", name: "あかまつ", group: "sawn_ungraded", fc: 22.20, ft: 17.70, fb: 28.20, fs: 2.40, f_perp: 9.00, E: 8.000 },
        { id: "kuromatsu", name: "くろまつ", group: "sawn_ungraded", fc: 22.20, ft: 17.70, fb: 28.20, fs: 2.40, f_perp: 9.00, E: 8.000 },
        { id: "beimatsu", name: "べいまつ (ダグラスファー)", group: "sawn_ungraded", fc: 22.20, ft: 17.70, fb: 28.20, fs: 2.40, f_perp: 9.00, E: 10.000 },
        { id: "karamatsu", name: "からまつ", group: "sawn_ungraded", fc: 20.70, ft: 16.20, fb: 26.70, fs: 2.10, f_perp: 7.80, E: 8.000 },
        { id: "hiba", name: "ひば", group: "sawn_ungraded", fc: 20.70, ft: 16.20, fb: 26.70, fs: 2.10, f_perp: 7.80, E: 9.000 },
        { id: "hinoki", name: "ひのき", group: "sawn_ungraded", fc: 20.70, ft: 16.20, fb: 26.70, fs: 2.10, f_perp: 7.80, E: 9.000 },
        { id: "beihi", name: "べいひ (イエローシダー)", group: "sawn_ungraded", fc: 20.70, ft: 16.20, fb: 26.70, fs: 2.10, f_perp: 7.80, E: 9.000 },
        { id: "tsuga", name: "つが", group: "sawn_ungraded", fc: 19.20, ft: 14.70, fb: 25.20, fs: 2.10, f_perp: 6.00, E: 8.000 },
        { id: "beitsuga", name: "べいつが (ヘムロック)", group: "sawn_ungraded", fc: 19.20, ft: 14.70, fb: 25.20, fs: 2.10, f_perp: 6.00, E: 8.000 },
        { id: "momi", name: "もみ", group: "sawn_ungraded", fc: 17.70, ft: 13.50, fb: 22.20, fs: 1.80, f_perp: 6.00, E: 7.000 },
        { id: "ezomatsu", name: "えぞまつ", group: "sawn_ungraded", fc: 17.70, ft: 13.50, fb: 22.20, fs: 1.80, f_perp: 6.00, E: 7.000 },
        { id: "todomatsu", name: "とどまつ", group: "sawn_ungraded", fc: 17.70, ft: 13.50, fb: 22.20, fs: 1.80, f_perp: 6.00, E: 7.000 },
        { id: "benimatsu", name: "べにまつ", group: "sawn_ungraded", fc: 17.70, ft: 13.50, fb: 22.20, fs: 1.80, f_perp: 6.00, E: 7.000 },
        { id: "sugi", name: "すぎ", group: "sawn_ungraded", fc: 17.70, ft: 13.50, fb: 22.20, fs: 1.80, f_perp: 6.00, E: 7.000 },
        { id: "beisugi", name: "べいすぎ (レッドシダー)", group: "sawn_ungraded", fc: 17.70, ft: 13.50, fb: 22.20, fs: 1.80, f_perp: 6.00, E: 7.000 },
        { id: "spruce", name: "スプルース (米唐檜)", group: "sawn_ungraded", fc: 17.70, ft: 13.50, fb: 22.20, fs: 1.80, f_perp: 6.00, E: 7.000 },
        { id: "kashi", name: "かし", group: "sawn_ungraded", fc: 27.00, ft: 24.00, fb: 38.40, fs: 4.20, f_perp: 12.00, E: 10.000 },
        { id: "kuri", name: "くり", group: "sawn_ungraded", fc: 21.00, ft: 18.00, fb: 29.40, fs: 3.00, f_perp: 10.80, E: 8.000 },
        { id: "nara", name: "なら", group: "sawn_ungraded", fc: 21.00, ft: 18.00, fb: 29.40, fs: 3.00, f_perp: 10.80, E: 8.000 },
        { id: "buna", name: "ぶな", group: "sawn_ungraded", fc: 21.00, ft: 18.00, fb: 29.40, fs: 3.00, f_perp: 10.80, E: 8.000 },
        { id: "keyaki", name: "けやき", group: "sawn_ungraded", fc: 21.00, ft: 18.00, fb: 29.40, fs: 3.00, f_perp: 10.80, E: 8.000 }
    ];

    // ========================================================
    // 2. 構造用集成材の樹種別せん断・めり込み基準強度
    // ========================================================
    const GLULAM_SPECIES_STRENGTH = [
        { id: "hinoki", name: "ひのき", fs_lam: 3.60, fs_width: 3.00, f_perp: 7.80 },
        { id: "sugi", name: "すぎ", fs_lam: 2.70, fs_width: 2.10, f_perp: 6.00 },
        { id: "akamatsu", name: "あかまつ", fs_lam: 3.60, fs_width: 3.00, f_perp: 9.00 },
        { id: "kuromatsu", name: "くろまつ", fs_lam: 3.60, fs_width: 3.00, f_perp: 9.00 },
        { id: "beimatsu", name: "べいまつ", fs_lam: 3.60, fs_width: 3.00, f_perp: 9.00 },
        { id: "karamatsu", name: "からまつ", fs_lam: 3.60, fs_width: 3.00, f_perp: 7.80 },
        { id: "hiba", name: "ひば", fs_lam: 3.60, fs_width: 3.00, f_perp: 7.80 },
        { id: "beihi", name: "べいひ", fs_lam: 3.60, fs_width: 3.00, f_perp: 7.80 },
        { id: "tsuga", name: "つが", fs_lam: 3.30, fs_width: 2.70, f_perp: 6.00 },
        { id: "beitsuga", name: "べいつが", fs_lam: 3.30, fs_width: 2.70, f_perp: 6.00 },
        { id: "spruce", name: "スプルース", fs_lam: 3.00, fs_width: 2.40, f_perp: 6.00 },
        { id: "oshuakatsu", name: "おうしゅうあかまつ (欧州赤松)", fs_lam: 3.00, fs_width: 2.40, f_perp: 6.00 },
        { id: "momi", name: "もみ", fs_lam: 3.00, fs_width: 2.40, f_perp: 6.00 },
        { id: "todomatsu", name: "とどまつ", fs_lam: 3.00, fs_width: 2.40, f_perp: 6.00 },
        { id: "ezomatsu", name: "えぞまつ", fs_lam: 3.00, fs_width: 2.40, f_perp: 6.00 },
        { id: "beimomi", name: "べいもみ", fs_lam: 3.00, fs_width: 2.40, f_perp: 6.00 },
        { id: "lodgepole", name: "ロッジポールパイン", fs_lam: 3.00, fs_width: 2.40, f_perp: 6.00 }
    ];

    // ========================================================
    // 3. 同一等級構成集成材 (積層4枚以上)
    // ========================================================
    const GLULAM_HOMO = [
        { id: "E190-F615", name: "同一等級 E190-F615", grade: "E190-F615", group: "glulam_homo", fc: 50.30, ft: 43.90, fb_lam: 61.50, fb_width: 61.50, E: 19.000 },
        { id: "E170-F540", name: "同一等級 E170-F540", grade: "E170-F540", group: "glulam_homo", fc: 44.60, ft: 38.90, fb_lam: 54.00, fb_width: 54.00, E: 17.000 },
        { id: "E150-F465", name: "同一等級 E150-F465", grade: "E150-F465", group: "glulam_homo", fc: 39.20, ft: 34.20, fb_lam: 46.50, fb_width: 46.50, E: 15.000 },
        { id: "E135-F405", name: "同一等級 E135-F405", grade: "E135-F405", group: "glulam_homo", fc: 33.40, ft: 29.20, fb_lam: 40.50, fb_width: 40.50, E: 13.500 },
        { id: "E120-F375", name: "同一等級 E120-F375", grade: "E120-F375", group: "glulam_homo", fc: 30.10, ft: 26.30, fb_lam: 37.50, fb_width: 37.50, E: 12.000 },
        { id: "E105-F345", name: "同一等級 E105-F345", grade: "E105-F345", group: "glulam_homo", fc: 28.10, ft: 24.50, fb_lam: 34.50, fb_width: 34.50, E: 10.500 },
        { id: "E95-F315",  name: "同一等級 E95-F315",  grade: "E95-F315",  group: "glulam_homo", fc: 26.00, ft: 22.70, fb_lam: 31.50, fb_width: 31.50, E: 9.500 },
        { id: "E85-F300",  name: "同一等級 E85-F300",  grade: "E85-F300",  group: "glulam_homo", fc: 24.30, ft: 21.20, fb_lam: 30.00, fb_width: 30.00, E: 8.500 },
        { id: "E75-F270",  name: "同一等級 E75-F270",  grade: "E75-F270",  group: "glulam_homo", fc: 22.30, ft: 19.40, fb_lam: 27.00, fb_width: 27.00, E: 7.500 },
        { id: "E65-F255",  name: "同一等級 E65-F255",  grade: "E65-F255",  group: "glulam_homo", fc: 20.60, ft: 18.00, fb_lam: 25.50, fb_width: 25.50, E: 6.500 },
        { id: "E55-F225",  name: "同一等級 E55-F225",  grade: "E55-F225",  group: "glulam_homo", fc: 18.60, ft: 16.20, fb_lam: 22.50, fb_width: 22.50, E: 5.500 }
    ];

    // ========================================================
    // 4. 対称異等級構成集成材
    // ========================================================
    const GLULAM_SYM = [
        { id: "E170-F495", name: "対称異等級 E170-F495", grade: "E170-F495", group: "glulam_sym", fc: 38.40, ft: 33.50, fb_lam: 49.50, fb_width: 35.40, E: 17.000 },
        { id: "E150-F435", name: "対称異等級 E150-F435", grade: "E150-F435", group: "glulam_sym", fc: 33.40, ft: 29.20, fb_lam: 43.50, fb_width: 30.60, E: 15.000 },
        { id: "E135-F375", name: "対称異等級 E135-F375", grade: "E135-F375", group: "glulam_sym", fc: 29.70, ft: 25.90, fb_lam: 37.50, fb_width: 27.60, E: 13.500 },
        { id: "E120-F330", name: "対称異等級 E120-F330", grade: "E120-F330", group: "glulam_sym", fc: 25.90, ft: 22.40, fb_lam: 33.00, fb_width: 24.00, E: 12.000 },
        { id: "E105-F300", name: "対称異等級 E105-F300", grade: "E105-F300", group: "glulam_sym", fc: 23.20, ft: 20.20, fb_lam: 30.00, fb_width: 21.60, E: 10.500 },
        { id: "E95-F270",  name: "対称異等級 E95-F270",  grade: "E95-F270",  group: "glulam_sym", fc: 21.70, ft: 18.90, fb_lam: 27.00, fb_width: 20.40, E: 9.500 },
        { id: "E85-F255",  name: "対称異等級 E85-F255",  grade: "E85-F255",  group: "glulam_sym", fc: 19.50, ft: 17.00, fb_lam: 25.50, fb_width: 18.00, E: 8.500 },
        { id: "E75-F240",  name: "対称異等級 E75-F240",  grade: "E75-F240",  group: "glulam_sym", fc: 17.60, ft: 15.30, fb_lam: 24.00, fb_width: 15.60, E: 7.500 },
        { id: "E65-F225",  name: "対称異等級 E65-F225",  grade: "E65-F225",  group: "glulam_sym", fc: 16.70, ft: 14.60, fb_lam: 22.50, fb_width: 15.00, E: 6.500 },
        { id: "E65-F220",  name: "対称異等級 E65-F220",  grade: "E65-F220",  group: "glulam_sym", fc: 15.30, ft: 13.40, fb_lam: 22.00, fb_width: 12.60, E: 6.500 },
        { id: "E55-F200",  name: "対称異等級 E55-F200",  grade: "E55-F200",  group: "glulam_sym", fc: 13.30, ft: 11.60, fb_lam: 20.00, fb_width: 10.20, E: 5.500 }
    ];

    return {
        SAWN_TIMBER_UNGRADED: SAWN_TIMBER_UNGRADED,
        GLULAM_SPECIES_STRENGTH: GLULAM_SPECIES_STRENGTH,
        GLULAM_HOMO: GLULAM_HOMO,
        GLULAM_SYM: GLULAM_SYM,

        // 製材から検索
        getSawnTimber: function(idOrName) {
            return SAWN_TIMBER_UNGRADED.find(t => t.id === idOrName || t.name.includes(idOrName)) || SAWN_TIMBER_UNGRADED[5]; // デフォルトひのき
        },

        // 集成材樹種から検索
        getGlulamSpecies: function(idOrName) {
            return GLULAM_SPECIES_STRENGTH.find(s => s.id === idOrName || s.name.includes(idOrName)) || GLULAM_SPECIES_STRENGTH[0];
        },

        // 許容応力度算定ヘルパー (長期/短期)
        // term: 'long' (長期: F/3) | 'short' (短期: 2F/3)
        calcAllowableStress: function(timber, term = 'long', glulamSpecies = null) {
            const factor = (term === 'short') ? (2 / 3) : (1 / 3);

            let fb = 0;
            let fs = 0;
            let fc = 0;
            let ft = 0;
            let f_perp = 0;
            let E = timber.E; // kN/mm2

            if (timber.group === 'sawn_ungraded') {
                fb = timber.fb * factor;
                fs = timber.fs * factor;
                fc = timber.fc * factor;
                ft = timber.ft * factor;
                f_perp = timber.f_perp * factor;
            } else {
                // 集成材の場合
                fb = timber.fb_lam * factor;
                fc = timber.fc * factor;
                ft = timber.ft * factor;
                const sp = glulamSpecies || GLULAM_SPECIES_STRENGTH[0]; // ひのき等
                fs = sp.fs_lam * factor;
                f_perp = sp.f_perp * factor;
            }

            return {
                fb: Number(fb.toFixed(2)),
                fs: Number(fs.toFixed(2)),
                fc: Number(fc.toFixed(2)),
                ft: Number(ft.toFixed(2)),
                f_perp: Number(f_perp.toFixed(2)),
                E: E,
                E_Nmm2: E * 1000 // N/mm2
            };
        }
    };
}));
