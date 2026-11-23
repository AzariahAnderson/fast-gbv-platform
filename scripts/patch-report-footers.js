/* Post-process: footer PAGE format switches + strip empty pgNumType (WPS compat). */
const fs = require("fs");
const { execSync } = require("child_process");
const path = "/home/z/my-project/download/FAST_Full_Website_Report.docx";
const tmp = "/tmp/report-docx";

execSync(`rm -rf ${tmp} && mkdir -p ${tmp} && cd ${tmp} && unzip -q ${path}`);

// 1. document.xml: remove empty pgNumType (cover section artifact)
let docXml = fs.readFileSync(`${tmp}/word/document.xml`, "utf8");
const before = docXml.length;
docXml = docXml.replace(/<w:pgNumType\/>/g, "");

// 1b. TOC first entry: docx-js merges the first heading's hyperlink+PAGEREF
// copy INTO the field paragraph (begin+instrText+separate live there) and
// emits every later entry as its own paragraph. That merged copy is the ONLY
// copy of "1. Executive Summary", so it must be KEPT — stripping it deletes
// the first entry from the rendered TOC (verified 23 Nov 2026).
fs.writeFileSync(`${tmp}/word/document.xml`, docXml);
console.log("document.xml patched:", before - docXml.length, "bytes");

// 2. Footers: identify which footer belongs to which section.
// Section 2 (front matter) uses UPPER_ROMAN; section 3 (body) uses DECIMAL.
// docx-js emits footerN.xml references in sectPr order. Patch every footer's
// bare PAGE instrText with the correct switch based on order of appearance:
// first referenced footer (front matter) -> ROMAN, later ones -> arabic.
const rels = fs.readFileSync(`${tmp}/word/document.xml`, "utf8");
const footerRefs = [...rels.matchAll(/<w:footerReference[^>]*r:id="(rId\d+)"/g)].map(m => m[1]);
const relXml = fs.readFileSync(`${tmp}/word/_rels/document.xml.rels`, "utf8");
const footerFiles = footerRefs.map(rid => {
  const m = relXml.match(new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"`));
  return m ? m[1] : null;
}).filter(Boolean);
console.log("footer refs in order:", footerFiles.join(", "));

footerFiles.forEach((f, i) => {
  const fp = `${tmp}/word/${f}`;
  if (!fs.existsSync(fp)) return;
  let xml = fs.readFileSync(fp, "utf8");
  const fmt = i === 0 ? "ROMAN" : "arabic";
  xml = xml.replace(
    /(<w:instrText[^>]*>)\s*PAGE\s*(<\/w:instrText>)/g,
    `$1 PAGE \\* ${fmt} \\* MERGEFORMAT $2`
  );
  fs.writeFileSync(fp, xml);
  console.log(`${f}: PAGE -> \\* ${fmt}`);
});

execSync(`cd ${tmp} && zip -q -r -X out.docx . && mv out.docx ${path}`);
console.log("repacked", fs.statSync(path).size, "bytes");
