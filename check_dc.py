import sys
target_file = r'D:\Dropbox\■住ま居る\■住ま居る共有\案内図作成\Antigravity\js\controllers\drawing-controller.js'
content = open(target_file, encoding='utf-8').read()
sys.stdout.buffer.write(content.encode('utf-8'))
