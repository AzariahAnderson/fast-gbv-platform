#!/usr/bin/env node
/**
 * Final pre-deployment secret scan (Section 1 of deployment gate).
 * Reports only: file, line number, pattern NAME. Never prints matched values.
 * Scans: src/ tests/ scripts/ supabase/ docs/ public/ + root config files.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/home/z/my-project";

// High-signal secret patterns. Each entry: name -> regex source.
const PATTERNS = {
  "supabase-secret-key": "sb_secret_[A-Za-z0-9_-]{10,}",
  "supabase-publishable-key": "sb_publishable_[A-Za-z0-9_-]{10,}",
  "legacy-jwt": "eyJ[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{10,}",
  "postgres-url-with-password": "postgres(?:ql)?://[^\\s'\"<>:]+:[^\\s'\"@<>]{4,}@",
  "gemini-key-prefix": "AQ\\.Ab8RN6[A-Za-z0-9]{4,}",
  "google-api-key": "AIza[A-Za-z0-9_-]{20,}",
  "github-token": "gh[pousr]_[A-Za-z0-9]{20,}",
  "aws-key": "AKIA[0-9A-Z]{16}",
  "openai-style-key": "sk-[A-Za-z0-9_-]{20,}",
  "bearer-literal": "[Bb]earer\\s+[A-Za-z0-9_-]{25,}",
  "cron-secret-assignment": "CRON_SECRET\\s*=\\s*['\"][^'\"]{6,}['\"]",
  "supabase-url-with-key": "supabase\\.co[^\\s'\"]*(?:apikey|sb_)[A-Za-z0-9_-]{10,}",
};

// Directories to scan (as required by the task) + root-level config files.
const DIRS = ["src", "tests", "scripts", "supabase", "docs", "public"];
const ROOT_FILES = [
  "package.json", "next.config.ts", "vercel.json", "tailwind.config.ts",
  "tsconfig.json", "playwright.config.ts", "README.md", "components.json",
  "eslint.config.mjs", "postcss.config.mjs",
];

function collectFiles() {
  const args = DIRS.map((d) => `"${join(ROOT, d)}"`).join(" ");
  // rg --files lists tracked+untracked files under the given dirs (no pattern needed).
  const out = execSync(
    `rg --files --hidden -g '!node_modules' -g '!.next' -g '!.git' ${args} 2>/dev/null || true`,
    { cwd: ROOT, shell: "/bin/bash", encoding: "utf8" }
  );
  const files = new Set(out.split("\n").filter(Boolean).map((f) => (f.startsWith("/") ? f : join(ROOT, f))));
  for (const rf of ROOT_FILES) {
    try { files.add(join(ROOT, rf)); } catch { /* missing file ok */ }
  }
  return [...files];
}

let findings = 0;
const files = collectFiles();
for (const file of files) {
  let content;
  try { content = readFileSync(file, "utf8"); } catch { continue; }
  const lines = content.split("\n");
  for (const [name, source] of Object.entries(PATTERNS)) {
    const re = new RegExp(source);
    lines.forEach((line, i) => {
      if (re.test(line)) {
        findings++;
        console.log(`[HIT] ${name} :: ${file.replace(ROOT + "/", "")}:${i + 1}`);
      }
    });
  }
}

console.log(`\nScanned ${files.length} files, ${findings} raw hits (review each above).`);
console.log("Values are intentionally NOT printed.");
