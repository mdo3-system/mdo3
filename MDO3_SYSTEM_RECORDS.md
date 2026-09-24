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

## 2. サーバー & インフラ接続情報

| 項目 | 設定値 / 詳細情報 | 備考 |
| :--- | :--- | :--- |
| **ホスト (サーバー)** | `mdo3.xsrv.jp` (エックスサーバー / sv16377等) | ポート: `10022` |
| **SSH ユーザー** | `mdo3` | 公開鍵認証方式 |
| **SSH 秘密鍵の配置先 (推奨)** | `C:\Users\049sm\.ssh\id_rsa` または `id_ed25519` | XServer管理パネルから発行した鍵 |
| **本番ドキュメントルート (基幹)** | `/home/mdo3/mdo3.com/public_html` | `https://mdo3.com` |
| **本番ドキュメントルート (ツール)** | `/home/mdo3/mdo3.com/public_html/app` | `https://app.mdo3.com` |
| **旧環境ドキュメントルート** | `/home/mdo3/eie.jp/public_html/2025` | 旧壁量計算WEB (`2025.eie.jp`) |
| **構造計算マスター用ルート** | `/home/mdo3/thanks.work/public_html/kozo/` | `sub` サイト |
| **データベース (MySQL)** | XServer 共有MySQL | 共通認証DB（`users`, `subscriptions`）設置予定 |

---

## 3. GitHub 設定情報 & リポジトリ構成

| リポジトリ名 | GitHub URL | 役割 | 現状ステータス |
| :--- | :--- | :--- | :--- |
| **`mdo3`** *(新設)* | `git@github.com:mdo3-system/mdo3.git` | **基幹ポータル & 統合SaaS全体管理** | 今回新設（基幹システム） |
| **`sub`** | `git@github.com:mdo3-system/sub.git` | 構造計算28ツール群マスター (Wasm化対象) | 稼働中 |
| **`2025N`** | `git@github.com:mdo3-system/2025N.git` | 旧壁量計算WEB (`mdo3_remote/app`) | 参照・移行元リソース |
| **`pr`** | `git@github.com:mdo3-system/pr.git` | 販売管理・マーケティングポータル | 参照リソース |

- **GitHub オーガナイゼーション / アカウント**: `mdo3-system` (または `mdo3`)
- **コミッター メールアドレス**: `mdo3@mdo3.xsrv.jp` (または `eie@ymail.ne.jp`)

---

## 4. Stripe 連携および現況確認結果 (Phase 1 調査)

### 現況調査結果 (2026-09-24 確認)
1. **既存コードにおけるStripe状態**:
   - `wall_4split_v2/mdo3_remote/app/config/stripe.php` を確認した結果、Stripe APIキーはプレースホルダー（`pk_live_placeholder`, `sk_live_placeholder`）にリセットされている。
   - `STRIPE_REBUILD_MEMO.md` の記録通り、旧Stripe連携はクリア済みであり、現在はマジックリンクによる無償・無料利用モードとなっている。
2. **サブスクリプション収入状況**:
   - **継続的なサブスク課金・自動請求は現在発生していない**ことをコード上・設計メモ上で確認済み。
3. **今後の構築方針**:
   - 既存の不要なWebhookや過去のテスト商品がStripeダッシュボードに残っている場合は、混乱を防ぐため整理・アーカイブする。
   - `mdo3.com` 基幹ポータル構築（Phase 2）に合わせて、新しい正規プラン（週額/月額/年額/動画講座）のProduct ID / Price IDを新規発行する。

---

## 5. Phase 1 進捗・設定タスクリスト

- [x] **現況確認**: 既存Stripe状態のコード調査完了（継続課金なし、プレースホルダー状態を確認）
- [x] **プロトコル策定**: 変更実行前の必須シーケンス (Pre-Flight Check) の公式化
- [x] **台帳作成**: `MDO3_SYSTEM_RECORDS.md` の作成
- [ ] **SSH鍵の配備**: Windows環境 (`C:\Users\049sm\.ssh`) へのXServer秘密鍵配置および接続疎通確認
- [ ] **GitHub リポジトリ `mdo3` の初期化**:
  - ローカルリポジトリ `git init`
  - GitHub (`mdo3-system/mdo3`) へのリモート設定 & 初期コミット
- [ ] **共通SSO認証基盤（DB設計）**:
  - `Domain=.mdo3.com` で全サブドメインから参照可能な共通 `users` / `sessions` / `subscriptions` テーブル設計
  - XServer MySQLへのマイグレーションスクリプト作成と適用
