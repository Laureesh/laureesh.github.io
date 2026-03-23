import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { BlogCodeBlock as BlogCodeBlockData } from "../data/blogPosts";

interface BlogCodeBlockProps {
  block: BlogCodeBlockData;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function highlightCode(language: string, snippet: string) {
  const escaped = escapeHtml(snippet);
  const lang = language.toLowerCase();

  if (lang === "text") {
    return escaped
      .replace(
        /^(\s*[a-z0-9-]+\/)$/gim,
        '<span class="blog-token blog-token-directory">$1</span>',
      )
      .replace(
        /([A-Za-z0-9_-]+\.(tsx|ts|js|jsx|css|html|json))/g,
        '<span class="blog-token blog-token-file">$1</span>',
      );
  }

  if (lang === "bash" || lang === "sh" || lang === "shell") {
    return escaped
      .replace(/(^|\n)(npm|npx|pnpm|yarn|cd)(?=\s)/g, '$1<span class="blog-token blog-token-keyword">$2</span>')
      .replace(/(--[a-z-]+)/g, '<span class="blog-token blog-token-operator">$1</span>')
      .replace(/(@latest|react-ts|my-portfolio|react)/g, '<span class="blog-token blog-token-string">$1</span>');
  }

  return escaped
    .replace(
      /\b(const|let|function|return|export|import|from|type|interface|if|else|for|while|async|await)\b/g,
      '<span class="blog-token blog-token-keyword">$1</span>',
    )
    .replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, '<span class="blog-token blog-token-string">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="blog-token blog-token-number">$1</span>')
    .replace(/(\/\/.*$)/gm, '<span class="blog-token blog-token-comment">$1</span>');
}

export default function BlogCodeBlock({ block }: BlogCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(block.snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="blog-code-block">
      <div className="blog-code-label">
        <div className="blog-code-meta">
          <span>{block.label}</span>
          <span>{block.language}</span>
        </div>
        <button type="button" className="blog-code-copy" onClick={handleCopy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code
          dangerouslySetInnerHTML={{
            __html: highlightCode(block.language, block.snippet),
          }}
        />
      </pre>
    </div>
  );
}
