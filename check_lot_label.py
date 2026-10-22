import sys
target_file = r'D:\Dropbox\■住ま居る\■住ま居る共有\案内図作成\Antigravity\js\svg-builder.js'
content = open(target_file, encoding='utf-8').read()

s = content.find('${lot.label ?')
e = content.find("` : ''}", s) + len("` : ''}")
sys.stdout.buffer.write(content[s:e].encode('utf-8'))
