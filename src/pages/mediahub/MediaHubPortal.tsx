import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Clapperboard,
  Clock3,
  Film,
  Layers3,
  RefreshCw,
  Search,
  Shuffle,
  Sparkles,
  Star,
  Tv,
} from "lucide-react";
import { Button, Input } from "../../components/ui";
import "./MediaHubPortal.css";

type MediaHubView = "home" | "browse" | "universes" | "genres" | "recent" | "random";
type MediaHubStatusFilter =
  | "all"
  | "watched"
  | "up-next"
  | "in-progress"
  | "coming-soon"
  | "favorites";
type MediaHubFormatFilter = "all" | "movie" | "series";

interface MediaHubSeasonRecord {
  seasonNumber?: number;
  totalEpisodes?: number;
}

interface MediaHubProgressRecord {
  status?: string | null;
  lastSeason?: number | null;
  lastEpisode?: number | null;
  updatedAt?: string | null;
  releaseDate?: string | null;
}

interface MediaHubUpNextRecord {
  addedAt?: string | null;
  nextSeason?: number | null;
  nextEpisode?: number | null;
  nextAirDate?: string | null;
}

interface MediaHubCatalogItem {
  id: number;
  title: string;
  type: string;
  universe: string | null;
  genres: string[];
  releaseYear: number | null;
  endYear: number | null;
  totalSeasons: number;
  totalEpisodes: number;
  description: string | null;
  posterUrl: string | null;
  bannerUrl: string | null;
  createdAt: string | null;
  status: string;
  statusRank: number;
  isFavorite: boolean;
  favorite: { dateAdded?: string | null } | null;
  progress: MediaHubProgressRecord | null;
  upNext: MediaHubUpNextRecord | null;
  history: { finishedAt?: string | null } | null;
  seasons: MediaHubSeasonRecord[] | Record<string, MediaHubSeasonRecord> | null;
}

interface MediaHubCatalogSnapshot {
  generatedAt: string;
  counts: {
    items: number;
    favorites: number;
    watched: number;
    upNext: number;
    comingSoon: number;
    inProgress: number;
  };
  items: MediaHubCatalogItem[];
}

interface NormalizedMediaHubSnapshot
  extends Omit<MediaHubCatalogSnapshot, "items"> {
  items: NormalizedMediaHubItem[];
}

interface NormalizedMediaHubItem {
  id: number;
  title: string;
  type: string;
  format: "movie" | "series";
  formatLabel: string;
  universe: string | null;
  genres: string[];
  releaseYear: number | null;
  endYear: number | null;
  totalSeasons: number;
  totalEpisodes: number;
  description: string;
  posterUrl: string | null;
  bannerUrl: string | null;
  createdAt: string | null;
  status: string;
  statusRank: number;
  isFavorite: boolean;
  progress: MediaHubProgressRecord | null;
  upNext: MediaHubUpNextRecord | null;
  history: { finishedAt?: string | null } | null;
  seasons: MediaHubSeasonRecord[];
}

const VIEW_OPTIONS: Array<{ value: MediaHubView; label: string }> = [
  { value: "home", label: "Home" },
  { value: "browse", label: "Browse" },
  { value: "universes", label: "Universes" },
  { value: "genres", label: "Genres" },
  { value: "recent", label: "Recently Added" },
  { value: "random", label: "Random" },
];

const STATUS_OPTIONS: Array<{ value: MediaHubStatusFilter; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: "watched", label: "Watched" },
  { value: "up-next", label: "Up Next" },
  { value: "in-progress", label: "In Progress" },
  { value: "coming-soon", label: "Coming Soon" },
  { value: "favorites", label: "Favorites" },
];

const FORMAT_OPTIONS: Array<{ value: MediaHubFormatFilter; label: string }> = [
  { value: "all", label: "All Formats" },
  { value: "movie", label: "Movies" },
  { value: "series", label: "Series" },
];

function normalizeSeasons(
  seasons: MediaHubCatalogItem["seasons"],
): MediaHubSeasonRecord[] {
  if (Array.isArray(seasons)) {
    return seasons.filter(Boolean);
  }

  if (seasons && typeof seasons === "object") {
    return Object.values(seasons).filter(Boolean);
  }

  return [];
}

function normalizeFormat(item: MediaHubCatalogItem): "movie" | "series" {
  if (item.type.toLowerCase().includes("movie")) {
    return "movie";
  }

  return item.totalSeasons > 0 ? "series" : "movie";
}

function normalizeFormatLabel(item: MediaHubCatalogItem): string {
  const format = normalizeFormat(item);

  if (format === "series") {
    return item.totalSeasons > 0 ? "Series" : "TV";
  }

  return "Movie";
}

function normalizeCatalogItem(item: MediaHubCatalogItem): NormalizedMediaHubItem {
  return {
    id: item.id,
    title: item.title.trim(),
    type: item.type,
    format: normalizeFormat(item),
    formatLabel: normalizeFormatLabel(item),
    universe: item.universe?.trim() || null,
    genres: item.genres.filter(Boolean),
    releaseYear: item.releaseYear ?? null,
    endYear: item.endYear ?? null,
    totalSeasons: item.totalSeasons ?? 0,
    totalEpisodes: item.totalEpisodes ?? 0,
    description:
      item.description?.trim() ||
      "This title is in the MediaHub catalog, but its synopsis still needs cleanup.",
    posterUrl: item.posterUrl || null,
    bannerUrl: item.bannerUrl || item.posterUrl || null,
    createdAt: item.createdAt ?? null,
    status: item.status || "Not Started",
    statusRank: item.statusRank ?? 0,
    isFavorite: Boolean(item.isFavorite),
    progress: item.progress ?? null,
    upNext: item.upNext ?? null,
    history: item.history ?? null,
    seasons: normalizeSeasons(item.seasons),
  };
}

function buildSnapshot(raw: MediaHubCatalogSnapshot): NormalizedMediaHubSnapshot {
  return {
    ...raw,
    items: raw.items.map(normalizeCatalogItem),
  };
}

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "No date yet";
  }

  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return "No date yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function getStatusClass(status: string) {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function matchesStatus(item: NormalizedMediaHubItem, statusFilter: MediaHubStatusFilter) {
  if (statusFilter === "all") {
    return true;
  }

  if (statusFilter === "favorites") {
    return item.isFavorite;
  }

  if (statusFilter === "watched") {
    return item.status === "Watched";
  }

  if (statusFilter === "up-next") {
    return item.status === "Up Next";
  }

  if (statusFilter === "in-progress") {
    return item.status === "In Progress";
  }

  return item.status === "Coming Soon";
}

function matchesFormat(item: NormalizedMediaHubItem, formatFilter: MediaHubFormatFilter) {
  if (formatFilter === "all") {
    return true;
  }

  return item.format === formatFilter;
}

function matchesSearch(item: NormalizedMediaHubItem, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    item.title,
    item.universe,
    item.description,
    item.status,
    item.type,
    item.genres.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function getFeaturedItem(items: NormalizedMediaHubItem[]) {
  return (
    items.find((item) => item.status === "Up Next" && item.bannerUrl) ||
    items.find((item) => item.status === "In Progress" && item.bannerUrl) ||
    items.find((item) => item.bannerUrl) ||
    items[0] ||
    null
  );
}

function pickRandomItems(items: NormalizedMediaHubItem[], seed: number, count: number) {
  if (!items.length) {
    return [];
  }

  const pool = [...items];
  const picks: NormalizedMediaHubItem[] = [];
  let cursor = Math.abs(seed) % pool.length;

  while (pool.length && picks.length < count) {
    cursor = (cursor * 48271 + 1) % pool.length;
    picks.push(pool.splice(cursor, 1)[0]);
  }

  return picks;
}

function summarizeGroup(items: NormalizedMediaHubItem[]) {
  const favorites = items.filter((item) => item.isFavorite).length;
  const watched = items.filter((item) => item.status === "Watched").length;

  if (favorites > 0) {
    return `${favorites} favorite${favorites === 1 ? "" : "s"} saved here`;
  }

  if (watched > 0) {
    return `${watched} watched title${watched === 1 ? "" : "s"} in this lane`;
  }

  return `${items.length} title${items.length === 1 ? "" : "s"} in the catalog`;
}

function MediaCard({
  item,
  onSelect,
  isActive = false,
}: {
  item: NormalizedMediaHubItem;
  onSelect: (itemId: number) => void;
  isActive?: boolean;
}) {
  return (
    <button
      type="button"
      className={`mediahub-card ${isActive ? "is-active" : ""}`}
      onClick={() => onSelect(item.id)}
    >
      <div className="mediahub-card__poster-shell">
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt={`${item.title} poster`}
            className="mediahub-card__poster"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="mediahub-card__poster mediahub-card__poster--empty">
            <Film size={22} />
          </div>
        )}

        <div className="mediahub-card__badges">
          <span className={`mediahub-badge mediahub-badge--${getStatusClass(item.status)}`}>
            {item.status}
          </span>
          <span className="mediahub-badge mediahub-badge--muted">{item.formatLabel}</span>
        </div>

        {item.isFavorite ? (
          <span className="mediahub-card__favorite">
            <Star size={13} />
            Favorite
          </span>
        ) : null}
      </div>

      <div className="mediahub-card__body">
        <div className="mediahub-card__meta">
          <span>{item.releaseYear ?? "TBA"}</span>
          <span>{item.format === "series" ? `${item.totalSeasons || 1} season${item.totalSeasons === 1 ? "" : "s"}` : "Feature"}</span>
        </div>
        <strong>{item.title}</strong>
        <p>{item.description}</p>
        <div className="mediahub-card__chips">
          {item.genres.slice(0, 3).map((genre) => (
            <span key={`${item.id}-${genre}`} className="mediahub-chip">
              {genre}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

export default function MediaHubPortal() {
  const [snapshot, setSnapshot] = useState<NormalizedMediaHubSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<MediaHubView>("home");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MediaHubStatusFilter>("all");
  const [formatFilter, setFormatFilter] = useState<MediaHubFormatFilter>("all");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [randomSeed, setRandomSeed] = useState(() => Date.now());
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const controller = new AbortController();

    const loadSnapshot = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${import.meta.env.BASE_URL}mediahub/catalog.json`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load the MediaHub snapshot.");
        }

        const raw = (await response.json()) as MediaHubCatalogSnapshot;
        const nextSnapshot = buildSnapshot(raw);
        setSnapshot(nextSnapshot);

        const heroItem = getFeaturedItem(nextSnapshot.items);
        setSelectedItemId(heroItem?.id ?? null);
      } catch (caughtError) {
        if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
          return;
        }

        setError("MediaHub could not be loaded from the local snapshot yet.");
      } finally {
        setLoading(false);
      }
    };

    void loadSnapshot();

    return () => controller.abort();
  }, []);

  const items = snapshot?.items ?? [];

  const sortedItems = useMemo(
    () => [...items].sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt)),
    [items],
  );

  const normalizedQuery = deferredSearch.trim().toLowerCase();

  const filteredBrowseItems = useMemo(
    () =>
      sortedItems.filter(
        (item) =>
          matchesStatus(item, statusFilter) &&
          matchesFormat(item, formatFilter) &&
          matchesSearch(item, normalizedQuery),
      ),
    [formatFilter, normalizedQuery, sortedItems, statusFilter],
  );

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) || getFeaturedItem(items),
    [items, selectedItemId],
  );

  const watchedItems = useMemo(
    () => sortedItems.filter((item) => item.status === "Watched").slice(0, 8),
    [sortedItems],
  );
  const upNextItems = useMemo(
    () =>
      sortedItems
        .filter((item) => item.status === "Up Next" || item.status === "In Progress")
        .slice(0, 8),
    [sortedItems],
  );
  const favoriteItems = useMemo(
    () => sortedItems.filter((item) => item.isFavorite).slice(0, 8),
    [sortedItems],
  );
  const comingSoonItems = useMemo(
    () => sortedItems.filter((item) => item.status === "Coming Soon").slice(0, 8),
    [sortedItems],
  );

  const universeGroups = useMemo(() => {
    const groups = new Map<string, NormalizedMediaHubItem[]>();

    for (const item of filteredBrowseItems) {
      if (!item.universe) {
        continue;
      }

      groups.set(item.universe, [...(groups.get(item.universe) ?? []), item]);
    }

    return [...groups.entries()]
      .map(([name, groupItems]) => ({ name, items: groupItems.slice(0, 6), total: groupItems.length }))
      .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name));
  }, [filteredBrowseItems]);

  const genreGroups = useMemo(() => {
    const groups = new Map<string, NormalizedMediaHubItem[]>();

    for (const item of filteredBrowseItems) {
      for (const genre of item.genres) {
        groups.set(genre, [...(groups.get(genre) ?? []), item]);
      }
    }

    return [...groups.entries()]
      .map(([name, groupItems]) => ({ name, items: groupItems.slice(0, 6), total: groupItems.length }))
      .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name));
  }, [filteredBrowseItems]);

  const randomItems = useMemo(
    () => pickRandomItems(filteredBrowseItems.length ? filteredBrowseItems : sortedItems, randomSeed, 8),
    [filteredBrowseItems, randomSeed, sortedItems],
  );

  const spotlightItem = activeView === "random" ? randomItems[0] ?? selectedItem : selectedItem;

  const handleSelectItem = (itemId: number) => {
    startTransition(() => {
      setSelectedItemId(itemId);
    });
  };

  const handleRandomize = () => {
    startTransition(() => {
      setRandomSeed(Date.now());
      setActiveView("random");
    });
  };

  const renderShelf = (
    title: string,
    description: string,
    shelfItems: NormalizedMediaHubItem[],
    emptyState: string,
  ) => (
    <section className="mediahub-section">
      <div className="mediahub-section__head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="mediahub-section__count">{shelfItems.length}</span>
      </div>

      {shelfItems.length ? (
        <div className="mediahub-grid">
          {shelfItems.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onSelect={handleSelectItem}
              isActive={item.id === spotlightItem?.id}
            />
          ))}
        </div>
      ) : (
        <div className="mediahub-empty mediahub-empty--inline">{emptyState}</div>
      )}
    </section>
  );

  return (
    <section className="mediahub-page">
      <div className="mediahub-page__shell">
        <header
          className="mediahub-hero"
          style={spotlightItem?.bannerUrl ? { backgroundImage: `linear-gradient(115deg, rgba(10, 6, 14, 0.88), rgba(10, 6, 14, 0.52)), url(${spotlightItem.bannerUrl})` } : undefined}
        >
          <div className="mediahub-hero__copy">
            <span className="mediahub-hero__eyebrow">Native In-Site Build</span>
            <h1>MediaHub</h1>
            <p>
              Your XAMPP MediaHub catalog now lives inside this portfolio as a native
              React experience. No separate localhost window is needed just to browse
              the library, spotlight picks, or drill into your watch state.
            </p>
            <div className="mediahub-hero__actions">
              <Button type="button" icon={<Clapperboard size={16} />} onClick={() => setActiveView("browse")}>
                Browse catalog
              </Button>
              <Button type="button" variant="secondary" icon={<Shuffle size={16} />} onClick={handleRandomize}>
                Random pick
              </Button>
            </div>
          </div>

          <div className="mediahub-stats">
            <div className="mediahub-stat-card">
              <strong>{snapshot?.counts.items ?? 0}</strong>
              <span>titles synced</span>
            </div>
            <div className="mediahub-stat-card">
              <strong>{snapshot?.counts.watched ?? 0}</strong>
              <span>watched</span>
            </div>
            <div className="mediahub-stat-card">
              <strong>{snapshot?.counts.upNext ?? 0}</strong>
              <span>up next</span>
            </div>
            <div className="mediahub-stat-card">
              <strong>{snapshot?.counts.favorites ?? 0}</strong>
              <span>favorites</span>
            </div>
          </div>
        </header>

        <div className="mediahub-toolbar">
          <nav className="mediahub-tabs" aria-label="MediaHub views">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`mediahub-tab ${activeView === option.value ? "is-active" : ""}`}
                onClick={() => setActiveView(option.value)}
              >
                {option.label}
              </button>
            ))}
          </nav>

          <div className="mediahub-toolbar__search">
            <Input
              type="search"
              label="Search the snapshot"
              icon={<Search size={16} />}
              value={search}
              onChange={(event) => {
                const nextValue = event.target.value;
                startTransition(() => setSearch(nextValue));
              }}
              placeholder="Titles, universes, genres, or status"
              hint="This runs against the exported MediaHub snapshot bundled with the portfolio."
            />
          </div>

          <div className="mediahub-filter-row">
            <div className="mediahub-filter-group">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`mediahub-filter-pill ${statusFilter === option.value ? "is-active" : ""}`}
                  onClick={() => setStatusFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mediahub-filter-group">
              {FORMAT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`mediahub-filter-pill mediahub-filter-pill--muted ${formatFilter === option.value ? "is-active" : ""}`}
                  onClick={() => setFormatFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mediahub-empty">
            <RefreshCw size={18} className="mediahub-empty__spinner" />
            Loading your MediaHub snapshot...
          </div>
        ) : error ? (
          <div className="mediahub-empty">{error}</div>
        ) : (
          <>
            {spotlightItem ? (
              <section className="mediahub-focus">
                <div className="mediahub-focus__poster-shell">
                  {spotlightItem.posterUrl ? (
                    <img
                      src={spotlightItem.posterUrl}
                      alt={`${spotlightItem.title} poster`}
                      className="mediahub-focus__poster"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="mediahub-focus__poster mediahub-focus__poster--empty">
                      <Film size={28} />
                    </div>
                  )}
                </div>

                <div className="mediahub-focus__copy">
                  <div className="mediahub-focus__labels">
                    <span className={`mediahub-badge mediahub-badge--${getStatusClass(spotlightItem.status)}`}>
                      {spotlightItem.status}
                    </span>
                    <span className="mediahub-badge mediahub-badge--muted">
                      {spotlightItem.format === "series" ? <Tv size={13} /> : <Film size={13} />}
                      {spotlightItem.formatLabel}
                    </span>
                    {spotlightItem.isFavorite ? (
                      <span className="mediahub-badge mediahub-badge--favorite">
                        <Star size={13} />
                        Favorite
                      </span>
                    ) : null}
                  </div>

                  <div className="mediahub-focus__headline">
                    <h2>{spotlightItem.title}</h2>
                    <p>{spotlightItem.description}</p>
                  </div>

                  <div className="mediahub-focus__meta">
                    <span>
                      <Clock3 size={15} />
                      {spotlightItem.releaseYear ?? "TBA"}
                      {spotlightItem.endYear ? ` - ${spotlightItem.endYear}` : ""}
                    </span>
                    <span>
                      <Layers3 size={15} />
                      {spotlightItem.format === "series"
                        ? `${spotlightItem.totalSeasons || spotlightItem.seasons.length || 1} seasons | ${spotlightItem.totalEpisodes || 0} episodes`
                        : "Feature release"}
                    </span>
                    <span>
                      <Sparkles size={15} />
                      Added {formatDate(spotlightItem.createdAt)}
                    </span>
                  </div>

                  <div className="mediahub-focus__chips">
                    {spotlightItem.universe ? (
                      <span className="mediahub-chip mediahub-chip--focus">{spotlightItem.universe}</span>
                    ) : null}
                    {spotlightItem.genres.map((genre) => (
                      <span key={`${spotlightItem.id}-${genre}`} className="mediahub-chip mediahub-chip--focus">
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>

                <aside className="mediahub-focus__sidebar">
                  <div className="mediahub-focus__sidebar-card">
                    <strong>Watch state</strong>
                    <span>{spotlightItem.status}</span>
                  </div>
                  <div className="mediahub-focus__sidebar-card">
                    <strong>Up next</strong>
                    <span>
                      {spotlightItem.upNext?.nextSeason && spotlightItem.upNext?.nextEpisode
                        ? `S${spotlightItem.upNext.nextSeason} | E${spotlightItem.upNext.nextEpisode}`
                        : "Nothing queued"}
                    </span>
                  </div>
                  <div className="mediahub-focus__sidebar-card">
                    <strong>Last update</strong>
                    <span>{formatDate(spotlightItem.progress?.updatedAt ?? spotlightItem.history?.finishedAt ?? spotlightItem.createdAt)}</span>
                  </div>
                </aside>
              </section>
            ) : null}

            {activeView === "home" ? (
              <div className="mediahub-sections">
                {renderShelf(
                  "Watched",
                  "Finished titles, sorted from the freshest history first.",
                  watchedItems,
                  "Nothing has been marked watched in the exported snapshot yet.",
                )}
                {renderShelf(
                  "Up Next",
                  "What is queued or actively being worked through right now.",
                  upNextItems,
                  "There is nothing queued in Up Next yet.",
                )}
                {renderShelf(
                  "Favorites",
                  "The titles you flagged for easy return.",
                  favoriteItems,
                  "No favorites were found in the snapshot yet.",
                )}
                {renderShelf(
                  "Coming Soon",
                  "Upcoming releases that still need to land before they can move into rotation.",
                  comingSoonItems,
                  "No upcoming releases are marked in the current snapshot.",
                )}
              </div>
            ) : null}

            {activeView === "browse" ? (
              <section className="mediahub-section">
                <div className="mediahub-section__head">
                  <div>
                    <h2>Browse catalog</h2>
                    <p>Search by title, universe, status, or genre without leaving the portfolio shell.</p>
                  </div>
                  <span className="mediahub-section__count">{filteredBrowseItems.length}</span>
                </div>
                {filteredBrowseItems.length ? (
                  <div className="mediahub-grid">
                    {filteredBrowseItems.map((item) => (
                      <MediaCard
                        key={item.id}
                        item={item}
                        onSelect={handleSelectItem}
                        isActive={item.id === spotlightItem?.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mediahub-empty mediahub-empty--inline">
                    No titles matched this search and filter combination.
                  </div>
                )}
              </section>
            ) : null}

            {activeView === "universes" ? (
              <section className="mediahub-section">
                <div className="mediahub-section__head">
                  <div>
                    <h2>Universes</h2>
                    <p>Grouped lanes for franchises and larger catalog clusters.</p>
                  </div>
                  <span className="mediahub-section__count">{universeGroups.length}</span>
                </div>

                {universeGroups.length ? (
                  <div className="mediahub-group-list">
                    {universeGroups.slice(0, 10).map((group) => (
                      <article key={group.name} className="mediahub-group-card">
                        <div className="mediahub-group-card__head">
                          <div>
                            <h3>{group.name}</h3>
                            <p>{summarizeGroup(group.items)}</p>
                          </div>
                          <span>{group.total}</span>
                        </div>
                        <div className="mediahub-grid">
                          {group.items.map((item) => (
                            <MediaCard
                              key={item.id}
                              item={item}
                              onSelect={handleSelectItem}
                              isActive={item.id === spotlightItem?.id}
                            />
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mediahub-empty mediahub-empty--inline">
                    No universe groups matched the current filters.
                  </div>
                )}
              </section>
            ) : null}

            {activeView === "genres" ? (
              <section className="mediahub-section">
                <div className="mediahub-section__head">
                  <div>
                    <h2>Genres</h2>
                    <p>A snapshot of where the catalog is densest right now.</p>
                  </div>
                  <span className="mediahub-section__count">{genreGroups.length}</span>
                </div>

                {genreGroups.length ? (
                  <div className="mediahub-group-list">
                    {genreGroups.slice(0, 10).map((group) => (
                      <article key={group.name} className="mediahub-group-card">
                        <div className="mediahub-group-card__head">
                          <div>
                            <h3>{group.name}</h3>
                            <p>{summarizeGroup(group.items)}</p>
                          </div>
                          <span>{group.total}</span>
                        </div>
                        <div className="mediahub-grid">
                          {group.items.map((item) => (
                            <MediaCard
                              key={item.id}
                              item={item}
                              onSelect={handleSelectItem}
                              isActive={item.id === spotlightItem?.id}
                            />
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mediahub-empty mediahub-empty--inline">
                    No genre clusters matched the current filters.
                  </div>
                )}
              </section>
            ) : null}

            {activeView === "recent" ? (
              <section className="mediahub-section">
                <div className="mediahub-section__head">
                  <div>
                    <h2>Recently Added</h2>
                    <p>Newest imports from the MediaHub snapshot, without jumping back to PHP or MySQL directly.</p>
                  </div>
                  <span className="mediahub-section__count">{filteredBrowseItems.length}</span>
                </div>
                <div className="mediahub-grid">
                  {filteredBrowseItems.slice(0, 18).map((item) => (
                    <MediaCard
                      key={item.id}
                      item={item}
                      onSelect={handleSelectItem}
                      isActive={item.id === spotlightItem?.id}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {activeView === "random" ? (
              <section className="mediahub-section">
                <div className="mediahub-section__head">
                  <div>
                    <h2>Random</h2>
                    <p>Let the snapshot surface a fresh lane when you do not want to decide manually.</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={<Shuffle size={14} />}
                    onClick={handleRandomize}
                  >
                    Reroll picks
                  </Button>
                </div>

                {randomItems.length ? (
                  <div className="mediahub-grid">
                    {randomItems.map((item) => (
                      <MediaCard
                        key={item.id}
                        item={item}
                        onSelect={handleSelectItem}
                        isActive={item.id === spotlightItem?.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mediahub-empty mediahub-empty--inline">
                    Nothing is available for a random pick yet.
                  </div>
                )}
              </section>
            ) : null}

            <footer className="mediahub-footer-note">
              Snapshot generated {formatDate(snapshot?.generatedAt)} from your original MediaHub
              dataset. To refresh it after changing the local PHP app, rerun
              <code> scripts/export-mediahub.ps1</code>.
            </footer>
          </>
        )}
      </div>
    </section>
  );
}
