interface ImportMetaEnv {
  readonly VITE_ADMIN_IDLE_TIMEOUT_MINUTES?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_STRIPE_PRICING_TABLE_ID?: string;
  readonly VITE_STRIPE_API_BASE_URL?: string;
  readonly VITE_STRIPE_PURCHASES_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
