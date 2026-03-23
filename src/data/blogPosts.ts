export interface BlogCodeBlock {
  label: string;
  language: string;
  snippet: string;
}

export interface BlogSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  codeBlocks?: BlogCodeBlock[];
}

export interface BlogSeries {
  slug: string;
  title: string;
  description: string;
}

export interface BlogReactionSeeds {
  heart: number;
  insightful: number;
  useful: number;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  tags: string[];
  popularity: number;
  reactionSeeds: BlogReactionSeeds;
  externalUrl?: string;
  intro?: string[];
  sections?: BlogSection[];
  closing?: string;
  series?: {
    slug: string;
    order: number;
  };
}

export interface BlogArchiveMonthGroup {
  key: string;
  label: string;
  posts: BlogPost[];
}

export interface BlogArchiveYearGroup {
  year: string;
  months: BlogArchiveMonthGroup[];
}

export interface BlogSeriesGroup {
  series: BlogSeries;
  posts: BlogPost[];
}

export const BLOG_BASE_URL = "https://laureesh.github.io";
export const BLOG_RSS_PATH = "/rss.xml";

export const blogSeries: BlogSeries[] = [
  {
    slug: "portfolio-build-notes",
    title: "Portfolio Build Notes",
    description:
      "Short write-ups around front-end decisions, tooling, and backend choices behind the portfolio.",
  },
  {
    slug: "developer-journey",
    title: "Developer Journey",
    description:
      "Posts about the transition into software development, learning patterns, and career growth.",
  },
  {
    slug: "coursework-journal",
    title: "Coursework Journal",
    description:
      "Collected project notes and class builds from core programming courses.",
  },
];

export const blogPosts: BlogPost[] = [
  {
    slug: "getting-started-react-typescript",
    title: "Getting Started with React & TypeScript",
    excerpt:
      "A beginner-friendly guide to setting up a React project with TypeScript, Vite, and modern tooling for a professional development workflow.",
    date: "2025-11-20",
    readTime: "4 min read",
    tags: ["React", "TypeScript", "Tutorial"],
    popularity: 94,
    reactionSeeds: { heart: 16, insightful: 9, useful: 22 },
    series: { slug: "portfolio-build-notes", order: 1 },
    intro: [
      "React and TypeScript are a strong starting point when you want to build front-end projects that feel modern without disappearing into framework setup. Vite gives you a fast development loop, TypeScript catches mistakes early, and linting helps keep small problems from piling up.",
      "The key for beginners is not to install every popular tool on day one. Start with a clean base, add only the guardrails that make you faster, and keep the structure simple enough that you still understand the app after a week away from it.",
    ],
    sections: [
      {
        heading: "Start with Vite instead of a heavy starter",
        paragraphs: [
          "Vite is the setup I would recommend for a student or beginner portfolio project because it stays out of your way. You get a React plus TypeScript template, a fast dev server, and a build pipeline that feels professional without forcing you through a large config layer.",
          "That matters early on. When your main job is learning components, props, state, and routing, your tooling should support the work instead of becoming a separate course.",
        ],
        codeBlocks: [
          {
            label: "Create a React plus TypeScript app with Vite",
            language: "bash",
            snippet: `npm create vite@latest my-portfolio -- --template react-ts
cd my-portfolio
npm install
npm run dev`,
          },
        ],
      },
      {
        heading: "Add the guardrails you will actually use",
        paragraphs: [
          "TypeScript is most helpful when you let it be strict enough to catch real mistakes, especially around props, form data, and API responses. I also add ESLint early, because consistency matters more when your codebase starts growing into multiple pages and components.",
          "You do not need a giant tooling stack to look professional. A small setup with TypeScript, linting, and clear folder boundaries already gets you most of the practical benefit.",
        ],
        bullets: [
          "Use strict TypeScript settings so invalid props and missing fields fail fast.",
          "Keep ESLint in the project from the beginning instead of cleaning everything up later.",
          "Add formatting rules only if they help your workflow instead of fighting it.",
        ],
      },
      {
        heading: "Keep the first folder structure boring",
        paragraphs: [
          "Early projects become easier to maintain when the file structure mirrors how you think about the app. I would rather have a small, obvious layout than a deeply abstracted setup copied from a much larger codebase.",
        ],
        codeBlocks: [
          {
            label: "A simple project structure that scales well",
            language: "text",
            snippet: `src/
  components/
  pages/
  assets/
  styles/
  App.tsx
  main.tsx`,
          },
        ],
      },
      {
        heading: "What to build next",
        paragraphs: [
          "Once the app is running, the next useful step is not another plugin. Build a real page, wire up navigation, and create a small reusable component library as the design starts repeating. That is where React and TypeScript begin to pay off.",
        ],
        bullets: [
          "Add page routing before introducing complex state management.",
          "Create reusable UI pieces only after you see repetition in the interface.",
          "Type your shared component props carefully so the code stays easy to trust.",
        ],
      },
    ],
    closing:
      "A professional workflow usually comes from a few solid defaults, not from maximum setup. If the project is easy to start, easy to read, and easy to extend, the tooling is doing its job.",
  },
  {
    slug: "why-i-chose-firebase-for-my-portfolio",
    title: "Why I Chose Firebase for My Portfolio",
    excerpt:
      "Exploring the pros and cons of Firebase vs MongoDB for a personal portfolio project, and how Firebase's free tier makes it perfect for students.",
    date: "2025-10-08",
    readTime: "6 min read",
    tags: ["Firebase", "Backend", "Cloud"],
    popularity: 88,
    reactionSeeds: { heart: 14, insightful: 13, useful: 19 },
    series: { slug: "portfolio-build-notes", order: 2 },
    intro: [
      "For a student portfolio, the backend decision is less about theoretical flexibility and more about getting useful features online quickly. I wanted something that could support contact flows, lightweight data storage, and future interactive features without turning my portfolio into infrastructure homework.",
      "That is why Firebase made more sense to me than MongoDB for this project. MongoDB is powerful and widely used, but Firebase lined up better with the speed, budget, and simplicity I needed.",
    ],
    sections: [
      {
        heading: "What I needed from the backend",
        paragraphs: [
          "My portfolio did not need a complicated relational model or a custom analytics pipeline. It needed a backend I could learn, ship, and maintain while balancing coursework and other projects.",
        ],
        bullets: [
          "Low setup time so the focus stayed on building features.",
          "A free tier that made sense for a student budget.",
          "Cloud-hosted services I could connect without managing my own server.",
          "Room to grow later if I decide to add forms, dashboards, or auth.",
        ],
      },
      {
        heading: "Why Firebase fit better than MongoDB for this use case",
        paragraphs: [
          "Firebase is opinionated, but that is part of the appeal for a portfolio. It gives you an ecosystem instead of just a database. Firestore, hosting, auth, and serverless functions all sit close together, which reduces the amount of glue code and platform setup you need early on.",
          "MongoDB gives you more control over your own model and querying style, especially if you are already comfortable building an API layer around it. For a personal site, though, that extra control can turn into extra overhead before the project has earned it.",
        ],
      },
      {
        heading: "The free tier matters more than people admit",
        paragraphs: [
          "Students often make technical choices under time and budget pressure. Firebase's free plan makes experimentation easier because I can test ideas without worrying that a learning project will immediately create recurring cost.",
          "That matters when the portfolio is not just a finished product, but also a sandbox for trying new features and proving that I can ship them.",
        ],
      },
      {
        heading: "The tradeoffs I accepted",
        paragraphs: [
          "Choosing Firebase does not mean it is perfect. I am trading some flexibility for speed. Firestore data modeling works best when you design around how the app reads data, and there is more platform coupling than there would be with a custom API over MongoDB.",
          "I accepted that trade because the current goal is to build momentum, not to optimize for the biggest possible future architecture.",
        ],
        bullets: [
          "Vendor lock-in is a real consideration.",
          "Local development can feel different from a traditional database stack.",
          "Complex querying patterns may be easier to express elsewhere.",
        ],
      },
      {
        heading: "How I would use Firebase in a student portfolio",
        paragraphs: [
          "The best fit is lightweight but real functionality. I can use it for contact submissions, admin-only content updates, project metadata, or small interactive tools that need persistence. That is enough to make the site feel alive without overengineering the backend.",
        ],
      },
    ],
    closing:
      "For this portfolio, Firebase wins because it lets me move from idea to implementation quickly. If the project grows into something with heavier backend needs later, that would be the right time to reevaluate the stack.",
  },
  {
    slug: "my-journey-into-software-development",
    title: "My Journey into Software Development",
    excerpt:
      "From healthcare to tech - how I transitioned into software development and what I've learned along the way as a student at Georgia Gwinnett College.",
    date: "2025-09-18",
    readTime: "5 min read",
    tags: ["Career", "Personal"],
    popularity: 91,
    reactionSeeds: { heart: 24, insightful: 18, useful: 11 },
    series: { slug: "developer-journey", order: 1 },
    intro: [
      "I did not start in software. My background in healthcare shaped how I think about responsibility, communication, and staying calm when the work is high stakes. Those habits carried over more than I expected when I began moving toward technology.",
      "The transition into software development has been less about one dramatic pivot and more about building confidence through repeated problem-solving. Each class, project, and bug fix has made the path feel more real.",
    ],
    sections: [
      {
        heading: "What healthcare taught me before I wrote serious code",
        paragraphs: [
          "Healthcare taught me discipline and attention to detail. It also taught me how important it is to be reliable when other people are depending on your work. Those lessons translate well to software, especially when you are writing code that other people need to understand and trust.",
        ],
      },
      {
        heading: "Why software pulled me in",
        paragraphs: [
          "What kept me interested in software was the mix of creativity and structure. You can take an idea, break it into pieces, and build something that did not exist before. I liked that progress was visible. Every project gave me a concrete way to measure what I had learned.",
          "That feedback loop was addictive in a good way. The more I built, the clearer it became that this was not just curiosity. It was the direction I wanted to keep pursuing.",
        ],
      },
      {
        heading: "Learning at Georgia Gwinnett College",
        paragraphs: [
          "My time at Georgia Gwinnett College has helped turn that interest into a real foundation. Coursework gave me structure around programming concepts, databases, software engineering habits, and project execution. Personal projects gave me the space to test those skills outside the classroom.",
          "That mix matters. Classes help me understand the fundamentals. Independent work helps me see what I can actually build when there is no step-by-step prompt in front of me.",
        ],
      },
      {
        heading: "What changed in how I work",
        paragraphs: [
          "One of the biggest shifts has been learning how to stay patient with complex problems. Early on, a bug could feel like evidence that I was not ready. Now I see debugging as part of the work, not a detour from it.",
        ],
        bullets: [
          "Break large problems into checkpoints I can verify one by one.",
          "Write code I can explain instead of code that only barely works.",
          "Use feedback from mistakes to sharpen the next version faster.",
        ],
      },
      {
        heading: "What I would tell other career changers",
        paragraphs: [
          "You do not need a perfect origin story to move into software. What matters is whether you can keep learning, keep building, and keep closing the gap between what you know today and what you want to do professionally.",
          "For me, the transition has been about stacking proof: finished projects, stronger fundamentals, and a portfolio that shows the direction I am heading.",
        ],
      },
    ],
    closing:
      "Switching paths has taught me that momentum matters more than image. The goal is not to look like I have always belonged in software. The goal is to keep earning the next level of responsibility through the work.",
  },
  {
    slug: "itec-3150-advanced-programming",
    title: "ITEC 3150 - Advanced Programming",
    excerpt:
      "Advanced Java projects covering design patterns, multithreading, and database integration. A deep dive into enterprise-level programming concepts.",
    date: "2025-08-15",
    readTime: "10 min read",
    tags: ["Java", "Design Patterns", "MySQL"],
    popularity: 76,
    reactionSeeds: { heart: 8, insightful: 10, useful: 14 },
    series: { slug: "coursework-journal", order: 2 },
    externalUrl:
      "https://laureesh.gitbook.io/laureesh/advanced-programming-projects/itec-3150-advanced-programming",
  },
  {
    slug: "itec-2150-intermediate-programming",
    title: "ITEC 2150 - Intermediate Programming",
    excerpt:
      "A collection of Java projects demonstrating object-oriented programming, data structures, and software engineering principles built during my coursework.",
    date: "2025-05-01",
    readTime: "8 min read",
    tags: ["Java", "OOP", "Data Structures"],
    popularity: 72,
    reactionSeeds: { heart: 7, insightful: 9, useful: 13 },
    series: { slug: "coursework-journal", order: 1 },
    externalUrl:
      "https://laureesh.gitbook.io/laureesh/intermediate-programming-projects/itec-2150-intermediate-programming",
  },
];

export function sortBlogPostsByDate(posts: BlogPost[]) {
  return [...posts].sort((a, b) => Number(new Date(`${b.date}T12:00:00`)) - Number(new Date(`${a.date}T12:00:00`)));
}

export function getBlogPostBySlug(slug?: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export function isLocalBlogPost(post: BlogPost): post is BlogPost & {
  intro: string[];
  sections: BlogSection[];
} {
  return Boolean(post.sections && post.intro && !post.externalUrl);
}

export function getLocalBlogPosts() {
  return sortBlogPostsByDate(blogPosts.filter(isLocalBlogPost));
}

export function getBlogPostPath(slug: string) {
  return `/blog/${slug}`;
}

export function getBlogPostUrl(post: BlogPost) {
  if (post.externalUrl) {
    return post.externalUrl;
  }

  return `${BLOG_BASE_URL}${getBlogPostPath(post.slug)}`;
}

export function getSeriesBySlug(slug?: string) {
  return blogSeries.find((series) => series.slug === slug);
}

export function getSeriesPosts(slug?: string) {
  if (!slug) {
    return [];
  }

  return sortBlogPostsByDate(blogPosts.filter((post) => post.series?.slug === slug)).sort((a, b) => {
    const orderA = a.series?.order ?? 0;
    const orderB = b.series?.order ?? 0;
    return orderA - orderB;
  });
}

export function getSeriesGroups() {
  return blogSeries
    .map((series) => ({
      series,
      posts: getSeriesPosts(series.slug),
    }))
    .filter((group): group is BlogSeriesGroup => group.posts.length > 0);
}

export function getPopularBlogPosts(limit = 3) {
  return [...blogPosts].sort((a, b) => b.popularity - a.popularity).slice(0, limit);
}

export function getRelatedBlogPosts(post: BlogPost, limit = 3) {
  return blogPosts
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => {
      const sharedTags = candidate.tags.filter((tag) => post.tags.includes(tag)).length;
      const sameSeries =
        post.series && candidate.series && post.series.slug === candidate.series.slug ? 3 : 0;
      const localityBoost = candidate.externalUrl ? 0 : 1;

      return {
        candidate,
        score: sharedTags * 2 + sameSeries + localityBoost,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return b.candidate.popularity - a.candidate.popularity;
    })
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

export function getArchiveGroups(posts = blogPosts) {
  const grouped = new Map<string, Map<string, BlogPost[]>>();

  for (const post of sortBlogPostsByDate(posts)) {
    const date = new Date(`${post.date}T12:00:00`);
    const year = String(date.getFullYear());
    const monthKey = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(date);

    if (!grouped.has(year)) {
      grouped.set(year, new Map<string, BlogPost[]>());
    }

    const yearGroup = grouped.get(year);

    if (!yearGroup) {
      continue;
    }

    if (!yearGroup.has(`${monthKey}|${monthLabel}`)) {
      yearGroup.set(`${monthKey}|${monthLabel}`, []);
    }

    yearGroup.get(`${monthKey}|${monthLabel}`)?.push(post);
  }

  return [...grouped.entries()]
    .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
    .map(([year, months]): BlogArchiveYearGroup => ({
      year,
      months: [...months.entries()].map(([compositeKey, monthPosts]) => {
        const [key, label] = compositeKey.split("|");

        return {
          key,
          label,
          posts: monthPosts,
        };
      }),
    }));
}

export function formatBlogDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}
