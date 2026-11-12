# PipeCraft

PipeCraft is a visual CI/CD pipeline editor for **GitHub Actions**. Build and edit workflows with connected nodes on a canvas, keep YAML in sync in both directions, and validate pipelines before pushing them to GitHub.

> **Cost note:** PipeCraft displays a *GitHub Actions runner billing estimate* (based on runner type and estimated minutes/matrices). This is an estimate of **GitHub’s** hypothetical billing — **PipeCraft itself is free** and does not charge for usage.

## Features

- **Visual no-code editor** — Design CI/CD pipelines with connected nodes (triggers, jobs, steps, reusable workflows) without writing YAML by hand.
- **Two-way YAML sync** — Canvas changes generate clean YAML, and pasted/imported YAML updates the graph in real time.
- **DevSecOps checks** — Automated validation/linting to help catch issues such as script injection risks, unpinned actions, excessive permissions, and plaintext secrets.
- **GitHub runner cost estimate (FinOps)** — Live estimate of GitHub Actions runner billing (e.g. Linux 1×, Windows 2×, macOS 10×), including matrix runs. Shown as an estimate for GitHub billing only.
- **Built-in AI (Cmd+K)** — Describe changes in plain language to update the pipeline graph.
- **Local runs with `act`** — Generate commands for [nektos/act](https://github.com/nektos/act) to test workflows locally without pushing to GitHub.
- **Templates & projects** — Start from built-in templates and manage pipeline projects.

## Tech stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router) + React + TypeScript
- **Canvas/editor:** [React Flow (@xyflow/react)](https://reactflow.dev/), Monaco Editor
- **State:** Zustand (+ Immer/Zundo)
- **Validation/YAML:** YAML tooling, AJV/schema validation
- **Auth & data:** NextAuth, Prisma
- **Desktop:** Electron + electron-builder (Windows/macOS/Linux) and Flatpak packaging support

## Getting started (web)

### Prerequisites

- [Node.js](https://nodejs.org/) (see project requirements) or [Bun](https://bun.sh/)
- A package manager (npm, pnpm, yarn, or bun)

### Install

```bash
# with bun (recommended if you use the existing lockfile)
bun install

# or with npm
npm install
```

### Database (Prisma)

If the app requires a database for projects/auth features, configure your environment and run:

```bash
bun run db:generate
bun run db:push
# optional
bun run db:seed
```

> Configure required environment variables (e.g. database URL, auth secrets, GitHub OAuth/keys if used) in a local `.env` file as needed by your setup. Do not commit secrets.

### Run in development

```bash
bun run dev
# or
npm run dev
```

Then open the local URL shown in the terminal (typically `http://localhost:3000`).

### Production build (web)

```bash
bun run build
bun run start
```

## Desktop app (Electron)

PipeCraft can be packaged as a desktop application that runs a local Next.js server and opens it in an Electron window.

### Build & run locally

```bash
bun run desktop:run
```

This generates Prisma client, builds Next.js, prepares the desktop bundle, and launches Electron.

### Create distributables

```bash
# Windows (NSIS installer, when built on a compatible environment)
bun run dist:win

# macOS (DMG/ZIP)
bun run dist:mac

# Linux (AppImage, etc.)
bun run dist:linux
```

Packaging configuration lives in [`electron-builder.yml`](electron-builder.yml) and the Electron entrypoint is [`electron/main.cjs`](electron/main.cjs).

## Flatpak

A Flatpak manifest is provided at [`dev.pipecraft.PipeCraft.yml`](dev.pipecraft.PipeCraft.yml). Building Flatpak packages requires `flatpak`/`flatpak-builder` and the appropriate runtimes/SDKs in your environment or CI.

## Releases

A GitHub Actions workflow at [`.github/workflows/release.yml`](.github/workflows/release.yml) is configured to build and publish release artifacts when a version tag (e.g. `v1.0.0`) is pushed.

Typical release flow:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Artifacts may include Windows installer/executable, macOS app archives, Linux AppImage, and Flatpak outputs depending on the workflow configuration.

## Project structure (overview)

- `src/app/` — Next.js routes (landing, dashboard/editor/projects/templates, API routes)
- `src/components/` — Canvas, inspector forms, editor panels, modals
- `src/lib/` — Compiler (graph/YAML), validation, security linting, FinOps calculator, GitHub/project utilities
- `src/store/` — Pipeline/editor state
- `electron/` — Electron main process
- `prisma/` — Database schema
- `scripts/` — Build/preparation scripts (including desktop packaging helpers)

## Notes

- GitHub Actions minutes/costs shown in the app are **estimates of GitHub runner billing only** and may differ from actual billed amounts.
- PipeCraft is not affiliated with GitHub; GitHub Actions is a product of GitHub/Microsoft.

## License

No license file is included in this repository at the moment. If you plan to distribute PipeCraft, consider adding an appropriate `LICENSE` file.
