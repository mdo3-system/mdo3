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

### 💡 複数PCでの「うまい運用方法」
1. **Dropbox で鍵ファイルを一元保管**:
   - `Dropbox\mdo3.key` (XServer接続鍵)
   - `Dropbox\github_id_ed25519.key` (GitHub接続鍵)
2. **ワンクリック環境セットアップスクリプト**:
   - 本リポジトリ内の `scripts/setup_ssh_env.bat` をダブルクリックするだけで、自動的に `D:\Dropbox` または `E:\Dropbox` を判別し、そのPCの `%USERPROFILE%\.ssh` への配備と `~/.ssh/config` の自動生成を行います。
   - これにより、どちらのPCでも同一のコマンド（`ssh mdo3@mdo3.xsrv.jp`、`git push`、自動デプロイコマンド等）が完全にそのまま動作します。

---

## 3. GitHub 設定情報 & 稼働中リポジトリ構成

| リポジトリ名 | GitHub URL | 役割 | 稼働ステータス (2026-09-24 確認) |
| :--- | :--- | :--- | :--- |
| **`mdo3`** *(新設)* | `git@github.com:mdo3-system/mdo3.git` | **基幹ポータル & 統合SaaS全体管理** | **初期化 & push 完了 (mainブランチ開通)** |
| **`2025N`** | `git@github.com:mdo3-system/2025N.git` | 壁量計算WEB (`2025.eie.jp`) | **正規稼働中 (最新コミット: v3.13.37)** |
| **`pr`** | `git@github.com:mdo3-system/pr.git` | 営業契約管理ポータル (`pr.eie.tokyo`) | **正規稼働中 (Google Drive連携済み)** |
| **`sub`** | `git@github.com:mdo3-system/sub.git` | 構造計算28ツール群マスター (Wasm化対象) | **稼働中 (`thanks.work/public_html/kozo/`)** |

- **GitHub Organization**: `mdo3-system`
- **コミッター**: `mdo3 <mdo3@mdo3.xsrv.jp>`

---

## 4. 共通SSO認証基盤（DB設計 & マジックリンク）

### ① ドメイン共通クッキー仕様
- **クッキー名**: `mdo3_session_token`
- **ドメイン**: `Domain=.mdo3.com`
- **属性**: `Path=/; Secure; HttpOnly; SameSite=Lax`
- **有効期限**: 30日間
- **動作**: `mdo3.com`, `app.mdo3.com`, `az.mdo3.com`, `map.mdo3.com` のどのサブドメインからでも、同一セッショントークンによりログインユーザー・契約権限が即座に共有されます。

### ② データベーステーブル設計 (MySQL: `mdo3_toolapp`)
- **`users` テーブル** (共通会員):
  - `id`, `email`, `name`, `company`, `role` (`user`, `staff`, `admin`), `status` (`active`, `suspended`, `pending`), `created_at`, `last_login_at`
- **`magic_links` テーブル** (ワンタイム認証URL管理):
  - `id`, `user_id`, `token` (64文字), `redirect_to`, `expires_at`, `used_at`, `created_at`
- **`sessions` テーブル** (共通セッショントークン):
  - `id`, `session_token` (128文字), `user_id`, `ip_address`, `user_agent`, `expires_at`, `last_activity_at`
- **`subscriptions` テーブル** (ツール別・個別価格対応サブスクリプション):
  - `id`, `user_id`, `target_tool` (`all`, `app`, `az`, etc.), `plan_tier` (`free`, `spot_weekly`, `monthly_std`, `annual`, `permanent_staff`), `status` (`active`, `trialing`, `canceled`), `current_period_end`

---

## 5. 初期3アカウント & マジックリンク発行結果 (Phase 1 反映済み)

本番MySQL（`mdo3_toolapp`）へマイグレーションスクリプトをCLI実行し、初期3アカウントを全ツール無期限権限（`permanent_staff`）として登録、ワンタイムログインURLを発行いたしました。

| アカウント (Email) | 権限 (Role) | プラン | マジックリンクURL (有効期限: 2026-10-24 12:36) |
| :--- | :--- | :--- | :--- |
| **`eie@ymail.ne.jp`** | `admin` (管理者) | 全ツール無期限 | `https://app.mdo3.com/api/verify_magic_link.php?token=6658b54b5665923df9d3ea2e62b36e3f9d903b72391f16eb45236ea2ce27e7b2` |
| **`sato@t-smile.co.jp`** | `admin` (管理者) | 全ツール無期限 | `https://app.mdo3.com/api/verify_magic_link.php?token=cd918d4ef0d48ba5ca8b07f61d046146ec766491540c75d22d1c19a028ff809f` |
| **`s2712350@gmail.com`** | `staff` (スタッフ) | 全ツール無期限 | `https://app.mdo3.com/api/verify_magic_link.php?token=862f025f8ee2e7dae897a4d27f65e966c1be1a0909728bb206152b3ae75cbb76` |

---

## 6. Phase 2 展望 & タスクロードマップ

1. **`app.mdo3.com` への `sub` 構造計算ツール群の同期 & 整備**:
   - `sub` リポジトリからの全28ツール一覧取得
   - 各ツールの紹介カード・ボックスの作成
   - 操作説明動画・マニュアル・紹介動画の配置
2. **個別価格設定 & 新Stripe連携**:
   - ツール個別課金（単体月額/週額）および全ツールまとめプランのProduct/Price ID新規作成
   - Stripe Customer Portal および Webhook の本番接続
3. **`mdo3.com` 基幹ポータル構築**:
   - 総合案内、全サブドメインナビゲーション、動画講座ポータル（Cloudflare Stream連携）の構築
