/**
 * public/js/tools_data.js
 * 
 * mdo3 構造計算補助ツール 全28ツールのカタログマスターデータ
 * - カテゴリ分類 (4大カテゴリ)
 * - できること (Features) / できないこと・留意点 (Limitations)
 * - 価格区分 (個別980円/月、カテゴリ1,980円/月、全ツール3,980円/月)
 * - 無料マニュアル & 操作説明動画 URL
 */

const MDO3_TOOLS_CATALOG = [
  // ==========================================
  // カテゴリ1: 基礎・擁壁・地盤系 (8ツール)
  // ==========================================
  {
    id: "cantilever_foundation_beam",
    category: "foundation",
    categoryName: "基礎・擁壁・地盤系",
    title: "片持ち基礎梁の検定 (柱あり)",
    summary: "べた基礎ポーチ部など一部スラブ無しの片持ち基礎梁検定。アーキトレンド転載軸力から上主筋・せん断耐力を算定。",
    icon: "account_tree",
    url: "https://app.mdo3.com/tools/cantilever_foundation_beam.html",
    videoUrl: "#video-cantilever-beam",
    manualUrl: "#manual-cantilever-beam",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "ポーチ等の一部スラブ無しの片持ち基礎梁の断面算定",
      "柱からの長期・短期軸力による上主筋の引張応力検定",
      "主筋径・本数およびあばら筋(スターラップ)のせん断検定",
      "A4 1枚印刷レイアウト & JSON/LocalStorage保存・復元"
    ],
    cannotDo: [
      "杭基礎の直接支持力・水平抵抗の算定（杭頭モーメント連携）",
      "3次元立体フレーム解析"
    ]
  },
  {
    id: "cantilever_beam_no_column",
    category: "foundation",
    categoryName: "基礎・擁壁・地盤系",
    title: "片持ち基礎梁 (柱なし) ＆ 片土圧検定",
    summary: "バルコニー部等支点なし片持ち基礎梁の下主筋検定、およびスラブ接地圧による片土圧（立上がり・スラブ）検定。",
    icon: "foundation",
    url: "https://app.mdo3.com/tools/cantilever_beam_no_column.html",
    videoUrl: "#video-cantilever-no-col",
    manualUrl: "#manual-cantilever-no-col",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "端部に柱が乗らない基礎梁のはね出し下主筋算定",
      "スラブ反力による立上がり部の片土圧曲げモーメント算定",
      "耐圧盤スラブの片土圧検定（外周部断面算定）",
      "A4 1枚印刷レイアウト & JSON保存"
    ],
    cannotDo: [
      "深基礎（高低差2m超）の土圧・水圧複合擁壁計算",
      "液状化地盤の動的流動圧解析"
    ]
  },
  {
    id: "foundation_beam_horizontal",
    category: "foundation",
    categoryName: "基礎・擁壁・地盤系",
    title: "基礎梁 水平力追加計算書 (KBI用)",
    summary: "弾性支点（Winklerモデル）による基礎梁の水平時FEM応力算定・短期断面検定。A4 1枚印刷・PDF出力対応。",
    icon: "calculate",
    url: "https://app.mdo3.com/tools/foundation_beam_horizontal.html",
    videoUrl: "#video-horizontal-beam",
    manualUrl: "#manual-horizontal-beam",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "Winkler床モデル（弾性支点FEM）による基礎梁の水平時M・Q分布解析",
      "SMa（短期許容曲げモーメント）の自動算定・短期断面検定",
      "建築確認・審査機関（KBI等）へのそのまま提出可能なA4追加計算書出力",
      "JSONデータ入出力・ブラウザLocalStorage自動保存"
    ],
    cannotDo: [
      "立体連成3次元基礎スラブFEM解析",
      "液状化層を考慮した動的相互作用解析"
    ]
  },
  {
    id: "balanced_rebar_ratio",
    category: "foundation",
    categoryName: "基礎・擁壁・地盤系",
    title: "スラブ内補強 釣り合い鉄筋比の計算",
    summary: "人通口等のスラブ内補強における引張鉄筋比と釣り合い鉄筋比（pt ≦ ptb）を判定。過鉄筋・脆性破壊防止の検討書出力。",
    icon: "domain_verification",
    url: "https://app.mdo3.com/tools/balanced_rebar_ratio.html",
    videoUrl: "#video-rebar-ratio",
    manualUrl: "#manual-rebar-ratio",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "基礎スラブ割増筋・補強筋の引張鉄筋比(pt)の算定",
      "コンクリート圧縮強度と鉄筋降伏強度による釣り合い鉄筋比(ptb)の自動判定",
      "pt ≦ 0.75ptb（延性破壊確保・過鉄筋防止）の適合判定書発行",
      "A4 1枚の明快な適合判定書類出力"
    ],
    cannotDo: [
      "プレストレストコンクリート(PC)の緊張材比計算",
      "立体配筋干渉チェック"
    ]
  },
  {
    id: "jintsuko",
    category: "foundation",
    categoryName: "基礎・擁壁・地盤系",
    title: "人通口補強計算",
    summary: "スラブ内割増筋およびせん断力の検定。PDF計算書からの応力抽出に対応。",
    icon: "construction",
    url: "https://app.mdo3.com/tools/jintsuko.html",
    videoUrl: "#video-jintsuko",
    manualUrl: "#manual-jintsuko",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "人通口開口による耐圧盤・立上がり部の欠損補強計算",
      "欠損周囲の割増主筋・斜め補強筋の所要断面積算定",
      "PDF計算書からの応力値転記サポート"
    ],
    cannotDo: [
      "開口幅が基礎梁せいの3倍を超える特殊大開口の検討",
      "円形人通口スリーブの検討"
    ]
  },
  {
    id: "youheki_calculator",
    category: "foundation",
    categoryName: "基礎・擁壁・地盤系",
    title: "逆Ｌ型・逆Ｔ型擁壁の計算",
    summary: "逆L型・逆T型RC擁壁の安定計算（転倒・滑動・地盤反力）および縦壁の断面算定（曲げ・せん断）。",
    icon: "domain_add",
    url: "https://app.mdo3.com/tools/youheki_calculator.html",
    videoUrl: "#video-youheki",
    manualUrl: "#manual-youheki",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "常時および地震時における転倒・滑動・支持力の3大安定性検討",
      "縦壁基部、底版（つま先・かかと）の曲げ応力・せん断力算定",
      "主筋径・ピッチおよび配力筋の配筋検定",
      "計算書の自動レイアウト印刷"
    ],
    cannotDo: [
      "もたれ式擁壁や間知石練り積み擁壁の安定計算",
      "地すべり抑止杭併用型擁壁の連成解析"
    ]
  },
  {
    id: "youheki_L_calculator",
    category: "foundation",
    categoryName: "基礎・擁壁・地盤系",
    title: "Ｌ型擁壁の計算 (2.0m未満)",
    summary: "宅地L型擁壁(2m未満)の安定計算、前趾土重W3・N値地耐力自動算出、縦壁・前趾底版の断面算定。",
    icon: "domain_disabled",
    url: "https://app.mdo3.com/tools/youheki_L_calculator.html",
    videoUrl: "#video-l-youheki",
    manualUrl: "#manual-l-youheki",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "高さ2m未満の宅地造成用L型RC擁壁の即時安全判定",
      "地盤調査結果（スウェーデン式/ボーリングN値）からの許容地耐力算定",
      "前趾土重W3を考慮した底版・縦壁の配筋検定"
    ],
    cannotDo: [
      "高さ2mを超える工作物確認申請を要する大規模擁壁",
      "急傾斜地崩壊危険区域の崩壊土砂直撃擁壁"
    ]
  },
  {
    id: "dosha_saigai",
    category: "foundation",
    categoryName: "基礎・擁壁・地盤系",
    title: "土砂災害特別警戒区域の外壁等",
    summary: "土砂災害特別警戒区域（レッドゾーン）における外壁・控壁・基礎の構造計算（告示第332号・第383号準拠）。",
    icon: "warning",
    url: "https://app.mdo3.com/tools/dosha_saigai.html",
    videoUrl: "#video-dosha",
    manualUrl: "#manual-dosha",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "告示第332号・第383号に準拠した想定土石流・崩壊土砂圧の算定",
      "RC外壁の壁厚・複配筋検討、控壁（バットレス）の配置間隔検定",
      "基礎の滑動・転倒・接地圧の照査",
      "確認審査機関提出用の一体型構造計算書出力"
    ],
    cannotDo: [
      "警戒区域（イエローゾーン）の避難安全計画書作成",
      "落石防護ネット・雪崩防護柵の設計"
    ]
  },

  // ==========================================
  // カテゴリ2: 木造軸組・接合部・一般部材系 (7ツール)
  // ==========================================
  {
    id: "hasira_mage",
    category: "timber",
    categoryName: "木造軸組・接合部系",
    title: "柱の曲げ計算",
    summary: "風圧力および軸力に対する柱の曲げ・座屈検定。M図の自動描画機能付き。",
    icon: "vertical_align_center",
    url: "https://app.mdo3.com/tools/hasira-mage.html",
    videoUrl: "#video-hasira-mage",
    manualUrl: "#manual-hasira-mage",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "風圧力（告示1458号）による柱の曲げモーメントM算定",
      "長期軸力・短期軸力による座屈係数fkおよび許容圧縮応力度算定",
      "曲げと軸力の複合応力比検定（σc/fc + σb/fb ≦ 1.0）",
      "曲げモーメント図（M図）のリアルタイム自動描画"
    ],
    cannotDo: [
      "異形断面（台形柱・丸太柱）の非線形曲げ解析",
      "火災時木材炭化断面計算"
    ]
  },
  {
    id: "merikomi",
    category: "timber",
    categoryName: "木造軸組・接合部系",
    title: "めり込み補強計算",
    summary: "土台・横架材のめり込み検定。タナカ土台プレートIIの耐力表に準拠。",
    icon: "expand_more",
    url: "https://app.mdo3.com/tools/merikomi.html",
    videoUrl: "#video-merikomi",
    manualUrl: "#manual-merikomi",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "柱下土台・梁交差部の支圧面積および許容めり込み応力度照査",
      "補強金物（タナカ土台プレートII等）の規格別許容耐力判定",
      "樹種（ヒノキ、スギ、オウシュウアカマツ等）のめり込み基準強度対応"
    ],
    cannotDo: [
      "特殊鋼板挿入型ドリフトピン接合部のめり込みせん断解析",
      "木材の含水率経時変化シミュレーション"
    ]
  },
  {
    id: "zi",
    category: "timber",
    categoryName: "木造軸組・接合部系",
    title: "横架材のZ低減係数",
    summary: "プレカット仕口・渡り顎による断面欠損を考慮した断面係数Zおよび断面二次モーメントIの低減算出。",
    icon: "calculate",
    url: "https://app.mdo3.com/tools/zi.html",
    videoUrl: "#video-zi",
    manualUrl: "#manual-zi",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "蟻掛け・カマ継ぎ・大入れ・渡り顎等の加工寸法入力による有効断面算定",
      "断面係数低減係数αZ、断面二次モーメント低減係数αIの自動算出",
      "横架材の曲げ・たわみ検定への直接連携数値取得"
    ],
    cannotDo: [
      "ボルト貫通孔の立体配置によるジッパー破壊予測",
      "プレカット加工機の自動切削NCデータ生成"
    ]
  },
  {
    id: "roof_calc",
    category: "timber",
    categoryName: "木造軸組・接合部系",
    title: "屋根葺き材等の検討",
    summary: "基準風速・地表面粗度区分に基づく速度圧および屋根勾配に応じた風圧力の検定。",
    icon: "roofing",
    url: "https://app.mdo3.com/tools/roof_calc.html",
    videoUrl: "#video-roof-calc",
    manualUrl: "#manual-roof-calc",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "全国市区町村の基準風速V0および地表面粗度区分（I〜IV）による速度圧算定",
      "屋根面（軒先部・けらば部・一般部）の正圧・負圧ピーク風圧係数算定",
      "野地板厚・留付け釘ピッチの耐風圧判定"
    ],
    cannotDo: [
      "複雑多面体屋根の風洞実験再現",
      "太陽光発電パネル留付け架台自体の構造計算"
    ]
  },
  {
    id: "hashigo",
    category: "timber",
    categoryName: "木造軸組・接合部系",
    title: "はしご垂木 計算",
    summary: "屋根はね出し部（はしご垂木・ケラバ持ち出し）の曲げ・せん断・たわみの検定。樹種別の基準強度に対応。",
    icon: "stairs",
    url: "https://app.mdo3.com/tools/hashigo.html",
    videoUrl: "#video-hashigo",
    manualUrl: "#manual-hashigo",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "ケラバ部のはね出し寸法に応じたはしご垂木ピッチ・寸法の照査",
      "積雪時荷重および負圧風圧力に対する曲げ・せん断・たわみ検定",
      "支持点母屋・桁への留付け緊結金物の検定"
    ],
    cannotDo: [
      "スパン3mを超える大規模トラスキャノピーの計算",
      "鋼製持ち出し金物フレームの塑性変形計算"
    ]
  },
  {
    id: "hariue",
    category: "timber",
    categoryName: "木造軸組・接合部系",
    title: "梁上耐力壁の剛性低減",
    summary: "梁の上に載る耐力壁の剛性低減係数（γ）の算出および下部横架材の断面検定。",
    icon: "architecture",
    url: "https://app.mdo3.com/tools/hariue.html",
    videoUrl: "#video-hariue",
    manualUrl: "#manual-hariue",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "梁上に配置された耐力壁の支持梁たわみによる水平剛性低減係数γの算定",
      "住宅性能表示・許容応力度計算における有効耐力壁倍率補正",
      "梁の曲げ応力・長期たわみ照査"
    ],
    cannotDo: [
      "耐力壁下部梁の3次元弾塑性地震応答解析",
      "吹き抜け空間の立体ねじれ振動連成計算"
    ]
  },
  {
    id: "rigid_frame_R",
    category: "timber",
    categoryName: "木造軸組・接合部系",
    title: "片持ち庇の検討",
    summary: "引きボルト式接合部の検討。接合面めり込み・ボルト引張・木口せん断破壊等の短期許容モーメント検定。",
    icon: "link",
    url: "https://app.mdo3.com/tools/rigid_frame_R.html",
    videoUrl: "#video-rigid-r",
    manualUrl: "#manual-rigid-r",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "柱外周へ片持ち状に突出する木製庇梁の接合部短期曲げ検定",
      "引きボルトの引張応力度、座金下のめり込み応力度検定",
      "木口せん断破壊（抜け出し破壊）の照査"
    ],
    cannotDo: [
      "ガラス庇・膜構造庇の自重・風圧連成解析",
      "引張ロッド式吊り庇の初期張力導入計算"
    ]
  },

  // ==========================================
  // カテゴリ3: 水平構面・耐力壁・詳細系 (11ツール)
  // ==========================================
  {
    id: "kugihairetsushoteisu",
    category: "detail",
    categoryName: "水平構面・耐力壁系",
    title: "釘配列諸定数 計算",
    summary: "面材留め付け釘の間隔・配列に応じた諸定数・せん断耐力の詳細算定。",
    icon: "density_medium",
    url: "https://app.mdo3.com/tools/kugihairetsushoteisu.html",
    videoUrl: "#video-kugi",
    manualUrl: "#manual-kugi",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "外周釘ピッチ・中通り釘ピッチによるせん断耐力・面材倍率の算定",
      "CN50/CN65/N50/N65/N75等各種JIS釘および専用ビスに対応",
      "木造軸組構法・枠組壁工法の計算基準に準拠した諸定数導出"
    ],
    cannotDo: [
      "釘の引き抜き・錆による経年劣化係数の推定",
      "特殊接着剤併用時の複合せん断剥離解析"
    ]
  },
  {
    id: "shosai_okabe",
    category: "detail",
    categoryName: "水平構面・耐力壁系",
    title: "面材張り大壁 (許容応力度・剛性算定)",
    summary: "大壁仕様耐力壁の倍率・許容せん断耐力・剛性の精緻算定。",
    icon: "view_quilt",
    url: "https://app.mdo3.com/tools/shosai-okabe.html",
    videoUrl: "#video-shosai-okabe",
    manualUrl: "#manual-shosai-okabe",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "構造用合板、OSB、パーティクルボード、石膏ボード等の大壁耐力算定",
      "告示倍率を超える高耐力壁の許容応力度設計計算書作成",
      "壁せん断剛性Kの算出（偏心率計算用データ導出）"
    ],
    cannotDo: [
      "筋かいと面材の併用における塑性変形性能（Ds値）の動的非線形解析",
      "面外曲げと面内せん断の完全3次元相互連成"
    ]
  },
  {
    id: "shosai_shinkabe",
    category: "detail",
    categoryName: "水平構面・耐力壁系",
    title: "面材張り真壁 (伝統仕様算定)",
    summary: "伝統的真壁仕様における面材直張り耐力壁の算定。",
    icon: "table_rows",
    url: "https://app.mdo3.com/tools/shosai-shinkabe.html",
    videoUrl: "#video-shosai-shinkabe",
    manualUrl: "#manual-shosai-shinkabe",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "柱・梁のチリ寸法を考慮した真壁面材の受材留め付け・直張り耐力評価",
      "真壁仕様独自の有効倍率およびせん断剛性算定",
      "和風住宅・古民家改修における耐震補強計算"
    ],
    cannotDo: [
      "土塗り壁（小舞竹下地）の復元力特性実験値同定",
      "伝統仕口（長ほぞ差し等）の非破壊強度推定"
    ]
  },
  {
    id: "shosai_tarukiyane",
    category: "detail",
    categoryName: "水平構面・耐力壁系",
    title: "垂木工法勾配屋根 (任意配列)",
    summary: "垂木工法による勾配屋根水平構面の倍率・剛性算定。",
    icon: "roofing",
    url: "https://app.mdo3.com/tools/shosai-tarukiyane.html",
    videoUrl: "#video-taruki-yane",
    manualUrl: "#manual-taruki-yane",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "勾配屋根の傾斜角補正を考慮した水平構面倍率算定",
      "任意垂木間隔・釘配列による許容せん断耐力計算",
      "吹抜け周辺の屋根面剛性評価"
    ],
    cannotDo: [
      "円弧ドーム・ヴォールト屋根の面内せん断算定",
      "トラス弦材と面材の複合座屈照査"
    ]
  },
  {
    id: "shosai_tarukiyane_kihon",
    category: "detail",
    categoryName: "水平構面・耐力壁系",
    title: "垂木工法勾配屋根 [基本仕様]",
    summary: "標準規格仕様における垂木工法屋根構面の早見・算定。",
    icon: "rule",
    url: "https://app.mdo3.com/tools/shosai-tarukiyane-kihon.html",
    videoUrl: "#video-taruki-kihon",
    manualUrl: "#manual-taruki-kihon",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "告示基準仕様に準拠したワンタップ水平構面倍率決定",
      "標準的なピッチ・面材厚の入力によるスピード計算書作成"
    ],
    cannotDo: [
      "特殊ピッチ（変則間隔）の精密FEM評価"
    ]
  },
  {
    id: "shosai_yanejikabari",
    category: "detail",
    categoryName: "水平構面・耐力壁系",
    title: "面材直張り勾配屋根 (任意配列)",
    summary: "垂木を介さず母屋直張りとする勾配屋根水平構面の算定。",
    icon: "splitscreen",
    url: "https://app.mdo3.com/tools/shosai-yanejikabari.html",
    videoUrl: "#video-yanejika",
    manualUrl: "#manual-yanejika",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "母屋ピッチ910mm/1000mm等の面材直張り屋根水平構面算定",
      "傾斜屋根の面内せん断力伝達計算および釘耐力照査"
    ],
    cannotDo: [
      "断熱材挟み込み工法のせん断すべり粘弾性計算"
    ]
  },
  {
    id: "shosai_yanejikabari_kihon",
    category: "detail",
    categoryName: "水平構面・耐力壁系",
    title: "面材直張り勾配屋根 [基本仕様]",
    summary: "標準仕様面材直張り屋根構面の算定。",
    icon: "task_alt",
    url: "https://app.mdo3.com/tools/shosai-yanejikabari-kihon.html",
    videoUrl: "#video-yanejika-kihon",
    manualUrl: "#manual-yanejika-kihon",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "公庫・標準マニュアル仕様に基づく母屋直張り水平構面の簡易判定"
    ],
    cannotDo: [
      "非定型特殊配列の個別検証"
    ]
  },
  {
    id: "shosai_yuka",
    category: "detail",
    categoryName: "水平構面・耐力壁系",
    title: "面材張り床 (任意配列・高倍率検討)",
    summary: "根太間隔・釘ピッチを自由に設定できる床水平構面の耐力算定。",
    icon: "grid_view",
    url: "https://app.mdo3.com/tools/shosai-yuka.html",
    videoUrl: "#video-yuka-opt",
    manualUrl: "#manual-yuka-opt",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "24mm/28mm剛床および根太あり床の自由な釘ピッチせん断耐力算定",
      "高倍率床構面（倍率3.0倍以上）の許容応力度設計計算書作成",
      "床剛性値の自動算出"
    ],
    cannotDo: [
      "床開口率30%超の特殊形状における2次元有限要素法応力集中解析"
    ]
  },
  {
    id: "shosai_yuka_kihon",
    category: "detail",
    categoryName: "水平構面・耐力壁系",
    title: "面材張り床 [基本仕様]",
    summary: "告示仕様・公庫仕様に基づく床水平構面の基本算定。",
    icon: "view_compact",
    url: "https://app.mdo3.com/tools/shosai-yuka-kihon.html",
    videoUrl: "#video-yuka-kihon",
    manualUrl: "#manual-yuka-kihon",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "標準剛床仕様（実付き合板24/28mm）の告示耐力・剛性の即時判定"
    ],
    cannotDo: [
      "特殊変則留付けの個別評価"
    ]
  },
  {
    id: "neta",
    category: "detail",
    categoryName: "水平構面・耐力壁系",
    title: "根太工法 水平構面/屋根構面",
    summary: "根太工法による床・屋根構面の倍率・剛性評価。",
    icon: "view_week",
    url: "https://app.mdo3.com/tools/neta.html",
    videoUrl: "#video-neta",
    manualUrl: "#manual-neta",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "落とし込み根太・転ばし根太仕様の水平構面せん断倍率算定",
      "根太と梁・桁の接合釘・金物の耐力照査"
    ],
    cannotDo: [
      "根太の経年乾燥収縮による床鳴りシミュレーション"
    ]
  },
  {
    id: "jintsuko_bf",
    category: "detail",
    categoryName: "水平構面・耐力壁系",
    title: "開口部補強・割増検討",
    summary: "開口部周辺の耐力壁・スラブの割増補強検討。",
    icon: "tab_unselected",
    url: "https://app.mdo3.com/tools/jintsuko_bf.html",
    videoUrl: "#video-jintsuko-bf",
    manualUrl: "#manual-jintsuko-bf",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "壁・スラブ開口周りの割増応力係数の算定",
      "開口補強筋の必要断面積判定書作成"
    ],
    cannotDo: [
      "3次元塑性ひび割れ進展解析"
    ]
  },

  // ==========================================
  // カテゴリ4: WRC造パッケージ (2ツール)
  // ==========================================
  {
    id: "wrc_simulator",
    category: "wrc",
    categoryName: "WRC造パッケージ",
    title: "WRC一括検定シミュレータ (HOUSE-WL完全互換)",
    summary: "壁式鉄筋コンクリート(WRC)造の梁断面・壁量一括検定（HOUSE-WL完全互換）。",
    icon: "speed",
    url: "https://app.mdo3.com/tools/wrc_simulator.html",
    videoUrl: "#video-wrc-sim",
    manualUrl: "#manual-wrc-sim",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "HOUSE-WLの計算出力データ完全連携・一括検定",
      "壁量・壁厚・梁断面のOK/NG一括色分けシミュレーション",
      "設計変更時のリアルタイム断面再算定"
    ],
    cannotDo: [
      "ラーメンRC造やS造との混構造立体解析",
      "保有水平耐力計算（ルート3計算）"
    ]
  },
  {
    id: "wrc_axial_force",
    category: "wrc",
    categoryName: "WRC造パッケージ",
    title: "長期軸力分割ツール",
    summary: "WRC造における耐力壁・柱ごとの長期鉛直荷重・軸力分割計算。",
    icon: "vertical_split",
    url: "https://app.mdo3.com/tools/wrc_axial_force.html",
    videoUrl: "#video-wrc-axial",
    manualUrl: "#manual-wrc-axial",
    pricing: { individual: 980, categoryPack: 1980, allAccess: 3980 },
    canDo: [
      "各階床面積・屋根面積からの長期軸力の自動按分分割",
      "各耐力壁・独立柱にかかる固定・積載荷重の集計表作成"
    ],
    cannotDo: [
      "地盤の不等沈下による応力再配分連成計算"
    ]
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MDO3_TOOLS_CATALOG };
}
