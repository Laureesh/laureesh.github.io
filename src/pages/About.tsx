import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Award,
  BadgeCheck,
  Briefcase,
  Cloud,
  Code2,
  ExternalLink,
  Film,
  Gamepad2,
  GraduationCap,
  Headphones,
  MapPin,
  Palette,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Wrench,
} from "lucide-react";
import ScrollReveal from "../components/ScrollReveal";
import SectionNav from "../components/SectionNav";
import { usePageContent } from "../hooks/useContentCatalog";
import { getPageSection, getPageSectionLines } from "../services/pageContent";
import vscodeLogo from "../assets/vscode-mark.svg";
import "./About.css";

const aboutSections = [
  { id: "about-intro", label: "Intro" },
  { id: "about-timeline", label: "Timeline" },
  { id: "about-credentials", label: "Credentials" },
  { id: "about-interests", label: "Interests" },
  { id: "about-bookshelf", label: "Bookshelf" },
  { id: "about-journey", label: "Journey" },
];

const highlights: {
  icon: ReactNode;
  title: string;
  desc: string;
  sub: string;
  detail?: string;
}[] = [
  {
    icon: <GraduationCap size={24} />,
    title: "Education",
    desc: "Georgia Gwinnett College",
    sub: "B.S. Software Development + B.S. Systems & Cybersecurity",
    detail: "Expected May 2027 | GPA 3.93",
  },
  {
    icon: <Trophy size={24} />,
    title: "Recognition",
    desc: "Dean's List",
    sub: "Consistent academic performance while balancing coursework, projects, and a career transition.",
  },
  {
    icon: <Target size={24} />,
    title: "Focus",
    desc: "Full-stack product building",
    sub: "Backend logic, polished front-end UX, data flow, accessibility, and deployment-minded thinking.",
  },
  {
    icon: <MapPin size={24} />,
    title: "Base",
    desc: "Lawrenceville, Georgia",
    sub: "Open to remote and hybrid opportunities while continuing to grow through projects and coursework.",
  },
];

const values: {
  icon: ReactNode;
  title: string;
  desc: string;
}[] = [
  {
    icon: <Sparkles size={22} />,
    title: "Quality first",
    desc: "I care about polish, naming, structure, and the small decisions that make software easier to trust and maintain.",
  },
  {
    icon: <RefreshCw size={22} />,
    title: "Continuous learning",
    desc: "I tend to learn by building, revising, and tightening the same project until the rough edges start disappearing.",
  },
  {
    icon: <Shield size={22} />,
    title: "Security-aware thinking",
    desc: "Cybersecurity coursework changes how I think about input handling, access, risk, and system boundaries.",
  },
];

const timelineItems: {
  id: string;
  marker: string;
  type: "Work" | "Education" | "Certification" | "Build";
  title: string;
  org: string;
  range: string;
  summary: string;
  bullets: string[];
  icon: ReactNode;
}[] = [
  {
    id: "amazon",
    marker: "2021",
    type: "Work",
    title: "Warehouse Associate",
    org: "Amazon Fulfillment Center",
    range: "Jun 2021 - Aug 2022",
    summary:
      "Fast-paced process work taught me consistency, pace, and respect for systems that need to hold up under pressure.",
    bullets: [
      "Worked inside a repeatable, high-volume workflow",
      "Learned how strong process design reduces mistakes",
      "Carried that systems mindset into technical problem solving",
    ],
    icon: <Briefcase size={20} />,
  },
  {
    id: "healthcare",
    marker: "2023",
    type: "Work",
    title: "Certified Medication Aide",
    org: "Northridge Health & Rehabilitation",
    range: "Jul 2023 - Mar 2025",
    summary:
      "Healthcare reinforced the importance of precision, accountability, and communication when the details actually matter.",
    bullets: [
      "Developed calm, detail-oriented habits under responsibility",
      "Built trust through consistency and clear communication",
      "That reliability lens now shows up in how I build software",
    ],
    icon: <Briefcase size={20} />,
  },
  {
    id: "networking-cert",
    marker: "2024",
    type: "Certification",
    title: "IT Specialist in Networking",
    org: "Certiport",
    range: "Earned Nov 2024",
    summary:
      "This certification strengthened the networking baseline that now supports how I think about deployment, systems, and infrastructure.",
    bullets: [
      "Validated networking fundamentals formally",
      "Strengthened the systems side of my technical foundation",
      "Made cloud and deployment topics easier to reason through",
    ],
    icon: <Award size={20} />,
  },
  {
    id: "ggc",
    marker: "Current",
    type: "Education",
    title: "Georgia Gwinnett College",
    org: "Software Development + Systems & Cybersecurity",
    range: "Expected May 2027 | GPA 3.93",
    summary:
      "College is where software engineering, cybersecurity, cloud topics, and full-stack application work started connecting into one direction.",
    bullets: [
      "Combining software development with cybersecurity depth",
      "Working through cloud, database, and algorithm coursework",
      "Using projects to turn classroom concepts into shipped work",
    ],
    icon: <GraduationCap size={20} />,
  },
  {
    id: "portfolio-product",
    marker: "Now",
    type: "Build",
    title: "Portfolio as a product",
    org: "React + TypeScript",
    range: "Current build focus",
    summary:
      "The portfolio stopped being just a static resume page and became a place to practice product UX, navigation, and reusable front-end systems.",
    bullets: [
      "Treating navigation and discoverability as real product work",
      "Using the site to test polished UI and interaction patterns",
      "Turning personal work into a better showcase of engineering quality",
    ],
    icon: <Code2 size={20} />,
  },
  {
    id: "cyber-cert",
    marker: "2026",
    type: "Certification",
    title: "IT Specialist in Cybersecurity",
    org: "Certiport",
    range: "Expected Apr 2026",
    summary:
      "This is the next formal milestone in the security track that complements the software side of my degree work.",
    bullets: [
      "Building on current systems and security coursework",
      "Strengthening security language alongside development skills",
      "Keeping the engineering path grounded in risk-aware thinking",
    ],
    icon: <Shield size={20} />,
  },
  {
    id: "graduation",
    marker: "2027",
    type: "Education",
    title: "Degree milestone",
    org: "Georgia Gwinnett College",
    range: "Expected May 2027",
    summary:
      "The target is to leave college with stronger backend depth, better product instincts, and a portfolio that reflects how I actually work.",
    bullets: [
      "Keep tightening full-stack execution",
      "Keep sharpening security and systems awareness",
      "Stay internship and industry ready through real projects",
    ],
    icon: <BadgeCheck size={20} />,
  },
];

const certifications: {
  title: string;
  org: string;
  date: string;
  status: "Verified" | "In Progress";
  note: string;
  url?: string;
}[] = [
  {
    title: "IT Specialist in Networking",
    org: "Certiport",
    date: "November 2024",
    status: "Verified",
    note:
      "Formal proof of networking fundamentals that support cloud, deployment, and systems thinking.",
    url: "https://www.credly.com/badges/0b9e6568-32cb-4375-b670-b79eedfa86ca",
  },
  {
    title: "IT Specialist in Cybersecurity",
    org: "Certiport",
    date: "Expected April 2026",
    status: "In Progress",
    note:
      "Next checkpoint in the security track that complements software development and systems coursework.",
  },
];

const favoriteTools = [
  {
    name: "React",
    logo: "https://cdn.simpleicons.org/react/61DAFB",
    category: "UI",
    desc: "Component-driven interfaces and routing-heavy app shells.",
  },
  {
    name: "TypeScript",
    logo: "https://cdn.simpleicons.org/typescript/3178C6",
    category: "Language",
    desc: "Keeps growing projects clearer and safer to refactor.",
  },
  {
    name: "Firebase",
    logo: "https://cdn.simpleicons.org/firebase/FFCA28",
    category: "Backend",
    desc: "Useful for fast-moving portfolio and student project integrations.",
  },
  {
    name: "Java",
    logo: "https://cdn.simpleicons.org/openjdk/EA2D2E",
    category: "Backend",
    desc: "Still one of the best places for OOP and systems-focused coursework.",
  },
  {
    name: "MySQL",
    logo: "https://cdn.simpleicons.org/mysql/4479A1",
    category: "Data",
    desc: "Where schema design and application state start getting real.",
  },
  {
    name: "Vite",
    logo: "https://cdn.simpleicons.org/vite/646CFF",
    category: "Tooling",
    desc: "Fast local iteration without the usual front-end drag.",
  },
  {
    name: "VS Code",
    logo: vscodeLogo,
    category: "Editor",
    desc: "The main workspace for shipping, debugging, and tightening ideas.",
  },
  {
    name: "Postman",
    logo: "https://cdn.simpleicons.org/postman/FF6C37",
    category: "Testing",
    desc: "Good for checking flows and seeing where APIs actually break.",
  },
];

const interests: {
  icon: ReactNode;
  title: string;
  desc: string;
}[] = [
  {
    icon: <Gamepad2 size={20} />,
    title: "Story-driven games",
    desc: "I like systems with atmosphere, progression, and tension. That shows up in how I think about pacing and feedback loops.",
  },
  {
    icon: <Film size={20} />,
    title: "Movies + streaming interfaces",
    desc: "A lot of my UI curiosity comes from entertainment products that guide attention cleanly and make discovery easy.",
  },
  {
    icon: <Headphones size={20} />,
    title: "Music while I build",
    desc: "I usually code better with something steady in the background, especially during longer UI or debugging sessions.",
  },
  {
    icon: <Palette size={20} />,
    title: "Interaction polish",
    desc: "I pay attention to hierarchy, motion, and the small details that make a site feel intentional instead of assembled.",
  },
];

const funFacts = [
  {
    title: "Healthcare still shapes how I build",
    desc:
      "Reliability, clarity, and trust matter to me because I spent time in work where small mistakes had real consequences.",
  },
  {
    title: "Navigation is one of my favorite problems",
    desc:
      "Command palettes, breadcrumbs, shortcuts, and smart page structure are the kind of details I enjoy tightening the most.",
  },
  {
    title: "I learn fastest by shipping",
    desc:
      "Reading helps, but the real improvement usually happens when I turn an idea into a real interface, system, or workflow.",
  },
  {
    title: "Games influence my UX thinking",
    desc:
      "Progression, suspense, and feedback loops from games often sneak into how I structure user journeys and interactions.",
  },
];

const bookshelf = [
  {
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    status: "On deck",
    note: "For stronger systems thinking around storage, consistency, and scale.",
  },
  {
    title: "Refactoring UI",
    author: "Adam Wathan + Steve Schoger",
    status: "Desk copy",
    note: "A practical lens for hierarchy, spacing, contrast, and cleaner interface decisions.",
  },
  {
    title: "The Pragmatic Programmer",
    author: "Andy Hunt + Dave Thomas",
    status: "Reference",
    note: "Useful for habits, tradeoffs, and keeping the craft side of engineering sharp.",
  },
  {
    title: "Clean Architecture",
    author: "Robert C. Martin",
    status: "Reading",
    note: "Helpful when deciding boundaries as projects stop being simple pages and start acting like products.",
  },
  {
    title: "Grokking Algorithms",
    author: "Aditya Bhargava",
    status: "Revisit",
    note: "A clean refresher for algorithm intuition without turning it into a chore.",
  },
];

const musicVisualizerBars = [38, 62, 48, 78, 56, 86, 44, 72, 58, 80, 50, 68];
const spotifyPlaylistUri = "spotify:playlist:5rcKTnZmrwFG9W4MoCQmuI";

type SpotifyPlaybackUpdateData = {
  duration?: number;
  isBuffering?: boolean;
  isPaused?: boolean;
  playingURI?: string;
  position?: number;
};

type SpotifyPlaybackUpdateEvent = {
  data?: SpotifyPlaybackUpdateData;
};

type SpotifyOEmbedResponse = {
  thumbnail_url?: string;
  title?: string;
};

type SpotifyNowPlaying = {
  artworkUrl: string | null;
  title: string;
  url: string;
};

type SpotifyEmbedController = {
  addListener: (
    eventName: "ready" | "playback_started" | "playback_update",
    callback: (event: SpotifyPlaybackUpdateEvent) => void,
  ) => void;
  destroy?: () => void;
};

type SpotifyIFrameAPI = {
  createController: (
    element: HTMLElement,
    options: {
      height?: number | string;
      uri: string;
      width?: number | string;
    },
    callback: (controller: SpotifyEmbedController) => void,
  ) => void;
};

declare global {
  interface Window {
    __spotifyIframeApi?: SpotifyIFrameAPI;
    onSpotifyIframeApiReady?: (IFrameAPI: SpotifyIFrameAPI) => void;
  }
}

let spotifyIframeApiPromise: Promise<SpotifyIFrameAPI> | null = null;
const spotifyMetadataCache = new Map<string, SpotifyNowPlaying>();

function spotifyUriToOpenUrl(uri: string): string | null {
  const [scheme, entityType, entityId] = uri.split(":");

  if (scheme !== "spotify" || !entityType || !entityId) {
    return null;
  }

  return `https://open.spotify.com/${entityType}/${entityId}`;
}

function loadSpotifyIframeApi(): Promise<SpotifyIFrameAPI> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Spotify iFrame API requires a browser environment."));
  }

  if (window.__spotifyIframeApi) {
    return Promise.resolve(window.__spotifyIframeApi);
  }

  if (spotifyIframeApiPromise) {
    return spotifyIframeApiPromise;
  }

  spotifyIframeApiPromise = new Promise<SpotifyIFrameAPI>((resolve, reject) => {
    const finish = (api: SpotifyIFrameAPI) => {
      window.__spotifyIframeApi = api;
      resolve(api);
    };

    const previousReady = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api) => {
      previousReady?.(api);
      finish(api);
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-spotify-iframe-api="true"]',
    );

    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    script.dataset.spotifyIframeApi = "true";
    script.onerror = () => reject(new Error("Failed to load Spotify iFrame API."));
    document.body.appendChild(script);
  });

  return spotifyIframeApiPromise;
}

const coursework = [
  "Software Development",
  "Web Development",
  "Cloud Computing",
  "Data Structures & Algorithms",
  "Object-Oriented Programming",
  "Database Design",
  "Computer Networks",
  "RESTful APIs",
  "Agile Methodologies",
  "SDLC",
];

const journeyStages = [
  {
    phase: "Foundation",
    title: "Precision before programming",
    copy:
      "Healthcare and operations work built the habits around reliability, trust, and clear process.",
  },
  {
    phase: "Coursework",
    title: "Software + cybersecurity clicked together",
    copy:
      "College turned curiosity into a stronger technical base across code, systems, cloud, and security.",
  },
  {
    phase: "Build Mode",
    title: "Projects became the real classroom",
    copy:
      "Games, tools, and team builds made data flow, backend logic, and user experience feel practical.",
  },
  {
    phase: "Polish",
    title: "Interfaces started feeling like products",
    copy:
      "Navigation, accessibility, interaction design, and content structure became a bigger part of how I work.",
  },
  {
    phase: "Next",
    title: "Full-stack depth with better product instincts",
    copy:
      "The goal is simple: keep shipping stronger work and make each project feel more intentional end to end.",
  },
];

export default function About() {
  const { content: aboutPageContent } = usePageContent("about");
  const [activeTimelineId, setActiveTimelineId] = useState(timelineItems[0].id);
  const [spotifyReady, setSpotifyReady] = useState(false);
  const [spotifyEmbedFallback, setSpotifyEmbedFallback] = useState(false);
  const [spotifyIsPlaying, setSpotifyIsPlaying] = useState(false);
  const [spotifyPlayingUri, setSpotifyPlayingUri] = useState<string | null>(null);
  const [spotifyNowPlaying, setSpotifyNowPlaying] = useState<SpotifyNowPlaying | null>(null);
  const [spotifyPositionMs, setSpotifyPositionMs] = useState(0);
  const [spotifyDurationMs, setSpotifyDurationMs] = useState(1);
  const spotifyEmbedHostRef = useRef<HTMLDivElement | null>(null);

  const activeTimeline =
    timelineItems.find((item) => item.id === activeTimelineId) ?? timelineItems[0];
  const spotifyProgress = spotifyDurationMs > 0 ? spotifyPositionMs / spotifyDurationMs : 0;
  const spotifyPlayingUrl = spotifyPlayingUri ? spotifyUriToOpenUrl(spotifyPlayingUri) : null;
  const activeNowPlaying =
    spotifyPlayingUri && spotifyPlayingUrl
      ? spotifyNowPlaying?.url === spotifyPlayingUrl
        ? spotifyNowPlaying
        : spotifyMetadataCache.get(spotifyPlayingUri) ?? null
      : null;
  const visualizerStatus = spotifyEmbedFallback
    ? "Embed mode"
    : spotifyReady
      ? spotifyIsPlaying
        ? "Now playing"
        : "Paused"
      : "Loading";
  const headerSection = getPageSection(aboutPageContent, "header");
  const introSection = getPageSection(aboutPageContent, "intro");
  const timelineSection = getPageSection(aboutPageContent, "timeline");
  const credentialsSection = getPageSection(aboutPageContent, "credentials");
  const interestsSection = getPageSection(aboutPageContent, "interests");
  const bookshelfSection = getPageSection(aboutPageContent, "bookshelf");
  const journeySection = getPageSection(aboutPageContent, "journey");
  const introLines = getPageSectionLines(introSection);

  useEffect(() => {
    let cancelled = false;
    let controller: SpotifyEmbedController | null = null;

    if (spotifyEmbedFallback) {
      return undefined;
    }

    loadSpotifyIframeApi()
      .then((IFrameAPI) => {
        const host = spotifyEmbedHostRef.current;

        if (cancelled || !host) {
          return;
        }

        const mountPoint = document.createElement("div");
        host.replaceChildren(mountPoint);

        IFrameAPI.createController(
          mountPoint,
          {
            height: window.matchMedia("(max-width: 640px)").matches ? 300 : 352,
            uri: spotifyPlaylistUri,
            width: "100%",
          },
          (embedController) => {
            if (cancelled) {
              embedController.destroy?.();
              return;
            }

            controller = embedController;

            embedController.addListener("ready", () => {
              if (cancelled) {
                return;
              }

              setSpotifyReady(true);
              setSpotifyEmbedFallback(false);
            });

            embedController.addListener("playback_started", (event) => {
              if (!cancelled) {
                setSpotifyIsPlaying(true);

                if (event.data?.playingURI) {
                  setSpotifyPlayingUri(event.data.playingURI);
                }
              }
            });

            embedController.addListener("playback_update", (event) => {
              if (cancelled || !event.data) {
                return;
              }

              const duration = Math.max(1, event.data.duration ?? 1);
              const position = Math.max(0, Math.min(event.data.position ?? 0, duration));

              setSpotifyReady(true);
              setSpotifyDurationMs(duration);
              setSpotifyPositionMs(position);
              setSpotifyIsPlaying(!event.data.isPaused && !event.data.isBuffering);

              if (event.data.playingURI) {
                setSpotifyPlayingUri(event.data.playingURI);
              }
            });
          },
        );
      })
      .catch(() => {
        if (!cancelled) {
          setSpotifyEmbedFallback(true);
          setSpotifyReady(false);
          setSpotifyIsPlaying(false);
        }
      });

    return () => {
      cancelled = true;
      controller?.destroy?.();
    };
  }, [spotifyEmbedFallback]);

  useEffect(() => {
    if (!spotifyIsPlaying) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setSpotifyPositionMs((current) => Math.min(current + 140, spotifyDurationMs));
    }, 140);

    return () => window.clearInterval(intervalId);
  }, [spotifyDurationMs, spotifyIsPlaying]);

  useEffect(() => {
    let cancelled = false;

    if (!spotifyPlayingUri) {
      return undefined;
    }

    const trackUrl = spotifyUriToOpenUrl(spotifyPlayingUri);

    if (!trackUrl) {
      return undefined;
    }

    if (spotifyMetadataCache.has(spotifyPlayingUri)) {
      return undefined;
    }

    fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(trackUrl)}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load Spotify track metadata.");
        }

        const data = (await response.json()) as SpotifyOEmbedResponse;
        const nextNowPlaying: SpotifyNowPlaying = {
          artworkUrl: data.thumbnail_url ?? null,
          title: data.title?.trim() || "Current Spotify track",
          url: trackUrl,
        };

        spotifyMetadataCache.set(spotifyPlayingUri, nextNowPlaying);

        if (!cancelled) {
          setSpotifyNowPlaying(nextNowPlaying);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSpotifyNowPlaying({
            artworkUrl: null,
            title: "Current Spotify track",
            url: trackUrl,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [spotifyPlayingUri]);

  return (
    <section id="about-intro" className="about section section-anchor">
      <div className="container">
        <p className="section-label">{headerSection?.eyebrow ?? "Get To Know Me"}</p>
        <h2 className="section-title">{headerSection?.title ?? "About Me"}</h2>
        {headerSection?.body ? <p className="about-page-copy">{headerSection.body}</p> : null}
        <SectionNav sections={aboutSections} stickyOffset={124} />

        <ScrollReveal>
          <div className="about-intro-grid">
            <div className="about-intro">
              <p>
                {introSection?.body ??
                  "I'm a software development student at Georgia Gwinnett College focused on building full-stack projects that feel intentional in both structure and user experience. My background is not a straight line into tech, and that is part of what shapes how I work."}
              </p>
              {introLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <div className="about-signal-row">
                <span className="about-signal">3.93 GPA</span>
                <span className="about-signal">Expected May 2027</span>
                <span className="about-signal">Lawrenceville, GA</span>
                <span className="about-signal">Remote + Hybrid Ready</span>
              </div>
            </div>

            <div className="about-mini-values">
              {values.map((value) => (
                <div className="card about-mini-value" key={value.title}>
                  <div className="about-mini-value-icon">{value.icon}</div>
                  <div>
                    <h3>{value.title}</h3>
                    <p>{value.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="about-cards">
            {highlights.map((item) => (
              <div className="card about-card" key={item.title}>
                <div className="about-card-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p className="about-card-desc">{item.desc}</p>
                <p className="about-card-sub">{item.sub}</p>
                {item.detail && <span className="about-detail">{item.detail}</span>}
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div id="about-timeline" className="section-anchor">
            <div className="about-section-heading">
              <h3>{timelineSection?.title ?? "Education + Experience Timeline"}</h3>
              <p>{timelineSection?.body ?? "The short version of how healthcare, coursework, certifications, and shipped projects started turning into a clearer software path."}</p>
            </div>

            <div className="about-timeline-shell">
              <div className="about-timeline-list" role="tablist" aria-label="About timeline">
                {timelineItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`about-timeline-item ${activeTimelineId === item.id ? "active" : ""}`}
                    onClick={() => setActiveTimelineId(item.id)}
                  >
                    <span className="about-timeline-marker">{item.marker}</span>
                    <div className="about-timeline-copy">
                      <span className={`about-timeline-type ${item.type.toLowerCase()}`}>
                        {item.type}
                      </span>
                      <strong>{item.title}</strong>
                      <span>{item.range}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="card about-timeline-detail" role="tabpanel">
                <div className="about-timeline-detail-top">
                  <div className="about-timeline-detail-icon">{activeTimeline.icon}</div>
                  <div>
                    <span className={`about-timeline-type ${activeTimeline.type.toLowerCase()}`}>
                      {activeTimeline.type}
                    </span>
                    <h4>{activeTimeline.title}</h4>
                    <p className="about-timeline-org">{activeTimeline.org}</p>
                    <span className="about-timeline-range">{activeTimeline.range}</span>
                  </div>
                </div>
                <p className="about-timeline-summary">{activeTimeline.summary}</p>
                <ul className="about-timeline-bullets">
                  {activeTimeline.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div id="about-credentials" className="section-anchor">
            <div className="about-section-heading">
              <h3>{credentialsSection?.title ?? "Credentials + Favorite Tools"}</h3>
              <p>{credentialsSection?.body ?? "Formal checkpoints, the tools I reach for most often, and the coursework shaping the way I think."}</p>
            </div>

            <div className="about-cert-grid">
              {certifications.map((item) => (
                <div className="card about-cert-card" key={item.title}>
                  <div className="about-cert-badge">
                    <div className="about-cert-badge-core">
                      <Award size={22} />
                    </div>
                  </div>
                  <div className="about-cert-content">
                    <div className="about-cert-topline">
                      <span className={`about-cert-status ${item.status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {item.status}
                      </span>
                      <span className="about-cert-date">{item.date}</span>
                    </div>
                    <h4>{item.title}</h4>
                    <p className="about-cert-org">{item.org}</p>
                    <p className="about-cert-note">{item.note}</p>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="about-badge-link"
                      >
                        <BadgeCheck size={14} />
                        Verify badge
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="about-cert-pending">
                        Verification link will be added once earned.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="about-subsection">
              <div className="about-subsection-heading">
                <Wrench size={18} />
                <h4>Favorite tools</h4>
              </div>
              <div className="about-tools-grid">
                {favoriteTools.map((tool) => (
                  <div className="card about-tool-card" key={tool.name}>
                    <div className="about-tool-mark">
                      <img src={tool.logo} alt={`${tool.name} logo`} loading="lazy" />
                    </div>
                    <div>
                      <p className="about-tool-category">{tool.category}</p>
                      <h5>{tool.name}</h5>
                      <p>{tool.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="about-subsection">
              <div className="about-subsection-heading">
                <Cloud size={18} />
                <h4>Relevant coursework</h4>
              </div>
              <div className="coursework-tags">
                {coursework.map((course) => (
                  <span className="tag" key={course}>
                    {course}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div id="about-interests" className="section-anchor">
            <div className="about-section-heading">
              <h3>{interestsSection?.title ?? "Interests + Fun Facts"}</h3>
              <p>{interestsSection?.body ?? "A few of the things that shape how I recharge, what I notice, and the kind of work I naturally gravitate toward."}</p>
            </div>

            <div className="about-interests-layout">
              <div>
                <div className="about-interest-grid">
                  {interests.map((item) => (
                    <div className="card about-interest-card" key={item.title}>
                      <div className="about-interest-icon">{item.icon}</div>
                      <h4>{item.title}</h4>
                      <p>{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="about-subsection">
                  <div className="about-subsection-heading">
                    <Sparkles size={18} />
                    <h4>Fun facts about me</h4>
                  </div>
                  <div className="about-facts">
                    {funFacts.map((fact) => (
                      <details className="card about-fact-card" key={fact.title}>
                        <summary>{fact.title}</summary>
                        <p>{fact.desc}</p>
                      </details>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card about-music-card">
                <div className="about-subsection-heading">
                  <Headphones size={18} />
                  <h4>Music while I build</h4>
                </div>
                <p className="about-music-copy">
                  Spotify is usually on while I work, especially during longer
                  UI passes, debugging sessions, or late-night polish rounds.
                </p>
                <div className="about-music-tags">
                  <span className="tag">Heavy rap</span>
                  <span className="tag">Drill</span>
                  <span className="tag">Melodic trap</span>
                  <span className="tag">High-energy rotation</span>
                </div>
                <div className="about-music-embed-shell">
                  {spotifyEmbedFallback ? (
                    <iframe
                      className="about-music-embed-fallback"
                      title="Coding soundtrack playlist"
                      src="https://open.spotify.com/embed/playlist/5rcKTnZmrwFG9W4MoCQmuI?utm_source=generator"
                      loading="lazy"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    />
                  ) : (
                    <div
                      ref={spotifyEmbedHostRef}
                      className="about-music-embed"
                      aria-label="Spotify playlist embed"
                    />
                  )}
                </div>
                <div className="about-visualizer">
                  <div className="about-visualizer-top">
                    <div className="about-visualizer-label">Visualizer</div>
                    <span
                      className={`about-visualizer-status ${
                        spotifyIsPlaying ? "playing" : spotifyReady ? "paused" : "loading"
                      }`}
                    >
                      {visualizerStatus}
                    </span>
                  </div>
                  <div className="about-visualizer-now-playing">
                    {activeNowPlaying?.artworkUrl ? (
                      <img
                        src={activeNowPlaying.artworkUrl}
                        alt=""
                        className="about-visualizer-artwork"
                        loading="lazy"
                      />
                    ) : (
                      <div className="about-visualizer-artwork about-visualizer-artwork-placeholder" />
                    )}
                    <div className="about-visualizer-copy">
                      <span className="about-visualizer-eyebrow">Current track</span>
                      {activeNowPlaying ? (
                        <a
                          className="about-visualizer-track"
                          href={activeNowPlaying.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {activeNowPlaying.title}
                        </a>
                      ) : (
                        <span className="about-visualizer-track about-visualizer-track-muted">
                          Start the Spotify player to show the active song
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`about-visualizer-bars ${spotifyIsPlaying ? "playing" : "paused"}`}
                  >
                    {musicVisualizerBars.map((height, index) => (
                      <span
                        key={`${height}-${index}`}
                        className="about-visualizer-bar"
                        style={
                          {
                            "--bar-height": `${height}%`,
                            "--bar-duration": `${1.05 + (index % 4) * 0.18}s`,
                            "--bar-delay": `${index * 0.08}s`,
                          } as CSSProperties
                        }
                      />
                    ))}
                  </div>
                  <div className="about-visualizer-progress">
                    <span
                      style={
                        {
                          width: `${spotifyReady ? Math.max(spotifyProgress * 100, spotifyIsPlaying ? 6 : 0) : 0}%`,
                        } as CSSProperties
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div id="about-bookshelf" className="section-anchor">
            <div className="about-section-heading">
              <h3>{bookshelfSection?.title ?? "Reading List / Bookshelf"}</h3>
              <p>{bookshelfSection?.body ?? "Books and references that keep shaping how I think about systems, product quality, and the craft behind software."}</p>
            </div>
            <div className="about-bookshelf">
              {bookshelf.map((book) => (
                <div className="card about-book-card" key={book.title}>
                  <div className="about-book-spine" aria-hidden="true" />
                  <div className="about-book-copy">
                    <span className="about-book-status">{book.status}</span>
                    <h4>{book.title}</h4>
                    <p className="about-book-author">{book.author}</p>
                    <p>{book.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div id="about-journey" className="section-anchor">
            <div className="about-section-heading">
              <h3>{journeySection?.title ?? "My Development Journey"}</h3>
              <p>{journeySection?.body ?? "A higher-level map of how the transition into software keeps moving from foundation to product-minded execution."}</p>
            </div>

            <div className="about-journey-map">
              <svg
                className="about-journey-line"
                viewBox="0 0 720 320"
                aria-hidden="true"
                preserveAspectRatio="none"
              >
                <path
                  className="about-journey-line-base"
                  d="M40 220 C130 60, 220 60, 300 170 S500 280, 680 92"
                />
                <path
                  className="about-journey-line-progress"
                  d="M40 220 C130 60, 220 60, 300 170 S500 280, 680 92"
                />
              </svg>

              {journeyStages.map((stage, index) => (
                <div
                  className={`card about-journey-stage about-journey-stage-${index + 1}`}
                  key={stage.title}
                >
                  <span className="about-journey-phase">{stage.phase}</span>
                  <h4>{stage.title}</h4>
                  <p>{stage.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
