import {
  MAX_RECENT_PAGES,
  RECENT_PAGES_STORAGE_KEY,
  type RecentPage,
} from "../data/siteNavigation";

const listeners = new Set<() => void>();
let cachedPages: RecentPage[] | null = null;

function readStoredPages() {
  if (cachedPages) {
    return cachedPages;
  }

  try {
    const saved = localStorage.getItem(RECENT_PAGES_STORAGE_KEY);
    cachedPages = saved ? (JSON.parse(saved) as RecentPage[]) : [];
  } catch {
    cachedPages = [];
  }

  return cachedPages;
}

function writeStoredPages(pages: RecentPage[]) {
  cachedPages = pages;

  try {
    localStorage.setItem(RECENT_PAGES_STORAGE_KEY, JSON.stringify(pages));
  } catch {
    // Ignore storage failures and keep the in-memory cache.
  }

  listeners.forEach((listener) => listener());
}

export function subscribeRecentPages(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRecentPagesSnapshot() {
  return readStoredPages();
}

export function trackRecentPage(page: RecentPage | null) {
  if (!page) {
    return;
  }

  const currentPages = readStoredPages();
  const nextPages = [
    page,
    ...currentPages.filter((currentPage) => currentPage.path !== page.path),
  ].slice(0, MAX_RECENT_PAGES);

  const hasChanged =
    nextPages.length !== currentPages.length ||
    nextPages.some((currentPage, index) =>
      currentPage.path !== currentPages[index]?.path ||
      currentPage.label !== currentPages[index]?.label,
    );

  if (hasChanged) {
    writeStoredPages(nextPages);
  }
}
