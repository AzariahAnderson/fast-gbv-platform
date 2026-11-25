#!/bin/bash
# Full regeneration pipeline for the FAST release report.
set -e
OUT=/home/z/my-project/download/FAST-Platform-Full-Release-Report-v1.1.5.docx
cd /home/z/my-project/scripts
node gen-report.js
python3 /home/z/my-project/skills/docx/scripts/add_toc_placeholders.py "$OUT" --auto
python3 - <<'EOF'
import zipfile, re, shutil
path = '/home/z/my-project/download/FAST-Platform-Full-Release-Report-v1.1.5.docx'
with zipfile.ZipFile(path,'r') as z:
    names = z.namelist(); data = {n: z.read(n) for n in names}
doc = data['word/document.xml'].decode('utf-8')
m = re.search(r'(<w:fldChar w:fldCharType="separate"/></w:r>)(<w:hyperlink [^>]*>.*?</w:hyperlink>)', doc, re.S)
assert m, 'default TOC entry not found'
doc = doc[:m.start()] + m.group(1) + doc[m.end():]
data['word/document.xml'] = doc.encode('utf-8')
tmp = path + '.tmp'
with zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED) as z:
    for n in names: z.writestr(n, data[n])
shutil.move(tmp, path)
print('stray default TOC entry removed')
EOF
python3 postprocess-footers.py "$OUT"
python3 /home/z/my-project/skills/docx/scripts/postcheck.py "$OUT"
