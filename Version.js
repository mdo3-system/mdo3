/**
 * Version.js - mdo3.com 基幹ポータル & 統合SaaS バージョン管理
 */
(function() {
    window.APP_VERSION = 'v1.0.4';
    window.APP_BUILD_DATE = '2026-09-24';
    window.APP_RELEASE_NOTES = [
        'v1.0.4 (2026-09-24): Stripe本番新Product/Price発行完了、Checkout決済API開通、Webhook自動同期ハンドラー配備、ポータル決済ボタン連携',
        'v1.0.3 (2026-09-24): mdo3.com 基幹ポータル本番構築・デプロイ完了（全28ツールカタログ・判断基準モーダル・確定料金表・無料リソース導線配備）',
        'v1.0.2 (2026-09-24): app.mdo3.com 移動反映・動作テスト完了(欠落修正・全28ツール正常配信確認)、Phase 2全ツール体系分類と個別価格設計策定',
        'v1.0.1 (2026-09-24): 共通SSO基盤マイグレーション完了、初期3アカウントマジックリンク発行、複数PC SSH運用スクリプト整備、GitHubリモート開通',
        'v1.0.0 (2026-09-24): mdo3 基幹ポータルリポジトリ新設・Phase 1初期化着手'
    ];
    console.log('[mdo3] Current version:', window.APP_VERSION, '(' + window.APP_BUILD_DATE + ')');
})();
