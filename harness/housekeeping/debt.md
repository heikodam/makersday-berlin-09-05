# Technical Debt

Known technical debt, prioritised by impact. Cross-references ADRs where relevant.

> **Note:** Specific counts (file counts, occurrence counts, lint error totals) are intentionally omitted — they go stale silently and create false precision. Each entry uses a qualitative tier instead. Re-survey when prioritising work.
>
> **Tiers:** `widespread` — affects the majority of files in the area; `scattered` — affects multiple files but not the majority; `isolated` — one or a handful of specific files.

## High Priority

### Linter and architectural-boundary enforcement not yet wired up

- **Tier:** widespread
- **Last surveyed:** 2026-05-08 (updated 2026-05-08 after GR-001 adopted Vitest)
- **Description:** ESLint is not yet configured for the application code. The harness's `enforcement/` folder still contains the inspiration repo's ESLint config (typed-linting, `eslint-plugin-boundaries`, naming rules, error-handling rules, testing rules), but `package.json` has no `lint` script and no ESLint dependencies. As a result, every architectural rule in `harness/knowledge/repo-architecture/dependency-rules.md` (ring boundaries, controller-graph rule, allowed/forbidden imports, file-naming, no-cross-context entity imports, etc.) must currently be enforced by hand during conformance review. The **test-runner half** of this debt is now resolved — Vitest is installed, configured (`vitest.config.ts`), and exposed via `npm run test` / `npm run test:watch` / `npm run test:coverage`.
- **Skills referencing this gap:** `skills/development/{add-domain-entity,add-api-endpoint,add-page-route,add-ui-component,add-to-shared,add-gateway-integration,modify-domain-entity}.md`, `skills/housekeeping/refactor-architecture.md`, `skills/testing/run-code-checks.md` — all describe the lint step as `(planned)` and fall back to `npm run typecheck` + `npm run build` + `npm run test`.
- **Action when ready:** Adopt ESLint for the React Router v7 codebase, port the relevant rule sets from `harness/enforcement/eslint/` (start with `eslint-plugin-boundaries` for ring rules, then naming and error-handling), add `lint` and `lint:fix` scripts to `package.json`, and update every `(planned) npm run lint` reference in the harness to make the step required.

### Controller integration tests not yet covered

- **Tier:** isolated
- **Last surveyed:** 2026-05-08
- **Description:** GR-001 ships unit tests for `LoginService` and `session-cookie.ts` but skips controller integration tests (the controllers are thin pass-through and covered indirectly). Once a Mongo test container or in-memory ODM is selected, add `tests/backend.server/infrastructure/api/<context>-controller.integration.test.ts` files per the convention in `code-standards/backend/testing.md`.
- **Action when ready:** Choose Mongo strategy for tests (testcontainers vs. mongodb-memory-server), then add controller integration tests starting with `LoginController` (login/logout/me HTTP shapes).

## Medium Priority

## Low Priority
