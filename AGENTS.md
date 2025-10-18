# Repository Guidelines

## Project Structure & Module Organization
The Next.js app router lives in `app/`, with composable UI blocks in `components/` and reusable hooks in `hooks/`. Shared services such as the code-generation orchestration live under `lib/`—see `lib/agent.ts` for the main agent implementation and `lib/config.ts` for environment handling. The websocket-and-http entrypoint is `server.ts`, which runs alongside Next to relay project updates. Generated workspaces persist in `projects/` (each folder keyed by UUID) and static assets belong in `public/`. Tailwind configuration and build tooling sit at the root (`eslint.config.mjs`, `postcss.config.mjs`, `tsconfig.json`).

## Build, Test, and Development Commands
Run `npm install` before contributing. Use `npm run dev` to boot the combined Next server and websocket bridge (internally `tsx watch server.ts`). `npm run build` compiles the Next app for production, and `npm run start` runs the compiled server via `tsx server.ts`. Lint with `npm run lint` prior to opening a pull request to catch TypeScript and accessibility issues.

## Coding Style & Naming Conventions
Code is TypeScript-first and follows Next.js/React conventions. Use 2-space indentation, PascalCase for React components/files, camelCase for functions and variables, and prefix hooks with `use`. Keep side-effectful helpers in `lib/` and UI-only logic in `components/`. Rely on ESLint (`next/core-web-vitals`) for stylistic validation; add minimal, high-value comments only where intent is non-obvious.

## Testing Guidelines
A dedicated automated test harness has not been added yet. When contributing features, exercise flows manually via `npm run dev` and document scenarios covered. If you introduce tests, prefer colocating `*.test.ts(x)` files near the code or under a new `tests/` directory, add the required tooling (e.g., Jest or Vitest) to `package.json`, and wire an accompanying `npm run test` script. Keep agent-related changes covered with mocked Anthropic responses to avoid network calls.

## Commit & Pull Request Guidelines
History is sparse, so adopt Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) with imperative verbs and ~72-character subject lines. Each PR should include: purpose summary, linked issues, setup steps (environment variables, sample `curl`/UI flow), and screenshots or terminal output when UI or agent behaviour changes. Ensure lint passes and mention any manual QA performed.

## Configuration & Security Tips
Configuration is centralized in `lib/config.ts`. Set `ANTHROPIC_API_KEY`, `HOST`, and `PORT` in `.env.local` (mirrored in your shell when running `npm run dev`). Optional overrides like `PROJECTS_DIR` let you redirect generated artefacts; avoid committing these directories to git. Never log or commit secrets; scrub generated project folders before sharing.
