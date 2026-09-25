@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo ======================================================================
echo   mdo3 STUDIO | Quadro GPU Video Pipeline ^& Google Drive Sync
echo ======================================================================
echo.

cd /d "%~dp0"

if not exist "inputs" mkdir inputs
if not exist "outputs" mkdir outputs

echo [1/3] inputs\ フォルダ内のクリップを確認しています...
dir /b "inputs\*.mp4" "inputs\*.mov" "inputs\*.webm" 2>nul | findstr "." >nul
if %errorlevel% neq 0 (
    echo.
    echo [案内] inputs フォルダに Veo 3 からダウンロードしたクリップがありません。
    echo   1. mdo3 STUDIO (https://mdo3.com/studio/) で各アカウントのプロンプトをコピペ
    echo   2. Veo 3 で生成された動画クリップ (例: clip_01.mp4, clip_02.mp4 ...) を
    echo      以下のフォルダに保存してください:
    echo      "%~dp0inputs"
    echo.
    echo フォルダを開きます...
    explorer "%~dp0inputs"
    pause
    exit /b 0
)

echo [2/3] Quadro K5200 GPU (NVENC) による自動結合レンダリングを開始します...
py render_video.py
if %errorlevel% neq 0 (
    echo [エラー] レンダリング処理中にエラーが発生しました。
    pause
    exit /b 1
)

echo.
echo [3/3] 最新の完成動画を確認します...
for /f "delims=" %%I in ('dir /b /a-d /o-d "outputs\*.mp4"') do (
    set "LATEST_VIDEO=outputs\%%I"
    goto :found_latest
)
:found_latest

if defined LATEST_VIDEO (
    echo 完成動画: %LATEST_VIDEO%
    echo 動画をプレビュー再生します...
    start "" "%LATEST_VIDEO%"
    
    echo.
    set /p UPLOAD_CONFIRM="Google Drive API へアップロードして mdo3 STUDIO に同期しますか？ (Y/N) [初期値: Y]: "
    if /i "!UPLOAD_CONFIRM!"=="" set "UPLOAD_CONFIRM=Y"
    if /i "!UPLOAD_CONFIRM!"=="Y" (
        py gdrive_uploader.py "%LATEST_VIDEO%"
    )
)

echo.
echo ======================================================================
echo   全工程が正常に完了しました。
echo ======================================================================
pause
