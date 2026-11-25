"""Post-process FAST report docx: patch footer PAGE fields with explicit
format switches (WPS compatibility) and strip empty pgNumType elements."""
import re
import sys
import zipfile
import shutil

path = sys.argv[1]
tmp = path + ".tmp"

with zipfile.ZipFile(path, "r") as zin:
    names = zin.namelist()
    data = {n: zin.read(n) for n in names}

doc = data["word/document.xml"].decode("utf-8")

# 1. strip empty pgNumType (docx-js artifact confusing WPS)
doc = doc.replace("<w:pgNumType/>", "")

# 2. map sections -> footer files via footerReference order
rels = data["word/_rels/document.xml.rels"].decode("utf-8")
rel_map = dict(re.findall(r'Id="([^"]+)"[^>]*Target="([^"]+)"', rels))

sect_footers = []  # footer file per sectPr, in document order (None if absent)
for sect in re.findall(r"<w:sectPr.*?</w:sectPr>|<w:sectPr[^>]*/>", doc, re.S):
    m = re.search(r'<w:footerReference[^>]*r:id="([^"]+)"', sect)
    if m:
        target = rel_map.get(m.group(1), "")
        sect_footers.append("word/" + target.lstrip("/") if target else None)
    else:
        sect_footers.append(None)
print("sections found:", len(sect_footers), "footers per section:", sect_footers)

# expected: [None(cover), footer-frontmatter, footer-body]
fmt_for_section = {1: "ROMAN", 2: "arabic"}
for idx, fname in enumerate(sect_footers):
    if fname is None or idx not in fmt_for_section:
        continue
    fmt = fmt_for_section[idx]
    xml = data[fname].decode("utf-8")
    patched = re.sub(
        r"(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)",
        rf"\1 PAGE \\* {fmt} \\* MERGEFORMAT \2",
        xml,
    )
    if patched == xml:
        print(f"WARNING: no bare PAGE field patched in {fname}")
    else:
        print(f"patched {fname} -> \\* {fmt}")
    data[fname] = patched.encode("utf-8")

data["word/document.xml"] = doc.encode("utf-8")

with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
    for n in names:
        zout.writestr(n, data[n])
shutil.move(tmp, path)
print("post-process complete:", path)
