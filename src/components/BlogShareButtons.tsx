import { useState } from "react";
import { Copy, Linkedin, Link2, Twitter } from "lucide-react";

interface BlogShareButtonsProps {
  title: string;
  url: string;
}

export default function BlogShareButtons({ title, url }: BlogShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="card blog-share-card">
      <div>
        <p className="blog-surface-label">Share</p>
        <h3>Send this post somewhere useful.</h3>
      </div>
      <div className="blog-share-actions">
        <a
          className="blog-share-btn"
          href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
          target="_blank"
          rel="noreferrer"
        >
          <Twitter size={16} />
          Twitter
        </a>
        <a
          className="blog-share-btn"
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
          target="_blank"
          rel="noreferrer"
        >
          <Linkedin size={16} />
          LinkedIn
        </a>
        <button type="button" className="blog-share-btn" onClick={handleCopy}>
          {copied ? <Link2 size={16} /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </section>
  );
}
