"use client";

import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeHighlight from "rehype-highlight";

/**
 * Rich rendering for FAST Guide answers: GitHub-flavoured markdown with
 * tables and task lists, chat-style soft line breaks, and advanced syntax
 * highlighting for fenced code blocks. Every colour the highlighter emits
 * is one of the four FAST brand values or the warm-grey ladder mixed from
 * taupe (see .guide-md / .hljs-* in globals.css), so even a code block
 * still looks like FAST — never like a foreign chat product.
 *
 * Raw HTML is never rendered (no rehype-raw), so nothing an answer contains
 * can inject markup; links are forced to open safely in a new tab.
 */

/** Read the fenced-block language (language-ts, language-python…) out of
 * the <code> child that rehype-highlight has annotated. */
function languageOf(children: ReactNode): string | null {
  const child = Array.isArray(children) ? children[0] : children;
  if (isValidElement(child)) {
    const cls = (child.props as { className?: string | undefined }).className ?? "";
    const match = cls.match(/language-([\w+#.-]+)/);
    if (match) return match[1];
  }
  return null;
}

const components: Components = {
  pre({ children }) {
    const lang = languageOf(children);
    return (
      <div className="guide-code">
        <div className="guide-code-bar" aria-hidden="true">
          <span className="guide-code-lang">{lang ?? "code"}</span>
        </div>
        <pre>{children}</pre>
      </div>
    );
  },
  a({ href, children }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="guide-table-wrap">
        <table>{children}</table>
      </div>
    );
  },
};

export function GuideMarkdown({ text }: { text: string }) {
  return (
    <div className="guide-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[[rehypeHighlight, { detect: false, ignoreMissing: true }]]}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
