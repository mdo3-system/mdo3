#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
render_video.py - mdo3 STUDIO ローカル動画レンダリングエンジン
- NVIDIA Quadro K5200 (NVENC h264_nvenc) GPUハードウェアアクセラレーション対応
- Veo 3 クリップの自動シーケンス結合
- BGMの自動クロスフェード・音量調整
- 高速レンダリング＆エラー時のCPU (libx264) 自動フォールバック
"""

import os
import sys
import glob
import json
import subprocess
import argparse
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(SCRIPT_DIR, "config.json")

def load_config():
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def check_nvenc_available():
    """NVENCが利用可能かテスト"""
    cmd = ["ffmpeg", "-f", "lavfi", "-i", "color=c=black:s=256x256:d=1", "-c:v", "h264_nvenc", "-f", "null", "-"]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return res.returncode == 0
    except Exception:
        return False

def render_pipeline(input_dir=None, output_path=None, bgm_path=None):
    config = load_config()
    
    if not input_dir:
        input_dir = os.path.join(SCRIPT_DIR, "inputs")
    if not os.path.exists(input_dir):
        os.makedirs(input_dir, exist_ok=True)
        print(f"[INFO] 入力フォルダを作成しました: {input_dir}")
        print(f"[GUIDE] Veo 3 からダウンロードしたクリップ (clip_01.mp4, clip_02.mp4 ...) を {input_dir} に配置してください。")
        return None

    # 入力クリップ一覧の取得
    clips = sorted(glob.glob(os.path.join(input_dir, "*.mp4")) + 
                   glob.glob(os.path.join(input_dir, "*.mov")) + 
                   glob.glob(os.path.join(input_dir, "*.webm")))

    if not clips:
        print(f"[WARN] {input_dir} 内に動画クリップ (*.mp4, *.mov, *.webm) が見つかりません。")
        return None

    print(f"[FOUND] {len(clips)} 本のクリップを検出しました:")
    for idx, c in enumerate(clips, 1):
        print(f"  [{idx}] {os.path.basename(c)}")

    # 出力ファイル名の決定
    output_dir = os.path.join(SCRIPT_DIR, "outputs")
    os.makedirs(output_dir, exist_ok=True)
    if not output_path:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(output_dir, f"mdo3_rendered_{ts}.mp4")

    # concat用一時リスト作成
    concat_list_path = os.path.join(SCRIPT_DIR, "concat_list.txt")
    with open(concat_list_path, "w", encoding="utf-8") as f:
        for c in clips:
            safe_path = c.replace("\\", "/")
            f.write(f"file '{safe_path}'\n")

    # GPU (NVENC) チェック
    use_nvenc = check_nvenc_available()
    vcodec = "h264_nvenc" if use_nvenc else "libx264"
    print(f"[ENCODER] レンダリング方式: {'NVIDIA NVENC (Quadro K5200 GPU)' if use_nvenc else 'CPU (libx264)'}")

    # BGM設定
    audio_cfg = config.get("audio", {})
    if not bgm_path:
        default_bgm = os.path.join(SCRIPT_DIR, audio_cfg.get("default_bgm", ""))
        if os.path.exists(default_bgm):
            bgm_path = default_bgm

    # FFmpeg コマンド構築
    # 映像を再結合・均一化しつつBGMをミキシング
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", concat_list_path
    ]

    if bgm_path and os.path.exists(bgm_path):
        print(f"[AUDIO] BGMトラックを合成: {os.path.basename(bgm_path)}")
        ffmpeg_cmd.extend(["-stream_loop", "-1", "-i", bgm_path])
        # BGM音量調整とミックス
        bgm_vol = audio_cfg.get("bgm_volume", 0.2)
        filter_complex = f"[1:a]volume={bgm_vol}[bgm];[0:a][bgm]amix=inputs=2:duration=first[aout]"
        ffmpeg_cmd.extend(["-filter_complex", filter_complex, "-map", "0:v", "-map", "[aout]"])
    else:
        ffmpeg_cmd.extend(["-map", "0:v", "-c:a", "aac"])

    ffmpeg_cmd.extend([
        "-c:v", vcodec,
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        output_path
    ])

    print("[RUNNING] レンダリング処理を開始します...")
    try:
        process = subprocess.run(ffmpeg_cmd, check=True)
        print(f"\n[SUCCESS] レンダリング完了！")
        print(f"  出力ファイル: {output_path}")
        print(f"  ファイルサイズ: {os.path.getsize(output_path) / 1024 / 1024:.2f} MB")
        
        # クリーンアップ
        if os.path.exists(concat_list_path):
            os.remove(concat_list_path)
            
        return output_path
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] レンダリング失敗 (code {e.returncode})")
        if use_nvenc:
            print("[FALLBACK] CPU (libx264) に切り替えて再試行します...")
            ffmpeg_cmd[ffmpeg_cmd.index("h264_nvenc")] = "libx264"
            subprocess.run(ffmpeg_cmd, check=True)
            return output_path
        return None

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="mdo3 STUDIO GPU動画レンダリングエンジン")
    parser.add_argument("--inputs", help="入力クリップ格納ディレクトリ")
    parser.add_argument("--output", help="出力先MP4パス")
    parser.add_argument("--bgm", help="BGM音声ファイルパス")
    args = parser.parse_args()

    render_pipeline(args.inputs, args.output, args.bgm)
