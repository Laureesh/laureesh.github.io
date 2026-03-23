import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useTheme } from "../themeContext";
import "./TurnstileWidget.css";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Turnstile")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Turnstile"));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

interface TurnstileWidgetProps {
  siteKey: string;
  onSuccess: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
}

export default function TurnstileWidget({
  siteKey,
  onSuccess,
  onExpire,
  onError,
}: TurnstileWidgetProps) {
  const [loadError, setLoadError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return undefined;
    }

    let cancelled = false;

    void (async () => {
      try {
        setLoadError(false);
        await loadTurnstileScript();

        if (cancelled || !containerRef.current || !window.turnstile) {
          return;
        }

        containerRef.current.innerHTML = "";

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: theme === "light" ? "light" : "dark",
          callback: (token) => {
            onSuccess(token);
            setLoadError(false);
          },
          "expired-callback": () => {
            onExpire();
          },
          "error-callback": () => {
            setLoadError(true);
            onError();
          },
        });
      } catch {
        if (!cancelled) {
          setLoadError(true);
          onError();
        }
      }
    })();

    return () => {
      cancelled = true;

      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onError, onExpire, onSuccess, siteKey, theme]);

  return (
    <div className="turnstile-widget-shell">
      <div ref={containerRef} className="turnstile-widget" />
      {loadError ? (
        <p className="turnstile-widget-note turnstile-widget-note--error">
          Turnstile could not load. Refresh the page and try again.
        </p>
      ) : (
        <p className="turnstile-widget-note">
          <ShieldCheck size={14} />
          Complete the verification before creating your account.
        </p>
      )}
    </div>
  );
}
