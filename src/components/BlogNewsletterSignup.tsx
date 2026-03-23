import { useState, type FormEvent } from "react";
import { Mail, Send } from "lucide-react";

const NEWSLETTER_STORAGE_KEY = "portfolio-blog-newsletter";

interface StoredSignup {
  email: string;
  signedUpAt: number;
}

interface BlogNewsletterSignupProps {
  compact?: boolean;
}

function getStoredSignup() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(NEWSLETTER_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as StoredSignup;
  } catch {
    return null;
  }
}

export default function BlogNewsletterSignup({
  compact = false,
}: BlogNewsletterSignupProps) {
  const storedSignup = getStoredSignup();
  const [email, setEmail] = useState(storedSignup?.email ?? "");
  const [status, setStatus] = useState<"idle" | "success" | "error">(
    storedSignup ? "success" : "idle",
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus("error");
      return;
    }

    window.localStorage.setItem(
      NEWSLETTER_STORAGE_KEY,
      JSON.stringify({
        email: email.trim(),
        signedUpAt: Date.now(),
      } satisfies StoredSignup),
    );
    setStatus("success");
  };

  return (
    <section className={`card blog-newsletter ${compact ? "compact" : ""}`}>
      <div className="blog-newsletter-copy">
        <p className="blog-surface-label">
          <Mail size={14} />
          Newsletter
        </p>
        <h3>Get the next post without checking back manually.</h3>
        <p>
          This signup is stored locally for now while I keep the blog system lightweight.
        </p>
      </div>
      <form className="blog-newsletter-form" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status === "error") {
              setStatus("idle");
            }
          }}
          aria-label="Email address"
        />
        <button type="submit" className="btn btn-primary">
          <Send size={16} />
          {status === "success" ? "Saved" : "Sign Up"}
        </button>
      </form>
      <p className={`blog-newsletter-status ${status}`}>
        {status === "success" && "Saved locally. I can wire this to a real service later."}
        {status === "error" && "Enter a valid email address."}
        {status === "idle" && "No spam. Just new posts and useful project notes."}
      </p>
    </section>
  );
}
