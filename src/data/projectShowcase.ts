import heroPreview from "../assets/hero.png";

export type ProjectType = "Personal" | "Academic";
export type ProjectStatus = "Completed" | "In Progress" | "Planned";
export type ProjectCategory = "React" | "Java" | "JavaScript";

export interface ProjectGallerySlide {
  title: string;
  caption: string;
  bullets: string[];
  image?: string;
  theme: "violet" | "cyan" | "rose" | "amber" | "emerald";
}

export interface ProjectStackGroup {
  label: string;
  items: string[];
}

export interface ProjectArchitectureLane {
  label: string;
  nodes: string[];
}

export interface ProjectSourcePreview {
  title: string;
  language: string;
  snippet: string;
}

export interface ProjectShowcaseItem {
  id: string;
  title: string;
  tagline: string;
  desc: string;
  status: ProjectStatus;
  featured?: boolean;
  liveUrl?: string;
  repoUrl?: string;
  category: ProjectCategory;
  type: ProjectType;
  date: string;
  sortDate: number;
  startMonth: string;
  endMonth: string;
  estimatedTime: string;
  complexity: number;
  comparisonSummary: string;
  effortLabel?: string;
  effortNote?: string;
  tags: string[];
  stackGroups: ProjectStackGroup[];
  contributions: {
    frontend: number;
    backend: number;
    design: number;
  };
  learned: string[];
  sourcePreview: ProjectSourcePreview;
  gallery: ProjectGallerySlide[];
  architecture: {
    summary: string;
    lanes: ProjectArchitectureLane[];
  };
  relatedIds: string[];
}

export const projectShowcase: ProjectShowcaseItem[] = [
  {
    id: "movie-streaming-app",
    title: "Movie Streaming App",
    tagline: "Full-stack streaming UI with collaborative polish",
    desc:
      "A collaborative movie platform that pairs a modern browsing interface with account flows, watchlists, and a database-backed catalog.",
    status: "Completed",
    liveUrl: "/movie-app",
    repoUrl: "https://github.com/Davidflo1g/movie-streaming-app",
    category: "JavaScript",
    type: "Academic",
    date: "Oct 2025 - Dec 2025",
    sortDate: 202510,
    startMonth: "2025-10",
    endMonth: "2025-12",
    estimatedTime: "9 weeks",
    complexity: 4,
    comparisonSummary: "Largest collaborative web build with UI, auth, and catalog flow.",
    tags: ["JavaScript", "HTML", "CSS", "PHP", "MySQL", "Collaboration"],
    stackGroups: [
      { label: "Interface", items: ["HTML", "CSS", "JavaScript"] },
      { label: "Server", items: ["PHP", "Session auth", "Routing"] },
      { label: "Data", items: ["MySQL", "Movie catalog", "Watchlist state"] },
    ],
    contributions: {
      frontend: 46,
      backend: 34,
      design: 20,
    },
    learned: [
      "How to split responsibilities across a team without losing consistency in the UI.",
      "Why catalog and account flows need clean data contracts even in class projects.",
      "How a simple browsing experience gets much harder once search, filters, and persistence are involved.",
    ],
    sourcePreview: {
      title: "Catalog filtering flow",
      language: "php",
      snippet: `<?php
$query = trim($_GET['q'] ?? '');
$sql = "SELECT title, genre, year FROM movies";

if ($query !== '') {
  $sql .= " WHERE title LIKE ? OR genre LIKE ?";
  $stmt = $db->prepare($sql);
  $term = "%{$query}%";
  $stmt->bind_param("ss", $term, $term);
  $stmt->execute();
}
?>`,
    },
    gallery: [
      {
        title: "Landing catalog",
        caption: "A high-contrast hero and featured rows drive the first click quickly.",
        bullets: ["Featured movies", "Search-first entry point", "Streaming-style layout"],
        theme: "cyan",
      },
      {
        title: "Browse table",
        caption: "The full browse view exposes metadata and actions without collapsing into clutter.",
        bullets: ["Tabular browse mode", "Action buttons", "Director and cast metadata"],
        theme: "violet",
      },
      {
        title: "Account flow",
        caption: "Login and register screens made the project feel like a product instead of a mockup.",
        bullets: ["Auth entry points", "Persistent watchlist idea", "Role for backend validation"],
        theme: "rose",
      },
    ],
    architecture: {
      summary: "The browser UI talks to a PHP app layer, which owns validation and database access before returning catalog state.",
      lanes: [
        { label: "Client", nodes: ["MovieFlix UI", "Search form", "Watchlist actions"] },
        { label: "App layer", nodes: ["PHP routes", "Session auth", "Catalog handlers"] },
        { label: "Data", nodes: ["MySQL movies", "Reviews", "User watchlists"] },
      ],
    },
    relatedIds: ["portfolio-website", "youtube-tag-generator"],
  },
  {
    id: "escaping-the-red-cross",
    title: "Escaping The Red Cross",
    tagline: "Horror escape game with combat, puzzles, and persistence",
    desc:
      "A team-built Java game with OOP design, turn-based combat, puzzle gating, inventory rules, and a browser-playable React shell.",
    status: "Completed",
    liveUrl: "/game",
    repoUrl: "https://github.com/Laureesh/TeenTitans-Fall2025-TextBasedGame",
    category: "Java",
    type: "Academic",
    date: "Aug 2025 - Dec 2025",
    sortDate: 202508,
    startMonth: "2025-08",
    endMonth: "2025-12",
    estimatedTime: "16 weeks",
    complexity: 5,
    comparisonSummary: "Most complex project because game logic, content flow, and database concerns all intersect.",
    tags: ["Java", "MySQL", "OOP", "Agile", "React"],
    stackGroups: [
      { label: "Gameplay", items: ["Java", "Combat system", "Puzzle logic"] },
      { label: "UI shell", items: ["React", "Command terminal", "Sidebar HUD"] },
      { label: "Persistence", items: ["MySQL", "State rules", "Inventory data"] },
    ],
    contributions: {
      frontend: 28,
      backend: 52,
      design: 20,
    },
    learned: [
      "How to model command parsing so feature growth does not collapse into if-else chaos.",
      "How content design and software design influence each other in game systems.",
      "Why persistence and player state rules need to be explicit before scaling the number of rooms and items.",
    ],
    sourcePreview: {
      title: "Combat resolution",
      language: "java",
      snippet: `public int resolveDamage(Player player, Monster monster) {
  int raw = player.getAttack() - monster.getDefense();
  int finalDamage = Math.max(1, raw);
  monster.setHp(monster.getHp() - finalDamage);
  return finalDamage;
}`,
    },
    gallery: [
      {
        title: "Terminal combat",
        caption: "The terminal feed keeps combat readable while preserving the text-adventure feel.",
        bullets: ["Log-based action history", "Quick command actions", "HP and combat states"],
        theme: "rose",
      },
      {
        title: "Inventory pressure",
        caption: "Equipment, keys, and healing items shape how the player progresses through the building.",
        bullets: ["Inventory stack rules", "Equip and use flows", "Puzzle dependencies"],
        theme: "amber",
      },
      {
        title: "Floor progression",
        caption: "Multi-floor progression creates a stronger sense of escalation than a single-room loop.",
        bullets: ["Floor-based structure", "Boss encounters", "Riddle checkpoints"],
        theme: "violet",
      },
    ],
    architecture: {
      summary: "The React shell renders logs and commands, while the Java engine owns combat, room logic, and data-backed rules.",
      lanes: [
        { label: "Presentation", nodes: ["React terminal", "HUD sidebar", "Quick actions"] },
        { label: "Game engine", nodes: ["Command parser", "Combat loop", "Puzzle checks"] },
        { label: "Persistence", nodes: ["Item data", "Room definitions", "MySQL state"] },
      ],
    },
    relatedIds: ["solo-text-based-adventure", "movie-streaming-app"],
  },
  {
    id: "solo-text-based-adventure",
    title: "Solo Text-Based Adventure",
    tagline: "Single-developer RPG loop with rooms, combat, and item gating",
    desc:
      "An independently built Naruto-inspired adventure that focuses on command handling, room design, turn-based combat, and progression pacing.",
    status: "Completed",
    liveUrl: "/solo-game",
    repoUrl: "https://github.com/Laureesh/Solo-Fall2025-TextBasedGame",
    category: "Java",
    type: "Academic",
    date: "Aug 2025 - Dec 2025",
    sortDate: 202508,
    startMonth: "2025-08",
    endMonth: "2025-12",
    estimatedTime: "6 weeks",
    complexity: 4,
    comparisonSummary: "Smaller scope than the team game, but deeper ownership because every system was mine.",
    tags: ["Java", "OOP", "CLI", "React", "Game Design"],
    stackGroups: [
      { label: "Engine", items: ["Java", "Room graph", "Turn-based combat"] },
      { label: "Player state", items: ["Inventory", "Equipment", "Healing items"] },
      { label: "UI shell", items: ["React wrapper", "Terminal interaction", "Quick commands"] },
    ],
    contributions: {
      frontend: 24,
      backend: 61,
      design: 15,
    },
    learned: [
      "How much clearer game logic becomes when room data and combat rules are separated cleanly.",
      "How to pace item unlocks so exploration feels earned instead of random.",
      "Why solo ownership is useful for tightening naming, flow, and consistency quickly.",
    ],
    sourcePreview: {
      title: "Room transition rule",
      language: "java",
      snippet: `if (currentRoom.hasExit(direction)) {
  Room next = currentRoom.getExit(direction);
  if (next.requiresKey() && !player.hasItem("Hidden Leaf Key")) {
    return "The door will not budge.";
  }
  player.setCurrentRoom(next);
}`,
    },
    gallery: [
      {
        title: "Room traversal",
        caption: "Each room pushes the player toward a clearer command vocabulary and progression rhythm.",
        bullets: ["Direction commands", "Room-specific descriptions", "Puzzle hints"],
        theme: "emerald",
      },
      {
        title: "Equipment loop",
        caption: "Weapon and armor choices influence survivability without overcomplicating the rules.",
        bullets: ["Equip states", "Combat modifiers", "Quick commands"],
        theme: "amber",
      },
      {
        title: "Boss pacing",
        caption: "Combat spikes help the final rooms feel different from simple exploration.",
        bullets: ["Battle pacing", "Recovery choices", "Key-gated progression"],
        theme: "rose",
      },
    ],
    architecture: {
      summary: "A simple front-end shell sends commands into a Java engine that controls rooms, combat, and progression state.",
      lanes: [
        { label: "Presentation", nodes: ["React terminal", "Command input", "Stats panel"] },
        { label: "Core logic", nodes: ["Room map", "Enemy encounters", "Item rules"] },
        { label: "Progression", nodes: ["Keys", "Boss gates", "Victory state"] },
      ],
    },
    relatedIds: ["escaping-the-red-cross", "portfolio-website"],
  },
  {
    id: "portfolio-website",
    title: "Portfolio Website",
    tagline: "A living portfolio with navigation polish and product-style interactions",
    desc:
      "The site you are on now, built in React and TypeScript with layered navigation, animated hero work, guided tour flows, blog pages, and richer app-shell UX.",
    status: "In Progress",
    featured: true,
    liveUrl: "/",
    repoUrl: "https://github.com/laureesh/laureesh.github.io",
    category: "React",
    type: "Personal",
    date: "Jun 2025 - Present",
    sortDate: 202603,
    startMonth: "2025-06",
    endMonth: "2026-03",
    estimatedTime: "Ongoing build",
    complexity: 5,
    comparisonSummary: "Broadest UI surface area because it mixes product UX, content structure, and reusable components.",
    effortLabel: "Solo build",
    effortNote: "100% built by me",
    tags: ["React", "TypeScript", "Vite", "Firebase", "Design Systems", "UX"],
    stackGroups: [
      { label: "App shell", items: ["React Router", "Command palette", "Keyboard UX"] },
      { label: "Frontend", items: ["TypeScript", "Vite", "Responsive CSS"] },
      { label: "Integrations", items: ["Firebase", "Formspree", "Local storage"] },
    ],
    contributions: {
      frontend: 57,
      backend: 18,
      design: 25,
    },
    learned: [
      "How quickly a portfolio turns into a real product once navigation and content density increase.",
      "How to organize reusable page-level UX without burying the site under abstractions too early.",
      "Why presentation quality and interaction quality need to improve together to feel intentional.",
    ],
    sourcePreview: {
      title: "Shared navigation metadata",
      language: "ts",
      snippet: `export const primaryNavigation = [
  { path: "/", label: "Home", shortcut: "H" },
  { path: "/projects", label: "Projects", shortcut: "P" },
  { path: "/blog", label: "Blog", shortcut: "B" },
];`,
    },
    gallery: [
      {
        title: "Hero system",
        caption: "The home page layers guided-tour onboarding, animated background work, and stronger CTA flow.",
        bullets: ["Constellation canvas", "Wave divider", "Guided tour CTA"],
        image: heroPreview,
        theme: "violet",
      },
      {
        title: "App-shell UX",
        caption: "Command palette, shortcuts, breadcrumbs, quick actions, and sticky nav behaviors all live in one shell.",
        bullets: ["Keyboard shortcuts", "Breadcrumbs", "Recent page history"],
        theme: "cyan",
      },
      {
        title: "Content growth",
        caption: "Blog pages, project comparisons, and richer home sections make the site usable beyond a one-screen landing page.",
        bullets: ["Sample blog posts", "Project metadata", "Section-level navigation"],
        theme: "emerald",
      },
    ],
    architecture: {
      summary: "Shared data and shell components drive page routing, navigation behavior, and content sections across the portfolio.",
      lanes: [
        { label: "Pages", nodes: ["Home", "Projects", "Blog", "Resume"] },
        { label: "Shell", nodes: ["Navbar", "Command palette", "Breadcrumbs"] },
        { label: "State and services", nodes: ["Route metadata", "Local storage", "Theme provider"] },
      ],
    },
    relatedIds: ["movie-streaming-app", "youtube-tag-generator"],
  },
  {
    id: "mediahub",
    title: "MediaHub",
    tagline: "Personal media tracker with admin tools, watch-state workflows, and catalog browsing",
    desc:
      "A personal media dashboard for tracking movies and shows with watched states, status views, universe and genre browsing, random picks, and admin-side progress tooling.",
    status: "In Progress",
    liveUrl: "/mediahub",
    repoUrl: "https://github.com/Laureesh/MediaHub",
    category: "JavaScript",
    type: "Personal",
    date: "Dec 2025 - Ongoing",
    sortDate: 202512,
    startMonth: "2025-12",
    endMonth: "2026-03",
    estimatedTime: "Ongoing build",
    complexity: 4,
    comparisonSummary: "Most product-like personal build outside the portfolio because it mixes catalog browsing, status workflows, and admin utilities.",
    effortLabel: "Solo build",
    effortNote: "Personal project, still evolving",
    tags: ["PHP", "JavaScript", "MySQL", "Media Tracking", "Admin Tools", "Catalog UX"],
    stackGroups: [
      { label: "Interface", items: ["HTML", "CSS", "JavaScript", "Responsive browsing UI"] },
      { label: "App logic", items: ["PHP", "Status workflows", "Admin tools", "Filtering"] },
      { label: "Data", items: ["MySQL", "Media metadata", "Progress tracking"] },
    ],
    contributions: {
      frontend: 42,
      backend: 38,
      design: 20,
    },
    learned: [
      "How to organize a larger catalog UI so browsing still feels fast when multiple entry points exist.",
      "Why admin-facing workflow tools need to stay just as clear as the public browsing experience.",
      "How status labels, watch progress, and media taxonomy become the real product logic in a tracker app.",
    ],
    sourcePreview: {
      title: "Status-aware media card rendering",
      language: "php",
      snippet: `<?php
$statusClass = strtolower(str_replace(' ', '-', $item['status']));
$isWatched = $item['status'] === 'Watched';
?>
<article class="media-card <?= $statusClass ?>">
  <?php if ($isWatched): ?>
    <span class="media-badge">WATCHED</span>
  <?php endif; ?>
</article>`,
    },
    gallery: [
      {
        title: "Homepage spotlight",
        caption: "The hero area surfaces the next featured item while the rest of the catalog stays immediately scannable.",
        bullets: ["Featured item", "Quick status actions", "Admin entry points"],
        theme: "rose",
      },
      {
        title: "Watched row",
        caption: "Dense media cards keep status, release date, and actions visible without turning the row into a table.",
        bullets: ["Watched badges", "Action buttons", "Date metadata"],
        theme: "emerald",
      },
      {
        title: "Browse system",
        caption: "Multiple browse paths let the project feel closer to a personal platform than a one-screen tracker.",
        bullets: ["Universe filters", "Genre filters", "Random picks"],
        theme: "cyan",
      },
    ],
    architecture: {
      summary: "MediaHub combines a browse-heavy front end with PHP-driven admin/status logic and a MySQL-backed media catalog.",
      lanes: [
        { label: "Presentation", nodes: ["Homepage", "Browse rows", "Media cards", "Admin nav"] },
        { label: "App layer", nodes: ["PHP handlers", "Status updates", "Progress actions", "Randomizer"] },
        { label: "Data", nodes: ["MySQL catalog", "Media metadata", "Watch states", "Release tracking"] },
      ],
    },
    relatedIds: ["portfolio-website", "movie-streaming-app"],
  },
  {
    id: "youtube-tag-generator",
    title: "YouTube Tag Generator",
    tagline: "Focused SEO helper built to generate outputs fast",
    desc:
      "A lightweight utility that turns a few content inputs into search tags, description blocks, and hashtag-ready outputs for creators.",
    status: "Completed",
    liveUrl: "/yt-tags",
    category: "JavaScript",
    type: "Personal",
    date: "Apr 2024 - May 2025",
    sortDate: 202505,
    startMonth: "2024-04",
    endMonth: "2025-05",
    estimatedTime: "2 weeks",
    complexity: 3,
    comparisonSummary: "Smallest build, but a strong example of tight scope and useful output design.",
    tags: ["HTML", "CSS", "JavaScript", "Copy UX"],
    stackGroups: [
      { label: "Interface", items: ["HTML forms", "Responsive CSS", "Textarea outputs"] },
      { label: "Logic", items: ["String templates", "Conditional outputs", "Copy helpers"] },
      { label: "UX", items: ["One-click copy", "Preview title", "Field validation"] },
    ],
    contributions: {
      frontend: 69,
      backend: 0,
      design: 31,
    },
    learned: [
      "How a narrow tool can still feel polished if the output flow is clear.",
      "Why copy UX and small feedback states matter more than flashy visuals in utility products.",
      "How to shape generated text so it stays practical instead of bloated.",
    ],
    sourcePreview: {
      title: "Description template builder",
      language: "js",
      snippet: `const titleText = featuredArtist
  ? \`\${artist} - \${song} ft. \${featuredArtist}\`
  : \`\${artist} - \${song}\`;

const description = [
  \`Download / Stream: [LINK]\`,
  \`#\${artist.replace(/\\s+/g, "")}\`,
  \`#\${song.replace(/\\s+/g, "")}\`,
].join("\\n");`,
    },
    gallery: [
      {
        title: "Input builder",
        caption: "The form is intentionally direct so the user can generate output with almost no setup friction.",
        bullets: ["Artist and song inputs", "Optional album and genre", "Single CTA flow"],
        theme: "rose",
      },
      {
        title: "Output stacks",
        caption: "Separate outputs make it clear what is for search, descriptions, and lyric-focused uploads.",
        bullets: ["Three output blocks", "Readable text areas", "Copy buttons"],
        theme: "amber",
      },
      {
        title: "Utility rhythm",
        caption: "Feedback is quick and minimal because the tool is built for repetition, not exploration.",
        bullets: ["Copied state", "Preview title", "Generator reset behavior"],
        theme: "emerald",
      },
    ],
    architecture: {
      summary: "A simple browser-only tool takes structured inputs, runs template logic, and renders copy-ready output blocks.",
      lanes: [
        { label: "Input", nodes: ["Artist", "Song", "Features", "Genre"] },
        { label: "Generator", nodes: ["Template rules", "Conditional text", "Hashtag formatting"] },
        { label: "Output", nodes: ["Search tags", "Description block", "Lyric tags"] },
      ],
    },
    relatedIds: ["portfolio-website", "password-generator"],
  },
  {
    id: "password-generator",
    title: "Password Generator",
    tagline: "Secure password tool with live hash verification",
    desc:
      "A browser-based password generator that creates cryptographically random passwords resistant to rainbow-table attacks, with real-time hash digest display (MD5, SHA-1, SHA-256).",
    status: "Completed",
    liveUrl: "/password-gen",
    category: "React",
    type: "Personal",
    date: "Mar 2026",
    sortDate: 202603,
    startMonth: "2026-03",
    endMonth: "2026-03",
    estimatedTime: "1 week",
    complexity: 3,
    comparisonSummary: "Focused security utility demonstrating Web Crypto API usage and hash algorithm awareness.",
    tags: ["React", "TypeScript", "Web Crypto API", "Security"],
    stackGroups: [
      { label: "Interface", items: ["React", "TypeScript", "Responsive CSS"] },
      { label: "Crypto", items: ["Web Crypto API", "SHA-1", "SHA-256", "MD5"] },
      { label: "UX", items: ["Strength meter", "Copy helpers", "Hash display"] },
    ],
    contributions: {
      frontend: 55,
      backend: 20,
      design: 25,
    },
    learned: [
      "How the Web Crypto API provides secure randomness directly in the browser without external libraries.",
      "Why password length and charset diversity matter more than complexity rules for resisting rainbow-table lookups.",
      "How to present security information (hashes, entropy) in a way that is educational without being overwhelming.",
    ],
    sourcePreview: {
      title: "Secure random generation",
      language: "ts",
      snippet: `async function sha1(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}`,
    },
    gallery: [
      {
        title: "Generator controls",
        caption: "Length slider and charset toggles give full control over password composition.",
        bullets: ["4-64 character range", "Charset toggles", "Strength meter"],
        theme: "violet",
      },
      {
        title: "Hash verification",
        caption: "Real-time hash digests let users verify their password's uniqueness against rainbow tables.",
        bullets: ["MD5, SHA-1, SHA-256", "Copy-to-clipboard", "Collapsible panel"],
        theme: "cyan",
      },
      {
        title: "Security awareness",
        caption: "Visual strength feedback teaches users why longer, mixed-charset passwords resist cracking tools.",
        bullets: ["Entropy-based scoring", "CrackStation resistance", "Educational notes"],
        theme: "emerald",
      },
    ],
    architecture: {
      summary: "A client-side tool generates random passwords using the Web Crypto API and computes hash digests for verification.",
      lanes: [
        { label: "Input", nodes: ["Length slider", "Charset toggles", "Generate action"] },
        { label: "Crypto", nodes: ["crypto.getRandomValues", "SHA-1", "SHA-256", "MD5"] },
        { label: "Output", nodes: ["Password display", "Strength meter", "Hash digests"] },
      ],
    },
    relatedIds: ["portfolio-website", "youtube-tag-generator"],
  },
  {
    id: "media-converter-suite",
    title: "Media Converter Suite",
    tagline: "Browser-first YouTube-to-MP4 and WebM-to-MP4 conversion workflow",
    desc:
      "A browser utility focused on converting local WebM files into MP4, paired with a clearly limited YouTube section that explains why direct downloading is intentionally unsupported.",
    status: "Completed",
    liveUrl: "/media-converter",
    category: "JavaScript",
    type: "Personal",
    date: "Mar 2026",
    sortDate: 202603,
    startMonth: "2026-03",
    endMonth: "2026-03",
    estimatedTime: "2 weeks",
    complexity: 4,
    comparisonSummary: "Utility-focused build that blends file handling, conversion flow clarity, and format-specific user guidance.",
    effortLabel: "Solo concept build",
    effortNote: "Designed as a focused media utility",
    tags: ["JavaScript", "HTML", "CSS", "Media Conversion", "MP4", "WebM"],
    stackGroups: [
      { label: "Interface", items: ["HTML", "CSS", "JavaScript", "Responsive utility layout"] },
      { label: "Conversion flows", items: ["WebM upload handling", "FFmpeg/WASM transcode", "MP4 export path"] },
      { label: "UX", items: ["Progress states", "Validation feedback", "Clear unsupported-source guidance"] },
    ],
    contributions: {
      frontend: 52,
      backend: 23,
      design: 25,
    },
    learned: [
      "How format-specific tools feel much easier to trust when each input path explains what will happen next.",
      "Why conversion utilities need clear validation and progress feedback more than decorative UI.",
      "How combining supported and unsupported source types in one screen requires strong boundaries to avoid confusion.",
    ],
    sourcePreview: {
      title: "Conversion mode guard",
      language: "js",
      snippet: `const mode = sourceType === "youtube" ? "remote" : "local";

if (mode === "remote" && !isValidYoutubeUrl(inputValue)) {
  setStatus("Enter a valid YouTube link before converting.");
  return;
}

queueConversion({ mode, inputValue, outputFormat: "mp4" });`,
    },
    gallery: [
      {
        title: "Dual conversion entry",
        caption: "The opening view separates the working local conversion flow from the intentionally restricted YouTube area.",
        bullets: ["WebM upload zone", "Engine loader", "YouTube limitation note"],
        theme: "rose",
      },
      {
        title: "Progress feedback",
        caption: "Status messaging keeps the process understandable while the conversion job is running.",
        bullets: ["Queued state", "Active progress bar", "Success and error messaging"],
        theme: "cyan",
      },
      {
        title: "Download handoff",
        caption: "The final state focuses on the finished MP4 file instead of making the user hunt through the interface.",
        bullets: ["MP4 ready state", "Download CTA", "Reset for next conversion"],
        theme: "emerald",
      },
    ],
    architecture: {
      summary: "The interface loads FFmpeg/WASM in the browser, accepts a local WebM upload, and returns an MP4 download without sending the file to a server.",
      lanes: [
        { label: "Input", nodes: ["WebM upload", "Validation layer", "Engine load"] },
        { label: "Conversion", nodes: ["FFmpeg worker", "MP4 transcode flow", "Progress updates"] },
        { label: "Output", nodes: ["Status state", "Download action", "Reset flow"] },
      ],
    },
    relatedIds: ["youtube-tag-generator", "password-generator"],
  },
];

export const projectCategories = ["All", "React", "Java", "JavaScript"] as const;
export const projectTypeFilters = ["All Types", "Personal", "Academic"] as const;
export const projectDateFilters = ["All Dates", "2024", "2025", "2026"] as const;
export const projectSortModes = ["newest", "alphabetical", "complexity"] as const;
export const projectViewModes = ["cards", "table", "timeline"] as const;

export type ProjectSortMode = (typeof projectSortModes)[number];
export type ProjectViewMode = (typeof projectViewModes)[number];

export function getProjectById(projectId: string) {
  return projectShowcase.find((project) => project.id === projectId);
}
