# mdo3.com 基幹ポータル & 統合SaaS 構築記録・設定管理台帳

本書は、`mdo3.com` 基幹ポータルおよび傘下のサブドメインSaaS群の統合開発における「設定項目」「依頼事項」「インフラ情報」「変更プロトコル」「進捗状況」を網羅して記録・管理する公式台帳ドキュメントである。

---

## 1. 変更実行前の必須シーケンス (Pre-Flight Check & 開発プロトコル)

コード修正や機能追加の指示を受けた際、AIは以下の順序で思考・実行し、チャットにて報告すること。

### ① 現在のステータス確認 & FIXED_LOGIC.md の読込
- `Version.js` 内の `window.APP_VERSION` を確認し、現在のアクティブなGitブランチを確認する。
- **【最重要】** 思考や処理を開始する前に、必ず確定業務フロー・画面構成仕様を把握すること。
- ユーザーからの指示内容と既存仕様との間に矛盾や齟齬、不明瞭な点がある場合は、勝手な仮定で実装を進めず、必ずユーザーにその内容を確認・相談すること。

### ② 物理的バックアップ / Gitコミットおよび本番サーバーへのデプロイの実行
- **必ず最初にローカルで `git pull origin main` を実行し、最新コードを取得すること。**
- 次に `git add .` および `git commit -m "Backup before: [指示内容]"` を実行する。
- コミット後、必ず `git push origin main` を行い、GitHubへプッシュすること。
- **【重要】GitHubへのプッシュ完了後、必ず以下のSSHコマンドを実行し、本番Webサーバー(XServer)へ変更をデプロイすること。**
  ```bash
  ssh -o BatchMode=yes -p 10022 mdo3@mdo3.xsrv.jp "cd mdo3.com/public_html/app && git pull origin main"
  ```
- **【重要】データベースの変更（ALTER TABLE等のマイグレーションスクリプト）を作成した場合は、ユーザーにブラウザからアクセスさせるのではなく、AIが必ずSSH経由でコマンドラインから `php スクリプト名.php` を実行し、直接XServer上で反映させること。**
- 「バックアップおよびデプロイ完了」と報告する際は、必ず実際に実行した Git/SSH コマンドの出力をチャット欄に引用すること（証拠なき報告は虚偽と見なす）。

### ③ 新バージョンの宣言と反映
- **原則:** コードを修正する際は、必ずパッチバージョンをインクリメント（`*.*.+1`）すること。
- `Version.js` の更新内容（コメントによる履歴追記と `APP_VERSION` の更新）を定義し、ユーザーに提示すること。

### ④ 承認後の自律実行 (Autonomous Execution Post-Approval)
- ユーザーから実装計画への「GO」サイン（承認）が出た後は、ファイルの書き換えやターミナルコマンドの実行の許可を毎回尋ねることなく、プロアクティブかつ自律的に実行すること。
- 大切なのは、**実行前にバックアップをとること（いつでも元に戻せる状態を作ること）**と、**実行前に計画を報告し承認を得ること**である。承認後はAIにすべて任されたと解釈し、迅速にタスクを完遂すること。

---

## 2. サーバー & 複数PC（D: / E: ドライブ）SSH運用方法

| 項目 | 設定値 / 詳細情報 | 備考 |
| :--- | :--- | :--- |
| **ホスト (サーバー)** | `mdo3.xsrv.jp` (エックスサーバー / sv16377等) | ポート: `10022` |
| **SSH ユーザー** | `mdo3` | 公開鍵認証方式 |
| **XServer SSH 秘密鍵** | Dropbox 直下: `mdo3.key` | PC①: `D:\Dropbox\mdo3.key`<br>PC②: `E:\Dropbox\mdo3.key` |
| **GitHub SSH 秘密鍵** | Dropbox 直下: `github_id_ed25519.key` | PC①: `D:\Dropbox\github_id_ed25519.key`<br>PC②: `E:\Dropbox\github_id_ed25519.key` |
| **共通設定先 (Windows)**| `%USERPROFILE%\.ssh\` (`C:\Users\<ユーザー名>\.ssh\`) | `config`, `mdo3.key`, `id_ed25519` |
| **本番ドキュメントルート (基幹)** | `/home/mdo3/mdo3.com/public_html` | `https://mdo3.com` |
| **本番ドキュメントルート (ツール)** | `/home/mdo3/mdo3.com/public_html/app` | `https://app.mdo3.com` |
| **旧環境ドキュメントルート** | `/home/mdo3/eie.jp/public_html/2025` | `https://2025.eie.jp` (稼働中最新版) |
| **営業管理ポータルドキュメントルート** | `/home/mdo3/eie.tokyo/public_html/pr` | `https://pr.eie.tokyo` (法人契約管理) |
| **構造計算マスター用ルート** | `/home/mdo3/thanks.work/public_html/kozo/` | `sub` サイト |
| **データベース (MySQL)** | `localhost` / DB: `mdo3_toolapp` | ユーザー: `mdo3_toolapp0001` |

---

## 3. Stripe 確定料金プラン & 新Product/Price ID (2026-09-24 発行済み)

Stripe 本番環境（Livemode）にて、確定料金体系に基づく新商品および新価格を発行完了いたしました。

| プラン区分 | 料金 (税込) | Stripe Product ID | Stripe Price ID (本番確定) | 特徴 |
| :--- | :--- | :--- | :--- | :--- |
| **① ツール個別プラン** | **月額 980円** | `prod_VJja1k2YWNc4fk` | **`price_1UJ6727zvNn4YIGPcDJwPgcj`** | 1計算書ピンポイント利用 |
| **② カテゴリ別パック** | **月額 1,980円** | `prod_VJjaEKES7KM058` | **`price_1UJ6737zvNn4YIGPmHGlOdlw`** | 4大カテゴリ別使い放題 |
| **③ 全ツール使い放題 (月額)**| **月額 3,980円** | `prod_VJja7rOid3RbLX` | **`price_1UJ6737zvNn4YIGPJGIAemxf`** | 全28ツール完全使い放題 |
| **③ 全ツール使い放題 (年額)**| **年額 39,800円** | `prod_VJja7rOid3RbLX` | **`price_1UJ6747zvNn4YIGPt6vEmmpD`** | 実質2ヶ月分無料割引 |
| **④ 操作動画・マニュアル** | **完全無償 (0円)** | — | — | 判断基準リソースとして無料公開 |

- **Webhook エンドポイント**: `https://app.mdo3.com/stripe/webhook` (ID: `we_1Sh1827zvNn4YIGPUMt0o9m2`)
- **Checkout API**: `https://app.mdo3.com/api/create_checkout_session.php` (テスト稼働確認済み)

---

## 4. 全28ツール カタログ体系 & 並び順（v1.0.5 確定仕様）

ユーザー様実務における利用頻度・審査実務フローに基づき、並び順およびブロック構造を再編。

### ① 基礎・擁壁・地盤系 (8ツール)
1. `jintsuko`: 人通口補強計算
2. `cantilever_foundation_beam`: 片持ち基礎梁の検定 (柱あり)
3. `cantilever_beam_no_column`: 片持ち基礎梁 (柱なし) ＆ 片土圧検定
4. `youheki_L_calculator`: Ｌ型擁壁の計算 (2.0m未満)
5. `youheki_calculator`: 逆Ｌ型・逆Ｔ型擁壁の計算
6. `dosha_saigai`: 土砂災害特別警戒区域の外壁等
7. `balanced_rebar_ratio`: スラブ内補強 釣り合い鉄筋比の計算
8. `foundation_beam_horizontal`: 基礎梁 水平力追加計算書 (KBI用)

### ② 木造軸組・接合部系 (7ツール)
1. `zi`: 横架材のZ低減係数
2. `merikomi`: めり込み補強計算
3. `roof_calc`: 屋根葺き材等の検討
4. `hasira_mage`: 柱の曲げ計算
5. `hashigo`: はしご垂木 計算
6. `rigid_frame_R`: 片持ち庇の検討
7. `hariue`: 梁上耐力壁の剛性低減

### ③ 水平構面・耐力壁系 (10ツール)
**【ブロック1: 基本仕様 (告示基準・標準定型)】**
1. `shosai_tarukiyane_kihon`: 垂木工法勾配屋根 [基本仕様]
2. `shosai_yanejikabari_kihon`: 面材直張り勾配屋根 [基本仕様]
3. `shosai_yuka_kihon`: 面材張り床 [基本仕様]
4. `neta`: 根太工法 水平構面/屋根構面 [基本]

**【ブロック2: 任意配列・高倍率・詳細算定】**
5. `shosai_tarukiyane`: 垂木工法勾配屋根 (任意配列)
6. `shosai_yanejikabari`: 面材直張り勾配屋根 (任意配列)
7. `shosai_yuka`: 面材張り床 (任意配列・高倍率検討)
8. `kugihairetsushoteisu`: 釘配列諸定数 計算 ★連動セット
9. `shosai_okabe`: 面材張り大壁 (許容応力度・剛性算定) ★連動セット
10. `shosai_shinkabe`: 面材張り真壁 (伝統仕様算定) ★連動セット
※ ⑧〜⑩は相互連動セットとしてUI上でハイライト連携表示。
※ 開口部補強・割増検討（`jintsuko_bf`）は WRC造パッケージへ移設。

### ④ WRC造パッケージ (3ツール)
1. `wrc_simulator`: WRC一括検定シミュレータ (HOUSE-WL完全互換)
2. `wrc_axial_force`: 長期軸力分割ツール
3. `jintsuko_bf`: 開口部補強・割増検討（水平構面より移設）

---

## 5. 設計用地域定数（Z, S, V0, 凍結深度）自動検索エンジン & 連携サービス群

- **設計用地域定数 自動検索（`mdo3.com/#regionalSearch`）**:
  - 建設地住所入力および Leaflet 地図クリックによる位置ピン配置。
  - 国土地理院 ジオコーディングAPI & 標高API（DEM）連携による標高自動取得。
  - **Z（地震地域係数）**: 昭和55年建設省告示第1793号（静岡県条例等による割増特記含む）。
  - **V0（基準風速）**: 平成12年建設省告示第1454号（市町村告示テーブル網羅）。
  - **S（垂直積雪量）**: 平成19年国土交通省告示第594号（多雪区域判定・標高補正式）。
  - **凍結深度**: 各特定行政庁細則・公庫基準（寒冷地基準値および凍結指数 $F$ による簡易式 $D=C\sqrt{F}$ 対応）。
  - **計算条件ワンクリックコピー機能** 完備。
- **連携クラウドスイート（PRO ARCHITECTURE SUITE）**:
  - **案内図作図ツール (`https://map.mdo3.com`)**: 完全無償・登録不要で提供。申請用案内図自動生成。
  - **斜め壁計算補助 (`https://az.mdo3.com`)**: 2025年法改正・4号縮小対応。斜め壁剛性・許容応力度計算支援。
- **壁量計算WEB (`2025.eie.jp`) の完全分離**:
  - 別ドメイン・別運営・別課金であるため、ポータル内のリンクおよび記載を完全除去。
