import os
import tarfile
import subprocess
import time

LOCAL_BASE = r"e:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\kindle\video_output"
REMOTE_BASE = "/home/mdo3/mdo3.com/public_html/3/video_output"
SSH_HOST = "mdo3@mdo3.xsrv.jp"
SSH_PORT = "10022"
ARCHIVE_PATH = r"e:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\mdo3\portal_media_bundle.tar.gz"

def main():
    print("1. Packing audio and Grade_Pre2 videos into archive...")
    t0 = time.time()
    
    with tarfile.open(ARCHIVE_PATH, "w:gz") as tar:
        dirs = [d for d in os.listdir(LOCAL_BASE) if os.path.isdir(os.path.join(LOCAL_BASE, d)) and d.startswith("chapter")]
        dirs.sort()
        for d in dirs:
            dp = os.path.join(LOCAL_BASE, d)
            for f in os.listdir(dp):
                # 朗読音声全級 + 準2級動画
                if f.startswith("narration") and f.endswith(".mp3"):
                    full_p = os.path.join(dp, f)
                    arcname = f"{d}/{f}"
                    tar.add(full_p, arcname=arcname)
                elif f.endswith("_Grade_Pre2.mp4"):
                    full_p = os.path.join(dp, f)
                    arcname = f"{d}/{f}"
                    tar.add(full_p, arcname=arcname)

    size_mb = os.path.getsize(ARCHIVE_PATH) / (1024 * 1024)
    print(f"Archive created: {size_mb:.1f} MB in {time.time() - t0:.1f}s")

    print("\n2. Uploading archive to server via SCP...")
    t1 = time.time()
    scp_cmd = [
        "scp", "-P", SSH_PORT, "-o", "StrictHostKeyChecking=no",
        ARCHIVE_PATH,
        f"{SSH_HOST}:{REMOTE_BASE}/portal_media_bundle.tar.gz"
    ]
    res = subprocess.run(scp_cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("Upload failed:", res.stderr)
        return
    print(f"Upload complete in {time.time() - t1:.1f}s")

    print("\n3. Extracting archive on server...")
    extract_cmd = f"cd {REMOTE_BASE} && tar -xzf portal_media_bundle.tar.gz && rm -f portal_media_bundle.tar.gz"
    ssh_cmd = [
        "ssh", "-p", SSH_PORT, "-o", "StrictHostKeyChecking=no",
        SSH_HOST, extract_cmd
    ]
    res2 = subprocess.run(ssh_cmd, capture_output=True, text=True)
    if res2.returncode != 0:
        print("Extract failed:", res2.stderr)
        return
    print("Archive extracted successfully on server!")

    # Cleanup local archive
    if os.path.exists(ARCHIVE_PATH):
        os.remove(ARCHIVE_PATH)
        print("Cleaned up local archive file.")

    print("\n🎉 ALL AUDIO & GRADE_PRE2 VIDEOS DEPLOYED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
