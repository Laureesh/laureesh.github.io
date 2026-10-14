# Laureesh Volmar — Portfolio

A React and TypeScript portfolio website featuring projects, articles, account pages, and browser tools. Built with Vite and deployed to GitHub Pages.

This public repository contains the public website. Private workspace applications, personal exports, and operational setup instructions are maintained separately and are not included in the public build.

**Website:** [laureesh.github.io](https://laureesh.github.io)  
**Repository:** [Laureesh/laureesh.github.io](https://github.com/Laureesh/laureesh.github.io)

## Contents

- [Features](#features)
- [Technology](#technology)
- [Getting started](#getting-started)
- [Environment configuration](#environment-configuration)
- [Firebase configuration](#firebase-configuration)
- [Routes](#routes)
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
- Blog listing, archive, individual posts, and premium article previews. Full premium bodies are not shipped in the public bundle.
- Community and member portfolio pages with access checks.
- Shared navigation, page titles, styling, and responsive layouts.
- Static assets including icons, a web manifest, and an RSS file.

### Accounts

- Firebase authentication with email/password and Google sign-in flows.
- Account switching, profile editing, preferences, and membership pages.
- Protected account routes and database authorization rules.

Membership purchasing requires billing services beyond GitHub Pages. A frontend setting does not provide server-side authorization.

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

The checked-in deployment workflow uses Node 24 for building. Local Node-based tests and the deployment build are separate paths: some development tests import `.ts` files directly, so use Node 24 for the test commands below.

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
| `VITE_STRIPE_PUBLISHABLE_KEY` | Public Stripe client configuration |
| `VITE_STRIPE_PRICING_TABLE_ID` | Pricing table used by the membership page |
| `VITE_STRIPE_API_BASE_URL` | Base URL of the external billing API |
| `VITE_STRIPE_PURCHASES_ENABLED` | Purchase flag; the code checks for the string `true` |

All `VITE_` variables are frontend build inputs and can appear in the delivered JavaScript. Use public client configuration here, never service-account credentials, Stripe secret keys, or a Turnstile secret. `.env` and `*.local` files are ignored by Git.

The repository contains the frontend billing integration, not a complete billing server. GitHub Pages does not execute backend endpoints.

## Firebase configuration

### Service setup

1. Register a web app in your Firebase project and populate the six Firebase variables.
2. Enable the Authentication providers you intend to use, including email/password and Google where applicable.
3. Configure authorized authentication domains for your development and deployed origins.
4. Create a Firestore database and review [src/firebase/firestore.rules](src/firebase/firestore.rules) before publishing those rules to your project.
5. Enable and configure Storage if you need features such as profile-photo uploads. Storage authorization is separate from Firestore rules.
6. Configure Turnstile for registration on the relevant hostnames.

The Pages workflow deploys static frontend files. It does **not** publish Firebase rules or provision Firebase services. The checked-in `firebase.emulator.json` is for local rule testing; production publishing is a separate operation. Storage rules for profile-photo uploads are provided in [src/firebase/storage.rules](src/firebase/storage.rules).

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
│   │   └── ...                   # Portfolio, authentication, tools, games
│   ├── services/                 # Persistence and application data operations
│   ├── types/                    # Shared TypeScript models
│   ├── utils/                    # Shared utilities
│   ├── App.tsx                   # Routes and application shell
│   └── main.tsx                  # React entry point
├── tests/                        # Node and browser regression tests
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

## Testing and security checks

Use Node 24 for the repository tests:

```bash
node --test tests/*.test.mjs
npm run lint
npm run build
npm audit
```

The public repository includes regression checks for its release boundary. Private-workspace tests are kept with that workspace. Database rules also have emulator tests. Install their tooling separately and use the demo project, never a production project:

```bash
npm install --prefix /tmp/portfolio-security-tools firebase-tools @firebase/rules-unit-testing firebase
SECURITY_TOOLS_PACKAGE=/tmp/portfolio-security-tools/package.json \
  /tmp/portfolio-security-tools/node_modules/.bin/firebase emulators:exec \
  --project demo-portfolio-security --config firebase.emulator.json \
  --only firestore,storage 'node --test tests/*.emulator.mjs'
```

These commands use a POSIX shell and require a compatible Java runtime for the emulators. The tests use synthetic identities and local services.

`npm audit` checks known dependency advisories. Passing the audit does not prove that an application or its deployed services are secure. The build checks TypeScript and generates the static site; it does not deploy Firebase rules.

### Deployment security responsibilities

- Publish the reviewed Firestore and Storage rules to the correct Firebase project separately from Pages.
- Keep service-account keys, server secrets, user exports, and local configuration out of Git.
- Treat browser route checks as interface behavior. Enforce authorization in database rules and backend services.
- Validate billing operations and any anti-abuse challenges on a trusted server. A browser widget alone does not prevent direct API requests.
- Keep authentication providers, authorized domains, and quotas configured for the deployed application.
- Review production settings after changing environments or creating a fork.

Private applications must not be added to `public/` or imported into the public entry point. Static JavaScript served to a browser can be downloaded even when the interface requires sign-in.

## GitHub Pages deployment

Deployment is configured in [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

### Current workflow

1. A push to `main`, or a manual workflow dispatch, starts the workflow.
2. GitHub checks out the repository and configures Pages.
3. Node 24 is installed and npm caching is enabled.
4. `npm ci` installs dependencies.
5. `npm run build` creates `dist/`.
6. The workflow uploads `dist/` as a Pages artifact.
7. A separate deployment job publishes that artifact to the `github-pages` environment.

The workflow runs a source-boundary test, dependency audit, build, and output-boundary check. Run lint and relevant emulator tests before merging changes.

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

Optional Stripe variables are not currently forwarded by the workflow. Add explicit build-environment mappings in `deploy.yml` if you need those settings in production. Creating a repository variable alone does not inject it into Vite.

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
| Firestore returns permission denied | Compare the deployed rules, user identity, role, and document shape with the checked-in rules. |
| Profile-photo upload fails | Check the Storage bucket, service configuration, and Storage rules. |
| Tests cannot import TypeScript | Use Node 24 for the direct Node test commands. |
| A direct URL fails after deployment | Inspect the Pages artifact, `404.html`, base path, and router setup. |
| Build reports large chunks | Inspect the generated assets; Firebase and media-processing dependencies contribute to bundle size. |
| A billing action is unavailable | Check the purchase flag, pricing configuration, feature settings, and external billing API. |

## Contributing

1. Create a branch for a focused change.
2. Install dependencies with `npm ci`.
3. Keep changes in source files and avoid committing environment files or generated output.
4. Add regression coverage for changed behavior and authorization boundaries.
5. Check that private code, credentials, and personal data are absent from the public build.
6. Run the relevant Node/browser tests, `npm run lint`, and `npm run build`.
7. Describe the behavior change and validation in the pull request.

Use synthetic or sanitized test fixtures. Do not commit personal backups, production user records, session tokens, or credentials.

## License

No license file is currently included in this repository. Do not assume an open-source license applies; contact the repository owner about reuse or redistribution.
