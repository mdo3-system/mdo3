import os
import subprocess
import time

LOCAL_BASE = r"e:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\kindle\video_output"
REMOTE_BASE = "/home/mdo3/mdo3.com/public_html/3/video_output"
SSH_HOST = "mdo3@mdo3.xsrv.jp"
SSH_PORT = "10022"

def run_ssh(cmd):
    full = ["ssh", "-p", SSH_PORT, "-o", "StrictHostKeyChecking=no", SSH_HOST, cmd]
    return subprocess.run(full, capture_output=True, text=True)

def scp_file(local_path, remote_dir):
    full = ["scp", "-P", SSH_PORT, "-o", "StrictHostKeyChecking=no", local_path, f"{SSH_HOST}:{remote_dir}"]
    return subprocess.run(full, capture_output=True, text=True)

def main():
    dirs = [d for d in os.listdir(LOCAL_BASE) if os.path.isdir(os.path.join(LOCAL_BASE, d)) and d.startswith("chapter")]
    dirs.sort()
    print(f"Found {len(dirs)} chapter directories.")

    # 1. Create remote directories
    remote_dirs = " ".join([f"{REMOTE_BASE}/{d}" for d in dirs])
    print("Creating remote directories...")
    res = run_ssh(f"mkdir -p {remote_dirs}")
    if res.returncode != 0:
        print("Error creating directories:", res.stderr)
        return
    print("Remote directories created successfully.")

    # 2. Upload narration mp3s (total ~64MB)
    print("\n--- Uploading narration audio files ---")
    audio_count = 0
    for d in dirs:
        dp = os.path.join(LOCAL_BASE, d)
        mp3s = [f for f in os.listdir(dp) if f.startswith("narration") and f.endswith(".mp3")]
        for mp3 in mp3s:
            lp = os.path.join(dp, mp3)
            rp = f"{REMOTE_BASE}/{d}/{mp3}"
            res = scp_file(lp, rp)
            if res.returncode == 0:
                audio_count += 1
            else:
                print(f"Failed to upload {mp3}: {res.stderr}")
    print(f"Audio upload complete: {audio_count} files uploaded.")

    # 3. Upload Grade_Pre2 videos (1.6GB total)
    print("\n--- Uploading Grade_Pre2 videos ---")
    video_count = 0
    for d in dirs:
        dp = os.path.join(LOCAL_BASE, d)
        vids = [f for f in os.listdir(dp) if f.endswith("_Grade_Pre2.mp4")]
        for vid in vids:
            lp = os.path.join(dp, vid)
            size_mb = os.path.getsize(lp) / (1024 * 1024)
            print(f"Uploading {vid} ({size_mb:.1f} MB)...", end="", flush=True)
            t0 = time.time()
            rp = f"{REMOTE_BASE}/{d}/{vid}"
            res = scp_file(lp, rp)
            elapsed = time.time() - t0
            if res.returncode == 0:
                video_count += 1
                speed = size_mb / elapsed if elapsed > 0 else 0
                print(f" Done in {elapsed:.1f}s ({speed:.1f} MB/s)")
            else:
                print(f" Failed: {res.stderr}")

    print(f"\nAll uploads complete! Total {video_count} videos uploaded.")

if __name__ == "__main__":
    main()
