# Laureesh Volmar — Portfolio & Personal Workspace

A React and TypeScript website combining a personal portfolio, blog, browser tools, and a private workspace for studying, notes, and administration.

The project includes **Flashbolt**, a study library with quiz imports and several study modes, and **Notebook**, a rich-text notebook with local backups and Firebase synchronization. The frontend is built with Vite and deployed to GitHub Pages.

**Website:** [laureesh.github.io](https://laureesh.github.io)  
**Repository:** [Laureesh/laureesh.github.io](https://github.com/Laureesh/laureesh.github.io)

## Contents

- [Features](#features)
- [Technology](#technology)
- [Getting started](#getting-started)
- [Environment configuration](#environment-configuration)
- [Firebase and administrator access](#firebase-and-administrator-access)
- [Routes](#routes)
- [Flashbolt guide](#flashbolt-guide)
- [Notebook and backups](#notebook-and-backups)
- [Project structure](#project-structure)
- [Development commands](#development-commands)
- [Testing](#testing)
- [GitHub Pages deployment](#github-pages-deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

### Portfolio and public pages

- Home, about, skills, projects, contact, and résumé pages.
- Blog listing, archive, individual posts, and premium-content routes.
- Community and member portfolio pages with access checks.
- Shared navigation, page titles, styling, and responsive layouts.
- Static assets including icons, a web manifest, and an RSS file.

### Accounts and administration

- Firebase authentication with email/password and Google sign-in flows.
- Account switching, profile editing, preferences, and membership pages.
- Protected routes with role-based access to the administrator workspace.
- Content, page, user, task, job, and feature-toggle management interfaces.
- Private tools for routines, inventory, weight tracking, and leaderboard management.

The presence of a route does not mean it is publicly accessible or that its external services are configured. Membership purchasing, for example, requires billing configuration beyond GitHub Pages.

### Flashbolt

- Organize study sets into folders and semesters.
- Create and edit questions, answer choices, correct answers, and explanations.
- Study with flashcards, learn mode, tests, and a daily review view.
- Work with multiple-choice, select-all, true/false, written, and matching question types.
- Detect question types from instructions such as “Select two.”
- Filter study content by mastery and select which material to practice.
- Import structured text, copied quiz reviews, supported HTML, and study notes.
- Save and merge signed-in study libraries through Firestore.

### Notebook

- Write formatted notes and organize them using folders, tags, search, and archives.
- Use step layouts and note-editing controls.
- Keep attachments and note versions.
- Save local recovery data in IndexedDB.
- Synchronize notebook content with Firestore using chunked storage and merge handling.
- Download JSON backups and export individual notes.

### Other browser tools

The site also includes game pages, a movie browsing interface, MediaHub, a YouTube tag tool, a password generator, and a media converter. Media conversion uses FFmpeg-related browser packages; behavior and resource use depend on the selected operation and browser capabilities.

## Technology

Versions below describe the dependency ranges in [package.json](package.json). [package-lock.json](package-lock.json) records the installed dependency graph.

| Area | Technology |
| --- | --- |
| UI | React 19, React DOM 19 |
| Language | TypeScript 5.9 |
| Build and development | Vite 8, React Vite plugin |
| Routing | React Router 7 |
| Authentication and cloud data | Firebase 12: Authentication, Firestore, Storage |
| Icons | Lucide React |
| Media processing | FFmpeg WebAssembly packages |
| Styling | CSS files alongside pages and components |
| Static analysis | ESLint 9 and TypeScript |
| Regression tests | Node.js test runner; Playwright for browser tests |
| Deployment | GitHub Actions and GitHub Pages |

## Getting started

### Requirements

- Git and npm.
- A compatible Node.js installation. Node **24** is a practical choice for local development and for tests that import TypeScript directly.
- A modern browser.
- Your own Firebase project to use authentication, cloud storage, and protected features.

The checked-in deployment workflow uses Node 20 for building. Local Node-based tests and the deployment build are separate paths: the tests import `.ts` files directly, so use Node 24 for the test commands below.

### Install and start

```bash
git clone https://github.com/Laureesh/laureesh.github.io.git
cd laureesh.github.io
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

Public UI development can begin without Firebase configuration. Authentication and cloud-backed features require the environment settings below. The application deliberately skips Firebase initialization when any required Firebase variable is missing; this is not a complete offline replacement for the backend.

## Environment configuration

Create a `.env.local` file in the repository root:

```dotenv
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-web-app-id

# Registration widget
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key

# Optional administrator idle timeout
VITE_ADMIN_IDLE_TIMEOUT_MINUTES=15

# Optional membership and billing integration
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_STRIPE_PRICING_TABLE_ID=
VITE_STRIPE_API_BASE_URL=
VITE_STRIPE_PURCHASES_ENABLED=false
```

Copy Firebase values from the web app configuration for your project, including the exact Storage bucket name. Restart Vite after changing environment variables.

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase web client API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase authentication domain |
| `VITE_FIREBASE_PROJECT_ID` | Project used by the Firebase client |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket used for Firebase Storage |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase web configuration value |
| `VITE_FIREBASE_APP_ID` | Registered Firebase web app ID |
| `VITE_TURNSTILE_SITE_KEY` | Turnstile widget configuration used during registration |
| `VITE_ADMIN_IDLE_TIMEOUT_MINUTES` | Admin idle timeout; defaults to 15 when absent, invalid, or below 5 |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Public Stripe client configuration |
| `VITE_STRIPE_PRICING_TABLE_ID` | Pricing table used by the membership page |
| `VITE_STRIPE_API_BASE_URL` | Base URL of the external billing API |
| `VITE_STRIPE_PURCHASES_ENABLED` | Purchase flag; the code checks for the string `true` |

All `VITE_` variables are frontend build inputs and can appear in the delivered JavaScript. Use public client configuration here, never service-account credentials, Stripe secret keys, or a Turnstile secret. `.env` and `*.local` files are ignored by Git.

The repository contains the frontend billing integration, not a complete billing server. GitHub Pages does not execute backend endpoints.

## Firebase and administrator access

### Service setup

1. Register a web app in your Firebase project and populate the six Firebase variables.
2. Enable the Authentication providers you intend to use, including email/password and Google where applicable.
3. Configure authorized authentication domains for your development and deployed origins.
4. Create a Firestore database and review [src/firebase/firestore.rules](src/firebase/firestore.rules) before publishing those rules to your project.
5. Enable and configure Storage if you need features such as profile-photo uploads. Storage authorization is separate from Firestore rules.
6. Configure Turnstile for registration on the relevant hostnames.

The Pages workflow deploys static frontend files. It does **not** publish Firebase rules or provision Firebase services. There is no checked-in Firebase CLI deployment configuration; manage those services separately.

### Administrator bootstrap

Administrator access depends on the signed-in user profile and the bootstrap mechanism in [src/services/adminBootstrap.ts](src/services/adminBootstrap.ts).

For a Firebase Authentication user with UID `<uid>`, a trusted project administrator can create the Firestore document `admin_bootstrap/<uid>` containing:

```json
{
  "enabled": true,
  "role": "admin"
}
```

The application reads that record during role synchronization. The supplied Firestore rules deny browser writes to bootstrap documents, so provisioning must happen through a trusted administrative channel, such as the Firebase console. The account also needs an active user profile for administrative access.

Both `/flashbolt/*` and the longer private Flashbolt route currently require the `admin` role. The shorter URL does not bypass authorization.

### Data organization

| Data | Location / implementation |
| --- | --- |
| User profiles | `users/<uid>` |
| Flashbolt library | `flashboltLibrary` field on `users/<uid>` |
| Notebook manifest | `users/<uid>/notebook/library` |
| Notebook chunks | Sibling `library-chunk-<index>` documents |
| Administrator bootstrap | `admin_bootstrap/<uid>` |
| CMS and administration | Collections declared in `src/services/collections.ts` |
| Notebook local recovery | IndexedDB database `flashbolt-notebook` |

Flashbolt uses transactional merge-and-save logic. Notebook stores a manifest and chunks, reads them in a transaction, and merges local and remote records. These mechanisms help preserve edits, but downloaded backups remain useful when changing storage or recovering data.

## Routes

The route definitions and access wrappers live in [src/App.tsx](src/App.tsx).

| Route | Purpose |
| --- | --- |
| `/` | Portfolio home |
| `/about`, `/skills`, `/projects`, `/contact`, `/resume` | Portfolio sections |
| `/blog`, `/blog/archive`, `/blog/:slug` | Blog and articles |
| `/blog/premium`, `/blog/premium/:slug` | Premium blog routes |
| `/community`, `/user/:id` | Community and member portfolios |
| `/login`, `/register`, `/switch-account` | Authentication |
| `/profile`, `/account-settings`, `/settings`, `/memberships` | Account pages |
| `/game`, `/solo-game` | Game interfaces |
| `/movie-app`, `/mediahub` | Media interfaces |
| `/yt-tags`, `/password-gen`, `/media-converter` | Browser utilities |
| `/admin-dashboard` | Administrator dashboard |
| `/admin-dashboard/content`, `/admin-dashboard/pages` | Content and page management |
| `/admin-dashboard/users`, `/admin-dashboard/tasks` | User and task management |
| `/admin-dashboard/jobs`, `/admin-dashboard/good-jobs` | Job-related tools |
| `/admin-dashboard/feature-toggles` | Feature management |
| `/admin-dashboard/private-pages` | Private tool directory |
| `/admin-dashboard/private-pages/flashbolt/*` | Flashbolt workspace |
| `/flashbolt/*` | Alternate Flashbolt entry route |
| `/admin-dashboard/private-pages/notebook/*` | Notebook workspace |
| `/admin-dashboard/private-pages/fn-leaderboard` | Leaderboard manager |

## Flashbolt guide

### Creating a study set

1. Sign in with an authorized administrator account and open Flashbolt.
2. Create a set and enter its details.
3. Add cards manually or use the paste/import controls.
4. Review the prompt, question type, choices, marked answers, and explanation for each card.
5. Save the set and choose a study mode.

Question-type detection recognizes several explicit instructions. Review the result after importing: source formatting varies, and copied text may omit information that exists in the source HTML.

### Supported paste formats

Examples are defined in [manualImportExamples.ts](src/pages/admin/flashbolt/manualImportExamples.ts); parsing is implemented in [note-parser.ts](src/pages/admin/flashbolt/note-parser.ts).

| Format | Expected input |
| --- | --- |
| Term and definition | One `term :: definition` pair per line |
| Spreadsheet | Two tab-separated columns |
| Multiline pair | `::` before the answer, blank lines between cards |
| Multiple-choice question | Prompt, lettered choices, and an `Answer:` key |
| Embedded choices | Choices inside the term before `::` |
| True/false | Statement and True/False choices with a supplied answer |
| Module quiz | Question blocks, lettered answers, correctness markers, explanations |
| LMS results | Selected/Unselected and correctness labels |
| Kahoot question list | Full copied list with its question count and correct labels |
| Quizlet HTML | Supported term-list markup containing both card sides |
| Exam question-card HTML | `.question-card` blocks with prompts, options, and answers |
| Answer-shown text | Numbered question blocks with `Correct answer:` lines |
| Plain notes | Statements from which the parser creates review cards |

#### Simple pairs

```text
Elasticity :: Adjusting resources as demand changes.
High availability :: Keeping a service available despite component failures.
```

#### Multiple choice

```text
Which tool captures packets?
A. Wireshark
B. A text editor
C. A calculator
Answer: A
```

#### Copied question-card HTML

Paste the HTML into the import field, including the `questionList` container when available:

```html
<div id="questionList">
  <div class="question-card">
    <div class="q-header">
      <span class="q-num">Question 21</span>
      <span class="q-section">AWS Cloud concepts</span>
    </div>
    <div class="q-body">
      <div class="q-text">Which concept adjusts resources to demand?</div>
      <div class="options">
        <div class="option">
          <div class="option-dot">A</div>
          <span>Elasticity</span>
        </div>
        <div class="option">
          <div class="option-dot">B</div>
          <span>Fixed capacity</span>
        </div>
      </div>
      <div class="q-answer">
        ✅ <strong>Correct answer:</strong> Elasticity<br>
        Answer is Elasticity<br>
        Resources can grow and shrink with demand.
      </div>
    </div>
  </div>
</div>
```

The importer reads `.q-text`, `.options .option`, and `.q-answer`. It excludes question-number and category headers, option letters, page buttons, and advertising content. It preserves explanation text and references.

Revealed answers can be identified by the `correct` class on choices. For unrevealed cards, the importer can resolve the hidden `Correct answer:` text against the available choices. You do not need to click **Show Answer** first when the copied HTML already contains that key. Multiple correct answers become select-all cards.

This is support for a particular HTML structure, not arbitrary quiz websites. If a source omits its answer key entirely, the importer cannot recover it. Plain copied text may also omit incorrect choices; use HTML when you need the full choice list.

## Notebook and backups

Notebook combines browser-local recovery with signed-in cloud synchronization:

- Local snapshots are written to IndexedDB, with serialized saves to avoid older writes finishing after newer ones.
- Legacy local-storage recovery data is removed only after its replacement has been saved successfully.
- Firestore synchronization uses a manifest and chunk documents for larger notebooks.
- Merge handling includes deletion records and preservation of conflicting note versions.

### Export and restore

Use **Download notebook backup** in Settings or **Download full backup** in a note footer to save notes, folders, attachments, and versions as JSON.

Individual notes also provide export options, including HTML, plain-text Markdown, and print/PDF workflows. Browser preferences are stored separately from notebook backups.

**Restore backup replaces the local notebook after confirmation.** Subsequent signed-in synchronization may merge existing cloud content. Export a current backup before restoring if you need to preserve both states. Clearing browser storage removes local recovery data and preferences; it is not a backup strategy.

See [NotebookHelp.tsx](src/pages/admin/notebook/NotebookHelp.tsx) for the in-app usage guide.

## Project structure

```text
.
├── .github/workflows/deploy.yml   # GitHub Pages build and deployment
├── public/                       # Static files copied into the build
├── src/
│   ├── assets/                   # Images, fonts, and imported assets
│   ├── components/               # Shared UI and authentication components
│   ├── config/                   # Application configuration
│   ├── contexts/                 # React context providers
│   ├── data/                     # Bundled application data
│   ├── firebase/                 # Firebase clients, helpers, Firestore rules
│   ├── hooks/                    # Shared hooks
│   ├── pages/
│   │   ├── account/              # Profile, preferences, membership
│   │   ├── admin/
│   │   │   ├── flashbolt/        # Study UI, parsing, review and learn logic
│   │   │   └── notebook/         # Note editor, controls, help, preferences
│   │   └── ...                   # Portfolio, authentication, tools, games
│   ├── services/                 # Persistence and application data operations
│   ├── types/                    # Shared TypeScript models
│   ├── utils/                    # Shared utilities
│   ├── App.tsx                   # Routes and application shell
│   └── main.tsx                  # React entry point
├── study-materials/              # Sample study content
├── tests/                        # Node and browser regression tests
│   └── fixtures/                 # Import regression inputs
├── index.html                    # Vite HTML entry
├── package.json                  # Dependencies and npm scripts
├── package-lock.json             # Locked dependency graph
├── tsconfig*.json                # TypeScript configuration
└── vite.config.ts                # Vite configuration
```

`dist/` and `node_modules/` are generated and ignored by Git. Make source changes in `src/` or `public/`, rather than editing generated files in `dist/`.

## Development commands

| Command | Action |
| --- | --- |
| `npm ci` | Install dependencies from the lockfile |
| `npm run dev` | Start Vite development server |
| `npm start` | Alias for the Vite development server |
| `npm run build` | Run TypeScript build checks, produce `dist/`, copy the HTML entry to `404.html` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint across the repository |

```bash
npm run build
npm run preview
```

The build script uses `cp`, so it expects a compatible shell. On Windows, use an environment such as WSL or Git Bash, or adapt the copy step for your shell.

## Testing

There is no `npm test` script. Tests are run directly with Node.

### Node regression tests

Use Node 24, then run:

```bash
node --test tests/*.test.mjs
```

A focused import regression run:

```bash
node --test \
  tests/flashbolt-answer-shown.test.mjs \
  tests/flashbolt-manual-import.test.mjs \
  tests/flashbolt-module-quiz.test.mjs \
  tests/flashbolt-kahoot-paste.test.mjs
```

The suite also covers study selection, mastery filtering, review logic, notebook storage, backups, sorting, clipboard handling, and other behavior. Some tests inspect source code, so a failure can reflect an assumption in the test as well as a runtime defect.

### Browser regression tests

Browser tests use Playwright, which is not currently a declared project dependency. To install it locally without modifying the package manifest or lockfile:

```bash
npm install --no-save --package-lock=false playwright
npx playwright install chromium
```

The HTML importer browser tests run without a development server:

```bash
node --test tests/flashbolt-question-cards.browser.mjs
```

For the broader browser suite, start Vite in another terminal and open its local URL once so dependency optimization can finish:

```bash
npm run dev -- --host 127.0.0.1
```

Then run:

```bash
node --test tests/*.browser.mjs
```

Most UI browser tests expect `http://127.0.0.1:5173`. Tests that expose these settings support `TEST_ORIGIN` for a different server address and `PLAYWRIGHT_MODULE` for an externally installed Playwright package. Inspect the individual test if its setup differs.

A later `npm ci` restores the lockfile-defined dependencies and may remove the temporary Playwright installation.

## GitHub Pages deployment

Deployment is configured in [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

### Current workflow

1. A push to `main`, or a manual workflow dispatch, starts the workflow.
2. GitHub checks out the repository and configures Pages.
3. Node 20 is installed and npm caching is enabled.
4. `npm ci` installs dependencies.
5. `npm run build` creates `dist/`.
6. The workflow uploads `dist/` as a Pages artifact.
7. A separate deployment job publishes that artifact to the `github-pages` environment.

The workflow currently runs the build, **not** the lint or regression suites. Run the relevant checks before merging changes.

### Repository configuration

Set the repository's Pages source to **GitHub Actions**. Configure these repository Actions variables, which the workflow passes to the build:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_TURNSTILE_SITE_KEY
```

Optional Stripe and administrator-timeout variables are not currently forwarded by the workflow. Add explicit build-environment mappings in `deploy.yml` if you need those settings in production. Creating a repository variable alone does not inject it into Vite.

Environment changes require a new build and deployment because this is a static site.

### Routing and hosting paths

Vite currently uses `base: "/"`, matching the root-hosted `laureesh.github.io` site. Hosting a fork under a repository subpath requires reviewing the Vite base, router configuration, and absolute asset paths together.

The build copies `dist/index.html` to `dist/404.html`, allowing the application to render its routes when GitHub Pages serves the fallback for a direct nested URL. The initial HTTP response may still have a 404 status; this is not a server-side rewrite.

The repository also contains `public/404.html`; the final build step overwrites the built copy with the generated application entry. Check the final `dist/404.html` when diagnosing deep-link behavior.

## Troubleshooting

| Symptom | Checks |
| --- | --- |
| Authentication or cloud features are unavailable | Verify all six Firebase variables; restart Vite or rebuild the deployment. |
| Google sign-in rejects the domain | Check the authorized domains in the Firebase project used by this build. |
| Registration reports missing Turnstile configuration | Set `VITE_TURNSTILE_SITE_KEY` for the current environment and rebuild. |
| Administrator pages redirect to the profile page | Check the signed-in UID, bootstrap record, synchronized role, and account status. |
| Firestore returns permission denied | Compare the deployed rules, user identity, role, and document shape with the checked-in rules. |
| Profile-photo upload fails | Check the Storage bucket, service configuration, and Storage rules. |
| An exam HTML import produces no questions | Include complete `.question-card` blocks, choices, and either correct-choice classes or hidden answer keys. |
| Imported text lacks answer choices | Copy the source HTML; visible text may not include the option elements. |
| Notebook content appears missing | Check folders, search, tags, and Archive before restoring a backup. |
| Notebook synchronization fails | Keep the page open, download a backup, and retry after checking connectivity and permissions. |
| Browser tests cannot resolve Playwright | Install it locally or set `PLAYWRIGHT_MODULE` to its installed module path. |
| Tests cannot import TypeScript | Use Node 24 for the direct Node test commands. |
| A direct URL fails after deployment | Inspect the Pages artifact, `404.html`, base path, and router setup. |
| Build reports large chunks | Inspect the generated assets; Firebase and media-processing dependencies contribute to bundle size. |
| A billing action is unavailable | Check the purchase flag, pricing configuration, feature settings, and external billing API. |

## Contributing

1. Create a branch for a focused change.
2. Install dependencies with `npm ci`.
3. Keep changes in source files and avoid committing environment files or generated output.
4. For parser changes, add representative inputs and assertions for prompts, answers, choices, and explanations.
5. For storage changes, cover recovery, merging, and deletion behavior where relevant.
6. Run the relevant Node/browser tests, `npm run lint`, and `npm run build`.
7. Describe the behavior change and validation in the pull request.

When adding test fixtures from copied pages, remove unrelated advertising markup, tracking parameters, and account-specific data. Keep enough structure to reproduce the behavior being tested.

## License

No license file is currently included in this repository. Do not assume an open-source license applies; contact the repository owner about reuse or redistribution.

### Flashbolt cloud storage migration

Deploy `src/firebase/firestore.rules` before publishing the chunked Flashbolt client.
The rules permit owner-only access to `users/{uid}/flashbolt/{documentId}` and
accept the new manifest in `users/{uid}.flashboltLibrary`. The client migrates
legacy data atomically on the next successful save, preserving other profile fields.
Close older Flashbolt tabs before using the updated client.

Flashbolt's device backup is browser local storage under `flashbolt.local.v1`
(legacy key: `studydeck.local.v1`). Use **Back up library** to download a JSON
file; a **Download backup** button also appears beside cloud errors. Browser
storage belongs to that site/browser profile and is removed when site data is cleared.
