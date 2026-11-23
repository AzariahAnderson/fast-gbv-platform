// Scan 0001_fast_schema.sql for forward table references (create order).
const src = require("fs").readFileSync(
  new URL("../../supabase/migrations/0001_fast_schema.sql", import.meta.url),
  "utf8",
);
const lines = src.split("\n");
const created = new Map();
const refs = [];
lines.forEach((l, i) => {
  const c = l.match(/create table if not exists public\.(\w+)/);
  if (c) created.set(c[1], i + 1);
  const v = l.match(/create view public\.(\w+)/);
  if (v) created.set(v[1], i + 1);
  const r = l.match(/references public\.(\w+)/);
  if (r) refs.push({ line: i + 1, table: r[1], stmt: l.trim().slice(0, 60) });
});
for (const r of refs) {
  const pos = created.get(r.table);
  if (pos === undefined || pos > r.line) {
    console.log(`line ${r.line}: references ${r.table} (defined at ${pos ?? "NEVER"}) :: ${r.stmt}`);
  }
}
console.log("scan done");
