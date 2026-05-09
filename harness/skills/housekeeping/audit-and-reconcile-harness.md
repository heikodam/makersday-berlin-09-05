# Cleanup Harness

Audit the `harness/` directory and `AGENTS.md` for staleness, contradictions, broken references, and structural drift. Leave the harness accurate and self-consistent.

---

## Step 1 — Discover Current State

Run the following to get a complete picture of all harness content:

```bash
find harness/ -type f | sort
```

Also read `AGENTS.md` in its entirety. These two together define what the harness *claims* to contain and what it *actually* contains.

---

## Step 2 — Sync AGENTS.md with Harness Directories

The `AGENTS.md` file contains a tree diagram of the harness structure under the "Harness Structure" heading. This tree must accurately reflect the actual directories and their one-line descriptions, although not every single file only some (as currently in `AGENTS.md`) should show all file details.

1. Compare the tree in `AGENTS.md` against the real directory listing from Step 1.
2. Add any directories or subdirectories that exist on disk but are missing from the tree.
3. Remove any directories from the tree that no longer exist on disk.
4. Update one-line descriptions if they no longer reflect the contents of the directory.
5. If `skills/` subdirectories have gained or lost skill files, update the parenthetical summaries (e.g. "Writing code (TDD, adding entities/endpoints)") to reflect the current set of skills.

Do not change the rest of `AGENTS.md` (manifesto, usage instructions, etc.).

---

## Step 3 — Check for Broken Internal References

Scan every markdown file in `harness/` for internal links and file path references. These include:

- Markdown links: `[text](../path/to/file.md)`
- Inline path references: backtick-wrapped paths like `` `harness/skills/development/tdd-based-development.md` ``
- References to other harness docs by name (e.g. "see the TDD skill", "see ADR-002")

For each reference:

1. Verify the target file exists at the referenced path.
2. If the target has been moved or renamed, update the reference.
3. If the target has been deleted and no replacement exists, remove the reference and the sentence that contains it (don't leave dangling "see X" statements).

---

## Step 4 — Eliminate Duplication

Read through all harness docs and identify cases where the same concept, rule, or guidance appears in more than one file.

When duplicates are found:

1. Determine the **canonical home** — the file where the content most naturally belongs given the directory structure (knowledge vs. skills, which subdirectory, etc.).
2. Keep the fullest and most accurate version in the canonical location.
3. In the other file(s), replace the duplicate content with a brief cross-reference: e.g. "See `harness/knowledge/code-standards/error-handling.md` for error handling conventions."
4. Never duplicate guidance between `knowledge/` and `skills/` — knowledge describes *what and why*, skills describe *how to do it step-by-step*. If a doc mixes both, split it.

---

## Step 5 — Resolve Contradictions

Look for cases where two or more harness files give conflicting guidance. Common contradiction sites:

- Code standards files vs. repo architecture convention files (e.g. naming rules in two places)
- Knowledge docs vs. skill docs (e.g. a skill says "do X" but a knowledge doc says "prefer Y")
- ADRs vs. current conventions (an ADR may describe a decision that has since been superseded)

For each contradiction:

1. Determine which version is correct based on the most recent and intentional guidance.
2. Update the incorrect file.
3. If you cannot determine which is correct, flag it with a `TODO: Resolve contradiction with <other file>` comment and move on.

---

## Step 6 — Verify Content Belongs in Its Directory

Each directory has a clear purpose:

| Directory | Purpose | Content type |
|-----------|---------|-------------|
| `knowledge/architecture-decision-records/` | Key design decisions and their rationale | ADRs — one per decision |
| `knowledge/code-standards/` | Conventions and patterns to follow when writing code | Rules and examples |
| `knowledge/domain/` | Domain model and ubiquitous language, organised by bounded context | Top-level: `context-map.md`, `shared-language.md`, routing `index.md`. Per-context folders contain `domain-model.md`, `data-model.md`, and `language.md`. Business concepts, not code. |
| `knowledge/infra/` | Infrastructure and deployment | Environment, hosting, databases |
| `knowledge/repo-architecture/` | Codebase structure and module layout | Directory maps, dependency rules, layer conventions |
| `skills/` | Step-by-step instructions for specific tasks | Imperative procedures |
| `dev-workflow/` | Development stage guides | Ordered workflow steps |
| `housekeeping/` | Quality assessments and debt tracking | Grades, debt items, improvement areas |
| `exec-plans/` | Scratch space for in-progress plans | Temporary — not reference material |

For each file, confirm it lives in the right directory. If a file's content doesn't match its directory's purpose, move it to the correct location and update any references (per Step 3).

---

## Step 7 — Check for Stale Codebase-Specific Content

Harness knowledge should **drive** the code, not mirror it. Docs must not hard-code specifics from the codebase that will silently go stale. Scan for:

- **Concrete file paths to source files** (e.g. `` `app/backend.server/application/library/upload-artifact.service.ts` ``). These are acceptable only as illustrative examples clearly marked as such ("e.g.", "for example"). They must not be authoritative lists.
- **Specific class or function names** that would silently go wrong if the code is renamed.
- **Directory structure trees** that enumerate actual source files (as opposed to describing the *pattern* of how directories are organised).
- **Counts or statistics** ("8 test files", "64 route files") that go stale as the codebase evolves.

For each instance:

1. If it is an illustrative example, ensure it is clearly marked as one.
2. If it is presented as an authoritative reference, rewrite it to describe the *pattern or convention* instead of listing concrete artefacts. Alternatively, replace it with instructions to discover the current state (e.g. "run `find tests/backend.server -name '*.test.ts'` to see all backend test files").
3. If a concrete path is genuinely stable and canonical (e.g. `AGENTS.md`, `harness/exec-plans/`), it can stay.

---

## Step 8 — Clean Up File and Folder Names

Review all filenames and directory names in `harness/` for clarity:

- Names should clearly describe their content without needing to open the file.
- Use lowercase kebab-case consistently (e.g. `commit-changes.md`, not `commitChanges.md`).
- Prefix workflow files with a numeric sequence for ordering (e.g. `001_plan.md`, `002_build.md`).
- Remove any files that are empty, contain only "TBC" or "TODO" with no useful content, or have been superseded. If a placeholder exists for a skill that hasn't been written yet, either write it or delete the file.

---

## Step 9 — Final Verification

After making all changes:

1. Re-run `find harness/ -type f -name '*.md' | sort` and confirm the listing is clean.
2. Re-read `AGENTS.md` and confirm its tree diagram matches the current directory structure.
3. Spot-check 3–5 cross-references to confirm they resolve correctly.
4. Commit the changes using the commit-changes skill.

---

## Rules

- Do not rewrite content for style or tone — only fix accuracy, placement, and consistency.
- Do not delete ADRs even if superseded — mark them as superseded with a note pointing to the replacement.
- Do not create new knowledge or skill files during this cleanup — only fix what exists.
- If a fix is ambiguous, leave a `TODO:` rather than guessing.
- Keep changes minimal and targeted. The goal is hygiene, not a rewrite.
