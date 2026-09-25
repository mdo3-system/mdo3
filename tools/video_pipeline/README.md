# mdo3 STUDIO ローカル動画編集・自動合成パイプライン

ユーザーのローカルPC（NVIDIA Quadro K5200 GPU, Python 3.14, FFmpeg 9.0.2）を活用し、Veo 3 からダウンロードしたクリップ群を超高速で結合・BGM合成し、管理者の Google Drive へ直接アップロードして XServer の負荷を完全ゼロにする自動化システムです。

---

## 1. 動作環境 ＆ スペック
- **GPU**: NVIDIA Quadro K5200 (8GB VRAM)
- **ハードウェアエンコーダー**: NVIDIA NVENC (`h264_nvenc`, `hevc_nvenc`)
- **Python**: Python 3.14.3 (`py` コマンド)
- **FFmpeg**: FFmpeg 9.0.2 full_build (Gyan.dev ビルド)

---

## 2. フォルダ構成
```text
tools/video_pipeline/
├── config.json              # パイプライン設定 (GPU, BGM, 5アカウント, GDrive設定)
├── render_video.py          # Quadro GPU NVENC 自動結合レンダリングスクリプト
├── gdrive_uploader.py       # Google Drive API 直接アップロード ＆ mdo3 同期スクリプト
├── run_pipeline.bat         # 【メイン】ワンクリック自動実行バッチ
├── inputs/                  # Veo 3 クリップ (clip_01.mp4, clip_02.mp4 ...) の投入口
├── outputs/                 # 完成動画 (mdo3_rendered_YYYYMMDD_HHMMSS.mp4) の保存先
└── assets/                  # BGM音声素材 (mp3)
```

---

## 3. 実務ワークフロー（3ステップ）

### STEP 1: mdo3 STUDIO でプロンプトをコピペ
1. ブラウザで [https://mdo3.com/studio/](https://mdo3.com/studio/) を開く。
2. 対象ツール（例: `スマート案内図作成エディタ`）と特別な演出要望を入力し、シナリオ素案を確認。
3. 「このシナリオでOK」を押すと、5つのアカウント別にプロンプトが配分されます。
4. 各アカウントの **「⚡ 一発コピペ」** ボタンを押して、Veo 3 のチャット欄に貼り付けて動画を生成。

### STEP 2: クリップを inputs/ フォルダに保存
- Veo 3 で生成された動画クリップ（3本〜15本）をダウンロードし、`tools/video_pipeline/inputs/` フォルダへ保存。

### STEP 3: run_pipeline.bat をダブルクリック
- `run_pipeline.bat` を実行するだけで：
  1. Quadro K5200 GPU (NVENC) で超高速結合・BGM合成。
  2. 自動でプレビュー再生。
  3. 管理者の Google Drive API 経由でアップロードし、mdo3 STUDIO の完成動画ギャラリー(Vault)にURLを登録（XServerへの負荷は完全ゼロ）。

---

## 4. Google Drive API 初回設定ガイド（管理者用）
1. Google Cloud Console で Google Drive API を有効化。
2. 「認証情報」から「OAuth クライアント ID（デスクトップアプリ）」を作成し、JSONをダウンロード。
3. ファイル名を `client_secrets.json` に変更し、本フォルダに配置。
4. 初回実行時にブラウザが開き、Google アカウントで1度だけ認証（許可）すれば、以後は全自動でアップロードされます。
