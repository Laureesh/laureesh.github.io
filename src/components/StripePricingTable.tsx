import { useEffect, useRef, useState } from "react";

const STRIPE_PRICING_TABLE_SCRIPT_SRC = "https://js.stripe.com/v3/pricing-table.js";

let stripePricingTableScriptPromise: Promise<void> | null = null;

function ensureStripePricingTableScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (customElements.get("stripe-pricing-table")) {
    return Promise.resolve();
  }

  if (stripePricingTableScriptPromise) {
    return stripePricingTableScriptPromise;
  }

  stripePricingTableScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${STRIPE_PRICING_TABLE_SCRIPT_SRC}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Unable to load Stripe Pricing Table.")),
        { once: true },
      );

      if (customElements.get("stripe-pricing-table")) {
        resolve();
      }

      return;
    }

    const script = document.createElement("script");
    script.src = STRIPE_PRICING_TABLE_SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Unable to load Stripe Pricing Table.")),
      { once: true },
    );
    document.body.appendChild(script);
  });

  return stripePricingTableScriptPromise;
}

interface StripePricingTableProps {
  pricingTableId: string;
  publishableKey: string;
  clientReferenceId?: string | null;
  customerEmail?: string | null;
  className?: string;
}

export default function StripePricingTable({
  pricingTableId,
  publishableKey,
  clientReferenceId,
  customerEmail,
  className,
}: StripePricingTableProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await ensureStripePricingTableScript();

        if (cancelled || !containerRef.current) {
          return;
        }

        containerRef.current.innerHTML = "";

        const table = document.createElement("stripe-pricing-table");
        table.setAttribute("pricing-table-id", pricingTableId);
        table.setAttribute("publishable-key", publishableKey);

        if (clientReferenceId?.trim()) {
          table.setAttribute("client-reference-id", clientReferenceId.trim());
        }

        if (customerEmail?.trim()) {
          table.setAttribute("customer-email", customerEmail.trim());
        }

        containerRef.current.appendChild(table);
        setLoadError(null);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Unable to load Stripe Pricing Table.");
        }
      }
    })();

    return () => {
      cancelled = true;

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [clientReferenceId, customerEmail, pricingTableId, publishableKey]);

  return (
    <div className={className}>
      {loadError ? <p className="account-status-text is-error">{loadError}</p> : null}
      <div ref={containerRef} />
    </div>
  );
}
