import re
import subprocess

TARGET_FILE = r"e:\Dropbox\■設計ｻﾎﾟｰﾄ\■note\antigravity\kindle\study_portal_for_son.html"

with open(TARGET_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# isDateReported 判定関数の追加または確認
# generateLineReportText の更新
old_gen_fn = """    function generateLineReportText() {
      const d = new Date(selectedReportDate + 'T00:00:00');
      const dStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
      
      const today = new Date();
      const todayStr = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;
      const yest = new Date(); yest.setDate(yest.getDate() - 1);
      const yestStr = `${yest.getFullYear()}/${yest.getMonth() + 1}/${yest.getDate()}`;
      
      let dateSuffix = '';
      if (dStr === todayStr) dateSuffix = ' (本日分)';
      else if (dStr === yestStr) dateSuffix = ' (昨日分)';
      else dateSuffix = ' (過去振替分)';"""

new_gen_fn = """    function isDateReported(dateStr) {
      if (!dateStr) return false;
      const history = JSON.parse(localStorage.getItem('son_reward_history') || '[]');
      const d = new Date(dateStr + 'T00:00:00');
      const dFormatted = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
      return history.some(h => h.date === dFormatted || h.date === dateStr);
    }

    function generateLineReportText() {
      const d = new Date(selectedReportDate + 'T00:00:00');
      const dStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
      
      const today = new Date();
      const todayStr = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;
      const yest = new Date(); yest.setDate(yest.getDate() - 1);
      const yestStr = `${yest.getFullYear()}/${yest.getMonth() + 1}/${yest.getDate()}`;
      
      let dateSuffix = '';
      if (dStr === todayStr) dateSuffix = ' (本日分)';
      else if (dStr === yestStr) dateSuffix = ' (昨日分)';
      else dateSuffix = ' (過去振替分)';

      const alreadyReported = isDateReported(selectedReportDate);"""

content = content.replace(old_gen_fn, new_gen_fn)

# msg の組み立て部分に警告文の挿入を追加
old_msg_start = """      let msg = `【父と母に報告】${dStr}${dateSuffix} の学習＆日課 完了報告 📅\\n\\n`;
      msg += `⚡ サボり判定: ${slackingDays === 0 ? 'サボりなし (100% 満額)' : `${slackingDays}日サボり (${getMultiplier() * 100}% 適用)`}\\n\\n`;"""

new_msg_start = """      let msg = `【父と母に報告】${dStr}${dateSuffix} の学習＆日課 完了報告 📅\\n`;
      if (alreadyReported) {
        msg += `⚠️【再報告・上書き注意】※この日(${dStr})の日報は既に提出済みです。内容更新のため再報告します。\\n`;
      }
      msg += `\\n`;
      msg += `⚡ サボり判定: ${slackingDays === 0 ? 'サボりなし (100% 満額)' : `${slackingDays}日サボり (${getMultiplier() * 100}% 適用)`}\\n\\n`;"""

content = content.replace(old_msg_start, new_msg_start)

# submitToLine に confirm ダイアログを追加
old_submit_start = """    function submitToLine(e) {
      if (e && e.preventDefault) e.preventDefault();
      const text = generateLineReportText();"""

new_submit_start = """    function submitToLine(e) {
      if (e && e.preventDefault) e.preventDefault();
      
      const d = new Date(selectedReportDate + 'T00:00:00');
      const dFormatted = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
      if (isDateReported(selectedReportDate)) {
        const ok = confirm(`⚠️ 【再報告の確認】\\n\\n${dFormatted} の日報は既に報告済みです！\\n親へのLINE送信文面にも【再報告・上書き注意】の警告が記載されます。\\n\\nこのまま再報告を送信しますか？`);
        if (!ok) return;
      }

      const text = generateLineReportText();"""

content = content.replace(old_submit_start, new_submit_start)

with open(TARGET_FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated study_portal_for_son.html with LINE warning logic!")

# SCP to server
res1 = subprocess.run([
    "scp", "-P", "10022", "-o", "StrictHostKeyChecking=no",
    TARGET_FILE, "mdo3@mdo3.xsrv.jp:/home/mdo3/mdo3.com/public_html/3/study_portal_for_son.html"
], capture_output=True, text=True)

res2 = subprocess.run([
    "ssh", "-p", "10022", "-o", "StrictHostKeyChecking=no",
    "mdo3@mdo3.xsrv.jp",
    "cp /home/mdo3/mdo3.com/public_html/3/study_portal_for_son.html /home/mdo3/mdo3.com/public_html/3/index.html"
], capture_output=True, text=True)

if res1.returncode == 0 and res2.returncode == 0:
    print("Successfully uploaded to XServer study_portal_for_son.html and index.html!")
else:
    print("SCP/SSH Error:", res1.stderr, res2.stderr)
