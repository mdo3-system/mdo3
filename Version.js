/**
 * Version.js - mdo3.com 基幹ポータル & 統合SaaS バージョン管理
 */
(function() {
    window.APP_VERSION = 'v1.0.1';
    window.APP_BUILD_DATE = '2026-09-24';
    window.APP_RELEASE_NOTES = [
        'v1.0.1 (2026-09-24): 共通SSO基盤マイグレーション完了、初期3アカウントマジックリンク発行、複数PC SSH運用スクリプト整備、GitHubリモート開通',
        'v1.0.0 (2026-09-24): mdo3 基幹ポータルリポジトリ新設・Phase 1初期化着手'
    ];
    console.log('[mdo3] Current version:', window.APP_VERSION, '(' + window.APP_BUILD_DATE + ')');
})();
