import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, Github, Linkedin, Download, Mail, ChevronDown, Youtube,
  Code2, GitCommit, FolderOpen, Sparkles, User, Wrench, BookOpen, Server, Cloud, Shield,
  type LucideIcon,
} from "lucide-react";
import HeroConstellation from "../components/HeroConstellation";
import GuidedTour from "../components/GuidedTour";
import ScrollReveal from "../components/ScrollReveal";
import SectionNav from "../components/SectionNav";
import { usePageContent, usePublicSiteLinks } from "../hooks/useContentCatalog";
import {
  GUIDED_TOUR_STORAGE_KEY,
  HOME_TOUR_STEPS,
  getAvailableTourSteps,
  type GuidedTourStep,
} from "../components/GuidedTourData";
import { getPageSection } from "../services/pageContent";
import { projectShowcase } from "../data/projectShowcase";
import "./Home.css";

const stats = [
  { icon: FolderOpen, value: projectShowcase.length, label: "Projects", suffix: "+" },
  { icon: Code2, value: 8, label: "Technologies" },
  { icon: GitCommit, value: 200, label: "Commits", suffix: "+" },
];

interface ExploreLink {
  eyebrow: string;
  title: string;
  desc: string;
  to: string;
  icon: LucideIcon;
}

const exploreLinks: ExploreLink[] = [
  {
    eyebrow: "About",
    title: "Background and direction",
    desc: "Read the short version of how I moved into software development and what I'm building toward.",
    to: "/about",
    icon: User,
  },
  {
    eyebrow: "Skills",
    title: "Stack and tools",
    desc: "See the languages, frameworks, databases, and platforms I use across coursework and personal work.",
    to: "/skills",
    icon: Wrench,
  },
  {
    eyebrow: "Projects",
    title: "Best work first",
    desc: "Open the demos, games, and tools that show how I approach implementation, polish, and problem-solving.",
    to: "/projects",
    icon: FolderOpen,
  },
  {
    eyebrow: "Blog",
    title: "Notes and writeups",
    desc: "Follow project breakdowns, class notes, and lessons I'm documenting as I keep improving.",
    to: "/blog",
    icon: BookOpen,
  },
];

const featuredProjects = [
  {
    title: "Movie Streaming App",
    desc: "A collaborative web app for browsing and streaming movies with stronger polish than a typical class build.",
    to: "/movie-app",
    type: "Academic",
    meta: "JavaScript / HTML / CSS",
  },
  {
    title: "Escaping The Red Cross",
    desc: "A horror escape game adapted for the browser with combat, puzzles, inventory flow, and multi-room progression.",
    to: "/game",
    type: "Academic",
    meta: "Java / MySQL / React",
  },
  {
    title: "YouTube Tag Generator",
    desc: "A lightweight utility for generating YouTube tags quickly and improving discoverability without extra overhead.",
    to: "/yt-tags",
    type: "Personal",
    meta: "JavaScript / UI Tooling",
  },
];

const focusAreas = [
  {
    title: "Backend thinking",
    desc: "I like turning requirements into APIs, state flows, and systems that stay understandable as they grow.",
    icon: Server,
  },
  {
    title: "Cloud momentum",
    desc: "I'm building more deployment and infrastructure experience so projects move beyond localhost with confidence.",
    icon: Cloud,
  },
  {
    title: "Security mindset",
    desc: "Cybersecurity coursework shapes how I think about data handling, access control, resilience, and risk.",
    icon: Shield,
  },
];

const homeSections = [
  { id: "home-hero", label: "Top" },
  { id: "home-overview", label: "Quick Start" },
  { id: "home-featured", label: "Featured" },
  { id: "home-focus", label: "Current Focus" },
];

const heroSocialFallback = [
  { id: "github", href: "https://github.com/laureesh", icon: Github, label: "GitHub" },
  { id: "linkedin", href: "https://linkedin.com/in/laureesh", icon: Linkedin, label: "LinkedIn" },
  { id: "email", href: "mailto:laureesh1@gmail.com", icon: Mail, label: "Email" },
];

function getSocialIcon(icon: string | null) {
  switch (icon) {
    case "github":
      return Github;
    case "linkedin":
      return Linkedin;
    case "youtube":
      return Youtube;
    case "mail":
      return Mail;
    default:
      return null;
  }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1500;
          const steps = 40;
          const increment = value / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function Home() {
  const { links: siteLinks } = usePublicSiteLinks("social");
  const { content: homePageContent } = usePageContent("home");
  const [tourOpen, setTourOpen] = useState(false);
  const [tourSteps, setTourSteps] = useState<GuidedTourStep[]>([]);
  const [showStartHere, setShowStartHere] = useState(() => {
    try {
      return localStorage.getItem(GUIDED_TOUR_STORAGE_KEY) !== "true";
    } catch {
      return true;
    }
  });

  const startTour = () => {
    const visibleSteps = getAvailableTourSteps(HOME_TOUR_STEPS);

    if (visibleSteps.length === 0) return;

    setTourSteps(visibleSteps);
    setTourOpen(true);
  };

  const dismissTour = () => {
    try {
      localStorage.setItem(GUIDED_TOUR_STORAGE_KEY, "true");
    } catch {
      // Ignore storage issues and still hide the CTA locally.
    }

    setTourOpen(false);
    setShowStartHere(false);
  };

  const heroSocialLinks = siteLinks.length
    ? siteLinks
        .map((link) => {
          const icon = getSocialIcon(link.icon);

          if (!icon) {
            return null;
          }

          return {
            id: link.id,
            href: link.url,
            icon,
            label: link.label,
          };
        })
        .filter((link): link is { id: string; href: string; icon: LucideIcon; label: string } => Boolean(link))
    : heroSocialFallback;
  const heroSection = getPageSection(homePageContent, "hero");
  const overviewSection = getPageSection(homePageContent, "overview");
  const featuredSection = getPageSection(homePageContent, "featured");
  const focusSection = getPageSection(homePageContent, "focus");

  return (
    <>
    <section id="home-hero" className="hero section section-anchor">
      <div className="hero-bg-grid" />
      <HeroConstellation />
      <div className="container hero-grid">
        <div className="hero-text" data-tour="hero-intro">
          <div className="hero-status">
            <span className="status-dot" />
            {heroSection?.eyebrow ?? "Available for opportunities"}
          </div>
          <h1 className="hero-name">
            <span className="hero-greeting-inline">{getGreeting()}, I'm </span>
            {heroSection?.title ?? "Laureesh Volmar"}
          </h1>
          <p className="hero-role">
            Student Intern{" "}
            <span className="highlight">
              Software Developer/Cybersecurity
            </span>
          </p>
          <p className="hero-desc">
            {heroSection?.body ??
              "Dual-degree IT student at Georgia Gwinnett College pursuing Software Development and Cybersecurity. Passionate about back-end development, cloud computing, and building data-driven applications."}
          </p>
          <div className="hero-actions">
            {showStartHere && (
              <button type="button" className="btn btn-tour" onClick={startTour}>
                <Sparkles size={18} />
                <span className="btn-tour-copy">
                  <strong>Start Here</strong>
                  <small>Guided Tour</small>
                </span>
              </button>
            )}
            <Link to="/projects" className="btn btn-primary" data-tour="projects-cta">
              View Projects <ArrowRight size={18} />
            </Link>
            <a
              href="https://docs.google.com/document/d/1dlpvPCyLOCa0QEr2od7zmgeclC80N68E/edit?usp=sharing&ouid=115099727412203064487&rtpof=true&sd=true"
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline"
            >
              <Download size={18} /> Resume
            </a>
          </div>
          {!showStartHere && (
            <button type="button" className="tour-replay-link" onClick={startTour}>
              <Sparkles size={16} /> Replay guided tour
            </button>
          )}
          <div className="hero-socials">
            {heroSocialLinks.map((link) => {
              const Icon = link.icon;
              const external = !link.href.startsWith("mailto:");

              return (
                <a
                  key={link.id}
                  href={link.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer" : undefined}
                  aria-label={link.label}
                >
                  <Icon size={20} />
                </a>
              );
            })}
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-avatar">
            <div className="avatar-ring" />
            <div className="avatar-ring avatar-ring-2" />
            <span className="avatar-initials">LV</span>
          </div>
        </div>
        {/* Stats counter */}
        <div className="hero-stats">
          {stats.map((stat) => (
            <div className="hero-stat" key={stat.label}>
              <stat.icon size={20} className="hero-stat-icon" />
              <span className="hero-stat-value">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </span>
              <span className="hero-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        type="button"
        className="scroll-indicator"
        aria-label="Scroll to home overview"
        onClick={() => document.getElementById("home-overview")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      >
        <span>Explore</span>
        <ChevronDown size={16} />
      </button>
      <div className="hero-wave-divider" aria-hidden="true">
        <svg className="hero-wave hero-wave-back" viewBox="0 0 2880 180" preserveAspectRatio="none">
          <path d="M0,94L60,104C120,114,240,134,360,136C480,138,600,122,720,108C840,94,960,82,1080,88C1200,94,1320,118,1440,126L1440,180L0,180Z" />
          <path transform="translate(1440 0)" d="M0,94L60,104C120,114,240,134,360,136C480,138,600,122,720,108C840,94,960,82,1080,88C1200,94,1320,118,1440,126L1440,180L0,180Z" />
        </svg>
        <svg className="hero-wave hero-wave-mid" viewBox="0 0 2880 180" preserveAspectRatio="none">
          <path d="M0,116L72,110C144,104,288,92,432,88C576,84,720,88,864,100C1008,112,1152,132,1296,132C1368,132,1404,127,1440,122L1440,180L0,180Z" />
          <path transform="translate(1440 0)" d="M0,116L72,110C144,104,288,92,432,88C576,84,720,88,864,100C1008,112,1152,132,1296,132C1368,132,1404,127,1440,122L1440,180L0,180Z" />
        </svg>
        <svg className="hero-wave hero-wave-front" viewBox="0 0 2880 180" preserveAspectRatio="none">
          <path d="M0,128L80,120C160,112,320,96,480,96C640,96,800,112,960,124C1120,136,1280,144,1360,148L1440,152L1440,180L0,180Z" />
          <path transform="translate(1440 0)" d="M0,128L80,120C160,112,320,96,480,96C640,96,800,112,960,124C1120,136,1280,144,1360,148L1440,152L1440,180L0,180Z" />
        </svg>
      </div>
    </section>
    <div className="container home-section-nav-shell">
      <SectionNav sections={homeSections} stickyOffset={84} />
    </div>
    <section id="home-overview" className="home-overview section section-anchor">
      <div className="container">
        <ScrollReveal>
          <div className="home-section-head">
            <p className="section-label">{overviewSection?.eyebrow ?? "Quick Start"}</p>
            <h2 className="section-title">{overviewSection?.title ?? "Start with the pages that matter most"}</h2>
            <p className="home-section-copy">
              {overviewSection?.body ??
                "Projects is the fastest way to see what I've built. About adds background. Skills shows the tools behind the work. Use the cards below based on what you want to learn first."}
            </p>
          </div>
        </ScrollReveal>

        <div className="home-explore-grid">
          {exploreLinks.map((item, index) => {
            const Icon = item.icon;

            return (
              <ScrollReveal key={item.title} delay={index * 0.08}>
                <Link to={item.to} className="card home-explore-card">
                  <span className="home-card-eyebrow">{item.eyebrow}</span>
                  <div className="home-card-top">
                    <span className="home-card-icon">
                      <Icon size={18} />
                    </span>
                    <ArrowUpRight size={18} className="home-card-arrow" />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>

    <section id="home-featured" className="home-featured section section-anchor">
      <div className="container">
        <ScrollReveal>
          <div className="home-section-head home-section-head-split">
            <div>
              <p className="section-label">{featuredSection?.eyebrow ?? "Featured Projects"}</p>
              <h2 className="section-title">{featuredSection?.title ?? "Start with these"}</h2>
              {featuredSection?.body ? <p className="home-section-copy">{featuredSection.body}</p> : null}
            </div>
            <Link to="/projects" className="home-inline-link">
              See every project <ArrowRight size={16} />
            </Link>
          </div>
        </ScrollReveal>

        <div className="home-featured-grid">
          {featuredProjects.map((project, index) => (
            <ScrollReveal key={project.title} delay={index * 0.08}>
              <Link to={project.to} className="card home-featured-card">
                <div className="home-featured-top">
                  <span className="home-featured-type">{project.type}</span>
                  <ArrowUpRight size={18} />
                </div>
                <h3>{project.title}</h3>
                <p>{project.desc}</p>
                <span className="home-featured-meta">{project.meta}</span>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>

    <section id="home-focus" className="home-focus section section-anchor">
      <div className="container home-focus-layout">
        <ScrollReveal>
          <div className="home-focus-copy">
            <p className="section-label">{focusSection?.eyebrow ?? "Current Focus"}</p>
            <h2 className="section-title">{focusSection?.title ?? "What I'm building toward"}</h2>
            <p className="home-section-copy">
              {focusSection?.body ??
                "I'm working on stronger backend foundations, more cloud confidence, and projects that are clear enough to explain and solid enough to demo."}
            </p>
            <div className="home-focus-actions">
              <Link to="/resume" className="btn btn-outline">
                <Download size={18} /> View Resume
              </Link>
              <Link to="/contact" className="btn btn-primary">
                Let's Talk <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </ScrollReveal>

        <div className="home-focus-grid">
          {focusAreas.map((area, index) => {
            const Icon = area.icon;

            return (
              <ScrollReveal key={area.title} delay={index * 0.08}>
                <div className="card home-focus-card">
                  <span className="home-focus-icon">
                    <Icon size={18} />
                  </span>
                  <h3>{area.title}</h3>
                  <p>{area.desc}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
    {tourOpen && <GuidedTour steps={tourSteps} onDismiss={dismissTour} />}
    </>
  );
}

