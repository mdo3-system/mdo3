#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scan_sub_updates.py - sub リポジトリの更新検知 ＆ note+/X 配信データ自動生成エンジン
- sub (app.mdo3.com 構造計算コア) の Git コミット履歴を自動スキャン
- 「何をどう変えたか」「何が変わったか」「何に対応したのか」を構造化解析
- note+ 記事ドラフト ＆ X 速報ポスト文を自動生成
- public/studio/data/tool_updates.json に出力して STUDIO UI と連動
"""

import os
import sys
import json
import subprocess
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MDO3_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
SUB_DIR = os.path.abspath(os.path.join(MDO3_DIR, "..", "sub"))
OUTPUT_JSON = os.path.join(MDO3_DIR, "public", "studio", "data", "tool_updates.json")

def get_git_commits(repo_dir, max_count=15):
    """Git コミット履歴の取得"""
    if not os.path.exists(repo_dir):
        print(f"[WARN] sub ディレクトリが見つかりません: {repo_dir}")
        return []

    cmd = [
        "git", "-C", repo_dir, "log", f"-n{max_count}",
        "--pretty=format:%h|%cd|%s|%an",
        "--date=iso"
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True, encoding="utf-8")
        lines = res.stdout.strip().split("\n")
        commits = []
        for line in lines:
            if not line.strip():
                continue
            parts = line.split("|")
            if len(parts) >= 4:
                commits.append({
                    "hash": parts[0],
                    "date": parts[1][:10],
                    "subject": parts[2],
                    "author": parts[3]
                })
        return commits
    except Exception as e:
        print(f"[ERROR] git log 取得エラー: {e}")
        return []

def get_commit_diff_stat(repo_dir, commit_hash):
    """コミットの変更ファイル一覧を取得"""
    cmd = ["git", "-C", repo_dir, "show", "--stat", "--oneline", commit_hash]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True, encoding="utf-8")
        return res.stdout
    except Exception:
        return ""

def analyze_commit(commit, diff_stat):
    """コミット内容から『何をどう変えたか・何が変わったか・何に対応したか』を構造化"""
    subj = commit["subject"]
    h = commit["hash"]
    date = commit["date"]

    # 変更対象ツールの推定
    tool_name = "構造計算全ツール"
    tool_url = "https://app.mdo3.com/"
    target_category = "共通基盤・構造計算"

    if "wasm" in subj.lower() or "assemblyscript" in subj.lower():
        tool_name = "WebAssembly (Wasm) 高速計算コア"
        target_category = "計算エンジン"
    elif "保存" in subj or "復元" in subj or "印刷" in subj or "v1.4.0" in subj:
        tool_name = "全28ツール共通（保存・復元・A4印刷機能）"
        target_category = "実務出力・データ保存"
    elif "sma" in subj.lower() or "foundation beam" in subj.lower() or "基礎梁" in subj:
        tool_name = "基礎梁の検定（長期曲げ・短期許容曲げ応力算定）"
        tool_url = "https://app.mdo3.com/tools/cantilever_foundation_beam.html"
        target_category = "基礎・擁壁・地盤系"
    elif "cantilever" in subj.lower() or "片持ち" in subj:
        tool_name = "片持ち基礎梁の検定（柱あり/柱なし）"
        tool_url = "https://app.mdo3.com/tools/cantilever_foundation_beam.html"
        target_category = "基礎・擁壁・地盤系"
    elif "wrc" in subj.lower():
        tool_name = "WRC造（壁式鉄筋コンクリート造）軸力算定ツール"
        target_category = "RC・WRC造系"
    elif "rebar" in subj.lower() or "釣り合い鉄筋" in subj:
        tool_name = "釣り合い鉄筋比・限界配筋計算ツール"
        target_category = "基礎・擁壁・地盤系"

    # ① 何をどう変えたか
    what_changed = subj
    if "wasm" in subj.lower():
        what_changed = "AssemblyScriptによるWebAssembly(Wasm)バイナリ計算基盤を構築し、ブラウザ上での瞬時幾何解析・断面算定を高速化。"
    elif "保存" in subj:
        what_changed = "全ツールに入力値のローカルJSON保存・復元機能および審査機関提出用のA4縦印刷フォーマットを標準配備。"
    elif "sma" in subj.lower():
        what_changed = "基礎梁水平加力計算スロットにおいて、長期曲げモーメント(LMa)から短期許容曲げモーメント(SMa = LMa × 1.5)の自動算定ロジックを実装。"

    # ② 何が変わったか（メリット）
    user_benefit = "計算処理のレスポンスが向上し、手計算の転記ミスを完全排除。審査提出用A4計算書を1分で生成可能に。"
    if "保存" in subj:
        user_benefit = "過去の計算案件データをJSONで安全に手元保管でき、再審査や設計変更時の再計算が1秒で復元可能になりました。"
    elif "sma" in subj.lower():
        user_benefit = "手動での係数掛け合わせ計算や転記が一切不要となり、アーキトレンド等の転記軸力から直ちに安全判定を取得できます。"

    # ③ 何に対応したのか（法令・規準）
    standards_matched = "建築基準法施行令第82条（許容応力度計算）、住宅金融支援機構 木造住宅工事仕様書に準拠。"
    if "wrc" in subj.lower():
        standards_matched = "日本建築学会「壁式鉄筋コンクリート造設計規準・同解説 (AIJ-WRC)」に準拠。"

    # note+ 用 記事ドラフト (Markdown)
    note_article = f"""# 【mdo3 アップデート速報】{tool_name}の機能改善と実務対応について

平素より構造計算クラウド「mdo3」をご利用いただきありがとうございます。
このたび、**{tool_name}** において実務設計者の利便性と審査適合性を向上させる機能改変・アップデートを実施いたしました。

---

## 1. 今回のアップデート概要
- **対象ツール**: {tool_name}
- **カテゴリ**: {target_category}
- **反映バージョン**: {subj.split(':')[0] if ':' in subj else '最新版'} ({date})
- **利用URL**: {tool_url}

---

## 2. 何をどう変えたか（改変内容）
{what_changed}

---

## 3. 何が変わったか？（実務上のメリット）
{user_benefit}
これまでの手作業による数値入力や確認作業が大幅に短縮され、ミスが許されない構造審査業務を劇的に効率化します。

---

## 4. 何に対応したのか？（準拠法令・指針）
- **準拠法令・規準**: {standards_matched}
- **審査適合性**: 審査機関（指定確認検査機関等）への提出用計算書としてそのままご利用いただけます。

---

## 5. 今すぐブラウザでお試しいただけます
インストール不要・ログイン後すぐにご利用いただけます。
▶ **{tool_name} を試す**: {tool_url}

今後とも実務設計者の皆様の声を反映し、継続的な改善を行ってまいります。
"""

    # X（旧Twitter）用 速報ポスト文（140字以内）
    x_post = f"""【mdo3 アップデート速報】
{tool_name}を更新しました！

▼ 改変内容:
{what_changed[:45]}…
▼ メリット:
{user_benefit[:40]}…
法令基準（{standards_matched[:20]}…）完全適合。

詳細・利用はこちら▶
{tool_url}

#mdo3 #構造計算 #建築確認申請"""

    return {
        "commit_hash": h,
        "date": date,
        "raw_subject": subj,
        "tool_name": tool_name,
        "category": target_category,
        "tool_url": tool_url,
        "what_changed": what_changed,
        "user_benefit": user_benefit,
        "standards_matched": standards_matched,
        "note_article": note_article.strip(),
        "x_post": x_post.strip()
    }

def scan_and_generate():
    print(f"[SCAN] sub リポジトリをスキャン中: {SUB_DIR}")
    commits = get_git_commits(SUB_DIR, max_count=10)
    if not commits:
        print("[WARN] 有効なコミットが見つかりませんでした。")
        return []

    updates = []
    for c in commits:
        diff_stat = get_commit_diff_stat(SUB_DIR, c["hash"])
        item = analyze_commit(c, diff_stat)
        updates.append(item)

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(updates, f, ensure_ascii=False, indent=2)

    print(f"[SUCCESS] {len(updates)} 件の更新履歴を生成・保存しました: {OUTPUT_JSON}")
    return updates

if __name__ == "__main__":
    scan_and_generate()
