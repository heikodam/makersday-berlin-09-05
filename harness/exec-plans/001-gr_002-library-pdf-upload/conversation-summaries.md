# GR-002 — Planning Session Summary

This document captures the decisions, debates, and rationale that produced `plan.md`. It exists so the Coding Agent can pick up the plan with full context — what we explored, what we rejected, and why.

## Context

GR-002 (Library PDF upload + browse) had a prior implementation that was deliberately reverted in commit `948bb2a` to give workshop participants a clean reset. The user (`sneharao`) explicitly chose **not** to reproduce the prior plan, so this session re-derived the architectural decisions through a persona panel rather than copying forward.

The pre-session state of the repo:

- GR-001 (auth + session cookie) shipped. `User` aggregate, demo login, `enforceAuth` middleware, `/library` placeholder behind auth.
- No `library` bounded-context code exists in the repo. The harness `library` domain knowledge (`harness/knowledge/domain/library/{domain-model,data-model,language}.md`) describes the target model.
- The reverted prior plan is recoverable via `git show 948bb2a^:harness/exec-plans/001-gr_002-library-pdf-upload/plan.md` — used as reference, not blueprint.

## Persona panel

Convened **Cockburn (ports/adapters), Evans (DDD), Beck (TDD), Cagan (product engineering)** to break open the architectural decisions the prior plan deliberately deferred. Key tensions surfaced:

- **Cockburn vs Cagan on storage port.** Cockburn diagnosed `LibraryMongoRepo` doing two driven-side jobs at once (Mongo persistence + GridFS blob storage) as a missing port. Cagan would normally call this premature, but the prior plan had explicitly flagged it as a manifesto divergence — the workshop reset is the moment to fix it. **Resolved in Cockburn's favour.**
- **Beck vs Cagan on test strategy.** Beck pushed for real-Mongo coverage of AC 8 (unique-index race) and AC 10 (GridFS cleanup) — an in-memory repo that fakes `code: 11000` is not the same as the real index. Cagan pushed back on preemptively wrapping everything. **Resolved as hybrid:** add `mongodb-memory-server` but only where it catches real bugs (slices 2, 4, 5).
- **Evans vs Cagan on aggregate shape.** Evans insisted the full `Library` aggregate is non-negotiable — GR-003 citations resolve `(libraryId, artifactId)` and need the model coherent before chat lands. Cagan agreed since v1 UX still hides multi-library; the model and the UX are decoupled. **Resolved trivially.**

The panel synthesis became the basis for the decisions table in `plan.md` §2.

## Critique triage

Self-critique ran per `harness/skills/planning/critique-coding-plan.md`. Seven issues raised; the user accepted all seven:

| # | Area | Outcome |
|---|---|---|
| 1 | Gaps & blind spots: slice 2 had no real-Mongo coverage | **Accepted.** `mongodb-memory-server` setup pulled into slice 2 with one happy-path round-trip integration test. |
| 2 | Robustness: SHA-256 inside the storage adapter couples the protocol to the storage choice | **Accepted.** Hashing moved to `LibraryService`. `PdfStorageGateway.putPdf(buffer)` returns just `{ storageUri }`. Storage adapter is now purely bytes-in/bytes-out. |
| 3 | Simplicity: validation spread across three layers | **Accepted.** `Content-Length` in controller (transport), magic-byte + min/max-size in service (domain), nothing in adapter. |
| 4 | Testability: slice 1 had zero automated tests | **Accepted** (over my recommendation to defer). `@testing-library/react` + `jsdom` + a single render test for `LibraryView` lands in slice 1. Per-file vitest environment switch (`jsdom` for `.test.tsx`, `node` for backend tests). |
| 5 | Consistency: plan assumed `app/shared/` exists; it doesn't | **Accepted.** Inline schemas in `api.library.artifacts._sdk.ts` (matches `api.auth._sdk.ts`). `app/shared/` is deferred until GR-003 actually needs cross-process types. |
| 6 | Maintainability: `LibraryService` grows to 5 public methods | **Accepted (no action now).** Re-evaluate after GR-003. Split if it crosses ~400 lines or grows a sixth method. |
| 7 | Design: URI-scheme narrative still pointed at the repo | **Accepted.** After fixing #2, the GridFS adapter (not the repo) is the only file that parses `gridfs://`. Documented in the adapter's header. |

## Things deliberately NOT done

- **Reuse the prior plan verbatim.** The user explicitly rejected this. The new plan converges on similar overall structure (the harness domain model dictates much of it) but differs materially on the gateway-port shape, hashing location, validation layering, and test strategy.
- **Build a `pdf-storage.gateway.ts` against S3 yet.** Only the GridFS adapter ships in v1 — but the port shape is general enough that swapping is local to `application.instances.ts` plus a new adapter file.
- **Streaming SHA-256 transform.** Service buffers the full upload (≤ 25 MB cap). A streaming transform is cheap to add later if the cap rises; not worth the complexity now (Beck: simplest first).
- **Controller integration tests.** High plumbing cost (fabricating multipart `Request` objects), low marginal value over the app-service tests + the live route during development. Would land in a future hardening ticket.
- **Multi-library UX, thumbnails, kind classification, async pipeline, search wiring, batch upload UI.** Out of scope per ticket §"Out of scope" and confirmed by the panel.

## Settled answers to the open questions

The plan asked the user three open questions during the collaborative session:

1. **Time-box.** "Production trajectory — let the plan stand." → No slice cuts; `mongodb-memory-server` integration tests stay.
2. **Branch / reviewer.** Initially proposed `feature/sr-002-library-pdf-upload` + reviewer `marduSwanepoel`. The branch name violated `harness/knowledge/code-standards/branch-naming.md` (use `feat/`, no ticket numbers, 3–5 word desc). User chose option **A — `feat/library-pdf-upload`** (convention-compliant). Reviewer confirmed `marduSwanepoel`.
3. **Ship mid-slice.** "All 5 must land." → The PR stays open until slice 5 is done; no early merge.

## Files this plan will produce

`plan.md` §3 lists every file. Summary:

- 3 domain files (`library.ts`, `artifact.ts`, `library.repo.ts`).
- 5 application files (`library.service.ts`, `library.dto.ts`, `errors.ts`, `config.ts`, plus 2 gateway ports `pdf-storage.gateway.ts` / `pdf-parser.gateway.ts`).
- 5 infrastructure files (2 Typegoose models, 1 repo adapter, 2 gateway adapters).
- 2 controller files (`library.controller.ts`, `multipart.ts`).
- 4 route files (`api.library.artifacts.{ts, upload.ts, $artifactId.ts, _sdk.ts}`).
- 6 UI files (`LibraryView`, `Sidebar`, `TopAppBar`, `UploadDropzone`, `DocumentGrid`, `DocumentCard`) + 2 hooks.
- 8 test files (1 jsdom render, 1 app-service unit, 1 repo integration, 4 in-memory doubles, 1 vitest setup).
- 5 modified composition/wiring/config files (`run-config.ts`, `application.instances.ts`, `controller.instances.ts`, `routes/pages/library.tsx`, `package.json`, `.env.example`, `vitest.config.ts`).
- 1 modified harness knowledge file (`infra/infrastructure.md` — register the two new gateway integrations).

## Verification plan

- Per-slice: `npm run typecheck` and `npm run test` clean before commit.
- After slice 5: full `npm run build`, manual smoke against `designs/library_scholastic_ai/screen.png` for ACs 1–3, end-to-end click-through (login → drop PDF → see card → reload → still there → delete → gone).
- PR description includes screenshots of the empty state, populated state, and validation toasts.
