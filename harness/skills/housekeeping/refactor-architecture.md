# Architectural Refactoring

Systematically improve the structural organisation of existing code — layer boundaries, dependency direction, module placement, and architectural conformance — without changing external behaviour. This skill is the architectural counterpart to `refactor-code.md`, which handles code-level smells. Use this skill when the problem is *where* code lives and *how modules relate*, not how individual functions are written internally.

**Cardinal rule:** Architectural refactoring and feature work are two separate activities. Wear one hat at a time. If you discover missing behaviour during an architectural pass, stop, switch hats, add a failing test and implement the behaviour, then switch back.

---

## Overview

| Phase | Goal | Output | Requires human? |
|-------|------|--------|-----------------|
| **Phase 1 — Audit & Plan** | Scan the codebase for architectural violations, prioritise findings, and propose concrete restructuring moves | An exec-plan document in `harness/exec-plans/` | Yes — human reviews and approves before Phase 2 |
| **Phase 2 — Implement** | Execute the approved restructuring in small, tested, committed steps | Clean architecture + commits | No — but human can review commits |

---

# Phase 1 — Audit & Plan

The goal of Phase 1 is *analysis only*. Do not move, rename, or delete any files. The output is a written plan that a human can review, adjust, and approve.

---

## Step 1.1 — Scope

Determine what code to audit. This can come from:

- A human-specified scope (e.g. "audit the library domain", "check the routes layer", "audit the chat context")
- The code you are about to change for a feature or fix (campsite rule — audit what is in the way)
- A full-codebase sweep (only when explicitly requested)

If no scope is given, ask the human before proceeding.

---

## Step 1.2 — Load Relevant Architecture Knowledge

Before detecting violations, read the architecture knowledge files that are relevant to the scoped code.

1. List the files in `harness/knowledge/repo-architecture/` (recursively) to see what is available.
2. Based on the file names and the scope agreed in Step 1.1, read the files that cover the layers, boundaries, or conventions the scoped code touches. Start with the top-level overview if you are unsure.
3. Do not front-load every file. Read only those relevant to the scope — you can always come back for more during detection if you encounter an area you haven't loaded yet.

---

## Step 1.3 — Detect Violations

Read the code within the agreed scope. For each file or module, compare its structure, imports, and placement against the rules defined in the architecture knowledge files loaded in Step 1.2. The architecture docs are the source of truth — they define what is and isn't allowed for each layer, boundary, and module.

When checking, look for violations across these categories:

- **Dependency direction** — Do imports flow inward as the architecture requires (the 6×6 ring matrix in `dependency-rules.md`)? Are there any illegal cross-ring imports?
- **Ring responsibilities** — Is each ring doing only what it should? Domain stays pure; application orchestrates with no business rules; driving adapters always call an application service; driven adapters live behind ports.
- **Module organisation** — Are files in the right directories under `domain/`, `application/`, `infrastructure/{api,repositories,gateways}/`, `platform/{shared,infrastructure}/`, or `main/`? Are bounded contexts named identically across rings? Are file suffixes (`.service.ts`, `.repo.ts`, `.gateway.ts`, `.controller.ts`, `.dto.ts`, `.model.ts`, `.event.ts`) correct?
- **Ports & adapters contracts** — Are abstractions (repository ports, gateway ports, SDK wrappers in `platform/infrastructure/`, shared types) present where the architecture requires them? Do DTOs sit at every application-service boundary? Are infrastructure details leaking across boundaries (e.g. domain entities crossing the API boundary, `process.env` read outside `main/`)?

Record every violation you find — do not fix anything. For each violation, note the specific rule from the architecture docs that is being broken.

---

## Step 1.4 — Prioritise

Not every violation is worth fixing. Score each finding against these criteria:

1. **Is it causing real problems?** Does the violation make the codebase harder to understand, extend, or test?
2. **Is it a contagion risk?** Will developers copy this pattern, spreading the violation?
3. **Does it block extraction?** The backend is designed to be breakout-ready. Does this violation couple layers that need to be separable?
4. **Is it enforced by tooling?** Scholastic AI does not yet have ESLint wired up, so for now `npm run typecheck` and `npm run build` are the only automated guardrails — most architectural rules from `dependency-rules.md` must be enforced by hand. Once ESLint and `eslint-plugin-boundaries` are added, violations they catch can be deprioritised in favour of those they cannot.

Rank findings into tiers:

- **High** — Actively causing pain, contagion risk, or blocking extraction. Fix in this pass.
- **Medium** — Would improve the codebase but is not urgent. Include in the plan as optional.
- **Low** — Minor organisational issue. Note it but do not propose an action.

---

## Step 1.5 — Propose Restructuring

For every High and Medium finding, propose a concrete restructuring move:

- **Dependency violations** — describe the illegal import, the correct dependency path, and how to reroute (introduce an interface, move the code, or change the import).
- **Responsibility violations** — describe what logic must move and where it should land, referencing the relevant layer conventions document.
- **Organisation violations** — describe the file move, rename, or extraction, and how imports will be updated.
- **Boundary violations** — describe the missing abstraction (port, SDK, shared type) and where to create it.

For each proposal, note which architecture knowledge file defines the rule being violated.

---

## Step 1.6 — Write the Exec-Plan

Create a directory at `harness/exec-plans/NNN-<gr-key>-refactor-arch-<scope-slug>/` (where `<gr-key>` matches the `gr_xxx` ticket file in `jira-tickets/todo/`, e.g. `002-gr_004-refactor-arch-library-domain`) following the standard naming convention in `harness/exec-plans/README.md`. Write the plan at `plan.md` inside that directory. Use the following template:

```markdown
# Architectural Refactoring Plan: <Scope Description>

Date: <YYYY-MM-DD>
Status: PENDING APPROVAL

## Scope

<What was audited and why.>

## Summary

<2–3 sentence overview of the architectural health of the audited code and the overall thrust of the proposed changes.>

## Architecture Rules Referenced

<List the architecture knowledge files that were consulted, with a one-line summary of the key rule from each that is relevant to this plan.>

## Test Coverage

<Current state of test coverage for the scoped code. Note any gaps that need characterisation tests before restructuring can begin.>

## Proposed Restructurings

### A1 — <Short title>

- **Priority:** High | Medium
- **Violation:** <Violation name from the catalog or rule from the architecture knowledge file>
- **Location:** <File(s) and import(s) affected>
- **Description:** <What is wrong and why it matters — 2–3 sentences.>
- **Proposed fix:** <What to move, extract, rename, or re-route. Concrete steps.>
- **Risk:** <What could go wrong. Side effects, missing tests, downstream breakage.>

### A2 — <Short title>

...repeat for each proposed restructuring...

## Items Noted but Not Proposed

<List any Low-priority violations observed during the audit. One line each.>

## Execution Order

<Numbered list of the A-items above in the order they should be implemented. Dependency-direction fixes should generally come before file-move operations. Group related changes that should be committed together.>
```

---

## Step 1.7 — Present for Approval

Present the exec-plan to the human. Explicitly ask:

1. Are there any restructurings you want to **remove** from the plan?
2. Are there any you want to **add**?
3. Do you want to **change the priority** of any item?
4. Is the **execution order** correct?
5. Are there any areas where you want **characterisation tests** written before restructuring begins?

Do not proceed to Phase 2 until the human explicitly approves the plan. Update the plan's `Status` field to `APPROVED` once approval is given.

---

# Phase 2 — Implement

Execute the approved exec-plan. Follow the plan's execution order. Each A-item is implemented as a self-contained unit with its own commit.

---

## Prerequisites

Before starting implementation:

1. **Confirm `npm run typecheck` and `npm run build` pass.** Do not start if either is red.
2. **Confirm any tests that exist pass.** A test runner is not yet wired up for Scholastic AI; once one is, treat it as a hard prerequisite too.
3. **Commit (or stash) the current state.** You need a clean rollback point.
4. **Write characterisation tests** for any gaps flagged in the plan, where a test harness is available. Commit these tests separately before starting restructuring work.

---

## Step 2.1 — Implement Each Restructuring

For each A-item in the approved execution order:

### The Rhythm

```
1. Read the A-item from the exec-plan
2. Read the architecture knowledge file referenced by the A-item — the restructured code must conform to it
3. Identify every file that imports from or is imported by the affected module(s)
4. Apply the smallest mechanical step (move one file, update one import, extract one interface)
5. Run `npm run typecheck` and `npm run build` → green? Continue. Red? Revert the last step.
6. (Once ESLint is wired up) Run the linter (especially `eslint-plugin-boundaries`) → clean? Continue. Violations? Fix before proceeding.
7. Repeat 4–6 until the restructuring is complete
8. Check for dead code left behind (orphaned files, unused re-exports, stale path aliases)
9. Commit with type "refactor"
10. Update the exec-plan: mark the A-item as DONE
11. Move to the next A-item
```

**Never take a step so large that you cannot revert it instantly.** Architectural moves touch many files — make sure each step keeps the codebase compilable and tests green.

### Import Update Strategy

When moving a file:

1. Move the file to its new location.
2. Update all import statements across the codebase that referenced the old path. Use the canonical ring-based aliases (`@backend-domain/*`, `@backend-application/*`, `@backend-infrastructure/*`, `@backend-platform/{shared,infrastructure}/*`, `@backend-main/*`, `@shared/domain/*`, `@shared-platform/*`) per `overview.md § Path Aliases`.
3. If the old location had a barrel re-export (`index.ts`), update or remove it.
4. Run TypeScript compilation (`tsc --noEmit`) to catch any missed imports.

### Commit Format

Commit after each logically complete restructuring. Use commit type `refactor`. The summary should name the architectural violation that was addressed:

```
Summary: Move Library schema to shared/ to fix frontend-backend duplication

Type: refactor

Details
- Moved LibrarySchema from backend.server/domain/library/ to shared/domain/library/
- Updated 4 backend imports and 2 frontend imports to use @shared/domain/library/
- Removed duplicated schema from ui.client/components/domain/library/
```

---

## Step 2.2 — Final Verification

After all A-items are implemented:

1. **Run any tests that exist.** Everything must pass. (Once a test runner is wired up, treat the full suite as a hard prerequisite.)
2. **Run `npm run typecheck`.** Must pass cleanly. Once ESLint is wired up, also run `npm run lint` — no new warnings, especially `eslint-plugin-boundaries`.
3. **Run `npm run build`.** Must pass cleanly.
4. **Verify dependency direction.** Spot-check that the restructured code follows the onion architecture diagram in `overview.md`.
5. **Update the exec-plan status** to `COMPLETED`.

---

# Decision Heuristics

Use these heuristics when you are unsure whether to propose a restructuring or how far to go:

| Situation | Guidance |
|-----------|----------|
| **"Should I move this now or later?"** | If you are about to modify the code for a feature, restructure first to make the change land cleanly. If the code is stable and nobody is touching it, leave it. |
| **"This file could live in two places"** | Follow the dependency rules. Where does the file's *consumer* live? Where do the file's *dependencies* point? The answer that produces the shortest, most inward dependency path is correct. |
| **"Should I introduce an interface?"** | Only when the dependency rules require it (e.g. a service needs a repo or integration capability but must not depend on the concrete implementation). Don't introduce interfaces for code that naturally lives in the same layer. |
| **"This type is used by both sides — move to shared?"** | Only if both sides *genuinely* need the *same* type. If they use overlapping-but-different shapes, create a shared subset and keep the full types where they belong. |
| **"A controller is doing too much"** | Extract the business logic into an application service. Controllers (driving adapters) should be auth + input mapping + delegation to an application service. See `repo-architecture/backend/api-conventions.md`. |
| **"A route is doing too much"** | Extract server logic into a controller method. Extract UI into a component. The route file should be glue — loader, action, component render. |
| **"There are too many violations — where do I start?"** | Start with dependency-direction violations — these are the most structurally dangerous and tend to compound. Then address responsibility violations. File-move cleanups are lowest risk and can come last. |

---

# Anti-Patterns

| Anti-pattern | Why it hurts | What to do instead |
|---|---|---|
| Moving files without updating all imports | Broken builds, runtime errors, stale references | Use TypeScript compilation as a safety net. Move one file, fix all imports, confirm `tsc` passes before moving the next. |
| Restructuring without tests | No safety net to confirm behaviour is preserved | Write characterisation tests first, then restructure |
| Introducing unnecessary abstractions | More files, more indirection, harder to trace | Only add interfaces and layers that the dependency rules require. Three strikes, then abstract. |
| Fixing architecture and adding features simultaneously | You cannot tell if a test failure is from the restructuring or the new feature | Wear one hat at a time. Commit the restructuring before starting the feature. |
| Creating circular dependencies to avoid moving code | Circular imports break tree-shaking and make the dependency graph unreadable | Break the cycle by extracting the shared concept into the correct layer (usually downward toward `domain/` or `shared/`). |
| Over-sharing to shared/ | Inflates the shared kernel, couples frontend and backend through types that only one side uses | Only move to `shared/` what is genuinely needed by both sides. See `shared-kernel.md § The Split Decision`. |
| Ignoring eslint-plugin-boundaries results (once wired up) | The tooling exists to catch exactly these violations — ignoring it means you're flying blind | Once ESLint and the boundaries plugin are added, run the linter after every move and fix violations immediately rather than suppressing them. Until then, do the equivalent check by hand against `dependency-rules.md`. |
