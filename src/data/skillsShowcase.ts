import vscodeLogo from "../assets/vscode-mark.svg";

export type SkillAreaId = "frontend" | "backend" | "data" | "cloud" | "tooling";

export interface SkillProjectLink {
  label: string;
  path: string;
  external?: boolean;
}

export interface SkillMetrics {
  confidence: number;
  projectUse: number;
  breadth: number;
  momentum: number;
}

export interface SkillItem {
  id: string;
  name: string;
  areaId: SkillAreaId;
  icon: string;
  desc: string;
  strengths: string[];
  usage: string;
  nextStep: string;
  certifications: string[];
  projectLinks: SkillProjectLink[];
  metrics: SkillMetrics;
  growth: number[];
  graphPriority: number;
}

export interface SkillArea {
  id: SkillAreaId;
  title: string;
  shortLabel: string;
  summary: string;
  accent: string;
  featuredSkillIds: string[];
  roadmap: {
    label: string;
    status: "solid" | "building" | "active" | "next";
    detail: string;
  }[];
}

export interface SkillCertification {
  id: string;
  title: string;
  provider: string;
  status: "Verified" | "In Progress";
  link?: string;
  note: string;
  relatedAreas: SkillAreaId[];
  relatedSkillIds: string[];
}

const courseProjectLink = (label: string, path: string, external = false): SkillProjectLink => ({
  label,
  path,
  external,
});

export const growthPeriods = ["2023", "2024", "2025", "2026"];

export const skillAreas: SkillArea[] = [
  {
    id: "frontend",
    title: "Frontend & UX",
    shortLabel: "Frontend",
    summary:
      "The strongest current area: app-shell UX, responsive layout systems, typed React work, and interface polish that feels deliberate.",
    accent: "#8b5cf6",
    featuredSkillIds: ["react", "typescript", "css3"],
    roadmap: [
      {
        label: "Foundation",
        status: "solid",
        detail: "HTML, CSS, and browser-first thinking are stable enough that layout work starts fast.",
      },
      {
        label: "Component systems",
        status: "active",
        detail: "React, TypeScript, and Vite are the main stack for shipping the current portfolio and UI-heavy builds.",
      },
      {
        label: "Interaction polish",
        status: "active",
        detail: "Keyboard UX, navigation clarity, motion, and visual hierarchy are a recurring focus right now.",
      },
      {
        label: "Next",
        status: "next",
        detail: "Push deeper into testing, stronger component contracts, and cleaner design-system boundaries.",
      },
    ],
  },
  {
    id: "backend",
    title: "Backend & Logic",
    shortLabel: "Backend",
    summary:
      "Most backend confidence comes from Java game systems, PHP class projects, and Firebase-backed portfolio planning.",
    accent: "#22c55e",
    featuredSkillIds: ["java", "php", "firebase"],
    roadmap: [
      {
        label: "Core logic",
        status: "solid",
        detail: "Java built the strongest habits around OOP, game rules, and command flow.",
      },
      {
        label: "Web backends",
        status: "building",
        detail: "PHP and Firebase cover the current web-focused backend layer for portfolio and class projects.",
      },
      {
        label: "API thinking",
        status: "active",
        detail: "Data contracts, validation, and state rules matter more now as projects stop being single-screen demos.",
      },
      {
        label: "Next",
        status: "next",
        detail: "Deeper REST patterns, stronger auth flows, and more production-like backend structure.",
      },
    ],
  },
  {
    id: "data",
    title: "Data & Persistence",
    shortLabel: "Data",
    summary:
      "Relational modeling is strongest with MySQL coursework, while document-style tools are still in the learning-and-comparison stage.",
    accent: "#06b6d4",
    featuredSkillIds: ["mysql", "postgresql", "mongodb"],
    roadmap: [
      {
        label: "Relational basics",
        status: "solid",
        detail: "Schema thinking, joins, and persistence rules are most practiced through MySQL-backed builds.",
      },
      {
        label: "Query fluency",
        status: "building",
        detail: "PostgreSQL is being used more as query depth and relational tradeoffs become more interesting.",
      },
      {
        label: "NoSQL comparison",
        status: "building",
        detail: "MongoDB is part of the current comparison layer, especially against Firebase-style workflows.",
      },
      {
        label: "Next",
        status: "next",
        detail: "Sharpen indexing, migration discipline, and stronger design choices around read-heavy application data.",
      },
    ],
  },
  {
    id: "cloud",
    title: "Cloud & Systems",
    shortLabel: "Cloud",
    summary:
      "This area is still more growth-oriented than portfolio-proven, but it connects directly to networking, security, and deployment work.",
    accent: "#f59e0b",
    featuredSkillIds: ["aws", "docker", "linux"],
    roadmap: [
      {
        label: "Systems baseline",
        status: "solid",
        detail: "Networking and systems coursework give the language needed to reason through infrastructure topics.",
      },
      {
        label: "Cloud labs",
        status: "building",
        detail: "AWS and Azure are part of the current learning path, especially around deployment and service boundaries.",
      },
      {
        label: "Containers and environments",
        status: "building",
        detail: "Docker and Linux are becoming more important as projects move closer to deployment-minded workflows.",
      },
      {
        label: "Next",
        status: "next",
        detail: "Turn cloud labs into clearer public project stories with deployment notes and stronger ops vocabulary.",
      },
    ],
  },
  {
    id: "tooling",
    title: "Tooling & Delivery",
    shortLabel: "Tooling",
    summary:
      "Version control, workflow discipline, and delivery habits show up across every build, especially collaborative coursework and portfolio iteration.",
    accent: "#ec4899",
    featuredSkillIds: ["git", "github", "agile"],
    roadmap: [
      {
        label: "Version control",
        status: "solid",
        detail: "Git and GitHub are stable daily tools for shipping, iteration, and coursework collaboration.",
      },
      {
        label: "Design and workflow",
        status: "active",
        detail: "VS Code is the primary shipping environment, while Figma helps tighten structure before UI work starts.",
      },
      {
        label: "Team delivery",
        status: "active",
        detail: "Agile/Scrum and SDLC thinking matter most on larger class builds with multiple moving parts.",
      },
      {
        label: "Next",
        status: "next",
        detail: "Stronger release discipline, issue tracking flow, and better testing integration across team projects.",
      },
    ],
  },
];

export const certifications: SkillCertification[] = [
  {
    id: "networking",
    title: "IT Specialist in Networking",
    provider: "Certiport",
    status: "Verified",
    link: "https://www.credly.com/badges/0b9e6568-32cb-4375-b670-b79eedfa86ca",
    note:
      "Useful proof behind the systems, networking, and infrastructure side of the stack.",
    relatedAreas: ["cloud", "data"],
    relatedSkillIds: ["aws", "azure", "docker", "linux", "mysql", "postgresql"],
  },
  {
    id: "cybersecurity",
    title: "IT Specialist in Cybersecurity",
    provider: "Certiport",
    status: "In Progress",
    note:
      "The next formal checkpoint supporting security-aware thinking across cloud, Linux, GitHub workflow, and system boundaries.",
    relatedAreas: ["cloud", "tooling"],
    relatedSkillIds: ["linux", "aws", "github", "sdlc", "agile"],
  },
];

export const skillsCatalog: SkillItem[] = [
  {
    id: "html5",
    name: "HTML5",
    areaId: "frontend",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/html5/html5-original.svg",
    desc: "Semantic structure, accessibility, and layout scaffolding for every web build.",
    strengths: ["Semantic markup", "Accessible structure", "Reusable page scaffolds"],
    usage: "Used across the portfolio, Movie Streaming App, and utility builds.",
    nextStep: "Keep tightening semantic patterns and content hierarchy in larger page systems.",
    certifications: [],
    projectLinks: [
      courseProjectLink("Portfolio Website", "/"),
      courseProjectLink("Movie Streaming App", "/movie-app"),
      courseProjectLink("YouTube Tag Generator", "/yt-tags"),
    ],
    metrics: { confidence: 92, projectUse: 95, breadth: 84, momentum: 88 },
    growth: [38, 64, 84, 92],
    graphPriority: 2,
  },
  {
    id: "css3",
    name: "CSS3",
    areaId: "frontend",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/css3/css3-original.svg",
    desc: "Responsive layout work, visual hierarchy, motion, and app-shell styling.",
    strengths: ["Responsive systems", "Animation polish", "Reusable page patterns"],
    usage: "One of the most actively sharpened skills on the portfolio right now.",
    nextStep: "Push harder on component-level tokens and cleaner large-scale styling systems.",
    certifications: [],
    projectLinks: [
      courseProjectLink("Portfolio Website", "/"),
      courseProjectLink("Movie Streaming App", "/movie-app"),
      courseProjectLink("YouTube Tag Generator", "/yt-tags"),
    ],
    metrics: { confidence: 90, projectUse: 94, breadth: 86, momentum: 93 },
    growth: [26, 54, 80, 90],
    graphPriority: 3,
  },
  {
    id: "javascript",
    name: "JavaScript",
    areaId: "frontend",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg",
    desc: "Core browser logic, dynamic UI behavior, and lighter app logic in web builds.",
    strengths: ["DOM logic", "UI interactions", "General web scripting"],
    usage: "Used across the portfolio, Movie Streaming App, and the tag generator.",
    nextStep: "Keep translating more JavaScript intuition into stronger TypeScript discipline.",
    certifications: [],
    projectLinks: [
      courseProjectLink("Portfolio Website", "/"),
      courseProjectLink("Movie Streaming App", "/movie-app"),
      courseProjectLink("YouTube Tag Generator", "/yt-tags"),
    ],
    metrics: { confidence: 88, projectUse: 92, breadth: 83, momentum: 86 },
    growth: [30, 58, 79, 88],
    graphPriority: 2,
  },
  {
    id: "typescript",
    name: "TypeScript",
    areaId: "frontend",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg",
    desc: "Typed React development, safer refactors, and clearer component contracts.",
    strengths: ["Typed props", "Safer refactors", "Cleaner shared component APIs"],
    usage: "A major part of the current portfolio build and ongoing front-end direction.",
    nextStep: "Keep getting sharper around data models, narrower types, and stricter shared UI contracts.",
    certifications: [],
    projectLinks: [
      courseProjectLink("Portfolio Website", "/"),
    ],
    metrics: { confidence: 84, projectUse: 82, breadth: 74, momentum: 94 },
    growth: [0, 18, 62, 84],
    graphPriority: 4,
  },
  {
    id: "react",
    name: "React",
    areaId: "frontend",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg",
    desc: "Component-based UI architecture, routing, reusable shells, and interaction-heavy pages.",
    strengths: ["App-shell UX", "Reusable components", "Routing and stateful views"],
    usage: "The main UI framework behind the portfolio and the React game shells.",
    nextStep: "Keep improving component boundaries, state flow, and testable UI patterns.",
    certifications: [],
    projectLinks: [
      courseProjectLink("Portfolio Website", "/"),
      courseProjectLink("Escaping The Red Cross", "/game"),
      courseProjectLink("Solo Text-Based Adventure", "/solo-game"),
    ],
    metrics: { confidence: 89, projectUse: 90, breadth: 82, momentum: 95 },
    growth: [0, 22, 68, 89],
    graphPriority: 5,
  },
  {
    id: "vite",
    name: "Vite",
    areaId: "frontend",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vitejs/vitejs-original.svg",
    desc: "Fast local iteration, cleaner front-end setup, and a smoother modern dev loop.",
    strengths: ["Fast feedback loop", "Simple configuration", "Modern React setup"],
    usage: "Used directly on the portfolio and now part of the standard front-end baseline.",
    nextStep: "Use the faster local loop to support cleaner test and deployment workflows.",
    certifications: [],
    projectLinks: [
      courseProjectLink("Portfolio Website", "/"),
    ],
    metrics: { confidence: 80, projectUse: 76, breadth: 66, momentum: 87 },
    growth: [0, 0, 48, 80],
    graphPriority: 1,
  },
  {
    id: "figma",
    name: "Figma",
    areaId: "frontend",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/figma/figma-original.svg",
    desc: "Layout planning, interface direction, and visual thinking before CSS starts.",
    strengths: ["Wireframing", "Layout direction", "Component planning"],
    usage: "Used most when a page needs stronger structure before implementation.",
    nextStep: "Use it more often for systems-level planning rather than just quick visual starts.",
    certifications: [],
    projectLinks: [
      courseProjectLink("Portfolio Website", "/"),
      courseProjectLink("Movie Streaming App", "/movie-app"),
    ],
    metrics: { confidence: 72, projectUse: 62, breadth: 58, momentum: 78 },
    growth: [12, 28, 50, 72],
    graphPriority: 1,
  },
  {
    id: "java",
    name: "Java",
    areaId: "backend",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg",
    desc: "OOP, core logic, turn-based systems, and class projects with deeper rule sets.",
    strengths: ["Object-oriented design", "Game logic", "Structured problem solving"],
    usage: "The strongest backend-language foundation so far.",
    nextStep: "Push deeper into cleaner architecture, APIs, and stronger test discipline.",
    certifications: [],
    projectLinks: [
      courseProjectLink("Escaping The Red Cross", "/game"),
      courseProjectLink("Solo Text-Based Adventure", "/solo-game"),
      courseProjectLink(
        "Advanced Programming",
        "https://laureesh.gitbook.io/laureesh/advanced-programming-projects/itec-3150-advanced-programming",
        true,
      ),
    ],
    metrics: { confidence: 90, projectUse: 89, breadth: 76, momentum: 85 },
    growth: [36, 62, 82, 90],
    graphPriority: 5,
  },
  {
    id: "php",
    name: "PHP",
    areaId: "backend",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/php/php-original.svg",
    desc: "Server-side logic, session-backed flows, and database-connected class web apps.",
    strengths: ["Server rendering", "Form handling", "Database-backed pages"],
    usage: "Most visible in the Movie Streaming App build.",
    nextStep: "Turn more of the current PHP experience into clearer backend architecture decisions.",
    certifications: [],
    projectLinks: [
      courseProjectLink("Movie Streaming App", "/movie-app"),
    ],
    metrics: { confidence: 74, projectUse: 70, breadth: 58, momentum: 65 },
    growth: [0, 24, 60, 74],
    graphPriority: 3,
  },
  {
    id: "firebase",
    name: "Firebase",
    areaId: "backend",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/firebase/firebase-original.svg",
    desc: "Fast backend services for auth, data, and lightweight portfolio features.",
    strengths: ["Fast setup", "Hosted services", "Student-friendly backend workflow"],
    usage: "Part of the current portfolio direction for lightweight live features.",
    nextStep: "Use it in more public-facing workflows and document the tradeoffs clearly.",
    certifications: [],
    projectLinks: [
      courseProjectLink("Portfolio Website", "/"),
      courseProjectLink("Why I Chose Firebase for My Portfolio", "/blog/why-i-chose-firebase-for-my-portfolio"),
    ],
    metrics: { confidence: 76, projectUse: 68, breadth: 60, momentum: 88 },
    growth: [0, 0, 46, 76],
    graphPriority: 2,
  },
  {
    id: "mysql",
    name: "MySQL",
    areaId: "data",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mysql/mysql-original.svg",
    desc: "Relational schemas, query work, and persistence across game and web coursework.",
    strengths: ["Relational modeling", "CRUD flows", "Query-backed app state"],
    usage: "The most practiced database in project work so far.",
    nextStep: "Go deeper on schema evolution, indexing, and cleaner application-to-data boundaries.",
    certifications: ["networking"],
    projectLinks: [
      courseProjectLink("Movie Streaming App", "/movie-app"),
      courseProjectLink("Escaping The Red Cross", "/game"),
      courseProjectLink(
        "Advanced Programming",
        "https://laureesh.gitbook.io/laureesh/advanced-programming-projects/itec-3150-advanced-programming",
        true,
      ),
    ],
    metrics: { confidence: 84, projectUse: 86, breadth: 68, momentum: 78 },
    growth: [22, 48, 74, 84],
    graphPriority: 5,
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    areaId: "data",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg",
    desc: "Stronger relational querying and a next-step database path beyond the current MySQL comfort zone.",
    strengths: ["Advanced query interest", "Relational depth", "Design comparison thinking"],
    usage: "More learning-focused than public-project-heavy right now.",
    nextStep: "Use it in a fuller public project so the query depth becomes visible in shipped work.",
    certifications: ["networking"],
    projectLinks: [
      courseProjectLink("Portfolio Website", "/"),
      courseProjectLink(
        "Intermediate Programming",
        "https://laureesh.gitbook.io/laureesh/intermediate-programming-projects/itec-2150-intermediate-programming",
        true,
      ),
    ],
    metrics: { confidence: 58, projectUse: 36, breadth: 42, momentum: 79 },
    growth: [0, 14, 34, 58],
    graphPriority: 2,
  },
  {
    id: "mongodb",
    name: "MongoDB",
    areaId: "data",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mongodb/mongodb-original.svg",
    desc: "Document-based persistence that is still mostly in the comparison and experimentation stage.",
    strengths: ["Document model familiarity", "Backend comparison thinking", "Flexible schema exploration"],
    usage: "Currently more comparison-oriented than project-proven.",
    nextStep: "Use it in a real app flow where document structure clearly beats a relational model.",
    certifications: [],
    projectLinks: [
      courseProjectLink("Why I Chose Firebase for My Portfolio", "/blog/why-i-chose-firebase-for-my-portfolio"),
      courseProjectLink("Portfolio Website", "/"),
    ],
    metrics: { confidence: 46, projectUse: 24, breadth: 34, momentum: 71 },
    growth: [0, 8, 22, 46],
    graphPriority: 1,
  },
  {
    id: "aws",
    name: "AWS",
    areaId: "cloud",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/amazonwebservices/amazonwebservices-original-wordmark.svg",
    desc: "Cloud services and deployment concepts that connect to the networking and infrastructure path.",
    strengths: ["Deployment interest", "Infrastructure vocabulary", "Cloud service awareness"],
    usage: "In the active learning lane rather than a public showcase lane.",
    nextStep: "Turn the AWS path into a clearer deployment story with public project notes.",
    certifications: ["networking", "cybersecurity"],
    projectLinks: [
      courseProjectLink("Portfolio Website", "/"),
      courseProjectLink(
        "Advanced Programming",
        "https://laureesh.gitbook.io/laureesh/advanced-programming-projects/itec-3150-advanced-programming",
        true,
      ),
    ],
    metrics: { confidence: 44, projectUse: 20, breadth: 32, momentum: 82 },
    growth: [0, 10, 24, 44],
    graphPriority: 3,
  },
  {
    id: "azure",
    name: "Azure",
    areaId: "cloud",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/azure/azure-original.svg",
    desc: "Another cloud platform in the systems-learning track, mainly tied to infrastructure and networking growth.",
    strengths: ["Platform comparison", "Cloud terminology", "Systems exposure"],
    usage: "Still earlier-stage than the rest of the page, but relevant to the certification path.",
    nextStep: "Build one cleaner deployment or lab walkthrough that makes this skill visible in public.",
    certifications: ["networking"],
    projectLinks: [
      courseProjectLink("Portfolio Website", "/"),
    ],
    metrics: { confidence: 38, projectUse: 14, breadth: 28, momentum: 74 },
    growth: [0, 6, 18, 38],
    graphPriority: 1,
  },
  {
    id: "docker",
    name: "Docker",
    areaId: "cloud",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg",
    desc: "Container thinking and dev-environment consistency that fit naturally with the current cloud roadmap.",
    strengths: ["Environment isolation", "Deployment curiosity", "Tooling discipline"],
    usage: "A growth skill that supports more serious app delivery work.",
    nextStep: "Use Docker in a public workflow where setup consistency is part of the project story.",
    certifications: ["networking"],
    projectLinks: [
      courseProjectLink("Portfolio Website", "/"),
      courseProjectLink("Movie Streaming App", "/movie-app"),
    ],
    metrics: { confidence: 42, projectUse: 18, breadth: 30, momentum: 80 },
    growth: [0, 8, 20, 42],
    graphPriority: 2,
  },
  {
    id: "linux",
    name: "Linux",
    areaId: "cloud",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/linux/linux-original.svg",
    desc: "CLI comfort, system awareness, and the operations side of the current infrastructure track.",
    strengths: ["Command line comfort", "System thinking", "Security context"],
    usage: "Shows up more in the systems path than in visible front-end project screenshots.",
    nextStep: "Keep connecting Linux workflow practice to deployment and security-oriented project notes.",
    certifications: ["networking", "cybersecurity"],
    projectLinks: [
      courseProjectLink("Portfolio Website", "/"),
      courseProjectLink("Escaping The Red Cross", "/game"),
    ],
    metrics: { confidence: 58, projectUse: 34, breadth: 50, momentum: 84 },
    growth: [12, 28, 44, 58],
    graphPriority: 4,
  },
  {
    id: "git",
    name: "Git",
    areaId: "tooling",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/git/git-original.svg",
    desc: "Version control and iteration discipline across solo work and collaborative class projects.",
    strengths: ["Branching habits", "Versioned iteration", "Daily development flow"],
    usage: "One of the most consistent tools across every project.",
    nextStep: "Keep improving release discipline and more deliberate commit storytelling.",
    certifications: [],
    projectLinks: [
      courseProjectLink("Portfolio Website", "/"),
      courseProjectLink("Escaping The Red Cross", "/game"),
      courseProjectLink("Movie Streaming App", "/movie-app"),
    ],
    metrics: { confidence: 88, projectUse: 96, breadth: 78, momentum: 80 },
    growth: [28, 56, 76, 88],
    graphPriority: 5,
  },
  {
    id: "github",
    name: "GitHub",
    areaId: "tooling",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/github/github-original.svg",
    desc: "Repo hosting, collaboration, Pages, and shared project history across multiple builds.",
    strengths: ["Collaboration flow", "Repo management", "Public project visibility"],
    usage: "Central to how projects are stored, shared, and iterated on.",
    nextStep: "Use Issues, release notes, and workflow automation more deliberately.",
    certifications: ["cybersecurity"],
    projectLinks: [
      courseProjectLink("Portfolio Website", "/"),
      courseProjectLink("Escaping The Red Cross", "/game"),
      courseProjectLink("Movie Streaming App", "/movie-app"),
    ],
    metrics: { confidence: 86, projectUse: 95, breadth: 74, momentum: 82 },
    growth: [24, 50, 74, 86],
    graphPriority: 4,
  },
  {
    id: "vscode",
    name: "VS Code",
    areaId: "tooling",
    icon: vscodeLogo,
    desc: "Primary editor for shipping, debugging, navigation work, and general front-end iteration.",
    strengths: ["Debugging flow", "Editor customization", "Daily shipping environment"],
    usage: "The main workspace behind the portfolio and most current coding work.",
    nextStep: "Keep tightening workflows around debugging, search, and project-level consistency.",
    certifications: [],
    projectLinks: [
      courseProjectLink("Portfolio Website", "/"),
      courseProjectLink("YouTube Tag Generator", "/yt-tags"),
    ],
    metrics: { confidence: 90, projectUse: 98, breadth: 72, momentum: 76 },
    growth: [32, 58, 82, 90],
    graphPriority: 3,
  },
  {
    id: "bun",
    name: "Bun.js",
    areaId: "tooling",
    icon: "https://bun.com/logo.svg",
    desc: "Fast JavaScript runtime and package manager used in the current tooling mix.",
    strengths: ["Fast installs", "Modern runtime", "Simple local tooling"],
    usage: "Used as part of the current portfolio workflow and local dev setup.",
    nextStep: "Use it more deliberately across scripts and document where it improves the workflow.",
    certifications: [],
    projectLinks: [
      courseProjectLink("Portfolio Website", "/"),
    ],
    metrics: { confidence: 72, projectUse: 64, breadth: 56, momentum: 84 },
    growth: [0, 0, 28, 72],
    graphPriority: 2,
  },
  {
    id: "agile",
    name: "Agile / Scrum",
    areaId: "tooling",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/jira/jira-original.svg",
    desc: "Sprint-based team workflow, standups, and iterative collaboration habits.",
    strengths: ["Collaborative pacing", "Incremental delivery", "Team communication"],
    usage: "Most relevant on the larger class projects with multiple contributors.",
    nextStep: "Keep turning process vocabulary into cleaner execution and handoff quality.",
    certifications: ["cybersecurity"],
    projectLinks: [
      courseProjectLink("Escaping The Red Cross", "/game"),
      courseProjectLink("Movie Streaming App", "/movie-app"),
    ],
    metrics: { confidence: 70, projectUse: 74, breadth: 62, momentum: 72 },
    growth: [18, 36, 58, 70],
    graphPriority: 2,
  },
  {
    id: "sdlc",
    name: "SDLC",
    areaId: "tooling",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/confluence/confluence-original.svg",
    desc: "The process lens behind planning, iteration, delivery, and sharper software boundaries.",
    strengths: ["Lifecycle thinking", "Requirements awareness", "Process structure"],
    usage: "Shows up more in how projects are organized than in visible UI screenshots.",
    nextStep: "Connect the process side more clearly to testing and release quality in public work.",
    certifications: ["cybersecurity"],
    projectLinks: [
      courseProjectLink("Portfolio Website", "/"),
      courseProjectLink("Escaping The Red Cross", "/game"),
      courseProjectLink(
        "Intermediate Programming",
        "https://laureesh.gitbook.io/laureesh/intermediate-programming-projects/itec-2150-intermediate-programming",
        true,
      ),
    ],
    metrics: { confidence: 68, projectUse: 66, breadth: 64, momentum: 70 },
    growth: [14, 30, 50, 68],
    graphPriority: 1,
  },
];

export const skillsSectionNav = [
  { id: "skills-graph", label: "Stack Map" },
  { id: "skills-compare", label: "Compare" },
  { id: "skills-roadmap", label: "Roadmaps" },
  { id: "skills-catalog", label: "Catalog" },
];

export function getSkillById(id?: string) {
  return skillsCatalog.find((skill) => skill.id === id);
}

export function getAreaById(id?: SkillAreaId) {
  return skillAreas.find((area) => area.id === id);
}

export function getAreaSkills(areaId: SkillAreaId) {
  return skillsCatalog
    .filter((skill) => skill.areaId === areaId)
    .sort((a, b) => b.graphPriority - a.graphPriority || a.name.localeCompare(b.name));
}

export function getAreaCertifications(areaId: SkillAreaId) {
  return certifications.filter((certification) => certification.relatedAreas.includes(areaId));
}

export function getSkillCertifications(skillId: string) {
  return certifications.filter((certification) => certification.relatedSkillIds.includes(skillId));
}
