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
