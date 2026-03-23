export const GUIDED_TOUR_STORAGE_KEY = "portfolio-guided-tour-complete";

export type GuidedTourStep = {
  id: string;
  title: string;
  description: string;
  selectors: string[];
};

export const HOME_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: "hero",
    title: "Start with the overview",
    description: "This hero section is the quickest read on who I am, what I build, and where to go next.",
    selectors: ["[data-tour='hero-intro']"],
  },
  {
    id: "projects",
    title: "Jump straight to the work",
    description: "Open Projects when you want the strongest signal fast: shipped work, experiments, and portfolio details.",
    selectors: ["[data-tour='projects-cta']"],
  },
  {
    id: "navigation",
    title: "Use the top navigation",
    description: "The navbar and menu button give you the shortest path to About, Skills, Blog, Resume, and Contact.",
    selectors: ["[data-tour='primary-nav']", "[data-tour='nav-menu-toggle']"],
  },
  {
    id: "recent-pages",
    title: "Reopen recent pages fast",
    description: "This recent-visited button keeps your latest pages one click away, so you can jump back without retracing the whole nav.",
    selectors: ["[data-tour='recent-pages-trigger']"],
  },
  {
    id: "command",
    title: "Search the site quickly",
    description: "The command button opens a palette for page navigation and quick actions. You can also press Ctrl+K.",
    selectors: ["[data-tour='command-trigger']"],
  },
  {
    id: "shortcuts",
    title: "Keep the shortcuts nearby",
    description: "This help button shows the keyboard shortcuts overlay if you prefer navigating without hunting through menus.",
    selectors: ["[data-tour='shortcuts-trigger']"],
  },
  {
    id: "theme",
    title: "Adjust the theme anytime",
    description: "Open the theme customizer to switch light and dark modes, accents, fonts, and more. The site remembers your choices.",
    selectors: ["[data-tour='theme-toggle']"],
  },
];

export function getVisibleTourTarget(selectors: string[]) {
  for (const selector of selectors) {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));

    for (const candidate of candidates) {
      const rect = candidate.getBoundingClientRect();
      const styles = window.getComputedStyle(candidate);

      if (
        rect.width > 0 &&
        rect.height > 0 &&
        styles.display !== "none" &&
        styles.visibility !== "hidden"
      ) {
        return candidate;
      }
    }
  }

  return null;
}

export function getAvailableTourSteps(steps: GuidedTourStep[]) {
  return steps.filter((step) => getVisibleTourTarget(step.selectors));
}
